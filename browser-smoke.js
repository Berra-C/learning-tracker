const fs=require('fs');
const path=require('path');
const os=require('os');
const {spawn}=require('child_process');

const root=path.resolve(__dirname,'..');

function chromiumBinary(){
  const candidates=[
    process.env.CHROMIUM_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ].filter(Boolean);

  return candidates.find(file=>fs.existsSync(file)) || null;
}

function sleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function waitFor(fn,timeout=15000){
  const started=Date.now();
  let lastError=null;

  while(Date.now()-started<timeout){
    try{
      const value=await fn();
      if(value) return value;
    }catch(error){
      lastError=error;
    }
    await sleep(80);
  }

  throw lastError || new Error('browser wait timeout');
}

class CDP {
  constructor(url){
    this.ws=new WebSocket(url);
    this.nextId=0;
    this.pending=new Map();
    this.events=[];
    this.defaultSessionId=null;

    this.openPromise=new Promise((resolve,reject)=>{
      const cleanup=()=>{
        this.ws.removeEventListener('open',onOpen);
        this.ws.removeEventListener('error',onError);
      };

      const onOpen=()=>{
        cleanup();
        resolve();
      };

      const onError=event=>{
        cleanup();
        reject(event);
      };

      this.ws.addEventListener('open',onOpen);
      this.ws.addEventListener('error',onError);

      if(this.ws.readyState===WebSocket.OPEN){
        onOpen();
      }else if(
        this.ws.readyState===WebSocket.CLOSING ||
        this.ws.readyState===WebSocket.CLOSED
      ){
        onError(new Error('CDP WebSocket closed before open'));
      }
    });

    this.ws.onmessage=event=>{
      const message=JSON.parse(event.data);

      if(message.id){
        const pending=this.pending.get(message.id);
        if(!pending) return;

        this.pending.delete(message.id);

        if(message.error){
          pending.reject(
            new Error(JSON.stringify(message.error))
          );
        }else{
          pending.resolve(message.result);
        }
        return;
      }

      this.events.push(message);
    };
  }

  open(){
    if(this.ws.readyState===WebSocket.OPEN){
      return Promise.resolve();
    }

    return this.openPromise;
  }

  send(method,params={},sessionId=this.defaultSessionId){
    return new Promise((resolve,reject)=>{
      const id=++this.nextId;
      this.pending.set(id,{resolve,reject});

      const message={id,method,params};

      if(sessionId){
        message.sessionId=sessionId;
      }

      this.ws.send(JSON.stringify(message));
    });
  }

  async evaluate(expression,awaitPromise=true){
    const result=await this.send('Runtime.evaluate',{
      expression,
      awaitPromise,
      returnByValue:true,
      userGesture:true
    });

    if(result.exceptionDetails){
      throw new Error(
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        'Runtime.evaluate failed'
      );
    }

    return result.result.value;
  }

  close(){
    this.ws.close();
  }
}

function stripExternalAssets(html){
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<script\b[^>]*\/?>/gi,'')
    .replace(
      /<link\b[^>]*rel=["'](?:stylesheet|manifest)["'][^>]*>/gi,
      ''
    );
}

function browserStubs(){
  return `(()=>{
    const memory=new Map();

    const storage={
      getItem:key=>
        memory.has(String(key))
          ? memory.get(String(key))
          : null,
      setItem:(key,value)=>
        memory.set(String(key),String(value)),
      removeItem:key=>memory.delete(String(key)),
      clear:()=>memory.clear(),
      key:index=>Array.from(memory.keys())[index] || null,
      get length(){ return memory.size; }
    };

    Object.defineProperty(window,'localStorage',{
      configurable:true,
      value:storage
    });

    Object.defineProperty(window,'sessionStorage',{
      configurable:true,
      value:storage
    });

    window.Notification=function(){};
    Notification.permission='denied';
    Notification.requestPermission=async()=> 'denied';

    window.AudioContext=undefined;
    window.webkitAudioContext=undefined;

    return true;
  })()`;
}

(async()=>{
 const chromium=chromiumBinary();
 if(!chromium)throw Error('Chromium unavailable');
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'learning-tracker-browser-'));
 const browser=spawn(chromium,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--remote-allow-origins=*','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let cdp=null,stderr='';browser.stderr?.on('data',d=>stderr=String(d).slice(-2000));
 try{
  const active=await waitFor(async()=>{let f=path.join(profile,'DevToolsActivePort');if(!fs.existsSync(f))return null;let a=fs.readFileSync(f,'utf8').trim().split(/\r?\n/);return {port:+a[0],ws:a[1]}},12000);
  cdp=new CDP(`ws://127.0.0.1:${active.port}${active.ws}`);await cdp.open();
  let targets=await cdp.send('Target.getTargets',{},null),page=targets.targetInfos.find(x=>x.type==='page');
  let attached=await cdp.send('Target.attachToTarget',{targetId:page.targetId,flatten:true},null);cdp.defaultSessionId=attached.sessionId;
  await cdp.send('Runtime.enable');await cdp.send('Page.enable');let frame=(await cdp.send('Page.getFrameTree')).frameTree.frame.id;
  let html=stripExternalAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  await cdp.send('Page.setDocumentContent',{frameId:frame,html});
  await cdp.evaluate(browserStubs());
  await cdp.evaluate(`window.fetch=async(url,opt)=>{const body=JSON.parse(opt.body);let result={};if(body.action==='login')result={accountId:'00000000-0000-0000-0000-000000000001',username:'TEST-1000',sessionToken:'1234567890123456789012345678901234567890'};if(body.action==='learning-tracker-sync-pull')result={state:null,revision:0};if(body.action==='learning-tracker-sync-push')result={revision:Number(body.expectedRevision)+1};if(body.action==='list-devices')result={devices:[]};return {ok:true,status:200,json:async()=>result}};`);
  let code=fs.readFileSync(path.join(root,'assets/js/cloud-config.js'),'utf8')+';\n'+fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');
  await cdp.evaluate(code,false);
  await cdp.evaluate(`document.dispatchEvent(new Event('DOMContentLoaded'))`);
  await waitFor(()=>cdp.evaluate(`document.querySelector('#authView')&&!document.querySelector('#authView').hidden`),10000);
  await cdp.evaluate(`document.querySelector('#loginUsername').value='TEST-1000';document.querySelector('#loginMagic').value='word-word';document.querySelector('#loginCode').value='123456';document.querySelector('#loginBtn').click()`);
  await waitFor(()=>cdp.evaluate(`!document.querySelector('#workspace').hidden`),10000);
  await cdp.evaluate(`document.querySelector('[data-action="add-course"]').click();document.querySelector('#edit-name').value='Physics';document.querySelector('#editorSave').click()`);
  let courses=await cdp.evaluate(`window.LT.cloud.state.courses.length`);if(courses!==1)throw Error('Course create failed: '+courses);
  await cdp.evaluate(`document.querySelector('[data-action="add-resource"]').click();document.querySelector('#edit-title').value='Physics Book';document.querySelector('#editorSave').click()`);
  let resources=await cdp.evaluate(`window.LT.cloud.state.resources.length`);if(resources!==1)throw Error('Resource create failed: '+resources);
  await cdp.evaluate(`document.querySelector('#aiJson').value=JSON.stringify({schema_version:1,resource_title:'Physics Book',source_access:'full',notes:[],structure:[{title:'Chapter One',children:[{title:'First lesson',children:[]},{title:'Second lesson',children:[]}]}]});document.querySelector('#validateImport').click();document.querySelector('#confirmImport').click();`);
  let nodes=await cdp.evaluate(`window.LT.cloud.state.nodes.length`);if(nodes!==3)throw Error('AI import failed: '+nodes);
  await cdp.evaluate(`document.querySelector('#toggleWeekAssign').click();document.querySelector('[data-node-click]').click();document.querySelector('#assignSelectedItems').click()`);
  let assignments=await cdp.evaluate(`window.LT.cloud.state.assignments.length`);if(assignments!==1)throw Error('Weekly assignment failed: '+assignments);
  let title=await cdp.evaluate(`document.querySelector('#courseTitle').textContent`);if(title!=='Physics')throw Error('Wrong course rendering: '+title);
  console.log('Browser smoke passed: auth UI, login session, course, resource, AI JSON, weekly assignment, rendered course title');
 }finally{cdp?.close();browser.kill('SIGKILL');try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
})().catch(e=>{console.error(e);process.exitCode=1});

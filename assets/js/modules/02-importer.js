(function(LT){'use strict';
const m=LT.model;
const baseRules=`You are a careful educational table-of-contents extractor. Read the ACTUAL supplied source and reproduce its hierarchy in the original order and spelling. Do not summarize chapters or invent topics. Include EVERY explicitly listed chapter, unit, subchapter, lesson, exercise and test, retaining intermediate parent headings and arbitrary nesting. Never infer the structure from the title alone. If the source only shows some units, use source_access "partial" and identify missing material in notes; if none is verifiable, use "unavailable" and structure []. Only mark "full" if the entire resource contents was actually inspected. Do not give completion status, dates, progress or internal IDs. Use exactly the schema below, with children: [] for every leaf. Return ONLY raw valid JSON, without markdown or commentary.\n\n{"schema_version":1,"resource_title":"Actual title","source_access":"full","notes":[],"structure":[{"title":"Actual unit or chapter","children":[{"title":"Actual lesson","children":[]}]}]}\n\nDouble-check all headings against the supplied pages before answering. No placeholders and no fabricated lessons.`;
function kind(r){let v=String(r.type||'').toLowerCase(),url=String(r.sourceUrl||'').toLowerCase();if(url.includes('khanacademy.org')||v.includes('khan'))return 'khan';if(v.includes('book')||v.includes('kitap')||v.includes('pdf'))return 'book';if(v.includes('video')||v.includes('course')||v.includes('ders'))return 'video';return 'web'}
function guidance(r){switch(kind(r)){
case 'khan':return {title:'Khan Academy · eksiksiz kurs haritası',steps:['Önce kursun TAM bağlantısını AI sohbetine gönder ve internet/bağlantı okuma özelliğinin açık olduğundan emin ol. Kendi başına yalnızca kurs adından liste üretmesine izin verme.','AI’dan kursun tüm ünitelerini orijinal sırayla tek tek listelemesini, sonra HER ünitenin sayfasını ayrı açarak tüm dersleri, video/makale/alıştırma/test başlıklarını toplamasını iste. Yalnızca ana sayfadaki ünite adları yeterli değildir.','AI sayfaları açamıyorsa Khan Academy’de her üniteye gir. Görünen ders/aktivite başlıklarını kopyala veya tüm bölümlerin ekran görüntülerini AI’ya yükle. Uzun kurslarda bunu birkaç parçada yap.','AI’dan her ünite için erişimin doğrulanıp doğrulanmadığını kontrol etmesini iste. Tek bir ünite bile incelenemediyse source_access "partial" olmalı; eksik dersleri asla tahmin etmesin.'],hint:'Link tek başına eksiksiz konu listesini garanti etmez. En güvenilir yöntem, tüm ünitelerin açık ders listelerini AI’ya vermektir.'};
case 'book':return {title:'Kitap / PDF · gerçek içindekiler sayfalarını gönder',steps:['Kitap PDF’sini veya yalnızca içindekiler bölümünün tüm sayfalarını AI sohbetine yükle. Fotoğraflar net ve okunabilir olmalı.','Yalnızca kapağı veya kitap adını verme. Bölüm, alt bölüm ve ders başlıklarının gerçek sırasını içindekilerden çıkarttır.','İçindekiler eksik sayfalar içeriyorsa AI yalnızca gördüğü başlıkları çıkarsın ve source_access "partial" yazsın.'],hint:'Uygulama PDF dosyasını kendi başına analiz etmez; PDF’yi harici AI sohbetine yüklemelisin.'};
case 'video':return {title:'Video serisi · oynatma listesi / ders başlıkları',steps:['Oynatma listesi veya çevrim içi kurs bağlantısını AI’ya gönder.','AI listeyi göremiyorsa modül ve videoların adlarını içeren ekran görüntüleri veya kopyalanmış ders listesini paylaş.','Sıralamayı koru; videoları farklı dersler olarak yaz, uydurma başlık ekleme.'],hint:'Yalnızca açılabilen başlıklar aktarılır; erişilemeyen dersler tahmin edilmez.'};
default:return {title:'Web kaynağı · sayfa içindekilerini aktar',steps:['Kaynağın bağlantısını AI sohbetine gönder.','Sayfada içindekiler/ünite listesi varsa bunu seçip AI’ya metin veya ekran görüntüsü olarak gönder.','İçerik doğrulanamıyorsa kaynak erişimini "partial" veya "unavailable" olarak belirt.'],hint:'Kaynak adresi otomatik olarak taranmıyor; AI’nın gerçekten eriştiğini kontrol et.'};
}}
function prompt(r){const g=guidance(r);const khanExtra=kind(r)==='khan'?`KHAN ACADEMY VERIFICATION CHECKLIST:
- Browse the supplied URL if browsing is available. Do not claim to have visited pages you could not access.
- First enumerate every unit listed in the course, preserving their exact order.
- For EACH unit, open its unit page and enumerate each lesson; if lesson pages show activities, capture videos, articles, exercises, quizzes and tests by their original titles and order.
- Retain hierarchy: course > unit > lesson > individual named activity (only if verified).
- IMPORTANT: Do not output a list of bare units with "children":[]; that is NOT an importable result. If units are inaccessible, ask for their pages/screenshots first. Return only units with verified lesson children; keep missing unit names in notes.
- Use separate passes if needed: collect 1-3 units at a time and return multiple JSON responses; Learning Tracker merges later responses into the existing resource without deleting progress.
- Check coverage one unit at a time. If some lessons or activity lists were inaccessible, say which units are missing in notes and mark source_access as partial.
- NEVER replace a real lesson listing with a guessed generic syllabus. Never fabricate practice or tests.
- If you cannot browse the URL, ASK THE USER for screenshots or pasted text of the unit lesson lists BEFORE generating a purported complete outline.
- Output strict JSON with double-quoted keys and strings. No single quotes, unquoted keys, trailing commas or comments.
`:'';return `RESOURCE TITLE: ${r.title}\nRESOURCE TYPE: ${r.type}\nRESOURCE URL: ${r.sourceUrl||'Not provided'}\n\nSOURCE-SPECIFIC INSTRUCTIONS:\n${g.steps.map((s,i)=>(i+1)+'. '+s).join('\n')}\n\n${khanExtra}${baseRules}`}
// Accept frequent LLM formatting mistakes WITHOUT evaluating executable code.
// Candidate extraction is conservative: only JSON objects / arrays are accepted.
// Normalize formatting introduced by copying JSON through HTML/Markdown.
function cleanPaste(source){
 let s=String(source).replace(/&#(?:x([0-9a-f]{1,6})|([0-9]{1,7}));/gi,(match,h,d)=>{
  const n=parseInt(h||d,h?16:10);return n===32?' ':n===10?'\n':n===9?'\t':n>=32&&n<=0x10ffff?String.fromCodePoint(n):match
 }).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
 // Strip a stray backslash used as a Markdown hard line-break, but never touch strings.
 let out='',inside=false,escaped=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];if(inside){out+=c;if(escaped){escaped=false;continue}if(c==='\\'){escaped=true;continue}if(c==='"')inside=false;continue}
  if(c==='"'){inside=true;out+=c;continue}
  if(c==='\\'&&/^[ \t]*\r?\n/.test(s.slice(i+1))){i++;while(s[i]===' '||s[i]==='\t')i++;if(s[i]==='\r')i++;if(s[i]==='\n')out+='\n';else i--;continue}
  out+=c;
 }return out;
}
function jsonCandidates(source){
 const raw=cleanPaste(source).replace(/^\uFEFF/,'').trim();
 const out=[];const fences=[...raw.matchAll(/```(?:json|javascript|js)?\s*([\s\S]*?)```/gi)];
 for(const x of fences)out.push(x[1].trim());
 out.push(raw);
 // AI may prepend a sentence or a numbered list; extract balanced object spans.
 const collect=(text)=>{let depth=0,begin=-1,inQuote=false,quote='',escaped=false;for(let i=0;i<text.length;i++){
  const ch=text[i];if(inQuote){if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch===quote){inQuote=false}continue}
  if(ch==='"'||ch==="'"){inQuote=true;quote=ch;continue}
  if(ch==='{'||ch==='['){if(depth++===0)begin=i}
  else if(ch==='}'||ch===']'){if(depth>0&&--depth===0&&begin>=0){out.push(text.slice(begin,i+1));begin=-1}}
 }};
 collect(raw);
 return [...new Set(out.filter(Boolean))];
}
function relaxedJSON(source){
 // Converts only common JSON-like syntax: unquoted identifier keys, single-quoted
 // JSON strings, and trailing commas. Never use eval / Function / JS parsing.
 let result='',inString=false,quote='',escape=false;
 for(let i=0;i<source.length;){let ch=source[i];
  if(inString){if(escape){if(quote==="'"&&ch==='"')result+='"';else result+='\\'+ch;escape=false;i++;continue}
   if(ch==='\\'){escape=true;i++;continue}
   if(ch===quote){result+='"';inString=false;quote='';i++;continue}
   if(quote==="'"&&ch==='"')result+='\\"';else result+=ch;i++;continue}
  if(ch==='"'||ch==="'"){inString=true;quote=ch;result+='"';i++;continue}
  if(/\s/.test(ch)){result+=ch;i++;continue}
  if(ch===','&&/^[\s]*[}\]]/.test(source.slice(i+1))){i++;continue}
  // JSON5-style unquoted property: only after '{' or ',' and before ':'.
  const last=result.trimEnd().slice(-1);
  if((last==='{'||last===',')&&/[A-Za-z_$]/.test(ch)){
   const rest=source.slice(i);const match=/^([A-Za-z_$][\w$-]*)(\s*):/.exec(rest);
   if(match){result+='"'+match[1]+'"'+match[2]+':';i+=match[0].length;continue}
  }
  result+=ch;i++;
 }
 if(inString)throw Error('AI yanıtında kapanmamış metin tırnağı var.');
 return result;
}
function parseAIJSON(input){
 const candidates=jsonCandidates(input);let lastError;
 for(const candidate of candidates){for(const sample of [candidate,relaxedJSON(candidate)]){
  try{return {value:JSON.parse(sample),repaired:sample!==candidate}}catch(e){lastError=e}
 }}
 throw Error('JSON okunamadı: '+(lastError?.message||'geçersiz sözdizimi')+'. AI yanıtında geçerli bir JSON nesnesi bulunamadı. Metnin tamamını kopyala; devam ederse yanıtı tekrar yalnızca JSON olarak üretmesini iste.');
}
function normalize(input,resource=null){if(typeof input!=='string'||!input.trim())throw Error('JSON alanı boş. AI yanıtındaki JSON’u kopyalayıp buraya yapıştır.');if(input.length>2500000)throw Error('JSON çok büyük (2,5 MB sınırı).');const parsed=parseAIJSON(input);let data=parsed.value;
const notes=[];if(parsed.repaired)notes.push('AI yanıtındaki basit JSON yazım hataları güvenli biçimde düzeltildi; başlıkları önizlemede kontrol et.');const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
if(Array.isArray(data)){data={structure:data};notes.push('AI yalnızca başlık dizisi gönderdi; standart biçime dönüştürüldü.')}
if(!isObj(data))throw Error('JSON bir nesne veya başlıklar dizisi olmalı.');
const titles=['title','name','label','heading','unit_title','lesson_title'];const childs=['children','topics','sections','lessons','units','chapters','items','subsections','modules','content'];
const heading=x=>titles.map(k=>x?.[k]).find(v=>typeof v==='string'&&v.trim());
const root=data.structure??data.units??data.chapters??data.modules??data.contents??data.toc??data.outline??data.items;
if(!Array.isArray(root))throw Error('Ünite listesi bulunamadı. JSON’da "structure": [...] veya "units": [...] gibi bir başlık dizisi olmalı.');
let count=0;function walk(arr,depth){if(depth>80)throw Error('Başlık ağacı aşırı derin (80 seviye sınırı).');return arr.map((x,index)=>{if(++count>20000)throw Error('Bir kaynakta en fazla 20.000 başlık destekleniyor.');if(typeof x==='string')x={title:x};if(!isObj(x))throw Error(`${index+1}. başlık nesne veya metin olmalı.`);let title=heading(x);if(!title||title.length>500)throw Error(`${index+1}. başlığın adı eksik ya da çok uzun (en fazla 500 karakter).`);let nested=childs.filter(k=>k!=='children'&&Array.isArray(x[k]));let raw=x.children??(nested.length?x[nested[0]]:[]);if(!Array.isArray(raw))throw Error('"'+title+'" başlığında alt konular (children) liste olmalı.');return {title:title.trim(),children:walk(raw,depth+1)}})}
let structure=walk(root,0);
// Khan Academy courses require lesson/activity children. A bare unit must never
// be saved as a completed topic: that would corrupt progress percentages.
const khan=resource&&kind(resource)==='khan';
const emptyUnits=khan?structure.filter(n=>!n.children.length).map(n=>n.title):[];
if(khan&&emptyUnits.length===structure.length&&structure.length)throw Error(`AI yalnızca ${structure.length} ünite adı döndürmüş; hiçbir ünitenin içindeki dersleri alamamış. Bu JSON içe aktarılamaz. Khan Academy'de üniteleri açıp ders başlıklarını veya ekran görüntülerini AI'ya ver; her ünitenin children alanı dolu olmalı.`);
if(khan&&emptyUnits.length){structure=structure.filter(n=>n.children.length);notes.push(`${emptyUnits.length} boş ünite (içinde doğrulanmış ders olmayan) aktarılmadı: ${emptyUnits.join(', ')}. Bunları daha sonra yeni bir JSON ile ekleyebilirsin.`)}
const rawAccess=String(data.source_access??data.sourceAccess??(structure.length?'partial':'unavailable')).toLowerCase().trim();let access=({complete:'full',all:'full',yes:'full',incomplete:'partial',limited:'partial',unknown:'partial',none:'unavailable',no:'unavailable',failed:'unavailable',inaccessible:'unavailable'})[rawAccess]||rawAccess;if(!['full','partial','unavailable'].includes(access))throw Error('Kaynağa erişim (source_access) "full", "partial" veya "unavailable" olmalı.');
if(access==='unavailable'&&structure.length){access='partial';notes.push('Erişim "unavailable" yazılmış ama başlıklar da bulunuyor. Çelişki nedeniyle kısmi erişim olarak işaretlendi; kontrol et.')}if(!structure.length&&access==='full'){access='unavailable';notes.push('Tam erişim belirtilmiş ancak hiçbir başlık yok; erişim durumunu kontrol et.')}
const resourceTitle=data.resource_title??data.resourceTitle??data.title??data.name??'';
if(!String(resourceTitle).trim())notes.push('AI kaynak başlığını göndermedi; mevcut kaynak adı kullanılacak.');
if(data.schema_version!==1)notes.push('JSON şeması standart biçime dönüştürüldü.');
const suppliedNotes=Array.isArray(data.notes)?data.notes.filter(x=>typeof x==='string'):typeof data.notes==='string'?[data.notes]:[];
return {data:{schema_version:1,resource_title:String(resourceTitle).trim(),source_access:access,notes:[...suppliedNotes,...notes],structure},warnings:notes, count:structure.reduce((total,node)=>{const visit=n=>1+n.children.reduce((sum,child)=>sum+visit(child),0);return total+visit(node)},0)};}
function validateDetailed(input,resourceTitle='',resource=null){let normalized=normalize(input,resource);if(!normalized.data.resource_title)normalized.data.resource_title=resourceTitle||'Kaynak';return normalized;}
function validate(input,resourceTitle='',resource=null){return validateDetailed(input,resourceTitle,resource).data;}
function commit(s,resourceId,data,replace=false){
 let resource=m.get(s,'resources',resourceId);if(!resource)throw Error('Kaynak bulunamadı.');
 const existing=m.nodes(s,resourceId);
 if(replace){for(const n of existing)m.remove(s,'nodes',n)}
 let created=[];
 function walk(arr,parentId){arr.forEach((entry,index)=>{
  const siblings=m.children(s,parentId,resourceId);
  // Identical headings under the same parent refer to one node. Retain IDs,
  // existing completion states and weekly assignments when extending the outline.
  let rec=!replace&&siblings.find(n=>n.title.trim()===entry.title.trim());
  if(!rec){const type=entry.children?.length?'section':/\b(quiz|practice|exercise|alıştırma|test|sınav)\b/i.test(entry.title)?'quiz':'topic';rec=m.add(s,'nodes',{resourceId,title:entry.title.trim(),parentId,sortOrder:siblings.length,type});created.push(rec)}
  if(entry.children?.length){if(rec.type!=='section'&&m.children(s,rec.id,resourceId).length===0)m.update(rec,{type:'section'});walk(entry.children,rec.id)}
 })}walk(data.structure,null);
 const older=Array.isArray(resource.importNotes)?resource.importNotes:[];
 m.update(resource,{sourceAccess:existing.length?'partial':data.source_access,importNotes:[...older,...data.notes].slice(-80)});
 return created;
}
LT.importer={prompt,guidance,validate,validateDetailed,commit,cleanPaste};
})(window.LT=window.LT||{});

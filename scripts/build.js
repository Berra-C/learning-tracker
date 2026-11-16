const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=['01-model.js','02-importer.js','03-cloud.js','04-ui.js'];
const concat=src.map(name=>fs.readFileSync(path.join(root,'assets/js/modules',name),'utf8')).join('\n\n');
const target=path.join(root,'assets/js/app.js');
if(process.argv.includes('--check')){
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==concat){console.error('Generated bundle out of date; run npm run build');process.exit(1)}
}else{fs.writeFileSync(target,concat);console.log('Built assets/js/app.js')}

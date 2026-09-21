import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
const assets = {};
async function add(url,filename){const data=await readFile(filename);assets[url]=/\.(?:wasm|gz|bcmap|pfb|ttf)$/i.test(filename)?{base64:data.toString('base64')}:data.toString('utf8');}
async function collect(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name==='package.json')continue;
    if(entry.isDirectory())await collect(path.join(dir,entry.name),prefix+entry.name+'/');
    else await add('/'+prefix+entry.name,path.join(dir,entry.name));
  }
}
await collect('web');
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs'])await add('/vendor/'+name,'node_modules/pdfjs-dist/legacy/build/'+name);
await add('/vendor/pdfjs-LICENSE.txt','node_modules/pdfjs-dist/LICENSE');
await collect('node_modules/pdfjs-dist/wasm','vendor/pdf-wasm/');
await add('/vendor/tesseract.min.js','node_modules/tesseract.js/dist/tesseract.min.js');
await add('/vendor/ocr-worker.min.js','node_modules/tesseract.js/dist/worker.min.js');
await add('/vendor/tesseract-LICENSE.txt','node_modules/tesseract.js/LICENSE.md');
for(const name of ['tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'])await add('/vendor/ocr/'+name,'node_modules/tesseract.js-core/'+name);
for(const lang of ['eng','deu'])await add('/vendor/ocr/lang/'+lang+'.traineddata.gz','node_modules/@tesseract.js-data/'+lang+'/4.0.0_best_int/'+lang+'.traineddata.gz');
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('server/assets.generated.js','export default '+JSON.stringify(assets)+';');
try{
  await build({entryPoints:['server/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
  await cp('.openai/hosting.json','dist/.openai/hosting.json');
  await cp('drizzle','dist/.openai/drizzle',{recursive:true});
  const worker=await readFile('dist/server/index.js');
  console.log(`Worker: ${(worker.length/1048576).toFixed(2)} MB; compressed: ${(gzipSync(worker).length/1048576).toFixed(2)} MB. ${Object.keys(assets).length} assets included.`);
}finally{await rm('server/assets.generated.js',{force:true});}

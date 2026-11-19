import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist');
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):path.join(dir,entry.name)))).flat();}
const files=(await walk(root)).filter(f=>/\.(?:html|js|css|svg|wasm|webmanifest)$/.test(f)&&!f.endsWith('/sw.js')).sort();
const hash=createHash('sha256');for(const file of files)hash.update(await readFile(file));
const version=hash.digest('hex').slice(0,12);
const urls=files.map(file=>'/'+path.relative(root,file).split(path.sep).join('/'));
const template=await readFile('public/sw.js','utf8');
await writeFile(path.join(root,'sw.js'),template.replace('__BUILD_VERSION__',version).replace('/* __PRECACHE__ */[]',JSON.stringify(['/',...urls])));
console.log(`Prepared offline cache: ${files.length} files (${version}).`);

import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,rmSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
mkdirSync(resolve(root,'work'),{recursive:true});
await import('./build-content.mjs');
await import('./build-offline.mjs');
const sw=readFileSync(resolve(root,'sw.js'),'utf8'),files=[...JSON.parse(sw.match(/^const FILES=(.+);$/m)[1]),'sw.js'];
const marker=resolve(dist,'.bulkplan-build');
// Rebuild only a directory explicitly created by this builder; never erase an unknown output.
if(existsSync(dist)){if(!existsSync(marker))throw Error('dist exists without BulkPlan build marker; move it aside before building.');rmSync(dist,{recursive:true});}
mkdirSync(dist,{recursive:true});writeFileSync(marker,'BulkPlan generated runtime package\n');
const manifest=[];
for(const name of files){const source=resolve(root,name),dest=resolve(dist,name);if(relative(dist,dest).startsWith('..'))throw Error('Unsafe output path');mkdirSync(dirname(dest),{recursive:true});copyFileSync(source,dest);manifest.push({path:name,sha256:createHash('sha256').update(readFileSync(source)).digest('hex')});}
writeFileSync(resolve(root,'work/runtime-package-manifest.json'),JSON.stringify({files:manifest,excluded:['.agents','.codex','content','docs','outputs','work','tests','scripts','skills-lock.json','README.md','AGENTS.md','DESIGN.md']},null,2)+'\n');
console.log(`Built standalone runtime: ${files.length} files in dist/`);

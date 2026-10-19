#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const src=path.resolve(__dirname,'../app/assets');
const out=path.resolve(__dirname,'../build/hardened-assets');
const files=fs.readdirSync(src).filter(n=>n.endsWith('.js')).sort();
let failed=false; const report=[];
for(const name of files){
 const a=fs.readFileSync(path.join(src,name));
 const target=path.join(out,name);
 if(!fs.existsSync(target)){console.error('MISSING:',name);failed=true;continue}
 const b=fs.readFileSync(target);
 try{new vm.Script(b.toString(),{filename:name})}catch(e){console.error('INVALID:',name,e.message);failed=true}
 if(a.equals(b)){console.error('UNCHANGED:',name);failed=true}
 if(b.length>=a.length){console.error('NOT SMALLER:',name,`${a.length} -> ${b.length}`);failed=true}
 report.push({file:name,originalBytes:a.length,transformedBytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});
}
fs.mkdirSync(path.resolve(__dirname,'../build'),{recursive:true});
fs.writeFileSync(path.resolve(__dirname,'../build/staged-assets-report.json'),JSON.stringify({verified:!failed,files:report},null,2)+'\n');
console.log(`Checked ${report.length}/${files.length} first-party JavaScript files; staging ${failed?'FAILED':'PASSED'}`);
if(failed)process.exit(1);

#!/usr/bin/env node
'use strict';
// Produces staging assets only. Never rewrites first-party source files.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let terser;try{terser=require('./node_modules/terser')}catch{console.error('Missing pinned Terser: run npm ci in security/ (or install dependency there).');process.exit(2)}
const source=path.resolve(__dirname,'../app/assets'),target=path.resolve(__dirname,'../build/hardened-assets');
const firstParty=fs.readdirSync(source).filter(n=>n.endsWith('.js')).sort();
(async()=>{
 fs.rmSync(target,{recursive:true,force:true});fs.cpSync(source,target,{recursive:true});
 for(const file of firstParty){
  const input=fs.readFileSync(path.join(source,file),'utf8');
  const result=await terser.minify(input,{compress:{defaults:false,dead_code:true,drop_debugger:true},mangle:{toplevel:false},format:{comments:false,beautify:false},ecma:2020});
  assert(result.code && !result.error,'minification failed: '+file);
  new(require('node:vm').Script)(result.code,{filename:file});
  fs.writeFileSync(path.join(target,file),result.code+'\n');
 }
 // Make sure web entrypoints and vendor dependencies remain present.
 for(const f of ['index.html','vendor/leaflet.js','vendor/maplibre-gl-csp.js'])assert(fs.existsSync(path.join(target,f)),f);
 console.log(`Prepared ${firstParty.length} first-party JS files in ${target}`);
})().catch(e=>{console.error(e);process.exit(1)});

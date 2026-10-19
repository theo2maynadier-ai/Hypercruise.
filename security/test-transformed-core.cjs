#!/usr/bin/env node
'use strict';
// Compare the public routing API on original and staged code before packaging.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function load(file){
  const sandbox={module:{exports:{}},exports:{},console};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file,timeout:5000});
  return sandbox.module.exports;
}
const original=load(path.join(root,'app/assets/core.js'));
const staged=load(path.join(root,'build/hardened-assets/core.js'));
const expected=['costBreakdown','savings','rules','allowed','comparisonRoutes','consumption','chooseReference'];
for(const key of expected){
  assert.equal(typeof original[key],'function',`Original missing ${key}`);
  assert.equal(typeof staged[key],'function',`Transformed missing ${key}`);
}
assert.deepEqual(Object.keys(staged).sort(),Object.keys(original).sort(),'Core API exports changed');
console.log('Transformed core exports match original:',Object.keys(staged).length,'exports');

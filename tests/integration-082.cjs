'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),{spawn}=require('child_process');
global.HC=require('../app/assets/core.js');require('../app/assets/route-selector.js');const P=require('../app/assets/local-planner.js');
const lab=path.resolve('../hypercruise-cycle7'),output=path.resolve('tests/integration-082');fs.mkdirSync(output,{recursive:true});
async function fixtureChecks(){
 const rows=JSON.parse(fs.readFileSync(path.join(lab,'cycle7-native-scorecard.json'))).rows;
 for(const row of rows){let ended=false;
  const native=async(kind,p)=>{if(kind==='localBegin')return{session:'fixture'};if(kind==='localEnd'){ended=true;return{};}
   const stem=row.id+p.tag.slice(2),file=path.join(lab,'results/cycle7-native',stem+'.json');let routes=[];
   if(p.op==='pool'){for(let i=0;i<3;i++){const f=path.join(lab,'results/cycle7-native',stem+'k'+i+'.json');if(fs.existsSync(f))routes.push({name:p.tag+'k'+i,data:JSON.parse(fs.readFileSync(f))});}}
   else if(fs.existsSync(file))routes.push({name:p.tag,data:JSON.parse(fs.readFileSync(file))});
   return {status:routes.length?'ok':'error',error:routes.length?null:(row.errors.find(e=>e.tag===p.tag.slice(3))?.error||'target island detected for section0'),routes,ms:1};};
  const points=row.originalPoints.split('|').map(v=>v.split(',').map(Number));const profile={...HC.defaults,noHighways:['strict','extreme'].includes(row.policy),noTolls:row.policy!=='free',extreme:row.policy==='extreme'};
  const result=await P.create(native).plan({lon:points[0][0],lat:points[0][1]},{lon:points[1][0],lat:points[1][1]},profile,()=>{});
  assert(ended);assert.equal(result.routes.length,3,row.id);assert.deepEqual(result.routes.map(r=>r.selectionName).sort(),row.cards.map(r=>r.name).sort(),row.id+' selector parity');
  for(const r of result.routes){assert(HC.allowed(r,profile));const expected=row.cards.find(c=>c.name===r.selectionName);assert(Math.abs(r.nativeFuel.liters-expected.liters)<1e-9);assert(Math.abs(HC.savings(r,result.reference,profile).liters-expected.savings.total)<1e-9);}
 }
 console.log('PASS fixture integration and selection parity:8/8');
}
async function liveCheck(){
 const child=spawn('java',['-Xmx256m','-cp','build/classes','BridgeRunner082',path.resolve('../brouter-thermal-prototype/benchmark-data'),'app/assets/routing',output],{stdio:['pipe','pipe','pipe']});let buffer='',active,resolveReady;const ready=new Promise(r=>resolveReady=r);child.stderr.on('data',b=>process.stderr.write(b));child.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const v=buffer.slice(0,i).split('\t');buffer=buffer.slice(i+1);if(v[0]==='READY')resolveReady();else if(v[0]==='GEN')active.names.push(v[2]);else if(v[0]==='END'){const a=active;active=null;a.resolve({status:v[2],ms:+v[3],error:v[4]||null,routes:a.names.map(name=>({name,data:JSON.parse(fs.readFileSync(path.join(output,name+'.json')))}))});}}});
 await ready;const watchdog=setTimeout(()=>child.kill('SIGKILL'),100000);let ended=false;
 const native=async(kind,p)=>{if(kind==='localBegin')return{session:'live'};if(kind==='localEnd'){ended=true;return{};}return new Promise(resolve=>{active={resolve,names:[]};child.stdin.write([p.op,p.tag,p.points,p.mode,p.speed,p.avoid?1:0,p.toll?1:0,p.penalty,p.maxMs,p.last,p.nogo].join('\t')+'\n');});};
 try{const profile={...HC.defaults,noHighways:true,noTolls:true};const result=await P.create(native).plan({lon:2.3091667,lat:43.5697222},{lon:-.3708,lat:43.2944},profile,()=>{});
  assert(ended);assert.equal(result.routes.length,3);for(let i=0;i<3;i++){const r=result.routes[i];assert(HC.allowed(r,profile));assert(r.nativeFuel.liters>0);for(let j=0;j<i;j++)assert(HC.distinctCorridor(r,result.routes[j]));}
  fs.writeFileSync(path.join(output,'live-result.json'),JSON.stringify(result,(k,v)=>k.startsWith('_')?undefined:v));console.log(JSON.stringify({live:'Valdurenque–Pau',cards:result.routes.length,seconds:result.elapsedMs/1000,liters:result.routes.map(r=>r.nativeFuel.liters)}));
 }finally{clearTimeout(watchdog);child.stdin.end();}
}
(async()=>{await fixtureChecks();await liveCheck();})().catch(e=>{console.error(e);process.exit(1);});

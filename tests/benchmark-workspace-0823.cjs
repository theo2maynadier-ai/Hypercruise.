'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),out=__dirname+'/results';fs.mkdirSync(out,{recursive:true});
const child=spawn('java',['-Xmx384m','-cp',root+'/hypercruise-0823/build/nativeclasses','BenchmarkRouter0823',__dirname+'/maps/benchmark-data',root+'/hypercruise-0823/app/assets/routing',out]);
let buffer='',active,prefix='',resolveReady;const ready=new Promise(r=>resolveReady=r);
child.stderr.on('data',b=>fs.appendFileSync(__dirname+'/native.log',b));
child.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const v=buffer.slice(0,i).split('\t');buffer=buffer.slice(i+1);if(v[0]==='READY')resolveReady();else if(v[0]==='GEN')active.names.push(v[2]);else if(v[0]==='END'){const a=active;active=null;a.resolve({status:v[2],ms:+v[3],error:v[4]||null,routes:a.names.map(name=>({name,data:JSON.parse(fs.readFileSync(out+'/'+name+'.json'))}))});}}});
child.on('exit',c=>{if(active)active.reject(Error('native exited '+c));});
function modules(v){const b=root+'/hypercruise-'+v+'/app/assets/';global.HC=require(b+'core.js');global.HCSelector=require(b+'route-selector.js');return {C:global.HC,P:require(b+'local-planner.js')};}
function job(p,v,extreme){return new Promise((resolve,reject)=>{assert(!active);active={resolve,reject,names:[]};child.stdin.write([p.op,p.tag,p.points,p.mode,p.speed,p.avoid?1:0,p.toll?1:0,p.penalty,p.maxMs,p.last||'',p.nogo||'',root+'/hypercruise-'+v+'/app/assets/routing',extreme?1:0].join('\t')+'\n');}).then(r=>{for(const x of r.routes)fs.writeFileSync(out+'/'+prefix+'-'+x.name+'.json',JSON.stringify(x.data));return r;});}
function stats(r){const classes=r.diagnostic.classes,total=Object.values(classes).reduce((a,b)=>a+b,0),major=Object.entries(classes).reduce((n,[k,v])=>n+(/^(motorway|trunk|primary|secondary|tertiary)(?:_link)?$/.test(k)?v:0),0);return {role:r.selectionRole,label:r.label,candidate:r.selectionName,km:r.km,minutes:r.seconds/60,liters:r.nativeFuel.liters,per100:100*r.nativeFuel.liters/r.km,majorPercent:major/total*100,localKm:total-major,classes};}
const cases=[
 {id:'pau-urban',from:{lon:-.4099,lat:43.3218},to:{lon:-.3249,lat:43.2939}},
 {id:'castres-valdurenque',from:{lon:2.2339,lat:43.6082},to:{lon:2.3091667,lat:43.5697222}},
 {id:'toulouse-cross',from:{lon:1.493,lat:43.613},to:{lon:1.384,lat:43.604}},
 {id:'pau-bayonne',from:{lon:-.3708,lat:43.2951},to:{lon:-1.4748,lat:43.4929}},
 {id:'valdurenque-pau',from:{lon:2.3091667,lat:43.5697222},to:{lon:-.3708,lat:43.2944}},
 {id:'pau-bayonne-local',from:{lon:-.3708,lat:43.2951},to:{lon:-1.4748,lat:43.4929},noHighways:true,noTolls:true},
 {id:'extreme-control',from:{lon:2.2339,lat:43.6082},to:{lon:2.3091667,lat:43.5697222},extreme:true}
];
const prior=process.env.ONLY_NEW?JSON.parse(fs.readFileSync(__dirname+'/comparison-phase1.json')):null;
const report={generated:new Date().toISOString(),basis:'Actual APK LocalRouter and JS planners; identical pinned RD5; Android transport substituted; no live traffic or device GPS',rows:[]};
(async()=>{await ready;for(const c of cases){const row={...(prior?.rows.find(r=>r.id===c.id)||{}),...c};for(const v of (prior?['0823']:['0822','0823'])){const {C,P}=modules(v),profile={...C.defaults,extreme:!!c.extreme,noHighways:!!c.noHighways,noTolls:!!c.noTolls};prefix=c.id+'-'+v;let ended=false;console.log('START',prefix);
 const native=async(k,p)=>k==='localBegin'?{session:'bench'}:k==='localEnd'?(ended=true,{}):job(p,v,c.extreme);
 try{const result=await P.create(native).plan(c.from,c.to,profile,()=>{});assert(ended);assert(result.routes.every(r=>C.allowed(r,profile)));assert(result.routes.every(r=>r.roads.roughKm===0));
 row[v]={elapsedMs:result.elapsedMs,cards:result.routes.map(stats),jobs:result.diagnostics.jobs,errors:result.diagnostics.errors};fs.writeFileSync(out+'/'+prefix+'-plan.json',JSON.stringify(result,(k,v)=>k.startsWith('_')?undefined:v));console.log('DONE',prefix,JSON.stringify(row[v].cards.map(r=>({role:r.role,L:+r.liters.toFixed(3),min:+r.minutes.toFixed(1),major:+r.majorPercent.toFixed(1)}))));
 if(v==='0822'){row.oldGeometryNewModel=[];const n=modules('0823');for(const r of result.routes.filter(r=>!r.isBaseline)){const q=await job({op:'fixed',tag:'cross-'+c.id+'-'+r.selectionName,points:c.from.lon+','+c.from.lat+'|'+c.to.lon+','+c.to.lat,mode:'thermal',speed:c.extreme?65:75,avoid:!!c.extreme||!!c.noHighways,toll:!!c.extreme||!!c.noTolls,penalty:1,maxMs:4000,last:'hc-'+r.selectionName},'0823',c.extreme);if(q.routes[0]){const a=n.P.route(q.routes[0].data,'Old geometry / new model',profile,c.extreme?'extreme':'eco');assert.deepEqual(a.coordinates,r.coordinates);row.oldGeometryNewModel.push({oldRole:r.selectionRole,oldCandidate:r.selectionName,...stats(a)});}else row.oldGeometryNewModel.push({error:q.error});}}
 }catch(e){row[v]={error:e.stack};console.log('FAIL',prefix,e.message);}
 }report.rows.push(row);fs.writeFileSync(__dirname+'/comparison.json',JSON.stringify(report,null,2));}child.stdin.end();console.log('COMPLETE');})().catch(e=>{console.error(e);child.kill();process.exitCode=1;});

'use strict';
const fs=require('fs'),path=require('path'),A=require('node:assert/strict'),C=require('../app/assets/core.js');global.HC=C;const P=require('../app/assets/local-planner.js'),T=require('../app/assets/toll-cost.js'),S=require('../app/assets/route-selector.js'),root=path.resolve(__dirname,'../..');let checks=0;function check(fn){fn();checks++;}
function real(id){return P.route(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/tolls/')+id+'-fast.json')),id,C.defaults,'reference');}
const urban=real('pau-urban'),bay=real('pau-bayonne'),long=real('valdurenque-pau'),p={...C.defaults};
check(()=>A.equal(T.quote(urban).euros,0));check(()=>A.equal(T.quote(bay).euros,9.7));check(()=>A.equal(T.quote(long).euros,15.5));check(()=>A.equal(T.quote(long).charges.length,3));check(()=>A.equal(T.quote(long,{vehicleClass:2}).euros,null));check(()=>A.equal(T.quote(long,{asOf:'2027-02-01'}).complete,false));check(()=>A.equal(T.quote({...long,tollEvents:[...long.tollEvents,{distance:long.cumulative.at(-1)-100,point:[0,0]}]}).complete,false));check(()=>A.equal(T.quote({...urban,roads:{...urban.roads,status:'unavailable'}}).complete,false));
const ref={route:{...bay,isBaseline:true},planKey:C.rules(p).key},alt={...bay,nativeFuel:{...bay.nativeFuel,liters:bay.nativeFuel.liters-1}};
check(()=>A.equal(C.savings(ref.route,ref,p).euros,0));check(()=>A(Math.abs(C.savings(alt,ref,p).euros-p.price)<1e-9));check(()=>A.equal(C.savings(alt,ref,{...p,price:2}).available,false));check(()=>A.equal(C.costBreakdown(bay,p).totalEuros,bay.nativeFuel.liters*p.price+9.7));check(()=>A.equal(C.rules({...p,noHighways:true,noTolls:false}).noTolls,false));
const trunk={roads:{status:'ready',roughKm:0,toll:false,segments:[{roadClass:'trunk'}]},toll:false,highway:true};check(()=>A(C.allowed(trunk,{...p,noHighways:true})));check(()=>A(!C.allowed({...trunk,roads:{...trunk.roads,segments:[{roadClass:'motorway'}]}},{...p,noHighways:true})));check(()=>A(!C.allowed({...trunk,tollQuote:{euros:.5}},{...p,noTolls:true})));
// Current selector evidence uses complete native plans, never copies of one geometry.
for(const id of ['pau-valdurenque','valdurenque-pau-priority','pau-bayonne']){
 const plan=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/mixed25',id+'.json'))),routes=plan.routes;
 check(()=>A.equal(routes.length,3));check(()=>A.deepEqual(routes.map(r=>r.selectionRole),['economy','compromise','fast']));
 const costs=routes.map(r=>C.costBreakdown(r,p).totalEuros);check(()=>A(costs[0]<costs[1]&&costs[1]<costs[2]));
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)check(()=>A(S.distinct({active:routes[i]},{active:routes[j]})));
 check(()=>A.equal(C.savings(routes[2],plan.reference,p).euros,0));
 check(()=>A(C.savings(routes[0],plan.reference,p).euros>C.savings(routes[1],plan.reference,p).euros));
 check(()=>A(routes[1].seconds<=routes[2].seconds+S.allowance(routes[2].seconds,'compromise')));
 check(()=>A(routes[0].seconds<=routes[2].seconds+S.allowance(routes[2].seconds,'eco')));
 if(id==='pau-valdurenque')check(()=>A(routes[2].routingMix.motorwayKm-routes[0].routingMix.motorwayKm>200));
 const candidates=routes.map((r,i)=>({name:'r'+i,active:r,normal:r,balanced:r,D:r.km,L:r.nativeFuel.liters,T:r.seconds}));
 const one=S.select([candidates[2],{...candidates[2],name:'clone'}],p);check(()=>A.equal(one.cards.length,1));check(()=>A.equal(one.complete,false));
}
// Controlled shortcut cases: the real native plans above verify full geometries.
const originalCost=C.costBreakdown,originalDistinct=C.distinctCorridor;
C.distinctCorridor=(a,b)=>a.id!==b.id;
C.costBreakdown=(r,p)=>({complete:true,fuelEuros:r.nativeFuel.liters*p.price,tollEuros:r.fee,totalEuros:r.nativeFuel.liters*p.price+r.fee});
function candidate(id,sec,liters,fee,legalSec=sec,legalL=liters){const active={id,km:10,cumulative:[0,10000],roads:{segments:[{from:0,to:10000,km:10,roadClass:'primary'}]},seconds:sec,nativeFuel:{liters},fee},normal={...active,seconds:legalSec,nativeFuel:{liters:legalL}};return {name:id,active,normal,balanced:normal,D:10,L:liters,T:sec};}
const fast=candidate('fast',3600,6,10),comp=candidate('comp',3900,6,5.5),cheap=candidate('cheap',4500,5,1.25),tiny=candidate('tiny',4200,5.03,1.3975);
let picked=S.select([fast,comp,cheap,tiny],p);check(()=>A.equal(picked.cards[0].name,'tiny'));check(()=>A(Math.abs(picked.timeTradeoff.extraEuros-.2)<1e-8));check(()=>A.equal(picked.timeTradeoff.secondsSaved,300));
const tooPaid=candidate('tooPaid',4200,5.03,3),tooFuel=candidate('tooFuel',4200,5.5,.5),tooSlow=candidate('tooSlow',6000,2,0);
for(const alt of [tooPaid,tooFuel,tooSlow])check(()=>A.equal(S.select([fast,comp,cheap,alt],p).cards[0].name,'cheap'));
C.costBreakdown=originalCost;C.distinctCorridor=originalDistinct;
const assets=path.resolve(__dirname,'../app/assets'),app=fs.readFileSync(assets+'/app.js','utf8'),chrome=fs.readFileSync(assets+'/chrome.js','utf8'),html=fs.readFileSync(assets+'/index.html','utf8');check(()=>A(app.includes("gain.euros<-.005?'−':'+'")));check(()=>A(app.includes('Total ')));check(()=>A(chrome.includes("'Péages · '")));check(()=>A(chrome.includes("'Total · '")));check(()=>A(!chrome.includes('tarif non inclus')));check(()=>A(html.indexOf('toll-cost.js')<html.indexOf('local-planner.js')));
console.log('PASS '+checks+' tariff, unknown coverage, total cost, fastest +0, independent options, three distinct native corridors, ordered savings, time bounds, duplicate suppression and UI checks');

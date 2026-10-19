const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context={HC:{distinctCorridor:(a,b)=>a.id!==b.id}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('app/assets/route-selector.js','utf8'),context);
function candidate(name,L,T,fast,local){const route={id:name,cumulative:[0,10000],roads:{segments:[{from:0,to:1000,km:1,roadClass:'primary'},{from:1000,to:1000+local*1000,km:local,roadClass:'residential'},{from:1000+local*1000,to:10000,km:9-local,roadClass:'secondary'}]},seconds:T,nativeFuel:{liters:L}};return {name,active:route,normal:{...route,seconds:fast,nativeFuel:{liters:L+1}},L,T,D:10,H:0,U:local,S:0,F:0};}
const goat=candidate('goat',1,1000,900,4),main=candidate('main',1.08,950,850,.2);
main.balanced={...main.active,seconds:850,nativeFuel:{liters:1.2}};
let r=context.HCSelector.select([goat,main],{});assert.equal(r.cards[0].name,'main');assert.equal(r.cards[1].role,'compromise');assert(r.cards[1].sharedGeometry);assert.equal(r.cards.at(-1).role,'fast');assert.equal(r.reference.name,'main');
goat.normal.seconds=700;assert.equal(context.HCSelector.select([goat,main],{}).reference.name,'main','fast respects main-axis constraint independently of fuel');main.normal.nativeFuel.liters=100;assert.equal(context.HCSelector.select([goat,main],{}).reference.name,'main','fastest selection ignores fuel');
assert.equal(context.HCSelector.select([goat,main],{extreme:true}).cards[0].name,'goat','Extremiling retains energy objective');
const expensive=candidate('expensive',1.5,950,850,.2);assert.equal(context.HCSelector.select([goat,expensive],{}).cards[0].name,'goat','bounded fuel cost prevents excessive detour');
main.balanced.seconds=960;assert(!context.HCSelector.select([goat,main],{}).cards.some(c=>c.role==='compromise'),'no slower compromise');
const only=context.HCSelector.select([main],{});assert(only.cards.some(c=>c.role==='fast')&&only.cards.at(-1).sharedGeometry,'fast retained with common geometry');
const java=fs.readFileSync('app/src/fr/hypercruise/LocalEngine.java','utf8');assert(java.includes('routing-v11'));assert(java.includes('s.extreme&&!mode.equals("fast")?"0":"1"'));assert(java.includes('!op.equals("fixed")&&mode.equals("compromise")?"2":"0"'));
console.log('PASS main-axis preference, bounded fuel tradeoff, pure time selection, Extremiling, honest common geometry, no dominated compromise and native profile refresh.');

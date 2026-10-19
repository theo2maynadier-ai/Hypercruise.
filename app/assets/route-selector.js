(function(root){'use strict';const HC=root.HC;
function distinct(a,b){const x=a.active,y=b.active;if(HC.distinctCorridor(x,y))return true;if(!x.coordinates?.length||!y.coordinates?.length)return false;const shared=Math.min(HC.overlap(x,y,60),HC.overlap(y,x,60)),div=Math.min(x.km,y.km)*(1-shared);return shared<.98&&div>Math.max(.8,Math.min(3,Math.min(x.km,y.km)*.025));}
function axisPenalty(){return 0;}
function localShare(r){const total=r.active.cumulative.at(-1),access=Math.min(500,total*.15),length=Math.max(1,total-2*access);let local=0;for(const s of r.active.roads?.segments||[])if(!/^(motorway|trunk|primary|secondary|tertiary)$/.test(s.roadClass)||s.narrow)local+=Math.max(0,Math.min(s.to,total-access)-Math.max(s.from,access));return local/length;}
function allowance(t,mode){return mode==='compromise'?Math.min(1200,Math.max(60,t*.10)):Math.min(5400,Math.max(180,t*.40));}
function select(candidates,p){
 if(!candidates.length)return {cards:[],complete:false,reason:'no complete legal route'};
 const comfortLimit=Math.max(.10,Math.min(...candidates.map(localShare))+.05),comfortable=candidates.filter(c=>localShare(c)<=comfortLimit),pool=comfortable.length?comfortable:candidates;
 const reference=[...pool].sort((a,b)=>a.normal.seconds-b.normal.seconds||a.D-b.D)[0],fastSeconds=reference.normal.seconds,refCost=HC.costBreakdown(reference.normal,p),ref={...reference,active:reference.normal};
 const active=c=>({...c,L:c.active.nativeFuel.liters,T:c.active.seconds,cost:HC.costBreakdown(c.active,p)}),legal=c=>({...c,active:c.balanced||c.normal,L:(c.balanced||c.normal).nativeFuel.liters,T:(c.balanced||c.normal).seconds,cost:HC.costBreakdown(c.balanced||c.normal,p)});
 const budgetEco=fastSeconds+allowance(fastSeconds,'eco');let eligible=pool.map(active).filter(c=>p.extreme||c.T<=budgetEco);
 if(!eligible.length)eligible=pool.map(active).sort((a,b)=>a.T-b.T).slice(0,1);
 let economy=null,compromise=null,timeTradeoff=null;
 if(p.extreme)economy=eligible.slice().sort((a,b)=>a.L-b.L||a.T-b.T)[0];
 else{
  const gainMin=Math.max(.25,refCost.totalEuros*.05),options=pool.map(legal).filter(c=>c.cost.complete&&refCost.complete&&c.T<=fastSeconds+allowance(fastSeconds,'compromise')&&c.cost.totalEuros<=refCost.totalEuros-gainMin&&distinct(c,ref)).sort((a,b)=>a.cost.totalEuros-b.cost.totalEuros||a.T-b.T);
  const ecoBase=eligible.filter(c=>distinct(c,ref)&&c.cost.complete&&(!refCost.complete||c.cost.totalEuros<refCost.totalEuros-.1)).sort((a,b)=>a.cost.totalEuros-b.cost.totalEuros||a.T-b.T);
  // Select a pair jointly. Speed variants of the same geometry never fill cards.
  for(const c of options){const e=ecoBase.find(e=>e.cost.totalEuros<c.cost.totalEuros-Math.max(.10,c.cost.totalEuros*.005)&&distinct(e,c));if(e){compromise=c;economy=e;break;}}
  if(!economy)economy=ecoBase[0]||eligible.filter(c=>distinct(c,ref)&&(!c.cost.complete||!refCost.complete)).sort((a,b)=>a.L-b.L||a.T-b.T)[0]||null;
  if(!compromise&&economy)compromise=options.find(c=>distinct(c,economy)&&economy.cost.complete&&economy.cost.totalEuros<c.cost.totalEuros-Math.max(.10,c.cost.totalEuros*.005))||null;
  if(economy?.cost.complete){const cheapest=economy,costBudget=Math.min(1,Math.max(.30,cheapest.cost.totalEuros*.03)),fuelBudget=Math.min(.5,Math.max(.02,cheapest.L*.03));
   const faster=ecoBase.filter(c=>c.cost.totalEuros<=cheapest.cost.totalEuros+costBudget+1e-9&&c.L<=cheapest.L+fuelBudget+1e-9&&c.T<=cheapest.T-120&&(!compromise||(distinct(c,compromise)&&c.cost.totalEuros<compromise.cost.totalEuros-Math.max(.10,compromise.cost.totalEuros*.005)))&&(!p.noTolls||c.cost.tollEuros===0)).sort((a,b)=>a.T-b.T||a.cost.totalEuros-b.cost.totalEuros)[0];
   if(faster){economy=faster;timeTradeoff={extraEuros:faster.cost.totalEuros-cheapest.cost.totalEuros,extraLiters:faster.L-cheapest.L,secondsSaved:cheapest.T-faster.T,budgetEuros:costBudget,baselineName:cheapest.name};}
  }
 }
 const cards=[];if(economy)cards.push({...economy,role:'economy',timeTradeoff,reason:[p.extreme?'extremiling_separate':timeTradeoff?'distinct_mix_small_cost_for_time':'distinct_mix_lower_total_cost']});if(compromise)cards.push({...compromise,role:'compromise',reason:['distinct_mix_near_fastest_lower_total_cost']});cards.push({...reference,role:'fast',reason:['lowest_elapsed_seconds_among_evaluated']});
 for(const card of cards){const fast=card.role==='fast',L=fast?card.normal.nativeFuel.liters:card.L;card.displayLiters=L;card.displaySeconds=fast?card.normal.seconds:card.T;card.estimateOnly=true;const refEco=reference.active.nativeFuel.liters;card.savings={total:reference.normal.nativeFuel.liters-L,driving:fast?0:reference.normal.nativeFuel.liters-refEco,routing:fast?0:refEco-L};}
 return {cards,reference,complete:p.extreme?cards.length>=2:cards.length===3,reason:cards.length<3?'insufficient distinct useful corridors':null,comfortLimit,totalCostRanking:true,partialTollCoverage:eligible.some(c=>!c.cost.complete),timeTradeoff,distinctRequired:!p.extreme};
}
root.HCSelector={select,distinct,axisPenalty,localShare,allowance};if(typeof module!=='undefined')module.exports=root.HCSelector;
})(typeof window!=='undefined'?window:globalThis);

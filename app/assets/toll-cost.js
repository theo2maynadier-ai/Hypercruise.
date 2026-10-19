(function(root){'use strict';
const DATA=root.HCTollData||(typeof require==='function'?require('./toll-data.js'):null);
function projection(p,a,b){const x=111320*Math.cos(p[0]*Math.PI/180),y=111320,ax=(a[1]-p[1])*x,ay=(a[0]-p[0])*y,bx=(b[1]-p[1])*x,by=(b[0]-p[0])*y,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));return {meters:Math.hypot(ax+t*dx,ay+t*dy),t};}
function computeQuote(route,{asOf=new Date().toISOString().slice(0,10),vehicleClass=1}={}){
 const unknown=reason=>({status:'unknown',complete:false,euros:null,reason,version:DATA.version,vehicleClass,source:DATA.priceSource});
 if(vehicleClass!==1)return unknown('Classe de véhicule non couverte');if(asOf<DATA.validFrom||asOf>=DATA.validUntil)return unknown('Tarifs à actualiser');
 const points=route.coordinates,cum=route.cumulative,segs=route.roads?.segments;
 if(!Array.isArray(points)||points.length<2||!Array.isArray(cum)||!Array.isArray(segs)||route.roads.status!=='ready')return unknown('Tracé routier incomplet');
 // Match the government's physical plaza locations to the actual driven road.
 // Opposite lanes are one logical station, never two successive charges.
 const hits=[];
 for(const s of DATA.stations){let best=null;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];if(s.lat<Math.min(a[0],b[0])-.0005||s.lat>Math.max(a[0],b[0])+.0005||s.lon<Math.min(a[1],b[1])-.0007||s.lon>Math.max(a[1],b[1])+.0007)continue;
   const q=projection([s.lat,s.lon],a,b);if(q.meters>40||best&&q.meters>=best.meters)continue;
   const distance=cum[i-1]+(cum[i]-cum[i-1])*q.t;
   const seg=segs.find(x=>distance>=x.from-8&&distance<=x.to+8);
   if(q.meters>15&&!route.tollEvents?.some(e=>Math.abs(e.distance-distance)<400))continue;
   if(!seg||(!seg.toll&&!/^motorway|^trunk/.test(seg.roadClass)&&!route.tollEvents?.some(e=>Math.abs(e.distance-distance)<60)))continue;
   best={...s,distance,meters:q.meters};
  }if(best){const near=(route.tollEvents||[]).filter(e=>Math.abs(e.distance-best.distance)<(s.barrier?800:400)).sort((a,b)=>Math.abs(a.distance-best.distance)-Math.abs(b.distance-best.distance))[0];if(near)best.distance=near.distance;hits.push(best);}
 }
 // Some published ramp points are displaced from the mapped booth itself.
 // Recover only an unambiguous nearby logical plaza, never a remote station.
 for(const e of route.tollEvents||[]){if(hits.some(h=>Math.abs(h.distance-e.distance)<110))continue;const grouped=new Map();for(const st of DATA.stations){const d=projection(e.point,[st.lat,st.lon],[st.lat,st.lon]).meters;if(d>550)continue;const old=grouped.get(st.key);if(!old||d<old.meters)grouped.set(st.key,{...st,meters:d,distance:e.distance,positionMatch:'nearby-published-plaza'});}const near=[...grouped.values()].sort((a,b)=>a.meters-b.meters);if(near[0]&&(!near[1]||near[1].meters>near[0].meters+150))hits.push(near[0]);}
 hits.sort((a,b)=>a.distance-b.distance);const events=[];
 for(const h of hits){const prev=events.at(-1);if(prev&&prev.key===h.key&&h.distance-prev.distance<250){if(h.meters<prev.meters)events[events.length-1]=h;}else events.push(h);}
 // A mapped booth not recognized by a tariff station is never assumed free.
 for(const e of route.tollEvents||[])if(!events.some(h=>Math.abs(h.distance-e.distance)<110))return {...unknown('Gare de péage non identifiée'),events};
 const charges=[],covered=[];let entry=null;
 for(const e of events){if(e.kind==='unsupported')return {...unknown('Tarif de ce réseau indisponible'),events};if(e.kind==='open'){charges.push({key:e.key,label:e.label,cents:e.cents,from:e.distance,to:e.distance,kind:'open'});covered.push([e.distance-130,e.distance+130]);continue;}
  if(!entry){entry=e;continue;}
  const key=[entry.key,e.key].sort().join('~'),price=DATA.pricesCents[key];
  if(!Number.isFinite(price))return {...unknown('Couple entrée / sortie non tarifé'),events};
  charges.push({label:entry.label+' → '+e.label,cents:price,from:entry.distance,to:e.distance,kind:'closed'});covered.push([entry.distance-(entry.barrier?5000:650),e.distance+(e.barrier?5000:650)]);entry=null;
 }
 if(entry)return {...unknown('Entrée ou sortie de péage manquante'),events};
 // toll=yes stretches must be covered by the charged closed system or an open gate.
 // An open-system road can extend beyond its booth. It is bounded by the same
 // contiguous marked toll section; a booth does not price an unrelated motorway.
 function openScope(c,a,b){
  if(c.key!=='A68|TOULOUSE EST'||a<c.from-25000||b>c.from+25000)return false;
  // ASF Toulouse Est prices the A68/A680 open system, including its separated
  // toll=yes stretches; gaps in cartographic tagging do not create a new toll.
  for(const d of [a,(a+b)/2,b]){let i=1;while(i<cum.length-1&&cum[i]<d)i++;const f=Math.max(0,Math.min(1,(d-cum[i-1])/(cum[i]-cum[i-1]||1))),lat=points[i-1][0]+f*(points[i][0]-points[i-1][0]),lon=points[i-1][1]+f*(points[i][1]-points[i-1][1]);if(lat<43.62||lat>43.72||lon<1.47||lon>1.68)return false;}return true;
 }
 const paid=segs.filter(s=>s.toll),runs=[];for(const s of paid){const prev=runs.at(-1);if(prev&&s.from-prev[1]<250)prev[1]=s.to;else runs.push([s.from,s.to]);}
 for(const [a,b]of runs){if(covered.some(q=>a>=q[0]-150&&b<=q[1]+150))continue;const opens=charges.filter(c=>c.kind==='open'&&c.from>=a-250&&c.from<=b+250);const closed=charges.filter(c=>c.kind==='closed'&&c.from<=b&&c.to>=a);if(!opens.length&&!closed.length&&!charges.some(c=>c.kind==='open'&&openScope(c,a,b)))return {...unknown('Portion payante sans tarif identifiable'),events};}
 const cents=charges.reduce((n,c)=>n+c.cents,0);
 return {status:cents?'priced':'no-mapped-toll',complete:true,euros:cents/100,cents,charges,events,source:DATA.priceSource,locationSource:DATA.locationSource,checkedAt:DATA.checkedAt,version:DATA.version,vehicleClass,estimate:true};
}
function quote(route,options={}){const key=DATA.version+'|'+(options.asOf||new Date().toISOString().slice(0,10))+'|'+(options.vehicleClass||1),c=route._tollCache;if(c&&c.key===key&&c.coordinates===route.coordinates&&c.roads===route.roads&&c.events===route.tollEvents)return c.value;const value=computeQuote(route,options);route._tollCache={key,coordinates:route.coordinates,roads:route.roads,events:route.tollEvents,value};return value;}
function total(route,p){const fuel=route.nativeFuel?.liters??route.energy?.liters,price=Number(p?.price),q=quote(route,{vehicleClass:Number(p?.tollClass||1)});if(!Number.isFinite(fuel)||fuel<0||!Number.isFinite(price)||price<=0)return {complete:false,fuelEuros:null,tollEuros:q.euros,totalEuros:null,toll:q};return {complete:q.complete,fuelEuros:fuel*price,tollEuros:q.euros,totalEuros:q.complete?fuel*price+q.euros:null,toll:q};}
root.HCTolls={quote,total,projection};if(typeof module!=='undefined')module.exports=root.HCTolls;
})(typeof window!=='undefined'?window:globalThis);

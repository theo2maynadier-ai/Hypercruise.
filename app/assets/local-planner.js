(function(root){
'use strict';
const C=root.HC,limits=root.HCSpeedLimit||(typeof require==='function'?require('./speed-limit.js'):null);
function physicalKey(p){return JSON.stringify([Number(p.base),Number(p.mass),Number(p.calibrationMass)]);}
function route(data,label,p,mode,seconds){
 const feature=data.features?.find(f=>f.geometry?.type==='LineString'),prop=feature?.properties,raw=feature?.geometry.coordinates;
 if(!raw||raw.length<2||raw.some(q=>!Number.isFinite(q[0])||!Number.isFinite(q[1])||!Number.isFinite(q[2])))throw Error('Géométrie ou altitude locale incomplète');
 const coordinates=raw.map(q=>[q[1],q[0]]),cumulative=C.cumulative(coordinates),km=Number(prop['track-length'])/1000,liters=Number(prop['total-energy'])/36e6;
 if(!(km>0)||!(liters>=0))throw Error('Estimation locale invalide');
 let distance=0,urbanKm=0,smallKm=0,roughKm=0,toll=false,expressway=false,signals=0,stops=0,segments=[],classes={},tollEvents=[];
 const header=prop.messages?.[0]||[];
 for(const values of (prop.messages||[]).slice(1)){
  const row=Object.fromEntries(header.map((h,i)=>[h,values[i]])),tags=row.WayTags||'',node=row.NodeTags||'',highway=/(?:^| )highway=([^ ]+)/.exec(tags)?.[1]||'unknown',length=Number(row.Distance)/1000;
  if(!Number.isFinite(length)||length<0)throw Error('Attributs locaux incomplets');
  const fast=/^(motorway|trunk)(?:_link)?$/.test(highway)||/(?:^| )motorroad=yes(?: |$)/.test(tags),urban=/^(residential|living_street)$/.test(highway),rough=/^(track|path|footway|cycleway|steps|bridleway)$/.test(highway),paid=/(?:^| )toll=yes(?: |$)/.test(tags)||node.includes('barrier=toll_booth');
  classes[highway]=(classes[highway]||0)+length;urbanKm+=urban?length:0;smallKm+=highway==='unclassified'||highway==='service'?length:0;roughKm+=rough?length:0;expressway ||=fast;toll ||=paid;
  if(/barrier=toll_booth|highway=toll_gantry/.test(node)){const point=[Number(row.Latitude)/1e6,Number(row.Longitude)/1e6];let best=Infinity,idx=0;for(let j=0;j<coordinates.length;j++){const d=C.distance(point,coordinates[j]);if(d<best){best=d;idx=j;}}tollEvents.push({distance:cumulative[idx],point});}
  signals+=/highway=traffic_signals|crossing=traffic_signals/.test(node)?1:0;stops+=node.includes('highway=stop')?1:0;
  segments.push({from:distance,to:distance+length*1000,km:length,roadClass:highway.replace(/_link$/,''),urban,toll:paid,expressway:fast,rough,narrow:/(?:^| )lanes=(?:1|1\.5)(?: |$)/.test(tags)&&!/(?:^| )oneway=(?:yes|true|1|-1|reversible)(?: |$)/.test(tags)&&!/^motorway/.test(highway),limit:Number(/(?:^| )maxspeed=(\d+)/.exec(tags)?.[1])||0});distance+=length*1000;
 }
 if(Math.abs(distance/1000-km)>Math.max(.3,km*.03))throw Error('Tracé local non vérifié sur toute sa longueur');
 const samples=raw.map((q,i)=>({distance:cumulative[i],height:q[2]}));let descent=0;for(let i=1;i<raw.length;i++)descent+=Math.max(0,raw[i-1][2]-raw[i][2]);
 const words={1:'Continue tout droit',2:'Tourne à gauche',3:'Tourne légèrement à gauche',4:'Tourne franchement à gauche',5:'Tourne à droite',6:'Tourne légèrement à droite',7:'Tourne franchement à droite',8:'Garde la gauche',9:'Garde la droite',10:'Fais demi-tour',11:'Fais demi-tour',13:'Prends le rond-point',14:'Prends le rond-point',17:'Prends la sortie à gauche',18:'Prends la sortie à droite'};
 const types={1:8,2:15,3:14,4:16,5:10,6:9,7:11,8:24,9:23,10:12,11:13,13:26,14:27,17:21,18:20};
 let steps=[{begin:0,end:0,type:8,instruction:'Suis le tracé.'}];
 for(const h of prop.voicehints||[]){if(h[0]>=0&&h[0]<coordinates.length){let instruction=words[h[1]]||'Continue sur le tracé';if([13,14].includes(h[1])&&h[2])instruction+=', sortie '+Math.abs(h[2]);steps.push({begin:h[0],end:h[0],type:types[h[1]]||8,instruction:instruction+'.',length:h[3]/1000});}}
 steps.push({begin:coordinates.length-1,end:coordinates.length-1,type:4,instruction:'Tu es à destination.'});steps.sort((a,b)=>a.begin-b.begin);
 const r={tollEvents,speedLimits:limits?limits.segments(raw,cumulative,prop.messages):[],label,mode,provider:'Moteur local · BRouter thermique',coordinates,cumulative,km,seconds:seconds||Number(prop['total-time']),originalSeconds:seconds||Number(prop['total-time']),steps,toll,highway:expressway,ferry:false,modelVersion:C.VERSION,plan:{...C.rules(p),extreme:mode==='extreme',habitual:mode==='reference',cruise:mode==='compromise'||mode==='reference'?130:p.extreme?70:110},roads:{status:'ready',version:C.VERSION,segments,km,urbanKm,smallKm,roughKm,toll,expressway,urbanKnown:true},elevation:{status:'ready',version:C.VERSION,samples,ascent:Number(prop['filtered ascend']),descent,min:raw.reduce((n,q)=>Math.min(n,q[2]),Infinity),max:raw.reduce((n,q)=>Math.max(n,q[2]),-Infinity),source:'Altitudes RD5 · D+ affiché BRouter'},nativeFuel:{liters,physicalKey:physicalKey(p),version:C.VERSION},diagnostic:{classes,signals,stops,modeledAscent:Number(prop['modeled-ascent']),displayedAscent:Number(prop['filtered ascend']),urbanMethod:'Classes residential/living_street, sans comptage complet des agglomérations',estimate:true}};
 if(mode==='extreme'&&((p.noHighways&&expressway)||(p.noTolls&&toll)))throw Error('Extremiling rejeté : voie rapide ou péage interdit');
 const tollProvider=root.HCTolls||(typeof require==='function'?require('./toll-cost.js'):null);r.tollQuote=tollProvider?.quote(r,{vehicleClass:Number(p.tollClass||1)});
 return r;
}
function create(nativeRequest){return {async reroute(from,to,profile,habitual,heading,drivingMode,strategy){
 const p={...C.defaults,...profile,...C.rules(profile)},speed=habitual?130:p.extreme?70:drivingMode==='compromise'?130:110,points=from.lon+','+from.lat+'|'+to.lon+','+to.lat;let session;
 try{
  session=(await nativeRequest('localBegin',{from,to,profile:p})).session;
  const common={session,points,speed,avoid:!!p.noHighways,toll:!!p.noTolls,penalty:1,last:'',nogo:strategy?.nogo||'',timeWeight:strategy?.timeWeight??(drivingMode==='compromise'?8:0),tollDisutility:strategy?.tollDisutility||0};
  const q=await nativeRequest('localJob',{...common,op:'single',tag:'nav-route',mode:habitual?'fast':drivingMode==='compromise'?'compromise':'thermal',maxMs:18000,heading:Number.isFinite(heading)?heading:null});
  const raw=q.routes?.[0];if(!raw)throw Error(q.error||'Recalcul non terminé dans le délai.');
  const replay=await nativeRequest('localJob',{...common,op:'fixed',tag:'nav-replay',mode:habitual?'fast':drivingMode==='compromise'?'compromise':'thermal',maxMs:4000,last:raw.name});
  const checked=replay.routes?.[0];if(!checked)throw Error(replay.error||'Évaluation du nouveau trajet indisponible.');
  if(JSON.stringify(raw.data.features[0].geometry.coordinates)!==JSON.stringify(checked.data.features[0].geometry.coordinates))throw Error('Le tracé du recalcul ne correspond pas à son évaluation.');
  const out=route(checked.data,habitual?'Le plus rapide':p.extreme?'Extremiling':drivingMode==='compromise'?'Compromis':'Éco',p,habitual?'reference':p.extreme?'extreme':drivingMode==='compromise'?'compromise':'eco');
  if(!C.allowed(out,p))throw Error('Nouveau trajet incompatible avec les options.');
  out.routingStrategy=strategy||null;out.isBaseline=!!habitual;out.estimateOnly=true;out.rerouted=true;return out;
 }finally{if(session)try{await nativeRequest('localEnd',{session});}catch(_){}}
},async plan(from,to,profile,progress){
 const S=root.HCSelector,p={...C.defaults,...profile,...C.rules(profile)},id='hc',BUDGET=150000,start=performance.now();
 let originalPoints=from.lon+','+from.lat+'|'+to.lon+','+to.lat,points=originalPoints,snapping=null,killed=false,result;
 const data=new Map(),names=[],jobs=[],errors=[],seenGeometry=new Map(),strategies=new Map();let session;
 const remaining=()=>BUDGET-(performance.now()-start)-500;
 function load(){let pool=[];for(const name of [...new Set(names)]){
  const stem=id+'-'+name,raw=data.get(stem),a=data.get(stem+'-v'+(p.extreme?70:110)),b=data.get(stem+'-v130');if(!raw||!a||!b)continue;
  if([a,b].filter(Boolean).some(d=>JSON.stringify(raw.features[0].geometry.coordinates)!==JSON.stringify(d.features[0].geometry.coordinates)))continue;
  try{const active=route(a,name,p,p.extreme?'extreme':'eco'),normal=route(b,name,p,'reference'),balanced=p.extreme?null:{...normal,mode:'compromise',plan:{...normal.plan,habitual:false,cruise:130}};if(!C.allowed(active,p))continue;
   pool.push({name,active,normal,balanced,L:active.nativeFuel.liters,T:active.seconds,D:active.km,H:active.elevation.ascent,U:active.roads.urbanKm,S:active.diagnostic.signals+active.diagnostic.stops,F:active.roads.segments.reduce((n,s)=>n+(s.expressway?s.km:0),0)});
  }catch(e){errors.push(e.message);}
 }return pool;}
 async function request(op,tag,mode,speed,avoid,toll,penalty,maxMs,last,nogo,tollDisutility=0,timeWeight=null){
  timeWeight=timeWeight??(mode==='compromise'?8:0);const ms=Math.floor(Math.min(maxMs,remaining()));if(ms<150)return {status:'budget',names:[]};
  progress(op==='fixed'?'Évaluation du carburant et des virages…':mode==='fast'?'Recherche de la référence rapide…':'Recherche de corridors économes…');
  const r=await nativeRequest('localJob',{session,op,tag:id+'-'+tag,points,mode,speed,avoid:!!avoid,toll:!!toll,penalty,tollDisutility,timeWeight,maxMs:ms,last:last||'',nogo:nogo||''});
  const fullnames=[];for(const value of r.routes||[]){data.set(value.name,value.data);fullnames.push(value.name);}
  if(op!=='fixed')for(const n of fullnames)strategies.set(n.slice(id.length+1),{nogo:nogo||'',timeWeight:mode==='fast'?0:timeWeight,tollDisutility,kind:nogo?'segment_mix':tollDisutility?'price_mix':'normal'});
  jobs.push({tag,op,status:r.status,ms:r.ms});if(r.status==='error')errors.push(r.error||'Calcul incomplet');return {...r,names:fullnames};
 }
 async function evaluate(candidates){for(const fullname of candidates){const name=fullname.slice(id.length+1),geometry=JSON.stringify(data.get(fullname)?.features[0].geometry.coordinates);if(seenGeometry.has(geometry)){jobs.at(-1).duplicateOf=seenGeometry.get(geometry);continue;}seenGeometry.set(geometry,name);for(const speed of [p.extreme?70:110,130]){
  if(remaining()<150)break;await request('fixed',name+'-v'+speed,speed===130?'fast':'thermal',speed,p.noHighways||name==='extreme',p.noTolls||name==='extreme',1,Math.min(3000,remaining()),fullname);
 }if(data.has(fullname+'-v'+(p.extreme?70:110))&&data.has(fullname+'-v130'))names.push(name);}
 return S.select(load(),p);}
 try{
  const opened=await nativeRequest('localBegin',{from,to,profile:p});session=opened.session;
 let q=await request('single','fast','fast',130,p.noHighways,p.noTolls,1,Math.min(18000,BUDGET*.2),'');let result=await evaluate(q.names);
 if(!q.names.length&&q.error?.includes('island')&&remaining()>6000){const original=originalPoints.split('|').map(s=>s.split(',').map(Number)),[lon,lat]=original[1];const scales=[111320*Math.cos(lat*Math.PI/180),111320];let attempts=0,bestTargetProbe=null;for(const [east,north] of [[80,0],[-80,0],[0,80],[0,-80],[120,80],[-120,-80],[120,-80],[-120,80]]){if(remaining()<4000||killed)break;attempts++;points=original[0].join(',')+'|'+(lon+east/scales[0])+','+(lat+north/scales[1]);const t=await request('single','fastSnap'+attempts,'fast',130,p.noHighways,p.noTolls,1,Math.min(4000,remaining()*.2),'');if(t.error?.includes('no track found')&&!bestTargetProbe)bestTargetProbe=points;if(t.names.length){const f=data.get(t.names[0]).features[0],end=f.geometry.coordinates.at(-1),metres=C.distance([lat,lon],[end[1],end[0]]);if(metres<=250){snapping={requested:[lat,lon],roadArrival:[end[1],end[0]],metres,attempts,explicitNearbyCarArrival:true};result=await evaluate(t.names);break;}}}if(!snapping&&bestTargetProbe){const target=bestTargetProbe.split('|')[1];const scalesA=[111320*Math.cos(original[0][1]*Math.PI/180),111320];for(const [east,north] of [[80,0],[-80,0],[0,80],[0,-80],[120,80],[-120,-80]]){if(remaining()<4000||killed)break;attempts++;points=(original[0][0]+east/scalesA[0])+','+(original[0][1]+north/scalesA[1])+'|'+target;const t=await request('single','fastSnap'+attempts,'fast',130,p.noHighways,p.noTolls,1,Math.min(4000,remaining()*.2),'');if(t.names.length){const f=data.get(t.names[0]).features[0],start=f.geometry.coordinates[0],end=f.geometry.coordinates.at(-1),a=C.distance([original[0][1],original[0][0]],[start[1],start[0]]),b=C.distance([lat,lon],[end[1],end[0]]);if(a<=250&&b<=250){snapping={origin:{requested:[original[0][1],original[0][0]],roadArrival:[start[1],start[0]],metres:a},destination:{requested:[lat,lon],roadArrival:[end[1],end[0]],metres:b},attempts,explicitNearbyCarArrival:true};result=await evaluate(t.names);break;}}}}if(!snapping)points=originalPoints;}
 const mixed=root.HCMixSeeds||(typeof require==='function'?require('./mix-seeds.js'):null),seedRoute=result.reference?.normal,mixSeeds=!p.extreme&&!p.noTolls&&!p.noHighways&&seedRoute?mixed.seeds(seedRoute,5):[];
 if(!p.extreme&&!p.noTolls&&remaining()>15000){q=await request('single','freeFast','fast',130,p.noHighways,true,1,Math.min(16000,remaining()*.2),'');result=await evaluate(q.names);}
 if(!p.extreme&&seedRoute?.km<35&&remaining()>8000){q=await request('single','urbanBalance','compromise',130,p.noHighways,p.noTolls,1,Math.min(8000,remaining()*.2),'','',0,2);result=await evaluate(q.names);}
 // Force a bypass of selected paid sections between real interchanges. These
 // are candidate-generation constraints, never claimed road closures.
 for(let i=0;i<Math.min(3,mixSeeds.length)&&remaining()>20000;i++){const seed=mixSeeds[i];q=await request('single','sectionMix'+i,'fast',130,false,false,1,Math.min(14000,remaining()*.2),'',seed.nogo);result=await evaluate(q.names);}
 if(!p.extreme&&remaining()>18000){q=await request('single','economyMix','compromise',130,p.noHighways,p.noTolls,1,Math.min(14000,remaining()*.22),'','',p.noTolls?0:.08,4);result=await evaluate(q.names);}
 if(!p.extreme&&remaining()>18000){q=await request('single','nearMix','compromise',130,p.noHighways,p.noTolls,1,Math.min(12000,remaining()*.22),'','',p.noTolls?0:.03,8);result=await evaluate(q.names);}
 if(mixSeeds.length>3&&remaining()>24000){q=await request('single','combinedMix','fast',130,false,false,1,Math.min(14000,remaining()*.25),'',mixSeeds[0].nogo+';'+mixSeeds[3].nogo);result=await evaluate(q.names);}
 if(remaining()>9000){q=await request('pool','pool1','thermal',p.extreme?70:110,p.noHighways,p.noTolls,p.noHighways?1:2,Math.min(25000,remaining()-4500),'2');result=await evaluate(q.names);}
 // Explore extra sections only if there are not yet three distinct useful paths.
 if(!result.complete)for(let i=3;i<mixSeeds.length&&remaining()>12000;i++){q=await request('single','sectionMix'+i,'fast',130,false,false,1,Math.min(11000,remaining()-4000),'',mixSeeds[i].nogo);result=await evaluate(q.names);}
 if(!result.complete&&!p.extreme&&remaining()>10000){q=await request('single','priceFrontier','compromise',130,p.noHighways,p.noTolls,1,Math.min(12000,remaining()-3000),'','',p.noTolls?0:.16,8);result=await evaluate(q.names);}

  result=S.select(load(),p);
  if(!result.cards.length)throw Error('Aucun trajet complet compatible avec les options. '+(errors.at(-1)||''));
  let routes=result.cards.map(c=>{const r={...(c.role==='fast'?c.normal:c.active)};r.label=c.role==='fast'?'Le plus rapide':c.role==='economy'?(p.extreme?'Extremiling':'Éco'):'Compromis';r.isBaseline=c.role==='fast';r.selectionVersion=C.VERSION;r.selectionRole=c.role;r.selectionName=c.name;r.selectionReasons=c.reason;r.savingsComponents=c.savings;r.timeTradeoff=c.timeTradeoff||null;r.routingStrategy=strategies.get(c.name)||null;r.routingMix={motorwayKm:r.roads.segments.reduce((n,s)=>n+(s.roadClass==='motorway'?s.km:0),0),freeFastKm:r.roads.segments.reduce((n,s)=>n+(!s.toll&&/^(motorway|trunk)$/.test(s.roadClass)?s.km:0),0),mainRoadKm:r.roads.segments.reduce((n,s)=>n+(/^(primary|secondary|tertiary)$/.test(s.roadClass)?s.km:0),0)};r.estimateOnly=true;r.sharedGeometry=!!c.sharedGeometry;return r;});
  const reference=result.reference?{route:{...result.reference.normal,isBaseline:true},planKey:C.rules(p).key,version:C.VERSION,label:p.noHighways?'Le plus rapide sans autoroute':'Le plus rapide · options respectées'}:null;
  routes=C.comparisonRoutes(routes,reference,p);
  return {routes,reference,errors:result.complete?[]:errors,diagnostics:{jobs,errors,snapping,complete:result.complete,closeEconomyCandidates:result.closeEconomyCandidates},elapsedMs:performance.now()-start,modelVersion:C.VERSION};
 }finally{if(session)try{await nativeRequest('localEnd',{session});}catch(_){}data.clear();}
}};}
root.HCLocalPlanner={create,route,physicalKey};if(typeof module!=='undefined')module.exports=root.HCLocalPlanner;
})(typeof window!=='undefined'?window:globalThis);

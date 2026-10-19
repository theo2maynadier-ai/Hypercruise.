/* Display-only camera policy. No routing, GPS recording or fuel-model side effects. */
(function(root){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
class Camera {
 constructor(){this.last=null;this.speed=null;this.zoom=null;this.pitch=null;this.outSince=null;this.route=null;this.contextAt=-Infinity;}
 context(r,progress,speed,now){
  if(this.route!==r){this.route=r;this.turns=(r.steps||[]).filter(s=>![1,2,3,5,6,8].includes(s.type)).map(s=>({distance:r.cumulative[s.begin],type:s.type})).filter(s=>Number.isFinite(s.distance)).sort((a,b)=>a.distance-b.distance);this.contextAt=-Infinity;}
  if(now-this.contextAt<250)return this.cached;
  this.contextAt=now;let lo=0,hi=this.turns.length;while(lo<hi){const m=(lo+hi)>>1;if(this.turns[m].distance<progress-12)lo=m+1;else hi=m;}const first=this.turns[lo],second=this.turns[lo+1];
  let road=null,segments=r.roads?.segments||[];lo=0;hi=segments.length-1;while(lo<hi){const m=(lo+hi)>>1;if(segments[m].to<progress)lo=m+1;else hi=m;}road=segments[lo];
  const look=clamp(speed/3.6*12,100,350),points=[0,.33,.66,1].map(t=>HC.pointAt(r,progress+t*look));let bend=0,last=null;for(let i=1;i<points.length;i++){if(HC.distance(points[i-1],points[i])<3)continue;const h=HC.bearing(points[i-1],points[i]);if(last!=null)bend+=Math.abs(HC.angleDelta(last,h));last=h;}
  return this.cached={distance:first?Math.max(0,first.distance-progress):Infinity,second:second?Math.max(0,second.distance-progress):Infinity,road,bend};
 }
 update(o){
  const dt=this.last==null?0:clamp(o.now-this.last,0,250);this.last=o.now;
  const measured=Number.isFinite(o.speed)?clamp(o.speed,0,180):null;
  if(this.speed==null)this.speed=measured??30;else if(measured!=null)this.speed=mix(this.speed,measured,1-Math.exp(-dt/3000));
  const v=this.speed/3.6,c=this.context(o.route,o.progress,this.speed,o.now),motorway=['motorway','trunk'].includes(c.road?.roadClass),urban=c.road?.urban||['residential','living_street'].includes(c.road?.roadClass);
  let ahead=clamp(180+v*24,200,1250)*(motorway?1.25:urban?.8:1);if(c.bend>35)ahead*=.72;
  const trigger=clamp(120+v*32,220,1350),approach=!o.offRoute&&c.distance<trigger;
  let wantedPitch=urban?49:55,mode='cruise';
  if(approach){const t=clamp(c.distance/trigger,0,1),close=clamp(c.distance*.8+100,115,ahead);ahead=mix(close,ahead,t*t);wantedPitch=mix(42,wantedPitch,t);mode='approach';
   // Two close actions remain in view instead of zooming into the first alone.
   if(c.second-c.distance<clamp(v*8,70,200)){ahead=Math.max(ahead,Math.min(800,c.second*.85+100));mode='combined';}
  }
  const width=Math.max(250,o.width||390),height=Math.max(200,o.height||450),groundWidth=clamp(ahead*width/height*.9,100,2200),lat=clamp(o.latitude??43,-85,85);
  let wanted=clamp(Math.log2(40075016.68557849*Math.cos(lat*Math.PI/180)*width/(512*groundWidth)),12,18);
  const manual=Number.isFinite(o.manualZoom);
  if(manual){this.zoom=o.manualZoom;this.outSince=null;}else if(this.zoom==null)this.zoom=wanted;else{
   const delta=wanted-this.zoom;
   if(Math.abs(delta)<.06){this.outSince=null;}else if(delta<0){if(this.outSince==null)this.outSince=o.now;if(o.now-this.outSince>=2500)this.zoom-=Math.min(-delta,dt*.00020);}else{this.outSince=null;this.zoom+=Math.min(delta,dt*.00045);}
  }
  if(this.pitch==null)this.pitch=wantedPitch;else this.pitch+=clamp(wantedPitch-this.pitch,-dt*.004,dt*.004);
  return {zoom:this.zoom,pitch:manual?null:this.pitch,mode,filteredSpeed:this.speed,distance:c.distance,ahead};
 }
}
root.HCNavCamera=Camera;
})(typeof window==='undefined'?globalThis:window);

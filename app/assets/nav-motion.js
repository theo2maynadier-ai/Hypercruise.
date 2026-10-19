/* Display only: interpolate along route geometry, never alter recorded GPS or fuel. */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
class Motion{
 constructor(route){this.route=route;this.state=null;this.target=null;this.started=0;this.duration=900;this.lastFixTime=0;this.lastMatch=null;this.rawFix=null;this.reacquiredAt=0;}
 at(progress){const r=this.route,c=r.cumulative;progress=clamp(progress,0,c.at(-1));let lo=0,hi=c.length-2;while(lo<hi){let mid=(lo+hi+1)>>1;if(c[mid]<=progress)lo=mid;else hi=mid-1;}const i=lo,t=clamp((progress-c[i])/(c[i+1]-c[i]||1),0,1),a=r.coordinates[i],b=r.coordinates[i+1];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
 pose(progress){const pos=this.at(progress),total=this.route.cumulative.at(-1);let a=pos,b=this.at(Math.min(total,progress+5));if(HC.distance(a,b)<.2)a=this.at(Math.max(0,progress-5));return {lat:pos[0],lon:pos[1],heading:HC.bearing(a,b),progress,snapped:true};}
 match(p){if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||!Number.isFinite(p.accuracy)||p.accuracy>50)return null;const r=this.route,c=r.cumulative,time=p.time||Date.now(),dt=this.lastFixTime?clamp((time-this.lastFixTime)/1000,0,15):0;if(this.lastFixTime&&time-this.lastFixTime>20000)this.lastMatch=null;let best=null,score=Infinity,begin=0,end=c.length-1;if(this.lastMatch){const reach=Math.max(110,dt*55+10),low=this.lastMatch.progress-reach,high=this.lastMatch.progress+reach;let l=0,h=c.length-1;while(l<h){const mid=(l+h)>>1;if(c[mid]<low)l=mid+1;else h=mid;}begin=Math.max(0,l-1);l=begin;h=c.length-1;while(l<h){const mid=(l+h+1)>>1;if(c[mid]>high)h=mid-1;else l=mid;}end=Math.min(c.length-1,l+1);}
 for(let i=begin;i<end;i++){const q=HC.project([p.lat,p.lon],r.coordinates[i],r.coordinates[i+1]),progress=c[i]+HC.distance(r.coordinates[i],q.pos);if(this.lastMatch&&Math.abs(progress-this.lastMatch.progress)>Math.max(90,dt*55))continue;let s=q.meters;if(this.lastMatch)s+=Math.abs(progress-this.lastMatch.progress)*.08;if(s<score){score=s;best={...q,index:i,progress};}}
 const radius=clamp(p.accuracy*1.6,25,50);
 // A stale progress window must not turn a position on the route into a deviation.
 if((!best||best.meters>radius)&&(!this.reacquiredAt||time-this.reacquiredAt>=2000)){this.reacquiredAt=time;const q=HC.match(r,[p.lat,p.lon],null);if(q.meters<=radius)best=q;}
 if(!best||best.meters>radius)return null;this.lastMatch=best;return best;}
 push(p,m,now,road=null){if(this.lastFixTime&&p.time&&p.time<=this.lastFixTime)return false;const current=this.sample(now);this.duration=this.lastFixTime?clamp((p.time||Date.now())-this.lastFixTime,300,1400):900;this.lastFixTime=p.time||Date.now();this.started=now;let next=m?this.pose(m.progress):road?{...road.pose,road,progress:0,snapped:false,roadSnapped:true}:{lat:p.lat,lon:p.lon,heading:this.rawHeading(p,current),progress:0,snapped:false};
 if(current&&next.snapped&&current.snapped&&next.progress<current.progress&&current.progress-next.progress<12)next=this.pose(current.progress);
 this.rawFix={...p};this.state=current||next;this.target=next;return true;}
 rawHeading(p,current){const previous=this.rawFix;if(previous&&HC.distance([previous.lat,previous.lon],[p.lat,p.lon])>=4)return HC.bearing([previous.lat,previous.lon],[p.lat,p.lon]);if(Number.isFinite(p.bearing)&&p.speed>=8&&p.accuracy<=30)return p.bearing;return current?.heading||0;}
 sample(now){if(!this.target)return null;const a=this.state,b=this.target,t=clamp((now-this.started)/this.duration,0,1);if(a.road&&b.road&&a.road.key===b.road.key){const motion=new Motion(b.road.route),pose=motion.pose(a.road.progress+(b.road.progress-a.road.progress)*t);if(b.road.reverse)pose.heading=(pose.heading+180)%360;return {...b,...pose,snapped:false,roadSnapped:true,road:{...b.road,progress:a.road.progress+(b.road.progress-a.road.progress)*t}};}
 if(a.snapped&&b.snapped)return this.pose(a.progress+(b.progress-a.progress)*t);return {...b,lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t,heading:(a.heading+HC.angleDelta(a.heading,b.heading)*t+360)%360};}
}
root.HCNavMotion=Motion;
})(typeof window==='undefined'?globalThis:window);

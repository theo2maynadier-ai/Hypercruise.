/* One bounded recalculation at a time; repeated fixes confirm actual deviation. */
(function(root){'use strict';class Reroute{
 constructor(){this.offSince=null;this.first=null;this.fixes=0;this.lastTime=0;this.busy=false;this.next=0;this.confirmed=false;}
 observe(p,onRoute,now){if(p.time&&p.time<=this.lastTime)return false;this.lastTime=p.time||now;if(onRoute){this.offSince=null;this.first=null;this.fixes=0;this.confirmed=false;return false;}if(!Number.isFinite(p.accuracy)||p.accuracy>30){this.offSince=null;this.first=null;this.fixes=0;this.confirmed=false;return false;}if(this.offSince==null){this.offSince=now;this.first=[p.lat,p.lon];}this.fixes++;this.confirmed=this.fixes>=4&&now-this.offSince>=4000&&(p.speed>=8||HC.distance(this.first,[p.lat,p.lon])>=15);return !this.busy&&now>=this.next&&this.confirmed;}
 begin(){this.busy=true;}
 finish(now,success){this.busy=false;this.next=now+(success?5000:10000);this.offSince=null;this.first=null;this.fixes=0;this.confirmed=false;}
}
root.HCReroute=Reroute;
})(typeof window==='undefined'?globalThis:window);

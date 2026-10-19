/* Posted limits are display metadata, separate from target driving speeds. */
(function(root){'use strict';
function parse(tags){
 if(typeof tags!=='string'||/(?:^|\s)maxspeed:(?:conditional|variable|forward|backward|lanes)(?::[^= ]+)?=/.test(tags))return null;
 const value=/(?:^|\s)maxspeed=([^=]*?)(?=\s+[\w:.-]+=|$)/.exec(tags)?.[1]?.trim();if(!value)return null;
 const m=/^(\d+(?:\.\d+)?)\s*(km\/h|kmh|kph|mph)?$/.exec(value);if(!m)return null;const n=Number(m[1])*(m[2]==='mph'?1.609344:1);return n>=5&&n<=150?Math.round(n):null;
}
function segments(raw,cumulative,messages){
 if(!Array.isArray(messages)||!messages.length)return [];const headers=messages[0],lon=headers.indexOf('Longitude'),lat=headers.indexOf('Latitude'),tags=headers.indexOf('WayTags');if(lon<0||lat<0||tags<0)return [];
 const key=(x,y)=>Math.round(x)+':'+Math.round(y),indices=new Map();raw.forEach((p,i)=>{const k=key(p[0]*1e6,p[1]*1e6);if(!indices.has(k))indices.set(k,[]);indices.get(k).push(i);});let cursor=0,known=true,out=[];
 for(const row of messages.slice(1)){const list=indices.get(key(Number(row[lon]),Number(row[lat])))||[];let lo=0,hi=list.length;while(lo<hi){const mid=(lo+hi)>>1;if(list[mid]<cursor)lo=mid+1;else hi=mid;}const end=list[lo];if(end==null){known=false;continue;}
  if(known&&end>cursor)out.push({from:cumulative[cursor],to:cumulative[end],value:parse(row[tags])});cursor=end;known=true;
 }return out;
}
function at(route,p,match,now=Date.now()){
 if(!match||!p||!Number.isFinite(p.accuracy)||p.accuracy>25||!Number.isFinite(p.time)||now-p.time>6000||p.time-now>2000||match.meters>Math.max(10,Math.min(25,p.accuracy*1.5)))return null;
 const rows=route?.speedLimits;if(!Array.isArray(rows)||!rows.length)return null;let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].to<=match.progress)lo=mid+1;else hi=mid;}const s=rows[lo];return s&&match.progress>=s.from&&match.progress<s.to&&Number.isInteger(s.value)&&s.value>=5&&s.value<=150?s.value:null;
}
root.HCSpeedLimit={parse,segments,at};if(typeof module!=='undefined')module.exports=root.HCSpeedLimit;
})(typeof window==='undefined'?globalThis:window);

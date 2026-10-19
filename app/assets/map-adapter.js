/* Vector presentation adapter. Routing and route coordinates remain unchanged. */
(function(root){'use strict';const oldL=root.L,ML=root.maplibregl;if(!ML||(typeof ML.supported==='function'&&!ML.supported())){root.HCVectorUnavailable=true;return;}ML.setWorkerUrl('vendor/maplibre-gl-csp-worker.js');let next=0;
const routeWidth=(weight,halo=false)=>{const extra=halo?1:0;return ['interpolate',['exponential',1.2],['zoom'],5,weight*.08+extra*.7,9,weight*.12+extra*.9,11,weight*.19+extra,12,weight*.26+extra*1.2,13,weight*.38+extra*1.5,14,weight*.52+extra*1.8,15,weight*.70+extra*2.2,16,weight*.88+extra*2.7,17,weight+extra*3,20,weight*1.12+extra*3];};
const xy=p=>[p[1],p[0]],feature=(type,coordinates)=>({type:'Feature',properties:{},geometry:{type,coordinates}});
class MapView{
 constructor(id){this.items=new Set();this.ready=false;this.autoPerspective=true;this.navigationMode=false;this.cameraWrite=false;this.m=new ML.Map({container:id,style:root.HCMapStyle,center:[-.3708,43.2951],zoom:12,maxPitch:70,attributionControl:false,renderWorldCopies:false,fadeDuration:150,transformCameraUpdate:next=>this.transformCamera(next)});this.m.addControl(new ML.AttributionControl({compact:true,customAttribution:'<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a>'}),'bottom-right');this.m.on('style.load',()=>{this.ready=true;this.applyNavigationStyle();for(const item of this.items)item.draw();});this.m.on('error',()=>{if(root.onMapLoadError)root.onMapLoadError();});new ResizeObserver(()=>this.m.resize()).observe(document.getElementById(id));}
 visibleWidthMeters(z,latitude){const lat=Number.isFinite(latitude)?latitude:this.m?.getCenter?.().lat??43.3,width=Math.max(1,this.m?.getContainer?.().clientWidth||390);return 40075016.68557849*Math.cos(Math.min(85,Math.abs(lat))*Math.PI/180)*width/(512*Math.pow(2,z));}
 pitchForZoom(z,latitude){const width=this.visibleWidthMeters(z,latitude),limit=this.navigationMode?55:60,stops=[[7000,0],[5000,.32],[2000,.75],[700,1]];if(width>=7000)return 0;if(width<=700)return limit;for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i];if(width>=b[0]){let t=Math.log(a[0]/width)/Math.log(a[0]/b[0]);t=t*t*(3-2*t);return limit*(a[1]+(b[1]-a[1])*t);}}return limit;}
 transformCamera(next){if(this.cameraWrite||!this.m)return {};if(Math.abs(next.zoom-this.m.getZoom())<1e-9)return {};return {pitch:this.autoPerspective?this.pitchForZoom(next.zoom,next.center?.lat):0};}
 writeCamera(fn){this.cameraWrite=true;try{fn();}finally{this.cameraWrite=false;}return this;}
 setNavigationMode(active){this.navigationMode=active;if(active)this.autoPerspective=true;this.applyNavigationStyle();return this;}
 applyNavigationStyle(){if(!this.ready)return;for(const layer of this.m.getStyle().layers)if(layer.type==='symbol'&&layer.id.includes('shield'))this.m.setLayoutProperty(layer.id,'visibility',this.navigationMode?'none':'visible');}
 currentRoadAt(point,heading){if(!this.ready||!root.HC||!this.m.querySourceFeatures)return null;const now=Date.now();if(!this.roadCache||now-this.roadCacheAt>1800){try{this.roadCache=this.m.querySourceFeatures('openmaptiles',{sourceLayer:'transportation_name',filter:['any',['has','name'],['has','name:latin'],['has','ref']]}).slice(0,3000);this.roadCacheAt=now;}catch(_){return null;}}
  let best=null,score=Infinity,vertices=0;for(const f of this.roadCache){const prop=f.properties||{},name=prop['name:fr']||prop['name:latin']||prop.name||'',ref=prop.ref||'';if(!name&&!ref)continue;const chunks=f.geometry?.type==='LineString'?[f.geometry.coordinates]:f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];for(const line of chunks){for(let i=1;i<line.length;i++){if(++vertices>18000)return best;const a=[line[i-1][1],line[i-1][0]],b=[line[i][1],line[i][0]],q=root.HC.project(point,a,b);if(q.meters>22)continue;const angle=Number.isFinite(heading)?Math.abs(root.HC.angleDelta(heading,root.HC.bearing(a,b))):0,alignment=Math.min(angle,180-angle),cost=q.meters+alignment*.2;if(cost<score){score=cost;best={name:String(name),ref:String(ref).replace(/\s+/g,'')};}}}}return best;}

 roadMatch(p,heading,previous){
  if(!this.ready||!root.HC||!root.HCNavMotion||!Number.isFinite(p.accuracy)||p.accuracy>35||!this.m.querySourceFeatures)return null;
  const now=Date.now(),HC=root.HC;
  if(!this.snapRoads||now-this.snapRoadsAt>1500){
   try{const data=this.m.querySourceFeatures('openmaptiles',{sourceLayer:'transportation'}),seen=new Set(),roads=[];let count=0;
    for(const f of data){const prop=f.properties||{};if(!['motorway','trunk','primary','secondary','tertiary','minor','street','service'].includes(prop.class)||prop.subclass==='driveway'||prop.access==='no'||prop.access==='private')continue;
     const lines=f.geometry?.type==='LineString'?[f.geometry.coordinates]:f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];
     for(const line of lines){if(line.length<2)continue;count+=line.length;if(count>24000)break;const key=line.map(q=>q[0].toFixed(6)+','+q[1].toFixed(6)).join(';');if(seen.has(key))continue;seen.add(key);const coordinates=line.map(q=>[q[1],q[0]]);roads.push({key,route:{coordinates,cumulative:HC.cumulative(coordinates)}});}if(count>24000)break;
    }this.snapRoads=roads;this.snapRoadsAt=now;
   }catch(_){return null;}
  }
  let best=null,score=Infinity;const radius=Math.max(12,Math.min(30,p.accuracy*1.5));
  const candidates=previous?[previous,...this.snapRoads.filter(r=>r.key!==previous.key)]:this.snapRoads;
  for(const road of candidates){const r=road.route,q=HC.match(r,[p.lat,p.lon],null);if(q.meters>radius)continue;const motion=new root.HCNavMotion(r),pose=motion.pose(q.progress),delta=Number.isFinite(heading)?Math.abs(HC.angleDelta(heading,pose.heading)):0,reverse=delta>90,angle=Math.min(delta,180-delta);if(p.speed>=8&&angle>60)continue;
   const cost=q.meters+angle*.22+(previous&&road.key!==previous.key?4:0);if(cost<score){score=cost;best={...road,progress:q.progress,reverse,meters:q.meters,pose:{...pose,heading:(pose.heading+(reverse?180:0))%360}};}
  }return best;
 }
 setAutoPerspective(enabled){this.autoPerspective=enabled;this.m.easeTo({pitch:enabled?this.pitchForZoom(this.m.getZoom()):0,duration:300});return this;}
 setView(p,z){return this.writeCamera(()=>this.m.jumpTo({center:xy(p),zoom:z,pitch:this.autoPerspective?this.pitchForZoom(z,p[0]):0,padding:{top:0,bottom:0,left:0,right:0}}));}
 setNavView(p,z,bearing,padding,pitch=null){const ceiling=this.pitchForZoom(z,p[0]);return this.writeCamera(()=>this.m.jumpTo({center:xy(p),zoom:z,bearing,pitch:this.autoPerspective?(Number.isFinite(pitch)?Math.min(ceiling,Math.max(0,pitch)):ceiling):0,padding,retainPadding:false}));}
 setBearing(a){this.m.setBearing(-a);return this;}
 setPitch(a,immediate=false){if(immediate)this.m.jumpTo({pitch:a});else this.m.easeTo({pitch:a,duration:250});return this;}
 getZoom(){return this.m.getZoom();}
 getPitch(){return this.m.getPitch();}
 fitBounds(points,options={}){if(!points.length)return this;const bounds=new ML.LngLatBounds();points.forEach(p=>bounds.extend(xy(p)));const tl=options.paddingTopLeft||[20,20],br=options.paddingBottomRight||[20,20],size=this.getSize();const scale=Math.min(1,(size.y-60)/Math.max(1,tl[1]+br[1]));this.writeCamera(()=>this.m.fitBounds(bounds,{padding:{left:tl[0],top:tl[1]*scale,right:br[0],bottom:br[1]*scale},maxZoom:options.maxZoom||17,duration:0,bearing:0,pitch:0}));return this;}
 on(name,fn){if(name==='click')this.m.on('click',e=>fn({latlng:{lat:e.lngLat.lat,lng:e.lngLat.lng}}));else this.m.on(name,fn);return this;}
 getSize(){const el=this.m.getContainer();return {x:el.clientWidth,y:el.clientHeight};}
 panBy(offset){this.m.panBy(offset,{duration:0});return this;}
 removeLayer(item){item.remove();return this;}
 labelLayer(){return this.m.getStyle().layers.find(l=>l.type==='symbol'&&!l.id.startsWith('road_one_way'))?.id;}
}
class Marker{
 constructor(p,options={}){const icon=options.icon||{},el=document.createElement('div');el.className=icon.className||'';el.innerHTML=icon.html||'';if(icon.iconSize){el.style.width=icon.iconSize[0]+'px';el.style.height=icon.iconSize[1]+'px';}this.marker=new ML.Marker({element:el,anchor:'center',rotationAlignment:options.rotateWithView?'map':'viewport',pitchAlignment:options.rotateWithView?'map':'viewport'}).setLngLat(xy(p));}
 addTo(map){this.marker.addTo(map.m);return this;}
 setLatLng(p){this.marker.setLngLat(xy(p));return this;}
 setRotation(radians){this.marker.setRotation(radians*180/Math.PI);return this;}
 remove(){this.marker.remove();}
}
class Group{
 constructor(){this.items=[];}
 addTo(map){this.map=map;this.items.forEach(i=>i.addTo(map));return this;}
 addLayer(item){this.items.push(item);if(this.map)item.addTo(this.map);return this;}
 clearLayers(){this.items.forEach(i=>i.remove());this.items=[];return this;}
 remove(){this.clearLayers();}
}
class Shape{
 constructor(points,options={},circle=false){this.points=points;this.options=options;this.circle=circle;this.id='hc-overlay-'+(++next);this.handlers=[];}
 addTo(map){this.map=map;map.items.add(this);if(map.ready)this.draw();return this;}
 data(){if(!this.circle)return feature('LineString',this.points.map(xy));const [lat,lon]=this.points,r=this.options.radius||1,points=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;points.push([lon+Math.cos(a)*r/(111320*Math.max(.1,Math.cos(lat*Math.PI/180))),lat+Math.sin(a)*r/111320]);}return feature('Polygon',[points]);}
 draw(){if(!this.map)return;const m=this.map.m;if(m.getSource(this.id)){m.getSource(this.id).setData(this.data());return;}m.addSource(this.id,{type:'geojson',data:this.data()});const before=this.map.labelLayer(),weight=this.options.weight||4,lineWidth=this.options.adaptiveWeight?routeWidth(weight):this.options.weight||1,haloWidth=this.options.adaptiveWeight?routeWidth(weight,true):weight+3;if(this.circle)m.addLayer({id:this.id+'-fill',source:this.id,type:'fill',paint:{'fill-color':this.options.color||'#2455ff','fill-opacity':this.options.fillOpacity??.08}},before);else m.addLayer({id:this.id+'-halo',source:this.id,type:'line',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':this.options.haloColor||'#ffffff','line-width':haloWidth,'line-opacity':this.options.opacity??1}},before);m.addLayer({id:this.id,source:this.id,type:'line',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':this.options.color||'#2455ff','line-width':lineWidth,'line-opacity':this.options.opacity??1}},before);this.handlers.forEach(([e,f])=>m.on(e,this.id,f));}
 on(e,fn){this.handlers.push([e,fn]);if(this.map?.ready&&this.map.m.getLayer(this.id))this.map.m.on(e,this.id,fn);return this;}
 setLatLng(p){this.points=p;if(this.map?.ready)this.draw();return this;}
 setRadius(r){this.options.radius=r;if(this.map?.ready)this.draw();return this;}
 bringToFront(){if(this.map?.ready){const m=this.map.m,before=this.map.labelLayer();for(const id of [this.id+'-fill',this.id+'-halo',this.id])if(m.getLayer(id))m.moveLayer(id,before);}return this;}
 remove(){if(!this.map)return;const m=this.map.m;this.handlers.forEach(([e,f])=>m.off(e,this.id,f));for(const id of [this.id,this.id+'-fill',this.id+'-halo'])if(m.getLayer(id))m.removeLayer(id);if(m.getSource(this.id))m.removeSource(this.id);this.map.items.delete(this);this.map=null;}
}
root.L={map:id=>{try{return new MapView(id);}catch(e){root.L=oldL;root.HCVectorUnavailable=true;document.getElementById(id).innerHTML='';return oldL.map(id,{zoomControl:false,rotate:true,bearing:0,rotateControl:false,touchRotate:false});}},tileLayer:(url,options)=>{if(root.HCVectorUnavailable)return oldL.tileLayer(url,options);return {addTo(){return this;},on(){return this;}};},layerGroup:()=>new Group(),marker:(p,o)=>new Marker(p,o),circle:(p,o)=>new Shape(p,o,true),polyline:(p,o)=>new Shape(p,o),divIcon:o=>o,latLngBounds:points=>points};
root.HCVectorMap=true;
})(window);

package fr.hypercruise;

import btools.router.*;
import java.io.File;
import java.util.*;

/** Android-independent runner, exercised on the same graph as the APK. */
public final class LocalRouter {
 public static final class Result {
  public final String json; public final OsmTrack raw;
  public Result(String json,OsmTrack raw){this.json=json;this.raw=raw;}
 }
 public static Result run(File segments,File profiles,String profile,String lonlats,
   Map<String,String> params,OsmTrack replay,long milliseconds,int memory) throws Exception {
  RoutingContext rc=new RoutingContext();rc.localFunction=new File(profiles,profile+".brf").getAbsolutePath();
  rc.keyValues=new HashMap<>(params);rc.keyValues.put("turnInstructionMode","3");
  rc.memoryclass=memory;
  startDirection(rc,params);nogo(rc,params);
  if(replay!=null){OsmTrack guide=new OsmTrack();guide.nodes.addAll(replay.nodes);guide.cost=replay.cost;rc.forcedRawTrack=guide;}
  RoutingEngine engine=new RoutingEngine(null,null,segments,new RoutingParamCollector().getWayPointList(lonlats),rc);
  engine.quite=true;
  // BRouter can reset its internal timer between passes: retain an external bound.
  Timer timer=new Timer(true);timer.schedule(new TimerTask(){public void run(){engine.terminate();}},milliseconds);
  try {
   engine.doRun(milliseconds);
   if(engine.getErrorMessage()!=null)throw new Exception(engine.getErrorMessage());
   OsmTrack track=engine.getFoundTrack();
   if(track==null||track.isDirty||track.nodes.size()<2)throw new Exception("Aucun trajet complet dans le délai de calcul");
   return new Result(new FormatJson(rc).format(track),engine.getFoundCandidateRawTrack());
  } finally {timer.cancel();}
 }

 public static final class Batch {
  public final List<Result> routes; public final String error;
  Batch(List<Result> routes,String error){this.routes=routes;this.error=error;}
 }
 public static Batch pool(File segments,File profiles,String coordinates,Map<String,String> params,
   long milliseconds,int memory,int alternatives) throws Exception {
  RoutingContext rc=context(profiles,"hypercruise-306-thermal",params,memory);
  rc.setAlternativeIdx(alternatives);
  RoutingEngine engine=new RoutingEngine(null,null,segments,new RoutingParamCollector().getWayPointList(coordinates),rc);engine.quite=true;
  Timer timer=new Timer(true);timer.schedule(new TimerTask(){public void run(){engine.terminate();}},milliseconds);
  try{
   engine.doRun(milliseconds);List<Result> results=new ArrayList<>();
   List<OsmTrack> detailed=engine.getLabDetailedTracks(),raw=engine.getLabRawTracks();
   for(int i=0;i<detailed.size();i++){
    OsmTrack t=detailed.get(i),r=raw.get(i);
    results.add(t!=null&&r!=null&&!t.isDirty&&t.nodes.size()>1?new Result(new FormatJson(rc).format(t),r):null);
   }
   return new Batch(results,engine.getErrorMessage());
  }finally{timer.cancel();}
 }
 private static RoutingContext context(File profiles,String profile,Map<String,String> params,int memory){
  RoutingContext rc=new RoutingContext();rc.localFunction=new File(profiles,profile+".brf").getAbsolutePath();
  rc.keyValues=new HashMap<>(params);rc.keyValues.put("turnInstructionMode","3");rc.memoryclass=memory;
  startDirection(rc,params);nogo(rc,params);return rc;
 }
 private static void startDirection(RoutingContext rc,Map<String,String> params){
  String text=params.get("lab_start_direction");if(text==null)return;
  int direction=Integer.parseInt(text);if(direction<0||direction>=360)throw new IllegalArgumentException("Direction invalide");
  rc.startDirection=direction;rc.forceUseStartDirection=true;
 }
 private static void nogo(RoutingContext rc,Map<String,String> params){
  String text=params.get("lab_nogo");if(text==null||text.isEmpty())return;
  // Geometry constraints are not numeric BRF global variables.
  if(rc.keyValues!=null)rc.keyValues.remove("lab_nogo");
  String[] regions=text.split(";");if(regions.length>4)throw new IllegalArgumentException("Trop de corridors exclus");rc.nogopoints=new ArrayList<>();
  for(String region:regions){String[] a=region.split(",");if(a.length!=3)throw new IllegalArgumentException("Corridor invalide");double lon=Double.parseDouble(a[0]),lat=Double.parseDouble(a[1]),radius=Double.parseDouble(a[2]);
   if(!Double.isFinite(lon)||!Double.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90||!Double.isFinite(radius)||radius<=0||radius>2000)throw new IllegalArgumentException("Corridor invalide");
   OsmNodeNamed n=new OsmNodeNamed();n.ilon=(int)Math.round((lon+180)*1e6);n.ilat=(int)Math.round((lat+90)*1e6);n.radius=radius;n.isNogo=true;n.name="variant"+rc.nogopoints.size();n.nogoWeight=Double.NaN;rc.nogopoints.add(n);
  }RoutingContext.prepareNogoPoints(rc.nogopoints);
 }
}

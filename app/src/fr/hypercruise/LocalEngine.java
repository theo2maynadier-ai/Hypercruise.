package fr.hypercruise;

import android.content.Context;
import org.json.*;
import java.io.*;
import java.net.*;
import java.security.*;
import java.util.*;

public final class LocalEngine {
 public interface Progress {void send(String text);}
 private final Context context;private final File segments,profiles;
 private static final String[] FILES={"W5_N40.rd5","E0_N40.rd5"};
 private static final long[] SIZES={91590083L,119742663L};
 private static final String[] HASHES={"accbba6d749a46a90b84e24ad554dbb831425d367b674a13d791f3bd3f5212b7","3f89da18b2cc0687ed120559923f1f2c414ec664289d8cc12b483088d87a8e23"};
 public LocalEngine(Context c){context=c;segments=new File(c.getFilesDir(),"segments");profiles=new File(c.getFilesDir(),"routing-v13");}
 public boolean ready(){for(int i=0;i<FILES.length;i++)if(new File(segments,FILES[i]).length()!=SIZES[i])return false;return true;}
 public JSONObject status() throws Exception {return new JSONObject().put("ready",ready()).put("megabytes",202).put("region","Sud-Ouest · 40–45° N, 5° O–5° E");}
 private void profiles() throws Exception {
  if(!profiles.exists()&&!profiles.mkdirs())throw new IOException("Espace de stockage indisponible");
  for(String name:new String[]{"lookups.dat","hypercruise-306-thermal.brf","hypercruise-reference-temps.brf"}){
   File file=new File(profiles,name);if(file.exists())continue;
   try(InputStream in=context.getAssets().open("routing/"+name);OutputStream out=new FileOutputStream(file)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);}
  }
 }
 public JSONObject install(Progress progress) throws Exception {
  if(!segments.exists()&&!segments.mkdirs())throw new IOException("Espace de stockage indisponible");
  long total=SIZES[0]+SIZES[1],done=0;
  for(int i=0;i<FILES.length;i++){
   File target=new File(segments,FILES[i]);if(target.length()==SIZES[i]){done+=SIZES[i];continue;}
   File partial=new File(segments,FILES[i]+".part");
   HttpURLConnection connection=(HttpURLConnection)new URL("https://brouter.de/brouter/segments4/"+FILES[i]).openConnection();
   connection.setConnectTimeout(15000);connection.setReadTimeout(30000);connection.setRequestProperty("User-Agent","Hypercruise/0.8.25 personal map download");
   try{
    if(connection.getResponseCode()!=200)throw new IOException("Téléchargement indisponible");
    if(connection.getContentLengthLong()>0&&connection.getContentLengthLong()!=SIZES[i])throw new IOException("Le serveur a changé : importe le ZIP de cartes validées");
    MessageDigest sha=MessageDigest.getInstance("SHA-256");long count=0,last=0;
    try(InputStream in=connection.getInputStream();FileOutputStream out=new FileOutputStream(partial)){
     byte[] bytes=new byte[65536];int n;while((n=in.read(bytes))!=-1){if(Thread.currentThread().isInterrupted())throw new IOException("Téléchargement interrompu");count+=n;if(count>SIZES[i])throw new IOException("Le serveur a changé : importe le ZIP de cartes validées");out.write(bytes,0,n);sha.update(bytes,0,n);if(count-last>1048576){progress.send("Données Sud-Ouest : "+((done+count)*100/total)+" %");last=count;}}
     out.getFD().sync();
    }
    StringBuilder digest=new StringBuilder();for(byte b:sha.digest())digest.append(String.format(Locale.ROOT,"%02x",b&255));
    if(count!=SIZES[i]||!digest.toString().equals(HASHES[i]))throw new IOException("Le serveur a changé : importe le ZIP de cartes validées");
    if(!partial.renameTo(target))throw new IOException("Impossible de conserver les données");done+=count;
   }finally{connection.disconnect();if(partial.exists())partial.delete();}
  }
  profiles();return status();
 }
 public JSONObject importMaps(InputStream source,Progress progress) throws Exception {
  if(!segments.exists()&&!segments.mkdirs())throw new IOException("Espace de stockage indisponible");
  File[] staged={new File(segments,FILES[0]+".import"),new File(segments,FILES[1]+".import")};
  boolean[] seen=new boolean[2];long total=SIZES[0]+SIZES[1],done=0;
  try(java.util.zip.ZipInputStream zip=new java.util.zip.ZipInputStream(source)){
   java.util.zip.ZipEntry entry;int entries=0;
   while((entry=zip.getNextEntry())!=null){
    if(++entries>16)throw new IOException("Archive de cartes invalide");
    int index=-1;for(int i=0;i<FILES.length;i++)if(entry.getName().equals(FILES[i])||entry.getName().equals("benchmark-data/"+FILES[i]))index=i;
    if(index<0){if(!entry.isDirectory()&&!entry.getName().equals("map-pins.json")&&!entry.getName().equals("README.txt"))throw new IOException("Archive de cartes invalide");byte[] skip=new byte[8192];long ignored=0;int n;while((n=zip.read(skip))!=-1)if((ignored+=n)>65536)throw new IOException("Archive de cartes invalide");continue;}
    if(seen[index])throw new IOException("Carte présente deux fois");seen[index]=true;
    MessageDigest sha=MessageDigest.getInstance("SHA-256");long count=0,last=0;
    try(FileOutputStream out=new FileOutputStream(staged[index])){
     byte[] bytes=new byte[65536];int n;while((n=zip.read(bytes))!=-1){if(Thread.currentThread().isInterrupted())throw new IOException("Import interrompu");count+=n;if(count>SIZES[index])throw new IOException("Ces cartes ne correspondent pas à la version validée");out.write(bytes,0,n);sha.update(bytes,0,n);if(count-last>1048576){progress.send("Import des cartes : "+((done+count)*100/total)+" %");last=count;}}out.getFD().sync();
    }
    StringBuilder hash=new StringBuilder();for(byte b:sha.digest())hash.append(String.format(Locale.ROOT,"%02x",b&255));
    if(count!=SIZES[index]||!hash.toString().equals(HASHES[index]))throw new IOException("Carte incomplète ou différente de la version validée");done+=count;
   }
   if(!seen[0]||!seen[1])throw new IOException("Les deux cartes Sud-Ouest sont nécessaires");
   profiles();for(int i=0;i<FILES.length;i++)java.nio.file.Files.move(staged[i].toPath(),new File(segments,FILES[i]).toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
   return status();
  }finally{for(File file:staged)file.delete();}
 }
 private Session current;
 private static final class Session {
  final String id=UUID.randomUUID().toString();final long start=System.nanoTime();
  final boolean extreme;final Map<String,String> params;final Map<String,LocalRouter.Result> raw=new HashMap<>();
  Session(Map<String,String> p,boolean e){params=p;extreme=e;}
  long remaining(){return 150000-(System.nanoTime()-start)/1000000;}
 }
 public JSONObject begin(JSONObject input) throws Exception {
  if(!ready())throw new IOException("Installe les données Sud-Ouest dans les réglages avant de comparer");profiles();
  JSONObject p=input.getJSONObject("profile");
  double mass=p.optDouble("mass",1300),referenceMass=p.optDouble("calibrationMass",1300),base=p.optDouble("base",3.5),v=75/3.6;
  double roll=mass*9.81*.012,eff=(referenceMass*9.81*.012+.39*v*v+700/v)*100000/(base*36e6);
  if(!Double.isFinite(eff)||eff<=0||eff>=.55||mass<500||mass>5000)throw new IOException("Profil véhicule incohérent");
  Map<String,String> params=new HashMap<>();params.put("totalweight",String.valueOf(mass));params.put("f_roll",String.valueOf(roll));params.put("thermal_efficiency",String.valueOf(eff));
  params.put("thermal_time_lph","0");params.put("lab_snap_retries","12");params.put("lab_alt_heuristic","5");params.put("lab_alt_core_fraction","0.6");
  current=new Session(params,p.optBoolean("extreme",false));return new JSONObject().put("session",current.id).put("budgetMs",150000).put("engine","Hypercruise local 0.8.25 · modèle 13");
 }
 private Session session(JSONObject input) throws Exception {
  if(current==null||!current.id.equals(input.getString("session")))throw new IOException("Calcul expiré : relance Comparer");return current;
 }
 public JSONObject end(JSONObject input) throws Exception {Session s=session(input);long elapsed=150000-s.remaining();s.raw.clear();current=null;return new JSONObject().put("elapsedMs",elapsed);}
 public JSONObject job(JSONObject input) throws Exception {
  Session s=session(input);long ms=Math.min(input.getLong("maxMs"),s.remaining()-500);
  if(ms<150)return new JSONObject().put("status","budget").put("routes",new JSONArray());
  String op=input.getString("op"),tag=input.getString("tag"),points=input.getString("points"),mode=input.getString("mode");
  if(!tag.matches("[a-zA-Z0-9_-]{1,96}"))throw new IOException("Nom de calcul invalide");
  String[] positions=points.split("\\|");if(positions.length!=2)throw new IOException("Deux points sont nécessaires");
  for(String point:positions){String[] a=point.split(",");if(a.length!=2)throw new IOException("Coordonnées invalides");double lon=Double.parseDouble(a[0]),lat=Double.parseDouble(a[1]);if(!Double.isFinite(lon)||!Double.isFinite(lat)||lat<40||lat>=45||lon< -5||lon>=5)throw new IOException("Ce point sort de la couverture Sud-Ouest installée");}
  Map<String,String> params=new HashMap<>(s.params);params.put("vmax",String.valueOf(input.getInt("speed")));params.put("avoid_motorways",input.getBoolean("avoid")?"1":"0");params.put("avoid_toll",input.getBoolean("toll")?"1":"0");params.put("lab_alt_penalty",String.valueOf(input.getDouble("penalty")));params.put("thermal_local_preference",op.equals("fixed")?"0":"1");
  params.put("prefer_main_axes","1");
  if(!op.equals("fixed")&&mode.equals("compromise"))params.put("pass1coefficient","1");
  int policy=mode.equals("fast")||mode.equals("compromise")?0:s.extreme?2:1;params.put("lab_driving_policy",String.valueOf(policy));params.put("vmax",policy==2?"70":"130");
  params.put("lab_toll_disutility_lpkm",String.valueOf(input.optDouble("tollDisutility",0)));
  params.put("thermal_time_lph",!op.equals("fixed")&&!mode.equals("fast")?String.valueOf(input.optDouble("timeWeight",mode.equals("compromise")?8:0)):"0");
  double heading=input.optDouble("heading",Double.NaN);
  if(!op.equals("fixed")&&Double.isFinite(heading)&&heading>=0&&heading<360)params.put("lab_start_direction",String.valueOf((int)Math.round(heading)%360));
  if(!op.equals("fixed")&&!mode.equals("fast"))params.put("pass2coefficient","-1");
  if(!input.optString("nogo").isEmpty())params.put("lab_nogo",input.getString("nogo"));
  JSONArray routes=new JSONArray();long start=System.nanoTime();String error=null;
  try{
   if(op.equals("pool")){
    LocalRouter.Batch batch=LocalRouter.pool(segments,profiles,points,params,ms,32,input.getInt("last"));error=batch.error;
    for(int i=0;i<batch.routes.size();i++){LocalRouter.Result r=batch.routes.get(i);if(r!=null){String name=tag+"k"+i;s.raw.put(name,r);routes.put(new JSONObject().put("name",name).put("data",new JSONObject(r.json)));}}
   }else{
    btools.router.OsmTrack guide=null;
    if(op.equals("fixed")){LocalRouter.Result prior=s.raw.get(input.getString("last"));if(prior==null||prior.raw==null)throw new IOException("Tracé non rejouable");guide=prior.raw;}
    else if(!op.equals("single"))throw new IOException("Calcul inconnu");
    LocalRouter.Result r=LocalRouter.run(segments,profiles,mode.equals("fast")?"hypercruise-reference-temps":"hypercruise-306-thermal",points,params,guide,ms,32);
    if(!op.equals("fixed"))s.raw.put(tag,r);routes.put(new JSONObject().put("name",tag).put("data",new JSONObject(r.json)));
   }
  }catch(Exception e){error=e.getMessage();}
  return new JSONObject().put("status",error==null?"ok":routes.length()>0?"partial":"error").put("error",error==null?JSONObject.NULL:error).put("routes",routes).put("ms",(System.nanoTime()-start)/1000000);
 }
}

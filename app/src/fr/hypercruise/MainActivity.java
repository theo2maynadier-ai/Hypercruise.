package fr.hypercruise;

import android.Manifest;
import android.content.Intent;
import android.util.AtomicFile;
import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.*;
import android.content.pm.PackageManager;
import android.location.*;
import android.speech.tts.TextToSpeech;
import android.view.WindowManager;
import org.json.*;
import java.net.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public class MainActivity extends Activity implements LocationListener {
 private WebView web; private Handler ui=new Handler(Looper.getMainLooper());
 private LocalEngine engine;private ExecutorService localPool=Executors.newSingleThreadExecutor();private String exportData;private String importId;
 private ExecutorService pool=Executors.newFixedThreadPool(2); private LocationManager lm;
 private TextToSpeech tts; private boolean voiceReady=false,requestedGps=false;
 private static final String BASE="https://appassets.androidplatform.net/";
 @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(0xfff5f7fb);getWindow().setNavigationBarColor(0xffFFFFFF);
 getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
 getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
 engine=new LocalEngine(this);web=new WebView(this);WebView.setWebContentsDebuggingEnabled(false);android.widget.FrameLayout frame=new android.widget.FrameLayout(this);frame.setBackgroundColor(0xfff8faf8);frame.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));setContentView(frame);if(android.os.Build.VERSION.SDK_INT>=35){frame.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});frame.requestApplyInsets();} WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);s.setSupportMultipleWindows(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);if(android.os.Build.VERSION.SDK_INT>=26)s.setSafeBrowsingEnabled(true);s.setUserAgentString(s.getUserAgentString()+" Hypercruise/0.8.25");
 web.addJavascriptInterface(new Bridge(),"Native");
 web.setWebViewClient(new WebViewClient(){
 @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){android.net.Uri uri=r.getUrl();if(!"https".equals(uri.getScheme())||!"appassets.androidplatform.net".equals(uri.getHost())||uri.getPort()!=-1)return null;
 if(!"GET".equals(r.getMethod()))return new WebResourceResponse("text/plain","UTF-8",405,"Method Not Allowed",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
 String rawPath=uri.getEncodedPath();if(rawPath==null||rawPath.indexOf('%')>=0||rawPath.contains("..")||rawPath.contains("\\"))return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));String path=rawPath.startsWith("/")?rawPath.substring(1):rawPath;if(path.isEmpty())path="index.html";
 String mime=path.endsWith(".html")?"text/html":path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".ttf")?"font/ttf":path.endsWith(".png")?"image/png":"application/json";
 try{return new WebResourceResponse(mime,"UTF-8",getAssets().open(path));}catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}}
 @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){android.net.Uri uri=r.getUrl();if("https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&uri.getPort()==-1)return false;String host=uri.getHost();if(r.isForMainFrame()&&r.hasGesture()&&"https".equals(uri.getScheme())&&Arrays.asList("openfreemap.org","www.openstreetmap.org","openmaptiles.org","maplibre.org").contains(host))try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}return true;}
 });
 lm=(LocationManager)getSystemService(LOCATION_SERVICE);
 tts=new TextToSpeech(this,status->{if(status==TextToSpeech.SUCCESS){int result=tts.setLanguage(Locale.FRANCE);voiceReady=result>=0;}});
 web.loadUrl(BASE+"index.html"); }
 private void js(String code){ui.post(()->{if(web!=null)web.evaluateJavascript(code,null);});}
 private void gpsStatus(String text){js("window.onGpsError&&onGpsError("+JSONObject.quote(text)+")");}
 private void beginGps(){if(!requestedGps)return;if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED&&checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},42);return;}
 try{boolean active=false;for(String provider:new String[]{LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER})if(lm.isProviderEnabled(provider)){lm.requestLocationUpdates(provider,1000,1,this);active=true;}if(!active)gpsStatus("Active la localisation dans les réglages Android.");}catch(Exception e){gpsStatus("Impossible de démarrer le GPS.");}}
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==42){if(g.length>0&&Arrays.stream(g).anyMatch(x->x==PackageManager.PERMISSION_GRANTED))beginGps();else{requestedGps=false;gpsStatus("Permission GPS refusée. Tu peux utiliser la carte et le mode démo.");}}}
 @Override public void onLocationChanged(Location l){try{JSONObject o=new JSONObject();o.put("lat",l.getLatitude());o.put("lon",l.getLongitude());o.put("accuracy",l.getAccuracy());o.put("speed",l.hasSpeed()?l.getSpeed()*3.6:JSONObject.NULL);o.put("bearing",l.hasBearing()?l.getBearing():JSONObject.NULL);o.put("altitude",l.hasAltitude()?l.getAltitude():JSONObject.NULL);o.put("time",l.getTime());js("window.onPosition&&onPosition("+o+")");}catch(Exception ignored){}}
 @Override public void onProviderEnabled(String p){} @Override public void onProviderDisabled(String p){gpsStatus("Signal GPS indisponible, vérifie la localisation.");} @Override public void onStatusChanged(String p,int s,Bundle b){}
 @Override protected void onPause(){super.onPause();if(lm!=null)lm.removeUpdates(this);if(tts!=null)tts.stop();js("window.onBackground&&onBackground()");}
 @Override protected void onResume(){super.onResume();if(lm!=null&&requestedGps)beginGps();}
 @Override protected void onDestroy(){if(lm!=null)lm.removeUpdates(this);pool.shutdownNow();localPool.shutdownNow();if(tts!=null)tts.shutdown();web.removeJavascriptInterface("Native");web.destroy();web=null;super.onDestroy();}
 @Override public void onBackPressed(){js("window.handleBack&&handleBack()");}
 @Override protected void onActivityResult(int code,int result,Intent data){super.onActivityResult(code,result,data);if(code==82){String id=importId;importId=null;if(id==null)return;if(result!=RESULT_OK||data==null||data.getData()==null){replyImport(id,null,"Import annulé");return;}android.net.Uri uri=data.getData();localPool.submit(()->{try(InputStream in=getContentResolver().openInputStream(uri)){if(in==null)throw new IOException("Fichier inaccessible");replyImport(id,engine.importMaps(in,text->js("window.onLocalProgress&&onLocalProgress("+JSONObject.quote(text)+")")),null);}catch(Exception e){replyImport(id,null,e.getMessage());}});return;}if(code!=81)return;String content=exportData;exportData=null;if(result!=RESULT_OK||data==null||data.getData()==null){js("window.onExportSaved&&onExportSaved(false)");return;}pool.submit(()->{try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new IOException();out.write(content.getBytes("UTF-8"));js("window.onExportSaved&&onExportSaved(true)");}catch(Exception e){gpsStatus("Impossible d’enregistrer le fichier.");}});}
 private void replyImport(String id,JSONObject value,String error){if(value!=null)js("onResponse("+JSONObject.quote(id)+",true,JSON.parse("+JSONObject.quote(value.toString())+"))");else js("onResponse("+JSONObject.quote(id)+",false,"+JSONObject.quote(error==null?"Import impossible":error)+")");}
 public class Bridge {
 @JavascriptInterface public void request(String id,String kind,String payload){
 if(kind.equals("localImport")){ui.post(()->{if(importId!=null){replyImport(id,null,"Un import est déjà ouvert");return;}importId=id;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");try{startActivityForResult(intent,82);}catch(Exception e){importId=null;replyImport(id,null,"Aucun sélecteur de fichier disponible");}});return;}
 Runnable job=()->{try{JSONObject p=new JSONObject(payload);JSONObject value;
 if(kind.equals("localStatus"))value=engine.status();
 else if(kind.equals("localInstall"))value=engine.install(text->js("window.onLocalProgress&&onLocalProgress("+JSONObject.quote(text)+")"));
 else if(kind.equals("localBegin"))value=engine.begin(p);
 else if(kind.equals("localJob"))value=engine.job(p);
 else if(kind.equals("localEnd"))value=engine.end(p);
 else if(kind.equals("traceLoad")||kind.equals("planLoad")){synchronized(MainActivity.this){File traceFile=new File(getFilesDir(),kind.equals("traceLoad")?"last-trace.json":"last-plan.json");value=new JSONObject();if(traceFile.exists())try(InputStream in=new AtomicFile(traceFile).openRead()){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);value.put(kind.equals("traceLoad")?"trace":"plan",new JSONObject(out.toString("UTF-8")));}}}
 else if(kind.equals("search")){String q=p.getString("q");if(q.length()>200)throw new IOException("Recherche trop longue");HttpURLConnection c=(HttpURLConnection)new URL("https://photon.komoot.io/api/?lang=fr&limit=6&q="+URLEncoder.encode(q,"UTF-8")).openConnection();c.setConnectTimeout(15000);c.setReadTimeout(15000);c.setRequestProperty("User-Agent","Hypercruise/0.8.23");
 try{if(c.getResponseCode()!=200)throw new IOException("Recherche d’adresses indisponible");ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){bytes.write(buffer,0,n);if(bytes.size()>1024*1024)throw new IOException("Réponse trop volumineuse");}}value=new JSONObject(bytes.toString("UTF-8"));}finally{c.disconnect();}}
 else throw new IOException("Requête inconnue");
 js("onResponse("+JSONObject.quote(id)+",true,JSON.parse("+JSONObject.quote(value.toString())+"))");
 }catch(Throwable e){js("onResponse("+JSONObject.quote(id)+",false,"+JSONObject.quote(e.getMessage()==null?"Mémoire ou données insuffisantes pour ce calcul":e.getMessage())+")");}};
 if(kind.startsWith("local"))localPool.submit(job);else pool.submit(job);
 }
 @JavascriptInterface public void checkpointTrace(String contents){checkpoint("last-trace.json",contents);}
 @JavascriptInterface public void checkpointPlan(String contents){checkpoint("last-plan.json",contents);}
 private void checkpoint(String name,String contents){if(contents.length()>16000000)return;pool.submit(()->{synchronized(MainActivity.this){AtomicFile file=new AtomicFile(new File(getFilesDir(),name));FileOutputStream out=null;try{new JSONObject(contents);out=file.startWrite();out.write(contents.getBytes("UTF-8"));file.finishWrite(out);}catch(Exception e){if(out!=null)file.failWrite(out);gpsStatus("La sauvegarde a échoué : exporte avant de fermer.");}}});}
 @JavascriptInterface public void exportFile(String name,String mime,String contents){ui.post(()->{if(exportData!=null){gpsStatus("Un export est déjà ouvert.");return;}if(contents.length()>16000000){gpsStatus("Export trop volumineux.");return;}exportData=contents;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(mime);intent.putExtra(Intent.EXTRA_TITLE,name.replaceAll("[^a-zA-Z0-9._-]","_"));try{startActivityForResult(intent,81);}catch(Exception e){exportData=null;gpsStatus("Aucune application ne permet d’enregistrer ce fichier.");}});}
 @JavascriptInterface public void startGps(){ui.post(()->{requestedGps=true;beginGps();});}
 @JavascriptInterface public void stopGps(){ui.post(()->{requestedGps=false;lm.removeUpdates(MainActivity.this);});}
 @JavascriptInterface public void keepAwake(boolean enabled){ui.post(()->{if(enabled)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});}
 @JavascriptInterface public void speak(String text){ui.post(()->{if(voiceReady)tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"guide");else gpsStatus("Voix française indisponible : guidage visuel actif.");});}
 @JavascriptInterface public void silence(){ui.post(()->tts.stop());}
 }
}

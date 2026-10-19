import fr.hypercruise.LocalRouter;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/** JVM harness for the actual APK router; Android transport is represented by TSV. */
public class BenchmarkRouter0824 {
 public static void main(String[] args)throws Exception {
  File graph=new File(args[0]),profiles=new File(args[1]),out=new File(args[2]);out.mkdirs();
  Map<String,LocalRouter.Result> cache=new HashMap<>();System.out.println("READY");System.out.flush();
  BufferedReader in=new BufferedReader(new InputStreamReader(System.in));String line;
  while((line=in.readLine())!=null){String[] a=line.split("\t",-1);String error=null;List<String> names=new ArrayList<>();long start=System.nanoTime();
   try{
    File selectedProfiles=a.length>11?new File(a[11]):profiles;Map<String,String> p=new HashMap<>();p.put("vmax",a[4]);p.put("avoid_motorways",a[5]);p.put("avoid_toll",a[6]);p.put("lab_alt_penalty",a[7]);p.put("thermal_time_lph",!a[0].equals("fixed")&&a[3].equals("compromise")?(a.length>14?a[14]:"8"):"0");p.put("prefer_main_axes","1");int policy=a[3].equals("fast")||a[3].equals("compromise")?0:a.length>12&&a[12].equals("1")?2:1;p.put("lab_driving_policy",String.valueOf(policy));p.put("vmax",policy==2?"70":"130");p.put("lab_toll_disutility_lpkm",a.length>13?a[13]:"0");p.put("totalweight","1300");p.put("f_roll",String.valueOf(1300*9.81*.012));double v=75/3.6;p.put("thermal_efficiency",String.valueOf((1300*9.81*.012+.39*v*v+700/v)*100000/(3.5*36e6)));p.put("lab_snap_retries","12");p.put("lab_alt_heuristic","5");p.put("lab_alt_core_fraction","0.6");p.put("thermal_local_preference",a[0].equals("fixed")?"0":"1");
    if(!a[0].equals("fixed")&&!a[3].equals("fast"))p.put("pass2coefficient","-1");if(!a[10].isEmpty())p.put("lab_nogo",a[10]);
    if(a[0].equals("pool")){
     LocalRouter.Batch batch=LocalRouter.pool(graph,selectedProfiles,a[2],p,Long.parseLong(a[8]),32,Integer.parseInt(a[9]));error=batch.error;
     for(int i=0;i<batch.routes.size();i++){LocalRouter.Result r=batch.routes.get(i);if(r!=null){String name=a[1]+"k"+i;cache.put(name,r);Files.writeString(new File(out,name+".json").toPath(),r.json);names.add(name);}}
    }else{
     LocalRouter.Result r=LocalRouter.run(graph,selectedProfiles,a[3].equals("fast")?"hypercruise-reference-temps":"hypercruise-306-thermal",a[2],p,a[0].equals("fixed")?cache.get(a[9]).raw:null,Long.parseLong(a[8]),32);
     if(!a[0].equals("fixed"))cache.put(a[1],r);Files.writeString(new File(out,a[1]+".json").toPath(),r.json);names.add(a[1]);
    }
   }catch(Throwable e){error=e.getMessage();}
   for(String name:names)System.out.println("GEN\t"+a[1]+"\t"+name);
   System.out.println("END\t"+a[1]+"\t"+(error==null?"ok":names.isEmpty()?"error":"partial")+"\t"+(System.nanoTime()-start)/1000000+"\t"+(error==null?"":error.replace('\n',' ').replace('\t',' ')));System.out.flush();
  }
 }
}

import fr.hypercruise.LocalRouter;import java.io.*;import java.nio.file.*;import java.util.*;import btools.router.RoutingContext;
public class NativeReroute089 {
 public static void main(String[] a)throws Exception{
  java.lang.reflect.Method method=LocalRouter.class.getDeclaredMethod("startDirection",RoutingContext.class,Map.class);method.setAccessible(true);RoutingContext rc=new RoutingContext();method.invoke(null,rc,Map.of("lab_start_direction","85"));if(!rc.forceUseStartDirection||rc.startDirection!=85)throw new AssertionError("heading not used");
  String[] points={"-0.340,43.300|-0.048,43.100","2.310,43.567|-0.3708,43.2951"};
  for(int i=0;i<points.length;i++){
   Map<String,String> p=new HashMap<>();p.put("vmax","75");p.put("avoid_motorways","1");p.put("avoid_toll","1");p.put("totalweight","1300");p.put("f_roll",String.valueOf(1300*9.81*.012));double v=75/3.6;p.put("thermal_efficiency",String.valueOf((1300*9.81*.012+.39*v*v+700/v)*100000/(3.5*36e6)));p.put("thermal_time_lph","0");p.put("lab_snap_retries","12");p.put("lab_alt_heuristic","5");p.put("lab_alt_core_fraction","0.6");p.put("thermal_local_preference","1");p.put("pass2coefficient","-1");p.put("lab_start_direction",i==0?"90":"270");
   long start=System.nanoTime();LocalRouter.Result route=LocalRouter.run(new File(a[0]),new File(a[1]),"hypercruise-306-thermal",points[i],p,null,18000,32);long ms=(System.nanoTime()-start)/1000000;
   p.remove("lab_start_direction");p.put("thermal_local_preference","0");LocalRouter.Result fixed=LocalRouter.run(new File(a[0]),new File(a[1]),"hypercruise-306-thermal",points[i],p,route.raw,4000,32);
   Files.writeString(Path.of(a[2],"reroute-"+i+".json"),route.json);Files.writeString(Path.of(a[2],"reroute-"+i+"-fixed.json"),fixed.json);System.out.println("PASS native "+i+" search "+ms+"ms; exact replay available");
  }
 }
}

package btools.router;
public class TimeObjective0823 {
 public static void main(String[] args){
  KinematicModel k=new KinematicModel();k.cost0=.1;k.thermalTimeOnly=true;k.thermalTimeWeight=100;
  if(k.thermalScore(1,120)!=k.thermalScore(1000,120))throw new AssertionError("fuel influences time objective");
  if(k.thermalScore(1000,100)>=k.thermalScore(1,120))throw new AssertionError("duration not primary");
  k.thermalTimeOnly=false;k.thermalTimeWeight=0;
  if(k.thermalScore(1,120)!=k.thermalScore(1,10000))throw new AssertionError("eco includes time cost");
  if(k.thermalScore(1,1000)>=k.thermalScore(2,100))throw new AssertionError("eco not fuel objective");
  System.out.println("PASS actual KinematicModel: fuel-independent time objective, pure fuel eco objective.");
 }
}

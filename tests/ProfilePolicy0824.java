package btools.router;
import btools.expressions.*;
import java.io.*;
import java.util.*;
public class ProfilePolicy0824 {
 static int checks=0;static Map<BExpressionContextWay,KinematicModel> models=new HashMap<>();
 static BExpressionContextWay ctx(String dir,int mode,boolean noMotorway,boolean noToll){
  BExpressionMetaData m=new BExpressionMetaData();BExpressionContextWay w=new BExpressionContextWay(m);BExpressionContextNode n=new BExpressionContextNode(m);m.readMetaData(new File(dir,"lookups.dat"));
  Map<String,String> p=new HashMap<>();p.put("lab_driving_policy",""+mode);p.put("avoid_motorways",noMotorway?"1":"0");p.put("avoid_toll",noToll?"1":"0");
  w.parseFile(new File(dir,"hypercruise-306-thermal.brf"),"global",p);n.setForeignContext(w);n.parseFile(new File(dir,"hypercruise-306-thermal.brf"),"global",p);KinematicModel k=new KinematicModel();p.put("vmax","130");k.init(w,n,p);models.put(w,k);return w;
 }
 static void check(String dir,int mode,String tags,double cruise,boolean accessible,boolean noMotorway,boolean noToll){
  BExpressionContextWay w=ctx(dir,mode,noMotorway,noToll);int[] data=w.createNewLookupData();for(String t:tags.split(" ")){String[] a=t.split("=",2);w.addLookupValue(a[0],a[1],data);}w.evaluate(false,w.encode(data));
  double c=w.getBuildInVariable(w.getOutputVariableIndex("cruise_speedlimit",false));if(Math.abs(c-cruise)>.01)throw new AssertionError(tags+" mode="+mode+" cruise="+c+" expected="+cruise);
  if((w.getMaxspeed()>0)!=accessible)throw new AssertionError("access "+tags+" mode="+mode);double effective=models.get(w).getEffectiveSpeedLimit()*3.6;if(effective>Math.min(cruise,w.getMaxspeed())+.01)throw new AssertionError("effective exceeds legal/target cap");checks++;
 }
 public static void main(String[] args){String d=args[0];int[] limits={20,30,50,70,80,90,100,110,120,130},eco={20,30,50,70,80,85,95,100,105,110};for(int i=0;i<limits.length;i++){int l=limits[i];String tags="highway=primary surface=asphalt maxspeed="+l;check(d,0,tags,l,true,false,false);check(d,1,tags,eco[i],true,false,false);check(d,2,tags,Math.min(70,l),true,false,false);}
  check(d,0,"highway=trunk maxspeed=110",110,true,true,false);
  check(d,0,"highway=motorway maxspeed=130",130,false,true,false);
  check(d,1,"highway=primary maxspeed=80 lanes=1",30,true,false,false);
  check(d,1,"highway=primary maxspeed=80",80,true,false,false);
  check(d,0,"highway=residential maxspeed=50",50,true,false,false);
  check(d,0,"highway=tertiary maxspeed=80",80,true,false,false);
  check(d,0,"highway=motorway maxspeed=130 toll=yes",130,false,false,true);
  check(d,0,"highway=motorway maxspeed=130 toll=no",130,true,false,true);
  check(d,0,"highway=primary maxspeed=80 maxspeed:forward=50",50,true,false,false);
  check(d,1,"highway=primary maxspeed=80 zone:maxspeed=30",80,true,false,false);
  // cruise remains target80; legal maxspeed30 caps effective speed in KinematicModel.
  System.out.println("PASS "+checks+" native BRF policy/access/metadata checks");
 }
}

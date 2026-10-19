package btools.router;

import java.util.*;
import btools.util.CheapAngleMeter;

/** Read-only curve/braking envelope on the complete detailed candidate geometry. */
final class ThermalCurvePlan {
  final double[] speed;
  private final Map<Long,int[]> positions;

  private ThermalCurvePlan(double[] speed, Map<Long,int[]> positions) {
    this.speed=speed;this.positions=positions;
  }

  static ThermalCurvePlan fromTrack(OsmTrack track,KinematicModel model) {
    int n=track.nodes.size();
    if(n<2)throw new IllegalArgumentException("curve plan requires a complete geometry");
    double[] speed=new double[n],distance=new double[n];Arrays.fill(speed,model.vmax);
    Map<Long,List<Integer>> indices=new HashMap<>();CheapAngleMeter meter=new CheapAngleMeter();
    for(int i=0;i<n;i++){
      OsmPathElement p=track.nodes.get(i);
      indices.computeIfAbsent(p.getIdFromPos(),key->new ArrayList<>()).add(i);
      if(i>0)distance[i]=distance[i-1]+p.calcDistance(track.nodes.get(i-1));
      if(i>0&&i<n-1){
        OsmPathElement before=track.nodes.get(i-1),after=track.nodes.get(i+1);
        double angle=meter.calcAngle(before.getILon(),before.getILat(),p.getILon(),p.getILat(),after.getILon(),after.getILat());
        speed[i]=Math.min(speed[i],KinematicPath.curveSpeed(model,p.calcDistance(before),after.calcDistance(p),angle));
      }
    }
    ThermalGeometry.brakingEnvelope(distance,speed,model.thermalBraking);
    Map<Long,int[]> positions=new HashMap<>();
    for(Map.Entry<Long,List<Integer>> e:indices.entrySet())positions.put(e.getKey(),e.getValue().stream().mapToInt(Integer::intValue).toArray());
    return new ThermalCurvePlan(speed,positions);
  }

  int index(int lon,int lat,int minimum) {
    int[] candidates=positions.get(((long)lon<<32)|(lat&0xffffffffL));
    if(candidates==null)return -1;
    int i=Arrays.binarySearch(candidates,minimum);if(i<0)i=-i-1;
    return i<candidates.length?candidates[i]:-1;
  }
  int size(){return speed.length;}
}

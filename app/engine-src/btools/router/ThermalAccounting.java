package btools.router;

/** Optional fixed-replay diagnostics. Never an additional routing cost. */
public final class ThermalAccounting implements Cloneable {
  double tractionLiters, auxiliaryLiters, idleTopupLiters, waitLiters;
  double movingSeconds, waitingSeconds, meters;
  double junctionWaitSeconds, nodeWaitSeconds;
  double rollingJoules, airJoules, uphillJoules, downhillJoules, kineticJoules;
  double brakingJoules, clippedKineticJoules;
  double structureMeters, structureRawAscent, structureModeledAscent;
  double structureWays;
  double signalEvents, duplicateSignalNodes;

  ThermalAccounting copy() {
    try { return (ThermalAccounting) clone(); }
    catch (CloneNotSupportedException e) { throw new AssertionError(e); }
  }

  void add(ThermalAccounting t) {
    tractionLiters += t.tractionLiters; auxiliaryLiters += t.auxiliaryLiters;
    idleTopupLiters += t.idleTopupLiters; waitLiters += t.waitLiters;
    movingSeconds += t.movingSeconds; waitingSeconds += t.waitingSeconds; meters += t.meters;
    junctionWaitSeconds += t.junctionWaitSeconds; nodeWaitSeconds += t.nodeWaitSeconds;
    rollingJoules += t.rollingJoules; airJoules += t.airJoules;
    uphillJoules += t.uphillJoules; downhillJoules += t.downhillJoules; kineticJoules += t.kineticJoules;
    brakingJoules += t.brakingJoules; clippedKineticJoules += t.clippedKineticJoules;
    structureMeters += t.structureMeters; structureRawAscent += t.structureRawAscent;
    structureModeledAscent += t.structureModeledAscent; structureWays += t.structureWays;
    signalEvents += t.signalEvents; duplicateSignalNodes += t.duplicateSignalNodes;
  }

  public String json() {
    return "{\"tractionLiters\":" + tractionLiters
        + ",\"auxiliaryLiters\":" + auxiliaryLiters
        + ",\"idleTopupLiters\":" + idleTopupLiters
        + ",\"waitLiters\":" + waitLiters
        + ",\"movingSeconds\":" + movingSeconds
        + ",\"waitingSeconds\":" + waitingSeconds
        + ",\"junctionWaitSeconds\":" + junctionWaitSeconds
        + ",\"nodeWaitSeconds\":" + nodeWaitSeconds
        + ",\"meters\":" + meters
        + ",\"rollingJoules\":" + rollingJoules
        + ",\"airJoules\":" + airJoules
        + ",\"uphillJoules\":" + uphillJoules
        + ",\"downhillJoules\":" + downhillJoules
        + ",\"kineticJoules\":" + kineticJoules
        + ",\"brakingJoules\":" + brakingJoules
        + ",\"clippedKineticJoules\":" + clippedKineticJoules
        + ",\"structureMeters\":" + structureMeters
        + ",\"structureRawAscent\":" + structureRawAscent
        + ",\"structureModeledAscent\":" + structureModeledAscent
        + ",\"structureWays\":" + structureWays
        + ",\"signalEvents\":" + signalEvents
        + ",\"duplicateSignalNodes\":" + duplicateSignalNodes + "}";
  }
}

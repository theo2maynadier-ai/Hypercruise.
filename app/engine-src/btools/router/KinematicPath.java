/**
 * The path-instance of the kinematic model
 *
 * @author ab
 */
package btools.router;

import btools.mapaccess.OsmTransferNode;
import btools.util.CheapRuler;
import btools.util.CheapAngleMeter;

final class KinematicPath extends OsmPath {
  private double lastSectionDistance;
  private double[] sectionDistance;
  private boolean validWayElevation;
  // Raw minus filtered height. Carries across links and candidate-path copies.
  private double elevationLag;
  private double[] vertexSpeed;
  private int[] sectionCurveIndices;
  private int curvePlanIndex;
  private double sectionEndSpeed = Double.POSITIVE_INFINITY;
  private double ekin; // kinetic energy (Joule)
  private double totalTime;  // travel time (seconds)
  private double totalEnergy; // total route energy (Joule)
  private double modeledAscent;
  private boolean thermalMetrics;
  private ThermalAccounting accounting;
  private boolean structureWay;
  private boolean structureCounted;
  private double[] rawHeight;
  private double metersSinceSignal = Double.POSITIVE_INFINITY;
  private float floatingAngleLeft; // sliding average left bend (degree)
  private float floatingAngleRight; // sliding average right bend (degree)

  @Override
  protected void init(OsmPath orig) {
    KinematicPath origin = (KinematicPath) orig;
    lastSectionDistance = origin.lastSectionDistance;
    ekin = origin.ekin;
    totalTime = origin.totalTime;
    totalEnergy = origin.totalEnergy;
    modeledAscent = origin.modeledAscent;
    elevationLag = origin.elevationLag;
    curvePlanIndex = origin.curvePlanIndex;
    thermalMetrics = origin.thermalMetrics;
    accounting = origin.accounting == null ? null : origin.accounting.copy();
    metersSinceSignal = origin.metersSinceSignal;
    floatingAngleLeft = origin.floatingAngleLeft;
    floatingAngleRight = origin.floatingAngleRight;
  }

  @Override
  protected void resetState() {
    lastSectionDistance = 0.;
    ekin = 0.;
    totalTime = 0.;
    totalEnergy = 0.;
    modeledAscent = 0.;
    elevationLag = 0.;
    curvePlanIndex = 0;
    accounting = null;
    metersSinceSignal = Double.POSITIVE_INFINITY;
    floatingAngleLeft = 0.f;
    floatingAngleRight = 0.f;
  }

  @Override
  protected void prepareWayGeometry(RoutingContext rc, OsmTransferNode geometry, int lon, int lat, short elevation) {
    sectionDistance = null;
    validWayElevation = false;
    vertexSpeed = null;
    sectionCurveIndices = null;
    sectionEndSpeed = Double.POSITIVE_INFINITY;
    KinematicModel km = (KinematicModel) rc.pm;
    if (km.thermalAccounting && accounting == null) accounting = new ThermalAccounting();
    structureWay = km.isThermalStructure();
    structureCounted = false;
    rawHeight = null;
    thermalMetrics = km.thermalFuelModel;
    if (!km.thermalFuelModel || km.getEffectiveSpeedLimit() <= 0.) return;
    int count = 2;
    for (OsmTransferNode n = geometry; n != null; n = n.next) count++;
    int[] lons = new int[count], lats = new int[count];
    double[] position = new double[count], heights = new double[count];
    sectionDistance = new double[count - 1];
    vertexSpeed = new double[count];
    lons[0] = lon;
    lats[0] = lat;
    boolean validElevation = elevation != Short.MIN_VALUE;
    heights[0] = validElevation ? elevation / 4. : 0.;
    OsmTransferNode node = geometry;
    for (int i = 1; i < count; i++) {
      lons[i] = node == null ? targetNode.ilon : node.ilon;
      lats[i] = node == null ? targetNode.ilat : node.ilat;
      short height = node == null ? targetNode.selev : node.selev;
      if (height == Short.MIN_VALUE) validElevation = false;
      heights[i] = height == Short.MIN_VALUE ? heights[i - 1] : height / 4.;
      sectionDistance[i - 1] = Math.max(1., Math.round(CheapRuler.distance(lons[i - 1], lats[i - 1], lons[i], lats[i])));
      position[i] = position[i - 1] + sectionDistance[i - 1];
      if (node != null) node = node.next;
    }
    validWayElevation = validElevation;
    if (accounting != null && structureWay) {
      rawHeight = heights;
    }
    if (!km.thermalAnticipation) {
      vertexSpeed = null;
      return;
    }
    java.util.Arrays.fill(vertexSpeed, km.getEffectiveSpeedLimit());
    if (rc.thermalCurvePlan != null) {
      sectionCurveIndices = new int[count];
      int hint = curvePlanIndex;
      for (int i = 0; i < count; i++) {
        int index = rc.thermalCurvePlan.index(lons[i], lats[i], hint);
        sectionCurveIndices[i] = index;
        if (index >= 0) {
          vertexSpeed[i] = Math.min(vertexSpeed[i], rc.thermalCurvePlan.speed[index]);
          hint = index + 1;
        }
      }
    } else {
      // Discovery has not selected the next link yet; retain its local estimate.
      CheapAngleMeter meter = new CheapAngleMeter();
      for (int i = 1; i < count - 1; i++) {
        double angle = meter.calcAngle(lons[i - 1], lats[i - 1], lons[i], lats[i], lons[i + 1], lats[i + 1]);
        vertexSpeed[i] = Math.min(vertexSpeed[i], curveSpeed(km, sectionDistance[i - 1], sectionDistance[i], angle));
      }
    }
    if (targetNode.nodeDescription != null) {
      rc.expctxNode.evaluate(false, targetNode.nodeDescription);
      vertexSpeed[count - 1] = Math.min(vertexSpeed[count - 1], thermalNodeSpeed(km, position[count - 1]));
    }
    ThermalGeometry.brakingEnvelope(position, vertexSpeed, km.thermalBraking);
  }

  @Override
  protected double sectionHeightChange(RoutingContext rc, int section, double distance, double rawChange) {
    KinematicModel km = (KinematicModel) rc.pm;
    if (!km.thermalFuelModel || !validWayElevation || km.thermalElevationWindow <= 0. || distance <= 0.) return rawChange;
    // Exact spatial first-order filtering of a piecewise-linear height profile.
    // The input is already signed and clipped at route endpoints by OsmPath.
    // No reset at a junction: splitting the same geometry cannot create ascent.
    double nextLag = ThermalGeometry.advanceElevationLag(elevationLag, distance, rawChange, km.thermalElevationWindow);
    double change = rawChange + elevationLag - nextLag;
    elevationLag = nextLag;
    return change;
  }

  @Override
  protected double processWaySection(RoutingContext rc, double dist, double delta_h, double elevation, double angle, double cosangle, boolean isStartpoint, int nsection, int lastpriorityclassifier) {
    KinematicModel km = (KinematicModel) rc.pm;
    // A turn or a mandatory stop separates independently controlled events.
    if (!isStartpoint && Math.abs(angle) > 45.) metersSinceSignal = Double.POSITIVE_INFINITY;
    // Starting inside a way resets physical state after prepareWayGeometry.
    if (km.thermalAccounting && accounting == null) accounting = new ThermalAccounting();
    if (accounting != null && structureWay && !structureCounted) {
      accounting.structureWays++;
      structureCounted = true;
    }

    sectionEndSpeed = vertexSpeed == null ? Double.POSITIVE_INFINITY : vertexSpeed[nsection + 1];
    if (vertexSpeed != null) cutEkin(km.totalweight, vertexSpeed[nsection]);

    double cost = 0.;
    double extraTime = 0.;

    if (isStartpoint) {
      // for forward direction, we start with target speed
      if (!rc.inverseDirection) {
        extraTime = 0.5 * (1. - cosangle) * 40.; // 40 seconds turn penalty
      }
    } else {
      double turnspeed = 999.; // just high

      if (km.thermalFuelModel) {
        turnspeed = thermalCurveSpeed(km, dist, angle);
      } else if (km.turnAngleDecayTime != 0.) { // process turn-angle slowdown
        if (angle < 0) floatingAngleLeft -= (float) angle;
        else floatingAngleRight += (float) angle;
        float aa = Math.max(floatingAngleLeft, floatingAngleRight);

        double curveSpeed = aa > 10. ? 200. / aa : 20.;
        double distanceTime = dist / curveSpeed;
        double decayFactor = Math.exp(-distanceTime / km.turnAngleDecayTime);
        floatingAngleLeft = (float) (floatingAngleLeft * decayFactor);
        floatingAngleRight = (float) (floatingAngleRight * decayFactor);

        if (curveSpeed < 20.) {
          turnspeed = curveSpeed;
        }
      }

      if (nsection == 0) { // process slowdown by crossing geometry
        double junctionspeed = 999.; // just high

        int classifiermask = (int) rc.expctxWay.getClassifierMask();

        // penalty for equal priority crossing
        boolean hasLeftWay = false;
        boolean hasRightWay = false;
        boolean hasResidential = false;
        for (OsmPrePath prePath = rc.firstPrePath; prePath != null; prePath = prePath.next) {
          KinematicPrePath pp = (KinematicPrePath) prePath;

          if (((pp.classifiermask ^ classifiermask) & 8) != 0) { // exactly one is linktype
            continue;
          }

          if ((pp.classifiermask & 32) != 0) { // touching a residential?
            hasResidential = true;
          }

          if (pp.priorityclassifier > priorityclassifier || pp.priorityclassifier == priorityclassifier && priorityclassifier < 20) {
            double diff = pp.angle - angle;
            if (diff < -40. && diff > -140.) hasLeftWay = true;
            if (diff > 40. && diff < 140.) hasRightWay = true;
          }
        }
        double residentialSpeed = 13.;

        if (hasLeftWay && junctionspeed > km.leftWaySpeed) junctionspeed = km.leftWaySpeed;
        if (hasRightWay && junctionspeed > km.rightWaySpeed) junctionspeed = km.rightWaySpeed;
        if (hasResidential && junctionspeed > residentialSpeed) junctionspeed = residentialSpeed;

        if ((lastpriorityclassifier < 20) ^ (priorityclassifier < 20)) {
          extraTime += 10.;
          junctionspeed = 0; // full stop for entering or leaving road network
        }

        if (lastpriorityclassifier != priorityclassifier && (classifiermask & 8) != 0) {
          extraTime += 2.; // two seconds for entering a link-type
        }
        turnspeed = turnspeed > junctionspeed ? junctionspeed : turnspeed;

        if (message != null) {
          message.vnode0 = (int) (junctionspeed * 3.6 + 0.5);
        }
      }
      cutEkin(km.totalweight, turnspeed); // apply turnspeed
    }

    double sectionCost = extraTime;

    // linear temperature correction
    double tcorr = (20. - km.outside_temp) * 0.0035;

    // air_pressure down 1mb/8m
    double ecorr = 0.0001375 * (elevation - 100.);

    double f_air = km.f_air * (1. + tcorr - ecorr);

    double distanceCost = evolveDistance(km, dist, delta_h, f_air);
    if (distanceCost < 0.) return -1.;
    if (sectionCurveIndices != null && sectionCurveIndices[nsection + 1] >= 0) {
      curvePlanIndex = sectionCurveIndices[nsection + 1];
    }
    lastSectionDistance = dist;
    if (km.thermalFuelModel) modeledAscent += Math.max(0., delta_h);
    if (accounting != null && structureWay && rawHeight != null) {
      accounting.structureMeters += dist;
      double raw = (rawHeight[nsection + 1] - rawHeight[nsection])
          * Math.min(1., dist / sectionDistance[nsection]);
      if (rc.inverseDirection) raw = -raw;
      accounting.structureRawAscent += Math.max(0., raw);
      accounting.structureModeledAscent += Math.max(0., delta_h);
    }


    float cf = rc.expctxWay.getCostfactor();

    if (message != null) {
      message.costfactor = (float) (distanceCost / dist);
      message.vmax = (int) (km.getWayMaxspeed() * 3.6 + 0.5);
      message.vmaxExplicit = (int) (km.getWayMaxspeedExplicit() * 3.6 + 0.5);
      message.vmin = (int) (km.getWayMinspeed() * 3.6 + 0.5);
      message.extraTime = (int) (extraTime * 1000);
    }

    cost += dist * cf + 0.5f;

    if (km.thermalFuelModel) {
      // Preference affects route choice only; it is never reported as fuel burned.
      double preference = km.getThermalPreference();
      if (!km.thermalTimeOnly) cost += dist * preference * km.thermalLocalPreference / (1000. * km.cost0);
      double fuel = extraTime * km.thermalIdleLitersPerSecond;
      totalEnergy += fuel * km.thermalFuelJoulesPerLiter;
      if (accounting != null) { accounting.waitLiters += fuel; accounting.waitingSeconds += extraTime; accounting.junctionWaitSeconds += extraTime; }
      cost += km.thermalScore(fuel, extraTime);
    } else {
      cost += (extraTime * km.pw / km.cost0);
    }
    totalTime += extraTime;

    cost += distanceCost;

    return cost;
  }


  protected double evolveDistance(KinematicModel km, double dist, double delta_h, double f_air) {
    if (km.thermalFuelModel) return evolveThermalDistance(km, dist, delta_h, f_air);
    // elevation force
    double fh = delta_h * km.totalweight * 9.81 / dist;

    double effectiveSpeedLimit = km.getEffectiveSpeedLimit();
    double emax = 0.5 * km.totalweight * effectiveSpeedLimit * effectiveSpeedLimit;
    if (emax <= 0.) {
      return -1.;
    }
    double vb = km.getBreakingSpeed(effectiveSpeedLimit);
    double elow = 0.5 * km.totalweight * vb * vb;

    double elapsedTime = 0.;
    double dissipatedEnergy = 0.;

    double v = Math.sqrt(2. * ekin / km.totalweight);
    double d = dist;
    while (d > 0.) {
      boolean slow = ekin < elow;
      boolean fast = ekin >= emax;
      double etarget = slow ? elow : emax;
      double f = km.f_roll + f_air * v * v + fh;
      double f_recup = Math.max(0., fast ? -f : (slow ? km.f_recup : 0) - fh); // additional recup for slow part
      f += f_recup;

      double delta_ekin;
      double timeStep;
      double x;
      if (fast) {
        x = d;
        delta_ekin = x * f;
        timeStep = x / v;
        ekin = etarget;
      } else {
        delta_ekin = etarget - ekin;
        double b = 2. * f_air / km.totalweight;
        double x0 = delta_ekin / f;
        double x0b = x0 * b;
        x = x0 * (1. - x0b * (0.5 + x0b * (0.333333333 - x0b * 0.25))); // = ln( delta_ekin*b/f + 1.) / b;
        double maxstep = Math.min(50., d);
        if (x >= maxstep) {
          x = maxstep;
          double xb = x * b;
          delta_ekin = x * f * (1. + xb * (0.5 + xb * (0.166666667 + xb * 0.0416666667))); // = f/b* exp(xb-1)
          ekin += delta_ekin;
        } else {
          ekin = etarget;
        }
        double v2 = Math.sqrt(2. * ekin / km.totalweight);
        double a = f / km.totalweight; // TODO: average force?
        timeStep = (v2 - v) / a;
        v = v2;
      }
      d -= x;
      elapsedTime += timeStep;

      // dissipated energy does not contain elevation and efficient recup
      dissipatedEnergy += delta_ekin - x * (fh + f_recup * km.recup_efficiency);

      // correction: inefficient recup going into heating is half efficient
      double ieRecup = x * f_recup * (1. - km.recup_efficiency);
      double eaux = timeStep * km.p_standby;
      dissipatedEnergy -= Math.max(ieRecup, eaux) * 0.5;
    }

    dissipatedEnergy += elapsedTime * km.p_standby;

    totalTime += elapsedTime;
    totalEnergy += dissipatedEnergy + dist * fh;

    return (km.pw * elapsedTime + dissipatedEnergy) / km.cost0; // =cost
  }

  protected double thermalCurveSpeed(KinematicModel km, double dist, double angle) {
    return curveSpeed(km, lastSectionDistance > 0. ? lastSectionDistance : dist, dist, angle);
  }

  static double curveSpeed(KinematicModel km, double previous, double dist, double angle) {
    double radians = Math.abs(angle) * Math.PI / 180.;
    if (radians < 0.0001) return km.vmax;
    double adjacent = (previous + dist) * 0.5;
    // Chord geometry approximation. Comfort lateral acceleration is provisional.
    double radius = adjacent / (2. * Math.sin(Math.min(Math.PI, radians) * 0.5));
    return Math.min(km.vmax, Math.sqrt(km.thermalLateralAcceleration * radius));
  }

  // Forward road-load simulation with no electrical recuperation.
  protected double evolveThermalDistance(KinematicModel km, double dist, double deltaH, double air) {
    double limit = km.getEffectiveSpeedLimit();
    if (!(limit > 0.) || !(dist > 0.)) return -1.;
    double gradeForce = deltaH * km.totalweight * 9.81 / dist;
    // Equilibrium climb speed is a limit to sustained acceleration, not an
    // instantaneous brake. Existing momentum is spent over the actual distance.
    double powerLimit = limit;
    if ((km.f_roll + air * limit * limit + gradeForce) * limit > km.thermalWheelPower) {
      double low = 0.1, high = limit;
      for (int i = 0; i < 16; i++) {
        double mid = (low + high) * 0.5;
        if ((km.f_roll + air * mid * mid + gradeForce) * mid > km.thermalWheelPower) high = mid;
        else low = mid;
      }
      powerLimit = low;
    }
    double speed = Math.min(limit, Math.sqrt(2. * ekin / km.totalweight));
    ekin = 0.5 * km.totalweight * speed * speed;
    double left = dist, fuel = 0., duration = 0.;
    while (left > 0.000001) {
      double dx = Math.min(20., left);
      if (km.thermalAnticipation && sectionEndSpeed == 0. && speed == 0. && dx == left) dx *= 0.5;
      double force = km.f_roll + air * speed * speed + gradeForce;
      double a = Math.min(km.thermalAcceleration,
          (km.thermalWheelPower / Math.max(speed, 1.) - force) / km.totalweight);
      double next = Math.min(limit, Math.sqrt(Math.max(0., speed * speed + 2. * a * dx)));
      if (speed > powerLimit && a < 0.) next = Math.max(powerLimit, next);
      else if (a >= 0.) next = Math.min(powerLimit, next);
      if (km.thermalAnticipation && Double.isFinite(sectionEndSpeed)) {
        // Brake over distance before a known curve/stop, instead of charging a
        // full acceleration followed by an instantaneous loss of kinetic energy.
        double envelope = Math.sqrt(sectionEndSpeed * sectionEndSpeed
            + 2. * km.thermalBraking * Math.max(0., left - dx));
        next = Math.min(next, envelope);
      }
      if (next + speed <= 0.) return -1.;
      double dt = 2. * dx / (next + speed);
      double wheelWork = Math.max(0.,
          (km.f_roll + air * 0.5 * (speed * speed + next * next) + gradeForce) * dx
          + 0.5 * km.totalweight * (next * next - speed * speed));
      double burned = (wheelWork + km.p_standby * dt)
          / (km.thermalEfficiency * km.thermalFuelJoulesPerLiter);
      // Provisional mechanically injected diesel: idle floor also in overrun.
      // This must be calibrated; changing it to zero requires new cutoff bounds.
      burned = Math.max(burned, km.thermalIdleLitersPerSecond * dt);
      if (accounting != null) {
        double traction = wheelWork / (km.thermalEfficiency * km.thermalFuelJoulesPerLiter);
        double auxiliary = km.p_standby * dt / (km.thermalEfficiency * km.thermalFuelJoulesPerLiter);
        accounting.tractionLiters += traction;
        accounting.auxiliaryLiters += auxiliary;
        accounting.idleTopupLiters += burned - traction - auxiliary;
        accounting.movingSeconds += dt;
        accounting.meters += dx;
        double roll = km.f_roll * dx, drag = air * 0.5 * (speed * speed + next * next) * dx;
        double grade = gradeForce * dx, kinetic = 0.5 * km.totalweight * (next * next - speed * speed);
        accounting.rollingJoules += roll; accounting.airJoules += drag;
        accounting.uphillJoules += Math.max(0., grade); accounting.downhillJoules += Math.min(0., grade);
        accounting.kineticJoules += kinetic;
        accounting.brakingJoules += wheelWork - roll - drag - grade - kinetic;
      }
      fuel += burned;
      duration += dt;
      speed = next;
      left -= dx;
    }
    ekin = 0.5 * km.totalweight * speed * speed;
    totalTime += duration;
    totalEnergy += fuel * km.thermalFuelJoulesPerLiter;
    metersSinceSignal += dist;
    return km.thermalScore(fuel, duration);
  }

  @Override
  protected double processTargetNode(RoutingContext rc) {
    KinematicModel km = (KinematicModel) rc.pm;
    sectionDistance = null;
    validWayElevation = false;
    vertexSpeed = null;
    sectionCurveIndices = null;
    sectionEndSpeed = Double.POSITIVE_INFINITY;

    // finally add node-costs for target node
    if (targetNode.nodeDescription != null) {
      rc.expctxNode.evaluate(false, targetNode.nodeDescription);
      float initialcost = rc.expctxNode.getInitialcost();
      if (initialcost >= 1000000.) {
        return -1.;
      }
      boolean duplicateSignal = km.thermalFuelModel && isDuplicateSignal(km, 0.);
      cutEkin(km.totalweight, km.thermalFuelModel ? thermalNodeSpeed(km, 0.) : km.getNodeMaxspeed());

      if (message != null) {
        message.linknodecost += (int) initialcost;
        message.nodeKeyValues = rc.expctxNode.getKeyValueDescription(false, targetNode.nodeDescription);

        message.vnode1 = (int) ((duplicateSignal ? 999. : km.getNodeMaxspeed()) * 3.6 + 0.5);
      }
      if (km.thermalFuelModel) {
        double wait = duplicateSignal ? 0. : km.getThermalWait();
        if (km.isThermalSignal()) {
          if (!duplicateSignal) metersSinceSignal = 0.;
          if (accounting != null) {
            if (duplicateSignal) accounting.duplicateSignalNodes++;
            else accounting.signalEvents++;
          }
        } else if (km.getNodeMaxspeed() == 0.) metersSinceSignal = Double.POSITIVE_INFINITY;
        double fuel = wait * km.thermalIdleLitersPerSecond;
        totalTime += wait;
        totalEnergy += fuel * km.thermalFuelJoulesPerLiter;
        if (accounting != null) { accounting.waitLiters += fuel; accounting.waitingSeconds += wait; accounting.nodeWaitSeconds += wait; }
        return initialcost + km.thermalScore(fuel, wait);
      }
      return initialcost;
    }
    return 0.;
  }

  private void cutEkin(double weight, double speed) {
    double e = 0.5 * weight * speed * speed;
    if (ekin > e) {
      if (accounting != null) accounting.clippedKineticJoules += ekin - e;
      ekin = e;
    }
  }

  private boolean isDuplicateSignal(KinematicModel km, double distanceAhead) {
    return km.thermalSignalMergeMeters > 0. && km.isThermalSignal()
        && metersSinceSignal + distanceAhead <= km.thermalSignalMergeMeters;
  }

  private double thermalNodeSpeed(KinematicModel km, double distanceAhead) {
    return isDuplicateSignal(km, distanceAhead) ? 999. : km.getNodeMaxspeed();
  }


  @Override
  public int elevationCorrection() {
    return 0;
  }

  @Override
  public boolean definitlyWorseThan(OsmPath path) {
    KinematicPath p = (KinematicPath) path;

    int c = p.cost;
    return cost > c + 100;
  }

  @Override
  public double getTotalTime() {
    return totalTime;
  }

  @Override
  public double getTotalEnergy() {
    return totalEnergy;
  }

  @Override
  public double getModeledAscent() {
    return thermalMetrics ? modeledAscent : Double.NaN;
  }

  @Override
  public ThermalAccounting getThermalAccounting() { return accounting == null ? null : accounting.copy(); }
}

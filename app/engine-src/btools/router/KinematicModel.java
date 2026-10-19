/**
 * Container for link between two Osm nodes
 *
 * @author ab
 */
package btools.router;

import java.util.Map;

import btools.expressions.BExpressionContextNode;
import btools.expressions.BExpressionContextWay;


final class KinematicModel extends OsmPathModel {
  public OsmPrePath createPrePath() {
    return new KinematicPrePath();
  }

  public OsmPath createPath() {
    return new KinematicPath();
  }

  public double turnAngleDecayTime;
  public double f_roll;
  public double f_air;
  public double f_recup;
  public double p_standby;
  public double outside_temp;
  public double recup_efficiency;
  public double totalweight;
  public double vmax;
  // Experimental thermal path. Stock behavior remains available when disabled.
  public boolean thermalFuelModel;
  public boolean thermalTimeOnly;
  public double thermalEfficiency;
  public double thermalFuelJoulesPerLiter;
  public double thermalIdleLitersPerSecond;
  public double thermalAcceleration;
  public double thermalWheelPower;
  public double thermalTimeWeight;
  public double thermalMinLitersPerMeter;
  public double thermalLateralAcceleration;
  public double thermalElevationWindow;
  public double thermalBraking;
  public boolean thermalAnticipation;
  public double thermalLocalPreference;
  public boolean thermalAccounting;
  public double thermalSignalMergeMeters;
  private int wayIdxThermalStructure;
  private int nodeIdxThermalSignal;
  public double leftWaySpeed;
  public double rightWaySpeed;

  // derived values
  public double pw; // balance power
  public double cost0; // minimum possible cost per meter

  private int wayIdxMaxspeed;
  private int wayIdxMaxspeedExplicit;
  private int wayIdxMinspeed;
  private int wayIdxCruiseSpeed;

  private int nodeIdxMaxspeed;
  private int wayIdxThermalPreference;
  private int nodeIdxThermalWait;

  protected BExpressionContextWay ctxWay;
  protected BExpressionContextNode ctxNode;
  protected Map<String, String> params;

  private boolean initDone = false;

  private double lastEffectiveLimit;
  private double lastBreakingSpeed;

  @Override
  public void init(BExpressionContextWay expctxWay, BExpressionContextNode expctxNode, Map<String, String> extraParams) {
    if (!initDone) {
      ctxWay = expctxWay;
      ctxNode = expctxNode;
      wayIdxMaxspeed = ctxWay.getOutputVariableIndex("maxspeed", false);
      wayIdxMaxspeedExplicit = ctxWay.getOutputVariableIndex("maxspeed_explicit", false);
      wayIdxMinspeed = ctxWay.getOutputVariableIndex("minspeed", false);
      nodeIdxMaxspeed = ctxNode.getOutputVariableIndex("maxspeed", false);
      // Cached expressions only preserve registered outputs, not scratch variables.
      wayIdxCruiseSpeed = ctxWay.getOutputVariableIndex("cruise_speedlimit", false);
      wayIdxThermalPreference = ctxWay.getOutputVariableIndex("thermal_preference_lpkm", false);
      nodeIdxThermalWait = ctxNode.getOutputVariableIndex("thermal_wait_seconds", false);
      wayIdxThermalStructure = ctxWay.getOutputVariableIndex("thermal_structure", false);
      nodeIdxThermalSignal = ctxNode.getOutputVariableIndex("thermal_signal", false);
      initDone = true;
    }

    params = extraParams;

    turnAngleDecayTime = getParam("turnAngleDecayTime", 5.f);
    f_roll = getParam("f_roll", 232.f);
    f_air = getParam("f_air", 0.4f);
    f_recup = getParam("f_recup", 400.f);
    p_standby = getParam("p_standby", 250.f);
    outside_temp = getParam("outside_temp", 20.f);
    recup_efficiency = getParam("recup_efficiency", 0.7f);
    totalweight = getParam("totalweight", 1640.f);
    vmax = getParam("vmax", 80.f) / 3.6;
    leftWaySpeed = getParam("leftWaySpeed", 12.f) / 3.6;
    rightWaySpeed = getParam("rightWaySpeed", 12.f) / 3.6;

    pw = 2. * f_air * vmax * vmax * vmax - p_standby;
    cost0 = (pw + p_standby) / vmax + f_roll + f_air * vmax * vmax;
    thermalFuelModel = getParam("thermal_fuel_model", 0.f) != 0.f;
    thermalTimeOnly = getParam("thermal_time_only", 0.f) != 0.f;
    if (thermalFuelModel) {
      thermalEfficiency = getParam("thermal_efficiency", 0.28f);
      thermalFuelJoulesPerLiter = getParam("thermal_fuel_mj_per_liter", 36.f) * 1000000.;
      thermalIdleLitersPerSecond = getParam("thermal_idle_lph", 0.7f) / 3600.;
      thermalAcceleration = getParam("thermal_acceleration", 0.45f);
      thermalLateralAcceleration = getParam("thermal_lateral_acceleration", 1.5f);
      thermalWheelPower = getParam("thermal_wheel_power_kw", 58.f) * 1000.;
      thermalTimeWeight = getParam("thermal_time_lph", 0.f) / 3600.;
      thermalElevationWindow = getParam("thermal_elevation_window_m", 40.f);
      thermalBraking = getParam("thermal_braking", 0.5f);
      thermalAnticipation = getParam("thermal_anticipation", 1.f) != 0.f;
      thermalLocalPreference = getParam("thermal_local_preference", 1.f);
      thermalAccounting = getParam("lab_thermal_accounting", 0.f) != 0.f;
      thermalSignalMergeMeters = getParam("lab_signal_merge_m", 0.f);
      if (!(thermalEfficiency > 0. && thermalEfficiency <= 1.) ||
          thermalIdleLitersPerSecond <= 0. || vmax <= 0. || thermalAcceleration <= 0. ||
          thermalWheelPower <= 0. || thermalTimeWeight < 0. || thermalBraking <= 0. ||
          thermalElevationWindow < 0. || thermalLocalPreference < 0. || thermalLateralAcceleration <= 0. || thermalSignalMergeMeters < 0.) {
        throw new IllegalArgumentException("invalid experimental thermal parameters");
      }
      // Positive idle/coasting floor and hard speed cap imply this lower bound.
      // It preserves the router's distance-based cutoff in normalized units.
      thermalMinLitersPerMeter = thermalIdleLitersPerSecond / vmax;
      cost0 = thermalTimeOnly ? 1. / vmax : thermalMinLitersPerMeter;
    }
  }

  protected float getParam(String name, float defaultValue) {
    String sval = params == null ? null : params.get(name);
    if (sval != null) {
      return Float.parseFloat(sval);
    }
    float v = ctxWay.getVariableValue(name, defaultValue);
    if (params != null) {
      params.put(name, "" + v);
    }
    return v;
  }

  public float getWayMaxspeed() {
    return ctxWay.getBuildInVariable(wayIdxMaxspeed) / 3.6f;
  }

  public float getWayMaxspeedExplicit() {
    return ctxWay.getBuildInVariable(wayIdxMaxspeedExplicit) / 3.6f;
  }

  public float getWayMinspeed() {
    return ctxWay.getBuildInVariable(wayIdxMinspeed) / 3.6f;
  }

  public float getNodeMaxspeed() {
    return ctxNode.getBuildInVariable(nodeIdxMaxspeed) / 3.6f;
  }

  public double thermalScore(double liters, double seconds) {
    return (thermalTimeOnly ? seconds : liters + seconds * thermalTimeWeight) / cost0;
  }

  public double getThermalPreference() {
    return ctxWay.getBuildInVariable(wayIdxThermalPreference);
  }

  public double getThermalWait() {
    return ctxNode.getBuildInVariable(nodeIdxThermalWait);
  }

  public boolean isThermalStructure() {
    return ctxWay.getBuildInVariable(wayIdxThermalStructure) > 0.f;
  }

  public boolean isThermalSignal() {
    return ctxNode.getBuildInVariable(nodeIdxThermalSignal) > 0.f;
  }

  /**
   * get the effective speed limit from the way-limit and vmax/vmin
   */
  public double getEffectiveSpeedLimit() {
    // performance related inline coding
    if (thermalFuelModel) {
      double cruise = ctxWay.getBuildInVariable(wayIdxCruiseSpeed);
      // Legacy profiles omit this output; zero is not an access prohibition.
      return Math.min(vmax, Math.min(getWayMaxspeed(), cruise > 0. ? cruise / 3.6 : 999.));
    }
    double minspeed = getWayMinspeed();
    double espeed = minspeed > vmax ? minspeed : vmax;
    double maxspeed = getWayMaxspeed();
    return maxspeed < espeed ? maxspeed : espeed;
  }

  /**
   * get the breaking speed for current balance-power (pw) and effective speed limit (vl)
   */
  public double getBreakingSpeed(double vl) {
    if (vl == lastEffectiveLimit) {
      return lastBreakingSpeed;
    }

    double v = vl * 0.8;
    double pw2 = pw + p_standby;
    double e = recup_efficiency;
    double x0 = pw2 / vl + f_air * e * vl * vl + (1. - e) * f_roll;
    for (int i = 0; i < 5; i++) {
      double v2 = v * v;
      double x = pw2 / v + f_air * e * v2 - x0;
      double dx = 2. * e * f_air * v - pw2 / v2;
      v -= x / dx;
    }
    lastEffectiveLimit = vl;
    lastBreakingSpeed = v;

    return v;
  }

}

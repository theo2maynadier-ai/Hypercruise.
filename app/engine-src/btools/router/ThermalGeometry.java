package btools.router;

import java.util.Arrays;

/** Deterministic spatial filtering, independent of the history of a candidate route. */
final class ThermalGeometry {
  private ThermalGeometry() { }

  /** Exact solution of d(filtered height)/ds = (raw - filtered)/window. */
  static double advanceElevationLag(double lag, double distance, double change, double window) {
    if (!(window > 0.) || !(distance > 0.)) return 0.;
    double alpha = -Math.expm1(-distance / window);
    return lag * (1. - alpha) + change * window / distance * alpha;
  }

  static double[] smooth(double[] distance, double[] height, double window) {
    double[] result = height.clone();
    if (window <= 0. || height.length < 3) return result;
    // Weighted samples of a piecewise-linear profile, rather than a vertex average:
    // uneven OSM point density must not change the smoothing radius in metres.
    // A symmetric window shrinks at each end, preserving constant slopes and
    // preventing extrapolated spikes. Junction heights remain fixed.
    for (int i = 1; i < height.length - 1; i++) {
      double sum = 0., weights = 0.;
      double localWindow = Math.min(window, Math.min(distance[i], distance[distance.length - 1] - distance[i]));
      for (int j = -4; j <= 4; j++) {
        double weight = 5. - Math.abs(j);
        sum += weight * interpolate(distance, height, distance[i] + j * localWindow / 4.);
        weights += weight;
      }
      result[i] = sum / weights;
    }
    return result;
  }

  private static double interpolate(double[] x, double[] y, double position) {
    int i = Arrays.binarySearch(x, position);
    if (i >= 0) return y[i];
    i = Math.max(0, Math.min(x.length - 2, -i - 2));
    return y[i] + (y[i + 1] - y[i]) * (position - x[i]) / (x[i + 1] - x[i]);
  }

  static void brakingEnvelope(double[] distance, double[] speed, double deceleration) {
    for (int i = speed.length - 2; i >= 0; i--) {
      speed[i] = Math.min(speed[i], Math.sqrt(speed[i + 1] * speed[i + 1]
          + 2. * deceleration * (distance[i + 1] - distance[i])));
    }
  }
}

const TRIM_TOLERANCE = 1e-6;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Input units: degrees.
 * Output units: radians.
 * Sign convention: positive angle of attack is nose-up.
 */
export function degreesToRadians(degrees) {
  if (!Number.isFinite(degrees)) {
    throw new TypeError("Angle in degrees must be a finite number.");
  }

  return degrees * DEG_TO_RAD;
}

/**
 * Input units: radians.
 * Output units: degrees.
 */
export function radiansToDegrees(radians) {
  if (!Number.isFinite(radians)) {
    throw new TypeError("Angle in radians must be a finite number.");
  }

  return radians * RAD_TO_DEG;
}

/**
 * Inputs:
 * - cm0: dimensionless
 * - cmAlphaPerRad: 1/rad
 * - angleOfAttackDeg: deg
 *
 * Output:
 * - Cm(alpha): dimensionless
 *
 * Assumption: the Cm-alpha relationship is linear over the investigated range.
 */
export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);

  return cm0 + cmAlphaPerRad * alphaRad;
}

/**
 * Inputs:
 * - cm0: dimensionless
 * - cmAlphaPerRad: 1/rad
 *
 * Output:
 * - trim angle: radians
 *
 * Special case: when cmAlphaPerRad is zero, no unique trim angle exists.
 */
export function calculateTrimAngleRad(cm0, cmAlphaPerRad) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

/**
 * Inputs:
 * - cm0: dimensionless
 * - cmAlphaPerRad: 1/rad
 *
 * Output:
 * - trim angle: degrees, or null when no unique trim angle exists.
 */
export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);

  if (trimAngleRad === null) {
    return null;
  }

  return radiansToDegrees(trimAngleRad);
}

/**
 * Inputs:
 * - cmAlphaPerRad: 1/rad
 * - disturbanceAlphaDeg: deg
 *
 * Output:
 * - delta_Cm: dimensionless
 *
 * Assumption: the disturbance is small and quasi-static.
 */
export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);

  return cmAlphaPerRad * deltaAlphaRad;
}

/**
 * Inputs:
 * - angleOfAttackDeg: deg
 * - disturbanceAlphaDeg: deg
 * - cmAlphaPerRad: 1/rad
 *
 * Output:
 * - "restoring", "destabilizing", or "neutral"
 *
 * Classification is based on:
 * delta_alpha_rad * delta_Cm
 */
export function classifyDisturbance(
  angleOfAttackDeg,
  disturbanceAlphaDeg,
  cmAlphaPerRad,
) {
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  void angleOfAttackDeg;

  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);
  const product = deltaAlphaRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

/**
 * Output:
 * - true when abs(Cm(alpha)) <= 1e-6
 */
export function isTrimmed(cmAtSelectedAngle) {
  assertFiniteNumber(cmAtSelectedAngle, "cmAtSelectedAngle");

  return Math.abs(cmAtSelectedAngle) <= TRIM_TOLERANCE;
}

/**
 * Convenience calculation for the complete specified model.
 */
export function evaluateTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg,
}) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const cm = calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg);
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);
  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg,
  );
  const trimmed = isTrimmed(cm);
  const disturbanceTendency =
    deltaAlphaRad * deltaCm < 0
      ? "restoring"
      : deltaAlphaRad * deltaCm > 0
        ? "destabilizing"
        : "neutral";

  return {
    alphaRad,
    deltaAlphaRad,
    cm,
    trimAngleRad,
    trimAngleDeg:
      trimAngleRad === null
        ? null
        : radiansToDegrees(trimAngleRad),
    deltaCm,
    trimmed,
    disturbanceTendency,
  };
}

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
}
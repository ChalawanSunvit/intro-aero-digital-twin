import { describe, expect, test } from "vitest";

import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  classifyDisturbance,
  degreesToRadians,
  evaluateTrimResponse,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  test("numerical verification case", () => {
    const result = evaluateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(degreesToRadians(2.86)).toBeCloseTo(
      0.0499164,
      7,
    );

    expect(degreesToRadians(2.0)).toBeCloseTo(
      0.0349066,
      7,
    );

    expect(result.cm).toBeCloseTo(0.0000669, 7);
    expect(result.trimAngleDeg).toBeCloseTo(2.8647890, 6);
    expect(result.deltaCm).toBeCloseTo(-0.0279253, 7);
    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe("restoring");
  });

  test("behavioral verification case with positive Cm-alpha slope", () => {
    const result = evaluateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.deltaCm).toBeGreaterThan(0);
    expect(result.disturbanceTendency).toBe("destabilizing");
  });

  test("boundary case with zero slope has no unique trim angle", () => {
    const result = evaluateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.trimAngleDeg).toBeNull();
    expect(result.deltaCm).toBe(0);
    expect(result.disturbanceTendency).toBe("neutral");
  });

  test("trim tolerance uses the specified 1e-6 threshold", () => {
    expect(isTrimmed(1e-6)).toBe(true);
    expect(isTrimmed(-1e-6)).toBe(true);
    expect(isTrimmed(1.000001e-6)).toBe(false);
    expect(isTrimmed(-1.000001e-6)).toBe(false);
  });

  test("doubling disturbance angle doubles delta Cm", () => {
    const single = calculateDeltaCm(-0.8, 2.0);
    const double = calculateDeltaCm(-0.8, 4.0);

    expect(double).toBeCloseTo(2 * single, 12);
  });

  test("zero slope produces zero disturbance moment change", () => {
    expect(calculateDeltaCm(0, 2.0)).toBe(0);
    expect(classifyDisturbance(2.86, 2.0, 0)).toBe(
      "neutral",
    );
  });

  test("trim angle reports no unique result at zero slope", () => {
    expect(calculateTrimAngleDeg(0.04, 0)).toBeNull();
  });

  test("selected Cm follows the specified linear model", () => {
    const cm = calculateCm(0.04, -0.8, 2.86);

    expect(cm).toBeCloseTo(0.0000669, 7);
  });

  test("non-finite numeric inputs are rejected", () => {
    expect(() =>
      calculateCm(Number.NaN, -0.8, 2.86),
    ).toThrow();

    expect(() =>
      calculateCm(0.04, Infinity, 2.86),
    ).toThrow();

    expect(() =>
      calculateDeltaCm(-0.8, Number.NaN),
    ).toThrow();

    expect(() =>
      calculateTrimAngleDeg(0.04, Number.POSITIVE_INFINITY),
    ).toThrow();
  });
});
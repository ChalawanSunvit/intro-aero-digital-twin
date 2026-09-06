import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  evaluateTrimResponse,
} from "../physics/trim-response.js";

const NUMERICAL_CASE = {
  cm0: 0.04,
  cmAlphaPerRad: -0.8,
  angleOfAttackDeg: 2.86,
  disturbanceAlphaDeg: 2.0,
  expected: {
    cm: 0.0000669,
    trimAngleDeg: 2.864789,
    deltaCm: -0.0279253,
    trimmed: false,
    tendency: "restoring",
  },
};

const BEHAVIORAL_CASE = {
  base: {
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  },
  changedCmAlphaPerRad: 0.8,
};

const BOUNDARY_CASE = {
  cm0: 0.04,
  cmAlphaPerRad: 0,
  angleOfAttackDeg: 2.86,
  disturbanceAlphaDeg: 2.0,
};

function nearlyEqual(actual, expected, tolerance = 1e-9) {
  return Math.abs(actual - expected) <= tolerance;
}

function hasRequiredCapability(capabilityContext) {
  if (!capabilityContext) {
    return false;
  }

  const capabilities =
    capabilityContext.capabilities ?? capabilityContext;

  if (!capabilities) {
    return false;
  }

  if (Array.isArray(capabilities)) {
    return capabilities.some(
      (capability) =>
        capability?.id === "loads.pitch.component-sum" &&
        Number(capability.version) >= 1,
    );
  }

  if (typeof capabilities === "object") {
    const capability = capabilities["loads.pitch.component-sum"];

    if (capability === true) {
      return true;
    }

    if (typeof capability === "number") {
      return capability >= 1;
    }

    if (capability && typeof capability === "object") {
      return Number(capability.version) >= 1;
    }
  }

  return false;
}

function buildResults(analysis) {
  return [
    {
      id: "cm-at-selected-angle",
      label: "Pitching-moment coefficient at selected angle",
      value: analysis.cm,
      unit: "",
      precision: 7,
      emphasis: true,
    },
    {
      id: "trim-angle",
      label: "Trim angle",
      value:
        analysis.trimAngleDeg === null
          ? "not available"
          : analysis.trimAngleDeg,
      unit: analysis.trimAngleDeg === null ? "" : "deg",
      precision: 7,
      emphasis: false,
    },
    {
      id: "delta-cm",
      label: "Disturbance moment-coefficient change",
      value: analysis.deltaCm,
      unit: "",
      precision: 7,
      emphasis: false,
    },
    {
      id: "trim-status",
      label: "Selected condition trimmed",
      value: analysis.trimmed ? "trimmed" : "not trimmed",
      unit: "",
      precision: 0,
      emphasis: false,
    },
    {
      id: "disturbance-tendency",
      label: "Disturbance tendency",
      value: analysis.disturbanceTendency,
      unit: "",
      precision: 0,
      emphasis: false,
    },
  ];
}

function buildVerificationCases() {
  const numerical = evaluateTrimResponse(NUMERICAL_CASE);

  const behavioralAircraft = {
    ...BEHAVIORAL_CASE.base,
    cmAlphaPerRad: BEHAVIORAL_CASE.changedCmAlphaPerRad,
  };

  const behavioral = evaluateTrimResponse(behavioralAircraft);

  const boundary = evaluateTrimResponse(BOUNDARY_CASE);

  return [
    {
      id: "numerical",
      label: "Numerical reference case",
      inputs: NUMERICAL_CASE,
      expected: {
        cm: NUMERICAL_CASE.expected.cm,
        trimAngleDeg: NUMERICAL_CASE.expected.trimAngleDeg,
        deltaCm: NUMERICAL_CASE.expected.deltaCm,
        trimmed: NUMERICAL_CASE.expected.trimmed,
        tendency: NUMERICAL_CASE.expected.tendency,
      },
      passed:
        nearlyEqual(numerical.cm, NUMERICAL_CASE.expected.cm, 1e-7) &&
        nearlyEqual(
          numerical.trimAngleDeg,
          NUMERICAL_CASE.expected.trimAngleDeg,
          1e-6,
        ) &&
        nearlyEqual(
          numerical.deltaCm,
          NUMERICAL_CASE.expected.deltaCm,
          1e-7,
        ) &&
        numerical.trimmed === NUMERICAL_CASE.expected.trimmed &&
        numerical.disturbanceTendency ===
          NUMERICAL_CASE.expected.tendency,
    },
    {
      id: "behavioral",
      label: "Positive pitching-moment slope",
      inputs: behavioralAircraft,
      expected: {
        cmAlphaPerRad: BEHAVIORAL_CASE.changedCmAlphaPerRad,
        tendency: "destabilizing",
      },
      passed:
        behavioral.disturbanceTendency === "destabilizing" &&
        behavioral.deltaCm > 0,
    },
    {
      id: "boundary",
      label: "Zero pitching-moment slope",
      inputs: BOUNDARY_CASE,
      expected: {
        trimAngleDeg: "not available",
        deltaCm: 0,
        tendency: "neutral",
      },
      passed:
        boundary.trimAngleDeg === null &&
        boundary.deltaCm === 0 &&
        boundary.disturbanceTendency === "neutral",
    },
  ];
}

function buildPlot(aircraft) {
  const points = [];

  const startDeg = -10;
  const endDeg = 10;
  const selected = aircraft.angleOfAttackDeg;
  const sampleCount = 81;
  const step = (endDeg - startDeg) / (sampleCount - 1);

  for (let index = 0; index < sampleCount; index += 1) {
    const angleDeg = startDeg + index * step;
    points.push({
      x: angleDeg,
      y: calculateCm(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        angleDeg,
      ),
    });
  }

  if (selected >= startDeg && selected <= endDeg) {
    const alreadyIncluded = points.some(
      (point) => point.x === selected,
    );

    if (!alreadyIncluded) {
      points.push({
        x: selected,
        y: calculateCm(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          selected,
        ),
      });

      points.sort((a, b) => a.x - b.x);
    }
  }

  return [
    {
      id: "cm-alpha",
      title: "Cm–alpha relationship",
      xAxis: {
        label: "Angle of attack",
        unit: "deg",
        min: -10,
        max: 10,
      },
      yAxis: {
        label: "Pitching-moment coefficient",
        unit: "",
      },
      series: [
        {
          id: "cm-alpha-series",
          label: "Cm(alpha)",
          points,
        },
      ],
      regions: [],
      referenceLines: [
        {
          id: "trim-line",
          label: "Cm = 0",
          value: 0,
          axis: "y",
        },
      ],
    },
  ];
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluate the linear Cm–alpha model for trim and small-disturbance tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],
  requiresCapabilities: [
    {
      id: "loads.pitch.component-sum",
      version: 1,
    },
  ],
  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1,
    },
  ],
  assumptions: [
    "The Cm-alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "The model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    const capabilityAvailable =
      hasRequiredCapability(capabilityContext);

    if (!capabilityAvailable) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The required longitudinal moment-contribution capability is unavailable, so this feature remains locked.",
          status: "caution",
        },
        plots: [],
        scene: null,
      };
    }

    const analysis = evaluateTrimResponse({
      cm0: aircraft.cm0,
      cmAlphaPerRad: aircraft.cmAlphaPerRad,
      angleOfAttackDeg: aircraft.angleOfAttackDeg,
      disturbanceAlphaDeg: aircraft.disturbanceAlphaDeg,
    });

    const tendencyText =
      analysis.disturbanceTendency === "restoring"
        ? "The specified linear model predicts a restoring disturbance tendency."
        : analysis.disturbanceTendency === "destabilizing"
          ? "The specified linear model predicts a destabilizing disturbance tendency."
          : "The specified linear model predicts a neutral disturbance tendency.";

    const trimText = analysis.trimmed
      ? "The selected condition satisfies the specified trim tolerance."
      : "The selected condition does not satisfy the specified trim tolerance.";

    return {
      results: buildResults(analysis),
      verificationCases: buildVerificationCases(),
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation: `${trimText} ${tendencyText} This is a quasi-static linear-model interpretation only and does not establish dynamic stability, safety, controllability, or flightworthiness.`,
        status:
          analysis.disturbanceTendency === "neutral"
            ? "neutral"
            : "pass",
      },
      plots: buildPlot(aircraft),
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",
  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft;

    if (!aircraft) {
      return {
        values: {},
      };
    }

    const analysis = evaluateTrimResponse({
      cm0: aircraft.cm0,
      cmAlphaPerRad: aircraft.cmAlphaPerRad,
      angleOfAttackDeg: aircraft.angleOfAttackDeg,
      disturbanceAlphaDeg: aircraft.disturbanceAlphaDeg,
    });

    return {
      values: {
        cm: analysis.cm,
        trimAngleDeg: analysis.trimAngleDeg,
        deltaCm: analysis.deltaCm,
        trimmed: analysis.trimmed,
        disturbanceTendency: analysis.disturbanceTendency,
      },
    };
  },
};
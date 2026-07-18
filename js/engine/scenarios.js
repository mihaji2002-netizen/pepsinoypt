import { RATIOS } from "../data/subjects.js";
import { buildDailyPlan } from "./planner.js";
import { computePolicy, computeModeSplit } from "./rules.js";

/**
 * Exhaustive scenario matrix for grades × fields × exam status × levels × ratios.
 */

export const GRADES = [11, 12];
export const FIELDS = ["exp", "math"];
export const EXAM_STATUSES = ["normal", "postponed", "uncertain"];
export const LEVELS = ["weak", "mid", "strong"];

export function defaultProfile(overrides = {}) {
  return {
    grade: 12,
    field: "exp",
    examStatus: "normal",
    level: "mid",
    ratioId: "60-40",
    studyHours: 8,
    startTime: "08:00",
    breakShortMin: 10,
    breakLongMin: 40,
    ...overrides,
  };
}

export function allScenarioProfiles() {
  const profiles = [];
  for (const grade of GRADES) {
    for (const field of FIELDS) {
      for (const examStatus of EXAM_STATUSES) {
        for (const level of LEVELS) {
          for (const ratio of RATIOS) {
            profiles.push(
              defaultProfile({
                grade,
                field,
                examStatus,
                level,
                ratioId: ratio.id,
              })
            );
          }
        }
      }
    }
  }
  return profiles;
}

export function runScenario(profile, dayIndex = 0) {
  const policy = computePolicy(profile);
  const split = computeModeSplit(profile);
  const plan = buildDailyPlan(profile, { dayIndex, dateKey: `test-${dayIndex}` });
  return { profile, policy, split, plan };
}

export function assertPlanInvariants(plan, profile) {
  const errors = [];
  if (!plan.blocks?.length) errors.push("empty blocks");

  const ids = plan.blocks.map((b) => b.instanceId);
  if (new Set(ids).size !== ids.length) errors.push("duplicate instanceId");

  const hasBreak = plan.blocks.some((b) => b.type === "break");
  if (profile.studyHours >= 4 && !hasBreak) errors.push("missing breaks for long day");

  // Required specialty blocks appear under expected conditions
  const titles = plan.blocks.map((b) => b.id);
  if (profile.grade === 11 && !titles.includes("pre-read-12")) {
    errors.push("11th grade missing pre-read-12");
  }
  if ((profile.level === "weak" || profile.examStatus === "postponed") && !titles.includes("catchup-10")) {
    errors.push("missing catchup-10");
  }
  if (profile.field === "exp" && !titles.includes("bio-giyahi-summary")) {
    errors.push("exp missing bio-giyahi-summary");
  }
  if (!titles.includes("chem-hafziat")) {
    errors.push("missing chem-hafziat");
  }

  for (const b of plan.blocks) {
    if (!b.startLabel || !b.endLabel) errors.push(`untimed block ${b.id}`);
    if (!(b.durationMin > 0)) errors.push(`bad duration ${b.id}`);
  }

  return errors;
}

export function runAllScenarioTests() {
  const profiles = allScenarioProfiles();
  const results = [];
  let passed = 0;
  let failed = 0;

  profiles.forEach((profile, i) => {
    try {
      const { plan, policy } = runScenario(profile, i % 14);
      const errors = assertPlanInvariants(plan, profile);
      if (errors.length) {
        failed += 1;
        results.push({
          ok: false,
          key: scenarioKey(profile),
          errors,
          rulesFired: policy.rulesFired,
        });
      } else {
        passed += 1;
        results.push({ ok: true, key: scenarioKey(profile), rulesFired: policy.rulesFired });
      }
    } catch (err) {
      failed += 1;
      results.push({ ok: false, key: scenarioKey(profile), errors: [String(err)] });
    }
  });

  return {
    total: profiles.length,
    passed,
    failed,
    results,
  };
}

export function scenarioKey(p) {
  return `g${p.grade}-${p.field}-${p.examStatus}-${p.level}-${p.ratioId}`;
}

/** Representative showcase scenarios for UI demos / docs */
export const SHOWCASE = [
  defaultProfile({
    grade: 11,
    field: "exp",
    examStatus: "postponed",
    level: "weak",
    ratioId: "80-20",
  }),
  defaultProfile({
    grade: 11,
    field: "math",
    examStatus: "uncertain",
    level: "mid",
    ratioId: "60-40",
  }),
  defaultProfile({
    grade: 12,
    field: "exp",
    examStatus: "normal",
    level: "strong",
    ratioId: "40-60",
  }),
  defaultProfile({
    grade: 12,
    field: "math",
    examStatus: "postponed",
    level: "mid",
    ratioId: "70-30",
  }),
];

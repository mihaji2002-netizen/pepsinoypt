import { buildDailyPlan } from "./planner.js";
import { computePolicy } from "./rules.js";
import { TRACKS } from "../data/subjects.js";

/**
 * Scenario matrix for fluid coaching paths.
 */

export const GRADES = [11, 12];
export const FIELDS = ["exp", "math"];
export const EXAM_NEWS_LIST = ["cancelled", "noNews"];
export const STRENGTHS = ["weak", "ok"];
export const NEXT_HELD_WEAK = [true, false];

export function defaultProfile(overrides = {}) {
  const grade = overrides.grade ?? 12;
  const field = overrides.field ?? "exp";
  const track = TRACKS[`${grade}-${field}`];
  const first = track.subjects[0];
  const second = track.subjects[1] || first;
  return {
    grade,
    field,
    nextExamId: first.id,
    examNews: "cancelled",
    subjectStrength: "weak",
    nextHeldWeak: false,
    nextHeldId: second.id,
    selectedSuggestions: null,
    breakShortMin: 10,
    breakLongMin: 40,
    ...overrides,
  };
}

export function allScenarioProfiles() {
  const profiles = [];
  for (const grade of GRADES) {
    for (const field of FIELDS) {
      for (const examNews of EXAM_NEWS_LIST) {
        if (examNews === "noNews") {
          profiles.push(defaultProfile({ grade, field, examNews }));
          continue;
        }
        for (const subjectStrength of STRENGTHS) {
          if (subjectStrength === "ok") {
            profiles.push(defaultProfile({ grade, field, examNews, subjectStrength }));
          } else {
            for (const nextHeldWeak of NEXT_HELD_WEAK) {
              profiles.push(
                defaultProfile({ grade, field, examNews, subjectStrength, nextHeldWeak })
              );
            }
          }
        }
      }
    }
  }
  return profiles;
}

export function runScenario(profile, dayIndex = 0) {
  const policy = computePolicy(profile);
  const plan = buildDailyPlan(profile, { dayIndex, dateKey: `test-${dayIndex}` });
  return { profile, policy, plan };
}

export function assertPlanInvariants(plan, profile) {
  const errors = [];
  if (!plan.blocks?.length) errors.push("empty blocks");

  const ids = plan.blocks.map((b) => b.instanceId);
  if (new Set(ids).size !== ids.length) errors.push("duplicate instanceId");

  for (const b of plan.blocks) {
    if (!(b.durationMin > 0)) errors.push(`bad duration ${b.id}`);
    if (!b.periodId) errors.push(`missing period on ${b.id}`);
  }

  const titles = plan.blocks.map((b) => b.id);
  const periodStarts = plan.blocks.filter((b) => b.isPeriodStart);
  if (!periodStarts.length) errors.push("missing period starts");

  if (profile.examNews === "cancelled" && profile.subjectStrength === "ok") {
    if (!titles.includes("maz-full") && !titles.includes("gozine2")) {
      errors.push("ok-path missing mock exam");
    }
    if (!titles.includes("chem-hafziat")) errors.push("ok-path missing chem-hafziat");
  }

  if (profile.examNews === "cancelled" && profile.subjectStrength === "weak") {
    const hasPostponedReview = plan.blocks.some(
      (b) => b.subjectId === profile.nextExamId && b.type !== "break"
    );
    if (!hasPostponedReview) errors.push("weak-path missing postponed subject work");
  }

  if (profile.examNews === "noNews") {
    if (!plan.blocks.some((b) => b.mode === "mixed" || b.id === "light-mixed")) {
      // light-mixed may be present; also accept kheili-sabz flexibility
      if (!titles.includes("kheili-sabz") && !titles.includes("light-mixed")) {
        errors.push("noNews missing flexible blocks");
      }
    }
  }

  if (profile.field === "exp" && profile.examNews === "cancelled" && profile.subjectStrength === "ok") {
    if (!titles.includes("bio-giyahi-summary")) errors.push("exp ok-path missing giyahi");
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
  const held = p.subjectStrength === "weak" ? `-held${p.nextHeldWeak ? "W" : "S"}` : "";
  return `g${p.grade}-${p.field}-${p.examNews}-${p.subjectStrength || "na"}${held}`;
}

/** Representative showcase scenarios for UI demos / docs */
export const SHOWCASE = [
  defaultProfile({
    grade: 12,
    field: "exp",
    examNews: "cancelled",
    subjectStrength: "weak",
    nextHeldWeak: true,
  }),
  defaultProfile({
    grade: 12,
    field: "exp",
    examNews: "cancelled",
    subjectStrength: "weak",
    nextHeldWeak: false,
  }),
  defaultProfile({
    grade: 12,
    field: "math",
    examNews: "cancelled",
    subjectStrength: "ok",
  }),
  defaultProfile({
    grade: 11,
    field: "exp",
    examNews: "noNews",
  }),
];

import { buildDailyPlan } from "./planner.js";
import { computePolicy } from "./rules.js";
import { getTrackForProfile } from "../data/subjects.js";

/**
 * Scenario matrix for fluid coaching paths.
 */

export const GRADES = [11, 12];
export const FIELDS_11 = ["exp", "math"];
export const EXAM_NEWS_LIST = ["cancelled", "noNews"];
export const STRENGTHS = ["weak", "ok"];
export const AFTERNOON = ["review", "booklet-bio-math", "booklet-phys-chem"];
export const EVENING = ["review", "rest", "next-uncertain"];

export function defaultProfile(overrides = {}) {
  const grade = overrides.grade ?? 12;
  const field = grade === 12 ? "all" : overrides.field ?? "exp";
  const track = getTrackForProfile({ grade, field });
  const first = track.subjects[0];
  const second = track.subjects[1] || first;
  return {
    grade,
    field,
    nextExamId: first.id,
    examNews: "cancelled",
    subjectStrength: "weak",
    afternoonChoice: "review",
    eveningChoice: "review",
    nextHeldId: second.id,
    selectedSuggestions: null,
    breakShortMin: 10,
    breakLongMin: 40,
    ...overrides,
    field: grade === 12 ? "all" : overrides.field ?? field,
  };
}

export function allScenarioProfiles() {
  const profiles = [];
  for (const grade of GRADES) {
    const fields = grade === 12 ? ["all"] : FIELDS_11;
    for (const field of fields) {
      for (const examNews of EXAM_NEWS_LIST) {
        if (examNews === "noNews") {
          profiles.push(defaultProfile({ grade, field, examNews }));
          continue;
        }
        for (const subjectStrength of STRENGTHS) {
          if (subjectStrength === "ok") {
            profiles.push(defaultProfile({ grade, field, examNews, subjectStrength }));
          } else {
            for (const afternoonChoice of AFTERNOON) {
              for (const eveningChoice of EVENING) {
                profiles.push(
                  defaultProfile({
                    grade,
                    field,
                    examNews,
                    subjectStrength,
                    afternoonChoice,
                    eveningChoice,
                  })
                );
              }
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

  if (!titles.includes("chem-hafziat")) errors.push("missing night chem-hafziat");
  if (!titles.includes("bio-giyahi-summary")) errors.push("missing night giyahi");

  if (profile.examNews === "cancelled" && profile.subjectStrength === "ok") {
    if (!titles.includes("maz-full")) errors.push("ok-path missing mock exam");
  }

  if (profile.examNews === "cancelled" && profile.subjectStrength === "weak") {
    const hasPostponedReview = plan.blocks.some(
      (b) => b.subjectId === profile.nextExamId && b.type !== "break"
    );
    if (profile.afternoonChoice === "review" || profile.eveningChoice === "review" || true) {
      // morning always reviews postponed subject
      if (!hasPostponedReview) errors.push("weak-path missing postponed subject work");
    }
    if (profile.afternoonChoice === "booklet-bio-math" && !titles.includes("booklet-bio-math")) {
      errors.push("missing booklet-bio-math");
    }
    if (profile.afternoonChoice === "booklet-phys-chem" && !titles.includes("booklet-phys-chem")) {
      errors.push("missing booklet-phys-chem");
    }
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
  if (p.examNews !== "cancelled" || p.subjectStrength !== "weak") {
    return `g${p.grade}-${p.field}-${p.examNews}-${p.subjectStrength || "na"}`;
  }
  return `g${p.grade}-${p.field}-${p.examNews}-weak-${p.afternoonChoice}-${p.eveningChoice}`;
}

export const SHOWCASE = [
  defaultProfile({
    grade: 12,
    examNews: "cancelled",
    subjectStrength: "weak",
    afternoonChoice: "booklet-bio-math",
    eveningChoice: "next-uncertain",
  }),
  defaultProfile({
    grade: 12,
    examNews: "cancelled",
    subjectStrength: "weak",
    afternoonChoice: "review",
    eveningChoice: "rest",
  }),
  defaultProfile({
    grade: 12,
    examNews: "cancelled",
    subjectStrength: "ok",
  }),
  defaultProfile({
    grade: 11,
    field: "exp",
    examNews: "noNews",
  }),
];

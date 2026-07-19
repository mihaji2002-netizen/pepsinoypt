import { buildDailyPlan } from "./planner.js";
import { computePolicy } from "./rules.js";
import { getTrackForProfile } from "../data/subjects.js";
import { getAfternoonChoices, getEveningChoices } from "../data/flow.js";

/**
 * Scenario matrix for all grade-12 coaching paths (+ grade 11).
 */

export const GRADES = [11, 12];
export const FIELDS_11 = ["exp", "math"];
export const EXAM_NEWS_LIST = ["cancelled", "noNews"];
export const STRENGTHS = ["weak", "ok"];

export function defaultProfile(overrides = {}) {
  const grade = overrides.grade ?? 12;
  const field = grade === 12 ? "all" : overrides.field ?? "exp";
  const track = getTrackForProfile({ grade, field });
  const first = track.subjects[0];
  const second = track.subjects[1] || first;
  const base = {
    grade,
    field,
    nextExamId: first.id,
    nextExamName: first.name,
    examNews: "cancelled",
    subjectStrength: "weak",
    afternoonChoice: "review",
    eveningChoice: "review",
    nextHeldId: second.id,
    nextHeldName: second.name,
    selectedSuggestions: null,
    breakShortMin: 10,
    breakLongMin: 40,
    ...overrides,
    field: grade === 12 ? "all" : overrides.field ?? field,
  };
  // clamp choices to valid options for path
  const afternoonOpts = getAfternoonChoices(base).map((c) => c.id);
  const eveningOpts = getEveningChoices(base).map((c) => c.id);
  if (!afternoonOpts.includes(base.afternoonChoice)) base.afternoonChoice = afternoonOpts[0];
  if (!eveningOpts.includes(base.eveningChoice)) base.eveningChoice = eveningOpts[0];
  return base;
}

export function allScenarioProfiles() {
  const profiles = [];
  for (const grade of GRADES) {
    const fields = grade === 12 ? ["all"] : FIELDS_11;
    for (const field of fields) {
      for (const examNews of EXAM_NEWS_LIST) {
        for (const subjectStrength of STRENGTHS) {
          const probe = defaultProfile({ grade, field, examNews, subjectStrength });
          const afternoons = getAfternoonChoices(probe).map((c) => c.id);
          const evenings = getEveningChoices(probe).map((c) => c.id);
          for (const afternoonChoice of afternoons) {
            for (const eveningChoice of evenings) {
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
  if (!plan.blocks.some((b) => b.isPeriodStart)) errors.push("missing period starts");
  if (!titles.includes("chem-hafziat")) errors.push("missing night chem-hafziat");
  if (!titles.includes("bio-giyahi-summary")) errors.push("missing night giyahi");

  if (profile.subjectStrength === "ok") {
    if (!titles.includes("maz-full")) errors.push("strong-path missing morning mock");
  }

  if (profile.subjectStrength === "weak") {
    const hasSubject = plan.blocks.some(
      (b) => b.subjectId === profile.nextExamId && b.type !== "break"
    );
    if (!hasSubject) errors.push("weak-path missing subject study");
  }

  if (profile.afternoonChoice === "booklet-bio-math" && !titles.includes("booklet-bio-math")) {
    errors.push("missing afternoon booklet-bio-math");
  }
  if (profile.afternoonChoice === "booklet-phys-chem" && !titles.includes("booklet-phys-chem")) {
    errors.push("missing afternoon booklet-phys-chem");
  }
  if (profile.afternoonChoice === "continue-analysis" && !titles.includes("exam-analysis")) {
    errors.push("missing continue-analysis");
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

  return { total: profiles.length, passed, failed, results };
}

export function scenarioKey(p) {
  return `g${p.grade}-${p.field}-${p.examNews}-${p.subjectStrength}-${p.afternoonChoice}-${p.eveningChoice}`;
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
    subjectStrength: "ok",
    afternoonChoice: "continue-analysis",
    eveningChoice: "booklet-phys-chem",
  }),
  defaultProfile({
    grade: 12,
    examNews: "noNews",
    subjectStrength: "weak",
    afternoonChoice: "review",
    eveningChoice: "rest",
  }),
  defaultProfile({
    grade: 12,
    examNews: "noNews",
    subjectStrength: "ok",
    afternoonChoice: "study-exam",
    eveningChoice: "review",
  }),
];

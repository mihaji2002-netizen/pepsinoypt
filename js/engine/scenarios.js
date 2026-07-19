import { buildDailyPlan, previewSuggestions } from "./planner.js";
import { computePolicy } from "./rules.js";
import { getTrackForProfile } from "../data/subjects.js";
import { defaultSelectedIds, pickSelectedSuggestions } from "../data/flow.js";

/**
 * Scenario matrix — all path combinations with multi-alternative suggestions.
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
    field: grade === 12 ? "all" : field,
    nextExamId: first.id,
    nextExamName: first.name,
    examNews: "cancelled",
    subjectStrength: "weak",
    nextHeldId: second.id,
    nextHeldName: second.name,
    selectedSuggestions: null,
    breakShortMin: 10,
    breakLongMin: 40,
    ...overrides,
    field: grade === 12 ? "all" : overrides.field ?? field,
  };
  const all = previewSuggestions(base);
  if (!base.selectedSuggestions) {
    base.selectedSuggestions = defaultSelectedIds(all);
  }
  return base;
}

export function allScenarioProfiles() {
  const profiles = [];
  for (const grade of GRADES) {
    const fields = grade === 12 ? ["all"] : FIELDS_11;
    for (const field of fields) {
      for (const examNews of EXAM_NEWS_LIST) {
        for (const subjectStrength of STRENGTHS) {
          const base = defaultProfile({ grade, field, examNews, subjectStrength });
          const all = previewSuggestions(base);
          const afternoonAlts = all.filter((s) => s.period === "afternoon");
          const eveningAlts = all.filter((s) => s.period === "evening");
          // one profile per afternoon×evening combination
          for (const af of afternoonAlts) {
            for (const ev of eveningAlts) {
              const fixed = all.filter((s) => !s.exclusiveGroup).map((s) => s.id);
              profiles.push(
                defaultProfile({
                  grade,
                  field,
                  examNews,
                  subjectStrength,
                  selectedSuggestions: [...fixed, af.id, ev.id],
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

  const all = previewSuggestions(profile);
  const afternoonAlts = all.filter((s) => s.period === "afternoon");
  const eveningAlts = all.filter((s) => s.period === "evening");

  // multi-suggestion paths must expose more than one OR option
  if (profile.examNews === "cancelled" && profile.subjectStrength === "weak") {
    if (afternoonAlts.length < 3) errors.push("weak-postponed afternoon should have 3 alts");
    if (eveningAlts.length < 3) errors.push("weak-postponed evening should have 3 alts");
  }
  if (profile.examNews === "cancelled" && profile.subjectStrength === "ok") {
    if (afternoonAlts.length < 4) errors.push("ok-postponed afternoon should have 4 alts");
    if (eveningAlts.length < 4) errors.push("ok-postponed evening should have 4 alts");
  }
  if (profile.examNews === "noNews" && profile.subjectStrength === "weak") {
    if (afternoonAlts.length < 3) errors.push("weak-nonews afternoon should have 3 alts");
    if (eveningAlts.length < 2) errors.push("weak-nonews evening should have 2 alts");
  }
  if (profile.examNews === "noNews" && profile.subjectStrength === "ok") {
    if (afternoonAlts.length < 2) errors.push("ok-nonews afternoon should have 2 alts");
    if (eveningAlts.length < 2) errors.push("ok-nonews evening should have 2 alts");
  }

  // plan should only include ONE afternoon and ONE evening suggestion
  const picked = pickSelectedSuggestions(all, profile.selectedSuggestions);
  const afPicked = picked.filter((s) => s.period === "afternoon");
  const evPicked = picked.filter((s) => s.period === "evening");
  if (afPicked.length !== 1) errors.push(`expected 1 afternoon pick, got ${afPicked.length}`);
  if (evPicked.length !== 1) errors.push(`expected 1 evening pick, got ${evPicked.length}`);

  if (profile.subjectStrength === "ok" && !titles.includes("maz-full")) {
    // only if morning mock was selected (default)
    if (picked.some((s) => s.id === "morning-mock-analysis") && !titles.includes("maz-full")) {
      errors.push("strong-path missing morning mock");
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

  return { total: profiles.length, passed, failed, results };
}

export function scenarioKey(p) {
  const picked = (p.selectedSuggestions || []).filter(
    (id) => id.startsWith("afternoon") || id.startsWith("evening")
  );
  return `g${p.grade}-${p.field}-${p.examNews}-${p.subjectStrength}-${picked.join("+") || "default"}`;
}

export const SHOWCASE = [
  defaultProfile({
    grade: 12,
    examNews: "cancelled",
    subjectStrength: "weak",
    selectedSuggestions: [
      "morning-study-postponed",
      "afternoon-booklet-bio-math",
      "evening-next-uncertain",
      "night-chem-giyahi",
    ],
  }),
  defaultProfile({
    grade: 12,
    examNews: "cancelled",
    subjectStrength: "ok",
    selectedSuggestions: [
      "morning-mock-analysis",
      "afternoon-continue-analysis",
      "evening-booklet-phys-chem",
      "night-chem-giyahi",
    ],
  }),
  defaultProfile({
    grade: 12,
    examNews: "noNews",
    subjectStrength: "weak",
  }),
  defaultProfile({
    grade: 12,
    examNews: "noNews",
    subjectStrength: "ok",
    selectedSuggestions: [
      "morning-mock-analysis",
      "afternoon-study-exam",
      "evening-review",
      "night-chem-giyahi",
    ],
  }),
];

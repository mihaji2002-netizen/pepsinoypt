import { buildDailyPlan, previewSuggestions } from "./planner.js";
import { computePolicy } from "./rules.js";
import { getTrackForProfile } from "../data/subjects.js";
import { defaultSelectedIds, pickSelectedSuggestions } from "../data/flow.js";

/**
 * Scenario matrix — all path combinations with multi-alternative suggestions.
 */

export const GRADES = [11, 12];
export const EXAM_NEWS_LIST = ["cancelled", "noNews"];
export const STRENGTHS = ["weak", "ok"];

export function defaultProfile(overrides = {}) {
  const grade = overrides.grade ?? 12;
  const field = "all";
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
    nextHeldId: second.id,
    nextHeldName: second.name,
    selectedSuggestions: null,
    breakShortMin: 10,
    breakLongMin: 40,
    ...overrides,
    field: "all",
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
    for (const examNews of EXAM_NEWS_LIST) {
      for (const subjectStrength of STRENGTHS) {
        const base = defaultProfile({ grade, examNews, subjectStrength });
        const all = previewSuggestions(base);
        const morningAlts = all.filter((s) => s.period === "morning" && s.exclusiveGroup === "morning");
        const morningFixed = all.filter((s) => s.period === "morning" && !s.exclusiveGroup);
        const afternoonAlts = all.filter((s) => s.period === "afternoon");
        const eveningAlts = all.filter((s) => s.period === "evening");

        const morningOptions = morningAlts.length ? morningAlts : morningFixed;
        const eveningOptions = eveningAlts.length ? eveningAlts : [null];

        for (const mo of morningOptions) {
          for (const af of afternoonAlts) {
            for (const ev of eveningOptions) {
              const fixed = all
                .filter((s) => !s.exclusiveGroup && s.period !== "morning")
                .map((s) => s.id);
              const morningIds = mo
                ? [mo.id]
                : morningFixed.map((s) => s.id);
              const selected = [
                ...morningIds,
                ...fixed,
                af.id,
                ...(ev ? [ev.id] : []),
              ];
              profiles.push(
                defaultProfile({
                  grade,
                  examNews,
                  subjectStrength,
                  selectedSuggestions: selected,
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

  if (Number(profile.grade) === 12) {
    if (!titles.includes("chem-hafziat")) errors.push("missing night chem-hafziat");
    if (!titles.includes("bio-giyahi-summary")) errors.push("missing night giyahi");
  }

  const all = previewSuggestions(profile);
  const afternoonAlts = all.filter((s) => s.period === "afternoon");
  const eveningAlts = all.filter((s) => s.period === "evening");
  const morningExclusive = all.filter((s) => s.period === "morning" && s.exclusiveGroup === "morning");

  if (Number(profile.grade) === 12) {
    if (profile.examNews === "cancelled" && profile.subjectStrength === "weak") {
      if (afternoonAlts.length < 3) errors.push("g12 weak-postponed afternoon should have 3 alts");
      if (eveningAlts.length < 3) errors.push("g12 weak-postponed evening should have 3 alts");
    }
    if (profile.examNews === "cancelled" && profile.subjectStrength === "ok") {
      if (afternoonAlts.length < 4) errors.push("g12 ok-postponed afternoon should have 4 alts");
      if (eveningAlts.length < 4) errors.push("g12 ok-postponed evening should have 4 alts");
    }
    if (profile.examNews === "noNews" && profile.subjectStrength === "weak") {
      if (afternoonAlts.length < 3) errors.push("g12 weak-nonews afternoon should have 3 alts");
      if (eveningAlts.length < 2) errors.push("g12 weak-nonews evening should have 2 alts");
    }
    if (profile.examNews === "noNews" && profile.subjectStrength === "ok") {
      if (afternoonAlts.length < 2) errors.push("g12 ok-nonews afternoon should have 2 alts");
      if (eveningAlts.length < 2) errors.push("g12 ok-nonews evening should have 2 alts");
    }
  } else {
    // grade 11
    if (profile.examNews === "cancelled" && profile.subjectStrength === "weak") {
      if (afternoonAlts.length < 2) errors.push("g11 weak-postponed afternoon should have 2 alts");
      if (eveningAlts.length < 3) errors.push("g11 weak-postponed evening should have 3 alts");
    }
    if (profile.examNews === "cancelled" && profile.subjectStrength === "ok") {
      if (morningExclusive.length < 2) errors.push("g11 ok-postponed morning should have 2 alts");
      if (afternoonAlts.length < 2) errors.push("g11 ok-postponed afternoon should have 2 alts");
      if (eveningAlts.length < 5) errors.push("g11 ok-postponed evening should have 5 alts");
    }
    if (profile.examNews === "noNews" && profile.subjectStrength === "weak") {
      if (afternoonAlts.length < 4) errors.push("g11 weak-nonews afternoon should have 4 alts");
      if (eveningAlts.length < 1) errors.push("g11 weak-nonews evening should have 1 option");
    }
    if (profile.examNews === "noNews" && profile.subjectStrength === "ok") {
      if (afternoonAlts.length < 2) errors.push("g11 ok-nonews afternoon should have 2 alts");
      if (eveningAlts.length < 5) errors.push("g11 ok-nonews evening should have 5 alts");
    }
  }

  const picked = pickSelectedSuggestions(all, profile.selectedSuggestions);
  const afPicked = picked.filter((s) => s.period === "afternoon");
  const evPicked = picked.filter((s) => s.period === "evening");
  const moPicked = picked.filter((s) => s.period === "morning");
  if (afPicked.length !== 1) errors.push(`expected 1 afternoon pick, got ${afPicked.length}`);
  if (evPicked.length !== 1) errors.push(`expected 1 evening pick, got ${evPicked.length}`);
  if (moPicked.length !== 1) errors.push(`expected 1 morning pick, got ${moPicked.length}`);

  if (profile.subjectStrength === "ok" && Number(profile.grade) === 12) {
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
    (id) =>
      id.startsWith("afternoon") ||
      id.startsWith("evening") ||
      id.startsWith("morning")
  );
  return `g${p.grade}-all-${p.examNews}-${p.subjectStrength}-${picked.join("+") || "default"}`;
}

export const SHOWCASE = [
  defaultProfile({
    grade: 11,
    examNews: "cancelled",
    subjectStrength: "weak",
    selectedSuggestions: [
      "morning-study-postponed",
      "afternoon-preread12-bio",
      "evening-next-uncertain",
    ],
  }),
  defaultProfile({
    grade: 11,
    examNews: "noNews",
    subjectStrength: "ok",
    selectedSuggestions: [
      "morning-study-exam",
      "afternoon-preread12-bio",
      "evening-preread12-phys",
    ],
  }),
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
    selectedSuggestions: [
      "morning-study-exam",
      "afternoon-review",
      "evening-rest",
      "night-chem-giyahi",
    ],
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

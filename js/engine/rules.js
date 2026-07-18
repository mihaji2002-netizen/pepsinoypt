import { LEVELS, RATIOS, getTrack } from "../data/subjects.js";

/**
 * Rule-based decision engine.
 * Pure functions: profile → policy weights & block preferences.
 */

export function getRatio(ratioId) {
  return RATIOS.find((r) => r.id === ratioId) || RATIOS[2];
}

/**
 * Effective descriptive/test split after level & exam-status adjustments.
 */
export function computeModeSplit(profile) {
  const base = getRatio(profile.ratioId);
  const level = LEVELS[profile.level] || LEVELS.mid;
  let descriptive = base.descriptive + level.focusDescriptiveBoost;
  let test = 1 - descriptive;

  if (profile.examStatus === "postponed") {
    descriptive = Math.min(0.9, descriptive + 0.1);
    test = 1 - descriptive;
  } else if (profile.examStatus === "uncertain") {
    // Pull toward balanced mixed blocks
    descriptive = descriptive * 0.7 + 0.5 * 0.3;
    test = 1 - descriptive;
  } else if (profile.examStatus === "normal" && profile.grade === 12) {
    test = Math.min(0.7, test + 0.05);
    descriptive = 1 - test;
  }

  descriptive = clamp(descriptive, 0.25, 0.9);
  descriptive = Math.round(descriptive * 100) / 100;
  test = Math.round((1 - descriptive) * 100) / 100;
  return { descriptive, test };
}

export function computePolicy(profile) {
  const track = getTrack(`${profile.grade}-${profile.field}`);
  const level = LEVELS[profile.level] || LEVELS.mid;
  const split = computeModeSplit(profile);

  const policy = {
    trackId: track?.id,
    split,
    includeFoundation: level.foundationPriority >= 0.4 || profile.level === "weak",
    includePreRead12: profile.grade === 11,
    includeCatchup10: profile.level === "weak" || profile.examStatus === "postponed",
    preferFinalDrill: profile.examStatus === "normal" || profile.grade === 12,
    preferFullMock: profile.level !== "weak" && profile.examStatus !== "postponed",
    preferFlexibleBlocks: profile.examStatus === "uncertain",
    analysisAfterExam: true,
    answerKeyLoop: profile.level !== "strong" || profile.examStatus === "normal",
    chemMemoryBlock: Boolean(track?.subjects?.some((s) => s.id === "chem")),
    bioSummaryBlock: track?.field === "exp",
    hardExamBlock: profile.level === "strong" && profile.examStatus === "normal",
    gozine2Block: split.test >= 0.35,
    kheiliSabzBlock: split.test >= 0.3,
    mazBlock: profile.grade === 12 && split.test >= 0.4 && profile.level !== "weak",
    nightMemory: true,
    shortBreakMin: profile.breakShortMin ?? 10,
    longBreakMin: profile.breakLongMin ?? 40,
    studyHours: profile.studyHours ?? 8,
    startTime: profile.startTime ?? "08:00",
  };

  // Explicit rule table for transparency / tests
  policy.rulesFired = collectFiredRules(profile, policy);
  return policy;
}

function collectFiredRules(profile, policy) {
  const fired = [];
  fired.push(`split:${Math.round(policy.split.descriptive * 100)}/${Math.round(policy.split.test * 100)}`);
  if (policy.includeCatchup10) fired.push("catchup-10");
  if (policy.includePreRead12) fired.push("pre-read-12");
  if (policy.preferFinalDrill) fired.push("final-drill");
  if (policy.mazBlock) fired.push("maz-full");
  if (policy.gozine2Block) fired.push("gozine2");
  if (policy.hardExamBlock) fired.push("madares-bartar");
  if (policy.preferFlexibleBlocks) fired.push("light-mixed");
  if (policy.bioSummaryBlock) fired.push("bio-giyahi-summary");
  if (profile.examStatus === "postponed") fired.push("postponed-boost-desc");
  if (profile.examStatus === "uncertain") fired.push("uncertain-flex");
  if (profile.level === "weak") fired.push("weak-foundation");
  if (profile.level === "strong") fired.push("strong-intensity");
  return fired;
}

export function prioritizeSubjects(track, dayIndex = 0) {
  if (!track) return [];
  const sorted = [...track.subjects].sort((a, b) => b.weight - a.weight);
  // Rotate emphasis across days so lower-weight subjects aren't starved
  const rotation = dayIndex % sorted.length;
  return [...sorted.slice(rotation), ...sorted.slice(0, rotation)];
}

export function subjectForMode(subjects, mode, offset = 0) {
  const pool =
    mode === "descriptive"
      ? subjects.filter((s) => s.type === "memory" || s.type === "mixed")
      : mode === "test"
        ? subjects.filter((s) => s.type === "problem" || s.type === "mixed")
        : subjects;
  const list = pool.length ? pool : subjects;
  return list[offset % list.length];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

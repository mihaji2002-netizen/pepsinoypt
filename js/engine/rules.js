import { getTrackForProfile } from "../data/subjects.js";
import { EXAM_NEWS, SUBJECT_STRENGTH, resolveSuggestions } from "../data/flow.js";

/**
 * Lightweight policy helpers for the fluid coaching flow.
 */

export function computePolicy(profile) {
  const track = getTrackForProfile(profile);
  const suggestions = resolveSuggestions({
    grade: profile.grade,
    field: profile.field,
    nextExamId: profile.nextExamId,
    nextExamName: track?.subjects?.find((s) => s.id === profile.nextExamId)?.name,
    examNews: profile.examNews,
    subjectStrength: profile.subjectStrength,
    afternoonChoice: profile.afternoonChoice,
    eveningChoice: profile.eveningChoice,
    nextHeldId: profile.nextHeldId,
    nextHeldName: track?.subjects?.find((s) => s.id === profile.nextHeldId)?.name,
  });

  const selectedIds = new Set(
    profile.selectedSuggestions?.length
      ? profile.selectedSuggestions
      : suggestions.map((s) => s.id)
  );

  return {
    trackId: track?.id,
    examNews: profile.examNews,
    subjectStrength: profile.subjectStrength,
    afternoonChoice: profile.afternoonChoice,
    eveningChoice: profile.eveningChoice,
    suggestionIds: suggestions.map((s) => s.id),
    selectedIds: [...selectedIds],
    shortBreakMin: profile.breakShortMin ?? 10,
    longBreakMin: profile.breakLongMin ?? 40,
    rulesFired: collectFiredRules(profile, suggestions, selectedIds),
  };
}

function collectFiredRules(profile, suggestions, selectedIds) {
  const fired = [];
  fired.push(`news:${profile.examNews || "cancelled"}`);
  fired.push(`strength:${profile.subjectStrength || "weak"}`);
  fired.push(`afternoon:${profile.afternoonChoice || "review"}`);
  fired.push(`evening:${profile.eveningChoice || "review"}`);
  if (profile.subjectStrength === "ok") fired.push("morning-mock");
  fired.push(`suggestions:${[...selectedIds].length}/${suggestions.length}`);
  return fired;
}

export function describeProfile(profile) {
  const track = getTrackForProfile(profile);
  const news = EXAM_NEWS[profile.examNews];
  const strength = SUBJECT_STRENGTH[profile.subjectStrength];
  const next = track?.subjects?.find((s) => s.id === profile.nextExamId);
  return {
    trackLabel: track?.label || "—",
    nextExam: next?.name || "—",
    newsLabel: news?.label || "—",
    strengthLabel: strength?.label || "—",
  };
}

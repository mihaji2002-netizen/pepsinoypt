import { getTrackForProfile } from "../data/subjects.js";
import {
  EXAM_NEWS,
  SUBJECT_STRENGTH,
  resolveSuggestions,
  defaultSelectedIds,
  pickSelectedSuggestions,
} from "../data/flow.js";

/**
 * Lightweight policy helpers for the fluid coaching flow.
 */

export function computePolicy(profile) {
  const track = getTrackForProfile(profile);
  const answers = {
    grade: profile.grade,
    field: profile.field,
    nextExamId: profile.nextExamId,
    nextExamName: track?.subjects?.find((s) => s.id === profile.nextExamId)?.name,
    examNews: profile.examNews,
    subjectStrength: profile.subjectStrength,
    nextHeldId: profile.nextHeldId,
    nextHeldName: track?.subjects?.find((s) => s.id === profile.nextHeldId)?.name,
  };
  const suggestions = resolveSuggestions(answers);
  const selectedIds = profile.selectedSuggestions?.length
    ? profile.selectedSuggestions
    : defaultSelectedIds(suggestions);
  const picked = pickSelectedSuggestions(suggestions, selectedIds);

  return {
    trackId: track?.id,
    examNews: profile.examNews,
    subjectStrength: profile.subjectStrength,
    suggestionIds: suggestions.map((s) => s.id),
    selectedIds: picked.map((s) => s.id),
    alternativeCount: suggestions.length,
    shortBreakMin: profile.breakShortMin ?? 10,
    longBreakMin: profile.breakLongMin ?? 40,
    rulesFired: collectFiredRules(profile, suggestions, picked),
  };
}

function collectFiredRules(profile, suggestions, picked) {
  const fired = [];
  fired.push(`news:${profile.examNews || "cancelled"}`);
  fired.push(`strength:${profile.subjectStrength || "weak"}`);
  fired.push(`alts:${suggestions.length}`);
  for (const s of picked) fired.push(`pick:${s.id}`);
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

import { cloneBlock } from "../data/blocks.js";
import { getTrackForProfile } from "../data/subjects.js";
import {
  getPeriod,
  PERIODS,
  resolveSuggestions,
  pickSelectedSuggestions,
  defaultSelectedIds,
} from "../data/flow.js";

/**
 * Builds a daily plan from fluid-flow answers + selected suggestions.
 * No clock times — only morning / afternoon / evening / night buckets.
 */

export function buildDailyPlan(profile, options = {}) {
  const dayIndex = options.dayIndex ?? getDayIndex();
  const track = getTrackForProfile(profile);
  if (!track) {
    throw new Error("مسیر تحصیلی نامعتبر است.");
  }

  const answers = normalizeAnswers(profile, track);
  const allSuggestions = resolveSuggestions(answers);
  const selectedIds = profile.selectedSuggestions?.length
    ? profile.selectedSuggestions
    : defaultSelectedIds(allSuggestions);
  const selected = pickSelectedSuggestions(allSuggestions, selectedIds);
  if (!selected.length) {
    throw new Error("حداقل یک پیشنهاد برای ساخت برنامه لازم است.");
  }

  /** @type {ReturnType<typeof cloneBlock>[]} */
  const blocks = [];

  for (const period of PERIODS) {
    const items = selected.filter((s) => s.period === period.id);
    if (!items.length) continue;

    for (const item of items) {
      const periodBlocks = expandSuggestion(item);
      if (periodBlocks.length) {
        periodBlocks[0].periodId = period.id;
        periodBlocks[0].periodLabel = period.label;
        periodBlocks[0].isPeriodStart = true;
      }
      for (const b of periodBlocks) {
        b.periodId = b.periodId || period.id;
        b.periodLabel = b.periodLabel || period.label;
        blocks.push(b);
      }
    }
  }

  const studyBlocks = blocks.filter((b) => b.type !== "break");
  const totalPlanned = studyBlocks.reduce((s, b) => s + b.durationMin, 0);
  const selectedSet = new Set(selected.map((s) => s.id));

  return {
    dateKey: options.dateKey ?? todayKey(),
    dayIndex,
    trackId: track.id,
    trackLabel: track.label,
    answers,
    suggestions: allSuggestions.map((s) => ({
      id: s.id,
      period: s.period,
      title: s.title,
      body: s.body,
      exclusiveGroup: s.exclusiveGroup,
      selected: selectedSet.has(s.id),
    })),
    blocks,
    stats: {
      totalBlocks: blocks.length,
      studyBlocks: studyBlocks.length,
      totalMinutes: totalPlanned,
      periods: selected.map((s) => s.period),
      alternativesShown: allSuggestions.length,
    },
    rationale: buildRationale(answers, selected, allSuggestions),
  };
}

export function previewSuggestions(profile) {
  const track = getTrackForProfile(profile);
  if (!track) return [];
  return resolveSuggestions(normalizeAnswers(profile, track));
}

function normalizeAnswers(profile, track) {
  const next = track.subjects.find((s) => s.id === profile.nextExamId) || track.subjects[0];
  const held = track.subjects.find((s) => s.id === profile.nextHeldId) || null;
  return {
    grade: profile.grade,
    field: profile.field || "all",
    nextExamId: next?.id || profile.nextExamId,
    nextExamName: next?.name || profile.nextExamName || "درس",
    examNews: profile.examNews || "cancelled",
    subjectStrength: profile.subjectStrength || "weak",
    nextHeldId: held?.id || profile.nextHeldId || null,
    nextHeldName: held?.name || profile.nextHeldName || "امتحان بدون خبر رسمی",
    restTipIndex: profile.restTipIndex,
  };
}

function expandSuggestion(item) {
  return (item.blocks || []).map((spec) => {
    const blockId = spec.blockId || spec.id;
    const overrides = {
      durationMin: spec.durationMin,
      subjectId: spec.subjectId ?? null,
      subjectName: spec.subjectName ?? null,
      suggestionId: item.id,
    };
    if (spec.title != null) overrides.title = spec.title;
    if (spec.desc != null) overrides.desc = spec.desc;
    return cloneBlock(blockId, overrides);
  });
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayIndex() {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

function buildRationale(answers, selected, all) {
  const parts = [];
  parts.push(`امتحان بعدیت ${answers.nextExamName}ه.`);
  parts.push(answers.examNews === "cancelled" ? "تعویق / کنسل خورده." : "خبر رسمی هنوز نیومده.");
  parts.push(
    answers.subjectStrength === "weak"
      ? "گفتی تو این درس ضعیف / مشکل داری."
      : "گفتی تو این درس قوی‌ای / مشکلی نداری."
  );
  const afCount = all.filter((s) => s.period === "afternoon").length;
  const evCount = all.filter((s) => s.period === "evening").length;
  if (afCount > 1) parts.push(`برای ظهر ${afCount} پیشنهاد داری.`);
  if (evCount > 1) parts.push(`برای عصر ${evCount} پیشنهاد داری.`);
  parts.push("روتین شب: حفظیات شیمی + گیاهی.");
  const labels = selected.map((s) => getPeriod(s.period).label).join(" · ");
  if (labels) parts.push(`انتخاب‌هات: ${labels}.`);
  return parts.join(" ");
}

export function applyCompletionState(plan, completionMap = {}) {
  const doneSet = new Set(completionMap[plan.dateKey] || []);
  return {
    ...plan,
    blocks: plan.blocks.map((b) => ({
      ...b,
      done: doneSet.has(b.instanceId) || Boolean(b.done),
    })),
  };
}

export function calcProgress(plan) {
  const study = (plan?.blocks || []).filter((b) => b.type !== "break");
  if (!study.length) return 0;
  const done = study.filter((b) => b.done).length;
  return Math.round((done / study.length) * 100);
}

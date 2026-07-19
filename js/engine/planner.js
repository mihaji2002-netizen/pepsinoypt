import { cloneBlock } from "../data/blocks.js";
import { getTrackForProfile } from "../data/subjects.js";
import { getPeriod, PERIODS, resolveSuggestions } from "../data/flow.js";

/**
 * Builds a daily plan from fluid-flow answers + selected suggestions.
 * No clock times — only morning / afternoon / evening buckets.
 */

export function buildDailyPlan(profile, options = {}) {
  const dayIndex = options.dayIndex ?? getDayIndex();
  const track = getTrackForProfile(profile);
  if (!track) {
    throw new Error("مسیر تحصیلی نامعتبر است.");
  }

  const answers = normalizeAnswers(profile, track);
  const allSuggestions = resolveSuggestions(answers);
  const selectedIds = new Set(
    profile.selectedSuggestions?.length
      ? profile.selectedSuggestions
      : allSuggestions.map((s) => s.id)
  );
  const selected = allSuggestions.filter((s) => selectedIds.has(s.id));
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
        // Keep duration for focus timer only — never expose as a clock schedule
        blocks.push(b);
      }
    }
  }

  const studyBlocks = blocks.filter((b) => b.type !== "break");
  const totalPlanned = studyBlocks.reduce((s, b) => s + b.durationMin, 0);

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
      selected: selectedIds.has(s.id),
    })),
    blocks,
    stats: {
      totalBlocks: blocks.length,
      studyBlocks: studyBlocks.length,
      totalMinutes: totalPlanned,
      periods: selected.map((s) => s.period),
    },
    rationale: buildRationale(answers, selected),
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
    field: profile.field || (profile.grade === 12 ? "all" : "exp"),
    nextExamId: next?.id || profile.nextExamId,
    nextExamName: next?.name || profile.nextExamName || "درس",
    examNews: profile.examNews || "cancelled",
    subjectStrength: profile.subjectStrength || "weak",
    afternoonChoice: profile.afternoonChoice || "review",
    eveningChoice: profile.eveningChoice || "review",
    nextHeldId: held?.id || profile.nextHeldId || null,
    nextHeldName: held?.name || profile.nextHeldName || "امتحان بدون خبر رسمی",
  };
}

function expandSuggestion(item) {
  return (item.blocks || []).map((spec) => {
    const blockId = spec.blockId || spec.id;
    return cloneBlock(blockId, {
      durationMin: spec.durationMin,
      subjectId: spec.subjectId ?? null,
      subjectName: spec.subjectName ?? null,
      title: spec.title,
      desc: spec.desc,
      suggestionId: item.id,
    });
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

function buildRationale(answers, selected) {
  const parts = [];
  parts.push(`امتحان بعدیت ${answers.nextExamName}ه.`);
  if (answers.examNews === "cancelled") {
    parts.push("تعویق / کنسل خورده.");
    if (answers.subjectStrength === "weak") {
      parts.push("گفتی تو این درس ضعیف / مشکل داری.");
      if (answers.afternoonChoice === "booklet-bio-math") parts.push("ظهر: تک‌دفترچه زیست و ریاضی.");
      else if (answers.afternoonChoice === "booklet-phys-chem") parts.push("ظهر: تک‌دفترچه فیزیک و شیمی.");
      else parts.push(`ظهر: ادامه مرور ${answers.nextExamName}.`);
      if (answers.eveningChoice === "rest") parts.push("عصر: استراحت.");
      else if (answers.eveningChoice === "next-uncertain") parts.push(`عصر: ${answers.nextHeldName}.`);
      else parts.push(`عصر: ادامه مرور ${answers.nextExamName}.`);
    } else {
      parts.push("گفتی می‌تونی ببندیش؛ صبح آزمون، بعدش مرور تعویقی.");
    }
  } else {
    parts.push("خبر رسمی نیست؛ برنامه رو نرم نگه داشتیم.");
  }
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

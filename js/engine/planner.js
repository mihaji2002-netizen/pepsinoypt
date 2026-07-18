import { cloneBlock } from "../data/blocks.js";
import { getTrack } from "../data/subjects.js";
import { getPeriod, PERIODS, resolveSuggestions } from "../data/flow.js";

/**
 * Builds a concrete daily timeline from fluid-flow answers + selected suggestions.
 */

export function buildDailyPlan(profile, options = {}) {
  const dayIndex = options.dayIndex ?? getDayIndex();
  const track = getTrack(`${profile.grade}-${profile.field}`);
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

  // Keep period order: morning → afternoon → evening
  for (const period of PERIODS) {
    const items = selected.filter((s) => s.period === period.id);
    if (!items.length) continue;

    for (const item of items) {
      const periodBlocks = expandSuggestion(item);
      // Tag period metadata on first real block
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

  const timed = assignPeriodTimes(blocks);
  const studyBlocks = timed.filter((b) => b.type !== "break");
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
    blocks: timed,
    stats: {
      totalBlocks: timed.length,
      studyBlocks: studyBlocks.length,
      totalMinutes: totalPlanned,
      periods: selected.map((s) => s.period),
    },
    rationale: buildRationale(answers, selected),
  };
}

export function previewSuggestions(profile) {
  const track = getTrack(`${profile.grade}-${profile.field}`);
  if (!track) return [];
  return resolveSuggestions(normalizeAnswers(profile, track));
}

function normalizeAnswers(profile, track) {
  const next = track.subjects.find((s) => s.id === profile.nextExamId) || track.subjects[0];
  const held = track.subjects.find((s) => s.id === profile.nextHeldId) || null;
  return {
    grade: profile.grade,
    field: profile.field,
    nextExamId: next?.id || profile.nextExamId,
    nextExamName: next?.name || profile.nextExamName || "درس",
    examNews: profile.examNews || "cancelled",
    subjectStrength: profile.subjectStrength || "weak",
    nextHeldWeak: Boolean(profile.nextHeldWeak),
    nextHeldId: held?.id || profile.nextHeldId || null,
    nextHeldName: held?.name || profile.nextHeldName || "امتحان بعدی برگزارشدنی",
  };
}

function expandSuggestion(item) {
  return (item.blocks || []).map((spec) => {
    const blockId = spec.blockId || spec.id;
    const b = cloneBlock(blockId, {
      durationMin: spec.durationMin,
      subjectId: spec.subjectId ?? null,
      subjectName: spec.subjectName ?? null,
      title: spec.title,
      desc: spec.desc,
      suggestionId: item.id,
    });
    return b;
  });
}

/**
 * Assign clock times within each period window.
 * Morning / afternoon / evening restart at their own startTime.
 */
function assignPeriodTimes(blocks) {
  const cursors = Object.fromEntries(PERIODS.map((p) => [p.id, parseClock(p.startTime)]));

  return blocks.map((b) => {
    const periodId = b.periodId || "morning";
    const start = cursors[periodId] ?? parseClock("08:00");
    const end = start + b.durationMin;
    cursors[periodId] = end;
    return {
      ...b,
      startMin: start,
      endMin: end,
      startLabel: formatClock(start),
      endLabel: formatClock(end),
    };
  });
}

function parseClock(hhmm) {
  const [h, m] = (hhmm || "08:00").split(":").map(Number);
  return h * 60 + m;
}

export function formatClock(totalMin) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
  parts.push(`امتحان بعدی: ${answers.nextExamName}.`);
  if (answers.examNews === "cancelled") {
    parts.push("وضعیت: کنسل / تعویق‌شده.");
    if (answers.subjectStrength === "weak") {
      parts.push("خودارزیابی: در این درس ضعیفی.");
      parts.push(
        answers.nextHeldWeak
          ? "تمرکز بعدازظهر روی امتحان برگزارشدنی‌ای است که در آن ضعفی."
          : "بعدازظهر روی تست و آزمون جامع می‌رود."
      );
    } else {
      parts.push("خودارزیابی: می‌تونی این درس را ببندی؛ صبح آزمون جامع، ظهر مرور تعویقی.");
    }
  } else {
    parts.push("خبر رسمی نیست؛ برنامه آماده‌باش و انعطاف‌پذیر است.");
  }
  const labels = selected.map((s) => getPeriod(s.period).label).join(" · ");
  if (labels) parts.push(`بازه‌های فعال: ${labels}.`);
  return parts.join(" ");
}

/**
 * Merge completion state from storage into a freshly built plan.
 */
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

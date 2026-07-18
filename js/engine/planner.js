import { cloneBlock } from "../data/blocks.js";
import { getTrack } from "../data/subjects.js";
import { computePolicy, prioritizeSubjects, subjectForMode } from "./rules.js";

/**
 * Builds a concrete daily timeline from profile + policy.
 */

export function buildDailyPlan(profile, options = {}) {
  const dayIndex = options.dayIndex ?? getDayIndex();
  const track = getTrack(`${profile.grade}-${profile.field}`);
  if (!track) {
    throw new Error("مسیر تحصیلی نامعتبر است.");
  }

  const policy = computePolicy(profile);
  const subjects = prioritizeSubjects(track, dayIndex);
  const totalStudyMin = Math.round((policy.studyHours || 8) * 60);
  const budget = {
    descriptive: Math.round(totalStudyMin * policy.split.descriptive),
    test: Math.round(totalStudyMin * policy.split.test),
  };

  /** @type {ReturnType<typeof cloneBlock>[]} */
  const blocks = [];
  let descUsed = 0;
  let testUsed = 0;
  let subjOffset = 0;

  const pushStudy = (blockId, mode, durationMin, subject) => {
    const b = cloneBlock(blockId, {
      durationMin,
      subjectId: subject?.id ?? null,
      subjectName: subject?.name ?? null,
    });
    if (subject) {
      b.title = `${b.title} — ${subject.name}`;
    }
    blocks.push(b);
    if (mode === "descriptive") descUsed += durationMin;
    else if (mode === "test") testUsed += durationMin;
    else {
      descUsed += Math.round(durationMin * 0.5);
      testUsed += Math.round(durationMin * 0.5);
    }
    subjOffset += 1;
  };

  // Warmup
  blocks.push(cloneBlock("warmup", { durationMin: 15 }));

  // Foundation / catch-up early if needed
  if (policy.includeCatchup10 && descUsed < budget.descriptive) {
    const s = subjects[0];
    pushStudy("catchup-10", "descriptive", 55, s);
  }

  // Specialty descriptive blocks
  if (policy.bioSummaryBlock && descUsed < budget.descriptive) {
    const bio = subjects.find((s) => s.id === "bio") || subjects[0];
    pushStudy("bio-giyahi-summary", "descriptive", 50, bio);
  }

  if (policy.chemMemoryBlock && descUsed < budget.descriptive) {
    const chem = subjects.find((s) => s.id === "chem") || subjects[1] || subjects[0];
    pushStudy("chem-hafziat", "descriptive", 40, chem);
  }

  // Core descriptive fill
  while (descUsed < budget.descriptive - 30) {
    const remaining = budget.descriptive - descUsed;
    const s = subjectForMode(subjects, "descriptive", subjOffset);
    if (policy.preferFinalDrill && remaining >= 70 && subjOffset % 3 === 0) {
      pushStudy("final-drill", "descriptive", Math.min(70, remaining), s);
    } else if (s.type === "problem" || s.type === "mixed") {
      pushStudy("problem-set", "descriptive", Math.min(55, remaining), s);
    } else if (subjOffset % 2 === 0) {
      pushStudy("desc-core", "descriptive", Math.min(60, remaining), s);
    } else {
      pushStudy("desc-notes", "descriptive", Math.min(45, remaining), s);
    }
    if (blocks.length > 40) break;
  }

  // Pre-read for 11th
  if (policy.includePreRead12 && descUsed < budget.descriptive + 20) {
    const s = subjects[Math.min(1, subjects.length - 1)];
    blocks.push(
      cloneBlock("pre-read-12", {
        durationMin: 40,
        subjectId: s.id,
        subjectName: s.name,
        title: `پیش‌خوانی دروس دوازدهم — ${s.name}`,
      })
    );
    descUsed += 40;
  }

  // Test / exam blocks
  const isExamDay = dayIndex % 7 === 5 || dayIndex % 7 === 6; // weekend-ish emphasis
  if (policy.mazBlock && isExamDay && testUsed < budget.test) {
    blocks.push(cloneBlock("maz-full", { durationMin: Math.min(180, budget.test - testUsed || 120) }));
    testUsed += blocks[blocks.length - 1].durationMin;
    if (policy.analysisAfterExam) {
      blocks.push(cloneBlock("exam-analysis", { durationMin: 60 }));
      testUsed += 60;
    }
    if (policy.answerKeyLoop) {
      blocks.push(cloneBlock("answerkey-to-book", { durationMin: 45 }));
      descUsed += 25;
      testUsed += 20;
    }
  } else {
    if (policy.gozine2Block && (dayIndex % 3 === 0) && testUsed < budget.test) {
      const dur = Math.min(90, budget.test - testUsed);
      blocks.push(cloneBlock("gozine2", { durationMin: dur }));
      testUsed += dur;
      blocks.push(cloneBlock("exam-analysis", { durationMin: 45 }));
      testUsed += 45;
      blocks.push(cloneBlock("answerkey-to-book", { durationMin: 40 }));
    }

    if (policy.hardExamBlock && dayIndex % 5 === 0 && testUsed < budget.test) {
      blocks.push(cloneBlock("madares-bartar", { durationMin: 100 }));
      testUsed += 100;
      blocks.push(cloneBlock("exam-analysis", { durationMin: 50 }));
      testUsed += 50;
    }

    if (policy.kheiliSabzBlock) {
      while (testUsed < budget.test - 25) {
        const remaining = budget.test - testUsed;
        const s = subjectForMode(subjects, "test", subjOffset);
        if (policy.preferFlexibleBlocks && subjOffset % 2 === 0) {
          pushStudy("light-mixed", "mixed", Math.min(50, remaining + 10), s);
        } else if (subjOffset % 3 === 0) {
          pushStudy("test-wrong-bank", "test", Math.min(35, remaining), s);
        } else {
          pushStudy("kheili-sabz", "test", Math.min(75, remaining), s);
        }
        if (blocks.filter((b) => b.mode === "test" || b.type === "exam").length > 12) break;
      }
    } else {
      while (testUsed < budget.test - 20) {
        const remaining = budget.test - testUsed;
        const s = subjectForMode(subjects, "test", subjOffset);
        if (policy.preferFlexibleBlocks) {
          pushStudy("light-mixed", "mixed", Math.min(50, remaining), s);
        } else {
          pushStudy("test-targeted", "test", Math.min(50, remaining), s);
        }
        if (blocks.length > 45) break;
      }
    }
  }

  // Night memory
  if (policy.nightMemory) {
    const mem = subjects.find((s) => s.type === "memory") || subjects[subjects.length - 1];
    blocks.push(
      cloneBlock("memory-night", {
        durationMin: 25,
        subjectId: mem.id,
        subjectName: mem.name,
        title: `مرور شبانه حفظیات — ${mem.name}`,
      })
    );
  }

  // Insert breaks between non-break blocks
  const withBreaks = insertBreaks(blocks, policy);

  // Assign clock times
  const timed = assignTimes(withBreaks, policy.startTime);

  const studyBlocks = timed.filter((b) => b.type !== "break");
  const totalPlanned = studyBlocks.reduce((s, b) => s + b.durationMin, 0);

  return {
    dateKey: options.dateKey ?? todayKey(),
    dayIndex,
    trackId: track.id,
    trackLabel: track.label,
    policy,
    split: policy.split,
    blocks: timed,
    stats: {
      totalBlocks: timed.length,
      studyBlocks: studyBlocks.length,
      totalMinutes: totalPlanned,
      descriptiveTarget: budget.descriptive,
      testTarget: budget.test,
      descriptiveUsed: descUsed,
      testUsed: testUsed,
    },
    rationale: buildRationale(profile, policy),
  };
}

function insertBreaks(blocks, policy) {
  const out = [];
  let sinceLong = 0;
  let studyStreak = 0;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    out.push(b);
    if (b.type === "break") continue;

    studyStreak += b.durationMin;
    sinceLong += b.durationMin;

    const isLast = i === blocks.length - 1;
    if (isLast) break;

    if (sinceLong >= 150) {
      out.push(cloneBlock("break-long", { durationMin: policy.longBreakMin }));
      sinceLong = 0;
      studyStreak = 0;
    } else if (studyStreak >= 50) {
      out.push(cloneBlock("break-short", { durationMin: policy.shortBreakMin }));
      studyStreak = 0;
    }
  }
  return out;
}

function assignTimes(blocks, startTime) {
  let [h, m] = (startTime || "08:00").split(":").map(Number);
  let minutes = h * 60 + m;

  return blocks.map((b) => {
    const start = minutes;
    const end = minutes + b.durationMin;
    minutes = end;
    return {
      ...b,
      startMin: start,
      endMin: end,
      startLabel: formatClock(start),
      endLabel: formatClock(end),
    };
  });
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

function buildRationale(profile, policy) {
  const parts = [];
  parts.push(
    `نسبت مؤثر: ${Math.round(policy.split.descriptive * 100)}٪ تشریحی و ${Math.round(policy.split.test * 100)}٪ تستی.`
  );
  if (profile.examStatus === "postponed") {
    parts.push("به‌خاطر تعویق امتحانات، جبران پایه و تثبیت تشریحی اولویت دارد.");
  } else if (profile.examStatus === "uncertain") {
    parts.push("به‌خاطر وضعیت نامشخص، بلوک‌های دوکاره و انعطاف‌پذیر جایگزین برنامه صلب شده‌اند.");
  } else {
    parts.push("وضعیت عادی امتحانات: ترکیب مرور نهایی، آزمون و تحلیل.");
  }
  if (profile.level === "weak") {
    parts.push("سطح ضعیف: وزن جبران دهم و مطالعه تشریحی بالاتر است.");
  } else if (profile.level === "strong") {
    parts.push("سطح قوی: آزمون‌های سخت‌تر و فشار تستی بیشتر.");
  }
  if (policy.mazBlock) parts.push("بلوک آزمون جامع ماز در روزهای مناسب فعال است.");
  if (policy.includePreRead12) parts.push("پیش‌خوانی دوازدهم برای پایه یازدهم لحاظ شده.");
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

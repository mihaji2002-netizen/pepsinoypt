/**
 * Fluid day-plan flow — coaching paths → day parts (no clock times).
 * For afternoon/evening, ALL "یا" alternatives are returned together;
 * the student picks one per period on the suggestions screen.
 */

/** @typedef {'morning'|'afternoon'|'evening'|'night'} PeriodId */
/** @typedef {'cancelled'|'noNews'} ExamNews */
/** @typedef {'weak'|'ok'} SubjectStrength */

export const PERIODS = [
  { id: "morning", label: "صبح" },
  { id: "afternoon", label: "ظهر" },
  { id: "evening", label: "عصر" },
  { id: "night", label: "روتین شب" },
];

export const EXAM_NEWS = {
  cancelled: {
    id: "cancelled",
    label: "تعویق خورده / کنسل شده",
    desc: "این امتحان فعلاً برگزار نمی‌شه.",
  },
  noNews: {
    id: "noNews",
    label: "هنوز خبر رسمی‌ای نیومده",
    desc: "هنوز معلوم نیست برگزار می‌شه یا نه.",
  },
};

export const SUBJECT_STRENGTH = {
  weak: {
    id: "weak",
    label: "این درس رو ضعیفم / مشکل دارم",
    desc: "پس جوری می‌چینیم که غافلگیر نشی.",
  },
  ok: {
    id: "ok",
    label: "تو این درس قوی‌ام / مشکلی ندارم",
    desc: "صبح آزمون جامع برای بازیابی تستی، نه قضاوت خودت.",
  },
};

export const BOOKLET_NOTE =
  "برای اینکه کم‌کم اطلاعات تستیت برگرده و بتونی بازیابی کنی؛ با درصدا خودتو قضاوت نکن. از آزمون‌های جامع برگزارشده امسال استفاده کن؛ اولویت با ماز و خیلی‌سبزه. اگه قبلاً زدیشون، الان مدارس برتر و گزینه‌دو.";

/**
 * All suggestions for the path — including every OR alternative.
 * Afternoon/evening items share exclusiveGroup so UI picks one of each.
 */
export function resolveSuggestions(answers) {
  const subjectName = answers.nextExamName || "اون درس";
  const news = answers.examNews || "cancelled";
  const strength = answers.subjectStrength || "weak";
  const list = [];

  // —— صبح (معمولاً یکی) ——
  if (strength === "weak") {
    list.push(
      morningStudy(subjectName, answers.nextExamId, news === "cancelled")
    );
  } else {
    list.push(morningMock());
  }

  // —— ظهر (چند پیشنهاد با «یا») ——
  if (news === "cancelled" && strength === "weak") {
    list.push(
      afternoonReview(subjectName, answers.nextExamId),
      afternoonBookletBioMath(),
      afternoonBookletPhysChem()
    );
  } else if (news === "cancelled" && strength === "ok") {
    list.push(
      afternoonContinueAnalysis(),
      afternoonBookletBioMath(),
      afternoonBookletPhysChem(),
      afternoonStudyExam(subjectName, answers.nextExamId, true)
    );
  } else if (news === "noNews" && strength === "weak") {
    list.push(
      afternoonReview(subjectName, answers.nextExamId),
      afternoonBookletBioMath(),
      afternoonBookletPhysChem()
    );
  } else {
    // noNews + ok
    list.push(
      afternoonContinueAnalysis(),
      afternoonStudyExam(subjectName, answers.nextExamId, false)
    );
  }

  // —— عصر (چند پیشنهاد با «یا») ——
  if (news === "cancelled" && strength === "weak") {
    list.push(
      eveningReview(subjectName, answers.nextExamId),
      eveningRest(),
      eveningNextUncertain(answers)
    );
  } else if (news === "cancelled" && strength === "ok") {
    list.push(
      eveningReview(subjectName, answers.nextExamId),
      eveningRest(),
      eveningBookletBioMath(),
      eveningBookletPhysChem()
    );
  } else {
    // noNews weak or ok
    list.push(eveningReview(subjectName, answers.nextExamId), eveningRest());
  }

  // —— روتین شب ——
  list.push(nightRoutineSuggestion());

  return list;
}

/**
 * Pick one suggestion per exclusive group (and keep non-exclusive).
 * Defaults: first option in each exclusive group if nothing selected.
 */
export function pickSelectedSuggestions(all, selectedIds) {
  const selected = new Set(selectedIds || []);
  const byGroup = new Map();

  for (const s of all) {
    const g = s.exclusiveGroup || s.id;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(s);
  }

  const picked = [];
  for (const [, items] of byGroup) {
    if (items.length === 1 && !items[0].exclusiveGroup) {
      // fixed slots (morning/night): include if selected or no prior selection
      if (!selectedIds?.length || selected.has(items[0].id)) picked.push(items[0]);
      continue;
    }
    const chosen = items.find((s) => selected.has(s.id)) || items[0];
    picked.push(chosen);
  }
  return picked;
}

export function defaultSelectedIds(all) {
  return pickSelectedSuggestions(all, null).map((s) => s.id);
}

/* ——— builders ——— */

function morningStudy(subjectName, subjectId, postponed) {
  return suggestion({
    id: postponed ? "morning-study-postponed" : "morning-study-exam",
    period: "morning",
    title: `صبح: مطالعه و مرور ${subjectName}`,
    body: `مطالعه و مرور ${subjectName} — که اگه یهو برگزارش کردن غافلگیر نشی و یکم خونده باشی.`,
    blocks: [
      {
        blockId: "desc-core",
        durationMin: 70,
        subjectId,
        subjectName,
        title: `مطالعه ${subjectName}`,
        desc: "یه مرور درست حسابی که غافلگیر نشی.",
      },
      { blockId: "break-short", durationMin: 10 },
      {
        blockId: "desc-notes",
        durationMin: 45,
        subjectId,
        subjectName,
        title: `مرور / خلاصه ${subjectName}`,
      },
    ],
  });
}

function morningMock() {
  return suggestion({
    id: "morning-mock-analysis",
    period: "morning",
    title: "صبح: آزمون جامع + تحلیل جوندار",
    body: `آزمون جامع و تحلیل جوندار برای بازیابی توانایی تستی، نه قضاوت خودت. ${BOOKLET_NOTE}`,
    blocks: [
      {
        blockId: "maz-full",
        durationMin: 120,
        title: "آزمون جامع (ماز / خیلی‌سبز امسال)",
        desc: BOOKLET_NOTE,
      },
      { blockId: "break-short", durationMin: 15 },
      {
        blockId: "exam-analysis",
        durationMin: 55,
        title: "تحلیل جوندار",
        desc: "هدف بازیابی تستیه، نه قضاوت با درصد.",
      },
      {
        blockId: "answerkey-to-book",
        durationMin: 40,
        title: "از پاسخنامه برو تو کتاب",
      },
    ],
  });
}

function afternoonReview(subjectName, subjectId) {
  return suggestion({
    id: "afternoon-review",
    period: "afternoon",
    exclusiveGroup: "afternoon",
    title: `ظهر: ادامه مرور ${subjectName}`,
    body: `ادامه مرور ${subjectName}.`,
    blocks: continueReviewBlocks(subjectId, subjectName),
  });
}

function afternoonStudyExam(subjectName, subjectId, postponed) {
  return suggestion({
    id: "afternoon-study-exam",
    period: "afternoon",
    exclusiveGroup: "afternoon",
    title: `ظهر: مطالعه ${subjectName}`,
    body: postponed
      ? `مطالعه ${subjectName} برای اینکه اگه یهو برگزار شد شوکه نشی.`
      : `مطالعه ${subjectName} برای اینکه اگه یهو برگزار شد شوکه نشی.`,
    blocks: continueReviewBlocks(subjectId, subjectName),
  });
}

function afternoonContinueAnalysis() {
  return suggestion({
    id: "afternoon-continue-analysis",
    period: "afternoon",
    exclusiveGroup: "afternoon",
    title: "ظهر: ادامه تحلیل آزمون",
    body: "ادامه تحلیل آزمون اگر تو پارت قبل تموم نشده.",
    blocks: [
      {
        blockId: "exam-analysis",
        durationMin: 55,
        title: "ادامه تحلیل جوندار",
        desc: "با درصد خودتو قضاوت نکن.",
      },
      {
        blockId: "answerkey-to-book",
        durationMin: 45,
        title: "از پاسخنامه برو تو کتاب",
      },
    ],
  });
}

function afternoonBookletBioMath() {
  return suggestion({
    id: "afternoon-booklet-bio-math",
    period: "afternoon",
    exclusiveGroup: "afternoon",
    title: "ظهر: آزمون جامع تک‌دفترچه زیست و ریاضی",
    body: `زدن آزمون جامع تک‌دفترچه زیست و ریاضی. ${BOOKLET_NOTE}`,
    blocks: bookletBlocks("زیست و ریاضی"),
  });
}

function afternoonBookletPhysChem() {
  return suggestion({
    id: "afternoon-booklet-phys-chem",
    period: "afternoon",
    exclusiveGroup: "afternoon",
    title: "ظهر: آزمون جامع تک‌دفترچه فیزیک و شیمی",
    body: `زدن آزمون جامع تک‌دفترچه فیزیک و شیمی. ${BOOKLET_NOTE}`,
    blocks: bookletBlocks("فیزیک و شیمی"),
  });
}

function eveningReview(subjectName, subjectId) {
  return suggestion({
    id: "evening-review",
    period: "evening",
    exclusiveGroup: "evening",
    title: `عصر: ادامه مرور ${subjectName}`,
    body: `ادامه مرور ${subjectName}.`,
    blocks: continueReviewBlocks(subjectId, subjectName),
  });
}

function eveningRest() {
  return suggestion({
    id: "evening-rest",
    period: "evening",
    exclusiveGroup: "evening",
    title: "عصر: استراحت",
    body: "استراحت.",
    blocks: [
      {
        blockId: "break-long",
        durationMin: 60,
        title: "استراحت",
        desc: "بلند شو، راه برو، غذا بخور. اسکرول ممنوع.",
      },
    ],
  });
}

function eveningNextUncertain(answers) {
  const uncertainName = answers.nextHeldName || "امتحان بدون خبر رسمی";
  return suggestion({
    id: "evening-next-uncertain",
    period: "evening",
    exclusiveGroup: "evening",
    needsUncertainSubject: true,
    title: "عصر: کار روی امتحانی که هنوز خبر رسمیش نیومده",
    body: `اگه توش ضعف داری، کار کردن روی ${uncertainName}.`,
    blocks: continueReviewBlocks(answers.nextHeldId, uncertainName),
  });
}

function eveningBookletBioMath() {
  return suggestion({
    id: "evening-booklet-bio-math",
    period: "evening",
    exclusiveGroup: "evening",
    title: "عصر: آزمون جامع تک‌دفترچه زیست و ریاضی",
    body: `زدن آزمون جامع تک‌دفترچه زیست و ریاضی. ${BOOKLET_NOTE}`,
    blocks: bookletBlocks("زیست و ریاضی"),
  });
}

function eveningBookletPhysChem() {
  return suggestion({
    id: "evening-booklet-phys-chem",
    period: "evening",
    exclusiveGroup: "evening",
    title: "عصر: آزمون جامع تک‌دفترچه فیزیک و شیمی",
    body: `زدن آزمون جامع تک‌دفترچه فیزیک و شیمی. ${BOOKLET_NOTE}`,
    blocks: bookletBlocks("فیزیک و شیمی"),
  });
}

function nightRoutineSuggestion() {
  return suggestion({
    id: "night-chem-giyahi",
    period: "night",
    title: "روتین شب: حفظیات شیمی + گیاهی",
    body: "مرور جزوه حفظیات شیمی (فراهانی یا هر استادی که داری) + مرور خلاصه‌نویسی گیاهی.",
    blocks: [
      {
        blockId: "chem-hafziat",
        durationMin: 40,
        subjectId: "chem",
        subjectName: "شیمی",
        title: "جزوه حفظیات شیمی (فراهانی یا استادت)",
        desc: "فقط حفظیات؛ مسئله نزن.",
      },
      {
        blockId: "bio-giyahi-summary",
        durationMin: 40,
        subjectId: "bio",
        subjectName: "زیست",
        title: "مرور خلاصه‌نویسی گیاهی",
        desc: "خلاصه‌هات از گیاهی رو یه دور بزن.",
      },
    ],
  });
}

function continueReviewBlocks(subjectId, subjectName) {
  return [
    {
      blockId: "desc-core",
      durationMin: 60,
      subjectId,
      subjectName,
      title: `ادامه مرور ${subjectName}`,
    },
    { blockId: "break-short", durationMin: 10 },
    {
      blockId: "problem-set",
      durationMin: 50,
      subjectId,
      subjectName,
      title: `تمرین از ${subjectName}`,
    },
  ];
}

function bookletBlocks(label) {
  return [
    {
      blockId: label.includes("زیست") ? "booklet-bio-math" : "booklet-phys-chem",
      durationMin: 100,
      title: `آزمون جامع تک‌دفترچه ${label}`,
      desc: BOOKLET_NOTE,
    },
    { blockId: "break-short", durationMin: 15 },
    {
      blockId: "exam-analysis",
      durationMin: 40,
      title: "یه تحلیل کوتاه",
      desc: "با درصد قضاوت نکن؛ ببین کجاها ضعف داری.",
    },
  ];
}

function suggestion({
  id,
  period,
  title,
  body,
  blocks,
  exclusiveGroup = null,
  needsUncertainSubject = false,
}) {
  return {
    id,
    period,
    title,
    body,
    blocks,
    exclusiveGroup,
    needsUncertainSubject,
    selected: true,
  };
}

export function getPeriod(periodId) {
  return PERIODS.find((p) => p.id === periodId) || PERIODS[0];
}

/** Labels for settings summary */
export const AFTERNOON_CHOICES = {
  "afternoon-review": { label: (n) => `ادامه مرور ${n}` },
  "afternoon-study-exam": { label: (n) => `مطالعه ${n}` },
  "afternoon-continue-analysis": { label: () => "ادامه تحلیل آزمون" },
  "afternoon-booklet-bio-math": { label: () => "تک‌دفترچه زیست و ریاضی" },
  "afternoon-booklet-phys-chem": { label: () => "تک‌دفترچه فیزیک و شیمی" },
};

export const EVENING_CHOICES = {
  "evening-review": { label: (n) => `ادامه مرور ${n}` },
  "evening-rest": { label: () => "استراحت" },
  "evening-next-uncertain": { label: () => "امتحان بدون خبر رسمی" },
  "evening-booklet-bio-math": { label: () => "تک‌دفترچه زیست و ریاضی" },
  "evening-booklet-phys-chem": { label: () => "تک‌دفترچه فیزیک و شیمی" },
};

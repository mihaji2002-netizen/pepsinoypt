/**
 * Fluid day-plan flow — coaching paths → day parts (no clock times).
 * Grade 12 paths from teacher brief (postponed / no-news × weak / strong).
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

/** Afternoon / evening choice catalogs used by wizard */
export function getAfternoonChoices(answers) {
  const name = answers.nextExamName || "اون درس";
  const news = answers.examNews;
  const strength = answers.subjectStrength;

  if (news === "cancelled" && strength === "weak") {
    return [
      choice("review", `ادامه مرور ${name}`, "همون درس تعویق‌خورده رو ظهر هم ادامه بده."),
      choice("booklet-bio-math", "آزمون جامع تک‌دفترچه زیست و ریاضی", "بازیابی تستی؛ با درصد قضاوت نکن."),
      choice("booklet-phys-chem", "آزمون جامع تک‌دفترچه فیزیک و شیمی", "بازیابی تستی؛ با درصد قضاوت نکن."),
    ];
  }

  if (news === "cancelled" && strength === "ok") {
    return [
      choice("continue-analysis", "ادامه تحلیل آزمون", "اگه تو پارت قبل تموم نشده، ظهر ادامه بده."),
      choice("booklet-bio-math", "آزمون جامع تک‌دفترچه زیست و ریاضی", "بازیابی تستی؛ با درصد قضاوت نکن."),
      choice("booklet-phys-chem", "آزمون جامع تک‌دفترچه فیزیک و شیمی", "بازیابی تستی؛ با درصد قضاوت نکن."),
      choice("study-exam", `مطالعه ${name}`, "درس تعویق‌خورده رو بخون که اگه یهو برگزار شد شوکه نشی."),
    ];
  }

  if (news === "noNews" && strength === "weak") {
    return [
      choice("review", `ادامه مرور ${name}`, "همون درسی که امتحانشو داری رو ظهر هم ادامه بده."),
      choice("booklet-bio-math", "آزمون جامع تک‌دفترچه زیست و ریاضی", "بازیابی تستی؛ با درصد قضاوت نکن."),
      choice("booklet-phys-chem", "آزمون جامع تک‌دفترچه فیزیک و شیمی", "بازیابی تستی؛ با درصد قضاوت نکن."),
    ];
  }

  // noNews + ok
  return [
    choice("continue-analysis", "ادامه تحلیل آزمون", "اگه تو پارت قبل تموم نشده، ظهر ادامه بده."),
    choice("study-exam", `مطالعه ${name}`, "درسی که امتحانشو داری رو بخون که اگه یهو برگزار شد شوکه نشی."),
  ];
}

export function getEveningChoices(answers) {
  const name = answers.nextExamName || "اون درس";
  const news = answers.examNews;
  const strength = answers.subjectStrength;

  if (news === "cancelled" && strength === "weak") {
    return [
      choice("review", `ادامه مرور ${name}`, "عصر هم روی همون درس تعویقی کار کن."),
      choice("rest", "استراحت", "یه استراحت واقعی."),
      choice("next-uncertain", "کار روی امتحانی که هنوز خبر رسمیش نیومده", "اگه توش ضعف داری، عصر برو سراغش."),
    ];
  }

  if (news === "cancelled" && strength === "ok") {
    return [
      choice("review", `ادامه مرور ${name}`, "عصر مرور درس تعویقی."),
      choice("rest", "استراحت", "یه استراحت واقعی."),
      choice("booklet-bio-math", "آزمون جامع تک‌دفترچه زیست و ریاضی", "بازیابی تستی."),
      choice("booklet-phys-chem", "آزمون جامع تک‌دفترچه فیزیک و شیمی", "بازیابی تستی."),
    ];
  }

  // noNews weak or ok
  return [
    choice("review", `ادامه مرور ${name}`, news === "noNews" ? "ادامه مرور همون امتحانی که داری." : `ادامه مرور ${name}.`),
    choice("rest", "استراحت", "یه استراحت واقعی."),
  ];
}

export function defaultAfternoonChoice(answers) {
  const list = getAfternoonChoices(answers);
  const current = answers.afternoonChoice;
  if (list.some((c) => c.id === current)) return current;
  return list[0]?.id || "review";
}

export function defaultEveningChoice(answers) {
  const list = getEveningChoices(answers);
  const current = answers.eveningChoice;
  if (list.some((c) => c.id === current)) return current;
  return list[0]?.id || "review";
}

/**
 * Resolve coaching suggestions for the current answers.
 */
export function resolveSuggestions(answers) {
  const subjectName = answers.nextExamName || "اون درس";
  const news = answers.examNews || "cancelled";
  const strength = answers.subjectStrength || "weak";
  const afternoon = defaultAfternoonChoice(answers);
  const evening = defaultEveningChoice(answers);

  if (news === "cancelled" && strength === "weak") {
    return buildDay({
      morning: morningStudy(subjectName, answers.nextExamId, true),
      afternoon: afternoonBlock(afternoon, subjectName, answers, "postponed"),
      evening: eveningBlock(evening, subjectName, answers, "postponed-weak"),
    });
  }

  if (news === "cancelled" && strength === "ok") {
    return buildDay({
      morning: morningMock(),
      afternoon: afternoonBlock(afternoon, subjectName, answers, "postponed-ok"),
      evening: eveningBlock(evening, subjectName, answers, "postponed-ok"),
    });
  }

  if (news === "noNews" && strength === "weak") {
    return buildDay({
      morning: morningStudy(subjectName, answers.nextExamId, false),
      afternoon: afternoonBlock(afternoon, subjectName, answers, "nonews"),
      evening: eveningBlock(evening, subjectName, answers, "nonews"),
    });
  }

  // noNews + ok
  return buildDay({
    morning: morningMock(),
    afternoon: afternoonBlock(afternoon, subjectName, answers, "nonews-ok"),
    evening: eveningBlock(evening, subjectName, answers, "nonews"),
  });
}

function buildDay({ morning, afternoon, evening }) {
  return [morning, afternoon, evening, nightRoutineSuggestion()].filter(Boolean);
}

function morningStudy(subjectName, subjectId, postponed) {
  return suggestion({
    id: postponed ? "morning-study-postponed" : "morning-study-exam",
    period: "morning",
    title: `صبح: مطالعه و مرور ${subjectName}`,
    body: postponed
      ? `مطالعه و مرور ${subjectName} — که اگه یهو برگزارش کردن غافلگیر نشی و یکم خونده باشی.`
      : `مطالعه و مرور ${subjectName} — که اگه یهو برگزارش کردن غافلگیر نشی و یکم خونده باشی.`,
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

function afternoonBlock(choiceId, subjectName, answers, _ctx) {
  if (choiceId === "continue-analysis") {
    return suggestion({
      id: "afternoon-continue-analysis",
      period: "afternoon",
      title: "ظهر: ادامه تحلیل آزمون",
      body: "ادامه تحلیل آزمون اگه تو پارت قبل تموم نشده.",
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

  if (choiceId === "booklet-bio-math") {
    return suggestion({
      id: "afternoon-booklet-bio-math",
      period: "afternoon",
      title: "ظهر: تک‌دفترچه زیست و ریاضی",
      body: `زدن آزمون جامع تک‌دفترچه زیست و ریاضی. ${BOOKLET_NOTE}`,
      blocks: bookletBlocks("زیست و ریاضی"),
    });
  }

  if (choiceId === "booklet-phys-chem") {
    return suggestion({
      id: "afternoon-booklet-phys-chem",
      period: "afternoon",
      title: "ظهر: تک‌دفترچه فیزیک و شیمی",
      body: `زدن آزمون جامع تک‌دفترچه فیزیک و شیمی. ${BOOKLET_NOTE}`,
      blocks: bookletBlocks("فیزیک و شیمی"),
    });
  }

  if (choiceId === "study-exam" || choiceId === "review") {
    const verb = choiceId === "study-exam" ? "مطالعه" : "ادامه مرور";
    return suggestion({
      id: `afternoon-${choiceId}`,
      period: "afternoon",
      title: `ظهر: ${verb} ${subjectName}`,
      body:
        choiceId === "study-exam"
          ? `مطالعه ${subjectName} برای اینکه اگه یهو برگزار شد شوکه نشی.`
          : `ادامه مرور ${subjectName}.`,
      blocks: continueReviewBlocks(answers.nextExamId, subjectName),
    });
  }

  return suggestion({
    id: "afternoon-review",
    period: "afternoon",
    title: `ظهر: ادامه مرور ${subjectName}`,
    body: `ادامه مرور ${subjectName}.`,
    blocks: continueReviewBlocks(answers.nextExamId, subjectName),
  });
}

function eveningBlock(choiceId, subjectName, answers, ctx) {
  if (choiceId === "rest") {
    return suggestion({
      id: "evening-rest",
      period: "evening",
      title: "عصر: استراحت",
      body: "استراحت کن؛ باتری‌ت رو پر کن.",
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

  if (choiceId === "next-uncertain") {
    const uncertainName = answers.nextHeldName || "امتحان بدون خبر رسمی";
    return suggestion({
      id: "evening-next-uncertain",
      period: "evening",
      title: `عصر: کار روی ${uncertainName}`,
      body: `کار کردن روی ${uncertainName} — امتحانی که هنوز خبر رسمیش نیومده و توش ضعف داری.`,
      blocks: continueReviewBlocks(answers.nextHeldId, uncertainName),
    });
  }

  if (choiceId === "booklet-bio-math") {
    return suggestion({
      id: "evening-booklet-bio-math",
      period: "evening",
      title: "عصر: تک‌دفترچه زیست و ریاضی",
      body: `زدن آزمون جامع تک‌دفترچه زیست و ریاضی. ${BOOKLET_NOTE}`,
      blocks: bookletBlocks("زیست و ریاضی"),
    });
  }

  if (choiceId === "booklet-phys-chem") {
    return suggestion({
      id: "evening-booklet-phys-chem",
      period: "evening",
      title: "عصر: تک‌دفترچه فیزیک و شیمی",
      body: `زدن آزمون جامع تک‌دفترچه فیزیک و شیمی. ${BOOKLET_NOTE}`,
      blocks: bookletBlocks("فیزیک و شیمی"),
    });
  }

  // review
  const label =
    ctx === "nonews" || ctx === "nonews-ok"
      ? `ادامه مرور ${subjectName}`
      : `ادامه مرور ${subjectName}`;
  return suggestion({
    id: "evening-review",
    period: "evening",
    title: `عصر: ${label}`,
    body: label + ".",
    blocks: continueReviewBlocks(answers.nextExamId, subjectName),
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

function choice(id, label, desc) {
  return { id, label, desc };
}

function suggestion({ id, period, title, body, blocks }) {
  return { id, period, title, body, blocks, selected: true };
}

export function getPeriod(periodId) {
  return PERIODS.find((p) => p.id === periodId) || PERIODS[0];
}

/** @deprecated use getAfternoonChoices — kept for settings labels */
export const AFTERNOON_CHOICES = {
  review: { id: "review", label: (n) => `ادامه مرور ${n}`, desc: "" },
  "booklet-bio-math": { id: "booklet-bio-math", label: () => "تک‌دفترچه زیست و ریاضی", desc: "" },
  "booklet-phys-chem": { id: "booklet-phys-chem", label: () => "تک‌دفترچه فیزیک و شیمی", desc: "" },
  "continue-analysis": { id: "continue-analysis", label: () => "ادامه تحلیل آزمون", desc: "" },
  "study-exam": { id: "study-exam", label: (n) => `مطالعه ${n}`, desc: "" },
};

export const EVENING_CHOICES = {
  review: { id: "review", label: (n) => `ادامه مرور ${n}`, desc: "" },
  rest: { id: "rest", label: () => "استراحت", desc: "" },
  "next-uncertain": { id: "next-uncertain", label: () => "امتحان بدون خبر رسمی", desc: "" },
  "booklet-bio-math": { id: "booklet-bio-math", label: () => "تک‌دفترچه زیست و ریاضی", desc: "" },
  "booklet-phys-chem": { id: "booklet-phys-chem", label: () => "تک‌دفترچه فیزیک و شیمی", desc: "" },
};

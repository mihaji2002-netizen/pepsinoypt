/**
 * Fluid day-plan flow — coaching paths → day parts (no clock times).
 */

/** @typedef {'morning'|'afternoon'|'evening'|'night'} PeriodId */
/** @typedef {'cancelled'|'noNews'} ExamNews */
/** @typedef {'weak'|'ok'} SubjectStrength */
/** @typedef {'review'|'booklet-bio-math'|'booklet-phys-chem'} AfternoonChoice */
/** @typedef {'review'|'rest'|'next-uncertain'} EveningChoice */

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
    desc: "پس برنامه رو جوری می‌چینیم که غافلگیر نشی.",
  },
  ok: {
    id: "ok",
    label: "اون‌قدرا ضعف ندارم، می‌تونم ببندمش",
    desc: "صبح تست، بعدش یه مرور روی درس تعویقی.",
  },
};

export const AFTERNOON_CHOICES = {
  review: {
    id: "review",
    label: (name) => `ادامه مرور ${name}`,
    desc: "همون درس تعویق‌خورده رو ظهر هم ادامه بده.",
  },
  "booklet-bio-math": {
    id: "booklet-bio-math",
    label: () => "آزمون جامع تک‌دفترچه زیست و ریاضی",
    desc: "برای اینکه کم‌کم اطلاعات تستیت برگرده.",
  },
  "booklet-phys-chem": {
    id: "booklet-phys-chem",
    label: () => "آزمون جامع تک‌دفترچه فیزیک و شیمی",
    desc: "برای اینکه کم‌کم اطلاعات تستیت برگرده.",
  },
};

export const EVENING_CHOICES = {
  review: {
    id: "review",
    label: (name) => `ادامه مرور ${name}`,
    desc: "عصر هم روی همون درس تعویقی کار کن.",
  },
  rest: {
    id: "rest",
    label: () => "استراحت",
    desc: "یه کم استراحت واقعی؛ موبایل شبکه‌اجتماعی نه.",
  },
  "next-uncertain": {
    id: "next-uncertain",
    label: () => "کار روی امتحانی که هنوز خبر رسمیش نیومده",
    desc: "اگه توش ضعف داری، عصر برو سراغش.",
  },
};

const BOOKLET_NOTE =
  "با درصدا خودتو قضاوت نکن. از آزمون‌های جامع برگزارشده امسال استفاده کن؛ اولویت با ماز و خیلی‌سبزه. اگه قبلاً زدیشون، الان مدارس برتر و گزینه‌دو.";

/**
 * Resolve coaching suggestions for the current answers.
 */
export function resolveSuggestions(answers) {
  const subjectName = answers.nextExamName || "اون درس";
  const grade = answers.grade ?? 12;
  const news = answers.examNews;
  const strength = answers.subjectStrength;

  if (news === "cancelled" && strength === "weak") {
    return weakPostponedSuggestions(answers, subjectName);
  }

  if (news === "cancelled" && strength === "ok") {
    return okPostponedSuggestions(answers, subjectName);
  }

  // noNews — هنوز متن کامل مربی نیومده؛ نسخه موقت خودمونی
  return noNewsSuggestions(answers, subjectName, grade);
}

function weakPostponedSuggestions(answers, subjectName) {
  const afternoon = answers.afternoonChoice || "review";
  const evening = answers.eveningChoice || "review";
  const uncertainName = answers.nextHeldName || "امتحان بدون خبر رسمی";

  const list = [
    suggestion({
      id: "weak-morning-postponed",
      period: "morning",
      title: `صبح: مطالعه و مرور ${subjectName}`,
      body: `مطالعه و مرور ${subjectName} — که اگه یهو برگزارش کردن غافلگیر نشی و یکم خونده باشی.`,
      blocks: [
        {
          blockId: "desc-core",
          durationMin: 70,
          subjectId: answers.nextExamId,
          subjectName,
          title: `مطالعه ${subjectName}`,
          desc: "عمیق عمیق لازم نیست؛ یه مرور درست حسابی که غافلگیر نشی.",
        },
        { blockId: "break-short", durationMin: 10 },
        {
          blockId: "desc-notes",
          durationMin: 45,
          subjectId: answers.nextExamId,
          subjectName,
          title: `مرور / خلاصه ${subjectName}`,
        },
      ],
    }),
  ];

  if (afternoon === "booklet-bio-math") {
    list.push(
      suggestion({
        id: "weak-afternoon-booklet-bio-math",
        period: "afternoon",
        title: "ظهر: تک‌دفترچه زیست و ریاضی",
        body: `زدن آزمون جامع تک‌دفترچه زیست و ریاضی. ${BOOKLET_NOTE}`,
        blocks: bookletBlocks("زیست و ریاضی"),
      })
    );
  } else if (afternoon === "booklet-phys-chem") {
    list.push(
      suggestion({
        id: "weak-afternoon-booklet-phys-chem",
        period: "afternoon",
        title: "ظهر: تک‌دفترچه فیزیک و شیمی",
        body: `زدن آزمون جامع تک‌دفترچه فیزیک و شیمی. ${BOOKLET_NOTE}`,
        blocks: bookletBlocks("فیزیک و شیمی"),
      })
    );
  } else {
    list.push(
      suggestion({
        id: "weak-afternoon-review",
        period: "afternoon",
        title: `ظهر: ادامه مرور ${subjectName}`,
        body: `ادامه مرور ${subjectName}.`,
        blocks: continueReviewBlocks(answers.nextExamId, subjectName),
      })
    );
  }

  if (evening === "rest") {
    list.push(
      suggestion({
        id: "weak-evening-rest",
        period: "evening",
        title: "عصر: استراحت",
        body: "استراحت کن؛ باتری‌ت رو پر کن.",
        blocks: [{ blockId: "break-long", durationMin: 60, title: "استراحت", desc: "بلند شو، راه برو، غذا بخور. اسکرول ممنوع." }],
      })
    );
  } else if (evening === "next-uncertain") {
    list.push(
      suggestion({
        id: "weak-evening-uncertain",
        period: "evening",
        title: `عصر: کار روی ${uncertainName}`,
        body: `کار کردن روی ${uncertainName} — امتحانی که هنوز خبر رسمیش نیومده و توش ضعف داری.`,
        blocks: continueReviewBlocks(answers.nextHeldId, uncertainName),
      })
    );
  } else {
    list.push(
      suggestion({
        id: "weak-evening-review",
        period: "evening",
        title: `عصر: ادامه مرور ${subjectName}`,
        body: `ادامه مرور ${subjectName}.`,
        blocks: continueReviewBlocks(answers.nextExamId, subjectName),
      })
    );
  }

  list.push(nightRoutineSuggestion());
  return list;
}

function okPostponedSuggestions(answers, subjectName) {
  return [
    suggestion({
      id: "ok-morning-mock",
      period: "morning",
      title: "صبح: آزمون جامع بزن",
      body: "صبح آزمون جامع بزن تا تست‌زدنت برگرده. تحلیل جوندار بکن و از پاسخنامه برو تو کتاب.",
      blocks: [
        {
          blockId: "maz-full",
          durationMin: 120,
          title: "آزمون جامع (ماز / خیلی‌سبز امسال)",
          desc: BOOKLET_NOTE,
        },
        { blockId: "break-short", durationMin: 15 },
        { blockId: "exam-analysis", durationMin: 50, title: "تحلیل جوندار" },
        { blockId: "answerkey-to-book", durationMin: 45, title: "از پاسخنامه برو تو کتاب" },
      ],
    }),
    suggestion({
      id: "ok-afternoon-postponed",
      period: "afternoon",
      title: `ظهر: مرور ${subjectName}`,
      body: `برای همون امتحانی که تعویق خورده (${subjectName}) بخون و یه مرور روش داشته باش.`,
      blocks: continueReviewBlocks(answers.nextExamId, subjectName),
    }),
    suggestion({
      id: "ok-evening-light",
      period: "evening",
      title: `عصر: یه مرور سبک‌تر از ${subjectName}`,
      body: "عصر دیگه فشار نذار؛ یه مرور سبک کافیه.",
      blocks: [
        {
          blockId: "desc-notes",
          durationMin: 40,
          subjectId: answers.nextExamId,
          subjectName,
          title: `مرور سبک ${subjectName}`,
        },
        { blockId: "break-long", durationMin: 40 },
      ],
    }),
    nightRoutineSuggestion(),
  ];
}

function noNewsSuggestions(answers, subjectName, grade) {
  return [
    suggestion({
      id: "nonews-morning-ready",
      period: "morning",
      title: `صبح: ${subjectName} رو سبک بخون`,
      body: "خبر رسمی نیومده؛ ولی بیکار نشین. یه دور سبک بخون که اگه یهو گفتن برگزاره، جا نمونی.",
      blocks: [
        { blockId: "warmup", durationMin: 15 },
        {
          blockId: "light-mixed",
          durationMin: 60,
          subjectId: answers.nextExamId,
          subjectName,
          title: `یه کم بخون، یه کم تست — ${subjectName}`,
        },
        { blockId: "break-short", durationMin: 10 },
        {
          blockId: "problem-set",
          durationMin: 55,
          subjectId: answers.nextExamId,
          subjectName,
          title: `چند تا سؤال از ${subjectName}`,
        },
      ],
    }),
    suggestion({
      id: "nonews-afternoon-flex",
      period: "afternoon",
      title: "ظهر: تست بزن، ولی نرم",
      body: `${BOOKLET_NOTE}`,
      blocks: [
        {
          blockId: "booklet-bio-math",
          durationMin: 90,
          title: "تک‌دفترچه یا آزمون جامع امسال",
          desc: BOOKLET_NOTE,
        },
        { blockId: "break-long", durationMin: 40 },
        { blockId: "exam-analysis", durationMin: 40, title: "یه تحلیل کوتاه" },
      ],
    }),
    suggestion({
      id: "nonews-evening-flex",
      period: "evening",
      title: grade === 11 ? "عصر: یه نگاه به دوازدهم" : `عصر: ادامه سبک ${subjectName}`,
      body: "برنامه رو سفت نبند؛ اگه خبر اومد بتونی جابه‌جا کنی.",
      blocks:
        grade === 11
          ? [{ blockId: "pre-read-12", durationMin: 40, title: "یه نگاه سبک به دوازدهم" }]
          : continueReviewBlocks(answers.nextExamId, subjectName).slice(0, 2),
    }),
    nightRoutineSuggestion(),
  ];
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

function suggestion({ id, period, title, body, blocks }) {
  return { id, period, title, body, blocks, selected: true };
}

export function getPeriod(periodId) {
  return PERIODS.find((p) => p.id === periodId) || PERIODS[0];
}

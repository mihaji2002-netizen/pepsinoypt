/**
 * Fluid day-plan flow: teacher coaching paths → selectable suggestions → time periods.
 */

/** @typedef {'morning'|'afternoon'|'evening'} PeriodId */
/** @typedef {'cancelled'|'noNews'} ExamNews */
/** @typedef {'weak'|'ok'} SubjectStrength */

export const PERIODS = [
  {
    id: "morning",
    label: "صبح تا ظهر",
    hint: "تقریباً ۸ تا ۱۲",
    startTime: "08:00",
    defaultMin: 180,
  },
  {
    id: "afternoon",
    label: "ظهر تا عصر",
    hint: "تقریباً ۱۳ تا ۱۷",
    startTime: "13:00",
    defaultMin: 180,
  },
  {
    id: "evening",
    label: "عصر تا شب",
    hint: "تقریباً ۱۸ تا ۲۲",
    startTime: "18:00",
    defaultMin: 120,
  },
];

export const EXAM_NEWS = {
  cancelled: {
    id: "cancelled",
    label: "کنسل / تعویق شده",
    desc: "امتحان بعدی رسماً جابه‌جا یا کنسل شده.",
  },
  noNews: {
    id: "noNews",
    label: "هنوز خبر رسمی‌ای نیومده",
    desc: "تاریخ قطعی معلوم نیست؛ برنامه باید انعطاف‌پذیر بماند.",
  },
};

export const SUBJECT_STRENGTH = {
  weak: {
    id: "weak",
    label: "این درس رو ضعیفم",
    desc: "اولویت با مرور و جبران همین درس تعویق‌خورده است.",
  },
  ok: {
    id: "ok",
    label: "اون‌قدرا ضعف ندارم، می‌تونم ببندمش",
    desc: "صبح روی تست و آزمون جامع، بعدازظهر مرور سبک همان درس.",
  },
};

/**
 * Resolve coaching suggestions for the current answers.
 * Each suggestion maps to one day period and expands into concrete study blocks.
 */
export function resolveSuggestions(answers) {
  const subjectName = answers.nextExamName || "درس انتخاب‌شده";
  const grade = answers.grade ?? 12;
  const field = answers.field || "exp";
  const news = answers.examNews;
  const strength = answers.subjectStrength;
  const nextHeldWeak = Boolean(answers.nextHeldWeak);
  const nextHeldName = answers.nextHeldName || "امتحان بعدی برگزارشدنی";

  if (news === "cancelled" && strength === "ok") {
    return [
      suggestion({
        id: "ok-morning-mock",
        period: "morning",
        title: "صبح: آزمون جامع + تحلیل جوندار",
        body: "آزمون جامع بزن، تحلیل جدی انجام بده و مدام از پاسخنامه به کتاب برگرد.",
        blocks: mockMorningBlocks(),
      }),
      suggestion({
        id: "ok-afternoon-postponed",
        period: "afternoon",
        title: `ظهر تا عصر: مرور ${subjectName}`,
        body: `برای امتحانی که تعویق خورده (${subjectName}) بخون و سعی کن یک مرور جمع‌وجور داشته باشی.`,
        blocks: [
          {
            blockId: "desc-core",
            durationMin: 70,
            subjectId: answers.nextExamId,
            subjectName,
            title: `مرور کلی — ${subjectName}`,
            desc: "نیازی به بستن خیلی عمیق نیست؛ هدف تثبیت و جمع‌بندی است.",
          },
          {
            blockId: "problem-set",
            durationMin: 55,
            subjectId: answers.nextExamId,
            subjectName,
            title: `تمرین تشریحی — ${subjectName}`,
          },
          { blockId: "break-long", durationMin: 40 },
          {
            blockId: "desc-notes",
            durationMin: 40,
            subjectId: answers.nextExamId,
            subjectName,
            title: `نقشهٔ مفهومی — ${subjectName}`,
          },
        ],
      }),
      suggestion({
        id: "ok-evening-memory",
        period: "evening",
        title: "عصر تا شب: حفظیات شیمی + گیاهی",
        body: "روتین آخرشب: جزوهٔ حفظیات شیمی استادت را مرور کن + گیاهی.",
        blocks: eveningMemoryBlocks(field),
      }),
    ];
  }

  if (news === "cancelled" && strength === "weak") {
    const mid = nextHeldWeak
      ? suggestion({
          id: "weak-afternoon-next-held",
          period: "afternoon",
          title: `ظهر تا عصر: کار روی ${nextHeldName}`,
          body: "اگر امتحان بعدی‌ای که قراره برگزار بشه رو ضعیفی، همان را جدی کار کن.",
          blocks: [
            {
              blockId: "desc-core",
              durationMin: 70,
              subjectId: answers.nextHeldId || null,
              subjectName: nextHeldName,
              title: `مطالعهٔ تشریحی — ${nextHeldName}`,
            },
            {
              blockId: "problem-set",
              durationMin: 55,
              subjectId: answers.nextHeldId || null,
              subjectName: nextHeldName,
            },
            { blockId: "break-long", durationMin: 35 },
            {
              blockId: "test-targeted",
              durationMin: 45,
              subjectId: answers.nextHeldId || null,
              subjectName: nextHeldName,
              title: `تست کنترلی — ${nextHeldName}`,
            },
          ],
        })
      : suggestion({
          id: "weak-afternoon-tests",
          period: "afternoon",
          title: "ظهر تا عصر: تست و آزمون جامع",
          body:
            "امتحان بعدی را ضعیف نیستی → برو سراغ تست. بهترین پیشنهاد: آزمون جامع ماز / خیلی‌سبزهای امسال؛ اگر زدی مدارس برتر؛ اگر وقت کم است یک تک‌دفترچه فیزیک / شیمی / زیست / ریاضی.",
          blocks: flexibleTestBlocks(grade, field),
        });

    return [
      suggestion({
        id: "weak-morning-postponed",
        period: "morning",
        title: `صبح: اولویت با ${subjectName} (مرور کلی)`,
        body: "اولویت اینه که درس تعویق‌خورده را بخوانی. لازم نیست خیلییییی قوی ببندی‌اش — در حد یک مرور کلی.",
        blocks: [
          {
            blockId: "desc-core",
            durationMin: 60,
            subjectId: answers.nextExamId,
            subjectName,
            title: `مرور کلی — ${subjectName}`,
            desc: "پوشش سرفصل‌ها و نکات اصلی؛ بدون وسواس کامل‌کردن.",
          },
          { blockId: "break-short", durationMin: 10 },
          {
            blockId: "desc-notes",
            durationMin: 45,
            subjectId: answers.nextExamId,
            subjectName,
            title: `خلاصه‌سازی — ${subjectName}`,
          },
          {
            blockId: "light-mixed",
            durationMin: 50,
            subjectId: answers.nextExamId,
            subjectName,
            title: `مرور + چند تست کنترلی — ${subjectName}`,
          },
        ],
      }),
      mid,
      suggestion({
        id: "weak-evening-memory",
        period: "evening",
        title: "عصر تا شب: روتین حفظیات",
        body:
          field === "exp"
            ? "جزوهٔ حفظیات شیمی + مرور کوتاه گیاهی / زیست حفظی."
            : "جزوهٔ حفظیات شیمی + مرور کوتاه حفظیات عمومی.",
        blocks: eveningMemoryBlocks(field),
      }),
    ];
  }

  // noNews — flexible holding pattern
  return [
    suggestion({
      id: "nonews-morning-ready",
      period: "morning",
      title: `صبح: آماده‌باش برای ${subjectName}`,
      body: "خبر رسمی نیست؛ درس را سبک اما منسجم مرور کن تا اگر فردا برگزار شد غافلگیر نشوی.",
      blocks: [
        {
          blockId: "warmup",
          durationMin: 15,
        },
        {
          blockId: "light-mixed",
          durationMin: 60,
          subjectId: answers.nextExamId,
          subjectName,
          title: `بلوک دوکاره — ${subjectName}`,
        },
        { blockId: "break-short", durationMin: 10 },
        {
          blockId: "problem-set",
          durationMin: 55,
          subjectId: answers.nextExamId,
          subjectName,
        },
      ],
    }),
    suggestion({
      id: "nonews-afternoon-flex",
      period: "afternoon",
      title: "ظهر تا عصر: تست انعطاف‌پذیر",
      body: "نیمی از وقت روی تست هدفمند، نیمی روی آزمون کوتاه یا بانک غلط‌ها — تا برنامه با خبر جدید جابه‌جا شود.",
      blocks: [
        {
          blockId: "kheili-sabz",
          durationMin: 70,
          subjectId: answers.nextExamId,
          subjectName,
        },
        { blockId: "break-long", durationMin: 40 },
        {
          blockId: "test-wrong-bank",
          durationMin: 40,
          subjectId: answers.nextExamId,
          subjectName,
        },
        grade === 11
          ? {
              blockId: "pre-read-12",
              durationMin: 40,
              title: "پیش‌خوانی سبک دوازدهم",
            }
          : {
              blockId: "gozine2",
              durationMin: 70,
            },
      ],
    }),
    suggestion({
      id: "nonews-evening-memory",
      period: "evening",
      title: "عصر تا شب: حفظیات پایدار",
      body: "روتین شبانه حفظیات را قطع نکن؛ مستقل از خبر امتحان می‌ماند.",
      blocks: eveningMemoryBlocks(field),
    }),
  ];
}

function suggestion({ id, period, title, body, blocks }) {
  return { id, period, title, body, blocks, selected: true };
}

function mockMorningBlocks() {
  return [
    {
      blockId: "maz-full",
      durationMin: 120,
      title: "آزمون جامع (ماز / خیلی‌سبز امسال)",
      desc: "اگر ماز و خیلی‌سبز امسال را زدی، مدارس برتر بزن. وقت کم بود: یک تک‌دفترچه.",
    },
    { blockId: "break-short", durationMin: 15 },
    {
      blockId: "exam-analysis",
      durationMin: 50,
      title: "تحلیل جوندار آزمون",
    },
    {
      blockId: "answerkey-to-book",
      durationMin: 45,
      title: "از پاسخنامه به کتاب",
      desc: "مدام از پاسخنامه به کتاب برگرد؛ هر غلط یک نکته.",
    },
  ];
}

function flexibleTestBlocks(grade, field) {
  const booklet =
    field === "exp"
      ? "تک‌دفترچه فیزیک / شیمی / زیست / ریاضی"
      : "تک‌دفترچه فیزیک / شیمی / حسابان / گسسته";
  return [
    {
      blockId: grade === 12 ? "maz-full" : "gozine2",
      durationMin: grade === 12 ? 120 : 80,
      title: grade === 12 ? "آزمون جامع ماز / خیلی‌سبز" : "آزمون زمان‌دار",
      desc: `اگر این‌ها را زدی مدارس برتر؛ وقت کم: ${booklet}.`,
    },
    { blockId: "break-short", durationMin: 15 },
    { blockId: "exam-analysis", durationMin: 45 },
    { blockId: "answerkey-to-book", durationMin: 40 },
  ];
}

function eveningMemoryBlocks(field) {
  const blocks = [
    {
      blockId: "chem-hafziat",
      durationMin: 40,
      subjectId: "chem",
      subjectName: "شیمی",
      title: "مرور جزوهٔ حفظیات شیمی استاد",
    },
  ];
  if (field === "exp") {
    blocks.push({
      blockId: "bio-giyahi-summary",
      durationMin: 45,
      subjectId: "bio",
      subjectName: "زیست‌شناسی",
      title: "مرور / خلاصه گیاهی",
    });
  } else {
    blocks.push({
      blockId: "memory-night",
      durationMin: 30,
      title: "مرور شبانه حفظیات عمومی",
    });
  }
  return blocks;
}

export function getPeriod(periodId) {
  return PERIODS.find((p) => p.id === periodId) || PERIODS[0];
}

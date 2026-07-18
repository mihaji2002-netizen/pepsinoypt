/**
 * Fluid day-plan flow: teacher coaching paths → selectable suggestions → day parts.
 * No clock scheduling — only morning / afternoon / evening buckets.
 */

/** @typedef {'morning'|'afternoon'|'evening'} PeriodId */
/** @typedef {'cancelled'|'noNews'} ExamNews */
/** @typedef {'weak'|'ok'} SubjectStrength */

export const PERIODS = [
  { id: "morning", label: "صبح تا ظهر" },
  { id: "afternoon", label: "ظهر تا عصر" },
  { id: "evening", label: "عصر تا شب" },
];

export const EXAM_NEWS = {
  cancelled: {
    id: "cancelled",
    label: "کنسل شده / تعویق خورده",
    desc: "یعنی این امتحان فعلاً برگزار نمی‌شه.",
  },
  noNews: {
    id: "noNews",
    label: "هنوز خبر رسمی‌ای نیومده",
    desc: "هنوز معلوم نیست برگزار می‌شه یا نه؛ برنامه باید نرم باشه.",
  },
};

export const SUBJECT_STRENGTH = {
  weak: {
    id: "weak",
    label: "این درس رو ضعیفم",
    desc: "پس اول بریم سراغ همین درس تعویق‌خورده.",
  },
  ok: {
    id: "ok",
    label: "اون‌قدرا ضعف ندارم، می‌تونم ببندمش",
    desc: "صبح تست و آزمون، بعدازظهر یه مرور روش بذار.",
  },
};

/**
 * Resolve coaching suggestions for the current answers.
 * Each suggestion maps to one day part and expands into concrete study blocks.
 */
export function resolveSuggestions(answers) {
  const subjectName = answers.nextExamName || "اون درس";
  const grade = answers.grade ?? 12;
  const field = answers.field || "exp";
  const news = answers.examNews;
  const strength = answers.subjectStrength;
  const nextHeldWeak = Boolean(answers.nextHeldWeak);
  const nextHeldName = answers.nextHeldName || "امتحان بعدی‌ای که برگزار می‌شه";

  if (news === "cancelled" && strength === "ok") {
    return [
      suggestion({
        id: "ok-morning-mock",
        period: "morning",
        title: "صبح تا ظهر: آزمون جامع بزن",
        body: "صبح یه آزمون جامع بزن و باهاش تست‌زدنت رو برگردون. تحلیل جوندار بکن و مدام از پاسخنامه برو تو کتاب.",
        blocks: mockMorningBlocks(),
      }),
      suggestion({
        id: "ok-afternoon-postponed",
        period: "afternoon",
        title: `ظهر تا عصر: یه مرور روی ${subjectName}`,
        body: `بعدازظهر برای همون امتحانی که تعویق خورده (${subjectName}) بخون و سعی کن یه مرور روش داشته باشی.`,
        blocks: [
          {
            blockId: "desc-core",
            durationMin: 70,
            subjectId: answers.nextExamId,
            subjectName,
            title: `مرور ${subjectName}`,
            desc: "عمیق عمیق لازم نیست؛ یه مرور تمیز که خیالت راحت شه.",
          },
          {
            blockId: "problem-set",
            durationMin: 55,
            subjectId: answers.nextExamId,
            subjectName,
            title: `چند تا سؤال تشریحی از ${subjectName}`,
          },
          { blockId: "break-long", durationMin: 40 },
          {
            blockId: "desc-notes",
            durationMin: 40,
            subjectId: answers.nextExamId,
            subjectName,
            title: `یه صفحه خلاصه از ${subjectName}`,
          },
        ],
      }),
      suggestion({
        id: "ok-evening-memory",
        period: "evening",
        title: "عصر تا شب: حفظیات شیمی + گیاهی",
        body: "آخر شب روتینت این باشه: جزوه حفظیات شیمی استادت رو مرور کن + گیاهی.",
        blocks: eveningMemoryBlocks(field),
      }),
    ];
  }

  if (news === "cancelled" && strength === "weak") {
    const mid = nextHeldWeak
      ? suggestion({
          id: "weak-afternoon-next-held",
          period: "afternoon",
          title: `ظهر تا عصر: برو سراغ ${nextHeldName}`,
          body: "اگه امتحان بعدی‌ای که قراره برگزار بشه رو ضعیفی، همون رو کار کن.",
          blocks: [
            {
              blockId: "desc-core",
              durationMin: 70,
              subjectId: answers.nextHeldId || null,
              subjectName: nextHeldName,
              title: `بخونش: ${nextHeldName}`,
            },
            {
              blockId: "problem-set",
              durationMin: 55,
              subjectId: answers.nextHeldId || null,
              subjectName: nextHeldName,
              title: `تمرین از ${nextHeldName}`,
            },
            { blockId: "break-long", durationMin: 35 },
            {
              blockId: "test-targeted",
              durationMin: 45,
              subjectId: answers.nextHeldId || null,
              subjectName: nextHeldName,
              title: `چند تا تست از ${nextHeldName}`,
            },
          ],
        })
      : suggestion({
          id: "weak-afternoon-tests",
          period: "afternoon",
          title: "ظهر تا عصر: برو تست بزن",
          body:
            "امتحان بعدی‌ای که داری رو ضعیف نیستی؟ پس برو سراغ تست. بهترین پیشنهاد: یه آزمون جامع (ماز و خیلی‌سبزهایی که امسال برگزار شده). اینا رو زدی؟ مدارس برتر بزن. وقتت کمه؟ یه تک‌دفترچه فیزیک یا شیمی یا زیست یا ریاضی.",
          blocks: flexibleTestBlocks(grade, field),
        });

    return [
      suggestion({
        id: "weak-morning-postponed",
        period: "morning",
        title: `صبح تا ظهر: اول ${subjectName} رو بخون`,
        body: "اولویت اینه که همون درسی که تعویق خورده رو بخونی. نیاز نیست خیلییییی قوی ببندیش — در حد یه مرور کلی.",
        blocks: [
          {
            blockId: "desc-core",
            durationMin: 60,
            subjectId: answers.nextExamId,
            subjectName,
            title: `مرور کلی ${subjectName}`,
            desc: "سرفصل‌ها و نکته‌های اصلی رو رد شو؛ وسواس کامل‌کردن ممنوع.",
          },
          { blockId: "break-short", durationMin: 10 },
          {
            blockId: "desc-notes",
            durationMin: 45,
            subjectId: answers.nextExamId,
            subjectName,
            title: `یه خلاصه کوچیک از ${subjectName}`,
          },
          {
            blockId: "light-mixed",
            durationMin: 50,
            subjectId: answers.nextExamId,
            subjectName,
            title: `مرور + چند تا تست سبک از ${subjectName}`,
          },
        ],
      }),
      mid,
      suggestion({
        id: "weak-evening-memory",
        period: "evening",
        title: "عصر تا شب: حفظیات",
        body:
          field === "exp"
            ? "آخر شب: جزوه حفظیات شیمی استادت + یه کم گیاهی."
            : "آخر شب: جزوه حفظیات شیمی استادت + یه کم حفظیات.",
        blocks: eveningMemoryBlocks(field),
      }),
    ];
  }

  // noNews
  return [
    suggestion({
      id: "nonews-morning-ready",
      period: "morning",
      title: `صبح تا ظهر: ${subjectName} رو سبک بخون`,
      body: "خبر رسمی نیومده؛ ولی بیکار نشین. همون درس رو یه دور سبک بخون که اگه فردا گفتن برگزاره، جا نمونی.",
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
      title: "ظهر تا عصر: تست بزن، ولی نرم",
      body: "یه کم تست هدفمند، یه کم غلط‌های قبلی. برنامه رو سفت نبند که اگه خبر اومد بتونی جابه‌جا کنی.",
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
              title: "یه نگاه سبک به دوازدهم",
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
      title: "عصر تا شب: حفظیاتت رو قطع نکن",
      body: "خبر امتحان هر چی باشه، حفظیات شبانه رو ول نکن.",
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
      desc: "ماز و خیلی‌سبز امسال رو زدی؟ برو مدارس برتر. وقتت کمه؟ یه تک‌دفترچه بزن.",
    },
    { blockId: "break-short", durationMin: 15 },
    {
      blockId: "exam-analysis",
      durationMin: 50,
      title: "تحلیل جوندار",
      desc: "سرسری رد نشو؛ ببین کجاها گیر کردی.",
    },
    {
      blockId: "answerkey-to-book",
      durationMin: 45,
      title: "از پاسخنامه برو تو کتاب",
      desc: "هر غلطی دیدی، برگرد کتاب و همون قسمت رو ببند.",
    },
  ];
}

function flexibleTestBlocks(grade, field) {
  const booklet =
    field === "exp"
      ? "فیزیک یا شیمی یا زیست یا ریاضی"
      : "فیزیک یا شیمی یا حسابان یا گسسته";
  return [
    {
      blockId: grade === 12 ? "maz-full" : "gozine2",
      durationMin: grade === 12 ? 120 : 80,
      title: grade === 12 ? "آزمون جامع ماز / خیلی‌سبز" : "یه آزمون زمان‌دار",
      desc: `اینا رو زدی؟ مدارس برتر. وقتت کمه؟ یه تک‌دفترچه ${booklet}.`,
    },
    { blockId: "break-short", durationMin: 15 },
    {
      blockId: "exam-analysis",
      durationMin: 45,
      title: "تحلیل جوندار",
    },
    {
      blockId: "answerkey-to-book",
      durationMin: 40,
      title: "از پاسخنامه برو تو کتاب",
    },
  ];
}

function eveningMemoryBlocks(field) {
  const blocks = [
    {
      blockId: "chem-hafziat",
      durationMin: 40,
      subjectId: "chem",
      subjectName: "شیمی",
      title: "جزوه حفظیات شیمی استادت",
      desc: "فقط حفظیات؛ مسئله نزن.",
    },
  ];
  if (field === "exp") {
    blocks.push({
      blockId: "bio-giyahi-summary",
      durationMin: 45,
      subjectId: "bio",
      subjectName: "زیست‌شناسی",
      title: "گیاهی",
      desc: "یه دور گیاهی رو مرور کن.",
    });
  } else {
    blocks.push({
      blockId: "memory-night",
      durationMin: 30,
      title: "یه کم حفظیات آخر شب",
    });
  }
  return blocks;
}

export function getPeriod(periodId) {
  return PERIODS.find((p) => p.id === periodId) || PERIODS[0];
}

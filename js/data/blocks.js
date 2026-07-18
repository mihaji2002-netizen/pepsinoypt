/**
 * Catalog of reusable study blocks.
 * type: study | test | review | exam | break | foundation | analysis
 * mode: descriptive | test | mixed
 */

export const BLOCK_CATALOG = {
  // ——— آزمون و سنجش ———
  "maz-full": {
    id: "maz-full",
    title: "آزمون جامع ماز",
    desc: "شبیه‌سازی کامل زمان‌دار؛ بعد از آزمون فقط علامت‌گذاری شک‌ها.",
    type: "exam",
    mode: "test",
    defaultMin: 180,
    tags: ["exam", "maz", "full"],
  },
  "kheili-sabz": {
    id: "kheili-sabz",
    title: "کار روی خیلی سبز",
    desc: "حل هدفمند فصل جاری؛ اولویت با تست‌های نشان‌دار و خطادار.",
    type: "test",
    mode: "test",
    defaultMin: 75,
    tags: ["test", "resource"],
  },
  "gozine2": {
    id: "gozine2",
    title: "آزمون‌های گزینه‌دو",
    desc: "یک مجموعه زمان‌دار گزینه‌دو با ثبت درصد و تحلیل فوری اشتباهات.",
    type: "exam",
    mode: "test",
    defaultMin: 90,
    tags: ["exam", "gozine2"],
  },
  "madares-bartar": {
    id: "madares-bartar",
    title: "آزمون مدارس برتر",
    desc: "مجموعه سخت‌تر برای تثبیت سطح؛ تمرکز روی مدیریت زمان.",
    type: "exam",
    mode: "test",
    defaultMin: 100,
    tags: ["exam", "hard"],
  },
  "exam-analysis": {
    id: "exam-analysis",
    title: "تحلیل آزمون",
    desc: "دسته‌بندی غلط / نزده / شک‌دار؛ استخراج الگوی خطا و برنامه جبران.",
    type: "analysis",
    mode: "mixed",
    defaultMin: 60,
    tags: ["analysis", "mandatory-after-exam"],
  },
  "answerkey-to-book": {
    id: "answerkey-to-book",
    title: "برگشت از پاسخنامه به کتاب",
    desc: "برای هر غلط: صفحه کتاب درسی → نکته → یک تست مشابه.",
    type: "review",
    mode: "mixed",
    defaultMin: 45,
    tags: ["review", "deep"],
  },

  // ——— شیمی / زیست ———
  "chem-hafziat": {
    id: "chem-hafziat",
    title: "مرور جزوه حفظیات شیمی استاد",
    desc: "فقط حفظیات و استثناها؛ بدون حل مسئله در این بلوک.",
    type: "review",
    mode: "descriptive",
    defaultMin: 40,
    tags: ["chem", "memory"],
    subjectHint: "chem",
  },
  "bio-giyahi-summary": {
    id: "bio-giyahi-summary",
    title: "خلاصه‌نویسی گیاهی",
    desc: "جدول مقایسه چرخه/آوند/هورمون؛ خروجی یک صفحه خلاصه قابل مرور.",
    type: "study",
    mode: "descriptive",
    defaultMin: 50,
    tags: ["bio", "summary"],
    subjectHint: "bio",
  },

  // ——— پایه و پیش‌خوانی ———
  "pre-read-12": {
    id: "pre-read-12",
    title: "پیش‌خوانی دروس دوازدهم",
    desc: "مرور سرفصل و تعاریف فصل بعد؛ بدون فشار تست.",
    type: "study",
    mode: "descriptive",
    defaultMin: 40,
    tags: ["pre-read", "grade12"],
  },
  "catchup-10": {
    id: "catchup-10",
    title: "جبران پایه دهم",
    desc: "مفاهیم پیش‌نیاز دهم مرتبط با فصل جاری؛ مثال + ۲ تست کنترلی.",
    type: "foundation",
    mode: "descriptive",
    defaultMin: 55,
    tags: ["foundation", "grade10"],
  },

  // ——— بلوک‌های عمومی ———
  "desc-core": {
    id: "desc-core",
    title: "مطالعه تشریحی کتاب درسی",
    desc: "خواندن دقیق + حاشیه + پرسش از متن.",
    type: "study",
    mode: "descriptive",
    defaultMin: 60,
    tags: ["core", "descriptive"],
  },
  "desc-notes": {
    id: "desc-notes",
    title: "جزوه‌نویسی / نقشه مفهومی",
    desc: "تبدیل متن به ساختار قابل مرور سریع.",
    type: "study",
    mode: "descriptive",
    defaultMin: 45,
    tags: ["notes"],
  },
  "test-targeted": {
    id: "test-targeted",
    title: "تست هدفمند فصل",
    desc: "۲۵ تا ۴۰ تست با درصدگیری و علامت‌گذاری.",
    type: "test",
    mode: "test",
    defaultMin: 50,
    tags: ["test", "core"],
  },
  "test-wrong-bank": {
    id: "test-wrong-bank",
    title: "بانک غلط‌ها",
    desc: "فقط تست‌های غلط و شک‌دار قبلی؛ بدون تست جدید.",
    type: "review",
    mode: "test",
    defaultMin: 35,
    tags: ["review", "wrong"],
  },
  "memory-night": {
    id: "memory-night",
    title: "مرور شبانه حفظیات",
    desc: "مرور کوتاه دینی / ادبیات / زیست حفظی قبل از خواب.",
    type: "review",
    mode: "descriptive",
    defaultMin: 25,
    tags: ["memory", "night"],
  },
  "problem-set": {
    id: "problem-set",
    title: "حل تشریحی مسئله",
    desc: "مسائل کتاب و نمونه سؤالات نهایی با نوشتن کامل پاسخ.",
    type: "study",
    mode: "descriptive",
    defaultMin: 55,
    tags: ["problem", "final-exam"],
  },
  "final-drill": {
    id: "final-drill",
    title: "تمرین امتحان نهایی",
    desc: "نمونه سؤال نهایی زمان‌دار با معیار تصحیح تشریحی.",
    type: "exam",
    mode: "descriptive",
    defaultMin: 70,
    tags: ["final", "descriptive"],
  },
  "light-mixed": {
    id: "light-mixed",
    title: "بلوک دوکاره (تشریحی + تست سبک)",
    desc: "نیمه‌اول مفهوم، نیمه‌دوم ۵ تا ۱۰ تست کنترلی.",
    type: "study",
    mode: "mixed",
    defaultMin: 50,
    tags: ["flexible", "uncertain"],
  },
  "break-short": {
    id: "break-short",
    title: "استراحت کوتاه",
    desc: "دور از میز؛ بدون گوشی شبکه‌اجتماعی.",
    type: "break",
    mode: "mixed",
    defaultMin: 10,
    tags: ["break"],
  },
  "break-long": {
    id: "break-long",
    title: "استراحت بلند / وعده غذایی",
    desc: "وعده + پیاده‌روی کوتاه.",
    type: "break",
    mode: "mixed",
    defaultMin: 40,
    tags: ["break", "meal"],
  },
  "warmup": {
    id: "warmup",
    title: "گرم‌کردن روز",
    desc: "مرور سریع برنامه روز و یک صفحه خلاصه دیروز.",
    type: "review",
    mode: "mixed",
    defaultMin: 15,
    tags: ["warmup"],
  },
};

export function getBlock(id) {
  return BLOCK_CATALOG[id] || null;
}

export function cloneBlock(id, overrides = {}) {
  const base = getBlock(id);
  if (!base) throw new Error(`Unknown block: ${id}`);
  return {
    ...base,
    instanceId: `${id}-${Math.random().toString(36).slice(2, 9)}`,
    durationMin: overrides.durationMin ?? base.defaultMin,
    subjectId: overrides.subjectId ?? base.subjectHint ?? null,
    subjectName: overrides.subjectName ?? null,
    title: overrides.title ?? base.title,
    desc: overrides.desc ?? base.desc,
    done: false,
    ...overrides,
  };
}

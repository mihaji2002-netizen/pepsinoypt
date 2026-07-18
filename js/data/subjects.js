/** @typedef {'11-exp'|'11-math'|'12-exp'|'12-math'} TrackId */
/** @typedef {'weak'|'mid'|'strong'} Level */
/** @typedef {'normal'|'postponed'|'uncertain'} ExamStatus */

export const TRACKS = {
  "11-exp": {
    id: "11-exp",
    grade: 11,
    field: "exp",
    label: "یازدهم تجربی",
    subjects: [
      { id: "bio", name: "زیست‌شناسی", weight: 3, type: "memory" },
      { id: "chem", name: "شیمی", weight: 2.5, type: "mixed" },
      { id: "phys", name: "فیزیک", weight: 2, type: "problem" },
      { id: "math", name: "ریاضی", weight: 2, type: "problem" },
      { id: "geo", name: "زمین‌شناسی", weight: 1, type: "memory" },
      { id: "fa", name: "فارسی", weight: 1.2, type: "memory" },
      { id: "ar", name: "عربی", weight: 1, type: "memory" },
      { id: "rel", name: "دینی", weight: 1, type: "memory" },
      { id: "en", name: "زبان انگلیسی", weight: 1, type: "memory" },
    ],
  },
  "11-math": {
    id: "11-math",
    grade: 11,
    field: "math",
    label: "یازدهم ریاضی",
    subjects: [
      { id: "calc", name: "حسابان", weight: 3, type: "problem" },
      { id: "geom", name: "هندسه", weight: 2, type: "problem" },
      { id: "stat", name: "آمار و احتمال", weight: 1.5, type: "problem" },
      { id: "phys", name: "فیزیک", weight: 2.5, type: "problem" },
      { id: "chem", name: "شیمی", weight: 2, type: "mixed" },
      { id: "disc", name: "گسسته", weight: 1.5, type: "problem" },
      { id: "fa", name: "فارسی", weight: 1.2, type: "memory" },
      { id: "ar", name: "عربی", weight: 1, type: "memory" },
      { id: "rel", name: "دینی", weight: 1, type: "memory" },
      { id: "en", name: "زبان انگلیسی", weight: 1, type: "memory" },
    ],
  },
  "12-exp": {
    id: "12-exp",
    grade: 12,
    field: "exp",
    label: "دوازدهم تجربی",
    subjects: [
      { id: "bio", name: "زیست‌شناسی", weight: 3.5, type: "memory" },
      { id: "chem", name: "شیمی", weight: 3, type: "mixed" },
      { id: "phys", name: "فیزیک", weight: 2.5, type: "problem" },
      { id: "math", name: "ریاضی", weight: 2, type: "problem" },
      { id: "fa", name: "فارسی", weight: 1.3, type: "memory" },
      { id: "ar", name: "عربی", weight: 1.1, type: "memory" },
      { id: "rel", name: "دینی", weight: 1.1, type: "memory" },
      { id: "en", name: "زبان انگلیسی", weight: 1.1, type: "memory" },
      { id: "hs", name: "سلامت و بهداشت", weight: 0.6, type: "memory" },
      { id: "identity", name: "هویت اجتماعی", weight: 0.5, type: "memory" },
    ],
  },
  "12-math": {
    id: "12-math",
    grade: 12,
    field: "math",
    label: "دوازدهم ریاضی",
    subjects: [
      { id: "calc", name: "حسابان", weight: 3.5, type: "problem" },
      { id: "geom", name: "هندسه", weight: 2, type: "problem" },
      { id: "disc", name: "گسسته", weight: 2, type: "problem" },
      { id: "phys", name: "فیزیک", weight: 3, type: "problem" },
      { id: "chem", name: "شیمی", weight: 2.2, type: "mixed" },
      { id: "fa", name: "فارسی", weight: 1.3, type: "memory" },
      { id: "ar", name: "عربی", weight: 1.1, type: "memory" },
      { id: "rel", name: "دینی", weight: 1.1, type: "memory" },
      { id: "en", name: "زبان انگلیسی", weight: 1.1, type: "memory" },
      { id: "hs", name: "سلامت و بهداشت", weight: 0.6, type: "memory" },
    ],
  },
};

export const LEVELS = {
  weak: { id: "weak", label: "ضعیف", focusDescriptiveBoost: 0.15, foundationPriority: 1 },
  mid: { id: "mid", label: "متوسط", focusDescriptiveBoost: 0.05, foundationPriority: 0.5 },
  strong: { id: "strong", label: "قوی", focusDescriptiveBoost: -0.05, foundationPriority: 0.15 },
};

export const EXAM_STATUSES = {
  normal: {
    id: "normal",
    label: "برنامه عادی امتحانات",
    desc: "تاریخ‌ها مشخص‌اند؛ برنامه روی مرور نهایی و آزمون می‌چرخد.",
  },
  postponed: {
    id: "postponed",
    label: "امتحانات تعویق‌شده",
    desc: "فرصت جبران پایه و تثستن تشریحی بیشتر است.",
  },
  uncertain: {
    id: "uncertain",
    label: "وضعیت نامشخص",
    desc: "برنامه انعطاف‌پذیر با بلوک‌های دوکاره (تشریحی + تستی سبک).",
  },
};

export const RATIOS = [
  { id: "80-20", descriptive: 0.8, test: 0.2, label: "۸۰٪ تشریحی / ۲۰٪ تستی" },
  { id: "70-30", descriptive: 0.7, test: 0.3, label: "۷۰٪ تشریحی / ۳۰٪ تستی" },
  { id: "60-40", descriptive: 0.6, test: 0.4, label: "۶۰٪ تشریحی / ۴۰٪ تستی" },
  { id: "50-50", descriptive: 0.5, test: 0.5, label: "۵۰٪ تشریحی / ۵۰٪ تستی" },
  { id: "40-60", descriptive: 0.4, test: 0.6, label: "۴۰٪ تشریحی / ۶۰٪ تستی" },
];

export function getTrack(trackId) {
  return TRACKS[trackId] || null;
}

export function resolveTrackId(grade, field) {
  return `${grade}-${field}`;
}

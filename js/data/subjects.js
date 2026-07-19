/** @typedef {'11-exp'|'11-math'|'12-all'} TrackId */

/** دروس امتحانی دوازدهم — لیست مربی */
export const GRADE_12_SUBJECTS = [
  { id: "math", name: "ریاضی / حسابان", weight: 3.5, type: "problem" },
  { id: "bio", name: "زیست", weight: 3.5, type: "memory" },
  { id: "phys", name: "فیزیک", weight: 3, type: "problem" },
  { id: "chem", name: "شیمی", weight: 3, type: "mixed" },
  { id: "geom", name: "هندسه", weight: 2, type: "problem" },
  { id: "disc", name: "گسسته", weight: 2, type: "problem" },
  { id: "fa", name: "ادبیات", weight: 1.3, type: "memory" },
  { id: "ar", name: "عربی", weight: 1.1, type: "memory" },
  { id: "en", name: "زبان", weight: 1.1, type: "memory" },
  { id: "rel", name: "دینی", weight: 1.1, type: "memory" },
];

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
  "12-all": {
    id: "12-all",
    grade: 12,
    field: "all",
    label: "دوازدهم",
    subjects: GRADE_12_SUBJECTS,
  },
};

export function getTrack(trackId) {
  return TRACKS[trackId] || null;
}

export function resolveTrackId(grade, field) {
  if (Number(grade) === 12) return "12-all";
  return `${grade}-${field || "exp"}`;
}

export function getTrackForProfile(profile) {
  return getTrack(resolveTrackId(profile.grade, profile.field));
}

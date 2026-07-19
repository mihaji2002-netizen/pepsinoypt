/** @typedef {'11-all'|'11-exp'|'11-math'|'12-all'} TrackId */

/** دروس امتحانی یازدهم — لیست مربی */
export const GRADE_11_SUBJECTS = [
  { id: "bio", name: "زیست", weight: 3.5, type: "memory" },
  { id: "phys", name: "فیزیک", weight: 3, type: "problem" },
  { id: "chem", name: "شیمی", weight: 3, type: "mixed" },
  { id: "geom", name: "هندسه", weight: 2, type: "problem" },
  { id: "fa", name: "ادبیات", weight: 1.3, type: "memory" },
  { id: "ar", name: "عربی", weight: 1.1, type: "memory" },
  { id: "en", name: "زبان", weight: 1.1, type: "memory" },
  { id: "rel", name: "دینی", weight: 1.1, type: "memory" },
];

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
  "11-all": {
    id: "11-all",
    grade: 11,
    field: "all",
    label: "یازدهم",
    subjects: GRADE_11_SUBJECTS,
  },
  // aliases for older saved profiles
  "11-exp": {
    id: "11-exp",
    grade: 11,
    field: "exp",
    label: "یازدهم",
    subjects: GRADE_11_SUBJECTS,
  },
  "11-math": {
    id: "11-math",
    grade: 11,
    field: "math",
    label: "یازدهم",
    subjects: GRADE_11_SUBJECTS,
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
  if (Number(grade) === 11) return "11-all";
  return `${grade}-${field || "exp"}`;
}

export function getTrackForProfile(profile) {
  return getTrack(resolveTrackId(profile.grade, profile.field));
}

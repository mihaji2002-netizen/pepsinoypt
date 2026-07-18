const PREFIX = "masir.v1.";

export const KEYS = {
  profile: "profile",
  planMeta: "planMeta",
  completion: "completion",
  settings: "settings",
  focus: "focus",
  onboardingDone: "onboardingDone",
};

function fullKey(key) {
  return PREFIX + key;
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(fullKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(fullKey(key));
  } catch {
    /* ignore */
  }
}

export function loadProfile() {
  return load(KEYS.profile, null);
}

export function saveProfile(profile) {
  return save(KEYS.profile, profile);
}

export function loadSettings() {
  return load(KEYS.settings, {
    breakShortMin: 10,
    breakLongMin: 40,
    pomodoroWork: 25,
    pomodoroBreak: 5,
    pomodoroLongBreak: 15,
    musicVolume: 0.35,
    musicTrack: "rain",
  });
}

export function saveSettings(settings) {
  return save(KEYS.settings, settings);
}

export function loadCompletion() {
  return load(KEYS.completion, {});
}

export function toggleCompletion(dateKey, instanceId) {
  const map = loadCompletion();
  const list = new Set(map[dateKey] || []);
  if (list.has(instanceId)) list.delete(instanceId);
  else list.add(instanceId);
  map[dateKey] = [...list];
  save(KEYS.completion, map);
  return map;
}

export function isOnboardingDone() {
  return Boolean(load(KEYS.onboardingDone, false));
}

export function setOnboardingDone(done = true) {
  save(KEYS.onboardingDone, done);
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => remove(k));
}

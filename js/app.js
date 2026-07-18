import {
  loadProfile,
  saveProfile,
  loadSettings,
  saveSettings,
  loadCompletion,
  toggleCompletion,
  isOnboardingDone,
  setOnboardingDone,
  clearAll,
} from "./core/storage.js";
import { buildDailyPlan, applyCompletionState, calcProgress, todayKey } from "./engine/planner.js";
import { EXAM_STATUSES, LEVELS, RATIOS, TRACKS } from "./data/subjects.js";
import { runAllScenarioTests } from "./engine/scenarios.js";
import { FocusTimer } from "./components/timer.js";
import { AmbientPlayer } from "./components/music.js";
import { exportPlanImage, printPlan } from "./components/export.js";
import { $, $$, showToast, toPersianDigits, escapeHtml } from "./utils/helpers.js";
import { formatJalaliDate, formatDuration } from "./utils/persian-date.js";

const state = {
  view: "landing",
  profile: null,
  settings: loadSettings(),
  plan: null,
  wizardStep: 0,
  wizardDraft: null,
  focusIndex: 0,
  deferredInstall: null,
};

const music = new AmbientPlayer();
const timer = new FocusTimer({
  onTick: renderTimer,
  onComplete: () => {
    showToast("زمان این بخش تمام شد");
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  },
  onPhaseChange: () => renderTimer(timer.snapshot()),
});

const WIZARD_STEPS = [
  { id: "track", title: "پایه و رشته" },
  { id: "exam", title: "وضعیت امتحانات" },
  { id: "level", title: "سطح دانش‌آموز" },
  { id: "ratio", title: "نسبت مطالعه" },
  { id: "time", title: "زمان روز" },
];

function init() {
  state.profile = loadProfile();
  state.settings = loadSettings();
  timer.configure(state.settings);
  music.setVolume(state.settings.musicVolume ?? 0.35);
  music.setTrack(state.settings.musicTrack || "rain");

  bindGlobal();
  setupMusicUi();
  setupPwa();

  if (state.profile && isOnboardingDone()) {
    ensurePlan();
    $("#btn-skip-landing")?.classList.remove("hidden");
    showView("today");
  } else {
    showView("landing");
  }
}

function bindGlobal() {
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.nav;
      if (view === "today" || view === "focus" || view === "settings") {
        if (!state.profile) {
          showToast("اول پروفایل را تنظیم کنید");
          showView("wizard");
          return;
        }
        if (view === "today" || view === "focus") ensurePlan();
      }
      if (view === "settings") renderSettings();
      if (view === "focus") enterFocus();
      showView(view);
    });
  });

  $("#btn-header-settings")?.addEventListener("click", () => {
    renderSettings();
    showView("settings");
  });

  $("#btn-start-wizard")?.addEventListener("click", () => startWizard());
  $("#btn-skip-landing")?.addEventListener("click", () => {
    ensurePlan();
    showView("today");
  });

  $("#wizard-prev")?.addEventListener("click", () => wizardNav(-1));
  $("#wizard-next")?.addEventListener("click", () => wizardNav(1));

  $("#btn-start-focus")?.addEventListener("click", () => {
    enterFocus();
    showView("focus");
  });
  $("#btn-export")?.addEventListener("click", async () => {
    if (!state.plan) return;
    await exportPlanImage(state.plan, {
      dateLabel: formatJalaliDate(),
      progress: calcProgress(state.plan),
    });
    showToast("تصویر برنامه ذخیره شد");
  });
  $("#btn-print")?.addEventListener("click", () => printPlan());
  $("#btn-rebuild")?.addEventListener("click", () => {
    rebuildPlan(true);
    showToast("برنامه امروز بازسازی شد");
  });

  // Timer
  $("#timer-mode-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    $$("#timer-mode-tabs .choice").forEach((c) => c.classList.toggle("selected", c === btn));
    timer.setMode(btn.dataset.mode);
    if (btn.dataset.mode === "normal") {
      const block = currentFocusBlock();
      if (block) timer.setMinutes(block.durationMin);
    }
    $("#timer-toggle").textContent = "شروع";
  });
  $("#timer-toggle")?.addEventListener("click", () => {
    timer.toggle();
    $("#timer-toggle").textContent = timer.running ? "توقف" : "ادامه";
  });
  $("#timer-reset")?.addEventListener("click", () => {
    timer.reset();
    $("#timer-toggle").textContent = "شروع";
  });
  $("#timer-done")?.addEventListener("click", () => completeCurrentFocus());

  // Settings
  $("#btn-edit-profile")?.addEventListener("click", () => startWizard(state.profile));
  $("#btn-save-settings")?.addEventListener("click", saveSettingsFromUi);
  $("#btn-run-tests")?.addEventListener("click", () => {
    const out = $("#test-output");
    out.classList.remove("hidden");
    out.textContent = "در حال اجرا...";
    requestAnimationFrame(() => {
      const report = runAllScenarioTests();
      const failed = report.results.filter((r) => !r.ok).slice(0, 12);
      out.textContent = [
        `کل سناریوها: ${toPersianDigits(report.total)}`,
        `موفق: ${toPersianDigits(report.passed)}`,
        `ناموفق: ${toPersianDigits(report.failed)}`,
        failed.length
          ? "نمونه خطا:\n" + failed.map((f) => `${f.key}: ${(f.errors || []).join(", ")}`).join("\n")
          : "همهٔ سناریوها پاس شدند.",
      ].join("\n");
      showToast(report.failed ? "برخی سناریوها ناموفق بودند" : "همه سناریوها OK");
    });
  });
  $("#btn-reset-all")?.addEventListener("click", () => {
    if (!confirm("همه داده‌های ذخیره‌شده پاک شود؟")) return;
    clearAll();
    state.profile = null;
    state.plan = null;
    showView("landing");
    showToast("داده‌ها پاک شد");
  });
}

function showView(name) {
  state.view = name;
  $$(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === name));
  $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.nav === name));
  if (name === "landing" && state.profile) {
    $("#btn-skip-landing")?.classList.remove("hidden");
  }
}

/* ——— Wizard ——— */
function startWizard(existing = null) {
  state.wizardStep = 0;
  state.wizardDraft = existing
    ? { ...existing }
    : {
        grade: 12,
        field: "exp",
        examStatus: "normal",
        level: "mid",
        ratioId: "60-40",
        studyHours: 8,
        startTime: "08:00",
        breakShortMin: state.settings.breakShortMin ?? 10,
        breakLongMin: state.settings.breakLongMin ?? 40,
      };
  renderWizard();
  showView("wizard");
}

function renderWizard() {
  const stepsEl = $("#wizard-steps");
  stepsEl.innerHTML = WIZARD_STEPS.map(
    (_, i) =>
      `<div class="wizard-step-dot ${i === state.wizardStep ? "active" : ""} ${i < state.wizardStep ? "done" : ""}"></div>`
  ).join("");

  const panel = $("#wizard-panel");
  const step = WIZARD_STEPS[state.wizardStep];
  const d = state.wizardDraft;

  $("#wizard-prev").disabled = state.wizardStep === 0;
  $("#wizard-next").textContent = state.wizardStep === WIZARD_STEPS.length - 1 ? "ساخت برنامه" : "بعدی";

  if (step.id === "track") {
    panel.innerHTML = `
      <h2 class="panel-title">${step.title}</h2>
      <p class="panel-desc">مسیر تحصیلی مشخص می‌کند چه درس‌هایی و چه بلوک‌هایی پیشنهاد شوند.</p>
      <div class="choice-grid cols-2" id="choice-track">
        ${Object.values(TRACKS)
          .map(
            (t) => `
          <button type="button" class="choice ${d.grade === t.grade && d.field === t.field ? "selected" : ""}" data-grade="${t.grade}" data-field="${t.field}">
            <span class="choice-title">${t.label}</span>
            <span class="choice-meta">${t.subjects.length} درس اصلی</span>
          </button>`
          )
          .join("")}
      </div>`;
    panel.querySelector("#choice-track").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.grade = Number(btn.dataset.grade);
      d.field = btn.dataset.field;
      renderWizard();
    };
  } else if (step.id === "exam") {
    panel.innerHTML = `
      <h2 class="panel-title">${step.title}</h2>
      <p class="panel-desc">وضعیت امتحانات وزن تشریحی/تستی و بلوک‌های جبرانی را عوض می‌کند.</p>
      <div class="choice-grid" id="choice-exam">
        ${Object.values(EXAM_STATUSES)
          .map(
            (s) => `
          <button type="button" class="choice ${d.examStatus === s.id ? "selected" : ""}" data-id="${s.id}">
            <span class="choice-title">${s.label}</span>
            <span class="choice-meta">${s.desc}</span>
          </button>`
          )
          .join("")}
      </div>`;
    panel.querySelector("#choice-exam").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.examStatus = btn.dataset.id;
      renderWizard();
    };
  } else if (step.id === "level") {
    panel.innerHTML = `
      <h2 class="panel-title">${step.title}</h2>
      <p class="panel-desc">سطح، شدت آزمون و نیاز به جبران پایه را تعیین می‌کند.</p>
      <div class="choice-grid cols-3" id="choice-level">
        ${Object.values(LEVELS)
          .map(
            (l) => `
          <button type="button" class="choice ${d.level === l.id ? "selected" : ""}" data-id="${l.id}">
            <span class="choice-title">${l.label}</span>
          </button>`
          )
          .join("")}
      </div>`;
    panel.querySelector("#choice-level").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.level = btn.dataset.id;
      renderWizard();
    };
  } else if (step.id === "ratio") {
    panel.innerHTML = `
      <h2 class="panel-title">${step.title}</h2>
      <p class="panel-desc">نسبت پایه؛ موتور بر اساس سطح و وضعیت امتحان آن را تنظیم می‌کند.</p>
      <div class="choice-grid" id="choice-ratio">
        ${RATIOS.map(
          (r) => `
          <button type="button" class="choice ${d.ratioId === r.id ? "selected" : ""}" data-id="${r.id}">
            <span class="choice-title">${r.label}</span>
          </button>`
        ).join("")}
      </div>`;
    panel.querySelector("#choice-ratio").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.ratioId = btn.dataset.id;
      renderWizard();
    };
  } else if (step.id === "time") {
    panel.innerHTML = `
      <h2 class="panel-title">${step.title}</h2>
      <p class="panel-desc">ساعت شروع و حجم مطالعه روزانه.</p>
      <div class="stack">
        <div class="field">
          <label for="w-hours">ساعات مطالعه مفید: <span class="range-value" id="w-hours-val">${toPersianDigits(d.studyHours)}</span></label>
          <input type="range" id="w-hours" min="4" max="12" step="0.5" value="${d.studyHours}" />
        </div>
        <div class="field">
          <label for="w-start">ساعت شروع</label>
          <input type="time" id="w-start" value="${d.startTime}" />
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="w-break-s">استراحت کوتاه (دقیقه)</label>
            <input type="number" id="w-break-s" min="5" max="30" value="${d.breakShortMin}" />
          </div>
          <div class="field">
            <label for="w-break-l">استراحت بلند (دقیقه)</label>
            <input type="number" id="w-break-l" min="20" max="90" value="${d.breakLongMin}" />
          </div>
        </div>
      </div>`;
    $("#w-hours").oninput = (e) => {
      d.studyHours = Number(e.target.value);
      $("#w-hours-val").textContent = toPersianDigits(d.studyHours);
    };
    $("#w-start").onchange = (e) => {
      d.startTime = e.target.value;
    };
    $("#w-break-s").onchange = (e) => {
      d.breakShortMin = Number(e.target.value);
    };
    $("#w-break-l").onchange = (e) => {
      d.breakLongMin = Number(e.target.value);
    };
  }
}

function wizardNav(dir) {
  if (dir < 0) {
    state.wizardStep = Math.max(0, state.wizardStep - 1);
    renderWizard();
    return;
  }
  if (state.wizardStep < WIZARD_STEPS.length - 1) {
    state.wizardStep += 1;
    renderWizard();
    return;
  }
  // Finish
  state.profile = { ...state.wizardDraft };
  saveProfile(state.profile);
  state.settings = {
    ...state.settings,
    breakShortMin: state.profile.breakShortMin,
    breakLongMin: state.profile.breakLongMin,
  };
  saveSettings(state.settings);
  setOnboardingDone(true);
  rebuildPlan(true);
  showToast("برنامه ساخته شد");
  showView("today");
}

/* ——— Plan ——— */
function ensurePlan() {
  if (!state.profile) return;
  const key = todayKey();
  if (!state.plan || state.plan.dateKey !== key) {
    rebuildPlan(false);
  } else {
    state.plan = applyCompletionState(state.plan, loadCompletion());
    renderToday();
  }
}

function rebuildPlan(forceNewIds) {
  if (!state.profile) return;
  const profile = {
    ...state.profile,
    breakShortMin: state.settings.breakShortMin,
    breakLongMin: state.settings.breakLongMin,
  };
  let plan = buildDailyPlan(profile, { dateKey: todayKey() });
  if (!forceNewIds) {
    plan = applyCompletionState(plan, loadCompletion());
  }
  state.plan = plan;
  renderToday();
}

function renderToday() {
  if (!state.plan) return;
  $("#today-date").textContent = formatJalaliDate();
  $("#today-title").textContent = `برنامه ${state.plan.trackLabel}`;
  $("#engine-note").textContent = state.plan.rationale;

  const progress = calcProgress(state.plan);
  $("#progress-text").textContent = `${toPersianDigits(progress)}٪`;
  $("#progress-ring-label").textContent = `${toPersianDigits(progress)}٪`;
  $("#progress-bar").style.width = `${progress}%`;
  const ring = $("#progress-ring");
  const circ = 2 * Math.PI * 52;
  ring.style.strokeDasharray = String(circ);
  ring.style.strokeDashoffset = String(circ * (1 - progress / 100));

  const root = $("#timeline");
  root.innerHTML = state.plan.blocks
    .map((b) => {
      const typeLabel = typeLabelFa(b.type);
      return `
      <article class="timeline-item" data-id="${b.instanceId}">
        <div class="timeline-dot" data-type="${b.type}" title="${typeLabel}">${typeShort(b.type)}</div>
        <div class="timeline-body ${b.done ? "done" : ""}">
          <div class="timeline-meta">
            <span class="badge">${toPersianDigits(b.startLabel)} – ${toPersianDigits(b.endLabel)}</span>
            <span class="badge badge-accent">${formatDuration(b.durationMin)}</span>
            <span>${typeLabel}</span>
          </div>
          <h3 class="timeline-title">${escapeHtml(b.title)}</h3>
          <p class="timeline-desc">${escapeHtml(b.desc)}</p>
          <div class="timeline-actions">
            ${
              b.type !== "break"
                ? `<button type="button" class="check-btn ${b.done ? "checked" : ""}" data-action="toggle" data-id="${b.instanceId}">${b.done ? "انجام شد ✓" : "تیک بزن"}</button>
                   <button type="button" class="btn btn-ghost" style="min-height:36px;padding:0.4rem 0.75rem;font-size:var(--fs-xs)" data-action="focus" data-id="${b.instanceId}">شروع این بخش</button>`
                : `<span style="font-size:var(--fs-xs);color:var(--color-ink-muted)">استراحت برنامه‌ریزی‌شده</span>`
            }
          </div>
        </div>
      </article>`;
    })
    .join("");

  root.onclick = (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "toggle") {
      toggleCompletion(state.plan.dateKey, id);
      state.plan = applyCompletionState(state.plan, loadCompletion());
      renderToday();
    } else if (btn.dataset.action === "focus") {
      const idx = state.plan.blocks.findIndex((b) => b.instanceId === id);
      state.focusIndex = idx >= 0 ? idx : 0;
      enterFocus();
      showView("focus");
    }
  };
}

function typeLabelFa(type) {
  const map = {
    study: "مطالعه",
    test: "تست",
    review: "مرور",
    exam: "آزمون",
    break: "استراحت",
    foundation: "جبران پایه",
    analysis: "تحلیل",
  };
  return map[type] || type;
}

function typeShort(type) {
  const map = {
    study: "م",
    test: "ت",
    review: "پ",
    exam: "آ",
    break: "ا",
    foundation: "ج",
    analysis: "ت",
  };
  return map[type] || "·";
}

/* ——— Focus ——— */
function enterFocus() {
  if (!state.plan) ensurePlan();
  if (!state.plan) return;
  // Skip breaks when landing on one
  while (state.plan.blocks[state.focusIndex]?.type === "break" && state.focusIndex < state.plan.blocks.length - 1) {
    state.focusIndex += 1;
  }
  const block = currentFocusBlock();
  $("#focus-block-title").textContent = block ? block.title : "فعالیتی باقی نمانده";
  if (block && timer.mode === "normal") {
    timer.setMinutes(block.durationMin);
  } else if (timer.mode === "pomodoro") {
    timer.setMinutes(state.settings.pomodoroWork || 25);
  }
  renderTimer(timer.snapshot());
  renderFocusQueue();
  $("#stat-progress").textContent = `${toPersianDigits(calcProgress(state.plan))}٪`;
}

function currentFocusBlock() {
  return state.plan?.blocks?.[state.focusIndex] || null;
}

function completeCurrentFocus() {
  const block = currentFocusBlock();
  if (!block) return;
  if (block.type !== "break" && !block.done) {
    toggleCompletion(state.plan.dateKey, block.instanceId);
    state.plan = applyCompletionState(state.plan, loadCompletion());
  }
  // advance
  let next = state.focusIndex + 1;
  while (state.plan.blocks[next]?.type === "break" && next < state.plan.blocks.length) {
    // auto-acknowledge break by skipping visually but could pause
    next += 1;
  }
  if (next >= state.plan.blocks.length) {
    showToast("برنامه امروز تمام شد");
    state.focusIndex = state.plan.blocks.length - 1;
  } else {
    state.focusIndex = next;
  }
  timer.pause();
  $("#timer-toggle").textContent = "شروع";
  enterFocus();
  renderToday();
}

function renderFocusQueue() {
  const q = $("#focus-queue");
  if (!state.plan) {
    q.innerHTML = "";
    return;
  }
  const upcoming = state.plan.blocks.slice(state.focusIndex + 1, state.focusIndex + 6);
  if (!upcoming.length) {
    q.innerHTML = `<p style="color:var(--color-ink-muted);font-size:var(--fs-sm)">مورد دیگری در صف نیست.</p>`;
    return;
  }
  q.innerHTML = upcoming
    .map(
      (b) => `
    <div class="summary-row">
      <span class="k">${toPersianDigits(b.startLabel)} · ${escapeHtml(b.title)}</span>
      <span class="v">${formatDuration(b.durationMin)}</span>
    </div>`
    )
    .join("");
}

function renderTimer(snap) {
  const display = $("#timer-display");
  if (!display) return;
  display.textContent = toPersianDigits(snap.label);
  display.classList.toggle("paused", !snap.running);
  $("#timer-phase-label").textContent =
    snap.mode === "pomodoro"
      ? snap.phase === "work"
        ? "فاز کار"
        : snap.phase === "longBreak"
          ? "استراحت بلند"
          : "استراحت کوتاه"
      : snap.running
        ? "در حال اجرا"
        : "آماده";
  $("#stat-pomos").textContent = toPersianDigits(snap.pomodoroCount);
  $("#stat-phase").textContent =
    snap.mode === "pomodoro" ? (snap.phase === "work" ? "کار" : "استراحت") : "عادی";
  if (state.plan) {
    $("#stat-progress").textContent = `${toPersianDigits(calcProgress(state.plan))}٪`;
  }
}

/* ——— Music ——— */
function setupMusicUi() {
  const select = $("#music-track");
  select.innerHTML = AmbientPlayer.trackList()
    .map((t) => `<option value="${t.id}">${t.label}</option>`)
    .join("");
  select.value = state.settings.musicTrack || "rain";
  select.onchange = () => {
    music.setTrack(select.value);
    state.settings.musicTrack = select.value;
    saveSettings(state.settings);
  };

  const vol = $("#music-volume");
  vol.value = Math.round((state.settings.musicVolume ?? 0.35) * 100);
  $("#music-volume-val").textContent = `${toPersianDigits(vol.value)}٪`;
  vol.oninput = () => {
    const v = Number(vol.value) / 100;
    music.setVolume(v);
    $("#music-volume-val").textContent = `${toPersianDigits(vol.value)}٪`;
    state.settings.musicVolume = v;
    saveSettings(state.settings);
  };

  $("#music-toggle").onclick = async () => {
    const on = await music.toggle();
    $("#music-toggle").textContent = on ? "توقف" : "پخش";
    $("#music-visual").classList.toggle("active", on);
  };
}

/* ——— Settings ——— */
function renderSettings() {
  const p = state.profile;
  const box = $("#profile-summary");
  if (!p) {
    box.innerHTML = `<p class="empty-state">پروفایلی تنظیم نشده.</p>`;
  } else {
    const track = TRACKS[`${p.grade}-${p.field}`];
    const ratio = RATIOS.find((r) => r.id === p.ratioId);
    box.innerHTML = `
      <div class="summary-row"><span class="k">مسیر</span><span class="v">${track?.label || "—"}</span></div>
      <div class="summary-row"><span class="k">امتحانات</span><span class="v">${EXAM_STATUSES[p.examStatus]?.label || "—"}</span></div>
      <div class="summary-row"><span class="k">سطح</span><span class="v">${LEVELS[p.level]?.label || "—"}</span></div>
      <div class="summary-row"><span class="k">نسبت</span><span class="v">${ratio?.label || "—"}</span></div>
      <div class="summary-row"><span class="k">ساعات مطالعه</span><span class="v">${toPersianDigits(p.studyHours)}</span></div>
      <div class="summary-row"><span class="k">شروع</span><span class="v">${toPersianDigits(p.startTime)}</span></div>
    `;
  }
  $("#set-break-short").value = state.settings.breakShortMin ?? 10;
  $("#set-break-long").value = state.settings.breakLongMin ?? 40;
  $("#set-pomo-work").value = state.settings.pomodoroWork ?? 25;
  $("#set-pomo-break").value = state.settings.pomodoroBreak ?? 5;
}

function saveSettingsFromUi() {
  state.settings = {
    ...state.settings,
    breakShortMin: Number($("#set-break-short").value),
    breakLongMin: Number($("#set-break-long").value),
    pomodoroWork: Number($("#set-pomo-work").value),
    pomodoroBreak: Number($("#set-pomo-break").value),
  };
  saveSettings(state.settings);
  timer.configure(state.settings);
  if (state.profile) {
    state.profile.breakShortMin = state.settings.breakShortMin;
    state.profile.breakLongMin = state.settings.breakLongMin;
    saveProfile(state.profile);
    rebuildPlan(true);
  }
  showToast("تنظیمات ذخیره شد");
}

/* ——— PWA ——— */
function setupPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* optional in file:// */
    });
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredInstall = e;
    $("#install-banner")?.classList.add("show");
  });
  $("#btn-install")?.addEventListener("click", async () => {
    if (!state.deferredInstall) {
      showToast("از منوی مرورگر گزینه Add to Home Screen را بزنید");
      return;
    }
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
    $("#install-banner")?.classList.remove("show");
  });
}

init();

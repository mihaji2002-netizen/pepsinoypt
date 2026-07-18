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
import { buildDailyPlan, applyCompletionState, calcProgress, todayKey, previewSuggestions } from "./engine/planner.js";
import { TRACKS } from "./data/subjects.js";
import { EXAM_NEWS, SUBJECT_STRENGTH, getPeriod } from "./data/flow.js";
import { describeProfile } from "./engine/rules.js";
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

function wizardStepsFor(draft) {
  const steps = [
    { id: "grade", title: "پایه" },
    { id: "field", title: "رشته" },
    { id: "nextExam", title: "امتحان بعدی" },
    { id: "examNews", title: "وضعیت خبر" },
  ];
  if (draft?.examNews === "cancelled") {
    steps.push({ id: "strength", title: "سطح در این درس" });
    if (draft.subjectStrength === "weak") {
      steps.push({ id: "nextHeld", title: "امتحان برگزارشدنی" });
    }
  }
  steps.push({ id: "suggestions", title: "پیشنهادهای روز" });
  return steps;
}

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
          showToast("اول برنامه را بساز");
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
  const track = existing ? TRACKS[`${existing.grade}-${existing.field}`] : TRACKS["12-exp"];
  const first = track.subjects[0];
  const second = track.subjects[1] || first;
  state.wizardDraft = existing
    ? {
        ...existing,
        selectedSuggestions: existing.selectedSuggestions ? [...existing.selectedSuggestions] : null,
      }
    : {
        grade: 12,
        field: "exp",
        nextExamId: first.id,
        examNews: "cancelled",
        subjectStrength: "weak",
        nextHeldWeak: false,
        nextHeldId: second.id,
        selectedSuggestions: null,
        breakShortMin: state.settings.breakShortMin ?? 10,
        breakLongMin: state.settings.breakLongMin ?? 40,
      };
  renderWizard();
  showView("wizard");
}

function currentSteps() {
  return wizardStepsFor(state.wizardDraft);
}

function renderWizard() {
  const steps = currentSteps();
  if (state.wizardStep >= steps.length) state.wizardStep = steps.length - 1;

  const stepsEl = $("#wizard-steps");
  stepsEl.innerHTML = steps
    .map(
      (_, i) =>
        `<div class="wizard-step-dot ${i === state.wizardStep ? "active" : ""} ${i < state.wizardStep ? "done" : ""}"></div>`
    )
    .join("");

  const panel = $("#wizard-panel");
  const step = steps[state.wizardStep];
  const d = state.wizardDraft;
  const track = TRACKS[`${d.grade}-${d.field}`];

  $("#wizard-prev").disabled = state.wizardStep === 0;
  $("#wizard-next").textContent = state.wizardStep === steps.length - 1 ? "ساخت برنامه" : "بعدی";

  if (step.id === "grade") {
    panel.innerHTML = `
      <h2 class="panel-title">پایه‌ات چیه؟</h2>
      <p class="panel-desc">بر اساس پایه، مسیر پیشنهادها کمی فرق می‌کند.</p>
      <div class="choice-grid cols-2" id="choice-grade">
        <button type="button" class="choice ${d.grade === 11 ? "selected" : ""}" data-grade="11">
          <span class="choice-title">یازدهم</span>
          <span class="choice-meta">نهایی + آماده‌سازی دوازدهم</span>
        </button>
        <button type="button" class="choice ${d.grade === 12 ? "selected" : ""}" data-grade="12">
          <span class="choice-title">دوازدهم</span>
          <span class="choice-meta">نهایی و کنکور — برنامهٔ سیال</span>
        </button>
      </div>`;
    panel.querySelector("#choice-grade").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.grade = Number(btn.dataset.grade);
      syncSubjectsAfterTrackChange(d);
      renderWizard();
    };
  } else if (step.id === "field") {
    panel.innerHTML = `
      <h2 class="panel-title">رشته‌ات؟</h2>
      <p class="panel-desc">برای لیست دروس امتحان بعدی لازم است.</p>
      <div class="choice-grid cols-2" id="choice-field">
        <button type="button" class="choice ${d.field === "exp" ? "selected" : ""}" data-field="exp">
          <span class="choice-title">تجربی</span>
        </button>
        <button type="button" class="choice ${d.field === "math" ? "selected" : ""}" data-field="math">
          <span class="choice-title">ریاضی</span>
        </button>
      </div>`;
    panel.querySelector("#choice-field").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.field = btn.dataset.field;
      syncSubjectsAfterTrackChange(d);
      renderWizard();
    };
  } else if (step.id === "nextExam") {
    panel.innerHTML = `
      <h2 class="panel-title">امتحان بعدیت چیه؟</h2>
      <p class="panel-desc">از بین دروس ${track.label} یکی را انتخاب کن.</p>
      <div class="choice-grid" id="choice-exam-subj">
        ${track.subjects
          .map(
            (s) => `
          <button type="button" class="choice ${d.nextExamId === s.id ? "selected" : ""}" data-id="${s.id}">
            <span class="choice-title">${s.name}</span>
          </button>`
          )
          .join("")}
      </div>`;
    panel.querySelector("#choice-exam-subj").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.nextExamId = btn.dataset.id;
      if (d.nextHeldId === d.nextExamId) {
        const alt = track.subjects.find((s) => s.id !== d.nextExamId);
        if (alt) d.nextHeldId = alt.id;
      }
      renderWizard();
    };
  } else if (step.id === "examNews") {
    panel.innerHTML = `
      <h2 class="panel-title">وضعیت این امتحان؟</h2>
      <p class="panel-desc">آخرین خبری که داری را بگو تا پیشنهادها عوض شود.</p>
      <div class="choice-grid" id="choice-news">
        ${Object.values(EXAM_NEWS)
          .map(
            (s) => `
          <button type="button" class="choice ${d.examNews === s.id ? "selected" : ""}" data-id="${s.id}">
            <span class="choice-title">${s.label}</span>
            <span class="choice-meta">${s.desc}</span>
          </button>`
          )
          .join("")}
      </div>`;
    panel.querySelector("#choice-news").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.examNews = btn.dataset.id;
      d.selectedSuggestions = null;
      renderWizard();
    };
  } else if (step.id === "strength") {
    panel.innerHTML = `
      <h2 class="panel-title">در «${escapeHtml(subjectName(d))}» چطوری؟</h2>
      <p class="panel-desc">این انتخاب مسیر صبح و ظهر را عوض می‌کند.</p>
      <div class="choice-grid" id="choice-strength">
        ${Object.values(SUBJECT_STRENGTH)
          .map(
            (s) => `
          <button type="button" class="choice ${d.subjectStrength === s.id ? "selected" : ""}" data-id="${s.id}">
            <span class="choice-title">${s.label}</span>
            <span class="choice-meta">${s.desc}</span>
          </button>`
          )
          .join("")}
      </div>`;
    panel.querySelector("#choice-strength").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.subjectStrength = btn.dataset.id;
      d.selectedSuggestions = null;
      renderWizard();
    };
  } else if (step.id === "nextHeld") {
    panel.innerHTML = `
      <h2 class="panel-title">امتحان بعدی‌ای که برگزار می‌شه رو ضعیفی؟</h2>
      <p class="panel-desc">اگر آره، بعدازظهر همان درس را کار می‌کنی. اگر نه، می‌رویم سراغ تست و آزمون جامع.</p>
      <div class="choice-grid cols-2" id="choice-held-weak" style="margin-bottom: var(--space-4)">
        <button type="button" class="choice ${d.nextHeldWeak ? "selected" : ""}" data-weak="1">
          <span class="choice-title">آره، ضعیفم</span>
        </button>
        <button type="button" class="choice ${!d.nextHeldWeak ? "selected" : ""}" data-weak="0">
          <span class="choice-title">نه، ضعیف نیستم</span>
        </button>
      </div>
      <div class="field ${d.nextHeldWeak ? "" : "hidden"}" id="held-subject-wrap">
        <label>کدام امتحان برگزارشدنی؟</label>
        <div class="choice-grid" id="choice-held-subj">
          ${track.subjects
            .filter((s) => s.id !== d.nextExamId)
            .map(
              (s) => `
            <button type="button" class="choice ${d.nextHeldId === s.id ? "selected" : ""}" data-id="${s.id}">
              <span class="choice-title">${s.name}</span>
            </button>`
            )
            .join("")}
        </div>
      </div>`;
    panel.querySelector("#choice-held-weak").onclick = (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.nextHeldWeak = btn.dataset.weak === "1";
      d.selectedSuggestions = null;
      renderWizard();
    };
    panel.querySelector("#choice-held-subj")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      d.nextHeldId = btn.dataset.id;
      d.selectedSuggestions = null;
      renderWizard();
    });
  } else if (step.id === "suggestions") {
    const suggestions = previewSuggestions(d);
    if (!d.selectedSuggestions) {
      d.selectedSuggestions = suggestions.map((s) => s.id);
    }
    const selected = new Set(d.selectedSuggestions);
    panel.innerHTML = `
      <h2 class="panel-title">پیشنهادهای ساخت برنامهٔ امروز</h2>
      <p class="panel-desc">هر کدام را که می‌خواهی در روزت باشد انتخاب کن. زمان‌ها به صورت بازهٔ صبح تا ظهر / ظهر تا عصر / عصر تا شب چیده می‌شوند.</p>
      <div class="suggestion-list" id="choice-suggestions">
        ${suggestions
          .map((s) => {
            const period = getPeriod(s.period);
            const on = selected.has(s.id);
            return `
            <button type="button" class="suggestion-card ${on ? "selected" : ""}" data-id="${s.id}" aria-pressed="${on}">
              <div class="suggestion-period">${period.label}<span>${period.hint}</span></div>
              <div class="suggestion-title">${escapeHtml(s.title)}</div>
              <p class="suggestion-body">${escapeHtml(s.body)}</p>
              <div class="suggestion-check">${on ? "انتخاب شد ✓" : "برای افزودن بزن"}</div>
            </button>`;
          })
          .join("")}
      </div>`;
    panel.querySelector("#choice-suggestions").onclick = (e) => {
      const btn = e.target.closest(".suggestion-card");
      if (!btn) return;
      const id = btn.dataset.id;
      const set = new Set(d.selectedSuggestions);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      d.selectedSuggestions = [...set];
      renderWizard();
    };
  }
}

function syncSubjectsAfterTrackChange(d) {
  const track = TRACKS[`${d.grade}-${d.field}`];
  if (!track) return;
  if (!track.subjects.some((s) => s.id === d.nextExamId)) {
    d.nextExamId = track.subjects[0].id;
  }
  if (!track.subjects.some((s) => s.id === d.nextHeldId) || d.nextHeldId === d.nextExamId) {
    d.nextHeldId = (track.subjects.find((s) => s.id !== d.nextExamId) || track.subjects[0]).id;
  }
  d.selectedSuggestions = null;
}

function subjectName(d) {
  const track = TRACKS[`${d.grade}-${d.field}`];
  return track?.subjects?.find((s) => s.id === d.nextExamId)?.name || "این درس";
}

function wizardNav(dir) {
  const steps = currentSteps();
  if (dir < 0) {
    state.wizardStep = Math.max(0, state.wizardStep - 1);
    renderWizard();
    return;
  }

  const step = steps[state.wizardStep];
  if (step.id === "suggestions") {
    if (!state.wizardDraft.selectedSuggestions?.length) {
      showToast("حداقل یک پیشنهاد را انتخاب کن");
      return;
    }
  }

  if (state.wizardStep < steps.length - 1) {
    state.wizardStep += 1;
    // Clamp if step list shrank (e.g. leaving cancelled path)
    const nextSteps = currentSteps();
    if (state.wizardStep >= nextSteps.length) state.wizardStep = nextSteps.length - 1;
    renderWizard();
    return;
  }

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
  showToast("برنامهٔ امروز ساخته شد");
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
  let html = "";
  let lastPeriod = null;

  for (const b of state.plan.blocks) {
    if (b.periodId && b.periodId !== lastPeriod) {
      lastPeriod = b.periodId;
      const period = getPeriod(b.periodId);
      html += `
        <div class="period-header">
          <div class="period-header-label">${period.label}</div>
          <div class="period-header-hint">${period.hint} · ${toPersianDigits(period.startTime)}</div>
        </div>`;
    }
    const typeLabel = typeLabelFa(b.type);
    html += `
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
  }

  root.innerHTML = html;

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
  let next = state.focusIndex + 1;
  while (state.plan.blocks[next]?.type === "break" && next < state.plan.blocks.length) {
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
    const info = describeProfile(p);
    const held = TRACKS[`${p.grade}-${p.field}`]?.subjects?.find((s) => s.id === p.nextHeldId);
    box.innerHTML = `
      <div class="summary-row"><span class="k">مسیر</span><span class="v">${info.trackLabel}</span></div>
      <div class="summary-row"><span class="k">امتحان بعدی</span><span class="v">${info.nextExam}</span></div>
      <div class="summary-row"><span class="k">وضعیت خبر</span><span class="v">${info.newsLabel}</span></div>
      ${
        p.examNews === "cancelled"
          ? `<div class="summary-row"><span class="k">سطح در درس</span><span class="v">${info.strengthLabel}</span></div>`
          : ""
      }
      ${
        p.examNews === "cancelled" && p.subjectStrength === "weak"
          ? `<div class="summary-row"><span class="k">برگزارشدنی</span><span class="v">${
              p.nextHeldWeak ? held?.name || "ضعیف" : "ضعیف نیست → تست"
            }</span></div>`
          : ""
      }
      <div class="summary-row"><span class="k">پیشنهادهای فعال</span><span class="v">${toPersianDigits(
        (p.selectedSuggestions || []).length || 3
      )}</span></div>
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

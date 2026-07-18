import { toPersianDigits } from "../utils/helpers.js";

/**
 * Export daily plan as PNG via canvas (no external dependency).
 */
export async function exportPlanImage(plan, meta = {}) {
  const width = 900;
  const pad = 40;
  const lineH = 52;
  const studyBlocks = plan.blocks.filter((b) => b.type !== "break");
  const height = pad * 2 + 140 + studyBlocks.length * lineH + 80;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#f4f7f9");
  grad.addColorStop(1, "#e8eef2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Accent bar
  ctx.fillStyle = "#0b3a4a";
  ctx.fillRect(0, 0, width, 8);

  ctx.fillStyle = "#0b3a4a";
  ctx.font = "800 36px Vazirmatn, Tahoma, sans-serif";
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  ctx.fillText("مسیر", width - pad, pad + 40);

  ctx.fillStyle = "#3d5160";
  ctx.font = "600 18px Vazirmatn, Tahoma, sans-serif";
  ctx.fillText(meta.dateLabel || plan.dateKey, width - pad, pad + 72);
  ctx.fillText(plan.trackLabel || "", width - pad, pad + 98);

  const progress = meta.progress ?? 0;
  ctx.fillStyle = "#e07a3d";
  ctx.font = "700 20px Vazirmatn, Tahoma, sans-serif";
  ctx.fillText(`پیشرفت روز: ${toPersianDigits(progress)}٪`, width - pad, pad + 128);

  let y = pad + 160;
  for (const b of studyBlocks) {
    // row background
    ctx.fillStyle = b.done ? "rgba(31,122,77,0.12)" : "#ffffff";
    roundRect(ctx, pad, y, width - pad * 2, lineH - 8, 10);
    ctx.fill();

    ctx.strokeStyle = "rgba(19,32,39,0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, pad, y, width - pad * 2, lineH - 8, 10);
    ctx.stroke();

    const color = typeColor(b.type);
    ctx.fillStyle = color;
    roundRect(ctx, width - pad - 14, y + 10, 6, lineH - 28, 3);
    ctx.fill();

    ctx.fillStyle = "#132027";
    ctx.font = "700 16px Vazirmatn, Tahoma, sans-serif";
    ctx.fillText(b.title, width - pad - 28, y + 28);

    ctx.fillStyle = "#6b7f8c";
    ctx.font = "500 13px Vazirmatn, Tahoma, sans-serif";
    const metaLine = `${b.periodLabel || ""}${b.done ? " · انجام شد" : ""}`;
    ctx.fillText(metaLine, width - pad - 28, y + 46);

    y += lineH;
  }

  // Footer
  ctx.fillStyle = "#6b7f8c";
  ctx.font = "500 12px Vazirmatn, Tahoma, sans-serif";
  ctx.fillText("ساخته‌شده با مسیر", width - pad, height - pad);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `masir-plan-${plan.dateKey}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export function printPlan() {
  window.print();
}

function typeColor(type) {
  const map = {
    study: "#0b3a4a",
    test: "#1f5f8b",
    review: "#2a6f5f",
    exam: "#9a4a1f",
    foundation: "#5c4a8a",
    analysis: "#8a4a5c",
    break: "#6b7f8c",
  };
  return map[type] || "#0b3a4a";
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

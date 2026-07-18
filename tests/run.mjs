/**
 * Node test runner for fluid coaching scenario matrix.
 * Usage: node tests/run.mjs
 */
import { runAllScenarioTests, SHOWCASE, runScenario, assertPlanInvariants } from "../js/engine/scenarios.js";
import { buildDailyPlan } from "../js/engine/planner.js";
import { computePolicy } from "../js/engine/rules.js";
import { previewSuggestions } from "../js/engine/planner.js";

const report = runAllScenarioTests();
console.log("=== Masir Fluid Flow Tests ===");
console.log(`Total: ${report.total}`);
console.log(`Passed: ${report.passed}`);
console.log(`Failed: ${report.failed}`);

if (report.failed) {
  report.results
    .filter((r) => !r.ok)
    .slice(0, 20)
    .forEach((r) => console.error("FAIL", r.key, r.errors));
  process.exitCode = 1;
} else {
  console.log("All scenarios passed.");
}

console.log("\n=== Showcase plans ===");
for (const profile of SHOWCASE) {
  const { plan, policy } = runScenario(profile, 3);
  const errs = assertPlanInvariants(plan, profile);
  const sugg = previewSuggestions(profile);
  console.log(
    `- ${policy.trackId} | ${profile.examNews}/${profile.subjectStrength || "-"} | blocks=${plan.blocks.length} | suggestions=${sugg.length} | rules=${policy.rulesFired.join(",")}${errs.length ? " | ERR " + errs.join(";") : ""}`
  );
}

// Smoke: rebuild stability
const p = SHOWCASE[0];
const a = buildDailyPlan(p, { dayIndex: 1, dateKey: "smoke" });
const b = buildDailyPlan(p, { dayIndex: 1, dateKey: "smoke" });
const sameStructure = a.blocks.length === b.blocks.length && a.blocks.every((x, i) => x.id === b.blocks[i].id);
console.log("\nStructure stable across rebuilds:", sameStructure ? "yes" : "no");
if (!sameStructure) process.exitCode = 1;

const pol = computePolicy(p);
console.log("Policy rules:", pol.rulesFired.join(", "));

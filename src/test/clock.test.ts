import test from "node:test";
import assert from "node:assert/strict";
import { createRunId } from "../infra/clock";

test("createRunId uses configured time zone and simplified format", () => {
  const runId = createRunId("Asia/Taipei", new Date("2026-03-18T08:00:00.000Z"));

  assert.match(runId, /^20260318-160000-[a-z0-9]{3}$/);
});

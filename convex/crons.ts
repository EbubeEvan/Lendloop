import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "cleanup webhook replay keys",
  { hourUTC: 3, minuteUTC: 15 },
  internal.features.automation.internal.cleanupReplayKeys,
  {},
);

export default crons;

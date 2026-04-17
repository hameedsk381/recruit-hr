import { describe, it, expect, mock } from "bun:test";

// Mock ioredis before importing queueService
mock.module("ioredis", () => {
  return {
    default: class FakeRedis {
      status = "ready";
      on() { return this; }
      connect() { return Promise.resolve(); }
      disconnect() { return Promise.resolve(); }
    }
  };
});

// Mock bullmq
const mockAdd = mock(() => Promise.resolve({ id: "job-1" }));
mock.module("bullmq", () => ({
  Queue: class FakeQueue {
    add = mockAdd;
    constructor() {}
  },
  Worker: class FakeWorker {
    constructor(_name: string, _processor: Function) {}
    on() { return this; }
  },
  QueueEvents: class FakeQueueEvents {
    constructor() {}
    on() { return this; }
  }
}));

import { enqueueDelayedResume } from "../services/queueService";

describe("enqueueDelayedResume", () => {
  it("enqueues a delayed-resume job with correct data and delay", async () => {
    await enqueueDelayedResume("run-abc", "wf-xyz", "node-1", 5000);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    const [jobName, jobData, opts] = mockAdd.mock.calls[0];
    expect(jobName).toBe("resume");
    expect(jobData).toEqual({ runId: "run-abc", workflowId: "wf-xyz", afterNodeId: "node-1" });
    expect(opts.delay).toBe(5000);
  });
});

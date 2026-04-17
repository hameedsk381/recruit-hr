import { describe, it, expect, mock, beforeEach } from "bun:test";

// Must mock BEFORE importing the module under test
const mockAdd = mock(() => Promise.resolve({ id: "job-1" }));

mock.module("ioredis", () => ({
  default: class FakeRedis {
    status = "ready";
    on() { return this; }
    connect() { return Promise.resolve(); }
    disconnect() { return Promise.resolve(); }
  }
}));

mock.module("bullmq", () => ({
  Queue: class FakeQueue {
    add = mockAdd;
    constructor() {}
  },
  Worker: class FakeWorker {
    constructor() {}
    on() { return this; }
  },
  QueueEvents: class FakeQueueEvents {
    constructor() {}
    on() { return this; }
  }
}));

// Import AFTER mocks are set up
import { enqueueDelayedResume } from "../services/queueService";

describe("enqueueDelayedResume", () => {
  beforeEach(() => {
    mockAdd.mockClear();
  });

  it("enqueues a delayed-resume job with correct data and delay", async () => {
    await enqueueDelayedResume("run-abc", "wf-xyz", "node-1", 5000);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    const [jobName, jobData, opts] = mockAdd.mock.calls[0];
    expect(jobName).toBe("resume");
    expect(jobData).toEqual({ runId: "run-abc", workflowId: "wf-xyz", afterNodeId: "node-1" });
    expect(opts.delay).toBe(5000);
    expect(opts.attempts).toBe(3);
    expect(opts.backoff).toEqual({ type: "exponential", delay: 2000 });
  });
});

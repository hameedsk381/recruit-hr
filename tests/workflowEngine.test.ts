import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock MongoDB
const mockInsertOne = mock(() => Promise.resolve({ insertedId: "run-1" }));
const mockUpdateOne = mock(() => Promise.resolve({ modifiedCount: 1 }));
const mockFind = mock(() => ({ toArray: () => Promise.resolve([]) }));

mock.module("../utils/mongoClient", () => ({
  getMongoDb: () => ({
    collection: () => ({
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
      find: mockFind,
      findOne: mock(() => Promise.resolve(null)),
    }),
  }),
}));

// Stub enqueueDelayedResume so delay node test doesn't need BullMQ
mock.module("../services/queueService", () => ({
  enqueueDelayedResume: mock(() => Promise.resolve()),
}));

import { WorkflowEngine, evaluateCondition } from "../services/workflow/workflowEngine";

describe("evaluateCondition", () => {
  it("=== operator matches equal values", () => {
    expect(evaluateCondition({ field: "score", operator: "===", value: 90 }, { score: 90 })).toBe(true);
    expect(evaluateCondition({ field: "score", operator: "===", value: 90 }, { score: 80 })).toBe(false);
  });

  it("!== operator matches unequal values", () => {
    expect(evaluateCondition({ field: "status", operator: "!==", value: "rejected" }, { status: "passed" })).toBe(true);
  });

  it("> operator compares numbers", () => {
    expect(evaluateCondition({ field: "score", operator: ">", value: 80 }, { score: 85 })).toBe(true);
    expect(evaluateCondition({ field: "score", operator: ">", value: 80 }, { score: 75 })).toBe(false);
  });

  it("< operator compares numbers", () => {
    expect(evaluateCondition({ field: "score", operator: "<", value: 80 }, { score: 75 })).toBe(true);
  });

  it("includes operator does substring match", () => {
    expect(evaluateCondition({ field: "email", operator: "includes", value: "@" }, { email: "user@example.com" })).toBe(true);
    expect(evaluateCondition({ field: "email", operator: "includes", value: "@" }, { email: "invalid" })).toBe(false);
  });

  it("unknown operator returns true (pass-through)", () => {
    expect(evaluateCondition({ field: "x", operator: "unknown" as any, value: 1 }, { x: 2 })).toBe(true);
  });
});

describe("WorkflowEngine.execute", () => {
  beforeEach(() => {
    mockInsertOne.mockClear();
    mockUpdateOne.mockClear();
    mockFind.mockClear();
  });

  it("does nothing when no active workflows match", async () => {
    await WorkflowEngine.execute("t1", "CANDIDATE_SHORTLISTED", {});
    expect(mockInsertOne).not.toHaveBeenCalled();
  });
});

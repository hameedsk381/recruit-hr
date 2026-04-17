import { ObjectId } from "mongodb";
import { getMongoDb } from "../../utils/mongoClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowNodeType =
  | "trigger" | "action" | "condition" | "delay"
  | "notification" | "integration" | "approval";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  label?: string; // "true" | "false" for condition branches
}

export interface WorkflowDefinition {
  _id: ObjectId;
  tenantId: string;
  name: string;
  trigger: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRun {
  _id?: ObjectId;
  tenantId: string;
  workflowId: ObjectId;
  trigger: string;
  status: "running" | "completed" | "failed" | "paused";
  currentNodeId: string | null;
  payload: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ConditionConfig {
  field: string;
  operator: "===" | "!==" | ">" | "<" | "includes";
  value: unknown;
}

export type ActionHandler = (
  payload: Record<string, unknown>,
  config: Record<string, unknown>,
  tenantId: string
) => Promise<void>;

// ─── Condition Evaluation ─────────────────────────────────────────────────────

export function evaluateCondition(
  config: ConditionConfig,
  payload: Record<string, unknown>
): boolean {
  const fieldValue = payload[config.field];
  switch (config.operator) {
    case "===": return fieldValue === config.value;
    case "!==": return fieldValue !== config.value;
    case ">":   return Number(fieldValue) > Number(config.value);
    case "<":   return Number(fieldValue) < Number(config.value);
    case "includes": return String(fieldValue).includes(String(config.value));
    default:    return true;
  }
}

// ─── Action Dispatch ──────────────────────────────────────────────────────────

// Lazy-loaded to avoid circular imports from action handlers that use other services
const ACTION_HANDLERS: Record<string, ActionHandler> = {};

export function registerActionHandler(type: string, handler: ActionHandler): void {
  ACTION_HANDLERS[type] = handler;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class WorkflowEngine {
  static async execute(
    tenantId: string,
    trigger: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const db = getMongoDb();

    // Find all active workflows matching this trigger
    const workflows = await db
      .collection<WorkflowDefinition>("workflows")
      .find({ tenantId, trigger, isActive: true })
      .toArray();

    for (const workflow of workflows) {
      await WorkflowEngine.runWorkflow(workflow, tenantId, trigger, payload);
    }
  }

  static async runWorkflow(
    workflow: WorkflowDefinition,
    tenantId: string,
    trigger: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const db = getMongoDb();
    const runsCollection = db.collection<WorkflowRun>("workflow_runs");

    // Create run record
    const run: WorkflowRun = {
      tenantId,
      workflowId: workflow._id,
      trigger,
      status: "running",
      currentNodeId: null,
      payload,
      startedAt: new Date(),
    };

    const { insertedId } = await runsCollection.insertOne(run);
    const runId = insertedId.toString();

    try {
      // Find the trigger node as the starting point
      const startNode = workflow.nodes.find((n) => n.type === "trigger");
      if (!startNode) {
        throw new Error("Workflow has no trigger node");
      }

      // Traverse from the first non-trigger node
      const firstEdge = workflow.edges.find((e) => e.source === startNode.id);
      if (!firstEdge) {
        // No edges from trigger — nothing to execute
        await runsCollection.updateOne(
          { _id: insertedId },
          { $set: { status: "completed", completedAt: new Date(), currentNodeId: null } }
        );
        return;
      }

      await WorkflowEngine.traverseFrom(
        firstEdge.target,
        workflow,
        payload,
        tenantId,
        runId,
        runsCollection
      );

      await runsCollection.updateOne(
        { _id: insertedId },
        { $set: { status: "completed", completedAt: new Date(), currentNodeId: null } }
      );
    } catch (err: any) {
      console.error(`[WorkflowEngine] Run ${runId} failed:`, err.message);
      await runsCollection.updateOne(
        { _id: insertedId },
        { $set: { status: "failed", error: err.message, completedAt: new Date() } }
      );
    }
  }

  private static async traverseFrom(
    nodeId: string,
    workflow: WorkflowDefinition,
    payload: Record<string, unknown>,
    tenantId: string,
    runId: string,
    runsCollection: ReturnType<typeof getMongoDb>["collection"]
  ): Promise<void> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Update current node in run record
    await runsCollection.updateOne(
      { _id: new ObjectId(runId) },
      { $set: { currentNodeId: nodeId } }
    );

    let nextNodeId: string | null = null;

    switch (node.type) {
      case "action": {
        const actionType = node.config.actionType as string;
        const handler = ACTION_HANDLERS[actionType];
        if (handler) {
          await handler(payload, (node.config.params as Record<string, unknown>) ?? {}, tenantId);
        } else {
          console.warn(`[WorkflowEngine] No handler for action type: ${actionType}`);
        }
        const edge = workflow.edges.find((e) => e.source === nodeId);
        nextNodeId = edge?.target ?? null;
        break;
      }

      case "condition": {
        const result = evaluateCondition(node.config as unknown as ConditionConfig, payload);
        const label = result ? "true" : "false";
        const edge = workflow.edges.find((e) => e.source === nodeId && e.label === label)
          ?? workflow.edges.find((e) => e.source === nodeId);
        nextNodeId = edge?.target ?? null;
        break;
      }

      case "delay": {
        const delayMs = Number(node.config.delayMs ?? 0);
        if (delayMs > 0) {
          // Dynamically import to avoid circular dependency issues at startup
          const { enqueueDelayedResume } = await import("../../services/queueService");
          await enqueueDelayedResume(runId, workflow._id.toString(), nodeId, delayMs);

          await runsCollection.updateOne(
            { _id: new ObjectId(runId) },
            { $set: { status: "paused" } }
          );
          return; // BullMQ will resume from next node
        }
        const edge = workflow.edges.find((e) => e.source === nodeId);
        nextNodeId = edge?.target ?? null;
        break;
      }

      case "notification": {
        const { title, message, channels = [] } = node.config as {
          title: string; message: string; channels: string[]; recipientEmail?: string;
        };
        console.log(`[WorkflowEngine] Notification — ${title}: ${message} via ${channels.join(", ")}`);
        const edge = workflow.edges.find((e) => e.source === nodeId);
        nextNodeId = edge?.target ?? null;
        break;
      }

      case "integration": {
        console.log(`[WorkflowEngine] Integration node — type: ${node.config.integrationType}`);
        const edge = workflow.edges.find((e) => e.source === nodeId);
        nextNodeId = edge?.target ?? null;
        break;
      }

      case "approval": {
        // Pause execution until approval is granted externally
        await runsCollection.updateOne(
          { _id: new ObjectId(runId) },
          { $set: { status: "paused" } }
        );
        return;
      }

      default: {
        console.warn(`[WorkflowEngine] Unknown node type: ${node.type}`);
        const edge = workflow.edges.find((e) => e.source === nodeId);
        nextNodeId = edge?.target ?? null;
      }
    }

    if (nextNodeId) {
      await WorkflowEngine.traverseFrom(
        nextNodeId,
        workflow,
        payload,
        tenantId,
        runId,
        runsCollection as any
      );
    }
  }

  /** Resume a paused run from the node AFTER the given nodeId (used by BullMQ delay jobs). */
  static async resumeRun(
    runId: string,
    workflowId: string,
    afterNodeId: string
  ): Promise<void> {
    const db = getMongoDb();

    const run = await db
      .collection<WorkflowRun>("workflow_runs")
      .findOne({ _id: new ObjectId(runId) });

    if (!run) {
      console.warn(`[WorkflowEngine] resumeRun: run ${runId} not found`);
      return;
    }

    const workflow = await db
      .collection<WorkflowDefinition>("workflows")
      .findOne({ _id: new ObjectId(workflowId) });

    if (!workflow) {
      console.warn(`[WorkflowEngine] resumeRun: workflow ${workflowId} not found`);
      return;
    }

    await db.collection<WorkflowRun>("workflow_runs").updateOne(
      { _id: new ObjectId(runId) },
      { $set: { status: "running" } }
    );

    const edge = workflow.edges.find((e) => e.source === afterNodeId);
    if (!edge) {
      await db.collection<WorkflowRun>("workflow_runs").updateOne(
        { _id: new ObjectId(runId) },
        { $set: { status: "completed", completedAt: new Date(), currentNodeId: null } }
      );
      return;
    }

    const runsCollection = db.collection<WorkflowRun>("workflow_runs");
    try {
      await WorkflowEngine.traverseFrom(
        edge.target,
        workflow,
        run.payload,
        run.tenantId,
        runId,
        runsCollection as any
      );

      await runsCollection.updateOne(
        { _id: new ObjectId(runId) },
        { $set: { status: "completed", completedAt: new Date(), currentNodeId: null } }
      );
    } catch (err: any) {
      console.error(`[WorkflowEngine] resumeRun ${runId} failed:`, err.message);
      await runsCollection.updateOne(
        { _id: new ObjectId(runId) },
        { $set: { status: "failed", error: err.message, completedAt: new Date() } }
      );
    }
  }
}

import { Collection, ObjectId } from "mongodb";
import { getMongoDb } from "../../utils/mongoClient";
import { sendEmailAction } from "./actions/sendEmail";
import { updateStageAction } from "./actions/updateStage";
import { triggerBgvAction } from "./actions/triggerBgv";
import { publishJobAction } from "./actions/publishJob";

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
        runsCollection as Collection<WorkflowRun>
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
    startNodeId: string,
    workflow: WorkflowDefinition,
    payload: Record<string, unknown>,
    tenantId: string,
    runId: string,
    runsCollection: Collection<WorkflowRun>
  ): Promise<void> {
    const visited = new Set<string>();
    let currentId: string | null = startNodeId;

    while (currentId) {
      if (visited.has(currentId)) {
        console.error(`[WorkflowEngine] Cycle detected at node ${currentId} in workflow ${workflow._id} — stopping`);
        break;
      }
      visited.add(currentId);

      const node = workflow.nodes.find((n) => n.id === currentId);
      if (!node) break;

      await runsCollection.updateOne(
        { _id: new ObjectId(runId) },
        { $set: { currentNodeId: currentId } }
      );

      let nextId: string | null = null;

      switch (node.type) {
        case "action": {
          const actionType = node.config.actionType as string;
          const handler = ACTION_HANDLERS[actionType];
          if (handler) {
            await handler(payload, (node.config.params as Record<string, unknown>) ?? {}, tenantId);
          } else {
            console.warn(`[WorkflowEngine] No handler for action type: ${actionType}`);
          }
          nextId = workflow.edges.find((e) => e.source === currentId)?.target ?? null;
          break;
        }

        case "condition": {
          const result = evaluateCondition(node.config as unknown as ConditionConfig, payload);
          const label = result ? "true" : "false";
          nextId = (
            workflow.edges.find((e) => e.source === currentId && e.label === label) ??
            workflow.edges.find((e) => e.source === currentId)
          )?.target ?? null;
          break;
        }

        case "delay": {
          const delayMs = Number(node.config.delayMs ?? 0);
          if (delayMs > 0) {
            const { enqueueDelayedResume } = await import("../../services/queueService");
            await enqueueDelayedResume(runId, workflow._id.toString(), currentId, delayMs);
            await runsCollection.updateOne(
              { _id: new ObjectId(runId) },
              { $set: { status: "paused" } }
            );
            return; // BullMQ resumes from next node
          }
          nextId = workflow.edges.find((e) => e.source === currentId)?.target ?? null;
          break;
        }

        case "notification": {
          const { title, message, channels = [] } = node.config as {
            title: string; message: string; channels: string[]; recipientEmail?: string;
          };
          console.log(`[WorkflowEngine] Notification — ${title}: ${message} via ${channels.join(", ")}`);
          nextId = workflow.edges.find((e) => e.source === currentId)?.target ?? null;
          break;
        }

        case "integration": {
          console.log(`[WorkflowEngine] Integration node — type: ${node.config.integrationType}`);
          nextId = workflow.edges.find((e) => e.source === currentId)?.target ?? null;
          break;
        }

        case "approval": {
          await runsCollection.updateOne(
            { _id: new ObjectId(runId) },
            { $set: { status: "paused" } }
          );
          return;
        }

        default: {
          console.warn(`[WorkflowEngine] Unknown node type: ${node.type}`);
          nextId = workflow.edges.find((e) => e.source === currentId)?.target ?? null;
        }
      }

      currentId = nextId;
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
    if (run.status !== "paused") {
      console.warn(`[WorkflowEngine] resumeRun: run ${runId} not in paused state (status: ${run.status}), skipping`);
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
        runsCollection as Collection<WorkflowRun>
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

// ─── Register action handlers (module side-effect) ────────────────────────────
registerActionHandler("send_email", sendEmailAction);
registerActionHandler("update_stage", updateStageAction);
registerActionHandler("trigger_bgv", triggerBgvAction);
registerActionHandler("publish_job", publishJobAction);

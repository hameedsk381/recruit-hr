# Workflow Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate two duplicate workflow engines into one, add durable MongoDB run state, implement delay/action node types via BullMQ, add activate + history API endpoints, and complete the frontend with activation toggle and history drawer.

**Architecture:** `services/workflow/workflowEngine.ts` becomes the single engine. `services/automationEngine.ts` is deleted. Each workflow run is persisted in `workflow_runs` (MongoDB). Delay nodes enqueue a BullMQ `workflow-delay` job; when it fires, the engine resumes from the next node. Action nodes dispatch to typed handler functions in `services/workflow/actions/`.

**Tech Stack:** Bun, TypeScript, MongoDB (workflow_runs collection), BullMQ + ioredis (delay queue), existing `services/workflow/workflowEngine.ts`, `services/workflowService.ts`, `routes/v1/workflows.ts`, `frontend/src/pages/Workflows.tsx`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Delete | `services/automationEngine.ts` | Replaced by workflowEngine |
| Modify | `services/workflowService.ts` | Remove AutomationEngine import; add workflow-delay queue + worker |
| Modify | `services/workflow/workflowEngine.ts` | Durable run state, delay/action/notification/condition nodes |
| Create | `services/workflow/actions/sendEmail.ts` | Action: send email via NotificationService |
| Create | `services/workflow/actions/updateStage.ts` | Action: update candidate pipeline stage in MongoDB |
| Create | `services/workflow/actions/triggerBgv.ts` | Action: initiate BGV via BGVService |
| Create | `services/workflow/actions/publishJob.ts` | Action: publish requisition via JobBoardService |
| Modify | `routes/v1/workflows.ts` | Add activate, history, run-detail endpoints |
| Modify | `frontend/src/pages/Workflows.tsx` | Activation toggle, history dialog, create workflow form |

---

## Task 1: Delete `automationEngine.ts` and wire `WorkflowEngine` into `workflowService.ts`

**Files:**
- Delete: `services/automationEngine.ts`
- Modify: `services/workflowService.ts`

- [ ] **Step 1: Delete the duplicate engine**

```bash
rm /home/cognitbotz/recruit-hr/services/automationEngine.ts
```

- [ ] **Step 2: Update `services/workflowService.ts` — replace AutomationEngine with WorkflowEngine**

Open `services/workflowService.ts`. Replace line 5:
```typescript
import { AutomationEngine } from './automationEngine';
```
With:
```typescript
import { WorkflowEngine } from './workflow/workflowEngine';
```

Replace line 67:
```typescript
await AutomationEngine.executeWorkflow(tenantId, type, payload);
```
With:
```typescript
await WorkflowEngine.execute(tenantId, type, payload);
```

- [ ] **Step 3: Verify the server still starts**

```bash
cd /home/cognitbotz/recruit-hr && bun run index.ts &>/tmp/wf-check.log & sleep 4 && grep -E "Ready|Error|Cannot" /tmp/wf-check.log && kill $(lsof -ti:3005) 2>/dev/null
```

Expected: `[Index] Platform Ready. Serving on port 3005` — no import errors.

- [ ] **Step 4: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add services/workflowService.ts && git rm services/automationEngine.ts && git commit -m "refactor: consolidate to single WorkflowEngine, remove automationEngine"
```

---

## Task 2: Add Durable Run State to `workflowEngine.ts`

**Files:**
- Modify: `services/workflow/workflowEngine.ts`

- [ ] **Step 1: Rewrite `workflowEngine.ts` with MongoDB run persistence**

Replace the entire contents of `services/workflow/workflowEngine.ts` with:

```typescript
import { getMongoDb } from '../../utils/mongoClient';
import { ObjectId } from 'mongodb';
import { NotificationService } from '../notificationService';
import { JobBoardService } from '../jobBoardService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'notification' | 'integration';
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowDefinition {
  _id?: ObjectId;
  tenantId: string;
  name: string;
  trigger: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkflowRun {
  _id?: ObjectId;
  tenantId: string;
  workflowId: ObjectId;
  workflowName: string;
  trigger: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentNodeId: string | null;
  payload: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ─── Action type imports (lazy to avoid circular deps) ───────────────────────

type ActionType = 'send_email' | 'update_stage' | 'trigger_bgv' | 'publish_job';

async function dispatchAction(actionType: ActionType, params: Record<string, unknown>, tenantId: string, payload: Record<string, unknown>): Promise<void> {
  switch (actionType) {
    case 'send_email': {
      const { sendEmailAction } = await import('./actions/sendEmail');
      await sendEmailAction(params, tenantId, payload);
      break;
    }
    case 'update_stage': {
      const { updateStageAction } = await import('./actions/updateStage');
      await updateStageAction(params, tenantId, payload);
      break;
    }
    case 'trigger_bgv': {
      const { triggerBgvAction } = await import('./actions/triggerBgv');
      await triggerBgvAction(params, tenantId, payload);
      break;
    }
    case 'publish_job': {
      const { publishJobAction } = await import('./actions/publishJob');
      await publishJobAction(params, tenantId, payload);
      break;
    }
    default:
      console.warn(`[WorkflowEngine] Unknown action type: ${actionType}`);
  }
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class WorkflowEngine {
  /**
   * Entry point: find all active workflows matching this trigger and execute them.
   */
  static async execute(tenantId: string, trigger: string, payload: Record<string, unknown>): Promise<void> {
    const db = getMongoDb();
    const workflows = await db.collection('workflows').find({
      tenantId,
      trigger,
      isActive: true,
    }).toArray() as unknown as WorkflowDefinition[];

    for (const workflow of workflows) {
      await WorkflowEngine.startRun(workflow, payload);
    }
  }

  /**
   * Create a new workflow run document and begin DAG traversal.
   */
  static async startRun(workflow: WorkflowDefinition, payload: Record<string, unknown>): Promise<void> {
    const db = getMongoDb();

    const run: WorkflowRun = {
      tenantId: workflow.tenantId,
      workflowId: workflow._id!,
      workflowName: workflow.name,
      trigger: workflow.trigger,
      status: 'running',
      currentNodeId: null,
      payload,
      startedAt: new Date(),
    };

    const result = await db.collection('workflow_runs').insertOne(run);
    const runId = result.insertedId.toString();

    // Start from trigger node
    const triggerNode = workflow.nodes.find(n => n.type === 'trigger');
    const firstNodeId = triggerNode
      ? workflow.edges.find(e => e.source === triggerNode.id)?.target
      : workflow.nodes.find(n => !workflow.edges.some(e => e.target === n.id))?.id;

    if (!firstNodeId) {
      await WorkflowEngine.markRunCompleted(runId);
      return;
    }

    await WorkflowEngine.traverseFrom(workflow, runId, firstNodeId, payload);
  }

  /**
   * Resume a paused run from a specific node (called by delay queue worker).
   */
  static async resumeRun(runId: string, nodeId: string): Promise<void> {
    const db = getMongoDb();
    const run = await db.collection('workflow_runs').findOne({ _id: new ObjectId(runId) }) as unknown as WorkflowRun;
    if (!run || run.status !== 'paused') return;

    const workflow = await db.collection('workflows').findOne({ _id: run.workflowId }) as unknown as WorkflowDefinition;
    if (!workflow) return;

    await db.collection('workflow_runs').updateOne(
      { _id: new ObjectId(runId) },
      { $set: { status: 'running' } }
    );

    await WorkflowEngine.traverseFrom(workflow, runId, nodeId, run.payload);
  }

  /**
   * DAG traversal: execute each reachable node in order.
   */
  private static async traverseFrom(
    workflow: WorkflowDefinition,
    runId: string,
    startNodeId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const db = getMongoDb();
    let currentId: string | null = startNodeId;
    let currentPayload = { ...payload };

    while (currentId) {
      const node = workflow.nodes.find(n => n.id === currentId);
      if (!node) break;

      await db.collection('workflow_runs').updateOne(
        { _id: new ObjectId(runId) },
        { $set: { currentNodeId: currentId } }
      );

      const result = await WorkflowEngine.executeNode(node, workflow.tenantId, runId, currentPayload);

      if (result.paused) {
        // Delay node enqueued a job — stop traversal; worker will call resumeRun
        return;
      }

      if (!result.shouldContinue) break;

      if (result.nextPayload) currentPayload = result.nextPayload;

      // Move to next node (follow first matching edge)
      const nextEdge = workflow.edges.find(e => e.source === currentId);
      currentId = nextEdge?.target ?? null;
    }

    await WorkflowEngine.markRunCompleted(runId);
  }

  /**
   * Execute a single node. Returns control flags.
   */
  private static async executeNode(
    node: WorkflowNode,
    tenantId: string,
    runId: string,
    payload: Record<string, unknown>
  ): Promise<{ shouldContinue: boolean; paused?: boolean; nextPayload?: Record<string, unknown> }> {
    console.log(`[WorkflowEngine] run=${runId} node=${node.id} type=${node.type}`);

    try {
      switch (node.type) {
        case 'trigger':
          return { shouldContinue: true };

        case 'notification': {
          await NotificationService.dispatch({
            tenantId,
            recipientEmail: (node.config.recipientEmail as string) || (payload.email as string),
            title: interpolate(node.config.title as string, payload),
            message: interpolate(node.config.message as string, payload),
            channels: (node.config.channels as string[]) || ['EMAIL'],
          });
          return { shouldContinue: true };
        }

        case 'condition': {
          const passes = evaluateCondition(
            node.config.field as string,
            node.config.operator as string,
            node.config.value,
            payload
          );
          return { shouldContinue: passes };
        }

        case 'delay': {
          const delayMs = Number(node.config.delayMs) || 0;
          // Enqueue via workflowDelayQueue (imported lazily to avoid circular)
          const { enqueueDelayedResume } = await import('../workflowService');
          // Find which node comes after this delay node
          await enqueueDelayedResume(runId, node.id, delayMs);
          // Mark run as paused in DB
          const db = getMongoDb();
          await db.collection('workflow_runs').updateOne(
            { _id: new ObjectId(runId) },
            { $set: { status: 'paused', currentNodeId: node.id } }
          );
          return { shouldContinue: false, paused: true };
        }

        case 'action': {
          await dispatchAction(
            node.config.actionType as ActionType,
            (node.config.params as Record<string, unknown>) || {},
            tenantId,
            payload
          );
          return { shouldContinue: true };
        }

        case 'integration': {
          if (node.config.integrationType === 'job_board_publish') {
            console.log(`[WorkflowEngine] Integration: publish to ${node.config.platform}`);
          }
          return { shouldContinue: true };
        }

        default:
          console.warn(`[WorkflowEngine] Unhandled node type: ${(node as WorkflowNode).type}`);
          return { shouldContinue: true };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[WorkflowEngine] Node ${node.id} failed: ${message}`);
      const db = getMongoDb();
      await db.collection('workflow_runs').updateOne(
        { _id: new ObjectId(runId) },
        { $set: { status: 'failed', error: message, completedAt: new Date() } }
      );
      return { shouldContinue: false };
    }
  }

  private static async markRunCompleted(runId: string): Promise<void> {
    const db = getMongoDb();
    await db.collection('workflow_runs').updateOne(
      { _id: new ObjectId(runId) },
      { $set: { status: 'completed', completedAt: new Date(), currentNodeId: null } }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function interpolate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => String(payload[key.trim()] ?? ''));
}

function evaluateCondition(field: string, operator: string, value: unknown, payload: Record<string, unknown>): boolean {
  const fieldValue = payload[field];
  switch (operator) {
    case '===': return fieldValue === value;
    case '!==': return fieldValue !== value;
    case '>':   return Number(fieldValue) > Number(value);
    case '<':   return Number(fieldValue) < Number(value);
    case 'includes': return String(fieldValue).includes(String(value));
    default: return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add services/workflow/workflowEngine.ts && git commit -m "feat: rewrite workflowEngine with durable MongoDB run state and all node types"
```

---

## Task 3: Add Delay Queue to `workflowService.ts`

**Files:**
- Modify: `services/workflowService.ts`

The delay worker fires when the BullMQ delay expires, calls `WorkflowEngine.resumeRun`, and continues the workflow from the node after the delay node.

- [ ] **Step 1: Add delay queue, worker, and `enqueueDelayedResume` export to `workflowService.ts`**

After the existing `workflowQueue` and `workflowWorker` declarations, add:

```typescript
// ─── Delay Queue (for workflow delay nodes) ───────────────────────────────

export let workflowDelayQueue: Queue;

export interface DelayJobData {
  runId: string;
  afterNodeId: string;   // the delay node id — engine finds next node from edges
}

export async function enqueueDelayedResume(runId: string, delayNodeId: string, delayMs: number): Promise<void> {
  await workflowDelayQueue.add(
    'resume',
    { runId, afterNodeId: delayNodeId } as DelayJobData,
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    }
  );
}
```

Inside `initializeWorkflow()`, after the existing `workflowWorker` setup, add:

```typescript
  workflowDelayQueue = new Queue('workflow-delay', { connection: createRedisConnection() });

  new Worker<DelayJobData>(
    'workflow-delay',
    async (job) => {
      const { runId, afterNodeId } = job.data;
      console.log(`[DelayWorker] Resuming run ${runId} after node ${afterNodeId}`);

      const db = getMongoDb();
      const run = await db.collection('workflow_runs').findOne({ _id: new ObjectId(runId) });
      if (!run) { console.warn(`[DelayWorker] Run ${runId} not found`); return; }

      const workflow = await db.collection('workflows').findOne({ _id: run.workflowId });
      if (!workflow) { console.warn(`[DelayWorker] Workflow for run ${runId} not found`); return; }

      // Find the node that comes after the delay node
      const nextEdge = (workflow.edges as any[]).find((e: any) => e.source === afterNodeId);
      if (!nextEdge) {
        // Nothing after delay — complete the run
        await db.collection('workflow_runs').updateOne(
          { _id: new ObjectId(runId) },
          { $set: { status: 'completed', completedAt: new Date() } }
        );
        return;
      }

      await WorkflowEngine.resumeRun(runId, nextEdge.target);
    },
    { connection: createRedisConnection(), concurrency: 5 }
  );
```

Also add the missing import at the top of `workflowService.ts`:
```typescript
import { ObjectId } from 'mongodb';
import { WorkflowEngine } from './workflow/workflowEngine';
```

- [ ] **Step 2: Verify server starts cleanly**

```bash
cd /home/cognitbotz/recruit-hr && kill $(lsof -ti:3005) 2>/dev/null; sleep 1 && ALLOWED_ORIGINS="https://app.reckruit.ai" bun run index.ts &>/tmp/wf2.log & sleep 5 && grep -E "Ready|Error|Cannot|workflow" /tmp/wf2.log && kill $(lsof -ti:3005) 2>/dev/null
```

Expected: `[Workflow] Background Workers Ready` and `[Index] Platform Ready`.

- [ ] **Step 3: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add services/workflowService.ts && git commit -m "feat: add workflow-delay BullMQ queue for delay node execution"
```

---

## Task 4: Action Handlers

**Files:**
- Create: `services/workflow/actions/sendEmail.ts`
- Create: `services/workflow/actions/updateStage.ts`
- Create: `services/workflow/actions/triggerBgv.ts`
- Create: `services/workflow/actions/publishJob.ts`

- [ ] **Step 1: Create `services/workflow/actions/sendEmail.ts`**

```typescript
import { NotificationService } from '../../notificationService';

export async function sendEmailAction(
  params: Record<string, unknown>,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const recipientEmail = (params.recipientEmail as string) || (payload.email as string);
  const subject = (params.subject as string) || 'Notification from reckruit.ai';
  const body = (params.body as string) || '';

  if (!recipientEmail) {
    console.warn('[sendEmailAction] No recipient email in params or payload');
    return;
  }

  await NotificationService.dispatch({
    tenantId,
    recipientEmail,
    title: subject,
    message: body,
    channels: ['EMAIL'],
  });
}
```

- [ ] **Step 2: Create `services/workflow/actions/updateStage.ts`**

```typescript
import { getMongoDb } from '../../../utils/mongoClient';
import { ObjectId } from 'mongodb';

export async function updateStageAction(
  params: Record<string, unknown>,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const candidateId = (params.candidateId as string) || (payload.candidateId as string);
  const stage = params.stage as string;

  if (!candidateId || !stage) {
    console.warn('[updateStageAction] Missing candidateId or stage');
    return;
  }

  const db = getMongoDb();
  await db.collection('candidates').updateOne(
    { _id: new ObjectId(candidateId), tenantId },
    { $set: { 'pipeline.currentStage': stage, 'pipeline.lastActivity': new Date() } }
  );

  console.log(`[updateStageAction] Candidate ${candidateId} moved to stage: ${stage}`);
}
```

- [ ] **Step 3: Create `services/workflow/actions/triggerBgv.ts`**

```typescript
import { BGVService } from '../../bgvService';

export async function triggerBgvAction(
  params: Record<string, unknown>,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const candidateId = (params.candidateId as string) || (payload.candidateId as string);
  const offerId = (params.offerId as string) || (payload.offerId as string);
  const provider = (params.provider as string) || 'authbridge';
  const checks = (params.checks as string[]) || ['identity', 'employment', 'education'];

  if (!candidateId || !offerId) {
    console.warn('[triggerBgvAction] Missing candidateId or offerId');
    return;
  }

  await BGVService.initiate(tenantId, {
    candidateId,
    offerId,
    provider: provider as any,
    checks: checks as any[],
  });

  console.log(`[triggerBgvAction] BGV initiated for candidate ${candidateId}`);
}
```

- [ ] **Step 4: Create `services/workflow/actions/publishJob.ts`**

```typescript
import { JobBoardService } from '../../jobBoardService';

export async function publishJobAction(
  params: Record<string, unknown>,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const requisitionId = (params.requisitionId as string) || (payload.requisitionId as string);
  const platforms = (params.platforms as string[]) || ['linkedin'];

  if (!requisitionId) {
    console.warn('[publishJobAction] Missing requisitionId');
    return;
  }

  for (const platform of platforms) {
    try {
      await JobBoardService.publishToBoard(tenantId, requisitionId, platform);
      console.log(`[publishJobAction] Published requisition ${requisitionId} to ${platform}`);
    } catch (err) {
      console.error(`[publishJobAction] Failed to publish to ${platform}:`, err);
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add services/workflow/actions/ && git commit -m "feat: add workflow action handlers (sendEmail, updateStage, triggerBgv, publishJob)"
```

---

## Task 5: Add Activate + History Endpoints to `routes/v1/workflows.ts`

**Files:**
- Modify: `routes/v1/workflows.ts`

- [ ] **Step 1: Add three new handlers at the bottom of `routes/v1/workflows.ts`**

```typescript
export async function activateWorkflowHandler(req: Request, context: AuthContext, id: string) {
  if (!context.roles.includes(ROLES.ADMIN)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const isActive = Boolean(body.active);
  const db = getMongoDb();
  const result = await db.collection('workflows').updateOne(
    { _id: new ObjectId(id), tenantId: context.tenantId },
    { $set: { isActive, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    return Response.json({ success: false, error: 'Workflow not found' }, { status: 404 });
  }

  return Response.json({ success: true, isActive });
}

export async function getWorkflowHistoryHandler(req: Request, context: AuthContext, id: string) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const status = url.searchParams.get('status') || undefined;

  const db = getMongoDb();
  const filter: Record<string, unknown> = {
    workflowId: new ObjectId(id),
    tenantId: context.tenantId,
  };
  if (status) filter.status = status;

  const runs = await db.collection('workflow_runs')
    .find(filter)
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();

  return Response.json({ success: true, runs });
}

export async function getWorkflowRunHandler(req: Request, context: AuthContext, runId: string) {
  const db = getMongoDb();
  const run = await db.collection('workflow_runs').findOne({
    _id: new ObjectId(runId),
    tenantId: context.tenantId,
  });

  if (!run) {
    return Response.json({ success: false, error: 'Run not found' }, { status: 404 });
  }

  return Response.json({ success: true, run });
}
```

- [ ] **Step 2: Export the new handlers and update the import in `routes/v1/workflows.ts`**

Add to the top imports:
```typescript
import { ObjectId } from "mongodb";
```

(It's already imported — skip if present.)

- [ ] **Step 3: Wire the new routes into `index.ts`**

Find the workflow import block in `index.ts`:
```typescript
import {
  listWorkflowsHandler, createWorkflowHandler, updateWorkflowHandler, deleteWorkflowHandler
} from "./routes/v1/workflows";
```

Replace with:
```typescript
import {
  listWorkflowsHandler, createWorkflowHandler, updateWorkflowHandler, deleteWorkflowHandler,
  activateWorkflowHandler, getWorkflowHistoryHandler, getWorkflowRunHandler
} from "./routes/v1/workflows";
```

Then find the workflow routing block in `index.ts` (the block with `listWorkflowsHandler`) and add after the existing workflow routes:

```typescript
          const wfActivate = normalizedPath.match(/^\/workflows\/([^/]+)\/activate$/);
          if (wfActivate && req.method === "POST") {
            const r = await activateWorkflowHandler(req, context, wfActivate[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const wfHistory = normalizedPath.match(/^\/workflows\/([^/]+)\/history$/);
          if (wfHistory && req.method === "GET") {
            const r = await getWorkflowHistoryHandler(req, context, wfHistory[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const wfRun = normalizedPath.match(/^\/workflows\/runs\/([^/]+)$/);
          if (wfRun && req.method === "GET") {
            const r = await getWorkflowRunHandler(req, context, wfRun[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }
```

- [ ] **Step 4: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add routes/v1/workflows.ts index.ts && git commit -m "feat: add workflow activate, history, and run-detail endpoints"
```

---

## Task 6: Update `Workflows.tsx` — Activation Toggle, History Dialog, Create Form

**Files:**
- Modify: `frontend/src/pages/Workflows.tsx`

- [ ] **Step 1: Replace the full contents of `frontend/src/pages/Workflows.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import {
  GitBranch, Plus, Settings2, Bell, Zap, ArrowRight,
  CheckCircle2, Play, Trash2, Clock, MoreVertical, Activity, History, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '../api/client';

const TRIGGERS = [
  'CANDIDATE_SHORTLISTED',
  'HM_DECISION_FINALIZED',
  'INTERVIEW_CONFIRMED',
  'OFFER_SENT',
  'BGV_CLEARED',
  'CANDIDATE_APPLIED',
];

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600',
  running: 'bg-blue-500/10 text-blue-600',
  paused: 'bg-amber-500/10 text-amber-600',
  failed: 'bg-red-500/10 text-red-600',
};

export default function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyWorkflow, setHistoryWorkflow] = useState<any | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: '' });

  useEffect(() => { loadWorkflows(); }, []);

  const loadWorkflows = async () => {
    try {
      const data = await apiClient.get<{ workflows: any[] }>('/v1/workflows');
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (workflow: any) => {
    const newActive = !workflow.isActive;
    try {
      await apiClient.post(`/v1/workflows/${workflow._id}/activate`, { active: newActive });
      setWorkflows(prev => prev.map(w => w._id === workflow._id ? { ...w, isActive: newActive } : w));
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await apiClient.delete(`/v1/workflows/${id}`);
      setWorkflows(prev => prev.filter(w => w._id !== id));
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  const openHistory = async (workflow: any) => {
    setHistoryWorkflow(workflow);
    setRunsLoading(true);
    try {
      const data = await apiClient.get<{ runs: any[] }>(`/v1/workflows/${workflow._id}/history`);
      setRuns(data.runs || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.trigger) return;
    setCreating(true);
    try {
      await apiClient.post('/v1/workflows', {
        name: form.name,
        trigger: form.trigger,
        nodes: [{ id: 'trigger-1', type: 'trigger', config: {} }],
        edges: [],
        isActive: false,
      });
      setCreateOpen(false);
      setForm({ name: '', trigger: '' });
      await loadWorkflows();
    } catch (err) {
      console.error('Failed to create workflow:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Automation</h1>
          <p className="text-muted-foreground mt-1">Design and automate your recruitment operations.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Plus size={16} />
          Create Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Automations', value: workflows.filter(w => w.isActive).length, icon: <Activity className="text-emerald-500" /> },
          { label: 'Total Workflows', value: workflows.length, icon: <GitBranch className="text-blue-500" /> },
          { label: 'Paused', value: workflows.filter(w => !w.isActive).length, icon: <Clock className="text-amber-500" /> },
        ].map((stat, i) => (
          <div key={i} className="vercel-card p-6 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
              {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 20 })}
            </div>
          </div>
        ))}
      </div>

      {/* Workflow List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch size={16} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Your Workflows</h2>
        </div>

        {workflows.length === 0 ? (
          <div className="vercel-card p-12 text-center border-dashed">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Zap className="text-muted-foreground" size={24} />
            </div>
            <h3 className="text-lg font-bold">No workflows yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
              Automate approvals, notifications, and candidate handoffs.
            </p>
            <Button variant="outline" className="mt-6 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Create your first automation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {workflows.map((w) => (
              <div key={w._id} className="vercel-card p-6 group hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-lg flex items-center justify-center ${w.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      <Play size={18} fill={w.isActive ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {w.name}
                        {!w.isActive && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">PAUSED</span>}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Trigger: <span className="text-foreground font-medium">{w.trigger.replace(/_/g, ' ')}</span>
                        <span className="mx-2">·</span>
                        {w.nodes?.length ?? 0} nodes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={w.isActive}
                      onCheckedChange={() => handleToggle(w)}
                    />
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openHistory(w)}>
                      <History size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(w._id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Dialog */}
      <Dialog open={!!historyWorkflow} onOpenChange={() => setHistoryWorkflow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={18} />
              Run History — {historyWorkflow?.name}
            </DialogTitle>
          </DialogHeader>
          {runsLoading ? (
            <div className="flex justify-center py-8">
              <div className="size-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No runs yet for this workflow.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {runs.map((run) => (
                <div key={run._id} className="flex items-center justify-between px-4 py-3 rounded-lg border bg-muted/30">
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[run.status] || 'bg-muted text-muted-foreground'}`}>
                      {run.status.toUpperCase()}
                    </span>
                    {run.error && <p className="text-xs text-destructive mt-1">{run.error}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Started: {new Date(run.startedAt).toLocaleString()}</p>
                    {run.completedAt && <p>Ended: {new Date(run.completedAt).toLocaleString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Workflow Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Workflow Name</label>
              <Input
                placeholder="e.g. Notify HM on shortlist"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Trigger Event</label>
              <Select value={form.trigger} onValueChange={v => setForm(f => ({ ...f, trigger: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !form.name.trim() || !form.trigger}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add frontend/src/pages/Workflows.tsx && git commit -m "feat: update Workflows UI with activation toggle, history dialog, and create form"
```

---

## Task 7: Smoke Test

- [ ] **Step 1: Start server and verify all workflow routes respond**

```bash
cd /home/cognitbotz/recruit-hr && kill $(lsof -ti:3005) 2>/dev/null; sleep 1 && ALLOWED_ORIGINS="https://app.reckruit.ai" bun run index.ts &>/tmp/wf-final.log & sleep 5 && grep -E "Ready|Error|Cannot" /tmp/wf-final.log
```

Expected: `[Index] Platform Ready. Serving on port 3005`

- [ ] **Step 2: Verify existing test suite passes**

```bash
cd /home/cognitbotz/recruit-hr && bun test tests/versioning.test.ts tests/security.test.ts 2>&1
```

Expected: 10 pass, 0 fail.

- [ ] **Step 3: Final commit**

```bash
cd /home/cognitbotz/recruit-hr && git add . && git commit -m "feat(workflows): complete durable workflow engine with delay nodes, action handlers, activate/history API"
```

---

## Self-Review

**Spec coverage:**
- Consolidate engines → Task 1 ✅
- Durable run state (workflow_runs) → Task 2 ✅
- Delay nodes via BullMQ → Task 3 ✅
- Action nodes (send_email, update_stage, trigger_bgv, publish_job) → Task 4 ✅
- Activate endpoint → Task 5 ✅
- History endpoint → Task 5 ✅
- Run detail endpoint → Task 5 ✅
- Frontend activation toggle → Task 6 ✅
- Frontend history dialog → Task 6 ✅
- Frontend create form → Task 6 ✅

**Type consistency:** `WorkflowRun`, `WorkflowDefinition`, `WorkflowNode`, `WorkflowEdge` defined in Task 2 and used consistently. `enqueueDelayedResume` defined in Task 3 and imported lazily in Task 2's engine. `activateWorkflowHandler`, `getWorkflowHistoryHandler`, `getWorkflowRunHandler` defined in Task 5 and imported in Task 5's index.ts step. ✅

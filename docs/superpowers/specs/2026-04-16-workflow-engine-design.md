# Workflow Engine — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Goal

Complete the workflow automation system: consolidate two duplicate engines into one, add durable execution state (MongoDB + BullMQ), implement missing node types (delay, action), add activate/history endpoints, and complete the frontend with activation toggle and history view.

---

## Architecture

Single engine: `services/workflow/workflowEngine.ts`. `services/automationEngine.ts` is deleted. Workflow runs are persisted in MongoDB (`workflow_runs` collection). Delayed execution uses BullMQ (already in the stack via `services/queueService.ts`). Action handlers live in `services/workflow/actions/` — one file per action type.

---

## Data Models

### WorkflowRun (new collection: `workflow_runs`)
```typescript
interface WorkflowRun {
  _id: ObjectId;
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
```

### WorkflowDefinition (existing `workflows` collection — add `version`)
```typescript
interface WorkflowDefinition {
  _id: ObjectId;
  tenantId: string;
  name: string;
  trigger: string;       // e.g. "CANDIDATE_SHORTLISTED"
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  version: number;       // increments on each update
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkflowNode (updated type union)
```typescript
type WorkflowNodeType = "trigger" | "action" | "condition" | "delay" | "notification" | "integration";

interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  config: Record<string, unknown>;
  // config shapes per type:
  // delay:        { delayMs: number }
  // action:       { actionType: "send_email"|"update_stage"|"trigger_bgv"|"publish_job"; params: Record<string,unknown> }
  // condition:    { field: string; operator: "==="|"!=="|">"|"<"|"includes"; value: unknown }
  // notification: { recipientEmail?: string; title: string; message: string; channels: string[] }
  // integration:  { integrationType: string; platform?: string }
}
```

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Delete | `services/automationEngine.ts` | Replaced by workflowEngine |
| Modify | `services/workflow/workflowEngine.ts` | Single durable engine with MongoDB state |
| Create | `services/workflow/actions/sendEmail.ts` | Action: send email via emailService |
| Create | `services/workflow/actions/updateStage.ts` | Action: update candidate pipeline stage |
| Create | `services/workflow/actions/triggerBgv.ts` | Action: initiate BGV for candidate |
| Create | `services/workflow/actions/publishJob.ts` | Action: publish requisition to job boards |
| Modify | `routes/v1/workflows.ts` | Add activate + history endpoints |
| Modify | `services/queueService.ts` | Add workflow delay queue |
| Modify | `frontend/src/pages/Workflows.tsx` | Activation toggle, history drawer, create form |

---

## Engine Behaviour

### Execution flow
1. `WorkflowEngine.execute(tenantId, trigger, payload)` — called from existing event points in the codebase
2. Find all active workflows for this tenant + trigger
3. For each: create a `workflow_runs` doc with `status: "running"`
4. Traverse DAG from trigger node, executing each node in order
5. On `delay` node: enqueue BullMQ job with `delay: config.delayMs`, set run `status: "paused"`, return
6. BullMQ job fires → resume from next node after delay node
7. On completion: set `status: "completed"`, `completedAt: now`
8. On error: set `status: "failed"`, `error: message`

### Condition evaluation
```typescript
function evaluateCondition(config: ConditionConfig, payload: Record<string, unknown>): boolean {
  const fieldValue = payload[config.field];
  switch (config.operator) {
    case "===": return fieldValue === config.value;
    case "!==": return fieldValue !== config.value;
    case ">":   return Number(fieldValue) > Number(config.value);
    case "<":   return Number(fieldValue) < Number(config.value);
    case "includes": return String(fieldValue).includes(String(config.value));
    default: return true;
  }
}
```

### Action dispatch
```typescript
const ACTION_HANDLERS: Record<string, ActionHandler> = {
  send_email:      sendEmailAction,
  update_stage:    updateStageAction,
  trigger_bgv:     triggerBgvAction,
  publish_job:     publishJobAction,
};
```

---

## API Endpoints (additions to `routes/v1/workflows.ts`)

```
POST /v1/workflows/:id/activate    — toggle isActive (body: { active: boolean })
GET  /v1/workflows/:id/history     — list workflow_runs (query: ?limit=20&status=)
GET  /v1/workflows/runs/:runId     — single run detail
```

---

## Frontend Changes (`Workflows.tsx`)

1. **Activation toggle** — switch per row, calls `POST /v1/workflows/:id/activate`
2. **History drawer** — clicking a workflow opens a side panel listing recent runs with status badge + timestamps
3. **Create form** — modal with: name, trigger (select from enum), initial node type selector. Creates the workflow via `POST /v1/workflows` then redirects to edit.

No drag-and-drop canvas (YAGNI for now — structured form is sufficient).

---

## Callers to Update

`automationEngine.ts` is currently called from:
- `services/workflowService.ts` (background worker)

After deletion, these callers use `WorkflowEngine.execute()` directly.

---

## Error Handling

- Node execution errors are caught per-node, logged, and stored in the run doc — they do not crash the server
- Invalid workflow definition (missing nodes/edges) returns a 400 from the create endpoint
- BullMQ delay queue failures retry 3 times with exponential backoff before marking run as failed

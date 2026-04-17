import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Zap, Plus, History, Loader2, CheckCircle2,
  XCircle, Clock, PauseCircle, AlertTriangle
} from 'lucide-react';
import { cn } from "@/lib/utils";

const API_BASE = '/v1';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
  'x-tenant-id': localStorage.getItem('tenantId') || '',
});

const TRIGGER_OPTIONS = [
  { value: 'CANDIDATE_APPLIED', label: 'Candidate Applied' },
  { value: 'CANDIDATE_SHORTLISTED', label: 'Candidate Shortlisted' },
  { value: 'INTERVIEW_CONFIRMED', label: 'Interview Confirmed' },
  { value: 'OFFER_SENT', label: 'Offer Sent' },
  { value: 'BGV_CLEARED', label: 'BGV Cleared' },
  { value: 'HM_DECISION_FINALIZED', label: 'HM Decision Finalized' },
];

interface WorkflowRun {
  _id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt?: string;
  trigger: string;
  error?: string;
}

interface Workflow {
  _id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

function RunStatusBadge({ status }: { status: WorkflowRun['status'] }) {
  const config = {
    running:   { icon: Loader2,       label: 'Running',   cls: 'bg-blue-500/10 text-blue-500',    spin: true },
    completed: { icon: CheckCircle2,  label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-500', spin: false },
    failed:    { icon: XCircle,       label: 'Failed',    cls: 'bg-destructive/10 text-destructive', spin: false },
    paused:    { icon: PauseCircle,   label: 'Paused',    cls: 'bg-amber-500/10 text-amber-500',  spin: false },
  }[status] ?? { icon: AlertTriangle, label: status, cls: 'bg-muted text-muted-foreground', spin: false };

  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest", config.cls)}>
      <Icon className={cn("size-3", config.spin && "animate-spin")} />
      {config.label}
    </span>
  );
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // History drawer
  const [historyWorkflow, setHistoryWorkflow] = useState<Workflow | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflows`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setWorkflows(data.workflows ?? data.data ?? []);
    } catch (e) {
      console.error('Failed to load workflows', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (wf: Workflow, active: boolean) => {
    setTogglingId(wf._id);
    try {
      await fetch(`${API_BASE}/workflows/${wf._id}/activate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ active }),
      });
      setWorkflows(prev => prev.map(w => w._id === wf._id ? { ...w, isActive: active } : w));
    } catch (e) {
      console.error('Toggle failed', e);
    } finally {
      setTogglingId(null);
    }
  };

  const openHistory = async (wf: Workflow) => {
    setHistoryWorkflow(wf);
    setRunsLoading(true);
    setRuns([]);
    try {
      const res = await fetch(`${API_BASE}/workflows/${wf._id}/history?limit=20`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setRuns(data.runs ?? []);
    } catch (e) {
      console.error('Failed to load runs', e);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newTrigger) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: newName,
          trigger: newTrigger,
          nodes: [{ id: 'trigger-1', type: 'trigger', config: {} }],
          edges: [],
          isActive: false,
        }),
      });
      const data = await res.json();
      if (data.success || data._id || data.data?._id) {
        setShowCreate(false);
        setNewName('');
        setNewTrigger('');
        await loadWorkflows();
      } else {
        alert(`Failed to create workflow: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Failed to create workflow: ${e.message || 'Network error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-3">
            <Zap className="size-10 text-primary" />
            Automations
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Trigger actions automatically based on recruitment events.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="h-10 px-6 font-black uppercase tracking-widest gap-2"
        >
          <Plus className="size-4" />
          New Workflow
        </Button>
      </div>

      {/* Workflow List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mr-3" />
          Loading workflows...
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/50 rounded-2xl space-y-4">
          <Zap className="size-10 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No workflows yet. Create your first automation.</p>
          <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="size-4" /> New Workflow
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border/50">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trigger</th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Version</th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {workflows.map(wf => (
                <tr key={wf._id} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 font-semibold">{wf.name}</td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-muted-foreground/30 text-muted-foreground">
                      {wf.trigger}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground font-mono text-xs">v{wf.version ?? 1}</td>
                  <td className="px-5 py-4">
                    <Switch
                      checked={wf.isActive}
                      disabled={togglingId === wf._id}
                      onCheckedChange={(checked) => handleToggle(wf, checked)}
                    />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 text-xs font-bold uppercase tracking-widest"
                      onClick={() => openHistory(wf)}
                    >
                      <History className="size-3.5" />
                      History
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History Drawer */}
      <Sheet open={!!historyWorkflow} onOpenChange={() => setHistoryWorkflow(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-black uppercase tracking-tight">
              {historyWorkflow?.name} — Run History
            </SheetTitle>
            <SheetDescription>
              Last 20 executions. Trigger: <span className="font-mono text-xs">{historyWorkflow?.trigger}</span>
            </SheetDescription>
          </SheetHeader>

          {runsLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="size-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No runs yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map(run => (
                <div key={run._id} className="p-4 rounded-xl border border-border/50 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <RunStatusBadge status={run.status} />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                  {run.completedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Completed: {new Date(run.completedAt).toLocaleString()}
                    </p>
                  )}
                  {run.error && (
                    <p className="text-[10px] text-destructive font-mono bg-destructive/5 rounded p-2">
                      {run.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Workflow Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Workflow</DialogTitle>
            <DialogDescription>
              Give your automation a name and choose what event triggers it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Workflow Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Send welcome email on apply"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Trigger Event <span className="text-destructive">*</span>
              </label>
              <Select value={newTrigger} onValueChange={setNewTrigger}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newName || !newTrigger || isCreating}
            >
              {isCreating ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

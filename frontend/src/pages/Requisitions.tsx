import { useState, useEffect } from 'react';
import api from '../api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-zinc-600',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    published: 'bg-blue-100 text-blue-700',
    closed: 'bg-zinc-200 text-muted-foreground',
    frozen: 'bg-red-100 text-red-600',
};

const EMPTY_FORM = {
    title: '', department: '', location: '', headcount: 1,
    budgetMin: '', budgetMax: '', currency: 'USD',
    justification: '', hiringManagerId: '', targetHireDate: '',
};

export default function Requisitions() {
    const [reqs, setReqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.listRequisitions(filter ? { status: filter } : undefined);
            if (res.success) setReqs(res.requisitions);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createRequisition({
                title: form.title,
                department: form.department,
                location: form.location,
                headcount: Number(form.headcount),
                budgetBand: { min: Number(form.budgetMin), max: Number(form.budgetMax), currency: form.currency },
                justification: form.justification,
                hiringManagerId: form.hiringManagerId,
                targetHireDate: form.targetHireDate,
            });
            setShowForm(false);
            setForm(EMPTY_FORM);
            load();
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async (id: string, decision: 'approved' | 'rejected') => {
        await api.approveRequisition(id, { decision });
        load();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Requisitions</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage job requisition approvals and lifecycle</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
                    <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-2">
                        <Plus size={14} /> New Requisition
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex gap-2 flex-wrap">
                {['', 'draft', 'pending_approval', 'approved', 'published', 'closed'].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={cn('px-3 py-1 rounded-full text-xs font-bold border transition-colors',
                            filter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'
                        )}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="border rounded-xl p-6 space-y-4 bg-muted/20">
                    <h2 className="font-bold text-sm uppercase tracking-widest">New Requisition</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Job Title</label>
                            <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Department</label>
                            <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Location</label>
                            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Headcount</label>
                            <input type="number" min="1" value={form.headcount} onChange={e => setForm(p => ({ ...p, headcount: Number(e.target.value) }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Target Hire Date</label>
                            <input type="date" value={form.targetHireDate} onChange={e => setForm(p => ({ ...p, targetHireDate: e.target.value }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Budget Min</label>
                            <input type="number" value={form.budgetMin} onChange={e => setForm(p => ({ ...p, budgetMin: e.target.value }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Budget Max</label>
                            <input type="number" value={form.budgetMax} onChange={e => setForm(p => ({ ...p, budgetMax: e.target.value }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Justification</label>
                            <textarea required value={form.justification} onChange={e => setForm(p => ({ ...p, justification: e.target.value }))}
                                rows={3} className="w-full px-3 py-2 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Hiring Manager ID</label>
                            <input value={form.hiringManagerId} onChange={e => setForm(p => ({ ...p, hiringManagerId: e.target.value }))}
                                className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Creating…' : 'Create Requisition'}</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                    </div>
                </form>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin size-6 border-2 border-foreground border-t-transparent rounded-full opacity-40" /></div>
            ) : reqs.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">No requisitions found.</div>
            ) : (
                <div className="space-y-3">
                    {reqs.map((r: any) => (
                        <div key={r._id} className="border rounded-xl overflow-hidden">
                            <button className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                                onClick={() => setExpanded(expanded === r._id ? null : r._id)}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-sm">{r.title}</span>
                                        <Badge className={cn('text-[10px] px-2 py-0', STATUS_COLORS[r.status] || '')}>{r.status}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{r.department} · {r.location} · {r.headcount} headcount</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {r.status === 'pending_approval' && (
                                        <div className="flex gap-1">
                                            <button onClick={e => { e.stopPropagation(); handleApprove(r._id, 'approved'); }}
                                                className="p-1.5 rounded-md hover:bg-green-100 text-green-600 transition-colors"><CheckCircle size={14} /></button>
                                            <button onClick={e => { e.stopPropagation(); handleApprove(r._id, 'rejected'); }}
                                                className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors"><XCircle size={14} /></button>
                                        </div>
                                    )}
                                    {expanded === r._id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                                </div>
                            </button>
                            {expanded === r._id && (
                                <div className="px-5 pb-4 pt-2 border-t bg-muted/10 space-y-2">
                                    <p className="text-xs text-muted-foreground"><span className="font-bold">Justification:</span> {r.justification || '—'}</p>
                                    <p className="text-xs text-muted-foreground"><span className="font-bold">Budget:</span> {r.budgetBand?.currency} {r.budgetBand?.min?.toLocaleString()} – {r.budgetBand?.max?.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground"><span className="font-bold">Target hire:</span> {r.targetHireDate ? new Date(r.targetHireDate).toLocaleDateString() : '—'}</p>
                                    {r.approvalChain?.length > 0 && (
                                        <div className="flex gap-2 flex-wrap pt-1">
                                            {r.approvalChain.map((step: any, i: number) => (
                                                <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border">
                                                    {step.status === 'approved' ? <CheckCircle size={10} className="text-green-500" /> :
                                                        step.status === 'rejected' ? <XCircle size={10} className="text-red-500" /> :
                                                            <Clock size={10} className="text-yellow-500" />}
                                                    {step.approverRole}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import api from '../api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-700',
    reviewing: 'bg-yellow-100 text-yellow-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    hired: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
};

const STATUSES = ['submitted', 'reviewing', 'shortlisted', 'hired', 'rejected'];

const EMPTY_FORM = { referrerId: '', candidateName: '', candidateEmail: '', candidatePhone: '', notes: '' };

export default function Referrals() {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.listReferrals(filter ? { status: filter } : undefined);
            if (res.success) setReferrals(res.referrals);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [filter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.submitReferral({
                referrerId: form.referrerId,
                candidateName: form.candidateName,
                candidateEmail: form.candidateEmail,
                candidatePhone: form.candidatePhone || undefined,
                notes: form.notes || undefined,
            });
            setShowForm(false);
            setForm(EMPTY_FORM);
            load();
        } finally { setSaving(false); }
    };

    const handleStatus = async (id: string, status: string) => {
        await api.updateReferralStatus(id, status);
        load();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Referrals</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track and manage employee referrals</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
                    <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-2">
                        <Plus size={14} /> New Referral
                    </Button>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                {['', ...STATUSES].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={cn('px-3 py-1 rounded-full text-xs font-bold border transition-colors',
                            filter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground')}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded-xl p-5 space-y-3 bg-muted/20">
                    <h3 className="text-xs font-black uppercase tracking-widest">Submit Referral</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            ['Referrer ID *', 'referrerId', 'text', true],
                            ['Candidate Name *', 'candidateName', 'text', true],
                            ['Candidate Email *', 'candidateEmail', 'email', true],
                            ['Candidate Phone', 'candidatePhone', 'tel', false],
                        ].map(([label, key, type, req]) => (
                            <div key={key as string}>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">{label}</label>
                                <input required={req as boolean} type={type as string}
                                    value={(form as any)[key as string]}
                                    onChange={e => setForm(p => ({ ...p, [key as string]: e.target.value }))}
                                    className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </div>
                        ))}
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Notes</label>
                            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                rows={2} className="w-full px-3 py-2 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Submitting…' : 'Submit Referral'}</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                    </div>
                </form>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin size-6 border-2 border-foreground border-t-transparent rounded-full opacity-40" /></div>
            ) : referrals.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">No referrals found.</div>
            ) : (
                <div className="space-y-3">
                    {referrals.map((r: any) => (
                        <div key={r._id} className="border rounded-xl px-5 py-4 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">{r.candidateName}</span>
                                    <Badge className={cn('text-[10px] px-2', STATUS_COLORS[r.status] || '')}>{r.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{r.candidateEmail} · Referred by {r.referrerId}</p>
                                {r.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{r.notes}"</p>}
                            </div>
                            <div className="shrink-0">
                                <select value={r.status}
                                    onChange={e => handleStatus(r._id, e.target.value)}
                                    className="h-8 px-2 bg-background border rounded-md text-xs outline-none">
                                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

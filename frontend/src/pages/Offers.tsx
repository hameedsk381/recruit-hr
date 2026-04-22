import { useState, useEffect } from 'react';
import api from '../api/client';
import { useApp } from '../context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-zinc-600',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    sent: 'bg-blue-100 text-blue-700',
    signed: 'bg-emerald-100 text-emerald-700',
    declined: 'bg-red-100 text-red-600',
    expired: 'bg-zinc-200 text-muted-foreground',
    withdrawn: 'bg-zinc-200 text-muted-foreground',
};

const EMPTY_FORM = {
    candidateId: '', jobId: '', requisitionId: '',
    base: '', currency: 'USD', bonus: '', equity: '', signingBonus: '',
    startDate: '', expiryDays: '7',
    notes: '',
};

export default function Offers() {
    const { offerDraft, setOfferDraft } = useApp();
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.listOffers(filter ? { status: filter } : undefined);
            if (res.success) setOffers(res.offers);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        if (offerDraft) {
            setForm({
                ...EMPTY_FORM,
                candidateId: offerDraft.candidateId || '',
                jobId: offerDraft.jobId || '',
                notes: `Offer for ${offerDraft.candidateName || 'Candidate'} for ${offerDraft.jobTitle || 'Position'}`
            });
            setShowForm(true);
            setOfferDraft(null); // Clear after consuming
        }
    }, [offerDraft, setOfferDraft]);

    useEffect(() => { load(); }, [filter]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createOffer({
                candidateId: form.candidateId,
                jobId: form.jobId,
                requisitionId: form.requisitionId || undefined,
                compensation: {
                    base: Number(form.base),
                    currency: form.currency,
                    bonus: form.bonus ? Number(form.bonus) : undefined,
                    equity: form.equity || undefined,
                    signingBonus: form.signingBonus ? Number(form.signingBonus) : undefined,
                    benefits: [],
                },
                startDate: form.startDate || undefined,
                expiryDays: Number(form.expiryDays),
                notes: form.notes || undefined,
            });
            setShowForm(false);
            setForm(EMPTY_FORM);
            load();
        } finally { setSaving(false); }
    };

    const handleSend = async (id: string) => {
        await api.sendOffer(id);
        load();
    };

    const handleWithdraw = async (id: string) => {
        await api.withdrawOffer(id, 'Withdrawn by recruiter');
        load();
    };

    const STATUSES = ['draft', 'pending_approval', 'approved', 'sent', 'signed', 'declined'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Offers</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage offer creation, approval, and e-signing</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
                    <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-2">
                        <Plus size={14} /> Create Offer
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

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="border rounded-xl p-5 space-y-3 bg-muted/20">
                    <h3 className="text-xs font-black uppercase tracking-widest">Create Offer</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Candidate ID *</label>
                            <input required value={form.candidateId} onChange={e => setForm(p => ({ ...p, candidateId: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Job ID *</label>
                            <input required value={form.jobId} onChange={e => setForm(p => ({ ...p, jobId: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Base Salary *</label>
                            <input required type="number" value={form.base} onChange={e => setForm(p => ({ ...p, base: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Currency</label>
                            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none">
                                {['USD', 'INR', 'EUR', 'GBP', 'SGD'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Bonus</label>
                            <input type="number" value={form.bonus} onChange={e => setForm(p => ({ ...p, bonus: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Signing Bonus</label>
                            <input type="number" value={form.signingBonus} onChange={e => setForm(p => ({ ...p, signingBonus: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Start Date</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Expires in (days)</label>
                            <input type="number" min="1" value={form.expiryDays} onChange={e => setForm(p => ({ ...p, expiryDays: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Creating…' : 'Create Offer'}</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                    </div>
                </form>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin size-6 border-2 border-foreground border-t-transparent rounded-full opacity-40" /></div>
            ) : offers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">No offers found.</div>
            ) : (
                <div className="space-y-3">
                    {offers.map((o: any) => (
                        <div key={o._id} className="border rounded-xl px-5 py-4 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">Offer to {o.candidateId}</span>
                                    <Badge className={cn('text-[10px] px-2', STATUS_COLORS[o.status] || '')}>{o.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {o.compensation?.currency} {o.compensation?.base?.toLocaleString()} base
                                    {o.compensation?.bonus ? ` + ${o.compensation.bonus.toLocaleString()} bonus` : ''}
                                </p>
                                {o.startDate && <p className="text-xs text-muted-foreground">Start: {new Date(o.startDate).toLocaleDateString()}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {o.status === 'approved' && (
                                    <button onClick={() => handleSend(o._id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
                                        <Send size={11} /> Send
                                    </button>
                                )}
                                {['draft', 'pending_approval', 'approved', 'sent'].includes(o.status) && (
                                    <button onClick={() => handleWithdraw(o._id)}
                                        className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

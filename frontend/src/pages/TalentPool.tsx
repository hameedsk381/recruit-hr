import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, RefreshCw, Tag, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageGuide } from '@/components/PageGuide';

const SOURCE_COLORS: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700',
    sourced: 'bg-purple-100 text-purple-700',
    referred: 'bg-green-100 text-green-700',
    imported: 'bg-muted text-zinc-600',
    rehire: 'bg-yellow-100 text-yellow-700',
};

const EMPTY_FORM = {
    name: '', email: '', phone: '', linkedin: '',
    currentRole: '', currentCompany: '', location: '',
    experienceYears: '', skills: '',
    source: 'sourced', tags: '',
};

export default function TalentPool() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState<any | null>(null);
    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.searchTalentPool({
                q: query || undefined,
                source: sourceFilter || undefined,
                limit: 30,
            });
            if (res.success) { setProfiles(res.profiles); setTotal(res.total); }
        } finally { setLoading(false); }
    }, [query, sourceFilter]);

    useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.addToTalentPool({
                source: form.source,
                candidate: {
                    name: form.name,
                    email: form.email,
                    phone: form.phone || undefined,
                    linkedin: form.linkedin || undefined,
                    currentRole: form.currentRole || undefined,
                    currentCompany: form.currentCompany || undefined,
                    location: form.location || undefined,
                    experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
                    skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                },
                tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
            });
            setShowAdd(false);
            setForm(EMPTY_FORM);
            load();
        } finally { setSaving(false); }
    };

    const handleAddNote = async () => {
        if (!selected || !noteText.trim()) return;
        setAddingNote(true);
        try {
            const res = await api.addTalentNote(selected._id, noteText);
            if (res.success) { setSelected(res.profile); setNoteText(''); }
        } finally { setAddingNote(false); }
    };

    return (
        <div className="space-y-4">
            <PageGuide
              pageKey="talent-pool"
              title="How the Talent Pool Works"
              steps={[
                { title: "Add candidates", description: "Click 'Add to Pool' to manually add sourced, referred, or silver-medalist candidates. You can also bulk import from a previous ATS export." },
                { title: "Semantic search", description: "The search bar uses AI embeddings — type 'senior React engineer in Bangalore' and it finds semantically similar profiles, not just keyword matches." },
                { title: "Tag and nurture", description: "Add tags (e.g. 'strong culture fit', 'revisit Q3') and notes to any profile. Tagged candidates can be enrolled in nurture sequences from the Outreach section." },
                { title: "Re-engage over time", description: "Filter by source (referred, sourced, applied) to find warm candidates for new openings without re-posting or paying job board fees." },
              ]}
              tips={[
                "Add a note immediately after a conversation — context fades fast.",
                "Tags are searchable — use consistent naming (e.g. 'senior', 'mid', 'junior') for better filtering.",
                "Silver medalists (2nd-place finishers) close 3× faster than cold sourced candidates.",
              ]}
            />
        <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Left: List */}
            <div className="flex-1 min-w-0 space-y-4 overflow-y-auto pr-1">
                <div className="flex items-center justify-between sticky top-0 bg-background pb-2">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Talent Pool</h1>
                        <p className="text-xs text-muted-foreground">{total} profiles</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
                        <Button size="sm" onClick={() => setShowAdd(v => !v)} className="gap-2">
                            <UserPlus size={14} /> Add Profile
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <input value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Search name, skills, role…"
                            className="w-full h-9 pl-9 pr-4 bg-muted/50 border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                        className="h-9 px-3 bg-background border rounded-md text-sm outline-none">
                        <option value="">All Sources</option>
                        {['applied', 'sourced', 'referred', 'imported', 'rehire'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Add Form */}
                {showAdd && (
                    <form onSubmit={handleAdd} className="border rounded-xl p-5 space-y-3 bg-muted/20">
                        <h3 className="text-xs font-black uppercase tracking-widest">Add to Talent Pool</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ['Name *', 'name', 'text', true],
                                ['Email *', 'email', 'email', true],
                                ['Phone', 'phone', 'tel', false],
                                ['LinkedIn', 'linkedin', 'url', false],
                                ['Current Role', 'currentRole', 'text', false],
                                ['Current Company', 'currentCompany', 'text', false],
                                ['Location', 'location', 'text', false],
                                ['Years Exp', 'experienceYears', 'number', false],
                            ].map(([label, key, type, req]) => (
                                <div key={key as string}>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">{label}</label>
                                    <input required={req as boolean} type={type as string}
                                        value={(form as any)[key as string]}
                                        onChange={e => setForm(p => ({ ...p, [key as string]: e.target.value }))}
                                        className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                            ))}
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Source</label>
                                <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                                    className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none">
                                    {['applied', 'sourced', 'referred', 'imported', 'rehire'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Skills (comma-sep)</label>
                                <input value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                                    className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Tags (comma-sep)</label>
                                <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                                    className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Adding…' : 'Add Profile'}</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                        </div>
                    </form>
                )}

                {/* Profiles */}
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin size-6 border-2 border-foreground border-t-transparent rounded-full opacity-40" /></div>
                ) : profiles.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">No profiles found.</div>
                ) : (
                    <div className="space-y-2">
                        {profiles.map((p: any) => (
                            <button key={p._id} onClick={() => setSelected(selected?._id === p._id ? null : p)}
                                className={cn('w-full text-left border rounded-xl px-4 py-3 hover:bg-muted/30 transition-colors',
                                    selected?._id === p._id && 'bg-muted border-foreground/30')}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-sm">{p.candidate?.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">{p.candidate?.currentRole} {p.candidate?.currentCompany ? `@ ${p.candidate.currentCompany}` : ''}</span>
                                    </div>
                                    <Badge className={cn('text-[10px] px-2', SOURCE_COLORS[p.source] || '')}>{p.source}</Badge>
                                </div>
                                {p.tags?.length > 0 && (
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                        {p.tags.map((t: string) => (
                                            <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                                                <Tag size={8} />{t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Detail */}
            {selected && (
                <div className="w-80 shrink-0 border rounded-xl p-5 space-y-4 overflow-y-auto">
                    <div>
                        <h2 className="font-black text-base">{selected.candidate?.name}</h2>
                        <p className="text-xs text-muted-foreground">{selected.candidate?.email}</p>
                        {selected.candidate?.phone && <p className="text-xs text-muted-foreground">{selected.candidate.phone}</p>}
                    </div>
                    <div className="space-y-1">
                        {selected.candidate?.currentRole && <p className="text-xs"><span className="font-bold">Role:</span> {selected.candidate.currentRole}</p>}
                        {selected.candidate?.currentCompany && <p className="text-xs"><span className="font-bold">Company:</span> {selected.candidate.currentCompany}</p>}
                        {selected.candidate?.location && <p className="text-xs"><span className="font-bold">Location:</span> {selected.candidate.location}</p>}
                        {selected.candidate?.experienceYears != null && <p className="text-xs"><span className="font-bold">Experience:</span> {selected.candidate.experienceYears} yrs</p>}
                    </div>
                    {selected.candidate?.skills?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Skills</p>
                            <div className="flex flex-wrap gap-1">
                                {selected.candidate.skills.map((s: string) => (
                                    <span key={s} className="px-2 py-0.5 bg-muted rounded text-xs font-medium">{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
                        <div className="space-y-2 mb-3">
                            {selected.notes?.length > 0 ? selected.notes.map((n: any, i: number) => (
                                <div key={i} className="text-xs bg-muted/50 rounded-md px-3 py-2">
                                    <p>{n.text}</p>
                                    <p className="text-muted-foreground text-[10px] mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                                </div>
                            )) : <p className="text-xs text-muted-foreground">No notes yet.</p>}
                        </div>
                        <div className="flex gap-2">
                            <input value={noteText} onChange={e => setNoteText(e.target.value)}
                                placeholder="Add a note…"
                                className="flex-1 h-8 px-3 bg-background border rounded-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                                className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40">
                                <StickyNote size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}

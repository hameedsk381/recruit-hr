import { useState, useEffect } from 'react';
import api from '../api/client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Search, BookOpen, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageGuide } from '@/components/PageGuide';

const DOC_TYPES = ['comp_bands', 'role_framework', 'policy', 'handbook', 'sop', 'other'];
const TYPE_LABELS: Record<string, string> = {
    comp_bands: 'Comp Bands', role_framework: 'Role Framework', policy: 'Policy',
    handbook: 'Handbook', sop: 'SOP', other: 'Other',
};

export default function Knowledge() {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showIngest, setShowIngest] = useState(false);
    const [form, setForm] = useState({ filename: '', type: 'policy', description: '', text: '' });
    const [saving, setSaving] = useState(false);
    const [question, setQuestion] = useState('');
    const [querying, setQuerying] = useState(false);
    const [answer, setAnswer] = useState<{ answer: string; citations: any[]; confidence: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.listKnowledgeDocs();
            if (res.success) setDocs(res.documents);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleIngest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.text.trim()) return;
        setSaving(true);
        try {
            await api.ingestDocument({
                text: form.text,
                filename: form.filename,
                type: form.type as any,
                description: form.description || undefined,
            });
            setShowIngest(false);
            setForm({ filename: '', type: 'policy', description: '', text: '' });
            load();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await api.deleteKnowledgeDoc(id);
        load();
    };

    const handleQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;
        setQuerying(true); setAnswer(null);
        try {
            const res = await api.queryKnowledge(question);
            if (res.success) setAnswer({ answer: res.answer, citations: res.citations, confidence: res.confidence });
        } finally { setQuerying(false); }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <PageGuide
              pageKey="knowledge"
              title="How the Knowledge Base Works"
              steps={[
                { title: "Ingest your documents", description: "Click 'Add Document' and paste in the text of your HR policies, comp bands, role frameworks, or SOPs. Give each a descriptive name and type." },
                { title: "Ask questions naturally", description: "Use the search bar to ask questions in plain English — e.g. 'What is the leave policy for new employees?' The AI retrieves relevant passages and cites the source." },
                { title: "Answers cite sources", description: "Every answer includes citations pointing back to the specific document it drew from, so you can verify accuracy." },
                { title: "Keep it updated", description: "Delete outdated documents and re-ingest updated versions. The AI always uses the latest ingested version." },
              ]}
              tips={[
                "Use descriptive filenames — the AI uses them to understand document context.",
                "Comp bands and role frameworks work best as structured text (not PDFs scanned as images).",
                "The knowledge base is per-tenant — each company's data is isolated.",
              ]}
            />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Knowledge Base</h1>
                    <p className="text-sm text-muted-foreground mt-1">Company documents for AI-powered Q&A</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
                    <Button size="sm" onClick={() => setShowIngest(v => !v)} className="gap-2">
                        <Plus size={14} /> Add Document
                    </Button>
                </div>
            </div>

            {/* Query Box */}
            <form onSubmit={handleQuery} className="border rounded-xl p-5 bg-muted/10 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={14} className="text-muted-foreground" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ask the Knowledge Base</span>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <input value={question} onChange={e => setQuestion(e.target.value)}
                            placeholder="What is our standard notice period for senior engineers?"
                            className="w-full h-10 pl-9 pr-4 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <Button type="submit" size="sm" disabled={querying || !question.trim()}>
                        {querying ? 'Searching…' : 'Ask'}
                    </Button>
                </div>
                {answer && (
                    <div className="space-y-3 pt-1">
                        <div className="bg-background border rounded-lg p-4">
                            <p className="text-sm leading-relaxed">{answer.answer}</p>
                            <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">Confidence: {answer.confidence}</p>
                        </div>
                        {answer.citations?.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Sources</p>
                                <div className="space-y-1.5">
                                    {answer.citations.map((c: any, i: number) => (
                                        <div key={i} className="text-xs bg-muted/50 rounded-md px-3 py-2">
                                            <p className="font-bold text-[10px] uppercase tracking-widest mb-1">{c.filename}</p>
                                            <p className="text-muted-foreground">{c.excerpt}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </form>

            {/* Ingest Form */}
            {showIngest && (
                <form onSubmit={handleIngest} className="border rounded-xl p-5 space-y-3 bg-muted/20">
                    <h3 className="text-xs font-black uppercase tracking-widest">Add Document</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Filename *</label>
                            <input required value={form.filename} onChange={e => setForm(p => ({ ...p, filename: e.target.value }))}
                                placeholder="compensation-bands-2026.pdf"
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Type</label>
                            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none">
                                {DOC_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Description</label>
                            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                className="w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Document Text *</label>
                            <textarea required value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                                rows={6} placeholder="Paste the document content here…"
                                className="w-full px-3 py-2 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Ingesting…' : 'Ingest Document'}</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowIngest(false)}>Cancel</Button>
                    </div>
                </form>
            )}

            {/* Document List */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Indexed Documents ({docs.length})</p>
                {loading ? (
                    <div className="flex justify-center py-8"><div className="animate-spin size-5 border-2 border-foreground border-t-transparent rounded-full opacity-40" /></div>
                ) : docs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No documents indexed yet. Add one above to get started.</div>
                ) : (
                    <div className="space-y-2">
                        {docs.map((d: any) => (
                            <div key={d._id} className="border rounded-lg px-4 py-3 flex items-center gap-3">
                                <BookOpen size={14} className="text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{d.filename}</p>
                                    <p className="text-xs text-muted-foreground">{TYPE_LABELS[d.type] || d.type}{d.description ? ` · ${d.description}` : ''}</p>
                                </div>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                                    d.type === 'comp_bands' ? 'bg-green-100 text-green-700' :
                                    d.type === 'policy' ? 'bg-blue-100 text-blue-700' :
                                    'bg-muted text-zinc-600')}>
                                    {TYPE_LABELS[d.type] || d.type}
                                </span>
                                <button onClick={() => handleDelete(d._id)}
                                    className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

import { 
    Globe, 
    Linkedin, 
    Users,
    ExternalLink, 
    Plus, 
    Download,
    Search,
    Filter,
    UserPlus,
    Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '../api/client';

export default function Sourcing() {
    const [prospects, setProspects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProspects = async () => {
        setLoading(true);
        try {
            const res = await api.getSourcingList();
            if (res.success) {
                setProspects(res.prospects);
            }
        } catch (error) {
            console.error("Failed to load prospects", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProspects();
    }, []);

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/50 pb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Globe className="size-6" />
                        Outbound Sourcing
                    </h1>
                    <p className="text-sm text-muted-foreground">Save and organize potential candidates from across the web.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="default" size="sm" className="h-9 px-4 font-medium bg-indigo-600 hover:bg-indigo-700">
                        <Download size={14} className="mr-2" />
                        Download Chrome Extension
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Stats & Help */}
                <aside className="lg:col-span-1 space-y-6">
                    <div className="vercel-card p-5 space-y-4 bg-card border-indigo-500/20">
                        <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                            <Plus size={20} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-sm">How it works</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Install the Reckruit Sourcing Extension to add a "Push to Talent Pool" button directly on LinkedIn, GitHub, or any professional network.
                            </p>
                        </div>
                    </div>

                    <div className="vercel-card p-5 space-y-4 bg-card">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sourcing Stats</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Total Sourced</span>
                                <span className="text-xs font-bold">{prospects.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Network Prospects</span>
                                <span className="text-xs font-bold">{prospects.length}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Prospects Table */}
                <main className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                         <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <input 
                                type="text" 
                                placeholder="Search prospects..." 
                                className="w-full bg-muted/30 border border-border/50 rounded-md py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider">
                            <Filter size={12} className="mr-2" />
                            Filters
                        </Button>
                    </div>

                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <div className="size-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-medium">Loading prospects...</span>
                        </div>
                    ) : prospects.length > 0 ? (
                        <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                                    <tr>
                                         <th className="px-6 py-4">Candidate</th>
                                         <th className="px-6 py-4">Where from</th>
                                         <th className="px-6 py-4">Saved on</th>
                                         <th className="px-6 py-4">Status</th>
                                         <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border/30">
                                    {prospects.map((p) => (
                                        <tr key={p._id || p.id} className="hover:bg-muted/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground">{p.profile?.name || 'Anonymous'}</span>
                                                    <span className="text-[11px] text-muted-foreground">{p.profile?.headline || p.role || 'Professional'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {p.source.includes('linkedin') ? <Linkedin size={14} className="text-blue-600" /> : <Users size={14} className="text-slate-500" />}
                                                    <span className="text-xs text-muted-foreground">{p.source}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Clock size={12} />
                                                    {new Date(p.ingestedAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-bold uppercase px-2">
                                                    {p.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" asChild>
                                                        <a href={p.externalUrl} target="_blank" rel="noreferrer">
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8 text-indigo-600 hover:bg-indigo-50">
                                                        <UserPlus size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-64 vercel-card flex flex-col items-center justify-center text-center p-8">
                            <Plus size={32} className="text-muted-foreground/30 mb-4" />
                            <h3 className="font-bold">No prospects yet</h3>
                            <p className="text-sm text-muted-foreground max-w-[240px] mt-1">Start sourcing by installing the Chrome Extension and visiting profile pages.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

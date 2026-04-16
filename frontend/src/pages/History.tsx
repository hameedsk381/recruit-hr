import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Clock, 
    ChevronRight, 
    Search, 
    Users, 
    CheckCircle2, 
    AlertCircle, 
    Layers,
    History as HistoryIcon
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function History() {
    const { setView, loadCampaign } = useApp();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.getRecruiterHistory();
                if (res.success) {
                    setHistory(res.history);
                }
            } catch (err) {
                console.error('Failed to load history', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleLoadBatch = async (batchId: string) => {
        try {
            await loadCampaign(batchId);
            // view switching is handled inside loadCampaign
        } catch (err) {
            console.error('Failed to load batch', err);
        }
    };

    const filteredHistory = history.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="animate-spin size-8 border-2 border-foreground border-t-transparent rounded-full opacity-50" />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <HistoryIcon className="size-6" />
                        Campaign History
                    </h1>
                    <p className="text-sm text-muted-foreground">Review and restore previous talent acquisition batches.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Search campaigns…"
                        className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:ring-1 focus:ring-foreground outline-none transition-all placeholder:text-muted-foreground"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                    <div className="p-4 bg-muted/50 rounded-full">
                        <Layers className="size-10 text-muted-foreground/60" />
                    </div>
                    <div className="max-w-xs space-y-1.5">
                        <h3 className="text-sm font-semibold text-foreground">No History Yet</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Once you start matching resumes, your previous batches will appear here for easy access.</p>
                    </div>
                    <Button onClick={() => setView('setup')} size="sm" className="mt-2 text-xs font-semibold">Start New Search</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredHistory.map((item) => (
                        <div 
                            key={item.id} 
                            className="vercel-card !p-0 overflow-hidden hover:border-foreground/20 group cursor-pointer transition-all bg-card"
                            onClick={() => handleLoadBatch(item.id)}
                        >
                            <div className="flex flex-col md:flex-row items-center">
                                <div className="p-5 flex-1 space-y-3 min-w-0 w-full">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{item.title}</h3>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={14} className="opacity-70" />
                                                    {new Date(item.date).toLocaleDateString(undefined, { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        year: 'numeric' 
                                                    })}
                                                </span>
                                                <span className="size-1 bg-border rounded-full" />
                                                <span className="flex items-center gap-1.5">
                                                    <Users size={14} className="opacity-70" />
                                                    {item.candidateCount} Candidates
                                                </span>
                                            </div>
                                        </div>
                                        <Badge 
                                            variant={item.status === 'COMPLETED' ? 'secondary' : 'outline'}
                                            className={cn(
                                                "shrink-0 h-6 px-2.5 text-[10px] uppercase tracking-wider font-semibold border-none",
                                                item.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
                                            )}
                                        >
                                            {item.status === 'COMPLETED' ? (
                                                <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Processed</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><AlertCircle size={12} /> {item.status}</span>
                                            )}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="hidden md:flex w-16 self-stretch border-l border-border/50 bg-muted/10 items-center justify-center group-hover:bg-muted/30 transition-colors">
                                    <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-all group-hover:translate-x-0.5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

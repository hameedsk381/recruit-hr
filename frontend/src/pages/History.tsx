import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Clock, 
    ChevronRight, 
    Search, 
    Users, 
    CheckCircle2, 
    AlertCircle, 
    Layers 
} from 'lucide-react';

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
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground font-medium animate-pulse">Retrieving Talent History…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight font-outfit uppercase">Search History</h1>
                    <p className="text-muted-foreground font-medium">Review and restore previous talent acquisition batches.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Search jobs…"
                        className="w-full pl-10 pr-4 py-2 bg-background border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {filteredHistory.length === 0 ? (
                <Card className="border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="p-6 bg-muted rounded-full">
                        <Layers className="size-12 text-muted-foreground opacity-40" />
                    </div>
                    <div className="max-w-md">
                        <h3 className="text-2xl font-black">No History Yet</h3>
                        <p className="text-muted-foreground mt-2 font-medium">Once you start matching resumes, your previous batches will appear here for easy access.</p>
                    </div>
                    <Button onClick={() => setView('setup')} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs">Start New Search</Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredHistory.map((item) => (
                        <Card 
                            key={item.id} 
                            className="rounded-3xl border-2 hover:border-primary/30 transition-all group hover:shadow-xl hover:shadow-primary/5 cursor-pointer overflow-hidden"
                            onClick={() => handleLoadBatch(item.id)}
                        >
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                    <div className="p-6 flex-1 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{item.title}</h3>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1.5 font-bold">
                                                        <Clock size={14} className="text-primary/60" />
                                                        {new Date(item.date).toLocaleDateString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric', 
                                                            year: 'numeric' 
                                                        })}
                                                    </span>
                                                    <span className="size-1 bg-muted-foreground/30 rounded-full" />
                                                    <span className="flex items-center gap-1.5 font-bold">
                                                        <Users size={14} className="text-primary/60" />
                                                        {item.candidateCount} Candidates
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge 
                                                variant={item.status === 'COMPLETED' ? 'secondary' : 'outline'}
                                                className={`rounded-full px-3 py-1 font-black uppercase text-[9px] tracking-widest ${
                                                    item.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                                                }`}
                                            >
                                                {item.status === 'COMPLETED' ? (
                                                    <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Processed</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><AlertCircle size={10} /> {item.status}</span>
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="md:w-16 bg-muted/30 border-t md:border-t-0 md:border-l flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                        <ChevronRight className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

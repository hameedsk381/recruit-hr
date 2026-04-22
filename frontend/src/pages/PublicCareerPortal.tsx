import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { 
    Briefcase, 
    MapPin, 
    Clock, 
    Search, 
    Sparkles, 
    ArrowRight, 
    Upload, 
    Zap,
    Target,
    ShieldCheck,
    Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function PublicCareerPortal() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isMatching, setIsMatching] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await api.getPublicJobs(tenantId!);
                if (res.success) {
                    setJobs(res.jobs);
                }
            } catch (error) {
                console.error("Failed to fetch jobs");
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, [tenantId]);

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantId) return;

        setIsMatching(true);
        try {
            const res = await api.matchMyResume(tenantId, file);
            if (res.success) {
                setMatches(res.matches);
                // Scroll to results
                document.getElementById('job-list')?.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (err) {
            console.error("Match failed", err);
        } finally {
            setIsMatching(false);
        }
    };

    // Merge matches with job data
    const jobsWithScores = jobs.map(job => {
        const match = matches.find(m => m.jobId === (job._id || job.id));
        return {
            ...job,
            matchScore: match?.matchScore || null,
            matchSummary: match?.summary || null,
            matchedSkills: match?.matchedSkills || []
        };
    }).sort((a, b) => {
        if (a.matchScore !== null && b.matchScore !== null) return b.matchScore - a.matchScore;
        if (a.matchScore !== null) return -1;
        if (b.matchScore !== null) return 1;
        return 0;
    });

    const filteredJobs = jobsWithScores.filter(j => 
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
            {/* Nav */}
            <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">reckruit.ai</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
                {/* Hero */}
                <div className="text-center space-y-12 mb-20">
                    <div className="space-y-6">
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 font-semibold tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            RECRUITMENT REINVENTED
                        </Badge>
                        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                            Find your perfect <br /> match instantly.
                        </h1>
                        <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium">
                            Upload your resume and let our AI show you the best roles for your skills. 
                            No more endless scrolling.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
                        <div className="relative group w-full">
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                accept=".pdf,.doc,.docx"
                                onChange={handleResumeUpload}
                            />
                            <Button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isMatching}
                                className={cn(
                                    "w-full h-16 rounded-2xl text-lg font-bold transition-all gap-3 border-none shadow-2xl shadow-indigo-500/20",
                                    isMatching ? "bg-zinc-900 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-100"
                                )}
                            >
                                {isMatching ? (
                                    <>
                                        <Loader2 className="animate-spin size-5" />
                                        Analyzing Suitability...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={22} />
                                        Upload Resume to Match
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-8 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                        <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-500" /> Privacy Protected</div>
                        <div className="flex items-center gap-2"><Target size={14} className="text-indigo-500" /> 98% Match Accuracy</div>
                        <div className="flex items-center gap-2"><Zap size={14} className="text-indigo-500" /> Instant Results</div>
                    </div>
                </div>

                {/* Search / Filter */}
                <div id="job-list" className="relative max-w-xl mx-auto mb-16 group">
                    <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-indigo-400 transition-colors">
                        <Search size={20} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Or search roles manually..."
                        className="w-full h-14 bg-zinc-900/50 border border-white/10 rounded-2xl pl-12 pr-6 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Job List */}
                <div className="space-y-6">
                    {loading ? (
                        [1,2,3].map(i => (
                            <div key={i} className="h-32 bg-zinc-900/20 border border-white/5 rounded-2xl animate-pulse" />
                        ))
                    ) : filteredJobs.length > 0 ? (
                        filteredJobs.map(job => (
                            <div 
                                key={job.id} 
                                onClick={() => navigate(`/jobs/${tenantId}/${job.id}/apply`)}
                                className={cn(
                                    "group p-8 bg-zinc-900/30 border border-white/5 rounded-3xl hover:border-indigo-500/40 hover:bg-zinc-900/50 transition-all cursor-pointer relative overflow-hidden",
                                    job.matchScore && job.matchScore >= 80 ? "border-emerald-500/20 bg-emerald-500/[0.02]" : ""
                                )}
                            >
                                {job.matchScore && (
                                    <div className="absolute top-0 right-0 p-4">
                                        <Badge className={cn(
                                            "h-7 px-3 font-bold text-[11px] uppercase tracking-wider gap-1.5",
                                            job.matchScore >= 80 ? "bg-emerald-500 text-black" : "bg-indigo-600 text-white"
                                        )}>
                                            <Target size={12} />
                                            {job.matchScore}% Match
                                        </Badge>
                                    </div>
                                )}

                                <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                                    <div className="space-y-4 flex-1">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-bold group-hover:text-indigo-400 transition-colors tracking-tight">{job.title}</h3>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase size={14} className="text-indigo-500" />
                                                    {job.employmentType || "Full-time"}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin size={14} className="text-indigo-500" />
                                                    {job.location || "Remote"}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-indigo-500" />
                                                    {new Date(job.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {job.matchSummary && (
                                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 animate-in zoom-in-95 duration-500">
                                                <div className="flex items-center gap-2 mb-2 text-indigo-400">
                                                    <Sparkles size={14} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">AI Match Insight</span>
                                                </div>
                                                <p className="text-sm text-zinc-300 leading-relaxed italic">
                                                    "{job.matchSummary}"
                                                </p>
                                                {job.matchedSkills.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {job.matchedSkills.slice(0, 4).map((skill: string) => (
                                                            <span key={skill} className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Button className="bg-white text-black hover:bg-indigo-600 hover:text-white rounded-2xl px-8 h-12 flex items-center gap-2 transition-all font-bold group/btn">
                                        View Details <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center space-y-4">
                            <p className="text-muted-foreground text-lg">No open roles matching your search.</p>
                            <Button variant="link" onClick={() => setSearchQuery("")} className="text-indigo-400">Clear all filters</Button>
                        </div>
                    )}
                </div>
            </main>

            <footer className="border-t border-white/5 py-12 mt-20">
                <div className="max-w-6xl mx-auto px-6 text-center text-zinc-600 text-sm font-medium">
                    <p>© {new Date().getFullYear()} Powered by <span className="text-muted-foreground">reckruit.ai</span> for Enterprise</p>
                </div>
            </footer>
        </div>
    );
}


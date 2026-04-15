import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Briefcase, MapPin, Clock, Search, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function PublicCareerPortal() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                // Public endpoint
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

    const filteredJobs = jobs.filter(j => 
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
                        <span className="font-bold text-lg tracking-tight">reckuit.ai</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
                {/* Hero */}
                <div className="text-center space-y-6 mb-16">
                    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                        Join our mission.
                    </h1>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-medium">
                        Explore open opportunities and help us build the next generation of recruitment technology.
                    </p>
                </div>

                {/* Search / Filter */}
                <div className="relative max-w-xl mx-auto mb-16 group">
                    <div className="absolute inset-y-0 left-4 flex items-center text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                        <Search size={20} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search roles (e.g. Backend Engineer)"
                        className="w-full h-14 bg-zinc-900/50 border border-white/10 rounded-2xl pl-12 pr-6 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Job List */}
                <div className="space-y-4">
                    {loading ? (
                        [1,2,3].map(i => (
                            <div key={i} className="h-28 bg-zinc-900/20 border border-white/5 rounded-2xl animate-pulse" />
                        ))
                    ) : filteredJobs.length > 0 ? (
                        filteredJobs.map(job => (
                            <div 
                                key={job.id} 
                                onClick={() => navigate(`/jobs/${tenantId}/${job.id}/apply`)}
                                className="group p-6 bg-zinc-900/30 border border-white/5 rounded-2xl hover:border-indigo-500/30 hover:bg-zinc-900/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 font-medium">
                                        <div className="flex items-center gap-1.5 line-clamp-1">
                                            <Briefcase size={14} />
                                            {job.employmentType || "Full-time"}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} />
                                            {job.location || "Remote"}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            {new Date(job.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <Button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-6 h-11 hidden sm:flex items-center gap-2 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
                                    Apply <ArrowRight size={16} />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center space-y-4">
                            <p className="text-zinc-500 text-lg">No open roles matching your search.</p>
                            <Button variant="link" onClick={() => setSearchQuery("")} className="text-indigo-400">Clear all filters</Button>
                        </div>
                    )}
                </div>
            </main>

            <footer className="border-t border-white/5 py-12 mt-20">
                <div className="max-w-6xl mx-auto px-6 text-center text-zinc-600 text-sm font-medium">
                    <p>© 2024 Powered by <span className="text-zinc-400">reckuit.ai</span> for Enterprise</p>
                </div>
            </footer>
        </div>
    );
}

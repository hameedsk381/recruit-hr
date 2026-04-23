import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    FileText, 
    Upload, 
    CheckCircle, 
    ArrowRight, 
    MapPin, 
    Briefcase, 
    Building2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PublicApply() {
    const { slug } = useParams();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    
    const [form, setForm] = useState({
        name: '',
        email: '',
        resume: null as File | null
    });

    useEffect(() => {
        if (slug) {
            api.getPublicJobBySlug(slug)
                .then(res => {
                    if (res.success) setJob(res.job);
                    else setError('Job not found or no longer available.');
                })
                .catch(() => setError('Failed to load job details.'))
                .finally(() => setLoading(false));
        }
    }, [slug]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setForm(prev => ({ ...prev, resume: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.resume) return alert('Please upload your resume.');
        
        setSubmitting(true);
        try {
            const res = await api.publicApply({
                ...form,
                resume: form.resume,
                jobId: job.id,
                tenantId: job.tenantId
            });
            if (res.success) setSubmitted(true);
        } catch (err: any) {
            alert(err.message || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary size-8" />
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Preparing Application Space...</p>
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
                <div className="max-w-md w-full bg-white border rounded-2xl p-8 text-center space-y-6 shadow-sm">
                    <div className="size-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <Briefcase size={32} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black tracking-tight text-zinc-900">Oops!</h1>
                        <p className="text-zinc-500">{error || 'This job posting is no longer active.'}</p>
                    </div>
                    <Link to="/">
                        <Button className="w-full">View Other Openings</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
                <div className="max-w-xl w-full bg-white border rounded-2xl p-10 text-center space-y-6 shadow-xl animate-in zoom-in duration-300">
                    <div className="size-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={40} />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Application Received!</h1>
                        <p className="text-zinc-500 leading-relaxed">
                            Thank you for applying to the <span className="font-bold text-zinc-900">{job.title}</span> position. 
                            Our AI team is currently reviewing your profile. You will receive a confirmation email shortly with a link to track your progress.
                        </p>
                    </div>
                    <div className="pt-6 border-t">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">What's next?</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                <p className="text-xs font-bold text-zinc-900 flex items-center gap-2 mb-1">
                                    <ArrowRight size={14} className="text-green-500" /> AI Screening
                                </p>
                                <p className="text-[11px] text-zinc-500">Your resume is matched against role requirements instantly.</p>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                <p className="text-xs font-bold text-zinc-900 flex items-center gap-2 mb-1">
                                    <ArrowRight size={14} className="text-green-500" /> Status Tracking
                                </p>
                                <p className="text-[11px] text-zinc-500">Check your portal for updates and interview invites.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-black text-lg">T</div>
                        <span className="font-black tracking-tighter text-lg uppercase">reckruit.ai</span>
                    </div>
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-600 font-bold px-3">Careers Portal</Badge>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12 flex-1 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Job Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-4">
                            <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-100 border-none px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                                {job.department}
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 leading-[1.1]">
                                {job.title}
                            </h1>
                            <div className="flex flex-wrap gap-6 text-zinc-500">
                                <div className="flex items-center gap-2 font-medium">
                                    <MapPin size={18} className="text-zinc-400" />
                                    {job.location}
                                </div>
                                <div className="flex items-center gap-2 font-medium">
                                    <Briefcase size={18} className="text-zinc-400" />
                                    Full-time
                                </div>
                                <div className="flex items-center gap-2 font-medium">
                                    <Building2 size={18} className="text-zinc-400" />
                                    {job.department}
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-zinc max-w-none">
                            <h3 className="text-lg font-bold text-zinc-900 mb-4">About the role</h3>
                            <div className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                {job.description}
                            </div>
                        </div>

                        {job.budgetBand && (
                            <div className="p-6 bg-white border rounded-2xl space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Salary range</p>
                                <p className="text-2xl font-black text-zinc-900">
                                    {job.budgetBand.currency} {job.budgetBand.min.toLocaleString()} – {job.budgetBand.max.toLocaleString()}
                                </p>
                                <p className="text-xs text-zinc-500 font-medium">+ Comprehensive benefits and equity package</p>
                            </div>
                        )}
                    </div>

                    {/* Apply Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border rounded-2xl p-6 shadow-sm sticky top-28 space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black tracking-tight">Apply for this position</h3>
                                <p className="text-xs text-muted-foreground font-medium">Takes less than 2 minutes</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                                    <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Jane Doe"
                                        className="w-full h-11 px-4 bg-zinc-50 border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                                    <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                        placeholder="jane@example.com"
                                        className="w-full h-11 px-4 bg-zinc-50 border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Resume / CV</label>
                                    <div className="relative group">
                                        <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className={cn(
                                            "w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all",
                                            form.resume ? "bg-green-50 border-green-200 text-green-600" : "bg-zinc-50 border-zinc-200 text-zinc-400 group-hover:border-zinc-300 group-hover:bg-zinc-100"
                                        )}>
                                            {form.resume ? (
                                                <>
                                                    <CheckCircle size={24} />
                                                    <span className="text-xs font-bold truncate max-w-[80%]">{form.resume.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={24} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Upload PDF/DOCX</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" disabled={submitting} className="w-full h-12 text-sm font-black uppercase tracking-widest shadow-lg shadow-zinc-200">
                                    {submitting ? (
                                        <Loader2 className="animate-spin mr-2" size={16} />
                                    ) : 'Submit Application'}
                                </Button>

                                <p className="text-[10px] text-center text-zinc-400 leading-relaxed px-4">
                                    By submitting, you agree to our <span className="underline cursor-pointer">Privacy Policy</span> and <span className="underline cursor-pointer">Terms of Service</span>.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-zinc-100 py-12 border-t mt-12">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-xs font-medium text-zinc-500">© 2026 reckruit.ai · Powered by Advanced AI Orchestration</p>

                    <div className="flex gap-6">
                        <Link to="/" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest">About</Link>
                        <Link to="/" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest">Privacy</Link>
                        <Link to="/" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

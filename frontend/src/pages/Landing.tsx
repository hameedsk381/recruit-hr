import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Shield,
    ChevronRight,
    Sparkles,
    PlayCircle,
    ArrowRight,
    Check,
    Target,
    Brain,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const { scrollYProgress } = useScroll();
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Header */}
            <header className={cn(
                "fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b",
                scrolled ? "bg-background/80 backdrop-blur-xl h-14 border-border" : "bg-transparent h-20 border-transparent"
            )}>
                <div className="container mx-auto h-full px-6 flex items-center justify-between max-w-7xl">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
                            <div className="size-8 bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:rotate-12">
                                <Sparkles className="size-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-black tracking-tighter uppercase transition-colors group-hover:text-primary">Reckruit.ai</span>
                        </Link>
                        
                        <nav className="hidden md:flex items-center gap-6">
                            <Link to="/" className="text-sm font-bold text-foreground transition-colors">Product</Link>
                            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
                            <Link to="/security" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Security</Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-medium px-4 py-2 hover:bg-muted rounded-md transition-colors">Sign in</Link>
                        <Link to="/app">
                            <Button className="h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm">
                                Launch App <ChevronRight className="ml-1 size-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <motion.section 
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="relative pt-40 pb-32 overflow-hidden"
            >
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(99,102,241,0.08)_0%,transparent_100%)]" />
                <div className="absolute top-0 right-0 -z-10 translate-x-1/2 -translate-y-1/2 size-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
                
                <div className="container mx-auto px-6 max-w-7xl relative">
                    <div className="flex flex-col items-center text-center space-y-10">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-[10px] font-bold uppercase tracking-widest text-indigo-600"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Our New Smart Hiring Map is Live
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] max-w-4xl"
                        >
                            Hire at the <br /> 
                            <span className="text-muted-foreground">speed of thought.</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-xl text-muted-foreground max-w-2xl font-medium leading-relaxed"
                        >
                            Reckruit.ai is the modern hiring platform for the world's best teams. 
                            Find the right person for any role, see clear proof of their skills, 
                            and hire 4x faster with unbiased, smart screening.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
                        >
                             <Button size="lg" className="h-14 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all group">
                                 Start Hiring Better <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                             </Button>
                            <Button variant="outline" size="lg" className="h-14 px-8 rounded-xl font-bold text-lg hover:bg-muted transition-all border-zinc-200">
                                <PlayCircle className="mr-2 text-indigo-500" /> Watch Demo
                            </Button>
                        </motion.div>

                        {/* Social Proof */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="pt-16 w-full max-w-5xl"
                        >
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-10">Trusted by Global Talent Vanguards</div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-12 opacity-40 grayscale hover:grayscale-0 transition-all">
                                {['Zoho', 'Darwinbox', 'Slack', 'Linear', 'Vercel'].map(brand => (
                                    <div key={brand} className="text-2xl font-black flex items-center justify-center tracking-tighter">{brand}</div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.section>

            {/* Dashboard Preview */}
            <section className="pb-32 px-6">
                <div className="container mx-auto max-w-7xl">
                    <motion.div 
                        initial={{ opacity: 0, y: 100 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative rounded-3xl border-4 border-primary/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-background overflow-hidden aspect-video"
                    >
                        {/* Mock Dashboard UI */}
                        <div className="absolute inset-0 bg-muted/50 p-8 flex gap-8">
                            <aside className="w-48 space-y-4">
                                <div className="h-4 w-3/4 bg-zinc-200 rounded" />
                                <div className="h-4 w-full bg-primary rounded" />
                                <div className="h-4 w-2/3 bg-zinc-200 rounded" />
                                <div className="h-4 w-4/5 bg-zinc-200 rounded" />
                            </aside>
                            <main className="flex-1 space-y-8">
                                <div className="flex justify-between">
                                    <div className="h-8 w-48 bg-zinc-200 rounded" />
                                    <div className="h-8 w-24 bg-primary rounded" />
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-32 bg-white border rounded-2xl p-4 space-y-4">
                                            <div className="h-2 w-1/2 bg-muted rounded" />
                                            <div className="h-6 w-3/4 bg-zinc-200 rounded" />
                                        </div>
                                    ))}
                                </div>
                                <div className="h-64 bg-white border rounded-2xl p-6 space-y-4">
                                    <div className="h-4 w-1/4 bg-indigo-500/20 rounded-full" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-full bg-muted rounded" />
                                        <div className="h-4 w-full bg-muted rounded" />
                                        <div className="h-4 w-3/4 bg-muted rounded" />
                                    </div>
                                </div>
                            </main>
                        </div>
                        {/* Gradient Overlay for the mock */}
                        <div className="absolute inset-0 bg-linear-to-t from-white/20 to-transparent pointer-events-none" />
                    </motion.div>
                </div>
            </section>

            {/* How it Works Section */}
            <section id="methodology" className="py-32 px-6 bg-zinc-50 border-t">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center space-y-4 mb-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-white text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            The Methodology
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight">Three steps to your next hire.</h2>
                        <p className="text-muted-foreground font-medium max-w-xl mx-auto">We've stripped away the complexity of traditional ATS platforms. Hiring should be as simple as uploading and interviewing.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-zinc-200 via-primary/50 to-zinc-200" />
                        {[
                            { step: '01', title: 'Define the Role', desc: 'Paste a Job Description. Our AI automatically extracts core skills, domain experience, and mandatory requirements.' },
                            { step: '02', title: 'Bulk Upload Resumes', desc: 'Drag and drop 100s of resumes. The engine instantly anonymizes PII and evaluates every candidate against the JD.' },
                            { step: '03', title: 'Interview & Close', desc: 'Review the ranked shortlist. Use the Talent Copilot to generate technical interview probes and make the hire.' }
                        ].map((item, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-6">
                                <div className="size-24 rounded-full bg-white border-8 border-zinc-50 shadow-xl flex items-center justify-center text-2xl font-black text-primary">
                                    {item.step}
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-bold">{item.title}</h3>
                                    <p className="text-muted-foreground font-medium max-w-sm">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Industries Section */}
            <section className="py-24 bg-white border-t">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">Built for every industry.</h2>
                        <p className="text-muted-foreground font-medium max-w-2xl mx-auto">From strict compliance in Healthcare to high-volume hiring in Retail, our AI adapts to your specific domain.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: 'Technology', desc: 'Screen for complex stacks.' },
                            { name: 'Healthcare', desc: 'Verify strict certifications.' },
                            { name: 'Finance', desc: 'Identify regulatory experts.' },
                            { name: 'Manufacturing', desc: 'Source supply chain leaders.' },
                            { name: 'Retail', desc: 'Manage high-volume hiring.' },
                            { name: 'Legal', desc: 'Find specialized counsel.' },
                            { name: 'Sales', desc: 'Pinpoint proven deal-closers.' },
                            { name: 'Executive', desc: 'Source visionary leadership.' }
                        ].map((ind, i) => (
                            <div key={i} className="p-6 rounded-2xl border bg-zinc-50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                                <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{ind.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 font-medium">{ind.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features (The Engine) */}
            <section id="solutions" className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute top-0 left-0 size-full subtle-grid opacity-[0.05]" aria-hidden="true" />
                
                <div className="container mx-auto px-6 max-w-7xl relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                The Talent Engine
                            </div>
                             <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95]">
                                 Clear Proof <br />
                                 <span className="text-muted-foreground/60">for Modern Teams.</span>
                             </h2>
                            <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-md">
                                No more guessing why a candidate is a good match. Our system provides clear evidence 
                                from their experience to support every hiring decision.
                            </p>
                            
                            <div className="space-y-4 pt-4">
                                {[
                                    { icon: <Target className="size-5" />, title: 'Automated AI Screening', desc: 'Instantly rank hundreds of profiles against your requirements with pinpoint accuracy.' },
                                    { icon: <Brain className="size-5" />, title: 'Talent Copilot', desc: 'Your conversational AI assistant. Ask complex questions like "Who has deep operational experience in healthcare?"' },
                                    { icon: <Shield className="size-5" />, title: 'Bias-Free Evaluation', desc: 'Candidates are evaluated purely on merit, skills, and experience with built-in anonymization.' },
                                    { icon: <Sparkles className="size-5" />, title: 'Explainable Matching', desc: 'No black boxes. Get a detailed breakdown of exact skill gaps and experience alignment for every candidate.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                                        <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold">{item.title}</h4>
                                            <p className="text-sm text-muted-foreground font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Time Saved', val: '15h/wk', color: 'bg-indigo-500' },
                                { label: 'Screening Accuracy', val: '98%', color: 'bg-emerald-500' },
                                { label: 'Time-to-Hire', val: '-40%', color: 'bg-amber-500' },
                                { label: 'ROI Scale', val: '12x', color: 'bg-blue-500' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-2">
                                    <div className={cn("size-2 rounded-full mb-4", stat.color)} />
                                    <div className="text-4xl font-black">{stat.val}</div>
                                    <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Deep Dive Features */}
            <section className="py-32 px-6 bg-background">
                <div className="container mx-auto max-w-7xl space-y-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1 space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight">The ultimate <br/><span className="text-primary">Talent Copilot.</span></h2>
                            <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                                Stop digging through 5-page resumes. Our Multi-Agent Copilot reads every resume in your pipeline simultaneously. Ask it anything: "Who has 5+ years of B2B enterprise sales experience?", and get instant, verifiable answers with exact resume citations.
                            </p>
                            <ul className="space-y-4 pt-4">
                                 {['Find exactly who you need in seconds', 'Create the perfect interview guide', 'Draft friendly, professional messages'].map(item => (
                                     <li key={item} className="flex items-center gap-3 font-medium text-foreground"><Check className="size-5 text-emerald-500" /> {item}</li>
                                 ))}
                            </ul>
                        </div>
                        <div className="order-1 lg:order-2 bg-muted/30 rounded-[2rem] p-8 aspect-square flex items-center justify-center border">
                            <div className="w-full max-w-md bg-background border shadow-2xl rounded-2xl p-6 space-y-4 transform rotate-2 hover:rotate-0 transition-all duration-500">
                                <div className="flex gap-4">
                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Brain className="size-4 text-primary" /></div>
                                    <div className="bg-muted p-4 rounded-2xl rounded-tl-none text-sm font-medium w-full">I found 3 candidates with enterprise sales experience. Sarah Jenkins closed $5M+ in deals at Salesforce.</div>
                                </div>
                                <div className="flex gap-4 justify-end">
                                    <div className="bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-none text-sm font-medium">Draft an email asking Sarah for an interview this Friday.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="bg-muted/30 rounded-[2rem] p-8 aspect-square flex items-center justify-center border">
                            <div className="w-full max-w-md bg-background border shadow-2xl rounded-2xl p-6 space-y-6 transform -rotate-2 hover:rotate-0 transition-all duration-500">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between"><span className="font-bold">Match Score</span> <span className="text-emerald-500 font-bold">94%</span></div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[94%]" /></div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Missing Skills</div>
                                    <div className="flex gap-2"><span className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded text-xs font-bold">Salesforce CRM</span></div>
                                </div>
                                <div className="space-y-3 pt-2 border-t">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Rationale</div>
                                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">Candidate possesses 4 out of 5 core skills. 7 years of domain experience exceeds the 5-year requirement.</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight">No more <br/><span className="text-amber-500">Black Boxes.</span></h2>
                            <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                                Trust is paramount in hiring. Unlike generic AI tools that just give you a number, Reckruit.ai provides an audit trail for every score. See exactly which required skills are missing, how many years of domain experience were calculated, and why a candidate was ranked #1.
                            </p>
                            <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-zinc-200">Read our AI Ethics Policy</Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonial */}
            <section className="py-32 px-6 bg-white border-t">
                <div className="container mx-auto max-w-4xl text-center space-y-8">
                    <div className="flex justify-center mb-6">
                        <div className="flex gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map(i => <Sparkles key={i} size={24} className="fill-amber-500" />)}
                        </div>
                    </div>
                    <blockquote className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                        "We process over 10,000 resumes a month across 5 different verticals. Reckruit.ai has completely eliminated our manual screening bottleneck while ensuring 100% blind, bias-free evaluations."
                    </blockquote>
                    <div className="flex flex-col items-center gap-3 pt-8">
                        <div className="size-16 rounded-full bg-zinc-200 overflow-hidden">
                            <img src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Jenkins" className="size-full object-cover grayscale" />
                        </div>
                        <div>
                            <div className="font-bold text-lg">Sarah Jenkins</div>
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">VP of Talent Acquisition, GlobalCorp</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing is now a separate page */}

            {/* FAQ Section */}
            <section className="py-32 px-6 bg-zinc-50 border-t">
                <div className="container mx-auto max-w-3xl space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { q: 'Does Reckruit.ai replace my existing ATS?', a: 'No. Reckruit.ai acts as an intelligence layer that sits on top of your existing ATS (like Workday or Greenhouse). We pull the candidate data, analyze it, and push the scores back.' },
                            { q: 'How does the Candidate Anonymization work?', a: 'Before any resume is evaluated, our intelligent filters automatically remove names, emails, phone numbers, and addresses. The AI evaluates the profile completely blindly to ensure unbiased grading.' },
                            { q: 'Where is my candidate data stored?', a: 'Enterprise customers receive a dedicated, private environment. All resume processing happens strictly within your secure perimeter, meaning candidate data never leaves your infrastructure.' },
                            { q: 'Can I customize the scoring rubric?', a: 'Yes. While our AI automatically extracts baseline requirements from the JD, hiring managers can manually boost the weight of specific skills (e.g., making Kubernetes a "Critical" vs "Nice-to-have" skill).' }
                        ].map((faq, i) => (
                            <div key={i} className="bg-white border rounded-2xl p-6 hover:shadow-md transition-all cursor-pointer group">
                                <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{faq.q}</h4>
                                <p className="mt-2 text-muted-foreground font-medium leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="pb-32 px-6">
                <div className="container mx-auto max-w-7xl">
                    <div className="relative rounded-[3rem] bg-indigo-600 p-16 md:p-24 overflow-hidden text-center text-white">
                        <div className="absolute inset-0 bg-linear-to-br from-indigo-500 to-indigo-800" />
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-96 bg-white/10 rounded-full blur-[80px]" />
                        
                        <div className="relative space-y-10">
                            <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-[0.9]">Transform your <br /> talent acquisition now.</h2>
                            <p className="text-xl text-indigo-100 max-w-2xl mx-auto font-medium">
                                Join 400+ leading organizations using Reckruit.ai to build world-class diverse teams.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button size="lg" className="h-16 px-10 rounded-2xl bg-white text-indigo-600 font-black text-lg hover:scale-[1.05] transition-all">
                                    Get Early Access
                                </Button>
                                <Button variant="outline" size="lg" className="h-16 px-10 rounded-2xl bg-transparent border-white/20 text-white font-black text-lg hover:bg-white/10 transition-all">
                                    Schedule a Call
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
                        <div className="col-span-2 space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="size-6 bg-primary rounded flex items-center justify-center"><Sparkles className="size-4 text-white" /></div>
                                <span className="text-sm font-black uppercase tracking-tight">Reckruit.ai</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium max-w-xs">
                                Streamlining the hiring process for modern teams. Built for HR professionals.
                            </p>
                            <div className="text-[10px] font-black text-muted-foreground">© 2026 Reckruit Technologies Inc.</div>
                        </div>
                        {[
                            { title: 'Product', links: ['Features', 'Intelligence', 'Security', 'Integrations'] },
                            { title: 'Methodology', links: ['Match Rationale', 'Ethics', 'Data Policy', 'API'] },
                            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
                            { title: 'Resources', links: ['Documentation', 'Guides', 'Support', 'Status'] }
                        ].map(col => (
                            <div key={col.title} className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">{col.title}</h4>
                                <ul className="space-y-2">
                                    {col.links.map(l => (
                                        <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}

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
    Database,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <div className="size-8 bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:rotate-12">
                                <Sparkles className="size-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-black tracking-tighter uppercase transition-colors group-hover:text-primary">Reckruit.ai</span>
                        </div>
                        
                        <nav className="hidden md:flex items-center gap-6">
                            {['Solutions', 'Methodology', 'Enterprise', 'Security'].map((item) => (
                                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    {item}
                                </a>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <a href="/login" className="text-sm font-medium px-4 py-2 hover:bg-muted rounded-md transition-colors">Sign in</a>
                        <Button className="h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm">
                            Launch App <ChevronRight className="ml-1 size-4" />
                        </Button>
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
                            v2.4 Candidate Graph is Live
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
                            Reckruit.ai is the hiring intelligence platform for high-velocity teams. 
                            Deeply analyze candidate profiles, get clear hiring matches, 
                            and close candidates 4x faster with verified data.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
                        >
                            <Button size="lg" className="h-14 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all group">
                                Start Hiring for Free <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
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
                                Verified Matching <br />
                                <span className="text-muted-foreground/60">for Modern Teams.</span>
                            </h2>
                            <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-md">
                                No more guessing why a candidate is a good match. Our system provides clear evidence 
                                from their experience to support every hiring decision.
                            </p>
                            
                            <div className="space-y-4 pt-4">
                                {[
                                    { icon: <Shield className="size-5" />, title: 'DPDP 2023 Compliant', desc: 'Ready for India\'s Digital Personal Data Protection Act.' },
                                    { icon: <Target className="size-5" />, title: 'Evidence-Based Match', desc: 'Detailed justification for every candidate recommendation.' },
                                    { icon: <Brain className="size-5" />, title: 'Hiring Assistant', desc: 'Get deep insights into any candidate instantly.' },
                                    { icon: <Database className="size-5" />, title: 'Bulk Resume Processing', desc: 'Import and analyze thousands of resumes instantly.' }
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
                                { label: 'Time Saved', val: '4x', color: 'bg-indigo-500' },
                                { label: 'Cost Redux', val: '62%', color: 'bg-emerald-500' },
                                { label: 'Hire Rate', val: '88%', color: 'bg-amber-500' },
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

            {/* Pricing (SaaS specific) */}
            <section className="py-32 bg-white">
                <div className="container mx-auto px-6 max-w-7xl text-center space-y-16">
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight">Scale with your <br /> talent velocity.</h2>
                        <p className="text-muted-foreground font-medium max-w-xl mx-auto">Transparent pricing for recruitment teams of all sizes.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { name: 'Starter', price: 'Free', desc: 'For rapid single hires', features: ['1 active role', '50 candidates', 'Core AI ranking', 'Dashboard access'] },
                            { name: 'Professional', price: '₹39,999', desc: 'For high-growth teams', features: ['Unlimited roles', '1000 candidates/mo', 'Deep hiring insights', 'System Integrations'], popular: true },
                            { name: 'Enterprise', price: 'Custom', desc: 'For global vanguards', features: ['Unlimited everything', 'Dedicated LLM instance', 'DPDP Compliance suite', 'SSO & Audit logs'] }
                        ].map((tier, i) => (
                            <div key={i} className={cn(
                                "flex flex-col p-8 rounded-3xl border-2 text-left relative transition-all hover:shadow-2xl hover:shadow-zinc-200",
                                tier.popular ? "border-primary shadow-xl" : "border-zinc-100"
                            )}>
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                        Most Popular
                                    </div>
                                )}
                                <div className="space-y-2 mb-8">
                                    <h3 className="text-xl font-black">{tier.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black">{tier.price}</span>
                                        {tier.price !== 'Custom' && tier.price !== 'Free' && <span className="text-muted-foreground font-medium">/mo</span>}
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">{tier.desc}</p>
                                </div>
                                <div className="space-y-4 mb-10 flex-1">
                                    {tier.features.map(f => (
                                        <div key={f} className="flex items-center gap-3 text-sm font-medium">
                                            <div className="size-5 rounded-full bg-muted flex items-center justify-center text-foreground"><Check className="size-3" strokeWidth={3} /></div>
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <Button className={cn(
                                    "w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]",
                                    tier.popular ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-zinc-200"
                                )}>
                                    Get Started
                                </Button>
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
                                Join 400+ technical companies using Reckruit.ai to build world-class engineering teams.
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

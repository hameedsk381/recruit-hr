import { useState, useEffect } from 'react';
import { Shield, Lock, Sparkles, Database, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';

export default function Security() {
    const [scrolled, setScrolled] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
                            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Product</Link>
                            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
                            <Link to="/security" className="text-sm font-bold text-foreground transition-colors">Security</Link>
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

            <main className="pt-32 pb-20">
                <div className="container mx-auto px-6 max-w-7xl space-y-24">
                    
                    <div className="text-center space-y-6 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Enterprise Security
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight">Trust is our <br/>primary feature.</h1>
                        <p className="text-xl text-muted-foreground font-medium">Reckruit.ai is engineered from the ground up for data sovereignty. With enterprise-grade internal processing and absolute privacy guarantees, your candidate data is bulletproof.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: <Database className="size-8 text-indigo-500" />, title: 'Self-Hosted Intelligence', desc: 'Your data stays yours. Our intelligence engine processes all candidate profiles internally. We never send your proprietary hiring data to third-party APIs.' },
                            { icon: <Shield className="size-8 text-emerald-500" />, title: 'Enterprise Compliance', desc: 'Fully compliant with global data protection standards. Candidate consent records and automated data lifecycle management are built-in from day one.' },
                            { icon: <Lock className="size-8 text-amber-500" />, title: 'Blind Evaluation', desc: 'Names, emails, and demographics are automatically scrubbed from resumes before evaluation, ensuring 100% blind, bias-free screening based purely on merit.' }
                        ].map((item, i) => (
                            <div key={i} className="p-8 rounded-3xl border bg-card hover:shadow-xl transition-all space-y-4">
                                <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">{item.icon}</div>
                                <h3 className="text-2xl font-bold">{item.title}</h3>
                                <p className="text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-primary text-primary-foreground rounded-[3rem] p-12 md:p-24 text-center space-y-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
                        <h2 className="text-3xl md:text-5xl font-black relative z-10">Ready to hire securely?</h2>
                        <p className="text-xl opacity-90 max-w-xl mx-auto relative z-10">Join the world's most secure talent teams.</p>
                        <Button variant="secondary" size="lg" className="h-14 px-8 rounded-xl font-bold text-lg relative z-10">Review Security Docs</Button>
                    </div>

                </div>
            </main>
        </div>
    );
}

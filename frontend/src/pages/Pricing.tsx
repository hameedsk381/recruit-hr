import { useState, useEffect } from 'react';
import { Check, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';

export default function Pricing() {
    const [scrolled, setScrolled] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
    
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
                            <Link to="/pricing" className="text-sm font-bold text-foreground transition-colors">Pricing</Link>
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

            <main className="pt-32 pb-20">
                <div className="container mx-auto px-6 max-w-7xl space-y-16">
                    <div className="text-center space-y-6">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight">Simple pricing, <br/>infinite scale.</h1>
                        <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">Start for free. Upgrade when your pipeline explodes.</p>
                        
                        <div className="inline-flex items-center p-1 bg-muted rounded-xl mt-8">
                            <button onClick={() => setBillingCycle('monthly')} className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", billingCycle === 'monthly' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>Monthly</button>
                            <button onClick={() => setBillingCycle('annual')} className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", billingCycle === 'annual' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>Annually (Save 20%)</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { name: 'Starter', price: 'Free', desc: 'For rapid single hires', features: ['1 active role', '50 candidates/mo', 'Core AI ranking', 'Dashboard access'] },
                            { name: 'Professional', price: billingCycle === 'annual' ? '₹29,999' : '₹39,999', desc: 'For high-growth teams', features: ['Unlimited roles', '1000 candidates/mo', 'Deep hiring insights', 'System Integrations', 'Talent Copilot'], popular: true },
                            { name: 'Enterprise', price: 'Custom', desc: 'For global vanguards', features: ['Unlimited everything', 'Dedicated LLM instance', 'DPDP Compliance suite', 'SSO & Audit logs', 'White-labeling'] }
                        ].map((tier, i) => (
                            <div key={i} className={cn(
                                "flex flex-col p-8 rounded-3xl border-2 text-left relative transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10",
                                tier.popular ? "border-primary shadow-xl bg-primary/[0.02]" : "border-zinc-200 bg-card"
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
                                            <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Check className="size-3" strokeWidth={3} /></div>
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

                    <div className="text-center pt-20 border-t">
                        <p className="text-muted-foreground font-medium">Need a custom enterprise agreement? <a href="#" className="text-primary font-bold hover:underline">Contact Sales</a></p>
                    </div>
                </div>
            </main>
        </div>
    );
}

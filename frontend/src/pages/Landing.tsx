import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    CheckCircle,
    Cpu,
    Database,
    Layout,
    Shield,
    Users,
    Zap,
    Sparkles as SparklesIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Landing() {

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/10">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <Cpu size={18} />
                        </div>
                        <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                            talentacquisition.ai
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        {['Features', 'How it Works', 'Pricing'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                            >
                                {item}
                            </a>
                        ))}
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" asChild>
                                <Link to="/login">Log In</Link>
                            </Button>
                            <Button asChild>
                                <Link to="/signup">Get Started</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
                    <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[80px]" />
                </div>

                <div className="container relative mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-2xl"
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border bg-background/50 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm mb-6">
                            <SparklesIcon size={12} className="fill-primary" />
                            <span>AI-Powered Recruitment V2.0</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                            Hire Top Talent with <br />
                            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Precision & Speed</span>
                        </h1>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                            Transform your hiring process with our AI copilot. Extract skills, match candidates, and make data-driven decisions in minutes, not days.
                        </p>

                        <div className="flex flex-wrap gap-4 mb-12">
                            <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25" asChild>
                                <Link to="/signup">
                                    Start Free Trial
                                    <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-background/50 backdrop-blur-sm">
                                View Demo
                            </Button>
                        </div>

                        <div className="flex items-center gap-8 border-t pt-8">
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">85%</div>
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faster Grading</div>
                            </div>
                            <div className="h-12 w-px bg-border" />
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">2x</div>
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Better Quality</div>
                            </div>
                            <div className="h-12 w-px bg-border" />
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">10k+</div>
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Matches Made</div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative hidden lg:block"
                    >
                        {/* Abstract Visual Representation of the App */}
                        <div className="relative rounded-2xl border bg-background/80 shadow-2xl backdrop-blur-sm p-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl pointer-events-none" />

                            <div className="relative overflow-hidden rounded-xl border bg-background">
                                {/* Window Controls */}
                                <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
                                    <div className="size-3 rounded-full bg-red-400" />
                                    <div className="size-3 rounded-full bg-amber-400" />
                                    <div className="size-3 rounded-full bg-green-400" />
                                </div>

                                {/* UI Mockup */}
                                <div className="p-6 space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-1/3 space-y-3">
                                            <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
                                            <div className="h-8 rounded-lg bg-muted/50" />
                                            <div className="h-8 rounded-lg bg-muted/50" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex justify-between">
                                                <div className="h-8 w-48 rounded-md bg-muted/50" />
                                                <div className="h-8 w-24 rounded-md bg-primary/20" />
                                            </div>
                                            <div className="h-40 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 flex items-center justify-center">
                                                <div className="text-center space-y-2">
                                                    <div className="mx-auto size-12 rounded-full bg-background flex items-center justify-center shadow-sm">
                                                        <Cpu size={20} className="text-primary" />
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">AI Matching Engine Active...</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                                                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {95 - i * 4}%
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                                                            <div className="h-2 w-full rounded bg-muted-foreground/10" />
                                                        </div>
                                                        <CheckCircle size={16} className="text-green-500" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Elements */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="absolute -right-8 top-20 rounded-xl border bg-background p-4 shadow-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="size-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                                                U{i}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-sm font-semibold">
                                        <span className="text-primary">3 Candidates</span> Shortlisted
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Trusted By */}
            <section className="border-y bg-muted/30 py-12">
                <div className="container mx-auto px-6 text-center">
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">Trusted by Modern Recruiting Teams</h4>
                    <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale transition-all duration-500 hover:grayscale-0 hover:opacity-100">
                        {['Acme Corp', 'GlobalTech', 'Nebula', 'Velocity', 'Circle'].map((logo) => (
                            <div key={logo} className="text-xl font-bold text-foreground/80 flex items-center gap-2">
                                <div className="size-6 rounded bg-foreground/20" />
                                {logo}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-background">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to hire better</h2>
                        <p className="text-xl text-muted-foreground">Our AI copilot handles the heavy lifting so you can focus on building relationships and closing candidates.</p>
                    </div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        <FeatureCard
                            icon={<Database className="text-blue-500" />}
                            title="Smart Parsing"
                            description="Automatically extract skills, experience, and education from resumes with 99% accuracy."
                        />
                        <FeatureCard
                            icon={<Layout className="text-purple-500" />}
                            title="Contextual Matching"
                            description="Go beyond keyword matching. Our AI understands relevant experience and skill adjacency."
                        />
                        <FeatureCard
                            icon={<Zap className="text-yellow-500" />}
                            title="Instant Ranking"
                            description="Get a ranked shortlist of candidates immediately after upload, sorted by fit score."
                        />
                        <FeatureCard
                            icon={<Shield className="text-emerald-500" />}
                            title="Bias Reduction"
                            description="Focus on skills and experience. Our AI is designed to minimize unconscious bias."
                        />
                        <FeatureCard
                            icon={<Users className="text-rose-500" />}
                            title="Team Collaboration"
                            description="Share shortlists, gather feedback, and make collaborative hiring decisions."
                        />
                        <FeatureCard
                            icon={<Cpu className="text-indigo-500" />}
                            title="AI Copilot"
                            description="Chat with your data. Ask questions like 'Who has the best React experience?'"
                        />
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                        </div>

                        <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left relative z-10">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                Ready to transform your hiring?
                            </h2>
                            <p className="mt-6 text-lg leading-8 text-white/80">
                                Join thousands of recruiters using AI to find the best talent faster. Get started with 50 free credits today.
                            </p>
                            <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                                <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
                                    <Link to="/signup">Get Started for Free</Link>
                                </Button>
                                <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                                    Contact Sales
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-muted/40 py-12">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 font-bold text-xl mb-4">
                                <Cpu size={20} className="text-primary" />
                                <span>talentacquisition.ai</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Fast, defensible hiring decisions powered by advanced AI.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#" className="hover:text-primary">Features</a></li>
                                <li><a href="#" className="hover:text-primary">Pricing</a></li>
                                <li><a href="#" className="hover:text-primary">Security</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#" className="hover:text-primary">About</a></li>
                                <li><a href="#" className="hover:text-primary">Careers</a></li>
                                <li><a href="#" className="hover:text-primary">Blog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#" className="hover:text-primary">Privacy</a></li>
                                <li><a href="#" className="hover:text-primary">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t pt-8 text-center text-sm text-muted-foreground">
                        <p>&copy; 2026 TalentAcquisition.ai. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <motion.div
            variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
            }}
        >
            <Card className="h-full border-muted hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
                <CardHeader>
                    <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-muted">
                        {icon}
                    </div>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="text-base">{description}</CardDescription>
                </CardContent>
            </Card>
        </motion.div>
    );
}

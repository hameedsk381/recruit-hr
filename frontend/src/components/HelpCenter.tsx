import { useState } from 'react';
import { 
    HelpCircle, 
    BookOpen, 
    Zap, 
    Target, 
    ShieldCheck, 
    ChevronRight,
    Sparkles,
    Search,
    MessageSquare,
    ExternalLink
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const HELP_TOPICS = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: <Zap size={18} />,
        content: 'Start your search by uploading a Job Description. Our AI will automatically identify the key skills and experience needed for the role.'
    },
    {
        id: 'ai-matching',
        title: 'How Matching Works',
        icon: <Target size={18} />,
        content: 'The system ranks candidates based on how well their experience aligns with your specific job requirements, helping you find top talent faster.'
    },
    {
        id: 'skill-weighting',
        title: 'Prioritizing Skills',
        icon: <Sparkles size={18} />,
        content: 'Tell the AI which skills are "must-haves" and which are "nice-to-haves" to fine-tune your candidate rankings.'
    },
    {
        id: 'privacy',
        title: 'Safe & Secure',
        icon: <ShieldCheck size={18} />,
        content: 'Your data is protected by enterprise-grade security. Our AI is also designed to ensure fair and unbiased candidate evaluations.'
    }
];

function HelpCard({ topic, idx, onSelect }: { topic: any, idx: number, onSelect: () => void }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
                "vercel-card transition-all group cursor-pointer border-border/60 p-4",
                isOpen ? "bg-muted/30" : "hover:bg-muted/40"
            )}
        >
            <div className="flex items-start justify-between mb-1.5" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-2.5">
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{topic.icon}</span>
                    <h4 className="text-sm font-bold text-foreground">{topic.title}</h4>
                </div>
                <ChevronRight 
                    size={14} 
                    className={cn(
                        "text-muted-foreground/30 group-hover:text-foreground transition-all duration-300",
                        isOpen && "rotate-90"
                    )} 
                />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                {topic.content}
            </p>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 mt-4 border-t border-border/40 space-y-3">
                            <h5 className="text-[9px] font-black uppercase tracking-widest text-foreground/50">Pro Tip</h5>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                We use smart AI to read between the lines of a resume, so you don't have to spend hours on manual screening.
                                <br/><br/>
                                <button className="text-foreground hover:underline flex items-center gap-1 font-bold" onClick={onSelect}>
                                    View Full Guide <ExternalLink size={10} />
                                </button>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function HelpCenter({ trigger }: { trigger?: React.ReactNode }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTopic, setSelectedTopic] = useState<any>(null);

    const filteredTopics = HELP_TOPICS.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Sheet onOpenChange={(open) => !open && setSelectedTopic(null)}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                        <HelpCircle size={14} />
                        <span>Documentation</span>
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[500px] bg-background border-l border-border text-foreground overflow-y-auto p-0 flex flex-col h-full">
                <AnimatePresence mode="wait">
                    {!selectedTopic ? (
                        <motion.div 
                            key="list"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="p-8 space-y-8 flex-1"
                        >
                            <SheetHeader className="space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-6 rounded bg-foreground text-background flex items-center justify-center">
                                        <BookOpen size={14} />
                                    </div>
                                    <SheetTitle className="text-lg font-black uppercase tracking-tighter text-foreground">Docs & Support</SheetTitle>
                                </div>
                                
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="Search documentation..."
                                        className="w-full bg-muted/50 border border-border rounded-md py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground/50"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </SheetHeader>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="flex items-center justify-center gap-2 p-3 rounded-md bg-muted/50 border border-border hover:bg-muted transition-all text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                                        <Zap size={14} /> Quick Start
                                    </button>
                                    <button className="flex items-center justify-center gap-2 p-3 rounded-md bg-muted/50 border border-border hover:bg-muted transition-all text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                                        <MessageSquare size={14} /> Support
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Knowledge Base</h3>
                                    <div className="space-y-2">
                                        <AnimatePresence mode='popLayout'>
                                            {filteredTopics.map((topic, idx) => (
                                                <HelpCard key={topic.id} topic={topic} idx={idx} onSelect={() => setSelectedTopic(topic)} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="p-6 rounded-lg bg-foreground text-background space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Badge className="bg-background/20 text-background border-none text-[9px] font-bold uppercase tracking-widest px-2 py-0.5">Release v1.2</Badge>
                                        <ExternalLink size={14} className="opacity-50" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-black uppercase tracking-tight">Chrome Extension</h4>
                                        <p className="text-xs opacity-70 leading-relaxed font-medium">
                                            Source candidates directly from LinkedIn & GitHub with our official browser extension.
                                        </p>
                                    </div>
                                    <Button className="w-full bg-background text-foreground hover:opacity-90 font-black uppercase tracking-widest text-[10px] rounded h-9 border-none">
                                        Install Extension
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="detail"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="p-8 space-y-8 flex-1"
                        >
                            <button 
                                onClick={() => setSelectedTopic(null)}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-4"
                            >
                                <ChevronRight className="rotate-180" size={14} />
                                Back to Base
                            </button>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-lg bg-foreground text-background flex items-center justify-center">
                                        {selectedTopic.icon}
                                    </div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedTopic.title}</h2>
                                </div>

                                <div className="space-y-6 text-sm text-foreground leading-relaxed font-medium">
                                    <p>{selectedTopic.content}</p>
                                    
                                    <div className="p-5 rounded-lg border border-border bg-muted/30 space-y-3">
                                         <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                             <Sparkles size={12} className="text-foreground/40" />
                                             The AI Advantage
                                         </h4>
                                         <p className="text-[11px] text-muted-foreground leading-relaxed">
                                             Instead of just searching for keywords, our AI understands the context of a candidate's career. This means you won't miss out on great talent just because they used different words on their resume.
                                         </p>
                                     </div>

                                     <div className="space-y-4 pt-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">How it helps you</h4>
                                         <div className="space-y-5 border-l border-border ml-1 pl-5">
                                             <div className="relative">
                                                 <div className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-background border border-foreground" />
                                                 <h5 className="text-xs font-bold">1. Saves Time</h5>
                                                 <p className="text-[11px] text-muted-foreground">Automatically sorts through hundreds of resumes so you can focus on interviewing.</p>
                                             </div>
                                             <div className="relative">
                                                 <div className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-background border border-border" />
                                                 <h5 className="text-xs font-bold">2. Improves Quality</h5>
                                                 <p className="text-[11px] text-muted-foreground">Ensures every candidate is evaluated against the same high standards.</p>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </SheetContent>
        </Sheet>
    );
}

export function ContextualHelp({ title, content }: { title: string, content: string }) {
    return (
        <div className="group relative inline-block ml-1.5 align-middle">
            <HelpCircle size={13} className="text-muted-foreground/60 hover:text-foreground transition-colors cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-background border border-border rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-[60]">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                        {content}
                    </p>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-border" />
            </div>
        </div>
    );
}

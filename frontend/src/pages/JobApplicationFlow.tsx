import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Upload, Send, Sparkles, CheckCircle, Loader2, User, Bot, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function JobApplicationFlow() {
    const { tenantId, jobId } = useParams<{ tenantId: string, jobId: string }>();
    const navigate = useNavigate();

    const [step, setStep] = useState<'form' | 'chat' | 'success'>('form');
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [resume, setResume] = useState<File | null>(null);

    // Chat State
    const [chatToken, setChatToken] = useState("");
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
        { role: 'assistant', content: "Hi! I'm the Technical Evaluator. I've received your resume. Before we proceed, I'd like to ask you a few questions about your technical experience. Ready?" }
    ]);
    const [input, setInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resume) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('jobId', jobId!);
            formData.append('tenantId', tenantId!);
            formData.append('resume', resume);

            const res = await api.publicApply(formData);
            if (res.success) {
                setChatToken(res.magicLinkToken);
                setStep('chat');
            }
        } catch (error) {
            console.error("Application failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || chatLoading) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatLoading(true);

        try {
            const res = await api.candidateChat(userMsg, chatToken);
            if (res.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
                if (res.isFinished) {
                    setTimeout(() => setStep('success'), 2000);
                }
            }
        } catch (error) {
            console.error("Chat failed");
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
            <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col h-screen">
                
                {/* Header */}
                <header className="flex items-center justify-between mb-8 shrink-0">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-white -ml-4">
                        <ArrowLeft size={20} className="mr-2" /> Back to Jobs
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Sparkles size={18} />
                        </div>
                        <span className="font-bold">reckruit.ai</span>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col items-center">
                    
                    {/* Step 1: Initial Form */}
                    {step === 'form' && (
                        <div className="w-full max-w-md space-y-8 py-12 animate-in fade-in slide-in-from-bottom-4">
                            <div className="text-center space-y-2">
                                <h1 className="text-3xl font-bold">Apply for this role</h1>
                                <p className="text-muted-foreground">Fill in your details and upload your resume to start.</p>
                            </div>

                            <form onSubmit={handleApply} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                        <input 
                                            required
                                            className="w-full h-12 bg-zinc-900 border border-white/10 rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                                        <input 
                                            required
                                            type="email"
                                            className="w-full h-12 bg-zinc-900 border border-white/10 rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Resume (PDF/DOCX)</label>
                                        <div className="relative group">
                                            <input 
                                                type="file" 
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                accept=".pdf,.docx"
                                                onChange={(e) => setResume(e.target.files?.[0] || null)}
                                            />
                                            <div className="h-32 border-2 border-dashed border-white/10 group-hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                                                {resume ? (
                                                    <div className="flex items-center gap-2 text-indigo-400 font-medium">
                                                        <CheckCircle size={20} />
                                                        {resume.name}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload className="text-muted-foreground group-hover:text-indigo-400" size={32} />
                                                        <span className="text-muted-foreground text-sm font-medium">Click or drag to upload</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    disabled={loading || !resume}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-lg shadow-xl shadow-indigo-600/20"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Next: Screening Chat"}
                                </Button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: AI Screening Chat */}
                    {step === 'chat' && (
                        <div className="w-full max-w-2xl flex-1 flex flex-col overflow-hidden bg-zinc-900/30 border border-white/5 rounded-3xl animate-in zoom-in-95">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-indigo-600 flex items-center justify-center">
                                        <Bot size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Technical Evaluator</p>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">AI Agent • Phase 1</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                                            <div className="shrink-0 pt-0.5">
                                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                            </div>
                                            <p className="text-sm leading-relaxed">{m.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-zinc-800 p-4 rounded-2xl flex gap-2">
                                            <span className="size-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="size-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="size-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-black/40 border-t border-white/5">
                                <div className="relative">
                                    <input 
                                        className="w-full h-12 bg-zinc-900 border border-white/10 rounded-xl px-4 pr-12 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                        placeholder="Type your answer..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        className="absolute right-3 top-2.5 size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-600 text-center mt-2">Answers are recorded and transcribed for the talent team.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Success Screen */}
                    {step === 'success' && (
                        <div className="w-full max-w-md py-20 text-center space-y-8 animate-in zoom-in-95">
                            <div className="size-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 scale-125">
                                <CheckCircle size={40} />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-4xl font-bold">Application Sent!</h1>
                                <p className="text-muted-foreground font-medium">
                                    Great job with the screening interview. We've sent a **Magic Link** to your email so you can track your status in real-time.
                                </p>
                            </div>
                            <div className="pt-4">
                                <Button 
                                    onClick={() => navigate(`/status/${chatToken}`)}
                                    className="w-full h-14 bg-zinc-900 hover:bg-primary/90 border border-white/10 rounded-2xl font-bold"
                                >
                                    Check Status Now
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

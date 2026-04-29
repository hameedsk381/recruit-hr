import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { Mic, Square, Loader2, CheckCircle, AlertCircle, Sparkles, Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CandidatePortal() {
    const { id } = useParams<{ id: string }>();
    if (id) { /* Make TS happy */ }
    const [status, setStatus] = useState<'welcome' | 'generating' | 'ready' | 'recording' | 'processing' | 'completed' | 'error'>('welcome');
    
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQIndex] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);
    const [evaluation, setEvaluation] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerInterval = useRef<Record<string, any> | number | null>(null);

    // Handle Start Interview
    const handleStart = async () => {
        try {
            setStatus('generating');
            const jd = { title: "Role Opportunity", requirements: ["Role-relevant experience", "Communication", "Judgment"] };
            const res = await api.generateVoiceQuestions(jd, "Focus on transferable experience, situational judgment, and role-relevant strengths.");
            if (res.success && res.questions) {
                setQuestions(res.questions);
                setStatus('ready');
            } else {
                throw new Error("Failed to generate questions");
            }
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to load interview.");
            setStatus('error');
        }
    };

    // Handle Mic Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            mediaRecorder.current.start();
            setStatus('recording');
            setRecordingTime(0);
            
            timerInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000) as any;

        } catch (err: any) {
            setErrorMsg("Microphone access denied or unavailable.");
            setStatus('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stop();
            clearInterval(timerInterval.current as any);
            setStatus('processing');

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                await submitAudio(audioBlob);
                // Stop all tracks to release mic
                mediaRecorder.current?.stream.getTracks().forEach(t => t.stop());
            };
        }
    };

    const submitAudio = async (blob: File | Blob) => {
        try {
            // Convert Blob to File
            const audioFile = new File([blob], `answer_${Date.now()}.webm`, { type: 'audio/webm' });
            
            const questionText = questions[currentQIndex]?.question || "Tell me about yourself.";
            // Submit to the advanced Multi-Modal API gap
            const res = await api.evaluateAudioAnswer(audioFile, questionText, "Candidate is being evaluated for a role-specific opportunity.");
            
            if (res.success && res.evaluation) {
                setEvaluation(res.evaluation);
                setStatus('completed');
            } else {
                throw new Error("Evaluation failed.");
            }
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to process audio.");
            setStatus('error');
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white/20">
            {/* Header */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white text-black flex items-center justify-center">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-tight" translate="no">reckruit.ai</h1>
                    <p className="text-xs text-muted-foreground font-medium">Candidate Portal</p>
                </div>
            </div>

            <div className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                {/* Decorative blob */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                    
                    {/* State: Welcome */}
                    {status === 'welcome' && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="size-20 bg-zinc-800/80 rounded-full flex items-center justify-center mx-auto mb-2 text-zinc-300">
                                <Volume2 size={32} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-semibold tracking-tight">Audio Interview</h2>
                                <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                                    You've been invited for a brief audio check-in. Find a quiet spot, relax, and let's get started!
                                </p>
                            </div>
                            <Button 
                                onClick={handleStart}
                                className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-full font-semibold text-sm transition-all"
                            >
                                Start Interview
                            </Button>
                        </div>
                    )}

                    {/* State: Generating */}
                    {status === 'generating' && (
                        <div className="space-y-6 py-12 flex flex-col items-center animate-pulse">
                            <Loader2 size={40} className="animate-spin text-indigo-400" />
                            <p className="text-muted-foreground font-medium">Setting everything up for you...</p>
                        </div>
                    )}

                    {/* State: Ready or Recording */}
                    {(status === 'ready' || status === 'recording') && (
                        <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="space-y-4">
                                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Question {currentQIndex + 1} of {questions.length}</span>
                                <h3 className="text-2xl sm:text-3xl font-medium tracking-tight leading-snug">
                                    "{questions[currentQIndex]?.question}"
                                </h3>
                                <p className="text-muted-foreground text-sm">{questions[currentQIndex]?.why}</p>
                            </div>

                            <div className="flex flex-col items-center gap-6">
                                {status === 'ready' ? (
                                    <Button 
                                        onClick={startRecording}
                                        className="size-20 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center"
                                    >
                                        <Mic size={28} />
                                    </Button>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex items-center gap-3 text-red-400 font-mono text-xl">
                                            <span className="size-2.5 rounded-full bg-red-500 animate-pulse" />
                                            {formatTime(recordingTime)}
                                        </div>
                                        <Button 
                                            onClick={stopRecording}
                                            className="h-14 px-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 font-semibold gap-3 transition-all"
                                        >
                                            <Square fill="currentColor" size={16} /> Stop & Submit Answer
                                        </Button>
                                    </div>
                                )}
                                {status === 'ready' && <p className="text-sm text-muted-foreground">Click to start recording your answer</p>}
                            </div>
                        </div>
                    )}

                    {/* State: Processing */}
                    {status === 'processing' && (
                        <div className="space-y-6 py-12 flex flex-col items-center">
                            <Loader2 size={40} className="animate-spin text-muted-foreground" />
                            <div className="space-y-1 text-center">
                                <p className="text-zinc-200 font-medium">Saving your answer...</p>
                                <p className="text-muted-foreground text-sm">Please wait a moment while we process your response.</p>
                            </div>
                        </div>
                    )}

                    {/* State: Completed / Feedback */}
                    {status === 'completed' && evaluation && (
                        <div className="w-full space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="size-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto">
                                <CheckCircle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold">Great job!</h2>
                                <p className="text-muted-foreground">Your responses have been successfully submitted to the team.</p>
                            </div>

                            <div className="bg-black/50 border border-zinc-800 rounded-2xl p-6 text-left space-y-6">
                                {/* Friendly wrap up */}
                                <div className="text-center pb-2">
                                    <p className="text-white font-medium">We appreciate your time.</p>
                                    <p className="text-sm text-muted-foreground mt-1">Our talent team will review your audio and reach out with next steps.</p>
                                </div>
                            </div>

                            <Button 
                                onClick={() => setStatus('welcome')} 
                                className="h-12 w-full rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold"
                            >
                                Finish
                            </Button>
                        </div>
                    )}

                    {/* State: Error */}
                    {status === 'error' && (
                        <div className="space-y-6">
                            <AlertCircle size={48} className="text-red-500 mx-auto" />
                            <p className="text-zinc-300">{errorMsg}</p>
                            <Button onClick={() => setStatus('welcome')} className="bg-zinc-800 text-white hover:bg-zinc-700">Try Again</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

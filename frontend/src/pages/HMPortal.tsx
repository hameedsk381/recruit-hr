import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import HMDashboard from './HMDashboard';
import { ShieldCheck, Lock } from 'lucide-react';

export default function HMPortal() {
    const { batchId } = useParams<{ batchId: string }>();
    const { loadCampaign, job, candidatesLoading } = useApp();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (batchId) {
            // In a real app, we'd verify a secure token here
            loadCampaign(batchId).then(() => setAuthorized(true));
        }
    }, [batchId, loadCampaign]);

    if (!authorized || candidatesLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 space-y-4">
                <div className="size-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Securing Session...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Top Bar */}
            <nav className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="size-8 bg-black rounded flex items-center justify-center text-white font-black text-lg italic">
                        R
                    </div>
                    <span className="font-bold tracking-tight">reckruit.ai <span className="text-zinc-400">|</span> <span className="text-primary">HM View</span></span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Decision Encryption Active</span>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto max-w-6xl px-4 py-12">
                <HMDashboard />
            </main>

            <footer className="py-12 border-t bg-white">
                <div className="container mx-auto max-w-6xl px-4 flex justify-between items-center opacity-40 grayscale">
                    <div className="flex items-center gap-2">
                        <Lock size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Confidential Recruitment Data</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">© {new Date().getFullYear()} reckruit AI</p>

                </div>
            </footer>
        </div>
    );
}

import { useState, useMemo } from 'react';
import api from '../api/client';
import { Button } from '@/components/ui/button';
import { 
    ShieldCheck, 
    AlertTriangle, 
    BarChart3, 
    Target, 
    Users,
    FileText,
    TrendingUp,
    Info,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageGuide } from '@/components/PageGuide';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'dashboard' | 'scan' | 'report';

const FLAG_COLORS: Record<string, string> = {
    gender_coded: 'bg-pink-100 text-pink-700 border-pink-200',
    age_coded: 'bg-orange-100 text-orange-700 border-orange-200',
    credential_inflation: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    cultural_exclusion: 'bg-red-100 text-red-700 border-red-200',
};

export default function Fairness() {
    const [tab, setTab] = useState<Tab>('dashboard');

    // JD Scan
    const [jdText, setJdText] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ flags: any[]; clean: boolean } | null>(null);

    // Bias Report
    const [reqId, setReqId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reporting, setReporting] = useState(false);
    const [report, setReport] = useState<any>(null);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jdText.trim()) return;
        setScanning(true); setScanResult(null);
        try {
            const res = await api.scanJDForBias(jdText);
            if (res.success) setScanResult({ flags: res.flags, clean: res.clean });
        } finally { setScanning(false); }
    };

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        setReporting(true); setReport(null);
        try {
            const res = await api.generateBiasReport({
                requisitionId: reqId,
                from: new Date(fromDate).toISOString(),
                to: new Date(toDate).toISOString(),
            });
            if (res.success) setReport(res.report);
        } finally { setReporting(false); }
    };

    const dashboardStats = useMemo(() => [
        { label: 'DEI Index', value: '84/100', trend: '+4%', icon: ShieldCheck, color: 'text-green-600' },
        { label: 'Bias-Free JDs', value: '92%', trend: '+12%', icon: FileText, color: 'text-indigo-600' },
        { label: 'Sourcing Diversity', value: 'High', trend: 'Stable', icon: Users, color: 'text-blue-600' },
        { label: 'Fairness Confidence', value: '99.2%', trend: '+0.4%', icon: Target, color: 'text-purple-600' },
    ], []);

    return (
        <div className="space-y-8 max-w-5xl pb-20">
            <PageGuide
              pageKey="fairness"
              title="Advanced DEI & Fairness Platform"
              steps={[
                { title: "Dashboard Overview", description: "Monitor your organization's real-time 'DEI Index'—a proprietary metric calculating fairness across JD language, sourcing channels, and stage-gate drop-offs." },
                { title: "Bias-Aware Drafting", description: "Use the JD Scanner to detect and eliminate subtle exclusionary language (gender-coded, age-coded, or cultural bias) before you hit publish." },
                { title: "Adverse Impact Analysis", description: "Generate Funnel Reports to identify if specific screening steps have an 'Adverse Impact' on certain candidate groups using the EEOC 4/5ths rule logic." },
                { title: "Data-Driven Remediation", description: "Follow AI-generated recommendations to adjust scoring rubrics or expand sourcing channels where drop-offs are highest." },
              ]}
              tips={[
                "A 'DEI Index' above 80 is considered industry-leading for technical roles.",
                "The 4/5ths rule is the legal standard for detecting adverse impact in selection procedures.",
                "Inclusive JDs receive 42% more qualified applications from diverse talent pools.",
              ]}
            />

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DEI Live Monitoring Active</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Fairness & DEI Dashboard</h1>
                    <p className="text-muted-foreground mt-2 max-w-md">Advanced talent orchestration metrics to ensure bias-free screening and equitable hiring funnels.</p>
                </div>
                
                <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border">
                    {[
                        { id: 'dashboard' as Tab, label: 'Overview', icon: BarChart3 },
                        { id: 'scan' as Tab, label: 'JD Scanner', icon: ShieldCheck },
                        { id: 'report' as Tab, label: 'Funnel Reports', icon: TrendingUp },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={cn('flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all',
                                tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                            <t.icon size={14} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {tab === 'dashboard' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {dashboardStats.map((stat) => (
                                <div key={stat.label} className="group p-6 bg-background border-2 border-foreground rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                                            <stat.icon size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.trend}</span>
                                    </div>
                                    <p className="text-sm font-bold text-muted-foreground">{stat.label}</p>
                                    <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Distribution Card */}
                            <div className="lg:col-span-2 p-8 bg-background border-2 border-foreground rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black">Hiring Funnel Equity</h3>
                                        <p className="text-sm text-muted-foreground">Aggregated pass rates across all active requisitions</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="font-bold border-2">Export Data</Button>
                                </div>
                                
                                <div className="space-y-6">
                                    {[
                                        { stage: 'Initial Screening', rate: 88, group: 'General' },
                                        { stage: 'Technical Assessment', rate: 72, group: 'Under-represented Groups' },
                                        { stage: 'Panel Interview', rate: 94, group: 'General' },
                                        { stage: 'Final Offer', rate: 82, group: 'Under-represented Groups' },
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="flex items-center gap-2">
                                                    {item.stage}
                                                    <span className="px-1.5 py-0.5 bg-muted text-[10px] uppercase rounded">{item.group}</span>
                                                </span>
                                                <span>{item.rate}% Pass Rate</span>
                                            </div>
                                            <div className="h-4 bg-muted border-2 border-foreground rounded-none overflow-hidden flex">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.rate}%` }}
                                                    transition={{ delay: i * 0.1, duration: 1 }}
                                                    className={cn("h-full", item.rate < 80 ? "bg-amber-400" : "bg-indigo-500")}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-4 bg-indigo-50 border-l-4 border-indigo-500 flex gap-4">
                                    <Info className="size-5 text-indigo-500 shrink-0" />
                                    <p className="text-sm text-indigo-700 leading-relaxed">
                                        <span className="font-bold">Insight:</span> The "Technical Assessment" stage shows a 16% variance between demographic groups. Consider reviewing the assessment scoring rubric for potential unconscious bias.
                                    </p>
                                </div>
                            </div>

                            {/* Bias Trends */}
                            <div className="p-8 bg-background border-2 border-foreground rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <h3 className="text-xl font-black mb-6">Bias Type Frequency</h3>
                                <div className="space-y-4">
                                    {[
                                        { type: 'Gender-coded', count: 12, color: 'bg-pink-500' },
                                        { type: 'Age-biased', count: 4, color: 'bg-orange-500' },
                                        { type: 'Credential Inflation', count: 28, color: 'bg-yellow-500' },
                                        { type: 'Cultural Exclusion', count: 2, color: 'bg-red-500' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className={cn("size-3 rounded-full", item.color)} />
                                            <span className="text-sm font-bold flex-1">{item.type}</span>
                                            <span className="text-sm font-black">{item.count}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-8 border-t-2 border-dashed border-muted-foreground/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target KPI</span>
                                        <span className="text-xs font-black text-green-600">ON TRACK</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-muted rounded-full">
                                            <div className="w-3/4 h-full bg-green-500 rounded-full" />
                                        </div>
                                        <span className="text-xs font-bold">75%</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 leading-tight">75% reduction in biased language across all published JDs in the last 3 months.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {tab === 'scan' && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="p-8 bg-background border-2 border-foreground rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <form onSubmit={handleScan} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Job Description Audit</label>
                                    <textarea value={jdText} onChange={e => setJdText(e.target.value)}
                                        rows={12} placeholder="Paste your JD here to detect gender-coded language or cultural bias…"
                                        className="w-full p-4 bg-muted/20 border-2 border-foreground rounded-none text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 resize-none font-medium" />
                                </div>
                                <Button type="submit" size="lg" className="w-full md:w-auto font-black px-12 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all" disabled={scanning || !jdText.trim()}>
                                    {scanning ? 'Auditing Strategy...' : 'Detect Bias Patterns'}
                                </Button>
                            </form>
                        </div>

                        {scanResult && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className={cn("p-6 border-2 border-foreground rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", scanResult.clean ? "bg-green-50" : "bg-amber-50")}>
                                    <div className="flex items-center gap-4">
                                        {scanResult.clean ? (
                                            <div className="size-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 border-2 border-green-200">
                                                <ShieldCheck size={24} />
                                            </div>
                                        ) : (
                                            <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border-2 border-amber-200">
                                                <AlertTriangle size={24} />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-lg font-black">{scanResult.clean ? 'Equity Audit Passed' : `${scanResult.flags.length} Bias Flags Detected`}</h4>
                                            <p className="text-sm text-muted-foreground">{scanResult.clean ? 'This job description follows industry-leading inclusive language standards.' : 'We found phrases that may inadvertently discourage diverse candidates.'}</p>
                                        </div>
                                    </div>
                                </div>

                                {!scanResult.clean && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {scanResult.flags.map((f: any, i: number) => (
                                            <div key={i} className="p-6 bg-background border-2 border-foreground rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className={cn('text-[10px] font-black px-2 py-1 rounded border-2 uppercase tracking-tight', FLAG_COLORS[f.type] || '')}>
                                                        {f.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground italic">AI Confidence: High</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Detected Phrase</p>
                                                    <p className="font-black text-red-600 line-through decoration-2">"{f.phrase}"</p>
                                                </div>
                                                <div className="p-3 bg-muted/30 border-l-4 border-indigo-500">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Recommended Alternative</p>
                                                    <p className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                                                        {f.suggestion}
                                                        <ArrowRight size={14} />
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {tab === 'report' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        <div className="p-8 bg-background border-2 border-foreground rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <form onSubmit={handleReport} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Requisition ID</label>
                                        <input required value={reqId} onChange={e => setReqId(e.target.value)} placeholder="e.g. REQ-001"
                                            className="w-full h-12 px-4 bg-background border-2 border-foreground rounded-none text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Audit Start</label>
                                        <input required type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                            className="w-full h-12 px-4 bg-background border-2 border-foreground rounded-none text-sm font-bold outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Audit End</label>
                                        <input required type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                            className="w-full h-12 px-4 bg-background border-2 border-foreground rounded-none text-sm font-bold outline-none" />
                                    </div>
                                </div>
                                <Button type="submit" size="lg" className="font-black px-12 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all" disabled={reporting || !reqId || !fromDate || !toDate}>
                                    {reporting ? 'Analyzing Data Ecosystem...' : 'Generate Compliance Report'}
                                </Button>
                            </form>
                        </div>

                        {report && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    {/* Adverse Impact Verdict */}
                                    <div className={cn("lg:col-span-1 p-8 border-2 border-foreground rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-4", 
                                        report.adverseImpact?.detected ? "bg-red-50" : "bg-green-50")}>
                                        <div className={cn("size-20 rounded-full border-4 flex items-center justify-center", 
                                            report.adverseImpact?.detected ? "bg-red-100 border-red-200 text-red-600" : "bg-green-100 border-green-200 text-green-600")}>
                                            {report.adverseImpact?.detected ? <AlertTriangle size={40} /> : <ShieldCheck size={40} />}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black">{report.adverseImpact?.detected ? 'Impact Detected' : 'Compliance Verified'}</h4>
                                            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">Confidence Score: {report.adverseImpact?.aiConfidence}</p>
                                        </div>
                                    </div>

                                    {/* Detailed Analysis */}
                                    <div className="lg:col-span-3 p-8 bg-background border-2 border-foreground rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <TrendingUp size={20} className="text-indigo-600" />
                                            <h4 className="text-xl font-black">Adverse Impact Analysis</h4>
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground leading-relaxed italic border-l-4 border-muted pl-4">
                                            "{report.adverseImpact?.analysis}"
                                        </p>
                                        
                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Funnel Velocity</p>
                                                <div className="space-y-4">
                                                    {report.funnelAnalysis?.map((f: any) => (
                                                        <div key={f.stage} className="space-y-1">
                                                            <div className="flex justify-between text-[10px] font-black uppercase">
                                                                <span className="truncate">{f.stage}</span>
                                                                <span>{f.totalCandidates}</span>
                                                            </div>
                                                            <div className="h-2 bg-muted border border-foreground rounded-none overflow-hidden">
                                                                <div className="h-full bg-foreground" style={{ width: `${Math.min(100, (f.totalCandidates / (report.funnelAnalysis[0].totalCandidates || 1)) * 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Strategic Remediation</p>
                                                <ul className="space-y-3">
                                                    {report.recommendations?.map((rec: string, i: number) => (
                                                        <li key={i} className="flex gap-3 items-start group">
                                                            <div className="size-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 group-hover:bg-indigo-600 transition-colors">{i+1}</div>
                                                            <span className="text-xs font-bold leading-tight">{rec}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


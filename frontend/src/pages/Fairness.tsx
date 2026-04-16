import { useState } from 'react';
import api from '../api/client';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'scan' | 'report';

const FLAG_COLORS: Record<string, string> = {
    gender_coded: 'bg-pink-100 text-pink-700',
    age_coded: 'bg-orange-100 text-orange-700',
    credential_inflation: 'bg-yellow-100 text-yellow-700',
    cultural_exclusion: 'bg-red-100 text-red-700',
};

export default function Fairness() {
    const [tab, setTab] = useState<Tab>('scan');

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

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-black tracking-tight">Fairness & Bias Detection</h1>
                <p className="text-sm text-muted-foreground mt-1">Detect and eliminate bias in job descriptions and hiring funnels</p>
            </div>

            <div className="flex gap-1 border-b">
                {[
                    { id: 'scan' as Tab, label: 'JD Language Scan' },
                    { id: 'report' as Tab, label: 'Funnel Bias Report' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={cn('px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors',
                            tab === t.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* JD Scan */}
            {tab === 'scan' && (
                <div className="space-y-4">
                    <form onSubmit={handleScan} className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Job Description Text</label>
                            <textarea value={jdText} onChange={e => setJdText(e.target.value)}
                                rows={10} placeholder="Paste the full job description here…"
                                className="w-full px-3 py-2 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </div>
                        <Button type="submit" size="sm" disabled={scanning || !jdText.trim()}>
                            {scanning ? 'Scanning…' : 'Scan for Bias'}
                        </Button>
                    </form>

                    {scanResult && (
                        <div className="border rounded-xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                {scanResult.clean ? (
                                    <><CheckCircle size={18} className="text-green-500" /><span className="font-bold text-green-600">No bias detected — JD looks clean</span></>
                                ) : (
                                    <><AlertTriangle size={18} className="text-yellow-500" /><span className="font-bold">{scanResult.flags.length} issue{scanResult.flags.length !== 1 ? 's' : ''} found</span></>
                                )}
                            </div>
                            {!scanResult.clean && (
                                <div className="space-y-3">
                                    {scanResult.flags.map((f: any, i: number) => (
                                        <div key={i} className="rounded-lg border p-4 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">"{f.phrase}"</span>
                                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', FLAG_COLORS[f.type] || '')}>
                                                    {f.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground"><span className="font-bold">Suggestion:</span> {f.suggestion}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bias Report */}
            {tab === 'report' && (
                <div className="space-y-4">
                    <form onSubmit={handleReport} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Requisition ID *</label>
                                <input required value={reqId} onChange={e => setReqId(e.target.value)}
                                    className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">From Date *</label>
                                <input required type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                    className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">To Date *</label>
                                <input required type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                    className="w-full h-9 px-3 bg-background border rounded-md text-sm outline-none" />
                            </div>
                        </div>
                        <Button type="submit" size="sm" disabled={reporting || !reqId || !fromDate || !toDate}>
                            {reporting ? 'Generating…' : 'Generate Report'}
                        </Button>
                    </form>

                    {report && (
                        <div className="border rounded-xl p-5 space-y-5">
                            <div className="flex items-center gap-2">
                                {report.adverseImpact?.detected ? (
                                    <><AlertTriangle size={16} className="text-red-500" /><span className="font-bold text-red-600">Adverse impact detected</span></>
                                ) : (
                                    <><ShieldCheck size={16} className="text-green-500" /><span className="font-bold text-green-600">No adverse impact detected</span></>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">Confidence: {report.adverseImpact?.aiConfidence}</span>
                            </div>

                            <p className="text-sm text-muted-foreground">{report.adverseImpact?.analysis}</p>

                            {/* Funnel */}
                            {report.funnelAnalysis?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Hiring Funnel</p>
                                    <div className="space-y-2">
                                        {report.funnelAnalysis.map((f: any) => (
                                            <div key={f.stage} className="flex items-center gap-3">
                                                <span className="text-xs font-medium w-28 capitalize">{f.stage}</span>
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, f.totalCandidates)}%` }} />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-16 text-right">{f.totalCandidates} candidates</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* JD Flags */}
                            {report.jdLanguageFlags?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">JD Language Issues</p>
                                    <div className="flex flex-wrap gap-2">
                                        {report.jdLanguageFlags.map((f: any, i: number) => (
                                            <span key={i} className={cn('text-xs font-medium px-2 py-1 rounded-full', FLAG_COLORS[f.type] || 'bg-muted text-muted-foreground')}>
                                                "{f.phrase}"
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {report.recommendations?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Recommendations</p>
                                    <ul className="space-y-1">{report.recommendations.map((rec: string, i: number) => <li key={i} className="text-xs text-muted-foreground">• {rec}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

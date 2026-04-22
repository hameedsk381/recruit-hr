import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Users,
    MoreVertical,
    Sparkles,
    MessageSquare,
    Briefcase,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import type { PipelineStage, ShortlistCandidate } from '../types';

const DEFAULT_STAGES: { id: PipelineStage; label: string; colorClass: string; bgClass: string }[] = [
    { id: 'applied', label: 'Applied', colorClass: 'text-slate-500', bgClass: 'bg-slate-500' },
    { id: 'shortlisted', label: 'Shortlisted', colorClass: 'text-blue-500', bgClass: 'bg-blue-500' },
    { id: 'technical', label: 'Technical', colorClass: 'text-purple-500', bgClass: 'bg-purple-500' },
    { id: 'culture', label: 'Culture Fit', colorClass: 'text-indigo-500', bgClass: 'bg-indigo-500' },
    { id: 'pending', label: 'Decision', colorClass: 'text-amber-500', bgClass: 'bg-amber-500' },
    { id: 'offer', label: 'Offer', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500' },
];

const TYPE_COLORS: Record<string, string> = {
    screening: 'bg-slate-500',
    technical: 'bg-purple-500',
    culture: 'bg-indigo-500',
    decision: 'bg-amber-500',
    offer: 'bg-emerald-500',
    onboarding: 'bg-blue-500',
};

export default function Pipeline() {
    const { job, candidates, updateCandidateStage, selectCandidate, interviews, setView } = useApp();

    const stages = useMemo(() => {
        if (job?.workflow && job.workflow.length > 0) {
            return job.workflow.sort((a, b) => a.order - b.order).map(s => ({
                id: s.id as PipelineStage,
                label: s.label,
                colorClass: 'text-foreground',
                bgClass: TYPE_COLORS[s.type] || 'bg-slate-500'
            }));
        }
        return DEFAULT_STAGES;
    }, [job]);

    const candidatesByStage = useMemo(() => {
        const acc: Record<string, ShortlistCandidate[]> = {};
        stages.forEach(s => { acc[s.id] = []; });
        
        // Always include hidden functional stages
        if (!acc['hm_approved']) acc['hm_approved'] = [];
        if (!acc['hm_rejected']) acc['hm_rejected'] = [];

        candidates.filter(c => !c.removed).forEach(c => {
            let stage = c.stage || 'applied';
            
            // Map specific HM decision statuses to the Decision column
            if (stage === 'hm_approved' || stage === 'hm_rejected') {
                stage = 'pending';
            }

            if (acc[stage]) {
                acc[stage].push(c);
            } else if (stages.length > 0) {
                // If stage not found in current workflow, push to first stage
                acc[stages[0].id].push(c);
            }
        });
        return acc;
    }, [candidates, stages]);

    const getInterviewForCandidate = (candidateId: string, stage: PipelineStage) => {
        return interviews.find(i =>
            i.candidateId === candidateId &&
            (stage === 'technical' ? i.type === 'technical' : i.type === 'culture')
        );
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        updateCandidateStage(draggableId, destination.droppableId as PipelineStage);
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-8 overflow-hidden animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="size-6" />
                        Pipeline
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage candidate progression across stages.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="px-3 py-1 font-medium bg-muted/50 rounded-md">
                        <Users className="size-3.5 mr-1.5" />
                        {candidates.filter(c => !c.removed).length} Candidates
                    </Badge>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {stages.map(stage => (
                    <div key={stage.id} className="vercel-card !p-3 bg-card/50 flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{stage.label}</span>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-black tabular-nums">{candidatesByStage[stage.id].length}</span>
                            {candidates.length > 0 && candidatesByStage[stage.id].length > 0 && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1 rounded">
                                    {Math.round((candidatesByStage[stage.id].length / candidates.length) * 100)}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
                    {stages.map(stage => (
                        <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col max-h-full">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn("size-2.5 rounded-full ring-4 ring-background shadow-sm", stage.bgClass)} />
                                    <h3 className="font-bold text-xs uppercase tracking-widest text-foreground/80">
                                        {stage.label}
                                    </h3>
                                    <span className="text-[10px] font-black tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                        {candidatesByStage[stage.id].length}
                                    </span>
                                </div>
                                <button className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
                                    <MoreVertical size={14} />
                                </button>
                            </div>

                            <Droppable droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={cn(
                                            "flex-1 rounded-xl p-2.5 transition-colors min-h-[500px] flex flex-col gap-2.5",
                                            snapshot.isDraggingOver ? "bg-muted shadow-inner ring-1 ring-border" : "bg-muted/30"
                                        )}
                                    >
                                        {candidatesByStage[stage.id].length > 0 ? (
                                            candidatesByStage[stage.id].map((candidate, index) => {
                                                const interview = (stage.id === 'technical' || stage.id === 'culture')
                                                    ? getInterviewForCandidate(candidate.id, stage.id)
                                                    : null;

                                                const fitColor = candidate.assessment.fit_assessment.overall_fit === 'high' ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5' :
                                                    candidate.assessment.fit_assessment.overall_fit === 'medium' ? 'text-amber-600 border-amber-500/20 bg-amber-500/5' :
                                                        'text-blue-600 border-blue-500/20 bg-blue-500/5';
                                                
                                                const daysInStage = candidate.stageChangedAt 
                                                    ? Math.floor((Date.now() - new Date(candidate.stageChangedAt).getTime()) / (1000 * 60 * 60 * 24))
                                                    : 0;

                                                return (
                                                    <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={cn(
                                                                    "vercel-card !p-0 group cursor-pointer relative bg-card overflow-hidden border",
                                                                    snapshot.isDragging && "shadow-2xl ring-2 ring-foreground/10 scale-[1.04] z-50",
                                                                    !snapshot.isDragging && "hover:border-foreground/30 hover:shadow-md"
                                                                )}
                                                                onClick={() => selectCandidate(candidate.id)}
                                                            >
                                                                {/* Stage vertical indicator strip */}
                                                                <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-60", stage.bgClass)} />
                                                                
                                                                <div className="p-4 pl-5 space-y-3">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <div className="space-y-1 min-w-0 flex-1">
                                                                            <h4 className="font-semibold text-sm text-foreground leading-tight truncate">
                                                                                {candidate.profile.name}
                                                                            </h4>
                                                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                                                                <Briefcase className="size-3 shrink-0" />
                                                                                <span className="truncate">{candidate.profile.recent_role?.title || 'Candidate'}</span>
                                                                            </p>
                                                                        </div>
                                                                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1">
                                                                            <MoreVertical className="size-3.5 text-muted-foreground" />
                                                                        </Button>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tight px-1.5 h-5 bg-background">
                                                                            Rank {candidate.rank}
                                                                        </Badge>
                                                                        <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-tight px-1.5 h-5", fitColor)}>
                                                                            {candidate.assessment.fit_assessment.overall_fit} Fit
                                                                        </Badge>
                                                                        {candidate.hmDecision && (
                                                                            <Badge className={cn(
                                                                                "text-[9px] uppercase font-bold tracking-tight px-1.5 h-5 border-none",
                                                                                candidate.hmDecision === 'approved' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                                                                            )}>
                                                                                HM: {candidate.hmDecision}
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    {(stage.id === 'technical' || stage.id === 'culture') && (
                                                                        <div className={cn(
                                                                            "p-2 rounded-md text-xs flex items-center justify-between",
                                                                            interview ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
                                                                        )}>
                                                                            <div className="flex items-center gap-1.5 font-medium">
                                                                                {interview ? (
                                                                                    <>
                                                                                        <CheckCircle2 className="size-3.5" />
                                                                                        <span>Scheduled</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Clock className="size-3.5" />
                                                                                        <span>Pending</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            {!interview && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setView('interviews');
                                                                                    }}
                                                                                    className="text-[10px] font-semibold underline underline-offset-2 hover:text-amber-900"
                                                                                >
                                                                                    Schedule
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className="pt-3 border-t flex items-center justify-between">
                                                                        <div className="flex gap-3">
                                                                            <div className="flex items-center gap-1 text-muted-foreground" title="Strengths">
                                                                                <Sparkles className="size-3" />
                                                                                <span className="text-xs font-medium">{candidate.assessment.strengths.length}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-muted-foreground" title="Focus Areas">
                                                                                <MessageSquare className="size-3" />
                                                                                <span className="text-xs font-medium">{candidate.assessment.interview_focus_areas.length}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-muted-foreground/60 font-mono text-[9px] font-bold">
                                                                            <Clock size={12} />
                                                                            <span>{daysInStage === 0 ? 'Recently' : `${daysInStage}d`}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/30 rounded-xl bg-muted/5 opacity-50">
                                                <div className="size-8 rounded-full border border-border/50 flex items-center justify-center mb-2">
                                                    <Users size={14} className="text-muted-foreground" />
                                                </div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empty Stage</p>
                                            </div>
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}



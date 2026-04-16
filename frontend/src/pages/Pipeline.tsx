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

const STAGES: { id: PipelineStage; label: string; colorClass: string; bgClass: string }[] = [
    { id: 'applied', label: 'Applied', colorClass: 'text-slate-500', bgClass: 'bg-slate-100' },
    { id: 'shortlisted', label: 'Shortlisted', colorClass: 'text-blue-500', bgClass: 'bg-blue-100' },
    { id: 'technical', label: 'Technical Interview', colorClass: 'text-purple-500', bgClass: 'bg-purple-100' },
    { id: 'culture', label: 'Culture Fit', colorClass: 'text-indigo-500', bgClass: 'bg-indigo-100' },
    { id: 'pending', label: 'Decision Pending', colorClass: 'text-amber-500', bgClass: 'bg-amber-100' },
    { id: 'offer', label: 'Offer', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-100' },
];

export default function Pipeline() {
    const { candidates, updateCandidateStage, selectCandidate, interviews, setView } = useApp();

    const candidatesByStage = useMemo(() => {
        const acc: Record<PipelineStage, ShortlistCandidate[]> = {
            applied: [],
            shortlisted: [],
            technical: [],
            culture: [],
            pending: [],
            offer: [],
            hm_approved: [],
            hm_rejected: [],
        };
        candidates.filter(c => !c.removed).forEach(c => {
            const stage = c.stage || 'applied';
            if (acc[stage]) {
                acc[stage].push(c);
            }
        });
        return acc;
    }, [candidates]);

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

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
                    {STAGES.map(stage => (
                        <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col max-h-full">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                    <div className={cn("size-2 rounded-full", stage.bgClass.replace('100', '500'))} />
                                    <h3 className="font-semibold text-sm text-foreground">
                                        {stage.label}
                                    </h3>
                                    <span className="text-muted-foreground text-xs ml-1 inline-flex items-center justify-center bg-muted/50 rounded px-1.5 py-0.5">
                                        {candidatesByStage[stage.id].length}
                                    </span>
                                </div>
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

                                                const fitColor = candidate.assessment.fit_assessment.overall_fit === 'high' ? 'text-emerald-600 bg-emerald-500/10' :
                                                    candidate.assessment.fit_assessment.overall_fit === 'medium' ? 'text-amber-600 bg-amber-500/10' :
                                                        'text-blue-600 bg-blue-500/10';

                                                return (
                                                    <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={cn(
                                                                    "vercel-card !p-0 group cursor-pointer relative bg-card",
                                                                    snapshot.isDragging && "shadow-xl ring-1 ring-border scale-[1.02] z-50",
                                                                    !snapshot.isDragging && "hover:border-foreground/20"
                                                                )}
                                                                onClick={() => selectCandidate(candidate.id)}
                                                            >
                                                                {/* Stage vertical indicator strip */}
                                                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", stage.bgClass.replace('100', '400'))} />
                                                                
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

                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0 h-5">
                                                                            Rank {candidate.rank}
                                                                        </Badge>
                                                                        <Badge variant="secondary" className={cn("text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0 h-5 border-none", fitColor)}>
                                                                            {candidate.assessment.fit_assessment.overall_fit} Fit
                                                                        </Badge>
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
                                                                        <span className="text-[10px] font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            View Profile →
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-60 px-6 text-center">
                                                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="size-4" />
                                                </div>
                                                <span className="text-xs font-medium">Drop candidate here</span>
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



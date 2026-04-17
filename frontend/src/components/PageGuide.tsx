import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideStep {
  title: string;
  description: string;
}

interface PageGuideProps {
  pageKey: string;          // unique key for localStorage persistence
  title: string;            // e.g. "How AI Shortlisting Works"
  steps: GuideStep[];
  tips?: string[];          // optional pro tips shown below steps
  docLink?: string;         // optional external docs URL
  docLabel?: string;        // label for the doc link
  defaultOpen?: boolean;    // whether to show expanded by default (default: true)
}

export function PageGuide({
  pageKey,
  title,
  steps,
  tips,
  docLink,
  docLabel = 'View Docs',
  defaultOpen = true,
}: PageGuideProps) {
  const storageKey = `guide-dismissed-${pageKey}`;
  const collapseKey = `guide-collapsed-${pageKey}`;

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(collapseKey);
      return stored !== null ? stored === 'true' : !defaultOpen;
    } catch { return !defaultOpen; }
  });

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(collapseKey, String(next));
  };

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="size-4 text-primary shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {collapsed && (
            <span className="text-[10px] text-muted-foreground font-medium">{steps.length} steps</span>
          )}
          {collapsed
            ? <ChevronDown className="size-4 text-muted-foreground" />
            : <ChevronUp className="size-4 text-muted-foreground" />
          }
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-0.5 rounded"
            title="Dismiss guide"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-primary/10">
          {/* Steps */}
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 size-5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Tips */}
          {tips && tips.length > 0 && (
            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                <Lightbulb className="size-3" />
                Pro Tips
              </div>
              <ul className="space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                    <span className="text-amber-500 mt-0.5">·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Doc link */}
          {docLink && (
            <a
              href={docLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
            >
              {docLabel} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

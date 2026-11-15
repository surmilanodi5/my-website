import React, { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, ExternalLink, X } from 'lucide-react';
import type {
  FashionDesignItem,
  KitchenGardenPost,
  ProjectItem,
  TeachingClassItem,
} from '../types/portfolio.ts';

export type DetailModalEntry =
  | { kind: 'fashion'; item: FashionDesignItem }
  | { kind: 'teaching'; item: TeachingClassItem }
  | { kind: 'project'; item: ProjectItem }
  | { kind: 'kitchenGarden'; item: KitchenGardenPost };

interface DetailModalProps {
  entry: DetailModalEntry | null;
  onClose: () => void;
  onEnquire: (prefillSubject: string) => void;
  isSavedProject?: boolean;
  onToggleSaveProject?: (projectId: number) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  entry,
  onClose,
  onEnquire,
  isSavedProject = false,
  onToggleSaveProject,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entry, onClose]);

  if (!entry) return null;

  const images = entry.item.images || [];
  const currentImg = images[activeImageIdx] || '';

  const kicker =
    entry.kind === 'fashion'
      ? `${entry.item.category} · ${entry.item.fabric}`
      : entry.kind === 'teaching'
        ? `${entry.item.category} · ${entry.item.studentLevel}`
        : entry.kind === 'project'
          ? `${entry.item.category}${entry.item.tools.length > 0 ? ` · ${entry.item.tools.join(' · ')}` : ''}`
          : `${entry.item.category} · Kitchen & Garden`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020612]/75 p-4 backdrop-blur-xs md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-[#F4F7FB] p-6 text-slate-900 shadow-2xl md:p-10 dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-cyan-500/15">
          <div>
            <p className="text-xs font-semibold tracking-wide text-cyan-700 dark:text-cyan-400">{kicker}</p>
            <h2
              id="detail-modal-title"
              className="mt-1.5 font-serif text-3xl font-semibold tracking-tight md:text-4xl"
            >
              {entry.item.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/25 dark:bg-[#112240] dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
            aria-label="Close detail view"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {entry.kind === 'teaching' && entry.item.videoUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-cyan-500/20">
              <video
                src={entry.item.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full"
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-cyan-500/20 dark:bg-[#060D1E]">
              {currentImg ? (
                <img
                  src={currentImg}
                  alt={`${entry.item.title} view ${activeImageIdx + 1}`}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center p-8 text-center">
                  <span className="font-serif text-2xl text-cyan-700 dark:text-cyan-300">
                    {entry.item.title}
                  </span>
                  <span className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {entry.item.category}
                  </span>
                </div>
              )}
            </div>
          )}

          {images.length > 1 && (
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`overflow-hidden rounded-lg border transition-colors ${
                    idx === activeImageIdx
                      ? 'border-cyan-500 ring-2 ring-cyan-500/40'
                      : 'border-slate-300 opacity-75 hover:opacity-100 dark:border-cyan-500/20'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${entry.item.title} thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-16 w-24 object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {entry.kind === 'kitchenGarden' ? (
            <div className="space-y-6 pt-2">
              {entry.item.note && (
                <p className="border-b border-slate-200 pb-5 font-serif text-xl italic leading-relaxed dark:border-cyan-500/15">
                  “{entry.item.note}”
                </p>
              )}
              <div className="grid gap-8 md:grid-cols-12">
                <div className="md:col-span-5">
                  <h3 className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                    {entry.item.category === 'Garden' ? 'Supplies & Plants' : 'Ingredients'}
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                    {entry.item.ingredients.map((ing, i) => (
                      <li
                        key={i}
                        className="border-b border-slate-200 pb-2 dark:border-cyan-500/10"
                      >
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="md:col-span-7">
                  <h3 className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                    {entry.item.category === 'Garden' ? 'Care Steps' : 'Preparation Steps'}
                  </h3>
                  <ol className="mt-3 space-y-3 text-sm leading-relaxed">
                    {entry.item.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="font-mono text-xs font-semibold text-cyan-700 tabular-nums dark:text-cyan-400">
                          0{i + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 pt-2 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                  Details
                </h3>
                <p className="mt-2.5 text-base leading-relaxed text-slate-700 dark:text-slate-200">
                  {entry.item.description}
                </p>
              </div>
              <div className="space-y-4 border-t border-slate-200 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-cyan-500/15">
                {entry.kind === 'fashion' && (
                  <>
                    <div>
                      <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        Fabric
                      </h3>
                      <p className="mt-1.5 text-sm font-medium">{entry.item.fabric}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEnquire(`Custom order enquiry: ${entry.item.title}`);
                      }}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
                    >
                      <span>Custom order enquiry</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {entry.kind === 'teaching' && (
                  <>
                    <div>
                      <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        Student Level
                      </h3>
                      <p className="mt-1.5 text-sm font-medium">{entry.item.studentLevel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEnquire(`Enquiry about classes: ${entry.item.title}`);
                      }}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
                    >
                      <span>Enquire about classes</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {entry.kind === 'project' && (
                  <>
                    <div>
                      <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        Tools Used
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed">
                        {entry.item.tools.length > 0 ? entry.item.tools.join(' · ') : 'Studio Workflow'}
                      </p>
                    </div>
                    {onToggleSaveProject && (
                      <button
                        type="button"
                        onClick={() => onToggleSaveProject(entry.item.id)}
                        className={`inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                          isSavedProject
                            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:border-cyan-400 dark:text-cyan-300'
                            : 'border-slate-300 text-slate-700 hover:border-cyan-500 dark:border-cyan-500/25 dark:text-slate-200'
                        }`}
                      >
                        <Bookmark className="h-4 w-4" />
                        <span>{isSavedProject ? 'Saved to Dashboard' : 'Save Project'}</span>
                      </button>
                    )}
                    {entry.item.externalUrl && (
                      <a
                        href={entry.item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
                      >
                        <span>Open project link</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

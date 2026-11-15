import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const ContinuousThread: React.FC = () => {
  const pathRef = useRef<SVGPathElement>(null);
  const stitchDotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const dot = stitchDotRef.current;
    if (!path) return;

    const length = path.getTotalLength();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = '0';
      return;
    }

    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const ctx = gsap.context(() => {
      const state = { progress: 0.05 };
      path.style.strokeDashoffset = `${length * (1 - state.progress)}`;

      gsap.to(state, {
        progress: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
        },
        onUpdate: () => {
          path.style.strokeDashoffset = `${length * (1 - state.progress)}`;
          if (dot) {
            const pt = path.getPointAtLength(Math.min(length, state.progress * length));
            dot.setAttribute('cx', String(pt.x));
            dot.setAttribute('cy', String(pt.y));
          }
        },
      });
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-y-0 left-3 z-10 hidden w-9 xl:left-6 lg:block"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 36 1000"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <g transform="translate(8, 12)" className="text-slate-400 dark:text-cyan-300/70">
          <line
            x1="10"
            y1="0"
            x2="10"
            y2="38"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <ellipse
            cx="10"
            cy="7"
            rx="1.9"
            ry="4.2"
            fill="var(--bg-canvas)"
            stroke="currentColor"
            strokeWidth="1.15"
          />
          <path d="M9.1 34L10 41L10.9 34Z" fill="currentColor" />
        </g>

        <path
          d="M 18 19 C 29 90, 7 180, 18 275 C 29 370, 7 465, 18 560 C 29 655, 7 750, 18 855 C 26 925, 13 968, 18 1000"
          fill="none"
          stroke="var(--accent-primary)"
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        <path
          ref={pathRef}
          d="M 18 19 C 29 90, 7 180, 18 275 C 29 370, 7 465, 18 560 C 29 655, 7 750, 18 855 C 26 925, 13 968, 18 1000"
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="1.45"
          strokeOpacity="0.82"
        />
        <circle ref={stitchDotRef} cx="18" cy="60" r="2.75" fill="var(--accent-primary)" />
      </svg>
    </div>
  );
};

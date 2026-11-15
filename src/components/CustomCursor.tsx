import React, { useEffect, useRef, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (prefersReduced || !finePointer) return;

    setEnabled(true);

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let hoveringInteractive = false;
    let visible = false;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) visible = true;

      const target = e.target as HTMLElement | null;
      hoveringInteractive = Boolean(
        target?.closest('a, button, input, textarea, select, [data-cursor="expand"]'),
      );
    };

    const onLeave = () => {
      visible = false;
    };

    const render = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;

      if (dotRef.current) {
        dotRef.current.style.opacity = visible ? '1' : '0';
        dotRef.current.style.transform = `translate3d(${mouseX - 2.5}px, ${mouseY - 2.5}px, 0)`;
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = visible ? (hoveringInteractive ? '0.9' : '0.45') : '0';
        const scale = hoveringInteractive ? 1.55 : 1;
        ringRef.current.style.transform = `translate3d(${ringX - 15}px, ${ringY - 15}px, 0) scale(${scale})`;
      }

      rafId = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 hidden md:block" aria-hidden="true">
      <div
        ref={ringRef}
        className="fixed top-0 left-0 h-[30px] w-[30px] rounded-full border border-cyan-600 transition-[opacity] duration-200 will-change-transform dark:border-cyan-400"
        style={{ opacity: 0 }}
      />
      <div
        ref={dotRef}
        className="fixed top-0 left-0 h-[5px] w-[5px] rounded-full bg-cyan-600 transition-[opacity] duration-150 will-change-transform dark:bg-cyan-400"
        style={{ opacity: 0 }}
      />
    </div>
  );
};

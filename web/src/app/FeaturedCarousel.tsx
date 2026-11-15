    'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export default function FeaturedCarousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  function scrollByPage(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  }

  const arrow =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#D6B56D] bg-white text-xl text-[#9A681D] shadow-md transition hover:bg-[#FFF5E4]';

  return (
    <div className="relative">
      {canLeft && (
        <button type="button" aria-label="Previous crafts" onClick={() => scrollByPage(-1)} className={`${arrow} -left-3 sm:-left-5`}>
          ←
        </button>
      )}

      <div
        ref={trackRef}
        onScroll={update}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {canRight && (
        <button type="button" aria-label="Next crafts" onClick={() => scrollByPage(1)} className={`${arrow} -right-3 sm:-right-5`}>
          →
        </button>
      )}
    </div>
  );
}   
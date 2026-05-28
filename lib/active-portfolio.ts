'use client';

import { useEffect, useState } from 'react';

const KEY = 'anu.activePortfolio';

export type Portfolio = 'NB' | 'Anu' | 'all';

/**
 * Persist & retrieve the active SKU portfolio across the app.
 *
 * Default 'NB' — reps are NB-focused for now. Flip to 'Anu' to view
 * the Anu Imports book (Goenchi, Fratelli, Rock Paper Rum). 'all' shows
 * the combined operator view.
 *
 * Server-side returns the default; client-side reads localStorage.
 */
export function useActivePortfolio(): [Portfolio, (p: Portfolio) => void] {
  const [pf, setPfState] = useState<Portfolio>('NB');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = window.localStorage.getItem(KEY);
    if (v === 'NB' || v === 'Anu' || v === 'all') setPfState(v);
  }, []);

  const setPf = (next: Portfolio) => {
    setPfState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY, next);
    }
  };

  return [pf, setPf];
}

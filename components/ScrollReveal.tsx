'use client';

import { useEffect } from 'react';

const CARD = '.mg-block';
// A card waits BASE_DELAY after coming into view, so the motion is seen rather than over before the eye lands on it
// (on a phone, cards come one at a time and fast). Cards that come in together then follow STAGGER apart.
const BASE_DELAY = 250;
const STAGGER = 120;
const MAX_STAGGER = 600;

// Cards rise into place, and their charts draw in, as they scroll into view. Only runs when the browser can watch
// for that and the visitor hasn't asked for less motion; otherwise nothing is hidden and cards simply show.
export function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    // Cards already on screen keep showing (they had the board's own entrance); only the ones further down wait.
    for (const el of document.querySelectorAll<HTMLElement>(CARD)) if (el.getBoundingClientRect().top < innerHeight) el.dataset.revealed = 'now';
    root.dataset.reveal = '';

    const show = (el: HTMLElement, delay: number) => {
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      el.dataset.revealed = 'in';
    };
    const io = new IntersectionObserver(
      (entries) => {
        const coming = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        // Top to bottom, then left to right, so a row of cards ripples across.
        coming.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        coming.forEach((el, i) => {
          show(el, BASE_DELAY + Math.min(i * STAGGER, MAX_STAGGER));
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    );

    const watch = (node: ParentNode) => {
      const found = node instanceof HTMLElement && node.matches(CARD) ? [node] : [];
      for (const el of [...found, ...node.querySelectorAll<HTMLElement>(CARD)]) if (!('revealed' in el.dataset)) io.observe(el);
    };
    watch(document);
    // Cards added later (a profile loading, a card added to the board) are picked up too.
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof HTMLElement && watch(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      delete root.dataset.reveal;
    };
  }, []);
  return null;
}

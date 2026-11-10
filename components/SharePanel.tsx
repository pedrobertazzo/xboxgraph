'use client';

import { useEffect, useState } from 'react';
import { clockQuery, type Clock } from '@/lib/layout';
import type { Stat } from '@/lib/types';

export function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="share-field">
      <label>{label}</label>
      <div className="share-row">
        {multiline ? (
          <textarea readOnly value={value} rows={3} onFocus={(e) => e.currentTarget.select()} aria-label={label} />
        ) : (
          <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label={label} />
        )}
        <button
          type="button"
          className="btn ghost small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function summary(name: string, stats: Stat[], link: string) {
  const by = Object.fromEntries(stats.map((s) => [s.key, s]));
  const bits = [
    by.gamerscore && `${by.gamerscore.display} gamerscore`,
    by.achievements && `${by.achievements.display} achievements`,
    by.completed && `${by.completed.display} games at 100%`,
    by.playtime && `${by.playtime.display} hours`,
    by.top?.cover && `most played: ${by.top.cover.label}`,
    by.rarest && `rarest: ${by.rarest.display}`,
  ].filter(Boolean);
  return `${name} on Xbox: ${bits.join(' · ')}\n${link}`;
}

type Props = {
  pageUrl: string;
  cardUrl: string;
  name: string;
  query: string;
  clock: Clock;
  stats: Stat[];
};

export function SharePanel({ pageUrl, cardUrl, name, query, clock, stats }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState('');
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [open]);

  // Both carry the sharer's clock, so the card and the link preview show their busiest hour, not UTC's.
  const c = clockQuery(clock).toString();
  const link = pageUrl + '?' + [query, c].filter(Boolean).join('&');
  const image = cardUrl + (c ? `?${c}` : '');
  const alt = `Xbox gamerscore, achievements and stats for ${name}`;
  const file = `${name.replace(/[^\w-]+/g, '_')}-xbox-stats.png`;

  return (
    <>
      <button type="button" className="btn primary small" onClick={() => setOpen(true)}>Share</button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Share these stats" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box share">
            <header>
              <h2>Share these stats</h2>
              <button type="button" className="modal-close" aria-label="Close" autoFocus onClick={() => setOpen(false)}>✕</button>
            </header>

            <div className="share-preview card" data-loading={loaded !== image || undefined}>
              <img key={image} src={image} alt={alt} onLoad={() => setLoaded(image)} />
              {loaded !== image && <span>Drawing your image…</span>}
            </div>
            <p className="share-note">
              Your summary card, also used as the preview when the link is posted on Discord, X or Slack. The link
              opens your dashboard as arranged right now. Images redraw about every half hour.
            </p>

            <Field label="Link to this layout" value={link} />
            <Field label="Text summary" value={summary(name, stats, link)} multiline />
            <Field label="Image URL" value={image} />
            <Field label="Markdown (GitHub README)" value={`[![${alt}](${image})](${link})`} />
            <Field label="BBCode (forums)" value={`[url=${link}][img]${image}[/img][/url]`} />
            <Field label="HTML" value={`<a href="${link}"><img src="${image}" alt="${alt}" width="600"></a>`} />

            <div className="share-steam">
              <h3>On your Xbox profile</h3>
              <p>Xbox profiles show only plain text, so add the link to your bio, or download the image and post it anywhere.</p>
              <a className="btn primary" href={image} download={file}>Download image</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

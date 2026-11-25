import { useEffect, useMemo, useState } from 'react';
import { resolveMadrasahLogoCandidates } from '../lib/validation';

export function MadrasahEmblem({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="9" fill="#047857" />
      {/* Interlocking Rub el Hizb 8-point Islamic geometric star */}
      <rect
        x="10.5"
        y="10.5"
        width="15"
        height="15"
        rx="1.5"
        stroke="#FDE68A"
        strokeWidth="1.5"
      />
      <rect
        x="10.5"
        y="10.5"
        width="15"
        height="15"
        rx="1.5"
        transform="rotate(45 18 18)"
        stroke="#FDE68A"
        strokeWidth="1.5"
      />
      <circle cx="18" cy="18" r="2.75" fill="#FDE68A" />
    </svg>
  );
}

export function MadrasahLogo({
  logoUrl,
  alt = 'Logo Madrasah',
  className = 'w-10 h-10',
  onStatusChange,
}: {
  logoUrl?: string;
  alt?: string;
  className?: string;
  onStatusChange?: (status: 'empty' | 'loaded' | 'error') => void;
}) {
  const candidates = useMemo(() => resolveMadrasahLogoCandidates(logoUrl), [logoUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
    if (candidates.length === 0) {
      onStatusChange?.('empty');
    }
  }, [logoUrl, candidates.length]);

  const activeSrc = candidates[candidateIndex];

  if (!activeSrc) {
    return <MadrasahEmblem className={className} />;
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => onStatusChange?.('loaded')}
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((prev) => prev + 1);
        } else {
          setCandidateIndex(candidates.length);
          onStatusChange?.('error');
        }
      }}
      className={`${className} rounded-lg object-contain bg-white border border-emerald-900/10`}
    />
  );
}

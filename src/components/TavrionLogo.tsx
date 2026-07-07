import type { CSSProperties } from 'react';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<LogoSize, { mark: number; word: number; gap: number }> = {
  xs: { mark: 24, word: 14, gap: 6 },
  sm: { mark: 28, word: 16, gap: 7 },
  md: { mark: 32, word: 18, gap: 8 },
  lg: { mark: 36, word: 20, gap: 10 },
  xl: { mark: 44, word: 24, gap: 12 },
};

export const BRAND = {
  ink: '#171717',
  white: '#ffffff',
  muted: '#666666',
  faint: '#a3a3a3',
  surface: '#f5f5f5',
};

interface TavrionLogoProps {
  size?: LogoSize;
  showWordmark?: boolean;
  wordmark?: 'dark' | 'light';
  style?: CSSProperties;
}

export function TavrionMark({ size = 32 }: { size?: number }) {
  const r = Math.round(size * 0.25);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx={r} fill={BRAND.ink} />
      <path d="M9 10.5h14v3.2H18.2V22h-4.4v-8.3H9v-3.2z" fill="white" />
      <path
        d="M21.5 11.2a8.5 8.5 0 0 1 2.8 6.3"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <circle cx="23.8" cy="19.2" r="1.4" fill="white" opacity="0.95" />
    </svg>
  );
}

export function TavrionWordmark({
  size = 'md',
  tone = 'dark',
}: {
  size?: LogoSize;
  tone?: 'dark' | 'light';
}) {
  const { word } = SIZES[size];
  const color = tone === 'light' ? BRAND.white : BRAND.ink;
  return (
    <span
      style={{
        fontSize: word,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        color,
        lineHeight: 1,
      }}
    >
      Tavrion
    </span>
  );
}

export function TavrionLogo({
  size = 'md',
  showWordmark = true,
  wordmark = 'dark',
  style,
}: TavrionLogoProps) {
  const dims = SIZES[size];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dims.gap,
        ...style,
      }}
    >
      <TavrionMark size={dims.mark} />
      {showWordmark && <TavrionWordmark size={size} tone={wordmark} />}
    </span>
  );
}

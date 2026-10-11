// A small illustrated portrait for each cat, drawn in SVG so it needs no image files.
type Look = { coat: string; coat2: string; eye: string; bg: string; pattern: 'points' | 'stripes' | 'bib' | 'patches' | 'plain' };

const LOOKS: Record<string, Look> = {
  miso: { coat: '#E9D8BF', coat2: '#5B4636', eye: '#4CA9E6', bg: '#2A3B48', pattern: 'points' },
  biscuit: { coat: '#F0A04B', coat2: '#C9722A', eye: '#7BC96B', bg: '#3C2F27', pattern: 'stripes' },
  pickles: { coat: '#23272B', coat2: '#F4F4F2', eye: '#E8D04A', bg: '#27352F', pattern: 'bib' },
  sable: { coat: '#2B2A33', coat2: '#4A4858', eye: '#E8B74A', bg: '#3A2F45', pattern: 'plain' },
  waffles: { coat: '#9AA3AB', coat2: '#5E666E', eye: '#D9B04B', bg: '#2E3A3E', pattern: 'stripes' },
  noodle: { coat: '#F3EFE8', coat2: '#E08A3C', eye: '#4EB38A', bg: '#3B3140', pattern: 'patches' },
  pixel: { coat: '#8EA2B8', coat2: '#6A7F96', eye: '#6CCB8A', bg: '#25343F', pattern: 'plain' },
  mochi: { coat: '#EFE9E2', coat2: '#B7A593', eye: '#5AA7E0', bg: '#33403A', pattern: 'points' },
};

export default function CatAvatar({ id, name, size = 40 }: { id: string; name?: string; size?: number }) {
  const c = LOOKS[id] ?? LOOKS.miso;
  const ear = c.pattern === 'points' ? c.coat2 : c.coat;
  return (
    <svg
      className="catavatar"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={name ? `${name} the cat` : 'A cat'}
      style={{ borderRadius: '50%', flex: 'none' }}
    >
      <rect width="100" height="100" fill={c.bg} />
      <polygon points="20,50 25,12 49,33" fill={ear} />
      <polygon points="80,50 75,12 51,33" fill={ear} />
      <polygon points="26,42 28,21 42,33" fill="#E58F9A" opacity="0.7" />
      <polygon points="74,42 72,21 58,33" fill="#E58F9A" opacity="0.7" />
      <ellipse cx="50" cy="60" rx="33" ry="29" fill={c.coat} />
      {c.pattern === 'points' && <ellipse cx="50" cy="64" rx="17" ry="15" fill={c.coat2} opacity="0.55" />}
      {c.pattern === 'bib' && <path d="M50 40c5 8 3 14 14 20-4 12-10 18-14 18s-10-6-14-18c11-6 9-12 14-20z" fill={c.coat2} />}
      {c.pattern === 'patches' && (
        <>
          <ellipse cx="33" cy="47" rx="14" ry="12" fill={c.coat2} />
          <ellipse cx="71" cy="41" rx="9" ry="8" fill="#2B2A33" />
        </>
      )}
      {c.pattern === 'stripes' && (
        <path d="M50 31v11M41 33l2.5 9M59 33l-2.5 9M29 52l7 2M71 52l-7 2" stroke={c.coat2} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      <ellipse cx="50" cy="71" rx="11" ry="7" fill="#fff" opacity="0.13" />
      <ellipse cx="36" cy="56" rx="6.5" ry="7.2" fill={c.eye} />
      <ellipse cx="64" cy="56" rx="6.5" ry="7.2" fill={c.eye} />
      <ellipse cx="36" cy="56" rx="1.8" ry="5.8" fill="#0b0f10" />
      <ellipse cx="64" cy="56" rx="1.8" ry="5.8" fill="#0b0f10" />
      <circle cx="38.2" cy="53" r="1.5" fill="#fff" />
      <circle cx="66.2" cy="53" r="1.5" fill="#fff" />
      <path d="M46.5 66h7l-3.5 4.2z" fill="#E58F9A" />
      <path d="M50 70.2v3M50 73.2c-2.6 3-6 2.6-7.6.6M50 73.2c2.6 3 6 2.6 7.6.6" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M21 66l-15-3M21 71l-15 3M79 66l15-3M79 71l15 3" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

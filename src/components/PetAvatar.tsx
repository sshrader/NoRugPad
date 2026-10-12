// A small illustrated portrait for each pet, drawn in SVG so it needs no image files.
import { PET_ROSTER } from '../lib/pets';
import type { PetLook } from '../lib/petWorld';

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

function CatAvatar({ id, name, size = 40 }: { id: string; name?: string; size?: number }) {
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

/* ------------------------------ dogs ------------------------------ */

type DogLook = {
  coat: string; // head
  coat2: string; // muzzle, cheeks or mask
  ear: string;
  eye: string;
  bg: string;
  earStyle: 'point' | 'floppy' | 'fold' | 'tall';
  mark: 'cheeks' | 'mask' | 'blaze' | 'muzzle' | 'plain';
  tongue?: boolean;
};

const DOGS: Record<string, DogLook> = {
  kuri: { coat: '#E39A52', coat2: '#F7EBD8', ear: '#D2823C', eye: '#2A1B12', bg: '#3C2F27', earStyle: 'point', mark: 'cheeks', tongue: true },
  maple: { coat: '#B9702F', coat2: '#F4EFE8', ear: '#A35F25', eye: '#2A1B12', bg: '#33403A', earStyle: 'point', mark: 'mask' },
  pretzel: { coat: '#E0A15E', coat2: '#FBF3E6', ear: '#C98440', eye: '#2A1B12', bg: '#3A2F45', earStyle: 'tall', mark: 'blaze' },
  juno: { coat: '#8B97A3', coat2: '#F3F5F7', ear: '#6D7986', eye: '#59B6E8', bg: '#25343F', earStyle: 'point', mark: 'mask' },
  scout: { coat: '#25282C', coat2: '#F3F3F1', ear: '#25282C', eye: '#6B3F1E', bg: '#2E3A3E', earStyle: 'fold', mark: 'blaze' },
  clover: { coat: '#E2B15C', coat2: '#EBC47A', ear: '#C79443', eye: '#2A1B12', bg: '#27352F', earStyle: 'floppy', mark: 'plain', tongue: true },
  bruno: { coat: '#DDBE94', coat2: '#2E2A2A', ear: '#2E2A2A', eye: '#2A1B12', bg: '#3B3140', earStyle: 'fold', mark: 'muzzle' },
  olive: { coat: '#8A4B2A', coat2: '#A25F38', ear: '#6E3A20', eye: '#2A1B12', bg: '#2A3B48', earStyle: 'floppy', mark: 'plain' },
};

function DogAvatar({ id, name, size }: { id: string; name?: string; size: number }) {
  const d = DOGS[id] ?? DOGS.kuri;
  return (
    <svg
      className="catavatar"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={name ? `${name} the dog` : 'A dog'}
      style={{ borderRadius: '50%', flex: 'none' }}
    >
      <rect width="100" height="100" fill={d.bg} />
      {/* ears (behind the head) */}
      {d.earStyle === 'point' && (
        <>
          <polygon points="18,48 22,14 46,32" fill={d.ear} />
          <polygon points="82,48 78,14 54,32" fill={d.ear} />
          <polygon points="24,40 26,22 38,32" fill="#E9A3A0" opacity="0.55" />
          <polygon points="76,40 74,22 62,32" fill="#E9A3A0" opacity="0.55" />
        </>
      )}
      {d.earStyle === 'tall' && (
        <>
          <polygon points="16,50 16,6 46,32" fill={d.ear} />
          <polygon points="84,50 84,6 54,32" fill={d.ear} />
          <polygon points="22,40 22,17 38,32" fill="#E9A3A0" opacity="0.6" />
          <polygon points="78,40 78,17 62,32" fill="#E9A3A0" opacity="0.6" />
        </>
      )}
      {d.earStyle === 'floppy' && (
        <>
          <ellipse cx="18" cy="52" rx="12" ry="26" fill={d.ear} transform="rotate(8 18 52)" />
          <ellipse cx="82" cy="52" rx="12" ry="26" fill={d.ear} transform="rotate(-8 82 52)" />
        </>
      )}
      {d.earStyle === 'fold' && (
        <>
          <path d="M20 44C14 26 28 14 44 24 38 30 30 38 28 52z" fill={d.ear} />
          <path d="M80 44C86 26 72 14 56 24 62 30 70 38 72 52z" fill={d.ear} />
        </>
      )}
      {/* head */}
      <ellipse cx="50" cy="56" rx="33" ry="31" fill={d.coat} />
      {d.mark === 'cheeks' && (
        <>
          <ellipse cx="33" cy="68" rx="15" ry="12" fill={d.coat2} />
          <ellipse cx="67" cy="68" rx="15" ry="12" fill={d.coat2} />
          <ellipse cx="38" cy="43" rx="4" ry="2.6" fill={d.coat2} />
          <ellipse cx="62" cy="43" rx="4" ry="2.6" fill={d.coat2} />
        </>
      )}
      {d.mark === 'mask' && <path d="M50 30c8 6 20 8 27 22-6 18-16 30-27 30S29 70 23 52c7-14 19-16 27-22z" fill={d.coat2} />}
      {d.mark === 'blaze' && <path d="M44 26h12l5 40H39z" fill={d.coat2} />}
      {/* snout */}
      <ellipse cx="50" cy="71" rx="17" ry="13" fill={d.mark === 'muzzle' ? d.coat2 : d.mark === 'plain' ? d.coat2 : d.coat2} opacity={d.mark === 'plain' ? 0.65 : 1} />
      {/* eyes */}
      <circle cx="37" cy="54" r="5.2" fill={d.eye} />
      <circle cx="63" cy="54" r="5.2" fill={d.eye} />
      <circle cx="38.8" cy="52.2" r="1.6" fill="#fff" />
      <circle cx="64.8" cy="52.2" r="1.6" fill="#fff" />
      {/* nose and mouth */}
      <ellipse cx="50" cy="66" rx="6" ry="4.4" fill="#16181A" />
      <ellipse cx="48.4" cy="64.6" rx="1.8" ry="1" fill="#fff" opacity="0.5" />
      <path d="M50 70.4v4M50 74.4c-3 3.6-7.4 3.2-9-.6M50 74.4c3 3.6 7.4 3.2 9-.6" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {d.tongue && <path d="M46 77c0 7 8 7 8 0z" fill="#E86F7C" />}
    </svg>
  );
}

/** One portrait component for every pet. Unknown ids fall back to a cat. */
export default function PetAvatar({ id, name, size = 40 }: { id: string; name?: string; size?: number }) {
  const species = PET_ROSTER.find((p) => p.id === id)?.species ?? 'cat';
  return species === 'dog' ? <DogAvatar id={id} name={name} size={size} /> : <CatAvatar id={id} name={name} size={size} />;
}

/** Colors and markings for the animated scene. */
export function petLook(id: string): PetLook {
  const isDog = PET_ROSTER.find((p) => p.id === id)?.species === 'dog';
  if (isDog) {
    const d = DOGS[id] ?? DOGS.kuri;
    return { species: 'dog', coat: d.coat, coat2: d.coat2, ear: d.ear, eye: d.eye, kind: d.mark, earStyle: d.earStyle, tongue: d.tongue, short: id === 'pretzel' || id === 'olive' };
  }
  const c = LOOKS[id] ?? LOOKS.miso;
  return { species: 'cat', coat: c.coat, coat2: c.coat2, ear: c.pattern === 'points' ? c.coat2 : c.coat, eye: c.eye, kind: c.pattern };
}

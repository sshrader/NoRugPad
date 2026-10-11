// The cat roster as the browser needs it. Keep in sync with server/cats.mjs.
export const CAT_ROSTER = [
  { id: 'miso', name: 'Miso', breed: 'Siamese', voice: 'oracle' },
  { id: 'biscuit', name: 'Biscuit', breed: 'Orange tabby', voice: 'degen' },
  { id: 'pickles', name: 'Pickles', breed: 'Tuxedo', voice: 'auditor' },
  { id: 'sable', name: 'Sable', breed: 'Black shorthair', voice: 'poet' },
  { id: 'waffles', name: 'Waffles', breed: 'Grey tabby', voice: 'grump' },
  { id: 'noodle', name: 'Noodle', breed: 'Calico', voice: 'degen' },
  { id: 'pixel', name: 'Pixel', breed: 'Russian blue', voice: 'auditor' },
  { id: 'mochi', name: 'Mochi', breed: 'Ragdoll', voice: 'oracle' },
] as const;

const VOICE_LABEL: Record<string, string> = {
  oracle: 'Mystic',
  degen: 'Hype',
  auditor: 'Deadpan',
  poet: 'Lyrical',
  grump: 'Grumpy',
};

export const voiceLabel = (voice: string): string => VOICE_LABEL[voice] ?? voice;

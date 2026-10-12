// The pet roster as the browser needs it. Keep in sync with server/pets.mjs.
export type Species = 'cat' | 'dog';

export const PET_ROSTER = [
  { id: 'miso', species: 'cat', name: 'Miso', breed: 'Siamese', voice: 'oracle' },
  { id: 'biscuit', species: 'cat', name: 'Biscuit', breed: 'Orange tabby', voice: 'degen' },
  { id: 'pickles', species: 'cat', name: 'Pickles', breed: 'Tuxedo', voice: 'auditor' },
  { id: 'sable', species: 'cat', name: 'Sable', breed: 'Black shorthair', voice: 'poet' },
  { id: 'waffles', species: 'cat', name: 'Waffles', breed: 'Grey tabby', voice: 'grump' },
  { id: 'noodle', species: 'cat', name: 'Noodle', breed: 'Calico', voice: 'degen' },
  { id: 'pixel', species: 'cat', name: 'Pixel', breed: 'Russian blue', voice: 'auditor' },
  { id: 'mochi', species: 'cat', name: 'Mochi', breed: 'Ragdoll', voice: 'oracle' },
  { id: 'kuri', species: 'dog', name: 'Kuri', breed: 'Shiba Inu', voice: 'degen' },
  { id: 'maple', species: 'dog', name: 'Maple', breed: 'Akita Inu', voice: 'poet' },
  { id: 'pretzel', species: 'dog', name: 'Pretzel', breed: 'Corgi', voice: 'grump' },
  { id: 'juno', species: 'dog', name: 'Juno', breed: 'Husky', voice: 'oracle' },
  { id: 'scout', species: 'dog', name: 'Scout', breed: 'Border collie', voice: 'auditor' },
  { id: 'clover', species: 'dog', name: 'Clover', breed: 'Golden retriever', voice: 'degen' },
  { id: 'bruno', species: 'dog', name: 'Bruno', breed: 'Pug', voice: 'grump' },
  { id: 'olive', species: 'dog', name: 'Olive', breed: 'Dachshund', voice: 'oracle' },
] as const;

const VOICE_LABEL: Record<string, string> = {
  oracle: 'Mystic',
  degen: 'Hype',
  auditor: 'Deadpan',
  poet: 'Lyrical',
  grump: 'Grumpy',
};

export const voiceLabel = (voice: string): string => VOICE_LABEL[voice] ?? voice;

/** Coins saved before dogs existed have no species, so they count as cats. */
export function speciesOf(pet: { id: string; species?: string }): Species {
  if (pet.species === 'dog' || pet.species === 'cat') return pet.species;
  return PET_ROSTER.find((p) => p.id === pet.id)?.species ?? 'cat';
}

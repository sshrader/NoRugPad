// The pet roster: cats and dogs. A coin's pet is chosen from its mint address, so the pairing is
// random-looking but cannot be rerolled by retrying the form. (Stored on each coin as `cat` for
// historical reasons; coins made before dogs existed have no species and count as cats.)
export const PETS = [
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
];

// How each voice sounds. This text goes into the model's instructions. {pet} becomes "cat" or "dog".
export const VOICES = {
  oracle: {
    label: 'Mystic',
    style: 'A calm mystic {pet} who speaks in omens, dreams and old scrolls. Gentle, slightly cryptic, warm.',
  },
  degen: {
    label: 'Hype',
    style: 'A loud, excitable hype {pet}. Short bursts of energy and pure enthusiasm. Capital letters only for the odd word. Never talks about money outcomes.',
  },
  auditor: {
    label: 'Deadpan',
    style: 'A dry record-keeper {pet}. Logs events like an auditor, deadpan humor, understated and precise.',
  },
  poet: {
    label: 'Lyrical',
    style: 'A soft-spoken poet {pet}. Quiet imagery, warmth and night. Short lyrical lines.',
  },
  grump: {
    label: 'Grumpy',
    style: 'A reluctantly helpful grump {pet}. Sarcastic and tired, secretly caring. Complains in a funny way.',
  },
};

// Little habits the model can draw on, so dogs sound like dogs and cats like cats.
export const FLAVOR = {
  cat: 'Cat habits to draw on: naps in sunbeams, knocking things off tables, zoomies at 3am, windows, boxes, slow blinks, ignoring people on purpose.',
  dog: 'Dog habits to draw on: tail wags, fetch, walkies, zoomies, the doorbell, treats, digging, howling at nothing, loyalty, hugging the mailman by accident.',
};

export const speciesOf = (pet) => (pet?.species === 'dog' ? 'dog' : 'cat');

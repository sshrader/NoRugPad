// Charities a creator can pick at launch. Trading fees on those coins go to the charity's own wallet.
//
// How it works: Meteora fixes the fee-claiming wallet inside a curve config. So each charity gets its OWN config
// (made with `npm run dbc-config -- --claimer <charity wallet>`), and the launch form uses that config when the
// charity is picked. The server only accepts configs listed here, never an address sent by the browser.
//
// A charity shows as selectable only once its config is set in .env. Wallet addresses must come from the charity
// itself (a donation address it publishes, or one from a processor like The Giving Block / Endaoment). Never guess.
export const CHARITIES = [
  { id: 'animal-humane-society', name: 'Animal Humane Society', env: 'DBC_CONFIG_ANIMAL_HUMANE_SOCIETY' },
  { id: 'dogs-and-cats-forever', name: 'Dogs and Cats Forever', env: 'DBC_CONFIG_DOGS_AND_CATS_FOREVER' },
];

/** Public list for the launch form: id, name, and the config to launch with (empty if not set up yet). */
export const listCharities = () =>
  CHARITIES.map((c) => ({ id: c.id, name: c.name, config: (process.env[c.env] || '').trim() }));

export const charityById = (id) => listCharities().find((c) => c.id === id && c.config) || null;
export const charityByConfig = (config) => listCharities().find((c) => c.config && c.config === config) || null;

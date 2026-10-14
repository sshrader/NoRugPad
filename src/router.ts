import { useEffect, useState } from 'react';

// A tiny hash router: #/ (Explore), #/launch, #/wire, #/coin/<mint>. Plain <a href="#/..."> links
// work everywhere, including the dev server, with no extra setup.
export type Route =
  | { name: 'explore' }
  | { name: 'launch' }
  | { name: 'wire' }
  | { name: 'admin' }
  | { name: 'coin'; mint: string };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'launch') return { name: 'launch' };
  if (parts[0] === 'wire') return { name: 'wire' };
  if (parts[0] === 'admin') return { name: 'admin' };
  if (parts[0] === 'coin' && parts[1]) return { name: 'coin', mint: decodeURIComponent(parts[1]) };
  return { name: 'explore' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const href = {
  explore: '#/',
  launch: '#/launch',
  wire: '#/wire',
  coin: (mint: string) => `#/coin/${encodeURIComponent(mint)}`,
};

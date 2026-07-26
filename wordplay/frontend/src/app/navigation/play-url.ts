import { type Location } from '@angular/common';
import { type Router, type UrlTree } from '@angular/router';

import { type GameLanguage, type WordLength } from '../game/game.types';

/** Build an absolute URL that respects the app base href (e.g. GitHub Pages). */
export function absoluteFromTree(router: Router, location: Location, tree: UrlTree): string {
  const serialized = router.serializeUrl(tree);
  const prepared = location.prepareExternalUrl(serialized);
  if (/^https?:\/\//i.test(prepared)) {
    return prepared;
  }
  const origin = window.location.origin;
  return prepared.startsWith('/') ? `${origin}${prepared}` : `${origin}/${prepared}`;
}

export function classicPlayUrl(router: Router, location: Location, seed: string): string {
  return absoluteFromTree(router, location, router.createUrlTree(['/classic', seed]));
}

export function dailyPlayUrl(
  router: Router,
  location: Location,
  dateKey: string,
  language: GameLanguage,
  length: WordLength,
): string {
  return absoluteFromTree(
    router,
    location,
    router.createUrlTree(['/daily', dateKey], {
      queryParams: { lang: language, len: String(length) },
    }),
  );
}

/**
 * Colour generation system.
 *
 * Everything colourful in Unimate is generated from these curated rules —
 * never hand-picked hues in components (docs/DESIGN.md). Every generated
 * colour stays inside the brand family or a small curated partner set, so
 * the product reads cohesive instead of rainbow-random.
 */

export const BRAND_HUE = 292;

/** Violet → indigo family. Store banners, listing placeholders' primary tone. */
export const BRAND_HUE_RANGE = [252, 319] as const;

/** Curated partners of the brand hue — cyan, blue, rose, green, amber… */
export const PARTNER_HUES = [262, 240, 210, 330, 165, 45] as const;

export function hashKey(key: string): number {
  let hash = 7;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  return hash;
}

export function hueFromKey(key: string, range: readonly [number, number]): number {
  const [lo, hi] = range;
  return lo + (hashKey(key) % (hi - lo + 1));
}

/** Deterministic banner hue for a store slug (always violet→indigo). */
export function hueForStore(slug: string): number {
  return hueFromKey(slug, BRAND_HUE_RANGE);
}

/** Duotone pair for a listing card placeholder (brand tone + curated partner). */
export function listingHues(id: string): { a: number; b: number } {
  const hash = hashKey(id);
  return {
    a: hueFromKey(id, BRAND_HUE_RANGE),
    b: PARTNER_HUES[hash % PARTNER_HUES.length],
  };
}

/** Category tile colours (stable per slug). */
export function categoryHues(slug: string): { a: number; b: number } {
  const hash = hashKey(slug);
  return {
    a: PARTNER_HUES[hash % PARTNER_HUES.length],
    b: PARTNER_HUES[(hash + 3) % PARTNER_HUES.length],
  };
}

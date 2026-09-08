const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Convertit une durée courte ("15m", "30d") en millisecondes. */
export function durationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}" (expected e.g. "15m", "30d")`);
  }
  const [, value, unit] = match;
  return Number(value) * UNIT_TO_MS[unit!]!;
}

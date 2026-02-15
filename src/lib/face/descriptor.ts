export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }

  return Math.max(0, Math.min(1, dot));
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidDescriptor(descriptor: unknown): descriptor is number[] {
  return (
    Array.isArray(descriptor) &&
    descriptor.length > 0 &&
    descriptor.length <= 4096 &&
    descriptor.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

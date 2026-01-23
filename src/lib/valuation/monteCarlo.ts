export const mulberry32 = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export const runMonteCarlo = ({
  seed,
  iterations,
  mean,
  volatility,
}: {
  seed: number;
  iterations: number;
  mean: number;
  volatility: number;
}) => {
  const rand = mulberry32(seed);
  const results: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const u = rand();
    const v = rand();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    results.push(mean + volatility * z);
  }
  return results;
};

const target = process.env.COURTVISION_BENCHMARK_URL
  ?? "https://courtvision-live-data.perkyaisle4.chatgpt.site/api/games";
const requestCountArgument = process.argv.slice(2).find((argument) => argument !== "--");
const requestCount = Number.parseInt(requestCountArgument ?? "50", 10);
const p95TargetMs = Number.parseFloat(process.env.COURTVISION_BENCHMARK_P95_MS ?? "200");

if (!Number.isInteger(requestCount) || requestCount < 1 || requestCount > 500) {
  throw new Error("Request count must be an integer between 1 and 500");
}

await fetch(target);

const timings = [];
for (let index = 0; index < requestCount; index += 1) {
  const started = performance.now();
  const response = await fetch(target);
  if (!response.ok) {
    throw new Error(`Benchmark request failed with HTTP ${response.status}`);
  }
  await response.arrayBuffer();
  timings.push(performance.now() - started);
}

timings.sort((left, right) => left - right);
const percentile = (fraction) => timings[Math.ceil(timings.length * fraction) - 1];
const result = {
  target,
  mode: "sequential-warm-cache",
  requests: requestCount,
  p50_ms: Number(percentile(0.5).toFixed(1)),
  p95_ms: Number(percentile(0.95).toFixed(1)),
  max_ms: Number(timings.at(-1).toFixed(1)),
  target_p95_ms: p95TargetMs,
};

console.log(JSON.stringify(result, null, 2));
if (result.p95_ms > p95TargetMs) {
  console.error(`Cached API p95 missed the ${p95TargetMs} ms release target.`);
  process.exitCode = 1;
}

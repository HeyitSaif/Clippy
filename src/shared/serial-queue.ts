/**
 * Promise-chain mutex: each enqueued async fn waits for the previous to settle.
 * Failures in one job do not break the chain for subsequent jobs.
 */
export function createSerialQueue(): <T>(fn: () => Promise<T>) => Promise<T> {
  let chain: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(() => fn());
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

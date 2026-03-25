/**
 * Shared Circuit Breaker Module
 *
 * Wraps inter-service HTTP calls with the opossum circuit breaker pattern.
 * When a downstream service fails repeatedly, the circuit "opens" and
 * returns failures immediately without making the HTTP call — preventing
 * cascade failures across the microservice chain.
 *
 * States:
 *   CLOSED  → Normal operation. Requests flow through.
 *   OPEN    → Too many recent failures. Requests fail immediately (fast-fail).
 *   HALF-OPEN → After resetTimeout, allows one test request through.
 *               If it succeeds → CLOSED. If it fails → OPEN again.
 *
 * Usage:
 *   const { createCircuitBreaker } = require('@shared/resilience/circuitBreaker');
 *   const cb = createCircuitBreaker('payment-service');
 *   const result = await cb.fire(() => axios.post(url, data));
 */

const CircuitBreaker = require('opossum');
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('circuit-breaker');
const cbStateCounter = meter.createCounter('circuit_breaker_state_changes', {
  description: 'Circuit breaker state transitions (open, close, half-open).'
});
const cbRequestCounter = meter.createCounter('circuit_breaker_requests', {
  description: 'Requests through circuit breakers by outcome.'
});

/**
 * Default circuit breaker options.
 * These can be overridden per-breaker when calling createCircuitBreaker.
 */
const DEFAULT_OPTIONS = {
  timeout: 5000,           // 5s — if the call takes longer, consider it a failure
  errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
  resetTimeout: 30000,     // 30s — time before trying a request again after opening
  rollingCountTimeout: 10000,   // 10s rolling window for failure count
  rollingCountBuckets: 10, // Number of buckets in the rolling window
  volumeThreshold: 5       // Minimum requests in window before circuit can open
};

/**
 * Create a named circuit breaker for a downstream service.
 *
 * @param {string} serviceName - Name of the downstream service (for logging/metrics)
 * @param {object} [options] - Override default circuit breaker options
 * @returns {{ fire: Function, breaker: CircuitBreaker }}
 */
const createCircuitBreaker = (serviceName, options = {}) => {
  const cbOptions = { ...DEFAULT_OPTIONS, ...options, name: serviceName };

  // The breaker wraps a generic async function
  const breaker = new CircuitBreaker(async (asyncFn) => asyncFn(), cbOptions);

  // ── Metrics & Logging ──────────────────────────────────────
  breaker.on('open', () => {
    cbStateCounter.add(1, { service: serviceName, state: 'open' });
    console.warn(`[CIRCUIT BREAKER] ${serviceName} circuit OPENED — fast-failing requests`);
  });

  breaker.on('close', () => {
    cbStateCounter.add(1, { service: serviceName, state: 'closed' });
    console.info(`[CIRCUIT BREAKER] ${serviceName} circuit CLOSED — requests flowing normally`);
  });

  breaker.on('halfOpen', () => {
    cbStateCounter.add(1, { service: serviceName, state: 'half-open' });
    console.info(`[CIRCUIT BREAKER] ${serviceName} circuit HALF-OPEN — testing with one request`);
  });

  breaker.on('success', () => {
    cbRequestCounter.add(1, { service: serviceName, result: 'success' });
  });

  breaker.on('failure', () => {
    cbRequestCounter.add(1, { service: serviceName, result: 'failure' });
  });

  breaker.on('reject', () => {
    cbRequestCounter.add(1, { service: serviceName, result: 'rejected' });
  });

  breaker.on('timeout', () => {
    cbRequestCounter.add(1, { service: serviceName, result: 'timeout' });
  });

  breaker.on('fallback', () => {
    cbRequestCounter.add(1, { service: serviceName, result: 'fallback' });
  });

  return {
    /**
     * Execute an async function through the circuit breaker.
     *
     * @param {Function} asyncFn - Async function that makes the HTTP call
     * @returns {Promise<any>} The result of the async function
     * @throws {Error} If the circuit is open or the call fails
     *
     * @example
     *   const result = await paymentCB.fire(() => axios.post(url, data));
     */
    fire: (asyncFn) => breaker.fire(asyncFn),
    breaker
  };
};

module.exports = { createCircuitBreaker };

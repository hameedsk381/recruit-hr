/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides resilience for external API calls by failing fast when a service is unhealthy.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing recovery)
 */

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening circuit
  successThreshold: number;     // Number of successes needed to close circuit from half-open
  timeout: number;              // Time in ms before trying half-open state
  monitorWindow: number;        // Time window to track failures (ms)
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: CircuitState;
}

export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private state: CircuitState = 'CLOSED';
  private nextAttempt = 0;
  private failureTimestamps: number[] = [];

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
        console.log('[CircuitBreaker] State transition: OPEN -> HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.failureTimestamps = [];

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = 'CLOSED';
        console.log('[CircuitBreaker] State transition: HALF_OPEN -> CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.failureTimestamps.push(Date.now());
    
    // Clean old timestamps outside monitor window
    const cutoff = Date.now() - this.options.monitorWindow;
    this.failureTimestamps = this.failureTimestamps.filter(ts => ts > cutoff);

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.timeout;
      console.log('[CircuitBreaker] State transition: HALF_OPEN -> OPEN');
    } else if (this.failureTimestamps.length >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.timeout;
      console.log(`[CircuitBreaker] State transition: CLOSED -> OPEN (${this.failures} failures)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.nextAttempt = 0;
  }
}

// Default circuit breaker for LLM APIs
export const createLLMCircuitBreaker = () => new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,      // 30 seconds
  monitorWindow: 60000 // 1 minute
});

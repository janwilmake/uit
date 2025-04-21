/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from "cloudflare:workers";

export interface RateLimitOptions {
  requestLimit?: number;
  resetIntervalMs?: number;
}

export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
}

interface RateLimitState {
  requestLimit: number;
  resetIntervalMs: number;
  remainingRequests: number;
  resetTime: number;
}

export interface RateLimitResult {
  waitTime: number;
  ratelimitHeaders: RateLimitHeaders;
}

export class RatelimitDO extends DurableObject {
  static DEFAULT_REQUEST_LIMIT = 25;
  static HOURLY_RESET_MS = 3600000; // 1 hour in milliseconds

  async fetch(request: Request): Promise<Response> {
    // Parse options from request if available
    const options =
      request.method === "POST"
        ? ((await request.json()) as RateLimitOptions)
        : undefined;

    const storedState = await this.ctx.storage.get<RateLimitState>("state");

    // Get the current state or initialize with defaults
    let state = storedState || this.getDefaultState();

    const { result, state: newState } = this.processRateLimit(state, options);
    console.log({ storedState, newState });
    // Schedule async save and alarm setting without blocking response
    this.ctx.waitUntil(
      Promise.all([
        this.ctx.storage.put("state", newState),
        this.setAlarmIfNeeded(newState.resetTime),
      ]),
    );

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        ...result.ratelimitHeaders,
      },
    });
  }

  private getDefaultState(): RateLimitState {
    return {
      requestLimit: RatelimitDO.DEFAULT_REQUEST_LIMIT,
      resetIntervalMs: RatelimitDO.HOURLY_RESET_MS,
      remainingRequests: RatelimitDO.DEFAULT_REQUEST_LIMIT,
      resetTime: Date.now() + RatelimitDO.HOURLY_RESET_MS,
    };
  }

  private processRateLimit(
    state: RateLimitState,
    options?: RateLimitOptions,
  ): { result: RateLimitResult; state: RateLimitState } {
    const now = Date.now();

    // Apply new options if provided
    if (options) {
      if (options.requestLimit) state.requestLimit = options.requestLimit;
      if (options.resetIntervalMs)
        state.resetIntervalMs = options.resetIntervalMs;

      // Reset counter when changing limits
      // state.remainingRequests = state.requestLimit;
      // state.resetTime = now + state.resetIntervalMs;
    }

    // Check if we need to reset based on current time
    if (now >= state.resetTime) {
      state.remainingRequests = state.requestLimit;
      state.resetTime = now + state.resetIntervalMs;
    }

    // Calculate wait time
    let waitTime = 0;
    if (state.remainingRequests <= 0) {
      waitTime = Math.max(0, state.resetTime - now);
    } else {
      state.remainingRequests -= 1;
    }

    // Create headers object
    const ratelimitHeaders: RateLimitHeaders = {
      "X-RateLimit-Limit": state.requestLimit.toString(),
      "X-RateLimit-Remaining": state.remainingRequests.toString(),
      "X-RateLimit-Reset": Math.ceil(state.resetTime / 1000).toString(),
    };

    return { result: { waitTime, ratelimitHeaders }, state };
  }

  private async setAlarmIfNeeded(resetTime: number): Promise<void> {
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm === null || currentAlarm !== resetTime) {
      await this.ctx.storage.setAlarm(resetTime);
    }
  }

  async alarm(): Promise<void> {
    const state = await this.ctx.storage.get<RateLimitState>("state");
    if (!state) return;

    // Reset the counter
    state.remainingRequests = state.requestLimit;
    state.resetTime = Date.now() + state.resetIntervalMs;

    // Save state and set next alarm
    await Promise.all([
      this.ctx.storage.put("state", state),
      this.setAlarmIfNeeded(state.resetTime),
    ]);
  }
}

/**
 * Helper function to rate limit requests based on client IP
 */
export async function ratelimit(
  request: Request,
  env: any,
  options?: RateLimitOptions,
): Promise<RateLimitResult | undefined> {
  // Get client IP from request headers
  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
    "127.0.0.1";

  // Get stub for the RateLimiter DO
  const ratelimiterStub = env.RATELIMIT_DO.get(
    env.RATELIMIT_DO.idFromName(clientIp),
  );

  // Create a new request to pass the options
  const doRequest = options
    ? new Request("https://ratelimit.internal/", {
        method: "POST",
        body: JSON.stringify(options),
      })
    : new Request("https://ratelimit.internal/");

  // Call the DO using fetch
  const response = await ratelimiterStub.fetch(doRequest);
  const result = (await response.json()) as RateLimitResult;

  // If waitTime = 0, request is not rate limited
  if (result.waitTime <= 0) {
    return undefined;
  }

  return result;
}

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
  requestsThisPeriod: number;
  resetTime: number;
}

export interface RateLimitResult {
  ratelimited: boolean;
  waitTime: number;
  headers: RateLimitHeaders;
  state: RateLimitState;
}

export class RatelimitDO extends DurableObject {
  static DEFAULT_REQUEST_LIMIT = 25;
  static HOURLY_RESET_MS = 3600000; // 1 hour in milliseconds

  private state: RateLimitState;

  constructor(controller: DurableObjectState, env: any) {
    super(controller, env);
    this.state = {
      requestLimit: RatelimitDO.DEFAULT_REQUEST_LIMIT,
      resetIntervalMs: RatelimitDO.HOURLY_RESET_MS,
      requestsThisPeriod: 0,
      resetTime: Date.now() + RatelimitDO.HOURLY_RESET_MS,
    };
  }

  async checkRateLimit(options?: RateLimitOptions): Promise<RateLimitResult> {
    // Load current state if not already loaded
    const storedState = await this.ctx.storage.get<RateLimitState>("state");
    if (storedState) {
      this.state = storedState;
    }

    const now = Date.now();

    // Apply new options if provided
    if (options) {
      if (options.requestLimit) this.state.requestLimit = options.requestLimit;
      if (options.resetIntervalMs)
        this.state.resetIntervalMs = options.resetIntervalMs;
    }

    // Check if we need to reset based on current time
    if (now >= this.state.resetTime) {
      this.state.requestsThisPeriod = 0;
      this.state.resetTime = now + this.state.resetIntervalMs;
    }

    // Calculate wait time
    let waitTime = 0;
    if (this.state.requestsThisPeriod >= this.state.requestLimit) {
      waitTime = Math.max(0, this.state.resetTime - now);
    } else {
      this.state.requestsThisPeriod += 1;
    }

    // Calculate remaining requests
    const remainingRequests = Math.max(
      0,
      this.state.requestLimit - this.state.requestsThisPeriod,
    );

    // Create headers object
    const headers: RateLimitHeaders = {
      "X-RateLimit-Limit": this.state.requestLimit.toString(),
      "X-RateLimit-Remaining": remainingRequests.toString(),
      "X-RateLimit-Reset": Math.ceil(this.state.resetTime / 1000).toString(),
    };

    // Schedule async save and alarm setting without blocking response
    this.ctx.waitUntil(
      Promise.all([
        this.ctx.storage.put("state", this.state),
        this.setAlarmIfNeeded(this.state.resetTime),
      ]),
    );

    return {
      ratelimited: waitTime > 0,
      state: this.state,
      waitTime,
      headers,
    };
  }

  private async setAlarmIfNeeded(resetTime: number): Promise<void> {
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm === null || currentAlarm !== resetTime) {
      await this.ctx.storage.setAlarm(resetTime);
    }
  }

  async alarm(): Promise<void> {
    // Load the state if needed
    if (!this.state) {
      const storedState = await this.ctx.storage.get<RateLimitState>("state");
      if (!storedState) return;
      this.state = storedState;
    }

    // Reset the counter
    this.state.requestsThisPeriod = 0;
    this.state.resetTime = Date.now() + this.state.resetIntervalMs;

    // Save state and set next alarm
    await this.ctx.storage.put("state", this.state);
  }
}

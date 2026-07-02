import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFailedLogins,
  lockoutLabel,
  LOGIN_LOCKOUT_MS,
  loginLockRemainingMs,
  MAX_FAILED_LOGINS,
  recordFailedLogin,
  resetLoginRateLimit,
} from "@/lib/login-rate-limit";

const EMAIL = "victim@test.com";
const T0 = 1_750_000_000_000; // arbitrary fixed epoch ms — the module takes `now` as input

/** Records `count` failures for the email, one second apart, starting at T0. */
function fail(count: number, email = EMAIL, start = T0): number {
  let now = start;
  for (let i = 0; i < count; i++) {
    recordFailedLogin(email, now);
    now += 1_000;
  }
  return now;
}

beforeEach(() => {
  resetLoginRateLimit();
});

describe("login rate limit — lockout after consecutive failures (audit S-2)", () => {
  it("is unlocked with no history", () => {
    expect(loginLockRemainingMs(EMAIL, T0)).toBe(0);
  });

  it("stays unlocked through the first MAX-1 failures", () => {
    const now = fail(MAX_FAILED_LOGINS - 1);
    expect(loginLockRemainingMs(EMAIL, now)).toBe(0);
  });

  it("locks on the MAX-th consecutive failure for the full lockout window", () => {
    const now = fail(MAX_FAILED_LOGINS);
    const remaining = loginLockRemainingMs(EMAIL, now);
    // The lock started at the last failure (now - 1s).
    expect(remaining).toBe(LOGIN_LOCKOUT_MS - 1_000);
  });

  it("unlocks once the lockout window has fully elapsed", () => {
    const lastFailureAt = fail(MAX_FAILED_LOGINS) - 1_000;
    expect(loginLockRemainingMs(EMAIL, lastFailureAt + LOGIN_LOCKOUT_MS - 1)).toBeGreaterThan(0);
    expect(loginLockRemainingMs(EMAIL, lastFailureAt + LOGIN_LOCKOUT_MS)).toBe(0);
  });

  it("a successful login clears the streak", () => {
    fail(MAX_FAILED_LOGINS - 1);
    clearFailedLogins(EMAIL);
    const now = fail(MAX_FAILED_LOGINS - 1, EMAIL, T0 + 60_000);
    expect(loginLockRemainingMs(EMAIL, now)).toBe(0);
  });

  it("a stale streak (older than the window) starts over instead of accumulating", () => {
    fail(MAX_FAILED_LOGINS - 1);
    // Next failure arrives well after the window: it must count as 1, not MAX.
    const later = T0 + LOGIN_LOCKOUT_MS * 2;
    recordFailedLogin(EMAIL, later);
    expect(loginLockRemainingMs(EMAIL, later)).toBe(0);
  });

  it("tracks emails independently", () => {
    const now = fail(MAX_FAILED_LOGINS);
    expect(loginLockRemainingMs(EMAIL, now)).toBeGreaterThan(0);
    expect(loginLockRemainingMs("other@test.com", now)).toBe(0);
  });

  it("locks unknown emails exactly like real ones (no account-existence signal)", () => {
    const ghost = "does-not-exist@nowhere.test";
    const now = fail(MAX_FAILED_LOGINS, ghost);
    expect(loginLockRemainingMs(ghost, now)).toBeGreaterThan(0);
  });

  it("lockoutLabel rounds up to whole minutes and pluralizes", () => {
    expect(lockoutLabel(1)).toBe("1 minute");
    expect(lockoutLabel(60_000)).toBe("1 minute");
    expect(lockoutLabel(60_001)).toBe("2 minutes");
    expect(lockoutLabel(15 * 60_000)).toBe("15 minutes");
  });
});

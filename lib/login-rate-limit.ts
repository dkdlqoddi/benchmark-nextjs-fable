/**
 * In-memory brute-force throttle for the credentials login (audit finding
 * S-2): 5 consecutive failed attempts lock an email for 15 minutes; any
 * successful login clears its history. Keys are the zod-normalized
 * (lowercased) emails, and unknown emails are tracked exactly like real ones
 * so the lockout reveals nothing about account existence.
 *
 * Deliberately per-process (a Map), matching this app's single-node SQLite
 * deployment profile: a restart clears the state, and a multi-instance
 * deployment would need a shared store instead. Callers pass `now`
 * (milliseconds since epoch) so the logic stays a pure function of its inputs.
 */

/** Consecutive failures that trigger a lockout. */
export const MAX_FAILED_LOGINS = 5;

/** How long a lockout lasts; also how long a stale failure streak is remembered. */
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

type FailureEntry = {
  /** Consecutive failures in the current streak. */
  failures: number;
  /** When the streak last grew — streaks older than LOGIN_LOCKOUT_MS reset. */
  lastFailureAt: number;
  /** Epoch ms until which login attempts are refused, once the cap is hit. */
  lockedUntil: number | null;
};

const failuresByEmail = new Map<string, FailureEntry>();

/** Upper bound on tracked emails; oldest entries are evicted beyond it. */
const MAX_TRACKED_EMAILS = 10_000;

/** Drops expired entries (and, under memory pressure, the oldest ones). */
function prune(now: number): void {
  for (const [email, entry] of failuresByEmail) {
    const lockExpired = entry.lockedUntil !== null && entry.lockedUntil <= now;
    const streakStale = entry.lockedUntil === null && now - entry.lastFailureAt > LOGIN_LOCKOUT_MS;
    if (lockExpired || streakStale) {
      failuresByEmail.delete(email);
    }
  }
  // Map iterates in insertion order, so the front is the oldest entry.
  while (failuresByEmail.size > MAX_TRACKED_EMAILS) {
    const oldest = failuresByEmail.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    failuresByEmail.delete(oldest);
  }
}

/**
 * Milliseconds the email must still wait before another login attempt is
 * allowed; 0 when it is not locked out.
 */
export function loginLockRemainingMs(email: string, now: number): number {
  const entry = failuresByEmail.get(email);
  if (!entry?.lockedUntil) {
    return 0;
  }
  return Math.max(0, entry.lockedUntil - now);
}

/**
 * Records one failed login attempt for the email; the MAX_FAILED_LOGINS-th
 * consecutive failure starts a LOGIN_LOCKOUT_MS lockout. Streaks whose last
 * failure is older than the lockout window start over from zero.
 */
export function recordFailedLogin(email: string, now: number): void {
  prune(now);
  const previous = failuresByEmail.get(email);
  const streakAlive = previous !== undefined && now - previous.lastFailureAt <= LOGIN_LOCKOUT_MS;
  const failures = (streakAlive ? previous.failures : 0) + 1;
  // Re-insert so recently-active entries move to the back of the eviction order.
  failuresByEmail.delete(email);
  failuresByEmail.set(email, {
    failures,
    lastFailureAt: now,
    lockedUntil: failures >= MAX_FAILED_LOGINS ? now + LOGIN_LOCKOUT_MS : null,
  });
}

/** Forgets the email's failure history (call after a successful login). */
export function clearFailedLogins(email: string): void {
  failuresByEmail.delete(email);
}

/** Human label for a remaining lockout, e.g. "15 minutes" or "1 minute". */
export function lockoutLabel(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** Empties the limiter — test hook so specs start from a clean slate. */
export function resetLoginRateLimit(): void {
  failuresByEmail.clear();
}

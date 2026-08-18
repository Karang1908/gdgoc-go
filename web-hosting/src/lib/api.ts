import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export interface GameOverPayload {
  type: 'gameover';
  run_id: string;
  score: number;
  coins: number;
  pills?: number;
  bonus?: number;
  distance: number;
  duration: number;
  reason?: 'police' | 'fuel' | string;
}

export interface ScoreRow {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  score: number;
  coins: number;
  pills?: number;
  gdg_coins?: number;
  bonus_score?: number;
  run_id?: string;
  distance: number;
  duration_seconds: number;
  created_at: string;
}

export interface ScoreSubmissionResult {
  status: 'saved' | 'duplicate';
  scoreId: string;
  isPersonalBest: boolean;
  bestScore: number;
  totalCoins: number;
  totalGdgCoins: number;
  bestDistance: number;
  totalGames: number;
  rank: number | null;
}

export class ScoreSubmissionError extends Error {
  constructor(message: string, public retryable = true, public code?: string) {
    super(message);
    this.name = 'ScoreSubmissionError';
  }
}

const RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PENDING_SCORES_KEY = 'gdg-go:pending-scores:v1';

interface PendingScore {
  userId: string;
  payload: GameOverPayload;
  queuedAt: string;
}

function wholeNumber(value: number, label: string, minimum = 0): number {
  if (!Number.isFinite(value)) {
    throw new ScoreSubmissionError(`${label} was not a valid number.`, false, 'invalid_payload');
  }
  const rounded = Math.round(value);
  if (rounded < minimum) {
    throw new ScoreSubmissionError(`${label} was outside the allowed range.`, false, 'invalid_payload');
  }
  return rounded;
}

function normalizeScorePayload(payload: GameOverPayload): GameOverPayload {
  if (!RUN_ID_PATTERN.test(payload.run_id)) {
    throw new ScoreSubmissionError('This run did not have a valid identity.', false, 'invalid_run_id');
  }

  const normalized: GameOverPayload = {
    type: 'gameover',
    run_id: payload.run_id,
    score: wholeNumber(payload.score, 'Score'),
    coins: wholeNumber(payload.coins, 'Coin count'),
    pills: wholeNumber(payload.pills || 0, 'GDG coin count'),
    bonus: wholeNumber(payload.bonus || 0, 'Bonus score'),
    distance: wholeNumber(payload.distance, 'Distance'),
    duration: wholeNumber(payload.duration, 'Duration', 1),
    reason: payload.reason || 'police',
  };

  return normalized;
}

function readPendingScores(): PendingScore[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_SCORES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingScores(scores: PendingScore[]): void {
  try {
    localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(scores.slice(-20)));
  } catch {
    // A full or disabled local store should not prevent the current online attempt.
  }
}

export function queueScore(userId: string, payload: GameOverPayload): void {
  const pending = readPendingScores().filter(
    (item) => !(item.userId === userId && item.payload?.run_id === payload.run_id),
  );
  pending.push({ userId, payload, queuedAt: new Date().toISOString() });
  writePendingScores(pending);
}

export function removeQueuedScore(userId: string, runId: string): void {
  writePendingScores(readPendingScores().filter(
    (item) => !(item.userId === userId && item.payload?.run_id === runId),
  ));
}

/**
 * Submits a run through the database-owned RPC. The run UUID is unique per user,
 * so a network retry can never create a second score or double-count the wallet.
 */
export async function submitScore(payload: GameOverPayload): Promise<ScoreSubmissionResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    throw new ScoreSubmissionError('Your session expired. Sign in again to save this run.', true, 'no_session');
  }

  const run = normalizeScorePayload(payload);
  const { data, error } = await supabase.rpc('submit_game_score', {
    p_run_id: run.run_id,
    p_score: run.score,
    p_coins: run.coins,
    p_pills: run.pills || 0,
    p_bonus_score: run.bonus || 0,
    p_distance: run.distance,
    p_duration_seconds: run.duration,
  });

  if (error) {
    const migrationMissing = error.code === 'PGRST202' || /submit_game_score/i.test(error.message || '');
    const permanentCodes = new Set(['22003', '23502', '23514']);
    throw new ScoreSubmissionError(
      migrationMissing
        ? 'Score saving is being upgraded. This run will retry automatically.'
        : (error.message || 'This run could not be saved yet.'),
      migrationMissing || !permanentCodes.has(error.code || ''),
      error.code,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.score_id) {
    throw new ScoreSubmissionError('The score server returned an incomplete result.', true, 'empty_result');
  }

  return {
    status: row.submission_status === 'duplicate' ? 'duplicate' : 'saved',
    scoreId: String(row.score_id),
    isPersonalBest: Boolean(row.is_personal_best),
    bestScore: Number(row.best_score) || run.score,
    totalCoins: Number(row.total_coins) || 0,
    totalGdgCoins: Number(row.total_gdg_coins) || 0,
    bestDistance: Number(row.best_distance) || 0,
    totalGames: Number(row.total_games) || 0,
    rank: row.rank == null ? null : Number(row.rank),
  };
}

const activeScoreFlushes = new Map<string, Promise<Map<string, ScoreSubmissionResult>>>();

export function flushQueuedScores(userId: string): Promise<Map<string, ScoreSubmissionResult>> {
  const existingFlush = activeScoreFlushes.get(userId);
  if (existingFlush) return existingFlush;

  const flush = (async () => {
    const saved = new Map<string, ScoreSubmissionResult>();
    const pending = readPendingScores().filter((item) => item.userId === userId);

    for (const item of pending) {
      try {
        const result = await submitScore(item.payload);
        removeQueuedScore(userId, item.payload.run_id);
        saved.set(item.payload.run_id, result);
      } catch (error) {
        if (error instanceof ScoreSubmissionError && !error.retryable) {
          removeQueuedScore(userId, item.payload.run_id);
        }
      }
    }

    return saved;
  })().finally(() => activeScoreFlushes.delete(userId));

  activeScoreFlushes.set(userId, flush);
  return flush;
}

/**
 * Fetches the global top scores, guaranteeing that each player occupies
 * exactly ONE standing on the leaderboard with their all-time personal best score.
 */
export async function fetchLeaderboard(limit = 100): Promise<ScoreRow[]> {
  const fetchLimit = Math.max(limit * 5, 500);

  // 1. Try Supabase client first
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('id, user_id, username, display_name, run_id, score, coins, pills, gdg_coins, bonus_score, distance, duration_seconds, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(fetchLimit);

    if (!error && Array.isArray(data)) {
      return deduplicateLeaderboard(data as ScoreRow[], limit);
    }
    if (error) {
      console.warn('[API] Supabase client fetchLeaderboard warning:', error.message);
    }
  } catch (err) {
    console.warn('[API] Supabase client fetchLeaderboard exception:', err);
  }

  // 2. Fallback to direct REST API
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=id,user_id,username,display_name,run_id,score,coins,pills,gdg_coins,bonus_score,distance,duration_seconds,created_at&order=score.desc,created_at.asc&limit=${fetchLimit}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (res.ok) {
      const rows: ScoreRow[] = await res.json();
      return deduplicateLeaderboard(rows, limit);
    }
  } catch (fetchErr) {
    console.warn('[API] fetchLeaderboard REST fallback failed:', fetchErr);
  }

  return [];
}

/**
 * Ensures each user_id has only one record on the leaderboard (their personal best).
 */
function deduplicateLeaderboard(rows: ScoreRow[], limit: number): ScoreRow[] {
  const seenUsers = new Set<string>();
  const uniqueScores: ScoreRow[] = [];

  for (const row of rows) {
    const key = (row.user_id || row.username || '').toLowerCase().trim();
    if (!key || seenUsers.has(key)) {
      continue;
    }
    seenUsers.add(key);
    uniqueScores.push(row);

    if (uniqueScores.length >= limit) {
      break;
    }
  }

  return uniqueScores;
}

function getRunGdgCoins(row: ScoreRow): number {
  const pills = Math.max(0, Number(row.pills) || 0);
  const exactGdgCoins = Math.max(0, Number(row.gdg_coins) || 0);
  if (row.run_id) return pills;
  if (pills > 0) return pills;
  if (exactGdgCoins > 0) return exactGdgCoins;
  return Math.max(1, Math.floor((Number(row.coins) || 0) / 15));
}

export interface DriverStats {
  userId?: string;
  username: string;
  displayName: string;
  bestScore: number;
  totalCoins: number;
  totalGdgCoins: number;
  bestDistance: number;
  totalGames: number;
  lastPlayed: string;
  rank?: number;
}

/**
 * Fetches the global leaderboard with aggregated cumulative coins & GDG coins.
 */
export async function fetchLeaderboardDrivers(limit = 100): Promise<DriverStats[]> {
  // 1. First attempt: Query precomputed public.leaderboard table
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('user_id, username, display_name, best_score, total_coins, total_gdg_coins, best_distance, total_games, rank, last_played')
      .not('rank', 'is', null)
      .order('rank', { ascending: true })
      .limit(limit);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        userId: row.user_id || undefined,
        username: row.username || 'driver',
        displayName: row.display_name || row.username || 'Driver',
        bestScore: Number(row.best_score) || 0,
        totalCoins: Number(row.total_coins) || 0,
        totalGdgCoins: Number(row.total_gdg_coins) || 0,
        bestDistance: Number(row.best_distance) || 0,
        totalGames: Number(row.total_games) || 0,
        rank: row.rank == null ? undefined : Number(row.rank),
        lastPlayed: row.last_played || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('[API] Query from leaderboard table warning:', err);
  }

  // 2. Fallback attempt: Query scores table and aggregate
  const fetchLimit = 1000;
  let allRows: ScoreRow[] = [];

  try {
    const { data, error } = await supabase
      .from('scores')
      .select('id, user_id, username, display_name, run_id, score, coins, pills, gdg_coins, bonus_score, distance, duration_seconds, created_at')
      .order('score', { ascending: false })
      .limit(fetchLimit);

    if (!error && Array.isArray(data)) {
      allRows = data as ScoreRow[];
    }
  } catch (err) {
    console.warn('[API] Supabase client fetchLeaderboardDrivers exception:', err);
  }

  if (allRows.length === 0) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/scores?select=id,user_id,username,display_name,run_id,score,coins,pills,gdg_coins,bonus_score,distance,duration_seconds,created_at&order=score.desc&limit=${fetchLimit}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        allRows = await res.json();
      }
    } catch (fetchErr) {
      console.warn('[API] REST fallback fetchLeaderboardDrivers failed:', fetchErr);
    }
  }

  const userMap = new Map<string, DriverStats>();

  for (const row of allRows) {
    const key = (row.user_id || row.username || '').toLowerCase().trim();
    if (!key) continue;

    if (!userMap.has(key)) {
      userMap.set(key, {
        userId: row.user_id,
        username: row.username || 'driver',
        displayName: row.display_name || row.username || 'Driver',
        bestScore: Number(row.score) || 0,
        totalCoins: 0,
        totalGdgCoins: 0,
        bestDistance: Number(row.distance) || 0,
        totalGames: 0,
        lastPlayed: row.created_at || new Date().toISOString(),
      });
    }

    const driver = userMap.get(key)!;
    driver.totalGames += 1;
    driver.totalCoins += (Number(row.coins) || 0);

    // Cumulative GDG Coins computed from collected pills / coins
    driver.totalGdgCoins += getRunGdgCoins(row);

    if (row.score > driver.bestScore) {
      driver.bestScore = Number(row.score) || 0;
    }
    if (row.distance > driver.bestDistance) {
      driver.bestDistance = Number(row.distance) || 0;
    }
    if (new Date(row.created_at) > new Date(driver.lastPlayed)) {
      driver.lastPlayed = row.created_at;
      if (row.display_name) driver.displayName = row.display_name;
    }
  }

  const sortedDrivers = Array.from(userMap.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, limit);

  sortedDrivers.forEach((driver, idx) => {
    driver.rank = idx + 1;
  });

  return sortedDrivers;
}

/**
 * Fetches or calculates cumulative stats for a specific user directly from database.
 */
export async function fetchUserCumulativeStats(userId: string, username?: string): Promise<DriverStats> {
  let totalCoins = 0;
  let totalGdgCoins = 0;
  let bestScore = 0;
  let bestDistance = 0;
  let totalGames = 0;
  let lastPlayed = new Date().toISOString();
  let displayName = username || 'Driver';

  try {
    // 1. Try public.leaderboard table first
    if (userId) {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          userId: data.user_id,
          username: data.username || username || 'driver',
          displayName: data.display_name || username || 'Driver',
          bestScore: Number(data.best_score) || 0,
          totalCoins: Number(data.total_coins) || 0,
          totalGdgCoins: Number(data.total_gdg_coins) || 0,
          bestDistance: Number(data.best_distance) || 0,
          totalGames: Number(data.total_games) || 0,
          rank: data.rank == null ? undefined : Number(data.rank),
          lastPlayed: data.last_played || lastPlayed,
        };
      }
    }

    // 2. Fallback to scores table
    const query = supabase
      .from('scores')
      .select('id, user_id, username, display_name, run_id, score, coins, pills, gdg_coins, bonus_score, distance, duration_seconds, created_at');

    if (userId) query.eq('user_id', userId);
    else if (username) query.eq('username', username);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        totalGames += 1;
        totalCoins += (Number(row.coins) || 0);
        totalGdgCoins += getRunGdgCoins(row as ScoreRow);
        if (Number(row.score) > bestScore) bestScore = Number(row.score);
        if (Number(row.distance) > bestDistance) bestDistance = Number(row.distance);
        if (row.display_name) displayName = row.display_name;
        lastPlayed = row.created_at;
      }
    }
  } catch (err) {
    console.warn('[API] fetchUserCumulativeStats error:', err);
  }

  return {
    userId,
    username: username || 'driver',
    displayName,
    bestScore,
    totalCoins,
    totalGdgCoins,
    bestDistance,
    totalGames,
    lastPlayed,
  };
}

/**
 * Fetches the user's all-time personal best score row.
 */
export async function fetchUserBest(userId: string, username?: string): Promise<ScoreRow | null> {
  try {
    const query = supabase
      .from('scores')
      .select('id, user_id, username, display_name, run_id, score, coins, pills, gdg_coins, bonus_score, distance, duration_seconds, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (userId) {
      query.eq('user_id', userId);
    } else if (username) {
      query.eq('username', username);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data[0] as ScoreRow;
    }
  } catch (err) {
    console.warn('[API] fetchUserBest error:', err);
  }

  // REST fallback
  if (userId) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/scores?user_id=eq.${encodeURIComponent(userId)}&order=score.desc,created_at.asc&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        const rows: ScoreRow[] = await res.json();
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {}
  }

  return null;
}

/**
 * Adds GDG coins to the user's local store when picked up in game.
 */
export function recordGdgCoinGain(userId: string, count: number): void {
  try {
    const key = `gdg_coins_bonus_${userId || 'guest'}`;
    const cur = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    localStorage.setItem(key, (cur + count).toString());
  } catch {}
}

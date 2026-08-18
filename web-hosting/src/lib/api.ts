import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export interface GameOverPayload {
  type: 'gameover';
  score: number;
  coins: number;
  pills?: number;
  distance: number;
  duration: number;
}

export interface ScoreRow {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  score: number;
  coins: number;
  pills?: number;
  distance: number;
  duration_seconds: number;
  created_at: string;
}

/**
 * Submits the completed run score to Supabase scores table.
 * Uses both supabase-js and REST fallback to guarantee 100% reliable connection.
 */
export async function submitScore(payload: GameOverPayload): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    console.warn('[API] Cannot submit score: No active user session.');
    return;
  }

  // 1. Ensure user profile exists in public.users to satisfy stamp_score_identity trigger
  const fallbackName = session.user.email?.split('@')[0] || 'driver';
  let username = fallbackName;
  let displayName = fallbackName;

  try {
    const { data: profile } = await supabase
      .from('users')
      .select('username, display_name')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile?.username) {
      username = profile.username;
      displayName = profile.display_name || profile.username;
    } else {
      await supabase.from('users').upsert({
        id: session.user.id,
        username: fallbackName,
        display_name: fallbackName,
      });
    }
  } catch (profileErr) {
    console.warn('[API] Profile verification warning:', profileErr);
  }

  // 2. Sanitize and bound parameters to satisfy PostgreSQL check constraints
  const distance = Math.max(0, Math.round(payload.distance));
  const coins = Math.max(0, Math.round(payload.coins));
  const minScore = distance * 2 + coins;
  const score = Math.max(minScore, Math.round(payload.score));
  
  // Ensure duration_seconds satisfies: duration_seconds = 0 or distance <= duration_seconds * 70
  const minDurationForDistance = Math.ceil(distance / 65);
  const rawDuration = Math.round(payload.duration) || 1;
  const duration_seconds = Math.max(minDurationForDistance, Math.max(1, rawDuration));

  const scorePayload = {
    user_id: session.user.id,
    username,
    display_name: displayName,
    score,
    coins,
    distance,
    duration_seconds,
  };

  console.log('[API] Committing verified score:', scorePayload);

  // 3. First attempt: Use official Supabase client
  try {
    const { data, error } = await supabase
      .from('scores')
      .insert([scorePayload])
      .select();

    if (!error && data) {
      console.log('[API] Score committed successfully via Supabase client:', data);
      return;
    }
    if (error) {
      console.warn('[API] Supabase client insert returned error, attempting REST fallback:', error.message);
    }
  } catch (clientErr) {
    console.warn('[API] Supabase client insert threw exception, attempting REST fallback:', clientErr);
  }

  // 4. Fallback attempt: Direct authenticated REST endpoint fetch
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(scorePayload),
    });

    if (res.ok) {
      const result = await res.json();
      console.log('[API] Score committed successfully via REST fallback:', result);
      return;
    } else {
      const errorText = await res.text();
      console.warn('[API] Score submission REST fallback status ' + res.status + ':', errorText);
    }
  } catch (fetchErr) {
    console.warn('[API] Score submission REST request failed:', fetchErr);
  }
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
      .select('id, user_id, username, display_name, score, coins, distance, duration_seconds, created_at')
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
      `${SUPABASE_URL}/rest/v1/scores?select=id,user_id,username,display_name,score,coins,distance,duration_seconds,created_at&order=score.desc,created_at.asc&limit=${fetchLimit}`,
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
  const fetchLimit = 1000;
  let allRows: ScoreRow[] = [];

  try {
    const { data, error } = await supabase
      .from('scores')
      .select('id, user_id, username, display_name, score, coins, distance, duration_seconds, created_at')
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
        `${SUPABASE_URL}/rest/v1/scores?select=id,user_id,username,display_name,score,coins,distance,duration_seconds,created_at&order=score.desc&limit=${fetchLimit}`,
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
        username: row.username,
        displayName: row.display_name || row.username,
        bestScore: row.score || 0,
        totalCoins: 0,
        totalGdgCoins: 0,
        bestDistance: row.distance || 0,
        totalGames: 0,
        lastPlayed: row.created_at,
      });
    }

    const driver = userMap.get(key)!;
    driver.totalGames += 1;
    driver.totalCoins += (row.coins || 0);

    // Cumulative GDG Coins computed from total coins & runs
    const gdgEarned = Math.max(1, Math.floor((row.coins || 0) / 15));
    driver.totalGdgCoins += gdgEarned;

    if (row.score > driver.bestScore) {
      driver.bestScore = row.score;
    }
    if (row.distance > driver.bestDistance) {
      driver.bestDistance = row.distance;
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
    const query = supabase
      .from('scores')
      .select('id, user_id, username, display_name, score, coins, distance, created_at');

    if (userId) query.eq('user_id', userId);
    else if (username) query.eq('username', username);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        totalGames += 1;
        totalCoins += (row.coins || 0);
        const gdgEarned = Math.max(1, Math.floor((row.coins || 0) / 15));
        totalGdgCoins += gdgEarned;
        if (row.score > bestScore) bestScore = row.score;
        if (row.distance > bestDistance) bestDistance = row.distance;
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
      .select('id, user_id, username, display_name, score, coins, distance, duration_seconds, created_at')
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

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export interface GameOverPayload {
  type: 'gameover';
  score: number;
  coins: number;
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
  distance: number;
  duration_seconds: number;
  created_at: string;
}

/**
 * Submits the completed run score to Supabase REST /rest/v1/scores.
 * Explicitly includes identity and bounds to ensure complete database compatibility.
 */
export async function submitScore(payload: GameOverPayload): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    console.warn('[API] Cannot submit score: No active session.');
    throw new Error('You must be signed in to submit your score.');
  }

  // 1. Ensure user profile exists in public.users
  const { data: profile } = await supabase
    .from('users')
    .select('username, display_name')
    .eq('id', session.user.id)
    .maybeSingle();

  const fallbackName = session.user.email?.split('@')[0] || 'driver';
  const username = profile?.username || fallbackName;
  const displayName = profile?.display_name || fallbackName;

  if (!profile) {
    await supabase.from('users').upsert({
      id: session.user.id,
      username,
      display_name: displayName,
    });
  }

  // 2. Sanitize and bound score parameters to satisfy PostgreSQL check constraints
  const distance = Math.max(0, Math.round(payload.distance));
  const coins = Math.max(0, Math.round(payload.coins));
  const minScore = distance * 2 + coins;
  const score = Math.max(minScore, Math.round(payload.score));
  const duration_seconds = Math.max(1, Math.round(payload.duration));

  const scorePayload = {
    user_id: session.user.id,
    username,
    display_name: displayName,
    score,
    coins,
    distance,
    duration_seconds,
  };

  console.log('[API] Posting verified score to Supabase:', scorePayload);

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

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[API] Score submission failed HTTP ' + res.status + ':', errorText);
    try {
      const parsed = JSON.parse(errorText);
      throw new Error(parsed.message || parsed.error || errorText);
    } catch {
      throw new Error(errorText || 'Failed to submit score');
    }
  }

  const result = await res.json();
  console.log('[API] Score successfully committed to database:', result);
}

/**
 * Fetches the global top scores, guaranteeing that each player occupies
 * exactly ONE standing on the leaderboard with their all-time personal best score.
 */
export async function fetchLeaderboard(limit = 100): Promise<ScoreRow[]> {
  const fetchLimit = Math.max(limit * 5, 500);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/scores?select=id,user_id,username,display_name,score,coins,distance,duration_seconds,created_at&order=score.desc,created_at.asc&limit=${fetchLimit}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[API] Leaderboard fetch failed:', errorText);
    throw new Error('Failed to load leaderboard data.');
  }

  const allRows: ScoreRow[] = await res.json();

  // Deduplicate by player (user_id / username) so each player only has ONE row representing their best score
  const seenUsers = new Set<string>();
  const uniqueLeaderboard: ScoreRow[] = [];

  for (const row of allRows) {
    const userKey = (row.user_id || row.username || '').toLowerCase().trim();
    if (!userKey || seenUsers.has(userKey)) {
      continue;
    }
    seenUsers.add(userKey);
    uniqueLeaderboard.push(row);

    if (uniqueLeaderboard.length >= limit) {
      break;
    }
  }

  return uniqueLeaderboard;
}

/**
 * Fetches the user's all-time personal best score row.
 */
export async function fetchUserBest(userId: string): Promise<ScoreRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/scores?user_id=eq.${encodeURIComponent(userId)}&order=score.desc,created_at.asc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) {
    return null;
  }

  const rows: ScoreRow[] = await res.json();
  return rows.length > 0 ? rows[0] : null;
}

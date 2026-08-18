import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { flushQueuedScores } from '../lib/api';

export function ScoreQueueSync() {
  const { session, refreshCoins } = useAuth();

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const flush = async () => {
      const saved = await flushQueuedScores(userId);
      if (saved.size > 0) await refreshCoins();
    };

    void flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [refreshCoins, session?.user.id]);

  return null;
}

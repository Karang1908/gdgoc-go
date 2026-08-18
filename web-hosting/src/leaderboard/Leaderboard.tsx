import React, { useEffect, useState } from 'react';
import { Trophy, RefreshCw, Search, ArrowLeft, Loader2, Coins, Flag, Medal } from 'lucide-react';
import { DriverStats, fetchLeaderboardDrivers } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface LeaderboardProps {
  onBackToGame: () => void;
}

const fmt = (n: number | string | null | undefined): string => {
  const val = Number(n);
  return isNaN(val) ? '0' : val.toLocaleString();
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBackToGame }) => {
  const { user, profile, userCoins, userGdgCoins, userStats } = useAuth();
  const [drivers, setDrivers] = useState<DriverStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);

    try {
      const data = await fetchLeaderboardDrivers(100);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Leaderboard] Fetch error:', err);
      setError('Could not load leaderboard data. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDrivers = drivers.filter((row) => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    const nameMatch = row?.displayName && row.displayName.toLowerCase().includes(q);
    const userMatch = row?.username && row.username.toLowerCase().includes(q);
    return Boolean(nameMatch || userMatch);
  });

  const userDriverIndex = drivers.findIndex((r) => {
    if (!r) return false;
    if (user && r.userId && r.userId === user.id) return true;
    if (profile?.username && r.username && r.username.toLowerCase() === profile.username.toLowerCase()) return true;
    return false;
  });

  const userStanding = userDriverIndex !== -1 ? drivers[userDriverIndex] : userStats;

  return (
    <main className="leaderboard-container animate-fade-in">
      {/* Header */}
      <div className="leaderboard-header">
        <button
          id="leaderboard-back-btn"
          className="btn btn-secondary back-btn"
          onClick={onBackToGame}
        >
          <ArrowLeft size={16} />
          <span>Back to Game</span>
        </button>

        <div className="header-badge">
          <Trophy size={14} className="trophy-icon" />
          <span>GLOBAL LEADERBOARD</span>
        </div>

        <h1 className="leaderboard-title">Top Drivers</h1>
        <p className="lede leaderboard-lede">
          Live global standings: one personal best per driver. Track your high score, cumulative standard coins, and banked GDG tokens.
        </p>
      </div>

      {/* Podium Top Cards (adapts for 1, 2, or 3 players) */}
      {!loading && drivers.length > 0 && !searchQuery && (
        <div className={`podium-grid podium-count-${Math.min(drivers.length, 3)}`}>
          {/* 2nd Place (Silver) */}
          {drivers.length >= 2 && drivers[1] && (
            <div className="podium-card card silver">
              <div className="podium-rank-badge font-display">#2</div>
              <div className="podium-avatar-wrap silver-avatar">
                <Medal size={28} />
              </div>
              <h3 className="podium-username" title={`@${drivers[1].username}`}>
                @{drivers[1].username || 'driver'}
              </h3>
              <span className="podium-realname">
                {drivers[1].displayName || drivers[1].username || 'Driver'}
              </span>
              <span className="podium-score font-display">
                {fmt(drivers[1].bestScore)} PTS
              </span>
              <div className="podium-sub">
                <span className="podium-coin-tag">
                  <Coins size={12} style={{ color: 'var(--g-yellow)' }} />
                  {fmt(drivers[1].totalCoins)}
                </span>
                <span>•</span>
                <span className="podium-pill-tag">
                  <img src="/branding/gdg-pill.png" alt="GDG" className="inline-pill-icon" />
                  {fmt(drivers[1].totalGdgCoins)} GDG
                </span>
                <span>•</span>
                <span>{fmt(drivers[1].bestDistance)}m</span>
              </div>
            </div>
          )}

          {/* 1st Place (Gold) */}
          {drivers.length >= 1 && drivers[0] && (
            <div className="podium-card card gold">
              <div className="podium-rank-badge font-display gold-badge">#1</div>
              <div className="podium-avatar-wrap gold-avatar">
                <Trophy size={32} />
              </div>
              <h3 className="podium-username" title={`@${drivers[0].username}`}>
                @{drivers[0].username || 'driver'}
              </h3>
              <span className="podium-realname">
                {drivers[0].displayName || drivers[0].username || 'Driver'}
              </span>
              <span className="podium-score font-display">
                {fmt(drivers[0].bestScore)} PTS
              </span>
              <div className="podium-sub">
                <span className="podium-coin-tag">
                  <Coins size={12} style={{ color: 'var(--g-yellow)' }} />
                  {fmt(drivers[0].totalCoins)}
                </span>
                <span>•</span>
                <span className="podium-pill-tag">
                  <img src="/branding/gdg-pill.png" alt="GDG" className="inline-pill-icon" />
                  {fmt(drivers[0].totalGdgCoins)} GDG
                </span>
                <span>•</span>
                <span>{fmt(drivers[0].bestDistance)}m</span>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {drivers.length >= 3 && drivers[2] && (
            <div className="podium-card card bronze">
              <div className="podium-rank-badge font-display">#3</div>
              <div className="podium-avatar-wrap bronze-avatar">
                <Medal size={28} />
              </div>
              <h3 className="podium-username" title={`@${drivers[2].username}`}>
                @{drivers[2].username || 'driver'}
              </h3>
              <span className="podium-realname">
                {drivers[2].displayName || drivers[2].username || 'Driver'}
              </span>
              <span className="podium-score font-display">
                {fmt(drivers[2].bestScore)} PTS
              </span>
              <div className="podium-sub">
                <span className="podium-coin-tag">
                  <Coins size={12} style={{ color: 'var(--g-yellow)' }} />
                  {fmt(drivers[2].totalCoins)}
                </span>
                <span>•</span>
                <span className="podium-pill-tag">
                  <img src="/branding/gdg-pill.png" alt="GDG" className="inline-pill-icon" />
                  {fmt(drivers[2].totalGdgCoins)} GDG
                </span>
                <span>•</span>
                <span>{fmt(drivers[2].bestDistance)}m</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User's Own Standing Highlight Card */}
      {user && (
        <div className="user-standing-card card animate-fade-in">
          <div className="standing-tag">
            <span>YOUR DRIVER PROFILE & WALLET</span>
          </div>
          <div className="standing-row">
            <div className="standing-rank font-display">
              {userDriverIndex !== -1 ? `#${userDriverIndex + 1}` : 'UNRANKED'}
            </div>
            <div className="standing-info">
              <div className="standing-name-stack">
                <span className="standing-username font-display">
                  @{profile?.username || userStanding?.username || user?.email?.split('@')[0] || 'driver'}
                </span>
                <span className="standing-realname">
                  {profile?.display_name || userStanding?.displayName || 'Driver'}
                </span>
              </div>
              <div className="standing-wallet-row">
                <span className="wallet-stat standard">
                  <Coins size={13} style={{ color: 'var(--g-yellow)' }} />
                  <span><strong>{fmt(userCoins ?? userStanding?.totalCoins)}</strong> Coins</span>
                </span>
                <span>•</span>
                <span className="wallet-stat gdg">
                  <img src="/branding/gdg-pill.png" alt="GDG Coin" className="inline-pill-icon" />
                  <span><strong>{fmt(userGdgCoins ?? userStanding?.totalGdgCoins)}</strong> GDG</span>
                </span>
                <span>•</span>
                <span className="wallet-stat games">
                  <Flag size={13} />
                  <span>{userStanding?.totalGames ?? 0} {userStanding?.totalGames === 1 ? 'race' : 'races'}</span>
                </span>
              </div>
            </div>
            <div className="standing-score font-display">
              {fmt(userStanding?.bestScore)} PTS
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: Search + Refresh */}
      <div className="table-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            id="leaderboard-search-input"
            type="text"
            className="input-field search-input"
            placeholder="Search drivers by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          id="leaderboard-refresh-btn"
          className="btn btn-secondary refresh-btn"
          onClick={() => loadData(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="table-wrapper card">
        {loading ? (
          <div className="table-loading">
            <Loader2 size={32} className="animate-spin" />
            <span className="font-mono">FETCHING STANDINGS...</span>
          </div>
        ) : error ? (
          <div className="table-error">
            <span>{error}</span>
            <button className="btn btn-secondary" onClick={() => loadData(true)}>
              Retry
            </button>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="table-empty">
            <span>No driver rankings found. Take the wheel to claim rank #1!</span>
          </div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="th-rank">Rank</th>
                <th className="th-driver">Driver</th>
                <th className="th-score">High Score</th>
                <th className="th-coins">Cumulative Coins</th>
                <th className="th-pills">GDG Coins</th>
                <th className="th-distance">Best Distance</th>
                <th className="th-games">Races</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((row, idx) => {
                const isUser = Boolean(
                  (user && row.userId && row.userId === user.id) ||
                  (profile?.username && row.username && row.username.toLowerCase() === profile.username.toLowerCase())
                );
                const globalRank = row.rank || (idx + 1);

                return (
                  <tr
                    key={row.userId || row.username || `row-${idx}`}
                    className={`table-row ${isUser ? 'user-highlight' : ''}`}
                  >
                    <td className="td-rank">
                      <span className={`rank-chip font-display rank-${globalRank <= 3 ? globalRank : 'other'}`}>
                        #{globalRank}
                      </span>
                    </td>
                    <td className="td-driver">
                      <div className="driver-cell">
                        <div className="driver-identity-col">
                          <span className="driver-username font-display">@{row.username || 'driver'}</span>
                          <span className="driver-realname">{row.displayName || row.username || 'Driver'}</span>
                        </div>
                        {isUser && <span className="you-badge">YOU</span>}
                      </div>
                    </td>
                    <td className="td-score font-display">{fmt(row.bestScore)}</td>
                    <td className="td-coins font-mono">
                      <span className="table-coin-cell">
                        <Coins size={13} style={{ color: 'var(--g-yellow)', display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        {fmt(row.totalCoins)}
                      </span>
                    </td>
                    <td className="td-pills">
                      <div className="pill-badge-cell">
                        <img src="/branding/gdg-pill.png" alt="GDG Coin" className="table-pill-icon" />
                        <span className="font-mono pill-count-text">{fmt(row.totalGdgCoins)}</span>
                      </div>
                    </td>
                    <td className="td-distance font-mono">{fmt(row.bestDistance)} m</td>
                    <td className="td-games font-mono">{fmt(row.totalGames)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .leaderboard-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px clamp(16px, 3vw, 32px) 60px;
        }

        .leaderboard-header {
          position: relative;
          text-align: center;
          margin-bottom: 32px;
        }

        .back-btn {
          position: absolute;
          left: 0;
          top: 0;
          height: 38px;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-2);
          margin-bottom: 12px;
          letter-spacing: 0.04em;
        }

        .trophy-icon {
          color: var(--g-yellow);
        }

        .leaderboard-title {
          font-size: clamp(2rem, 4vw, 2.75rem);
          margin-bottom: 8px;
        }

        .leaderboard-lede {
          margin: 0 auto;
        }

        .podium-grid {
          display: grid;
          gap: 16px;
          align-items: end;
          margin-bottom: 28px;
        }

        .podium-count-3 {
          grid-template-columns: 1fr 1.15fr 1fr;
        }

        .podium-count-2 {
          grid-template-columns: 1fr 1.1fr;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .podium-count-1 {
          grid-template-columns: 1fr;
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }

        .podium-card {
          position: relative;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--r-xl);
          padding: 24px 16px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .podium-card.gold {
          border-color: rgba(251, 188, 4, 0.6);
          box-shadow: var(--shadow-2);
          transform: translateY(-8px);
        }

        .podium-rank-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--surface-3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.88rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--text);
        }

        .podium-rank-badge.gold-badge {
          background: rgba(251, 188, 4, 0.2);
          color: #B26A00;
        }

        :root[data-theme='dark'] .podium-rank-badge.gold-badge {
          color: #FFD54F;
          background: rgba(251, 188, 4, 0.2);
        }

        .podium-avatar-wrap {
          width: 52px;
          height: 52px;
          border-radius: var(--pill);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
        }

        .gold-avatar {
          color: var(--g-yellow);
          background: rgba(251, 188, 4, 0.12);
          border-color: rgba(251, 188, 4, 0.35);
        }

        .silver-avatar {
          color: var(--text-2);
        }

        .bronze-avatar {
          color: #E37400;
          background: rgba(227, 116, 0, 0.1);
        }

        .podium-username {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 2px;
        }

        .podium-realname {
          font-size: 0.8rem;
          color: var(--text-2);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 6px;
        }

        .podium-score {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .podium-sub {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: var(--text-3);
          flex-wrap: wrap;
          justify-content: center;
        }

        .podium-coin-tag {
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .podium-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          color: var(--accent);
        }

        .inline-pill-icon {
          width: 13px;
          height: 13px;
          object-fit: contain;
        }

        .user-standing-card {
          margin-bottom: 24px;
          padding: 18px 22px;
          background: var(--accent-soft);
          border: 2px solid var(--accent);
        }

        .standing-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-display);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 8px;
          letter-spacing: 0.04em;
        }

        .standing-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .standing-rank {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent);
          min-width: 50px;
        }

        .standing-info {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .standing-name-stack {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .standing-username {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
        }

        .standing-realname {
          font-size: 0.84rem;
          color: var(--text-2);
        }

        .standing-wallet-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--text-2);
          flex-wrap: wrap;
        }

        .wallet-stat {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .wallet-stat.gdg {
          color: var(--accent);
        }

        .standing-score {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--accent);
        }

        .table-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .search-box {
          position: relative;
          flex-grow: 1;
          max-width: 440px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-3);
          pointer-events: none;
        }

        .search-input {
          padding-left: 42px;
          height: 44px;
          border-radius: var(--pill);
        }

        .refresh-btn {
          height: 44px;
        }

        .table-wrapper {
          overflow-x: auto;
          padding: 0;
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .leaderboard-table th {
          padding: 14px 18px;
          font-family: var(--font-display);
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 2px solid var(--border);
          background: var(--surface-2);
        }

        .th-rank { width: 90px; }
        .th-score { text-align: right; }
        .th-distance { text-align: right; }
        .th-coins { text-align: right; }
        .th-pills { text-align: right; }
        .th-games { text-align: right; }

        .pill-badge-cell {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          width: 100%;
        }

        .table-pill-icon {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }

        .pill-count-text {
          font-weight: 700;
          color: var(--accent);
        }

        .table-row {
          border-bottom: 1px solid var(--border);
          transition: background-color 0.15s ease;
        }

        .table-row:hover {
          background: var(--surface-2);
        }

        .table-row.user-highlight {
          background: var(--accent-soft);
        }

        .leaderboard-table td {
          padding: 14px 18px;
          font-size: 0.9rem;
          color: var(--text);
        }

        .rank-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 10px;
          border-radius: var(--pill);
          font-weight: 700;
          font-size: 0.85rem;
          background: var(--surface-3);
          color: var(--text-2);
        }

        .rank-1 {
          background: rgba(251, 188, 4, 0.18);
          color: #B26A00;
          border: 1px solid rgba(251, 188, 4, 0.4);
        }

        :root[data-theme='dark'] .rank-1 {
          color: #FFD54F;
        }

        .rank-2 {
          background: var(--surface-3);
          color: var(--text);
          border: 1px solid var(--border-strong);
        }

        .rank-3 {
          background: rgba(227, 116, 0, 0.12);
          color: #E37400;
          border: 1px solid rgba(227, 116, 0, 0.3);
        }

        .driver-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .driver-identity-col {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .driver-username {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--text);
        }

        .driver-realname {
          font-size: 0.75rem;
          color: var(--text-2);
        }

        .you-badge {
          font-size: 0.65rem;
          font-weight: 700;
          background: var(--accent);
          color: var(--on-accent);
          padding: 2px 6px;
          border-radius: var(--pill);
        }

        .td-score {
          text-align: right;
          font-size: 1rem;
          font-weight: 700;
          color: var(--accent);
        }

        .td-distance, .td-coins, .td-pills, .td-games {
          text-align: right;
          font-size: 0.85rem;
          color: var(--text-2);
        }

        .table-coin-cell {
          font-weight: 600;
        }

        .table-loading, .table-error, .table-empty {
          padding: 60px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-2);
        }

        @media (max-width: 768px) {
          .podium-grid {
            grid-template-columns: 1fr;
          }
          .back-btn {
            position: static;
            margin-bottom: 14px;
          }
          .th-coins, .td-coins {
            display: none;
          }
        }
      `}</style>
    </main>
  );
};

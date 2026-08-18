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
      {/* Header Bar */}
      <div className="leaderboard-header">
        <div className="leaderboard-header-top">
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
        </div>

        <h1 className="leaderboard-title">Top Drivers</h1>
        <p className="lede leaderboard-lede">
          Live global standings: one personal best per driver. Track your high score, cumulative standard coins, and banked GDG tokens.
        </p>
      </div>

      {/* Podium Top Cards */}
      {!loading && drivers.length > 0 && !searchQuery && (
        <div className={`podium-grid podium-count-${Math.min(drivers.length, 3)}`}>
          {/* 2nd Place (Silver) */}
          {drivers.length >= 2 && drivers[1] && (
            <div className="podium-card card silver">
              <div className="podium-rank-badge font-display">#2</div>
              <div className="podium-avatar-wrap silver-avatar">
                <Medal size={24} />
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
              </div>
            </div>
          )}

          {/* 1st Place (Gold) */}
          {drivers.length >= 1 && drivers[0] && (
            <div className="podium-card card gold">
              <div className="podium-rank-badge font-display gold-badge">#1</div>
              <div className="podium-avatar-wrap gold-avatar">
                <Trophy size={28} />
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
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {drivers.length >= 3 && drivers[2] && (
            <div className="podium-card card bronze">
              <div className="podium-rank-badge font-display">#3</div>
              <div className="podium-avatar-wrap bronze-avatar">
                <Medal size={24} />
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
            </div>
            <div className="standing-stats-grid">
              <div className="standing-stat-item">
                <span className="standing-stat-label">HIGH SCORE</span>
                <span className="standing-stat-val font-mono">{fmt(userStanding?.bestScore || 0)}</span>
              </div>
              <div className="standing-stat-item">
                <span className="standing-stat-label">TOTAL COINS</span>
                <span className="standing-stat-val font-mono">
                  <Coins size={12} className="standing-coin-icon" />
                  {fmt(userCoins || userStanding?.totalCoins || 0)}
                </span>
              </div>
              <div className="standing-stat-item">
                <span className="standing-stat-label">GDG COINS</span>
                <span className="standing-stat-val font-mono gdg-val">
                  <img src="/branding/gdg-pill.png" alt="GDG" className="inline-pill-icon" />
                  {fmt(userGdgCoins || userStanding?.totalGdgCoins || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="leaderboard-controls">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search drivers by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear Search"
            >
              ×
            </button>
          )}
        </div>

        <button
          className="btn btn-secondary refresh-btn"
          onClick={() => loadData(true)}
          disabled={refreshing || loading}
          title="Refresh Standings"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Standings Table */}
      <div className="table-container card">
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
            {loading ? (
              <tr>
                <td colSpan={7} className="table-loading">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Loading live leaderboard standings...</span>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="table-error">
                  <p>{error}</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => loadData(true)}>
                    Try Again
                  </button>
                </td>
              </tr>
            ) : filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  {searchQuery ? (
                    <p>No drivers found matching "{searchQuery}".</p>
                  ) : (
                    <div className="empty-state">
                      <Flag size={32} />
                      <p>No runs recorded yet. Step onto the track and set the benchmark!</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver, index) => {
                const rankNum = driver.rank || (index + 1);
                const isCurrentUser = Boolean(
                  (user && driver.userId && driver.userId === user.id) ||
                  (profile?.username && driver.username && driver.username.toLowerCase() === profile.username.toLowerCase())
                );

                return (
                  <tr
                    key={driver.userId || driver.username || index}
                    className={`table-row ${isCurrentUser ? 'current-user-row' : ''} ${rankNum <= 3 ? `rank-${rankNum}-row` : ''}`}
                  >
                    <td className="td-rank">
                      <div className={`rank-pill font-display ${rankNum === 1 ? 'gold' : rankNum === 2 ? 'silver' : rankNum === 3 ? 'bronze' : ''}`}>
                        {rankNum === 1 ? '#1' : rankNum === 2 ? '#2' : rankNum === 3 ? '#3' : `#${rankNum}`}
                      </div>
                    </td>

                    <td className="td-driver">
                      <div className="driver-cell">
                        <div className="driver-identity-col">
                          <span className="driver-username font-display">
                            @{driver.username}
                          </span>
                          <span className="driver-realname">
                            {driver.displayName || driver.username}
                          </span>
                        </div>
                        {isCurrentUser && (
                          <span className="you-badge font-display">YOU</span>
                        )}
                      </div>
                    </td>

                    <td className="td-score font-mono">
                      {fmt(driver.bestScore)}
                    </td>

                    <td className="td-coins font-mono">
                      <span className="table-coin-cell">
                        <Coins size={12} className="inline-coin-icon" />
                        {fmt(driver.totalCoins)}
                      </span>
                    </td>

                    <td className="td-pills font-mono">
                      <span className="table-pill-cell">
                        <img src="/branding/gdg-pill.png" alt="GDG" className="inline-pill-icon" />
                        {fmt(driver.totalGdgCoins)}
                      </span>
                    </td>

                    <td className="td-distance font-mono">
                      {fmt(driver.bestDistance)} m
                    </td>

                    <td className="td-games font-mono">
                      {fmt(driver.totalGames)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .leaderboard-container {
          height: 100%;
          max-height: 100%;
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 16px 16px max(32px, env(safe-area-inset-bottom, 0px) + 16px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .leaderboard-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .leaderboard-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .back-btn {
          height: 36px;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-family: var(--font-display);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-2);
          letter-spacing: 0.04em;
        }

        .trophy-icon {
          color: var(--g-yellow);
        }

        .leaderboard-title {
          font-size: clamp(1.8rem, 3.6vw, 2.5rem);
          margin-bottom: 6px;
          line-height: 1.15;
        }

        .leaderboard-lede {
          margin: 0 auto;
          max-width: 620px;
          font-size: clamp(0.8rem, 1.4vw, 0.88rem);
          color: var(--text-2);
        }

        .podium-grid {
          display: grid;
          gap: 12px;
          align-items: end;
          margin-bottom: 20px;
        }

        .podium-count-3 {
          grid-template-columns: 1fr 1.15fr 1fr;
        }

        .podium-count-2 {
          grid-template-columns: 1fr 1.1fr;
          max-width: 580px;
          margin-left: auto;
          margin-right: auto;
        }

        .podium-count-1 {
          grid-template-columns: 1fr;
          max-width: 300px;
          margin-left: auto;
          margin-right: auto;
        }

        .podium-card {
          position: relative;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--r-xl);
          padding: 16px 12px 14px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }

        .podium-card.gold {
          border-color: rgba(251, 188, 4, 0.6);
          box-shadow: var(--shadow-2);
          transform: translateY(-4px);
        }

        .podium-rank-badge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--surface-3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 6px;
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
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .gold-avatar {
          background: rgba(251, 188, 4, 0.15);
          color: var(--g-yellow);
        }

        .silver-avatar {
          background: rgba(95, 99, 104, 0.15);
          color: #9AA0A6;
        }

        .bronze-avatar {
          background: rgba(234, 67, 53, 0.15);
          color: #EA4335;
        }

        .podium-username {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .podium-realname {
          font-size: 0.72rem;
          color: var(--text-2);
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .podium-score {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .podium-sub {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          color: var(--text-2);
          flex-wrap: wrap;
          justify-content: center;
        }

        .podium-coin-tag, .podium-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-weight: 600;
        }

        .inline-pill-icon {
          width: 12px;
          height: 12px;
          object-fit: contain;
        }

        .inline-coin-icon {
          color: var(--g-yellow);
          margin-right: 4px;
        }

        /* User standing highlight card */
        .user-standing-card {
          padding: 12px 16px;
          background: var(--accent-soft);
          border: 2px solid var(--accent);
          border-radius: var(--r-xl);
          margin-bottom: 20px;
        }

        .standing-tag {
          font-family: var(--font-display);
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .standing-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .standing-rank {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--accent);
        }

        .standing-name-stack {
          display: flex;
          flex-direction: column;
        }

        .standing-username {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
        }

        .standing-realname {
          font-size: 0.75rem;
          color: var(--text-2);
        }

        .standing-stats-grid {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .standing-stat-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .standing-stat-label {
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--text-2);
        }

        .standing-stat-val {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .standing-coin-icon {
          color: var(--g-yellow);
        }

        .standing-stat-val.gdg-val {
          color: var(--accent);
        }

        /* Controls */
        .leaderboard-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .search-box {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-3);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 40px;
          padding: 0 34px 0 36px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s var(--ease);
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: var(--accent);
        }

        .clear-search-btn {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: var(--text-3);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0 4px;
        }

        .refresh-btn {
          height: 40px;
          flex-shrink: 0;
        }

        /* Table */
        .table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: var(--r-xl);
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-1);
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .leaderboard-table th {
          background: var(--surface-2);
          padding: 12px 14px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border);
        }

        .th-rank { width: 64px; text-align: center; }
        .th-score { text-align: right; }
        .th-coins { text-align: right; }
        .th-pills { text-align: right; }
        .th-distance { text-align: right; }
        .th-games { text-align: right; width: 70px; }

        .leaderboard-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.84rem;
        }

        .table-row:last-child td {
          border-bottom: none;
        }

        .table-row:hover {
          background: var(--surface-2);
        }

        .current-user-row {
          background: var(--accent-soft) !important;
        }

        .td-rank {
          text-align: center;
        }

        .rank-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 700;
          background: var(--surface-3);
          color: var(--text-2);
        }

        .rank-pill.gold {
          background: rgba(251, 188, 4, 0.2);
          color: #B26A00;
          border: 1px solid rgba(251, 188, 4, 0.5);
        }

        :root[data-theme='dark'] .rank-pill.gold {
          color: #FFD54F;
        }

        .rank-pill.silver {
          background: rgba(95, 99, 104, 0.2);
          color: #5F6368;
          border: 1px solid rgba(95, 99, 104, 0.4);
        }

        :root[data-theme='dark'] .rank-pill.silver {
          color: #BDC1C6;
        }

        .rank-pill.bronze {
          background: rgba(234, 67, 53, 0.15);
          color: #C5221F;
          border: 1px solid rgba(234, 67, 53, 0.3);
        }

        :root[data-theme='dark'] .rank-pill.bronze {
          color: #F28B82;
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
          font-size: 0.88rem;
          color: var(--text);
        }

        .driver-realname {
          font-size: 0.72rem;
          color: var(--text-2);
        }

        .you-badge {
          font-size: 0.62rem;
          font-weight: 700;
          background: var(--accent);
          color: var(--on-accent);
          padding: 2px 6px;
          border-radius: var(--pill);
        }

        .td-score {
          text-align: right;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--accent);
        }

        .td-distance, .td-coins, .td-pills, .td-games {
          text-align: right;
          font-size: 0.82rem;
          color: var(--text-2);
        }

        .table-coin-cell, .table-pill-cell {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .table-loading, .table-error, .table-empty {
          padding: 40px 16px;
          text-align: center;
          color: var(--text-2);
        }

        @media (max-width: 768px) {
          .leaderboard-container {
            padding: 8px 8px max(24px, env(safe-area-inset-bottom, 0px) + 12px);
          }
          .leaderboard-header {
            margin-bottom: 12px;
          }
          .leaderboard-header-top {
            margin-bottom: 8px;
          }
          .leaderboard-title {
            font-size: 1.6rem;
            margin-bottom: 2px;
          }
          .leaderboard-lede {
            font-size: 0.75rem;
            line-height: 1.3;
          }
          .podium-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            gap: 8px;
            margin-bottom: 12px;
          }
          .podium-card {
            padding: 8px 6px 8px;
            border-radius: var(--r-lg);
          }
          .podium-card.gold {
            transform: none;
          }
          .podium-rank-badge {
            width: 22px;
            height: 22px;
            font-size: 0.7rem;
            margin-bottom: 4px;
          }
          .podium-avatar-wrap {
            width: 30px;
            height: 30px;
            margin-bottom: 4px;
          }
          .podium-username {
            font-size: 0.78rem;
            margin-bottom: 1px;
          }
          .podium-realname {
            font-size: 0.65rem;
            margin-bottom: 3px;
          }
          .podium-score {
            font-size: 0.92rem;
            margin-bottom: 3px;
          }
          .podium-sub {
            font-size: 0.62rem;
            gap: 4px;
          }
          .th-coins, .td-coins, .th-games, .td-games, .th-distance, .td-distance {
            display: none;
          }
          .standing-stats-grid {
            gap: 8px;
          }
          .leaderboard-controls {
            margin-bottom: 10px;
          }
        }
      `}</style>
    </main>
  );
};

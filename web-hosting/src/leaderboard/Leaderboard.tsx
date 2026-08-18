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
          Live Global Rankings
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
        <section className="user-standing-card animate-fade-in" aria-label="Your leaderboard position and wallet">
          <div className="standing-row">
            <div className="standing-profile">
              <div className="standing-rank font-display">
                {userStanding?.rank ? `#${userStanding.rank}` : '—'}
              </div>
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
                <span className="standing-stat-label">CUMULATIVE COINS</span>
                <span className="standing-stat-val font-mono">
                  <Coins size={12} className="standing-coin-icon" />
                  {fmt(userCoins)}
                </span>
              </div>
              <div className="standing-stat-item">
                <span className="standing-stat-label">GDG COINS</span>
                <span className="standing-stat-val font-mono gdg-val">
                  <img src="/branding/gdg-pill.png" alt="GDG" className="inline-pill-icon" />
                  {fmt(userGdgCoins)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter & Search Bar */}
      <div className="leaderboard-controls">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search drivers…"
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
          <colgroup>
            <col className="col-rank" />
            <col className="col-driver" />
            <col className="col-score" />
            <col className="col-coins" />
            <col className="col-pills" />
            <col className="col-distance" />
            <col className="col-games" />
          </colgroup>
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
                const rankNum = driver.rank ?? (index + 1);
                const isCurrentUser = Boolean(
                  (user && driver.userId && driver.userId === user.id) ||
                  (profile?.username && driver.username && driver.username.toLowerCase() === profile.username.toLowerCase())
                );

                return (
                  <tr
                    key={driver.userId || driver.username || index}
                    className={`table-row ${isCurrentUser ? 'current-user-row' : ''} ${rankNum <= 3 ? `rank-${rankNum}-row` : ''}`}
                  >
                    <td className="td-rank" data-label="Rank">
                      <div className={`rank-pill font-display ${rankNum === 1 ? 'gold' : rankNum === 2 ? 'silver' : rankNum === 3 ? 'bronze' : ''}`}>
                        {rankNum === 1 ? '#1' : rankNum === 2 ? '#2' : rankNum === 3 ? '#3' : `#${rankNum}`}
                      </div>
                    </td>

                    <td className="td-driver" data-label="Driver">
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

                    <td className="td-score font-mono" data-label="Score">
                      {fmt(driver.bestScore)}
                    </td>

                    <td className="td-coins font-mono" data-label="Coins">
                      <span className="table-coin-cell">
                        <Coins size={12} className="inline-coin-icon" />
                        {fmt(driver.totalCoins)}
                      </span>
                    </td>

                    <td className="td-pills font-mono" data-label="GDG">
                      <span className="table-pill-cell">
                        <img src="/branding/gdg-pill.png" alt="GDG" className="inline-pill-icon" />
                        {fmt(driver.totalGdgCoins)}
                      </span>
                    </td>

                    <td className="td-distance font-mono" data-label="Distance">
                      {fmt(driver.bestDistance)} m
                    </td>

                    <td className="td-games font-mono" data-label="Races">
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
          max-width: 1180px;
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
          overflow: hidden;
          background: var(--accent-soft);
          border: 1px solid var(--accent);
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .standing-row {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) auto;
          align-items: stretch;
        }

        .standing-profile {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
        }

        .standing-rank {
          display: grid;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          place-items: center;
          border-radius: 14px;
          background: var(--accent);
          color: var(--on-accent);
          font-size: 1.05rem;
          font-weight: 800;
        }

        .standing-name-stack {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .standing-username {
          overflow: hidden;
          color: var(--text);
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .standing-realname {
          color: var(--text-2);
          font-size: 0.76rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .standing-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(116px, 1fr));
          align-items: stretch;
        }

        .standing-stat-item {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          min-width: 0;
          padding: 14px 16px;
          border-left: 1px solid rgba(66, 133, 244, 0.22);
        }

        .standing-stat-label {
          font-size: 0.58rem;
          font-weight: 700;
          color: var(--text-2);
          letter-spacing: 0.03em;
          white-space: nowrap;
        }

        .standing-stat-val {
          font-size: 0.92rem;
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
          padding: 0;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: none;
        }

        .leaderboard-table {
          width: 100%;
          min-width: 860px;
          table-layout: fixed;
          border-collapse: collapse;
          text-align: left;
          font-variant-numeric: tabular-nums;
        }

        .leaderboard-table .col-rank { width: 8%; }
        .leaderboard-table .col-driver { width: 21%; }
        .leaderboard-table .col-score { width: 14%; }
        .leaderboard-table .col-coins { width: 18%; }
        .leaderboard-table .col-pills { width: 13%; }
        .leaderboard-table .col-distance { width: 16%; }
        .leaderboard-table .col-games { width: 10%; }

        .leaderboard-table th {
          background: var(--surface-2);
          padding: 13px 16px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .th-rank { text-align: center; }
        .th-score { text-align: right; }
        .th-coins { text-align: right; }
        .th-pills { text-align: right; }
        .th-distance { text-align: right; }
        .th-games { text-align: right; }

        .leaderboard-table th:first-child,
        .leaderboard-table td:first-child { padding-left: 16px; }

        .leaderboard-table th:last-child,
        .leaderboard-table td:last-child { padding-right: 18px; }

        .leaderboard-table td {
          padding: 14px 16px;
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
          min-width: 0;
        }

        .driver-identity-col {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .driver-username {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .driver-realname {
          font-size: 0.72rem;
          color: var(--text-2);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          justify-content: flex-end;
          gap: 4px;
        }

        .table-loading, .table-error, .table-empty {
          padding: 40px 16px;
          text-align: center;
          color: var(--text-2);
        }

        @media (max-width: 900px) {
          .leaderboard-table {
            min-width: 0;
            table-layout: auto;
          }
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
          .standing-stats-grid {
            gap: 8px;
          }
          .leaderboard-controls {
            margin-bottom: 10px;
          }
        }

        @media (max-width: 900px) {
          .leaderboard-container {
            padding: 10px 8px 18px;
          }

          .back-btn,
          .refresh-btn,
          .clear-search-btn {
            min-height: 44px;
          }

          .back-btn { padding: 0 14px; }
          .header-badge { min-height: 36px; }

          .user-standing-card {
            margin-bottom: 12px;
          }

          .standing-row {
            display: block;
          }

          .standing-profile {
            padding: 12px;
          }

          .standing-rank {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
          }

          .standing-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0;
            border-top: 1px solid rgba(66, 133, 244, 0.22);
          }

          .standing-stat-item {
            padding: 10px 8px;
          }

          .standing-stat-item:first-child {
            border-left: 0;
          }

          .standing-stat-label {
            overflow: hidden;
            font-size: 0.52rem;
            text-overflow: ellipsis;
          }

          .standing-stat-val {
            font-size: 0.78rem;
          }

          .search-input { height: 48px; font-size: 1rem; }
          .refresh-btn { height: 48px; padding: 0 14px; }
          .clear-search-btn {
            right: 2px;
            width: 44px;
            padding: 0;
          }

          .table-container {
            overflow: visible;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
          }

          .leaderboard-table,
          .leaderboard-table tbody {
            display: block;
            width: 100%;
          }

          .leaderboard-table colgroup { display: none; }

          .leaderboard-table thead { display: none; }

          .leaderboard-table tbody > tr:not(.table-row),
          .leaderboard-table tbody > tr:not(.table-row) > td {
            display: block;
            width: 100%;
          }

          .leaderboard-table .table-row {
            display: grid;
            grid-template-columns: 44px repeat(4, minmax(0, 1fr));
            gap: 10px 6px;
            margin-bottom: 8px;
            padding: 12px 10px;
            border: 1px solid var(--border);
            border-radius: var(--r-md);
            background: var(--surface);
          }

          .leaderboard-table .current-user-row {
            border-color: var(--accent);
          }

          .leaderboard-table .table-row td {
            display: block !important;
            min-width: 0;
            padding: 0;
            border: 0;
          }

          .leaderboard-table .table-row td:first-child,
          .leaderboard-table .table-row td:last-child {
            padding-right: 0;
            padding-left: 0;
          }

          .leaderboard-table td::before {
            display: block;
            margin-bottom: 2px;
            color: var(--text-3);
            content: attr(data-label);
            font-family: var(--font-ui);
            font-size: 0.56rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-transform: uppercase;
          }

          .leaderboard-table .td-rank {
            grid-column: 1;
            grid-row: 1 / span 2;
            align-self: center;
          }
          .leaderboard-table .td-rank::before,
          .leaderboard-table .td-driver::before { display: none; }

          .leaderboard-table .td-driver { grid-column: 2 / 5; grid-row: 1; }
          .leaderboard-table .td-score { grid-column: 5; grid-row: 1; }
          .leaderboard-table .td-coins { grid-column: 2; grid-row: 2; }
          .leaderboard-table .td-pills { grid-column: 3; grid-row: 2; }
          .leaderboard-table .td-distance { grid-column: 4; grid-row: 2; }
          .leaderboard-table .td-games { grid-column: 5; grid-row: 2; }

          .leaderboard-table .td-score,
          .leaderboard-table .td-coins,
          .leaderboard-table .td-pills,
          .leaderboard-table .td-distance,
          .leaderboard-table .td-games {
            display: block !important;
            text-align: right;
            font-size: 0.72rem;
          }

          .driver-username,
          .driver-realname {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .table-loading,
          .table-error,
          .table-empty {
            display: block;
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .leaderboard-container {
            padding: 10px 12px max(24px, env(safe-area-inset-bottom, 0px) + 12px);
          }

          .leaderboard-header {
            margin-bottom: 14px;
          }

          .leaderboard-header-top {
            margin-bottom: 10px;
          }

          .back-btn {
            width: 44px;
            padding: 0;
          }

          .back-btn span {
            display: none;
          }

          .header-badge {
            min-height: 32px;
            padding: 0 10px;
            font-size: 0.62rem;
          }

          .leaderboard-title {
            margin-bottom: 3px;
            font-size: clamp(1.65rem, 8vw, 2rem);
          }

          .leaderboard-lede {
            font-size: 0.8rem;
          }

          .podium-grid,
          .podium-count-1,
          .podium-count-2,
          .podium-count-3 {
            display: grid;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 8px;
            width: 100%;
            max-width: none;
            margin: 0 0 14px;
          }

          .podium-card {
            display: grid;
            grid-template-columns: 28px 34px minmax(0, 1fr) auto;
            grid-template-rows: auto auto;
            gap: 1px 9px;
            min-height: 64px;
            padding: 9px 11px;
            border-width: 1px;
            border-radius: 14px;
            text-align: left;
          }

          .podium-card.gold {
            order: 1;
            transform: none;
            background: rgba(251, 188, 4, 0.08);
            box-shadow: none;
          }

          .podium-card.silver { order: 2; }
          .podium-card.bronze { order: 3; }

          .podium-rank-badge {
            grid-column: 1;
            grid-row: 1 / 3;
            align-self: center;
            width: 28px;
            height: 28px;
            margin: 0;
            font-size: 0.7rem;
          }

          .podium-avatar-wrap {
            grid-column: 2;
            grid-row: 1 / 3;
            align-self: center;
            width: 34px;
            height: 34px;
            margin: 0;
          }

          .podium-avatar-wrap svg {
            width: 19px;
            height: 19px;
          }

          .podium-username {
            grid-column: 3;
            grid-row: 1;
            align-self: end;
            margin: 0;
            font-size: 0.84rem;
          }

          .podium-realname {
            grid-column: 3;
            grid-row: 2;
            align-self: start;
            margin: 0;
            font-size: 0.66rem;
          }

          .podium-score {
            grid-column: 4;
            grid-row: 1;
            align-self: end;
            margin: 0;
            font-size: 0.88rem;
            white-space: nowrap;
          }

          .podium-sub {
            grid-column: 4;
            grid-row: 2;
            align-self: start;
            justify-content: flex-end;
            gap: 5px;
            font-size: 0.58rem;
            white-space: nowrap;
          }

          .podium-sub > span:nth-child(2) {
            display: none;
          }

          .user-standing-card {
            margin-bottom: 14px;
            border-radius: 14px;
            background: var(--surface);
          }

          .standing-profile {
            padding: 10px 12px;
            background: var(--accent-soft);
          }

          .standing-rank {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
            border-radius: 12px;
            font-size: 0.92rem;
          }

          .standing-username {
            font-size: 0.92rem;
          }

          .standing-realname {
            font-size: 0.7rem;
          }

          .standing-stats-grid {
            background: var(--surface);
          }

          .standing-stat-item {
            min-width: 0;
            padding: 9px 7px 10px;
          }

          .standing-stat-label {
            font-size: 0.5rem;
          }

          .standing-stat-val {
            font-size: 0.76rem;
          }

          .leaderboard-controls {
            gap: 8px;
            margin-bottom: 12px;
          }

          .search-input {
            border-radius: 14px;
          }

          .refresh-btn {
            width: 48px;
            padding: 0;
            border-radius: 14px;
          }

          .refresh-btn span {
            display: none;
          }

          .leaderboard-table .table-row {
            grid-template-columns: 38px repeat(4, minmax(0, 1fr));
            gap: 9px 6px;
            margin-bottom: 10px;
            padding: 11px 10px 10px;
            border-radius: 14px;
          }

          .rank-pill {
            width: 32px;
            height: 32px;
            font-size: 0.72rem;
          }

          .leaderboard-table .td-rank {
            align-self: start;
          }

          .leaderboard-table .td-driver {
            grid-column: 2 / 5;
            align-self: center;
          }

          .driver-username {
            font-size: 0.88rem;
          }

          .driver-realname {
            font-size: 0.68rem;
          }

          .leaderboard-table .td-score {
            grid-column: 5;
            align-self: center;
            font-size: 0.88rem;
            white-space: nowrap;
          }

          .leaderboard-table .td-score::before {
            display: none;
          }

          .leaderboard-table .td-coins,
          .leaderboard-table .td-pills,
          .leaderboard-table .td-distance,
          .leaderboard-table .td-games {
            min-width: 0;
            padding: 7px 5px !important;
            border-radius: 8px;
            background: var(--surface-2);
            color: var(--text);
            font-size: 0.67rem;
            line-height: 1.15;
            text-align: left;
            white-space: nowrap;
          }

          .leaderboard-table .td-coins { grid-column: 2; }
          .leaderboard-table .td-pills { grid-column: 3; }
          .leaderboard-table .td-distance { grid-column: 4; }
          .leaderboard-table .td-games { grid-column: 5; }

          .leaderboard-table td::before {
            margin-bottom: 4px;
            font-size: 0.48rem;
          }

          .table-coin-cell,
          .table-pill-cell {
            justify-content: flex-start;
            gap: 3px;
          }

          .inline-coin-icon {
            margin-right: 0;
          }

          .you-badge {
            font-size: 0.55rem;
          }
        }

        @media (max-width: 480px) {
          .leaderboard-controls {
            align-items: stretch;
          }

          .refresh-btn span {
            display: none;
          }

          .refresh-btn {
            width: 48px;
            padding: 0;
          }
        }

        @media (max-width: 360px) {
          .leaderboard-container {
            padding-inline: 8px;
          }

          .podium-card {
            grid-template-columns: 26px minmax(0, 1fr) auto;
            column-gap: 8px;
          }

          .podium-avatar-wrap {
            display: none;
          }

          .podium-username,
          .podium-realname {
            grid-column: 2;
          }

          .podium-score,
          .podium-sub {
            grid-column: 3;
          }

          .leaderboard-table .table-row {
            grid-template-columns: 38px repeat(2, minmax(0, 1fr));
            grid-template-rows: auto auto auto;
          }

          .leaderboard-table .td-rank {
            grid-column: 1;
            grid-row: 1 / 4;
          }

          .leaderboard-table .td-driver {
            grid-column: 2;
            grid-row: 1;
          }

          .leaderboard-table .td-score {
            grid-column: 3;
            grid-row: 1;
          }

          .leaderboard-table .td-coins {
            grid-column: 2;
            grid-row: 2;
          }

          .leaderboard-table .td-pills {
            grid-column: 3;
            grid-row: 2;
          }

          .leaderboard-table .td-distance {
            grid-column: 2;
            grid-row: 3;
          }

          .leaderboard-table .td-games {
            grid-column: 3;
            grid-row: 3;
          }
        }
      `}</style>
    </main>
  );
};

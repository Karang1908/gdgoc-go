import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './home/Home';
import { Leaderboard } from './leaderboard/Leaderboard';

export function App() {
  const getInitialRoute = (): 'home' | 'leaderboard' => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('leaderboard')) return 'leaderboard';
    return 'home';
  };

  const [currentRoute, setCurrentRoute] = useState<'home' | 'leaderboard'>(getInitialRoute);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: 'home' | 'leaderboard') => {
    setCurrentRoute(route);
    const path = route === 'leaderboard' ? '/leaderboard' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  return (
    <AuthProvider>
      <div className="app-root">
        <Navbar
          currentRoute={currentRoute}
          navigate={navigate}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        <div className="app-main-view">
          {currentRoute === 'home' ? (
            <Home
              navigate={navigate}
              isAuthModalOpen={isAuthModalOpen}
              setIsAuthModalOpen={setIsAuthModalOpen}
            />
          ) : (
            <Leaderboard onBackToGame={() => navigate('home')} />
          )}
        </div>

        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="footer-title">GDG GO — 3D ENDLESS CHASE</span>
              <span className="footer-subtitle">Built for Google Developer Groups on Campus</span>
            </div>
            <div className="footer-links">
              <span>Google Brand Colors • Kenney & Quaternius CC0 Art • Supabase</span>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        .app-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
        }

        .app-main-view {
          flex: 1;
        }

        .app-footer {
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          padding: 24px;
          margin-top: auto;
        }

        .footer-content {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .footer-title {
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.05em;
        }

        .footer-subtitle {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .footer-links {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        @media (max-width: 640px) {
          .footer-content {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </AuthProvider>
  );
}

export default App;

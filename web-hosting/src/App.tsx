import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
    <ThemeProvider>
      <AuthProvider>
        <div className="app-root">
          <Navbar
            currentRoute={currentRoute}
            navigate={navigate}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />

          <main className="app-main-view">
            {currentRoute === 'home' ? (
              <Home
                navigate={navigate}
                isAuthModalOpen={isAuthModalOpen}
                setIsAuthModalOpen={setIsAuthModalOpen}
              />
            ) : (
              <Leaderboard onBackToGame={() => navigate('home')} />
            )}
          </main>

          <footer className="footer">
            <div className="footer-content">
              <span>
                <span className="footer-long">Google Developer Group · </span>
                BITS Pilani Dubai Campus
              </span>
              <span className="footer-dots">
                <i></i><i></i><i></i><i></i>
              </span>
            </div>
          </footer>
        </div>

        <style>{`
          .app-root {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: var(--bg);
            color: var(--text);
            transition: background-color 0.2s var(--ease), color 0.2s var(--ease);
          }

          .app-main-view {
            flex: 1 0 auto;
            width: 100%;
          }

          .footer {
            flex: none;
            margin-top: auto;
            border-top: 2px solid var(--border);
            padding: 18px clamp(16px, 4vw, 40px) calc(18px + env(safe-area-inset-bottom, 0px));
            background: var(--bg);
            color: var(--text-2);
            font-size: 0.875rem;
            transition: background-color 0.2s var(--ease), border-color 0.2s var(--ease);
          }

          .footer-content {
            width: 100%;
            max-width: 1320px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
          }

          .footer span:first-child {
            font-weight: 500;
          }

          @media (max-width: 560px) {
            .footer {
              padding: 14px 20px calc(14px + env(safe-area-inset-bottom, 0px));
              font-size: 0.8125rem;
            }

            .footer-long {
              display: none;
            }
          }
        `}</style>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

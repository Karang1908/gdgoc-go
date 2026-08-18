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
                <span className="footer-long">Google Developer Groups on Campus · </span>
                BITS Pilani Dubai Campus
              </span>
              <span className="footer-dots" aria-hidden="true">
                <i></i><i></i><i></i><i></i>
              </span>
            </div>
          </footer>
        </div>

        <style>{`
          .app-root {
            height: 100dvh;
            max-height: 100dvh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            background: var(--bg);
            color: var(--text);
            overflow: hidden;
            box-sizing: border-box;
            transition: background-color 0.2s var(--ease), color 0.2s var(--ease);
          }

          .app-main-view {
            flex: 1 1 auto;
            min-height: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            box-sizing: border-box;
          }

          .footer {
            flex: 0 0 auto;
            height: 44px;
            border-top: 1px solid var(--border);
            padding: 0 clamp(16px, 4vw, 40px);
            padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));
            background: var(--bg);
            color: var(--text-2);
            font-size: 0.8125rem;
            display: flex;
            align-items: center;
            z-index: 10;
            box-sizing: border-box;
            transition: background-color 0.2s var(--ease), border-color 0.2s var(--ease);
          }

          .footer-content {
            width: 100%;
            max-width: 1280px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }

          .footer span:first-child {
            font-weight: 500;
          }

          .footer-dots {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }

          .footer-dots i {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          .footer-dots i:nth-child(1) { background: var(--g-blue); }
          .footer-dots i:nth-child(2) { background: var(--g-red); }
          .footer-dots i:nth-child(3) { background: var(--g-yellow); }
          .footer-dots i:nth-child(4) { background: var(--g-green); }

          @media (max-width: 600px) {
            .footer {
              height: 38px;
              padding: 0 14px;
              font-size: 0.75rem;
            }

            .footer-long {
              display: none;
            }

            .footer-dots i {
              width: 7px;
              height: 7px;
              gap: 4px;
            }
          }
        `}</style>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

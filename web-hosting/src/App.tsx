import { lazy, Suspense, useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Home } from './home/Home';
import { AuthModal } from './home/AuthModal';
import { InstallPrompt } from './components/InstallPrompt';
import { ScoreQueueSync } from './components/ScoreQueueSync';
import { AppRoute, pathForRoute, routeFromPath } from './lib/routes';

const Leaderboard = lazy(() => import('./leaderboard/Leaderboard').then((module) => ({
  default: module.Leaderboard,
})));

const Controls = lazy(() => import('./controls/Controls').then((module) => ({
  default: module.Controls,
})));

export function App() {
  const getInitialRoute = (): AppRoute => routeFromPath(window.location.pathname);

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    const updateViewport = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      root.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
    };

    const updateDisplayMode = () => {
      const standalone = standaloneQuery.matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      root.classList.toggle('standalone-game', standalone);
    };

    updateViewport();
    updateDisplayMode();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    standaloneQuery.addEventListener?.('change', updateDisplayMode);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      standaloneQuery.removeEventListener?.('change', updateDisplayMode);
    };
  }, []);

  const navigate = (route: AppRoute) => {
    setCurrentRoute(route);
    const path = pathForRoute(route);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <ScoreQueueSync />
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
                setIsAuthModalOpen={setIsAuthModalOpen}
              />
            ) : currentRoute === 'leaderboard' ? (
              <Suspense fallback={<div className="route-loading" role="status">Loading standings…</div>}>
                <Leaderboard onBackToGame={() => navigate('home')} />
              </Suspense>
            ) : (
              <Suspense fallback={<div className="route-loading" role="status">Loading game guide…</div>}>
                <Controls onStartPlaying={() => navigate('home')} />
              </Suspense>
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

          <InstallPrompt />

          {/* App-level so Sign In works from every route, not just home. The
              dialog closes itself on success, so signing in from /leaderboard
              leaves you on /leaderboard with your standing showing. */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            canDismiss={true}
          />
        </div>

        <style>{`
          .app-root {
            position: relative;
            height: 100vh;
            height: 100dvh;
            height: var(--app-height, 100dvh);
            max-height: 100vh;
            max-height: 100dvh;
            max-height: var(--app-height, 100dvh);
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
            height: 52px;
            border-top: 1px solid var(--border);
            padding: 0 clamp(16px, 4vw, 40px);
            padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));
            background: var(--bg);
            color: var(--text-2);
            font-size: 0.85rem;
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

          .route-loading {
            display: grid;
            min-height: 100%;
            place-items: center;
            color: var(--text-2);
            font-weight: 500;
          }

          @media (max-width: 600px), (max-height: 520px) and (pointer: coarse) {
            .footer {
              display: none;
            }
          }

          body.game-active .appbar,
          body.game-active .footer {
            display: none !important;
          }

          body.game-active .app-root,
          body.game-active .app-main-view {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: var(--app-height, 100dvh);
            max-height: none;
            overflow: hidden;
          }

          body.game-active .app-main-view {
            z-index: 9998;
          }
        `}</style>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

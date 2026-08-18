import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface UnityEmbedHandle {
  triggerFullscreen: () => void;
  exitFullscreen: () => void;
}

interface UnityEmbedProps {
  token: string;
  username: string;
  displayName: string;
  carId: string;
}

export const UnityEmbed = forwardRef<UnityEmbedHandle, UnityEmbedProps>(({
  token,
  username,
  displayName,
  carId,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const queryParams = new URLSearchParams({
    token: token || '',
    u: username || '',
    dn: displayName || '',
    car: carId || 'sports',
  });

  const src = `/Build/index.html?${queryParams.toString()}`;

  const triggerFullscreen = () => {
    // 1. Post message to iframe for Unity instance SetFullscreen(1)
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'unityFullscreen' }, '*');
      try {
        const win = iframeRef.current.contentWindow as any;
        if (win.unityInstance && typeof win.unityInstance.SetFullscreen === 'function') {
          win.unityInstance.SetFullscreen(1);
          return;
        }
      } catch {
        // cross-origin safety
      }
    }

    // 2. Fallback to HTML5 fullscreen API on container or iframe
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  const exitFullscreen = () => {
    // 1. Post message to iframe for Unity instance SetFullscreen(0)
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'unityExitFullscreen' }, '*');
      try {
        const win = iframeRef.current.contentWindow as any;
        if (win.unityInstance && typeof win.unityInstance.SetFullscreen === 'function') {
          win.unityInstance.SetFullscreen(0);
        }
      } catch {
        // cross-origin safety
      }
    }

    // 2. Exit document fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  useImperativeHandle(ref, () => ({
    triggerFullscreen,
    exitFullscreen,
  }));

  // Automatically focus the iframe on mount so keyboard controls (WASD, Arrows, Space) work immediately
  useEffect(() => {
    const focusIframe = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.focus();
      }
    };

    const timer = setTimeout(focusIframe, 300);
    window.addEventListener('click', focusIframe);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', focusIframe);
    };
  }, []);

  return (
    <div className="unity-embed-container" ref={containerRef}>
      <iframe
        ref={iframeRef}
        src={src}
        title="GDG Go Game View"
        className="unity-iframe"
        allow="autoplay; fullscreen; focus-without-user-activation; gamepad"
        tabIndex={0}
      />

      <style>{`
        .unity-embed-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 480px;
          max-height: calc(100vh - 140px);
          background: #080B12;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.12);
        }

        .unity-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          outline: none;
        }

        @media (max-width: 768px) {
          .unity-embed-container {
            aspect-ratio: 16 / 9;
            min-height: 380px;
            border-radius: var(--radius-md);
          }
        }
      `}</style>
    </div>
  );
});

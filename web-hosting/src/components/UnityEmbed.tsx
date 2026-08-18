import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Maximize2 } from 'lucide-react';

export interface UnityEmbedHandle {
  triggerFullscreen: () => void;
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
        // cross-origin
      }
    }

    // 2. Fallback to HTML5 fullscreen API on container or iframe
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useImperativeHandle(ref, () => ({
    triggerFullscreen,
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

      {/* Floating button on the canvas with the best experience notice */}
      <button
        className="fullscreen-toggle-btn"
        onClick={triggerFullscreen}
        title="For the best experience, play in full screen"
        aria-label="For the best experience, play in full screen"
      >
        <Maximize2 size={18} />
      </button>

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

        .fullscreen-toggle-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 10;
          background: rgba(18, 23, 34, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: var(--text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .fullscreen-toggle-btn:hover {
          color: #FFFFFF;
          background: rgba(26, 35, 54, 0.95);
          border-color: var(--google-blue);
          transform: scale(1.06);
          box-shadow: 0 6px 18px rgba(66, 133, 244, 0.35);
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

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
    const target = containerRef.current || iframeRef.current;
    if (target) {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (target.requestFullscreen) {
          target.requestFullscreen().catch((err) => {
            console.warn('[UnityEmbed] Fullscreen request error:', err);
          });
        } else if ((target as any).webkitRequestFullscreen) {
          (target as any).webkitRequestFullscreen();
        } else if ((target as any).msRequestFullscreen) {
          (target as any).msRequestFullscreen();
        }
      }
    }

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'unityFullscreen' }, '*');
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'unityExitFullscreen' }, '*');
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
        allowFullScreen={true}
        tabIndex={0}
      />

      <style>{`
        .unity-embed-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 480px;
          max-height: calc(100vh - 140px);
          background: #000000;
          border-radius: var(--r-lg);
          overflow: hidden;
          box-shadow: var(--shadow-2);
        }

        .unity-embed-container:fullscreen,
        .unity-embed-container:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          max-height: none !important;
          aspect-ratio: auto !important;
          border-radius: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #000000 !important;
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
          background: #000000;
        }

        @media (max-width: 768px) {
          .unity-embed-container {
            aspect-ratio: 16 / 9;
            min-height: 380px;
            border-radius: var(--r-md);
          }
        }
      `}</style>
    </div>
  );
});

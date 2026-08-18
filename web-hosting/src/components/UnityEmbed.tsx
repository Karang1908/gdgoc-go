import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { exitFullscreenDisplay, requestFullscreenDisplay } from '../lib/gameDisplay';

export interface UnityEmbedHandle {
  triggerFullscreen: () => void;
  exitFullscreen: () => void;
  getContentWindow: () => Window | null;
}

interface UnityEmbedProps {
  runId: string;
  username: string;
  displayName: string;
  carId: string;
}

export const UnityEmbed = forwardRef<UnityEmbedHandle, UnityEmbedProps>(({
  runId,
  username,
  displayName,
  carId,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const queryParams = new URLSearchParams({
    run: runId,
    u: username || '',
    dn: displayName || '',
    car: carId || 'sports',
  });

  const src = `/Build/index.html?${queryParams.toString()}`;

  const triggerFullscreen = () => {
    const target = containerRef.current?.closest('.game-view-container') as HTMLElement | null ||
      containerRef.current || iframeRef.current;
    if (target) {
      void requestFullscreenDisplay(target);
    }

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'unityFullscreen' }, window.location.origin);
    }

  };

  const exitFullscreen = () => {
    void exitFullscreenDisplay();

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'unityExitFullscreen' }, window.location.origin);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerFullscreen,
    exitFullscreen,
    getContentWindow: () => iframeRef.current?.contentWindow || null,
  }));

  // Automatically focus the iframe on mount so keyboard and touch controls work immediately
  useEffect(() => {
    const focusIframe = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.focus();
      }
    };

    const timer = setTimeout(focusIframe, 300);
    window.addEventListener('click', focusIframe);
    window.addEventListener('touchstart', focusIframe, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', focusIframe);
      window.removeEventListener('touchstart', focusIframe);
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
          height: 100%;
          min-height: 0;
          background: #000000;
          overflow: hidden;
          box-shadow: none;
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
          touch-action: none;
        }
      `}</style>
    </div>
  );
});

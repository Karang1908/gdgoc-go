import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

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
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // 1. Send postMessage to trigger Unity's SetFullscreen(1)
      iframeRef.current.contentWindow.postMessage({ type: 'unityFullscreen' }, '*');

      // 2. Direct call to unityInstance if available
      try {
        const win = iframeRef.current.contentWindow as any;
        if (win.unityInstance && typeof win.unityInstance.SetFullscreen === 'function') {
          win.unityInstance.SetFullscreen(1);
          return;
        }
      } catch {
        // Cross-origin catch
      }

      // 3. Fallback to iframe element native requestFullscreen
      try {
        if (iframeRef.current.requestFullscreen) {
          iframeRef.current.requestFullscreen();
        }
      } catch {
        // Fullscreen fallback
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

      <style>{`
        .unity-embed-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: #080B12;
          overflow: hidden;
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
      `}</style>
    </div>
  );
});

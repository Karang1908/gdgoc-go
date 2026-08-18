import React, { useRef, useEffect } from 'react';

interface UnityEmbedProps {
  token: string;
  username: string;
  displayName: string;
  carId: string;
}

export const UnityEmbed: React.FC<UnityEmbedProps> = ({
  token,
  username,
  displayName,
  carId,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const queryParams = new URLSearchParams({
    token: token || '',
    u: username || '',
    dn: displayName || '',
    car: carId || 'sports',
  });

  const src = `/Build/index.html?${queryParams.toString()}`;

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
};


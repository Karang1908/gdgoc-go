import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.resolve(rootDir, '../unity-project/Build');
const destDir = path.resolve(rootDir, 'public/Build');

console.log('[unity:copy] Checking Unity WebGL build directory...');

const cleanIndexHtml = `<!DOCTYPE html>
<html lang="en-us">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>GDG Go - Web Player</title>
    <link rel="shortcut icon" href="TemplateData/favicon.ico">
    <link rel="stylesheet" href="TemplateData/style.css">
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000000;
        touch-action: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      #unity-container,
      #unity-container.unity-desktop,
      #unity-container.unity-mobile {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #000000 !important;
        transform: none !important;
        left: 0 !important;
        top: 0 !important;
        overflow: hidden !important;
        touch-action: none !important;
      }
      #unity-canvas {
        width: 100% !important;
        height: 100% !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        object-fit: contain !important;
        background: #000000 !important;
        display: block !important;
        touch-action: none !important;
      }
      #unity-footer, #unity-fullscreen-button, #unity-build-title, #unity-logo-title-footer {
        display: none !important;
      }
      #unity-loading-bar {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 100 !important;
        display: none;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 16px !important;
        background: #000000 !important;
        transform: none !important;
        left: 0 !important;
        top: 0 !important;
      }
      #unity-loading-bar.visible {
        display: flex !important;
      }
      #unity-logo { display: none !important; }
      .gdg-loading-mark {
        display: grid;
        grid-template-columns: repeat(4, 14px);
        gap: 8px;
        margin-bottom: 4px;
      }
      .gdg-loading-mark span {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        animation: gdgPulse 1.4s infinite ease-in-out both;
      }
      .gdg-loading-mark span:nth-child(1) { background: #4285f4; animation-delay: -0.45s; }
      .gdg-loading-mark span:nth-child(2) { background: #ea4335; animation-delay: -0.3s; }
      .gdg-loading-mark span:nth-child(3) { background: #fbbc04; animation-delay: -0.15s; }
      .gdg-loading-mark span:nth-child(4) { background: #34a853; animation-delay: 0s; }

      @keyframes gdgPulse {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
        40% { transform: scale(1.1); opacity: 1; }
      }

      .gdg-loading-title {
        color: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif;
        font-size: clamp(20px, 5vw, 26px);
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .gdg-loading-copy {
        color: #9aa0a6;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
      }
      #unity-progress-bar-empty {
        width: min(280px, calc(100vw - 64px)) !important;
        height: 8px !important;
        margin: 8px 0 0 0 !important;
        overflow: hidden !important;
        border-radius: 999px !important;
        background: #202124 !important;
        border: 1px solid #3c4043 !important;
      }
      #unity-progress-bar-full {
        height: 100% !important;
        width: 0%;
        margin: 0 !important;
        border-radius: inherit !important;
        background: linear-gradient(90deg, #4285f4, #34a853) !important;
        transition: width 150ms ease-out !important;
      }
    </style>
  </head>
  <body>
    <div id="unity-container" class="unity-desktop">
      <canvas id="unity-canvas" tabindex="-1"></canvas>
      <div id="unity-loading-bar">
        <div class="gdg-loading-mark" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="gdg-loading-title">GDGoC Go!</div>
        <div class="gdg-loading-copy">Loading the chase…</div>
        <div id="unity-progress-bar-empty">
          <div id="unity-progress-bar-full"></div>
        </div>
      </div>
      <div id="unity-warning"> </div>
    </div>
    <script>
      var canvas = document.querySelector("#unity-canvas");

      function unityShowBanner(msg, type) {
        var warningBanner = document.querySelector("#unity-warning");
        function updateBannerVisibility() {
          warningBanner.style.display = warningBanner.children.length ? 'block' : 'none';
        }
        var div = document.createElement('div');
        div.innerHTML = msg;
        warningBanner.appendChild(div);
        if (type == 'error') div.style = 'background: red; padding: 10px;';
        else {
          if (type == 'warning') div.style = 'background: yellow; padding: 10px;';
          setTimeout(function() {
            warningBanner.removeChild(div);
            updateBannerVisibility();
          }, 5000);
        }
        updateBannerVisibility();
      }

      var buildUrl = "Build";
      var loaderUrl = buildUrl + "/Build.loader.js";
      var coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      var mobilePixelRatio = window.innerWidth >= 768 ? 1.25 : 1;
      var config = {
        arguments: [],
        dataUrl: buildUrl + "/Build.data.unityweb",
        frameworkUrl: buildUrl + "/Build.framework.js.unityweb",
        codeUrl: buildUrl + "/Build.wasm.unityweb",
        streamingAssetsUrl: "StreamingAssets",
        companyName: "GDG",
        productName: "GDG Go",
        productVersion: "1.0",
        showBanner: unityShowBanner,
        devicePixelRatio: coarsePointer
          ? Math.min(window.devicePixelRatio || 1, mobilePixelRatio)
          : Math.min(window.devicePixelRatio || 1, 2),
      };

      var loadingBar = document.querySelector("#unity-loading-bar");
      var progressBarFull = document.querySelector("#unity-progress-bar-full");
      if (loadingBar) {
        loadingBar.classList.add("visible");
      }

      var script = document.createElement("script");
      script.src = loaderUrl;
      script.onload = () => {
        createUnityInstance(canvas, config, (progress) => {
          if (progressBarFull) {
            progressBarFull.style.width = (100 * progress) + "%";
          }
        }).then((unityInstance) => {
          window.unityInstance = unityInstance;
          if (loadingBar) {
            loadingBar.classList.remove("visible");
            loadingBar.style.setProperty("display", "none", "important");
            try { loadingBar.remove(); } catch(e) {}
          }

          // Web Audio starts suspended on iOS and many Android browsers until a gesture.
          function resumeAudio() {
            if (typeof WEBAudio !== 'undefined' && WEBAudio.audioContext && WEBAudio.audioContext.state === 'suspended') {
              WEBAudio.audioContext.resume();
            }
          }
          window.addEventListener('touchstart', resumeAudio, { passive: true });
          window.addEventListener('touchend', resumeAudio, { passive: true });
          window.addEventListener('click', resumeAudio, { passive: true });

          window.addEventListener("message", (event) => {
            if (event.origin !== window.location.origin || event.source !== window.parent) return;
            if (event.data && event.data.type === "unityFullscreen") {
              try { unityInstance.SetFullscreen(1); } catch(e) {}
            } else if (event.data && event.data.type === "unityExitFullscreen") {
              try { unityInstance.SetFullscreen(0); } catch (e) {}
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(function() {});
              }
            }
          });
        }).catch((message) => {
          console.error(message);
        });
      };

      document.body.appendChild(script);
    </script>
  </body>
</html>
`;

if (fs.existsSync(srcDir) && fs.readdirSync(srcDir).length > 0) {
  console.log(`[unity:copy] Copying from ${srcDir} to ${destDir}...`);
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });

  // Overwrite index.html with clean template (no footer, responsive canvas, postMessage handlers)
  fs.writeFileSync(path.join(destDir, 'index.html'), cleanIndexHtml, 'utf8');

  // Also patch style.css to permanently hide footer
  const styleCssPath = path.join(destDir, 'TemplateData/style.css');
  if (fs.existsSync(styleCssPath)) {
    let styleCss = fs.readFileSync(styleCssPath, 'utf8');
    styleCss += `\n#unity-footer, #unity-fullscreen-button, #unity-build-title, #unity-logo-title-footer { display: none !important; }\n#unity-container.unity-desktop { width: 100% !important; height: 100% !important; top: 0 !important; left: 0 !important; transform: none !important; touch-action: none !important; }\n#unity-canvas { width: 100% !important; height: 100% !important; touch-action: none !important; }\n`;
    fs.writeFileSync(styleCssPath, styleCss, 'utf8');
  }

  console.log('[unity:copy] Successfully copied Unity WebGL build to public/Build with clean template.');
} else {
  console.log('[unity:copy] No Unity build found in unity-project/Build.');
}

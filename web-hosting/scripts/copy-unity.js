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
        background: #080B12;
      }
      #unity-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
      }
      #unity-canvas {
        width: 100%;
        height: 100%;
        background: #080B12;
        display: block;
      }
      #unity-footer, #unity-fullscreen-button, #unity-build-title, #unity-logo-title-footer {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div id="unity-container" class="unity-desktop">
      <canvas id="unity-canvas" tabindex="-1"></canvas>
      <div id="unity-loading-bar">
        <div id="unity-logo"></div>
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
      };

      canvas.style.width = "100%";
      canvas.style.height = "100%";

      document.querySelector("#unity-loading-bar").style.display = "block";

      var script = document.createElement("script");
      script.src = loaderUrl;
      script.onload = () => {
        createUnityInstance(canvas, config, (progress) => {
          document.querySelector("#unity-progress-bar-full").style.width = 100 * progress + "%";
        }).then((unityInstance) => {
          window.unityInstance = unityInstance;
          document.querySelector("#unity-loading-bar").style.display = "none";

          window.addEventListener("message", (event) => {
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
    styleCss += `\n#unity-footer, #unity-fullscreen-button, #unity-build-title, #unity-logo-title-footer { display: none !important; }\n#unity-container.unity-desktop { width: 100% !important; height: 100% !important; top: 0 !important; left: 0 !important; transform: none !important; }\n#unity-canvas { width: 100% !important; height: 100% !important; }\n`;
    fs.writeFileSync(styleCssPath, styleCss, 'utf8');
  }

  console.log('[unity:copy] Successfully copied Unity WebGL build to public/Build with clean template.');
} else {
  console.log('[unity:copy] No Unity build found in unity-project/Build.');
}

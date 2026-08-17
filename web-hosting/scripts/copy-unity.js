import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.resolve(rootDir, '../unity-project/Build');
const destDir = path.resolve(rootDir, 'public/Build');

console.log('[unity:copy] Checking Unity WebGL build directory...');

if (fs.existsSync(srcDir) && fs.readdirSync(srcDir).length > 0) {
  console.log(`[unity:copy] Copying from ${srcDir} to ${destDir}...`);
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('[unity:copy] Successfully copied Unity WebGL build to public/Build.');
} else {
  console.log('[unity:copy] No Unity build found in unity-project/Build.');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    // Write a placeholder HTML for development if Unity WebGL is not yet built
    const placeholderHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GDG Go - WebGL Game</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #0d1117;
      color: #fff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 32px;
      max-width: 480px;
    }
    h2 { color: #4285f4; margin-top: 0; }
    p { color: #8b949e; line-height: 1.5; }
    .btn {
      margin-top: 16px;
      background: #4285f4;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:hover { background: #3367d6; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🎮 Unity WebGL Placeholder</h2>
    <p>Unity build not yet exported to <code>unity-project/Build</code>.</p>
    <p>Simulate Game Over message to test the React wrapper:</p>
    <button class="btn" onclick="simulateGameOver()">Simulate Game Over (1,250 pts)</button>
  </div>
  <script>
    const params = new URLSearchParams(window.location.search);
    console.log('[Unity Placeholder] Query params received:', {
      token: params.get('token') ? 'present' : 'none',
      username: params.get('u'),
      displayName: params.get('dn'),
      car: params.get('car')
    });

    function simulateGameOver() {
      const payload = {
        type: 'gameover',
        score: 1250,
        coins: 42,
        distance: 500,
        duration: 35
      };
      console.log('[Unity Placeholder] Sending gameover postMessage:', payload);
      window.parent.postMessage(payload, '*');
    }
  </script>
</body>
</html>`;
    fs.writeFileSync(path.join(destDir, 'index.html'), placeholderHtml, 'utf8');
    console.log('[unity:copy] Created placeholder public/Build/index.html for development & testing.');
  }
}

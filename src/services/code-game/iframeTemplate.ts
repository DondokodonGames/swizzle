export interface IframeAsset {
  id: string;
  dataUrl: string;
  type: 'image' | 'audio';
}

/**
 * Returns an HTML string to be used as `srcdoc` for a sandboxed iframe.
 * The iframe implements SwizzleGameAPI on a Canvas 2D context and executes
 * the user-supplied game code via new Function().
 *
 * Communication protocol (postMessage):
 *   Parent → iframe:  { type: 'INIT', assets: IframeAsset[] }
 *                     { type: 'START' }
 *
 *   iframe → parent:  { type: 'READY' }
 *                     { type: 'GAME_END', result: 'success'|'failure', score?: number }
 *                     { type: 'ERROR', message: string }
 */
export function buildIframeHtml(gameCode: string, maxDurationMs: number): string {
  // Escape backticks so the code can be embedded in a template literal inside the HTML
  const escapedCode = gameCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
</head>
<body>
<canvas id="c" width="1080" height="1920"></canvas>
<script>
(function() {
  'use strict';

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  // ── Asset caches ──────────────────────────────────────────────────────────
  const imageCache = {};   // id → HTMLImageElement
  const audioCache = {};   // id → HTMLAudioElement

  // ── Game loop state ───────────────────────────────────────────────────────
  let startFn = null;
  let updateFn = null;
  const tapHandlers = [];
  const swipeHandlers = [];
  const holdHandlers = [];

  let isRunning = false;
  let rafId = null;
  let lastTimestamp = null;
  let elapsed = 0;
  let currentDelta = 0;
  let audioUnlocked = false;

  // ── Swipe detection state ─────────────────────────────────────────────────
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  let holdTimer = null;
  const SWIPE_MIN_DIST = 30;   // px (canvas coords)
  const SWIPE_MAX_MS   = 500;
  const HOLD_MS        = 400;

  // ── Audio unlock ──────────────────────────────────────────────────────────
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Object.values(audioCache).forEach(function(a) {
      const p = a.play();
      if (p) p.then(function() { a.pause(); a.currentTime = 0; }).catch(function(){});
    });
  }

  // ── Input handling ────────────────────────────────────────────────────────
  function canvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    unlockAudio();
    const t = e.touches[0];
    const pos = canvasCoords(t.clientX, t.clientY);
    touchStartX = pos.x; touchStartY = pos.y; touchStartTime = Date.now();

    // Hold detection
    holdTimer = setTimeout(function() {
      holdTimer = null;
      holdHandlers.forEach(function(fn) { fn(pos.x, pos.y, HOLD_MS / 1000); });
    }, HOLD_MS);
  }, { passive: false });

  canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }

    const t = e.changedTouches[0];
    const pos = canvasCoords(t.clientX, t.clientY);
    const dx = pos.x - touchStartX;
    const dy = pos.y - touchStartY;
    const dt = Date.now() - touchStartTime;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SWIPE_MIN_DIST && dt < SWIPE_MAX_MS) {
      // Tap
      tapHandlers.forEach(function(fn) { fn(pos.x, pos.y); });
    } else if (dist >= SWIPE_MIN_DIST && dt < SWIPE_MAX_MS) {
      // Swipe — determine direction by dominant axis
      var dir;
      if (Math.abs(dx) >= Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      swipeHandlers.forEach(function(fn) { fn(dir); });
    }
  }, { passive: false });

  // Mouse fallback for desktop testing
  canvas.addEventListener('click', function(e) {
    unlockAudio();
    const pos = canvasCoords(e.clientX, e.clientY);
    tapHandlers.forEach(function(fn) { fn(pos.x, pos.y); });
  });

  // ── SwizzleGameAPI implementation ─────────────────────────────────────────
  const game = {
    get canvas() { return { width: 1080, height: 1920 }; },
    get time()   { return { elapsed: elapsed, delta: currentDelta }; },

    onStart:  function(fn) { startFn = fn; },
    onUpdate: function(fn) { updateFn = fn; },
    onTap:    function(fn) { tapHandlers.push(fn); },
    onSwipe:  function(fn) { swipeHandlers.push(fn); },
    onHold:   function(fn) { holdHandlers.push(fn); },

    draw: {
      clear: function(color) {
        ctx.clearRect(0, 0, 1080, 1920);
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1080, 1920);
        }
      },
      image: function(id, x, y, w, h, rotation) {
        const img = imageCache[id];
        if (!img || !img.complete) return;
        ctx.save();
        if (rotation) {
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate(rotation * Math.PI / 180);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
        ctx.restore();
      },
      rect: function(x, y, w, h, color, alpha) {
        ctx.save();
        if (alpha !== undefined) ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      },
      circle: function(x, y, r, color, alpha) {
        ctx.save();
        if (alpha !== undefined) ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      text: function(str, x, y, opts) {
        opts = opts || {};
        ctx.save();
        var size  = opts.size  || 60;
        var color = opts.color || '#ffffff';
        var align = opts.align || 'center';
        var bold  = opts.bold  ? 'bold ' : '';
        var font  = opts.font  || 'sans-serif';
        ctx.font = bold + size + 'px ' + font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(str, x, y);
        ctx.restore();
      },
      line: function(x1, y1, x2, y2, color, lineWidth) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    },

    audio: {
      play: function(id, volume) {
        const a = audioCache[id];
        if (!a) return;
        a.currentTime = 0;
        a.volume = volume !== undefined ? volume : 1.0;
        a.play().catch(function(){});
      },
      bgm: function(id, volume) {
        if (audioCache['__bgm__']) {
          audioCache['__bgm__'].pause();
          audioCache['__bgm__'].currentTime = 0;
        }
        const a = audioCache[id];
        if (!a) return;
        a.volume = volume !== undefined ? volume : 0.5;
        a.loop = true;
        a.play().catch(function(){});
        audioCache['__bgm__'] = a;
      },
      stopBgm: function() {
        if (audioCache['__bgm__']) {
          audioCache['__bgm__'].pause();
          audioCache['__bgm__'].currentTime = 0;
        }
      }
    },

    end: {
      success: function(score) {
        if (!isRunning) return;
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
        parent.postMessage({ type: 'GAME_END', result: 'success', score: score || 0 }, '*');
      },
      failure: function() {
        if (!isRunning) return;
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
        parent.postMessage({ type: 'GAME_END', result: 'failure', score: 0 }, '*');
      }
    },

    random: function(min, max) {
      return min + Math.random() * (max - min);
    }
  };

  // ── Asset loading ─────────────────────────────────────────────────────────
  function loadAssets(assets) {
    var promises = assets.map(function(asset) {
      if (asset.type === 'image') {
        return new Promise(function(resolve) {
          var img = new Image();
          img.onload = function() { imageCache[asset.id] = img; resolve(); };
          img.onerror = function() { resolve(); }; // missing asset → skip silently
          img.src = asset.dataUrl;
        });
      } else {
        // audio: convert data URL to blob URL (CSP-friendly inside sandbox)
        try {
          var parts = asset.dataUrl.split(',');
          var mime  = (parts[0].match(/:(.*?);/) || [])[1] || 'audio/wav';
          var bin   = atob(parts[1]);
          var buf   = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          var blobUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
          var a = new Audio(blobUrl);
          audioCache[asset.id] = a;
        } catch (e) {
          // non-base64 URL — try directly
          audioCache[asset.id] = new Audio(asset.dataUrl);
        }
        return Promise.resolve();
      }
    });
    return Promise.all(promises);
  }

  // ── Message handling ──────────────────────────────────────────────────────
  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'INIT') {
      loadAssets(msg.assets || []).then(function() {
        parent.postMessage({ type: 'READY' }, '*');
      });
    }

    if (msg.type === 'START') {
      isRunning = true;

      // Watchdog: force-end if game runs too long
      setTimeout(function() {
        if (isRunning) game.end.failure();
      }, ${maxDurationMs});

      // Execute game code
      try {
        var userFn = new Function('game', \`${escapedCode}\`);
        userFn(game);
      } catch (err) {
        parent.postMessage({ type: 'ERROR', message: String(err) }, '*');
        return;
      }

      if (startFn) {
        try { startFn(); } catch (err) {
          parent.postMessage({ type: 'ERROR', message: String(err) }, '*');
          return;
        }
      }

      // Game loop
      function loop(ts) {
        if (!isRunning) return;
        if (lastTimestamp !== null) {
          currentDelta = Math.min((ts - lastTimestamp) / 1000, 0.05);
          elapsed += currentDelta;
          if (updateFn) {
            try { updateFn(currentDelta); } catch (err) {
              parent.postMessage({ type: 'ERROR', message: String(err) }, '*');
              isRunning = false;
              return;
            }
          }
        }
        lastTimestamp = ts;
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
    }
  });
})();
</script>
</body>
</html>`;
}

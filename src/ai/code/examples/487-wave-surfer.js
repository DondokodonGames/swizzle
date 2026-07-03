// 487-wave-surfer.js
// 波乗りサーファー — 押し寄せる波のクレストがサーファーに重なる瞬間、上スワイプでライドする
// 操作: 波の白い波頭が来たら上スワイプ（早すぎ/遅すぎると転落）
// 成功: 5回 ライド  失敗: 3回 転落 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、夕暮れの海） ──
  var C = { bg:'#000a20', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WAVE SURFER';
  var HOW_TO_PLAY = 'SWIPE UP WHEN THE FOAMY CREST REACHES THE SURFER';
  var MAX_TIME = 15;
  var NEEDED     = 5;        // 修正2: 10 → 5
  var MAX_FALLS  = 3;        // 修正2: 5 → 3
  var SURFER_X = snap(W * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var waves, particles, surfer, rides, falls, timeLeft, done, nextWave, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#04182a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H * 0.62, '#0c1a40', 0.8); pc(W * 0.85, H * 0.12, 60, C.f, 0.9); game.draw.rect(0, H * 0.62, W, H * 0.38, C.d, 0.9); }

  function spawnWave() { waves.push({ x: W + 200, y: H * 0.62, vx: -(220 + Math.random() * 70 + rides * 8), height: 150 + Math.random() * 100, width: 340 + Math.random() * 160, ridden: false }); }

  function initGame() { waves = []; particles = []; surfer = { y: H * 0.58, vy: 0, riding: false, ridingTimer: 0 }; rides = 0; falls = 0; timeLeft = MAX_TIME; done = false; nextWave = 1.5; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnWave(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rides * 600 + Math.ceil(timeLeft) * 100) : rides * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function crestX(w) { return w.x - w.width * 0.15; }
  function crestY(w) { return w.y - w.height * 0.9; }

  function drawScene() {
    for (var wi = 0; wi < waves.length; wi++) {
      var w = waves[wi], hw = w.width;
      for (var xi = -hw; xi <= hw; xi += 32) { var frac = 1 - Math.abs(xi) / hw, wh = w.height * frac * frac, wx = w.x + xi; if (wx < -20 || wx > W + 20) continue; game.draw.rect(snap(wx) - 16, snap(w.y - wh), 32, wh + 120, C.e, 0.7); }
      var cx = crestX(w), cy = crestY(w); if (cx > -20 && cx < W + 20) { pc(cx, cy, 34, C.g, 0.85); pc(cx, cy, 20, C.e, 0.9); }
    }
    // サーファー
    game.draw.rect(SURFER_X - 40, snap(surfer.y) - 10, 80, 12, C.f, 0.9); pc(SURFER_X, surfer.y - 30, 18, C.c, 0.9); pc(SURFER_X, surfer.y - 52, 14, C.g, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || dir !== 'up') return;
    var hit = false;
    for (var wi = 0; wi < waves.length; wi++) {
      var w = waves[wi]; if (w.ridden) continue;
      if (Math.abs(SURFER_X - crestX(w)) < 170 && Math.abs(surfer.y - crestY(w)) < 220) {
        w.ridden = true; rides++; surfer.riding = true; surfer.ridingTimer = 1.5; surfer.vy = -350; flash = 0.4; flashCol = C.b; resultText = 'RIDE!'; resultTimer = 0.8; game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: SURFER_X, y: surfer.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.7, col: C.g }); }
        hit = true; if (rides >= NEEDED) { finish(true); return; } break;
      }
    }
    if (!hit) { falls++; flash = 0.4; flashCol = C.a; resultText = 'WIPEOUT!'; resultTimer = 0.8; surfer.vy = 100; game.audio.play('se_failure', 0.5); if (falls >= MAX_FALLS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!waves) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'BARREL RIDER!' : 'WIPED OUT', W / 2, H * 0.16, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.22, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.28, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      nextWave -= dt; if (nextWave <= 0) { spawnWave(); nextWave = 1.2 + Math.random() * 1.3; }
      if (surfer.riding) { surfer.ridingTimer -= dt; surfer.vy += 300 * dt; surfer.y += surfer.vy * dt; if (surfer.ridingTimer <= 0) { surfer.riding = false; surfer.vy = 0; } }
      else { surfer.vy += 400 * dt; surfer.y += surfer.vy * dt; }
      var surface = H * 0.60;
      for (var wi = 0; wi < waves.length; wi++) { var w = waves[wi], dc = SURFER_X - w.x; if (Math.abs(dc) < w.width) { var wh = w.height * Math.pow(Math.max(0, 1 - Math.abs(dc) / w.width), 2); surface = Math.min(surface, w.y - wh); } }
      if (surfer.y + 30 >= surface) { surfer.y = surface - 30; surfer.vy = Math.min(0, surfer.vy * -0.2); }
      if (surfer.y < 300) { surfer.y = 300; surfer.vy = 0; }
      for (var wi2 = waves.length - 1; wi2 >= 0; wi2--) { waves[wi2].x += waves[wi2].vx * dt; if (waves[wi2].x < -waves[wi2].width - 200) waves.splice(wi2, 1); }
      if (Math.random() < dt * 8) for (var wi3 = 0; wi3 < waves.length; wi3++) { var cx = crestX(waves[wi3]), cy = crestY(waves[wi3]); if (cx > 0 && cx < W) particles.push({ x: cx, y: cy, vx: -40 + Math.random() * 80, vy: -60, life: 0.5, col: C.g }); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 64, flashCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rides + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#04182a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

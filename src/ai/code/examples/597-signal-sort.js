// 597-signal-sort.js
// シグナルソート — 浮かぶ信号の波形を見極め、下段の同じ波形チャンネルへスワイプで振り分ける
// 操作: 信号をつかんで（スワイプ開始）下の一致するチャンネル帯へスワイプで放り込む
// 成功: 8本 仕分け  失敗: 3本 誤仕分け or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、通信管制） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CH = [C.a, C.e, C.b, C.c], CHDK = ['#1a0800', '#001a1e', '#002200', '#1a1600'];
  var WAVES = [
    function(x, t, a) { return Math.sin(x * 0.06 + t * 4) * a; },
    function(x, t, a) { return Math.sin(x * 0.015 + t) * a; },
    function(x, t, a) { return ((x * 0.02 + t * 2) % (Math.PI * 2) - Math.PI) / Math.PI * a; },
    function(x, t, a) { return Math.sign(Math.sin(x * 0.03 + t * 1.5)) * a; }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL SORT';
  var HOW_TO_PLAY = 'MATCH EACH SIGNAL WAVEFORM · SWIPE IT INTO ITS CHANNEL BAND';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_MISTAKES = 3;      // 修正2: 8 → 3
  var NUM_CH = 4, CH_W = W / 4, ZONE_Y = snap(H * 0.80), ZONE_H = snap(H * 0.16);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var signals, sorted, mistakes, timeLeft, done, particles, flash, flashCol, nextSignal, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var ch = 0; ch < NUM_CH; ch++) {
      game.draw.rect(ch * CH_W + 2, ZONE_Y, CH_W - 4, ZONE_H, CHDK[ch], 0.9); game.draw.rect(ch * CH_W + 2, ZONE_Y, CH_W - 4, 4, CH[ch], 0.8);
      var py = ZONE_Y + ZONE_H / 2;
      for (var xi = 1; xi < 40; xi++) { var wx = ch * CH_W + 8 + xi * (CH_W - 16) / 40, wy = py + WAVES[ch](xi * 8, game.time.elapsed, 18), px = ch * CH_W + 8 + (xi - 1) * (CH_W - 16) / 40, pyy = py + WAVES[ch]((xi - 1) * 8, game.time.elapsed, 18); game.draw.line(px, pyy, wx, wy, CH[ch], 3); }
    }
    for (var di = 1; di < NUM_CH; di++) game.draw.rect(di * CH_W - 1, ZONE_Y, 2, H - ZONE_Y, '#0a1a2a', 0.9);
  }

  function spawnSignal() { signals.push({ x: 140 + Math.random() * (W - 280), y: snap(H * 0.30) + Math.random() * (H * 0.38), channel: Math.floor(Math.random() * NUM_CH), phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.4, placed: false, life: 1.0 }); }

  function initGame() { signals = []; sorted = 0; mistakes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; nextSignal = 0.6; resultText = ''; resultTimer = 0; spawnSignal(); spawnSignal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sorted * 500 + Math.ceil(timeLeft) * 100) : sorted * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < signals.length; si++) {
      var s = signals[si]; if (s.placed) continue; var col = CH[s.channel], waveW = 150, waveH = 40;
      for (var xi = 1; xi < 30; xi++) { var r1 = xi / 30 * waveW, r0 = (xi - 1) / 30 * waveW, wy = s.y + WAVES[s.channel](xi * 6, s.phase, waveH * 0.4), wy0 = s.y + WAVES[s.channel]((xi - 1) * 6, s.phase, waveH * 0.4); game.draw.line(s.x - waveW / 2 + r0, wy0, s.x - waveW / 2 + r1, wy, col, 4); }
      game.draw.rect(s.x - waveW / 2 - 8, s.y - waveH - 8, waveW + 16, waveH * 2 + 16, col, 0.08);
    }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var hit = -1; for (var si = 0; si < signals.length; si++) { var s = signals[si]; if (s.placed) continue; if ((x1 - s.x) * (x1 - s.x) + (y1 - s.y) * (y1 - s.y) < 90 * 90) { hit = si; break; } }
    if (hit < 0) return;
    if (y2 < ZONE_Y) return;
    var tc = Math.max(0, Math.min(NUM_CH - 1, Math.floor(x2 / CH_W))), s2 = signals[hit];
    if (tc === s2.channel) { s2.placed = true; sorted++; flash = 0.2; flashCol = C.b; resultText = 'OK!'; resultTimer = 0.4; game.audio.play('se_success', 0.5); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: (tc + 0.5) * CH_W, y: ZONE_Y + ZONE_H / 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: CH[s2.channel] }); } if (sorted >= NEEDED) { finish(true); return; } }
    else { mistakes++; flash = 0.25; flashCol = C.a; resultText = 'WRONG'; resultTimer = 0.4; game.audio.play('se_failure', 0.3); if (mistakes >= MAX_MISTAKES) { finish(false); return; } }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!signals) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.66, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.70, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SORTED!' : 'CROSS TALK', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      nextSignal -= dt; if (nextSignal <= 0) { if (signals.filter(function(s) { return !s.placed; }).length < 4) spawnSignal(); nextSignal = Math.max(0.4, 0.9 - (MAX_TIME - timeLeft) * 0.02); }
      for (var si = signals.length - 1; si >= 0; si--) { var s = signals[si]; s.phase += s.speed * dt; if (s.placed) { s.life -= dt * 3; if (s.life <= 0) signals.splice(si, 1); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.74), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sorted + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISTAKES; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISTAKES - 1) / 2) * 56) - 10, 224, 20, 20, mi < mistakes ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);

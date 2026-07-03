// 466-reel-stop.js
// リール停止 — スロットの3本のリールを1本ずつタップで止め、同じ絵柄を揃える
// 操作: タップで回転中のリールを左から順に止める（3つ揃えば当たり）
// 成功: 2回 揃える  失敗: 3回 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、スロット筐体） ──
  var C = { bg:'#0a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SYMBOLS = ['7', '$', 'A', 'K', 'Q', 'V'];
  var SYM_COLS = [C.a, C.c, C.b, C.e, C.d, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'REEL STOP';
  var HOW_TO_PLAY = 'TAP TO STOP EACH REEL · LINE UP 3 MATCHING SYMBOLS';
  var MAX_TIME = 20;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_MISS = 3;          // 修正2: 7 → 3
  var REELS = 3, REEL_W = 232, REEL_H = 220, GAP = 20;
  var TOTAL_W = REELS * REEL_W + (REELS - 1) * GAP;
  var OX = snap((W - TOTAL_W) / 2), OY = snap(H * 0.40);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var reels, currentReel, iphase, wins, misses, timeLeft, done, flash, flashCol, particles, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#1a0e00');
  }

  function background() { game.draw.clear(C.bg); }

  function initReels() {
    reels = [];
    for (var i = 0; i < REELS; i++) reels.push({ pos: Math.random() * SYMBOLS.length, speed: 8 + Math.random() * 4, stopped: false, sym: 0 });
    currentReel = 0; iphase = 'spin';
  }

  function initGame() { wins = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.c; particles = []; resultTimer = 0; initReels(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (wins * 1200 + Math.ceil(timeLeft) * 100) : wins * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawMachine() {
    game.draw.rect(OX - 40, OY - 50, TOTAL_W + 80, REEL_H + 100, '#1a0e00', 0.9); game.draw.rect(OX - 40, OY - 50, TOTAL_W + 80, 14, C.f, 0.6);
    for (var i = 0; i < REELS; i++) {
      var rx = OX + i * (REEL_W + GAP);
      game.draw.rect(rx, OY, REEL_W, REEL_H, '#fff8e1', 0.95);
      for (var sy = -1; sy <= 1; sy++) {
        var idx = (Math.floor(reels[i].pos) + sy + SYMBOLS.length * 10) % SYMBOLS.length;
        var frac = reels[i].pos - Math.floor(reels[i].pos), yy = OY + REEL_H / 2 + (sy - frac) * (REEL_H / 3) + 24;
        if (yy < OY + 20 || yy > OY + REEL_H - 10) continue;
        txt(SYMBOLS[idx], rx + REEL_W / 2, yy, 90, SYM_COLS[idx]);
      }
      if (reels[i].stopped) { game.draw.rect(rx, OY, REEL_W, 6, C.c, 0.8); game.draw.rect(rx, OY + REEL_H - 6, REEL_W, 6, C.c, 0.8); }
      if (i === currentReel && !reels[i].stopped && iphase === 'spin' && Math.floor(game.time.elapsed * 8) % 2 === 0) { game.draw.rect(rx - 4, OY - 4, REEL_W + 8, 6, C.c, 0.8); game.draw.rect(rx - 4, OY + REEL_H - 2, REEL_W + 8, 6, C.c, 0.8); }
    }
    game.draw.rect(OX - 40, OY + REEL_H / 2 - 2, TOTAL_W + 80, 4, C.a, 0.7);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'spin') return;
    if (currentReel < REELS && !reels[currentReel].stopped) {
      reels[currentReel].stopped = true; reels[currentReel].sym = Math.round(reels[currentReel].pos) % SYMBOLS.length; game.audio.play('se_tap', 0.5); currentReel++;
      if (currentReel >= REELS) {
        iphase = 'result'; resultTimer = 0;
        var s0 = reels[0].sym, allMatch = reels.every(function(r) { return r.sym === s0; });
        if (allMatch) {
          wins++; flash = 1.0; flashCol = C.c; game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 20; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + REEL_H / 2, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.8, col: C.c }); }
          if (wins >= NEEDED) { finish(true); return; }
        } else {
          misses++; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.5);
          if (misses >= MAX_MISS) { finish(false); return; }
        }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!reels) initGame(); background(); for (var ri = 0; ri < REELS; ri++) if (!reels[ri].stopped) reels[ri].pos += reels[ri].speed * dt; drawMachine();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.76, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.81, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JACKPOT!' : 'NO LUCK', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 1.5;
      for (var i = 0; i < REELS; i++) if (!reels[i].stopped) reels[i].pos += reels[i].speed * dt;
      if (iphase === 'result') { resultTimer += dt; if (resultTimer > 1.3) initReels(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawMachine();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'result') { var s0 = reels[0].sym; txt(reels.every(function(r) { return r.sym === s0; }) ? 'MATCH!' : 'NO MATCH', W / 2, snap(H * 0.74), 56, reels.every(function(r) { return r.sym === s0; }) ? C.c : C.a); }
    else txt('TAP TO STOP', W / 2, snap(H * 0.74), 46, C.f);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(wins + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a0e00');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

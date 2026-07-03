// 517-color-blend.js
// カラーブレンド — 5色の絵の具ボタンを混ぜて、お手本の色に近づけてから決定する
// 操作: 色ボタンをタップして混色、RESETでやり直し、SUBMITで判定
// 成功: 3色 一致  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、調色台。スウォッチは実色） ──
  var C = { bg:'#0a0505', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PAINTS = [ { name: 'RED', r: 220, g: 40, b: 40 }, { name: 'BLU', r: 40, g: 80, b: 220 }, { name: 'YEL', r: 230, g: 200, b: 20 }, { name: 'WHT', r: 240, g: 240, b: 240 }, { name: 'BLK', r: 20, g: 20, b: 20 } ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR BLEND';
  var HOW_TO_PLAY = 'TAP PAINTS TO MIX · RESET TO REDO · SUBMIT WHEN CLOSE';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var BTN_W = 176, BTN_H = 160, GAP = 20, BROW = snap((W - (5 * (176 + 20) - 20)) / 2), BTN_Y = snap(H * 0.68);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mixR, mixG, mixB, tgtR, tgtG, tgtB, score, misses, timeLeft, done, particles, flash, flashCol, feedback, feedbackTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }
  function rgb(r, g, b) { return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')'; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#150a0a');
  }

  function background() { game.draw.clear(C.bg); }

  function colorDist() { return Math.sqrt((mixR - tgtR) * (mixR - tgtR) + (mixG - tgtG) * (mixG - tgtG) + (mixB - tgtB) * (mixB - tgtB)); }

  function genTarget() { tgtR = 40 + Math.floor(Math.random() * 180); tgtG = 40 + Math.floor(Math.random() * 180); tgtB = 40 + Math.floor(Math.random() * 180); mixR = 128; mixG = 128; mixB = 128; }

  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; feedback = ''; feedbackTimer = 0; genTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 700 + Math.ceil(timeLeft) * 100) : score * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    game.draw.rect(W / 2 - 220, H * 0.18, 200, 200, rgb(tgtR, tgtG, tgtB), 0.95); txt('TARGET', W / 2 - 120, H * 0.175, 30, C.c);
    game.draw.rect(W / 2 + 20, H * 0.18, 200, 200, rgb(mixR, mixG, mixB), 0.95); txt('MIX', W / 2 + 120, H * 0.175, 30, C.e);
    var match = Math.max(0, 1 - colorDist() / 150);
    game.draw.rect(W / 2 - 220, H * 0.40, 440, 24, '#150a0a', 0.7); game.draw.rect(W / 2 - 220, H * 0.40, 440 * match, 24, match > 0.7 ? C.b : match > 0.4 ? C.c : C.a, 0.9);
    txt(Math.round(match * 100) + '% MATCH', W / 2, H * 0.44, 40, match > 0.7 ? C.b : C.c);
    for (var i = 0; i < PAINTS.length; i++) { var bx = BROW + i * (BTN_W + GAP), p = PAINTS[i]; game.draw.rect(bx + 4, BTN_Y + 4, BTN_W - 8, BTN_H - 8, rgb(p.r, p.g, p.b), 0.9); game.draw.rect(bx + 4, BTN_Y + 4, BTN_W - 8, 12, C.g, 0.2); txt(p.name, bx + BTN_W / 2, BTN_Y + BTN_H * 0.65, 34, p.name === 'BLK' ? C.g : C.bg); }
    game.draw.rect(W / 2 - 260, H * 0.86, 240, 100, '#2a1010', 0.9); txt('RESET', W / 2 - 140, H * 0.86 + 60, 44, C.g);
    game.draw.rect(W / 2 + 20, H * 0.86, 240, 100, match > 0.5 ? '#0a3020' : '#2a1010', 0.9); txt('SUBMIT', W / 2 + 140, H * 0.86 + 60, 44, C.g);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < PAINTS.length; i++) { var bx = BROW + i * (BTN_W + GAP); if (tx >= bx && tx <= bx + BTN_W && ty >= BTN_Y && ty <= BTN_Y + BTN_H) { var p = PAINTS[i]; mixR = mixR * 0.6 + p.r * 0.4; mixG = mixG * 0.6 + p.g * 0.4; mixB = mixB * 0.6 + p.b * 0.4; game.audio.play('se_tap', 0.3); return; } }
    if (ty >= H * 0.86 && ty <= H * 0.86 + 100) {
      if (tx >= W / 2 - 260 && tx <= W / 2 - 20) { mixR = 128; mixG = 128; mixB = 128; game.audio.play('se_tap', 0.2); return; }
      if (tx >= W / 2 + 20 && tx <= W / 2 + 260) {
        var dist = colorDist();
        if (dist < 55) { score++; flash = 0.5; flashCol = C.b; feedback = dist < 30 ? 'PERFECT!' : 'CLOSE!'; feedbackTimer = 1.0; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.4, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: rgb(tgtR, tgtG, tgtB) }); } if (score >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) genTarget(); }, 600); }
        else { misses++; flash = 0.5; flashCol = C.a; feedback = 'TOO FAR!'; feedbackTimer = 1.0; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (mixR === undefined) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.08, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.55, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTER MIXER!' : 'OFF COLOR', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (feedbackTimer > 0) feedbackTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (feedbackTimer > 0) txt(feedback, W / 2, H * 0.52, 60, flashCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 148, 44, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 200, 20, 20, mi < misses ? C.a : '#150a0a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 259-balance-scale.js
// バランススケール — 天秤の左皿に載った品物と釣り合うよう、右皿に分銅を足して重さをぴたり合わせる
// 操作: 分銅ボタンで右皿に追加、右皿タップで最後の分銅を外す
// 成功: 3回釣り合わせる  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、計量所） ──
  var C = { bg:'#05030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WEIGHTS = [1, 2, 3, 5, 10];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE SCALE';
  var HOW_TO_PLAY = 'ADD WEIGHTS UNTIL BOTH PANS BALANCE';
  var MAX_TIME = 25;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var BASE_X = snap(W / 2), ARM_Y = snap(H * 0.36), ARM_LEN = 280, STR = 90;
  var BTN_Y = snap(H * 0.74), BW = 150, BH = 120;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var objectW, rightW, round, tilt, timeLeft, done, particles, solved, solveTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pline(x1, y1, x2, y2, w, color) { var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 8)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + (x2 - x1) * i / n) - w / 2, snap(y1 + (y2 - y1) * i / n) - w / 2, w, w, color, 0.9); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function rightTotal() { var s = 0; for (var i = 0; i < rightW.length; i++) s += rightW[i]; return s; }

  function startRound() { round++; objectW = 2 + Math.floor(Math.random() * 14); rightW = []; solved = false; }

  function initGame() { round = 0; tilt = 0; timeLeft = MAX_TIME; done = false; particles = []; solved = false; solveTimer = 0; startRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 500 + Math.ceil(timeLeft) * 50) : (round - 1) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScale() {
    pline(BASE_X, ARM_Y, BASE_X, snap(H * 0.54), 10, C.d);
    var lx = BASE_X + Math.cos(Math.PI + tilt) * ARM_LEN, ly = ARM_Y + Math.sin(tilt) * ARM_LEN;
    var rx = BASE_X + Math.cos(tilt) * ARM_LEN, ry = ARM_Y + Math.sin(tilt) * ARM_LEN;
    pline(lx, ly, rx, ry, 8, C.d);
    pline(lx, ly, lx, ly + STR, 4, C.g); pline(rx, ry, rx, ry + STR, 4, C.g);
    game.draw.rect(snap(lx) - 70, snap(ly + STR), 140, 14, C.d, 0.9); game.draw.rect(snap(rx) - 70, snap(ry + STR), 140, 14, C.d, 0.9);
    // 品物（左）
    game.draw.rect(snap(lx) - 36, snap(ly + STR) - 46, 72, 46, C.e, 0.9); txt(objectW, lx, ly + STR - 12, 34, '#000');
    // 分銅（右、積む）
    var sy = ry + STR - 8;
    for (var i = rightW.length - 1; i >= 0; i--) { game.draw.rect(snap(rx) - 30, snap(sy - 28), 60, 28, C.c, 0.9); txt(rightW[i], rx, sy - 6, 22, '#000'); sy -= 28; }
    txt('R:' + rightTotal(), rx + 100, ry + STR, 34, C.c);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || solved) return;
    for (var wi = 0; wi < WEIGHTS.length; wi++) { var bx = 40 + wi * (BW + 16); if (x >= bx && x < bx + BW && y >= BTN_Y && y < BTN_Y + BH) { rightW.push(WEIGHTS[wi]); game.audio.play('se_tap', 0.3); checkBalance(); return; } }
    // 右皿タップで最後の分銅を外す
    if (x > W / 2 && y > H * 0.4 && y < H * 0.66 && rightW.length > 0) { rightW.pop(); game.audio.play('se_tap', 0.25); }
  });

  function checkBalance() {
    if (rightTotal() === objectW) {
      solved = true; solveTimer = 0.8; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: ARM_Y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6 }); }
      if (round >= NEEDED) { finish(true); return; }
    }
  }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); objectW = 5; rightW = [5]; tilt = 0; drawScale();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BALANCED!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var target = Math.max(-0.4, Math.min(0.4, (rightTotal() - objectW) * 0.03));
      tilt += (target - tilt) * 8 * dt;
      if (solved) { solveTimer -= dt; if (solveTimer <= 0) startRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScale();
    if (Math.abs(tilt) < 0.02) txt('BALANCED', BASE_X, ARM_Y - 40, 40, C.b);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.b, particles[pp2].life * 1.6);
    // 分銅ボタン
    for (var wi = 0; wi < WEIGHTS.length; wi++) { var bx = 40 + wi * (BW + 16); game.draw.rect(bx, BTN_Y, BW, BH, C.c, 0.6); game.draw.rect(bx, BTN_Y, BW, 8, C.g, 0.4); txt(WEIGHTS[wi] + '', bx + BW / 2, BTN_Y + BH / 2 + 16, 46, '#000'); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('ROUND ' + round + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 297-coin-flip.js
// コインの予言者 — 空中のコインが着地する前に、表(HEADS)か裏(TAILS)かをスワイプで予言する
// 操作: 上スワイプで表、下スワイプで裏を予言
// 成功: 5回中3回以上的中  失敗: 3回はずす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ゴールドコイン） ──
  var C = { bg:'#0c0a02', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', gold:'#ffb020' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN ORACLE';
  var HOW_TO_PLAY = 'SWIPE UP = HEADS · DOWN = TAILS · BEFORE IT LANDS';
  var MAX_TIME = 15;
  var MAX_TOTAL = 5;         // 修正2: 20 → 5
  var NEEDED    = 3;         // 5回中3回的中
  var MAX_WRONG = 3;         // 修正2: 7 → 3
  var CX = snap(W / 2), REST_Y = snap(H * 0.66);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var coinY, coinVY, flipA, isHeads, prediction, phase, bounce, resultTimer, correct, wrong, total, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1408');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.72), W, H, '#161005', 0.9); game.draw.rect(0, snap(H * 0.72), W, 8, C.gold, 0.4); }

  function throwCoin() { coinY = REST_Y; coinVY = -1400; flipA = 0; isHeads = Math.random() < 0.5; prediction = null; phase = 'thrown'; bounce = 0; game.audio.play('se_tap', 0.25); }

  function initGame() { correct = 0; wrong = 0; total = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; phase = 'idle'; coinY = REST_Y; flipA = 0; isHeads = true; prediction = null; setTimeout(function() { if (state === S.PLAYING && !done) throwCoin(); }, 400); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 80) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCoin() {
    var scaleX = Math.abs(Math.cos(flipA)), r = 88, cw = r * 2 * Math.max(0.1, scaleX);
    var faceUp = Math.cos(flipA) > 0, col = faceUp ? C.gold : C.f;
    for (var yy = -r; yy <= r; yy += 8) { var half = cw / 2 * Math.sqrt(Math.max(0, 1 - (yy / r) * (yy / r))); if (half < 4) continue; game.draw.rect(snap(CX - half), snap(coinY + yy), snap(half * 2), 8, col, 0.95); }
    if (cw > 60) txt(faceUp ? 'H' : 'T', CX, coinY + 16, 56, '#000');
    // 影
    game.draw.rect(snap(CX - 60), REST_Y + 100, 120, 12, '#000', 0.3 * Math.max(0.2, 1 - (REST_Y - coinY) / 500));
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || phase !== 'thrown' || prediction !== null) return;
    if (d === 'up') { prediction = 'heads'; game.audio.play('se_tap', 0.3); }
    else if (d === 'down') { prediction = 'tails'; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); flipA += dt * 3; coinY = REST_Y - 40; drawCoin();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORACLE!' : 'CURSED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(correct >= NEEDED); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (phase === 'thrown') {
        coinVY += 2200 * dt; coinY += coinVY * dt; flipA += dt * 12;
        if (coinY >= REST_Y && coinVY > 0) {
          bounce++;
          if (bounce >= 2) {
            coinY = REST_Y; coinVY = 0; phase = 'landing'; resultTimer = 0.9;
            var ok = prediction !== null && (prediction === 'heads') === isHeads;
            if (ok) { correct++; fbText = 'RIGHT!'; fbCol = C.b; game.audio.play('se_success', 0.5); for (var pk = 0; pk < 8; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: REST_Y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 - 100, life: 0.6, col: C.c }); } }
            else { wrong++; fbText = 'WRONG!'; fbCol = C.a; game.audio.play('se_failure', 0.4); }
            fbTimer = 0.9; total++;
            if (wrong >= MAX_WRONG) { finish(false); return; }
            if (correct >= NEEDED) { finish(true); return; }
            if (total >= MAX_TOTAL) { finish(correct >= NEEDED); return; }
          } else { coinVY = -coinVY * 0.4; coinY = REST_Y; }
        }
      } else if (phase === 'landing') {
        resultTimer -= dt; flipA = isHeads ? 0 : Math.PI;
        if (resultTimer <= 0) { phase = 'idle'; setTimeout(function() { if (state === S.PLAYING && !done) throwCoin(); }, 200); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    txt('UP = HEADS', W / 2, snap(H * 0.28), 40, prediction === 'heads' ? C.e : '#66557a');
    txt('DOWN = TAILS', W / 2, snap(H * 0.86), 40, prediction === 'tails' ? C.e : '#66557a');
    drawCoin();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (prediction !== null && phase === 'thrown') txt('CALLED ' + (prediction === 'heads' ? 'HEADS' : 'TAILS'), W / 2, snap(H * 0.5), 46, C.d);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.55), 60, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED + '   (' + total + '/' + MAX_TOTAL + ')', W / 2, 168, 46, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#1a1408');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);

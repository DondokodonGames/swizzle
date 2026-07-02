// 350-coin-flip.js
// コインフリップ — 弾く前に表(H)か裏(T)かを左右タップで予言し、当て続けてスコアを稼ぐ
// 操作: 画面左タップ=表(HEADS)、右タップ=裏(TAILS)
// 成功: 3回的中  失敗: 3回連続ハズレ or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ゴールドコイン） ──
  var C = { bg:'#0c0a02', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', gold:'#ffb020' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN FLIP';
  var HOW_TO_PLAY = 'TAP LEFT = HEADS · RIGHT = TAILS · CALL IT';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var MAX_MISS = 3;          // 修正2: 連続5 → 3
  var FLIP_T = 1.0, CY = snap(H * 0.44), CR = 140;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, flipT, flipA, result, choice, correct, combo, missStreak, timeLeft, done, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1408');
  }

  function background() { game.draw.clear(C.bg); }

  function drawCoin(faceUp, spin) {
    var scaleX = Math.abs(Math.cos(spin)), cw = CR * 2 * Math.max(0.1, scaleX), up = faceUp;
    for (var yy = -CR; yy <= CR; yy += 8) { var half = cw / 2 * Math.sqrt(Math.max(0, 1 - (yy / CR) * (yy / CR))); if (half < 4) continue; game.draw.rect(snap(W / 2 - half), snap(CY + yy), snap(half * 2), 8, up ? C.gold : C.f, 0.95); }
    if (cw > 80) txt(up ? 'H' : 'T', W / 2, CY + 26, 96, '#000');
  }

  function startFlip(ch) { choice = ch; phase = 'flip'; flipT = 0; flipA = 0; result = Math.random() < 0.5 ? 0 : 1; game.audio.play('se_tap', 0.4); }

  function initGame() { phase = 'predict'; flipT = 0; flipA = 0; result = 0; choice = -1; correct = 0; combo = 0; missStreak = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + combo * 100 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function endFlip() {
    phase = 'result'; var won = choice === result;
    if (won) { correct++; combo++; missStreak = 0; fbText = combo > 2 ? combo + ' STREAK!' : 'RIGHT!'; fbCol = C.b; game.audio.play('se_success', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: CY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); } if (correct >= NEEDED) { finish(true); return; } }
    else { combo = 0; missStreak++; fbText = 'WRONG!'; fbCol = C.a; game.audio.play('se_failure', 0.3); if (missStreak >= MAX_MISS) { finish(false); return; } }
    fbTimer = 0.7;
    setTimeout(function() { if (!done) phase = 'predict'; }, 700);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'predict') return;
    startFlip(x < W / 2 ? 0 : 1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawCoin(Math.floor(game.time.elapsed * 2) % 2 === 0, game.time.elapsed * 3);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
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
      txt(resultSuccess ? 'LUCKY!' : 'CURSED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      if (phase === 'flip') { flipT += dt; flipA += dt * 15 * (1 + flipT * 2); if (flipT >= FLIP_T) { flipA = result === 0 ? 0 : Math.PI; endFlip(); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (phase === 'predict') { game.draw.rect(0, snap(H * 0.70), W / 2 - 4, snap(H * 0.22), '#161005', 0.7); game.draw.rect(W / 2 + 4, snap(H * 0.70), W / 2 - 4, snap(H * 0.22), '#161005', 0.7); txt('HEADS', W * 0.25, snap(H * 0.80), 56, C.gold); txt('TAILS', W * 0.75, snap(H * 0.80), 56, C.e); txt('< TAP', W * 0.25, snap(H * 0.88), 32, C.g); txt('TAP >', W * 0.75, snap(H * 0.88), 32, C.g); }
    if (phase === 'flip') drawCoin(Math.cos(flipA) > 0 ? result === 0 : result === 1, flipA);
    else drawCoin(result === 0, phase === 'result' ? flipA : 0);
    if (phase === 'predict') txt('?', W / 2, CY + 26, 96, '#4a3a10');
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.64), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missStreak ? C.a : '#1a1408');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);

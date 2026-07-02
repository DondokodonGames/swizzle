// 429-sumo-push.js
// 相撲押し出し — 左右交互に素早くタップしてパワーを溜め、相手力士を土俵の外へ押し出す
// 操作: 画面左右を交互に連打（テンポよく交互に押すほどコンボで強く押せる）
// 成功: 相手を2回 押し出す  失敗: 自分が2回 押し出される or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、土俵） ──
  var C = { bg:'#1a0a00', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', ring:'#c88030' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SUMO PUSH';
  var HOW_TO_PLAY = 'TAP LEFT-RIGHT ALTERNATELY TO BUILD POWER · SHOVE THE RIVAL OUT';
  var MAX_TIME = 20;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var RING_R = 320, CX = snap(W / 2), CY = snap(H * 0.50);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pX, eX, pPower, velocity, lastSide, combo, comboTimer, pWins, eWins, timeLeft, done, particles, flash, flashCol, roundAnim, roundText;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.08) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1400');
  }

  function background() { game.draw.clear(C.bg); pc(CX, CY, RING_R, C.ring, 0.6); pc(CX, CY, RING_R - 20, '#e0c080', 0.4); ring(CX, CY, RING_R, '#8a5020', 0.8); game.draw.rect(CX - 2, CY - RING_R, 4, RING_R * 2, '#8a5020', 0.6); }

  function resetRound() { pX = CX - 100; eX = CX + 100; pPower = 0; velocity = 0; lastSide = -1; combo = 0; comboTimer = 0; }

  function initGame() { pWins = 0; eWins = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; roundAnim = 0; roundText = ''; resetRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (pWins * 800 + Math.ceil(timeLeft) * 100) : pWins * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function checkOut() {
    var changed = false;
    if (pX < CX - RING_R + 50) { eWins++; flash = 0.8; flashCol = C.a; roundText = 'PUSHED OUT'; game.audio.play('se_failure', 0.6); changed = true; }
    else if (eX > CX + RING_R - 50) { pWins++; flash = 0.8; flashCol = C.b; roundText = 'WIN!'; game.audio.play('se_success', 0.7); for (var k = 0; k < 12; k++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: eX, y: CY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.7, col: C.c }); } changed = true; }
    if (changed) { roundAnim = 1.0; if (pWins >= NEEDED) { finish(true); return; } if (eWins >= NEEDED) { finish(false); return; } setTimeout(function() { if (!done && state === S.PLAYING) { resetRound(); roundAnim = 0; } }, 900); }
  }

  function drawWrestlers() {
    var es = 58 + Math.sin(game.time.elapsed * 3) * 4; pc(eX, CY, es, C.a, 0.9); pc(eX, CY - 28, 30, C.a, 0.8); game.draw.rect(snap(eX - 24), snap(CY - 10), 48, 12, '#8a1010', 0.9);
    var ps = 58 + pPower * 0.1; pc(pX, CY, ps, C.e, 0.9); pc(pX, CY - 28, 30, C.e, 0.8); game.draw.rect(snap(pX - 24), snap(CY - 10), 48, 12, '#104080', 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var side = x < W / 2 ? 0 : 1;
    if (side === lastSide) combo = Math.max(0, combo - 1); else { combo++; lastSide = side; comboTimer = 0.6; }
    var power = 1 + combo * 0.3; pPower += power * 15; velocity += power * 25; game.audio.play('se_tap', 0.2 + Math.min(0.4, combo * 0.05));
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pX === undefined) initGame(); background(); drawWrestlers();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawWrestlers();
      txt(resultSuccess ? 'YOKOZUNA!' : 'DEFEATED', W / 2, H * 0.20, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.26, 56, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.88, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (roundAnim > 0) roundAnim -= dt * 1.5;
      comboTimer -= dt; if (comboTimer <= 0) combo = Math.max(0, combo - 1);
      var aiPush = (20 + (MAX_TIME - timeLeft) * 1.2) * dt; velocity -= aiPush * (1 + (pX - (CX - 100)) / 300);
      velocity *= (1 - dt * 2.5); var pd = velocity * dt; pX += pd; eX += pd;
      var dist = eX - pX; if (dist < 160) { var ov = (160 - dist) / 2; pX -= ov; eX += ov; }
      checkOut(); if (done) return;
      pPower *= (1 - dt * 1.5);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    drawWrestlers();
    // パワーバー
    var pr = Math.min(1, pPower / 200); game.draw.rect(60, snap(H * 0.80), W - 120, 24, '#2a1400', 0.8); game.draw.rect(60, snap(H * 0.80), (W - 120) * pr, 24, C.b, 0.85);
    txt(combo > 0 ? 'COMBO x' + combo : '< TAP  >  TAP >', W / 2, snap(H * 0.84), 40, combo > 0 ? C.c : '#998');
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (roundAnim > 0) txt(roundText, W / 2, H / 2 - 100, 80, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(pWins + ' - ' + eWins, W / 2, 168, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);

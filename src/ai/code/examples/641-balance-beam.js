// 641-balance-beam.js
// バランスビーム — 落ちてくる重りを左右どちらに置くか選び、シーソーの水平を保つ
// 操作: 画面左タップで左、右タップで右へ重りを置く。傾き過ぎないよう釣り合わせる
// 成功: 水平ゾーンを通算12秒 維持  失敗: 3回 傾き過ぎ or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、天秤） ──
  var C = { bg:'#050810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE BEAM';
  var HOW_TO_PLAY = 'TAP LEFT OR RIGHT TO DROP EACH WEIGHT · KEEP THE BEAM LEVEL';
  var MAX_TIME = 22;
  var NEEDED_SAFE = 12;      // 修正2: 30 → 12
  var MAX_TILT = 3;
  var CX = W / 2, PIVOT_Y = snap(H * 0.52), BEAM_HALF = 360, BEAM_H = 28, MAX_ANGLE = Math.PI / 5, SAFE_ANGLE = Math.PI / 9;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, angVel, leftMass, rightMass, incomingItem, incomingTimer, safeTime, tiltCount, timeLeft, done, flash, flashCol, stars;
  var INCOMING_INTERVAL = 1.8;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < size; i += 8) { var w = size - i; if (dir === 'left') game.draw.rect(cx - size / 2 + i, cy - w / 2, 8, w, color); else game.draw.rect(cx + size / 2 - i - 8, cy - w / 2, 8, w, color); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0d1a');
  }

  function background() { game.draw.clear(C.bg); for (var st = 0; st < stars.length; st++) { var s = stars[st]; game.draw.rect(snap(s.x), snap(s.y), 8, 8, C.g, 0.2 + Math.sin(game.time.elapsed + s.p) * 0.1); } }

  function spawnIncoming() { incomingItem = { mass: 1 + Math.floor(Math.random() * 4), y: H * 0.14 }; incomingTimer = INCOMING_INTERVAL; }

  function initGame() { angle = 0; angVel = 0; leftMass = 0; rightMass = 0; incomingItem = null; incomingTimer = 0; safeTime = 0; tiltCount = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.a; stars = []; for (var i = 0; i < 25; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.45, p: Math.random() * 6 }); spawnIncoming(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(safeTime) * 300 + Math.ceil(timeLeft) * 100) : Math.floor(safeTime) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function placeWeight(side) {
    if (!incomingItem) return;
    if (side === 'left') leftMass += incomingItem.mass; else rightMass += incomingItem.mass;
    game.audio.play('se_tap', 0.2); incomingItem = null; spawnIncoming();
  }

  function drawScene() {
    pc(CX, PIVOT_Y, 24, C.d, 0.9); game.draw.rect(CX - 20, PIVOT_Y + 20, 40, 80, C.d, 0.8); game.draw.rect(CX - 60, PIVOT_Y + 100, 120, 20, C.d, 0.7);
    var cos = Math.cos(angle), sin = Math.sin(angle);
    game.draw.line(CX - cos * BEAM_HALF, PIVOT_Y - sin * BEAM_HALF, CX + cos * BEAM_HALF, PIVOT_Y + sin * BEAM_HALF, C.e, BEAM_H);
    var lE = { x: CX - cos * BEAM_HALF, y: PIVOT_Y - sin * BEAM_HALF }, rE = { x: CX + cos * BEAM_HALF, y: PIVOT_Y + sin * BEAM_HALF };
    pc(lE.x, lE.y, 26, C.d, 0.8); pc(rE.x, rE.y, 26, C.d, 0.8);
    txt(leftMass + '', lE.x, lE.y + 12, 40, leftMass > rightMass ? C.a : C.b);
    txt(rightMass + '', rE.x, rE.y + 12, 40, rightMass > leftMass ? C.a : C.b);
    // balance meter
    game.draw.rect(CX - 200, snap(H * 0.78), 400, 18, '#0a0d1a', 0.8);
    pc(CX + (angle / MAX_ANGLE) * 200, H * 0.78 + 9, 16, Math.abs(angle) > SAFE_ANGLE ? C.a : C.b, 0.95);
    game.draw.rect(snap(CX) - 2, snap(H * 0.78), 4, 18, C.g, 0.8);
    if (incomingItem) { pc(CX, incomingItem.y, 42, C.f, 0.9); txt(incomingItem.mass + '', CX, incomingItem.y + 14, 50, '#001018'); arrow(W * 0.2, incomingItem.y, 50, 'left', C.e); arrow(W * 0.8, incomingItem.y, 50, 'right', C.e); }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !incomingItem) return;
    placeWeight(tx < W / 2 ? 'left' : 'right');
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT BALANCE!' : 'TIPPED OVER', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      incomingTimer -= dt; if (incomingTimer <= 0 && !incomingItem) spawnIncoming();
      var torque = (leftMass - rightMass) * 0.12; angVel += torque * dt; angVel *= (1 - dt * 2.5); angle += angVel * dt;
      angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
      if (Math.abs(angle) < SAFE_ANGLE) { safeTime += dt; if (safeTime >= NEEDED_SAFE) { finish(true); return; } }
      if (Math.abs(angle) >= MAX_ANGLE * 0.85) {
        tiltCount++; flash = 0.4; game.audio.play('se_failure', 0.3); leftMass = rightMass = 0; angVel = 0; angle *= 0.3;
        if (tiltCount >= MAX_TILT) { finish(false); return; }
      }
      if (incomingItem) incomingItem.y += 200 * dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    // safe-time progress
    var pr = Math.min(1, safeTime / NEEDED_SAFE);
    game.draw.rect(W / 2 - 200, snap(H * 0.86), 400, 20, '#0a0d1a', 0.7);
    game.draw.rect(W / 2 - 200, snap(H * 0.86), 400 * pr, 20, C.b, 0.9);
    txt(Math.floor(safeTime) + 's / ' + NEEDED_SAFE + 's', W / 2, snap(H * 0.86) + 44, 32, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    for (var ti = 0; ti < MAX_TILT; ti++) game.draw.rect(snap(W / 2 + (ti - (MAX_TILT - 1) / 2) * 56) - 10, 168, 20, 20, ti < tiltCount ? C.a : '#0a0d1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);

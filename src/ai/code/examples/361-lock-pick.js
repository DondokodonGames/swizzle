// 361-lock-pick.js
// ロックピック — 揺れる鍵穴のテンションが緑ゾーン(ピンの位置)に来た瞬間にタップしてピンを固定する
// 操作: テンションメーターが高い瞬間にタップしてピンをセット
// 成功: 3つの鍵を開ける  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、金庫破り） ──
  var C = { bg:'#0a0a08', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', lock:'#444' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LOCK PICK';
  var HOW_TO_PLAY = 'TAP WHEN THE TENSION METER PEAKS IN THE GREEN';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var NUM_PINS = 4, ROT_SPEED = 1.4, LX = snap(W / 2), LY = snap(H * 0.44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lockAngle, dir, pins, curPin, opened, openAnim, locks, timeLeft, done, particles, fbText, fbCol, fbTimer, vibrate;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a12');
  }

  function background() { game.draw.clear(C.bg); }

  function setupLock() { pins = []; for (var i = 0; i < NUM_PINS; i++) pins.push({ target: (Math.PI * 0.3 + i * 0.2) * (Math.random() < 0.5 ? 1 : -1), win: 0.2, set: false }); curPin = 0; lockAngle = -Math.PI; dir = 1; opened = false; openAnim = 0; }

  function initGame() { locks = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; vibrate = 0; setupLock(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (locks * 700 + Math.ceil(timeLeft) * 100) : locks * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function nearness() { if (curPin >= NUM_PINS) return 0; var p = pins[curPin], d = Math.abs(lockAngle - p.target); while (d > Math.PI) d = Math.abs(d - Math.PI * 2); return 1 - Math.min(1, d / (Math.PI * 0.5)); }

  function drawLock() {
    var vx = vibrate > 0 ? (Math.floor(game.time.elapsed * 30) % 2 ? 8 : -8) : 0, lx = LX + vx;
    game.draw.rect(lx - 140, LY - 110, 280, 230, C.lock, 0.9); game.draw.rect(lx - 140, LY - 110, 280, 12, '#666', 0.4);
    ring(lx, LY - 210, 66, C.lock, 0.9); pc(lx, LY - 210, 40, opened ? C.b : '#111', 0.9);
    pc(lx, LY, 58, '#111', 0.95);
    var kx = lx + Math.cos(lockAngle) * 40, ky = LY + Math.sin(lockAngle) * 40; pc(kx, ky, 12, C.g, 0.9);
    for (var i = 0; i < NUM_PINS; i++) { var px = lx - (NUM_PINS - 1) * 24 + i * 48, py = LY + 84, on = pins[i] && pins[i].set, cur = i === curPin; pc(px, py, 16, on ? C.b : cur ? C.c : C.lock, 0.9); if (cur && !on) ring(px, py, 22, C.c, 0.4); }
  }

  function drawGauge() {
    var n = nearness(), col = n > 0.75 ? C.b : n > 0.45 ? C.c : C.e;
    game.draw.rect(snap(LX - 200), snap(LY - 170), 400, 26, '#1a1a12', 0.9);
    game.draw.rect(snap(LX - 200) + snap(400 * 0.75), snap(LY - 170) - 4, snap(400 * 0.25), 34, C.b, 0.25);
    game.draw.rect(snap(LX - 200), snap(LY - 170), snap(400 * n), 26, col, 0.9);
    if (n > 0.78) txt('NOW!', LX, snap(LY - 200), 44, C.b);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || opened) return;
    var p = pins[curPin], d = Math.abs(lockAngle - p.target); while (d > Math.PI) d = Math.abs(d - Math.PI * 2);
    if (d < p.win) {
      p.set = true; curPin++; vibrate = 0.2; game.audio.play('se_tap', 0.5);
      for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: LX, y: LY, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); }
      if (curPin >= NUM_PINS) { opened = true; openAnim = 1.0; locks++; fbText = 'UNLOCKED!'; fbCol = C.b; fbTimer = 0.9; game.audio.play('se_success', 0.8); for (var k2 = 0; k2 < 15; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: LX, y: LY, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, life: 0.7, col: C.b }); } if (locks >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) setupLock(); }, 800); }
    } else { fbText = 'SLIP!'; fbCol = C.a; fbTimer = 0.6; vibrate = 0.4; game.audio.play('se_failure', 0.3); if (curPin > 0) { curPin--; pins[curPin].set = false; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawLock();
      txt(GAME_TITLE, W / 2, H * 0.72, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.78, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRACKED!' : 'JAMMED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt; if (openAnim > 0) openAnim -= dt * 1.5; if (vibrate > 0) vibrate -= dt;
      if (!opened) { lockAngle += dir * ROT_SPEED * dt; if (lockAngle > Math.PI * 1.2) dir = -1; if (lockAngle < -Math.PI * 1.2) dir = 1; if (nearness() > 0.8) vibrate = Math.max(vibrate, 0.05); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawLock();
    if (!opened) drawGauge();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, LX, snap(LY + 170), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(locks + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

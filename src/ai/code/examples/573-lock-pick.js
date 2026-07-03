// 573-lock-pick.js
// ロックピック — 鍵穴のピンを探針で押し上げ、セット位置で右スワイプして固定し開錠する
// 操作: 上下スワイプで探針を動かし、ピンをセット帯に合わせて「右スワイプ」で固定。テンション超過で戻る
// 成功: 錠前 2個 開錠  失敗: 3回 失敗 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、開錠工房） ──
  var C = { bg:'#0a0a12', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LOCK PICK';
  var HOW_TO_PLAY = 'SWIPE TO PROBE PINS · ALIGN TO THE SET ZONE · SWIPE RIGHT TO SET';
  var MAX_TIME = 25;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var MAX_FAIL = 3;          // 修正2: 10 → 3
  var NUM_PINS = 4, PIN_SPACING = 130, PIN_START_X = (W - (4 - 1) * 130) / 2, KEYHOLE_Y = snap(H * 0.36), PIN_H = 120, SET_ZONE = 24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pins, probe, openCount, fails, timeLeft, done, particles, flash, flashCol, openAnim, tension;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#12121a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(W / 2 - 300, KEYHOLE_Y - 60, 600, PIN_H + 120, '#1a2432', 0.9); game.draw.rect(PIN_START_X - 70, KEYHOLE_Y - 4, (NUM_PINS - 1) * PIN_SPACING + 140, PIN_H + 8, '#050d14', 0.95); }

  function initLock() { pins = []; for (var i = 0; i < NUM_PINS; i++) pins.push({ x: PIN_START_X + i * PIN_SPACING, y: KEYHOLE_Y + PIN_H * 0.8, target: PIN_H * 0.2 + Math.random() * PIN_H * 0.5, set: false, wobble: 0, springBack: 0 }); probe = { x: W / 2, y: KEYHOLE_Y + PIN_H * 0.5 }; tension = 0; }

  function countSet() { var n = 0; for (var i = 0; i < pins.length; i++) if (pins[i].set) n++; return n; }
  function allSet() { for (var i = 0; i < pins.length; i++) if (!pins[i].set) return false; return true; }

  function initGame() { openCount = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; openAnim = 0; initLock(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (openCount * 1200 + Math.ceil(timeLeft) * 100) : openCount * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < pins.length; i++) {
      var pin = pins[i], px = pin.x, py = pin.y, wob = Math.sin(game.time.elapsed * 20 + i) * pin.wobble * 8, col = pin.set ? C.b : (pin.springBack > 0 ? C.a : '#888866');
      game.draw.rect(px - 18 + wob, KEYHOLE_Y, 36, py - KEYHOLE_Y, col, pin.set ? 0.9 : 0.8); game.draw.rect(px - 18 + wob, py - 8, 36, 24, col, 0.9);
      game.draw.rect(px - 24, KEYHOLE_Y + pin.target - SET_ZONE, 48, SET_ZONE * 2, pin.set ? C.b : '#334', 0.3); game.draw.rect(px - 24, KEYHOLE_Y + pin.target - 1, 48, 3, pin.set ? C.b : C.e, 0.6);
    }
    var pulse = 1 + Math.sin(game.time.elapsed * 8) * 0.1; pc(probe.x, probe.y, 18 * pulse, C.c, 0.9); game.draw.rect(snap(probe.x) - 3, snap(probe.y), 6, 40, C.c, 0.9);
    var tw = W * 0.6, tx = (W - tw) / 2, ty = KEYHOLE_Y + PIN_H + 60;
    game.draw.rect(tx, ty, tw, 20, '#374151', 0.4); game.draw.rect(tx, ty, tw * tension, 20, tension > 0.6 ? C.a : C.c, 0.8); txt('TENSION', W / 2, ty + 52, 30, tension > 0.6 ? C.a : C.e);
    var sc = countSet(); for (var si = 0; si < NUM_PINS; si++) pc(W / 2 - (NUM_PINS - 1) * 44 + si * 88, ty + 110, 20, si < sc ? C.b : '#374151', 0.9);
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || openAnim > 0) return;
    probe.y = Math.max(KEYHOLE_Y, Math.min(KEYHOLE_Y + PIN_H, probe.y + (y2 - y1) * 0.5));
    var near = null, nd = 90; for (var i = 0; i < pins.length; i++) { var d = Math.abs(probe.x - pins[i].x); if (d < nd) { nd = d; near = pins[i]; } }
    if (near && !near.set) {
      near.y = Math.max(KEYHOLE_Y + near.target - SET_ZONE, Math.min(KEYHOLE_Y + PIN_H, probe.y + 20)); near.wobble = 0.3;
      if (Math.abs(near.y - (KEYHOLE_Y + near.target)) < SET_ZONE && dir === 'right') {
        near.set = true; near.wobble = 0.5; game.audio.play('se_success', 0.5);
        if (allSet()) { openAnim = 1.0; openCount++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.9); for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: KEYHOLE_Y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.5, col: C.b }); } if (openCount >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) { initLock(); openAnim = 0; } }, 1000); }
      }
    }
    probe.x = Math.max(PIN_START_X - 60, Math.min(PIN_START_X + (NUM_PINS - 1) * PIN_SPACING + 60, probe.x + (x2 - x1) * 0.6));
    tension += 0.05;
    if (tension > 0.8 && Math.random() < 0.2) { for (var ri = 0; ri < pins.length; ri++) if (!pins[ri].set) { pins[ri].y = KEYHOLE_Y + PIN_H * 0.8; pins[ri].springBack = 0.4; } fails++; flash = 0.3; flashCol = C.a; tension = 0; game.audio.play('se_failure', 0.3); if (fails >= MAX_FAIL) { finish(false); return; } }
    game.audio.play('se_tap', 0.1);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < pins.length; i++) if (Math.abs(tx - pins[i].x) < 50) { probe.x = pins[i].x; game.audio.play('se_tap', 0.1); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pins) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL UNLOCKED!' : 'BROKEN PICK', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (openAnim > 0) openAnim -= dt * 1.5; tension = Math.max(0, tension - dt * 0.1);
      for (var i = 0; i < pins.length; i++) { if (!pins[i].set) { var rest = KEYHOLE_Y + PIN_H * 0.8; pins[i].y += (rest - pins[i].y) * dt * 3; } if (pins[i].wobble > 0) pins[i].wobble -= dt * 4; if (pins[i].springBack > 0) pins[i].springBack -= dt * 3; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (openAnim > 0) { game.draw.rect(0, 0, W, H, C.b, openAnim * 0.12); txt('UNLOCKED!', W / 2, H / 2, 90, C.b); }
    if (flash > 0 && openAnim <= 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(openCount + ' / ' + NEEDED + ' LOCKS', W / 2, 168, 46, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#12121a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

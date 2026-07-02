// 287-turbine-tap.js
// タービンタップ — 発電タービンをタップして回転を安定ゾーン(50〜70)に保つ発電所オペレート
// 操作: タップでタービンを回す（速すぎず遅すぎず）
// 成功: 8秒間 安定ゾーンを維持  失敗: 過回転/停止を3回 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、発電プラント） ──
  var C = { bg:'#02040a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TURBINE TAP';
  var HOW_TO_PLAY = 'TAP TO SPIN · KEEP RPM IN THE SAFE ZONE 50-70';
  var MAX_TIME  = 15;
  var NEEDED    = 8;          // 修正2: サバイバル 30s → 8s
  var MAX_FAIL  = 3;
  var RPM_DECAY = 8, RPM_GAIN = 20;
  var CX = snap(W / 2), CY = snap(H * 0.42), BLADES = 5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rpm, rotation, failures, safeTime, timeLeft, done, sparks, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.22) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - 4, snap(y1 + dy * i / n) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); }

  function inSafe() { return rpm >= 50 && rpm <= 70; }

  function drawTurbine() {
    var col = inSafe() ? C.b : (rpm > 70 ? C.a : C.c);
    ring(CX, CY, 176, C.d, 0.5); ring(CX, CY, 168, C.d, 0.3);
    // 4本の羽根（回転する太い棒）
    for (var bi = 0; bi < BLADES; bi++) {
      var ang = rotation + (bi / BLADES) * Math.PI * 2;
      pline(CX + Math.cos(ang) * 30, CY + Math.sin(ang) * 30, CX + Math.cos(ang) * 150, CY + Math.sin(ang) * 150, col, 0.9);
      pline(CX + Math.cos(ang + 0.35) * 70, CY + Math.sin(ang + 0.35) * 70, CX + Math.cos(ang) * 148, CY + Math.sin(ang) * 148, C.g, 0.5);
    }
    pc(CX, CY, 34, col, 0.95); pc(CX - 8, CY - 8, 8, C.g, 0.7);
  }

  function drawGauge() {
    var gx = snap(W * 0.12), gy = snap(H * 0.66), gw = snap(W * 0.76), seg = gw / 18;
    for (var i = 0; i < 18; i++) {
      var v = i / 18 * 90, isSafe = v >= 50 && v <= 70, on = rpm >= v;
      var col = on ? (isSafe ? C.b : (v > 70 ? C.a : C.c)) : (isSafe ? '#0a3020' : '#1a1030');
      game.draw.rect(gx + i * seg + 2, gy, seg - 4, 44, col, on ? 0.95 : 0.5);
    }
    var barCol = rpm < 50 ? C.c : (rpm > 70 ? C.a : C.b);
    txt(Math.round(rpm) + ' RPM', W / 2, gy + 96, 52, barCol);
  }

  function initGame() { rpm = 20; rotation = 0; failures = 0; safeTime = 0; timeLeft = MAX_TIME; done = false; sparks = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(safeTime) * 200 + Math.ceil(timeLeft) * 80) : failures * 100 + Math.round(safeTime) * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addFail(kind) {
    failures++; fbText = kind; fbCol = kind === 'OVER-REV!' ? C.a : C.c; fbTimer = 0.7;
    game.audio.play('se_failure', 0.5);
    if (failures >= MAX_FAIL) finish(false);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - CX, dy = y - CY;
    if (dx * dx + dy * dy < 200 * 200) {
      rpm += RPM_GAIN;
      if (rpm > 90) {
        rpm = 30;
        for (var i = 0; i < 10; i++) { var a = Math.random() * Math.PI * 2; sparks.push({ x: CX, y: CY, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.5, col: C.a }); }
        addFail('OVER-REV!');
      } else {
        game.audio.play('se_tap', 0.25);
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); rotation += dt * 3; drawTurbine();
      txt(GAME_TITLE, W / 2, H * 0.13, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 24, C.b);
      txt('SAFE ZONE 50-70 RPM', W / 2, H * 0.70, 40, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STABLE POWER!' : 'MELTDOWN', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(safeTime >= NEEDED); return; }
      if (fbTimer > 0) fbTimer -= dt;
      rpm = Math.max(0, rpm - RPM_DECAY * dt);
      if (rpm < 5 && game.time.elapsed > 2) { rpm = 0; addFail('STALL!'); if (done) return; }
      rotation += (rpm / 60) * 2 * Math.PI * dt;
      if (inSafe()) { safeTime += dt; if (safeTime >= NEEDED) { finish(true); return; } }
      for (var sp = sparks.length - 1; sp >= 0; sp--) { var s = sparks[sp]; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; s.life -= dt; if (s.life <= 0) sparks.splice(sp, 1); }
    }

    // ---- 描画 ----
    background(); drawTurbine();
    for (var sp2 = 0; sp2 < sparks.length; sp2++) game.draw.rect(snap(sparks[sp2].x) - 5, snap(sparks[sp2].y) - 5, 10, 10, sparks[sp2].col, sparks[sp2].life * 1.8);
    drawGauge();

    // 安定ゲージ（12ブロック）
    var sc = Math.ceil(safeTime / NEEDED * 12);
    for (var si = 0; si < 12; si++) game.draw.rect(snap(W * 0.12) + si * snap(W * 0.76 / 12) + 2, snap(H * 0.80), snap(W * 0.76 / 12) - 4, 28, si < sc ? C.b : '#0a3020', si < sc ? 0.9 : 0.4);

    if (fbTimer > 0) txt(fbText, W / 2, H * 0.60, 52, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('STABLE ' + Math.floor(safeTime) + ' / ' + NEEDED + 's', W / 2, 168, 46, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < failures ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);

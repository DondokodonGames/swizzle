// 365-crowd-surf.js
// クラウドサーフ — ビートに合わせてタップし、観客の手拍子に乗って前へ流れていくライブ会場
// 操作: ビートの瞬間にタップして前進（外すと減速して落ちる）
// 成功: 300m前進  失敗: 3回落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ライブ会場） ──
  var C = { bg:'#0a0010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', crowd:'#1a1440' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CROWD SURF';
  var HOW_TO_PLAY = 'TAP ON THE BEAT TO RIDE FORWARD';
  var MAX_TIME = 15;
  var GOAL = 300;            // 修正2: 800m → 300m
  var MAX_FALL = 3;
  var BEAT = 0.55, SURF_Y = snap(H * 0.46);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, beatPhase, surfX, surfVX, dist, falls, combo, timeLeft, done, particles, arms, fbText, fbCol, fbTimer, beatFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function distBar() {
    var t = Math.ceil(Math.min(1, dist / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1440');
  }

  function background() { game.draw.clear(C.bg); if (beatFlash > 0) game.draw.rect(0, 0, W, H, C.f, beatFlash * 0.06); game.draw.rect(0, snap(H * 0.5), W, H, C.crowd, 0.6); }

  function initArms() { arms = []; for (var i = 0; i < 16; i++) arms.push({ x: snap(i * W / 15), phase: i / 16 * Math.PI * 2, raised: 0, wave: 0 }); }

  function initGame() { beatTimer = 0; beatPhase = 0; surfX = W * 0.35; surfVX = 150; dist = 0; falls = 0; combo = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; beatFlash = 0; initArms(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(dist) * 30 + (MAX_FALL - falls) * 500 + Math.ceil(timeLeft) * 100) : Math.round(dist) * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function onBeat() { var idx = Math.round(beatTimer / BEAT); return Math.abs(beatTimer - idx * BEAT) < BEAT * 0.28; }

  function drawScene() {
    var by = snap(H * 0.5);
    for (var i = 0; i < arms.length; i++) { var arm = arms[i], h = 80 + (arm.wave + arm.raised) * 60, col = arm.raised > 0.3 ? C.d : '#3a2a70'; pline(arm.x, by, arm.x, by - h, col, 0.9, 12); pc(arm.x, by - h, 14, col, 0.9); }
    pc(surfX, SURF_Y - 20, 28, C.c, 0.9); pc(surfX, SURF_Y - 44, 18, C.g, 0.9); game.draw.rect(snap(surfX) - 40, snap(SURF_Y - 24), 80, 8, C.c, 0.9);
    // ビートマーカー
    var bx = snap(W / 2 - 160 + beatPhase * 320);
    game.draw.rect(snap(W / 2 - 160), snap(H * 0.18), 320, 4, '#3a2a70', 0.6); pc(bx, snap(H * 0.18), 16 + beatFlash * 8, C.f, 0.9);
    pc(snap(W / 2 - 160), snap(H * 0.18), 12, C.a, 0.7); pc(snap(W / 2 + 160), snap(H * 0.18), 12, C.a, 0.7);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onBeat()) { combo++; surfVX = 200 + combo * 20; fbText = combo > 2 ? combo + ' COMBO!' : 'NICE!'; fbCol = C.c; fbTimer = 0.4; game.audio.play('se_tap', 0.4); for (var i = 0; i < arms.length; i++) if (Math.abs(arms[i].x - surfX) < 120) arms[i].raised = 0.8; for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: surfX, y: SURF_Y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 80, life: 0.4, col: C.c }); } }
    else { combo = 0; surfVX = Math.max(60, surfVX - 40); fbText = 'OFF BEAT'; fbCol = C.a; fbTimer = 0.4; game.audio.play('se_failure', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    beatTimer += dt; beatPhase = (beatTimer % BEAT) / BEAT; if (beatPhase < dt / BEAT * 2) beatFlash = 0.3;
    if (beatFlash > 0) beatFlash -= dt * 4;
    for (var i = 0; i < (arms ? arms.length : 0); i++) { arms[i].wave = Math.sin((beatPhase + arms[i].phase / (Math.PI * 2)) * Math.PI * 2) * 0.5 + 0.5; if (arms[i].raised > 0) arms[i].raised -= dt * 2; }

    if (state === S.ATTRACT) {
      if (!arms) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.36, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.68, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CROWD PLEASER!' : 'DROPPED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('DIST ' + Math.round(dist) + 'm', W / 2, H * 0.45, 52, C.c);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.54, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      surfX += surfVX * dt; surfVX *= (1 - 0.5 * dt); if (surfX > W - 60) surfX = W - 60; if (surfX < 60) surfX = 60;
      if (surfVX < 40) { falls++; combo = 0; surfVX = 120; fbText = 'FELL!'; fbCol = C.a; fbTimer = 0.6; game.audio.play('se_failure', 0.5); if (falls >= MAX_FALL) { finish(false); return; } }
      dist += surfVX * dt / 5;
      if (dist >= GOAL) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.80), 52, fbCol);

    distBar();
    txt(Math.round(dist) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(dist) + ' / ' + GOAL + 'm   ' + Math.ceil(timeLeft) + 's', W / 2, 168, 44, C.b);
    for (var fi = 0; fi < MAX_FALL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALL - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#1a1440');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);

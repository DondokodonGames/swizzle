// 375-noodle-slurp.js
// ヌードルスラープ — 器から飛び出す麺を、上スワイプのタイミングで吸い込んで食べる屋台ラーメン
// 操作: 上スワイプで顔の前にある麺を吸い込む
// 成功: 6本 吸い込む  失敗: 3本 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、屋台） ──
  var C = { bg:'#150800', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NOODLE SLURP';
  var HOW_TO_PLAY = 'SWIPE UP TO SLURP THE NOODLES BY YOUR FACE';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var BOWL_Y = snap(H * 0.82), FACE_Y = snap(H * 0.34);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var noodles, particles, slurped, missed, timeLeft, done, spawnTimer, slurpAnim, mouth;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnNoodle() { var side = Math.random() < 0.5 ? -1 : 1; noodles.push({ x: snap(W / 2 + side * (120 + Math.random() * 160)), y: BOWL_Y - 60, vy: -320 - Math.random() * 160, vx: side * (-90 - Math.random() * 60), len: 70 + Math.random() * 60, angle: Math.random() * Math.PI, slurping: false, missed: false }); }

  function initGame() { noodles = []; particles = []; slurped = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.5; slurpAnim = 0; mouth = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (slurped * 500 + Math.ceil(timeLeft) * 100) : slurped * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBowl() {
    pc(W / 2, BOWL_Y, 200, C.f, 0.9); pc(W / 2, BOWL_Y, 176, '#8a3a10', 0.9);
    for (var i = 0; i < 5; i++) { var bx = W / 2 + (i - 2) * 56; pline(bx, BOWL_Y - 40, bx + Math.sin(game.time.elapsed + i) * 24, BOWL_Y + 40, C.c, 0.8, 6); }
  }

  function drawFace() {
    pc(W / 2, FACE_Y, 110, C.c, 0.9);
    pc(W / 2 - 40, FACE_Y - 24, 16, C.g, 0.95); pc(W / 2 + 40, FACE_Y - 24, 16, C.g, 0.95);
    pc(W / 2 - 40, FACE_Y - 24, 8, '#111', 0.95); pc(W / 2 + 40, FACE_Y - 24, 8, '#111', 0.95);
    pc(W / 2 - 66, FACE_Y + 18, 16, C.a, 0.4); pc(W / 2 + 66, FACE_Y + 18, 16, C.a, 0.4);
    var mh = 16 + mouth * 36; game.draw.rect(snap(W / 2 - 40), snap(FACE_Y + 40), 80, snap(mh), '#3a1500', 0.95);
    if (slurpAnim > 0) pc(W / 2, FACE_Y + 40 + mh / 2, 26 * slurpAnim, C.f, slurpAnim * 0.5);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || d !== 'up') return;
    mouth = 0.6; var caught = false;
    for (var ni = noodles.length - 1; ni >= 0; ni--) {
      var n = noodles[ni]; if (n.slurping || n.missed) continue;
      if (Math.abs(n.x - W / 2) < 180 && n.y - FACE_Y > 0 && n.y - FACE_Y < H * 0.42) { n.slurping = true; caught = true; game.audio.play('se_success', 0.4); break; }
    }
    if (caught) slurpAnim = 0.5; else game.audio.play('se_failure', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawBowl(); drawFace();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.67, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOCHISOU!' : 'TOO SLOW', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (slurpAnim > 0) slurpAnim -= dt * 3; if (mouth > 0) mouth -= dt * 3;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnNoodle(); spawnTimer = 0.7 + Math.random() * 0.5; }
      for (var ni = noodles.length - 1; ni >= 0; ni--) {
        var n = noodles[ni];
        if (n.slurping) {
          var dx = W / 2 - n.x, dy = FACE_Y - n.y, d = Math.max(1, Math.hypot(dx, dy));
          if (d < 30) { slurped++; for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: FACE_Y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); } noodles.splice(ni, 1); if (slurped >= NEEDED) { finish(true); return; } continue; }
          n.x += dx / d * 520 * dt; n.y += dy / d * 520 * dt;
        } else {
          n.vy += 520 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.angle += dt * 2;
          if (n.y < FACE_Y - 100 && !n.missed) { n.missed = true; missed++; game.audio.play('se_failure', 0.3); if (missed >= MAX_MISS) { finish(false); return; } }
          if (n.y > H + 100) noodles.splice(ni, 1);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBowl();
    for (var ni2 = 0; ni2 < noodles.length; ni2++) { var n2 = noodles[ni2], col = n2.missed ? C.a : n2.slurping ? C.f : C.g; var nx = n2.x + Math.cos(n2.angle) * n2.len / 2, ny = n2.y + Math.sin(n2.angle) * n2.len / 2; pline(n2.x, n2.y, nx, ny, col, 0.95, 10); pline(n2.x, n2.y, n2.x - Math.cos(n2.angle) * n2.len * 0.4, n2.y - Math.sin(n2.angle) * n2.len * 0.4, col, 0.9, 8); }
    drawFace();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('SWIPE UP!', W / 2, snap(H * 0.56), 40, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(slurped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#2a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 662-shrink-shot.js
// シュリンクショット — 縮んでいく的を、消える前にタップで射抜く。小さいほど高得点
// 操作: 的をタップで撃つ。中心の緑ほど加点。空振りや的消滅はミス
// 成功: 10ヒット  失敗: 3回 外し/消滅 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、射的場） ──
  var C = { bg:'#02030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHRINK SHOT';
  var HOW_TO_PLAY = 'TAP THE SHRINKING TARGETS BEFORE THEY VANISH · SMALLER = MORE POINTS';
  var MAX_TIME = 18;
  var HITS_NEEDED = 10;      // 修正2: 20 → 10
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var MAX_R = 160, SHRINK_SPEED = 90, SPAWN_RATE = 1.1;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, score, hits, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, spawnTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#05060e');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnTarget() { targets.push({ x: 120 + Math.random() * (W - 240), y: snap(H * 0.20) + Math.random() * (H * 0.5), r: MAX_R, alive: true }); }

  function getPts(r) { if (r < 40) return 30; if (r < 70) return 20; if (r < 100) return 10; return 3; }

  function initGame() { targets = []; score = 0; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnTimer = 0; spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 20 + Math.ceil(timeLeft) * 100) : score * 10;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti]; if (!t.alive) continue;
      pc(t.x, t.y, t.r, C.a, 0.8); if (t.r > 70) pc(t.x, t.y, t.r * 0.65, C.f, 0.85); if (t.r > 40) pc(t.x, t.y, t.r * 0.42, C.c, 0.9); pc(t.x, t.y, Math.min(t.r * 0.22, 30), C.b, 0.95);
      ring(t.x, t.y, t.r + 6, C.g, (t.r / MAX_R) * 0.25);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = false;
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i]; if (!t.alive) continue;
      var dx = tx - t.x, dy = ty - t.y;
      if (dx * dx + dy * dy < t.r * t.r) {
        var pts = getPts(t.r); score += pts; hits++; t.alive = false;
        flash = 0.3; flashCol = pts >= 20 ? C.b : C.f; resultText = (pts >= 30 ? 'PERFECT +' : pts >= 20 ? 'GREAT +' : 'HIT +') + pts; resultTimer = 0.55; game.audio.play('se_success', pts >= 20 ? 0.7 : 0.4);
        for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.45, col: pts >= 20 ? C.b : C.f }); }
        if (hits >= HITS_NEEDED) { finish(true); return; } hit = true; break;
      }
    }
    if (!hit) { misses++; flash = 0.3; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARPSHOOTER!' : 'MISSED OUT', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      spawnTimer += dt; if (spawnTimer >= SPAWN_RATE && targets.filter(function(t) { return t.alive; }).length < 3) { spawnTimer = 0; spawnTarget(); }
      for (var i = targets.length - 1; i >= 0; i--) {
        var t = targets[i]; if (!t.alive) { targets.splice(i, 1); continue; }
        t.r -= SHRINK_SPEED * dt;
        if (t.r <= 0) { t.alive = false; misses++; flash = 0.25; flashCol = C.a; resultText = 'VANISHED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.2); if (misses >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + HITS_NEEDED + '   SCORE ' + score, W / 2, 168, 40, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#05060e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);

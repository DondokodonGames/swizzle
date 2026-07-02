// 419-magnet-sort.js
// 磁石選別 — 磁石を動かして金属ボールだけを引き寄せ、ゴールへ運ぶ。ガラス玉は入れてはいけない
// 操作: タップ／スワイプで磁石を移動（金属だけが引き寄せられる）
// 成功: 金属4個を ゴールへ  失敗: ガラス玉3個を 誤投入 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、選別ライン） ──
  var C = { bg:'#0a0f1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET SORT';
  var HOW_TO_PLAY = 'DRAG THE MAGNET · PULL METAL TO THE GOAL · AVOID GLASS';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_WRONG = 3;
  var MAG_R = 64, PULL = 280, GOAL_X = snap(W * 0.5), GOAL_Y = snap(H * 0.80), GOAL_R = 90;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var magX, magY, balls, metalGot, wrongGot, timeLeft, done, particles, spawnTimer, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#141c2a');
  }

  function background() { game.draw.clear(C.bg); ring(GOAL_X, GOAL_Y, GOAL_R, C.b, 0.4); pc(GOAL_X, GOAL_Y, GOAL_R - 20, C.b, 0.12); txt('GOAL', GOAL_X, GOAL_Y + 10, 40, C.b); }

  function spawnBall() { var metal = Math.random() < 0.6, side = Math.random() < 0.5; balls.push({ x: snap(side ? 80 + Math.random() * 200 : W - 80 - Math.random() * 200), y: snap(220 + Math.random() * (H * 0.42)), vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, r: metal ? 28 + Math.random() * 10 : 24, metal: metal, att: 0, scored: false }); }

  function initGame() { magX = W / 2; magY = H * 0.36; balls = []; metalGot = 0; wrongGot = 0; timeLeft = MAX_TIME; done = false; particles = []; spawnTimer = 0; flash = 0; flashCol = C.b; for (var i = 0; i < 4; i++) spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (metalGot * 500 + Math.ceil(timeLeft) * 100) : metalGot * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBall(b) { var col = b.metal ? C.e : C.d; if (b.metal && b.att > 0.1) ring(b.x, b.y, b.r + 8, col, b.att * 0.4); pc(b.x, b.y, b.r, col, b.metal ? 0.9 : 0.6); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, C.g, b.metal ? 0.2 : 0.5); }

  function drawMagnet() { ring(magX, magY, PULL, C.a, 0.08); pc(magX, magY, MAG_R, C.a, 0.9); pc(magX - 18, magY - 20, MAG_R * 0.3, C.g, 0.4); txt('N', magX - 22, magY + 12, 34, C.g); txt('S', magX + 22, magY + 12, 34, C.e); }

  function setMag(x, y) { magX = Math.max(MAG_R, Math.min(W - MAG_R, x)); magY = Math.max(MAG_R + 80, Math.min(H * 0.72, y)); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; setMag(x, y);
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return; if (x2 !== undefined) setMag(x2, y2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); for (var bi0 = 0; bi0 < balls.length; bi0++) drawBall(balls[bi0]); drawMagnet();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'CONTAMINATED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      spawnTimer -= dt; if (spawnTimer <= 0 && balls.length < 10) { spawnBall(); spawnTimer = 1.5 + Math.random() * 1.0; }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; if (b.scored) { balls.splice(bi, 1); continue; }
        var dx = magX - b.x, dy = magY - b.y, d = Math.max(1, Math.hypot(dx, dy));
        if (b.metal && d < PULL) { var force = (1 - d / PULL) * 600; b.vx += dx / d * force * dt; b.vy += dy / d * force * dt; b.att = Math.min(1, b.att + dt * 3); } else b.att = Math.max(0, b.att - dt * 2);
        b.vx *= (1 - dt * 1.5); b.vy *= (1 - dt * 1.5); b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.7; } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.7; }
        if (b.y < b.r + 80) { b.y = b.r + 80; b.vy = Math.abs(b.vy) * 0.7; } if (b.y > H * 0.9) { b.y = H * 0.9; b.vy = -Math.abs(b.vy) * 0.7; }
        if (Math.hypot(b.x - GOAL_X, b.y - GOAL_Y) < GOAL_R - b.r / 2) {
          b.scored = true;
          if (b.metal) { metalGot++; flash = 0.6; flashCol = C.b; game.audio.play('se_success', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.e }); } if (metalGot >= NEEDED) { finish(true); return; } }
          else { wrongGot++; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.5); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150, life: 0.5, col: C.a }); } if (wrongGot >= MAX_WRONG) { finish(false); return; } }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < balls.length; bi2++) drawBall(balls[bi2]);
    drawMagnet();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(metalGot + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrongGot ? C.a : '#141c2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);

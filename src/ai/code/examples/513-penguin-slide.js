// 513-penguin-slide.js
// ペンギンスライド — 氷の坂を滑るペンギンを、上スワイプでジャンプ/下スワイプでしゃがませ障害物を避ける
// 操作: 上スワイプ/上半分タップ=ジャンプ（低い障害物）、下スワイプ/下半分タップ=しゃがむ（高い障害物）
// 成功: 300m 走破  失敗: 3回 衝突 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、南極の坂） ──
  var C = { bg:'#010a14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PENGUIN SLIDE';
  var HOW_TO_PLAY = 'SWIPE UP TO JUMP · SWIPE DOWN TO DUCK · DODGE OBSTACLES';
  var MAX_TIME = 20;
  var GOAL     = 300;        // 修正2: 500m → 300m
  var MAX_HITS = 3;
  var GROUND_Y = snap(H * 0.70), PX = snap(W * 0.25), PR = 50;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var penguin, obstacles, score, hits, timeLeft, done, particles, nextOb, speed, flash, invincible, snow;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0c1e30');
  }

  function distBar() {
    var t = Math.ceil(Math.min(1, score / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#0c1e30');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H * 0.64, '#0c1e30', 0.5); for (var si = 0; si < snow.length; si++) game.draw.rect(snow[si].x, snow[si].y, snow[si].r, snow[si].r, C.g, 0.5); game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#cce8f4', 0.9); game.draw.rect(0, GROUND_Y, W, 12, C.g, 0.7); }

  function initGame() { penguin = { y: GROUND_Y - PR, vy: 0, crouch: false, crouchT: 0 }; obstacles = []; score = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; nextOb = 1.5; speed = 380; flash = 0; invincible = 0; snow = []; for (var si = 0; si < 30; si++) snow.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: 4 + Math.random() * 4, vy: 40 + Math.random() * 60 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(score) * 15 + (MAX_HITS - hits) * 500 + Math.ceil(timeLeft) * 100) : Math.floor(score) * 10;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function doJump() { if (penguin.crouchT <= 0 && penguin.y >= GROUND_Y - PR - 5) { penguin.vy = -900; penguin.crouch = false; game.audio.play('se_tap', 0.4); } }
  function doDuck() { penguin.crouch = true; penguin.crouchT = 0.4; game.audio.play('se_tap', 0.2); }

  function drawScene() {
    for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi]; game.draw.rect(snap(o.x), snap(o.y - o.h), o.w, o.h, o.high ? C.d : C.a, 0.9); game.draw.rect(snap(o.x), snap(o.y - o.h), o.w, 8, C.g, 0.3); }
    var pr = penguin.crouch ? PR * 0.55 : PR, py = penguin.crouch ? GROUND_Y - pr : penguin.y;
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 12) % 2) : 1;
    if (blink) { pc(PX, py, pr, '#1e293b', 0.95); pc(PX, py + pr * 0.1, pr * 0.55, C.g, 0.8); pc(PX + pr * 0.35, py - pr * 0.15, pr * 0.14, C.f, 0.9); pc(PX - pr * 0.2, py - pr * 0.25, pr * 0.1, C.g, 0.9); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (ty < H * 0.5) doJump(); else doDuck();
  });

  game.onSwipe(function(dir) { if (state === S.PLAYING && !done) { if (dir === 'up') doJump(); else if (dir === 'down') doDuck(); } });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!penguin) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'GOAL REACHED!' : 'CRASHED', W / 2, H * 0.16, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.22, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.28, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; score += speed * dt / 10;
      if (score >= GOAL) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      if (penguin.crouchT > 0) { penguin.crouchT -= dt; if (penguin.crouchT <= 0) penguin.crouch = false; }
      if (!penguin.crouch) { penguin.vy += 2200 * dt; penguin.y += penguin.vy * dt; if (penguin.y >= GROUND_Y - PR) { penguin.y = GROUND_Y - PR; penguin.vy = 0; } }
      speed = 380 + score * 1.2;
      nextOb -= dt; if (nextOb <= 0) { var high = Math.random() < 0.5; obstacles.push({ x: W + 60, y: high ? GROUND_Y - PR * 2.2 : GROUND_Y, w: 44, h: high ? 120 : 84, high: high }); nextOb = 0.8 + Math.random() * 0.8; }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        obstacles[oi].x -= speed * dt; if (obstacles[oi].x < -80) { obstacles.splice(oi, 1); continue; }
        if (invincible <= 0) { var o = obstacles[oi], pr = penguin.crouch ? PR * 0.55 : PR, py = penguin.crouch ? GROUND_Y - pr : penguin.y; if (Math.abs(PX - (o.x + o.w / 2)) < pr + o.w / 2 - 10 && Math.abs(py - (o.y - o.h / 2)) < pr + o.h / 2 - 10) { hits++; flash = 0.7; invincible = 1.2; game.audio.play('se_failure', 0.6); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PX, y: penguin.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.a }); } if (hits >= MAX_HITS) { finish(false); return; } } }
      }
      for (var sf = 0; sf < snow.length; sf++) { snow[sf].x -= speed * 0.1 * dt; snow[sf].y += snow[sf].vy * dt; if (snow[sf].x < 0) snow[sf].x = W; if (snow[sf].y > H) snow[sf].y = 0; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    distBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(score) + ' / ' + GOAL + 'm', W / 2, 168, 44, C.e);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0c1e30');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

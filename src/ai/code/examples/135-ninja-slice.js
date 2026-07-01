// 135-ninja-slice.js
// 忍者斬り — 飛んでくる物を素早くスワイプで斬り、爆弾は避ける反射神経ゲーム
// 操作: スワイプで物を斬る（爆弾はNG）
// 成功: 3個斬る  失敗: 爆弾3回 or 5個見逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜の道場） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUIT_COLORS = [C.b, C.c, C.f, C.e];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NINJA SLICE';
  var HOW_TO_PLAY = 'SWIPE TO SLICE · AVOID BOMBS';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 3;              // 修正2: 30 → 3
  var MAX_BOMB = 3;
  var MAX_MISS = 5;
  var TOP    = 220;
  var BOTTOM = H - 180;
  var OBJ_R = 48;
  var SPAWN_INTERVAL = 0.9;      // 修正2: 出現ゆっくり
  var BOMB_CHANCE = 0.18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var objects, slashes, particles, spawnTimer, score, bombHits, missed, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18);
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, snap(H * 0.85), W, H, C.d, 0.4);
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawFruit(o) {
    var col = FRUIT_COLORS[o.colorIdx];
    pc(o.x, o.y, OBJ_R, col, 1);
    pc(o.x - 14, o.y - 14, 10, C.g, 0.9);          // 光沢
    game.draw.rect(snap(o.x) - 4, snap(o.y) - OBJ_R - 12, 8, 16, C.f);   // ヘタ
    game.draw.rect(snap(o.x) + 4, snap(o.y) - OBJ_R - 8, 16, 8, C.b);    // 葉
  }

  function drawBomb(o) {
    pc(o.x, o.y, OBJ_R, '#333333', 1);
    pc(o.x, o.y, OBJ_R - 16, '#111111', 1);
    game.draw.rect(snap(o.x) - 4, snap(o.y) - OBJ_R - 16, 8, 16, C.f);   // 導火線
    var spark = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(snap(o.x) - 6, snap(o.y) - OBJ_R - 22, 12, 12, spark ? C.c : C.e);
    txt('X', o.x, o.y - 8, 44, C.e);
  }

  function spawnObject() {
    var isBomb = Math.random() < BOMB_CHANCE;
    var side = Math.random() > 0.5;
    var speed = game.random(360, 520);
    objects.push({
      x: side ? -OBJ_R : W + OBJ_R,
      y: game.random(H * 0.4, H * 0.7),
      vx: side ? speed : -speed,
      vy: -game.random(200, 380),
      type: isBomb ? 'bomb' : 'fruit',
      colorIdx: Math.floor(Math.random() * FRUIT_COLORS.length),
      sliced: false, exploding: false, explodeR: 0
    });
  }

  function initGame() {
    objects = []; slashes = []; particles = [];
    spawnTimer = 0.4;
    score = 0; bombHits = 0; missed = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 200 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var s;
    if (dir === 'right') s = { x1: W * 0.1, y1: H * 0.5, x2: W * 0.9, y2: H * 0.5 };
    else if (dir === 'left') s = { x1: W * 0.9, y1: H * 0.5, x2: W * 0.1, y2: H * 0.5 };
    else if (dir === 'up') s = { x1: W * 0.5, y1: H * 0.72, x2: W * 0.5, y2: H * 0.25 };
    else s = { x1: W * 0.5, y1: H * 0.25, x2: W * 0.5, y2: H * 0.72 };
    slashes.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, life: 0.25 });
    game.audio.play('se_tap', 0.6);

    var dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy);
    if (len < 1) return;
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.sliced || o.exploding) continue;
      var t = Math.max(0, Math.min(1, ((o.x - s.x1) * dx + (o.y - s.y1) * dy) / (len * len)));
      var cx = s.x1 + t * dx, cy = s.y1 + t * dy;
      if (Math.hypot(o.x - cx, o.y - cy) < o.r + 20) {
        o.sliced = true;
        if (o.type === 'fruit') {
          score++; feedbackOk = true; feedback = 0.2;
          var col = FRUIT_COLORS[o.colorIdx];
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: o.x, y: o.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, color: col });
          }
          if (score >= NEEDED) { finish(true); return; }
        } else {
          o.exploding = true; o.explodeR = o.r; bombHits++;
          feedbackOk = false; feedback = 0.5;
          game.audio.play('se_failure');
          for (var p2 = 0; p2 < 14; p2++) {
            var a2 = Math.random() * Math.PI * 2;
            particles.push({ x: o.x, y: o.y, vx: Math.cos(a2) * 240, vy: Math.sin(a2) * 240, life: 0.5, color: C.f });
          }
          if (bombHits >= MAX_BOMB) { finish(false); return; }
        }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawFruit({ x: W * 0.35, y: H * 0.45, colorIdx: 0 });
      drawBomb({ x: W * 0.65, y: H * 0.55 });
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SLICED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL; spawnObject(); }

      for (var i = 0; i < objects.length; i++) {
        var o = objects[i];
        if (o.sliced && !o.exploding) continue;
        o.vy += 500 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.exploding) o.explodeR += 200 * dt;
      }
      for (var j = objects.length - 1; j >= 0; j--) {
        var o2 = objects[j];
        if (o2.y > H + 80 || o2.x < -200 || o2.x > W + 200) {
          if (!o2.sliced && o2.type === 'fruit') {
            missed++;
            if (missed >= MAX_MISS) { finish(false); return; }
          }
          objects.splice(j, 1);
        }
      }
    }

    for (var pi3 = 0; pi3 < particles.length; pi3++) {
      var p = particles[pi3];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    for (var si = 0; si < slashes.length; si++) slashes[si].life -= dt;
    slashes = slashes.filter(function(s) { return s.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var sli = 0; sli < slashes.length; sli++) {
      var sl = slashes[sli];
      game.draw.line(sl.x1, sl.y1, sl.x2, sl.y2, C.g, 8 * sl.life / 0.25);
    }
    for (var oi = 0; oi < objects.length; oi++) {
      var o3 = objects[oi];
      if (o3.sliced && !o3.exploding) continue;
      if (o3.exploding) {
        pc(o3.x, o3.y, o3.explodeR, C.f, 0.6);
        pc(o3.x, o3.y, o3.explodeR * 0.5, C.c, 0.5);
      } else if (o3.type === 'fruit') drawFruit(o3);
      else drawBomb(o3);
    }
    for (var pp = 0; pp < particles.length; pp++) {
      var pt = particles[pp];
      game.draw.rect(snap(pt.x) - 4, snap(pt.y) - 4, 8, 8, pt.color, pt.life * 2.5);
    }
    if (feedback > 0 && !feedbackOk) game.draw.rect(0, 0, W, H, C.f, feedback * 0.25);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bd = 0; bd < MAX_BOMB; bd++) {
      var bx = snap(W / 2 + (bd - (MAX_BOMB - 1) / 2) * 56);
      game.draw.rect(bx - 12, 208, 24, 24, bd < bombHits ? C.f : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);

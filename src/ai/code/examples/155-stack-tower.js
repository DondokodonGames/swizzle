// 155-stack-tower.js
// 積み上げタワー — 動くブロックをタップして積む、ずれた分だけ削れる緊張感
// 操作: タップでブロックを落とす
// 成功: 2段積む  失敗: ブロック幅が40px以下 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCKS = [C.e, C.d, C.b, C.f, C.c, C.a];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STACK TOWER';
  var HOW_TO_PLAY = 'TAP TO DROP THE BLOCK';
  var MAX_TIME = 15;             // 修正2: 60 → 15
  var NEEDED   = 2;              // 修正2: 12 → 2
  var BLOCK_H = 80, INITIAL_W = 480, MIN_W = 40, SPEED_BASE = 380;
  var BASE_Y = snap(H * 0.86), TOWER_X = snap(W / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stack, moving, particles, score, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function towerTopY() { return BASE_Y - stack.length * BLOCK_H; }

  function drawBlock(x, y, w, colorIdx) {
    game.draw.rect(snap(x - w / 2), snap(y), snap(w), BLOCK_H, BLOCKS[colorIdx], 0.95);
    game.draw.rect(snap(x - w / 2), snap(y), snap(w), 8, C.g, 0.3);
    game.draw.rect(snap(x - w / 2), snap(y) + BLOCK_H - 8, snap(w), 8, '#000000', 0.25);
  }

  function spawnMoving() {
    if (stack.length === 0) return;
    var topW = stack[stack.length - 1].w;
    var speed = (SPEED_BASE + score * 30) * (Math.random() < 0.5 ? 1 : -1);
    moving = { x: speed > 0 ? -topW / 2 : W + topW / 2, w: topW, speed: speed, colorIdx: stack.length % BLOCKS.length, y: towerTopY() - BLOCK_H };
  }

  function initGame() {
    stack = [{ x: TOWER_X, w: INITIAL_W, colorIdx: 0 }];
    moving = null; particles = []; score = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
    setTimeout(function() { if (state === S.PLAYING && !done) spawnMoving(); }, 300);
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !moving) return;
    var top = stack[stack.length - 1];
    var oL = Math.max(top.x - top.w / 2, moving.x - moving.w / 2);
    var oR = Math.min(top.x + top.w / 2, moving.x + moving.w / 2);
    var overlap = oR - oL;
    if (overlap <= 0) { feedbackOk = false; feedback = 0.4; moving = null; finish(false); return; }
    var newW = overlap, newX = (oL + oR) / 2;
    var perfect = Math.abs(overlap - top.w) < 8;
    if (perfect) {
      newW = top.w; newX = top.x;
      for (var pi = 0; pi < 12; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: newX, y: moving.y, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240 - 80, life: 0.6 }); }
    }
    stack.push({ x: newX, w: newW, colorIdx: moving.colorIdx });
    score++; feedbackOk = true; feedback = 0.35;
    game.audio.play('se_success', perfect ? 1.0 : 0.6);
    if (newW < MIN_W) { finish(false); return; }
    if (score >= NEEDED) { finish(true); return; }
    moving = null;
    setTimeout(function() { if (state === S.PLAYING && !done) spawnMoving(); }, 200);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      game.draw.clear(C.bg);
      drawBlock(TOWER_X, BASE_Y - BLOCK_H, INITIAL_W, 0);
      drawBlock(TOWER_X + Math.sin(game.time.elapsed * 2) * 120, BASE_Y - BLOCK_H * 2, INITIAL_W, 1);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.34, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.40, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.46, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'NICE STACK!' : 'TOPPLED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (moving) {
        moving.x += moving.speed * dt;
        if (moving.x - moving.w / 2 < 40) { moving.x = 40 + moving.w / 2; moving.speed = Math.abs(moving.speed); }
        if (moving.x + moving.w / 2 > W - 40) { moving.x = W - 40 - moving.w / 2; moving.speed = -Math.abs(moving.speed); }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    var cam = Math.min(0, H * 0.55 - towerTopY());

    // ---- 描画 ----
    game.draw.clear(C.bg);
    game.draw.rect(0, BASE_Y + cam, W, H - BASE_Y, C.d, 0.4);
    for (var si = 0; si < stack.length; si++) drawBlock(stack[si].x, BASE_Y - (si + 1) * BLOCK_H + cam, stack[si].w, stack[si].colorIdx);
    if (moving) {
      drawBlock(moving.x, moving.y + cam, moving.w, moving.colorIdx);
      var top = stack[stack.length - 1], topY = towerTopY() + cam;
      game.draw.rect(snap(top.x - top.w / 2) - 3, topY - 24, 6, 20, C.g);
      game.draw.rect(snap(top.x + top.w / 2) - 3, topY - 24, 6, 20, C.g);
    }
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y + cam) - 5, 10, 10, C.c, particles[pp].life * 1.5);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);

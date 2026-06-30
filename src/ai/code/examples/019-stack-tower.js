// 019-stack-tower.js
// ブロック積み上げ — ズレるたびに細くなるブロックを積む職人の集中
// 操作: タップで落下中のブロックを止める
// 成功: 1段積む  失敗: ブロックが完全にズレる or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCK_COLORS = [C.a, C.b, C.c, C.e, C.f, C.d];

  var GAME_TITLE  = 'STACK TOWER';
  var HOW_TO_PLAY = 'TAP TO DROP THE BLOCK';
  var MAX_TIME = 30;
  var NEEDED = 1;            // 修正2: 8段 → 1段
  var FLOOR_Y = H - 320, BASE_W = 560, BLOCK_H = 96;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var stack, layer, moving, done, timeLeft, feedbackTimer, feedbackText, feedbackColor, perfectCount;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() {
    stack = [{ x: (W - BASE_W) / 2, w: BASE_W, y: FLOOR_Y }];
    layer = 0; done = false; timeLeft = MAX_TIME; feedbackTimer = 0; feedbackText = ''; feedbackColor = C.b; perfectCount = 0;
    startMovingBlock();
  }

  function startMovingBlock() {
    var top = stack[stack.length - 1];
    moving = { w: top.w, y: top.y - BLOCK_H, dir: Math.random() < 0.5 ? 1 : -1, speed: 420 + layer * 28, x: 0 };
    moving.x = moving.dir > 0 ? -moving.w : W;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (layer * 200 + perfectCount * 100 + Math.ceil(timeLeft) * 20) : layer * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || feedbackTimer > 0) return;

    var top = stack[stack.length - 1];
    var oL = Math.max(top.x, moving.x), oR = Math.min(top.x + top.w, moving.x + moving.w);
    var oW = oR - oL;
    if (oW <= 0) { feedbackText = 'MISS!'; feedbackColor = C.a; feedbackTimer = 0.6; finish(false); return; }

    var isPerfect = Math.abs(moving.x - top.x) < 16;
    if (isPerfect) { oW = top.w; oL = top.x; perfectCount++; }
    stack.push({ x: oL, w: oW, y: moving.y });
    layer++;
    feedbackText = isPerfect ? 'PERFECT!' : 'GOOD';
    feedbackColor = isPerfect ? C.c : C.b;
    feedbackTimer = 0.4;
    game.audio.play('se_tap', isPerfect ? 1.0 : 0.7);
    if (layer >= NEEDED) { finish(true); return; }
    startMovingBlock();
  });

  // 世界観: 高層ビルの建設現場。クレーンで鉄骨を吊り、ずれなく積み上げる。
  function background() {
    game.draw.clear('#0a0818');
    // 奥のビル群（シルエット）
    for (var b = 0; b < 6; b++) {
      var bw = 120 + (b % 3) * 50, bx = b * (W / 6);
      game.draw.rect(bx, FLOOR_Y - 200 - (b % 3) * 160, bw, H, '#12102a');
      for (var wy = FLOOR_Y - 160; wy < H; wy += 80)
        for (var wx2 = bx + 16; wx2 < bx + bw - 16; wx2 += 48)
          game.draw.rect(snap(wx2), snap(wy), 24, 32, C.c, 0.08);
    }
    // クレーンのアーム（上部）
    game.draw.rect(40, 140, W - 80, 16, '#888844');
    game.draw.rect(W / 2 - 8, 140, 16, 120, '#888844');  // 吊りワイヤ
    txt('CONSTRUCTION', W / 2, 110, 36, C.b);
  }

  function drawStack() {
    for (var b = 0; b < stack.length; b++) {
      var blk = stack[b];
      var col = b === 0 ? C.d : BLOCK_COLORS[(b - 1) % BLOCK_COLORS.length];
      game.draw.rect(snap(blk.x), snap(blk.y), snap(blk.w), BLOCK_H, col);
      game.draw.rect(snap(blk.x), snap(blk.y), snap(blk.w), 12, C.g, 0.3);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stack) initGame();
      background();
      drawStack();
      var demoX = snap(W / 2 - 280 + (Math.sin(game.time.elapsed * 2) * 0.5 + 0.5) * 560 - moving.w / 2);
      game.draw.rect(demoX, snap(FLOOR_Y - BLOCK_H), snap(moving.w), BLOCK_H, C.a);
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 42, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.8, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedbackTimer <= 0) {
        moving.x += moving.dir * moving.speed * dt;
        if (moving.x + moving.w > W + 20) moving.dir = -1;
        if (moving.x < -20) moving.dir = 1;
      }
      if (feedbackTimer > 0) feedbackTimer -= dt;
    }

    // ---- draw ----
    background();
    drawStack();
    if (!done) {
      var mCol = BLOCK_COLORS[layer % BLOCK_COLORS.length];
      game.draw.rect(snap(moving.x), snap(moving.y), snap(moving.w), BLOCK_H, mCol);
      game.draw.rect(snap(moving.x), snap(moving.y), snap(moving.w), 12, C.g, 0.3);
    }
    if (feedbackTimer > 0) txt(feedbackText, W / 2, moving.y - 80, 80, feedbackColor);
    timeBar();
    txt('SCORE ' + String(layer * 100).padStart(6, '0'), W / 2, 96, 48, C.g);
    txt('TAP TO STACK!', W / 2, H - 120, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);

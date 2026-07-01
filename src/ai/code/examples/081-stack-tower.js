// 081-stack-tower.js
// スタックタワー — 左右に揺れるブロックをタップでズバっと積み上げる
// 操作: タップでブロックを落とす
// 成功: 2段積む  失敗: はみ出しで幅がゼロになる or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'STACK TOWER';
  var HOW_TO_PLAY = 'TAP TO DROP THE BLOCK';
  var MAX_TIME = 30;
  var NEEDED = 2;           // 修正2: 10 → 2
  var BLOCK_H = 72, BASE_Y = H - 260, STACK_GAP = BLOCK_H + 4, MOVE_Y = 320;
  var BLOCK_COLORS = [C.b, C.d, C.f, C.a, C.g, C.e];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var stack, moving, score, timeLeft, done, perfectFlash, cutFlash;

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

  function stackTop() { return stack.length ? stack[stack.length - 1] : null; }
  function spawnMoving() {
    var top = stackTop(), w = top ? top.w : W * 0.6, color = BLOCK_COLORS[stack.length % BLOCK_COLORS.length];
    var speed = 260 + score * 20, startX = (stack.length % 2 === 0) ? -w : W;
    moving = { x: startX, w: w, speed: (stack.length % 2 === 0 ? speed : -speed), color: color };
  }
  function initGame() {
    stack = []; var baseW = W * 0.6;
    stack.push({ x: (W - baseW) / 2, w: baseW, y: BASE_Y, color: BLOCK_COLORS[0] });
    score = 0; timeLeft = MAX_TIME; done = false; perfectFlash = 0; cutFlash = 0; spawnMoving();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !moving) return;
    var top = stackTop();
    var left = Math.max(top.x, moving.x), right = Math.min(top.x + top.w, moving.x + moving.w), overlap = right - left;
    if (overlap <= 0) { finish(false); return; }
    var diff = Math.abs((moving.x + moving.w / 2) - (top.x + top.w / 2)), isPerfect = diff < 12;
    var newW = isPerfect ? top.w : overlap, newX = isPerfect ? top.x : left;
    stack.push({ x: newX, w: newW, y: top.y - STACK_GAP, color: moving.color });
    score++;
    if (isPerfect) { perfectFlash = 0.5; game.audio.play('se_tap', 1.0); } else { cutFlash = 0.25; game.audio.play('se_tap', 0.6); }
    moving = null;
    if (score >= NEEDED) { finish(true); return; }
    setTimeout(spawnMoving, 100);
  });

  // 世界観: 夜景の建設現場。クレーンから降ろすブロックを高く積み上げる。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < 12; i++) { var bx = snap(i * W / 11), bh = 200 + (i * 137) % 300; game.draw.rect(bx - 30, H - bh - 100, 60, bh, '#001133'); }
    game.draw.rect(0, snap(BASE_Y), W, H - BASE_Y, '#001a1a');
    txt('CONSTRUCTION', W / 2, 260, 34, C.b);
  }

  function drawScene() {
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i];
      game.draw.rect(snap(b.x), snap(b.y - BLOCK_H), snap(b.w), BLOCK_H, b.color);
      game.draw.rect(snap(b.x) + 8, snap(b.y - BLOCK_H) + 8, 16, 16, C.g, 0.4);
      game.draw.rect(snap(b.x), snap(b.y - BLOCK_H), snap(b.w), 8, C.g, 0.3);
    }
    if (moving) {
      // クレーンのワイヤ
      game.draw.rect(snap(moving.x + moving.w / 2) - 2, 0, 4, MOVE_Y, C.c, 0.4);
      game.draw.rect(snap(moving.x), MOVE_Y, snap(moving.w), BLOCK_H, moving.color);
      game.draw.rect(snap(moving.x), MOVE_Y, snap(moving.w), 8, C.g, 0.4);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stack) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 32, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 68, C.g);
        txt('TAP TO START', W / 2, H * 0.56, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.62, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (moving) {
        moving.x += moving.speed * dt;
        if (moving.x + moving.w > W + 40) { moving.x = W + 40 - moving.w; moving.speed = -Math.abs(moving.speed); }
        if (moving.x < -40) { moving.x = -40; moving.speed = Math.abs(moving.speed); }
      }
      if (perfectFlash > 0) perfectFlash -= dt;
      if (cutFlash > 0) cutFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (perfectFlash > 0) { game.draw.rect(0, 0, W, H, C.d, perfectFlash * 0.2); txt('PERFECT!', W / 2, H * 0.4, 80, C.d); }
    timeBar();
    txt('STACK ' + score + ' / ' + NEEDED, W / 2, 96, 48, C.c);
    if (score === 0) txt('TAP TO DROP!', W / 2, H - 90, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);

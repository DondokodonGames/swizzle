// 023-freeze-frame.js
// フリーズフレーム — 激しく動く的を「今だ！」の瞬間に止める写真家の目
// 操作: タップでシャッターを切る（的が中央の枠に入った瞬間）
// 成功: 1枚完璧に撮影  失敗: 3枚ブレる or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'FREEZE FRAME';
  var HOW_TO_PLAY = 'TAP WHEN IN FRAME';
  var MAX_TIME = 18;
  var NEEDED = 1;            // 修正2: 4 → 1
  var MAX_MISS = 3;
  var TOP = 220, BOTTOM = H - 180;
  var FRAME_W = 380, FRAME_H = 380, FRAME_X = (W - 380) / 2, FRAME_Y = (H - 380) / 2;
  var subR = 88;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var sx, sy, svx, svy, score, misses, timeLeft, done, flashTimer, feedbackOk, cooldown;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy2 = 0; sy2 < H; sy2 += 8) game.draw.rect(0, sy2, W, 2, '#000000', 0.18); }
  // ── ドット絵スプライト: 被写体（羽ばたく虫）。羽はフレーム点滅 ──
  function drawCritter(x, y, col) {
    var bx = snap(x), by = snap(y), up = Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.rect(bx - 24, by - 32, 48, 64, col);          // 胴体
    game.draw.rect(bx - 16, by - 24, 32, 16, C.g, 0.5);     // 背ハイライト
    game.draw.rect(bx - 12, by - 24, 12, 12, C.c);          // 目
    game.draw.rect(bx + 2,  by - 24, 12, 12, C.c);
    game.draw.rect(bx - 8,  by - 8,  16, 12, '#000000');    // 口
    // 羽（上下に羽ばたく）
    game.draw.rect(bx - 64, by - (up ? 28 : 8), 40, 24, C.b, 0.8);
    game.draw.rect(bx + 24, by - (up ? 28 : 8), 40, 24, C.b, 0.8);
    game.draw.rect(bx - 8,  by + 32, 6, 20, col);           // 触角/脚
    game.draw.rect(bx + 2,  by + 32, 6, 20, col);
  }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function inFrame() {
    return sx > FRAME_X + subR && sx < FRAME_X + FRAME_W - subR &&
           sy > FRAME_Y + subR && sy < FRAME_Y + FRAME_H - subR;
  }

  function initGame() {
    sx = W / 2; sy = H * 0.3; svx = 580; svy = 520;
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; flashTimer = 0; feedbackOk = false; cooldown = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || cooldown > 0) return;
    cooldown = 0.5; flashTimer = 0.3;
    if (inFrame()) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      svx *= -1.1; svy *= -0.9;
      if (score >= NEEDED) finish(true);
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() { game.draw.clear(C.bg); }

  function drawFrame() {
    var col = inFrame() ? C.b : '#444466', fc = 88;
    game.draw.rect(FRAME_X, FRAME_Y, fc, 8, col); game.draw.rect(FRAME_X, FRAME_Y, 8, fc, col);
    game.draw.rect(FRAME_X + FRAME_W - fc, FRAME_Y, fc, 8, col); game.draw.rect(FRAME_X + FRAME_W - 8, FRAME_Y, 8, fc, col);
    game.draw.rect(FRAME_X, FRAME_Y + FRAME_H - 8, fc, 8, col); game.draw.rect(FRAME_X, FRAME_Y + FRAME_H - fc, 8, fc, col);
    game.draw.rect(FRAME_X + FRAME_W - fc, FRAME_Y + FRAME_H - 8, fc, 8, col); game.draw.rect(FRAME_X + FRAME_W - 8, FRAME_Y + FRAME_H - fc, 8, fc, col);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawFrame();
      drawCritter(W / 2 + Math.cos(game.time.elapsed * 2) * 300, H / 2 + Math.sin(game.time.elapsed * 3) * 300, C.f);
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 42, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.85, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 42, '#888888');
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
      var sp = 1.0 + (MAX_TIME - timeLeft) * 0.04;
      sx += svx * sp * dt; sy += svy * sp * dt;
      if (sx < subR + 40) { sx = subR + 40; svx = Math.abs(svx); }
      if (sx > W - subR - 40) { sx = W - subR - 40; svx = -Math.abs(svx); }
      if (sy < TOP + subR) { sy = TOP + subR; svy = Math.abs(svy); }
      if (sy > BOTTOM - subR) { sy = BOTTOM - subR; svy = -Math.abs(svy); }
      if (flashTimer > 0) flashTimer -= dt;
      if (cooldown > 0) cooldown -= dt;
    }

    // ---- draw ----
    background();
    drawFrame();
    drawCritter(sx, sy, inFrame() ? C.f : C.e);
    if (flashTimer > 0) {
      var fa = flashTimer / 0.3;
      game.draw.rect(0, 0, W, H, C.c, fa * 0.7);
      if (fa > 0.3) txt(feedbackOk ? 'SNAP!!' : 'BLURRED', W / 2, H / 2, 110, feedbackOk ? C.f : C.e);
    }
    if (inFrame() && cooldown <= 0 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('IN FRAME', W / 2, FRAME_Y - 60, 52, C.b);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#330000');
    txt('SHOOT IN FRAME!', W / 2, H - 120, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);

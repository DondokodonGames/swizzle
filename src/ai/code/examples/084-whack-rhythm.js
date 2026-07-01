// 084-whack-rhythm.js
// リズムモグラ — BPM120のビートに乗ってモグラが出た瞬間をタップする音ゲー
// 操作: タップでモグラを叩く（ビートのタイミングで）
// 成功: 2匹叩く  失敗: 3回外す or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'RHYTHM MOLE';
  var HOW_TO_PLAY = 'WHACK MOLES ON THE BEAT';
  var MAX_TIME = 25;
  var NEEDED = 2;           // 修正2: 15 → 2
  var MAX_MISS = 3;         // 修正2: 5 → 3
  var COLS = 3, ROWS = 3, CELL_W = 300, CELL_H = 300;
  var GRID_X = (W - COLS * CELL_W) / 2, GRID_Y = H * 0.32;
  var BPM = 120, BEAT = 60 / BPM;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var moles, score, misses, timeLeft, done, feedback, feedbackOk, beatTimer, beatCount, beatFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function holeX(idx) { return GRID_X + (idx % COLS) * CELL_W + CELL_W / 2; }
  function holeY(idx) { return GRID_Y + Math.floor(idx / COLS) * CELL_H + CELL_H * 0.55; }

  function initGame() {
    moles = []; for (var i = 0; i < 9; i++) moles.push({ up: false, timer: 0, hitTimer: 0 });
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; beatTimer = BEAT; beatCount = 0; beatFlash = 0;
  }

  function raiseMole() {
    var down = []; for (var i = 0; i < 9; i++) if (!moles[i].up) down.push(i);
    if (!down.length) return;
    var idx = down[Math.floor(Math.random() * down.length)];
    moles[idx].up = true; moles[idx].timer = BEAT * 3;
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

  function addMiss() { misses++; feedbackOk = false; feedback = 0.35; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) finish(false); }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < 9; i++) {
      if (!moles[i].up) continue;
      var dx = tx - holeX(i), dy = ty - holeY(i);
      if (Math.sqrt(dx * dx + dy * dy) < 90) {
        moles[i].up = false; moles[i].timer = 0; moles[i].hitTimer = 0.25;
        score++; feedbackOk = true; feedback = 0.3; game.audio.play('se_tap', 0.9);
        if (score >= NEEDED) finish(true);
        return;
      }
    }
    if (!moles.some(function(m) { return m.up; })) addMiss();
  });

  // モグラのドット絵スプライト（多矩形）
  function drawMole(cx, cy, y) {
    cx = snap(cx); cy = snap(y);
    game.draw.rect(cx - 40, cy - 32, 80, 64, C.f);       // 顔
    game.draw.rect(cx - 48, cy - 8, 16, 40, C.f);        // ほほ
    game.draw.rect(cx + 32, cy - 8, 16, 40, C.f);
    game.draw.rect(cx - 24, cy - 16, 16, 16, C.g);       // 目
    game.draw.rect(cx + 8, cy - 16, 16, 16, C.g);
    game.draw.rect(cx - 20, cy - 12, 8, 8, '#000000');
    game.draw.rect(cx + 12, cy - 12, 8, 8, '#000000');
    game.draw.rect(cx - 8, cy + 8, 16, 16, C.a);         // 鼻
  }

  // 世界観: ネオンのリズムステージ。ビートに合わせて穴から出るモグラを叩く。
  function background() {
    game.draw.clear('#0a0018');
    if (beatFlash > 0) game.draw.rect(0, 0, W, H, C.d, beatFlash / 0.12 * 0.12);
    txt('BEAT STAGE', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var j = 0; j < 9; j++) {
      var cx = holeX(j), cy = holeY(j), m = moles[j];
      game.draw.rect(snap(cx) - 96, snap(cy) - 8, 192, 72, '#12002a');       // 穴
      game.draw.rect(snap(cx) - 96, snap(cy) - 8, 192, 12, C.d, 0.5);
      if (m.up) {
        var upFrac = Math.min(1, (BEAT * 3 - m.timer) / (BEAT * 0.5)), moleY = cy + 20 - upFrac * 70;
        drawMole(cx, cy, moleY);
        if (m.timer < BEAT && Math.floor(game.time.elapsed * 12) % 2 === 0) drawPixelCircle(cx, moleY, 56, C.g, 0.2);
      } else if (m.hitTimer > 0) {
        drawPixelCircle(cx, cy - 10, 40 + (1 - m.hitTimer / 0.25) * 40, C.b, m.hitTimer / 0.25 * 0.6);
        txt('HIT!', cx, cy - 10, 40, C.g);
      }
    }
    // ビートインジケータ
    var phase = 1 - beatTimer / BEAT;
    drawPixelCircle(W / 2, H * 0.26, 24 + phase * 12, C.d, 0.5 + phase * 0.4);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!moles) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 66, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      beatTimer -= dt;
      if (beatTimer <= 0) { beatTimer = BEAT; beatCount++; beatFlash = 0.12; if (beatCount % 2 === 0) raiseMole(); }
      if (beatFlash > 0) beatFlash -= dt;
      for (var i = 0; i < 9; i++) {
        var m = moles[i];
        if (m.up) { m.timer -= dt; if (m.timer <= 0) { m.up = false; addMiss(); } }
        if (m.hitTimer > 0) m.hitTimer -= dt;
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'NICE!' : 'MISS!', W / 2, H * 0.86, 68, feedbackOk ? C.b : C.a);
    timeBar();
    txt('WHACK ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(W / 2 + (mi - 1) * 64 - 20, 150, 40, 40, mi < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);

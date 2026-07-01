// 102-jewel-match.js
// 宝石マッチ — 落ちてくる宝石を同じ色で連続キャッチしてコンボを繋ぐ
// 操作: タップで宝石をキャッチ（保持中の色と同じなら加点）
// 成功: 2個収集  失敗: 3回ミスマッチ or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'JEWEL MATCH';
  var HOW_TO_PLAY = 'CATCH SAME-COLOR JEWELS';
  var MAX_TIME = 30;
  var NEEDED = 2;           // 修正2: 20 → 2
  var MAX_MISS = 3;         // 修正2: 5 → 3
  var SPAWN_INTERVAL = 1.0;
  var GEMS = [C.a, C.e, C.b, C.c, C.d];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var falling, heldColor, combo, score, misses, timeLeft, done, spawnTimer, feedback, feedbackOk, comboFlash;

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

  // 宝石のドット絵（ダイヤ型を矩形で）
  function drawGem(x, y, color, size) {
    x = snap(x); y = snap(y); var s = size;
    game.draw.rect(x - s / 2, y - s / 4, s, s / 2, color);
    game.draw.rect(x - s / 4, y - s / 2, s / 2, s / 4, color);
    game.draw.rect(x - s / 4, y + s / 4, s / 2, s / 4, color);
    game.draw.rect(x - s / 6, y - s / 3, s / 6, s / 6, C.g, 0.6);
  }

  function spawnGem() { falling.push({ x: snap(120 + Math.random() * (W - 240)), y: -60, vy: 280 + score * 20, gem: Math.floor(Math.random() * GEMS.length), caught: false, ct: 0 }); }
  function initGame() { falling = []; heldColor = -1; combo = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; feedback = 0; feedbackOk = false; comboFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + combo * 40 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bestY = -9999;
    for (var i = 0; i < falling.length; i++) { var g = falling[i]; if (g.caught) continue; if (Math.sqrt((tx - g.x) * (tx - g.x) + (ty - g.y) * (ty - g.y)) < 90 && g.y > bestY) { bestY = g.y; best = i; } }
    if (best < 0) return;
    var gem = falling[best];
    if (heldColor === -1) { heldColor = gem.gem; gem.caught = true; gem.ct = 0.3; score++; combo = 1; game.audio.play('se_tap', 0.7); }
    else if (gem.gem === heldColor) { gem.caught = true; gem.ct = 0.3; combo++; score++; feedbackOk = true; feedback = 0.3; game.audio.play('se_tap', 0.9); if (combo >= 3) comboFlash = 0.4; }
    else { misses++; feedbackOk = false; feedback = 0.35; heldColor = gem.gem; combo = 1; gem.caught = true; gem.ct = 0.3; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) { finish(false); return; } }
    if (score >= NEEDED) finish(true);
  });

  // 世界観: 宝石鉱山。降り注ぐ宝石を同じ色でキャッチし連鎖を繋ぐ。
  function background() {
    game.draw.clear('#0a0018');
    if (comboFlash > 0) game.draw.rect(0, 0, W, H, C.c, comboFlash / 0.4 * 0.15);
    for (var i = 0; i < 20; i++) { var sx = snap((i * 149) % W), sy = snap((i * 211 + game.time.elapsed * 30) % H); game.draw.rect(sx, sy, 6, 6, C.d, 0.2); }
    txt('JEWEL MINE', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var gi = 0; gi < falling.length; gi++) {
      var g = falling[gi];
      if (!g.caught) drawGem(g.x, g.y, GEMS[g.gem], 72);
      else { var cf = g.ct / 0.3; drawPixelCircle(g.x, g.y, 36 + (1 - cf) * 40, GEMS[g.gem], cf * 0.6); txt('+', g.x, g.y, 44, C.g); }
    }
    if (heldColor >= 0) { drawGem(W / 2, H * 0.82, GEMS[heldColor], 84); txt('HOLD', W / 2, H * 0.88, 34, C.c); if (combo > 1) txt('x' + combo, W / 2 + 100, H * 0.82, 48, C.c); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!falling) initGame();
      background();
      drawGem(W / 2, H * 0.5, C.a, 100);
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.215, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.83, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.88, 40, '#888888');
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
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = Math.max(0.6, SPAWN_INTERVAL - score * 0.05); spawnGem(); }
      for (var i = falling.length - 1; i >= 0; i--) {
        var g = falling[i];
        if (!g.caught) { g.y += g.vy * dt; if (g.y > H + 80) { falling.splice(i, 1); combo = 0; heldColor = -1; } }
        else { g.ct -= dt; if (g.ct <= 0) falling.splice(i, 1); }
      }
      if (feedback > 0) feedback -= dt;
      if (comboFlash > 0) comboFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (comboFlash > 0) txt('COMBO ' + combo + '!', W / 2, H * 0.3, 80, C.c);
    else if (feedback > 0) txt(feedbackOk ? 'MATCH!' : 'MISMATCH!', W / 2, H * 0.38, 64, feedbackOk ? C.b : C.a);
    timeBar();
    txt('JEWELS ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);

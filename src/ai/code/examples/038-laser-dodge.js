// 038-laser-dodge.js
// レーザードッジ — チカッと光るレーザーを体で避ける緊張の一瞬
// 操作: スワイプで位置を3列のうち一つに移動
// 成功: 5秒生存  失敗: レーザーに当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'LASER DODGE';
  var HOW_TO_PLAY = 'SWIPE TO DODGE LASERS';
  var MAX_TIME = 5;         // 修正2: 生存系 15s → 5s
  var COL_COUNT = 3, COL_W = W / 3, PLAYER_R = 64, PLAYER_Y = H * 0.75;  // 修正1: プレイヤー下3分の1
  var WARNING_TIME = 0.7, ACTIVE_TIME = 0.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerCol, lasers, timeLeft, done, elapsed;

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

  function spawnLaser() { lasers.push({ col: Math.floor(Math.random() * COL_COUNT), warnTimer: WARNING_TIME, activeTimer: 0, st: 'warn' }); }
  function initGame() { playerCol = 1; lasers = []; timeLeft = MAX_TIME; done = false; elapsed = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? 300 : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left' && playerCol > 0) { playerCol--; game.audio.play('se_tap', 0.4); }
    else if (dir === 'right' && playerCol < 2) { playerCol++; game.audio.play('se_tap', 0.4); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  function background() {
    game.draw.clear(C.bg);
    for (var c = 1; c < COL_COUNT; c++) game.draw.rect(c * COL_W - 2, 0, 4, H, '#000044');
  }

  function drawLasers() {
    for (var l = 0; l < lasers.length; l++) {
      var ls = lasers[l], lx = ls.col * COL_W + COL_W / 2;
      if (ls.st === 'warn') {
        var wa = (Math.floor(game.time.elapsed * 12) % 2) === 0 ? 0.5 : 0.2;
        game.draw.rect(ls.col * COL_W, 0, COL_W, H, C.d, wa * 0.3);
        game.draw.line(lx, 0, lx, H, C.d, 6);
        txt('!', lx, H * 0.2, 80, C.d);
      } else {
        game.draw.rect(ls.col * COL_W, 0, COL_W, H, C.e, 0.4);
        game.draw.line(lx, 0, lx, H, C.c, 14);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lasers) initGame();
      background();
      drawPixelCircle(1 * COL_W + COL_W / 2, PLAYER_Y, PLAYER_R, C.b, 1);
      txt(GAME_TITLE,  W / 2, H * 0.18, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.58, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.66, 42, '#888888');
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
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(true); return; }
      var spawnRate = Math.max(0.5, 1.5 - elapsed * 0.1);
      if (Math.random() < dt / spawnRate) { spawnLaser(); if (elapsed > 2 && Math.random() < 0.3) spawnLaser(); }
      for (var i = lasers.length - 1; i >= 0; i--) {
        var ls = lasers[i];
        if (ls.st === 'warn') { ls.warnTimer -= dt; if (ls.warnTimer <= 0) { ls.st = 'active'; ls.activeTimer = ACTIVE_TIME; game.audio.play('se_failure', 0.3); } }
        else { ls.activeTimer -= dt; if (ls.col === playerCol) { finish(false); return; } if (ls.activeTimer <= 0) lasers.splice(i, 1); }
      }
    }

    // ---- draw ----
    background();
    drawLasers();
    drawPixelCircle(playerCol * COL_W + COL_W / 2, PLAYER_Y, PLAYER_R, C.b, 1);
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    txt('SWIPE TO DODGE!', W / 2, H - 120, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 094-dominoes-fall.js
// ドミノ倒し — 最初の1本を倒すと連鎖でドミノが次々倒れる爽快感
// 操作: タップで最初のドミノを押す（止まったら近くのドミノをタップ）
// 成功: 全3本倒す  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'DOMINO FALL';
  var HOW_TO_PLAY = 'TAP TO TOPPLE THE CHAIN';
  var MAX_TIME = 20;
  var NUM_DOMINOS = 3;      // 修正2: 30 → 3
  var DOMINO_W = 40, DOMINO_H = 200, DOMINO_GAP = 180, FLOOR_Y = H * 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var dominos, started, score, timeLeft, done;

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
    dominos = [];
    var totalW = NUM_DOMINOS * (DOMINO_W + DOMINO_GAP) - DOMINO_GAP, startX = (W - totalW) / 2;
    for (var i = 0; i < NUM_DOMINOS; i++) dominos.push({ x: startX + i * (DOMINO_W + DOMINO_GAP), angle: 0, falling: false, fallen: false });
    started = false; score = 0; timeLeft = MAX_TIME; done = false;
  }
  function startFalling(idx) { if (idx >= 0 && idx < NUM_DOMINOS && !dominos[idx].falling && !dominos[idx].fallen) dominos[idx].falling = true; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (!started) { started = true; startFalling(0); game.audio.play('se_tap', 0.7); return; }
    for (var i = 0; i < NUM_DOMINOS; i++) {
      if (dominos[i].fallen || dominos[i].falling) continue;
      if (Math.abs(tx - dominos[i].x) < 90 && Math.abs(ty - (FLOOR_Y - DOMINO_H / 2)) < 140) { startFalling(i); game.audio.play('se_tap', 0.5); break; }
    }
  });

  // 世界観: ドミノ工房。1本目を倒すと連鎖で全てのドミノが倒れていく。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(0, snap(FLOOR_Y), W, H - FLOOR_Y, '#001133');
    game.draw.rect(0, snap(FLOOR_Y), W, 8, C.a);
    txt('DOMINO LAB', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var k = 0; k < NUM_DOMINOS; k++) {
      var d = dominos[k], rad = d.angle * Math.PI / 180, pivotX = d.x + DOMINO_W / 2;
      var topX = pivotX + Math.sin(rad) * DOMINO_H, topY = FLOOR_Y - Math.cos(rad) * DOMINO_H;
      var col = d.fallen ? '#005588' : (d.falling ? C.b : C.a);
      game.draw.line(pivotX, FLOOR_Y, topX, topY, col, DOMINO_W);
      if (!d.fallen) {
        game.draw.rect(snap(pivotX - DOMINO_W / 2) + 8, snap(FLOOR_Y - DOMINO_H) + 16, DOMINO_W - 16, 16, C.c, 0.4);
        game.draw.rect(snap(pivotX) - 6, snap(FLOOR_Y - DOMINO_H * 0.5), 12, 12, C.c, 0.6);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!dominos) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 66, C.g);
        txt('TAP TO START', W / 2, H * 0.83, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.88, 40, '#888888');
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
      for (var i = 0; i < NUM_DOMINOS; i++) {
        var d = dominos[i];
        if (d.falling) {
          d.angle += 200 * dt;
          if (d.angle >= 90) { d.angle = 90; d.fallen = true; d.falling = false; score++; game.audio.play('se_tap', 0.4); if (score >= NUM_DOMINOS) { finish(true); return; } }
          var tipX = d.x + Math.sin(d.angle * Math.PI / 180) * DOMINO_H;
          if (i + 1 < NUM_DOMINOS && !dominos[i + 1].falling && !dominos[i + 1].fallen && tipX >= dominos[i + 1].x) startFalling(i + 1);
        }
      }
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('FALLEN ' + score + ' / ' + NUM_DOMINOS, W / 2, 96, 44, C.c);
    if (!started) txt('TAP TO TOPPLE!', W / 2, H - 90, 48, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);

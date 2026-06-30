// 030-ice-slide.js
// 氷上スライド — 止まれない氷の上でゴールを目指す爽快なパズル
// 操作: スワイプで方向指定（壁にぶつかるまで滑り続ける）
// 成功: ゴールに到達  失敗: 穴に落ちる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'ICE SLIDE';
  var HOW_TO_PLAY = 'SWIPE TO SLIDE TO GOAL';
  var MAX_TIME = 20;
  var COLS = 7, ROWS = 9, CELL = 132, GAP = 8;
  var GRID_W = COLS * (CELL + GAP) - GAP, GRID_H = ROWS * (CELL + GAP) - GAP;
  var GRID_X = (W - GRID_W) / 2, GRID_Y = (H - GRID_H) / 2;   // 修正1: 縦中央
  // 修正2: 2手(右→下)で到達できる簡易盤面。0=氷 1=壁 2=穴
  var LEVEL = [
    1,1,1,1,1,1,1,
    1,0,0,0,0,0,1,
    1,0,0,0,0,0,1,
    1,0,0,2,0,0,1,
    1,0,0,0,0,0,1,
    1,0,0,0,0,0,1,
    1,0,2,0,0,0,1,
    1,0,0,0,0,0,1,
    1,1,1,1,1,1,1
  ];
  var GOAL_COL = 5, GOAL_ROW = 7, START_COL = 1, START_ROW = 1, SLIDE_SPEED = 1400;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerCol, playerRow, playerX, playerY, sliding, slideVx, slideVy, slideTC, slideTR, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  // ── ドット絵スプライト: ペンギン（体＋お腹＋目＋くちばし＋足）──
  function drawPenguin(x, y) {
    var bx = snap(x), by = snap(y);
    game.draw.rect(bx - 32, by - 40, 64, 80, '#001133');     // 体(黒っぽい青)
    game.draw.rect(bx - 20, by - 16, 40, 48, C.c);           // お腹(白)
    game.draw.rect(bx - 24, by - 40, 48, 16, '#001133');     // 頭
    game.draw.rect(bx - 16, by - 32, 12, 12, C.c);           // 左目
    game.draw.rect(bx + 4,  by - 32, 12, 12, C.c);           // 右目
    game.draw.rect(bx - 6,  by - 20, 12, 8,  C.d);           // くちばし
    game.draw.rect(bx - 24, by + 40, 16, 8,  C.d);           // 左足
    game.draw.rect(bx + 8,  by + 40, 16, 8,  C.d);           // 右足
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

  function cellIdx(c, r) { return r * COLS + c; }
  function cellCenter(c, r) { return { x: GRID_X + c * (CELL + GAP) + CELL / 2, y: GRID_Y + r * (CELL + GAP) + CELL / 2 }; }
  function isIce(c, r) { if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false; return LEVEL[cellIdx(c, r)] === 0 || LEVEL[cellIdx(c, r)] === 2; }

  function initGame() {
    playerCol = START_COL; playerRow = START_ROW;
    var sp = cellCenter(START_COL, START_ROW); playerX = sp.x; playerY = sp.y;
    sliding = false; timeLeft = MAX_TIME; done = false;
  }

  function startSlide(dc, dr) {
    if (sliding || done) return;
    var tc = playerCol, tr = playerRow;
    while (true) {
      var nc = tc + dc, nr = tr + dr;
      if (!isIce(nc, nr)) break;
      tc = nc; tr = nr;
      if (LEVEL[cellIdx(tc, tr)] === 2) break; // 穴で停止(落下)
    }
    if (tc === playerCol && tr === playerRow) return;
    slideTC = tc; slideTR = tr;
    var s = cellCenter(playerCol, playerRow), e = cellCenter(tc, tr);
    var len = Math.abs(e.x - s.x) + Math.abs(e.y - s.y) || 1;
    slideVx = (e.x - s.x) / len * SLIDE_SPEED; slideVy = (e.y - s.y) / len * SLIDE_SPEED;
    sliding = true;
    game.audio.play('se_tap', 0.5);
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 30) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (dir === 'right') startSlide(1, 0);
    if (dir === 'left')  startSlide(-1, 0);
    if (dir === 'down')  startSlide(0, 1);
    if (dir === 'up')    startSlide(0, -1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  function background() { game.draw.clear(C.bg); }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ci = cellIdx(c, r), cx = GRID_X + c * (CELL + GAP), cy = GRID_Y + r * (CELL + GAP), type = LEVEL[ci];
      if (type === 1) game.draw.rect(cx, cy, CELL, CELL, C.a);
      else if (type === 2) { game.draw.rect(cx, cy, CELL, CELL, '#000022'); drawPixelCircle(cx + CELL / 2, cy + CELL / 2, CELL * 0.32, '#000000', 1); }
      else game.draw.rect(cx, cy, CELL, CELL, C.b, 0.4);
      if (c === GOAL_COL && r === GOAL_ROW) { game.draw.rect(cx, cy, CELL, CELL, C.f, 0.6); txt('G', cx + CELL / 2, cy + CELL / 2, 64, C.g); }
    }
    drawPenguin(playerX, playerY);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (playerX === undefined) initGame();
      background();
      drawGrid();
      txt(GAME_TITLE,  W / 2, H * 0.06, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.93, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 42, '#888888');
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
      if (sliding) {
        playerX += slideVx * dt; playerY += slideVy * dt;
        var tp = cellCenter(slideTC, slideTR);
        var dx = tp.x - playerX, dy = tp.y - playerY;
        if (dx * slideVx + dy * slideVy <= 0) {
          playerX = tp.x; playerY = tp.y; playerCol = slideTC; playerRow = slideTR; sliding = false;
          if (LEVEL[cellIdx(playerCol, playerRow)] === 2) { finish(false); return; }
          if (playerCol === GOAL_COL && playerRow === GOAL_ROW) { finish(true); return; }
        }
      }
    }

    // ---- draw ----
    background();
    drawGrid();
    timeBar();
    txt('REACH THE GOAL!', W / 2, 96, 48, C.f);
    txt('SWIPE TO SLIDE!', W / 2, H - 80, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);

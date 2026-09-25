// D-20132016-0043-cannon-wall-break.js
// キャノンウォールブレイク — タップで狙いを定めて玉を連射し、迫りくるブロックの壁を崩す
// 操作: 画面をタップした方向へ玉を発射する。壁が下の防衛ラインに届く前に崩す
// 終わり: 規定数(10個)のブロックを崩せば成功。壁が防衛ラインに届けば失敗
// @mechanic: aim_shoot
// @theme: crystal_cannon_outpost
// 世界観: 砦の最前線に据えられた水晶砲台。迫りくる結晶ブロックの壁へ玉を撃ち込み、砦の生命線を守る砲手
// 残るもの: 正誤(CLEAR/GAME OVER) + 崩したブロック数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 強いグラデーション、光沢ハイライト、太い縁取り
  var C = {
    bg: '#1a2a4a', bg2: '#0a1228', block: '#5ad0ff', blockEdge: '#1a7aa8', blockHi: '#c8f4ff',
    cannon: '#ffb020', cannonDark: '#a86a10', line: '#ff4d5e', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#eef6ff', ink: '#04080e',
  };

  var GAME_TITLE = 'WALL BREAK';
  var TOTAL = 10;
  var COLS = 4, ROWS = 3;
  var CELL_W = 200, CELL_H = 110;
  var GRID_X0 = W * 0.5 - (COLS * CELL_W) / 2;
  var GRID_Y0 = H * 0.22;
  var DANGER_Y = H * 0.62;
  var CANNON_Y = H * 0.84;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var broken, done, endWait, finished;
  var ready, hitStop, shake;
  var grid, wallY, balls, fireCd, aimX;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 8; i++) {
      game.draw.rect(0, i * (H / 8), W, 2, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3 + i));
    }
    var warnAlpha = 0.15 + 0.1 * Math.sin(game.time.elapsed * 3);
    game.draw.rect(0, DANGER_Y, W, 6, C.line, 0.6);
    game.draw.rect(0, DANGER_Y - 20, W, 20, C.line, warnAlpha);
  }

  function buildGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) grid.push({ r: r, c: c, alive: true });
    }
  }

  function initGame() {
    broken = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    buildGrid();
    wallY = GRID_Y0; balls = []; fireCd = 0; aimX = W * 0.5;
  }

  var CANNON_SPRITE = ['..##..', '.####.', '######', '.####.'];
  function drawCannon() {
    var bob = Math.sin(game.time.elapsed * 2.4) * 4;
    game.draw.sprite(CANNON_SPRITE, { '#': C.cannon }, W * 0.5, CANNON_Y + bob, 20, { anchor: 'center' });
    game.draw.line(W * 0.5, CANNON_Y, aimX, CANNON_Y - 140, C.cannonDark, 6);
  }

  function drawGrid() {
    for (var i = 0; i < grid.length; i++) {
      var b = grid[i];
      if (!b.alive) continue;
      var x = GRID_X0 + b.c * CELL_W;
      var y = wallY + b.r * CELL_H;
      if (y > H + 100) continue;
      var nearDanger = y + CELL_H > DANGER_Y - 60;
      var warn = nearDanger && Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.rect(x + 8, y + 8, CELL_W - 16, CELL_H - 16, C.blockEdge);
      game.draw.rect(x + 16, y + 16, CELL_W - 32, CELL_H - 32, warn ? C.line : C.block);
      game.draw.rect(x + 18, y + 18, CELL_W - 40, 14, C.blockHi, 0.6);
    }
  }

  function drawBalls() {
    for (var i = 0; i < balls.length; i++) {
      var bl = balls[i];
      game.draw.circle(bl.x, bl.y, 16, C.cannon);
      game.draw.circle(bl.x, bl.y, 8, C.blockHi, 0.7);
    }
  }

  function fireBall(tx, ty) {
    if (fireCd > 0 || ready > 0 || done || finished) return;
    fireCd = 0.22;
    var dx = tx - W * 0.5, dy = ty - CANNON_Y;
    var len = Math.hypot(dx, dy) || 1;
    var speed = 1500;
    balls.push({ x: W * 0.5, y: CANNON_Y, vx: (dx / len) * speed, vy: (dy / len) * speed });
    aimX = tx;
    game.audio.play('se_jump', 0.25);
    game.fx.burst(W * 0.5, CANNON_Y, { color: C.cannon, count: 6, speed: 200 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) fireBall(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateBalls(dt) {
    for (var i = balls.length - 1; i >= 0; i--) {
      var bl = balls[i];
      bl.x += bl.vx * dt; bl.y += bl.vy * dt;
      if (bl.x < 20) { bl.x = 20; bl.vx *= -1; }
      if (bl.x > W - 20) { bl.x = W - 20; bl.vx *= -1; }
      if (bl.y < -30 || bl.y > H + 30) { balls.splice(i, 1); continue; }
      var hitIdx = -1;
      for (var j = 0; j < grid.length; j++) {
        var b = grid[j];
        if (!b.alive) continue;
        var bx = GRID_X0 + b.c * CELL_W, by = wallY + b.r * CELL_H;
        if (game.hit.rect(bl.x - 10, bl.y - 10, 20, 20, bx, by, CELL_W, CELL_H)) { hitIdx = j; break; }
      }
      if (hitIdx >= 0) {
        grid[hitIdx].alive = false;
        broken++;
        balls.splice(i, 1);
        var bx2 = GRID_X0 + grid[hitIdx].c * CELL_W + CELL_W / 2, by2 = wallY + grid[hitIdx].r * CELL_H + CELL_H / 2;
        game.feedback.good(bx2, by2, { text: 'BREAK', color: C.good, count: 10 });
        game.fx.burst(bx2, by2, { color: C.block, count: 14, speed: 300 });
        game.audio.play('se_break', 0.4);
        if (broken === 5) game.fx.popup('HALFWAY!', W * 0.5, H * 0.14, { color: C.gold, size: 38 });
        if (broken >= TOTAL) { ok = true; finished = true; finish(); }
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: CANNON_Y - 100, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { buildGrid(); broken = 0; wallY = GRID_Y0; balls = []; }
    wallY += 6 * dt;
    if (Math.floor(cyc / 0.5) !== Math.floor((cyc - dt) / 0.5)) {
      var target = null;
      for (var j = 0; j < grid.length; j++) if (grid[j].alive) { target = grid[j]; break; }
      if (target) {
        var tx = GRID_X0 + target.c * CELL_W + CELL_W / 2, ty = wallY + target.r * CELL_H + CELL_H / 2;
        demo.gx = tx; demo.gy = ty; demo.press = true;
        fireBall(tx, ty);
      }
    } else demo.press = false;
    updateBalls(dt);
  }

  game.onUpdate(function(dt) {
    if (fireCd > 0) fireCd -= dt;

    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGrid();
      drawBalls();
      drawCannon();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      drawCannon();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(broken + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - broken) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(broken, { broken: broken, total: TOTAL });
        else game.end.failure({ broken: broken, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      wallY += 14 * dt;
      updateBalls(dt);
      var maxY = GRID_Y0;
      for (var r = ROWS - 1; r >= 0; r--) {
        var rowAlive = false;
        for (var c = 0; c < COLS; c++) { var cell = grid[r * COLS + c]; if (cell.alive) rowAlive = true; }
        if (rowAlive) { maxY = wallY + r * CELL_H + CELL_H; break; }
      }
      if (maxY >= DANGER_Y) {
        ok = false; finished = true;
        hitStop = 0.35;
        game.feedback.bad(W * 0.5, DANGER_Y, { text: 'BREACH' });
        shake = 0.35;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();
    drawBalls();
    if (!finished) drawCannon();

    txt(broken + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (broken / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

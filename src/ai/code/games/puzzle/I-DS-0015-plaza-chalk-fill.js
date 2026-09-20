// I-DS-0015-plaza-chalk-fill.js
// プラザ・チョーク・フィル — 広場の石畳に描かれた輪の中を、時間内にこすって色で塗りつぶす
// 操作: 指を輪の中で素早く往復させてこすり、マス目を塗る。止まっていると塗った部分が色褪せていく
// 終わり: 制限時間内に100%塗りきれば成功。時間切れなら失敗
// @mechanic: rub
// @theme: plaza_chalk_fill
// 世界観: 縁日の広場でキツネの大道絵師が、閉店の鐘が鳴るまでにチョークの輪を塗りきる一発芸
// 残るもの: 正誤(CLEAR/GAME OVER) + 塗れた面積%
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るいパステル背景、光の柱
  var C = {
    bgTop: '#fff2d6', bgBot: '#ffd9ee', ring: '#ffffff', ringLine: '#ff5fa0',
    cellOff: '#ffe8f4', cellOn: '#ff8fc4', danger: '#ff3b5c',
    good: '#33d17a', bad: '#ff3b5c', gold: '#ffb62e', ink: '#3a1030', white: '#ffffff',
  };

  var GAME_TITLE = 'CHALK FILL';
  var MAX_TIME = 11;
  var CX = W * 0.5, CY = H * 0.46, ZONE_R = W * 0.32;
  var GRID = 9; // 9x9マス
  var CELL = (ZONE_R * 2) / GRID;
  var BRUSH_R = CELL * 0.95;
  var DECAY_PER_S = 0.05; // 触れていないマスは色褪せる

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cells; // {x,y,inZone,fill}
  var timeLeft, filledPct, done, endWait, finished, milestone50, milestone80;
  var ready, hitStop, shake;
  var lastX, lastY, lastT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FOX_A = ['.#..#.', '######', '#.##.#', '######', '.#..#.'];
  var FOX_B = ['.#..#.', '######', '#.##.#', '.####.', '.#..#.'];

  function buildCells() {
    cells = [];
    for (var gy = 0; gy < GRID; gy++) {
      for (var gx = 0; gx < GRID; gx++) {
        var x = CX - ZONE_R + CELL * gx + CELL / 2;
        var y = CY - ZONE_R + CELL * gy + CELL / 2;
        var inZone = Math.hypot(x - CX, y - CY) <= ZONE_R;
        cells.push({ x: x, y: y, inZone: inZone, fill: 0 });
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [1, C.bgBot]]);
    for (var i = 0; i < 4; i++) game.draw.rect(W * (0.1 + i * 0.28), 0, 30, H, '#ffffff', 0.12);
  }

  function drawZone() {
    game.draw.circle(CX, CY, ZONE_R + 14, C.ring);
    game.draw.circle(CX, CY, ZONE_R + 14, C.ringLine, 0.0);
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (!c.inZone) continue;
      var col = c.fill > 0.5 ? C.cellOn : C.cellOff;
      game.draw.rect(c.x - CELL / 2 + 2, c.y - CELL / 2 + 2, CELL - 4, CELL - 4, col, 0.35 + c.fill * 0.65);
    }
    game.draw.circle(CX, CY, ZONE_R, C.ringLine, 0);
  }

  function computeFillPct() {
    var total = 0, sum = 0;
    for (var i = 0; i < cells.length; i++) {
      if (!cells[i].inZone) continue;
      total++; sum += cells[i].fill;
    }
    return total > 0 ? sum / total : 0;
  }

  function rubAt(x, y, speed) {
    if (speed < 260) return; // ゆっくり触れているだけでは塗れない(こすり判定)
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (!c.inZone) continue;
      if (Math.hypot(c.x - x, c.y - y) <= BRUSH_R) c.fill = Math.min(1, c.fill + 0.5);
    }
  }

  function initGame() {
    buildCells();
    timeLeft = MAX_TIME; filledPct = 0; done = false; endWait = 0; finished = false;
    milestone50 = false; milestone80 = false;
    ready = 0.8; hitStop = 0; shake = 0;
    lastX = CX; lastY = CY; lastT = 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    lastX = x; lastY = y;
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    var speed = Math.hypot(x - lastX, y - lastY) / Math.max(0.001, game.time.delta);
    if (speed >= 260) {
      rubAt(x, y, speed);
      if (Math.random() < 0.3) game.audio.play('se_tap', 0.03);
    }
    lastX = x; lastY = y;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.2;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: true, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { buildCells(); }
    demo.phase += dt * 9;
    var r = ZONE_R * 0.7;
    demo.gx = CX + Math.cos(demo.phase) * r * (0.3 + 0.7 * Math.min(1, cyc / 3.6));
    demo.gy = CY + Math.sin(demo.phase * 1.7) * r * (0.3 + 0.7 * Math.min(1, cyc / 3.6));
    demo.press = cyc < 3.6;
    if (demo.press) rubAt(demo.gx, demo.gy, 999);
    filledPct = computeFillPct();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cells === undefined) initGame();
      bg();
      stepDemo(dt);
      drawZone();
      game.draw.sprite(Math.floor(game.time.elapsed * 4) % 2 === 0 ? FOX_A : FOX_B, { '#': C.ringLine, '.': null }, W * 0.18, H * 0.66, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZone();
      var pct = Math.round(filledPct * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var p = Math.round(filledPct * 100);
        if (ok) game.end.success(p, { pct: p }); else game.end.failure({ pct: p });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      // 触れていないマスはゆっくり色褪せる(継続的なこすりが必要)
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        if (c.inZone && c.fill > 0) c.fill = Math.max(0, c.fill - DECAY_PER_S * dt);
      }
      filledPct = computeFillPct();
      var pctNow = Math.round(filledPct * 100);
      if (!milestone50 && pctNow >= 50) {
        milestone50 = true;
        game.fx.popup('50%', CX, CY - ZONE_R - 40, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (!milestone80 && pctNow >= 80) {
        milestone80 = true;
        game.fx.popup('80%', CX, CY - ZONE_R - 40, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (pctNow >= 100) {
        finished = true; ok = true; hitStop = 0.15;
        game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, CY, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        timeLeft -= dt;
        if (timeLeft <= 0.6 && timeLeft > 0.5) game.audio.play('se_tap', 0.3); // 終了間際の予告
        if (timeLeft <= 0) {
          timeLeft = 0;
          finished = true; ok = false; hitStop = 0.3;
          game.feedback.bad(CX, CY, { text: 'TIME UP' });
          shake = 0.25;
          game.audio.play('se_failure', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZone();
    if (!finished) game.draw.sprite(Math.floor(game.time.elapsed * 6) % 2 === 0 ? FOX_A : FOX_B, { '#': C.ringLine, '.': null }, W * 0.18, H * 0.66, 10, { anchor: 'center' });

    var pctH = Math.round(filledPct * 100);
    txt(pctH + ' / 100', W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 18, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 18, timeLeft < 2.5 ? C.danger : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['C5', 0.3], ['G4', 0.3]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

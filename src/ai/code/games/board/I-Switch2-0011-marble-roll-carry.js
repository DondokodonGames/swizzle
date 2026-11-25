// I-Switch2-0011-marble-roll-carry.js
// マーブルロールキャリー — 木箱の傾斜盤にのった玉を指でつまみ、転がすように動かして巣穴へ運ぶ
// 操作: 玉に指を置いたままドラッグして転がし、縁の穴に落とさず目的の巣穴まで運ぶ
// 終わり: 目的の巣穴に玉が着けば成功。縁の穴に落ちるか指を離して静止しきれば失敗
// @mechanic: drag_follow
// @theme: wooden_maze_board_marble
// 世界観: 木工職人が彫った傾斜盤ゲーム。指でつまんだ玉を転がし穴だらけの盤上を渡って目的の巣穴まで運ぶ遊び
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 少ない色面、太めの縁取り、平坦なブロック感
  var C = {
    bg: '#2a2016', bg2: '#3a2c1c', board: '#8a6a3e', boardEdge: '#4a3620',
    hole: '#100a06', goal: '#3ac86a', marble: '#e8d8a0', marbleShade: '#a89058',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff6e6', ink: '#140c04',
  };

  var GAME_TITLE = 'MARBLE CARRY';
  var CX = W * 0.5, CY = H * 0.46;
  var BOARD_R = 380;
  var GOAL = { x: CX, y: CY - 260 };
  var GOAL_R = 60;
  var HOLES = [
    { x: CX - 220, y: CY + 40, r: 55 },
    { x: CX + 200, y: CY - 60, r: 50 },
    { x: CX - 60, y: CY + 180, r: 55 },
    { x: CX + 160, y: CY + 160, r: 48 },
  ];
  var MARBLE_R = 34;
  var START = { x: CX, y: CY + 260 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var mx, my, dragging, progress, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MOLE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(CX, CY, BOARD_R + 20, C.boardEdge);
    game.draw.circle(CX, CY, BOARD_R, C.board);
  }

  function drawBoard() {
    for (var i = 0; i < HOLES.length; i++) {
      var h = HOLES[i];
      game.draw.circle(h.x, h.y, h.r, C.hole);
    }
    game.draw.circle(GOAL.x, GOAL.y, GOAL_R + 14, C.goal, 0.3);
    game.draw.circle(GOAL.x, GOAL.y, GOAL_R, C.goal);
    game.draw.sprite(MOLE, { '#': C.ink }, GOAL.x, GOAL.y - 90, 16, { anchor: 'center' });
  }

  function initGame() {
    mx = START.x; my = START.y; dragging = false;
    progress = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function withinBoard(x, y) { return Math.hypot(x - CX, y - CY) < BOARD_R - MARBLE_R * 0.4; }

  function checkHole(x, y) {
    for (var i = 0; i < HOLES.length; i++) {
      var h = HOLES[i];
      if (Math.hypot(x - h.x, y - h.y) < h.r) return true;
    }
    return false;
  }

  function onDragMove(x, y) {
    if (!dragging || done || finished || ready > 0) return;
    if (!withinBoard(x, y)) { x = mx; y = my; }
    mx = x; my = y;
    var beforePct = Math.round(progress * 100);
    var d0 = Math.hypot(START.x - GOAL.x, START.y - GOAL.y);
    var dNow = Math.hypot(x - GOAL.x, y - GOAL.y);
    var p = Math.max(progress, Math.min(1, 1 - dNow / d0));
    progress = p;
    var afterPct = Math.round(progress * 100);
    if (beforePct < 50 && afterPct >= 50) game.fx.popup('50%', x, y - 70, { color: C.gold, size: 36 });
    if (checkHole(x, y)) {
      finished = true; ok = false; hitStop = 0.15;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (Math.hypot(x - GOAL.x, y - GOAL.y) < GOAL_R) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    if (Math.hypot(x - mx, y - my) < MARBLE_R * 2.4) {
      dragging = true;
      game.audio.play('se_tap', 0.05);
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDragMove(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    dragging = false;
    game.audio.tone('E4', 0.05, { wave: 'sine', volume: 0.03 });
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var DEMO_PATH = [START, { x: CX - 140, y: CY + 100 }, { x: CX - 40, y: CY - 20 }, GOAL];
  var demo = { t: 0, gx: START.x, gy: START.y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var segT = (cyc / 3.0) * (DEMO_PATH.length - 1);
    var i = Math.min(DEMO_PATH.length - 2, Math.floor(segT));
    var f = segT - i;
    var a = DEMO_PATH[i], b = DEMO_PATH[i + 1];
    var px = a.x + (b.x - a.x) * f, py = a.y + (b.y - a.y) * f;
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.0;
    mx = px; my = py;
    var d0 = Math.hypot(START.x - GOAL.x, START.y - GOAL.y);
    var dNow = Math.hypot(px - GOAL.x, py - GOAL.y);
    progress = Math.max(progress || 0, Math.min(1, 1 - dNow / d0));
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBoard();
      game.draw.circle(mx, my, MARBLE_R, C.marbleShade);
      game.draw.circle(mx - 6, my - 6, MARBLE_R * 0.7, C.marble);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      game.draw.circle(mx, my, MARBLE_R, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(progress * 100) + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - Math.round(progress * 100)) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(progress * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();
    if (!finished) {
      game.draw.circle(mx, my, MARBLE_R, C.marbleShade);
      game.draw.circle(mx - 6, my - 6, MARBLE_R * 0.7, C.marble);
    }

    txt(Math.round(progress * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

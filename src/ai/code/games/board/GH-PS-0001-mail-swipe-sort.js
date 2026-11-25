// GH-PS-0001-mail-swipe-sort.js
// メールスワイプソート — 荷物のランプ色を見て、同じ色の方向へスワイプして仕分ける
// 操作: 中央の荷物に付いたランプと同じ色のゲートへ向けて、その方向へスワイプする
// 終わり: 規定件数を正しく仕分ければ成功。3件誤配すれば失敗
// @mechanic: swipe_direction
// @theme: night_sorting_dock
// 世界観: 深夜の郵便区分局。ベルトに乗った荷物のランプが行き先の色を示す。上下左右4つのゲートへ、色を見誤らず払い続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕分けた件数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s HANDHELD PASTEL: 白縁の丸い形。パステル4色
  var C = {
    bg1: '#fdf3ea', bg2: '#f6e2ea', panel: '#ffffff', ink: '#4a3a4a',
    up: '#ff9ecf', down: '#7ecbff', left: '#ffd36e', right: '#8ee8a0',
    bad: '#ff5a6a', gold: '#ffb200', white: '#ffffff',
  };
  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_COL = { up: C.up, down: C.down, left: C.left, right: C.right };
  var DIR_LABEL = { up: 'N', down: 'S', left: 'W', right: 'E' };
  var DIR_VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  var GAME_TITLE = 'MAIL SORT';
  var NEEDED = 6, MISS_LIMIT = 3;
  var CX = W / 2, CY = H * 0.5;
  var GATE_R = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, misses, target, boxX, boxY, flying, flyT, flyDir, judged, judgeGood, judgeT;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 2, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function gatePos(dir) {
    if (dir === 'up') return { x: CX, y: H * 0.16 };
    if (dir === 'down') return { x: CX, y: H * 0.84 };
    if (dir === 'left') return { x: W * 0.14, y: CY };
    return { x: W * 0.86, y: CY };
  }

  var BOX_SPRITE = ['####', '#..#', '####'];

  function dockBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < DIRS.length; i++) {
      var g = gatePos(DIRS[i]);
      var lit = !judged && !flying && DIRS[i] === target;
      game.draw.circle(g.x, g.y, 92, C.panel);
      game.draw.circle(g.x, g.y, 92, DIR_COL[DIRS[i]], lit ? 0.9 : 0.35);
      txt(DIR_LABEL[DIRS[i]], g.x, g.y + 16, 40, C.ink);
    }
  }

  function drawBox(x, y, col) {
    game.draw.circle(x, y, 74, C.panel);
    game.draw.sprite(BOX_SPRITE, { '#': '#c9a45a' }, x, y, 14, { anchor: 'center' });
    game.draw.circle(x, y - 46, 16, col);
    game.draw.circle(x, y - 46, 16, '#ffffff', 0.25);
  }

  function newRound() {
    target = DIRS[Math.floor(Math.random() * DIRS.length)];
    boxX = CX; boxY = CY; flying = false; flyT = 0; flyDir = null;
    judged = false; judgeGood = false; judgeT = 0;
  }

  function initGame() {
    cleared = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.45);
    endWait = 1.2;
  }

  function trySwipe(dir) {
    if (done || ready > 0 || hitStop > 0 || finished || judged || flying) return;
    var correct = dir === target;
    judged = true; judgeGood = correct; judgeT = 0.5;
    flying = true; flyT = 0; flyDir = correct ? target : dir;
    hitStop = 0.08;
    var g = gatePos(flyDir);
    if (correct) {
      cleared++;
      game.feedback.good((boxX + g.x) / 2, (boxY + g.y) / 2, { text: '+1', color: DIR_COL[target] });
      game.audio.play('se_good', 0.35);
      if (cleared % 2 === 0) { game.fx.popup(cleared + ' / ' + NEEDED, CX, H * 0.30, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
    } else {
      misses++;
      shake = 0.18;
      game.feedback.bad(boxX, boxY, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.08);
    trySwipe(dir);
  });

  // ── ATTRACT ゴースト実演: 正しい方向へ払う成功例+誤った方向の失敗例 ──
  var demo = { t: 0, gx: CX, gy: CY, press: false, dx: 0, dy: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); target = 'right'; }
    if (cyc < 1.0) {
      var t1 = cyc / 1.0;
      demo.gx = CX - 60 + 60 * t1; demo.gy = CY; demo.press = true;
      if (cyc + dt >= 1.0 && !judged) trySwipe('right');
    } else if (cyc < 2.2) {
      demo.press = false;
    } else if (cyc < 2.3) {
      if (!judged) { initGame(); target = 'left'; }
    } else if (cyc < 3.2) {
      var t2 = (cyc - 2.3) / 0.9;
      demo.gx = CX + 60 - 60 * t2; demo.gy = CY; demo.press = true;
      if (cyc + dt >= 3.2 && !judged) trySwipe('up');
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      dockBg();
      stepDemo(dt);
      stepFlight(dt);
      drawBox(boxX, boxY, DIR_COL[target]);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.94, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.98, 30, C.gold);
      }
      return;
    }

    if (state === S.RESULT) {
      dockBg();
      drawBox(boxX, boxY, DIR_COL[target]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? '#5dcf8a' : C.bad, 'center');
      txt(cleared + ' / ' + NEEDED, W / 2, H * 0.94, 30, C.ink);
      if (!ok && cleared >= NEEDED - 1) txt('あと1件!', W / 2, H * 0.90, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { cleared: cleared, misses: misses };
        if (ok) game.end.success(cleared * 100, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepFlight(dt);
      if (judged && !flying) {
        judgeT -= dt;
        if (judgeT <= 0) {
          if (cleared >= NEEDED) { ok = true; finished = true; finish(); }
          else if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
          else newRound();
        }
      }
    }
    if (shake > 0) shake -= dt;

    dockBg();
    drawBox(boxX, boxY, DIR_COL[target]);

    txt(cleared + ' / ' + NEEDED, CX, H * 0.06, 34, C.ink);
    for (var f = 0; f < MISS_LIMIT; f++) game.draw.circle(W - 60 - f * 40, 60, 12, f < misses ? C.bad : '#ffffff80');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  function stepFlight(dt) {
    if (!flying) return;
    flyT += dt;
    var g = gatePos(flyDir);
    var t1 = Math.min(1, flyT / 0.35);
    boxX = CX + (g.x - CX) * t1;
    boxY = CY + (g.y - CY) * t1;
    if (t1 >= 1) {
      flying = false;
      if (judgeGood) {
        game.fx.burst(g.x, g.y, { color: DIR_COL[flyDir], count: 12, speed: 300 });
      } else {
        boxX = CX; boxY = CY;
      }
    }
  }

  game.onStart(function() {
    game.audio.melody(
      [['A4', 0.2], ['C5', 0.2], ['E5', 0.2], ['C5', 0.2], ['A4', 0.2], ['G4', 0.2]],
      { tempo: 150, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 1], ['E2', 1]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

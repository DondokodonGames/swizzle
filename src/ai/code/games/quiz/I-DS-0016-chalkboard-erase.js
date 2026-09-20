// I-DS-0016-chalkboard-erase.js
// チョークボード・ワイプ — 放課後の黒板に残った落書きを、左右のイレイザーを交互に叩いて消す
// 操作: 黒板下の左右イレイザーを交互にタップする。同じ側を連打しても消えない
// 終わり: 制限時間内に落書きを消しきれば成功。消しきれず時間切れなら失敗
// @mechanic: alternate_tap
// @theme: afterschool_chalkboard_erase
// 世界観: 放課後の教室、フクロウの用務員が下校ベルまでに黒板いっぱいの落書きを消し去る
// スタイル: 8bit PC MONITOR
// 残るもの: 正誤(CLEAR/GAME OVER) + 消せた落書きの割合%

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ、高解像度低色数、テキスト枠UI
  var C = {
    bg: '#0e1420', board: '#123020', boardEdge: '#0a1c12', chalk: '#eef0e0',
    eraserL: '#ff9d3a', eraserR: '#3ac3ff', danger: '#ff3b5c',
    good: '#4dff9a', bad: '#ff3b5c', gold: '#ffe14d', white: '#eef2ff', ink: '#050810',
  };

  var GAME_TITLE = 'CHALK WIPE';
  var MAX_TIME = 10;
  var TOTAL_MARKS = 20;
  var BTN_R = 110;
  var BTN_L = { x: W * 0.28, y: H * 0.84 };
  var BTN_Rp = { x: W * 0.72, y: H * 0.84 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var marks; // {x,y,len,ang,erased}
  var erasedCount, lastSide, timeLeft, done, endWait, finished, milestone50, milestone80, combo;
  var ready, hitStop, shake, flashL, flashR;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OWL_A = ['.####.', '######', '#.##.#', '######', '.#..#.'];
  var OWL_B = ['.####.', '######', '#.##.#', '.####.', '#....#'];

  function buildMarks() {
    marks = [];
    for (var i = 0; i < TOTAL_MARKS; i++) {
      marks.push({
        x: W * 0.5 + game.random(-330, 330),
        y: H * 0.34 + game.random(-190, 190),
        len: game.random(40, 100),
        ang: game.random(0, Math.PI),
        erased: false,
      });
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, '#182236'], [1, C.bg]]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * (H / 8), W, 2, '#ffffff05');
  }

  function drawBoard() {
    game.draw.rect(W * 0.5 - 380, H * 0.16, 760, 420, C.boardEdge);
    game.draw.rect(W * 0.5 - 360, H * 0.18, 720, 380, C.board);
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.erased) continue;
      var dx = Math.cos(m.ang) * m.len / 2, dy = Math.sin(m.ang) * m.len / 2;
      game.draw.line(m.x - dx, m.y - dy, m.x + dx, m.y + dy, C.chalk, 6);
    }
  }

  function drawButtons(pressL, pressR) {
    game.draw.circle(BTN_L.x, BTN_L.y, BTN_R, C.eraserL, pressL ? 0.9 : 0.55);
    game.draw.circle(BTN_Rp.x, BTN_Rp.y, BTN_R, C.eraserR, pressR ? 0.9 : 0.55);
    game.draw.rect(BTN_L.x - 60, BTN_L.y - 24, 120, 48, C.chalk, pressL ? 1 : 0.7);
    game.draw.rect(BTN_Rp.x - 60, BTN_Rp.y - 24, 120, 48, C.chalk, pressR ? 1 : 0.7);
  }

  function initGame() {
    buildMarks();
    erasedCount = 0; lastSide = 0; timeLeft = MAX_TIME;
    done = false; endWait = 0; finished = false; milestone50 = false; milestone80 = false; combo = 0;
    ready = 0.8; hitStop = 0; shake = 0; flashL = 0; flashR = 0;
  }

  function eraseOne(side, x, y) {
    var remaining = marks.filter(function(m) { return !m.erased; });
    if (remaining.length === 0) return;
    var best = remaining[0], bd = 1e9;
    for (var i = 0; i < remaining.length; i++) {
      var d = Math.hypot(remaining[i].x - x, remaining[i].y - y);
      if (d < bd) { bd = d; best = remaining[i]; }
    }
    best.erased = true;
    erasedCount++;
    var pct = Math.round((erasedCount / TOTAL_MARKS) * 100);
    if (!milestone50 && pct >= 50) { milestone50 = true; game.fx.popup('50%', W / 2, H * 0.14, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
    if (!milestone80 && pct >= 80) { milestone80 = true; game.fx.popup('80%', W / 2, H * 0.14, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
  }

  function hitButton(x, y) {
    if (Math.hypot(x - BTN_L.x, y - BTN_L.y) <= BTN_R) return 1;
    if (Math.hypot(x - BTN_Rp.x, y - BTN_Rp.y) <= BTN_R) return 2;
    return 0;
  }

  function onPressAt(x, y) {
    if (done || ready > 0 || finished) return;
    var side = hitButton(x, y);
    if (side === 0) return;
    if (side === 1) flashL = 0.12; else flashR = 0.12;
    if (side === lastSide) {
      combo = 0;
      game.feedback.bad(x, y, { text: 'MISS', shake: 4 });
      game.audio.play('se_bad', 0.3);
      return;
    }
    lastSide = side;
    combo++;
    eraseOne(side, W * 0.5, H * 0.34);
    game.feedback.good(x, y, { color: C.good, count: 6 });
    game.audio.play('se_good', 0.28);
    if (erasedCount >= TOTAL_MARKS) {
      finished = true; ok = true; hitStop = 0.15;
      game.fx.burst(W / 2, H * 0.34, { color: C.gold, count: 26, speed: 440 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); onPressAt(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.2;
  }

  var demo = { t: 0, gx: BTN_L.x, gy: BTN_L.y, press: true, side: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { buildMarks(); erasedCount = 0; lastSide = 0; milestone50 = false; milestone80 = false; }
    var beat = 0.22;
    var idx = Math.floor(cyc / beat);
    demo.press = (cyc % beat) < beat * 0.6;
    if (demo.press) {
      var side = (idx % 2 === 0) ? 1 : 2;
      demo.side = side;
      demo.gx = side === 1 ? BTN_L.x : BTN_Rp.x;
      demo.gy = side === 1 ? BTN_L.y : BTN_Rp.y;
      if (side !== lastSide && erasedCount < TOTAL_MARKS && (cyc % beat) < dt + 0.001) {
        lastSide = side;
        eraseOne(side, W * 0.5, H * 0.34);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (marks === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBoard();
      drawButtons(demo.side === 1 && demo.press, demo.side === 2 && demo.press);
      game.draw.sprite(Math.floor(game.time.elapsed * 4) % 2 === 0 ? OWL_A : OWL_B, { '#': C.gold, '.': null }, W * 0.5, H * 0.62, 12, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      drawButtons(false, false);
      var pct = Math.round((erasedCount / TOTAL_MARKS) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.115, 28, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.15, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var p = Math.round((erasedCount / TOTAL_MARKS) * 100);
        if (ok) game.end.success(p, { pct: p }); else game.end.failure({ pct: p });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(W / 2, H * 0.34, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (flashL > 0) flashL -= dt;
    if (flashR > 0) flashR -= dt;

    bg();
    drawBoard();
    drawButtons(flashL > 0, flashR > 0);
    game.draw.sprite(Math.floor(game.time.elapsed * 6) % 2 === 0 ? OWL_A : OWL_B, { '#': C.gold, '.': null }, W * 0.5, H * 0.62, 12, { anchor: 'center' });

    txt(erasedCount + ' / ' + TOTAL_MARKS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, timeLeft < 2.5 ? C.danger : C.gold);
    if (timeLeft < 2.5 && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      game.draw.circle(W * 0.5, H * 0.10, 20, C.danger, 0.8);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

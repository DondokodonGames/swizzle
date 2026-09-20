// I-Wii-0020-bell-strike-window.js
// ベルストライク・ウィンドウ — 揺れ続ける大鐘を、光る窓が開いた瞬間だけ打って清らかな音を響かせる
// 操作: 大鐘が揺れる先端が光る窓の中に入った瞬間にタップして打つ
// 終わり: 3回澄んだ音を鳴らせれば成功。外して2回失敗すると終わり
// @mechanic: timing_window
// @theme: temple_bell_ringer
// 世界観: 山寺の鐘つき番が、揺れ続ける大鐘の先端が光る窓に入った刹那だけ撞木を当てて清らかな音を響かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 澄んだ音を鳴らせた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 墨一色の濃淡。差し色は朱のみ
  var C = {
    bg: '#efe9da', ink: '#20180f', inkSoft: '#5a4f3c', paper: '#e2dac6',
    win: '#c8281c', winDim: '#c8281c', gold: '#20180f', good: '#20180f', bad: '#c8281c', white: '#efe9da',
  };

  var GAME_TITLE = 'BELL STRIKE';
  var CX = W * 0.5, PIVOT_Y = H * 0.30, ARM = 360;
  var NEED = 3, MAX_MISS = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MONK = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.paper], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * H / 10, W, i * H / 10, C.inkSoft, 1);
    game.draw.sprite(MONK, { '#': C.ink }, W * 0.5, H * 0.86, 10, { anchor: 'center' });
  }

  var swingT, swingSpeed, winStart, winEnd, winActive, telegraphed, hits, misses, done, endWait, finished;
  var ready, hitStop, shake;

  function newCycle() {
    swingT = 0;
    swingSpeed = 0.44 + hits * 0.06;
    var c = 0.55 + game.random(-0.06, 0.06);
    winStart = c - 0.05; winEnd = c + 0.05;
    winActive = false; telegraphed = false;
  }

  function initGame() {
    hits = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newCycle();
  }

  function bellAngle(t) {
    var phase = (t * swingSpeed) % 1;
    return Math.sin(phase * Math.PI * 2 - Math.PI / 2) * 0.65; // -0.65..0.65 rad
  }
  function phaseOf(t) { return (t * swingSpeed) % 1; }

  function strike(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished) return;
    var p = phaseOf(swingT);
    var inWin = p >= winStart && p <= winEnd;
    if (inWin) {
      hits++;
      hitStop = 0.18;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, y, { color: C.win, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (hits === 2) game.fx.popup('あと1回!', CX, PIVOT_Y + 200, { color: C.win, size: 34 });
      if (hits >= NEED) { ok = true; finished = true; finish(); return; }
      newCycle();
    } else {
      misses++;
      hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      if (misses >= MAX_MISS) { ok = false; finished = true; finish(); return; }
      newCycle();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    strike(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBell() {
    // pivot arc + strike gate
    var winMidPhase = (winStart + winEnd) / 2;
    var winAngle = Math.sin(winMidPhase * Math.PI * 2 - Math.PI / 2) * 0.65;
    var wx1 = CX + Math.sin(winAngle) * (ARM - 30), wy1 = PIVOT_Y + Math.cos(winAngle) * (ARM - 30);
    var wx2 = CX + Math.sin(winAngle) * (ARM + 30), wy2 = PIVOT_Y + Math.cos(winAngle) * (ARM + 30);
    var p = phaseOf(swingT);
    var nearWin = p > winStart - 0.14 && p < winEnd + 0.14;
    if (nearWin && !telegraphed && p < winStart) telegraphed = true;
    var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
    var showWin = nearWin && blink;
    game.draw.line(wx1, wy1, wx2, wy2, showWin ? C.win : C.inkSoft, showWin ? 16 : 6);

    var a = bellAngle(swingT);
    var bx = CX + Math.sin(a) * ARM, by = PIVOT_Y + Math.cos(a) * ARM;
    game.draw.line(CX, PIVOT_Y, bx, by, C.ink, 10);
    game.draw.circle(bx, by, 46, C.ink);
    game.draw.circle(bx, by, 30, C.bg);
    game.draw.circle(CX, PIVOT_Y, 16, C.ink);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.6, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (swingT === undefined) initGame();
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { swingT = 0; swingSpeed = 1.1; winStart = 0.5; winEnd = 0.6; }
    swingT = cyc;
    var p = phaseOf(swingT);
    var a = bellAngle(swingT);
    var bx = CX + Math.sin(a) * ARM, by = PIVOT_Y + Math.cos(a) * ARM;
    demo.gx = bx; demo.gy = by;
    if (p >= winStart && p <= (winStart + winEnd) / 2 && !demo.pressed) {
      demo.pressed = true; demo.press = true;
      game.feedback.good(bx, by, { text: 'GOOD', color: C.good, sound: false });
      game.audio.play('se_good', 0.15);
    }
    if (p > winEnd + 0.1) { demo.pressed = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBell();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.win);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.win);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawBell();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.ink);
      txt(hits + ' / ' + NEED, W / 2, H * 0.13, 30, C.win);
      if (!ok) txt('あと' + (NEED - hits) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      swingT += dt;
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBell();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.paper);
    game.draw.rect(60, 150, (W - 120) * (hits / NEED), 16, C.win);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.win);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);

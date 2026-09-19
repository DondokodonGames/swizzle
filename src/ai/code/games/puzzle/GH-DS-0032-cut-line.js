// GH-DS-0032-cut-line.js
// カットライン — 3本の導線から正しい1本を切る。手がかりはランプの点滅
// 操作: 点滅するランプと同じ色の導線を、その導線の向きへスワイプして切る
// 終わり: 切れれば成功(解除)、外せば失敗(爆発)
// @mechanic: swipe_direction
// @theme: defusal_panel
// 世界観: 薄暗い制御盤。3本の導線が垂れ下がる。1つのランプだけが色を灯して点滅する。同じ色の導線をその向きへ払えば解除、違えば終わる
// 残るもの: 正誤(解除/爆発)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s 16bit: 多色・高彩度。2〜3層の背景で奥行き
  var C = {
    bg1: '#1a2438', bg2: '#0e1524', panel: '#2a3448', panelEdge: '#3a4a64',
    red: '#ff4a4a', blue: '#4a9aff', yellow: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#e8ecf4', ink: '#0a0e18',
  };

  var GAME_TITLE = 'CUT LINE';
  var WIRES = ['red', 'blue', 'yellow'];
  var WIRE_COL = { red: C.red, blue: C.blue, yellow: C.yellow };
  var WIRE_DIR = { red: 'left', blue: 'down', yellow: 'right' };
  var WIRE_X = { red: W * 0.28, blue: W * 0.5, yellow: W * 0.72 };
  var LIMIT_SEC = 3.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var correct, cut, done, endWait, finished, limitT, lampBlink;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WIRE_TOP = H * 0.30, WIRE_BOT = H * 0.62;

  var BOMB_SPRITE = ['..#..', '.###.', '#####', '#####', '.###.'];

  function sweepBand() {
    var bw = 220;
    var sx = (game.time.elapsed * 90) % (W + bw * 1.5) - bw;
    game.draw.rect(sx, 0, bw, H, '#4a9aff', 0.16);
  }

  function panelBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, C.bg2], [1, '#080c14']]);
    sweepBand();
    for (var i = 0; i < 4; i++) game.draw.rect(0, i * (H / 4), W, 2, '#ffffff08');
    game.draw.rect(W * 0.5 - 320, WIRE_TOP - 60, 640, WIRE_BOT - WIRE_TOP + 120, C.panel);
    game.draw.rect(W * 0.5 - 320, WIRE_TOP - 60, 640, 8, C.panelEdge);
    game.draw.rect(W * 0.5 - 320, WIRE_BOT + 60 - 8, 640, 8, C.panelEdge);
    game.draw.sprite(BOMB_SPRITE, { '#': '#4a5468' }, W * 0.5, H * 0.84, 12, { anchor: 'center' });
  }

  function lampY() { return WIRE_TOP - 130; }

  function drawLamps() {
    for (var i = 0; i < WIRES.length; i++) {
      var w = WIRES[i];
      var x = WIRE_X[w];
      var lit = w === correct && lampBlink > 0.5;
      game.draw.circle(x, lampY(), 34, WIRE_COL[w], lit ? 1 : 0.25);
      game.draw.circle(x, lampY(), 34, '#ffffff', lit ? 0.4 : 0);
    }
  }

  function drawWires() {
    for (var i = 0; i < WIRES.length; i++) {
      var w = WIRES[i];
      var x = WIRE_X[w];
      var dim = cut !== null && cut !== w;
      var col = dim ? '#5a6070' : WIRE_COL[w];
      if (cut === w) {
        game.draw.line(x, WIRE_TOP, x, WIRE_TOP + 40, col, 14);
        game.draw.line(x, WIRE_BOT - 40, x, WIRE_BOT, col, 14);
        game.draw.circle(x - 26, (WIRE_TOP + 40 + WIRE_BOT - 40) / 2, 10, '#ffe08a', ok ? 0.9 : 0);
      } else {
        game.draw.line(x, WIRE_TOP, x, WIRE_BOT, col, 14);
      }
      game.draw.circle(x, WIRE_TOP, 16, '#00000060');
      game.draw.circle(x, WIRE_BOT, 16, '#00000060');
    }
  }

  function arrowFor(w) {
    var x = WIRE_X[w], y = (WIRE_TOP + WIRE_BOT) / 2 + 140;
    var d = WIRE_DIR[w];
    var dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
    var dy = d === 'down' ? 1 : 0;
    game.draw.line(x, y, x + dx * 60, y + dy * 60, '#e8ecf4b0', 6);
  }

  function newRound() {
    correct = WIRES[Math.floor(Math.random() * WIRES.length)];
    cut = null; limitT = LIMIT_SEC; lampBlink = 0;
  }

  function initGame() {
    newRound();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolve(hitWire, dir) {
    if (done || ready > 0 || finished) return;
    finished = true;
    hitStop = 0.1;
    cut = hitWire;
    ok = (hitWire === correct && dir === WIRE_DIR[correct]);
    var x = WIRE_X[hitWire], y = (WIRE_TOP + WIRE_BOT) / 2;
    if (ok) {
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(x, y, { text: 'BOOM' });
      shake = 0.3;
      game.fx.burst(x, y, { color: C.bad, count: 20, speed: 420 });
      game.audio.play('se_failure', 0.5);
    }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    var target = null;
    for (var j = 0; j < WIRES.length; j++) if (WIRE_DIR[WIRES[j]] === dir) { target = WIRES[j]; break; }
    if (!target) target = correct;
    resolve(target, dir);
    game.audio.play('se_tap', 0.1);
  });

  var demo = { t: 0, gx: W * 0.5, gy: (WIRE_TOP + WIRE_BOT) / 2 + 140, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (correct === undefined) initGame();
    var cyc = demo.t % 3.2;
    if (cyc < dt) newRound();
    lampBlink = (Math.sin(demo.t * 9) + 1) / 2;
    var d = WIRE_DIR[correct];
    var x0 = WIRE_X[correct], y0 = (WIRE_TOP + WIRE_BOT) / 2 + 140;
    var dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
    var dy = d === 'down' ? 1 : 0;
    if (cyc > 2.2 && cyc < 2.6) {
      var p = (cyc - 2.2) / 0.4;
      demo.gx = x0 + dx * 70 * p; demo.gy = y0 + dy * 70 * p;
      demo.press = true;
    } else {
      demo.gx = x0; demo.gy = y0; demo.press = false;
    }
    if (cyc > 2.58 && cyc < 2.62 && cut !== correct) {
      cut = correct; ok = true;
      game.feedback.good(x0, (WIRE_TOP + WIRE_BOT) / 2, { text: 'CLEAR', color: C.good });
      game.fx.burst(x0, (WIRE_TOP + WIRE_BOT) / 2, { color: C.gold, count: 12, speed: 320 });
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      panelBg();
      stepDemo(dt);
      drawLamps();
      drawWires();
      for (var i = 0; i < WIRES.length; i++) arrowFor(WIRES[i]);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 48, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 42, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 30, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      panelBg();
      drawLamps();
      drawWires();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({}); else game.end.failure({});
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); }
    } else if (!finished) {
      lampBlink = (Math.sin(game.time.elapsed * 10) + 1) / 2;
      limitT -= dt;
      if (limitT <= 0) { resolve(WIRES[0] === correct ? WIRES[1] : WIRES[0], 'up'); }
    }
    if (shake > 0) shake -= dt;

    panelBg();
    drawLamps();
    drawWires();
    for (var w = 0; w < WIRES.length; w++) arrowFor(WIRES[w]);

    txt(1 + ' / ' + 1, W / 2, H * 0.14, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 58, C.gold);
    else if (!finished) {
      game.draw.rect(60, H * 0.68, W - 120, 16, C.ink);
      game.draw.rect(60, H * 0.68, (W - 120) * Math.max(0, limitT / LIMIT_SEC), 16, C.bad);
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

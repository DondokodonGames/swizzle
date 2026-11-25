// K-DS-0061-broadcast-relay-cue.js
// 放送切替合図 — 明滅する複数の信号灯から曲の切れ目を示す本物の合図を見つけ、鐘を鳴らして切り替える
// 操作: 並んだ信号灯がそれぞれ違う周期で明滅する中、一番外側まで満ちた「本物」の灯にタップして鳴らす
// 終わり: 規定回数(6回)を正しく見つければ成功。3回誤った灯を鳴らせば失敗
// @mechanic: spot
// @theme: broadcast_relay_cue
// 世界観: 放送塔の管制室。技師が、次々明滅する信号灯の中から曲の切れ目を示す本物の合図灯だけを見つけ出し、鐘を鳴らして放送を切り替える
// 残るもの: 正誤(放送成功/誤切替)+ 見つけられた回数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 暗い盤面に走査線、緑/琥珀寄りのモノトーン差し色
  var C = {
    bg: '#0a1410', bg2: '#050a08', panel: '#12241a', panelEdge: '#1e3a28',
    lampOff: '#1a2e22', lampFake: '#ffb020', lampReal: '#4dff8a',
    good: '#4dff8a', bad: '#ff4d4d', gold: '#ffe24d', white: '#d8ffe8', ink: '#020604',
  };

  var GAME_TITLE = 'RELAY CUE';
  var TOTAL = 6;
  var MAX_MISS = 3;
  var CX = W * 0.5, ROW_Y = H * 0.42;
  var N_LAMPS = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var found, miss, done, endWait, finished;
  var ready, hitStop, shake;
  var lamps, round;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TECH = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(W * 0.08, H * 0.24, W * 0.84, H * 0.34, C.panel);
    game.draw.rect(W * 0.08, H * 0.24, W * 0.84, 6, C.panelEdge);
    for (var i = 0; i < 10; i++) game.draw.rect(W * 0.08, H * 0.24 + i * (H * 0.34 / 10), W * 0.84, 1, '#00000030');
  }

  function lampX(i) { return W * (0.2 + i * 0.6 / (N_LAMPS - 1)); }

  function newLamps(realIdx) {
    var arr = [];
    for (var i = 0; i < N_LAMPS; i++) {
      arr.push({
        period: 0.5 + Math.random() * 0.4,
        t: Math.random() * 0.3,
        real: i === realIdx,
        resolved: false,
      });
    }
    return arr;
  }

  function initGame() {
    found = 0; miss = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; lamps = newLamps(Math.floor(Math.random() * N_LAMPS));
  }

  function lampFill(l) {
    // 明滅周期の中で満ちていく比率(0→1で満ちて0に戻る鋸波)
    return (l.t % l.period) / l.period;
  }

  function tapLamp(x, y) {
    if (ready > 0 || done || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    var best = -1, bestD = 1e9;
    for (var i = 0; i < lamps.length; i++) {
      var d = Math.hypot(x - lampX(i), y - ROW_Y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0 || bestD > 130) return;
    var l = lamps[best];
    if (l.real) {
      found++;
      hitStop = 0.1;
      game.feedback.good(lampX(best), ROW_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(lampX(best), ROW_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_milestone', 0.4);
      if (found === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, ROW_Y - 220, { color: C.gold, size: 40 });
      if (found >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; lamps = newLamps(Math.floor(Math.random() * N_LAMPS));
    } else {
      miss++;
      hitStop = 0.28;
      game.feedback.bad(lampX(best), ROW_Y, { text: 'MISS' });
      shake = 0.24;
      game.audio.play('se_bad', 0.4);
      if (miss >= MAX_MISS) { ok = false; finished = true; finish(); return; }
      round++; lamps = newLamps(Math.floor(Math.random() * N_LAMPS));
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tapLamp(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLamps(arr, highlightReal) {
    for (var i = 0; i < arr.length; i++) {
      var l = arr[i];
      var fill = lampFill(l);
      var x = lampX(i);
      var col = l.real ? C.lampReal : C.lampFake;
      // 本物は満ちきる直前(0.85〜1.0)に一段強く点滅する予告
      var telegraph = l.real && fill > 0.8;
      game.draw.circle(x, ROW_Y, 60, C.lampOff);
      game.draw.circle(x, ROW_Y, 56 * fill, col, telegraph ? 0.95 : 0.55);
      if (highlightReal && l.real) game.draw.circle(x, ROW_Y, 74, C.white, 0.15);
    }
  }

  var demo = { t: 0, gx: CX, gy: ROW_Y, press: false, arr: null, targetI: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      demo.targetI = Math.floor((demo.t / 3.0) % N_LAMPS);
      demo.arr = newLamps(demo.targetI);
      for (var i = 0; i < demo.arr.length; i++) demo.arr[i].t = 0;
      demo.struck = false;
    }
    for (var j = 0; j < demo.arr.length; j++) demo.arr[j].t += dt;
    lamps = demo.arr;
    var real = demo.arr[demo.targetI];
    var fill = lampFill(real);
    if (fill > 0.85 && !demo.struck) {
      demo.struck = true;
      demo.gx = lampX(demo.targetI); demo.gy = ROW_Y; demo.press = true;
      game.fx.burst(demo.gx, ROW_Y, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_milestone', 0.2);
    }
    if (cyc > 2.0) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLamps(lamps, false);
      game.draw.sprite(TECH, { '#': C.white }, CX, H * 0.68, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLamps(lamps, true);
      game.draw.sprite(TECH, { '#': C.white }, CX, H * 0.68, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(found + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - found) + '回!', W / 2, H * 0.2, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(found, { found: found, total: TOTAL });
        else game.end.failure({ found: found, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      for (var i = 0; i < lamps.length; i++) lamps[i].t += dt;
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLamps(lamps, false);
    game.draw.sprite(TECH, { '#': C.white }, CX, H * 0.68, 22, { anchor: 'center' });

    txt(found + ' / ' + TOTAL, W / 2, H * 0.1, 32, C.white);
    game.draw.rect(60, 200, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 200, (W - 120) * (found / TOTAL), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 150, 14, mi < miss ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

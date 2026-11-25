// K-DS-0043-rope-bridge-footfall.js
// 吊り橋足運び — 板が軋む音の合図に合わせ、決まった左右の順で踏み鳴らして渡る
// 操作: 光る足跡マーカーが左右交互に出るので、対応する左右のゾーンを合図の瞬間にタップする
// 終わり: 規定歩数(10歩)を正しい順とタイミングで渡り切れば成功。3回外せば失敗
// @mechanic: alternate_tap
// @theme: rope_bridge_footfall
// 世界観: 山峡に架かる吊り橋。飛脚が、軋む板の音の合図に合わせて決まった左足・右足の順で踏み鳴らし、渡り切る
// 残るもの: 正誤(渡り切り/落下)+ 踏めた歩数と最大連続数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細く鋭いライン、限られた原色、塗りは少なめ
  var C = {
    bg: '#0a0a12', ropeMain: '#e8a838', ropeDim: '#5a4418', plank: '#c8905a',
    valley: '#1a2438', good: '#4dffa0', bad: '#ff5050', gold: '#ffd400', white: '#f0f0f8', ink: '#050508',
  };

  var GAME_TITLE = 'ROPE STEP';
  var TOTAL = 10;
  var MAX_MISS = 3;
  var CX = W * 0.5;
  var BRIDGE_Y = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var step, miss, done, endWait, finished;
  var ready, hitStop, shake;
  var beatT, beatDur, beatPhase, side; // side: -1 left, 1 right (expected next foot)
  var courierProg;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COURIER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#141420'], [1, C.bg]]);
    game.draw.rect(0, H * 0.72, W, H * 0.28, C.valley, 0.5);
    for (var i = 0; i < 12; i++) {
      var x = W * (i / 11);
      game.draw.line(x, BRIDGE_Y - 40, x, BRIDGE_Y + 40, C.ropeDim, 2);
    }
    game.draw.line(0, BRIDGE_Y - 40, W, BRIDGE_Y - 40, C.ropeMain, 4);
    game.draw.line(0, BRIDGE_Y + 40, W, BRIDGE_Y + 40, C.ropeMain, 4);
  }

  function nextBeatDur() {
    return Math.max(0.55, 0.85 - step * 0.02);
  }

  function initGame() {
    step = 0; miss = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    beatT = 0; beatDur = nextBeatDur(); beatPhase = 0; side = -1;
    courierProg = 0;
  }

  function zoneX(s) { return s < 0 ? W * 0.28 : W * 0.72; }

  function stomp(inputSide) {
    if (ready > 0 || done || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    var inWindow = beatPhase > 0.32 && beatPhase < 0.68;
    var correctSide = inputSide === side;
    var zx = zoneX(side);
    if (inWindow && correctSide) {
      step++; courierProg = step / TOTAL;
      hitStop = 0.08;
      game.feedback.good(zx, BRIDGE_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(zx, BRIDGE_Y, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.32);
      if (step === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, BRIDGE_Y - 220, { color: C.gold, size: 40 });
      side = -side; beatT = 0; beatDur = nextBeatDur();
      if (step >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      miss++;
      hitStop = 0.28;
      game.feedback.bad(zx, BRIDGE_Y, { text: 'MISS' });
      shake = 0.24;
      game.audio.play('se_bad', 0.4);
      side = -side; beatT = 0; beatDur = nextBeatDur();
      if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) stomp(x < CX ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawZones(activeSide, phase) {
    for (var s = -1; s <= 1; s += 2) {
      var x = zoneX(s);
      var active = s === activeSide;
      var glow = active && phase > 0.32 && phase < 0.68 && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.circle(x, BRIDGE_Y, 90, active ? (glow ? C.gold : '#ffd40044') : '#ffffff10');
      game.draw.circle(x, BRIDGE_Y, 90, '#00000000');
    }
  }

  function drawCourier(x) {
    game.draw.sprite(COURIER, { '#': C.white }, x, BRIDGE_Y - 100, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: zoneX(-1), gy: BRIDGE_Y, press: false, bt: 0, bd: 0.75, s: -1, prog: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { demo.bt = 0; demo.s = -1; demo.prog = 0; demo.struck = false; }
    demo.bt += dt;
    var p = demo.bt / demo.bd;
    beatPhase = Math.min(1, p);
    side = demo.s;
    if (p > 0.32 && p < 0.68 && !demo.struck) {
      demo.struck = true;
      demo.gx = zoneX(demo.s); demo.press = true;
      demo.prog += 1 / TOTAL;
      courierProg = demo.prog;
      game.audio.play('se_good', 0.18);
    }
    if (p >= 1) { demo.bt = 0; demo.struck = false; demo.press = false; demo.s = -demo.s; }
  }

  game.onUpdate(function(dt) {
    var courierX = W * 0.15 + (W * 0.7) * Math.min(1, courierProg || 0);

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawZones(side, beatPhase);
      drawCourier(courierX);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCourier(courierX);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(step + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - step) + '歩!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(step, { step: step, total: TOTAL });
        else game.end.failure({ step: step, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      beatPhase = Math.min(1, beatT / beatDur);
      if (beatPhase >= 1) {
        miss++;
        hitStop = 0.28;
        game.feedback.bad(zoneX(side), BRIDGE_Y, { text: 'MISS' });
        shake = 0.24;
        game.audio.play('se_bad', 0.4);
        side = -side; beatT = 0; beatDur = nextBeatDur();
        if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones(finished ? 0 : side, beatPhase);
    drawCourier(courierX);

    txt(step + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (step / TOTAL), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 200, 14, mi < miss ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.3], ['G3', 0.3], ['B3', 0.3], ['E4', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

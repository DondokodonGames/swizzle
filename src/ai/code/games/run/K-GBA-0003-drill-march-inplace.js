// K-GBA-0003-drill-march-inplace.js
// ドリルマーチ — 一定のリズムで足踏みを続け、隊列を乱さず足並みを揃える
// 操作: 光る方の足跡(左右交互)を、太鼓の拍に合わせてタップして足踏みを続ける
// 終わり: 16歩すべて正しい足・正しい拍で踏み切れば成功。誤った足/拍を外せば失敗
// @mechanic: alternate_tap
// @theme: handheld_drill_march
// 世界観: 8bitハンドヘルドの隊列訓練。左右交互の足跡を太鼓のリズムぴったりに踏み続け、隊列から遅れない
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃った歩数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 限定4色パレット、粗いドット、視認性重視の高コントラスト
  var C = {
    bg: '#183028', bg2: '#0e2018', line: '#2a4838', foot: '#3a5c48', footLit: '#ffd400',
    good: '#5cff7a', bad: '#ff5050', gold: '#ffd400', white: '#eaffea', ink: '#08140e',
  };

  var GAME_TITLE = 'DRILL MARCH';
  var TOTAL = 16;
  var BEAT = 0.50;
  var WIN = 0.16;
  var LX = W * 0.30, RX = W * 0.70, FY = H * 0.66;
  var FOOT_R = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var stepped, done, endWait, finished, ready, hitStop, shake, stepIdx, stepStart, resolvedThis, curBeat, squadPhase;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SOLDIER = ['.##.', '####', '.##.', '#.##', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) {
      var lit = squadPhase !== undefined && Math.floor(squadPhase * 2) % 2 === i % 2;
      game.draw.sprite(SOLDIER, { '#': lit ? C.footLit : C.foot }, W * (0.18 + i * 0.16), H * 0.26, 12, { anchor: 'center' });
    }
    game.draw.line(0, H * 0.78, W, H * 0.78, C.line, 8);
  }

  function beatDur(idx) { return Math.max(0.36, BEAT - Math.floor(idx / 6) * 0.03); }

  function stepTime(i) {
    var t = 0.8, d;
    for (var k = 0; k < i; k++) t += beatDur(k);
    return t;
  }

  function whichFoot(i) { return i % 2 === 0 ? 'L' : 'R'; }

  function initGame() {
    stepped = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; stepIdx = 0; stepStart = 0.8; resolvedThis = false; squadPhase = 0;
    curBeat = beatDur(0);
  }

  function failStep(x, y) {
    hitStop = 0.32;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successStep(x, y) {
    stepped++;
    hitStop = 0.08;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.fx.burst(x, y, { color: C.gold, count: 10, speed: 260 });
    game.audio.play('se_tap', 0.4);
    if (stepped === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.44, { color: C.gold, size: 40 });
    if (stepped >= TOTAL) { ok = true; finished = true; finish(); return; }
    stepIdx++;
    curBeat = beatDur(stepIdx);
    stepStart = stepStart + curBeat;
    resolvedThis = false;
  }

  function tryTap(x, y) {
    if (ready > 0 || done || finished || resolvedThis) return;
    var side = x < W * 0.5 ? 'L' : 'R';
    var need = whichFoot(stepIdx);
    var dist = Math.hypot(x - (need === 'L' ? LX : RX), y - FY);
    var t = game.time.elapsed - stepStart;
    var ok2 = side === need && dist <= FOOT_R && Math.abs(t) <= WIN;
    resolvedThis = true;
    if (ok2) successStep(need === 'L' ? LX : RX, FY);
    else failStep(x, y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFeet() {
    var need = whichFoot(stepIdx);
    var soon = false;
    if (!finished && !done) {
      var t = stepStart - game.time.elapsed;
      soon = t < curBeat * 0.6 && t > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    }
    game.draw.circle(LX, FY, FOOT_R, need === 'L' && soon ? C.footLit : C.foot, need === 'L' ? 0.9 : 0.5);
    game.draw.circle(RX, FY, FOOT_R, need === 'R' && soon ? C.footLit : C.foot, need === 'R' ? 0.9 : 0.5);
    txt('L', LX, FY + 16, 40, C.ink);
    txt('R', RX, FY + 16, 40, C.ink);
  }

  var demo = { t: 0, gx: LX, gy: FY, press: false, idx: 0, start: 0.8, cur: BEAT };
  function stepDemo(dt) {
    demo.t += dt;
    squadPhase = demo.t;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.idx = 0; demo.start = 0.8; demo.pressedThis = false; demo.cur = BEAT; }
    var need = whichFoot(demo.idx);
    var tx = need === 'L' ? LX : RX;
    var tt = cyc - demo.start;
    if (tt > -0.06 && tt < 0.06 && !demo.pressedThis) {
      demo.pressedThis = true;
      demo.gx = tx; demo.gy = FY; demo.press = true;
      game.feedback.good(tx, FY, { text: 'GOOD', color: C.good });
      game.audio.play('se_tap', 0.25);
    } else if (tt < -0.06) {
      demo.press = false;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
    }
    if (tt > demo.cur * 0.5) { demo.idx++; demo.start += demo.cur; demo.pressedThis = false; }
    stepIdx = demo.idx % 2 === 0 ? demo.idx : demo.idx;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFeet();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFeet();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(stepped + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - stepped) + '歩!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stepped, { stepped: stepped, total: TOTAL });
        else game.end.failure({ stepped: stepped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      squadPhase = game.time.elapsed;
      var t = game.time.elapsed - stepStart;
      if (t > WIN && !resolvedThis) {
        resolvedThis = true;
        var need = whichFoot(stepIdx);
        failStep(need === 'L' ? LX : RX, FY);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawFeet();

    txt(stepped + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (stepped / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['C4', 0.25], ['G3', 0.25], ['C4', 0.25]], { tempo: 120, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

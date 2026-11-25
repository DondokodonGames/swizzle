// K-DS-0028-call-and-row.js
// コール&ロウ — 掛け声に合わせて左右のオールを交互に漕ぐ
// 操作: 画面下の左右どちらかが光った瞬間に、その側をタップして漕ぐ。交互に切り替わる
// 終わり: 規定回数(6回)全て正しい側・正しいタイミングで漕げば成功。1回でも外せば失敗
// @mechanic: alternate_tap
// @theme: call_and_row
// 世界観: 独自デザインの漕手が並ぶ手漕ぎ艇。号令役の掛け声に合わせ、左右のオールを交互に漕ぎ進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 漕げたストローク数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細い発光ライン、輪郭線のみで塗りは最小限
  var C = {
    bg: '#050810', bg2: '#0a1420', line: '#3ae0ff', lineDim: '#0a3a44',
    boat: '#ffd23a', water: '#123048', good: '#39ff8a', bad: '#ff3355',
    gold: '#ffe600', white: '#e8f8ff', ink: '#020408',
  };

  var GAME_TITLE = 'CALL & ROW';
  var TOTAL = 6;
  var BY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var strokes, done, endWait, finished;
  var ready, hitStop, shake, round, side, callT, callDur, oarFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ROWER = ['.##.', '####', '.##.', '#.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 12; i++) {
      var y = H * 0.6 + i * 40 + (game.time.elapsed * 60) % 40;
      game.draw.line(0, y, W, y, C.lineDim, 2);
    }
  }

  function newCallDur() {
    var n = Math.min(round, TOTAL - 1);
    return Math.max(0.75, 1.35 - n * 0.09);
  }

  function initGame() {
    strokes = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; oarFlash = 0;
    side = Math.random() < 0.5 ? -1 : 1; callT = 0; callDur = 1.35;
  }

  function resolveRow(tapSide) {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var p = callT / callDur;
    if (tapSide === side && p > 0.35 && p < 1.0) {
      strokes++; hitStop = 0.06; oarFlash = 0.15;
      game.feedback.good(side < 0 ? W * 0.22 : W * 0.78, BY, { text: 'STROKE', color: C.good });
      game.fx.burst(side < 0 ? W * 0.22 : W * 0.78, BY, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (strokes === Math.ceil(TOTAL / 2)) game.fx.popup('IN RHYTHM!', W / 2, BY - 220, { color: C.gold, size: 36 });
      if (strokes >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      side = -side; callT = 0; callDur = newCallDur();
    } else {
      failRow();
    }
  }

  function failRow() {
    hitStop = 0.3;
    game.feedback.bad(W / 2, BY, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveRow(x < W * 0.5 ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(callSide, p) {
    game.draw.line(W * 0.3, BY + 30, W * 0.7, BY + 30, C.boat, 8);
    game.draw.sprite(ROWER, { '#': C.line }, W * 0.5, BY, 28, { anchor: 'center' });
    var leftGlow = callSide < 0 && p > 0.15;
    var rightGlow = callSide > 0 && p > 0.15;
    game.draw.circle(W * 0.22, BY, leftGlow ? 70 : 50, C.line, leftGlow ? 0.5 : 0.15);
    game.draw.circle(W * 0.78, BY, rightGlow ? 70 : 50, C.line, rightGlow ? 0.5 : 0.15);
    game.draw.line(W * 0.05, BY, W * 0.3, BY + (oarFlash > 0 && callSide < 0 ? 40 : 0), C.line, 6);
    game.draw.line(W * 0.95, BY, W * 0.7, BY + (oarFlash > 0 && callSide > 0 ? 40 : 0), C.line, 6);
  }

  var demo = { t: 0, gx: W * 0.22, gy: BY, press: false, s: -1, ct: 0, cd: 1.1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.s = -1; demo.ct = 0; demo.cd = 1.1; demo.hit = false; }
    demo.ct += dt;
    side = demo.s; callT = demo.ct; callDur = demo.cd;
    demo.gx = demo.s < 0 ? W * 0.22 : W * 0.78;
    var p = demo.ct / demo.cd;
    if (p > 0.55 && !demo.hit) {
      demo.hit = true; demo.press = true; oarFlash = 0.15;
      game.feedback.good(demo.gx, BY, { text: 'STROKE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.ct >= demo.cd) { demo.ct = 0; demo.s = -demo.s; demo.hit = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (oarFlash > 0) oarFlash -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(side, callT / callDur);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawScene(0, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(strokes + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - strokes) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(strokes, { strokes: strokes, total: TOTAL });
        else game.end.failure({ strokes: strokes, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      callT += dt;
      if (callT >= callDur) failRow();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(side, callT / callDur);

    txt(strokes + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (strokes / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['A3', 0.4], ['D4', 0.4], ['A3', 0.4]], { tempo: 128, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

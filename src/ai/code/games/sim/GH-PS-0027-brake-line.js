// GH-PS-0027-brake-line.js
// ブレーキライン — ブレーキを握る位置だけで停止点が決まる
// 操作: 進入してくる電車の、ブレーキを握るタイミングを長押しで決める。離すと減速が止まる
// 終わり: 停止線とのズレ(m)。ぴったりならSCORE高、手前/先で減点
// @mechanic: hold_duration
// @theme: night_platform
// 世界観: 夜の無人駅。カメラは固定、電車だけが奥から迫る。握った瞬間から減速が始まり、離せばその速度のまま進み続ける
// 残るもの: 停止線とのズレ(±m、ラベル) と 精度点(SCORE)
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s PRE-RENDER: 暗め・金属質。背景は1枚絵、粒状ノイズで質感を出す
  var C = {
    sky: '#0c0e14', wall1: '#1a1d26', wall2: '#12141c', floor: '#23262e', floor2: '#181a20',
    line: '#e8c840', trainBody: '#3a4050', trainBody2: '#282c38', window: '#bcd8ff',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0f0f4', ink: '#05060a',
  };

  var GAME_TITLE = 'BRAKE LINE';
  var TRACK_X0 = -80, STOP_LINE_X = W * 0.70, OVER_LIMIT = STOP_LINE_X + 300;
  var SPEED0 = 360, DECEL = 300;
  var M_PER_PX = 0.045;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, diffM = 0;

  var trainX, speed, braking, done, endWait, stopped, halfPopped;
  var ready, hitStop, shake;
  var TOTAL_M = (STOP_LINE_X - TRACK_X0) * M_PER_PX;

  var LEVER_SPRITE = ['#..', '#..', '###', '.#.', '.#.'];
  var LEVER_PAL = { '#': C.gold };
  var SPARK_SPRITE = ['.#.', '###', '.#.'];
  var SPARK_PAL = { '#': C.gold };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var NOISE = (function() {
    var arr = [];
    for (var i = 0; i < 90; i++) arr.push({ x: (i * 137 + 19) % W, y: (i * 271 + 53) % H, a: 0.02 + (i % 5) * 0.01 });
    return arr;
  })();
  function grain() {
    for (var i = 0; i < NOISE.length; i++) { var n = NOISE[i]; game.draw.rect(n.x, n.y, 2, 2, '#ffffff', n.a); }
  }

  var TRACK_Y = H * 0.62, HORIZON_X = W * 0.50, HORIZON_Y = H * 0.34;

  function platformBg() {
    game.draw.gradient(0, H, [[0, C.sky], [0.34, C.wall1], [0.62, C.floor], [1, C.floor2]]);
    // 天井の誘導灯(奥行きの目安、常時点る。タイトル文字帯とサイン板の間の空きに置く)
    for (var l = 0; l < 5; l++) {
      var lx = W * (0.12 + l * 0.19);
      var flick = 0.55 + 0.25 * Math.sin(game.time.elapsed * 2.2 + l * 1.3);
      game.draw.circle(lx, H * 0.285, 20, '#fff2c8', flick * 0.3);
      game.draw.circle(lx, H * 0.285, 9, '#fff2c8', flick);
      game.draw.rect(lx - 3, H * 0.285, 6, H * 0.04, C.wall2, 0.8);
    }
    // 壁の柱(奥行き感、等間隔だが遠近で細く)+ 警戒帯
    for (var i = 0; i < 6; i++) {
      var t = i / 5;
      var px = HORIZON_X + (i - 2.5) * 70;
      var pw = 10 + t * 4;
      game.draw.rect(px - pw / 2, H * 0.34, pw, H * 0.30, C.wall2, 0.7);
      game.draw.rect(px - pw / 2, H * 0.40, pw, 8, C.line, 0.5);
    }
    // 駅名サイン(壁の空きを埋める、固有名詞なしの抽象パネル)
    game.draw.rect(W * 0.10, H * 0.20, W * 0.22, H * 0.05, C.wall2, 0.8);
    game.draw.rect(W * 0.68, H * 0.20, W * 0.22, H * 0.05, C.wall2, 0.8);
    // 線路(収束する2本のレール)
    game.draw.line(HORIZON_X - 4, HORIZON_Y, TRACK_X0 - 200, TRACK_Y + 40, C.wall2, 6);
    game.draw.line(HORIZON_X + 4, HORIZON_Y, W + 200, TRACK_Y + 40, C.wall2, 6);
    game.draw.rect(0, TRACK_Y + 20, W, H - (TRACK_Y + 20), C.floor);
    for (var s = 0; s < 10; s++) { var sy = TRACK_Y + 30 + s * 34; game.draw.rect(0, sy, W, 3, C.floor2, 0.5); }
    // 床タイル(縦方向の目地、下40%の空きを埋める)
    for (var c = 0; c < 8; c++) game.draw.rect(c * (W / 8), TRACK_Y + 20, 2, H - (TRACK_Y + 20), C.floor2, 0.5);
    // 停止線
    game.draw.rect(STOP_LINE_X - 6, TRACK_Y - 40, 12, 120, C.line);
    game.draw.rect(STOP_LINE_X - 40, TRACK_Y + 60, 80, 10, C.line, 0.8);
    txt('STOP', STOP_LINE_X, TRACK_Y + 110, 28, C.line);
    grain();
  }

  function drawTrain(x, scale) {
    var y = TRACK_Y - 10;
    var w = 340 * scale, h = 170 * scale;
    game.draw.rect(x - w / 2, y - h, w, h, C.trainBody);
    game.draw.rect(x - w / 2, y - h, w, h * 0.35, C.trainBody2);
    var winW = w * 0.16, gap = w * 0.04;
    for (var i = 0; i < 4; i++) {
      var wx = x - w / 2 + w * 0.10 + i * (winW + gap);
      game.draw.rect(wx, y - h * 0.75, winW, h * 0.32, C.window, braking ? 0.9 : 0.6);
    }
    game.draw.circle(x, y + 8 * scale, w * 0.14, '#000000', 0.4);
    if (braking) {
      // ブレーキ火花(離散スパーク、モチーフスプライト)
      for (var sp = 0; sp < 3; sp++) game.draw.sprite(SPARK_SPRITE, SPARK_PAL, x - w / 2 + Math.random() * w, y + 6, 6, { anchor: 'center' });
    }
  }

  function initGame() {
    trainX = TRACK_X0; speed = SPEED0; braking = false; done = false; endWait = 0; stopped = false; halfPopped = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finalize() {
    if (stopped) return;
    stopped = true;
    diffM = (trainX - STOP_LINE_X) * M_PER_PX;
    var absD = Math.abs(diffM);
    finalScore = Math.max(0, Math.round(100 - absD * 22));
    hitStop = 0.15; shake = absD > 3 ? 0.3 : 0.1;
    if (absD < 1.5) { game.feedback.good(trainX, TRACK_Y - 90, { text: 'PERFECT', color: C.good }); game.fx.burst(trainX, TRACK_Y - 90, { color: C.good, count: 16, speed: 380 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(trainX, TRACK_Y - 90, { text: (diffM > 0 ? '+' : '') + diffM.toFixed(1) + 'm' }); game.audio.play('se_bad', 0.5); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onPress(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    if (done || ready > 0 || stopped) return;
    braking = true;
    game.audio.play('se_tap', 0.2);
  });
  game.onRelease(function() {
    if (state !== S.PLAYING) return;
    braking = false;
    game.audio.play('se_tap', 0.1);
  });

  // ── ATTRACT ゴースト実演: 早めに握って手前で止まる例→ちょうど握って停止線で止まる例 ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.78, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    var tX = TRACK_X0, spd = SPEED0, brk = false;
    var elapsed = cyc;
    var brakeAt = cyc < 2.0 ? 1.35 : 0.95; // 前半は早握り(手前停止)、後半はちょうど
    var tt = 0, x = TRACK_X0, v = SPEED0, held = false;
    var sub = cyc % 2.0;
    var STEP = 1 / 60;
    for (tt = 0; tt < sub; tt += STEP) {
      if (!held && tt >= brakeAt) held = true;
      if (held) v = Math.max(0, v - DECEL * STEP);
      x += v * STEP;
      if (v <= 0) break;
    }
    trainX = x;
    braking = held && v > 0;
    demo.press = held;
    platformBg();
    drawTrain(trainX, Math.min(1.15, 0.55 + (trainX - TRACK_X0) / (STOP_LINE_X - TRACK_X0) * 0.65));
    game.draw.hand(W * 0.5, H * 0.80, { press: demo.press, scale: 16 });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (trainX === undefined) initGame();
      stepDemo(dt);
      txt(GAME_TITLE, W / 2, H * 0.10, 66, C.white);
      txt('BEST ' + String(game.best), W / 2, H * 0.15, 34, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 34, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      platformBg();
      drawTrain(Math.min(trainX, OVER_LIMIT), 1.15);
      txt(finalScore >= 50 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, finalScore >= 50 ? C.white : C.bad);
      txt((diffM >= 0 ? '+' : '') + diffM.toFixed(1) + 'm', W / 2, H * 0.18, 60, Math.abs(diffM) < 1.5 ? C.good : C.bad);
      txt('SCORE ' + String(finalScore), W / 2, H * 0.24, 50, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.30, 36, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.36, 42, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 38, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: (diffM >= 0 ? '+' : '') + diffM.toFixed(1) + 'm' }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!stopped) {
      if (braking) speed = Math.max(0, speed - DECEL * dt);
      trainX += speed * dt;
      var travMNow = Math.max(0, Math.min(TOTAL_M, (trainX - TRACK_X0) * M_PER_PX));
      if (!halfPopped && travMNow >= TOTAL_M * 0.5) { halfPopped = true; game.fx.popup('HALF', W / 2, H * 0.28, { color: C.gold, size: 48 }); }
      if (speed <= 0) finalize();
      else if (trainX > OVER_LIMIT) finalize();
    }
    if (shake > 0) shake -= dt;

    platformBg();
    var scale = Math.min(1.15, 0.45 + Math.max(0, (trainX - TRACK_X0) / (STOP_LINE_X - TRACK_X0)) * 0.7);
    drawTrain(Math.min(trainX, OVER_LIMIT + 200), scale);

    var travM = Math.max(0, Math.min(TOTAL_M, (trainX - TRACK_X0) * M_PER_PX));
    var frac = travM / TOTAL_M;
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, C.gold);
    txt(Math.round(travM) + ' / ' + Math.round(TOTAL_M) + 'm', W / 2, 106, 40, C.white);

    game.draw.sprite(LEVER_SPRITE, LEVER_PAL, W * 0.14, H * 0.14, 10, { anchor: 'center' });
    if (braking) txt('BRAKE', W / 2, H * 0.18, 30, C.gold);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 84, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// J-N6424-0028-windup-courier-dash.js
// ゼンマイ飛脚ダッシュ — 太鼓の拍に合わせて跳ね、ゼンマイ仕掛けの飛脚人形をゴールまで走らせる
// 操作: 画面下のリズムマーカーが中央に重なった瞬間にタップして飛脚を跳ばせる。ズレると失速する
// 終わり: 規定距離まで拍に乗ってゴールできれば成功。時間切れで届かなければ失敗
// @mechanic: rhythm
// @theme: windup_courier_dash
// 世界観: ぜんまい仕掛けの飛脚人形が太鼓の拍に合わせて跳ねながら距離標をゴールまで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル配色、丸みのある帯
  var C = {
    bg: '#fff2e0', bg2: '#ffe0c8', track: '#ffe8d0', trackLine: '#ffc79a',
    courier: '#ff9a5a', courierDark: '#d0703a', flag: '#4ecdc4', flagPole: '#8a6a4a',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffb400', ink: '#6a3a1a', white: '#ffffff',
  };

  var GAME_TITLE = 'COURIER DASH';
  var TIME_LIMIT = 13;
  var BEAT_PERIOD = 0.62;
  var GOAL_DIST = 12;
  var TRACK_Y = H * 0.56;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COURIER_A = ['.##.', '####', '.##.', '#..#'];
  var COURIER_B = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(60, TRACK_Y - 30, W - 120, 60, C.track);
    for (var i = 0; i < GOAL_DIST; i++) {
      game.draw.line(60 + ((W - 120) / GOAL_DIST) * i, TRACK_Y - 30, 60 + ((W - 120) / GOAL_DIST) * i, TRACK_Y + 30, C.trackLine, 2);
    }
    game.draw.rect(W - 90, TRACK_Y - 90, 14, 120, C.flagPole);
    game.draw.rect(W - 76, TRACK_Y - 90, 40, 30, C.flag);
  }

  var dist, beatT, bounce, missCount, halfCalled, timeLeft;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    dist = 0; beatT = 0; bounce = 0; missCount = 0; halfCalled = false; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function trackX() { return 60 + ((W - 120) / GOAL_DIST) * dist; }

  function drawScene() {
    var x = trackX();
    var jump = Math.max(0, Math.sin(Math.min(1, bounce) * Math.PI)) * 60;
    var sprite = Math.floor(game.time.elapsed * 4) % 2 === 0 ? COURIER_A : COURIER_B;
    game.draw.sprite(sprite, { '#': C.courier }, x, TRACK_Y - jump, 12, { anchor: 'center' });
    // beat marker: 中央窓と近づく拍リング
    var phase = beatT / BEAT_PERIOD;
    var ringR = 70 * (1 - (phase % 1));
    game.draw.circle(W / 2, H * 0.82, 70, C.trackLine, 0.4);
    game.draw.circle(W / 2, H * 0.82, Math.max(6, ringR), C.gold, 0.7);
  }

  function tryBeat(x, y) {
    if (finished || ready > 0) return;
    var phase = (beatT / BEAT_PERIOD) % 1;
    var offBeat = Math.min(phase, 1 - phase);
    if (offBeat < 0.18) {
      dist += offBeat < 0.08 ? 1.2 : 0.8;
      bounce = 0;
      game.feedback.good(x, y, { text: offBeat < 0.08 ? 'PERFECT' : 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfCalled && dist >= GOAL_DIST * 0.5) { halfCalled = true; game.fx.popup('NICE', x, y - 60, { color: C.gold, size: 30 }); }
      if (dist >= GOAL_DIST) {
        dist = GOAL_DIST;
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(W - 76, TRACK_Y - 60, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      missCount++;
      bounce = 0;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryBeat(x, y);
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepBeat(dt) {
    beatT += dt;
    bounce += dt * 2.4;
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.82, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepBeat(dt);
    var phase = (beatT / BEAT_PERIOD) % 1;
    demo.press = phase < 0.1 || phase > 0.92;
    if (demo.press && Math.floor(beatT / BEAT_PERIOD) !== demo.lastBeat) {
      demo.lastBeat = Math.floor(beatT / BEAT_PERIOD);
      tryBeat(W / 2, H * 0.82);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(Math.floor(dist) + ' / ' + GOAL_DIST, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL_DIST - Math.floor(dist)) + '!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(dist), { dist: Math.floor(dist), goal: GOAL_DIST });
        else game.end.failure({ dist: Math.floor(dist), goal: GOAL_DIST });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepBeat(dt);
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(trackX(), TRACK_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(Math.floor(dist) + ' / ' + GOAL_DIST, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 0.5);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['C4', 0.3], ['G4', 0.3], ['G4', 0.3]], { tempo: 97, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

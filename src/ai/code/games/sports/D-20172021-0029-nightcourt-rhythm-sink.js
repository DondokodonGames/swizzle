// D-20172021-0029-nightcourt-rhythm-sink.js
// ナイトコート・リズムシンク — 左右に揺れる照準が窓に入った瞬間にタップし、ボールを連続でリングに沈める
// 操作: 画面下で左右に動く照準マーカーが、光る窓の中に入った瞬間にタップする。5回連続で沈めるまで続く
// 終わり: 5回連続でリングに沈めれば成功。窓を外してタップすると即座に失敗
// @mechanic: timing_window
// @theme: nightcourt_rhythm_sink
// 世界観: 深夜営業のストリートコートに居残った一人の挑戦者が、揺れる照準を見極めてボールを連続でリングに沈め続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続で沈めた本数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色 + 光、パララックス、ライティング、細かいアニメ
  var C = {
    bg: '#0e1830', bg2: '#050a18', glow: '#3a6aff',
    rim: '#ffb23c', rimDark: '#c9781e', board: '#1c2a4a', boardEdge: '#2c3e66',
    ball: '#ff6a3c', ballLite: '#ffe0b0',
    bar: '#14203a', zone: '#38f0a0', marker: '#ffe14a',
    good: '#38f0a0', bad: '#ff4d5e', gold: '#ffe14a', ink: '#eaf0ff',
  };

  var GAME_TITLE = 'RHYTHM SINK';
  var TIME_LIMIT = 13;
  var NEEDED = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#04081a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BALL_SPRITE = ['.###.', '#o#o#', '#####', '#####', '.###.'];

  var HOOP_X = W * 0.5, HOOP_Y = H * 0.30, HOOP_R = 90;
  var PED_X = W * 0.5, PED_Y = H * 0.62;
  var BAR_X0 = W * 0.22, BAR_X1 = W * 0.78, BAR_Y = H * 0.82;

  var round, speed, zoneHalf, markerT, flying, flyT, done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.glow, pulse * 0.25);
  }

  function markerFrac() { return 0.5 + 0.5 * Math.sin(markerT * speed); }

  function drawHoop() {
    game.draw.rect(HOOP_X - 140, HOOP_Y - 150, 280, 120, C.boardEdge);
    game.draw.rect(HOOP_X - 130, HOOP_Y - 140, 260, 100, C.board);
    game.draw.circle(HOOP_X, HOOP_Y, HOOP_R, C.rimDark);
    game.draw.circle(HOOP_X, HOOP_Y, HOOP_R - 16, C.bg);
    for (var n = -2; n <= 2; n++) {
      game.draw.line(HOOP_X + n * 30, HOOP_Y + HOOP_R - 20, HOOP_X + n * 14, HOOP_Y + HOOP_R + 90, C.rim, 5);
    }
  }

  function ballPos() {
    if (!flying) {
      var bob = Math.sin(game.time.elapsed * 3) * 8;
      return { x: PED_X, y: PED_Y + bob };
    }
    var t = Math.min(1, flyT / 0.42);
    var x = PED_X + (HOOP_X - PED_X) * t;
    var y = PED_Y + (HOOP_Y - PED_Y) * t - Math.sin(t * Math.PI) * 220;
    return { x: x, y: y };
  }

  function drawBall() {
    var p = ballPos();
    game.draw.circle(p.x, PED_Y + 40, 40, '#00000033');
    game.draw.sprite(BALL_SPRITE, { '#': C.ball, o: C.ballLite }, p.x, p.y, 11, { anchor: 'center' });
  }

  function drawGauge() {
    var barW = BAR_X1 - BAR_X0;
    game.draw.rect(BAR_X0, BAR_Y - 20, barW, 40, C.bar, 1);
    var zoneW = barW * zoneHalf * 2;
    game.draw.rect(BAR_X0 + barW / 2 - zoneW / 2, BAR_Y - 20, zoneW, 40, C.zone, 0.6);
    var mx = BAR_X0 + barW * markerFrac();
    game.draw.circle(mx, BAR_Y, 22, C.marker);
  }

  function newDifficulty() {
    speed = 3.2 + round * 0.35;
    zoneHalf = Math.max(0.09, 0.2 - round * 0.02);
  }

  function initGame() {
    round = 0; halfCalled = false; markerT = 0; flying = false; flyT = 0;
    newDifficulty();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function attemptTap(x, y) {
    if (finished || ready > 0 || flying) return;
    var frac = markerFrac();
    if (Math.abs(frac - 0.5) <= zoneHalf) {
      flying = true; flyT = 0;
      game.audio.play('se_tap', 0.15);
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function resolveSink() {
    round++;
    flying = false;
    game.feedback.good(HOOP_X, HOOP_Y, { text: 'GOOD', color: C.good });
    game.fx.burst(HOOP_X, HOOP_Y, { color: C.gold, count: 18, speed: 360 });
    game.audio.play('se_coin', 0.4);
    if (round === Math.ceil(NEEDED / 2) && !halfCalled) {
      halfCalled = true;
      game.fx.popup('NICE', HOOP_X, HOOP_Y - 140, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (round >= NEEDED) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(HOOP_X, HOOP_Y, { text: 'CLEAR', color: C.good });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      newDifficulty();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PED_X, gy: BAR_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    markerT += dt;
    if (flying) {
      flyT += dt;
      if (flyT >= 0.42) resolveSink();
      demo.gx = ballPos().x; demo.gy = ballPos().y; demo.press = false;
    } else {
      var barW = BAR_X1 - BAR_X0;
      demo.gx = BAR_X0 + barW * markerFrac(); demo.gy = BAR_Y;
      var frac = markerFrac();
      var inZone = Math.abs(frac - 0.5) <= zoneHalf;
      demo.press = inZone;
      if (inZone && cyc > 0.3) attemptTap(demo.gx, demo.gy);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (speed === undefined) initGame();
      stepDemo(dt);
      bg();
      drawHoop();
      drawBall();
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHoop();
      drawBall();
      drawGauge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 42, ok ? C.good : C.bad);
      txt(round + ' / ' + NEEDED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + (NEEDED - round) + '本!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { streak: round, total: NEEDED });
        else game.end.failure({ streak: round, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      markerT += dt;
      if (flying) {
        flyT += dt;
        if (flyT >= 0.42) resolveSink();
      }
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(HOOP_X, HOOP_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHoop();
    drawBall();
    drawGauge();

    txt(round + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.boardEdge, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.15], ['E5', 0.15], ['G5', 0.15], ['C6', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

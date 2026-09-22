// K-DS-0056-carnival-ribbon-cut.js
// 加速紙吹雪斬り — 回転舞台で次々放られる色紙玉を、加速する太鼓に合わせ窓が開いた瞬間だけ斬る
// 操作: 色紙玉が斬撃窓(赤い円)に入っている間だけタップが有効。テンポは打つごとに加速する
// 終わり: 規定数(8個)を窓内で斬れば成功。3回外せば失敗
// @mechanic: timing_window
// @theme: carnival_paper_burst_cut
// 世界観: 旅回り一座の回転舞台。二刀の大道芸人が、加速する太鼓に煽られながら次々放り上げられる色紙玉を、斬撃窓が開いた一瞬だけ斬り飛ばす花形演目
// 残るもの: 正誤(大喝采/演目中断)+ 斬った個数と最大連続数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 回転する床の擬似遠近、放射状ライン、彩度高めの原色
  var C = {
    bg: '#1a0a2a', bg2: '#0a0414', floorA: '#3a1a5a', floorB: '#2a1044',
    ball: '#ff5aa8', ballCore: '#ffe0f0', window: '#ff3355',
    good: '#4dffa0', bad: '#ff4d5e', gold: '#ffd400', white: '#f4e8ff', ink: '#0a0410',
  };

  var GAME_TITLE = 'RIBBON CUT';
  var TOTAL = 8;
  var MAX_MISS = 3;
  var CX = W * 0.5, TY = H * 0.46;
  var WIN_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cutCount, miss, done, endWait, finished;
  var ready, hitStop, shake;
  var ball, tempo, spin;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['..##..', '.####.', '.####.', '######', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    // 擬似回転床: 放射状の帯
    var n = 16;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + spin;
      var col = i % 2 === 0 ? C.floorA : C.floorB;
      game.draw.line(CX, H * 0.86, CX + Math.cos(a) * 700, H * 0.86 + Math.sin(a) * 180, col, 26);
    }
    game.draw.circle(CX, H * 0.86, 60, C.floorB);
  }

  function newBall(idx) {
    var dur = Math.max(0.55, 1.1 - idx * tempo);
    return { t: 0, dur: dur, resolved: false };
  }

  function ballY(b) {
    var p = Math.min(1, b.t / b.dur);
    var arc = 1 - Math.pow((p - 0.5) * 2, 2);
    return H * 0.78 - arc * 420;
  }

  function inWindow(b) {
    var y = ballY(b);
    return Math.abs(y - TY) < WIN_R * 0.6;
  }

  function initGame() {
    cutCount = 0; miss = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    tempo = 0.05; spin = 0;
    ball = newBall(0);
  }

  function strike() {
    if (ready > 0 || done || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    if (inWindow(ball)) {
      var by = ballY(ball);
      cutCount++;
      hitStop = 0.08;
      game.feedback.good(CX, by, { text: 'CUT', color: C.good });
      game.fx.burst(CX, by, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.35);
      if (cutCount === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, TY - 220, { color: C.gold, size: 40 });
      ball = newBall(cutCount);
      if (cutCount >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      miss++;
      hitStop = 0.28;
      game.feedback.bad(CX, TY, { text: 'MISS' });
      shake = 0.24;
      game.audio.play('se_bad', 0.4);
      ball = newBall(cutCount);
      if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) strike();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawWindow() {
    var blink = Math.floor(game.time.elapsed * 16) % 2 === 0;
    game.draw.circle(CX, TY, WIN_R, blink ? C.window : '#ff335533', 0.35);
    game.draw.circle(CX, TY, WIN_R * 0.62, C.window, 0.18);
  }

  function drawBall(b) {
    if (!b || b.resolved) return;
    var y = ballY(b);
    var win = inWindow(b);
    if (win) game.draw.circle(CX, y, 60, C.gold, 0.25);
    game.draw.circle(CX, y, 34, C.ball);
    game.draw.circle(CX, y, 18, C.ballCore);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.b = newBall(0); demo.b.dur = 1.0; demo.struck = false; }
    demo.b.t += dt;
    ball = demo.b;
    if (inWindow(demo.b) && !demo.struck) {
      demo.struck = true;
      var by = ballY(demo.b);
      demo.gx = CX; demo.gy = by; demo.press = true;
      game.fx.burst(CX, by, { color: C.gold, count: 10, speed: 280 });
      game.audio.play('se_good', 0.2);
    }
    if (demo.b.t / demo.b.dur >= 1) demo.press = false;
  }

  game.onUpdate(function(dt) {
    spin += dt * 0.25;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawWindow();
      drawBall(ball);
      game.draw.sprite(PERFORMER, { '#': C.white }, CX, H * 0.68, 22, { anchor: 'center' });
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
      game.draw.sprite(PERFORMER, { '#': C.white }, CX, H * 0.68, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cutCount + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cutCount) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cutCount, { cut: cutCount, total: TOTAL });
        else game.end.failure({ cut: cutCount, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ball.t += dt;
      if (ball.t / ball.dur >= 1 && !ball.resolved) {
        ball.resolved = true;
        miss++;
        hitStop = 0.28;
        game.feedback.bad(CX, TY, { text: 'MISS' });
        shake = 0.24;
        game.audio.play('se_bad', 0.4);
        ball = newBall(cutCount);
        if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawWindow();
    if (!finished) drawBall(ball);
    game.draw.sprite(PERFORMER, { '#': C.white }, CX, H * 0.68, 22, { anchor: 'center' });

    txt(cutCount + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cutCount / TOTAL), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 200, 14, mi < miss ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['A3', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 172, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

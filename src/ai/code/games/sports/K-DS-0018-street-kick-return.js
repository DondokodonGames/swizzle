// K-DS-0018-street-kick-return.js
// ストリートキックリターン — 壁当て機から飛んでくる球を、届いた瞬間に蹴り返す
// 操作: 球が足元に届いた瞬間にタップして蹴り返す
// 終わり: 規定回数(6球)を蹴り返せば成功。3球外せば失敗
// @mechanic: reaction_duel
// @theme: street_wall_kickback
// 世界観: 路地裏の壁当てコート。壁の発射口から次々に飛んでくる球を、選手が届いた瞬間だけ強く蹴り返す個人練習
// 残るもの: 正誤(CLEAR/GAME OVER) + 蹴り返した本数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 鮮やかだが落ち着いた中間色、輪郭は濃い影で強調
  var C = {
    bg: '#1c3a2a', bg2: '#0e2418', wall: '#3a5a44', wallDark: '#1c3020',
    ball: '#f0e050', ballDark: '#a89020', good: '#5aff8a', bad: '#ff5a5a',
    gold: '#ffd400', white: '#f2f6ee', ink: '#0a1208',
  };

  var GAME_TITLE = 'KICK RETURN';
  var TOTAL = 6;
  var MISS_LIMIT = 3;
  var CX = W * 0.5, FOOT_Y = H * 0.66, WALL_Y = H * 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER = ['..##..', '.####.', '..##..', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, WALL_Y - 40, W, 60, C.wallDark);
    for (var i = 0; i < 8; i++) game.draw.rect(i * (W / 8), H * 0.3, 2, H * 0.5, '#ffffff05');
  }

  var ball, round, kicked, misses, done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    kicked = 0; misses = 0; round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newBall();
  }

  function newBall() {
    var dur = Math.max(0.6, 1.05 - round * 0.05);
    ball = { t: 0, dur: dur, resolved: false, telegraphed: false };
  }

  function resolveKick() {
    if (!ball || ball.resolved || ready > 0 || done || finished) return;
    var p = ball.t / ball.dur;
    var win = p >= 0.78 && p <= 1.08;
    ball.resolved = true;
    game.audio.play('se_tap', 0.06);
    hitStop = win ? 0.1 : 0.3;
    if (win) {
      kicked++;
      game.feedback.good(CX, FOOT_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, FOOT_Y, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (kicked >= Math.ceil(TOTAL / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup(kicked + ' / ' + TOTAL, CX, FOOT_Y - 300, { color: C.gold, size: 38 });
      }
      if (kicked >= TOTAL) { ok = true; finished = true; finish(); return; }
    } else {
      misses++;
      game.feedback.bad(CX, FOOT_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
    round++;
    newBall();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveKick();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBall(b) {
    if (!b) return;
    var p = Math.min(1, b.t / b.dur);
    var y = WALL_Y + (FOOT_Y - WALL_Y) * p;
    var r = 24 + p * 14;
    if (p > 0.5) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX, FOOT_Y, 90, C.bad, 0.18);
    }
    game.draw.circle(CX, y, r, C.ballDark, 0.4);
    game.draw.circle(CX, y, r - 4, C.ball);
  }

  function drawScene(legKick) {
    bg();
    game.draw.sprite(PLAYER, { '#': C.white }, CX, FOOT_Y - 30, 22, { anchor: 'center' });
    if (legKick) game.draw.circle(CX, FOOT_Y + 30, 20, C.gold, 0.5);
  }

  var demo = { t: 0, gx: CX, gy: FOOT_Y + 200, press: false, b: null, round: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.b = null; demo.round = 0; }
    if (!demo.b) { demo.b = { t: 0, dur: 0.95, resolved: false }; }
    demo.b.t += dt;
    var p = demo.b.t / demo.b.dur;
    if (p > 0.8 && p < 0.95 && !demo.b.telegraphed) {
      demo.b.telegraphed = true;
      demo.press = true;
      game.feedback.good(CX, FOOT_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.b = null; demo.press = false; }
    ball = demo.b;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.press);
      drawBall(ball);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(kicked + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - kicked <= 2) txt('あと' + (TOTAL - kicked) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(kicked, { kicked: kicked, total: TOTAL, misses: misses });
        else game.end.failure({ kicked: kicked, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ball.t += dt;
      if (ball.t / ball.dur >= 1.15 && !ball.resolved) {
        ball.resolved = true;
        misses++;
        hitStop = 0.3;
        shake = 0.25;
        game.feedback.bad(CX, FOOT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
        else { round++; newBall(); }
      }
    }
    if (shake > 0) shake -= dt;

    drawScene(false);
    if (!finished) drawBall(ball);

    txt(kicked + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (kicked / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

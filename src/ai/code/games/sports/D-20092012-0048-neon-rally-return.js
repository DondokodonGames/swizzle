// D-20092012-0048-neon-rally-return.js
// ネオンラリーリターン — 光る球が沈む一瞬をスワイプで打ち返し、ラリーを続ける
// 操作: 落ちてくる球が甘い高さに来た瞬間にスワイプ(方向は問わない)して打ち返す
// 終わり: 規定回数(6回)打ち返せば成功。タイミングを外せば(甘い高さを逃す/早すぎる)失敗
// @mechanic: timing_window
// @theme: neon_court_rally
// 世界観: 夜のネオンコート。1人の打者が壁打ちの光球を延々と打ち返し続けるラリーの記録に挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続で打ち返せた回数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めの原色、太い白縁、光沢グラデ、丸っこいフォント感
  var C = {
    bg: '#1c1030', bg2: '#3a1a5c', court: '#ff2fa0', courtLine: '#ffffff',
    ball: '#ffe600', ballCore: '#fff6b0', gold: '#ffb000',
    good: '#37ff9e', bad: '#ff3d5a', white: '#ffffff', ink: '#150a24', accent: '#00e0ff',
  };

  var GAME_TITLE = 'NEON RALLY';
  var TOTAL = 6;
  var CX = W * 0.5;
  var TOP_Y = H * 0.14;      // 打ち出し高さ
  var BAT_Y = H * 0.62;      // 打者の位置(プレイフィールド内)
  var ZONE_LO = H * 0.56, ZONE_HI = H * 0.70; // 甘い高さ(ヒットウィンドウ)
  var MISS_Y = H * 0.80;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BATTER_IDLE = ['.##.', '####', '.##.', '#..#'];
  var BATTER_SWING = ['.##.', '####', '.##.', '#.#.'];

  function ambient(t) {
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3));
  }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var a = 0.05 + 0.03 * Math.sin(t * 0.6 + i);
      game.draw.rect(0, H * (0.2 + i * 0.11), W, 3, '#ffffff', a);
    }
    game.draw.line(0, ZONE_LO, W, ZONE_LO, C.courtLine, 4);
    game.draw.line(0, ZONE_HI, W, ZONE_HI, C.courtLine, 4);
    game.draw.rect(0, ZONE_LO, W, ZONE_HI - ZONE_LO, C.court, 0.10);
    ambient(t);
  }

  var ball, hits, misses, done, endWait, finished, swung;
  var ready, hitStop, shake, side, dur;

  function newBall() {
    side = side === -1 ? 1 : -1;
    return { y: TOP_Y, x: CX + side * W * 0.16, t: 0, dur: dur, resolved: false, gold: hits === TOTAL - 1 };
  }

  function initGame() {
    hits = 0; misses = 0; done = false; endWait = 0; finished = false; swung = false;
    ready = 0.8; hitStop = 0; shake = 0; side = 1; dur = 1.15;
    ball = newBall();
  }

  function ballY(b) {
    var p = Math.min(1, b.t / b.dur);
    return TOP_Y + (MISS_Y - TOP_Y) * p;
  }

  function attemptSwing() {
    if (!ball || ball.resolved || ready > 0 || done || finished) return;
    ball.resolved = true;
    var y = ballY(ball);
    var good = y >= ZONE_LO && y <= ZONE_HI;
    hitStop = good ? 0.1 : 0.3;
    swung = true;
    if (good) {
      hits++;
      game.feedback.good(CX, BAT_Y, { text: ball.gold ? 'PERFECT' : 'GOOD', color: ball.gold ? C.gold : C.good });
      game.fx.burst(CX, ballY(ball), { color: ball.gold ? C.gold : C.accent, count: ball.gold ? 22 : 14, speed: 340 });
      game.audio.play(ball.gold ? 'se_powerup' : 'se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.4, { color: C.gold, size: 40 });
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      dur = Math.max(0.7, dur - 0.06);
      ball = newBall();
    } else {
      misses++;
      game.feedback.bad(CX, BAT_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onSwipe(function() { if (state === S.PLAYING) attemptSwing(); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBall(b, swingFlash) {
    if (!b) return;
    var y = ballY(b);
    var glow = b.gold ? C.gold : C.ball;
    if (y >= ZONE_LO - 40 && y <= ZONE_HI + 40) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) game.draw.circle(CX, (ZONE_LO + ZONE_HI) / 2, 90, glow, 0.12);
    }
    game.draw.circle(b.x + (CX - b.x) * Math.min(1, b.t / b.dur), y, 30, glow);
    game.draw.circle(b.x + (CX - b.x) * Math.min(1, b.t / b.dur), y, 12, C.ballCore);
    if (swingFlash) game.draw.circle(CX, BAT_Y, 70, C.white, 0.25);
  }

  function drawBatter(bob, swinging) {
    var y = BAT_Y + Math.sin(bob) * 6;
    game.draw.sprite(swinging ? BATTER_SWING : BATTER_IDLE, { '#': C.accent }, CX, y, 30, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, swingT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.5;
    if (cyc < dt || demo.t <= dt) { ball = newBall(); dur = 1.15; }
    ball.t += dt;
    var y = ballY(ball);
    demo.swingT -= dt;
    if (y >= ZONE_LO && y <= ZONE_HI && !ball.resolved) {
      ball.resolved = true;
      demo.swingT = 0.18;
      game.feedback.good(CX, BAT_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    demo.press = demo.swingT > 0;
    demo.gx = CX + Math.sin(demo.t * 2.3) * 30;
    demo.gy = BAT_Y - 80 + Math.cos(demo.t * 1.9) * 10;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      stepDemo(dt);
      drawBall(ball, false);
      drawBatter(t * 3, demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 24, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawBatter(t * 2, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ball.t += dt;
      if (ballY(ball) >= MISS_Y && !ball.resolved) {
        ball.resolved = true;
        hitStop = 0.3;
        game.feedback.bad(CX, BAT_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawBall(ball, swung && hitStop > 0);
    if (swung && hitStop <= 0) swung = false;
    drawBatter(t * 3, hitStop > 0 && ok !== false);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 0.25], ['C5', 0.25], ['G4', 0.25], ['C5', 0.25]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

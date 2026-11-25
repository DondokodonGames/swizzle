// K-GBA-0001-return-punch-ring.js
// リターンパンチリング — 迫る的球を見切り、届く間合いで正確に打ち返す
// 操作: 中央に寄ってくる的球が拳の届く間合いに入った瞬間、球そのものをタップして打ち返す
// 終わり: 6球すべてを正しい間合い・位置で打ち返せば成功。的を外す/間合いを誤れば失敗
// @mechanic: aim_shoot
// @theme: carnival_return_punch
// 世界観: 見世物小屋の返し突きブース。宙を漂い迫る的球を、届く間合いで拳を突き出して打ち返す腕比べ
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した球数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 太い輪郭・大きく厚みのあるスプライト、原色寄り3色+アクセント2色
  var C = {
    bg: '#1c1030', bg2: '#0e0820', ring: '#ffb020', ringDim: '#7a5410',
    ball: '#ff5a3c', ballDark: '#8c2a18', glove: '#f0d8b0', gloveDark: '#a5764a',
    good: '#3dff8a', bad: '#ff3d5a', gold: '#ffe600', white: '#fff6e8', ink: '#0a0608',
  };

  var GAME_TITLE = 'RETURN PUNCH';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.46;
  var FAR_Y = H * 0.30, NEAR_Y = H * 0.50;
  var MIN_R = 24, MAX_R = 150;
  var WIN_LO = 0.60, WIN_HI = 0.88;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hit, done, endWait, finished, ready, hitStop, shake, round, ball;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GLOVE = ['.####.', '######', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.circle(CX, CY, 120 + i * 90, C.ringDim, 0.10);
    }
    game.draw.line(0, H * 0.62, W, H * 0.62, C.ringDim, 10);
  }

  function newBall(rnd) {
    var dur = Math.max(0.80, 1.35 - rnd * 0.09);
    var x0 = W * (0.30 + Math.random() * 0.40);
    var seed = Math.random() * 10;
    return { t: 0, dur: dur, x0: x0, seed: seed, resolved: false, telegraphed: false };
  }

  function ballPos(b) {
    var p = Math.min(1, b.t / b.dur);
    var y = FAR_Y + (NEAR_Y - FAR_Y) * p;
    var drift = Math.sin(b.seed + p * 5.2) * 90 * (1 - p);
    var x = b.x0 + drift;
    var r = MIN_R + (MAX_R - MIN_R) * p;
    return { x: x, y: y, r: r, p: p };
  }

  function initGame() {
    hit = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0;
    ball = newBall(0);
  }

  function failBall(px, py) {
    hitStop = 0.35;
    game.feedback.bad(px, py, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function resolveTap(x, y) {
    if (!ball || ball.resolved || ready > 0 || done || finished) return;
    ball.resolved = true;
    var pos = ballPos(ball);
    var dist = Math.hypot(x - pos.x, y - pos.y);
    var inWindow = pos.p >= WIN_LO && pos.p <= WIN_HI;
    var aimed = dist <= pos.r + 22;
    if (aimed && inWindow) {
      hit++;
      hitStop = 0.12;
      game.feedback.good(pos.x, pos.y, { text: 'HIT', color: C.good });
      game.fx.burst(pos.x, pos.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (hit === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
      if (hit >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      ball = newBall(round);
    } else {
      failBall(pos.x, pos.y);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBall(b, missed) {
    if (!b) return;
    var pos = ballPos(b);
    if (pos.p > 0.5 && !missed) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, pos.r + 14, C.bad, 0.35);
    }
    game.draw.circle(pos.x, pos.y, pos.r, C.ballDark);
    game.draw.circle(pos.x, pos.y, pos.r * 0.72, C.ball);
    return pos;
  }

  function drawGlove(scale) {
    game.draw.sprite(GLOVE, { '#': C.glove }, CX, H * 0.68, 26 * (scale || 1), { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.68, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.b) { demo.b = newBall(0); demo.b.dur = 1.1; round = 0; }
    demo.b.t += dt;
    ball = demo.b;
    var pos = ballPos(demo.b);
    demo.press = false;
    if (pos.p >= 0.72 && pos.p <= 0.8 && !demo.b.telegraphed) {
      demo.b.telegraphed = true;
      demo.gx = pos.x; demo.gy = pos.y; demo.press = true;
      game.feedback.good(pos.x, pos.y, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.25);
    } else if (pos.p < 0.72) {
      demo.gx += (CX - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (H * 0.68 - demo.gy) * Math.min(1, dt * 3);
    }
    if (pos.p >= 1) { demo.b = null; demo.gx = CX; demo.gy = H * 0.68; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBall(ball);
      drawGlove(1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
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
      bg();
      drawGlove(1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hit + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hit) + '球!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hit, { hit: hit, total: TOTAL });
        else game.end.failure({ hit: hit, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ball.t += dt;
      var pos = ballPos(ball);
      if (pos.p >= 1 && !ball.resolved) {
        ball.resolved = true;
        failBall(pos.x, pos.y);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBall(ball);
    drawGlove(1);

    txt(hit + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hit / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

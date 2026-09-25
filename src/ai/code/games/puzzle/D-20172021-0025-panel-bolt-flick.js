// D-20172021-0025-panel-bolt-flick.js
// パネルボルト・フリック — 色分けされたボルトの脇に光る矢印の方向へ払って引き抜き、留め板を外す
// 操作: 中央のボルトの脇に出る矢印と同じ方向へ指でスワイプして引き抜く。4本すべて外すまで繰り返す
// 終わり: 4本を正しい方向で抜き切れば成功。逆方向のスワイプや猶予切れで失敗
// @mechanic: swipe_direction
// @theme: panel_bolt_flick
// 世界観: 廃工場の解体作業員が、色分けされたボルトの脇に灯る矢印の指示どおりに払って引き抜き、留め板を外していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜いたボルト数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値をディザで階調、線の太さで語る
  var C = {
    bg: '#f4f1e8', bg2: '#e0dccf', ink: '#161412', panel: '#2a2622', panelLite: '#403a32',
    good: '#161412', bad: '#161412', gold: '#161412', accent: '#c8241c',
  };
  var BOLT_COLORS = ['#161412', '#3a3632', '#524c44', '#6a6258'];

  var GAME_TITLE = 'BOLT FLICK';
  var TIME_LIMIT = 13;
  var NEEDED = 4;
  var ROUND_TIMEOUT = 3.0;
  var DIRS = ['up', 'down', 'left', 'right'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOLT_SPRITE = ['.##.', '####', '.##.'];
  var BOLT_X = W * 0.5, BOLT_Y = H * 0.42;

  var round, dir, roundTimer, pulled, dist, done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#161412', pulse * 0.6);
    game.draw.rect(W * 0.14, H * 0.24, W * 0.72, H * 0.42, C.panel);
    game.draw.rect(W * 0.14 + 8, H * 0.24 + 8, W * 0.72 - 16, H * 0.42 - 16, C.panelLite);
  }

  function drawArrow(cx, cy, d, color, size, offset) {
    var s = size;
    var ox = d === 'left' ? -offset : d === 'right' ? offset : 0;
    var oy = d === 'up' ? -offset : d === 'down' ? offset : 0;
    cx += ox; cy += oy;
    var pts;
    if (d === 'up') pts = [[0, -s], [-s, s * 0.6], [s, s * 0.6]];
    else if (d === 'down') pts = [[0, s], [-s, -s * 0.6], [s, -s * 0.6]];
    else if (d === 'left') pts = [[-s, 0], [s * 0.6, -s], [s * 0.6, s]];
    else pts = [[s, 0], [-s * 0.6, -s], [-s * 0.6, s]];
    game.draw.line(cx + pts[0][0], cy + pts[0][1], cx + pts[1][0], cy + pts[1][1], color, 12);
    game.draw.line(cx + pts[1][0], cy + pts[1][1], cx + pts[2][0], cy + pts[2][1], color, 12);
    game.draw.line(cx + pts[2][0], cy + pts[2][1], cx + pts[0][0], cy + pts[0][1], color, 12);
  }

  function drawScene() {
    var col = BOLT_COLORS[round % BOLT_COLORS.length];
    var ox = 0, oy = 0;
    if (pulled) {
      var t = Math.min(1, dist);
      if (dir === 'left') ox = -t * 500; else if (dir === 'right') ox = t * 500;
      else if (dir === 'up') oy = -t * 500; else if (dir === 'down') oy = t * 500;
    }
    game.draw.sprite(BOLT_SPRITE, { '#': col }, BOLT_X + ox, BOLT_Y + oy, 30, { anchor: 'center' });
    if (!pulled) {
      var pulse = 60 + Math.sin(game.time.elapsed * 6) * 10;
      drawArrow(BOLT_X, BOLT_Y, dir, C.accent, 40, pulse);
    }
  }

  function newRound() {
    dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    roundTimer = ROUND_TIMEOUT; pulled = false; dist = 0;
  }

  function initGame() {
    round = 0; halfCalled = false;
    newRound();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function attemptSwipe(swipeDir) {
    if (finished || ready > 0 || pulled) return;
    if (swipeDir === dir) {
      pulled = true; dist = 1;
      round++;
      game.feedback.good(BOLT_X, BOLT_Y, { text: 'GOOD', color: '#161412' });
      game.audio.play('se_break', 0.35);
      if (round === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', BOLT_X, BOLT_Y - 200, { color: '#161412', size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (round >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(BOLT_X, BOLT_Y, { text: 'CLEAR', color: '#161412' });
        game.fx.burst(BOLT_X, BOLT_Y, { color: '#161412', count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newRound();
      }
    } else {
      finished = true; ok = false; pulled = true; dist = 0.4; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(BOLT_X, BOLT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished && ready <= 0) {
      game.audio.play('se_tap', 0.08);
    }
  });
  game.onSwipe(function(d) {
    if (state === S.PLAYING) attemptSwipe(d);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BOLT_X, gy: BOLT_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = 4.4 / NEEDED;
    var localCyc = cyc % seg;
    var dvec = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    if (localCyc < seg * 0.5) {
      var t2 = localCyc / (seg * 0.5);
      var back = -80 * (1 - t2);
      demo.gx = BOLT_X - dvec[0] * 40 + dvec[0] * back;
      demo.gy = BOLT_Y - dvec[1] * 40 + dvec[1] * back;
      demo.press = false;
    } else {
      var t3 = (localCyc - seg * 0.5) / (seg * 0.5);
      demo.gx = BOLT_X + dvec[0] * 160 * t3;
      demo.gy = BOLT_Y + dvec[1] * 160 * t3;
      demo.press = true;
      if (!pulled && t3 > 0.5) {
        pulled = true; dist = 1; round++;
        game.feedback.good(BOLT_X, BOLT_Y, { text: 'GOOD', color: '#161412' });
        game.audio.play('se_good', 0.2);
      }
      if (t3 > 0.9 && round < NEEDED) newRound();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dir === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.10, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 44, C.ink);
      txt(round + ' / ' + NEEDED, W / 2, H * 0.15, 26, C.accent);
      if (!ok) txt('あと' + (NEEDED - round) + '本!', W / 2, H * 0.19, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { bolts: round, total: NEEDED });
        else game.end.failure({ bolts: round, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      roundTimer -= dt;
      if (roundTimer <= 0) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BOLT_X, BOLT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BOLT_X, BOLT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(round + ' / ' + NEEDED, W / 2, H * 0.08, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, tbW, 16, C.panel, 1);
    game.draw.rect(60, 160, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.accent : C.ink);
    if (!finished) {
      var rbW = 300;
      game.draw.rect(W / 2 - rbW / 2, H * 0.84, rbW, 20, C.panel, 1);
      game.draw.rect(W / 2 - rbW / 2, H * 0.84, rbW * Math.max(0, roundTimer / ROUND_TIMEOUT), 20, C.accent);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.15], ['C4', 0.15], ['G3', 0.15], ['C4', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

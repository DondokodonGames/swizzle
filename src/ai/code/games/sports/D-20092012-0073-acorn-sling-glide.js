// D-20092012-0073-acorn-sling-glide.js
// エイコーン・スリング・グライド — 輪ゴムでどんぐりを弾き飛ばし、松ぼっくりの棘を避けて対岸の的に着地させる
// 操作: どんぐりを指で引いて離す(スリングショット)。引いた向きと強さで弧を描いて飛ぶ
// 終わり: 棘を避けて対岸の的に着地できれば成功。棘に当たる/的を外す/届かず落ちれば失敗
// @mechanic: slingshot
// @theme: acorn_pond_glide
// 世界観: 小川を挟んだ木の下の遊び場。どんぐりを輪ゴムのパチンコで弾き飛ばし、浮かぶ松ぼっくりの棘を避けながら対岸の的の葉まで届かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 飛んだ距離
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色+地平グラデ、横1pxストリップで奥ほど圧縮、地平線へ収束する床
  var C = {
    sky1: '#1a2c3a', sky2: '#0e1c26', horizon: '#3a5a58', water1: '#2a5a6a', water2: '#173a48',
    acorn: '#c98a3a', acornDark: '#8a5a1e', spike: '#8a5a4a', spikeDark: '#5a382a',
    pad: '#3dbb6a', padDark: '#2a8850',
    good: '#3dbb6a', bad: '#ff4d5e', gold: '#ffd25a', white: '#f2f6ea', ink: '#0a1210',
  };

  var GAME_TITLE = 'SLING GLIDE';
  var LAUNCH = { x: W * 0.5, y: H * 0.82 };
  var PULL_MAX = 220;
  var GRAVITY = 620;
  var OBSTACLE = { x: W * 0.5, y: H * 0.46, r: 70 };
  var PAD = { x: W * 0.5, y: H * 0.20, r: 90 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ACORN_SPR = ['.##.', '####', '####'];
  var SPIKE_SPR = ['#.#.#', '.###.', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.42, C.sky2], [0.46, C.horizon], [0.5, C.water1], [1, C.water2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    for (var i = 0; i < 12; i++) {
      var t = i / 12;
      var y = H * 0.5 + t * (H * 0.46);
      game.draw.rect(0, y, W, 3, i % 2 === 0 ? C.water2 : C.water1, 0.35);
    }
  }

  var ball, pulling, pullX, pullY, launched, distance, bestDist, passedHazard;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    ball = null; pulling = false; pullX = LAUNCH.x; pullY = LAUNCH.y; launched = false; distance = 0; passedHazard = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function fail(x, y, txtLabel) {
    hitStop = 0.32; shake = 0.26;
    game.feedback.bad(x, y, { text: txtLabel });
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function launchBall(px, py) {
    var dx = LAUNCH.x - px, dy = LAUNCH.y - py;
    var d = Math.hypot(dx, dy);
    if (d < 24) return;
    var nx = dx / d, ny = dy / d;
    var speed = 620 + Math.min(d, PULL_MAX) * 3.0;
    ball = { x: LAUNCH.x, y: LAUNCH.y, vx: nx * speed, vy: ny * speed };
    launched = true;
    game.audio.play('se_jump', 0.35);
  }

  function stepBall(dt) {
    if (!ball) return;
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    distance = Math.max(distance, (LAUNCH.y - ball.y) / 4);

    if (game.hit.circle(ball.x, ball.y, 20, OBSTACLE.x, OBSTACLE.y, OBSTACLE.r)) {
      fail(ball.x, ball.y, 'MISS');
      ball = null;
      return;
    }
    if (!passedHazard && ball.y < OBSTACLE.y - OBSTACLE.r) {
      passedHazard = true;
      game.fx.popup('NICE', ball.x, ball.y - 60, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.3);
    }
    if (game.hit.circle(ball.x, ball.y, 20, PAD.x, PAD.y, PAD.r) && ball.vy < 400) {
      hitStop = 0.15;
      game.feedback.good(ball.x, ball.y, { text: 'CLEAR', color: C.good });
      game.fx.burst(ball.x, ball.y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_success', 0.4);
      ok = true; finished = true;
      ball = null;
      finish();
      return;
    }
    if (ball.x < -40 || ball.x > W + 40) { fail(LAUNCH.x, H * 0.4, 'MISS'); ball = null; return; }
    if (ball.y > LAUNCH.y + 40) { fail(ball.x, LAUNCH.y, 'MISS'); ball = null; return; }
  }

  function drawObstacle() {
    var bob = Math.sin(game.time.elapsed * 2) * 6;
    game.draw.circle(OBSTACLE.x, OBSTACLE.y + bob, OBSTACLE.r + 10, C.spikeDark, 0.4);
    game.draw.sprite(SPIKE_SPR, { '#': C.spike }, OBSTACLE.x, OBSTACLE.y + bob, 24, { anchor: 'center' });
  }
  function drawPad() {
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 3);
    game.draw.circle(PAD.x, PAD.y, PAD.r + pulse * 12, C.pad, 0.2);
    game.draw.circle(PAD.x, PAD.y, PAD.r, C.padDark, 0.8);
    game.draw.circle(PAD.x, PAD.y, PAD.r - 20, C.pad, 0.9);
  }
  function drawSling() {
    var sway = Math.sin(game.time.elapsed * 2.4) * 3;
    game.draw.sprite(ACORN_SPR, { '#': C.acornDark }, LAUNCH.x + sway, LAUNCH.y + 60, 12, { anchor: 'center' });
    if (pulling) {
      game.draw.line(LAUNCH.x, LAUNCH.y, pullX, pullY, C.gold, 8);
      game.draw.circle(pullX, pullY, 20, C.acorn);
    } else if (!ball && !done && !launched) {
      game.draw.circle(LAUNCH.x, LAUNCH.y, 20, C.acorn);
    }
    if (ball) game.draw.circle(ball.x, ball.y, 20, C.acorn);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (distance > bestDist) bestDist = distance;
    endWait = 1.3;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || ball || launched) return;
    var d = Math.hypot(x - LAUNCH.x, y - LAUNCH.y);
    if (d < 140) { pulling = true; pullX = x; pullY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pulling) return;
    var dx = x - LAUNCH.x, dy = y - LAUNCH.y;
    var d = Math.hypot(dx, dy);
    if (d > PULL_MAX) { dx = dx / d * PULL_MAX; dy = dy / d * PULL_MAX; }
    pullX = LAUNCH.x + dx; pullY = LAUNCH.y + dy;
    if (Math.random() < 0.15) game.audio.play('se_tap', 0.03);
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !pulling) return;
    pulling = false;
    game.audio.play('se_tap', 0.08);
    launchBall(pullX, pullY);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: LAUNCH.x, gy: LAUNCH.y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { ball = null; launched = false; distance = 0; }
    if (cyc < 1.0) {
      var p = cyc / 1.0;
      var aimX = LAUNCH.x - 30, aimY = LAUNCH.y + 140;
      demo.gx = LAUNCH.x + (aimX - LAUNCH.x) * p;
      demo.gy = LAUNCH.y + (aimY - LAUNCH.y) * p;
      demo.press = true;
      pullX = demo.gx; pullY = demo.gy; pulling = true;
    } else if (cyc < 1.2) {
      if (pulling) { pulling = false; launchBall(pullX, pullY); }
      demo.press = false;
    } else {
      stepBall(dt);
      if (ball) { demo.gx = ball.x; demo.gy = ball.y; }
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bestDist === undefined) { bestDist = 0; initGame(); }
      bg();
      stepDemo(dt);
      drawObstacle();
      drawPad();
      drawSling();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawObstacle();
      drawPad();
      drawSling();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(distance) + 'm', W / 2, H * 0.12, 30, C.white);
      if (!ok) txt('あと少し!', W / 2, H * 0.16, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(distance), { distance: Math.round(distance) });
        else game.end.failure({ distance: Math.round(distance) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepBall(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawObstacle();
    drawPad();
    drawSling();

    txt(Math.round(distance) + ' / ' + Math.round((LAUNCH.y - PAD.y) / 4) + 'm', W / 2, 100, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.25], ['C5', 0.25], ['E5', 0.25], ['A5', 0.5]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true, bass: [['A3', 0.5]], bassWave: 'sine', bassVolume: 0.05 });
    state = S.ATTRACT;
    initGame();
  });
})(game);

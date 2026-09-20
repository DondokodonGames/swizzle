// I-Switch-0001-rooftop-courier-dash.js
// ダッシュクーリエ — 屋根伝いの配達人が連打で加速し、隙間をジャンプでかわしながら距離を走り切る
// 操作: 画面タップ連打で加速する。頭上に隙間の警告が出たら上スワイプでジャンプしてかわす
// 終わり: 制限時間内に規定距離を走り切れば成功。ジャンプに失敗する/時間切れなら失敗
// @mechanic: camera_run
// @theme: rooftop_courier_dash
// 世界観: 夕暮れの屋根の上、配達人が屋根から屋根へ駆け抜け、隙間を飛び越えながら決められた距離を届け先まで走る
// 残るもの: 正誤(CLEAR/TIME UP) + 到達した距離%
// スタイル: 90s BIG SPRITE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめのくっきりしたスプライト+くすんだ背景
  var C = {
    bg: '#4a5a6a', bg2: '#2e3c4a', roof: '#7a5a48', roofEdge: '#5a4030',
    gap: '#1c2430', warn: '#ff3d3d', runner: '#ffcf40', runnerDark: '#e0a020',
    good: '#5cff8a', bad: '#ff3d3d', gold: '#ffd400', white: '#f4f4ea', ink: '#101418',
  };

  var GAME_TITLE = 'DASH COURIER';
  var TIME_LIMIT = 20;
  var DIST_TARGET = 100;
  var RUNNER_X = W * 0.28, RUNNER_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dist, speedBoost, timeLeft, obstacle, obstacleTimer, jumpT, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUN_A = ['.##.', '####', '.##.', '#..#'];
  var RUN_B = ['.##.', '####', '.##.', '..#.'];
  var JUMP = ['.##.', '####', '#..#', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var scroll = (dist * 6) % 120;
    for (var i = -1; i < 10; i++) {
      game.draw.rect(i * 120 - scroll, H * 0.70, 90, H * 0.14, C.roofEdge);
      game.draw.rect(i * 120 - scroll, H * 0.68, 90, 8, C.roof);
    }
  }

  function drawRunner() {
    var frame = jumpT > 0 ? JUMP : (Math.floor(game.time.elapsed * 8) % 2 === 0 ? RUN_A : RUN_B);
    var y = RUNNER_Y - (jumpT > 0 ? Math.sin(Math.min(1, jumpT / 0.4) * Math.PI) * 90 : 0);
    game.draw.sprite(frame, { '#': C.runner }, RUNNER_X, y, 24, { anchor: 'center' });
  }

  function newObstacle(idx) {
    return { t: 0, dur: Math.max(1.1, 1.9 - idx * 0.05), resolved: false };
  }

  function initGame() {
    dist = 0; speedBoost = 0; timeLeft = TIME_LIMIT; obstacle = null; obstacleTimer = 1.6; jumpT = 0;
    done = false; endWait = 0; finished = false; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function runTap(x, y) {
    if (done || ready > 0 || finished) return;
    dist = Math.min(DIST_TARGET, dist + 3.2);
    speedBoost = Math.min(1, speedBoost + 0.3);
    game.feedback.good(x, y, { text: null, color: C.gold, size: 10 });
    game.audio.play('se_tap', 0.12);
    if (!milestoneShown && dist >= DIST_TARGET * 0.5) {
      milestoneShown = true;
      game.fx.popup('HALFWAY!', W / 2, H * 0.30, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.4);
    }
    if (dist >= DIST_TARGET) {
      ok = true; finished = true; hitStop = 0.15;
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  function jumpAttempt() {
    if (done || ready > 0 || finished) return;
    if (obstacle && !obstacle.resolved) {
      obstacle.resolved = true;
      jumpT = 0.001;
      game.feedback.good(RUNNER_X, RUNNER_Y, { text: 'JUMP', color: C.good });
      game.audio.play('se_jump', 0.4);
    } else {
      game.audio.play('se_tap', 0.05);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) runTap(x, y);
  });
  game.onSwipe(function(dir) {
    if (state === S.PLAYING && dir === 'up') jumpAttempt();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: RUNNER_X, gy: H * 0.90, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { dist = 0; obstacle = newObstacle(0); jumpT = 0; }
    var tapEvery = 0.22;
    if (Math.floor(cyc / tapEvery) !== Math.floor((cyc - dt) / tapEvery) && cyc < 3.6) {
      dist = Math.min(DIST_TARGET, dist + 3.2);
      demo.press = true;
      demo.gx = RUNNER_X;
    } else demo.press = false;
    if (obstacle) {
      obstacle.t += dt;
      if (obstacle.t > obstacle.dur * 0.55 && !obstacle.resolved) {
        obstacle.resolved = true;
        jumpT = 0.001;
        demo.press = true;
        demo.gy = H * 0.60;
        game.feedback.good(RUNNER_X, RUNNER_Y, { text: 'JUMP', color: C.good });
        game.audio.play('se_jump', 0.2);
      }
      if (obstacle.t >= obstacle.dur) { obstacle = cyc < 3.6 ? newObstacle(1) : null; }
    }
    if (jumpT > 0) { jumpT += dt; if (jumpT > 0.4) jumpT = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      bg();
      stepDemo(dt);
      if (obstacle) drawObstacle(obstacle);
      drawRunner();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRunner();
      var pct = Math.round((dist / DIST_TARGET) * 100);
      txt(ok ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round((dist / DIST_TARGET) * 100);
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      speedBoost = Math.max(0, speedBoost - dt * 0.6);
      dist = Math.min(DIST_TARGET, dist + dt * (1.2 + speedBoost * 2));
      if (dist >= DIST_TARGET) { ok = true; finished = true; hitStop = 0.15; game.audio.play('se_success', 0.5); finish(); }
      timeLeft -= dt;
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.25;
        game.feedback.bad(RUNNER_X, RUNNER_Y, { text: 'TIME UP' });
        shake = 0.25;
        finish();
      }
      if (!finished) {
        obstacleTimer -= dt;
        if (!obstacle && obstacleTimer <= 0) { obstacle = newObstacle(1); obstacleTimer = 999; }
        if (obstacle) {
          obstacle.t += dt;
          if (obstacle.t >= obstacle.dur && !obstacle.resolved) {
            obstacle.resolved = true;
            hitStop = 0.35;
            game.feedback.bad(RUNNER_X, RUNNER_Y, { text: 'MISS' });
            shake = 0.32;
            game.audio.play('se_bad', 0.4);
            ok = false; finished = true; finish();
          } else if (obstacle.resolved && jumpT === 0 && obstacle.t < obstacle.dur) {
            obstacle = null; obstacleTimer = 1.4 + game.random(0, 0.8);
          }
        }
      }
      if (jumpT > 0) { jumpT += dt; if (jumpT > 0.4) { jumpT = 0; obstacle = null; obstacleTimer = 1.3 + game.random(0, 0.8); } }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (obstacle && !finished) drawObstacle(obstacle);
    drawRunner();

    txt(Math.round((dist / DIST_TARGET) * 100) + '%', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 56, C.gold);
  });

  function drawObstacle(o) {
    var p = o.t / o.dur;
    var x = RUNNER_X + 260 - p * 260;
    var warn = p > 0.4;
    var blink = warn && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.rect(x - 40, H * 0.66, 80, H * 0.18, C.gap);
    if (blink) game.draw.rect(x - 44, H * 0.60, 88, 14, C.warn);
  }

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

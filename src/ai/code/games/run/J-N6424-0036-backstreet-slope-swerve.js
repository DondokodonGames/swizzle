// J-N6424-0036-backstreet-slope-swerve.js
// バックストリート・スロープスワーブ — 商店街の坂道を自転車で下りながら、矢印の指示どおりに素早く払って障害物をかわす
// 操作: 障害物の手前に出る矢印の方向へ画面をスワイプして避ける
// 終わり: 規定数(6個)の障害物を避け切れば成功。2回外せば失敗
// @mechanic: swipe_direction
// @theme: backstreet_slope_bike_swerve
// 世界観: 商店街の坂道を自転車で駆け下りる配達員が、飛び出す障害物の指示矢印どおりに素早く払ってかわし続け、坂の下まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 紫〜ピンクのシンセ配色、細いネオンライン
  var C = {
    bg: '#1a0f3c', bg2: '#3c1058', road: '#241640', roadLine: '#ff3ca0',
    rider: '#3cf0ff', obstacle: '#ffb020', good: '#39ff9a', bad: '#ff4d5e',
    gold: '#ffd400', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'SLOPE SWERVE';
  var LANE_X = { left: W * 0.28, center: W * 0.5, right: W * 0.72 };
  var RIDER_Y = H * 0.72;
  var NEED_CLEARS = 6;
  var MAX_MISS = 2;
  var OBSTACLE_TIME = 1.4;
  var WARN_LEAD = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIDER = ['.##.', '####', '.##.'];
  var CRATE = ['####', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var scroll = (game.time.elapsed * 260) % 200;
    for (var i = -1; i < 12; i++) {
      game.draw.rect(LANE_X.center - 6, i * 200 - scroll, 12, 100, C.roadLine, 0.5);
    }
    game.draw.rect(0, H * 0.4, W, H * 0.6, C.road, 0.5);
  }

  var lane, cleared, misses, ob, obTimer, obState, requiredDir;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;
  // obState: 'none' | 'warn' | 'active'

  function initGame() {
    lane = 'center'; cleared = 0; misses = 0; ob = null; obState = 'none';
    obTimer = 0.9; requiredDir = null; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnObstacle() {
    var dirs = ['left', 'right', 'up'];
    requiredDir = dirs[Math.floor(Math.random() * dirs.length)];
    obState = 'warn';
    obTimer = WARN_LEAD;
  }

  function drawScene() {
    game.draw.sprite(RIDER, { '#': C.rider }, LANE_X[lane], RIDER_Y, 32, { anchor: 'center' });
    if (obState === 'warn') {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) {
        var arrow = requiredDir === 'left' ? '<<' : requiredDir === 'right' ? '>>' : '^^';
        txt(arrow, LANE_X.center, H * 0.38, 60, C.bad);
      }
    } else if (obState === 'active' && ob) {
      game.draw.sprite(CRATE, { '#': C.obstacle }, ob.x, ob.y, 26, { anchor: 'center' });
    }
  }

  function resolveSwipe(dir) {
    if (finished || ready > 0) return;
    if (obState !== 'active') {
      game.feedback.bad(LANE_X[lane], RIDER_Y, { text: 'MISS' });
      registerMiss();
      return;
    }
    if (dir === requiredDir) {
      cleared++;
      obState = 'none';
      game.feedback.good(LANE_X[lane], RIDER_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(LANE_X[lane], RIDER_Y, { color: C.good, count: 14, speed: 320 });
      game.audio.play('se_milestone', 0.3);
      if (!halfCalled && cleared === Math.ceil(NEED_CLEARS / 2)) { halfCalled = true; game.fx.popup('NICE', LANE_X.center, H * 0.3, { color: C.gold, size: 32 }); }
      if (cleared >= NEED_CLEARS) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(LANE_X.center, RIDER_Y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        obTimer = 1.0 + Math.random() * 0.6;
      }
    } else {
      game.feedback.bad(LANE_X[lane], RIDER_Y, { text: 'MISS' });
      registerMiss();
    }
  }

  function registerMiss() {
    misses++;
    game.audio.play('se_bad', 0.35);
    shake = 0.2;
    if (misses >= MAX_MISS) {
      finished = true; ok = false; hitStop = 0.4;
      game.audio.play('se_failure', 0.4);
      finish();
    } else {
      obState = 'none';
      obTimer = 1.0 + Math.random() * 0.5;
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    resolveSwipe(dir);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    obTimer -= dt;
    if (obState === 'none' && obTimer <= 0) {
      spawnObstacle();
    } else if (obState === 'warn' && obTimer <= 0) {
      obState = 'active';
      obTimer = OBSTACLE_TIME;
      ob = { x: LANE_X.center, y: H * 0.3 };
      game.audio.play('se_tap', 0.15);
    } else if (obState === 'active') {
      ob.y += (RIDER_Y - H * 0.3) / OBSTACLE_TIME * dt;
      if (obTimer <= 0) {
        // stuck-safety: obstacle reached rider without a swipe response
        registerMiss();
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false, dir: null };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepPlay(dt);
    if (obState === 'active' && demo.dir !== requiredDir) {
      demo.dir = requiredDir;
      var tx = requiredDir === 'left' ? W * 0.25 : requiredDir === 'right' ? W * 0.75 : W * 0.5;
      var ty = requiredDir === 'up' ? H * 0.6 : H * 0.85;
      demo.gx = tx; demo.gy = ty;
      demo.press = true;
      resolveSwipe(requiredDir);
    } else if (obState !== 'active') {
      demo.dir = null; demo.press = false; demo.gx = W * 0.5; demo.gy = H * 0.85;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (obState === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEED_CLEARS, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_CLEARS - cleared) + '個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, need: NEED_CLEARS });
        else game.end.failure({ cleared: cleared, need: NEED_CLEARS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(cleared + ' / ' + NEED_CLEARS, W / 2, H * 0.06, 30, C.white);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W * 0.5 - 30 + i * 60, H * 0.63, 12, i < misses ? C.bad : '#ffffff', i < misses ? 1 : 0.3);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

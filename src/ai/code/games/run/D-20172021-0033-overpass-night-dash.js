// D-20172021-0033-overpass-night-dash.js
// オーバーパス・ナイトダッシュ — 高架の点検路を自動で走り続け、対向する終電と落下物を左右スワイプでかわし続ける
// 操作: 迫る終電/落下物の手前で、空いているレーンへ左右にスワイプして避ける
// 終わり: 制限時間内かわし続ければ成功。いずれかに接触すれば失敗
// @mechanic: camera_run
// @theme: elevated_track_night_maintenance_dash
// 世界観: 深夜の高架保線員が、点検区間を自動で駆け抜けながら対向する終電や落下する資材をレーン移動でかわし切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 生き延びた秒数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめドット、太い輪郭、原色寄りの配色
  var C = {
    bg: '#1c2436', bg2: '#0e1424', track: '#2c3650', trackEdge: '#465074',
    runner: '#ffcf4d', runnerDark: '#a5820e', train: '#3c5cff', trainDark: '#1c2c9a',
    debris: '#ff8a3c', debrisDark: '#a3480e',
    good: '#3ce07a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#080c14',
  };

  var GAME_TITLE = 'NIGHT DASH';
  var TIME_LIMIT = 18;
  var LANE_X = [W * 0.25, W * 0.5, W * 0.75];
  var PLAYER_Y = H * 0.62;
  var SPAWN_Y = H * 0.16;
  var SPEED0 = (PLAYER_Y - SPAWN_Y) / 1.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var survived, done, endWait, finished;
  var ready, hitStop, shake;
  var lane, laneX, obstacles, spawnT, spawnInterval, halfCalled;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_SPRITE = ['.##.', '####', '.##.', '#.#.'];
  var TRAIN_SPRITE = ['####', '####', '#..#'];
  var DEBRIS_SPRITE = ['.#.', '###', '.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#3c5cff', pulse * 0.3);
    for (var l = 0; l < 3; l++) {
      game.draw.rect(LANE_X[l] - 110, H * 0.14, 220, H * 0.62, C.track, 0.6);
      game.draw.rect(LANE_X[l] - 110, H * 0.14, 220, 6, C.trackEdge);
    }
  }

  function initGame() {
    survived = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    lane = 1; laneX = LANE_X[1]; obstacles = []; spawnT = 0.6; spawnInterval = 1.3; halfCalled = false;
  }

  function spawnObstacle() {
    var l = Math.floor(Math.random() * 3);
    var type = Math.random() < 0.55 ? 'train' : 'debris';
    obstacles.push({ lane: l, y: SPAWN_Y, type: type, warned: false, dead: false });
  }

  function drawObstacle(o) {
    var near = o.y > PLAYER_Y - 160;
    var blink = near && Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (o.type === 'train') {
      game.draw.rect(LANE_X[o.lane] - 70, o.y - 60, 140, 120, blink ? C.bad : C.trainDark, 0.9);
      game.draw.sprite(TRAIN_SPRITE, { '#': blink ? C.white : C.train }, LANE_X[o.lane], o.y, 22, { anchor: 'center' });
    } else {
      game.draw.circle(LANE_X[o.lane], o.y, 44, blink ? C.bad : C.debrisDark, 0.85);
      game.draw.sprite(DEBRIS_SPRITE, { '#': blink ? C.white : C.debris }, LANE_X[o.lane], o.y, 20, { anchor: 'center' });
    }
  }

  function drawRunner() {
    var bob = Math.sin(game.time.elapsed * 9) * 5;
    game.draw.circle(laneX, PLAYER_Y + bob, 30, C.runnerDark, 0.5);
    game.draw.sprite(RUNNER_SPRITE, { '#': C.runner }, laneX, PLAYER_Y + bob - 6, 16, { anchor: 'center' });
  }

  function changeLane(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var nl = lane + (dir === 'left' ? -1 : 1);
    if (nl < 0 || nl > 2) { game.feedback.bad(laneX, PLAYER_Y, { text: 'MISS' }); game.audio.play('se_tap', 0.15); return; }
    lane = nl;
    game.feedback.good(laneX, PLAYER_Y, { text: 'GOOD', color: C.good });
    game.audio.play('se_tap', 0.2);
  }

  game.onSwipe(function(dir) {
    game.audio.play('se_tap', 0.03);
    if (dir === 'left' || dir === 'right') changeLane(dir);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) game.audio.play('se_tap', 0.04);
  });

  function crash(o) {
    ok = false; finished = true;
    hitStop = 0.35; shake = 0.35;
    game.feedback.bad(laneX, PLAYER_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LANE_X[1], gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { lane = 1; laneX = LANE_X[1]; obstacles = []; spawnT = 0.5; }
    spawnT -= dt;
    if (spawnT <= 0) { spawnObstacle(); spawnT = 1.3; }
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.y += SPEED0 * dt;
      if (!o.warned && o.y > PLAYER_Y - 220 && o.lane === lane) {
        o.warned = true;
        lane = lane === 0 ? 1 : (lane === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2));
        demo.gx = LANE_X[lane]; demo.press = true;
      }
      if (o.y > H * 0.9) obstacles.splice(i, 1);
    }
    laneX += (LANE_X[lane] - laneX) * Math.min(1, dt * 8);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (obstacles === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);
      drawRunner();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j = 0; j < obstacles.length; j++) drawObstacle(obstacles[j]);
      drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.floor(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, Math.ceil(TIME_LIMIT - survived)) + '秒!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(survived), { survived: Math.floor(survived) });
        else game.end.failure({ survived: Math.floor(survived) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      survived += dt;
      if (!halfCalled && survived >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.fx.popup('あと' + Math.ceil(TIME_LIMIT * 0.5) + '秒!', laneX, PLAYER_Y - 200, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      spawnInterval = Math.max(0.75, 1.3 - survived * 0.02);
      spawnT -= dt;
      if (spawnT <= 0) { spawnObstacle(); spawnT = spawnInterval; }
      for (var k = obstacles.length - 1; k >= 0; k--) {
        var ob = obstacles[k];
        ob.y += SPEED0 * dt;
        if (ob.y > PLAYER_Y - 20 && ob.y < PLAYER_Y + 20 && ob.lane === lane && !ob.dead) {
          ob.dead = true;
          crash(ob);
          break;
        }
        if (ob.y > H * 0.95) obstacles.splice(k, 1);
      }
      if (survived >= TIME_LIMIT) {
        ok = true; finished = true;
        game.feedback.good(laneX, PLAYER_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(laneX, PLAYER_Y, { color: C.gold, count: 20, speed: 380 });
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    laneX += (LANE_X[lane] - laneX) * Math.min(1, dt * 8);

    bg();
    for (var m = 0; m < obstacles.length; m++) drawObstacle(obstacles[m]);
    if (!finished || ok) drawRunner();

    txt(Math.floor(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, survived / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['G3', 0.2], ['B3', 0.2], ['E4', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

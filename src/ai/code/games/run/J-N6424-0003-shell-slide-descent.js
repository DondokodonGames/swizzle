// J-N6424-0003-shell-slide-descent.js
// 甲殻スライド・ディセント — 硬い殻に乗って坂を滑り降り、迫る岩や倒木を避けながら一気にゴールを目指す
// 操作: 殻は自動で滑り降りる。迫る岩や倒木を見て、指をホールドして左右のレーンへ移動しながら避ける
// 終わり: 規定距離を岩に当たらず滑り切れば成功。3回当たれば失敗
// @mechanic: camera_run
// @theme: shell_slide_descent
// 世界観: 渓谷の斜面レースに挑む見習い冒険者が、硬い殻に乗って坂を滑り降り、迫る岩や倒木を避けながらゴールを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 滑り切った距離
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で、等角に積む
  var C = {
    sky: '#8fd0ff', sky2: '#c8ecff', slope: '#7a5a3a', slopeDark: '#5a3e22', slopeTop: '#9a7a52',
    shell: '#3a9a5a', shellDark: '#1a5a30', shellTop: '#5ac07a',
    rock: '#8a8a8a', rockDark: '#5a5a5a', rockTop: '#aaaaaa',
    good: '#3ad06a', bad: '#ff4d5e', gold: '#ffd400', ink: '#1a2a1a', white: '#ffffff',
  };

  var GAME_TITLE = 'SHELL SLIDE';
  var LANES = 3;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var SHELL_Y = H * 0.7;
  var TARGET_DIST = 140;
  var RUN_TIME = 20;
  var MAX_HITS = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0a1a0a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIDER_SPR = ['.##.', '####', '.##.'];

  function voxelBlock(x, y, size, top, left, right) {
    game.draw.rect(x - size / 2, y - size / 2, size, size * 0.4, top);
    game.draw.rect(x - size / 2, y - size / 2 + size * 0.4, size / 2, size * 0.6, left);
    game.draw.rect(x, y - size / 2 + size * 0.4, size / 2, size * 0.6, right);
  }

  var lane, hits, dist, runClock, halfCalled, spawnTimer, hazards, scroll;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H * 0.4, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H * 0.4, '#ffffff', pulse * 0.3);
    for (var i = 0; i < LANES; i++) {
      var off = ((scroll * 0.6) % 200 + 200) % 200;
      for (var j = -1; j < 12; j++) {
        var y = H * 0.4 + j * 180 - off;
        voxelBlock(LANE_X[i], y, 150, C.slopeTop, C.slope, C.slopeDark);
      }
    }
  }

  function drawShell(laneIdx) {
    var bob = Math.sin(game.time.elapsed * 8) * 4;
    voxelBlock(LANE_X[laneIdx], SHELL_Y + bob, 90, C.shellTop, C.shell, C.shellDark);
    game.draw.sprite(RIDER_SPR, { '#': C.gold }, LANE_X[laneIdx], SHELL_Y + bob - 60, 12, { anchor: 'center' });
  }

  function drawHazards() {
    for (var i = 0; i < hazards.length; i++) {
      var hz = hazards[i];
      if (hz.warn > 0) {
        var alpha = 0.3 + 0.35 * Math.sin(game.time.elapsed * 20);
        game.draw.rect(LANE_X[hz.lane] - 80, H * 0.42, 160, 30, C.bad, alpha);
      } else {
        voxelBlock(LANE_X[hz.lane], hz.y, 70, C.rockTop, C.rock, C.rockDark);
      }
    }
  }

  function initGame() {
    lane = 1; hits = 0; dist = 0; runClock = 0; halfCalled = false; spawnTimer = 1.0; hazards = []; scroll = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function moveLane(dir) {
    if (finished || ready > 0) return;
    var nl = Math.max(0, Math.min(LANES - 1, lane + dir));
    if (nl === lane) { game.audio.play('se_tap', 0.05); return; }
    lane = nl;
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) moveLane(x < W / 2 ? -1 : 1);
  });
  game.onHold(function(x, y, duration) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.03); moveLane(x < W / 2 ? -1 : 1); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function spawnHazard() {
    hazards.push({ lane: Math.floor(Math.random() * LANES), y: H * 0.42, warn: 0.6, speed: 700 + Math.random() * 150 });
  }

  var demo = { t: 0, gx: LANE_X[1], gy: SHELL_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { lane = 1; hazards = []; hits = 0; spawnTimer = 0.5; scroll = 0; }
    scroll += 500 * dt;
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 0.9 + Math.random() * 0.4; }
    for (var i = hazards.length - 1; i >= 0; i--) {
      var hz = hazards[i];
      if (hz.warn > 0) {
        hz.warn -= dt;
        if (hz.warn <= 0 && hz.lane === lane) {
          lane = lane === 0 ? 1 : lane - 1;
          demo.gx = LANE_X[lane]; demo.press = true;
        }
      } else {
        hz.y += hz.speed * dt;
        if (hz.y > SHELL_Y + 40) hazards.splice(i, 1);
      }
    }
    demo.gy = SHELL_Y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hazards === undefined) initGame();
      stepDemo(dt);
      bg();
      drawHazards();
      drawShell(lane);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.floor(game.best) + 'm' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawShell(lane);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(Math.floor(dist) + 'm' + ' / ' + TARGET_DIST + 'm', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_DIST - Math.floor(dist)) + 'm!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(dist), { distance: Math.floor(dist), hits: hits });
        else game.end.failure({ distance: Math.floor(dist), hits: hits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      runClock += dt;
      dist += 60 * dt;
      scroll += 500 * dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 0.8 + Math.random() * 0.4; }
      for (var i = hazards.length - 1; i >= 0; i--) {
        var hz = hazards[i];
        if (hz.warn > 0) {
          hz.warn -= dt;
          if (hz.warn <= 0) hz.y = H * 0.42;
        } else {
          hz.y += hz.speed * dt;
          if (hz.y > SHELL_Y - 30 && hz.y < SHELL_Y + 40 && hz.lane === lane) {
            hazards.splice(i, 1);
            hits++;
            hitStop = 0.3; shake = 0.25;
            game.feedback.bad(LANE_X[lane], SHELL_Y, { text: 'MISS' });
            game.audio.play('se_bad', 0.4);
            if (hits >= MAX_HITS) { ok = false; finished = true; finish(); }
            break;
          } else if (hz.y > SHELL_Y + 40) {
            hazards.splice(i, 1);
          }
        }
      }
      if (!halfCalled && dist >= TARGET_DIST * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
      if (!finished && (dist >= TARGET_DIST || runClock >= RUN_TIME)) {
        if (dist >= TARGET_DIST) {
          ok = true; finished = true; hitStop = 0.25;
          game.feedback.good(LANE_X[lane], SHELL_Y, { text: 'CLEAR', color: C.good });
          game.fx.burst(LANE_X[lane], SHELL_Y, { color: C.gold, count: 20, speed: 400 });
          game.audio.play('se_success', 0.5);
        } else {
          ok = false; finished = true; hitStop = 0.3; shake = 0.2;
          game.feedback.bad(LANE_X[lane], SHELL_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
        }
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHazards();
    drawShell(lane);

    txt(Math.floor(dist) + 'm' + ' / ' + TARGET_DIST + 'm', W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = Math.min(1, dist / TARGET_DIST);
    game.draw.rect(60, 150, barW, 16, '#2a3a1a', 1);
    game.draw.rect(60, 150, barW * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.2], ['A4', 0.2], ['C5', 0.2], ['F5', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

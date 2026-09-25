// D-20092012-0072-tabletop-dash-hop.js
// テーブルトップ・ダッシュホップ — 卓上を駆けるぜんまい狐が、積み木をタップでジャンプして飛び越える
// 操作: 前方から迫る積み木が来る直前にタップしてジャンプし、飛び越える
// 終わり: 積み木を6個飛び越えれば成功(ゴール旗着)。1個でも積み木にぶつかれば失敗
// @mechanic: camera_run
// @theme: tabletop_windup_dash
// 世界観: 陽だまりの卓上を走るぜんまい仕掛けの狐。並んだ積み木を次々タップでジャンプして飛び越え、卓の端の小さな旗を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 飛び越えた積み木の数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景 + 単色の丸い塊、真下に柔らかい影
  var C = {
    bg: '#f4f2ec', shadowCol: '#00000022',
    fox: '#ff8a3d', foxDark: '#c9631f', block: '#5a8fd6', blockDark: '#3a63a0',
    flag: '#3dbb6a', good: '#3dbb6a', bad: '#ff4d5e', gold: '#ffb020', white: '#ffffff', ink: '#2a2016',
  };

  var GAME_TITLE = 'DASH HOP';
  var NEEDED = 6;
  var MAX_TIME = 24;
  var RUN_X = W * 0.26;
  var GROUND_Y = H * 0.64;
  var JUMP_DUR = 0.52, JUMP_H = 240;
  var SPAWN_MIN = 1.5, SPAWN_MAX = 2.1;
  var OB_SPEED0 = 620;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FOX_RUN_A = ['..##..', '.####.', '######', '.#..#.'];
  var FOX_RUN_B = ['..##..', '.####.', '######', '..##..'];
  var FOX_JUMP = ['..##..', '.####.', '######', '......'];

  var jumpT, obstacles, spawnTimer, passed, obSpeed, timeLeft, distanceX;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    jumpT = 0; obstacles = []; spawnTimer = 0.9; passed = 0; obSpeed = OB_SPEED0; timeLeft = MAX_TIME; distanceX = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function jump() {
    if (jumpT > 0 || finished || done || ready > 0) return;
    jumpT = JUMP_DUR;
    game.audio.play('se_jump', 0.3);
  }

  function foxY() {
    if (jumpT <= 0) return GROUND_Y;
    var p = 1 - jumpT / JUMP_DUR;
    return GROUND_Y - Math.sin(p * Math.PI) * JUMP_H;
  }

  function spawnObstacle() {
    obstacles.push({ x: W + 80, w: 74, h: 100, passed: false });
  }

  function stepGame(dt) {
    if (jumpT > 0) { jumpT -= dt; if (jumpT < 0) jumpT = 0; }
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = game.random(SPAWN_MIN, SPAWN_MAX); obSpeed += 12; }
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= obSpeed * dt;
      var overlapping = o.x < RUN_X + 46 && o.x + o.w > RUN_X - 46;
      var airborne = foxY() < GROUND_Y - o.h * 0.55;
      if (overlapping && !airborne && !o.hit) {
        o.hit = true;
        hitStop = 0.32; shake = 0.28;
        game.feedback.bad(RUN_X, GROUND_Y - 40, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
        return;
      }
      if (!o.passed && o.x + o.w < RUN_X - 46) {
        o.passed = true; passed++;
        game.feedback.good(RUN_X, GROUND_Y - 60, { text: '+1', color: C.good });
        game.audio.play('se_good', 0.25);
        if (passed === Math.ceil(NEEDED / 2)) { game.fx.popup(passed + ' / ' + NEEDED, W / 2, H * 0.20, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
        if (passed >= NEEDED) { ok = true; finished = true; finish(); return; }
      }
      if (o.x < -100) obstacles.splice(i, 1);
    }
    timeLeft -= dt;
    if (timeLeft <= 0) {
      ok = false; finished = true; hitStop = 0.2;
      game.feedback.bad(RUN_X, GROUND_Y, { text: 'TIME UP' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); jump(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, '#fbf9f4'], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#000000', 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.3));
    game.draw.rect(0, GROUND_Y + 60, W, H - (GROUND_Y + 60), '#00000008');
    distanceX += 0;
    for (var i = 0; i < 6; i++) {
      var lx = ((game.time.elapsed * 160 + i * 200) % (W + 200)) - 100;
      game.draw.circle(lx, GROUND_Y + 60, 10, '#00000010');
    }
  }

  function drawFlag() {
    game.draw.line(W * 0.95, GROUND_Y - 220, W * 0.95, GROUND_Y + 40, C.blockDark, 8);
    game.draw.rect(W * 0.95, GROUND_Y - 220, 60, 44, C.flag, 1);
  }

  function drawFox(y) {
    var jumping = jumpT > 0;
    var spr = jumping ? FOX_JUMP : (Math.floor(game.time.elapsed * 8) % 2 === 0 ? FOX_RUN_A : FOX_RUN_B);
    var shy = GROUND_Y + 70;
    var squish = jumping ? 1 : 1 + Math.sin(game.time.elapsed * 16) * 0.02;
    game.draw.circle(RUN_X, shy, 44 * (1.2 - (shy - y) / JUMP_H * 0.4), C.shadowCol);
    game.draw.sprite(spr, { '#': C.foxDark }, RUN_X, y - 40, 20 * squish, { anchor: 'center' });
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var telegraphed = o.x < W - 40;
      game.draw.circle(o.x + o.w / 2, GROUND_Y + 60, 40, C.shadowCol);
      game.draw.rect(o.x, GROUND_Y - o.h + 40, o.w, o.h, C.block, telegraphed ? 1 : 0.5);
      game.draw.rect(o.x, GROUND_Y - o.h + 40, o.w, 10, C.blockDark, 0.8);
    }
  }

  var demo = { t: 0, gx: RUN_X, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { obstacles = [{ x: W * 0.62, w: 74, h: 100, passed: false }]; jumpT = 0; passed = 0; obSpeed = OB_SPEED0; }
    demo.gx = RUN_X; demo.gy = foxY() - 40;
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= obSpeed * dt;
      if (!o.jumped && o.x < RUN_X + 220 && jumpT <= 0) { o.jumped = true; jump(); demo.press = true; }
      if (o.x < -100) obstacles.splice(i, 1);
    }
    if (jumpT > 0) jumpT = Math.max(0, jumpT - dt);
    if (jumpT <= 0) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (obstacles === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFlag();
      drawObstacles();
      drawFox(foxY());
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + NEEDED : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFlag();
      drawObstacles();
      drawFox(GROUND_Y);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(passed + ' / ' + NEEDED, W / 2, H * 0.12, 28, C.ink);
      if (!ok && passed >= NEEDED - 1) txt('あと1個!', W / 2, H * 0.16, 24, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed * 100, { passed: passed }); else game.end.failure({ passed: passed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFlag();
    drawObstacles();
    drawFox(foxY());

    txt(passed + ' / ' + NEEDED, W / 2, 100, 32, C.ink);
    if (!finished) {
      var frac = Math.max(0, timeLeft / MAX_TIME);
      game.draw.rect(60, 150, W - 120, 14, '#00000030');
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.15], ['G4', 0.15], ['B4', 0.15], ['D5', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

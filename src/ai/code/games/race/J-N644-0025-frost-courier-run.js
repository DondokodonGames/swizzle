// J-N644-0025-frost-courier-run.js
// フロスト・クーリエ・ラン — そりに乗った配達人が凍った山道を滑り降り、岩や氷柱を避けて麓を目指す
// 操作: 画面を左右にホールドしてそりを動かし、迫る岩や氷柱を避け続ける
// 終わり: 制限時間まで3回衝突せず滑り切れば成功。衝突3回でGAME OVER
// @mechanic: dodge
// @theme: frozen_slope_courier
// 世界観: 山小屋の郵便配達人が、そりに飛び乗って凍った山道を滑走し、迫る岩や氷柱を避けながら麓の集配所まで一気に駆け下りる
// 残るもの: 正誤(CLEAR/GAME OVER) + 滑走距離
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの多色、太めの輪郭線、雪原の帯グラデ
  var C = {
    sky: '#bfe6ff', sky2: '#eaf6ff', slope: '#f4fbff', slopeEdge: '#c9e6ff',
    sled: '#ff5c6a', sledDark: '#a5222f', rock: '#7a6a5a', rockDark: '#4a3f34',
    icicle: '#8fd8ff', icicleDark: '#3f9fc9',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffcf3a', white: '#ffffff', ink: '#20304a',
  };

  var GAME_TITLE = 'FROST COURIER';
  var COURSE_LEN = 1900;
  var TIME_LIMIT = 18;
  var SCROLL_SPEED = 300;
  var MAX_LIVES = 3;
  var LANES = [W * 0.30, W * 0.5, W * 0.70];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SLED_SPRITE = ['.##.', '####', '.##.', '####'];
  var ROCK_SPRITE = ['.##.', '####', '####'];
  var ICICLE_SPRITE = ['###', '.#.', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [0.4, C.sky2], [1, C.slope]]);
    var t = game.time.elapsed;
    for (var i = 0; i < 8; i++) {
      var yy = ((t * SCROLL_SPEED * 0.6 + i * 260) % (H + 200)) - 100;
      game.draw.rect(W * 0.08, yy, 16, 60, C.slopeEdge, 0.6);
      game.draw.rect(W * 0.90, yy, 16, 60, C.slopeEdge, 0.6);
    }
  }

  var laneIdx, laneX, obstacles, lives, dist, spawnClock, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    laneIdx = 1; laneX = LANES[1]; obstacles = []; lives = MAX_LIVES; dist = 0;
    spawnClock = 0.7; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function spawnObstacle() {
    var lane = Math.floor(game.random(0, 3));
    var kind = Math.random() < 0.5 ? 'rock' : 'icicle';
    obstacles.push({ lane: lane, y: -80, kind: kind, warned: false, dead: false });
  }

  function drawScene() {
    bg();
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.dead) continue;
      var x = LANES[o.lane];
      var warn = o.y < H * 0.30 && !o.passedWarn;
      if (warn) {
        var flashOn = Math.floor(game.time.elapsed * 9) % 2 === 0;
        game.draw.circle(x, H * 0.24, 26, C.bad, flashOn ? 0.6 : 0.2);
      }
      var sprite = o.kind === 'rock' ? ROCK_SPRITE : ICICLE_SPRITE;
      var col = o.kind === 'rock' ? C.rock : C.icicle;
      game.draw.sprite(sprite, { '#': col }, x, o.y, 26, { anchor: 'center' });
    }
    var tilt = Math.sin(game.time.elapsed * 10) * 3;
    game.draw.sprite(SLED_SPRITE, { '#': C.sled }, laneX, H * 0.80, 30, { anchor: 'center', flipX: tilt > 0 });
  }

  function crash(o) {
    lives--;
    hitStop = 0.35; shake = 0.3;
    game.feedback.bad(LANES[o.lane], H * 0.80, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    o.dead = true;
    if (lives <= 0) { finished = true; ok = false; finish(); }
  }

  function moveTo(x) {
    if (x < W * 0.42) laneIdx = 0;
    else if (x > W * 0.58) laneIdx = 2;
    else laneIdx = 1;
    laneX = LANES[laneIdx];
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) { moveTo(x); game.audio.play('se_tap', 0.04); }
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) moveTo(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    dist += SCROLL_SPEED * dt;
    spawnClock -= dt;
    if (spawnClock <= 0) {
      spawnObstacle();
      spawnClock = Math.max(0.45, 0.85 - dist / COURSE_LEN * 0.35);
    }
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      if (o.dead) { obstacles.splice(i, 1); continue; }
      o.y += SCROLL_SPEED * dt;
      if (!o.warned && o.y > H * 0.30) o.warned = true;
      if (o.y > H * 0.72 && o.y < H * 0.88 && o.lane === laneIdx) {
        crash(o);
        if (finished) return;
      }
      if (o.y > H + 60) o.dead = true;
    }
    if (!halfCalled && dist >= COURSE_LEN * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', laneX, H * 0.5, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (dist >= COURSE_LEN) {
      finished = true; ok = true;
      game.feedback.good(laneX, H * 0.80, { text: 'CLEAR', color: C.good });
      game.fx.burst(laneX, H * 0.80, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    } else if (dist / SCROLL_SPEED >= TIME_LIMIT) {
      var o2 = { lane: laneIdx };
      crash(o2);
      if (!finished) { finished = true; ok = false; finish(); }
    }
  }

  var demo = { t: 0, gx: LANES[1], gy: H * 0.80, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (obstacles.length === 0 && cyc < 2.6) spawnObstacle();
    dist += SCROLL_SPEED * dt * 0.6;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.dead) continue;
      o.y += SCROLL_SPEED * dt * 0.7;
      if (o.y > H * 0.55 && !o.dodged) {
        o.dodged = true;
        laneIdx = (o.lane + 1) % 3;
        laneX = LANES[laneIdx];
        game.feedback.good(laneX, H * 0.80, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.25);
      }
      if (o.y > H + 60) o.dead = true;
    }
    demo.gx = laneX; demo.gy = H * 0.80; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(Math.min(COURSE_LEN, Math.round(dist / 10)) + ' / ' + (COURSE_LEN / 10), W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round((COURSE_LEN - dist) / 100)) + 'm!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(dist), { dist: Math.round(dist) });
        else game.end.failure({ dist: Math.round(dist) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    drawScene();
    for (var l = 0; l < MAX_LIVES; l++) {
      game.draw.circle(W * 0.5 - 60 + l * 60, H * 0.055, 16, l < lives ? C.good : '#c9e6ff');
    }
    var pct = Math.min(1, dist / COURSE_LEN);
    txt(Math.round(dist / 10) + ' / ' + (COURSE_LEN / 10), W * 0.5, H * 0.10, 26, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#c9e6ff', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.3], ['A5', 0.6]], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

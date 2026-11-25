// J-N644-0028-mineline-handcart-push.js
// マインライン・ハンドカート・プッシュ — 鉱山鉄道のトロッコを左右のハンドルを交互に押して加速し、木箱を弾き飛ばして終点を目指す
// 操作: 画面左右のハンドルを交互にタップして速度を上げ、速度を保って線路上の木箱を弾き飛ばす
// 終わり: 速度不足のまま木箱に突入せず終点まで走り切れば成功。突入すると失敗
// @mechanic: alternate_tap
// @theme: mine_rail_handcart
// 世界観: 鉱山鉄道の保線係見習いが、手押しのトロッコを左右のハンドルを交互に押し込んで加速させ、線路に積もった木箱を弾き飛ばしながら終点の詰所まで走り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破距離
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体的な太い矩形の積み重ね、上面明るく側面暗い疑似3D
  var C = {
    sky: '#3a2a1a', sky2: '#5c4128', rail: '#2a1e14', railTop: '#4a3520',
    cart: '#c9822a', cartDark: '#7a4d18', crate: '#8a6a3a', crateDark: '#4a3418',
    handleL: '#3ad6ff', handleR: '#ff5c6a',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#efe4d0',
  };

  var GAME_TITLE = 'HANDCART PUSH';
  var COURSE_LEN = 1800;
  var TIME_LIMIT = 13;
  var SPEED_DECAY = 60;
  var TAP_BOOST = 95;
  var CRATE_MIN_SPEED = 210;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CART_SPRITE = ['####', '####', '.##.'];
  var CRATE_SPRITE = ['####', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.sky2]]);
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.62, W, H * 0.30, C.railTop);
    for (var i = 0; i < 10; i++) {
      var yy = ((t * (100 + speed) + i * 120) % (H * 0.4)) + H * 0.62;
      game.draw.rect(W * 0.1, yy, W * 0.8, 8, C.rail, 0.5);
    }
  }

  var dist, speed, lastSide, crates, spawnClock, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    dist = 0; speed = 40; lastSide = -1; crates = []; spawnClock = 1.1; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnCrate() {
    crates.push({ d: dist + 700, dead: false, warned: false });
  }

  function drawScene() {
    bg();
    for (var i = 0; i < crates.length; i++) {
      var c = crates[i];
      if (c.dead) continue;
      var rel = c.d - dist;
      if (rel > 900 || rel < -60) continue;
      var y = H * 0.78 - (rel / 900) * (H * 0.36);
      var warn = rel < 260 && rel > 0;
      var flashOn = warn && Math.floor(game.time.elapsed * 9) % 2 === 0;
      game.draw.sprite(CRATE_SPRITE, { '#': flashOn ? C.bad : C.crate }, W * 0.5, y, 26, { anchor: 'center' });
    }
    var bounce = Math.sin(game.time.elapsed * 16) * 4;
    game.draw.sprite(CART_SPRITE, { '#': C.cart }, W * 0.5, H * 0.80 + bounce, 30, { anchor: 'center' });
    game.draw.circle(W * 0.22, H * 0.82, 62, C.handleL, lastSide === 0 ? 0.9 : 0.4);
    game.draw.circle(W * 0.78, H * 0.82, 62, C.handleR, lastSide === 1 ? 0.9 : 0.4);
  }

  function pushHandle(side) {
    if (side !== lastSide) {
      speed = Math.min(420, speed + TAP_BOOST);
      lastSide = side;
      game.feedback.good(side === 0 ? W * 0.22 : W * 0.78, H * 0.82, { text: 'GOOD', color: C.good, count: 4 });
      game.audio.play('se_tap', 0.25);
    } else {
      speed = Math.max(0, speed - 30);
      game.feedback.bad(side === 0 ? W * 0.22 : W * 0.78, H * 0.82, { text: 'MISS' });
      game.audio.play('se_bad', 0.15);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      pushHandle(x < W * 0.5 ? 0 : 1);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    roundClock += dt;
    speed = Math.max(0, speed - SPEED_DECAY * dt);
    dist += speed * dt;
    spawnClock -= dt;
    if (spawnClock <= 0) { spawnCrate(); spawnClock = 1.3; }
    for (var i = crates.length - 1; i >= 0; i--) {
      var c = crates[i];
      if (c.dead) { crates.splice(i, 1); continue; }
      var rel = c.d - dist;
      if (rel < 40 && rel > -40) {
        c.dead = true;
        if (speed >= CRATE_MIN_SPEED) {
          game.feedback.good(W * 0.5, H * 0.78, { text: 'GOOD', color: C.good });
          game.fx.burst(W * 0.5, H * 0.78, { color: C.gold, count: 12, speed: 300 });
          game.audio.play('se_break', 0.35);
        } else {
          finished = true; ok = false; hitStop = 0.35; shake = 0.3;
          game.feedback.bad(W * 0.5, H * 0.78, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
          return;
        }
      }
    }
    if (!halfCalled && dist >= COURSE_LEN * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (dist >= COURSE_LEN) {
      finished = true; ok = true;
      game.feedback.good(W * 0.5, H * 0.78, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5, H * 0.78, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    } else if (roundClock >= TIME_LIMIT) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(W * 0.5, H * 0.78, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.22, gy: H * 0.82, press: false };
  function resetDemo() { initGame(); demo.side = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.tapClock = (demo.tapClock || 0) + dt;
    if (demo.tapClock > 0.24 && cyc < 2.6) {
      demo.tapClock = 0;
      demo.side = demo.side === 0 ? 1 : 0;
      demo.gx = demo.side === 0 ? W * 0.22 : W * 0.78;
      demo.gy = H * 0.82;
      demo.press = true;
      pushHandle(demo.side);
      stepRound(0.001);
    } else {
      demo.press = false;
      dist += speed * dt; speed = Math.max(0, speed - SPEED_DECAY * dt);
      for (var i = crates.length - 1; i >= 0; i--) { if (crates[i].d - dist < -60) crates.splice(i, 1); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
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
    var pct = Math.min(1, dist / COURSE_LEN);
    txt(Math.round(dist / 10) + ' / ' + (COURSE_LEN / 10), W * 0.5, H * 0.06, 28, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#4a3520', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    game.draw.rect(60, 190, W - 120, 12, '#4a3520', 1);
    game.draw.rect(60, 190, (W - 120) * (speed / 420), 12, speed >= CRATE_MIN_SPEED ? C.good : C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 165, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

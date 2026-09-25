// J-N6424-0033-orbit-pod-weave.js
// オービットポッド・ウィーブ — 無重力訓練場で球体保護ポッドに乗り、四方から迫る訓練カプセルをかわし続ける
// 操作: 画面を押したまま指を動かし、球体ポッドを訓練カプセルの軌道から外れる位置までスライドさせる
// 終わり: 規定時間、衝突せず浮遊し続ければ成功。カプセルに当たれば失敗
// @mechanic: dodge
// @theme: zero_g_pod_weave_drill
// 世界観: 宇宙飛行候補生が球体の保護ポッドに乗り、無重力訓練場の四方から迫る訓練カプセルをホールド移動でかわし続け、規定時間浮遊し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 暗い宇宙背景、ブロック状の面を横ストリップで表現
  var C = {
    bg: '#0a1030', bg2: '#141c50', pod: '#7ad0ff', podDark: '#2c7ab0',
    capsule: '#ff8a3c', capsuleDark: '#b0501a', good: '#39d67a', bad: '#ff4d5e',
    gold: '#ffd400', ink: '#ffffff', white: '#ffffff', star: '#3a4a90',
  };

  var GAME_TITLE = 'POD WEAVE';
  var ARENA_X = W * 0.5, ARENA_Y = H * 0.46, ARENA_R = 380;
  var POD_R = 46, CAP_R = 34;
  var NEED_DODGES = 7;
  var TIME_LIMIT = 24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PILOT = ['.##.', '####', '.##.'];

  var stars = [];
  for (var si = 0; si < 26; si++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 3 });

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < stars.length; i++) {
      var tw = 0.4 + 0.4 * Math.sin(game.time.elapsed * 2 + i);
      game.draw.circle(stars[i].x, stars[i].y, stars[i].r, C.star, tw);
    }
    game.draw.circle(ARENA_X, ARENA_Y, ARENA_R, '#ffffff', 0.06);
  }

  var podX, podY, caps, dodged, spawnTimer, elapsed;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    podX = ARENA_X; podY = ARENA_Y; caps = []; dodged = 0; elapsed = 0;
    spawnTimer = 1.1; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnCapsule() {
    var ang = Math.random() * Math.PI * 2;
    var sx = ARENA_X + Math.cos(ang) * (ARENA_R + 80);
    var sy = ARENA_Y + Math.sin(ang) * (ARENA_R + 80);
    var targetAng = Math.random() < 0.5 ? ang + Math.PI + (Math.random() - 0.5) * 0.6 : ang + Math.PI;
    var vx = Math.cos(targetAng), vy = Math.sin(targetAng);
    caps.push({ x: sx, y: sy, vx: vx, vy: vy, speed: 300 + Math.random() * 120, warn: 0.7, counted: false });
  }

  function drawScene() {
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i];
      if (c.warn > 0) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(c.x, c.y, CAP_R + 14, C.bad, 0.4);
      }
      game.draw.circle(c.x, c.y, CAP_R, C.capsuleDark);
      game.draw.circle(c.x, c.y, CAP_R * 0.7, C.capsule);
    }
    game.draw.circle(podX, podY, POD_R + 8, C.podDark);
    game.draw.circle(podX, podY, POD_R, C.pod, 0.85);
    game.draw.sprite(PILOT, { '#': '#ffffff' }, podX, podY, 16, { anchor: 'center' });
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var dx = x - ARENA_X, dy = y - ARENA_Y;
    var d = Math.hypot(dx, dy);
    if (d > ARENA_R - POD_R) { var s = (ARENA_R - POD_R) / d; dx *= s; dy *= s; }
    podX = ARENA_X + dx; podY = ARENA_Y + dy;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function hitCapsule(c) {
    finished = true; ok = false; hitStop = 0.45; shake = 0.3;
    game.feedback.bad(podX, podY, { text: 'MISS' });
    game.audio.play('se_bad', 0.5);
    finish();
  }

  function stepPlay(dt) {
    elapsed += dt;
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnCapsule(); spawnTimer = 1.5 + Math.random() * 0.6; }
    for (var i = caps.length - 1; i >= 0; i--) {
      var c = caps[i];
      if (c.warn > 0) c.warn -= dt;
      c.x += c.vx * c.speed * dt;
      c.y += c.vy * c.speed * dt;
      var dOut = Math.hypot(c.x - ARENA_X, c.y - ARENA_Y);
      if (game.hit.circle(c.x, c.y, CAP_R, podX, podY, POD_R)) {
        hitCapsule(c);
        return;
      }
      if (dOut > ARENA_R + 160) {
        if (!c.counted) {
          dodged++;
          game.audio.play('se_milestone', 0.25);
          if (!halfCalled && dodged === Math.ceil(NEED_DODGES / 2)) { halfCalled = true; game.fx.popup('NICE', ARENA_X, ARENA_Y - ARENA_R - 40, { color: C.gold, size: 32 }); }
        }
        caps.splice(i, 1);
        if (dodged >= NEED_DODGES) {
          finished = true; ok = true; hitStop = 0.3;
          game.feedback.good(podX, podY, { text: 'CLEAR', color: C.good });
          game.fx.burst(podX, podY, { color: C.gold, count: 20, speed: 380 });
          game.audio.play('se_success', 0.5);
          finish();
          return;
        }
      }
    }
    if (elapsed >= TIME_LIMIT && !finished && dodged < NEED_DODGES) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(podX, podY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: ARENA_X, gy: ARENA_Y, press: true };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepPlay(dt);
    var nearest = null, nd = 1e9;
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i];
      var d = Math.hypot(c.x - podX, c.y - podY);
      if (d < nd) { nd = d; nearest = c; }
    }
    if (nearest && nd < 340) {
      var awayX = podX - (nearest.x - podX) * 0.6;
      var awayY = podY - (nearest.y - podY) * 0.6;
      var dx = awayX - ARENA_X, dy = awayY - ARENA_Y;
      var d2 = Math.hypot(dx, dy);
      if (d2 > ARENA_R - POD_R) { var s = (ARENA_R - POD_R) / d2; dx *= s; dy *= s; }
      demo.gx = ARENA_X + dx; demo.gy = ARENA_Y + dy;
      podX += (demo.gx - podX) * 0.2; podY += (demo.gy - podY) * 0.2;
    } else {
      demo.gx = ARENA_X + Math.sin(cyc * 1.4) * 120;
      demo.gy = ARENA_Y + Math.cos(cyc * 1.1) * 90;
      podX += (demo.gx - podX) * 0.1; podY += (demo.gy - podY) * 0.1;
    }
    demo.press = true;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (caps === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(dodged + ' / ' + NEED_DODGES, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_DODGES - dodged) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, need: NEED_DODGES });
        else game.end.failure({ dodged: dodged, need: NEED_DODGES });
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

    txt(dodged + ' / ' + NEED_DODGES, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.3], ['G3', 0.3], ['B3', 0.3], ['E4', 0.6]], { tempo: 116, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

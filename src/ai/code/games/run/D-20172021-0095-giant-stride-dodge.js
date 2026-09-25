// D-20172021-0095-giant-stride-dodge.js
// ジャイアント・ストライド・ドッジ — 巨大化した主役が市街地を突き進み、迫る看板や電線を指ホールドで左右によけ続ける
// 操作: 画面を押さえたまま指を左右に動かし、迫ってくる看板や電線の間をすり抜けるように主役を動かす
// 終わり: 制限時間内、障害物に一度も触れず進み続ければ成功。1回でも接触する/時間切れ前に離脱すれば失敗
// @mechanic: dodge
// @theme: giant_growth_city_dodge
// 世界観: 実験の影響で巨大化してしまった研究員見習いが、慌てて市街地を突き進みながら、迫る看板や電線に触れないよう身をかわし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 生き延びた時間
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 濃淡グラデの立体感、柔らかい影、ハイライトで面のボリュームを出す
  var C = {
    bg: '#8fd6ff', bg2: '#4fa0d8', bldg: '#e8ecef', bldgDark: '#b8c0c8',
    giant: '#ffb15c', giantDark: '#d68a2e', wire: '#3a3a3a',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffce4a', ink: '#0a2030', white: '#ffffff',
  };

  var GAME_TITLE = 'GIANT DODGE';
  var TIME_LIMIT = 18;
  var GIANT_Y = H * 0.66;
  var GIANT_R = 56;
  var LANE_MARGIN = 120;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GIANT_SPRITE = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
    for (var i = 0; i < 4; i++) {
      var bx = (i / 4) * W + (i - 1.5) * 20;
      game.draw.rect(bx, H * 0.7, W / 4 - 30, H * 0.3, C.bldgDark, 0.25);
    }
  }

  var giantX, targetX, obstacles, spawnClock, nextSpawn, roundClock, done, endWait, finished, ready, hitStop, shake, halfCalled, pressing;

  function initGame() {
    giantX = W * 0.5; targetX = giantX;
    obstacles = []; spawnClock = 0; nextSpawn = 0.5;
    roundClock = 0; halfCalled = false; pressing = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnObstacle() {
    var kind = Math.random() < 0.5 ? 'sign' : 'wire';
    var w = kind === 'sign' ? (150 + game.random(0, 90)) : (90 + game.random(0, 40));
    var x = LANE_MARGIN + game.random(0, W - LANE_MARGIN * 2 - w) + w / 2;
    obstacles.push({ x: x, y: -80, w: w, h: kind === 'sign' ? 70 : 34, kind: kind });
  }

  function drawGiant(x) {
    var bob = Math.sin(game.time.elapsed * 5) * 6;
    game.draw.circle(x, GIANT_Y + 46, GIANT_R * 0.8, C.giantDark, 0.35);
    game.draw.circle(x, GIANT_Y, GIANT_R, C.giant, 1);
    game.draw.sprite(GIANT_SPRITE, { '#': C.white }, x, GIANT_Y + bob, 24, { anchor: 'center' });
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var col = o.kind === 'sign' ? C.bldg : C.wire;
      if (o.y < GIANT_Y - 260 && o.y > GIANT_Y - 340) {
        var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
        if (blink) game.draw.rect(o.x - o.w / 2 - 6, o.y - o.h / 2 - 6, o.w + 12, 8, C.bad, 0.8);
      }
      game.draw.rect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, col, 0.95);
      game.draw.rect(o.x - o.w / 2, o.y - o.h / 2, o.w, 6, C.bldgDark, 0.5);
    }
  }

  function failHit(x, y) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressing = true; targetX = x;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !pressing) return;
    targetX = x;
  });
  game.onRelease(function() { pressing = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickPlay(dt) {
    giantX += (targetX - giantX) * Math.min(1, dt * 8);
    giantX = Math.max(LANE_MARGIN, Math.min(W - LANE_MARGIN, giantX));
    var speed = 620 + roundClock * 14;
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.y += speed * dt;
      if (!o.hit && Math.abs(o.y - GIANT_Y) < o.h / 2 + GIANT_R * 0.7 && Math.abs(o.x - giantX) < o.w / 2 + GIANT_R * 0.7) {
        o.hit = true;
        failHit(giantX, GIANT_Y);
      }
      if (o.y > H + 100) obstacles.splice(i, 1);
    }
    spawnClock += dt;
    if (spawnClock >= nextSpawn) { spawnClock = 0; nextSpawn = Math.max(0.55, 0.95 - roundClock * 0.02); spawnObstacle(); }
    roundClock += dt;
    if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('HALFWAY!', giantX, GIANT_Y - 140, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    if (!finished && roundClock >= TIME_LIMIT) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(giantX, GIANT_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(giantX, GIANT_Y, { color: C.gold, count: 22, speed: 400 });
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: GIANT_Y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) initGame();
    var nearest = null, nearestY = -1e9;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.y > nearestY && o.y < GIANT_Y + 40) { nearestY = o.y; nearest = o; }
    }
    if (nearest && nearest.y > GIANT_Y - 420) {
      targetX = nearest.x < W * 0.5 ? W * 0.5 + LANE_MARGIN * 0.9 : W * 0.5 - LANE_MARGIN * 0.9;
    } else {
      targetX = W * 0.5;
    }
    pressing = true;
    tickPlay(dt);
    demo.gx = giantX; demo.gy = GIANT_Y - 70; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (obstacles === undefined) initGame();
      bg();
      stepDemo(dt);
      drawObstacles();
      drawGiant(giantX);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + 's' : '-'), W / 2, H * 0.13, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawObstacles();
      drawGiant(giantX);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(Math.round(Math.min(roundClock, TIME_LIMIT)) + 's / ' + TIME_LIMIT + 's', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var secs = Math.round(Math.min(roundClock, TIME_LIMIT));
        if (ok) game.end.success(secs, { survived: secs, total: TIME_LIMIT });
        else game.end.failure({ survived: secs, total: TIME_LIMIT });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawObstacles();
    drawGiant(giantX);

    txt(Math.round(Math.min(roundClock, TIME_LIMIT)) + 's / ' + TIME_LIMIT + 's', W / 2, H * 0.06, 28, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, roundClock / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.22], ['F4', 0.22], ['A4', 0.22], ['D5', 0.44]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

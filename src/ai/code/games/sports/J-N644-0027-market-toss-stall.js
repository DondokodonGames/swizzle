// J-N644-0027-market-toss-stall.js
// マーケット・トス・スタンド — 縁日の的当て屋台で小袋を弧を描くように放り、制限時間内にかごへ投げ入れる
// 操作: 小袋の上を指で払い、放したい方向と速さでフリックして弧を描いて投げる
// 終わり: 制限時間内に規定個数をかごに入れれば成功。届かなければGAME OVER
// @mechanic: flick_launch
// @theme: market_stall_toss
// 世界観: 縁日の的当て屋台に立つ見習い店番が、次々渡される小袋を弧を描くように放り、動くかごへ制限時間内にできるだけ多く投げ入れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 投げ入れた個数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めのポップな原色、太い白縁、光沢ハイライト
  var C = {
    bg: '#ffdf6b', bg2: '#ffb03a', stall: '#ff6a4d', stallDark: '#c23d24',
    basket: '#8a5a2a', basketDark: '#5c3a18', pouch: '#3ad6ff', pouchDark: '#127a99',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#3a2510',
  };

  var GAME_TITLE = 'MARKET TOSS';
  var TIME_LIMIT = 15;
  var TARGET = 7;
  var THROW_Y = H * 0.78;
  var BASKET_Y = H * 0.30;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STALL_SPRITE = ['.##.', '####', '.##.', '.##.'];
  var POUCH_SPRITE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.sprite(STALL_SPRITE, { '#': C.stall }, W * 0.16, H * 0.82, 20, { anchor: 'center' });
  }

  var basketX, basketDir, hits, misses, roundClock, halfCalled;
  var pouch, throwing, trail, dragPts;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    basketX = W * 0.5; basketDir = 1; hits = 0; misses = 0; roundClock = 0; halfCalled = false;
    pouch = { x: W * 0.5, y: THROW_Y, vx: 0, vy: 0 }; throwing = false; trail = []; dragPts = [];
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    var warnLow = basketX < W * 0.15 || basketX > W * 0.85;
    game.draw.rect(basketX - 90, BASKET_Y - 30, 180, 60, C.basketDark);
    game.draw.rect(basketX - 78, BASKET_Y - 20, 156, 40, C.basket);
    for (var i = 0; i < trail.length; i++) {
      game.draw.circle(trail[i].x, trail[i].y, 8, C.pouch, 0.25);
    }
    game.draw.sprite(POUCH_SPRITE, { '#': throwing ? C.pouch : C.pouchDark }, pouch.x, pouch.y, 20, { anchor: 'center' });
  }

  function launchPouch(dx, dy) {
    if (throwing || finished) return;
    var speed = Math.min(1900, Math.hypot(dx, dy) * 2.4);
    var ang = Math.atan2(dy, dx);
    pouch.vx = Math.cos(ang) * speed;
    pouch.vy = Math.sin(ang) * speed;
    throwing = true;
    trail = [];
    game.audio.play('se_jump', 0.3);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || throwing) return;
    dragPts = [{ x: x, y: y, t: game.time.elapsed }];
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || throwing || !dragPts.length) return;
    dragPts.push({ x: x, y: y, t: game.time.elapsed });
    if (dragPts.length > 6) dragPts.shift();
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || throwing || dragPts.length < 2) { dragPts = []; return; }
    var a = dragPts[0], b = dragPts[dragPts.length - 1];
    var dtm = Math.max(0.03, b.t - a.t);
    var dx = (b.x - a.x) / dtm * 0.12;
    var dy = (b.y - a.y) / dtm * 0.12;
    dragPts = [];
    if (Math.hypot(dx, dy) < 60) { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_bad', 0.2); return; }
    launchPouch(dx, dy - 300);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var GRAV = 2100;
  function stepRound(dt) {
    roundClock += dt;
    if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    basketX += basketDir * 160 * dt;
    if (basketX < W * 0.22 || basketX > W * 0.78) basketDir *= -1;

    if (throwing) {
      pouch.vy += GRAV * dt;
      pouch.x += pouch.vx * dt;
      pouch.y += pouch.vy * dt;
      trail.push({ x: pouch.x, y: pouch.y });
      if (trail.length > 8) trail.shift();
      if (pouch.vy > 0 && Math.abs(pouch.y - BASKET_Y) < 40 && Math.abs(pouch.x - basketX) < 90) {
        hits++;
        game.feedback.good(pouch.x, pouch.y, { text: 'GOOD', color: C.good });
        game.fx.burst(basketX, BASKET_Y, { color: C.gold, count: 14, speed: 300 });
        game.audio.play('se_coin', 0.35);
        resetPouch();
        if (hits >= TARGET) {
          finished = true; ok = true;
          game.feedback.good(basketX, BASKET_Y, { text: 'CLEAR', color: C.good });
          game.audio.play('se_success', 0.5);
          finish();
        }
      } else if (pouch.y > H + 40 || pouch.x < -40 || pouch.x > W + 40) {
        misses++;
        game.feedback.bad(pouch.x, Math.min(H - 40, pouch.y), { text: 'MISS' });
        game.audio.play('se_bad', 0.25);
        resetPouch();
      }
    }
    if (roundClock >= TIME_LIMIT && !finished) {
      finished = true; ok = false;
      hitStop = 0.3; shake = 0.2;
      game.feedback.bad(W * 0.5, THROW_Y, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  function resetPouch() {
    throwing = false; trail = [];
    pouch.x = W * 0.5; pouch.y = THROW_Y; pouch.vx = 0; pouch.vy = 0;
  }

  var demo = { t: 0, gx: W * 0.5, gy: THROW_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    basketX += basketDir * 160 * dt;
    if (basketX < W * 0.22 || basketX > W * 0.78) basketDir *= -1;
    if (cyc < 0.3) {
      demo.gx = W * 0.5; demo.gy = THROW_Y; demo.press = false;
    } else if (cyc < 0.45 && !throwing) {
      demo.press = true;
      var dx = (basketX - W * 0.5) * 1.6;
      launchPouch(dx, -1400);
    } else if (throwing) {
      pouch.vy += GRAV * dt;
      pouch.x += pouch.vx * dt;
      pouch.y += pouch.vy * dt;
      trail.push({ x: pouch.x, y: pouch.y });
      if (trail.length > 8) trail.shift();
      demo.gx = pouch.x; demo.gy = pouch.y; demo.press = false;
      if (pouch.vy > 0 && Math.abs(pouch.y - BASKET_Y) < 60 && Math.abs(pouch.x - basketX) < 100) {
        game.feedback.good(pouch.x, pouch.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
        resetPouch();
      } else if (pouch.y > H + 40) {
        resetPouch();
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pouch === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
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
      txt(hits + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TARGET - hits) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
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
    txt(hits + ' / ' + TARGET, W * 0.5, H * 0.07, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#c23d24', 0.3);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

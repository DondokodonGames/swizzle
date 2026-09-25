// J-N644-0023-anvil-guard.js
// アンビル・ガード — 迫る的人形をハンマーで打ち払い、自分の作業台を守り抜く
// 操作: 内側の警戒リングに入った的人形をタップしてハンマーで弾き飛ばす
// 終わり: 制限時間まで3回被弾せず耐えれば成功。被弾3回でGAME OVER
// @mechanic: aim_shoot
// @theme: forge_dummy_guard
// 世界観: 夜市の鉄工職人見習いが、四方から迫りくる練習用の的人形を次々とハンマーで弾き飛ばし、自分の作業台に誰も踏み込ませずに守り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き飛ばした数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺の背景にビビッドなマゼンタ/シアンの発光線、太い縁取り
  var C = {
    bg: '#170a2e', bg2: '#2a0f4a', ring: '#ff2fd1', ringWarn: '#ff4d5e',
    anvil: '#3ad6ff', anvilDark: '#127a99', dummy: '#ff9f1c', dummyDark: '#a85f00',
    good: '#3ad6ff', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#170a2e',
  };

  var GAME_TITLE = 'ANVIL GUARD';
  var TIME_LIMIT = 14;
  var CX = W * 0.5, CY = H * 0.46;
  var OUTER_R = 420, WARN_R = 230, INNER_R = 120;
  var MAX_LIVES = 3;
  var SPAWN_GAP = 1.15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAMMER_SPRITE = ['..##.', '..##.', '######', '.####.'];
  var DUMMY_SPRITE = ['.####.', '######', '.#..#.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, C.ring, pulse * 0.35);
    for (var i = 0; i < 3; i++) {
      var yy = ((game.time.elapsed * 60 + i * 220) % (H + 200)) - 100;
      game.draw.line(0, yy, W, yy, C.ring, 2);
    }
  }

  var dummies, lives, score, spawnClock, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake, hitDummy;

  function spawnDummy() {
    var ang = game.random(0, Math.PI * 2);
    dummies.push({ ang: ang, r: OUTER_R, warned: false, bob: game.random(0, 6), dead: false });
  }

  function initGame() {
    dummies = []; lives = MAX_LIVES; score = 0; spawnClock = 0.5; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0; hitDummy = null;
  }

  function posOf(d) {
    return { x: CX + Math.cos(d.ang) * d.r, y: CY + Math.sin(d.ang) * d.r * 0.72 };
  }

  function drawScene() {
    game.draw.circle(CX, CY, OUTER_R, C.ring, 0.06);
    game.draw.circle(CX, CY, WARN_R, C.ringWarn, 0.10);
    game.draw.circle(CX, CY, INNER_R, C.anvilDark, 0.5);
    game.draw.sprite(HAMMER_SPRITE, { '#': C.anvil }, CX, CY, 26, { anchor: 'center' });
    for (var i = 0; i < dummies.length; i++) {
      var d = dummies[i];
      if (d.dead) continue;
      var p = posOf(d);
      var bob = Math.sin(game.time.elapsed * 5 + d.bob) * 4;
      var warn = d.r < WARN_R;
      var flashOn = warn && Math.floor(game.time.elapsed * 9) % 2 === 0;
      game.draw.sprite(DUMMY_SPRITE, { '#': flashOn ? C.white : C.dummy }, p.x, p.y + bob, 22, { anchor: 'center' });
    }
  }

  function resolveHit(x, y) {
    var best = -1, bestDist = 9999;
    for (var i = 0; i < dummies.length; i++) {
      var d = dummies[i];
      if (d.dead) continue;
      var p = posOf(d);
      var dist = Math.hypot(x - p.x, y - p.y);
      if (dist < 90 && dist < bestDist) { bestDist = dist; best = i; }
    }
    if (best >= 0) {
      var d2 = dummies[best];
      d2.dead = true;
      score++;
      var p2 = posOf(d2);
      game.feedback.good(p2.x, p2.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      if (score === 6) game.fx.popup('NICE', CX, CY - 260, { color: C.gold, size: 34 });
      return true;
    }
    game.audio.play('se_tap', 0.15);
    return false;
  }

  function takeHit(d) {
    lives--;
    hitDummy = d;
    hitStop = 0.35; shake = 0.28;
    var p = posOf(d);
    game.feedback.bad(p.x, p.y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    d.dead = true;
    if (lives <= 0) {
      finished = true; ok = false;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && hitStop <= 0) {
      resolveHit(x, y);
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
    if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', CX, CY - 260, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    spawnClock -= dt;
    if (spawnClock <= 0) {
      spawnDummy();
      spawnClock = Math.max(0.55, SPAWN_GAP - roundClock * 0.02);
    }
    for (var i = dummies.length - 1; i >= 0; i--) {
      var d = dummies[i];
      if (d.dead) { dummies.splice(i, 1); continue; }
      d.r -= dt * 150;
      if (!d.warned && d.r < WARN_R) { d.warned = true; game.audio.play('se_tap', 0.06); }
      if (d.r < INNER_R + 10) {
        takeHit(d);
        if (finished) return;
      }
    }
    if (roundClock >= TIME_LIMIT) {
      finished = true; ok = true;
      finish();
    }
  }

  var demo = { t: 0, gx: CX, gy: CY - WARN_R, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    roundClock = cyc;
    if (dummies.length === 0 && cyc < 2.6) spawnDummy();
    for (var i = 0; i < dummies.length; i++) {
      var d = dummies[i];
      if (d.dead) continue;
      d.r = OUTER_R - (cyc / 1.8) * (OUTER_R - INNER_R - 20);
      if (d.r <= INNER_R + 40) {
        var p = posOf(d);
        demo.gx = p.x; demo.gy = p.y; demo.press = true;
        if (!d.hit) {
          d.hit = true; d.dead = true;
          game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.25);
        }
      } else {
        var p2 = posOf(d);
        demo.gx = p2.x; demo.gy = p2.y; demo.press = false;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!dummies) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt('x' + score, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, TIME_LIMIT - Math.floor(roundClock)) + '秒!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { hits: score, lives: lives });
        else game.end.failure({ hits: score, lives: lives });
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

    bg();
    drawScene();

    for (var l = 0; l < MAX_LIVES; l++) {
      game.draw.circle(W * 0.5 - 60 + l * 60, H * 0.055, 16, l < lives ? C.good : '#442255');
    }
    txt('x' + score, W * 0.5, H * 0.10, 28, C.gold);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#442255', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

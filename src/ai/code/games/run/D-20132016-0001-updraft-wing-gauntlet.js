// D-20132016-0001-updraft-wing-gauntlet.js
// アップドラフト・ウィングガントレット — 渓谷の風に乗る小さな飛行体。タップの羽ばたきで岩の隙間を抜ける
// 操作: タップするたびに一瞬上昇する。連続タップの間隔で高度を保ち、迫る岩の隙間をくぐる
// 終わり: 規定本数(6本)の隙間をすべて抜ければ成功。岩や地面/天井に触れれば失敗
// @mechanic: timing_window
// @theme: canyon_updraft_glider
// 世界観: 渓谷を吹き抜ける上昇気流に乗る小さな滑空生物。タップの羽ばたきだけで高度を保ち、迫る岩の隙間を次々くぐり抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた隙間数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 4色パレット、大きい矩形ドット
  var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f'], accent: ['#e0f8cf'] };
  var C = {
    sky1: '#9bbc0f', sky2: '#8bac0f', rock: '#306230', rockDark: '#0f380f',
    wing: '#e0f8cf', wingDark: '#306230', bad: '#0f380f', good: '#e0f8cf',
    gold: '#e0f8cf', white: '#e0f8cf', ink: '#0f380f',
  };

  var GAME_TITLE = 'UPDRAFT WING';
  var TOTAL = 6;
  var BIRD_X = W * 0.32;
  var TOP_BOUND = H * 0.14, BOT_BOUND = H * 0.82;
  var GRAVITY = 1500, FLAP = -560, SPEED = 300;
  var GAP_SPACING = 620;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WING_A = ['..#..', '.###.', '#####', '.###.'];
  var WING_B = ['.....', '.###.', '#####', '.###.'];

  var worldX, birdY, vy, pipes, passed, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function genPipes() {
    var arr = [];
    for (var i = 0; i < TOTAL; i++) {
      var gapH = Math.max(300, 430 - i * 20);
      var gapY = TOP_BOUND + 120 + Math.random() * (BOT_BOUND - TOP_BOUND - 240);
      arr.push({ x: BIRD_X + 500 + i * GAP_SPACING, gapY: gapY, gapH: gapH, passed: false });
    }
    return arr;
  }

  function initGame() {
    worldX = 0; birdY = H * 0.46; vy = 0; passed = 0;
    pipes = genPipes();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function flap() {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    vy = FLAP;
    game.audio.play('se_jump', 0.2);
    game.fx.burst(BIRD_X, birdY, { color: C.gold, count: 6, speed: 160 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) flap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(elapsed * 1.3));
    for (var i = 0; i < 5; i++) {
      var mx = ((i * 260 - (worldX * 0.25) % 260) + W) % (W + 200) - 100;
      game.draw.rect(mx, H * 0.06, 90, 70, C.rockDark, 0.15);
    }
  }

  function drawPipe(p) {
    var sx = p.x - worldX;
    if (sx < -120 || sx > W + 120) return;
    var topH = p.gapY - p.gapH / 2 - TOP_BOUND;
    var botY = p.gapY + p.gapH / 2;
    var botH = BOT_BOUND - botY;
    game.draw.rect(sx - 60, TOP_BOUND, 120, Math.max(0, topH), C.rock);
    game.draw.rect(sx - 60, TOP_BOUND, 120, Math.max(0, topH), C.rockDark, 0.15);
    game.draw.rect(sx - 60, botY, 120, Math.max(0, botH), C.rock);
    game.draw.rect(sx - 60, botY, 120, Math.max(0, botH), C.rockDark, 0.15);
    // 接近予告(telegraph): 隙間が近づくと縁が明滅
    var dist = sx - BIRD_X;
    if (dist > 0 && dist < 260) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) {
        game.draw.rect(sx - 66, p.gapY - p.gapH / 2 - 6, 132, 6, C.good, 0.8);
        game.draw.rect(sx - 66, p.gapY + p.gapH / 2, 132, 6, C.good, 0.8);
      }
    }
  }

  function drawBird(x, y, elapsed) {
    var frame = Math.floor(elapsed * 8) % 2 === 0 ? WING_A : WING_B;
    game.draw.sprite(frame, { '#': C.wing }, x, y, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: BIRD_X, gy: H * 0.46, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    worldX += dt * SPEED;
    vy += GRAVITY * dt * 0.6;
    // 次の隙間の中心へ向けて自動で羽ばたく
    var target = null;
    for (var i = 0; i < pipes.length; i++) { if (pipes[i].x - worldX > BIRD_X - 40) { target = pipes[i]; break; } }
    if (target && birdY > target.gapY + 20 && vy > -50) { vy = FLAP; demo.press = true; } else demo.press = false;
    birdY += vy * dt;
    if (birdY < TOP_BOUND + 20) { birdY = TOP_BOUND + 20; vy = 0; }
    if (birdY > BOT_BOUND - 20) { birdY = BOT_BOUND - 20; vy = 0; }
    demo.gx = BIRD_X; demo.gy = birdY;
    if (target && target.x - worldX < BIRD_X) target.passed = true;
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      for (var i = 0; i < pipes.length; i++) drawPipe(pipes[i]);
      drawBird(BIRD_X, birdY, elapsed);
      game.draw.hand(demo.gx, demo.gy - 90, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      for (var j = 0; j < pipes.length; j++) drawPipe(pipes[j]);
      drawBird(BIRD_X, birdY, elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, C.ink);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.ink);
      if (!ok) txt('あと' + (TOTAL - passed) + '本!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: TOTAL }); else game.end.failure({ passed: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      worldX += dt * SPEED;
      vy += GRAVITY * dt;
      birdY += vy * dt;
      var hit = false;
      if (birdY < TOP_BOUND || birdY > BOT_BOUND) hit = true;
      for (var k = 0; k < pipes.length; k++) {
        var p = pipes[k];
        var sx = p.x - worldX;
        if (!p.passed && sx < BIRD_X) {
          p.passed = true;
          if (birdY < p.gapY - p.gapH / 2 + 24 || birdY > p.gapY + p.gapH / 2 - 24) {
            hit = true;
          } else {
            passed++;
            game.feedback.good(BIRD_X, birdY, { text: 'GOOD' });
            game.audio.play('se_good', 0.3);
            if (!milestoneShown && passed === Math.ceil(TOTAL / 2)) {
              milestoneShown = true;
              game.fx.popup(passed + ' / ' + TOTAL, BIRD_X, birdY - 120, { color: C.gold, size: 36 });
              game.audio.play('se_milestone', 0.4);
            }
          }
        } else if (Math.abs(sx - BIRD_X) < 60) {
          if (birdY < p.gapY - p.gapH / 2 + 24 || birdY > p.gapY + p.gapH / 2 - 24) hit = true;
        }
      }
      if (hit) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(BIRD_X, birdY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (passed >= TOTAL) {
        ok = true; finished = true; hitStop = 0.1;
        game.feedback.good(BIRD_X, birdY, { text: 'CLEAR', color: C.good });
        game.fx.burst(BIRD_X, birdY, { color: C.gold, count: 18, speed: 340 });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    for (var m = 0; m < pipes.length; m++) drawPipe(pipes[m]);
    if (!finished) drawBird(BIRD_X, birdY, elapsed);

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.25);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.4]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

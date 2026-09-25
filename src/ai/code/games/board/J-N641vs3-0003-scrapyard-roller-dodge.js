// J-N641vs3-0003-scrapyard-roller-dodge.js
// スクラップヤード・ローラー・ドッジ — 廃工場の点検員が転がり込む金属球を進路表示に合わせてかわし続ける
// 操作: 警告矢印が出た側と逆方向へ素早くスワイプしてよける
// 終わり: 制限時間まで3回衝突せずかわし切れば成功。3回衝突でGAME OVER
// @mechanic: swipe_direction
// @theme: scrapyard_roller_dodge
// 世界観: 廃工場の点検員が、転がり込んでくる金属球を進路表示に合わせて左右へ素早くかわし続け、時間切れまで衝突せずに耐え抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単色背景、太い縁の疑似3Dシルエット、影は柔らかい楕円
  var C = {
    bg: '#dfe6ee', bg2: '#c7d2e0', floor: '#b8c3d2', floorEdge: '#9aa7b8',
    worker: '#ff8a3d', workerDark: '#a5531c', ball: '#4a5568', ballDark: '#232a33',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffcf3a', ink: '#1c2430', white: '#ffffff',
  };

  var GAME_TITLE = 'ROLLER DODGE';
  var TIME_LIMIT = 13;
  var MAX_LIVES = 3;
  var CENTER_X = W * 0.5, WORKER_Y = H * 0.68;
  var SPAWN_GAP = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var BALL_SPRITE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.58, W, H * 0.35, C.floor);
    game.draw.rect(0, H * 0.58, W, 6, C.floorEdge);
  }

  var balls, spawnClock, lives, dodges, workerOff, offClock, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    balls = []; spawnClock = 1.0; lives = MAX_LIVES; dodges = 0; workerOff = 0; offClock = 0;
    roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnBall() {
    var fromRight = Math.random() < 0.5;
    balls.push({ x: fromRight ? W + 60 : -60, dir: fromRight ? -1 : 1, y: WORKER_Y, warned: false, dead: false });
  }

  function drawScene() {
    bg();
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.dead) continue;
      var nearEdge = Math.abs(b.x - CENTER_X) < 420 && !b.warned;
      if (nearEdge) {
        var flashOn = Math.floor(game.time.elapsed * 10) % 2 === 0;
        var arrowX = b.dir > 0 ? CENTER_X - 220 : CENTER_X + 220;
        game.draw.text(b.dir > 0 ? '>' : '<', arrowX, WORKER_Y - 120, { size: 60, color: flashOn ? C.bad : C.gold, bold: true, align: 'center' });
      }
      game.draw.sprite(BALL_SPRITE, { '#': C.ball }, b.x, b.y, 22, { anchor: 'center' });
    }
    var wx = CENTER_X + workerOff * 170;
    game.draw.sprite(WORKER_SPRITE, { '#': C.worker }, wx, WORKER_Y, 26, { anchor: 'center' });
  }

  function dodge(dir) {
    if (finished) return;
    workerOff = dir; offClock = 0.4;
    game.audio.play('se_tap', 0.2);
    var hit = false;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.dead || Math.abs(b.x - CENTER_X) > 140) continue;
      var needDir = -b.dir;
      if (dir === needDir) {
        b.dead = true; dodges++;
        game.feedback.good(CENTER_X + dir * 170, WORKER_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.3);
        if (dodges === 6) game.fx.popup('NICE', CENTER_X, WORKER_Y - 200, { color: C.gold, size: 32 });
      } else {
        hit = true;
      }
    }
    if (hit) takeHit();
  }

  function takeHit() {
    lives--;
    hitStop = 0.35; shake = 0.3;
    game.feedback.bad(CENTER_X, WORKER_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    if (lives <= 0) { finished = true; ok = false; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished || hitStop > 0) return;
    game.audio.play('se_tap', 0.1);
    if (dir === 'left') dodge(-1);
    else if (dir === 'right') dodge(1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    roundClock += dt;
    if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) { halfCalled = true; }
    if (offClock > 0) { offClock -= dt; if (offClock <= 0) workerOff = 0; }
    spawnClock -= dt;
    if (spawnClock <= 0) { spawnBall(); spawnClock = Math.max(0.8, SPAWN_GAP - roundClock * 0.03); }
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.dead) { balls.splice(i, 1); continue; }
      b.x += b.dir * 420 * dt;
      if (!b.warned && Math.abs(b.x - CENTER_X) < 420) b.warned = true;
      if (Math.abs(b.x - CENTER_X) < 40) {
        b.dead = true;
        if (workerOff === -b.dir) {
          dodges++;
          game.feedback.good(CENTER_X, WORKER_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.25);
        } else {
          takeHit();
          if (finished) return;
        }
      }
      if (b.x < -100 || b.x > W + 100) b.dead = true;
    }
    if (roundClock >= TIME_LIMIT) {
      finished = true; ok = true;
      game.feedback.good(CENTER_X, WORKER_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(CENTER_X, WORKER_Y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  var demo = { t: 0, gx: CENTER_X, gy: WORKER_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (balls.length === 0 && cyc < 2.2) spawnBall();
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.dead) continue;
      b.x += b.dir * 420 * dt * 0.7;
      if (Math.abs(b.x - CENTER_X) < 120 && !b.dodgeDone) {
        b.dodgeDone = true;
        var dir = -b.dir;
        workerOff = dir; offClock = 0.4;
        demo.gx = CENTER_X + dir * 170; demo.gy = WORKER_Y; demo.press = true;
        game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      if (Math.abs(b.x - CENTER_X) < 40) b.dead = true;
      if (b.x < -100 || b.x > W + 100) b.dead = true;
    }
    if (offClock > 0) { offClock -= dt; if (offClock <= 0) { workerOff = 0; demo.press = false; } }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (balls === undefined) initGame();
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
      txt('x' + dodges, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TIME_LIMIT - Math.floor(roundClock)) + '秒!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodges, { dodges: dodges, lives: lives });
        else game.end.failure({ dodges: dodges, lives: lives });
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
      game.draw.circle(W * 0.5 - 60 + l * 60, H * 0.055, 16, l < lives ? C.good : '#9aa7b8');
    }
    txt(dodges + ' / ' + 12, W * 0.5, H * 0.10, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#9aa7b8', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

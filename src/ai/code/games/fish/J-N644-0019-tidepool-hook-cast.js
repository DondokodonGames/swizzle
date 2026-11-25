// J-N644-0019-tidepool-hook-cast.js
// タイドプールフックキャスト — 引いて放った釣り針で、波間を漂う光る貝殻だけを釣り上げる
// 操作: 手前の浮きを指で引いて離す(スリングショット)。狙いと強さは引いた分だけ。貝殻は左右に漂う
// 終わり: 持ち球(5投)以内に光る貝殻を全て釣り上げれば成功。投げ尽くせば失敗
// @mechanic: slingshot
// @theme: tidepool_hook_cast
// 世界観: 岩場の潮だまりに座る見習い釣り人が、波間を漂いながら流れていく光る貝殻を、引いて放つ釣り針だけで狙い澄まして釣り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 釣り上げた個数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度パステル、太めの輪郭線、限定色パレット
  var C = {
    bg: '#a8d8e8', bg2: '#6ab0cc', water: '#3a8ab0', waterDark: '#286a8a',
    shell: '#ffd8a0', shellGlow: '#fff0c8', hook: '#5a4a3a', line: '#e8e0d0',
    good: '#5adf8a', bad: '#ff6a5a', gold: '#ffcf40', white: '#fffaf0', ink: '#1a2a30',
  };

  var GAME_TITLE = 'TIDE CAST';
  var SHOTS_TOTAL = 5;
  var LAUNCH = { x: W * 0.5, y: H * 0.84 };
  var PULL_MAX = 210;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ANGLER = ['.####.', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var e = game.time.elapsed;
    for (var i = 0; i < 6; i++) {
      var y = H * 0.2 + i * (H * 0.5 / 6);
      game.draw.line(0, y + Math.sin(e * 1.4 + i) * 8, W, y - Math.sin(e * 1.4 + i) * 8, C.water, 0.15);
    }
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.waterDark, 0.35);
  }

  function makeShells() {
    var arr = [];
    var ys = [H * 0.24, H * 0.34, H * 0.44, H * 0.54];
    for (var i = 0; i < ys.length; i++) {
      arr.push({ x: W * (0.25 + (i % 2) * 0.5), y: ys[i], r: 34, alive: true, phase: game.random(0, 6), speed: 0.6 + i * 0.12 });
    }
    return arr;
  }

  function shellX(s) { return s.x + Math.sin(game.time.elapsed * s.speed + s.phase) * 130; }

  var shells, shots, caught, hook, pulling, pullX, pullY, done, endWait, finished, ready, hitStop, shake, halfShown;

  function initGame() {
    shells = makeShells();
    shots = SHOTS_TOTAL; caught = 0;
    hook = null; pulling = false; pullX = LAUNCH.x; pullY = LAUNCH.y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function launchHook(px, py) {
    var dx = LAUNCH.x - px, dy = LAUNCH.y - py;
    var d = Math.hypot(dx, dy);
    if (d < 20) return;
    var nx = dx / d, ny = dy / d;
    var speed = 700 + Math.min(d, PULL_MAX) * 3.2;
    hook = { x: LAUNCH.x, y: LAUNCH.y, vx: nx * speed, vy: ny * speed, alive: true };
    shots--;
    game.audio.play('se_jump', 0.4);
  }

  function resolveHit(shell, hx, hy) {
    shell.alive = false;
    caught++;
    game.feedback.good(hx, hy, { text: 'HIT', color: C.good });
    game.fx.burst(hx, hy, { color: C.gold, count: 16, speed: 340 });
    game.audio.play('se_coin', 0.45);
    if (!halfShown && caught >= Math.ceil(shells.length / 2)) {
      halfShown = true;
      game.fx.popup('HALFWAY!', hx, hy - 70, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    hook = null;
    checkEnd();
  }

  function checkEnd() {
    if (finished || done) return;
    var remain = 0;
    for (var i = 0; i < shells.length; i++) if (shells[i].alive) remain++;
    if (remain === 0) {
      finished = true; ok = true; hitStop = 0.15;
      finish();
    } else if (shots <= 0 && !hook) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      finish();
    }
  }

  function stepHook(dt) {
    if (!hook) return;
    hook.x += hook.vx * dt; hook.y += hook.vy * dt;
    if (hook.x < 30) { hook.x = 30; hook.vx *= -1; }
    if (hook.x > W - 30) { hook.x = W - 30; hook.vx *= -1; }
    for (var i = 0; i < shells.length; i++) {
      var s = shells[i];
      if (!s.alive) continue;
      if (game.hit.circle(hook.x, hook.y, 14, shellX(s), s.y, s.r)) {
        resolveHit(s, hook.x, hook.y);
        return;
      }
    }
    if (hook.y < H * 0.08 || hook.y > H) {
      hook = null;
      game.feedback.bad(LAUNCH.x, H * 0.4, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      checkEnd();
    }
  }

  function drawShells() {
    for (var i = 0; i < shells.length; i++) {
      var s = shells[i];
      if (!s.alive) continue;
      var sx = shellX(s);
      var pulse = Math.sin(game.time.elapsed * 5 + s.phase) * 3;
      game.draw.circle(sx, s.y, s.r + 6, C.shellGlow, 0.4 + Math.sin(game.time.elapsed * 4 + s.phase) * 0.15);
      game.draw.circle(sx, s.y + pulse * 0, s.r, C.shell);
    }
  }

  function drawHookAndSling() {
    var bx = Math.cos(game.time.elapsed * 2) * 3;
    game.draw.sprite(ANGLER, { '#': C.hook }, LAUNCH.x + bx, LAUNCH.y + 60, 10, { anchor: 'center' });
    if (pulling) {
      game.draw.line(LAUNCH.x, LAUNCH.y, pullX, pullY, C.line, 8);
      game.draw.circle(pullX, pullY, 16, C.gold);
    } else if (!hook && !done) {
      game.draw.circle(LAUNCH.x, LAUNCH.y, 16, C.gold);
    }
    if (hook) game.draw.circle(hook.x, hook.y, 14, C.gold);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || hook) return;
    var d = Math.hypot(x - LAUNCH.x, y - LAUNCH.y);
    if (d < 120) { pulling = true; pullX = x; pullY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pulling) return;
    var dx = x - LAUNCH.x, dy = y - LAUNCH.y;
    var d = Math.hypot(dx, dy);
    if (d > PULL_MAX) { dx = dx / d * PULL_MAX; dy = dy / d * PULL_MAX; }
    pullX = LAUNCH.x + dx; pullY = LAUNCH.y + dy;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !pulling) return;
    pulling = false;
    launchHook(pullX, pullY);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: LAUNCH.x, gy: LAUNCH.y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { shells = makeShells(); shots = SHOTS_TOTAL; caught = 0; hook = null; halfShown = false; }
    var target = null;
    for (var i = 0; i < shells.length; i++) if (shells[i].alive) { target = shells[i]; break; }
    if (cyc < 1.2) {
      var p = cyc / 1.2;
      var aimX = target ? shellX(target) : LAUNCH.x;
      var aimY = target ? target.y : LAUNCH.y * 0.5;
      var pdx = (LAUNCH.x - aimX), pdy = (LAUNCH.y - aimY);
      var pd = Math.hypot(pdx, pdy);
      var nx = pd > 0 ? pdx / pd : 0, ny = pd > 0 ? pdy / pd : -1;
      demo.gx = LAUNCH.x + nx * 150 * p;
      demo.gy = LAUNCH.y + ny * 150 * p;
      demo.press = true;
      pullX = demo.gx; pullY = demo.gy; pulling = true;
    } else if (cyc < 1.35) {
      if (pulling) { pulling = false; launchHook(pullX, pullY); }
      demo.press = false;
    } else {
      stepHook(dt);
      demo.gx = LAUNCH.x + Math.sin(game.time.elapsed * 2.2) * 70;
      demo.gy = LAUNCH.y + Math.cos(game.time.elapsed * 1.6) * 30;
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (shells === undefined) initGame();
      bg();
      stepDemo(dt);
      drawShells();
      drawHookAndSling();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 24 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawShells();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(caught + ' / ' + shells.length, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, shells.length - caught) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: shells.length, shots: SHOTS_TOTAL - shots });
        else game.end.failure({ caught: caught, total: shells.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepHook(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawShells();
    drawHookAndSling();

    txt(caught + ' / ' + shells.length, W / 2, H * 0.06, 30, C.ink);
    for (var i = 0; i < SHOTS_TOTAL; i++) {
      var sx = W * 0.5 - (SHOTS_TOTAL - 1) * 22 + i * 44;
      game.draw.circle(sx, H * 0.145, 10, i < shots ? C.gold : C.water);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

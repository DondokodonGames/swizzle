// D-20132016-0063-neon-ring-flick-duel.js
// ネオンリングフリックデュエル — 光る円形リングの上で、自分のコマを指で引いて弾き、相手のコマをリング外へ押し出す
// 操作: 自分のコマを指で引いて狙いと強さを決め、離して弾く。当てるたびに相手が外側へ押される
// 終わり: 相手を規定回数(3回)押し出せば成功。自分のコマがリング外へ出るか、規定打数を使い切れば失敗
// @mechanic: flick_launch
// @theme: neon_arena_knockback_duel
// 世界観: 夜のリングで向かい合う二体の光る石像戦士。互いにコマをぶつけ合い、リングの外まで相手を弾き出した方が勝つ一騎打ち
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光ラインと原色グロー、面塗りは最小限
  var C = {
    bg: '#0a0018', bg2: '#160030', ring: '#00e5ff', ringGlow: '#0a3a44',
    player: '#ffe14d', enemy: '#ff2e88', aim: '#ffffff',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'RING DUEL';
  var CX = W * 0.5, CY = H * 0.46;
  var RING_R = 380;
  var PR = 34, ER = 42;
  var START_X = CX, START_Y = CY + RING_R * 0.55;
  var HITS_NEEDED = 3;
  var ATTEMPTS_MAX = 4;
  var HIT_PUSH = RING_R * 0.28;
  var POWER_SCALE = 3.4;
  var MAX_DRAG = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, attemptsUsed, px, py, pvx, pvy, flying, enemyDist, aiming, aimStart, aimNow;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WARRIOR = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.05 + 0.09 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', Math.max(0, pulse));
    var glowR = RING_R + 26 + Math.sin(game.time.elapsed * 1.7) * 10;
    game.draw.circle(CX, CY, glowR, C.ringGlow, 0.5);
    game.draw.circle(CX, CY, RING_R, C.ring, 0);
    var spin = game.time.elapsed * 0.6;
    for (var a = 0; a < 360; a += 12) {
      var rad = a * Math.PI / 180 + spin;
      var pulseDot = 5 + Math.sin(game.time.elapsed * 4 + a) * 2;
      game.draw.circle(CX + Math.cos(rad) * RING_R, CY + Math.sin(rad) * RING_R, pulseDot, C.ring);
    }
  }

  function enemyPos() { return { x: CX, y: CY - enemyDist }; }

  function initGame() {
    hits = 0; attemptsUsed = 0; enemyDist = RING_R * 0.32;
    px = START_X; py = START_Y; pvx = 0; pvy = 0; flying = false;
    aiming = false; aimStart = null; aimNow = null;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function launch(dx, dy) {
    var len = Math.hypot(dx, dy);
    if (len < 8) return;
    var clamped = Math.min(len, MAX_DRAG);
    var nx = dx / len, ny = dy / len;
    pvx = -nx * clamped * POWER_SCALE;
    pvy = -ny * clamped * POWER_SCALE;
    flying = true; aiming = false;
    game.audio.play('se_powerup', 0.4);
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || flying) return;
    aiming = true; aimStart = { x: x, y: y }; aimNow = { x: x, y: y };
    game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) { if (state === S.PLAYING && aiming) aimNow = { x: x, y: y }; });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    var dx = x - aimStart.x, dy = y - aimStart.y;
    aiming = false;
    launch(dx, dy);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function loseSelfOut() {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(px, py, { text: 'OUT' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function endAttempt() {
    flying = false; pvx = 0; pvy = 0; px = START_X; py = START_Y;
    attemptsUsed++;
    if (hits >= HITS_NEEDED) return;
    if (attemptsUsed >= ATTEMPTS_MAX) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    } else if (ATTEMPTS_MAX - attemptsUsed === 1) {
      game.fx.popup('LAST SHOT!', CX, CY, { color: C.gold, size: 36 });
    }
  }

  function updateFlight(dt) {
    px += pvx * dt; py += pvy * dt;
    pvx *= Math.pow(0.05, dt); pvy *= Math.pow(0.05, dt);
    var distFromCenter = Math.hypot(px - CX, py - CY);
    if (distFromCenter > RING_R) { loseSelfOut(); return; }
    var ep = enemyPos();
    var hitDist = Math.hypot(px - ep.x, py - ep.y);
    if (hitDist < PR + ER) {
      hits++;
      enemyDist = Math.min(RING_R + 40, enemyDist + HIT_PUSH);
      hitStop = 0.12;
      game.feedback.good(ep.x, ep.y, { text: 'HIT', color: C.good });
      game.fx.burst(ep.x, ep.y, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_good', 0.4);
      pvx *= -0.6; pvy *= -0.6;
      if (enemyDist >= RING_R) {
        ok = true; finished = true; hitStop = 0.35;
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      if (hits === HITS_NEEDED - 1) game.fx.popup('あと1発!', CX, CY - RING_R - 20, { color: C.gold, size: 34 });
    }
    var speed = Math.hypot(pvx, pvy);
    if (speed < 14) endAttempt();
  }

  function drawEnemy() {
    if (finished && ok) return;
    var ep = enemyPos();
    var sway = Math.sin(game.time.elapsed * 2.4) * 10;
    game.draw.circle(ep.x + sway, ep.y, ER + 10, C.enemy, 0.25);
    game.draw.sprite(WARRIOR, { '#': C.enemy }, ep.x + sway, ep.y, 13, { anchor: 'center' });
  }
  function drawPlayer(bob) {
    game.draw.circle(px, py, PR + 8, C.player, 0.25);
    game.draw.sprite(WARRIOR, { '#': C.player }, px, py + bob, 11, { anchor: 'center' });
  }

  var demo = { t: 0, gx: START_X, gy: START_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      px = START_X; py = START_Y; pvx = 0; pvy = 0; flying = false; enemyDist = RING_R * 0.32; hits = 0;
    }
    if (cyc < 1.0) {
      var p = cyc / 1.0;
      demo.gx = START_X + p * 30; demo.gy = START_Y + p * 80; demo.press = true;
    } else if (cyc < 1.1 && !flying) {
      flying = true;
      pvx = 0; pvy = -(START_Y - (CY - enemyDist)) / 0.65;
    } else if (flying) {
      px += pvx * dt; py += pvy * dt;
      pvy *= Math.pow(0.05, dt);
      demo.gx = px; demo.gy = py; demo.press = false;
      var ep = enemyPos();
      if (Math.hypot(px - ep.x, py - ep.y) < PR + ER) {
        flying = false; enemyDist = RING_R + 40;
        game.feedback.good(ep.x, ep.y, { text: 'HIT', color: C.good });
        game.audio.play('se_good', 0.25);
        px = START_X; py = START_Y;
      } else if (py < CY - RING_R - 40) {
        flying = false; px = START_X; py = START_Y;
      }
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 2.2) * 4;

    if (state === S.ATTRACT) {
      if (px === undefined) initGame();
      bg();
      stepDemo(dt);
      drawEnemy();
      drawPlayer(bob);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawEnemy();
      drawPlayer(bob);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + HITS_NEEDED, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, attempts: attemptsUsed });
        else game.end.failure({ hits: hits, attempts: attemptsUsed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (flying) updateFlight(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawEnemy();
    if (aiming && aimStart && aimNow) {
      var dx = aimNow.x - aimStart.x, dy = aimNow.y - aimStart.y;
      var len = Math.min(Math.hypot(dx, dy), MAX_DRAG);
      var ang = Math.atan2(dy, dx);
      var ex = px - Math.cos(ang) * len, ey = py - Math.sin(ang) * len;
      game.draw.line(px, py, ex, ey, C.aim, 6);
    }
    drawPlayer(bob);

    txt(hits + ' / ' + HITS_NEEDED, W / 2, H * 0.06, 32, C.white);
    for (var i = 0; i < ATTEMPTS_MAX; i++) {
      var used = i < attemptsUsed;
      game.draw.circle(W * 0.5 - (ATTEMPTS_MAX - 1) * 24 + i * 48, H * 0.86, 14, used ? C.ink : C.gold, used ? 0.5 : 1);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['D#4', 0.3], ['G4', 0.3], ['C5', 0.5]], { tempo: 138, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

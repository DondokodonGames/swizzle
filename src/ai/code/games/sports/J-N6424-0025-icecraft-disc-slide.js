// J-N6424-0025-icecraft-disc-slide.js
// アイスクラフト・ディスクスライド — 氷上工房の丸い駒を滑らせ、狙った的枠に打ち込む
// 操作: 手前の駒を狙った方向へフリックすると、フリックの速度と角度のまま滑って飛んでいく
// 終わり: 規定回数枠に入れられれば成功。持ち駒を使い切って未達なら失敗
// @mechanic: flick_launch
// @theme: icecraft_disc_slide
// 世界観: 氷上工房の職人が丸い駒を滑走路へ滑らせ、動く的枠へ狙いを定めて打ち込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中させた回数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 淡い氷面グラデ、幾何学的な縁取りライン
  var C = {
    bg: '#dff3ff', bg2: '#b8e2f7', ice: '#eefaff', iceLine: '#9ecfe8',
    disc: '#ff7a3d', discDark: '#c25620', goal: '#3d7dff', goalDark: '#1d4fa0',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffb400', ink: '#123a52', white: '#ffffff',
  };

  var GAME_TITLE = 'DISC SLIDE';
  var LAUNCH_X = W * 0.5, LAUNCH_Y = H * 0.78;
  var GOAL_Y = H * 0.24;
  var NEED = 5;
  var ATTEMPTS = 8;
  var MAX_TIME = 18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRAFTER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, H * 0.3 + i * 90, W, H * 0.3 + i * 90, C.iceLine, 2);
    }
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(CRAFTER, { '#': C.ink }, W * 0.14, H * 0.86 + bob, 9, { anchor: 'center' });
  }

  var goalX, goalDir, hits, tries, disc, dragStart, halfCalled, roundClock;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    goalX = W * 0.5; goalDir = 1;
    hits = 0; tries = 0; halfCalled = false; roundClock = 0;
    disc = { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, flying: false };
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; dragStart = null;
  }

  var GOAL_W = 180;
  function drawScene() {
    game.draw.rect(goalX - GOAL_W / 2, GOAL_Y - 30, GOAL_W, 60, C.goalDark);
    game.draw.rect(goalX - GOAL_W / 2 + 10, GOAL_Y - 20, GOAL_W - 20, 40, C.goal);
    game.draw.circle(disc.x, disc.y, 40, C.discDark);
    game.draw.circle(disc.x, disc.y, 30, C.disc);
    if (!disc.flying) {
      game.draw.circle(LAUNCH_X, LAUNCH_Y, 46, C.ink, 0.08);
    }
  }

  function launchDisc(vx, vy) {
    if (finished || ready > 0 || disc.flying) return;
    var speed = Math.hypot(vx, vy);
    if (speed < 60) return;
    disc.flying = true; disc.vx = vx; disc.vy = vy;
    tries++;
    game.audio.play('se_jump', 0.3);
  }

  function resolveMiss() {
    game.feedback.bad(disc.x, disc.y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    tryReset();
  }

  function tryReset() {
    if (tries >= ATTEMPTS && !finished) {
      finished = true; ok = false; hitStop = 0.3;
      finish();
      return;
    }
    disc.x = LAUNCH_X; disc.y = LAUNCH_Y; disc.flying = false; disc.vx = 0; disc.vy = 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && !disc.flying && ready <= 0 && !finished) {
      dragStart = { x: x, y: y };
      game.audio.play('se_tap', 0.08);
    }
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING && dragStart && !disc.flying) {
      var dx = dragStart.x - x, dy = dragStart.y - y;
      game.audio.play('se_tap', 0.05);
      launchDisc(dx * 3.2, dy * 3.2);
      dragStart = null;
    }
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepDisc(dt) {
    goalX += goalDir * 140 * dt;
    if (goalX < W * 0.24 || goalX > W * 0.76) goalDir *= -1;
    if (!disc.flying) return;
    disc.x += disc.vx * dt; disc.y += disc.vy * dt;
    disc.vx *= Math.max(0.5, 1 - 0.6 * dt); disc.vy *= Math.max(0.5, 1 - 0.6 * dt);
    if (disc.y <= GOAL_Y + 30 && disc.y > GOAL_Y - 30 && Math.abs(disc.x - goalX) < GOAL_W / 2) {
      hits++;
      hitStop = 0.25;
      game.feedback.good(disc.x, disc.y, { text: 'GOOD', color: C.good });
      game.fx.burst(disc.x, disc.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.35);
      if (!halfCalled && hits >= Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE', disc.x, disc.y - 60, { color: C.gold, size: 30 }); }
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(disc.x, disc.y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      tryReset();
      return;
    }
    if (disc.y < H * 0.1 || disc.x < 20 || disc.x > W - 20 || (Math.hypot(disc.vx, disc.vy) < 20 && disc.y > GOAL_Y + 40)) {
      hitStop = 0.15; resolveMiss();
    }
  }

  var demo = { t: 0, gx: LAUNCH_X, gy: LAUNCH_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepDisc(dt);
    if (cyc < 0.8) {
      var t2 = cyc / 0.8;
      demo.gx = LAUNCH_X + 60 - t2 * 60; demo.gy = LAUNCH_Y + 40 - t2 * 40; demo.press = true;
    } else if (cyc < 0.9 && !disc.flying) {
      var vx = (goalX - LAUNCH_X) * 1.1, vy = -(LAUNCH_Y - GOAL_Y) * 1.1;
      launchDisc(vx, vy);
      demo.press = false;
    } else {
      demo.gx = disc.x; demo.gy = disc.y;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (disc === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.goal);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - hits) + '個!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, tries: tries });
        else game.end.failure({ hits: hits, tries: tries });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepDisc(dt);
      roundClock += dt;
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false;
        game.feedback.bad(disc.x, disc.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 26, C.ink);
    txt(tries + ' / ' + ATTEMPTS, W * 0.84, H * 0.06, 18, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.45]], { tempo: 122, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

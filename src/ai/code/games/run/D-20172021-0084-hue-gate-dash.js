// D-20172021-0084-hue-gate-dash.js
// ヒューゲート・ダッシュ — 自機カプセルと同じ色の壁だけを通り抜けられるトンネルをタップで色を変えながら駆け抜ける
// 操作: タップするたびにカプセルの色が3色を順に切り替わる。迫る壁が自分と同じ色になるよう間に合わせて通り抜ける
// 終わり: 規定回数(8枚)の壁を正しい色で抜ければ成功。違う色の壁にぶつかるか時間切れで失敗
// @mechanic: camera_run
// @theme: hue_gate_dash
// 世界観: 配送トンネルを走るカプセルが、迫り来る色壁の色に合わせてタップで自分の色を切り替え続け、奥の搬出口まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた壁数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、3秒で伝わる画面
  var C = {
    bg: '#fff6e0', bg2: '#ffe9b8', tunnel: '#ffffff',
    hueA: '#ff4d5e', hueB: '#3fae5a', hueC: '#3f8fe0',
    wallGrey: '#c8c2b0',
    good: '#3fae5a', bad: '#ff4d5e', gold: '#ffb400', white: '#ffffff', ink: '#2a2010',
  };
  var HUES = [C.hueA, C.hueB, C.hueC];

  var GAME_TITLE = 'HUE GATE';
  var TOTAL = 8;
  var SCROLL_SPEED = 300;
  var GAP_DIST = 560;
  var START_Y = -100;
  var CAPSULE_Y = H * 0.66;
  var TELE_DIST = SCROLL_SPEED * 0.55;
  var GATE_HALF = 130;
  var TIME_LIMIT = 24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAP_SPR = ['.#.', '###', '.#.', '###'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 2; i++) {
      var lx = W * (0.14 + i * 0.72);
      game.draw.rect(lx, 0, 24, H, C.tunnel, 0.5);
    }
  }

  function wallScreenY(wall) { return START_Y + (scrollDist - wall.spawnDist); }

  function drawWalls(highlightBad) {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var wy = wallScreenY(w);
      if (wy < -140 || wy > H * 0.9) continue;
      var near = (CAPSULE_Y - wy) < TELE_DIST;
      var warn = near && Math.floor(game.time.elapsed * 12) % 2 === 0;
      var badFlash = highlightBad && w === lastWall;
      for (var l = 0; l < 3; l++) {
        var lx = W * (0.22 + l * 0.28);
        if (l === w.colorIdx) continue;
        game.draw.rect(lx - 70, wy - 34, 140, 68, badFlash ? C.bad : (warn ? C.gold : C.wallGrey), 0.9);
      }
      var gx = W * (0.22 + w.colorIdx * 0.28);
      game.draw.rect(gx - 70, wy - 34, 140, 68, HUES[w.colorIdx], 0.35);
      game.draw.rect(gx - 70, wy - 34, 140, 6, C.white, 0.5);
    }
  }

  function drawCapsule() {
    var bob = Math.sin(game.time.elapsed * 8) * 3;
    game.draw.circle(CX, CAPSULE_Y + bob, 36, HUES[capHue], 0.9);
    game.draw.sprite(CAP_SPR, { '#': C.white }, CX, CAPSULE_Y + bob - 4, 10, { anchor: 'center' });
  }

  var CX = W * 0.5;
  var passed, walls, spawned, capHue, scrollDist, halfShown, lastWall, failFlash;
  var timeLeft, done, endWait, finished, ready, hitStop, shake;

  function laneXOf(idx) { return W * (0.22 + idx * 0.28); }

  function spawnWall() {
    var col = Math.floor(game.random(0, 3));
    walls.push({ spawnDist: scrollDist, colorIdx: col, judged: false });
    spawned++;
  }

  function initGame() {
    passed = 0; halfShown = false; walls = []; spawned = 0; scrollDist = 0; capHue = 0;
    lastWall = null; failFlash = 0;
    timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    spawnWall();
  }

  function cycle() {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    capHue = (capHue + 1) % 3;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(CX, CAPSULE_Y, { color: HUES[capHue], count: 8, speed: 180 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    cycle();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateWalls(dt) {
    scrollDist += SCROLL_SPEED * dt;
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (w.judged) continue;
      var wy = wallScreenY(w);
      if (wy >= CAPSULE_Y - 8) {
        w.judged = true; lastWall = w;
        if (w.colorIdx === capHue) {
          passed++;
          hitStop = 0.06;
          game.feedback.good(CX, CAPSULE_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.3);
          if (!halfShown && passed >= Math.ceil(TOTAL / 2)) { halfShown = true; game.fx.popup('HALFWAY!', CX, H * 0.24, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.35); }
          if (passed >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); return; }
          if (spawned < TOTAL) spawnWall();
        } else {
          failFlash = 0.4; hitStop = 0.35; shake = 0.3;
          game.feedback.bad(CX, CAPSULE_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
          return;
        }
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { walls = []; spawned = 0; scrollDist = 0; capHue = 0; spawnWall(); }
    updateWalls(dt);
    var w = walls[walls.length - 1];
    if (w && !w.judged) {
      var wy = wallScreenY(w);
      if ((CAPSULE_Y - wy) < TELE_DIST * 1.3 && capHue !== w.colorIdx) {
        capHue = w.colorIdx;
        demo.gx = CX; demo.gy = CAPSULE_Y; demo.press = true;
        game.fx.burst(CX, CAPSULE_Y, { color: HUES[capHue], count: 8, speed: 180 });
        game.audio.play('se_tap', 0.1);
      } else { demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (walls === undefined) initGame();
      bg();
      stepDemo(dt);
      drawWalls(false);
      drawCapsule();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 34, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWalls(false);
      drawCapsule();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 40, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.10, 26, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '枚!', W / 2, H * 0.14, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { walls: passed, total: TOTAL });
        else game.end.failure({ walls: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateWalls(dt);
      timeLeft -= dt;
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; failFlash = 0.4; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, CAPSULE_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (failFlash > 0) failFlash -= dt;

    bg();
    drawWalls(failFlash > 0);
    drawCapsule();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 26, C.ink);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.90, W - 120, 16, C.wallGrey, 0.7);
    game.draw.rect(60, H * 0.90, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.80, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.15], ['E5', 0.15], ['G5', 0.15], ['C6', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

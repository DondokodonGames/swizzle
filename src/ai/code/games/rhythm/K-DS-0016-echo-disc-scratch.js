// K-DS-0016-echo-disc-scratch.js
// エコーディスクこすり — 光る合図が来たら、円盤を素早く往復にこすって音を鳴らす
// 操作: 合図が光っている間、円盤の上で指を左右に素早く往復させてこする
// 終わり: 規定回数(6回)の合図をこすり切れば成功。合図を3回逃せば失敗
// @mechanic: rub
// @theme: echo_disc_street_stage
// 世界観: 夜の広場に置かれた光る円盤の演台。合図灯が灯るたび、演者が円盤をこすって共鳴音を響かせ観衆を沸かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + こすり切った回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン
  var C = {
    bg: '#0a0018', bg2: '#170028', disc: '#1a0a2e', discEdge: '#ff2ea6',
    ring: '#00e5ff', good: '#39ff6a', bad: '#ff3355', gold: '#ffe600',
    white: '#ffffff', ink: '#05000a',
  };

  var GAME_TITLE = 'ECHO DISC';
  var TOTAL = 6;
  var MISS_LIMIT = 3;
  var CX = W * 0.5, CY = H * 0.5, R = 260;
  var NEED_RUB = 6; // 1回の合図につき必要な往復回数

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['..##..', '.####.', '..##..', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.circle(CX, CY, R + 60 + i * 30, C.ring, 0.03);
    }
    game.draw.sprite(PERFORMER, { '#': C.discEdge }, CX, H * 0.16, 22, { anchor: 'center' });
  }

  var cued, active, rubCount, lastX, lastDir, dirFlips, cueT, cueDur, cleared, misses, spin;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    cued = 0; cleared = 0; misses = 0; active = false; rubCount = 0; lastX = null; lastDir = 0; dirFlips = 0;
    cueT = 0; cueDur = 1.7; spin = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    scheduleNextCue();
  }

  var nextCueWait;
  function scheduleNextCue() { nextCueWait = 0.5; active = false; rubCount = 0; dirFlips = 0; lastX = null; lastDir = 0; }

  function startCue() {
    active = true; cueT = cueDur; rubCount = 0; dirFlips = 0; lastX = null; lastDir = 0;
    cued++;
    game.fx.popup('GO!', CX, CY - R - 60, { color: C.gold, size: 34 });
    game.audio.play('se_milestone', 0.25);
  }

  function onRub(x, y) {
    if (ready > 0 || done || finished || hitStop > 0 || !active) return;
    var d = Math.hypot(x - CX, y - CY);
    if (d > R + 80) return;
    game.audio.play('se_tap', 0.03);
    if (lastX !== null) {
      var dir = x - lastX;
      if (Math.abs(dir) > 6) {
        var nd = dir > 0 ? 1 : -1;
        if (nd !== lastDir && lastDir !== 0) { dirFlips++; spin += 0.35; }
        lastDir = nd;
      }
    }
    lastX = x;
    if (dirFlips >= rubCount * 2 + 2) {
      rubCount++;
      game.fx.burst(x, y, { color: C.ring, count: 8, speed: 220 });
      if (rubCount >= NEED_RUB) {
        active = false;
        cleared++;
        hitStop = 0.1;
        game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
        game.audio.play('se_good', 0.35);
        if (cleared >= Math.ceil(TOTAL / 2) && !milestoneShown) {
          milestoneShown = true;
          game.fx.popup(cleared + ' / ' + TOTAL, CX, CY - R - 100, { color: C.gold, size: 38 });
        }
        if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
        scheduleNextCue();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) onRub(x, y); });
  game.onMove(function(x, y) { if (state === S.PLAYING) onRub(x, y); });

  function missCue() {
    misses++;
    active = false;
    hitStop = 0.28;
    shake = 0.22;
    game.feedback.bad(CX, CY, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    scheduleNextCue();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(spinLocal, activeLocal, rubProgress) {
    bg();
    game.draw.circle(CX, CY, R + 20, C.discEdge, 0.5);
    game.draw.circle(CX, CY, R, C.disc);
    var notches = 14;
    for (var i = 0; i < notches; i++) {
      var a = (i / notches) * Math.PI * 2 + spinLocal;
      game.draw.line(CX + Math.cos(a) * (R - 30), CY + Math.sin(a) * (R - 30), CX + Math.cos(a) * R, CY + Math.sin(a) * R, C.ring, 4);
    }
    game.draw.circle(CX, CY, 50, activeLocal ? C.gold : C.ring, activeLocal ? 0.7 : 0.35);
    if (activeLocal) {
      game.draw.rect(CX - 140, CY + R + 40, 280, 18, C.ink, 0.5);
      game.draw.rect(CX - 140, CY + R + 40, 280 * Math.min(1, rubProgress), 18, C.gold);
    }
  }

  var demo = { t: 0, gx: CX - 100, gy: CY, press: false, spin: 0, active: false, rub: 0, cueT: 0, dir: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.active = false; demo.rub = 0; demo.cueT = 0; }
    demo.cueT += dt;
    if (!demo.active && demo.cueT > 0.4) { demo.active = true; demo.rub = 0; }
    if (demo.active) {
      demo.dir = Math.sin(demo.t * 22) > 0 ? 1 : -1;
      demo.gx = CX + demo.dir * 110;
      demo.press = true;
      demo.spin += dt * 6;
      demo.rub = Math.min(NEED_RUB, demo.rub + dt * 4.2);
      if (demo.rub >= NEED_RUB) demo.active = false;
    } else {
      demo.press = false;
      demo.gx = CX - 100;
    }
    active = demo.active; rubCount = Math.min(NEED_RUB, Math.round(demo.rub)); spin = demo.spin;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.spin, demo.active, demo.rub / NEED_RUB);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(spin, false, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - cleared <= 2) txt('あと' + (TOTAL - cleared) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, misses: misses });
        else game.end.failure({ cleared: cleared, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!active) {
        nextCueWait -= dt;
        if (nextCueWait <= 0) startCue();
      } else {
        cueT -= dt;
        spin += dt * (2 + rubCount);
        if (cueT <= 0) missCue();
      }
    }
    if (shake > 0) shake -= dt;

    var telegraph = !active && nextCueWait < 0.4;
    drawScene(spin, active, rubCount / NEED_RUB);
    if (telegraph && Math.floor(game.time.elapsed * 12) % 2 === 0) {
      game.draw.circle(CX, CY, R + 20, C.gold, 0.25);
    }

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 140, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

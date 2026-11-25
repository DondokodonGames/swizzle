// K-X-0011-twin-step-marcher.js
// ぜんまい行進隊 — 左右交互に踏み替える4方向パネルで、ぜんまい仕掛けの行進を合わせる
// 操作: 光って予告されたパネル(上下左右)を、拍のタイミングでタップして踏む。必ず左足→右足の順に交互
// 終わり: 8歩すべて拍に合わせて踏めれば成功。2回踏み外せば失敗
// @mechanic: alternate_tap
// @theme: windup_marching_drill
// 世界観: ぜんまい仕掛けの玩具兵隊の行進訓練場。左足パネルと右足パネルを拍に合わせて交互に踏み、隊列の歩調を揃える
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えられた歩数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度4色パレット、太い黒縁、小型液晶風の粗いドット
  var C = {
    bg: '#9bab7a', bg2: '#7c8f5e', panelOff: '#4a5a38', panelL: '#3a6ad4', panelR: '#d43a4a',
    marcher: '#2a3018', marcherLit: '#ffe060',
    good: '#3dcf6a', bad: '#e0304a', gold: '#ffcf3a', white: '#f0f4e0', ink: '#181c10',
  };

  var GAME_TITLE = 'TWIN STEP';
  var TOTAL = 8;
  var MISS_LIMIT = 2;
  var BEAT = 0.85;
  var WIN = 0.24;
  var GRACE = 0.7;

  var PADS = {
    up: { x: W * 0.5, y: H * 0.76, group: 'R' },
    down: { x: W * 0.5, y: H * 0.94, group: 'L' },
    left: { x: W * 0.22, y: H * 0.85, group: 'L' },
    right: { x: W * 0.78, y: H * 0.85, group: 'R' },
  };
  var L_DIRS = ['down', 'left'];
  var R_DIRS = ['up', 'right'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MARCH_A = ['.##.', '####', '.##.', '#..#'];
  var MARCH_B = ['.##.', '####', '.##.', '..##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#00000008');
  }

  function drawPads(litDir, blinkOn) {
    var keys = ['up', 'down', 'left', 'right'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], p = PADS[k];
      var base = p.group === 'L' ? C.panelL : C.panelR;
      var isLit = k === litDir && blinkOn;
      game.draw.circle(p.x, p.y, 96, C.panelOff, 0.5);
      game.draw.circle(p.x, p.y, isLit ? 84 : 70, base, isLit ? 0.95 : 0.55);
    }
  }

  function drawMarcher(frameA, nextGroup) {
    var y = H * 0.42;
    game.draw.circle(W * 0.5, y + 140, 100, '#00000018');
    game.draw.sprite(frameA ? MARCH_A : MARCH_B, { '#': C.marcher }, W * 0.5, y, 30, { anchor: 'center' });
    var col = nextGroup === 'L' ? C.panelL : C.panelR;
    game.draw.circle(W * 0.5 + (nextGroup === 'L' ? -70 : 70), y + 150, 22, col, 0.8);
  }

  var steps, stepIdx, correctN, done, endWait, finished, ready, hitStop, shake, resolvedThis, beatStart, misses, nextMilestone;

  function buildSteps() {
    var arr = [];
    var group = Math.random() < 0.5 ? 'L' : 'R';
    for (var i = 0; i < TOTAL; i++) {
      var pool = group === 'L' ? L_DIRS : R_DIRS;
      arr.push(pool[Math.floor(game.random(0, pool.length))]);
      group = group === 'L' ? 'R' : 'L';
    }
    return arr;
  }

  function beatTime(i) { return GRACE + 0.6 + i * BEAT; }

  var readyStartT = 0;
  function initGame() {
    steps = buildSteps(); stepIdx = 0; correctN = 0; misses = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; resolvedThis = false;
    readyStartT = 0; beatStart = beatTime(0); nextMilestone = 4;
  }

  function tryStep(dirTapped) {
    if (ready > 0 || done || finished || resolvedThis) return;
    resolvedThis = true;
    var target = steps[stepIdx];
    var t = (game.time.elapsed - readyStartT) - beatStart;
    if (dirTapped === target && Math.abs(t) <= WIN) {
      correctN++; hitStop = 0.06;
      game.feedback.good(PADS[target].x, PADS[target].y, { text: 'STEP', color: C.good });
      game.audio.play('se_good', 0.3);
      if (correctN >= nextMilestone && nextMilestone < TOTAL) {
        game.fx.popup(correctN + ' / ' + TOTAL, W / 2, H * 0.24, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
        nextMilestone += 4;
      }
      advance();
    } else {
      misses++; hitStop = 0.28; shake = 0.24;
      game.feedback.bad(PADS[dirTapped].x, PADS[dirTapped].y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      advance();
    }
  }

  function advance() {
    stepIdx++;
    if (stepIdx >= TOTAL) { ok = true; finished = true; finish(); return; }
    beatStart = beatTime(stepIdx);
    resolvedThis = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    var best = null, bestD = 1e9;
    var keys = ['up', 'down', 'left', 'right'];
    for (var i = 0; i < keys.length; i++) {
      var p = PADS[keys[i]];
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < bestD) { bestD = d; best = keys[i]; }
    }
    if (bestD < 110) tryStep(best);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepClock(dt) {
    if (!resolvedThis) {
      var t = (game.time.elapsed - readyStartT) - beatStart;
      if (t > WIN) {
        resolvedThis = true;
        misses++; hitStop = 0.28; shake = 0.24;
        var target = steps[stepIdx];
        game.feedback.bad(PADS[target].x, PADS[target].y, { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
        advance();
      }
    }
  }

  var demo = { t: 0, gx: PADS.down.x, gy: PADS.down.y, press: false };
  var demoSteps = ['down', 'up', 'left', 'right', 'down'];
  var demoIdx = 0, demoBeatStart = GRACE;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (GRACE + demoSteps.length * BEAT + 0.6);
    if (cyc < dt || demo.t <= dt) { demoIdx = 0; demoBeatStart = GRACE; }
    demo.press = false;
    if (demoIdx < demoSteps.length) {
      var bt = demoBeatStart + demoIdx * BEAT;
      var tt = cyc - bt;
      if (tt > -0.06 && tt < 0.08) {
        demo.gx = PADS[demoSteps[demoIdx]].x; demo.gy = PADS[demoSteps[demoIdx]].y; demo.press = true;
        if (tt > -0.06 && tt < 0.02) {
          game.feedback.good(demo.gx, demo.gy, { text: 'STEP', color: C.good });
          game.audio.play('se_good', 0.18);
        }
      }
      if (tt > 0.15) demoIdx++;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var upcoming = demoIdx < demoSteps.length ? demoSteps[demoIdx] : null;
      var upGroup = upcoming ? PADS[upcoming].group : 'L';
      var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
      drawPads(upcoming, blink);
      drawMarcher(Math.floor(game.time.elapsed * 4) % 2 === 0, upGroup);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.68, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.68, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPads(null, false);
      drawMarcher(true, 'L');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(correctN + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.ink);
      if (!ok) txt('あと' + (TOTAL - correctN) + '歩!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.68, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correctN, { steps: correctN, total: TOTAL, misses: misses });
        else game.end.failure({ steps: correctN, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { readyStartT = game.time.elapsed; game.audio.play('se_tap'); }
    } else if (!finished) {
      stepClock(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    var target = !finished && stepIdx < TOTAL ? steps[stepIdx] : null;
    var soon = false;
    if (target && ready <= 0) {
      var tt = (game.time.elapsed - readyStartT) - beatStart;
      soon = tt > -0.6 && tt < 0.35;
    }
    drawPads(soon ? target : null, Math.floor(game.time.elapsed * 10) % 2 === 0);
    drawMarcher(Math.floor(game.time.elapsed * 4) % 2 === 0, target ? PADS[target].group : 'L');

    txt(correctN + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    for (var m = 0; m < MISS_LIMIT; m++) game.draw.circle(W - 50 - m * 32, 190, 9, m < misses ? C.bad : '#00000030');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['C4', 0.25], ['G3', 0.25], ['G3', 0.25]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

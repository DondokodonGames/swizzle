// D-20132016-0080-outpost-single-barricade.js
// アウトポスト・シングルバリケード — 一枚の防壁板を柵の正しい隙間に間に合わせてはめ込む
// 操作: 予告で光る正しい隙間へ防壁板をドラッグし、群れが到達する前に離してはめ込む
// 終わり: 正しい隙間・正しいタイミングではめ込めれば成功。誤設置または間に合わなければ失敗
// @mechanic: gap_fit
// @theme: frontier_fence_breach
// 世界観: 開拓地の見張り番が、獣の群れが向かう柵の破れ目を見抜き、手持ちの一枚板を間に合わせて打ち込んで拠点を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 設置までの反応の速さ
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス3層、光源1つで陰影統一
  var C = {
    sky1: '#2a3a1a', sky2: '#1a2a12', ground: '#3a2a18', groundFar: '#2a1f12',
    fence: '#8a6a40', fenceDark: '#5a4428', gap: '#0a0a08',
    beast: '#7a3a2a', good: '#5affa0', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f0e0', ink: '#100c08',
  };

  var GAME_TITLE = 'LAST BARRICADE';
  var FENCE_Y = H * 0.54;
  var GAP_COUNT = 3;
  var GAP_XS = [W * 0.3, W * 0.5, W * 0.7];
  var MAX_TIME = 16;
  var WAVE_TRAVEL = 2.4;
  var TELEGRAPH_AT = WAVE_TRAVEL - 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARD_SPRITE = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];
  var BEAST_SPRITE = ['.#...#', '######', '#.###.', '.#.#.#'];
  var BOARD_SPRITE = ['#####', '#####', '#####', '#####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.5, C.sky2], [0.5, C.groundFar], [1, C.ground]]);
    var t = game.time.elapsed;
    for (var i = 0; i < 6; i++) game.draw.circle(W * (0.08 + i * 0.18), H * 0.2, 3, C.white, 0.3);
    // 遠景の鳥影: 常時ゆっくり流れる(ATTRACT中央ブラインドスポット対策の連続モーション)
    for (var b = 0; b < 3; b++) {
      var bx = ((t * (60 + b * 14) + b * 260) % (W + 200)) - 100;
      game.draw.circle(bx, H * (0.14 + b * 0.03), 7, C.white, 0.5);
    }
    var pulse = 0.05 + 0.05 * Math.sin(t * 1.7) + 0.03 * Math.sin(t * 3.9 + 1.1);
    game.draw.rect(0, 0, W, H, '#ffffff', Math.max(0, pulse));
  }

  function drawFence(gaps) {
    var segW = W / (GAP_COUNT * 2 + 1);
    for (var i = 0; i <= GAP_COUNT; i++) {
      var x = i * (W / GAP_COUNT);
      if (i < GAP_COUNT && gaps[i].filled) continue;
      game.draw.rect(x - 8, FENCE_Y - 90, 16, 90, C.fenceDark);
    }
    for (var g = 0; g < GAP_COUNT; g++) {
      if (gaps[g].filled) continue;
      game.draw.rect(GAP_XS[g] - segW * 0.7, FENCE_Y - 70, segW * 1.4, 70, C.gap, 0.5);
      if (gaps[g].telegraphed) {
        var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
        if (blink) game.draw.rect(GAP_XS[g] - segW * 0.7, FENCE_Y - 76, segW * 1.4, 10, C.bad);
      }
    }
  }

  var gaps, targetGap, wave, cardX, cardY, dragging, placed, milestoneCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function resetGaps() {
    gaps = [];
    for (var i = 0; i < GAP_COUNT; i++) gaps.push({ filled: false, telegraphed: false });
  }

  function initGame() {
    resetGaps();
    targetGap = Math.floor(Math.random() * GAP_COUNT);
    wave = { t: 0, dur: WAVE_TRAVEL, arrived: false };
    cardX = W * 0.5; cardY = H * 0.82; dragging = false; placed = false; milestoneCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function nearestGap(x, y) {
    var best = -1, bestD = 130;
    for (var i = 0; i < GAP_COUNT; i++) {
      var d = Math.hypot(GAP_XS[i] - x, (FENCE_Y - 35) - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function attemptPlace(x, y) {
    var g = nearestGap(x, y);
    if (g < 0) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      return;
    }
    placed = true;
    if (g === targetGap && !gaps[g].filled) {
      gaps[g].filled = true;
      ok = true; finished = true; hitStop = 0.15;
      game.feedback.good(GAP_XS[g], FENCE_Y - 35, { text: 'CLEAR', color: C.good });
      game.fx.burst(GAP_XS[g], FENCE_Y - 35, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(GAP_XS[g], FENCE_Y - 35, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.hypot(x - cardX, y - cardY) < 140) { dragging = true; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    cardX = x; cardY = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    dragging = false;
    attemptPlace(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(gapState, waveState, cx, cy, drag) {
    bg();
    drawFence(gapState);
    game.draw.sprite(GUARD_SPRITE, { '#': C.white }, W * 0.15, H * 0.6 + Math.sin(game.time.elapsed * 1.4) * 5, 20, { anchor: 'center' });
    if (waveState && !waveState.arrived) {
      var p = Math.min(1, waveState.t / waveState.dur);
      var bx = W * 1.15 + (GAP_XS[targetGap] - W * 1.15) * p;
      for (var k = 0; k < 3; k++) {
        game.draw.sprite(BEAST_SPRITE, { '#': C.beast }, bx + k * 40, FENCE_Y + 40 + k * 6, 16, { anchor: 'center' });
      }
    }
    var bob = drag ? 0 : Math.sin(game.time.elapsed * 2) * 6;
    game.draw.sprite(BOARD_SPRITE, { '#': C.fence }, cx, cy + bob, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.82, press: false, gap: 1, phase: 0 };
  function resetDemo() {
    resetGaps();
    demo.gap = Math.floor(Math.random() * GAP_COUNT);
    targetGap = demo.gap;
    gaps[demo.gap].telegraphed = false;
    cardX = W * 0.5; cardY = H * 0.82;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc > 0.6 && cyc < 2.0) gaps[demo.gap].telegraphed = true;
    if (cyc < 1.6) {
      demo.press = false;
      demo.gx = W * 0.5; demo.gy = H * 0.82;
      cardX = demo.gx; cardY = demo.gy;
    } else if (cyc < 2.3) {
      var t2 = (cyc - 1.6) / 0.7;
      demo.gx = W * 0.5 + (GAP_XS[demo.gap] - W * 0.5) * t2;
      demo.gy = H * 0.82 + ((FENCE_Y - 35) - H * 0.82) * t2;
      demo.press = true;
      cardX = demo.gx; cardY = demo.gy;
    } else if (cyc < 2.35 && !gaps[demo.gap].filled) {
      gaps[demo.gap].filled = true;
      game.feedback.good(GAP_XS[demo.gap], FENCE_Y - 35, { text: 'CLEAR', color: C.good });
      game.audio.play('se_success', 0.25);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gaps) initGame();
      stepDemo(dt);
      drawScene(gaps, null, cardX, cardY, demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(gaps, wave, cardX, cardY, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      if (!ok) txt('あと1歩!', W / 2, H * 0.13, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { gap: targetGap, placed: placed };
        if (ok) game.end.success(1, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      wave.t += dt;
      if (wave.t >= TELEGRAPH_AT) gaps[targetGap].telegraphed = true;
      if (!milestoneCalled && wave.t >= TELEGRAPH_AT) {
        milestoneCalled = true;
        game.fx.popup('あと少し!', GAP_XS[targetGap], FENCE_Y - 140, { color: C.bad, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (wave.t >= wave.dur && !wave.arrived) {
        wave.arrived = true;
        ok = false; finished = true; shake = 0.35; hitStop = 0.3;
        game.feedback.bad(GAP_XS[targetGap], FENCE_Y - 35, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene(gaps, wave, cardX, cardY, dragging);

    var progress = Math.max(0, 1 - wave.t / wave.dur);
    txt(Math.round(progress * 100) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * progress, 16, progress < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.5], ['G3', 0.5], ['C4', 0.5], ['E4', 1]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

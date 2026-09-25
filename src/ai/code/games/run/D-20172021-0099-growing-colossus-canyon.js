// D-20172021-0099-growing-colossus-canyon.js
// グローイングコロッサス・キャニオン — 進むごとに巨大化していく巨人を、崩れた渓谷の細い道からはみ出さぬようドラッグで導く
// 操作: 指で左右にドラッグして巨人を渓谷の道の中に保ちながら奥へ進める(縦方向は自動で進む)
// 終わり: 渓谷を最後まで壁に触れず進めば成功。壁に触れたら即座に失敗
// @mechanic: guide_path
// @theme: growing_colossus_canyon
// 世界観: 一歩ごとに巨大化していく渓谷の巨人が、自らの成長で狭まっていく崩落した道をはみ出さずに歩き切り、谷の出口を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離(%)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: くすんだ中間色+濃淡2階調の岩肌、鮮やかな主役色
  var C = {
    bg: '#3a2f4a', bg2: '#1e1830', rock: '#5a4a6a', rockDark: '#3a2c48',
    path: '#8a6aa0', pathWarn: '#ff9f4a',
    giant: '#5ad0a0', giantDark: '#2a8060',
    good: '#5ad0a0', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#120e1a',
  };

  var GAME_TITLE = 'COLOSSUS PATH';
  var TOP_Y = H * 0.20, BOT_Y = H * 0.82;
  var TOTAL_TIME = 17;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#08050c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GIANT_F = [
    ['.####.', '######', '.####.', '#.##.#'],
    ['.####.', '######', '.####.', '.#..#.'],
  ];

  function pathX(t) {
    return W / 2 + 250 * Math.sin(t * Math.PI * 2.1) + 90 * Math.sin(t * Math.PI * 5.2 + 1.1);
  }
  function corridorHalf(t) {
    var stage = t >= 0.66 ? 2 : t >= 0.33 ? 1 : 0;
    return 210 - stage * 58;
  }
  function stageOf(t) { return t >= 0.66 ? 2 : t >= 0.33 ? 1 : 0; }
  function giantPx(stage) { return 14 + stage * 6; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.1);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.25);
  }

  var progress, px, brushWarn, growAnnounced;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    progress = 0; px = pathX(0); brushWarn = 0; growAnnounced = [false, false];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawCorridor(prog) {
    var steps = 60;
    for (var i = 0; i <= steps; i++) {
      var t = (i / steps);
      if (t > prog + 0.04) break;
      var y = TOP_Y + t * (BOT_Y - TOP_Y);
      var cx = pathX(t);
      var half = corridorHalf(t);
      var warn = Math.abs(t - Math.max(0.33, 0.66)) < 0.015;
      game.draw.rect(cx - half - 26, y, 22, 12, warn ? C.pathWarn : C.rock, 0.9);
      game.draw.rect(cx + half + 4, y, 22, 12, warn ? C.pathWarn : C.rock, 0.9);
    }
    // 未到達部分の道筋をうっすら予告
    for (var j = 0; j <= steps; j++) {
      var t2 = j / steps;
      if (t2 <= prog + 0.04) continue;
      var y2 = TOP_Y + t2 * (BOT_Y - TOP_Y);
      var cx2 = pathX(t2);
      var half2 = corridorHalf(t2);
      game.draw.rect(cx2 - half2 - 26, y2, 22, 10, C.rockDark, 0.5);
      game.draw.rect(cx2 + half2 + 4, y2, 22, 10, C.rockDark, 0.5);
    }
  }

  function onDrag(x) {
    if (finished || ready > 0) return;
    px = Math.max(60, Math.min(W - 60, x));
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    onDrag(x);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function advance(dt) {
    var prevStage = stageOf(progress);
    progress += dt / TOTAL_TIME;
    if (progress > 1) progress = 1;
    var stage = stageOf(progress);
    if (stage > prevStage && !growAnnounced[stage - 1]) {
      growAnnounced[stage - 1] = true;
      game.fx.popup('NICE', W / 2, TOP_Y + progress * (BOT_Y - TOP_Y) - 90, { color: C.gold, size: 34 });
      game.audio.play('se_powerup', 0.35);
    }
    var t = progress;
    var half = corridorHalf(t);
    var dist = Math.abs(px - pathX(t));
    if (dist > half - giantPx(stage) * 2.2) {
      finished = true; ok = false; hitStop = 0.32; shake = 0.28;
      game.feedback.bad(px, TOP_Y + t * (BOT_Y - TOP_Y), { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (dist < half * 0.3) {
      brushWarn += dt;
      if (brushWarn > 1.2) { brushWarn = 0; game.feedback.good(px, TOP_Y + t * (BOT_Y - TOP_Y), { text: 'GOOD', color: C.good }); game.audio.play('se_good', 0.25); }
    }
    if (progress >= 1) {
      ok = true; finished = true; hitStop = 0.25;
      game.fx.burst(px, BOT_Y, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  var demo = { t: 0, gx: W / 2, gy: TOP_Y, press: true };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (TOTAL_TIME + 1.5);
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    else if (!finished) advance(dt);
    var target = pathX(progress);
    px = target;
    demo.gx = target;
    demo.gy = TOP_Y + progress * (BOT_Y - TOP_Y);
    demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      stepDemo(dt);
      bg();
      drawCorridor(progress);
      var stage = stageOf(progress);
      var f = Math.floor(game.time.elapsed * 5) % 2;
      game.draw.sprite(GIANT_F[f], { '#': C.giant }, px, TOP_Y + progress * (BOT_Y - TOP_Y), giantPx(stage), { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCorridor(progress);
      var pct = Math.round(progress * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctFinal = Math.round(progress * 100);
        if (ok) game.end.success(pctFinal, { percent: pctFinal });
        else game.end.failure({ percent: pctFinal });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      advance(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCorridor(progress);
    if (!finished) {
      var stage2 = stageOf(progress);
      var f2 = Math.floor(game.time.elapsed * 5) % 2;
      game.draw.sprite(GIANT_F[f2], { '#': C.giant }, px, TOP_Y + progress * (BOT_Y - TOP_Y), giantPx(stage2), { anchor: 'center' });
    }

    txt(Math.round(progress * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000055', 1);
    game.draw.rect(60, 150, (W - 120) * progress, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.4], ['G3', 0.4], ['B3', 0.4], ['E4', 0.8]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

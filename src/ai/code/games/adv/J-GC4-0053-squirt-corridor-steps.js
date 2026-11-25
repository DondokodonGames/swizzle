// J-GC4-0053-squirt-corridor-steps.js
// 水鉄砲廊下の一歩 — 一歩踏むたびに次の床の水鉄砲が作動する。ばねが戻りきって灯りがついた時だけ次の一歩を踏み、濡れずに奥の扉まで進む
// 操作: 画面タップで一歩進む。次の床の横の目盛りが満ちて灯りがつくまでは踏まない(早く踏むと水を浴びてMISS、ばねは巻き直し)
// 終わり: 10歩で奥の扉に着けばCLEAR。MISS 3回・時間切れでGAME OVER
// @mechanic: cooldown_tap
// @theme: squirt_corridor_steps
// 世界観: からくり師の屋敷の試しの廊下。見習いが、踏むと作動する水鉄砲床をばねの戻りを見極めて一歩ずつ渡り、濡れずに奥の工房の扉へたどり着く
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ歩数・PERFECT数
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット + 横帯のカラーセロハン
  var STYLE = {
    bg: ['#020202', '#0b0b0b', '#161616'],
    main: ['#f2f2f2', '#9a9a9a', '#444444'],
    accent: ['#ffd23f', '#44e0ff'],
  };
  var WHITE = STYLE.main[0];
  var BAND_TOP = STYLE.accent[0];
  var BAND_MID = STYLE.accent[1];
  var BAND_BOT = '#ff7a3d';
  var BAD_C = '#ff4b4b';

  var GAME_TITLE = 'SQUIRT CORRIDOR';
  var TIME_LIMIT = 15;
  var NEEDED = 10;
  var MAX_MISS = 3;
  var TILE_H = 210;
  var PLAYER_Y = 1330;
  var PERFECT_WIN = 0.18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var WALKER = [
    ['..ww..', '..ww..', '.wwww.', 'w.ww.w', '..ww..', '.w..w.', '.w..w.'],
    ['..ww..', '..ww..', '.wwww.', '.www.w', 'w.ww..', '..w.w.', '.w...w'],
  ];
  var NOZZLE = ['www.', 'wwww', 'www.'];
  var DOOR = ['wwwwww', 'w....w', 'w.ww.w', 'w....w', 'w...ww', 'w....w', 'wwwwww'];
  var FOOT = ['.ww.', 'wwww', 'wwww', '.ww.', '.ww.'];

  var step, resetT, resetNeed, feint, misses, perfects, timeLeft, ready, hitStop, ended, endWait, won, score;
  var scroll, spurt, readyAt, walkAnim, wet;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center', font: 'monospace' });
  }

  function armNext() {
    // 次の床のばねが戻るまでの時間(進むほど不規則に)
    var hard = step / NEEDED;
    resetNeed = game.random(0.4, 0.7 + hard * 0.4);
    resetT = 0;
    feint = step >= 4 && Math.random() < 0.35 ? { at: resetNeed * 0.8, done: false } : null;
    spurt = 0.3;
    readyAt = -1;
  }

  function initGame() {
    step = 0;
    misses = 0;
    perfects = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    scroll = 0;
    walkAnim = 0;
    wet = 0;
    armNext();
  }

  function isReset() {
    return resetT >= resetNeed;
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.4;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function tryStep(demo) {
    if (ended || hitStop > 0 || scroll > 0) return;
    if (!isReset()) {
      // 早すぎ: 水を浴びる
      misses++;
      wet = 0.6;
      hitStop = 0.35;
      spurt = 0.45;
      game.feedback.bad(W / 2, PLAYER_Y - 200, { text: 'MISS', volume: demo ? 0 : undefined });
      if (!demo) game.audio.play('se_break', 0.2);
      resetT = 0;
      if (feint) feint.done = false;
      return;
    }
    var late = resetT - resetNeed;
    var perfect = late <= PERFECT_WIN;
    if (perfect) perfects++;
    step++;
    score += perfect ? 150 : 100;
    scroll = 0.22;
    walkAnim = 0.22;
    game.feedback.good(W / 2, PLAYER_Y - 220, { text: perfect ? 'PERFECT' : 'GOOD', color: BAND_MID, count: perfect ? 14 : 6, volume: demo ? 0 : undefined });
    if (!demo) game.audio.play('se_jump', 0.25);
    if (!demo && step === 5) {
      game.fx.popup(step + ' / ' + NEEDED, W / 2, 360, { color: BAND_TOP, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
    if (step >= NEEDED) {
      if (!demo) endGame(true, demo);
      return;
    }
    armNext();
  }

  function stepWorld(dt, demo) {
    if (scroll > 0) scroll = Math.max(0, scroll - dt);
    if (walkAnim > 0) walkAnim -= dt;
    if (spurt > 0) spurt -= dt;
    if (wet > 0) wet -= dt;
    if (scroll > 0) return;
    var was = isReset();
    resetT += dt;
    // フェイント: 満ちかけて一度ガクッと戻る
    if (feint && !feint.done && resetT >= feint.at) {
      feint.done = true;
      resetT = feint.at * 0.45;
      if (!demo) game.audio.tone('E3', 0.08, { wave: 'square', volume: 0.06 });
    }
    if (!was && isReset()) {
      readyAt = game.time.elapsed;
      if (!demo) game.audio.tone('A5', 0.06, { wave: 'square', volume: 0.06 });
    }
  }

  // ── 描画 ──
  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[2]], [0.5, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 星のような白ドット
    for (var i = 0; i < 40; i++) {
      var x = (i * 137) % W, y = (i * 311 + Math.floor(t * 20)) % H;
      game.draw.rect(x, y, 3, 3, WHITE, 0.08 + 0.05 * Math.sin(t * 3 + i));
    }
    game.draw.rect(0, 0, W, H, WHITE, 0.015 + 0.015 * Math.sin(t * 1.4));
  }

  function tileY(k) {
    // k: 自分の床から何枚先か(0=足元)
    var s = scroll > 0 ? (1 - scroll / 0.22) * TILE_H : 0;
    return PLAYER_Y - k * TILE_H + s;
  }

  function drawCorridor() {
    var t = game.time.elapsed;
    // 壁
    game.draw.rect(170, 240, 10, 1260, WHITE, 0.8);
    game.draw.rect(W - 180, 240, 10, 1260, WHITE, 0.8);
    for (var k = -1; k <= 5; k++) {
      var y = tileY(k);
      var idx = step + k;
      if (y < 220 || y > 1520) continue;
      if (idx > NEEDED) continue;
      if (idx === NEEDED) {
        game.draw.sprite(DOOR, { w: WHITE }, W / 2, y - 60, 22, { anchor: 'center' });
        continue;
      }
      // 床板(白ドットの枠)
      for (var d = 0; d < 20; d++) {
        game.draw.rect(200 + d * 34, y - 6, 18, 6, WHITE, k === 1 ? 0.95 : 0.45);
      }
      if (k >= 1 && idx < NEEDED) {
        // 水鉄砲のノズル
        game.draw.sprite(NOZZLE, { w: WHITE }, 200, y - 90, 12, { anchor: 'center' });
      }
    }
    // 次の床のばね目盛り(満ちると灯り)
    var ny = tileY(1);
    if (step < NEEDED) {
      var f = Math.min(1, resetT / resetNeed);
      for (var g = 0; g < 8; g++) {
        var on = g < Math.floor(f * 8);
        game.draw.rect(W - 150, ny - 30 - g * 22, 40, 16, on ? BAND_MID : STYLE.main[2]);
      }
      var lit = isReset() && scroll <= 0;
      game.draw.circle(W - 130, ny - 230, 30, lit ? BAND_TOP : STYLE.main[2]);
      if (lit) game.draw.circle(W - 130, ny - 230, 44 + Math.sin(t * 12) * 4, BAND_TOP, 0.3);
      // 作動中の水しぶき
      if (spurt > 0 || !isReset()) {
        var a = spurt > 0 ? 0.95 : 0.35;
        for (var s = 0; s < 14; s++) {
          var sx = 230 + ((s * 53 + t * 900) % 620);
          game.draw.rect(sx, ny - 110 + Math.sin(s + t * 20) * 10, 10, 6, BAND_MID, a);
        }
      }
    }
  }

  function drawWalker() {
    var t = game.time.elapsed;
    var frame = walkAnim > 0 ? 1 : Math.floor(t * 2) % 2;
    var y = PLAYER_Y - 70 + Math.sin(t * 3) * 4;
    game.draw.sprite(WALKER[frame], { w: WHITE }, W / 2 + Math.sin(t * 1.2) * 5, y, 22, { anchor: 'center' });
    if (wet > 0) {
      for (var i = 0; i < 8; i++) game.draw.rect(W / 2 - 80 + i * 22, y - 60 + ((t * 400 + i * 30) % 120), 6, 12, BAND_MID, 0.9);
    }
    if (hitStop > 0) {
      var g = (0.35 - hitStop) * 140;
      game.draw.rect(W / 2 - 80 - g / 2, y - 90 - g / 2, 160 + g, 180 + g, WHITE, 0.35);
    }
  }

  function drawBands() {
    // カラーセロハン帯(上・中・下)
    game.draw.rect(0, 0, W, 240, BAND_TOP, 0.16);
    game.draw.rect(0, 240, W, 1200, BAND_MID, 0.06);
    game.draw.rect(0, 1440, W, H - 1440, BAND_BOT, 0.16);
  }

  function drawPad() {
    var t = game.time.elapsed;
    var y = H * 0.84;
    var lit = isReset() && scroll <= 0 && step < NEEDED;
    game.draw.circle(W / 2, y, 140, lit ? WHITE : STYLE.main[2], lit ? 0.25 + 0.1 * Math.sin(t * 8) : 0.25);
    game.draw.sprite(FOOT, { w: WHITE }, W / 2, y, 26, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W / 2 - 80 + m * 80, y + 200, 18, m < MAX_MISS - misses ? WHITE : STYLE.main[2]);
  }

  function drawScene() {
    drawBackground();
    drawCorridor();
    drawWalker();
    drawPad();
    drawBands();
  }

  function drawHud() {
    txt(step + ' / ' + NEEDED, 70, 110, 54, BAND_TOP, 'left');
    txt('SCORE ' + score, W - 70, 110, 38, WHITE, 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 165, W - 140, 14, STYLE.main[2]);
    game.draw.rect(70, 165, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 14, low ? BAD_C : WHITE);
  }

  // ── ATTRACT ゴースト実演: 灯りを待って踏む/待たずに踏んで濡れる ──
  var demo = { t: 0, press: false, loop: 0, wait: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.loop++; }
    demo.wait -= dt;
    demo.press = demo.wait > 0.1;
    var hasty = demo.loop % 2 === 0 && step === 2 && misses === 0;
    if (demo.wait <= 0 && hitStop <= 0 && scroll <= 0) {
      if (hasty && resetT > resetNeed * 0.4) { tryStep(true); demo.wait = 0.25; }
      else if (isReset() && resetT - resetNeed > 0.08) { tryStep(true); demo.wait = 0.25; }
    }
    if (hitStop > 0) hitStop -= dt;
    else stepWorld(dt, true);
    if (step >= NEEDED) { step = 0; armNext(); }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
    if (ready > 0 || ended) return;
    game.audio.play('se_tap', 0.2);
    if (hitStop > 0 || scroll > 0) {
      game.fx.burst(x, y, { color: WHITE, count: 3, speed: 80 });
      return;
    }
    tryStep(false);
  });

  game.onUpdate(function (dt) {
    if (step === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, H * 0.85, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 60, BAND_TOP);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 32, WHITE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, BAND_TOP);
      else txt('INSERT COIN', W / 2, H * 0.975, 32, WHITE);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 250, W, 400, '#000000', 0.8);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 360, 88, won ? BAND_MID : BAD_C);
      txt('SCORE ' + score, W / 2, 440, 46, WHITE);
      txt(step + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, 510, 36, BAND_TOP);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 580, 42, BAND_TOP);
      else txt('BEST ' + (game.best || 0), W / 2, 580, 34, STYLE.main[1]);
      if (!won) txt('あと' + (NEEDED - step) + '歩!', W / 2, 630, 36, BAND_BOT);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 34, WHITE);
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { steps: step, perfects: perfects, misses: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && misses >= MAX_MISS) endGame(false, false);
    } else {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
        endGame(false, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, BAND_TOP);
  });

  game.onStart(function () {
    game.audio.melody(
      [['E4', 0.25], ['E4', 0.25], ['G4', 0.5], ['E4', 0.25], ['D4', 0.25], ['C4', 0.5], ['D4', 0.5], ['E4', 1]],
      { tempo: 112, wave: 'square', volume: 0.04, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

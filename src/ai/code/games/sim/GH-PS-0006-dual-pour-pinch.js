// GH-PS-0006-dual-pour-pinch.js
// デュアルポア — 両手の親指で2つの注ぎ口を同時に押さえて、2つのグラスを揃って満たす
// 操作: 合図の光で両方のレバーを同時に押す(2本指)。片方だけ押すと液面がずれて溢れる
// 終わり: 5回の合図を全部そろえて注げれば成功。液面差が閾値を超えて溢れれば失敗
// @mechanic: pinch_zone
// @theme: twin_tap_soda_counter
// 世界観: 昔ながらのソーダ売り場。左右のレバーを両手で同時に押さないと片方だけ噴き出して溢れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えて注げた回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // SKEUOMORPH: 木目・フェルト・革の質感。gradient+細線。ボタンは上明下暗+白ハイライトで厚みを出す
  var C = {
    wood1: '#8a5a3a', wood2: '#5c3a22', counter: '#c8a878', glass: '#eaf4f8', glassEdge: '#9ac4d8',
    soda: '#f2a83a', sodaLight: '#ffce7a', lever: '#8a3a2a', leverLit: '#e04a2a',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#fff8ec', ink: '#2a1a10',
  };

  var GAME_TITLE = 'DUAL POUR';
  var NEEDED = 5, SPILL_LIMIT = 46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, roundsN = 0, elapsedRound = 0;

  var LX = W * 0.28, RX = W * 0.72, LEVER_Y = H * 0.68, GLASS_Y0 = H * 0.36, GLASS_Y1 = H * 0.60;

  var levelL, levelR, pulseOn, pulseT, pulseWindow, pressL, pressR, pressLId, pressRId;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CUP_SPRITE = ['#..#', '#..#', '####'];

  function counterBg() {
    game.draw.gradient(0, H, [[0, C.wood1], [1, C.wood2]]);
    for (var i = 0; i < 16; i++) game.draw.rect(0, i * (H / 16), W, 2, '#000000', 0.06);
    game.draw.rect(0, H * 0.72, W, H * 0.28, C.counter);
    game.draw.rect(0, H * 0.72, W, 8, '#000000', 0.2);
  }

  function drawGlass(x, level, spilling) {
    game.draw.rect(x - 6, GLASS_Y0 - 6, 132, GLASS_Y1 - GLASS_Y0 + 12, C.glassEdge);
    game.draw.rect(x, GLASS_Y0, 120, GLASS_Y1 - GLASS_Y0, C.glass, 0.85);
    var fillH = (GLASS_Y1 - GLASS_Y0) * (level / 100);
    game.draw.rect(x, GLASS_Y1 - fillH, 120, fillH, spilling ? C.leverLit : C.soda);
    game.draw.rect(x, GLASS_Y1 - fillH, 120, 6, C.sodaLight, 0.8);
    game.draw.sprite(CUP_SPRITE, { '#': C.glassEdge }, x + 60, GLASS_Y0 - 30, 14, { anchor: 'center' });
  }

  function initGame() {
    levelL = 20; levelR = 20; roundsN = 0; elapsedRound = 0;
    pulseOn = false; pulseT = 1.0; pulseWindow = 0.85;
    pressL = false; pressR = false; pressLId = null; pressRId = null;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function newPulseGap() { return Math.max(0.55, 1.15 - roundsN * 0.08); }

  function resolvePulseEnd() {
    var synced = pressL && pressR;
    if (synced) {
      hitStop = 0.08;
      levelL = Math.min(100, levelL + 16); levelR = Math.min(100, levelR + 16);
      roundsN++;
      game.feedback.good((LX + RX) / 2, LEVER_Y - 200, { text: 'SYNC', color: C.good });
      game.fx.burst(LX + 60, GLASS_Y1 - 40, { color: C.gold, count: 10, speed: 260 });
      game.fx.burst(RX + 60, GLASS_Y1 - 40, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_success', 0.35);
      if (roundsN >= NEEDED) { ok = true; finished = true; finish(); return; }
      game.fx.popup(roundsN + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 40 });
      if (roundsN === NEEDED - 1) game.audio.play('se_milestone', 0.3);
    } else {
      hitStop = 0.06;
      if (pressL) levelL = Math.min(100, levelL + 22); else levelL = Math.max(0, levelL - 6);
      if (pressR) levelR = Math.min(100, levelR + 22); else levelR = Math.max(0, levelR - 6);
      game.feedback.bad((LX + RX) / 2, LEVER_Y - 200, { text: 'MISS' });
      shake = 0.14;
      game.audio.play('se_bad', 0.3);
    }
  }

  function checkSpill() {
    var diff = Math.abs(levelL - levelR);
    if (diff > SPILL_LIMIT || levelL >= 100 || levelR >= 100) {
      ok = false; finished = true;
      var sx = levelL > levelR ? LX : RX;
      game.feedback.bad(sx + 60, GLASS_Y0, { text: 'SPILL' });
      shake = 0.24;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || done || finished) return;
    if (x < W / 2 && !pressL) { pressL = true; pressLId = id; game.audio.play('se_tap', 0.06); }
    else if (x >= W / 2 && !pressR) { pressR = true; pressRId = id; game.audio.play('se_tap', 0.06); }
  });
  game.onRelease(function(x, y, id) {
    if (id === pressLId) { pressL = false; pressLId = null; }
    if (id === pressRId) { pressR = false; pressRId = null; }
    if (state === S.PLAYING) game.audio.play('se_tap', 0.03);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok && roundsN < NEEDED) game.audio.play('se_failure', 0.3);
    endWait = 1.3;
  }

  var demo = { t: 0, gxL: LX + 60, gyL: LEVER_Y, gxR: RX + 60, gyR: LEVER_Y, press: false, phase: 'wait', pt: 0.8 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.pt -= dt;
    if (demo.phase === 'wait' && demo.pt <= 0) { demo.phase = 'press'; demo.pt = 0.35; pulseOn = true; }
    else if (demo.phase === 'press') {
      demo.press = true;
      if (demo.pt <= 0) {
        demo.phase = 'wait'; demo.pt = 0.9; pulseOn = false;
        pressL = true; pressR = true; resolvePulseEnd(); pressL = false; pressR = false;
        demo.press = false;
        if (roundsN >= NEEDED) { roundsN = 0; levelL = 20; levelR = 20; }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (levelL === undefined) initGame();
      counterBg();
      stepDemo(dt);
      drawGlass(LX, levelL, false);
      drawGlass(RX, levelR, false);
      game.draw.rect(LX + 20, LEVER_Y, 80, 60, pulseOn ? C.leverLit : C.lever);
      game.draw.rect(RX + 20, LEVER_Y, 80, 60, pulseOn ? C.leverLit : C.lever);
      game.draw.rect(LX + 20, LEVER_Y, 80, 10, '#ffffff', 0.3);
      game.draw.rect(RX + 20, LEVER_Y, 80, 10, '#ffffff', 0.3);
      game.draw.hand(demo.gxL, demo.gyL + 40, { press: demo.press, scale: 13 });
      game.draw.hand(demo.gxR, demo.gyR + 40, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + NEEDED : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 38, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      counterBg();
      drawGlass(LX, levelL, false);
      drawGlass(RX, levelR, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(roundsN + ' / ' + NEEDED, W / 2, H * 0.13, 32, C.gold);
      if (!ok && roundsN === NEEDED - 1) txt('あと1杯!', W / 2, H * 0.18, 28, C.bad);
      var best = Math.max(game.best, roundsN);
      txt('BEST ' + best, W / 2, H * 0.90, 28, C.gold);
      if (roundsN > game.best) txt('NEW RECORD', W / 2, H * 0.95, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(roundsN, { roundsN: roundsN });
        else game.end.failure({ roundsN: roundsN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
      pulseT -= dt;
      if (!pulseOn && pulseT <= 0) { pulseOn = true; pulseWindow = 0.7; game.audio.play('se_tap', 0.1); }
      else if (pulseOn) {
        pulseWindow -= dt;
        if (pulseWindow <= 0) { resolvePulseEnd(); pulseOn = false; pulseT = newPulseGap(); }
      }
      if (!pulseOn) { levelL = Math.max(0, levelL - 4 * dt); levelR = Math.max(0, levelR - 4 * dt); }
      checkSpill();
    }
    if (shake > 0) shake -= dt;

    counterBg();
    drawGlass(LX, levelL, levelL > 92);
    drawGlass(RX, levelR, levelR > 92);
    game.draw.rect(LX + 20, LEVER_Y, 80, 60, pulseOn ? C.leverLit : (pressL ? C.leverLit : C.lever));
    game.draw.rect(RX + 20, LEVER_Y, 80, 60, pulseOn ? C.leverLit : (pressR ? C.leverLit : C.lever));
    game.draw.rect(LX + 20, LEVER_Y, 80, 10, '#ffffff', 0.3);
    game.draw.rect(RX + 20, LEVER_Y, 80, 10, '#ffffff', 0.3);

    txt(roundsN + ' / ' + NEEDED, W / 2, H * 0.15, 34, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['A4', 0.2], ['E4', 0.2]], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

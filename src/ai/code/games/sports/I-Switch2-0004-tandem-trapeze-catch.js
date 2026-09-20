// I-Switch2-0004-tandem-trapeze-catch.js
// タンデムトラピーズ — 手を繋いだ空中ブランコの二人組が、バーが来た瞬間に2本指で同時に掴む
// 操作: 揺れるバーが自分の高さに来た合図で、画面を2本指同時にタップして掴む
// 終わり: 規定回数(5回)を全て掴めば成功。タイミングを外すか1本指しか触れなければ失敗
// @mechanic: pinch_zone
// @theme: aerial_duo_catch
// 世界観: 旅回りの空中曲芸団。手を繋いだ二人組のフライヤーが、振り子のバーが最接近した瞬間に揃って両手で掴む花形演目
// 残るもの: 正誤(CLEAR/GAME OVER) + 掴んだ回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン、太いネオン管の縁取り
  var C = {
    bg: '#0a0018', bg2: '#1a0030', rope: '#5a1a7a', ropeGlow: '#ff2e88',
    bar: '#00e5ff', barGlow: '#0a3a44', good: '#39ff6a', bad: '#ff3355',
    gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'TANDEM CATCH';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.46;
  var CATCH_R = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, done, endWait, finished;
  var ready, hitStop, shake;
  var swing, telegraphed, resolved;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DUO_A = ['.##.', '####', '.##.', '#..#'];
  var DUO_B = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.line(W * 0.5, 0, W * 0.5, H * 0.1, C.rope, 4);
    for (var i = 0; i < 3; i++) {
      game.draw.circle(W * (0.2 + i * 0.3), H * 0.12, 10, C.ropeGlow, 0.5);
    }
  }

  function swingX(sw) {
    return CX + Math.sin(sw.t / sw.dur * Math.PI) * sw.amp * (sw.dir);
  }

  function newSwing(round) {
    return { t: 0, dur: Math.max(0.9, 1.5 - round * 0.06), amp: W * 0.32, dir: (round % 2 === 0) ? -1 : 1 };
  }

  function initGame() {
    caught = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    telegraphed = false; resolved = false;
    swing = newSwing(0);
  }

  function attemptCatch() {
    if (resolved || ready > 0 || done || finished || !swing) return;
    resolved = true;
    var barX = swingX(swing);
    var barY = CY - Math.abs(Math.sin(swing.t / swing.dur * Math.PI)) * 0 + CY * 0; // bar stays on horizontal line
    var dist = Math.abs(barX - CX);
    var fingers = game.touches ? game.touches.length : 1;
    var atPeak = swing.t / swing.dur > 0.38 && swing.t / swing.dur < 0.62;
    var correct = atPeak && dist < CATCH_R && fingers >= 2;
    hitStop = correct ? 0.12 : 0.35;
    if (correct) {
      caught++;
      game.feedback.good(barX, CY, { text: 'CATCH', color: C.good });
      game.fx.burst(barX, CY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(barX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
    swing = newSwing(caught);
    telegraphed = false; resolved = false;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    attemptCatch();
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

  function drawScene(sw, activeCaught) {
    if (!sw) return;
    var barX = swingX(sw);
    var p = sw.t / sw.dur;
    var nearPeak = p > 0.38 && p < 0.62;
    // telegraph: 0.5-0.8s window before peak, blinking marker
    if (p > 0.15 && p < 0.62) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX, CY, CATCH_R, C.gold, 0.15);
    }
    game.draw.line(barX, CY - 260, barX, CY - 60, C.ropeGlow, 6);
    game.draw.line(barX - 90, CY - 60, barX + 90, CY - 60, C.barGlow, 20);
    game.draw.line(barX - 90, CY - 60, barX + 90, CY - 60, C.bar, 12);
    var flip = sw.dir < 0;
    game.draw.sprite(DUO_A, { '#': C.gold }, barX - 40, CY, 20, { anchor: 'center', flipX: flip });
    game.draw.sprite(DUO_B, { '#': C.white }, barX + 40, CY, 20, { anchor: 'center', flipX: flip });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, sw: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.sw) { demo.sw = newSwing(0); }
    demo.sw.t += dt;
    swing = demo.sw;
    var p = demo.sw.t / demo.sw.dur;
    if (p > 0.38 && p < 0.62 && !demo.pressed) {
      demo.pressed = true;
      demo.press = true;
      game.feedback.good(CX, CY, { text: 'CATCH', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) {
      demo.sw = null; demo.press = false; demo.pressed = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(swing, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(null, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      swing.t += dt;
      if (swing.t / swing.dur >= 1 && !resolved) {
        resolved = true;
        hitStop = 0.35;
        var barX = swingX(swing);
        game.feedback.bad(barX, CY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(swing, false);

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

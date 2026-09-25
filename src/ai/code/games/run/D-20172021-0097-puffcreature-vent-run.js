// D-20172021-0097-puffcreature-vent-run.js
// パフクリーチャー・ベントラン — 膨らんだ生き物を走らせ、壁の隙間をくぐるたびに一段しぼませて次の狭い隙間に備える
// 操作: 指を押したまま左右に動かし、壁の光る隙間の位置へ体をホールド移動させて通り抜ける
// 終わり: 隙間を3回以上くぐり抜ければ成功。壁にぶつかる回数が規定を超えると失敗
// @mechanic: dodge
// @theme: puffcreature_vent_run
// 世界観: 気圧調整トンネルを走る膨張生物が、通るたびに体内の空気を抜いて一段小さくなり、次第に狭まる壁の隙間へ滑り込んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐり抜けた隙間数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 彩度高めのパステル寄り原色、太い黒縁
  var C = {
    bg: '#7fd8ff', bg2: '#3fa8e0', tunnel: '#1c3a52', wall: '#2f5f7a', wallDark: '#1a3648',
    gap: '#ffe14d', body: '#ff8fd1', bodyDark: '#c2409a', bodySmall: '#ffb3e0',
    good: '#3df08a', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#0b1c28',
  };

  var GAME_TITLE = 'VENT RUN';
  var RUNNER_Y = H * 0.78;
  var GATE_START_Y = H * 0.22;
  var TOTAL_GATES = 6;
  var GATE_TRAVEL = 2.3;
  var NEED_PASSES = 3;
  var MAX_MISSES = 2;
  var LANE_MIN = W * 0.18, LANE_MAX = W * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#082030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BODY_BIG = ['..####..', '.######.', '########', '.######.', '..####..'];
  var BODY_MED = ['.####.', '######', '######', '.####.'];
  var BODY_SMALL = ['.##.', '####', '.##.'];
  function bodyFrame(size) { return size === 2 ? BODY_BIG : size === 1 ? BODY_MED : BODY_SMALL; }
  function bodyPx(size) { return size === 2 ? 16 : size === 1 ? 14 : 12; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.4);
    game.draw.rect(0, H * 0.08, W, H * 0.84, C.tunnel);
  }

  var size, x, gateIdx, gateT, gateGapX, gateGapW, gateResolved, telegraphOn;
  var passCount, missCount;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function gapWidthFor(sz) { return sz === 2 ? 420 : sz === 1 ? 300 : 200; }

  function newGate() {
    // 要求サイズは通過数に応じて段階的に狭くなる(自然な難易度曲線)
    var req = passCount >= 2 ? 0 : passCount >= 1 ? 1 : 2;
    gateGapW = gapWidthFor(req);
    gateGapX = LANE_MIN + gateGapW / 2 + Math.random() * (LANE_MAX - LANE_MIN - gateGapW);
    gateT = 0; gateResolved = false; telegraphOn = false;
  }

  function initGame() {
    size = 2; x = W / 2; gateIdx = 0; passCount = 0; missCount = 0; milestoneShown = false;
    newGate();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveGate() {
    if (gateResolved) return;
    gateResolved = true;
    var half = gateGapW / 2;
    var fits = Math.abs(x - gateGapX) < half - bodyPx(size) * 1.5;
    if (fits) {
      passCount++;
      if (size > 0) size--;
      game.feedback.good(x, RUNNER_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (passCount === NEED_PASSES - 1 && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, RUNNER_Y - 220, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
    } else {
      missCount++;
      hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, RUNNER_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
  }

  function advance(dt) {
    gateT += dt;
    if (!telegraphOn && gateT >= GATE_TRAVEL - 0.7) telegraphOn = true;
    if (gateT >= GATE_TRAVEL) {
      if (!gateResolved) resolveGate();
      gateIdx++;
      if (missCount > MAX_MISSES) {
        ok = false; finished = true; hitStop = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      if (passCount >= NEED_PASSES || gateIdx >= TOTAL_GATES) {
        ok = passCount >= NEED_PASSES;
        finished = true; hitStop = 0.25;
        if (ok) { game.fx.burst(x, RUNNER_Y, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); }
        else game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      newGate();
    }
  }

  game.onTap(function(x2, y2) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(px, sz, gT, gapX, gapW, showTel) {
    var gy = GATE_START_Y + (gT / GATE_TRAVEL) * (RUNNER_Y - GATE_START_Y - 60);
    var wallCol = showTel ? (Math.floor(game.time.elapsed * 8) % 2 === 0 ? C.wallDark : C.wall) : C.wall;
    game.draw.rect(W * 0.08, gy - 34, (gapX - gapW / 2) - W * 0.08, 68, wallCol);
    game.draw.rect(gapX + gapW / 2, gy - 34, (W * 0.92) - (gapX + gapW / 2), 68, wallCol);
    game.draw.rect(gapX - gapW / 2, gy - 6, gapW, 12, showTel ? C.gap : C.gap, showTel ? 1 : 0.5);
    var f = Math.floor(game.time.elapsed * 6) % 2;
    var frames = bodyFrame(sz);
    game.draw.sprite(frames, { '#': sz === 0 ? C.bodySmall : C.body }, px, RUNNER_Y + Math.sin(game.time.elapsed * 6) * 4, bodyPx(sz), { anchor: 'center' });
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.94, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    else if (!finished) advance(dt);
    var tx = gateGapX;
    x += (tx - x) * Math.min(1, dt * 9);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy = H * 0.94;
    demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.PLAYING && game.input.pressing) {
      var tx0 = Math.max(LANE_MIN, Math.min(LANE_MAX, game.input.x));
      x += (tx0 - x) * Math.min(1, dt * 9);
    }
    if (state === S.ATTRACT) {
      if (x === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(x, size, gateT, gateGapX, gateGapW, telegraphOn);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(x, size, gateT, gateGapX, gateGapW, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(passCount + ' / ' + NEED_PASSES, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEED_PASSES - passCount) + '個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passCount, { passes: passCount, misses: missCount });
        else game.end.failure({ passes: passCount, misses: missCount });
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
    drawScene(x, size, gateT, gateGapX, gateGapW, telegraphOn);

    txt(passCount + ' / ' + NEED_PASSES, W / 2, H * 0.06, 30, C.white);
    var pct = gateIdx / TOTAL_GATES;
    game.draw.rect(60, 150, W - 120, 16, '#00000055', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.25], ['C5', 0.25], ['E5', 0.25], ['A5', 0.5]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

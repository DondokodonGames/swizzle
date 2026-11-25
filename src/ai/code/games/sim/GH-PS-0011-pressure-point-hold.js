// GH-PS-0011-pressure-point-hold.js
// プレッシャーポイント・ホールド — 光る指圧点を、ちょうどの時間だけ押し続けて離す
// 操作: 指圧点を押し始めるとゲージが伸びる。緑帯に入ったところで指を離す。早すぎ/遅すぎは失敗
// 終わり: 3点とも当てればCLEAR。2回ミスでGAME OVER。3点目は黄金ポイントでPERFECTがボーナス
// @mechanic: hold_duration
// @theme: acupressure_parlor
// 世界観: 指圧院の施術シーン。患者の背中に浮かぶ光点を、長すぎず短すぎない“ちょうど”の時間だけ押さえて効かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + PERFECT数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s ARCADE POP: 原色+白縁。明るい背景、太い白縁取り文字、光の柱・星
  var C = {
    bg1: '#fff3d6', bg2: '#ffd9ec', patient: '#ffcf8a', patientDark: '#f0a850',
    zoneOk: '#4de08a', zoneBad: '#ffe36a', point: '#ff5fae', pointGold: '#ffd400',
    good: '#28c96a', bad: '#ff3d5a', white: '#ffffff', ink: '#3a2a1a',
  };

  var GAME_TITLE = 'POINT HOLD';
  var NEEDED = 3, LOSE = 2;
  var CX = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, hits, misses, perfects, pressT, pressing, targetLo, targetHi, pointX, pointY, isGolden;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var POINTS = [
    { x: CX, y: H * 0.36 },
    { x: CX - 140, y: H * 0.46 },
    { x: CX + 140, y: H * 0.46 },
  ];
  var MAX_HOLD = 1.4;

  function parlorBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, '#ffe9f2'], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff', 0.5);
    // 光の柱(祝祭演出)
    for (var j = 0; j < 5; j++) game.draw.rect(W * (0.1 + j * 0.2), 0, 30, H, '#ffffff', 0.04);
  }

  var PATIENT_BODY = ['.####.', '######', '######', '######', '.####.'];

  function drawPatient() {
    game.draw.sprite(PATIENT_BODY, { '#': C.patient }, CX, H * 0.44, 32, { anchor: 'center' });
  }

  function newRound() {
    round = hits;
    isGolden = round === NEEDED - 1;
    var lo = 0.5 + round * 0.12, span = isGolden ? 0.10 : 0.20 - round * 0.02;
    targetLo = lo; targetHi = lo + span;
    pointX = POINTS[round % POINTS.length].x;
    pointY = POINTS[round % POINTS.length].y;
    pressing = false; pressT = 0;
  }

  function initGame() {
    hits = 0; misses = 0; perfects = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function startPress() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    pressing = true; pressT = 0;
  }

  function endPress() {
    if (!pressing || done || finished) return;
    pressing = false;
    hitStop = 0.16;
    if (pressT < targetLo) {
      registerResult('EARLY', false);
    } else if (pressT > targetHi) {
      registerResult('LATE', false);
    } else {
      var perfect = pressT < targetLo + (targetHi - targetLo) * 0.4;
      registerResult(perfect ? 'PERFECT' : 'GOOD', true, perfect);
    }
  }

  function registerResult(label, success, perfect) {
    if (success) {
      hits++;
      if (perfect) perfects++;
      var bonus = isGolden && perfect;
      game.feedback.good(pointX, pointY, { text: bonus ? 'GOLDEN!' : label, color: C.good });
      game.fx.burst(pointX, pointY, { color: isGolden ? C.pointGold : C.good, count: bonus ? 24 : 14, speed: 360 });
      game.audio.play(perfect ? 'se_powerup' : 'se_good', 0.35);
      if (hits === Math.ceil(NEEDED / 2)) { game.fx.popup(hits + ' / ' + NEEDED, CX, H * 0.14, { color: C.pointGold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (hits >= NEEDED) { ok = true; finished = true; finish(); } else newRound();
    } else {
      misses++;
      shake = 0.2;
      game.feedback.bad(pointX, pointY, { text: label });
      game.audio.play('se_bad', 0.35);
      if (misses >= LOSE) { ok = false; finished = true; finish(); } else newRound();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function() { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); startPress(); } });
  game.onRelease(function() { if (state === S.PLAYING) { game.audio.tone(520, 0.05, { wave: 'square', volume: 0.08 }); endPress(); } });

  function stepPlay(dt) {
    if (pressing) {
      pressT += dt;
      if (pressT > MAX_HOLD) { pressing = false; hitStop = 0.16; registerResult('LATE', false); }
    }
  }

  // ── ATTRACT ゴースト実演: 緑帯で離す成功例1回、帯を過ぎて離す失敗例1回 ──
  var demo = { t: 0, gx: POINTS[0].x, gy: POINTS[0].y, press: false, holdT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    targetLo = 0.5; targetHi = 0.70; isGolden = false;
    if (cyc < 1.5) { pointX = POINTS[0].x; pointY = POINTS[0].y; demo.gx = pointX; demo.gy = pointY; demo.press = cyc > 0.15; demo.holdT = Math.max(0, cyc - 0.15); }
    else if (cyc < 2.0) { demo.press = false; demo.holdT = 0; }
    else if (cyc < 3.5) { pointX = POINTS[1].x; pointY = POINTS[1].y; demo.gx = pointX; demo.gy = pointY; demo.press = cyc > 2.15; demo.holdT = Math.max(0, cyc - 2.15); }
    else { demo.press = false; demo.holdT = 0; }
    pressT = demo.holdT;

    if (cyc > 0.15 && cyc < 0.20) game.audio.play('se_tap', 0.03);
    if (cyc > 0.15 + 0.6 && cyc < 0.15 + 0.6 + 0.02) { game.feedback.good(pointX, pointY, { text: 'PERFECT', color: C.good }); game.fx.burst(pointX, pointY, { color: C.good, count: 12, speed: 320 }); }
    if (cyc > 2.15 + 1.15 && cyc < 2.15 + 1.15 + 0.02) { game.feedback.bad(pointX, pointY, { text: 'LATE' }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      parlorBg();
      drawPatient();
      stepDemo(dt);
      var gaugeFrac = Math.min(1, pressT / MAX_HOLD);
      game.draw.rect(pointX - 90, pointY - 200, 180, 20, C.white, 0.5);
      game.draw.rect(pointX - 90 + 180 * targetLo / MAX_HOLD, pointY - 200, 180 * (targetHi - targetLo) / MAX_HOLD, 20, C.zoneOk);
      game.draw.rect(pointX - 90, pointY - 200, 180 * gaugeFrac, 6, C.point);
      game.draw.circle(pointX, pointY, 34, demo.press ? C.point : C.pointGold);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, CX, H * 0.06, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + ' PERFECT' : '-'), CX, H * 0.62, 24, C.point);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', CX, H * 0.90, 38, C.point);
      } else {
        txt('INSERT COIN', CX, H * 0.90, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      parlorBg();
      drawPatient();
      txt(ok ? 'CLEAR' : 'GAME OVER', CX, H * 0.06, 50, ok ? C.good : C.bad);
      txt(perfects + ' / ' + NEEDED, CX, H * 0.62, 30, C.ink);
      if (!ok && hits === NEEDED - 1) txt('あと1点!', CX, H * 0.68, 26, C.point);
      if (ok && (game.best === 0 || perfects > game.best)) txt('NEW RECORD', CX, H * 0.68, 26, C.point);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', CX, H * 0.90, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ perfects: perfects, hits: hits });
        else game.end.failure({ perfects: perfects, hits: hits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    parlorBg();
    drawPatient();
    var gf = Math.min(1, pressT / MAX_HOLD);
    game.draw.rect(pointX - 90, pointY - 200, 180, 20, C.white, 0.6);
    game.draw.rect(pointX - 90 + 180 * targetLo / MAX_HOLD, pointY - 200, 180 * (targetHi - targetLo) / MAX_HOLD, 20, isGolden ? C.pointGold : C.zoneOk);
    game.draw.rect(pointX - 90, pointY - 200, 180 * gf, 6, C.point);
    game.draw.circle(pointX, pointY, pressing ? 40 : 32, isGolden ? C.pointGold : C.point);

    txt(hits + ' / ' + NEEDED, CX, H * 0.06, 34, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', CX, H * 0.78, 52, C.point);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 0.25], ['G5', 0.25], ['C6', 0.5]], { tempo: 150, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// K-X-0016-duet-mirror-strings.js
// 双弦のこだま — 手本のフレーズを聞いた直後、左手の弦を押さえ右手の弦で同じ操作順に弾き返す
// 操作: 左の弦は押さえるだけ、右の弦は弾く(タップ)。手本が示した順で「左」「右」「両方(左を押さえたまま右を弾く)」を再現する
// 終わり: 5音のフレーズを最後まで同じ順で弾き返せれば成功。1つでも順/操作を外せば失敗
// @mechanic: coop_2zone
// @theme: twin_string_duet
// 世界観: 二本の弦を両手で操る独自の弦楽器。師匠が奏でた手本のフレーズを聞き終えた直後、左手と右手の役割を同じ順に再現して弾き返す弟子の稽古
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き返せた音数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2色を基調にした墨絵風。アクセントは朱色1色のみ
  var C = {
    bg: '#f4efe4', bg2: '#e8e0cc', ink: '#181410', paper: '#fbf7ec',
    left: '#181410', right: '#181410', accent: '#c8412e',
    good: '#2a6b3a', bad: '#c8412e', gold: '#c8412e', white: '#fbf7ec',
  };

  var GAME_TITLE = 'TWIN STRING';
  var LX = W * 0.28, RX = W * 0.72, ZY = H * 0.62, ZR = 190;
  var SEQ_LEN = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER = ['..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(W * 0.5 - 4, H * 0.24, 8, H * 0.5, C.ink, 0.5);
    game.draw.line(LX, H * 0.30, LX, ZY + ZR - 20, C.ink, 3);
    game.draw.line(RX, H * 0.30, RX, ZY + ZR - 20, C.ink, 3);
  }

  function drawZones(leftHeld, litL, litR) {
    game.draw.circle(LX, ZY, ZR, C.paper, 0.9);
    game.draw.circle(RX, ZY, ZR, C.paper, 0.9);
    game.draw.circle(LX, ZY, ZR, C.ink, 0.08 + (leftHeld ? 0.2 : 0));
    game.draw.circle(RX, ZY, ZR, C.ink, 0.08);
    if (litL) game.draw.circle(LX, ZY, ZR * 0.62, C.accent, 0.55);
    if (litR) game.draw.circle(RX, ZY, ZR * 0.62, C.accent, 0.55);
    txt('L', LX, ZY + 18, 60, C.ink);
    txt('R', RX, ZY + 18, 60, C.ink);
  }

  var seq, stepIdx, correctN, phase, showT, gapT, leftHeld, leftId, resolvedThis, stepStart;
  var done, endWait, finished, ready, hitStop, shake, nextMilestone;

  function buildSeq() {
    var arr = [];
    var hasB = false;
    for (var i = 0; i < SEQ_LEN; i++) {
      var r = Math.random();
      var v = r < 0.38 ? 'L' : (r < 0.76 ? 'R' : 'B');
      if (v === 'B') hasB = true;
      arr.push(v);
    }
    if (!hasB) arr[2] = 'B';
    return arr;
  }

  var readyStartT = 0;
  function initGame() {
    seq = buildSeq(); stepIdx = 0; correctN = 0; phase = 'show'; showT = 0; gapT = 0.5;
    leftHeld = false; leftId = null; resolvedThis = false; stepStart = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; readyStartT = 0; nextMilestone = 3;
  }

  function toneFor(v) {
    if (v === 'L') game.audio.tone('A3', 0.28, { wave: 'triangle', volume: 0.16 });
    else if (v === 'R') game.audio.tone('E4', 0.28, { wave: 'triangle', volume: 0.16 });
    else { game.audio.tone('A3', 0.32, { wave: 'triangle', volume: 0.14 }); game.audio.tone('E4', 0.32, { wave: 'triangle', volume: 0.14 }); }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function fail() {
    ok = false; finished = true;
    hitStop = 0.3; shake = 0.24;
    game.feedback.bad((LX + RX) / 2, ZY, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function pass() {
    correctN++; hitStop = 0.08;
    game.feedback.good((LX + RX) / 2, ZY, { text: 'NICE' });
    game.audio.play('se_good', 0.3);
    if (correctN >= nextMilestone && nextMilestone < SEQ_LEN) {
      game.fx.popup(correctN + ' / ' + SEQ_LEN, W / 2, H * 0.20, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
      nextMilestone += 3;
    }
    stepIdx++;
    if (stepIdx >= SEQ_LEN) { ok = true; finished = true; finish(); return; }
    resolvedThis = false;
    stepStart = game.time.elapsed - readyStartT;
  }

  function stepWin(v) { return v === 'B' ? 1.4 : 0.95; }

  function resolveInput(zone) {
    if (ready > 0 || done || finished || phase !== 'input' || resolvedThis) return;
    var target = seq[stepIdx];
    if (target === 'L') {
      if (zone === 'L') { resolvedThis = true; pass(); } else { resolvedThis = true; fail(); }
    } else if (target === 'R') {
      if (zone === 'R') { resolvedThis = true; pass(); } else { resolvedThis = true; fail(); }
    } else {
      if (zone === 'R' && leftHeld) { resolvedThis = true; pass(); }
      else if (zone === 'R' && !leftHeld) { resolvedThis = true; fail(); }
    }
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    var zone = x < W * 0.5 ? 'L' : 'R';
    if (zone === 'L') { leftHeld = true; leftId = id; game.audio.play('se_tap', 0.15); }
    else { game.audio.play('se_tap', 0.2); resolveInput('R'); }
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (id === leftId) { leftHeld = false; leftId = null; }
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && x < W * 0.5) resolveInput('L');
  });

  function stepShow(dt) {
    if (gapT > 0) { gapT -= dt; return; }
    showT -= dt;
    if (showT <= 0) {
      showIdx++;
      if (showIdx >= seq.length) { phase = 'input'; stepStart = game.time.elapsed - readyStartT; return; }
      showT = 0.55;
      toneFor(seq[showIdx]);
    }
  }
  var showIdx = -1;

  function stepInput(dt) {
    if (resolvedThis) return;
    var t = (game.time.elapsed - readyStartT) - stepStart;
    if (t > stepWin(seq[stepIdx])) { resolvedThis = true; fail(); }
  }

  var demo = { t: 0, gx: LX, gy: ZY, press: false };
  var demoSeq = ['L', 'R', 'B'];
  var demoIdx = 0, demoPhase = 'show', demoShowT = 0, demoT2 = 0, demoLeftHeld = false;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { demoIdx = 0; demoPhase = 'show'; demoShowT = 0.5; demoT2 = 0; demoLeftHeld = false; }
    if (demoPhase === 'show') {
      demoShowT -= dt;
      if (demoShowT <= 0) { demoIdx++; demoShowT = 0.55; toneFor(demoSeq[Math.min(demoIdx, demoSeq.length - 1)]); if (demoIdx >= demoSeq.length) { demoPhase = 'input'; demoIdx = 0; demoT2 = 0; } }
      demo.press = false; demoLeftHeld = false;
    } else {
      demoT2 += dt;
      var v = demoSeq[demoIdx];
      if (v === 'L') {
        demo.gx = LX; demo.gy = ZY; demo.press = demoT2 > 0.2 && demoT2 < 0.45;
        if (demoT2 > 0.5) { game.feedback.good((LX + RX) / 2, ZY, { text: 'NICE' }); game.audio.play('se_good', 0.15); demoIdx++; demoT2 = 0; }
      } else if (v === 'R') {
        demo.gx = RX; demo.gy = ZY; demo.press = demoT2 > 0.2 && demoT2 < 0.45;
        if (demoT2 > 0.5) { game.feedback.good((LX + RX) / 2, ZY, { text: 'NICE' }); game.audio.play('se_good', 0.15); demoIdx++; demoT2 = 0; }
      } else {
        if (demoT2 < 0.4) { demo.gx = LX; demo.gy = ZY; demo.press = demoT2 > 0.15; demoLeftHeld = demoT2 > 0.15; }
        else if (demoT2 < 0.75) { demo.gx = RX; demo.gy = ZY; demo.press = true; demoLeftHeld = true; }
        else { game.feedback.good((LX + RX) / 2, ZY, { text: 'NICE' }); game.audio.play('se_good', 0.15); demoIdx++; demoT2 = 0; demoLeftHeld = false; }
      }
      if (demoIdx >= demoSeq.length) { demoPhase = 'show'; demoIdx = 0; demoShowT = 0.5; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var litL = demoPhase === 'show' && demoSeq[demoIdx] !== 'R';
      var litR = demoPhase === 'show' && demoSeq[demoIdx] !== 'L';
      drawZones(demoLeftHeld, litL, litR);
      game.draw.sprite(PLAYER, { '#': C.ink }, W * 0.5, H * 0.16, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.90, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 34, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones(false, false, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(correctN + ' / ' + SEQ_LEN, W / 2, H * 0.14, 28, C.ink);
      if (!ok) txt('あと' + (SEQ_LEN - correctN) + '音!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correctN, { notes: correctN, total: SEQ_LEN });
        else game.end.failure({ notes: correctN, total: SEQ_LEN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { readyStartT = game.time.elapsed; game.audio.play('se_tap'); }
    } else if (!finished) {
      if (phase === 'show') stepShow(dt); else stepInput(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    var litL = phase === 'show' && showIdx >= 0 && showIdx < seq.length && seq[showIdx] !== 'R';
    var litR = phase === 'show' && showIdx >= 0 && showIdx < seq.length && seq[showIdx] !== 'L';
    drawZones(leftHeld, litL, litR);
    game.draw.sprite(PLAYER, { '#': (finished && !ok) ? C.bad : C.ink }, W * 0.5, H * 0.16, 20, { anchor: 'center' });

    txt(correctN + ' / ' + SEQ_LEN + '   ' + (phase === 'show' ? '聴く' : '再現'), W / 2, H * 0.06, 28, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.94, 42, C.accent);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

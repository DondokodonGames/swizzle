// D-20172021-0044-alley-organ-spin.js
// アレイオルガンスピン — 路地裏の流しの奏者が手回しオルガンの円盤を、迫るビートの合図に合わせて回し切る
// 操作: 中央の円盤の縁を指でなぞり、合図が灯ったら円を描くように回し切る(タップではなく回転)
// 終わり: 規定回数しっかり回せれば成功。回し切れないまま曲が終われば失敗
// @mechanic: rotate_gesture
// @theme: alley_organ_spin
// 世界観: 路地裏に流れ着いた旅の奏者が、手回しオルガンの円盤を相棒に、ネオンの灯る夜道でビートの合図が来るたび円盤を回し切って一曲を紡ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 回し切った回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 発光4色、濃紺グラデ + 疑似グロー、点滅が命
  var C = {
    sky1: '#0a0a2a', sky2: '#1a0a3a', wallGlow: '#2a1a5a',
    dial: '#2a1a5a', dialRim: '#ff2ad0', dialRimDim: '#7a1a70',
    notch: '#2ad0ff', notchOff: '#1a4a70',
    good: '#2ad06a', bad: '#ff2a5a', gold: '#ffe02a', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'ALLEY SPIN';
  var NOTE_COUNT = 6;
  var NOTE_INTERVAL = 1.2;
  var TIME_LIMIT = NOTE_COUNT * NOTE_INTERVAL + 1.3;
  var NEEDED = 4;
  var REQUIRED_ROT = 2.3;
  var DIAL = { x: W * 0.5, y: H * 0.50, r: 250 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUSKER = ['.#.#.', '#####', '.###.', '#.#.#', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, C.dialRim, pulse * 0.5);
    for (var i = 0; i < 5; i++) {
      var lx = (i + 0.5) * (W / 5);
      var glow = 0.15 + 0.1 * Math.sin(game.time.elapsed * 2 + i);
      game.draw.rect(lx - 6, H * 0.10, 12, H * 0.20, C.wallGlow, glow + 0.3);
    }
    game.draw.sprite(BUSKER, { '#': C.notch }, W * 0.5, H * 0.13, 12, { anchor: 'center' });
  }

  function angleAt(x, y) { return Math.atan2(y - DIAL.y, x - DIAL.x); }

  function drawDial() {
    game.draw.circle(DIAL.x, DIAL.y, DIAL.r + 20, C.dialRimDim, 0.4);
    game.draw.circle(DIAL.x, DIAL.y, DIAL.r, C.dial, 1);
    var notches = 12;
    for (var i = 0; i < notches; i++) {
      var a = (i / notches) * Math.PI * 2 + totalRotVisual;
      var nx = DIAL.x + Math.cos(a) * DIAL.r;
      var ny = DIAL.y + Math.sin(a) * DIAL.r;
      var lit = i % 3 === 0;
      game.draw.circle(nx, ny, 14, lit ? C.notch : C.notchOff);
    }
    var winPct = beatTimer / NOTE_INTERVAL;
    game.draw.circle(DIAL.x, DIAL.y, DIAL.r + 20, C.dialRim, 0.15 + 0.25 * (1 - winPct));
    var fillPct = Math.min(1, spinAccum / REQUIRED_ROT);
    game.draw.circle(DIAL.x, DIAL.y, 70, C.dialRimDim, 0.6);
    game.draw.circle(DIAL.x, DIAL.y, 70 * fillPct, fillPct >= 1 ? C.good : C.notch, 0.9);
    if (flashT > 0) {
      game.draw.circle(DIAL.x, DIAL.y, DIAL.r + 40, flashGood ? C.good : C.bad, flashT / 0.2 * 0.5);
    }
  }

  var beatIdx, beatTimer, spinAccum, totalRotVisual, hits, isPressing, prevAngle;
  var halfCalled, flashT, flashGood, roundClock;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    beatIdx = 0; beatTimer = NOTE_INTERVAL; spinAccum = 0; totalRotVisual = 0; hits = 0;
    isPressing = false; prevAngle = 0; halfCalled = false; flashT = 0; flashGood = false; roundClock = 0;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveBeat() {
    beatIdx++;
    if (spinAccum >= REQUIRED_ROT) {
      hits++;
      flashT = 0.2; flashGood = true;
      game.feedback.good(DIAL.x, DIAL.y - DIAL.r - 40, { text: 'GOOD', color: C.good });
      game.fx.burst(DIAL.x, DIAL.y, { color: C.notch, count: 18, speed: 340 });
      game.audio.play('se_good', 0.3);
      hitStop = 0.1;
      if (!halfCalled && hits >= Math.ceil(NEEDED / 2)) { halfCalled = true; game.fx.popup('NICE', DIAL.x, DIAL.y - DIAL.r - 90, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= NEEDED && !finished) { ok = true; finished = true; finish(); }
    } else {
      flashT = 0.2; flashGood = false;
      game.feedback.bad(DIAL.x, DIAL.y - DIAL.r - 40, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      hitStop = 0.15; shake = 0.14;
    }
    spinAccum = 0;
    beatTimer = NOTE_INTERVAL;
  }

  function pressAt(x, y) {
    isPressing = true;
    prevAngle = angleAt(x, y);
  }
  function moveAt(x, y) {
    if (!isPressing) return;
    var a = angleAt(x, y);
    var d = a - prevAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    spinAccum += Math.abs(d);
    totalRotVisual += d;
    prevAngle = a;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0) return;
    game.audio.play('se_tap', 0.08);
    pressAt(x, y);
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.03);
    moveAt(x, y);
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.02);
    isPressing = false;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: DIAL.x + DIAL.r, gy: DIAL.y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (NOTE_INTERVAL * 2 + 0.5);
    if (cyc < dt || demo.t <= dt) resetDemo();
    var spinning = (cyc % NOTE_INTERVAL) < NOTE_INTERVAL * 0.72;
    var ang = game.time.elapsed * 5.5;
    demo.gx = DIAL.x + Math.cos(ang) * (DIAL.r - 10);
    demo.gy = DIAL.y + Math.sin(ang) * (DIAL.r - 10);
    demo.press = spinning;
    if (spinning) {
      if (!isPressing) pressAt(demo.gx, demo.gy);
      moveAt(demo.gx, demo.gy);
    } else if (isPressing) {
      isPressing = false;
    }
    beatTimer -= dt;
    if (beatTimer <= 0) resolveBeat();
    if (beatIdx >= NOTE_COUNT) { beatIdx = 0; hits = 0; }
  }

  game.onUpdate(function(dt) {
    if (flashT > 0) flashT -= dt;

    if (state === S.ATTRACT) {
      if (beatIdx === undefined) initGame();
      stepDemo(dt);
      bg();
      drawDial();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.20, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.235, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDial();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.20, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.245, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - hits) + '回!', W / 2, H * 0.29, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      beatTimer -= dt;
      if (beatTimer <= 0) resolveBeat();
      if (roundClock >= TIME_LIMIT && !finished) {
        ok = hits >= NEEDED;
        finished = true;
        if (!ok) game.audio.play('se_failure', 0.3);
        finish();
      }
    }

    bg();
    drawDial();
    txt(hits + ' / ' + NEEDED, W * 0.5, H * 0.815, 30, C.white);
    var barW = W - 140;
    var pct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(70, H * 0.90, barW, 16, '#1a0a3a', 1);
    game.draw.rect(70, H * 0.90, barW * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.3], ['B3', 0.3], ['E4', 0.3], ['G4', 0.3]], { tempo: 110, wave: 'sawtooth', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

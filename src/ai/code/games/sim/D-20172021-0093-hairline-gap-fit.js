// D-20172021-0093-hairline-gap-fit.js
// ヘアライン・ギャップフィット — 4本の毛束スライダーを指で伸縮させ、狙いの隙間の帯にぴったり合わせて指定の髪型に整える
// 操作: 下段の4本のスライダーを指でドラッグして毛束を伸ばす/切りそろえ、光る帯の範囲内で指を離して合わせる
// 終わり: 4本すべてを狙いの帯の範囲内で合わせ終えれば成功。範囲外で指を離す/時間切れで失敗
// @mechanic: gap_fit
// @theme: salon_hairline_gap_fit
// 世界観: 開店前の小さな美容室の見習いスタイリストが、注文の髪型シルエットに合わせて4本の毛束を伸ばしたり切りそろえたりし、狙いの長さの帯にぴったり合わせ込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせ終えた毛束数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル配色、丸みの強いUI、薄い縁取り
  var C = {
    bg: '#ffe6f0', bg2: '#ffd0e6', track: '#ffffff', trackEdge: '#ffb8d8',
    hair: '#c98a5a', hairLock: '#ff8fb0', skin: '#ffd9b0', band: '#ffce4a',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ff9f1c', ink: '#4a1030', white: '#ffffff',
  };

  var GAME_TITLE = 'HAIR FIT';
  var N = 4;
  var TIME_LIMIT = 17;
  var TRACK_TOP = H * 0.76, TRACK_BOT = H * 0.94;
  var HEAD_X = W * 0.5, HEAD_Y = H * 0.34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STYLIST_SPRITE = ['.###.', '#####', '.#.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff8fb0', pulse * 0.25);
    game.draw.sprite(STYLIST_SPRITE, { '#': C.hairLock }, W * 0.14, H * 0.16, 10, { anchor: 'center' });
  }

  var slotX = [];
  var strands, locked, roundClock, done, endWait, finished, ready, hitStop, shake, dragIdx, halfCalled;

  function initGame() {
    slotX = [];
    for (var i = 0; i < N; i++) slotX.push(W * (0.18 + i * 0.22));
    strands = [];
    for (var s = 0; s < N; s++) {
      var bandMin = 0.25 + game.random(0, 0.4);
      var bandMax = bandMin + 0.14;
      var val;
      do { val = game.random(0, 1); } while (val > bandMin - 0.05 && val < bandMax + 0.05);
      strands.push({ val: val, bandMin: bandMin, bandMax: bandMax, locked: false });
    }
    locked = 0; roundClock = 0; dragIdx = -1; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawHead() {
    game.draw.circle(HEAD_X, HEAD_Y + 40, 110, C.skin, 1);
    for (var i = 0; i < N; i++) {
      var st = strands[i];
      var len = 60 + st.val * 220;
      var hx = HEAD_X + (i - (N - 1) / 2) * 60;
      var col = st.locked ? C.hairLock : C.hair;
      game.draw.rect(hx - 14, HEAD_Y + 40 - len, 28, len, col, 1);
    }
    game.draw.circle(HEAD_X, HEAD_Y + 30, 100, C.skin, 1);
  }

  function drawSliders() {
    for (var i = 0; i < N; i++) {
      var st = strands[i];
      var x = slotX[i];
      game.draw.rect(x - 22, TRACK_TOP, 44, TRACK_BOT - TRACK_TOP, C.track, 0.95);
      game.draw.rect(x - 22, TRACK_TOP, 44, 6, C.trackEdge, 0.6);
      var bandTopY = TRACK_BOT - (TRACK_BOT - TRACK_TOP) * st.bandMax;
      var bandBotY = TRACK_BOT - (TRACK_BOT - TRACK_TOP) * st.bandMin;
      var blink = st.locked ? 0.9 : (0.4 + 0.3 * Math.sin(game.time.elapsed * 5));
      game.draw.rect(x - 26, bandTopY, 52, bandBotY - bandTopY, st.locked ? C.good : C.band, blink);
      var hy = TRACK_BOT - (TRACK_BOT - TRACK_TOP) * st.val;
      game.draw.circle(x, hy, 30, st.locked ? C.good : C.gold, 1);
      game.draw.circle(x, hy, 30, C.white, 0.3);
    }
  }

  function commit(i) {
    var st = strands[i];
    if (st.val >= st.bandMin && st.val <= st.bandMax) {
      st.locked = true; locked++;
      var x = slotX[i];
      var hy = TRACK_BOT - (TRACK_BOT - TRACK_TOP) * st.val;
      game.feedback.good(x, hy, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfCalled && locked >= Math.ceil(N / 2)) { halfCalled = true; game.fx.popup('あと' + (N - locked) + '!', HEAD_X, HEAD_Y - 160, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (locked >= N) {
        ok = true; finished = true; hitStop = 0.2;
        game.fx.burst(HEAD_X, HEAD_Y, { color: C.gold, count: 22, speed: 400 });
        finish();
      }
    } else {
      var x2 = slotX[i];
      var hy2 = TRACK_BOT - (TRACK_BOT - TRACK_TOP) * st.val;
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(x2, hy2, { text: 'MISS' });
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
    for (var i = 0; i < N; i++) {
      if (strands[i].locked) continue;
      if (Math.abs(x - slotX[i]) < 50 && y > TRACK_TOP - 40 && y < TRACK_BOT + 40) { dragIdx = i; game.audio.play('se_tap', 0.1); return; }
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || dragIdx < 0) return;
    var v = 1 - Math.max(0, Math.min(1, (y - TRACK_TOP) / (TRACK_BOT - TRACK_TOP)));
    strands[dragIdx].val = v;
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || dragIdx < 0) return;
    commit(dragIdx);
    dragIdx = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) initGame();
    var segDur = 6.0 / N;
    var step = Math.min(N - 1, Math.floor(cyc / segDur));
    var within = (cyc - step * segDur) / segDur;
    var st = strands[step];
    if (!st || st.locked) { demo.press = false; return; }
    var targetVal = (st.bandMin + st.bandMax) / 2;
    if (within < 0.75) {
      var u = within / 0.75;
      st.val = st.val + (targetVal - st.val) * Math.min(1, dt * 6 + u * 0.02);
      demo.press = true;
    } else {
      demo.press = false;
      if (!st.locked) commit(step);
    }
    var x = slotX[step];
    var hy = TRACK_BOT - (TRACK_BOT - TRACK_TOP) * st.val;
    demo.gx = x; demo.gy = hy;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (strands === undefined) initGame();
      bg();
      stepDemo(dt);
      drawHead();
      drawSliders();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.60, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.98, 34, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.98, 24, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHead();
      drawSliders();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(locked + ' / ' + N, W / 2, H * 0.60, 26, C.gold);
      if (!ok) txt('あと' + (N - locked) + '本!', W / 2, H * 0.64, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 22, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(locked, { locked: locked, total: N });
        else game.end.failure({ locked: locked, total: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(HEAD_X, HEAD_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHead();
    drawSliders();

    txt(locked + ' / ' + N, W / 2, H * 0.60, 24, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, H * 0.66, W - 120, 14, '#ffb8d8', 0.5);
    game.draw.rect(60, H * 0.66, (W - 120) * barPct, 14, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.22], ['E5', 0.22], ['G5', 0.22], ['C6', 0.44]], { tempo: 124, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

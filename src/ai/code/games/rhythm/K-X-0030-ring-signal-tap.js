// K-X-0030-ring-signal-tap.js
// リングシグナルタップ — 八方から迫る光の粒を、中央リングに触れる瞬間だけ弾く
// 操作: 中央のリングに光の粒が重なった一瞬(判定窓)でどこでもよいのでタップする
// 終わり: 規定8個を全て弾ければ成功。判定窓を外せば(早押し/見送り)失敗
// @mechanic: timing_window
// @theme: signal_ring_operator
// 世界観: 高台の信号塔に一人立つ通信士。八方から届く光の粒信号を、中央の受信リングに重なる瞬間だけ弾いて送り返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾けた個数とコンボ倍率
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色のライン、太いネオン管のような縁取り
  var C = {
    bg: '#08001a', bg2: '#160034', ring: '#2a1050', ringGlow: '#ff2e88',
    note: '#00e5ff', noteGlow: '#0a3a44', good: '#39ff6a', bad: '#ff3355',
    gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'RING SIGNAL';
  var TOTAL = 8;
  var CX = W * 0.5, CY = H * 0.44;
  var R_TARGET = 210;
  var R_OUTER = 620;
  var WINDOW_PX = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, combo, bestCombo, done, endWait, finished;
  var ready, hitStop, shake, note, round, noteDur, flashRing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TOWER = ['..##..', '.####.', '##..##', '.####.', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var rr = 90 + i * 110;
      game.draw.circle(CX, CY, rr, C.ringGlow, 0.03);
    }
    game.draw.sprite(TOWER, { '#': C.gold }, CX, H * 0.86, 8, { anchor: 'center' });
  }

  function drawRing(active) {
    var pulse = active ? (0.55 + 0.3 * Math.sin(game.time.elapsed * 18)) : 0.22;
    game.draw.circle(CX, CY, R_TARGET, C.ringGlow, pulse);
    game.draw.circle(CX, CY, R_TARGET, C.white, active ? 0.5 : 0.15);
    game.draw.circle(CX, CY, R_TARGET - 10, C.bg, 1);
    game.draw.circle(CX, CY, 10, C.note);
  }

  function newNote(dur) {
    var a = game.random(0, Math.PI * 2);
    return { angle: a, t: 0, dur: dur, resolved: false, telegraphed: false };
  }

  function noteR(n) {
    var p = Math.min(1, n.t / n.dur);
    return R_OUTER + (R_TARGET - R_OUTER) * p;
  }

  function inWindow(n) {
    return Math.abs(noteR(n) - R_TARGET) <= WINDOW_PX;
  }

  function initGame() {
    caught = 0; combo = 0; bestCombo = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; noteDur = 1.3; flashRing = 0;
    note = newNote(noteDur);
  }

  function nextRound(success) {
    round++;
    if (success) noteDur = Math.max(0.7, noteDur - 0.07);
    note = newNote(noteDur);
  }

  function resolveTap(x, y) {
    if (!note || note.resolved || ready > 0 || done || finished) return;
    note.resolved = true;
    game.audio.play('se_tap', 0.15);
    if (inWindow(note)) {
      caught++; combo++; if (combo > bestCombo) bestCombo = combo;
      hitStop = 0.1; flashRing = 0.2;
      var nx = CX + Math.cos(note.angle) * R_TARGET, ny = CY + Math.sin(note.angle) * R_TARGET;
      game.feedback.good(nx, ny, { text: combo >= 4 ? 'PERFECT' : 'GOOD', color: C.good });
      game.fx.burst(nx, ny, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (combo === 4) game.fx.popup('COMBO x2!', CX, CY - 260, { color: C.gold, size: 40 });
      if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
      nextRound(true);
    } else {
      combo = 0; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish(); return;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawNote(n) {
    if (!n) return;
    var r = noteR(n);
    var x = CX + Math.cos(n.angle) * r, y = CY + Math.sin(n.angle) * r;
    var p = n.t / n.dur;
    if (p > 0.45 && !n.telegraphed) { n.telegraphed = true; }
    if (p > 0.45) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(x, y, 26, C.gold, 0.5);
    }
    game.draw.circle(x, y, 20, C.noteGlow, 0.6);
    game.draw.circle(x, y, 15, C.note);
  }

  var demo = { t: 0, gx: CX, gy: CY - R_TARGET - 60, press: false, n: null, dur: 1.0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.n) { demo.n = newNote(demo.dur); }
    demo.n.t += dt;
    note = demo.n;
    var r = noteR(demo.n);
    var nx = CX + Math.cos(demo.n.angle) * r, ny = CY + Math.sin(demo.n.angle) * r;
    demo.gx = nx; demo.gy = ny;
    if (inWindow(demo.n) && !demo.n.telegraphed2) {
      demo.n.telegraphed2 = true;
      demo.press = true;
      flashRing = 0.2;
      game.feedback.good(nx, ny, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      demo.n.t = demo.n.dur; // resolve at window
    }
    if (demo.n.t >= demo.n.dur) {
      demo.n = null; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (flashRing > 0) flashRing -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawRing(flashRing > 0);
      if (note) drawNote(note);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRing(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '個!', W / 2, H * 0.18, 26, C.white);
      else txt('MAX COMBO ' + bestCombo, W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught * 10 + bestCombo, { caught: caught, total: TOTAL, combo: bestCombo });
        else game.end.failure({ caught: caught, total: TOTAL, combo: bestCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      note.t += dt;
      if (noteR(note) < R_TARGET - WINDOW_PX && !note.resolved) {
        // 判定窓を見送った(見逃し)
        note.resolved = true;
        combo = 0; hitStop = 0.35; shake = 0.3;
        var nx = CX + Math.cos(note.angle) * R_TARGET, ny = CY + Math.sin(note.angle) * R_TARGET;
        game.feedback.bad(nx, ny, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRing(inWindow(note) && !finished);
    if (!finished) drawNote(note);

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (combo >= 2) txt('COMBO ' + combo, W / 2, H * 0.90, 26, C.gold);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 0.25], ['C5', 0.25], ['G4', 0.25], ['C5', 0.25]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

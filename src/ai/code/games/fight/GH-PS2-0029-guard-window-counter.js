// GH-PS2-0029-guard-window-counter.js
// ガードウィンドウ・カウンター — 輪が光った一瞬だけガードして打ち返す組手
// 操作: 相手の脚が上がったら身構え、輪が光った窓の間だけタップしてガード→カウンター。輪が光らないフェイントではタップ禁物
// 終わり: 5カウンター先取でCLEAR。3回外す(窓を逃す/フェイントに釣られる)とGAME OVER
// @mechanic: timing_window
// @theme: padded_dojo_sparring
// 世界観: パステルの道場で行われる見習い同士の組手。蹴りは輪が光る一瞬だけガードできる。稽古が進むほど相手はフェイントを混ぜてくる
// 残るもの: 正誤(CLEAR/GAME OVER) + カウンター本数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s HANDHELD PASTEL: 白縁の丸い形。画面を上下に分けて情報と遊びを置く
  var C = {
    bg1: '#fbe9f1', bg2: '#e3d9fb', white: '#ffffff', ink: '#5a4a68',
    opp: '#bfe4ff', oppDark: '#7fc4f2', ply: '#ffd3e6', plyDark: '#ff9dc4',
    ring: '#ffffff', ringLit: '#ffe27a', ringFeint: '#ffb8cf',
    good: '#5fd98a', bad: '#ff6b7a', gold: '#ffcf3f',
  };

  var GAME_TITLE = 'GUARD WINDOW';
  var WIN = 5, LOSE = 3;
  var TELEGRAPH_DUR = 0.55, FEINT_HOLD_DUR = 0.35, RECOVER_DUR = 0.32;
  var WINDOW_BASE = 0.42, WINDOW_MIN = 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var successes, misses, phase, phaseT, isFeint, legRaise, ringLit, windowDurCur;
  var done, endWait, finished, ready, hitStop, shake;

  var CX = W / 2, OPP_Y = H * 0.34, PLY_Y = H * 0.60, RING_Y = H * 0.46;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function blob(x, y, r, fill) {
    game.draw.circle(x, y, r + 9, C.white);
    game.draw.circle(x, y, r, fill);
  }

  var EYE_CALM = ['#.#', '...', '.#.'];
  var EYE_TENSE = ['#.#', '...', '###'];

  function dojoBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.55, '#f2e6fb'], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * 0.78 + i * 26, W, 4, C.white, 0.35);
    game.draw.rect(0, H * 0.70, W, 10, C.white, 0.6);
  }

  // 相手(上): 脚上げの高さを legRaise(0..1) で表現。輪(ring)は光ったときだけ黄金
  // 呼吸するような常時のパルス(idle bob)で、実演の静止区間でも画面が完全に静止しないようにする
  function drawOpponent(lr, lit) {
    var bob = Math.sin(game.time.elapsed * 2.7) * 10;
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 2.7);
    game.draw.circle(CX, RING_Y, 78 + pulse * 22, C.ringFeint, 0.10 + pulse * 0.10);
    blob(CX, OPP_Y + bob, 92, C.opp);
    game.draw.sprite(EYE_TENSE, { '#': C.oppDark }, CX, OPP_Y + bob - 6, 12, { anchor: 'center' });
    // 蹴り脚: 上がるほど下方に伸びる
    var legLen = 40 + lr * 170;
    game.draw.line(CX + 40, OPP_Y + bob + 70, CX + 40, OPP_Y + bob + 70 + legLen, C.oppDark, 26);
    game.draw.circle(CX + 40, OPP_Y + bob + 70 + legLen, 20, C.oppDark);
    // ガード窓(輪)
    var ringCol = lit ? C.ringLit : (lr > 0 ? C.ringFeint : C.ring);
    game.draw.circle(CX, RING_Y, 66, ringCol, lit ? 0.9 : 0.55);
    game.draw.circle(CX, RING_Y, 66, C.white, 0.0);
    game.draw.line(CX - 66, RING_Y, CX + 66, RING_Y, C.white, lit ? 8 : 4);
  }

  function drawPlayer(braced) {
    var bob = Math.sin(game.time.elapsed * 2.7 + Math.PI) * 8;
    blob(CX, PLY_Y + bob, 100, C.ply);
    game.draw.sprite(braced ? EYE_TENSE : EYE_CALM, { '#': C.plyDark }, CX, PLY_Y + bob - 6, 13, { anchor: 'center' });
    if (braced) game.draw.rect(CX - 70, PLY_Y + bob - 130, 140, 16, C.plyDark, 0.8);
  }

  function drawPips() {
    for (var i = 0; i < WIN; i++) {
      var x = CX - (WIN - 1) * 26 + i * 52;
      game.draw.circle(x, H * 0.10, 16, i < successes ? C.gold : C.white, i < successes ? 1 : 0.35);
    }
    for (var j = 0; j < LOSE; j++) {
      var mx = W * 0.5 - (LOSE - 1) * 30 + j * 60;
      game.draw.circle(mx, H * 0.90, 15, j < misses ? C.bad : C.white, j < misses ? 1 : 0.3);
    }
  }

  function startRep() {
    var idx = successes + misses;
    isFeint = idx >= 2 && Math.random() < Math.min(0.55, 0.15 + 0.08 * idx);
    windowDurCur = Math.max(WINDOW_MIN, WINDOW_BASE - 0.03 * successes);
    phase = 'telegraph'; phaseT = TELEGRAPH_DUR; legRaise = 0; ringLit = false;
  }

  function initGame() {
    successes = 0; misses = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    startRep();
  }

  function registerMiss(reasonText) {
    misses++;
    hitStop = 0.32; shake = 0.22;
    game.feedback.bad(CX, RING_Y, { text: reasonText });
    game.audio.play('se_bad', 0.35);
    if (misses >= LOSE) { ok = false; finished = true; finish(); }
    else { phase = 'recover'; phaseT = RECOVER_DUR; }
  }

  function registerHit() {
    successes++;
    hitStop = 0.22; ringLit = true;
    var label = successes >= WIN ? 'PERFECT' : 'COUNTER';
    game.feedback.good(CX, RING_Y, { text: label, color: C.good });
    game.fx.burst(CX, RING_Y, { color: C.gold, count: 16, speed: 360 });
    game.audio.play('se_powerup', 0.3);
    if (successes === Math.ceil(WIN / 2)) {
      game.fx.popup(successes + ' / ' + WIN, CX, H * 0.20, { color: C.gold, size: 42 });
      game.audio.play('se_milestone', 0.4);
    }
    if (successes >= WIN) { ok = true; finished = true; finish(); }
    else { phase = 'recover'; phaseT = RECOVER_DUR; }
  }

  function resolveTap() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    if (phase === 'window') registerHit();
    else if (phase === 'feintHold') registerMiss('FEINT');
    else registerMiss('MISS');
  }

  function stepRound(dt) {
    phaseT -= dt;
    if (phase === 'telegraph') {
      legRaise = Math.min(1, 1 - phaseT / TELEGRAPH_DUR);
      ringLit = false;
      if (phaseT <= 0) {
        if (isFeint) { phase = 'feintHold'; phaseT = FEINT_HOLD_DUR; }
        else { phase = 'window'; phaseT = windowDurCur; ringLit = true; game.audio.tone(880, 0.08, { wave: 'square', volume: 0.12 }); }
      }
    } else if (phase === 'feintHold') {
      legRaise = 1;
      if (phaseT <= 0) { phase = 'recover'; phaseT = RECOVER_DUR; }
    } else if (phase === 'window') {
      legRaise = 1;
      if (phaseT <= 0) { ringLit = false; registerMiss('HIT'); }
    } else if (phase === 'recover') {
      legRaise = Math.max(0, phaseT / RECOVER_DUR);
      ringLit = false;
      if (phaseT <= 0 && !finished) startRep();
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
    resolveTap();
  });

  // ── ATTRACT ゴースト実演: 1本目は窓に合わせて成功、2本目はフェイントに釣られる失敗例 ──
  var demo = { t: 0, gx: CX, gy: H * 0.92, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt) { successes = 0; misses = 0; }
    if (cyc < 0.55) { phase = 'telegraph'; phaseT = 0.55 - cyc; legRaise = cyc / 0.55; ringLit = false; }
    else if (cyc < 0.85) { phase = 'window'; legRaise = 1; ringLit = true; }
    else if (cyc < 1.15) { phase = 'recover'; legRaise = Math.max(0, 1 - (cyc - 0.85) / 0.30); ringLit = false; }
    else if (cyc < 1.70) { phase = 'telegraph'; legRaise = (cyc - 1.15) / 0.55; ringLit = false; }
    else if (cyc < 2.05) { phase = 'feintHold'; legRaise = 1; ringLit = false; }
    else if (cyc < 2.35) { phase = 'recover'; legRaise = Math.max(0, 1 - (cyc - 2.05) / 0.30); ringLit = false; }
    else { phase = 'recover'; legRaise = 0; ringLit = false; }

    if (cyc > 0.60 && cyc < 0.72) {
      demo.press = true;
      if (cyc - dt <= 0.60) { game.feedback.good(CX, RING_Y, { text: 'COUNTER', color: C.good }); game.fx.burst(CX, RING_Y, { color: C.gold, count: 12, speed: 320 }); }
    } else if (cyc > 1.82 && cyc < 1.94) {
      demo.press = true;
      if (cyc - dt <= 1.82) { game.feedback.bad(CX, RING_Y, { text: 'FEINT' }); }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (successes === undefined) initGame();
      dojoBg();
      stepDemo(dt);
      drawOpponent(legRaise, ringLit);
      drawPlayer(legRaise > 0.3);
      drawPips();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + ' HITS' : '-'), W / 2, H * 0.135, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      dojoBg();
      drawOpponent(0, false);
      drawPlayer(false);
      drawPips();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 52, ok ? C.good : C.bad);
      txt(successes + ' / ' + WIN, W / 2, H * 0.135, 30, C.ink);
      if (!ok && successes === WIN - 1) txt('あと1本!', W / 2, H * 0.19, 30, C.gold);
      if (ok && (game.best === 0 || successes > game.best)) txt('NEW RECORD', W / 2, H * 0.19, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ counters: successes, misses: misses });
        else game.end.failure({ counters: successes, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    dojoBg();
    drawOpponent(legRaise || 0, ringLit);
    drawPlayer((legRaise || 0) > 0.3);
    drawPips();

    txt(successes + ' / ' + WIN, W / 2, H * 0.06, 34, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

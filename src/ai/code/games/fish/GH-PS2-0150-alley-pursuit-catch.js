// GH-PS2-0150-alley-pursuit-catch.js
// アレイパースート — 路地を逃げる怪盗を、追い詰めた一瞬だけタップして捕まえる
// 操作: 逃げる怪盗が壁際で足を止めた「隙」の間だけタップして確保する。逃走中にタップすると外す
// 終わり: 3ヶ所の行き止まりで3回確保できれば成功。時間切れ、または隙の見極めを外し続ければ失敗
// @mechanic: chase
// @theme: rooftop_alley_thief
// 世界観: 夜の路地裏。巾着袋を抱えた怪盗ネズミが逃げ込む。行き止まりで一瞬立ち止まる隙だけが捕まえる好機
// 残るもの: 正誤(CLEAR/GAME OVER) + 確保できた数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2010s FLAT MOBILE: 影・グラデを使わず、ベタ塗り数色。丸角・大きい余白・アイコン的な形
  var C = {
    bg: '#2d3142', wall: '#3f4459', ground: '#484d66', win: '#f2b134',
    thief: '#5f6b8a', thiefBag: '#f2b134', badge: '#4fc0a8',
    good: '#4fc0a8', bad: '#ef6f6c', gold: '#f2b134', white: '#f6f7fb', ink: '#1c1e2a',
  };

  var GAME_TITLE = 'ALLEY PURSUIT';
  var NEEDED = 3;
  var MAX_TIME = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, caughtN = 0, comboN = 0;

  var CHECKPOINTS = [
    { x: W * 0.30, y: H * 0.36 },
    { x: W * 0.72, y: H * 0.48 },
    { x: W * 0.42, y: H * 0.60 },
  ];
  var winMargin = [1.1, 0.95, 0.8]; // 隙の窓が段々短くなる(加速型プレッシャー)

  var cpIdx, phase, phaseT, windowT, thiefX, thiefY, missN, elapsedRound;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function chip(x, y, w, h, fill) {
    game.draw.rect(x, y, w, h, fill);
    game.draw.rect(x + 6, y + 6, w - 12, 6, '#ffffff', 0.18);
  }

  var THIEF_RUN = ['.##.', '####', '.##.', '#..#'];
  var THIEF_STOP = ['.##.', '####', '####', '#..#'];

  function alleyBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#20222e']]);
    game.draw.rect(0, H * 0.20, W, H * 0.62, C.ground);
    for (var i = 0; i < 5; i++) chip(W * (0.08 + i * 0.21), H * 0.24, 120, H * 0.5, C.wall);
    // 街灯(親しみのモチーフ、上部ゾーン)
    game.draw.circle(W * 0.5, H * 0.10, 30, C.win, 0.9);
    game.draw.rect(W * 0.5 - 6, H * 0.10, 12, 60, C.wall);
  }

  function initGame() {
    cpIdx = 0; caughtN = 0; comboN = 0; missN = 0; elapsedRound = 0;
    phase = 'flee'; phaseT = 0.7;
    thiefX = W * 0.5; thiefY = H * 0.75;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function targetPos() { return CHECKPOINTS[Math.min(cpIdx, CHECKPOINTS.length - 1)]; }

  function attemptGrab(x, y) {
    if (done || ready > 0 || finished || hitStop > 0) return;
    var d = Math.hypot(x - thiefX, y - thiefY);
    if (phase === 'cornered' && d < 120) {
      hitStop = 0.12;
      caughtN++; comboN++;
      var perfect = windowT > winMargin[Math.min(cpIdx, winMargin.length - 1)] * 0.6;
      game.feedback.good(thiefX, thiefY, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good });
      game.fx.burst(thiefX, thiefY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_success', 0.4);
      if (comboN >= 2) game.fx.popup('COMBO x' + comboN, thiefX, thiefY - 100, { color: C.gold, size: 36 });
      cpIdx++;
      if (caughtN >= NEEDED) { ok = true; finished = true; finish(); return; }
      game.fx.popup(caughtN + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 42 });
      phase = 'flee'; phaseT = 0.6;
      var p = targetPos();
      thiefX = W * 0.5; thiefY = H * 0.75;
    } else {
      comboN = 0; missN++;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.12;
      game.audio.play('se_bad', 0.3);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    game.audio.play('se_tap', 0.08);
    attemptGrab(x, y);
  });

  function stepChase(dt) {
    var p = targetPos();
    var margin = winMargin[Math.min(cpIdx, winMargin.length - 1)];
    if (phase === 'flee') {
      thiefX += (p.x - thiefX) * Math.min(1, dt * 3.2);
      thiefY += (p.y - thiefY) * Math.min(1, dt * 3.2);
      phaseT -= dt;
      if (phaseT <= 0 || (Math.abs(thiefX - p.x) < 8 && Math.abs(thiefY - p.y) < 8)) {
        phase = 'telegraph'; phaseT = 0.6; game.audio.play('se_tap', 0.05);
      }
    } else if (phase === 'telegraph') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'cornered'; windowT = margin; game.audio.play('se_milestone', 0.3); }
    } else if (phase === 'cornered') {
      windowT -= dt;
      if (windowT <= 0) {
        phase = 'flee'; phaseT = 0.7; comboN = 0; missN++;
        game.fx.popup('あと' + (NEEDED - caughtN) + '匹!', W / 2, H * 0.20, { color: C.bad, size: 34 });
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.75, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    stepChase(dt);
    var cornered = phase === 'cornered';
    demo.gx += (thiefX - demo.gx) * Math.min(1, dt * 4);
    demo.gy += (thiefY - demo.gy) * Math.min(1, dt * 4);
    demo.press = cornered && windowT < 0.35;
    if (demo.press && windowT > 0.30 && windowT < 0.35) {
      game.feedback.good(thiefX, thiefY, { text: 'GOOD', color: C.good });
      game.fx.burst(thiefX, thiefY, { color: C.gold, count: 10, speed: 280 });
      cpIdx++; caughtN++;
      if (caughtN >= NEEDED) { caughtN = 0; cpIdx = 0; }
      phase = 'flee'; phaseT = 0.6;
      thiefX = W * 0.5; thiefY = H * 0.75;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      alleyBg();
      stepDemo(dt);
      game.draw.circle(targetPos().x, targetPos().y, 130, phase === 'cornered' ? C.win : C.wall, phase === 'telegraph' ? (Math.floor(demo.t * 6) % 2 === 0 ? 0.5 : 0.15) : 0.25);
      game.draw.sprite(phase === 'flee' ? THIEF_RUN : THIEF_STOP, { '#': C.thief }, thiefX, thiefY, 16, { anchor: 'center' });
      game.draw.circle(thiefX + 30, thiefY + 10, 14, C.thiefBag);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 48, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + NEEDED : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      alleyBg();
      game.draw.sprite(THIEF_STOP, { '#': C.thief }, thiefX, thiefY, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caughtN + ' / ' + NEEDED, W / 2, H * 0.13, 34, C.gold);
      if (!ok && caughtN === NEEDED - 1) txt('あと1匹!', W / 2, H * 0.18, 30, C.bad);
      var best = Math.max(game.best, caughtN);
      txt('BEST ' + best, W / 2, H * 0.90, 30, C.gold);
      if (caughtN > game.best) txt('NEW RECORD', W / 2, H * 0.95, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caughtN, { caught: caughtN, miss: missN });
        else game.end.failure({ caught: caughtN, miss: missN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
      stepChase(dt);
      if (elapsedRound >= MAX_TIME) { ok = false; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    alleyBg();
    var p = targetPos();
    var margin = winMargin[Math.min(cpIdx, winMargin.length - 1)];
    var telegraphOn = phase === 'telegraph' && Math.floor(game.time.elapsed * 7) % 2 === 0;
    game.draw.circle(p.x, p.y, 130, phase === 'cornered' ? C.win : C.wall, telegraphOn ? 0.55 : (phase === 'cornered' ? 0.35 : 0.2));
    if (!finished) {
      game.draw.sprite(phase === 'flee' ? THIEF_RUN : THIEF_STOP, { '#': C.thief }, thiefX, thiefY, 16, { anchor: 'center' });
      game.draw.circle(thiefX + 30, thiefY + 10, 14, C.thiefBag);
      if (phase === 'cornered') {
        var frac = Math.max(0, windowT / margin);
        game.draw.rect(thiefX - 60, thiefY - 90, 120 * frac, 10, C.gold);
      }
    }

    chip(60, 40, W - 120, 54, C.wall);
    txt(caughtN + ' / ' + NEEDED, W / 2, 78, 34, C.white);
    chip(60, H - 90, (W - 120) * Math.max(0, 1 - elapsedRound / MAX_TIME), 20, C.badge);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['A4', 0.25], ['E4', 0.25]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

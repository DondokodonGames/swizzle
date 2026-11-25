// J-3DSDSDSTOP10-0015-sky-balloon-twinstep.js
// 大風船ツインステップ — 大きな風船に着地する瞬間、左右の足パッドを2本指で同時に踏んで高く跳ね、頂上の鐘を鳴らす
// 操作: 着地の輪が縮みきる瞬間に、左右のパッドを2本の指でそろえて押す。そろうほど高く跳ね、片足やズレは失速
// 終わり: 鐘の高さまで跳べばCLEAR。時間切れでGAME OVER(最高到達点が残る)
// @mechanic: pinch_zone
// @theme: festival_air_balloon_bounce
// 世界観: 港の祭りの広場に置かれた巨大な空気風船の上で、見習い軽業師のサルが両足をぴたりとそろえて踏み込み、跳ねるたびに高く上がって櫓の上の鐘を鳴らしに行く
// 残るもの: 正誤(CLEAR/GAME OVER) + 最高到達点(m)・両足ぴったり(PERFECT)数
// スタイル: 2010s FLAT MOBILE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なし・丸角・余白、ベタ塗り数色
  var STYLE = {
    bg: ['#bfe9ff', '#e6f6ff', '#9fd8f5'],
    main: ['#ff5d73', '#3d7dff', '#ffffff'],
    accent: ['#ffc233', '#1d2b53'],
  };
  var SKY1 = '#bfe9ff', SKY2 = '#eef9ff', RED = '#ff5d73', BLUE = '#3d7dff', WHITE = '#ffffff', GOLD = '#ffc233', INK = '#1d2b53', MINT = '#2bd6a0';

  var GAME_TITLE = 'TWIN BOUNCE';
  var TIME_LIMIT = 12;
  var GOAL_ALT = 12;
  var GRAV = 30;
  var BAL_X = W / 2, BAL_TOP = Math.round(H * 0.66);
  var PX_PER_M = 78;
  var PAD_Y = Math.round(H * 0.8);
  var EARLY = 0.16, SQUASH = 0.24;
  var SYNC_GOOD = 0.12, SYNC_PERFECT = 0.05;

  var MONK_TUCK = ['..bb..', '.bffb.', '.bkkb.', 'bbbbbb', '.bbbb.', '.b..b.'];
  var MONK_SPREAD = ['b.bb.b', '.bffb.', '.bkkb.', '.bbbb.', '.bbbb.', 'b....b'];
  var MONK_PAL = { b: '#b0643a', f: '#ffd9b0', k: INK };
  var BELL = ['...##...', '..####..', '.######.', '.######.', '########', '...##...'];
  var PAD = ['.####.', '######', '######', '.####.', '..##..', '.####.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var b = null;

  function flat(str, x, y, sz, col) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function pill(x, y, w, h, col) {
    var r = h / 2;
    game.draw.rect(x + r, y, w - 2 * r, h, col);
    game.draw.circle(x + r, y + r, r, col);
    game.draw.circle(x + w - r, y + r, r, col);
  }

  function initGame() {
    b = {
      apex: 2, air: 0, airT: airTime(2), phase: 'air', squash: 0,
      alt: 0, maxAlt: 0, clock: 0, pressL: -9, pressR: -9, landAt: 0,
      judged: false, perfect: 0, good: 0, miss: 0, rung: false,
      flashL: 0, flashR: 0, sync: null, mile: false,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: false,
      finished: false, done: false, ok: false, endWait: 0,
    };
    b.landAt = b.airT;
  }

  function airTime(a) { return 2 * Math.sqrt(2 * a / GRAV); }
  function altAt(tau, a) { var v0 = Math.sqrt(2 * GRAV * a); return Math.max(0, v0 * tau - GRAV * tau * tau / 2); }

  // 窓: 着地の EARLY 秒前 〜 沈み込みの終わり
  function inWindow() {
    if (b.phase === 'squash') return true;
    return b.phase === 'air' && b.airT - b.air <= EARLY;
  }

  function stomp(side) {
    if (b.finished || b.hitStop > 0) return;
    if (side < 0) b.flashL = 0.2; else b.flashR = 0.2;
    if (!inWindow() || b.judged) {
      game.audio.tone('C4', 0.05, { wave: 'sine', volume: 0.04 });
      return;
    }
    if (side < 0) b.pressL = b.clock; else b.pressR = b.clock;
    game.audio.tone(side < 0 ? 'E5' : 'G5', 0.06, { wave: 'triangle', volume: 0.06 });
    if (b.pressL > -9 && b.pressR > -9 && Math.abs(b.pressL - b.pressR) <= SYNC_GOOD + 0.02) {
      judge();
    }
  }

  function judge() {
    if (b.judged) return;
    b.judged = true;
    var hasL = b.pressL > -9, hasR = b.pressR > -9;
    var gain;
    if (hasL && hasR) {
      var sync = Math.abs(b.pressL - b.pressR);
      b.sync = sync;
      if (sync <= SYNC_PERFECT) {
        gain = 3; b.perfect++;
        game.feedback.good(BAL_X, BAL_TOP - 60, { text: 'PERFECT', color: GOLD, count: 18 });
      } else if (sync <= SYNC_GOOD) {
        gain = 2; b.good++;
        game.feedback.good(BAL_X, BAL_TOP - 60, { text: 'GOOD', color: MINT, count: 12 });
      } else {
        gain = -1.5; b.miss++;
        game.feedback.bad(BAL_X, BAL_TOP - 60, { text: 'MISS', shake: 6 });
      }
    } else if (hasL || hasR) {
      gain = -1.5; b.miss++;
      b.sync = null;
      game.feedback.bad(hasL ? W * 0.25 : W * 0.75, PAD_Y - 40, { text: 'MISS', shake: 6 });
    } else {
      gain = -b.apex * 0.25;
      b.sync = null;
    }
    b.apex = Math.max(1.5, Math.min(GOAL_ALT + 1, b.apex + gain));
  }

  function takeoff() {
    if (!b.judged) judge();
    b.phase = 'air'; b.air = 0; b.airT = airTime(b.apex);
    b.pressL = -9; b.pressR = -9; b.judged = false;
    game.audio.play('se_jump', 0.3);
  }

  function finish() {
    if (b.done) return;
    b.done = true; b.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(b.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function step(dt) {
    b.flashL = Math.max(0, b.flashL - dt);
    b.flashR = Math.max(0, b.flashR - dt);
    if (b.hitStop > 0) { b.hitStop -= dt; return; }
    b.clock += dt;
    if (b.phase === 'air') {
      b.air += dt;
      b.alt = altAt(Math.min(b.air, b.airT), b.apex);
      if (b.alt > b.maxAlt) b.maxAlt = b.alt;
      if (!b.mile && b.maxAlt >= GOAL_ALT / 2) {
        b.mile = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(Math.floor(GOAL_ALT / 2) + 'm', BAL_X + 220, altY(b.alt), { color: BLUE, size: 56 });
      }
      if (!b.rung && b.alt >= GOAL_ALT - 0.05 && !b.finished) {
        b.rung = true; b.finished = true; b.ok = true; b.hl = true; b.hitStop = 0.35;
        game.feedback.good(BAL_X, altY(GOAL_ALT) - 60, { text: 'CLEAR', color: GOLD, count: 30, sound: 'se_coin' });
        finish();
        return;
      }
      if (b.air >= b.airT) { b.phase = 'squash'; b.squash = SQUASH; b.alt = 0; game.audio.tone('A2', 0.12, { wave: 'sine', volume: 0.08 }); }
    } else if (b.phase === 'squash') {
      b.squash -= dt;
      if (b.squash <= 0) takeoff();
    }
  }

  function altY(a) { return BAL_TOP - 60 - a * PX_PER_M; }

  // ── 描画 ─────────────────────────────────────────
  function drawPlaza() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, SKY1], [0.6, SKY2], [1, '#d8f0ff']]);
    game.draw.rect(0, 0, W, H, WHITE, 0.05 + 0.04 * Math.sin(t * 1.2));
    // 雲
    for (var c = 0; c < 4; c++) {
      var cxp = ((c * 330 + t * 25) % (W + 300)) - 150, cyp = 330 + c * 170;
      pill(cxp, cyp, 220, 60, WHITE);
      game.draw.circle(cxp + 90, cyp + 4, 46, WHITE);
    }
    // 櫓と鐘
    var by = altY(GOAL_ALT) - 40;
    game.draw.rect(BAL_X + 230, by - 20, 20, BAL_TOP - by + 20, '#9aa8c7');
    game.draw.rect(BAL_X - 30, by - 30, 280, 16, '#9aa8c7');
    var swing = b.rung ? Math.sin(t * 20) * 20 : Math.sin(t * 1.5) * 4;
    game.draw.line(BAL_X, by - 22, BAL_X + swing, by + 10, INK, 4);
    game.draw.sprite(BELL, { '#': GOLD }, BAL_X + swing, by + 40, b.hl && b.hitStop > 0 ? 18 : 13, { anchor: 'center' });
    // 目盛り
    for (var m = 2; m <= GOAL_ALT; m += 2) {
      var yy = altY(m);
      game.draw.rect(40, yy - 3, 50, 6, m <= b.maxAlt ? BLUE : '#a9c9e8');
    }
    game.draw.rect(96, altY(b.maxAlt) - 8, 30, 16, RED);
    // 地面
    game.draw.rect(0, BAL_TOP + 120, W, H - BAL_TOP - 120, '#7fd1a8');
  }

  function drawBalloon() {
    var t = game.time.elapsed;
    var sq = b.phase === 'squash' ? Math.sin((1 - b.squash / SQUASH) * Math.PI) : 0;
    var h = 150 * (1 - sq * 0.35), w = 380 * (1 + sq * 0.12);
    var top = BAL_TOP + (150 - h);
    pill(BAL_X - w, top, w * 2, h * 2 - 60, RED);
    pill(BAL_X - w + 40, top + 20, w * 0.9, 30, '#ff8a9a');
    game.draw.rect(BAL_X - 30, BAL_TOP + 200, 60, 40, '#d94a5f');
    // 仲間の軽業師(演出のみ・半透明)
    for (var n = 0; n < 2; n++) {
      var nx = BAL_X + (n === 0 ? -300 : 300);
      var ny = top - 40 - Math.abs(Math.sin(t * 3 + n * 1.7)) * 90;
      game.draw.sprite(MONK_TUCK, MONK_PAL, nx, ny, 9, { anchor: 'center', alpha: 0.45 });
    }
    return top;
  }

  function drawJumper(top) {
    var t = game.time.elapsed;
    var y = b.phase === 'squash' ? top - 44 : altY(b.alt);
    // 着地予告: 縮む輪(縮みきった瞬間が踏みどき)
    if (b.phase === 'air' && !b.finished) {
      var left = b.airT - b.air;
      if (left < 0.7) {
        var rr = 30 + left * 260;
        var col = left <= EARLY ? GOLD : WHITE;
        game.draw.circle(BAL_X, top - 6, rr + 8, col, 0.5);
        game.draw.circle(BAL_X, top - 6, rr, RED);
      }
      game.draw.circle(BAL_X, top - 4, 34 - Math.min(20, b.alt * 2), '#d94a5f');
    }
    var art = b.phase === 'squash' || b.air < 0.15 ? MONK_TUCK : MONK_SPREAD;
    var sc = b.hl && b.hitStop > 0 ? 18 : 14;
    game.draw.sprite(art, MONK_PAL, BAL_X + Math.sin(t * 2.4) * 6, y + Math.cos(t * 3) * 3, sc, { anchor: 'center' });
  }

  function drawPads() {
    // 押さえている指(マルチタッチ)をパッドごとに数える
    var held = [false, false];
    if (state === S.PLAYING) {
      var tc = game.touches;
      for (var k = 0; k < tc.length; k++) held[tc[k].x < W / 2 ? 0 : 1] = true;
    }
    for (var i = 0; i < 2; i++) {
      var side = i === 0 ? -1 : 1;
      var x = i === 0 ? W * 0.25 : W * 0.75;
      var lit = (i === 0 ? b.flashL > 0 : b.flashR > 0) || held[i];
      var ready = inWindow() && !b.judged && !b.finished && Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.circle(x, PAD_Y + 90, 150, ready ? GOLD : '#d6ecfb');
      game.draw.circle(x, PAD_Y + 90, 124, lit ? MINT : BLUE);
      game.draw.sprite(PAD, { '#': WHITE }, x, PAD_Y + 90, 16, { anchor: 'center', flipX: side > 0 });
    }
    // 2点がそろったら線で結ぶ
    if (b.sync !== null && b.phase === 'squash') {
      game.draw.line(W * 0.25, PAD_Y + 90, W * 0.75, PAD_Y + 90, b.sync <= SYNC_GOOD ? GOLD : RED, 14);
    }
  }

  function scoreOf() { return Math.round(b.maxAlt * 100) + b.perfect * 150 + (b.ok ? Math.round(b.timeLeft * 60) : 0); }

  function drawHud() {
    pill(30, 40, W - 60, 150, WHITE);
    flat(b.maxAlt.toFixed(1) + 'm', 250, 100, 60, INK);
    flat(GOAL_ALT + 'm', W - 200, 100, 44, GOLD);
    var frac = Math.max(0, b.timeLeft / TIME_LIMIT);
    var low = b.timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    pill(70, 150, W - 140, 22, '#d6ecfb');
    if (frac > 0.03) pill(70, 150, (W - 140) * frac, 22, low ? RED : BLUE);
  }

  function drawResult() {
    pill(80, 600, W - 160, 520, WHITE);
    game.draw.rect(80, 700, W - 160, 340, WHITE);
    flat(b.ok ? 'CLEAR' : 'GAME OVER', W / 2, 700, 92, b.ok ? MINT : RED);
    flat(b.maxAlt.toFixed(1) + 'm', W / 2, 820, 76, INK);
    flat('PERFECT ' + b.perfect, W / 2, 910, 42, GOLD);
    var sc = scoreOf();
    if (b.ok && sc > game.best) flat('NEW RECORD', W / 2, 990, 52, GOLD);
    else if (!b.ok) flat('あと' + Math.max(0.1, GOAL_ALT - b.maxAlt).toFixed(1) + 'm!', W / 2, 990, 52, BLUE);
    flat('BEST ' + Math.max(game.best, b.ok ? sc : 0), W / 2, 1065, 36, INK);
  }

  function drawAll() {
    drawPlaza();
    var top = drawBalloon();
    drawJumper(top);
    drawPads();
  }

  // ── ATTRACT: AI が同じ stomp を使う(着地にそろえて両足 → 1回だけ片足で失速)──
  var demo = { t: 0, gx: W * 0.25, gy: PAD_Y + 90, gx2: W * 0.75, press: false, n: 0, doneThis: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { initGame(); b.ready = 0; demo.n = 0; demo.doneThis = false; }
    if (b.phase === 'air' && b.airT - b.air < 0.05 && !demo.doneThis && !b.finished) {
      demo.doneThis = true;
      demo.n++;
      if (demo.n === 3) { stomp(-1); }
      else { stomp(-1); stomp(1); }
      demo.press = true;
    }
    if (b.phase === 'air' && b.air > 0.2) { demo.doneThis = false; demo.press = false; }
    step(dt);
    b.timeLeft = Math.max(0, TIME_LIMIT - b.clock);
    if (b.done) { b.done = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); tune();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y, id) {
    if (state !== S.PLAYING || b.ready > 0 || b.done) return;
    game.audio.play('se_tap', 0.15);
    stomp(x < W / 2 ? -1 : 1);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!b) initGame();
      stepDemo(dt);
      drawAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.hand(demo.gx2, demo.gy, { press: demo.press && demo.n !== 3, scale: 13 });
      pill(30, 40, W - 60, 150, WHITE);
      flat(GAME_TITLE, W / 2, H * 0.045, 80, RED);
      flat('HI-SCORE ' + game.best, W / 2, 158, 32, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) flat('► 100円 投入 ◄', W / 2, H * 0.74, 48, INK);
      else flat('INSERT COIN', W / 2, H * 0.74, 42, BLUE);
      return;
    }
    if (state === S.RESULT) {
      drawAll(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) flat('TAP TO CONTINUE', W / 2, H * 0.965, 38, INK);
      return;
    }

    if (b.done) {
      b.endWait -= dt;
      if (b.hitStop > 0) b.hitStop -= dt;
      if (b.endWait <= 0) {
        state = S.RESULT;
        var stats = { maxAlt: Math.round(b.maxAlt * 10) / 10, perfect: b.perfect, good: b.good, miss: b.miss };
        if (b.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (b.ready > 0) {
      b.ready -= dt;
      if (b.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (b.hitStop <= 0) b.timeLeft -= dt;
      if (b.timeLeft <= 0 && !b.finished) {
        b.timeLeft = 0; b.finished = true; b.ok = false; b.hitStop = 0.4;
        game.feedback.bad(BAL_X, altY(b.alt), { text: 'TIME UP' });
        finish();
      } else {
        step(dt);
      }
    }

    drawAll();
    drawHud();
    if (b.ready > 0) flat(b.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, RED);
    if (b.done) drawResult();
  });

  function tune() {
    game.audio.melody(
      [['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 2]],
      { tempo: 132, wave: 'triangle', volume: 0.07, loop: true, bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]] }
    );
  }

  game.onStart(function () {
    tune();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

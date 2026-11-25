// J-3DSDSDSTOP10-0026-clocktower-beam-poise.js
// 時計塔の天秤板 — 支点の上で揺れる長い板の鉄球を、左右をはたいて持ち上げ、突風の中20秒落とさずに保つ
// 操作: 画面の左半分を押すと板の左端が持ち上がり、右半分を押すと右端が持ち上がる。球の転がる側を持ち上げて戻す
// 終わり: 20秒間球を落とさなければ成功。板の端から球が落ちたら失敗
// @mechanic: balance
// @theme: clocktower_beam_poise
// 世界観: 古い時計塔の屋上で見習いの振り子番が、嵐の晩に長い天秤板の上の鉄球を左右の板端をはたいて支え、鐘が鳴り終わるまで釣り合いを守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数と中央キープ率
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット + カラーセロハンの帯(上=黄、中=白、下=緑)
  var STYLE = { bg: ['#101010', '#1c1c1c', '#050505'], main: ['#f4f4f4', '#9a9a9a'], accent: ['#ffd84a', '#4aff8a'] };
  var COL = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], white: STYLE.main[0], gray: STYLE.main[1],
    yellow: STYLE.accent[0], green: STYLE.accent[1], red: '#ff5a5a'
  };

  var GAME_TITLE = 'BEAM POISE';
  var TIME_LIMIT = 20;
  var NEEDED = 6;            // 耐え抜く突風の数
  var CX = W / 2, CY = H * 0.52, L = 410, BALL_R = 34;
  var STEP = 0.13;           // 1回の押下で板端を持ち上げる角度
  var GRAV = 1.9, TORQUE = 0.25, TH_MAX = 0.45;

  var BALL_A = ['.www.', 'wwwgw', 'wwwww', 'wgwww', '.www.'];
  var BALL_B = ['.www.', 'wgwww', 'wwwww', 'wwwgw', '.www.'];
  var PAL_BALL = { w: COL.white, g: COL.gray };
  var KEEPER_A = ['..www..', '.wwwww.', '..w.w..', '.wwwww.', 'w.www.w', '..w.w..', '.ww.ww.'];
  var KEEPER_B = ['..www..', '.wwwww.', '..w.w..', 'wwwwwww', '..www..', '..w.w..', '.ww.ww.'];
  var PAL_KEEPER = { w: COL.white };
  var BELL = ['..ww..', '.wwww.', '.wwww.', 'wwwwww', '..ww..'];
  var CLOCK = ['.wwwww.', 'w..w..w', 'w..w..w', 'w..www.w', 'w.....w', 'w.....w', '.wwwww.'];
  var GUST = ['w..w..', '.w..w.', '..w..w'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var th, thT, p, pv, survived, centerT, gusts, gust, nextGust, timeLeft, ready, finished, ok, hitStop, endWait, hl, lastTap, milestoneDone;
  var silent = false;

  function mono(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function initGame() {
    th = 0.02; thT = 0.02; p = 0.05; pv = 0; survived = 0; centerT = 0; gusts = 0; gust = null; nextGust = 1.8;
    timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false; hitStop = 0; endWait = 0; hl = null; lastTap = null; milestoneDone = false;
  }

  function ballPos() {
    var c = Math.cos(th), s = Math.sin(th);
    return { x: CX + p * L * c + s * BALL_R, y: CY + p * L * s - c * BALL_R };
  }

  function finishRound(success) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45;
    var b = ballPos();
    hl = { x: b.x, y: b.y, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  // side: -1=左端を上げる, +1=右端を上げる
  function lift(side) {
    if (finished) return false;
    thT = Math.max(-TH_MAX, Math.min(TH_MAX, thT + (side < 0 ? STEP : -STEP)));
    lastTap = { side: side, t: 0.18 };
    return true;
  }

  function spawnGust() {
    gusts++;
    var dir = gusts % 2 ? 1 : -1;
    if (gusts % 3 === 0) dir = -dir;
    gust = { phase: 'warn', t: 0, dir: dir, power: 0.7 + gusts * 0.1 };
    if (!silent) game.audio.tone(dir > 0 ? 'E6' : 'C6', 0.35, { wave: 'sine', volume: 0.08, slide: -300 });
  }

  function stepWorld(dt) {
    if (finished) return;
    survived += dt;
    if (lastTap) { lastTap.t -= dt; if (lastTap.t <= 0) lastTap = null; }
    // 板: 球の重みで球側へ沈んでいき、押下で持ち上げた角度へ追従する
    thT += (TORQUE * p + Math.sin(survived * 1.7) * 0.04) * dt;
    thT = Math.max(-TH_MAX, Math.min(TH_MAX, thT));
    th += (thT - th) * Math.min(1, 9 * dt);
    // 球: 低い方へ転がる(retain 0.6/s)
    pv += GRAV * Math.sin(th) * dt;
    if (gust && gust.phase === 'blow') pv += gust.dir * gust.power * dt;
    pv *= Math.pow(0.6, dt);
    p += pv * dt;
    if (Math.abs(p) < 0.25) centerT += dt;
    // 突風
    nextGust -= dt;
    if (!gust && nextGust <= 0) spawnGust();
    if (gust) {
      gust.t += dt;
      if (gust.phase === 'warn' && gust.t >= 0.7) { gust.phase = 'blow'; gust.t = 0; if (!silent) game.audio.play('se_tap', 0.3); }
      else if (gust.phase === 'blow' && gust.t >= 0.6) {
        gust = null; nextGust = Math.max(1.4, 2.6 - gusts * 0.15);
        var b = ballPos();
        game.feedback.good(b.x, b.y - 80, { text: Math.abs(p) < 0.3 ? 'PERFECT' : 'NICE', color: COL.yellow, sound: silent ? 'se_tap' : 'se_good', volume: silent ? 0 : 0.35 });
      }
    }
    if (!milestoneDone && survived >= TIME_LIMIT / 2) {
      milestoneDone = true;
      game.fx.popup(Math.round(TIME_LIMIT / 2) + '', CX, H * 0.3, { color: COL.yellow, size: 72 });
      if (!silent) game.audio.play('se_milestone', 0.45);
    }
    if (Math.abs(p) > 1) finishRound(false);
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.bg2], [0.5, COL.bg1], [1, COL.bg3]]);
    game.draw.rect(0, 0, W, H, COL.white, 0.02 + 0.02 * Math.sin(t * 1.3));
    // 星(白ドット)
    for (var i = 0; i < 40; i++) {
      var sx = (i * 263) % W, sy = (i * 151) % (H * 0.4) + 240;
      if ((Math.floor(t * 2) + i) % 7) game.draw.rect(sx, sy, 6, 6, COL.white, 0.6);
    }
    // 時計塔の文字盤と鐘
    game.draw.sprite(CLOCK, { w: COL.gray }, W * 0.82, H * 0.3 + Math.sin(t) * 4, 16, { anchor: 'center' });
    game.draw.sprite(BELL, { w: COL.gray }, W * 0.16 + Math.sin(t * 2) * 12, H * 0.28, 16, { anchor: 'center' });
    // 屋上の床(ドット列)
    for (var x = 0; x < W; x += 24) game.draw.rect(x, H * 0.7, 12, 12, COL.gray, 0.7);
  }

  function drawBeam() {
    var c = Math.cos(th), s = Math.sin(th);
    var x1 = CX - L * c, y1 = CY - L * s, x2 = CX + L * c, y2 = CY + L * s;
    // 支点(横ストリップで三角)
    for (var k = 0; k < 140; k += 8) game.draw.rect(CX - k * 0.6, CY + 14 + k, k * 1.2, 8, COL.gray);
    game.draw.line(x1, y1, x2, y2, COL.white, 22);
    for (var m = -1; m <= 1; m += 0.25) game.draw.circle(CX + m * L * c, CY + m * L * s, 5, COL.bg1);
    // 端の危険表示(球が端に近いと点滅)
    var near = Math.abs(p) > 0.7 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.circle(p > 0 ? x2 : x1, p > 0 ? y2 : y1, 20, near ? COL.red : COL.gray);
    if (lastTap) {
      var ex = lastTap.side < 0 ? x1 : x2, ey = lastTap.side < 0 ? y1 : y2;
      game.draw.circle(ex, ey, 40 + (0.18 - lastTap.t) * 200, COL.green, lastTap.t * 3);
    }
    var b = ballPos();
    game.draw.sprite(Math.floor(p * 8) % 2 ? BALL_A : BALL_B, PAL_BALL, b.x, b.y, 14, { anchor: 'center' });
  }

  function drawGust() {
    if (!gust) return;
    var t = game.time.elapsed;
    var from = gust.dir > 0 ? 0 : W;
    if (gust.phase === 'warn') {
      // telegraph: 風上の縁が点滅し、風の筋が集まる
      if (Math.floor(t * 10) % 2 === 0) game.draw.rect(gust.dir > 0 ? 0 : W - 30, H * 0.3, 30, H * 0.4, COL.yellow, 0.8);
      for (var i = 0; i < 3; i++) game.draw.sprite(GUST, { w: COL.yellow }, from + gust.dir * (60 + gust.t * 120), H * 0.38 + i * 90, 12, { anchor: 'center', flipX: gust.dir < 0 });
    } else {
      for (var j = 0; j < 7; j++) {
        var gx = gust.dir > 0 ? (gust.t * 2400 + j * 160) % W : W - (gust.t * 2400 + j * 160) % W;
        game.draw.sprite(GUST, { w: COL.white }, gx, H * 0.34 + j * 50, 12, { anchor: 'center', flipX: gust.dir < 0 });
      }
    }
  }

  function drawKeeper() {
    var t = game.time.elapsed;
    var fr = lastTap ? KEEPER_B : KEEPER_A;
    game.draw.sprite(fr, PAL_KEEPER, CX + Math.sin(t * 1.4) * 14, H * 0.78 + Math.sin(t * 2.8) * 5, 14, { anchor: 'center', flipX: lastTap ? lastTap.side > 0 : false });
  }

  function drawThumb() {
    var t = game.time.elapsed;
    for (var s = 0; s < 2; s++) {
      var x = s === 0 ? W * 0.22 : W * 0.78;
      var lit = lastTap && (lastTap.side < 0) === (s === 0);
      game.draw.circle(x, H * 0.9, 96, lit ? COL.green : COL.gray, lit ? 0.9 : 0.35 + 0.1 * Math.sin(t * 3 + s));
      // 上向き矢印(ドット)
      for (var k = 0; k < 5; k++) game.draw.rect(x - k * 10 - 5, H * 0.9 - 40 + k * 14, k * 20 + 10, 10, COL.white);
      game.draw.rect(x - 12, H * 0.9 + 30, 24, 40, COL.white);
    }
  }

  function drawBands() {
    // セロハン帯
    game.draw.rect(0, 0, W, H * 0.2, COL.yellow, 0.14);
    game.draw.rect(0, H * 0.82, W, H * 0.18, COL.green, 0.14);
  }

  function drawHud() {
    mono(Math.floor(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.05, 56, COL.yellow);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 20, COL.bg2);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? COL.red : COL.white);
    for (var i = 0; i < NEEDED; i++) game.draw.rect(W / 2 - 150 + i * 52, 206, 36, 12, i < gusts - (gust ? 1 : 0) ? COL.yellow : COL.gray);
    // 球の位置ゲージ
    game.draw.rect(W / 2 - 200, H * 0.13, 400, 8, COL.gray);
    game.draw.rect(W / 2 - 50, H * 0.13, 100, 8, COL.green);
    game.draw.rect(W / 2 + Math.max(-1, Math.min(1, p)) * 200 - 6, H * 0.13 - 12, 12, 32, COL.white);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y + (ok ? 0 : hl.t * 300), 60 + hl.t * 260, COL.white, Math.max(0, 0.6 - hl.t));
    game.draw.sprite(BALL_A, { w: COL.white, g: ok ? COL.yellow : COL.red }, hl.x, hl.y + (ok ? 0 : hl.t * 300), 20 + hl.t * 10, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W * 0.22, gy: H * 0.9, press: 0, n: 0, fail: false, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; nextGust = 1.0; p = 0.3; demo.n++; demo.fail = demo.n % 3 === 0; }
    silent = true;
    demo.cool -= dt;
    var stopHands = demo.fail && cyc > 1.2;
    var want = p + pv * 0.6 + th * 0.8;
    if (!finished && !stopHands && demo.cool <= 0 && Math.abs(want) > 0.12) {
      var side = want > 0 ? 1 : -1;
      lift(side);
      demo.gx = side < 0 ? W * 0.22 : W * 0.78; demo.press = 0.15; demo.cool = 0.22;
    }
    if (demo.press > 0) demo.press -= dt;
    demo.gy = H * 0.9;
    stepWorld(dt);
    if (finished && hitStop > 0) hitStop -= dt;
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    var side = x < W / 2 ? -1 : 1;
    if (lift(side)) {
      game.audio.tone(side < 0 ? 'G4' : 'C5', 0.06, { wave: 'square', volume: 0.1 });
      game.fx.burst(side < 0 ? CX - L : CX + L, CY, { color: COL.green, count: 5, speed: 160 });
    } else game.audio.play('se_tap', 0.1);
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (th === undefined) initGame();
      stepDemo(dt);
      drawBack(); drawGust(); drawBeam(); drawKeeper(); drawThumb(); drawBands();
      if (finished) drawHighlight(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      mono(GAME_TITLE, W / 2, H * 0.07, 80, COL.white);
      mono('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.yellow);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) mono('► 100円 投入 ◄', W / 2, H * 0.975, 42, COL.yellow);
      else mono('INSERT COIN', W / 2, H * 0.975, 36, COL.white);
      return;
    }

    if (state === S.RESULT) {
      drawBack(); drawBeam(); drawThumb(); drawBands();
      var pct = Math.round(100 * centerT / Math.max(0.1, survived));
      var sc = Math.round(survived * 50) + pct * 5 + (ok ? 500 : 0);
      mono(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 100, ok ? COL.green : COL.red);
      mono(survived.toFixed(1) + ' / ' + TIME_LIMIT, W / 2, H * 0.15, 52, COL.white);
      mono(pct + '%', W / 2, H * 0.2, 48, COL.yellow);
      mono('SCORE ' + sc, W / 2, H * 0.245, 42, COL.white);
      if (sc > (game.best || 0)) mono('NEW RECORD', W / 2, H * 0.29, 46, COL.yellow);
      else mono('BEST ' + (game.best || 0), W / 2, H * 0.29, 36, COL.white);
      if (!ok) mono('あと' + Math.max(1, Math.ceil(TIME_LIMIT - survived)) + '秒!', W / 2, H * 0.66, 64, COL.yellow);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) mono('TAP TO CONTINUE', W / 2, H * 0.975, 38, COL.white);
      return;
    }

    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.yellow, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var pc = Math.round(100 * centerT / Math.max(0.1, survived));
          var stats = { seconds: Math.round(survived * 10) / 10, centerPct: pc, gusts: gusts };
          if (ok) game.end.success(Math.round(survived * 50) + pc * 5 + 500, stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; survived = TIME_LIMIT; finishRound(true); }
      else stepWorld(dt);
    }

    drawBack(); drawGust(); drawBeam(); drawKeeper(); drawThumb(); drawBands(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) mono(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, COL.yellow);
  });

  game.onStart(function () {
    game.audio.melody([['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 1]],
      { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

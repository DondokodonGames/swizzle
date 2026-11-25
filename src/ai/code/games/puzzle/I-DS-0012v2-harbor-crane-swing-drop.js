// I-DS-0012v2-harbor-crane-swing-drop.js
// 夜のヤード積み — 走るトロリーの下で振り子のように揺れるコンテナを、塔の真上に来た瞬間に切り離して積み上げる
// 操作: 画面のどこかをタップでワイヤーを外す。コンテナはまっすぐ落ちるので、揺れと走りが重なって塔の真上に来た瞬間に外す(社内メモ)
// 終わり: 7個積めば成功。大きくずれた箱は海へ落ちて3回で失敗。時間切れでも失敗
// @mechanic: drop_timing
// @theme: night_container_yard_crane
// 世界観: 港のコンテナヤードの夜間荷役で、クレーン操縦士が走るトロリーの下で揺れるコンテナを真上に来た瞬間に下ろし、船の甲板に積み上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ個数・PERFECT数・最大連続PERFECT
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒グラデ + シアン/マゼンタ/イエロー/白。外周に薄い同色を重ねた疑似グロー。点滅が命
  var STYLE = { bg: ['#0a0a2a', '#04040f', '#000000'], main: ['#00f0ff', '#ff2bd6', '#ffe62b'], accent: ['#ff7a00', '#ffffff'] };
  var N = {
    sky: STYLE.bg[0], night: STYLE.bg[1], black: STYLE.bg[2],
    cyan: STYLE.main[0], pink: STYLE.main[1], yellow: STYLE.main[2], orange: STYLE.accent[0], white: STYLE.accent[1],
    red: '#ff3355', steel: '#2a2f55', deck: '#141838', sea: '#061030', green: '#3dff8a',
  };
  var BOX_COLS = [N.pink, N.cyan, N.yellow, N.orange];

  var GAME_TITLE = 'YARD STACK';
  var TIME_LIMIT = 18;
  var NEEDED = 7;
  var LIVES = 3;
  var CW = 220, CH = 92;
  var BEAM_Y = H * 0.135;
  var HANG_Y = H * 0.37;
  var BASE_Y = H * 0.8;
  var CABLE = HANG_Y - BEAM_Y - 40;
  var GRAV = 2800;
  var PERFECT_TOL = 18;
  var HOLD_TOL = CW * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var stack, trolley, swing, falling, junk, cam, lives, stacked, perfects, streak, bestStreak, score, timeLeft;
  var countIn, over, success, holdT, resultT, posted, gust, mood, colorIx, halfway, respawn, culprit, beepT;

  var OP_A = ['.hhhh.', 'hhhhhh', '.fefe.', '.ffff.', 'cccccc', 'cccccc'];
  var OP_B = ['.hhhh.', 'hhhhhh', '.ffff.', '.ffff.', 'cccccc', 'cccccc'];
  var OP_JOY = ['f.hh.f', 'chhhhc', 'cfefec', '.fmmf.', '.cccc.', 'cccccc'];
  var OP_OOPS = ['.hhhh.', 'hhhhhh', '.eeee.', '.fOOf.', 'cccccc', 'cccccc'];
  var OP_PAL = { h: '#ffe62b', f: '#ffc8a0', e: '#04040f', m: '#ff2bd6', O: '#04040f', c: '#00f0ff' };
  var SOCK_A = ['ww..', 'wwrr', 'ww..'];
  var SOCK_B = ['wwrrrr', 'wwrrrr', 'ww....'];

  function neon(str, x, y, sz, col) {
    game.draw.text(str, x, y + 4, { size: sz, color: col, bold: true, align: 'center' });
    game.draw.text(str, x - 2, y, { size: sz, color: N.white, bold: true, align: 'center' });
  }

  function topX() { return stack.length ? stack[stack.length - 1].x : W / 2; }
  function topY() { return BASE_Y - stack.length * CH; }

  function level() { return Math.min(1, stacked / NEEDED); }

  function newSwing() {
    var lv = level();
    swing = {
      amp: 0.16 + lv * 0.14,
      omega: 2.6 + lv * 1.6,
      phase: game.random(0, 6.28),
      col: BOX_COLS[colorIx % BOX_COLS.length],
    };
    colorIx++;
  }

  function hangX() {
    var theta = swing.amp * (1 + (gust && gust.on ? 0.9 : 0)) * Math.sin(swing.phase);
    return trolley.x + Math.sin(theta) * CABLE;
  }

  function initGame() {
    stack = []; junk = []; falling = null; cam = 0; colorIx = 0;
    trolley = { x: W * 0.25, dir: 1, speed: 260 };
    lives = LIVES; stacked = 0; perfects = 0; streak = 0; bestStreak = 0; score = 0; timeLeft = TIME_LIMIT;
    countIn = 0.8; over = false; success = false; holdT = 0; resultT = 0; posted = false;
    gust = null; mood = null; halfway = false; respawn = 0; culprit = null; beepT = 0;
    newSwing();
  }

  // ---- 落とす(本番もデモも同じ) ----
  function release() {
    if (falling || respawn > 0) return false;
    falling = { x: hangX(), y: HANG_Y - CH / 2 + cam, vy: 0, col: swing.col };
    game.audio.play('se_jump', 0.4);
    return true;
  }

  function land(live) {
    var off = falling.x - topX();
    var ty = topY();
    if (Math.abs(off) <= PERFECT_TOL || (stack.length === 0 && Math.abs(off) <= HOLD_TOL)) {
      var exact = Math.abs(off) <= PERFECT_TOL;
      var x = exact && stack.length ? topX() : falling.x;
      stack.push({ x: x, col: falling.col, flash: 0.3 });
      if (exact) { perfects++; streak++; if (streak > bestStreak) bestStreak = streak; }
      else streak = 0;
      stacked++;
      if (live) score += exact ? 200 * streak : 100;
      game.feedback.good(x, ty - CH - 30 - cam, { text: exact ? (streak > 1 ? 'PERFECT x' + streak : 'PERFECT') : 'GOOD', color: exact ? N.yellow : N.cyan, size: 58 });
      mood = { k: 'joy', t: 0.6 };
    } else if (Math.abs(off) <= HOLD_TOL) {
      stack.push({ x: falling.x, col: falling.col, flash: 0.3 });
      streak = 0; stacked++;
      if (live) score += 100;
      game.feedback.good(falling.x, ty - CH - 30 - cam, { text: 'GOOD', color: N.cyan, size: 52 });
      game.audio.tone('C4', 0.08, { wave: 'square', volume: 0.06 });
    } else {
      streak = 0;
      junk.push({ x: falling.x, y: ty - CH, vx: off > 0 ? 380 : -380, vy: -260, col: falling.col, t: 0 });
      culprit = { x: falling.x, y: ty - CH / 2, t: 0.45 };
      game.feedback.bad(falling.x, ty - CH - 20 - cam, { text: 'MISS' });
      game.audio.play('se_break', 0.45);
      mood = { k: 'oops', t: 0.8 };
      if (live) {
        lives--;
        holdT = 0.42;
        if (lives <= 0) { end(false); falling = null; return; }
      }
    }
    falling = null;
    respawn = 0.35;
    if (live && !halfway && stacked >= 4) {
      halfway = true;
      game.fx.popup('NICE', W / 2, H * 0.25, { color: N.pink, size: 84 });
      game.audio.play('se_milestone', 0.5);
    }
    if (live && stacked >= NEEDED) end(true);
  }

  function stepYard(dt, live) {
    var lv = level();
    trolley.speed = 240 + lv * 260;
    trolley.x += trolley.dir * trolley.speed * dt;
    if (trolley.x > W - 190) { trolley.x = W - 190; trolley.dir = -1; }
    if (trolley.x < 190) { trolley.x = 190; trolley.dir = 1; }
    swing.phase += swing.omega * dt;
    // 突風: 0.7秒前に吹き流しと風の筋で予告
    if (live && stacked >= 3) {
      if (!gust) gust = { wait: game.random(1.2, 2.2), warn: 0, on: false, dur: 0 };
      if (gust.wait > 0) {
        gust.wait -= dt;
        if (gust.wait <= 0) { gust.warn = 0.7; game.audio.tone('A4', 0.12, { wave: 'sawtooth', volume: 0.07, slide: -200 }); }
      } else if (gust.warn > 0) {
        gust.warn -= dt;
        if (gust.warn <= 0) { gust.on = true; gust.dur = 1.4; }
      } else if (gust.on) {
        gust.dur -= dt;
        if (gust.dur <= 0) gust = null;
      }
    }
    if (respawn > 0) { respawn -= dt; if (respawn <= 0) newSwing(); }
    if (falling) {
      falling.vy += GRAV * dt;
      falling.y += falling.vy * dt;
      if (falling.y + CH >= topY()) {
        falling.y = topY() - CH;
        land(live);
      }
    }
    for (var j = 0; j < junk.length; j++) {
      var b = junk[j];
      b.t += dt; b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > BASE_Y + 60 && !b.splash) { b.splash = true; game.fx.burst(b.x, BASE_Y + 80 - cam, { color: N.cyan, count: 14, speed: 380 }); }
    }
    if (junk.length > 4) junk.shift();
    for (var k = 0; k < stack.length; k++) if (stack[k].flash > 0) stack[k].flash -= dt;
    var want = Math.min(0, topY() - H * 0.64);
    cam += (want - cam) * Math.min(1, dt * 4);
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
  }

  function end(win) {
    if (over) return;
    over = true; success = win;
    if (!holdT) holdT = 0.4;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) score += Math.round(timeLeft * 40) + lives * 150;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!posted) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
    if (over || countIn > 0 || holdT > 0) { game.audio.play('se_tap', 0.08); return; }
    if (!release()) {
      game.audio.tone('E3', 0.04, { wave: 'square', volume: 0.05 });
      game.fx.burst(x, y, { color: N.steel, count: 3, speed: 80 });
    }
  });

  // ---- 描画 ----
  function glowRect(x, y, w, h, col, a) {
    game.draw.rect(x - 8, y - 8, w + 16, h + 16, col, 0.18 * (a || 1));
    game.draw.rect(x - 3, y - 3, w + 6, h + 6, col, 0.45 * (a || 1));
  }

  function harbor() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, N.sky], [0.55, N.night], [1, N.black]]);
    // 遠景の街(窓の点滅)
    for (var b = 0; b < 12; b++) {
      var bx = b * 95, bh = 120 + ((b * 53) % 5) * 50;
      var by = H * 0.6 - bh - cam * 0.2;
      game.draw.rect(bx, by, 80, bh + 400, '#0c1036');
      for (var wv = 0; wv < 4; wv++) {
        var on = Math.floor(t * 0.7 + b * 1.7 + wv) % 3 !== 0;
        if (on) game.draw.rect(bx + 14 + (wv % 2) * 34, by + 20 + Math.floor(wv / 2) * 40, 16, 12, wv % 2 ? N.pink : N.cyan, 0.5);
      }
    }
    // 海と甲板
    var seaY = BASE_Y + 40 - cam;
    game.draw.rect(0, seaY, W, H - seaY + 10, N.sea);
    for (var r = 0; r < 8; r++) {
      var ry = seaY + 20 + r * 34;
      var sx = (t * 60 * (r % 2 ? 1 : -1) + r * 90) % 200;
      for (var k = -1; k < 7; k++) game.draw.rect(sx + k * 200, ry, 90, 4, r % 2 ? N.cyan : N.pink, 0.25);
    }
    game.draw.rect(W / 2 - 300, BASE_Y - cam, 600, 40, N.deck);
    glowRect(W / 2 - 300, BASE_Y - cam, 600, 6, N.cyan, 0.8);
  }

  function crane() {
    var t = game.time.elapsed;
    // 梁
    game.draw.rect(0, BEAM_Y - 16, W, 32, N.steel);
    glowRect(0, BEAM_Y - 16, W, 4, N.yellow, 0.7);
    for (var i = 0; i < 14; i++) game.draw.line(i * 80, BEAM_Y - 16, i * 80 + 40, BEAM_Y + 16, '#3a4078', 4);
    // 吹き流し(突風の予告)
    var sockFr = (gust && (gust.warn > 0 || gust.on)) ? SOCK_B : SOCK_A;
    var flap = gust && gust.warn > 0 ? Math.sin(t * 40) * 6 : 0;
    game.draw.line(60, BEAM_Y - 16, 60, BEAM_Y - 90, N.white, 4);
    game.draw.sprite(sockFr, { w: N.white, r: N.red }, 64, BEAM_Y - 96 + flap, 12, { anchor: 'topleft' });
    if (gust && (gust.warn > 0 || gust.on)) {
      var str = gust.on ? 1 : 0.5;
      for (var s = 0; s < 6; s++) {
        var gy = H * 0.24 + s * 70;
        var gx = ((t * 900 + s * 170) % (W + 300)) - 150;
        game.draw.line(gx, gy, gx + 140, gy, N.white, 3);
        game.draw.rect(gx, gy - 2, 140, 4, N.white, 0.2 * str);
      }
      if (gust.warn > 0 && Math.floor(t * 10) % 2 === 0) neon('!', W - 70, H * 0.2, 90, N.red);
    }
    // トロリーと運転席
    var tx = trolley.x;
    game.draw.rect(tx - 100, BEAM_Y - 34, 200, 100, '#1a1e48');
    glowRect(tx - 100, BEAM_Y - 34, 200, 4, N.pink, 0.8);
    game.draw.rect(tx - 66, BEAM_Y - 20, 132, 76, '#0a1a3a');
    game.draw.rect(tx - 66, BEAM_Y - 20, 132, 6, N.cyan, 0.3);
    var fr = Math.floor(t * 3) % 2 === 0 ? OP_A : OP_B;
    if (mood && mood.k === 'joy') fr = OP_JOY;
    if (mood && mood.k === 'oops') fr = OP_OOPS;
    if (over && state !== S.ATTRACT) fr = success ? OP_JOY : OP_OOPS;
    game.draw.sprite(fr, OP_PAL, tx, BEAM_Y + 20 + Math.sin(t * 2.5) * 2, 11, { anchor: 'center' });
    // ワイヤーと吊り荷
    if (!falling && respawn <= 0) {
      var hx = hangX();
      game.draw.line(tx - 20, BEAM_Y + 66, hx - 40, HANG_Y - CH / 2, N.white, 3);
      game.draw.line(tx + 20, BEAM_Y + 66, hx + 40, HANG_Y - CH / 2, N.white, 3);
      // 真下への落下ガイド(点線)
      for (var d = HANG_Y + CH / 2 + 20; d < topY() - cam - 10; d += 40) game.draw.rect(hx - 2, d, 4, 18, swing.col, 0.35);
      drawBox(hx, HANG_Y, swing.col, 0, 1);
    } else if (respawn > 0) {
      game.draw.line(tx, BEAM_Y + 66, tx, BEAM_Y + 140, N.white, 3);
    }
  }

  function drawBox(cx, cy, col, flash, a) {
    var x = cx - CW / 2, y = cy - CH / 2;
    glowRect(x, y, CW, CH, col, a);
    game.draw.rect(x, y, CW, CH, '#101436');
    for (var i = 1; i < 9; i++) game.draw.rect(x + i * (CW / 9), y + 8, 4, CH - 16, col, 0.6);
    game.draw.rect(x, y, CW, 6, col);
    game.draw.rect(x, y + CH - 6, CW, 6, col);
    if (flash > 0) game.draw.rect(x - 6, y - 6, CW + 12, CH + 12, N.white, Math.min(0.8, flash * 3));
  }

  function drawStack() {
    for (var i = 0; i < stack.length; i++) {
      var s = stack[i];
      drawBox(s.x, BASE_Y - i * CH - CH / 2 - cam, s.col, s.flash, 1);
    }
    // 着地の目安: 塔の上面を明滅
    var tyS = topY() - cam;
    var blink = 0.35 + 0.3 * Math.sin(game.time.elapsed * 8);
    game.draw.rect(topX() - CW / 2, tyS - 4, CW, 6, N.white, blink);
    if (falling) drawBox(falling.x, falling.y - cam + CH / 2, falling.col, 0, 1);
    for (var j = 0; j < junk.length; j++) drawBox(junk[j].x, junk[j].y - cam + CH / 2, junk[j].col, 0, Math.max(0.2, 1 - junk[j].t));
    if (culprit) {
      var g = 1 + (0.45 - culprit.t) * 0.8;
      game.draw.rect(culprit.x - CW * g / 2, culprit.y - cam - CH * g / 2, CW * g, CH * g, N.white, 0.5 * culprit.t / 0.45 + 0.1);
    }
  }

  function drawHud() {
    neon(stacked + ' / ' + NEEDED, W / 2, 60, 56, N.cyan);
    game.draw.text('SCORE ' + score, W - 40, 40, { size: 30, color: N.yellow, bold: true, align: 'right' });
    for (var l = 0; l < LIVES; l++) {
      var alive = l < lives;
      game.draw.rect(50 + l * 56, 30, 44, 26, alive ? N.pink : '#2a2a4a');
      game.draw.rect(54 + l * 56, 34, 36, 4, alive ? N.white : '#2a2a4a', 0.6);
    }
    var low = timeLeft < 4;
    game.draw.rect(60, 104, W - 120, 18, '#1a1e48');
    game.draw.rect(62, 106, (W - 124) * Math.max(0, timeLeft / TIME_LIMIT), 14, low && Math.floor(game.time.elapsed * 8) % 2 ? N.red : N.yellow);
    // 甲板横の積み目盛り
    for (var m = 0; m < NEEDED; m++) {
      var my = BASE_Y - (m + 1) * CH + CH / 2 - cam;
      game.draw.rect(W - 70, my - 4, 30, 8, m < stacked ? N.green : '#2a2f55');
    }
  }

  function drawResult() {
    game.draw.rect(0, H * 0.2, W, H * 0.42, N.black, 0.7);
    var blink = Math.floor(resultT * 6) % 2 === 0;
    neon(success ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 110, success ? (blink ? N.yellow : N.pink) : N.red);
    neon('SCORE ' + score, W / 2, H * 0.36, 60, N.cyan);
    neon(stacked + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.42, 42, N.pink);
    if (success && score > game.best) {
      if (blink) neon('NEW RECORD', W / 2, H * 0.49, 64, N.yellow);
    } else {
      neon('BEST ' + Math.max(game.best, success ? score : 0), W / 2, H * 0.49, 42, N.yellow);
    }
    if (!success) neon('あと' + (NEEDED - stacked) + '個!', W / 2, H * 0.56, 66, N.yellow);
    if (posted && Math.floor(game.time.elapsed * 2) % 2 === 0) neon('TAP TO CONTINUE', W / 2, H * 0.965, 36, N.white);
  }

  // ---- ATTRACT: 実ロジックで 真上で切る(PERFECT) → 早切り(海へ) → 真上で切る ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.55, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); countIn = 0; demo.n = 0;
      stack.push({ x: W / 2, col: N.cyan, flash: 0 });
      trolley.x = W * 0.3;
    }
    stepYard(dt, false);
    if (demo.press > 0) demo.press -= dt;
    demo.gx += (W * 0.72 - demo.gx) * Math.min(1, dt * 3);
    demo.gy += (H * 0.62 - demo.gy) * Math.min(1, dt * 3);
    if (!falling && respawn <= 0 && cyc > 0.8 && demo.n < 3) {
      var off = hangX() - topX();
      var want = demo.n === 1 ? (Math.abs(off) > 150 && Math.abs(off) < 200) : Math.abs(off) < 6;
      if (want) { release(); demo.press = 0.25; demo.n++; }
    }
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      harbor();
      drawStack();
      crane();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      var wob = Math.sin(game.time.elapsed * 3) * 4;
      neon(GAME_TITLE, W / 2, H * 0.215 + wob, 96, N.pink);
      neon('HI-SCORE ' + game.best, W / 2, H * 0.26, 40, N.cyan);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) neon('► 100円 投入 ◄', W / 2, H * 0.965, 46, N.yellow);
      else neon('INSERT COIN', W / 2, H * 0.965, 40, N.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      harbor(); drawStack(); crane(); drawHud();
      if (success && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.25, H * 0.55), { color: BOX_COLS[Math.floor(game.random(0, 4)) % 4], count: 18, speed: 460 });
      }
      drawResult();
      if (!posted && resultT >= 1.3) {
        posted = true;
        var st = { stacked: stacked, perfects: perfects, bestStreak: bestStreak, lives: lives };
        if (success) game.end.success(score, st); else game.end.failure(st);
      }
      return;
    }

    if (holdT > 0) {
      holdT -= dt;
      if (culprit) culprit.t = Math.max(0.05, culprit.t - dt * 0.4);
      if (holdT <= 0 && over) { state = S.RESULT; resultT = 0; }
    } else if (over) {
      state = S.RESULT; resultT = 0;
    } else if (countIn > 0) {
      countIn -= dt;
      stepYard(dt * 0.3, true);
      if (countIn <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepYard(dt, true);
      if (culprit) { culprit.t -= dt; if (culprit.t <= 0) culprit = null; }
      if (timeLeft < 4) {
        beepT -= dt;
        if (beepT <= 0) { beepT = 0.5; game.audio.tone('B5', 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0;
        culprit = { x: hangX(), y: HANG_Y + cam, t: 0.45 };
        game.feedback.bad(hangX(), HANG_Y, { text: 'TIME UP', size: 64 });
        holdT = 0.45;
        end(false);
      }
    }

    harbor();
    drawStack();
    crane();
    drawHud();
    if (countIn > 0) neon(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.27, 112, N.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['E5', 0.5], ['B4', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 1],
      ['C5', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['E4', 1],
    ], { tempo: 132, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 1], ['E3', 1], ['C2', 1], ['C3', 1], ['D2', 1], ['D3', 1], ['B1', 1], ['B2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

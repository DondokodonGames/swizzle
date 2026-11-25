// I-DS-0006v2-noodle-crank-exact.js
// 製麺機ぴったり回し — 重いはずみ車の製麺機を指で円を描いて回し、注文の束数ちょうどで止まるように手を離す
// 操作: 画面の上で指をぐるぐる回すと製麺機のハンドルが回り、1周ごとに麺がひと束切れて落ちる。指では押し回せるが止められない。はずみ車の惰性まで読んで早めに回すのをやめる
// 終わり: 3つの注文(束数が増え、はずみ車が重くなり、止まる位置の目印が消える)を18秒以内にちょうどで仕上げればCLEAR。切りすぎ/足りずに止まるのは1回まで、2回目か時間切れでGAME OVER
// @mechanic: count_exact
// @theme: noodle_mill_crank_exact_turns
// 世界観: 老舗の製麺所で、ねじり鉢巻の麺職人が手回しの製麺機を注文の束数ぶんだけ回し、はずみ車の惰性を読んで切りすぎずに麺を切り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + ちょうどで仕上げた注文の数・切った束数・スコア
// スタイル: 90s BIG SPRITE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床に楕円影、背景は横1層
  var STYLE = { bg: ['#f0d8a8', '#c89a62'], main: ['#2e5c8a', '#f4f0e4', '#d84a32'], accent: ['#f2c230', '#3a2418'] };
  var CREAM = STYLE.bg[0], WOODL = STYLE.bg[1], INDIGO = STYLE.main[0], WHITE = STYLE.main[1], RED = STYLE.main[2], GOLD = STYLE.accent[0], INK = STYLE.accent[1];
  var STEEL = '#7a8a96', STEEL_D = '#4a5660', NOODLE = '#f6e6b0';

  var TITLE = 'MEN CRANK';
  var TIME_LIMIT = 18;
  var ORDERS = [
    { n: 3, fr: 3.2, mark: true },
    { n: 5, fr: 2.4, mark: false },
    { n: 6, fr: 1.8, mark: false },
  ];
  var LIVES = 2;
  var TAU = Math.PI * 2;
  var CX = W * 0.6, CY = H * 0.47, R = 220;
  var SETTLE = 0.5;
  var TRAY_Y = H * 0.80;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 巨大職人(16x22)
  var MASTER = [
    ['....rrrrrrrr....', '...rrwwrrwwrr...', '...hhhhhhhhhh...', '..hffffffffffh..', '..ffeeffffeeff..', '..ffkeffffekff..', '..ffffffffffff..', '..fffffmmfffff..', '...ffffffffff...', '....ffffffff....', '...bbbwwwwbbb...', '..bbbbwwwwbbbb..', '.bbbbbwwwwbbbbb.', '.bbbbbwwwwbbbbb.', '.ffbbbwwwwbbbff.', '.ffbbbbbbbbbbff.', '..bbbbbbbbbbbb..', '..ggggggggggg...', '..ggggg..ggggg..', '..ggggg..ggggg..', '..kkkk....kkkk..', '.kkkkk....kkkkk.'],
    ['....rrrrrrrr....', '...rrwwrrwwrr...', '...hhhhhhhhhh...', '..hffffffffffh..', '..ffeeffffeeff..', '..ffkeffffekff..', '..ffffffffffff..', '..ffffmmmmffff..', '...ffffffffff...', '....ffffffff....', '...bbbwwwwbbb...', '..bbbbwwwwbbbb..', '.bbbbbwwwwbbbbb.', '.bbbbbwwwwbbbbb.', '.ffbbbwwwwbbbff.', '.ffbbbbbbbbbbff.', '..bbbbbbbbbbbb..', '..ggggggggggg...', '..ggggg..ggggg..', '..ggggg..ggggg..', '..kkkk....kkkk..', '.kkkkk....kkkkk.'],
    ['ff..rrrrrrrr..ff', 'ff.rrwwrrwwrr.ff', '.f.hhhhhhhhhh.f.', '.bhffffffffffhb.', '.bffeeffffeeffb.', '.bffkeffffekffb.', '..ffffffffffff..', '..ffffmmmmffff..', '...ffmmmmmmff...', '....ffffffff....', '...bbbwwwwbbb...', '..bbbbwwwwbbbb..', '..bbbbwwwwbbbb..', '..bbbbwwwwbbbb..', '..bbbbwwwwbbbb..', '..bbbbbbbbbbbb..', '..bbbbbbbbbbbb..', '..ggggggggggg...', '..ggggg..ggggg..', '..ggggg..ggggg..', '..kkkk....kkkk..', '.kkkkk....kkkkk.'],
    ['................', '....rrrrrrrr....', '...rrwwrrwwrr...', '...hhhhhhhhhh...', '..hffffffffffh..', '..ffkkffffkkff..', '..ffffffffffff..', '..ffffmmmmffff..', '...ffffffffff...', '....ffffffff....', '...bbbwwwwbbb...', '..bbbbwwwwbbbb..', '.bbbbbwwwwbbbbb.', '.ffbbbwwwwbbbff.', '.ffbbbbbbbbbbff.', '..bbbbbbbbbbbb..', '..bbbbbbbbbbbb..', '..ggggggggggg...', '..ggggg..ggggg..', '..ggggg..ggggg..', '..kkkk....kkkk..', '.kkkkk....kkkkk.'],
  ];
  var BUNDLE = ['y.y.y.y', 'yyyyyyy', 'y.y.y.y', 'y.y.y.y', 'rrrrrrr', 'y.y.y.y', 'y.y.y.y'];

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 5, y + 5, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── はずみ車(プレイ・デモ共通)。指は押し回すだけ、止めるのは摩擦だけ ──
  function makeCrank(fr) { return { th: 0, om: 0, fr: fr, cuts: 0, grab: false, push: 0, still: 0 }; }
  function stepCrank(c, dt) {
    if (c.grab && c.push > c.om) c.om += (c.push - c.om) * Math.min(1, dt * 12);
    else { c.om *= Math.exp(-c.fr * dt); if (c.om < 0.15) c.om = 0; }
    c.push *= Math.exp(-dt * 14);
    c.th += c.om * dt;
    var n = Math.floor(c.th / TAU);
    var fresh = n - c.cuts;
    c.cuts = n;
    return fresh;
  }
  function stopAngle(c) { return c.th + c.om / c.fr; }

  // ── 描画 ──
  function drawMill() {
    game.draw.gradient(0, H, [[0, CREAM], [0.62, WOODL], [0.63, '#a87a48'], [1, '#7a5432']]);
    // 背景1層: 粉袋と格子窓と暖簾
    game.draw.rect(60, H * 0.16, 300, 220, '#fff8e8');
    for (var i = 0; i < 4; i++) game.draw.rect(60 + i * 75, H * 0.16, 6, 220, INK, 0.5);
    game.draw.rect(60, H * 0.16 + 108, 300, 6, INK, 0.5);
    for (var s = 0; s < 3; s++) {
      game.draw.rect(W * 0.66 + s * 110, H * 0.53, 100, 120, WHITE);
      game.draw.rect(W * 0.66 + s * 110, H * 0.53, 100, 18, INDIGO);
    }
    game.draw.rect(0, H * 0.62, W, 10, INK, 0.3);
    for (var p = 0; p < 9; p++) game.draw.rect(p * 130, H * 0.64, 4, H * 0.36, INK, 0.12);
    for (var f = 0; f < 10; f++) game.draw.circle((f * 113 + game.time.elapsed * 20) % W, H * 0.2 + (f * 71) % 260, 4, WHITE, 0.5);
  }

  function drawMachine(c, flash) {
    // 本体
    game.draw.rect(CX - 300, CY - 280, 600, 90, STEEL_D);
    game.draw.rect(CX - 290, CY - 272, 580, 74, STEEL);
    game.draw.rect(CX - 260, CY - 330, 520, 50, NOODLE);
    game.draw.rect(CX - 60, CY + 230, 120, 120, STEEL_D);
    // 回るローラー
    var rolls = Math.floor(c.th * 3) % 2;
    for (var r = 0; r < 8; r++) game.draw.rect(CX - 270 + r * 70, CY - 262 + (r + rolls) % 2 * 6, 40, 54, STEEL_D, 0.6);
    // はずみ車(輪 + スポーク)
    game.draw.circle(CX, CY, R + 24, STEEL_D);
    game.draw.circle(CX, CY, R + 6, flash ? '#ffffff' : STEEL);
    game.draw.circle(CX, CY, R - 30, '#5e6c78');
    for (var k = 0; k < 6; k++) {
      var a = c.th + (k / 6) * TAU;
      game.draw.line(CX, CY, CX + Math.cos(a) * (R - 20), CY + Math.sin(a) * (R - 20), STEEL, 22);
    }
    game.draw.circle(CX, CY, 46, GOLD);
    // 1周の頭の刃の位置(真上)
    game.draw.rect(CX - 8, CY - R - 54, 16, 46, RED);
    // ハンドル
    var hx = CX + Math.cos(c.th - Math.PI / 2) * R, hy = CY + Math.sin(c.th - Math.PI / 2) * R;
    game.draw.circle(hx, hy, 44, INK);
    game.draw.circle(hx, hy, 34, RED);
    return { x: hx, y: hy };
  }

  function drawStopMark(c, n) {
    // 止まる位置の目印(1つ目の注文だけ): 惰性で止まる角度と、ちょうど/切りすぎの境目
    var sa = stopAngle(c);
    var a = sa - Math.PI / 2;
    var ok = Math.floor(sa / TAU) === n;
    game.draw.circle(CX + Math.cos(a) * (R + 70), CY + Math.sin(a) * (R + 70), 20, ok ? GOLD : RED, 0.9);
    game.draw.line(CX + Math.cos(a) * (R + 30), CY + Math.sin(a) * (R + 30), CX + Math.cos(a) * (R + 56), CY + Math.sin(a) * (R + 56), ok ? GOLD : RED, 8);
  }

  function drawMaster(pose, handle) {
    var fr = pose === 'cheer' ? 2 : pose === 'sad' ? 3 : Math.floor(game.time.elapsed * 2) % 4 === 0 ? 1 : 0;
    var bob = Math.sin(game.time.elapsed * 2.5) * 6 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 26 : 0);
    var mx = W * 0.17, my = H * 0.60;
    game.draw.rect(mx - 170, my + 210, 340, 34, INK, 0.25);
    game.draw.circle(mx - 120, my + 226, 18, INK, 0.25); game.draw.circle(mx + 120, my + 226, 18, INK, 0.25);
    game.draw.sprite(MASTER[fr], { r: RED, w: WHITE, h: INK, f: '#f2c49a', e: WHITE, k: INK, m: '#a03020', b: INDIGO, g: '#2a2a3a' }, mx, my + bob, 20, { anchor: 'center' });
    if (handle && pose !== 'cheer') {
      game.draw.line(mx + 120, my - 20 + bob, handle.x, handle.y, INDIGO, 46);
      game.draw.circle(handle.x, handle.y, 30, '#f2c49a');
    }
  }

  function drawTray(cut, need, flashIdx, flashK) {
    game.draw.rect(W * 0.32, TRAY_Y + 70, W * 0.62, 36, WOODL);
    game.draw.rect(W * 0.32, TRAY_Y + 106, W * 0.62, 14, INK, 0.5);
    for (var i = 0; i < Math.min(cut, 10); i++) {
      var over = i >= need;
      var fk = i === flashIdx ? flashK : 0;
      game.draw.sprite(BUNDLE, { y: fk ? '#ffffff' : over ? '#e8a090' : NOODLE, r: over ? RED : INDIGO }, W * 0.38 + i * 64, TRAY_Y + 30, 9 * (1 + fk * 0.5), { anchor: 'center' });
    }
  }

  function drawOrder(need, cut) {
    game.draw.rect(W * 0.52, 34, W * 0.44, 132, WHITE);
    game.draw.rect(W * 0.52, 34, W * 0.44, 16, RED);
    for (var i = 0; i < need; i++) {
      game.draw.sprite(BUNDLE, { y: i < cut ? GOLD : NOODLE, r: i < cut ? RED : INDIGO }, W * 0.56 + i * 52, 110, 6, { anchor: 'center', alpha: i < cut ? 1 : 0.55 });
    }
    label(String(need), W * 0.92, 112, 60, RED);
  }

  // ── 状態 ──
  var spinAcc = 0, clickAcc = 0;
  var ord, crank, lives, doneN, totalCut, perfects, score, timeLeft, lastAng, touching, ready, halt, over, won, endT, prevBest, pose, sparkT, lastDiff, judged, milestoneDone, betweenT;

  function initGame() {
    ord = 0; lives = LIVES; doneN = 0; totalCut = 0; perfects = 0; score = 0; timeLeft = TIME_LIMIT;
    lastAng = null; touching = false; ready = 0.8; halt = null; over = false; won = false; endT = 0;
    pose = 'idle'; sparkT = 0; lastDiff = 0; judged = false; milestoneDone = false; betweenT = 0;
    prevBest = game.best || 0;
    crank = makeCrank(ORDERS[0].fr);
  }

  function nextOrder() {
    ord++;
    crank = makeCrank(ORDERS[ord].fr);
    judged = false; lastAng = null;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8; pose = ok ? 'cheer' : 'sad';
    if (ok) score += Math.round(timeLeft * 25) + lives * 60;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function settleJudge() {
    var need = ORDERS[ord].n;
    judged = true;
    lastDiff = need - crank.cuts;
    if (lastDiff === 0) {
      doneN++;
      var frac = (crank.th / TAU) - crank.cuts;
      var perfect = frac < 0.3;
      if (perfect) perfects++;
      score += need * 60 + (perfect ? 120 : 40);
      game.feedback.good(CX, CY - R - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: GOLD, count: 18 });
      if (doneN === 2 && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup(doneN + ' / ' + ORDERS.length, W / 2, H * 0.14, { color: RED, size: 62 });
        game.audio.play('se_milestone', 0.45);
      }
      betweenT = 0.7;
    } else {
      halt = { t: 0.45, max: 0.45, idx: Math.max(0, crank.cuts - 1) };
    }
  }

  function canPlay() { return state === S.PLAYING && !over && !halt && ready <= 0 && !judged; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) game.fx.burst(x, y, { color: WHITE, count: 3, speed: 60 });
  });

  game.onPress(function (x, y) {
    if (canPlay()) {
      touching = true; crank.grab = true;
      lastAng = Math.atan2(y - CY, x - CX);
      game.audio.play('se_tap', 0.12);
    } else if (state === S.PLAYING) {
      game.audio.play('se_tap', 0.04);
    }
  });

  game.onMove(function (x, y) {
    if (!touching || !canPlay()) return;
    var d = Math.hypot(x - CX, y - CY);
    var ang = Math.atan2(y - CY, x - CX);
    if (lastAng !== null && d > 70) {
      var da = ang - lastAng;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      spinAcc += Math.abs(da);
      clickAcc += Math.abs(da);
      // 歯車のカチカチ(押し回している手応え)
      if (clickAcc > 1.2) { clickAcc = 0; game.audio.tone(180 + crank.om * 10, 0.03, { wave: 'triangle', volume: 0.04 }); }
    }
    lastAng = ang;
  });

  game.onRelease(function (x, y) {
    if (touching) {
      touching = false; crank.grab = false; lastAng = null;
      game.audio.tone(crank.om > 3 ? 300 : 220, 0.05, { wave: 'square', volume: 0.05 });
    } else {
      game.audio.play('se_tap', 0.03);
    }
  });

  // ── ATTRACT: 3束の注文。2周半で手を止め、惰性で3束目を切ってぴたり。次は回しすぎて4束目を切る ──
  var DEMO_CYCLE = 6.0;
  var demo = { t: 0, crank: null, gx: CX, gy: CY, press: false, phase: 0, flash: 0, cuts: 0, mood: 'idle' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.crank) { demo.crank = makeCrank(3.2); demo.phase = 0; demo.flash = 0; demo.mood = 'idle'; }
    var c = demo.crank;
    var stopAt = demo.phase === 0 ? 2.68 : 3.75;
    var pushing = (demo.phase === 0 && cyc > 0.2 && c.th / TAU < stopAt) || (demo.phase === 2 && c.th / TAU < stopAt);
    c.grab = pushing;
    if (pushing) c.push = 9.5;
    var fresh = stepCrank(c, dt);
    if (fresh > 0) { game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 }); game.fx.burst(CX, CY + R + 60, { color: NOODLE, count: 5, speed: 120 }); }
    if (demo.phase === 0 && cyc > 0.5 && c.om === 0) {
      demo.phase = 1; demo.mood = 'cheer';
      game.feedback.good(CX, CY - R - 90, { text: 'PERFECT', color: GOLD, count: 10, volume: 0.3 });
    }
    if (demo.phase === 1 && cyc > 3.9) { demo.phase = 2; demo.mood = 'idle'; }
    if (demo.phase === 2 && c.cuts >= 4) {
      demo.phase = 3; demo.flash = 0.45; demo.mood = 'sad';
      game.feedback.bad(CX, CY - R - 90, { text: 'MISS', volume: 0.3 });
    }
    if (demo.flash > 0) demo.flash -= dt;
    var ha = c.th - Math.PI / 2;
    var tx = pushing ? CX + Math.cos(ha + 0.3) * (R - 10) : W * 0.5;
    var ty = pushing ? CY + Math.sin(ha + 0.3) * (R - 10) : H * 0.74;
    demo.press = pushing;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 16);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 16);
    return cyc;
  }

  function drawHud(need) {
    for (var i = 0; i < ORDERS.length; i++) {
      var col = i < doneN ? GOLD : i === ord ? WHITE : '#c8b088';
      game.draw.circle(70 + i * 90, 70, 32, INK, 0.5);
      game.draw.circle(70 + i * 90, 70, 24, col);
    }
    for (var l = 0; l < LIVES; l++) game.draw.circle(70 + l * 70, 150, 22, l < lives ? RED : '#c8b088');
    label(doneN + ' / ' + ORDERS.length, W * 0.38, 70, 42, WHITE);
    label(String(score), W * 0.38, 150, 36, GOLD);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 196, W - 80, 24, INK, 0.5);
    game.draw.rect(44, 200, (W - 88) * fr, 16, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : INDIGO);
    drawOrder(need, Math.min(crank.cuts, need));
  }

  function drawResult() {
    game.draw.rect(80, H * 0.24, W - 160, H * 0.30, INK, 0.85);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 104, won ? GOLD : RED);
    label(doneN + ' / ' + ORDERS.length, W / 2, H * 0.36, 60, WHITE);
    label('SCORE ' + score, W / 2, H * 0.42, 50, WHITE);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.48, 54, GOLD);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 42, CREAM);
    if (!won && lastDiff > 0) label('あと' + lastDiff + '束!', W / 2, H * 0.525, 46, GOLD);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      var cyc = stepDemo(dt);
      drawMill();
      var dh = drawMachine(demo.crank, demo.flash > 0);
      if (demo.phase === 0) drawStopMark(demo.crank, 3);
      drawMaster(demo.mood, dh);
      drawTray(demo.crank.cuts, 3, demo.flash > 0 ? 3 : -1, demo.flash > 0 ? 1 - demo.flash / 0.45 : 0);
      drawOrder(3, Math.min(3, demo.crank.cuts));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W * 0.27, H * 0.04, 76, RED);
      label('HI-SCORE ' + (game.best || 0), W * 0.27, H * 0.085, 34, INDIGO);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, RED);
      else label('TAP TO START', W / 2, H * 0.965, 40, INDIGO);
      return cyc;
    }

    var need = ORDERS[ord].n;
    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(120, W - 120), game.random(H * 0.2, H * 0.6), { color: [GOLD, RED, NOODLE, INDIGO][Math.floor(game.random(0, 4))], count: 16, speed: 360 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          halt = null;
          lives--;
          game.feedback.bad(CX, CY - R - 90, { text: 'MISS' });
          game.fx.popup(lastDiff > 0 ? 'あと' + lastDiff + '束' : '+' + (-lastDiff), W / 2, H * 0.62, { color: RED, size: 64 });
          if (lives <= 0) finish(false);
          else betweenT = 0.8;
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_jump', 0.3);
      } else if (betweenT > 0) {
        betweenT -= dt;
        if (betweenT <= 0) {
          if (ord + 1 >= ORDERS.length) finish(lives > 0);
          else { nextOrder(); game.audio.play('se_coin', 0.3); }
        }
      } else {
        timeLeft -= dt;
        if (touching) { var sp = Math.min(16, spinAcc / Math.max(dt, 1 / 120)); if (sp > crank.push) crank.push = sp; }
        spinAcc = 0;
        var fresh = stepCrank(crank, dt);
        if (fresh > 0) {
          totalCut += fresh;
          game.audio.play('se_tap', 0.3);
          game.audio.tone(crank.cuts === need ? 988 : 523 + crank.cuts * 30, 0.06, { wave: 'square', volume: 0.07 });
          game.fx.burst(CX, CY + R + 60, { color: NOODLE, count: 8, speed: 160 });
          if (crank.cuts > need) {
            // 切りすぎ: その束を止めて見せる
            lastDiff = need - crank.cuts;
            judged = true;
            crank.om = 0; crank.grab = false; touching = false;
            halt = { t: 0.45, max: 0.45, idx: crank.cuts - 1 };
          }
        }
        if (!judged && crank.om === 0 && crank.cuts >= 1 && !(touching && crank.push > 0.5)) {
          crank.still += dt;
          if (crank.still >= SETTLE) settleJudge();
        } else if (crank.om > 0) {
          crank.still = 0;
        }
        if (timeLeft <= 0 && !over) {
          timeLeft = 0;
          lastDiff = need - crank.cuts;
          game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    drawMill();
    var hk = halt ? 1 - halt.t / halt.max : 0;
    var hd = drawMachine(crank, halt && hk < 0.5);
    if (ORDERS[ord].mark && !judged && !over) drawStopMark(crank, need);
    drawMaster(pose, hd);
    drawTray(crank.cuts, need, halt ? halt.idx : -1, hk);
    // 止まり待ち(落ち着くまでの輪)
    if (!judged && crank.still > 0 && !over) game.draw.rect(CX - 120, CY + R + 110, 240 * (crank.still / SETTLE), 14, GOLD);
    drawHud(need);
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 120, RED);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, WHITE);
      var stats = { orders: doneN, total: ORDERS.length, cut: totalCut, perfect: perfects };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 1],
      ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 2],
      ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 2],
    ], {
      tempo: 108, wave: 'square', volume: 0.045, loop: true,
      bass: [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['D3', 1], ['A2', 1], ['E3', 1], ['A2', 1],
        ['C3', 1], ['G2', 1], ['D3', 1], ['A2', 1], ['E3', 1], ['B2', 1], ['A2', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);

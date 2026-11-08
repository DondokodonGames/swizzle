// I-DS-0024v2-yearend-parcel-rip.js
// 年の瀬の荷ほどき — 台に次々すべり込む包みを、素早い一筆の線で切り裂いて開け、14個ぜんぶを時間内に開け切る
// 操作: 画面を素早くなぞると切り線になり、横切った包みの紙が裂けて開く。ゆっくりなぞると紙がよれるだけで開かない。一直線に並んだ包みは一筆でまとめて開く
// 終わり: 14個すべてを14秒以内に開ければCLEAR。台が埋まった所へ次の包みが来て台からこぼれる(右端が赤く点滅して予告)、または時間切れでGAME OVER
// @mechanic: slice
// @theme: yearend_shop_unpacking
// 世界観: 年末の商店街の乾物屋の荷ほどき場で、店員が問屋から次々すべり込んでくる茶色い包み紙の荷を一振りで裂いて中身を取り出し、台からあふれる前に正月の品出しを済ませる
// 残るもの: 正誤(CLEAR/GAME OVER) + 開けた個数・最大まとめ切り数・スコア
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定6色のパレットだけで完結。大きいドット、差し色は赤1色
  var STYLE = { bg: ['#1b1d2e', '#3a3458'], main: ['#c89a5a', '#f2e6c8', '#6a4a3a'], accent: ['#ff3b5c', '#1b1d2e'] };
  var V = { dark: STYLE.bg[0], bg2: STYLE.bg[1], kraft: STYLE.main[0], cream: STYLE.main[1], wood: STYLE.main[2], red: STYLE.accent[0] };

  var GAME_TITLE = 'PARCEL RIP';
  var TIME_LIMIT = 14;
  var WAVES = [2, 3, 4, 5];
  var TOTAL = 14;
  var CUT_SPEED = 1300;
  var PW = 230, PH = 150;
  var COLS = [W * 0.22, W * 0.5, W * 0.78];
  var ROWS = [Math.round(H * 0.42), Math.round(H * 0.54), Math.round(H * 0.66)];
  var SLOT_ORDER = [3, 4, 5, 0, 1, 2, 6, 7, 8];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var parcels, slots, pen, trail, opened, waveIdx, waveT, warned, bestMulti, score, finalScore, basket;
  var timeLeft, readyT, stopT, stopObj, fin, cleared, postT, swingT, sadT, warnT, playT;

  // 前掛けの店員(ねじり鉢巻)
  var CLERK_A = ['..rrrrrr..', '.cccccccc.', '..kkkkkk..', '..kckkck..', '..kkkkkk..', '...kkkk...', '.wwwwwwww.', 'kwwccccwwk', '.wwccccww.', '..cccccc..', '..ww..ww..'];
  var CLERK_B = ['..rrrrrr..', '.cccccccc.', '..kkkkkk..', '..kckkck..', '..kkkkkk..', '...kkkk...', '.wwwwwwww.', '.wwccccww.', 'kwwccccwwk', '..cccccc..', '..ww..ww..'];
  var CLERK_SWING = ['..rrrrrr..', '.cccccccc.', '..kkkkkk..', '..kckkck..', '..kkrrkk..', 'k..kkkk...', '.kwwwwwww.', '..wccccww.', '..wccccwwk', '..cccccc..', '..ww..ww..'];
  var CLERK_SAD = ['..........', '..rrrrrr..', '.cccccccc.', '..kkkkkk..', '..kckkck..', '..kccckk..', '.wwwwwwww.', 'kwwccccwwk', '.wwccccww.', '..cccccc..', '..ww..ww..'];
  var CLERK_PAL = { r: V.red, c: V.cream, k: V.kraft, w: V.wood };
  // 中身(正月の品)
  var GOODS = [
    ['.rrrr.', 'rrccrr', 'rcwwcr', 'rrrrrr', 'rrrrrr', '.rrrr.'],
    ['......', '.cccc.', 'cccccc', 'cccccc', '.cccc.', 'wwwwww'],
    ['r....r', '.rkkr.', '.kkkk.', '.kkkk.', '.rkkr.', 'r....r'],
    ['..cc..', '.crrc.', 'crrrrc', '.crrc.', '..cc..', '..ww..'],
  ];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: V.dark, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    parcels = []; slots = [null, null, null, null, null, null, null, null, null];
    pen = null; trail = []; opened = 0; waveIdx = 0; waveT = 0.15; warned = false; bestMulti = 0; score = 0; finalScore = 0; basket = [];
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopObj = null; fin = false; cleared = false; postT = 0;
    swingT = 0; sadT = 0; warnT = 0; playT = 0;
  }

  function freeSlots() { var n = 0; for (var i = 0; i < 9; i++) if (!slots[i]) n++; return n; }

  function deliver(n) {
    for (var i = 0; i < n; i++) {
      var s = -1;
      for (var k = 0; k < SLOT_ORDER.length; k++) if (!slots[SLOT_ORDER[k]]) { s = SLOT_ORDER[k]; break; }
      var p = { x: W + 160 + i * 140, y: 0, tx: 0, ty: 0, slot: s, st: 'slide', open: 0, dir: 0, kind: Math.floor(game.random(0, 4)) % 4, flash: 0, wob: game.random(0, 6), vy: 0 };
      if (s < 0) {
        // 台があふれた: こぼれる包み
        p.st = 'spill'; p.ty = ROWS[0] - 40; p.y = p.ty; p.tx = COLS[2]; p.x = W - 150;
        parcels.push(p);
        if (mode === S.PLAYING && stopT <= 0) {
          stopT = 0.55; stopObj = { kind: 'spill', p: p };
          game.fx.flash('#ffffff', 0.15);
          game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
        }
        continue;
      }
      p.tx = COLS[s % 3]; p.ty = ROWS[Math.floor(s / 3)]; p.y = p.ty;
      slots[s] = p; parcels.push(p);
    }
    game.audio.play('se_jump', 0.25);
  }

  function nextWave() {
    if (waveIdx >= WAVES.length) return;
    deliver(WAVES[waveIdx]);
    waveIdx++; waveT = 2.6; warned = false;
  }

  function hitRect(p, x, y) { return Math.abs(x - p.x) < PW / 2 + 8 && Math.abs(y - p.y) < PH / 2 + 8; }

  function cut(p, dx, dy) {
    p.st = 'open'; p.open = 0; p.dir = Math.abs(dx) >= Math.abs(dy) ? 0 : 1; p.flash = 0.25;
    if (p.slot >= 0) slots[p.slot] = null;
    opened++; pen.cuts++;
    swingT = 0.3;
    var pts = 100 * pen.cuts;
    score += pts;
    game.feedback.good(p.x, p.y - 40, { text: pen.cuts > 1 ? 'x' + pen.cuts : 'GOOD', color: V.cream, size: 56 });
    game.audio.play('se_break', 0.3);
    game.audio.tone(520 + pen.cuts * 140, 0.08, { wave: 'square', volume: 0.07 });
    game.fx.popup('+' + pts, p.x + 80, p.y - 100, { color: V.red, size: 40 });
    if (mode === S.PLAYING && opened === 7) { game.audio.play('se_milestone', 0.45); game.fx.popup('あと7個!', W / 2, H * 0.31, { color: V.cream, size: 64 }); }
  }

  // なぞり線の1区間(本番もデモも同じ処理)
  function strokeTo(x, y) {
    if (!pen) return;
    var now = game.time.elapsed;
    trail.push({ x: x, y: y, t: now });
    var old = trail[0];
    for (var i = trail.length - 1; i >= 0; i--) { if (now - trail[i].t > 0.08) { old = trail[i]; break; } old = trail[i]; }
    var el = Math.max(1 / 60, now - old.t);
    var spd = Math.hypot(x - old.x, y - old.y) / el;
    var dx = x - pen.x, dy = y - pen.y, len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / 14));
    for (var k = 0; k < parcels.length; k++) {
      var p = parcels[k];
      if (p.st !== 'idle' && p.st !== 'slide') continue;
      if (p.x > W - 40) continue;
      for (var s = 0; s <= n; s++) {
        var sx = pen.x + dx * s / n, sy = pen.y + dy * s / n;
        if (!hitRect(p, sx, sy)) continue;
        if (spd >= CUT_SPEED) cut(p, dx, dy);
        else if (!pen.warned) {
          pen.warned = true; p.wob = 0; p.flash = 0.2;
          game.feedback.bad(p.x, p.y - 40, { text: 'MISS', color: V.red, size: 50 });
        }
        break;
      }
    }
    pen.x = x; pen.y = y; pen.fast = spd >= CUT_SPEED;
  }

  function penUp() {
    if (!pen) return;
    if (pen.cuts > bestMulti) bestMulti = pen.cuts;
    if (pen.cuts >= 2) { game.audio.play('se_powerup', 0.35); score += pen.cuts * 50; }
    pen = null;
  }

  function stepParcels(dt) {
    for (var i = parcels.length - 1; i >= 0; i--) {
      var p = parcels[i];
      if (p.flash > 0) p.flash -= dt;
      p.wob += dt;
      if (p.st === 'slide') { p.x += (p.tx - p.x) * Math.min(1, dt * 9); if (Math.abs(p.x - p.tx) < 3) { p.x = p.tx; p.st = 'idle'; } }
      else if (p.st === 'spill') {
        if (p.x > p.tx + 260) p.x -= 900 * dt;
        else { p.vy += 2400 * dt; p.y += p.vy * dt; p.x += 80 * dt; }
      } else if (p.st === 'open') {
        p.open += dt;
        if (p.open > 0.7) { basket.push(p.kind); parcels.splice(i, 1); }
      }
    }
    for (var t = trail.length - 1; t >= 0; t--) if (game.time.elapsed - trail[t].t > 0.25) trail.splice(t, 1);
    if (swingT > 0) swingT -= dt;
    if (sadT > 0) sadT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 50 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.5 + (i % 2) * 140, { color: i % 2 ? V.red : V.cream, count: 18, speed: 520 });
      game.fx.flash(V.cream, 0.22);
    } else sadT = 2;
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (!canPlay()) return;
    pen = { x: x, y: y, cuts: 0, warned: false, fast: false };
    trail = [{ x: x, y: y, t: game.time.elapsed }];
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (!canPlay() || !pen) return;
    strokeTo(x, y);
    if (pen && pen.fast && Math.random() < 0.3) game.audio.tone(900 + Math.random() * 300, 0.02, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (!pen) return;
    if (pen.cuts === 0) game.audio.tone('E3', 0.04, { wave: 'triangle', volume: 0.05 });
    penUp();
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function room(t) {
    game.draw.gradient(0, H, [[0, V.dark], [0.5, V.bg2], [1, V.dark]]);
    // 棚と積み荷(大きいドットの影絵)
    for (var s = 0; s < 3; s++) {
      game.draw.rect(0, H * 0.12 + s * 110, W, 12, V.wood);
      for (var b = 0; b < 6; b++) game.draw.rect(40 + b * 180 + (s % 2) * 60, H * 0.12 + s * 110 - 72, 120, 72, b % 3 === 0 ? V.kraft : V.wood, 0.5);
    }
    // 荷台(台の天板)
    game.draw.rect(40, H * 0.35, W - 80, H * 0.385, V.wood);
    game.draw.rect(56, H * 0.35 + 16, W - 112, H * 0.385 - 32, '#4e3a32');
    for (var g = 0; g < 6; g++) game.draw.rect(56, H * 0.35 + 40 + g * 120, W - 112, 6, V.wood, 0.6);
    // 右端の搬入口(あふれの予告で赤く点滅)
    var nextN = waveIdx < WAVES.length ? WAVES[waveIdx] : 0;
    var danger = mode !== S.RESULT && nextN > freeSlots() && waveT < 0.75 && !fin;
    var blink = danger && Math.floor(t * 12) % 2 === 0;
    game.draw.rect(W - 56, H * 0.35, 40, H * 0.385, blink ? V.red : V.kraft);
    for (var a = 0; a < 5; a++) game.draw.rect(W - 50, H * 0.37 + a * 140, 28, 28, blink ? V.cream : V.wood);
    if (danger) {
      game.draw.rect(W - 130, H * 0.30, 28, 70, V.red);
      game.draw.rect(W - 130, H * 0.30 + 84, 28, 24, V.red);
    }
  }

  function drawParcel(p, t) {
    var big = stopObj && stopT > 0 && stopObj.p === p;
    var sc = big ? 1.3 : 1;
    var wf = (p.flash > 0 && Math.floor(p.flash * 30) % 2 === 0) || (big && Math.floor(t * 16) % 2 === 0);
    var w = PW * sc, h = PH * sc, x = p.x, y = p.y;
    if (p.st === 'open') {
      var u = Math.min(1, p.open / 0.35), gap = u * 70;
      var g = GOODS[p.kind];
      game.draw.sprite(g, { r: V.red, c: V.cream, k: V.kraft, w: V.wood }, x, y - u * 80 - Math.max(0, p.open - 0.35) * 200, 16, { anchor: 'center' });
      if (p.dir === 0) {
        game.draw.rect(x - w / 2, y - h / 2 - gap, w, h / 2, V.kraft, 1 - u * 0.6);
        game.draw.rect(x - w / 2, y + gap, w, h / 2, V.kraft, 1 - u * 0.6);
      } else {
        game.draw.rect(x - w / 2 - gap, y - h / 2, w / 2, h, V.kraft, 1 - u * 0.6);
        game.draw.rect(x + gap, y - h / 2, w / 2, h, V.kraft, 1 - u * 0.6);
      }
      return;
    }
    var bob = p.st === 'idle' ? Math.sin(t * 4 + p.wob) * 4 : 0;
    game.draw.rect(x - w / 2 + 12, y - h / 2 + 16, w, h, V.dark, 0.5);
    game.draw.rect(x - w / 2, y - h / 2 + bob, w, h, wf ? '#ffffff' : V.kraft);
    // 十字のひも
    game.draw.rect(x - 8, y - h / 2 + bob, 16, h, V.cream);
    game.draw.rect(x - w / 2, y - 8 + bob, w, 16, V.cream);
    game.draw.rect(x - 24, y - 24 + bob, 48, 32, V.red);
    // 切れる合図: 白縁の明滅
    if (p.st === 'idle' && !fin) game.draw.rect(x - w / 2 - 6, y - h / 2 - 6 + bob, w + 12, 6, V.cream, 0.4 + Math.sin(t * 8 + p.wob) * 0.3);
  }

  function drawClerk(t) {
    var fr = sadT > 0 ? CLERK_SAD : swingT > 0 ? CLERK_SWING : (fin && cleared) ? CLERK_SWING : (Math.floor(t * 2) % 2 ? CLERK_A : CLERK_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 30 : Math.sin(t * 2.6) * 4;
    game.draw.rect(90, H * 0.93, 200, 16, V.dark, 0.6);
    game.draw.sprite(fr, CLERK_PAL, 190, H * 0.865 + hop, 16, { anchor: 'center' });
    // 品出しのざる(進捗)
    game.draw.rect(380, H * 0.84, W - 440, 150, V.wood);
    game.draw.rect(396, H * 0.84 + 14, W - 472, 122, V.dark, 0.5);
    for (var i = 0; i < TOTAL; i++) {
      var bx = 430 + (i % 7) * 82, by = H * 0.84 + 44 + Math.floor(i / 7) * 62;
      if (i < basket.length) game.draw.sprite(GOODS[basket[i]], { r: V.red, c: V.cream, k: V.kraft, w: V.wood }, bx, by, 8, { anchor: 'center' });
      else game.draw.rect(bx - 14, by - 14, 28, 28, V.bg2);
    }
  }

  function drawTrail() {
    for (var i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i];
      var col = pen && pen.fast ? V.cream : V.kraft;
      game.draw.line(a.x, a.y, b.x, b.y, V.dark, 22);
      game.draw.line(a.x, a.y, b.x, b.y, col, 12);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, V.dark);
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? V.red : V.cream);
    out(opened + ' / ' + TOTAL, W / 2, 124, 56, V.cream);
    out('' + score, W - 170, 124, 36, V.kraft);
    for (var w = 0; w < WAVES.length; w++) game.draw.rect(80 + w * 50, 160, 36, 36, w < waveIdx ? V.kraft : V.bg2);
  }

  function drawScene(t) {
    room(t);
    for (var i = 0; i < parcels.length; i++) drawParcel(parcels[i], t);
    drawTrail();
    drawClerk(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.12);
  }

  // ---- ATTRACT: 本物の strokeTo() で 並んだ2つを一筆で開け → 3つ目はゆっくりなぞって開かない ----
  var demo = { t: 0, x: W * 0.1, y: H * 0.54, press: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      deliver(3);
      // 3つ目だけ上の段へ(ゆっくりなぞる失敗例用)
      var q = parcels[2]; slots[q.slot] = null; q.slot = 0; slots[0] = q; q.tx = COLS[0]; q.ty = ROWS[0]; q.y = ROWS[0];
      for (var i = 0; i < parcels.length; i++) { parcels[i].x = parcels[i].tx; parcels[i].st = 'idle'; }
      demo.step = 0; demo.x = W * 0.06; demo.y = ROWS[1] + 30;
    }
    stepParcels(dt);
    demo.press = false;
    var y1 = ROWS[1] + 20;
    if (cyc < 0.6) { demo.x += (W * 0.06 - demo.x) * dt * 6; demo.y += (y1 - demo.y) * dt * 6; }
    else if (cyc < 0.95) {
      if (demo.step === 0) { demo.step = 1; pen = { x: demo.x, y: demo.y, cuts: 0, warned: false, fast: false }; trail = [{ x: demo.x, y: demo.y, t: game.time.elapsed }]; }
      var u = (cyc - 0.6) / 0.35;
      demo.x = W * 0.06 + (W * 0.9 - W * 0.06) * u; demo.y = y1 - u * 30;
      strokeTo(demo.x, demo.y); demo.press = true;
    } else if (cyc < 1.8) {
      if (demo.step === 1) { demo.step = 2; penUp(); }
      var row0 = ROWS[0];
      demo.x += (W * 0.08 - demo.x) * dt * 5; demo.y += (row0 - demo.y) * dt * 5;
    } else if (cyc < 3.2) {
      if (demo.step === 2) { demo.step = 3; pen = { x: demo.x, y: demo.y, cuts: 0, warned: false, fast: false }; trail = [{ x: demo.x, y: demo.y, t: game.time.elapsed }]; }
      var v = (cyc - 1.8) / 1.4;
      demo.x = W * 0.08 + (W * 0.5 - W * 0.08) * v; demo.y = ROWS[0] + Math.sin(v * 6) * 10;
      strokeTo(demo.x, demo.y); demo.press = true;
    } else if (demo.step === 3) { demo.step = 4; penUp(); }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 100, V.red);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 40, V.cream);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.8, 50, V.cream);
      else out('TAP TO START', W / 2, H * 0.8, 42, V.kraft);
      return;
    }

    if (mode === S.RESULT) {
      stepParcels(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, V.dark, 0.92);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, cleared ? V.cream : V.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, V.cream);
      out(opened + ' / ' + TOTAL + '   x' + bestMulti, W / 2, H * 0.46, 44, V.kraft);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, V.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, V.cream);
      if (!cleared) out('あと' + (TOTAL - opened) + '個!', W / 2, H * 0.27, 64, V.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.8, 42, V.cream);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepParcels(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { opened: opened, total: TOTAL, bestMulti: bestMulti };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        var o = stopObj; stopObj = null;
        if (o && o.kind === 'win') ending(true);
        else { game.feedback.bad(o && o.p ? o.p.x : W / 2, H * 0.4, { text: o && o.kind === 'time' ? 'TIME UP' : 'MISS', color: V.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepParcels(dt);
      var idle = 0;
      for (var i = 0; i < parcels.length; i++) if (parcels[i].st === 'idle' || parcels[i].st === 'slide') idle++;
      if (idle === 0 && waveT > 0.35 && waveIdx > 0) waveT = 0.35;
      waveT -= dt;
      if (waveIdx < WAVES.length && !warned && WAVES[waveIdx] > freeSlots() && waveT < 0.75) {
        warned = true;
        game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.09 });
        game.audio.tone('E5', 0.08, { wave: 'square', volume: 0.07 });
      }
      if (waveT <= 0 && waveIdx < WAVES.length) nextWave();
      if (opened >= TOTAL && stopT <= 0) { stopT = 0.45; stopObj = { kind: 'win' }; penUp(); }
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) {
        timeLeft = 0; penUp();
        var rem = null;
        for (var j = 0; j < parcels.length; j++) if (parcels[j].st === 'idle' || parcels[j].st === 'slide') { rem = parcels[j]; break; }
        stopT = 0.45; stopObj = { kind: 'time', p: rem };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(W / 2, H * 0.55, 100 + (0.45 - stopT) * 1500, V.cream, 0.3);
    // 開始直後のお手本: 並んだ包みを横切る手
    if (!fin && readyT <= 0 && opened === 0 && playT < 1.4 && !pen) {
      var sw = (playT * 1.6) % 1;
      game.draw.hand(W * 0.1 + sw * W * 0.8, ROWS[1] + 30, { press: true, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, V.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['C5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 1],
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['C5', 1],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1], ['C3', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

// I-DS-0004v3-pharmacy-bottle-shelf.js
// 調剤棚の番号ならべ — 番号順に並んだ薬棚の空き枠を、両隣の番号から読み取り、トレーの薬瓶をドラッグで正しい位置へ戻す
// 操作: 下のトレーの薬瓶を指でつまみ、棚の空き枠まで運んで離す。棚は左上から右へ、段を下りて番号が1つずつ増えていく。違う枠に入れると瓶が跳ね返る
// 終わり: 3つの棚(3本→4本→5本。後の棚ほど番号の見える瓶が減る)を22秒以内に埋めればCLEAR。置き間違い3回/時間切れでGAME OVER
// @mechanic: drag_sort
// @theme: town_pharmacy_numbered_shelf
// 世界観: 町の薬局の調剤室で、白衣の薬剤師見習いが調合を終えて戻ってきた薬瓶を、番号順に並んだ棚の空き枠へ一本ずつ運び、閉店前に棚を元どおりに並べ直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 戻した本数・置き間違い数・スコア
// スタイル: 8bit PC MONITOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数の8色ベタ。細い線、枠のUI、市松ディザで中間色
  var STYLE = { bg: ['#0a0f2a', '#18245a'], main: ['#55ffff', '#ffffff', '#ffff55'], accent: ['#ff55ff', '#55ff55'] };
  var CY = STYLE.main[0], WH = STYLE.main[1], YE = STYLE.main[2], MG = STYLE.accent[0], GR = STYLE.accent[1];
  var RD = '#ff5555', BK = '#000000', BL = '#2a3c9a';

  var TITLE = 'PHARMA SHELF';
  var TIME_LIMIT = 22;
  var MISTAKES = 3;
  var SHELF_X0 = 90, SHELF_X1 = W - 90, SHELF_Y0 = H * 0.17;
  var TRAY_Y = H * 0.78;
  var ROUNDS = [
    { rows: 2, cols: 4, empty: 3, hide: 0 },
    { rows: 2, cols: 5, empty: 4, hide: 2 },
    { rows: 3, cols: 4, empty: 5, hide: 4 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BOTTLE = ['..cccc..', '..cccc..', '.gggggg.', 'gggggggg', 'gwwwwwwg', 'gwwwwwwg', 'gwwwwwwg', 'gwwwwwwg', 'gggggggg', 'gggggggg', '.gggggg.'];
  var APPRENTICE = [
    ['..wwwwww..', '.wwwwwwww.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '.wwwwwwww.', 'wwwwccwwww', 'fwwwccwwwf', '.wwwwwwww.', '..ww..ww..', '..kk..kk..'],
    ['..wwwwww..', '.wwwwwwww.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '.wwwwwwww.', 'fwwwccwwwf', '.wwwccwwww.', '.wwwwwwww.', '..ww..ww..', '..kk..kk..'],
    ['f.wwwwww.f', 'fwwwwwwwwf', '.hffffffh.', '.fekffekf.', '.ffmmmmff.', '..ffffff..', '.wwwwwwww.', '.wwwccwww.', '.wwwccwww.', '.wwwwwwww.', '.ww....ww.', '.kk....kk.'],
    ['..........', '..wwwwww..', '.wwwwwwww.', '.hffffffh.', '.fkkffkkf.', '..ffmmff..', '.wwwwwwww.', 'fwwwccwwwf', '.wwwccwww.', '.wwwwwwww.', '..ww..ww..', '..kk..kk..'],
  ];
  var GLASS = [MG, GR, YE, CY];

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: BK, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ── 棚の生成(プレイ・デモ共通) ──
  function makeShelf(r, fixed) {
    var cfg = ROUNDS[r];
    var n = cfg.rows * cfg.cols;
    var start = fixed ? fixed.start : 10 + Math.floor(game.random(0, 80));
    var cw = (SHELF_X1 - SHELF_X0) / cfg.cols, rh = 250;
    var idx = [];
    for (var i = 0; i < n; i++) idx.push(i);
    var empties = fixed ? fixed.empties : shuffle(idx.slice()).slice(0, cfg.empty);
    var slots = [];
    for (var k = 0; k < n; k++) {
      var row = Math.floor(k / cfg.cols), col = k % cfg.cols;
      slots.push({ i: k, num: start + k, x: SHELF_X0 + (col + 0.5) * cw, y: SHELF_Y0 + row * rh + 244, w: cw, filled: empties.indexOf(k) < 0, shown: true, glass: GLASS[Math.floor(game.random(0, 4))], flash: 0, bad: 0 });
    }
    // 番号の見える瓶を減らす(後の棚ほど離れた手がかりから数える)
    var hidden = 0;
    var order = shuffle(idx.slice());
    for (var h = 0; h < order.length && hidden < cfg.hide; h++) {
      var s = slots[order[h]];
      if (s.filled && s.i !== 0) { s.shown = false; hidden++; }
    }
    var tray = [];
    var nums = empties.slice();
    if (!fixed) shuffle(nums);
    for (var t = 0; t < nums.length; t++) {
      tray.push({ num: start + nums[t], hx: 0, hy: 0, x: 0, y: 0, glass: GLASS[Math.floor(game.random(0, 4))], placed: false, back: 0 });
    }
    layoutTray(tray);
    return { cfg: cfg, slots: slots, tray: tray, rows: cfg.rows };
  }

  function layoutTray(tray) {
    var live = [];
    for (var i = 0; i < tray.length; i++) if (!tray[i].placed) live.push(tray[i]);
    for (var j = 0; j < live.length; j++) {
      live[j].hx = W / 2 + (j - (live.length - 1) / 2) * 170;
      live[j].hy = TRAY_Y;
      if (!live[j].x) { live[j].x = live[j].hx; live[j].y = live[j].hy; }
    }
  }

  function slotAt(sh, x, y) {
    for (var i = 0; i < sh.slots.length; i++) {
      var s = sh.slots[i];
      if (Math.abs(x - s.x) < s.w / 2 && y > s.y - 190 && y < s.y + 50) return s;
    }
    return null;
  }

  // ── 描画 ──
  function dither(x, y, w, h, c1, c2, cell) {
    for (var j = 0; j < h; j += cell) for (var i = 0; i < w; i += cell) if (((i + j) / cell) % 2 === 0) game.draw.rect(x + i, y + j, cell, cell, c1); else game.draw.rect(x + i, y + j, cell, cell, c2);
  }

  function drawRoom() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    for (var g = 0; g < 12; g++) game.draw.line(0, 240 + g * 140, W, 240 + g * 140, BL, 1);
    // 調合台(市松ディザの天板)
    dither(0, H * 0.72, W, 40, BL, '#000a40', 20);
    game.draw.rect(0, H * 0.74, W, H * 0.26, '#0e1640');
    game.draw.line(0, H * 0.74, W, H * 0.74, CY, 3);
    // 天秤と乳鉢の小物
    game.draw.line(W * 0.88, H * 0.70, W * 0.88, H * 0.64, WH, 4);
    game.draw.line(W * 0.82, H * 0.64, W * 0.94, H * 0.64, WH, 4);
    game.draw.circle(W * 0.82, H * 0.66, 16, CY);
    game.draw.circle(W * 0.94, H * 0.66, 16, CY);
  }

  function drawBottle(b, x, y, glass, num, shown, flash, alpha) {
    var sc = 12 * (1 + (flash || 0) * 0.25);
    game.draw.sprite(BOTTLE, { c: WH, g: flash ? WH : glass, w: flash ? YE : WH }, x, y, sc, { anchor: 'center', alpha: alpha === undefined ? 1 : alpha });
    if (shown) game.draw.text(String(num), x, y + 6, { size: 40, color: BK, bold: true, align: 'center', font: 'monospace' });
    else for (var d = 0; d < 3; d++) game.draw.rect(x - 24 + d * 18, y + 4, 10, 10, BK, 0.5);
  }

  function drawShelf(sh, nextGlow) {
    var rows = sh.rows;
    var cols = sh.cfg.cols;
    game.draw.rect(SHELF_X0 - 20, SHELF_Y0 - 10, SHELF_X1 - SHELF_X0 + 40, rows * 250 + 60, '#0b1236');
    game.draw.line(SHELF_X0 - 20, SHELF_Y0 - 10, SHELF_X1 + 20, SHELF_Y0 - 10, CY, 3);
    game.draw.line(SHELF_X0 - 20, SHELF_Y0 - 10, SHELF_X0 - 20, SHELF_Y0 + rows * 250 + 50, CY, 3);
    game.draw.line(SHELF_X1 + 20, SHELF_Y0 - 10, SHELF_X1 + 20, SHELF_Y0 + rows * 250 + 50, CY, 3);
    for (var r = 0; r < rows; r++) {
      var by = SHELF_Y0 + r * 250 + 230;
      game.draw.rect(SHELF_X0 - 20, by - 8, SHELF_X1 - SHELF_X0 + 40, 14, CY);
      // 段の終わりから次の段の頭へ(読み順の矢印)
      if (r < rows - 1) {
        game.draw.line(SHELF_X1 - 10, by + 20, SHELF_X0 + 10, by + 40, MG, 2);
        game.draw.rect(SHELF_X0, by + 32, 18, 18, MG);
      }
      for (var c = 0; c < cols - 1; c++) {
        var ax = SHELF_X0 + (c + 1) * sh.slots[0].w;
        game.draw.line(ax - 12, by + 16, ax + 12, by + 16, BL, 3);
        game.draw.line(ax + 4, by + 10, ax + 12, by + 16, BL, 3);
      }
    }
    for (var i = 0; i < sh.slots.length; i++) {
      var s = sh.slots[i];
      if (s.filled) {
        drawBottle(null, s.x, s.y - 80, s.glass, s.num, s.shown || s.bad > 0, s.flash, 1);
      } else {
        var pulse = nextGlow ? 0.35 + 0.3 * Math.sin(game.time.elapsed * 6 + i) : 0.3;
        for (var d = 0; d < 6; d++) {
          game.draw.rect(s.x - 50, s.y - 150 + d * 26, 6, 14, WH, pulse);
          game.draw.rect(s.x + 44, s.y - 150 + d * 26, 6, 14, WH, pulse);
        }
        if (s.bad > 0) {
          game.draw.rect(s.x - s.w / 2 + 8, s.y - 190, s.w - 16, 230, RD, 0.35 * s.bad);
          label(String(s.num), s.x, s.y - 80, 48, RD);
        }
      }
    }
  }

  function drawTray(sh, held) {
    game.draw.rect(W * 0.12, TRAY_Y + 70, W * 0.76, 24, WH);
    game.draw.rect(W * 0.12, TRAY_Y + 94, W * 0.76, 10, CY);
    for (var i = 0; i < sh.tray.length; i++) {
      var b = sh.tray[i];
      if (b.placed || b === held) continue;
      var bob = Math.sin(game.time.elapsed * 5 + i) * 6;
      drawBottle(null, b.x, b.y + bob, b.glass, b.num, true, 0, 1);
      if (Math.floor(game.time.elapsed * 3 + i) % 2 === 0) game.draw.rect(b.x - 56, b.y - 76 + bob, 112, 4, WH);
    }
  }

  function drawApprentice(pose) {
    var fr = pose === 'cheer' ? 2 : pose === 'sad' ? 3 : Math.floor(game.time.elapsed * 2) % 2;
    var bob = Math.sin(game.time.elapsed * 3) * 4 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 26 : 0);
    game.draw.sprite(APPRENTICE[fr], { w: WH, h: '#553311', f: '#ffcc99', e: BK, k: BK, m: RD, c: CY }, W * 0.09, H * 0.90 + bob, 13, { anchor: 'center' });
  }

  // ── 状態 ──
  var round, shelf, held, placedN, totalN, mistakes, score, timeLeft, ready, halt, over, won, endT, prevBest, milestoneDone, pose, sparkT, roundT;

  function initGame() {
    round = 0; placedN = 0; mistakes = 0; score = 0; totalN = 0;
    for (var i = 0; i < ROUNDS.length; i++) totalN += ROUNDS[i].empty;
    timeLeft = TIME_LIMIT; ready = 0.8; halt = null; over = false; won = false; endT = 0;
    milestoneDone = false; pose = 'idle'; sparkT = 0; roundT = 0; held = null;
    prevBest = game.best || 0;
    shelf = makeShelf(0);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8; pose = ok ? 'cheer' : 'sad';
    if (ok) score += Math.round(timeLeft * 30) + (MISTAKES - mistakes) * 50;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function dropBottle(b, x, y) {
    var s = slotAt(shelf, x, y);
    if (!s || s.filled) {
      b.back = 0.25;
      game.audio.play('se_tap', 0.12);
      return;
    }
    if (s.num === b.num) {
      s.filled = true; s.shown = true; s.flash = 0.4; s.glass = b.glass;
      b.placed = true;
      placedN++;
      score += 100 + Math.max(0, Math.round((3 - roundT) * 20));
      game.feedback.good(s.x, s.y - 200, { text: roundT < 2 ? 'PERFECT' : 'GOOD', color: GR, count: 12 });
      layoutTray(shelf.tray);
      if (placedN === 6 && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup(placedN + ' / ' + totalN, W / 2, H * 0.13, { color: YE, size: 62 });
        game.audio.play('se_milestone', 0.45);
      }
      roundT = 0;
      var left = 0;
      for (var i = 0; i < shelf.tray.length; i++) if (!shelf.tray[i].placed) left++;
      if (left === 0) {
        if (round + 1 >= ROUNDS.length) finish(true);
        else { game.audio.play('se_coin', 0.3); round++; shelf = makeShelf(round); }
      }
    } else {
      mistakes++;
      s.bad = 1;
      b.back = 0.25;
      if (mistakes >= MISTAKES) {
        halt = { t: 0.5, max: 0.5, s: s, b: b, x: x, y: y };
      } else {
        game.feedback.bad(s.x, s.y - 200, { text: 'MISS' });
      }
    }
  }

  function canPlay() { return state === S.PLAYING && !over && !halt && ready <= 0; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) game.fx.burst(x, y, { color: CY, count: 3, speed: 60 });
  });

  game.onPress(function (x, y) {
    if (!canPlay() || held) return;
    var pick = null;
    for (var i = 0; i < shelf.tray.length; i++) {
      var b = shelf.tray[i];
      if (!b.placed && Math.abs(x - b.x) < 80 && Math.abs(y - b.y) < 110) pick = b;
    }
    if (pick) {
      held = pick;
      game.audio.play('se_tap', 0.25);
      game.fx.burst(pick.x, pick.y - 60, { color: WH, count: 6, speed: 120 });
    } else {
      game.audio.play('se_tap', 0.05);
    }
  });

  game.onMove(function (x, y) {
    if (held && canPlay()) {
      held.x = x; held.y = y;
      var s = slotAt(shelf, x, y);
      if (s && !s.filled && s !== held.over) { held.over = s; game.audio.tone(660, 0.03, { wave: 'square', volume: 0.04 }); }
    }
  });

  game.onRelease(function (x, y) {
    if (held && canPlay()) {
      var b = held;
      held = null;
      dropBottle(b, x, y);
    } else if (held) {
      held = null;
      game.audio.play('se_tap', 0.05);
    }
  });

  // ── ATTRACT: 1本目は両隣の番号の間へ正しく、2本目は隣の枠へ入れて跳ね返る ──
  var DEMO_CYCLE = 4.6;
  var demo = { t: 0, shelf: null, gx: W / 2, gy: H * 0.8, press: false, step: 0, b: null, drag: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.shelf) {
      demo.shelf = makeShelf(0, { start: 41, empties: [2, 5, 6] });
      demo.step = 0; demo.b = null;
    }
    var sh = demo.shelf;
    var tx = W / 2, ty = TRAY_Y;
    demo.press = false;
    var good = null, wrongB = null;
    for (var i = 0; i < sh.tray.length; i++) { if (sh.tray[i].num === 43) good = sh.tray[i]; if (sh.tray[i].num === 47) wrongB = sh.tray[i]; }
    var tgt = sh.slots[2], wrongS = sh.slots[5];
    if (cyc < 0.5) { tx = good.x; ty = good.y; }
    else if (cyc < 1.6) {
      var k = Math.min(1, (cyc - 0.5) / 0.9);
      good.x = good.hx + (tgt.x - good.hx) * k; good.y = good.hy + (tgt.y - 80 - good.hy) * k;
      tx = good.x; ty = good.y; demo.press = true;
    } else if (demo.step === 0) {
      demo.step = 1; tgt.filled = true; tgt.flash = 0.4; good.placed = true; layoutTray(sh.tray);
      game.feedback.good(tgt.x, tgt.y - 200, { text: 'PERFECT', color: GR, count: 10, volume: 0.3 });
    } else if (cyc < 2.2) { tx = wrongB.x; ty = wrongB.y; }
    else if (cyc < 3.2) {
      var k2 = Math.min(1, (cyc - 2.2) / 0.9);
      wrongB.x = wrongB.hx + (wrongS.x - wrongB.hx) * k2; wrongB.y = wrongB.hy + (wrongS.y - 80 - wrongB.hy) * k2;
      tx = wrongB.x; ty = wrongB.y; demo.press = true;
    } else if (demo.step === 1) {
      demo.step = 2; wrongS.bad = 1; wrongB.back = 0.25;
      game.feedback.bad(wrongS.x, wrongS.y - 200, { text: 'MISS', volume: 0.3 });
    } else { tx = W * 0.5; ty = H * 0.62; }
    demo.drag = cyc >= 0.5 && cyc < 1.6 && demo.step === 0 ? good : cyc >= 2.2 && cyc < 3.2 && demo.step === 1 ? wrongB : null;
    stepBottles(sh, dt, demo.drag);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 14);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 14);
    return cyc;
  }

  function stepBottles(sh, dt, hb) {
    for (var i = 0; i < sh.slots.length; i++) {
      var s = sh.slots[i];
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt);
      if (s.bad > 0) s.bad = Math.max(0, s.bad - dt * 1.4);
    }
    for (var j = 0; j < sh.tray.length; j++) {
      var b = sh.tray[j];
      if (b.placed || b === hb) continue;
      if (b.back > 0) b.back -= dt;
      if (b.back <= 0) { b.x += (b.hx - b.x) * Math.min(1, dt * 10); b.y += (b.hy - b.y) * Math.min(1, dt * 10); }
    }
  }

  function drawHud() {
    for (var i = 0; i < ROUNDS.length; i++) {
      var col = i < round || (over && won) ? GR : i === round ? CY : BL;
      game.draw.rect(40 + i * 90, 46, 74, 50, col);
      game.draw.rect(48 + i * 90, 54, 58, 34, BK);
      game.draw.rect(56 + i * 90, 62, 42, 18, col);
    }
    for (var m = 0; m < MISTAKES; m++) {
      var cx = W - 70 - m * 64;
      var hit = m < mistakes;
      game.draw.line(cx - 18, 54, cx + 18, 90, hit ? RD : BL, 8);
      game.draw.line(cx + 18, 54, cx - 18, 90, hit ? RD : BL, 8);
    }
    label(placedN + ' / ' + totalN, W * 0.50, 74, 44, WH);
    label(String(score), W * 0.50, 132, 34, YE);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 174, W - 80, 26, WH);
    game.draw.rect(44, 178, W - 88, 18, BK);
    game.draw.rect(44, 178, (W - 88) * fr, 18, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RD : CY);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.24, W - 160, H * 0.32, BK, 0.88);
    game.draw.line(80, H * 0.24, W - 80, H * 0.24, won ? GR : RD, 4);
    game.draw.line(80, H * 0.56, W - 80, H * 0.56, won ? GR : RD, 4);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 100, won ? GR : RD);
    label(placedN + ' / ' + totalN, W / 2, H * 0.36, 60, WH);
    label('SCORE ' + score, W / 2, H * 0.42, 50, CY);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.48, 54, YE);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 42, CY);
    if (!won && placedN < totalN) label('あと' + (totalN - placedN) + '本!', W / 2, H * 0.53, 46, YE);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawRoom();
      drawShelf(demo.shelf, true);
      drawTray(demo.shelf, demo.drag);
      if (demo.drag) drawBottle(null, demo.drag.x, demo.drag.y, demo.drag.glass, demo.drag.num, true, 0, 1);
      drawApprentice(demo.step === 1 ? 'cheer' : demo.step === 2 ? 'sad' : 'idle');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.055, 86, YE);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.11, 36, CY);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, YE);
      else label('INSERT COIN', W / 2, H * 0.965, 40, WH);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(120, W - 120), game.random(H * 0.18, H * 0.6), { color: GLASS[Math.floor(game.random(0, 4))], count: 16, speed: 340 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          game.feedback.bad(halt.s.x, halt.s.y - 200, { text: 'MISS' });
          halt = null;
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_jump', 0.3);
      } else {
        timeLeft -= dt;
        roundT += dt;
        if (timeLeft <= 0 && !over) {
          timeLeft = 0; held = null;
          game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
          finish(false);
        }
      }
      if (!halt) stepBottles(shelf, dt, held);
    }

    drawRoom();
    drawShelf(shelf, !over);
    drawTray(shelf, held);
    if (halt) {
      var hk = 1 - halt.t / halt.max;
      halt.s.bad = 1;
      drawBottle(null, halt.x, halt.y, '#ffffff', halt.b.num, true, hk, 1);
    } else if (held) {
      drawBottle(null, held.x, held.y, held.glass, held.num, true, 0, 1);
    }
    drawApprentice(pose);
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 110, YE);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, WH);
      var stats = { placed: placedN, total: totalN, mistakes: mistakes };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 0.5],
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 1], ['G5', 1],
      ['A5', 0.5], ['F5', 0.5], ['D5', 0.5], ['F5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['B4', 0.5], ['G4', 0.5], ['B4', 0.5], ['C5', 2],
    ], {
      tempo: 140, wave: 'square', volume: 0.04, loop: true,
      bass: [['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1], ['A2', 1], ['A2', 1], ['E2', 1], ['G2', 1],
        ['F2', 1], ['F2', 1], ['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1], ['C3', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-DS-0010v3-mansion-parquet-reorder.js
// 洋館の寄せ木戻し — 剥がれた寄せ木の板を、象嵌の線が途切れずつながる元の並び順にドラッグで戻していく
// 操作: 下の布の上に散らばった板を指でつまみ、床の穴の枠へ運んで離す。象嵌の線の高さが隣と合う板だけがはまる(社内メモ)
// 終わり: 3つの穴(3→4→5枚)をすべて元通りに埋めれば成功。時間切れで失敗(はめ違いは持ち時間を削る)
// @mechanic: drag_sort
// @theme: mansion_parquet_restore
// 世界観: 古い洋館の広間で、床職人が剥がれた寄せ木の板を象嵌の線が壁から壁まで一本につながる元の並び順に戻していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 戻した板の枚数・はめ違い数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、太く単純な形、密度を上げない
  var STYLE = { bg: ['#cfc6ab', '#958c72', '#4f4a3c'], main: ['#b08a5a', '#8a6a44', '#d4b684'], accent: ['#3f6f78', '#c8564a'] };
  var P = {
    wall: STYLE.bg[0], wallDim: STYLE.bg[1], deep: STYLE.bg[2],
    oak: STYLE.main[0], oakDark: STYLE.main[1], maple: STYLE.main[2],
    teal: STYLE.accent[0], red: STYLE.accent[1], walnut: '#4a3424', void: '#2e2a22',
    cloth: '#a8a48e', clothDark: '#8e8a74', ink: '#2a2620', light: '#f2ead2', gold: '#e8c25a',
  };

  var GAME_TITLE = 'PARQUET';
  var TIME_LIMIT = 24;
  var ROUNDS = [3, 4, 5];
  var NEEDED = 12;
  var PENALTY = 1;
  var LEVELS = 5;

  var GAP_TOP = H * 0.355, GAP_H = 200;
  var ROW_L = 40, STUB = 70;
  var TRAY_Y = H * 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var planks, slots, order, heights, slotW, round, placed, wrongs, score, timeLeft;
  var held, ready, ending, cleared, freeze, resultT, endSent, interlude, glowT, mood, halfShown, beepT;

  var SMITH_A = [
    '..cccc....', '.cccccc...', '..ffff....', '..fefe....', '..ffff....', '.oooooo...',
    'ooooooooHH', 'oooooo..HH', '.oooo.....', '.pp..pp...', 'pppp.pppp.',
  ];
  var SMITH_B = [
    '..cccc..HH', '.cccccc.HH', '..ffff..o.', '..fefe..o.', '..ffff.o..', '.oooooo...',
    'ooooooo...', 'oooooo....', '.oooo.....', '.pp..pp...', 'pppp.pppp.',
  ];
  var SMITH_JOY = [
    'o.cccc..o.', 'occcccc.o.', 'o.ffff..o.', 'o.fefe.o..', '.offmfo...', '..oooo....',
    '..oooo....', '..oooo....', '.oooo.....', '.pp..pp...', 'pp....pp..',
  ];
  var SMITH_PAL = { c: '#3f6f78', f: '#e2c4a0', e: '#2a2620', o: '#6a5a44', H: '#8a6a44', p: '#4f4a3c', m: '#c8564a' };
  var WINDOW = ['wwwwww', 'wlwwlw', 'wlwwlw', 'wwwwww', 'wlwwlw', 'wlwwlw'];

  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: P.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function levelY(l) { return GAP_TOP + 34 + l * (GAP_H - 68) / (LEVELS - 1); }
  function slotX(i) { return ROW_L + STUB + i * slotW; }

  // ---- 並びの生成: 隣同士の線の高さがつながる並びが1通りだけになる板の組 ----
  function chainCount(ps, h0, hn) {
    var n = ps.length, used = [], count = 0;
    function rec(depth, cur) {
      if (count > 1) return;
      if (depth === n) { if (cur === hn) count++; return; }
      for (var i = 0; i < n; i++) {
        if (used[i] || ps[i].a !== cur) continue;
        used[i] = true; rec(depth + 1, ps[i].b); used[i] = false;
      }
    }
    rec(0, h0);
    return count;
  }

  function makeHeights(n) {
    for (var tries = 0; tries < 200; tries++) {
      var h = [Math.floor(game.random(0, LEVELS))];
      for (var i = 0; i < n; i++) {
        var nx = h[i];
        while (nx === h[i]) nx = Math.floor(game.random(0, LEVELS));
        h.push(Math.min(LEVELS - 1, nx));
      }
      var ps = [];
      for (var k = 0; k < n; k++) ps.push({ a: h[k], b: h[k + 1] });
      if (chainCount(ps, h[0], h[n]) === 1) return h;
    }
    return [0, 2, 4, 1, 3, 0].slice(0, n + 1);
  }

  function setupRound(n, fixedHeights, fixedTray) {
    heights = fixedHeights || makeHeights(n);
    slotW = (W - 2 * ROW_L - 2 * STUB) / n;
    slots = []; planks = [];
    for (var i = 0; i < n; i++) slots.push(null);
    var trayOrder = [];
    for (var j = 0; j < n; j++) trayOrder.push(j);
    if (fixedTray) trayOrder = fixedTray.slice();
    else {
      for (var s = n - 1; s > 0; s--) {
        var r = Math.floor(game.random(0, s + 1)); if (r > s) r = s;
        var tmp = trayOrder[s]; trayOrder[s] = trayOrder[r]; trayOrder[r] = tmp;
      }
      if (n > 1 && trayOrder[0] === 0 && trayOrder[1] === 1) { trayOrder[0] = 1; trayOrder[1] = 0; }
    }
    var pw = slotW - 10, gapX = (W - n * slotW) / 2;
    for (var t = 0; t < n; t++) {
      var id = trayOrder[t];
      var hx = gapX + t * slotW + 5, hy = TRAY_Y + ((t % 2) ? 26 : -10);
      planks.push({ id: id, a: heights[id], b: heights[id + 1], w: pw, x: hx, y: hy + 300, hx: hx, hy: hy, slot: -1, lift: 0, shake: 0, flash: 0 });
    }
    held = null; interlude = 0; glowT = 0;
  }

  function initGame() {
    round = 0; placed = 0; wrongs = 0; score = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; ending = false; cleared = false; freeze = 0; resultT = 0; endSent = false;
    mood = null; halfShown = false; beepT = 0;
    setupRound(ROUNDS[0]);
  }

  // ---- つまむ・運ぶ・離す(本番もデモも同じ関数) ----
  function plankAt(x, y) {
    for (var i = planks.length - 1; i >= 0; i--) {
      var p = planks[i];
      if (p.slot >= 0) continue;
      if (x > p.x - 20 && x < p.x + p.w + 20 && y > p.y - 30 && y < p.y + GAP_H + 30) return p;
    }
    return null;
  }

  function grab(x, y) {
    if (interlude > 0) return false;
    var p = plankAt(x, y);
    if (!p) return false;
    held = { p: p, ox: x - p.x, oy: y - p.y };
    p.lift = 1;
    planks.splice(planks.indexOf(p), 1); planks.push(p);
    game.audio.play('se_tap', 0.3);
    return true;
  }

  function carry(x, y) {
    if (!held) return;
    held.p.x = x - held.ox; held.p.y = y - held.oy;
  }

  function slotUnder(p) {
    var cx = p.x + p.w / 2, cy = p.y + GAP_H / 2;
    if (Math.abs(cy - (GAP_TOP + GAP_H / 2)) > GAP_H * 0.75) return -1;
    var i = Math.floor((cx - slotX(0)) / slotW);
    if (i < 0 || i >= slots.length) return -1;
    return i;
  }

  function release(live) {
    if (!held) return 'none';
    var p = held.p; held = null; p.lift = 0;
    var s = slotUnder(p);
    if (s < 0 || slots[s] !== null) {
      game.audio.tone('D4', 0.05, { wave: 'triangle', volume: 0.08 });
      return 'back';
    }
    if (p.id === s) {
      slots[s] = p; p.slot = s; p.x = slotX(s) + 5; p.y = GAP_TOP; p.flash = 0.35;
      placed++;
      if (live) score += 100 + Math.round(timeLeft * 3);
      game.feedback.good(p.x + p.w / 2, GAP_TOP - 20, { text: 'GOOD', color: P.gold, size: 52 });
      mood = { k: 'tap', t: 0.5 };
      if (live && !halfShown && placed >= NEEDED / 2) {
        halfShown = true;
        game.fx.popup('NICE', W / 2, H * 0.3, { color: P.gold, size: 84 });
        game.audio.play('se_milestone', 0.5);
      }
      var full = true;
      for (var k = 0; k < slots.length; k++) if (!slots[k]) { full = false; break; }
      if (full) { interlude = 1.1; glowT = 0; game.audio.play('se_powerup', 0.45); game.fx.popup('CLEAR', W / 2, GAP_TOP - 70, { color: P.light, size: 70 }); }
      return 'fit';
    }
    p.shake = 0.45; p.flash = 0;
    if (live) { wrongs++; timeLeft = Math.max(0.01, timeLeft - PENALTY); }
    game.feedback.bad(p.x + p.w / 2, GAP_TOP - 10, { text: live ? '-1' : 'MISS', shake: 7 });
    mood = { k: 'sad', t: 0.6 };
    return 'wrong';
  }

  function stepPlanks(dt) {
    for (var i = 0; i < planks.length; i++) {
      var p = planks[i];
      if (p.shake > 0) p.shake -= dt;
      if (p.flash > 0) p.flash -= dt;
      if (p.slot < 0 && (!held || held.p !== p)) {
        p.x += (p.hx - p.x) * Math.min(1, dt * 9);
        p.y += (p.hy - p.y) * Math.min(1, dt * 9);
      }
    }
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
    if (interlude > 0) glowT += dt;
  }

  function finish(win) {
    if (ending) return;
    ending = true; cleared = win; freeze = win ? 0.45 : 0.55;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) score += Math.round(timeLeft * 25);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!endSent) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ending || ready > 0) return;
    if (!grab(x, y)) {
      game.audio.tone('G3', 0.04, { wave: 'square', volume: 0.05 });
      game.fx.burst(x, y, { color: P.maple, count: 4, speed: 100 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ending) return;
    if (held) {
      carry(x, y);
      var hv = slotUnder(held.p);
      if (hv !== held.hover) {
        held.hover = hv;
        if (hv >= 0 && !slots[hv]) game.audio.tone(['C5', 'D5', 'E5', 'G5', 'A5'][hv % 5], 0.04, { wave: 'triangle', volume: 0.06 });
      }
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ending) return;
    if (held) {
      var r = release(true);
      if (r === 'back') game.fx.burst(x, y, { color: P.cloth, count: 5, speed: 120 });
    }
  });

  // ---- 描画 ----
  function hall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, P.wall], [0.13, P.wallDim], [0.135, P.deep], [0.15, P.oakDark], [1, '#6a543a']]);
    for (var w = 0; w < 3; w++) {
      game.draw.sprite(WINDOW, { w: '#8fa6a0', l: P.light }, 200 + w * 340, H * 0.07, 14, { anchor: 'center', alpha: 0.5 });
    }
    // 差し込む光の帯(ゆっくり動く)
    var bx = 140 + Math.sin(t * 0.5) * 40;
    game.draw.rect(bx, H * 0.15, 160, H * 0.5, P.light, 0.08);
    game.draw.rect(bx + 340, H * 0.15, 160, H * 0.5, P.light, 0.08);
    // 残っている床(上段と下段)
    var rows = [[H * 0.16, GAP_TOP - 8], [GAP_TOP + GAP_H + 8, H * 0.62]];
    for (var r = 0; r < rows.length; r++) {
      for (var y = rows[r][0]; y < rows[r][1]; y += 56) {
        var off = (Math.floor(y / 56) % 2) * 90;
        for (var x = -off; x < W; x += 180) {
          game.draw.rect(x + 3, y + 3, 174, 50, (Math.floor(x / 180) + Math.floor(y / 56)) % 2 ? P.oak : P.maple, 0.85);
        }
      }
    }
    // 床の穴
    game.draw.rect(ROW_L, GAP_TOP - 8, W - 2 * ROW_L, GAP_H + 16, P.void);
    for (var j = 0; j < 4; j++) game.draw.rect(ROW_L + 10, GAP_TOP + 20 + j * 50, W - 2 * ROW_L - 20, 8, '#3c362a');
    // 壁ぎわに残った端の板(線の入口と出口)
    stubPlank(ROW_L, heights[0], true);
    stubPlank(W - ROW_L - STUB, heights[heights.length - 1], false);
    // 布の上の作業場
    game.draw.rect(20, TRAY_Y - 60, W - 40, GAP_H + 130, P.cloth);
    game.draw.rect(20, TRAY_Y - 60, W - 40, 10, P.clothDark);
    for (var f = 0; f < 5; f++) game.draw.rect(20, TRAY_Y - 20 + f * 56, W - 40, 3, P.clothDark, 0.5);
  }

  function stubPlank(x, lvl, left) {
    game.draw.rect(x, GAP_TOP, STUB, GAP_H, P.oak);
    game.draw.rect(x, GAP_TOP, STUB, 8, P.maple);
    var y = levelY(lvl);
    var ex = left ? x + STUB : x;
    game.draw.line(left ? x : x + STUB, y, ex, y, P.walnut, 16);
    game.draw.circle(ex, y, 12, P.teal);
    game.draw.circle(ex, y, 18 + Math.sin(game.time.elapsed * 5) * 3, P.light, 0.25);
  }

  function drawPlank(p, glow) {
    var sx = p.shake > 0 ? Math.sin(p.shake * 80) * 10 : 0;
    var lift = p.lift ? 14 : 0;
    var x = p.x + sx, y = p.y - lift;
    if (lift) game.draw.rect(x + 14, y + 22, p.w, GAP_H, P.ink, 0.3);
    game.draw.rect(x, y, p.w, GAP_H, P.oak);
    game.draw.rect(x, y, p.w, 8, P.maple);
    game.draw.rect(x, y + GAP_H - 8, p.w, 8, P.oakDark);
    for (var g = 0; g < 4; g++) game.draw.rect(x + 8, y + 30 + g * 42, p.w - 16, 3, P.oakDark, 0.5);
    var ya = levelY(p.a) - GAP_TOP + y, yb = levelY(p.b) - GAP_TOP + y;
    game.draw.line(x, ya, x + p.w, yb, P.walnut, 16);
    game.draw.line(x, ya - 6, x + p.w, yb - 6, glow ? P.gold : P.maple, 3);
    game.draw.circle(x + 6, ya, 9, P.teal);
    game.draw.circle(x + p.w - 6, yb, 9, P.teal);
    if (p.flash > 0) game.draw.rect(x - 6, y - 6, p.w + 12, GAP_H + 12, P.light, Math.min(0.7, p.flash * 2));
  }

  function drawFloorWork() {
    // 空いた枠: 押せる場所として縁を明滅
    for (var i = 0; i < slots.length; i++) {
      if (slots[i]) continue;
      var x = slotX(i);
      var hot = held && slotUnder(held.p) === i;
      var a = hot ? 0.6 : 0.18 + 0.12 * Math.sin(game.time.elapsed * 5 + i);
      game.draw.rect(x + 4, GAP_TOP + 4, slotW - 8, 6, P.light, a);
      game.draw.rect(x + 4, GAP_TOP + GAP_H - 10, slotW - 8, 6, P.light, a);
      game.draw.rect(x + 4, GAP_TOP + 4, 6, GAP_H - 8, P.light, a);
      game.draw.rect(x + slotW - 10, GAP_TOP + 4, 6, GAP_H - 8, P.light, a);
    }
    var glowing = interlude > 0;
    for (var j = 0; j < planks.length; j++) if (planks[j].slot >= 0) drawPlank(planks[j], glowing);
    if (glowing) {
      var run = Math.min(1, glowT / 0.6);
      var gx = ROW_L + (W - 2 * ROW_L) * run;
      game.draw.circle(gx, GAP_TOP + GAP_H / 2, 70, P.gold, 0.25);
    }
    for (var k = 0; k < planks.length; k++) if (planks[k].slot < 0) drawPlank(planks[k], false);
  }

  function drawSmith() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 3) % 2 === 0 ? SMITH_A : SMITH_B;
    if (mood && mood.k === 'tap') fr = Math.floor(t * 12) % 2 === 0 ? SMITH_A : SMITH_B;
    if ((mood && mood.k === 'sad') || (ending && !cleared)) fr = SMITH_A;
    if (ending && cleared) fr = SMITH_JOY;
    var dip = (mood && mood.k === 'sad') || (ending && !cleared) ? 16 : 0;
    game.draw.sprite(fr, SMITH_PAL, W * 0.13, H * 0.905 + dip + Math.sin(t * 2.2) * 3, 12, { anchor: 'center' });
  }

  function drawHud() {
    label(placed + ' / ' + NEEDED, W / 2, 64, 56, P.light);
    game.draw.text('SCORE ' + score, W - 40, 40, { size: 30, color: P.light, bold: true, align: 'right' });
    for (var r = 0; r < ROUNDS.length; r++) {
      var on = r < round || (r === round && interlude > 0) || (ending && cleared);
      game.draw.rect(60 + r * 52, 30, 40, 40, on ? P.gold : P.deep);
      game.draw.rect(66 + r * 52, 36, 28, 28, on ? P.maple : P.wallDim);
    }
    var low = timeLeft < 5;
    game.draw.rect(60, 120, W - 120, 24, P.ink, 0.5);
    var col = low && Math.floor(game.time.elapsed * 8) % 2 ? P.red : P.teal;
    game.draw.rect(64, 124, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 16, col);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.18, W, H * 0.44, P.ink, 0.6);
    label(cleared ? 'CLEAR' : 'TIME UP', W / 2, H * 0.25, 112, cleared ? P.gold : P.red);
    label('SCORE ' + score, W / 2, H * 0.34, 60, P.light);
    label(placed + ' / ' + NEEDED + '   MISS ' + wrongs, W / 2, H * 0.4, 44, P.light);
    if (cleared && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) label('NEW RECORD', W / 2, H * 0.47, 64, P.gold);
    } else {
      label('BEST ' + Math.max(game.best, cleared ? score : 0), W / 2, H * 0.47, 42, P.gold);
    }
    if (!cleared) label('あと' + (NEEDED - placed) + '枚!', W / 2, H * 0.54, 66, P.gold);
    if (endSent && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 36, P.light);
  }

  // ---- ATTRACT: grab/carry/release を手が実行。正しい板→違う板(跳ね返る)→正しい板 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, step: 0, phase: 'reach', wait: 0 };
  var DEMO_MOVES = [[0, 0], [2, 1], [1, 1], [2, 2]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9.4;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0;
      setupRound(3, [1, 3, 0, 2], [2, 0, 1]);
      for (var q = 0; q < planks.length; q++) planks[q].y = planks[q].hy;
      demo.step = 0; demo.phase = 'reach'; demo.wait = 0.5; demo.gx = W / 2; demo.gy = H * 0.86;
    }
    stepPlanks(dt);
    if (demo.wait > 0) { demo.wait -= dt; demo.press = held !== null; return; }
    if (demo.step >= DEMO_MOVES.length) {
      demo.press = false;
      demo.gx += (W * 0.8 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.86 - demo.gy) * Math.min(1, dt * 2);
      return;
    }
    var mv = DEMO_MOVES[demo.step];
    var p = null;
    for (var i = 0; i < planks.length; i++) if (planks[i].id === mv[0]) p = planks[i];
    if (demo.phase === 'reach') {
      var tx = p.x + p.w / 2, ty = p.y + GAP_H / 2;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 8);
      demo.press = false;
      if (Math.abs(demo.gx - tx) < 8 && Math.abs(demo.gy - ty) < 8) {
        grab(demo.gx, demo.gy); demo.phase = 'carry';
      }
    } else {
      var dx = slotX(mv[1]) + slotW / 2, dy = GAP_TOP + GAP_H / 2;
      demo.gx += (dx - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (dy - demo.gy) * Math.min(1, dt * 5);
      demo.press = true;
      carry(demo.gx, demo.gy);
      if (Math.abs(demo.gx - dx) < 6 && Math.abs(demo.gy - dy) < 6) {
        release(false);
        demo.phase = 'reach'; demo.step++; demo.wait = 0.45;
      }
    }
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      hall();
      drawFloorWork();
      drawSmith();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      var sway = Math.sin(game.time.elapsed * 2) * 5;
      label(GAME_TITLE, W / 2, H * 0.05 + sway, 96, P.gold);
      label('HI-SCORE ' + game.best, W / 2, H * 0.105, 40, P.light);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, P.gold);
      else label('TAP TO START', W / 2, H * 0.965, 40, P.light);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      hall();
      drawFloorWork();
      drawSmith();
      drawHud();
      if (cleared && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(120, W - 120), game.random(H * 0.25, H * 0.6), { color: [P.gold, P.teal, P.maple][Math.floor(game.random(0, 3)) % 3], count: 14, speed: 400 });
      }
      drawResult();
      if (!endSent && resultT >= 1.3) {
        endSent = true;
        var st = { placed: placed, misses: wrongs, rounds: cleared ? ROUNDS.length : round };
        if (cleared) game.end.success(score, st); else game.end.failure(st);
      }
      return;
    }

    if (ending) {
      for (var f = 0; f < planks.length; f++) if (planks[f].slot < 0) planks[f].flash = 0.3;
      freeze -= dt;
      if (freeze <= 0) { state = S.RESULT; resultT = 0; }
    } else if (ready > 0) {
      ready -= dt;
      stepPlanks(dt);
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepPlanks(dt);
      if (interlude > 0) {
        interlude -= dt;
        if (interlude <= 0) {
          if (round >= ROUNDS.length - 1) finish(true);
          else { round++; setupRound(ROUNDS[round]); }
        }
      }
      if (timeLeft < 5) {
        beepT -= dt;
        if (beepT <= 0) { beepT = 0.5; game.audio.tone('E6', 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && !ending) {
        timeLeft = 0;
        if (held) { held.p.lift = 0; held = null; }
        game.feedback.bad(W / 2, GAP_TOP + GAP_H / 2, { text: 'TIME UP', size: 66 });
        finish(false);
      }
    }

    hall();
    drawFloorWork();
    drawSmith();
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 112, P.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1],
      ['F#4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['B4', 1], ['G4', 1],
    ], { tempo: 92, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// J-GC4-0031-tea-boat-tray-order.js
// 茶舟のお盆そろえ — 注文札に描かれた順番どおりに、棚の菓子をドラッグしてお盆の枠へ並べ、次々に届ける
// 操作: 下の棚から菓子を指でつまみ、お盆の枠(左から順に注文札と同じ位置)へ落とす。違う品・違う枠ははじかれる
// 終わり: 4件の注文を届ければCLEAR。時間切れでGAME OVER(置き間違いは時間が減る)
// @mechanic: drag_sort
// @theme: floating_tea_boat_orders
// 世界観: 朝の水上市場で、茶舟の看板娘が岸から次々差し出される注文札を読み、団子や饅頭を漆のお盆の枠に札の順どおり並べて、竿の先の客へ手早く届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 届けた注文数・置いた菓子の数・置き間違い数
// スタイル: SKEUOMORPH

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢、gradient で厚み
  var STYLE = {
    bg: ['#3a5f6f', '#7fb2b8', '#5a3a22'],
    main: ['#8a5a32', '#c48a52', '#2a1a10'],
    accent: ['#f2c14e', '#d9433b'],
  };

  var GAME_TITLE = 'TEA BOAT';
  var TIME_LIMIT = 24;
  var ORDERS = [3, 3, 4, 4];
  var PENALTY = 1.2;
  var TRAY_Y = H * 0.44;
  var SLOT_W = 200, SLOT_H = 190;
  var SHELF_Y = [H * 0.69, H * 0.82];
  var SHELF_X = [W * 0.2, W * 0.5, W * 0.8];

  var ITEMS = [
    { art: ['...#....', '..ppp...', '..ppp...', '...#....', '..www...', '..www...', '...#....', '...#....'], pal: { '#': '#6b4a2a', p: '#ff9ec0', w: '#fff4e0' } }, // 団子
    { art: ['........', '..bbbb..', '.bbbbbb.', 'bbbbbbbb', 'bbbbbbbb', '.bbbbbb.', '........', '........'], pal: { b: '#e8c89a' } }, // 饅頭
    { art: ['........', 'rrrrrrrr', 'rRrrrrrr', 'rrrrrrrr', 'rrrrrrrr', 'dddddddd', '........', '........'], pal: { r: '#7a2a3a', R: '#a84a5a', d: '#4a1a24' } }, // 羊羹
    { art: ['...gg...', '..gggg..', '.pppppp.', 'pppppppp', 'pppppppp', '.pppppp.', '........', '........'], pal: { g: '#4a9a4a', p: '#ffb6cc' } }, // 桜餅
    { art: ['..cccc..', '.cc..cc.', 'cc.cc.cc', 'c.cccc.c', 'cc.cc.cc', '.cc..cc.', '..cccc..', '........'], pal: { c: '#c8904a' } }, // 煎餅
    { art: ['........', '.wwwwww.', '.wggggw.', '.wggggw.', '.wwwwww.', '..wwww..', '........', '........'], pal: { w: '#f4f0e8', g: '#7ab04a' } }, // 茶
  ];
  var BOATMAN = ['..hhhh..', '.hhhhhh.', '..ssss..', '..s..s..', '.kkkkkk.', 'kkkkkkkk', '.k....k.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#1a0e06', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function shelfPos(k) { return { x: SHELF_X[k % 3], y: SHELF_Y[Math.floor(k / 3)] }; }
  function slotX(i, n) { return W / 2 + (i - (n - 1) / 2) * (SLOT_W + 16); }

  function newOrder() {
    var n = ORDERS[Math.min(g.orderIdx, ORDERS.length - 1)];
    var list = [];
    for (var i = 0; i < n; i++) {
      var k = Math.floor(game.random(0, ITEMS.length)) % ITEMS.length;
      if (i > 0 && k === list[i - 1] && g.orderIdx < 2) k = (k + 1) % ITEMS.length;
      list.push(k);
    }
    g.order = list;
    g.placed = [];
    for (var j = 0; j < n; j++) g.placed.push(-1);
    g.orderT = 0;
    g.slide = 0;
  }

  function initGame() {
    g = {
      orderIdx: 0, order: [], placed: [], orderT: 0, delivered: 0, items: 0, wrongs: 0,
      score: 0, timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, finished: false, done: false,
      ok: false, endWait: 0, held: null, slide: 0, bounce: null, hl: null, shelfBob: 0,
    };
    newOrder();
  }

  function shelfAt(x, y) {
    for (var k = 0; k < ITEMS.length; k++) {
      var p = shelfPos(k);
      if (Math.abs(x - p.x) < 150 && Math.abs(y - p.y) < 115) return k;
    }
    return -1;
  }

  function slotAt(x, y) {
    var n = g.order.length;
    if (Math.abs(y - TRAY_Y) > SLOT_H * 0.8) return -1;
    for (var i = 0; i < n; i++) if (Math.abs(x - slotX(i, n)) < (SLOT_W + 16) / 2) return i;
    return -1;
  }

  function pick(k, x, y) {
    g.held = { k: k, x: x, y: y };
    game.audio.play('se_tap', 0.25);
    game.fx.burst(x, y, { color: STYLE.accent[0], count: 4, speed: 120 });
  }

  function drop(x, y, isDemo) {
    var h = g.held;
    g.held = null;
    if (!h) return;
    var s = slotAt(x, y);
    if (s < 0 || g.slide > 0) {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: '#ffffff', count: 3, speed: 90 });
      return;
    }
    var sx = slotX(s, g.order.length);
    if (g.placed[s] < 0 && g.order[s] === h.k) {
      g.placed[s] = h.k;
      g.items++;
      g.score += 50;
      game.feedback.good(sx, TRAY_Y, { text: 'GOOD', color: STYLE.accent[0], count: 8 });
      var full = true;
      for (var i = 0; i < g.placed.length; i++) if (g.placed[i] < 0) full = false;
      if (full) {
        var quick = g.orderT < g.order.length * 1.3;
        g.delivered++;
        g.orderIdx++;
        g.score += quick ? 250 : 150;
        g.slide = 0.55;
        game.fx.popup(quick ? 'PERFECT' : 'NICE', W / 2, TRAY_Y - 170, { color: STYLE.accent[0], size: 64 });
        game.audio.play('se_coin', 0.5);
        if (!isDemo && g.delivered === 2) {
          game.fx.popup('2 / ' + ORDERS.length, W / 2, H * 0.3, { color: '#ffffff', size: 70 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    } else {
      g.wrongs++;
      if (!isDemo) g.timeLeft = Math.max(0, g.timeLeft - PENALTY);
      g.bounce = { k: h.k, x: sx, y: TRAY_Y, t: 0.4 };
      game.feedback.bad(sx, TRAY_Y, { text: 'MISS', shake: 8 });
    }
  }

  function endRound(ok) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.held = null;
    var s = 0;
    for (var i = 0; i < g.placed.length; i++) if (g.placed[i] < 0) { s = i; break; }
    g.hl = ok ? [W * 0.85, H * 0.3] : [slotX(s, g.order.length), TRAY_Y];
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += Math.round(g.timeLeft * 50);
    game.audio.play(ok ? 'se_powerup' : 'se_bad', 0.5);
  }

  function step(dt, isDemo) {
    g.orderT += dt;
    if (g.bounce) { g.bounce.t -= dt; if (g.bounce.t <= 0) g.bounce = null; }
    if (g.slide > 0) {
      g.slide -= dt;
      if (g.slide <= 0) {
        if (g.delivered >= ORDERS.length) { if (!isDemo) endRound(true); else { g.orderIdx = 0; g.delivered = 0; newOrder(); } }
        else newOrder();
      }
    }
    if (!isDemo) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function woodPlank(x, y, w, h, c1, c2) {
    game.draw.rect(x, y, w, h, c1);
    for (var gy = 6; gy < h; gy += 14) game.draw.rect(x, y + gy, w, 3, c2, 0.35);
    game.draw.rect(x, y, w, 5, '#ffffff', 0.2);
    game.draw.rect(x, y + h - 6, w, 6, '#000000', 0.3);
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.36, [[0, '#ffd9a0'], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 水面
    game.draw.gradient(H * 0.2, H * 0.36, [[0, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    for (var r = 0; r < 8; r++) game.draw.rect((r * 170 + t * 30) % (W + 100) - 50, H * 0.25 + r * 14, 110, 4, '#ffffff', 0.35);
    // 客(岸の人影、半透明)と竿
    var cx = W * 0.86, cy = H * 0.26 + Math.sin(t * 1.8) * 8;
    game.draw.sprite(BOATMAN, { h: '#1a2a30', s: '#1a2a30', k: '#1a2a30' }, cx, cy, 16, { anchor: 'center', alpha: 0.5 });
    game.draw.sprite(BOATMAN, { h: '#1a2a30', s: '#1a2a30', k: '#1a2a30' }, W * 0.12, H * 0.27 + Math.sin(t * 2.3) * 6, 12, { anchor: 'center', alpha: 0.3 });
    // 舟のカウンター(木目)
    woodPlank(0, H * 0.34, W, H * 0.66, STYLE.main[0], STYLE.main[2]);
    game.draw.rect(0, H * 0.34, W, 16, STYLE.main[1]);
    game.draw.rect(0, 0, W, H, '#ffe6b0', 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawSlip() {
    var n = g.order.length, bw = 150, x0 = W / 2 - (n * bw) / 2;
    var y = H * 0.17;
    game.draw.rect(x0 - 26, y - 90 + 8, n * bw + 52, 180, '#000000', 0.25);
    game.draw.rect(x0 - 26, y - 90, n * bw + 52, 180, '#f8efd8');
    game.draw.rect(x0 - 26, y - 90, n * bw + 52, 10, STYLE.accent[1]);
    for (var i = 0; i < n; i++) {
      var done = g.placed[i] >= 0;
      var it = ITEMS[g.order[i]];
      game.draw.sprite(it.art, it.pal, x0 + i * bw + bw / 2, y + 6, 14, { anchor: 'center', alpha: done ? 0.3 : 1 });
      if (i < n - 1) game.draw.rect(x0 + (i + 1) * bw - 2, y - 50, 4, 110, '#c8b890');
    }
  }

  function drawTray() {
    var n = g.order.length;
    var off = g.slide > 0 ? (0.55 - g.slide) * 2200 : 0;
    var tw = n * (SLOT_W + 16) + 40;
    game.draw.rect(W / 2 - tw / 2 + off + 10, TRAY_Y - SLOT_H / 2 - 10, tw, SLOT_H + 40, '#000000', 0.3);
    game.draw.gradient(TRAY_Y - SLOT_H / 2 - 20, TRAY_Y + SLOT_H / 2 + 20, [[0, '#c0392b'], [1, '#6a1410']]);
    game.draw.rect(0, TRAY_Y - SLOT_H / 2 - 20, W / 2 - tw / 2 + off, SLOT_H + 40, STYLE.main[0]);
    game.draw.rect(W / 2 + tw / 2 + off, TRAY_Y - SLOT_H / 2 - 20, Math.max(0, W - (W / 2 + tw / 2 + off)), SLOT_H + 40, STYLE.main[0]);
    for (var gy = 6; gy < SLOT_H + 40; gy += 14) {
      game.draw.rect(0, TRAY_Y - SLOT_H / 2 - 20 + gy, W / 2 - tw / 2 + off, 3, STYLE.main[2], 0.35);
      game.draw.rect(W / 2 + tw / 2 + off, TRAY_Y - SLOT_H / 2 - 20 + gy, W, 3, STYLE.main[2], 0.35);
    }
    for (var i = 0; i < n; i++) {
      var x = slotX(i, n) + off;
      game.draw.rect(x - SLOT_W / 2, TRAY_Y - SLOT_H / 2, SLOT_W, SLOT_H, '#3a0a08', 0.55);
      game.draw.rect(x - SLOT_W / 2, TRAY_Y - SLOT_H / 2, SLOT_W, 6, '#ffffff', 0.2);
      var nextEmpty = g.placed[i] < 0 && (i === 0 || g.placed[i - 1] >= 0);
      if (nextEmpty && Math.floor(game.time.elapsed * 3) % 2 === 0) game.draw.rect(x - SLOT_W / 2, TRAY_Y + SLOT_H / 2 - 10, SLOT_W, 10, STYLE.accent[0], 0.8);
      if (g.placed[i] >= 0) { var it = ITEMS[g.placed[i]]; game.draw.sprite(it.art, it.pal, x, TRAY_Y, 18, { anchor: 'center' }); }
    }
    if (g.bounce) {
      var b = ITEMS[g.bounce.k];
      game.draw.sprite(b.art, b.pal, g.bounce.x, g.bounce.y + (0.4 - g.bounce.t) * 500, 16, { anchor: 'center', alpha: g.bounce.t / 0.4 });
    }
    if (g.hl && g.hitStop > 0) game.draw.circle(g.hl[0], g.hl[1], 120 + (0.5 - g.hitStop) * 200, '#ffffff', 0.5);
  }

  function drawShelf() {
    var t = game.time.elapsed;
    woodPlank(40, H * 0.61, W - 80, H * 0.3, '#6a4428', STYLE.main[2]);
    for (var k = 0; k < ITEMS.length; k++) {
      var p = shelfPos(k);
      game.draw.rect(p.x - 140, p.y - 100, 280, 200, '#2f5a3a');
      game.draw.rect(p.x - 140, p.y, 280, 100, '#1f3a26', 0.5);
      game.draw.rect(p.x - 140, p.y + 92, 280, 8, '#000000', 0.3);
      var it = ITEMS[k];
      var bob = Math.sin(t * 2 + k) * 4;
      game.draw.sprite(it.art, it.pal, p.x, p.y + bob, 18, { anchor: 'center', alpha: g.held && g.held.k === k ? 0.5 : 1 });
    }
    if (g.held) {
      var h = ITEMS[g.held.k];
      game.draw.circle(g.held.x, g.held.y + 20, 70, '#000000', 0.25);
      game.draw.sprite(h.art, h.pal, g.held.x, g.held.y - 30, 20, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.gradient(0, 230, [[0, '#5a3a22'], [1, '#3a2414']]);
    game.draw.rect(0, 0, W, 230, '#3a2414', 0.9);
    txt(g.delivered + ' / ' + ORDERS.length, W * 0.25, 80, 60, '#ffffff');
    txt('SCORE ' + g.score, W * 0.72, 80, 40, STYLE.accent[0]);
    var bw = W * 0.84, low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.08, 160, bw, 24, '#1a0e06');
    game.draw.rect(W * 0.08, 160, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 24, low ? STYLE.accent[1] : STYLE.accent[0]);
    game.draw.rect(W * 0.08, 160, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 8, '#ffffff', 0.3);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, ph: 0, k: 0, slot: 0, cyc: 0, wrongDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.cyc++; demo.ph = 0; demo.wrongDone = false; }
    step(dt, true);
    if (g.slide > 0) { demo.press = false; return; }
    if (demo.ph <= 0) {
      var s = 0;
      for (var i = 0; i < g.placed.length; i++) if (g.placed[i] < 0) { s = i; break; }
      demo.slot = s;
      demo.k = g.order[s];
      if (demo.cyc % 2 === 0 && !demo.wrongDone && g.items === 2) { demo.k = (demo.k + 1) % ITEMS.length; demo.wrongDone = true; }
      var p = shelfPos(demo.k);
      demo.gx = p.x; demo.gy = p.y;
      pick(demo.k, p.x, p.y);
      demo.ph = 0.01;
    } else {
      demo.ph += dt;
      var sp = shelfPos(demo.k);
      var tx = slotX(demo.slot, g.order.length), ty = TRAY_Y;
      var k = Math.min(1, demo.ph / 0.45);
      demo.gx = sp.x + (tx - sp.x) * k; demo.gy = sp.y + (ty - sp.y) * k;
      if (g.held) { g.held.x = demo.gx; g.held.y = demo.gy; }
      if (demo.ph >= 0.5 && g.held) drop(demo.gx, demo.gy, true);
      if (demo.ph >= 0.75) demo.ph = 0;
    }
    demo.press = !!g.held;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    if (g.finished || g.ready > 0 || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    var k = shelfAt(x, y);
    if (k >= 0) pick(k, x, y);
    else { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: '#ffffff', count: 3, speed: 90 }); }
  });

  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !g.held) return;
    g.held.x = x; g.held.y = y;
    if (game.random(0, 1) < 0.03) game.audio.play('se_tap', 0.03);
  });

  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !g.held || g.finished) { if (g) g.held = null; return; }
    game.audio.play('se_tap', 0.12);
    drop(x, y, false);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawSlip(); drawTray(); drawShelf();
      game.draw.hand(demo.gx, demo.gy + 30, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.045, 80, STYLE.accent[0]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.08, 38, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawTray();
      game.draw.rect(0, H * 0.58, W, H * 0.34, '#1a0e06', 0.8);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.64, 110, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(g.delivered + ' / ' + ORDERS.length, W / 2, H * 0.71, 64, '#ffffff');
      txt('SCORE ' + g.score, W / 2, H * 0.76, 48, STYLE.accent[0]);
      if (!g.ok) {
        var left = 0;
        for (var i = 0; i < g.placed.length; i++) if (g.placed[i] < 0) left++;
        txt('あと' + left + '個!', W / 2, H * 0.82, 54, '#ffb08a');
      } else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.82, 56, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.82, 46, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, '#ffffff');
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { orders: g.delivered, items: g.items, misplaced: g.wrongs };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(g.hl[0], g.hl[1], { text: 'CLEAR', color: STYLE.accent[0], count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.hl[0], g.hl[1], { text: 'TIME UP', shake: 14 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawSlip(); drawTray(); drawShelf(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 120, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['A4', 1.5],
    ], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

// J-Switch-0018-deptstore-umbrella-check.js
// 百貨店の傘あずかり — 帰りの客が差し出す絵札と同じ色・同じ柄の傘を、ずらりと掛かった似た傘の中から見つけ、札から傘まで指で糸を引いて結ぶ
// 操作: 上の客の絵札から、下の傘掛けの同じ傘まで指でなぞって離す(傘から札へでもよい)。色と柄の両方が合えば渡せる。違う傘に結ぶとMISS。客は待ちきれないと帰ってしまう(社内メモ。画面には出さない)
// 終わり: 7人に傘を渡せばCLEAR。3回しくじる/時間切れでGAME OVER
// @mechanic: connect
// @theme: deptstore_umbrella_check
// 世界観: 夕立の降り出した日曜の夕方、古い百貨店の正面玄関脇にある傘あずかり所で、見習いの少女が、帰りを急ぐ買い物客たちの差し出す絵札を読み、壁の傘掛けに並ぶ色も柄もよく似た番傘の中から札と同じ一本を探し当てて、糸で結んで次々に手渡していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡した本数・素早く渡せた(PERFECT)数・しくじり数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 細かいドット + 灯りのライティング + 奥の雨のパララックス
  var STYLE = { bg: ['#2a1426', '#5a2230'], main: ['#7a4a2c', '#b3824f', '#f1e2c2'], accent: ['#ffcf5a', '#ff5470'] };
  var C = { ink: '#1a0d14', wood: '#6e4127', woodL: '#a86f43', paper: '#f4e8cc', gold: '#ffcf5a', red: '#ff5470', good: '#7af0a0', curtain: '#9a1f36' };

  var TITLE = 'UMBRELLA CHECK';
  var TIME_LIMIT = 22;
  var GOAL = 7;
  var MAX_MISS = 3;
  var PATIENCE = 8.5;
  var QUICK = 2.6;

  var COLORS = ['#e8384f', '#3f7fe0', '#f2c230', '#3fb56a', '#a05ae0'];
  var COLORS_D = ['#9e1f33', '#244f99', '#b38a12', '#23794a', '#6a3399'];
  var PATTERNS = [
    ['....aaaa....', '..aaaaaaaa..', '.aaaaaaaaaa.', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'dddddddddddd', '.....hh.....', '.....hh.....', '.....hh.....', '....hh......'],
    ['....abab....', '..ababbaba..', '.aabbaabbaa.', 'aabbaabbaabb', 'aabbaabbaabb', 'dddddddddddd', '.....hh.....', '.....hh.....', '.....hh.....', '....hh......'],
    ['....aaaa....', '..aabaabaa..', '.aaaaaaaaaa.', 'aabaabaabaaa', 'aaaaaaaaaaaa', 'dddddddddddd', '.....hh.....', '.....hh.....', '.....hh.....', '....hh......'],
    ['....aaaa....', '..aaaaaaaa..', '.bbbbbbbbbb.', 'aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'dddddddddddd', '.....hh.....', '.....hh.....', '.....hh.....', '....hh......']
  ];
  var PATRONS = [
    ['..kkkk..', '.kkkkkk.', 'kkkkkkkk', '..ffff..', '..fefe..', '..ffff..', '.cccccc.', 'cccccccc', 'cccccccc'],
    ['...rr...', '..rrrr..', '.rrrrrr.', '..ffff..', '..efef..', '..ffff..', '.cccccc.', 'cccccccc', 'cccccccc'],
    ['........', '..hhhh..', '.hhhhhh.', '.hffffh.', '..fefe..', '..ffff..', '.cccccc.', 'cccccccc', 'cccccccc']
  ];
  var PATRON_COATS = ['#4a5a7a', '#6a3a4a', '#3a5a4a', '#5a4a2a'];
  var GIRL = ['..hhhh..', '.hhhhhh.', '.hfffh..', '..fefe..', '..ffff..', '.wwwwww.', 'wrrwwrrw', '.wwwwww.'];

  var COLS = [W * 0.17, W * 0.39, W * 0.61, W * 0.83];
  var ROWS = [H * 0.42, H * 0.535, H * 0.65, H * 0.765];
  var CUST_X = [W * 0.19, W * 0.5, W * 0.81];
  var CUST_Y = H * 0.17;
  var CARD_Y = H * 0.285;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var rack, cust, served, perfects, misses, timeLeft, ready, hitStop, pendingBad, finished, done, endWait, ok, timeUp;
  var drag, bad, milestoneShown, arriveT, flyers;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function combo(c, p) { return c * 10 + p; }
  function inRack(k) { for (var i = 0; i < rack.length; i++) if (rack[i] && rack[i].k === k) return true; return false; }

  function fillSlot(i) {
    var pool = [];
    for (var c = 0; c < COLORS.length; c++) for (var p = 0; p < PATTERNS.length; p++) if (!inRack(combo(c, p))) pool.push(combo(c, p));
    var k = pool[Math.floor(Math.random() * pool.length)];
    rack[i] = { k: k, c: Math.floor(k / 10), p: k % 10, pop: 0 };
  }

  function targeted(k) { for (var i = 0; i < cust.length; i++) if (cust[i] && cust[i].want === k && cust[i].leave <= 0) return true; return false; }

  function newCustomer(slot, delay) {
    var opts = [];
    for (var i = 0; i < rack.length; i++) if (rack[i] && !targeted(rack[i].k)) opts.push(rack[i].k);
    var want = opts[Math.floor(Math.random() * opts.length)];
    cust[slot] = { want: want, t: 0, delay: delay, look: Math.floor(Math.random() * PATRONS.length), coat: PATRON_COATS[Math.floor(Math.random() * PATRON_COATS.length)], leave: 0, happy: false, shake: 0 };
  }

  function initGame() {
    rack = [];
    for (var i = 0; i < 16; i++) rack.push(null);
    for (var j = 0; j < 16; j++) fillSlot(j);
    cust = [null, null, null];
    newCustomer(0, 0); newCustomer(1, 0.6); newCustomer(2, 1.3);
    served = 0; perfects = 0; misses = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    hitStop = 0; pendingBad = null; finished = false; done = false; endWait = 0; ok = false; timeUp = false;
    drag = null; bad = null; milestoneShown = false; flyers = [];
  }

  function slotPos(i) { return { x: COLS[i % 4], y: ROWS[Math.floor(i / 4)] }; }

  function custAt(x, y) {
    for (var i = 0; i < 3; i++) {
      var c = cust[i];
      if (!c || c.delay > 0 || c.leave > 0) continue;
      if (Math.abs(x - CUST_X[i]) < 150 && y > CUST_Y - 120 && y < CARD_Y + 110) return i;
    }
    return -1;
  }
  function umbAt(x, y) {
    for (var i = 0; i < rack.length; i++) {
      var p = slotPos(i);
      if (rack[i] && Math.abs(x - p.x) < 110 && Math.abs(y - p.y) < 100) return i;
    }
    return -1;
  }

  function finishRound(win) {
    if (finished) return;
    finished = true; done = true; ok = win; endWait = 1.5;
    if (state === S.PLAYING) { game.audio.stopBgm(); game.audio.play(win ? 'se_success' : 'se_failure', 0.5); }
  }

  function addMiss(x, y) {
    misses++;
    hitStop = 0.4;
    pendingBad = { x: x, y: y };
    game.audio.tone('D3', 0.12, { wave: 'square', volume: 0.12 });
    if (state === S.PLAYING && misses >= MAX_MISS) finishRound(false);
  }

  // 札 ci と傘 ui を結ぶ(本番もデモも同じ判定)
  function connect(ci, ui) {
    var c = cust[ci], u = rack[ui];
    var up = slotPos(ui);
    if (u.k === c.want) {
      var quick = c.t < QUICK;
      served++;
      if (quick) perfects++;
      flyers.push({ c: u.c, p: u.p, x0: up.x, y0: up.y, x1: CUST_X[ci], y1: CUST_Y + 40, t: 0 });
      c.leave = 0.7; c.happy = true;
      rack[ui] = null;
      game.feedback.good(up.x, up.y - 60, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? C.gold : C.good, size: quick ? 60 : 50 });
      game.audio.play('se_coin', 0.4);
      if (state === S.PLAYING) {
        if (!milestoneShown && served >= 4) {
          milestoneShown = true;
          game.fx.popup(served + ' / ' + GOAL, W / 2, H * 0.36, { color: C.gold, size: 60 });
          game.audio.play('se_milestone', 0.4);
        }
        if (served >= GOAL) finishRound(true);
      }
    } else {
      c.shake = 0.5;
      bad = { ui: ui, ci: ci, t: 0.5 };
      addMiss(up.x, up.y);
    }
  }

  function stepWorld(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && pendingBad) {
        game.feedback.bad(pendingBad.x, pendingBad.y - 60, { text: 'MISS', shake: 10 });
        pendingBad = null;
      }
      return false;
    }
    for (var i = 0; i < 3; i++) {
      var c = cust[i];
      if (!c) continue;
      if (c.delay > 0) { c.delay -= dt; continue; }
      if (c.shake > 0) c.shake -= dt;
      if (c.leave > 0) {
        c.leave -= dt;
        if (c.leave <= 0 && !finished) {
          for (var r = 0; r < rack.length; r++) if (!rack[r]) fillSlot(r);
          newCustomer(i, 0.35);
        }
        continue;
      }
      c.t += dt;
      if (c.t >= PATIENCE && !finished) {
        c.leave = 0.7; c.happy = false;
        if (drag && drag.ci === i) drag = null;
        addMiss(CUST_X[i], CARD_Y);
      }
    }
    for (var r2 = 0; r2 < rack.length; r2++) if (rack[r2] && rack[r2].pop < 1) rack[r2].pop = Math.min(1, rack[r2].pop + dt * 4);
    return true;
  }

  function stepCosmetic(dt) {
    if (bad) { bad.t -= dt; if (bad.t <= 0) bad = null; }
    for (var i = flyers.length - 1; i >= 0; i--) { flyers[i].t += dt * 2.2; if (flyers[i].t >= 1) flyers.splice(i, 1); }
  }

  // ---------- 描画 ----------
  function drawUmb(c, p, x, y, px, alpha) {
    game.draw.sprite(PATTERNS[p], { a: COLORS[c], b: '#fff4dc', d: COLORS_D[c], h: '#e0c08a' }, x, y, px, { anchor: 'center', alpha: alpha === undefined ? 1 : alpha });
  }

  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.35, STYLE.bg[1]], [1, '#2a1420']]);
    // 奥の戸口の雨
    game.draw.rect(W * 0.36, 236, 300, 150, '#1d2a44');
    for (var i = 0; i < 14; i++) {
      var rx = W * 0.36 + ((i * 53) % 300);
      var ry = 236 + ((t * 700 + i * 97) % 150);
      game.draw.line(rx, ry, rx - 6, Math.min(386, ry + 30), '#8fb4e8', 3);
    }
    game.draw.rect(W * 0.36 - 10, 226, 320, 12, C.woodL);
    // 玄関の日よけ幕
    for (var k = 0; k < 17; k++) game.draw.rect(k * 64, 230, 56, 50 + Math.sin(t * 1.4 + k) * 8, k % 2 ? C.curtain : '#7a162a');
    // 灯り
    for (var l = 0; l < 3; l++) {
      var lx = W * (0.3 + l * 0.2), ly = H * 0.15 + Math.sin(t * 2 + l) * 4;
      game.draw.circle(lx, ly, 70, C.gold, 0.1 + 0.04 * Math.sin(t * 5 + l));
      game.draw.circle(lx, ly, 18, '#fff2c0');
    }
    // 受付台
    game.draw.gradient(CARD_Y + 90, CARD_Y + 130, [[0, C.woodL], [1, C.wood]]);
    // 傘掛けの壁
    game.draw.rect(0, ROWS[0] - 140, W, H - (ROWS[0] - 140), '#3a2018');
    for (var b = 0; b < 16; b++) game.draw.rect(0, ROWS[0] - 140 + b * 64, W, 4, '#2a150f');
    for (var r = 0; r < 4; r++) {
      game.draw.rect(40, ROWS[r] - 80, W - 80, 14, C.woodL);
      game.draw.rect(40, ROWS[r] - 68, W - 80, 6, C.wood);
    }
    // 見習いの少女
    game.draw.gradient(H * 0.83, H, [[0, C.woodL], [0.1, C.wood], [1, '#3a2018']]);
    game.draw.sprite(GIRL, { h: '#2a140c', f: '#ffd6b0', e: C.ink, w: '#f4e8cc', r: C.red }, W * 0.2 + Math.sin(t * 1.2) * 6, H * 0.9 + Math.sin(t * 3) * 5, 13, { anchor: 'center' });
    for (var q = 0; q < 3; q++) {
      var bx = W * (0.45 + q * 0.18), by = H * 0.88;
      game.draw.rect(bx - 50, by, 100, 90, '#5a3422');
      game.draw.rect(bx - 56, by - 8, 112, 16, C.woodL);
      for (var st = 0; st < 3; st++) game.draw.line(bx - 24 + st * 24, by - 4, bx - 30 + st * 30 + Math.sin(t * 1.5 + st + q) * 4, by - 70, '#e0c08a', 6);
    }
  }

  function drawRack() {
    var t = game.time.elapsed;
    for (var i = 0; i < rack.length; i++) {
      var p = slotPos(i);
      game.draw.circle(p.x, p.y - 74, 8, '#d8c090');
      var u = rack[i];
      if (!u) continue;
      var sway = Math.sin(t * 1.8 + i * 0.7) * 3;
      var isBad = bad && bad.ui === i;
      var sc = 13 * (0.6 + 0.4 * u.pop) * (isBad ? 1.15 : 1);
      if (isBad) game.draw.circle(p.x, p.y, 110, '#ffffff', 0.5 * bad.t / 0.5);
      if (drag && drag.ui === i) game.draw.circle(p.x, p.y, 100, C.gold, 0.25);
      drawUmb(u.c, u.p, p.x + sway, p.y, sc);
    }
  }

  function drawCustomers() {
    var t = game.time.elapsed;
    for (var i = 0; i < 3; i++) {
      var c = cust[i];
      if (!c || c.delay > 0) continue;
      var x = CUST_X[i] + (c.shake > 0 ? Math.sin(t * 60) * 12 : 0);
      var fade = c.leave > 0 ? c.leave / 0.7 : 1;
      var bob = Math.sin(t * 2.6 + i) * 5;
      game.draw.sprite(PATRONS[c.look], { k: '#1c1c24', r: '#7a1f2e', h: '#4a2a1a', f: '#f0c8a0', e: C.ink, c: c.coat }, x, CUST_Y + bob - (c.leave > 0 && c.happy ? (1 - fade) * 60 : 0), 12, { anchor: 'center', alpha: fade });
      if (c.leave > 0) continue;
      // 絵札
      var hot = drag && drag.ci === i;
      game.draw.rect(x - 110, CARD_Y - 80, 220, 170, '#c9b48a', fade);
      game.draw.rect(x - 102, CARD_Y - 72, 204, 154, hot ? '#fff6d8' : C.paper, fade);
      if (bad && bad.ci === i) game.draw.rect(x - 110, CARD_Y - 80, 220, 170, C.red, 0.35);
      drawUmb(Math.floor(c.want / 10), c.want % 10, x, CARD_Y, 12);
      // 待ち時間
      var left = Math.max(0, 1 - c.t / PATIENCE);
      var warn = left < 0.3 && Math.floor(t * 8) % 2 === 0;
      game.draw.rect(x - 100, CARD_Y + 96, 200, 12, '#3a2018');
      game.draw.rect(x - 100, CARD_Y + 96, 200 * left, 12, warn ? C.red : (c.t < QUICK ? C.gold : C.good));
    }
  }

  function drawDragLine() {
    if (!drag) return;
    var sx = drag.ci >= 0 ? CUST_X[drag.ci] : slotPos(drag.ui).x;
    var sy = drag.ci >= 0 ? CARD_Y + 60 : slotPos(drag.ui).y - 60;
    game.draw.line(sx, sy, drag.x, drag.y, '#fff2c0', 8);
    game.draw.line(sx, sy, drag.x, drag.y, C.red, 3);
    game.draw.circle(drag.x, drag.y, 18, C.gold);
  }

  function drawFlyers() {
    for (var i = 0; i < flyers.length; i++) {
      var f = flyers[i], k = f.t;
      drawUmb(f.c, f.p, f.x0 + (f.x1 - f.x0) * k, f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 120, 13 - 4 * k);
    }
  }

  function drawAll() {
    drawRoom();
    drawRack();
    drawCustomers();
    drawFlyers();
    drawDragLine();
    game.draw.rect(0, 0, W, H, C.gold, 0.025 + 0.025 * Math.sin(game.time.elapsed * 1.6));
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, C.ink, 0.85);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 22, '#3a2018');
    game.draw.rect(60, 170, (W - 120) * frac, 22, low ? C.red : C.gold);
    drawUmb(0, 1, 110, 86, 7);
    txt(served + ' / ' + GOAL, 190, 88, 60, C.paper, 'left');
    for (var i = 0; i < MAX_MISS; i++) game.draw.circle(W - 90 - i * 64, 88, 22, i < misses ? C.red : '#4a2a2a');
  }

  // ---------- 入力 ----------
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || hitStop > 0) return;
    var ci = custAt(x, y), ui = umbAt(x, y);
    if (ci >= 0) { drag = { ci: ci, ui: -1, x: x, y: y }; game.audio.play('se_tap', 0.2); }
    else if (ui >= 0) { drag = { ci: -1, ui: ui, x: x, y: y }; game.audio.play('se_tap', 0.2); }
    else { drag = null; game.fx.burst(x, y, { color: '#d8c090', count: 3, speed: 80 }); game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.05 }); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    drag.x = x; drag.y = y;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.03);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    var d = drag; drag = null;
    if (finished || hitStop > 0) return;
    if (d.ci >= 0) {
      var ui = umbAt(x, y);
      if (ui >= 0 && cust[d.ci] && cust[d.ci].leave <= 0) connect(d.ci, ui);
      else game.fx.burst(x, y, { color: '#fff2c0', count: 4, speed: 100 });
    } else {
      var ci = custAt(x, y);
      if (ci >= 0) connect(ci, d.ui);
      else game.fx.burst(x, y, { color: '#fff2c0', count: 4, speed: 100 });
    }
  });

  // ---------- ATTRACT 実演(本番の connect/stepWorld をAIが使う) ----------
  var demo = { t: 0, gx: W / 2, gy: H / 2, press: false, fail: false, ui: 0, done: false };
  function stepDemo(dt) {
    demo.t += dt;
    var P = 3.4;
    var cyc = demo.t % P;
    if (cyc < dt || demo.t <= dt) {
      demo.fail = Math.floor(demo.t / P) % 2 === 1;
      initGame();
      ready = 0;
      cust[0].delay = 0; cust[1].delay = 0; cust[2].delay = 0;
      var want = cust[1].want, target = 0, wrong = 0;
      for (var i = 0; i < rack.length; i++) if (rack[i].k === want) target = i;
      for (var j = 0; j < rack.length; j++) if (j !== target && (rack[j].c === Math.floor(want / 10) || rack[j].p === want % 10)) { wrong = j; break; }
      demo.ui = demo.fail ? wrong : target;
      demo.done = false;
    }
    var from = { x: CUST_X[1], y: CARD_Y + 20 }, to = slotPos(demo.ui);
    if (cyc < 0.5) { demo.gx = from.x; demo.gy = from.y; demo.press = false; drag = null; }
    else if (cyc < 1.8) {
      var k = Math.min(1, (cyc - 0.5) / 1.1);
      var e = k * k * (3 - 2 * k);
      demo.gx = from.x + (to.x - from.x) * e; demo.gy = from.y + (to.y - from.y) * e; demo.press = true;
      drag = { ci: 1, ui: -1, x: demo.gx, y: demo.gy };
    } else {
      if (!demo.done) { demo.done = true; drag = null; connect(1, demo.ui); }
      demo.press = false;
    }
    stepWorld(dt);
  }

  game.onUpdate(function(dt) {
    if (rack === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepCosmetic(dt);
      drawAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 226, C.ink, 0.85);
      txt(TITLE, W / 2, 84, 70, C.gold);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 170, 36, C.paper);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 36, C.paper);
      return;
    }

    if (state === S.RESULT) {
      stepCosmetic(dt);
      drawAll();
      game.draw.rect(0, H * 0.3, W, H * 0.34, C.ink, 0.85);
      txt(ok ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, ok ? C.gold : C.red);
      drawUmb(0, 1, W / 2 - 150, H * 0.44, 8);
      txt(served + ' / ' + GOAL, W / 2 + 40, H * 0.44, 66, C.paper);
      txt('PERFECT ' + perfects + '   MISS ' + misses, W / 2, H * 0.51, 40, C.paper);
      if (ok && resultScore() >= game.best) txt('NEW RECORD', W / 2, H * 0.565, 50, C.gold);
      else txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.565, 40, C.paper);
      if (!ok) txt('あと' + (GOAL - served) + '本!', W / 2, H * 0.61, 46, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.paper);
      return;
    }

    // PLAYING
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      var running = stepWorld(dt);
      if (done) {
        if (hitStop <= 0) {
          endWait -= dt;
          if (endWait <= 0) {
            state = S.RESULT;
            var stats = { served: served, perfect: perfects, miss: misses };
            if (ok) game.end.success(resultScore(), stats);
            else game.end.failure(stats);
          }
        }
      } else if (running) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0; timeUp = true; drag = null;
          game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP' });
          finishRound(false);
        }
      }
    }
    stepCosmetic(dt);
    drawAll();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.gold);
  });

  function resultScore() { return served * 100 + perfects * 50 + Math.round(timeLeft * 10); }

  game.onStart(function() {
    game.audio.melody([['E5', 0.5], ['D5', 0.5], ['B4', 1], ['A4', 0.5], ['B4', 0.5], ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 2]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

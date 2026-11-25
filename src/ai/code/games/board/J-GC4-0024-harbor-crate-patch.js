// J-GC4-0024-harbor-crate-patch.js
// ハーバークレートパッチ — 相手のクレーンに抜かれた足場の穴へ、形の合う木箱を選んではめ込み、沈む前に塞ぎ返す
// 操作: 足場に開いた穴の形を見て、下に並ぶ3つの木箱ブロックのうち同じ形のものをタップ(自分のクレーンが運んではめ込む)
// 終わり: 8回塞ぐと自分のクレーンが相手の足場を抜き切ってCLEAR。穴を放置して3回浸水/時間切れでGAME OVER
// @mechanic: gap_fit
// @theme: harbor_crate_platform_duel
// 世界観: 夕暮れの運河に浮かぶ木箱の足場で、見習い荷役のカエルが向こう岸のクレーンに抜かれる穴を同じ形の箱で塞ぎ続け、塞ぐたびに自分のクレーンで相手の足場を一つずつ抜いて先に沈める
// 残るもの: 正誤(CLEAR/GAME OVER) + 塞いだ穴の数・PERFECT数・スコア
// スタイル: VOXEL BLOCK

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/前面/側面の3明度で。等角っぽく積む
  var STYLE = {
    bg: ['#2d3a6b', '#e08a5a', '#1d4e6b'],
    main: ['#d9a35b', '#a86f35', '#6e4521'],
    accent: ['#6fe0a8', '#ff5a5a'],
  };
  var CRATE = ['#e6b774', '#b27a3e', '#7a4d24'];
  var PIECE = ['#9fe7ff', '#4fa9d8', '#2b6c93'];
  var WATER = '#1d4e6b';

  var GAME_TITLE = 'CRATE PATCH';
  var TIME_LIMIT = 23;
  var NEEDED = 8;
  var LIVES = 3;
  var COLS = 5, ROWS = 3, CELL = 170, RH = 108;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.47;
  var MY_C = 2, MY_R = 1;
  var RIVAL_ORDER = [0, 7, 1, 6, 2, 5, 3, 4];
  var RIVAL_ON = 4;
  var RC = 96, RX0 = (W - 8 * RC) / 2, RY = H * 0.29;

  var SHAPES = [
    [[0, 0]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [0, 1]],
  ];
  // 似た形ペア(後半の精度プレッシャー用)
  var CLOSE = { 0: [1, 2], 1: [2, 3], 2: [1, 0], 3: [1, 5], 4: [5, 6], 5: [6, 4], 6: [4, 5] };

  var CARD_Y = H * 0.81;
  var CARD_X = [W * 0.19, W * 0.5, W * 0.81];
  var CARD_W = 300, CARD_H = 290;

  var FROG = [
    '..yyyy..',
    '.yyyyyy.',
    '.gwggwg.',
    'gggggggg',
    'gggppggg',
    '.gggggg.',
    '.gg..gg.',
  ];
  var FROG2 = [
    '..yyyy..',
    '.yyyyyy.',
    '.gwggwg.',
    'gggggggg',
    'ggpppggg',
    '.gggggg.',
    'gg....gg',
  ];
  var FROG_PAL = { y: '#ffd23f', g: '#5fbf4a', w: '#ffffff', p: '#e8566b' };
  var SHADE_PAL = { y: '#1b1f3a', g: '#1b1f3a', w: '#1b1f3a', p: '#1b1f3a' };
  var HOOK = ['.##.', '#..#', '...#', '..#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#141a33', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    var cells = [];
    for (var i = 0; i < COLS * ROWS; i++) cells.push(0);
    var rival = [];
    for (var k = 0; k < 8; k++) rival.push(1);
    g = {
      cells: cells, rival: rival, phase: 'tele', phaseT: 0, shape: 0, hc: 0, hr: 0,
      choices: [0, 1, 2], patches: 0, perfect: 0, lives: LIVES, score: 0, combo: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, done: false, ok: false, endWait: 0,
      finished: false, piece: null, pluck: null, sink: 0, cardShake: [0, 0, 0], hl: null,
      trolley: W / 2, rTrolley: W / 2, wrongs: 0, fallAt: 0,
    };
    pickHole();
  }

  function fits(si, c, r) {
    var sh = SHAPES[si];
    for (var i = 0; i < sh.length; i++) {
      var cc = c + sh[i][0], rr = r + sh[i][1];
      if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) return false;
      if (cc === MY_C && rr === MY_R) return false;
    }
    return true;
  }

  function pickHole() {
    var si = Math.floor(game.random(0, SHAPES.length)) % SHAPES.length;
    var spots = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (fits(si, c, r)) spots.push([c, r]);
    var sp = spots[Math.floor(game.random(0, spots.length)) % spots.length];
    g.shape = si; g.hc = sp[0]; g.hr = sp[1];
    g.phase = 'tele'; g.phaseT = 0; g.sink = 0;
    var others = [];
    if (g.patches >= 4) others = CLOSE[si].slice();
    for (var t = 0; others.length < 2 && t < 30; t++) {
      var o = Math.floor(game.random(0, SHAPES.length)) % SHAPES.length;
      if (o !== si && others.indexOf(o) < 0) others.push(o);
    }
    var ch = [si, others[0], others[1]];
    for (var q = 2; q > 0; q--) {
      var j = Math.floor(game.random(0, q + 1)) % (q + 1);
      var tmp = ch[q]; ch[q] = ch[j]; ch[j] = tmp;
    }
    g.choices = ch;
    g.rTrolley = GX + (g.hc + 0.5) * CELL;
  }

  function holeCells() {
    var sh = SHAPES[g.shape], out = [];
    for (var i = 0; i < sh.length; i++) out.push([g.hc + sh[i][0], g.hr + sh[i][1]]);
    return out;
  }

  function holeLimit() { return Math.max(2.1, 3.2 - g.patches * 0.14); }

  function cellX(c) { return GX + c * CELL; }
  function cellY(r) { return GY + r * RH; }

  function choose(i, isDemo) {
    if (g.phase !== 'open') {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(CARD_X[i], CARD_Y, { color: STYLE.main[0], count: 4, speed: 160 });
      return;
    }
    var hx = cellX(g.hc) + CELL * 0.5, hy = cellY(g.hr) + RH * 0.5;
    if (g.choices[i] === g.shape) {
      var quick = g.phaseT < 1.1;
      g.combo++;
      g.patches++;
      if (quick) g.perfect++;
      var gain = 100 + (quick ? 60 : 0) + Math.min(4, g.combo) * 10;
      g.score += gain;
      g.piece = { x0: CARD_X[i], y0: CARD_Y, t: 0 };
      g.phase = 'fill'; g.phaseT = 0;
      g.pluck = { idx: RIVAL_ORDER[g.patches - 1], t: 0 };
      g.trolley = RX0 + (RIVAL_ORDER[g.patches - 1] + 0.5) * RC;
      game.feedback.good(hx, hy, { text: quick ? 'PERFECT' : 'GOOD', color: STYLE.accent[0], count: 14 });
      if (g.patches === 4 && !isDemo) {
        game.fx.popup('4 / ' + NEEDED, W / 2, H * 0.4, { color: '#ffd23f', size: 60 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      g.combo = 0;
      g.wrongs++;
      g.sink += 0.7;
      g.cardShake[i] = 0.35;
      game.feedback.bad(CARD_X[i], CARD_Y - 100, { text: 'MISS', shake: 8 });
    }
  }

  function loseLife() {
    g.lives--;
    g.combo = 0;
    var hx = cellX(g.hc) + CELL * 0.5, hy = cellY(g.hr) + RH * 0.5;
    if (g.lives <= 0) {
      endRound(false, [cellX(MY_C) + CELL / 2, cellY(MY_R) + RH / 2]);
    } else {
      game.feedback.bad(hx, hy, { text: 'MISS', shake: 14 });
      game.fx.burst(hx, hy, { color: '#9fe7ff', count: 18, speed: 380 });
      pickHole();
    }
  }

  function endRound(ok, hl) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.hl = hl;
    game.fx.flash('#ffffff', 0.15);
    if (ok) game.audio.play('se_break', 0.5);
    else game.audio.play('se_bad', 0.5);
  }

  function step(dt, isDemo) {
    for (var s = 0; s < 3; s++) if (g.cardShake[s] > 0) g.cardShake[s] -= dt;
    if (g.pluck) { g.pluck.t += dt; if (g.pluck.t > 0.6) { g.rival[g.pluck.idx] = 0; g.pluck = null; } }
    g.phaseT += dt;
    if (g.phase === 'tele') {
      if (g.phaseT >= 0.6) {
        g.phase = 'open'; g.phaseT = 0;
        game.audio.play('se_break', 0.25);
      }
    } else if (g.phase === 'open') {
      if (g.phaseT + g.sink >= holeLimit()) loseLife();
    } else if (g.phase === 'fill') {
      if (g.piece) g.piece.t += dt;
      if (g.phaseT >= 0.4) {
        g.piece = null;
        if (g.patches >= NEEDED) {
          endRound(true, [RX0 + (RIVAL_ON + 0.5) * RC, RY]);
          g.rival[RIVAL_ON] = 0; g.fallAt = game.time.elapsed;
        } else pickHole();
      }
    }
    if (!isDemo) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false, [cellX(g.hc) + CELL / 2, cellY(g.hr) + RH / 2]); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function cube(x, y, w, top, front, pal, a) {
    game.draw.rect(x, y, w, top, pal[0], a);
    game.draw.rect(x, y + top, w, front, pal[1], a);
    game.draw.rect(x + w * 0.84, y + top, w * 0.16, front, pal[2], a);
    game.draw.rect(x, y, w, 4, '#ffffff', 0.25 * (a === undefined ? 1 : a));
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.3, STYLE.bg[1]], [0.36, '#3a6f8f'], [1, WATER]]);
    // 遠景の倉庫ブロック
    for (var b = 0; b < 7; b++) {
      var bx = b * 170 - 20, bh = 60 + ((b * 37) % 70);
      game.draw.rect(bx, H * 0.34 - bh, 150, bh, '#2a2f55', 0.8);
      game.draw.rect(bx, H * 0.34 - bh, 150, 12, '#3b4270', 0.8);
    }
    for (var w = 0; w < 14; w++) {
      var wy = H * 0.37 + w * 110 + ((t * 30) % 110);
      var wx = ((w * 233 + t * 40) % (W + 200)) - 100;
      game.draw.rect(wx, wy, 120, 6, '#6fb7d6', 0.35);
    }
    game.draw.rect(0, 0, W, H, '#ffd9a8', 0.03 + 0.03 * Math.sin(t * 1.6));
  }

  function drawRival() {
    var t = game.time.elapsed;
    // 向こうのクレーン(相手、半透明)
    game.draw.rect(0, H * 0.225, W, 14, '#1b1f3a', 0.5);
    var sway = Math.sin(t * 2.1) * 10;
    var rx = g.rTrolley;
    game.draw.rect(rx - 40, H * 0.215, 80, 30, '#1b1f3a', 0.55);
    var hookY = cellY(g.hr) - 30;
    if (g.phase === 'tele') {
      game.draw.line(rx, H * 0.24, rx + sway, hookY, '#1b1f3a', 5);
      game.draw.sprite(HOOK, { '#': '#1b1f3a' }, rx + sway, hookY, 12, { anchor: 'center', alpha: 0.6 });
    } else {
      game.draw.line(rx, H * 0.24, rx + sway * 0.4, H * 0.33, '#1b1f3a', 5);
    }
    // 相手の足場
    for (var k = 0; k < 8; k++) {
      if (!g.rival[k]) continue;
      var x = RX0 + k * RC, y = RY;
      var lift = 0, a = 1;
      if (g.pluck && g.pluck.idx === k) { lift = g.pluck.t * 240; a = Math.max(0, 1 - g.pluck.t * 1.4); }
      cube(x + 3, y - lift, RC - 6, 40, 34, CRATE, a);
    }
    var fall = g.rival[RIVAL_ON] ? 0 : 1;
    var ry = RY - 96 + Math.sin(t * 3) * 6 + (fall ? Math.min(260, (t - g.fallAt) * 400) : 0);
    game.draw.sprite(FROG, SHADE_PAL, RX0 + (RIVAL_ON + 0.5) * RC, ry, 12, { anchor: 'center', alpha: fall ? 0.25 : 0.5 });
  }

  function drawGrid() {
    var t = game.time.elapsed;
    var hcells = (g.phase === 'open' || g.phase === 'tele' || g.phase === 'fill') ? holeCells() : [];
    function inHole(c, r) {
      for (var i = 0; i < hcells.length; i++) if (hcells[i][0] === c && hcells[i][1] === r) return true;
      return false;
    }
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = cellX(c) + 4, y = cellY(r);
        var hole = inHole(c, r);
        if (hole && g.phase === 'tele') {
          var blink = Math.floor(g.phaseT * 12) % 2 === 0;
          cube(x, y + (blink ? 4 : 0), CELL - 8, RH - 8, 40, CRATE);
          if (blink) game.draw.rect(x, y, CELL - 8, RH - 8, STYLE.accent[1], 0.45);
        } else if (hole && g.phase === 'open') {
          game.draw.rect(x, y, CELL - 8, RH + 32, '#0d2a3d');
          var fillRatio = Math.min(1, (g.phaseT + g.sink) / holeLimit());
          var wh = (RH + 32) * fillRatio;
          game.draw.rect(x, y + RH + 32 - wh, CELL - 8, wh, '#3f9fd0', 0.85);
          game.draw.rect(x + 10 + Math.sin(t * 6 + c) * 8, y + RH + 26 - wh, CELL - 40, 5, '#bff0ff', 0.7);
        } else if (hole && g.phase === 'fill') {
          var drop = Math.max(0, 1 - g.phaseT / 0.3) * -60;
          cube(x, y + drop, CELL - 8, RH - 8, 40, PIECE);
        } else {
          cube(x, y, CELL - 8, RH - 8, 40, CRATE);
          game.draw.line(x + 12, y + RH * 0.45, x + CELL - 20, y + RH * 0.45, CRATE[2], 3);
        }
      }
    }
    // 自分(カエル)
    var fx = cellX(MY_C) + CELL / 2, fy = cellY(MY_R) - 30 + Math.sin(t * 4) * 6;
    var sinkOff = 0;
    if (g.finished && !g.ok) sinkOff = Math.min(80, (0.5 - Math.max(0, g.hitStop)) * 160);
    game.draw.sprite(Math.floor(t * 3) % 2 ? FROG : FROG2, FROG_PAL, fx, fy + sinkOff, 16, { anchor: 'center' });
    // 自分のクレーン(運搬中のピース)
    if (g.piece) {
      var k = Math.min(1, g.piece.t / 0.35);
      var tx = cellX(g.hc) + CELL / 2, ty = cellY(g.hr);
      var px = g.piece.x0 + (tx - g.piece.x0) * k, py = g.piece.y0 + (ty - g.piece.y0) * k - Math.sin(k * Math.PI) * 160;
      drawShape(g.shape, px, py, 40, PIECE, 1);
    }
  }

  function drawShape(si, cx, cy, s, pal, a) {
    var sh = SHAPES[si], maxC = 0, maxR = 0;
    for (var i = 0; i < sh.length; i++) { maxC = Math.max(maxC, sh[i][0]); maxR = Math.max(maxR, sh[i][1]); }
    var ox = cx - (maxC + 1) * s / 2, oy = cy - (maxR + 1) * s * 0.64 / 2;
    for (var j = 0; j < sh.length; j++) {
      cube(ox + sh[j][0] * s + 2, oy + sh[j][1] * s * 0.64, s - 4, s * 0.64 - 4, s * 0.3, pal, a);
    }
  }

  function drawCards() {
    var t = game.time.elapsed;
    var live = g.phase === 'open';
    for (var i = 0; i < 3; i++) {
      var sx = g.cardShake[i] > 0 ? Math.sin(g.cardShake[i] * 60) * 12 : 0;
      var bob = Math.sin(t * 2.4 + i * 1.3) * 5;
      var x = CARD_X[i] - CARD_W / 2 + sx, y = CARD_Y - CARD_H / 2 + bob;
      game.draw.rect(x, y + 16, CARD_W, CARD_H, '#1b1f3a', 0.5);
      game.draw.rect(x, y, CARD_W, CARD_H, live ? '#f4e2c4' : '#b9a88c');
      game.draw.rect(x, y, CARD_W, 14, '#ffffff', 0.4);
      drawShape(g.choices[i], CARD_X[i] + sx, CARD_Y + bob, 80, PIECE, live ? 1 : 0.55);
    }
    // 自分のクレーンレール
    game.draw.rect(0, H * 0.405, W, 12, '#6e4521');
    game.draw.rect(g.trolley - 45, H * 0.395, 90, 32, STYLE.accent[0]);
    game.draw.line(g.trolley, H * 0.42, g.trolley, H * 0.43 + Math.sin(t * 2) * 8, '#e6b774', 4);
  }

  function drawHud() {
    txt(g.patches + ' / ' + NEEDED, W * 0.3, 80, 58, '#ffffff');
    txt('SCORE ' + g.score, W * 0.7, 80, 40, '#ffd23f');
    for (var l = 0; l < LIVES; l++) {
      game.draw.circle(W * 0.1 + l * 60, 190, 20, l < g.lives ? STYLE.accent[0] : '#1b1f3a', l < g.lives ? 1 : 0.5);
    }
    var bw = W * 0.6, low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.3, 176, bw, 22, '#1b1f3a', 0.6);
    game.draw.rect(W * 0.3, 176, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 22, low ? STYLE.accent[1] : '#ffd23f');
  }

  function drawHighlight() {
    if (!g.hl || g.hitStop <= 0) return;
    var p = 1 - g.hitStop / 0.5;
    game.draw.circle(g.hl[0], g.hl[1], 90 + p * 70, '#ffffff', 0.45 * (1 - p));
    game.draw.circle(g.hl[0], g.hl[1], 60, '#ffffff', 0.25);
  }

  // ── デモ(実ロジック+AIの手) ─────────────────────────
  var demo = { t: 0, gx: W / 2, gy: CARD_Y, press: false, tx: W / 2, cyc: 0, wrongDone: false, wrongAt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) {
      initGame(); g.ready = 0; demo.cyc++; demo.wrongDone = false;
    }
    step(dt, true);
    demo.press = false;
    if (g.phase === 'open') {
      var want = g.choices.indexOf(g.shape);
      if (demo.cyc % 2 === 0 && !demo.wrongDone) want = (want + 1) % 3;
      demo.tx = CARD_X[want];
      if (g.phaseT > 0.45) {
        demo.press = true;
        if (demo.cyc % 2 === 0 && !demo.wrongDone) { demo.wrongDone = true; demo.wrongAt = g.phaseT; choose(want, true); }
        else if (!(demo.cyc % 2 === 0) || g.phaseT > demo.wrongAt + 0.55) choose(want, true);
        else demo.press = false;
      }
    }
    demo.gx += (demo.tx - demo.gx) * Math.min(1, dt * 9);
    demo.gy = CARD_Y + 40;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (g.finished || g.ready > 0 || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    if (y > CARD_Y - CARD_H / 2 - 30 && y < CARD_Y + CARD_H / 2 + 30) {
      for (var i = 0; i < 3; i++) {
        if (Math.abs(x - CARD_X[i]) < CARD_W / 2 + 10) { choose(i, false); return; }
      }
    }
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: '#bff0ff', count: 5, speed: 150 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawRival(); drawGrid(); drawCards();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 84, '#ffd23f');
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 42, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 48, '#ffd23f');
      else txt('INSERT COIN', W / 2, H * 0.955, 40, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawRival(); drawGrid();
      game.draw.rect(0, H * 0.62, W, H * 0.38, '#141a33', 0.75);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.7, 110, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(g.patches + ' / ' + NEEDED, W / 2, H * 0.77, 64, '#ffffff');
      txt('SCORE ' + g.score, W / 2, H * 0.82, 50, '#ffd23f');
      if (!g.ok && NEEDED - g.patches <= 3) txt('あと' + (NEEDED - g.patches) + '個!', W / 2, H * 0.87, 52, '#ff9f7a');
      else txt('BEST ' + Math.max(game.best || 0, g.ok ? g.score : 0), W / 2, H * 0.87, 44, '#ffffff');
      if (g.ok && g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.63, 56, '#ffd23f');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 44, '#ffffff');
      return;
    }

    // PLAYING
    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { patches: g.patches, perfect: g.perfect, misses: g.wrongs };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(W / 2, RY, { text: 'CLEAR', color: '#ffd23f', count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.hl[0], g.hl[1], { text: g.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', shake: 16 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawRival(); drawGrid(); drawCards(); drawHighlight(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, '#ffd23f');
  });

  game.onStart(function () {
    game.audio.melody([
      ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 1],
      ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 1], ['C4', 1],
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

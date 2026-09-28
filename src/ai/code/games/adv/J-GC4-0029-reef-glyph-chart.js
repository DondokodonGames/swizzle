// J-GC4-0029-reef-glyph-chart.js
// 岩礁の印たどり — 地図の切れ端に描かれた印の順番どおりに、となり合う石を線でつないで宝箱までの道を示す
// 操作: 足あとの石から、上の帯に並ぶ印の順にとなりの石を指でなぞって(またはタップで)つなぐ。最後は宝箱へ
// 終わり: 3枚の地図すべてで宝箱までつなげばCLEAR。時間切れでGAME OVER(違う印をつなぐと時間が減る)
// @mechanic: connect
// @theme: reef_glyph_treasure_chart
// 世界観: 引き潮の岩礁で、見習いの地図描きが古い海図の切れ端に残る印(貝・羽・魚・星・月・鍵)の順番を読み、刻印のある石を一本の墨線でつないで砂に埋もれた宝箱までの道筋を描き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + つないだ石の数・読み違えの数・スコア
// スタイル: 1BIT INK

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調、線の太さで語る
  var STYLE = {
    bg: ['#f2efe6', '#e6e2d6', '#111111'],
    main: ['#111111', '#f2efe6', '#111111'],
    accent: ['#111111', '#f2efe6'],
  };
  var INK = '#111111', PAPER = '#f2efe6';

  var GAME_TITLE = 'GLYPH CHART';
  var TIME_LIMIT = 22;
  var MAPS = 3;
  var COLS = 5, ROWS = 6;
  var GX0 = W * 0.14, GDX = (W * 0.72) / (COLS - 1);
  var GY0 = H * 0.25, GDY = (H * 0.5) / (ROWS - 1);
  var NODE_R = 74;
  var PENALTY = 1.5;

  var GLYPHS = [
    ['...#...', '..###..', '.#.#.#.', '#..#..#', '#.###.#', '.#####.', '..###..'], // 貝
    ['.....##', '....###', '...###.', '..###..', '.###...', '.#.....', '#......'], // 羽
    ['.......', '.###..#', '#####.#', '#.#####', '#####.#', '.###..#', '.......'], // 魚
    ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '#.....#'], // 星
    ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'], // 月
    ['.###...', '#...#..', '.###...', '..#....', '..###..', '..#....', '..##...'], // 鍵
  ];
  var CHEST = ['.#####.', '#######', '#.....#', '###.###', '#.....#', '#######'];
  var FOOT = ['.##..', '####.', '####.', '.###.', '..##.', '...##'];
  var GULL = ['#.....#', '.#...#.', '..#.#..', '...#...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color, bgc) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: bgc || PAPER, bold: true, align: 'center', font: 'serif' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'serif' });
  }

  function nx(c) { return GX0 + c * GDX; }
  function ny(r) { return GY0 + r * GDY; }
  function adjacent(a, b) { return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1 && !(a[0] === b[0] && a[1] === b[1]); }

  function buildMap(level) {
    var kinds = level === 0 ? 3 : level === 1 ? 5 : 6;
    var pool = [];
    for (var k = 0; k < GLYPHS.length; k++) pool.push(k);
    for (var q = pool.length - 1; q > 0; q--) { var j = Math.floor(game.random(0, q + 1)) % (q + 1); var t = pool[q]; pool[q] = pool[j]; pool[j] = t; }
    pool = pool.slice(0, kinds);
    var path = [];
    var c = Math.floor(game.random(0, COLS)) % COLS;
    path.push([c, ROWS - 1]);
    for (var r = ROWS - 2; r >= 0; r--) {
      var opts = [];
      for (var d = -1; d <= 1; d++) if (c + d >= 0 && c + d < COLS) opts.push(c + d);
      c = opts[Math.floor(game.random(0, opts.length)) % opts.length];
      path.push([c, r]);
    }
    var clue = [];
    for (var s = 1; s < path.length - 1; s++) clue.push(pool[Math.floor(game.random(0, pool.length)) % pool.length]);
    var grid = [];
    for (var i = 0; i < COLS * ROWS; i++) grid.push(-1);
    function onPath(cc, rr) { for (var p = 0; p < path.length; p++) if (path[p][0] === cc && path[p][1] === rr) return p; return -1; }
    for (var p2 = 1; p2 < path.length - 1; p2++) grid[path[p2][1] * COLS + path[p2][0]] = clue[p2 - 1];
    for (var rr = 0; rr < ROWS; rr++) {
      for (var cc = 0; cc < COLS; cc++) {
        if (onPath(cc, rr) >= 0) continue;
        var forbid = {};
        for (var p3 = 0; p3 < path.length - 2; p3++) if (adjacent(path[p3], [cc, rr])) forbid[clue[p3]] = true;
        var choices = [];
        for (var u = 0; u < pool.length; u++) if (!forbid[pool[u]]) choices.push(pool[u]);
        grid[rr * COLS + cc] = choices.length ? choices[Math.floor(game.random(0, choices.length)) % choices.length] : -2;
      }
    }
    return { path: path, clue: clue, grid: grid, step: 0 };
  }

  function initGame() {
    g = {
      level: 0, map: null, links: 0, wrongs: 0, score: 0, timeLeft: TIME_LIMIT,
      ready: 0.8, hitStop: 0, finished: false, done: false, ok: false, endWait: 0,
      pause: 0, lastBad: -1, hl: null, splat: [], combo: 0,
    };
    g.map = buildMap(0);
  }

  function nodeAt(x, y) {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (game.hit.circle(x, y, 10, nx(c), ny(r), NODE_R)) return [c, r];
    }
    return null;
  }

  function tail() { return g.map.path[g.map.step]; }

  function tryLink(n, isDemo) {
    if (!n || g.pause > 0) return;
    var m = g.map, cur = tail();
    if (n[0] === cur[0] && n[1] === cur[1]) return;
    if (!adjacent(n, cur)) return;
    for (var v = 0; v < m.step; v++) if (m.path[v][0] === n[0] && m.path[v][1] === n[1]) return;
    var id = n[1] * COLS + n[0];
    var want = m.path[m.step + 1];
    if (n[0] === want[0] && n[1] === want[1]) {
      m.step++;
      g.links++; g.combo++;
      g.lastBad = -1;
      g.score += 50 + Math.min(5, g.combo) * 10;
      var last = m.step === m.path.length - 1;
      if (last) {
        game.feedback.good(nx(n[0]), ny(n[1]), { text: 'CLEAR', color: INK, count: 20, sound: 'se_coin' });
        g.level++;
        g.pause = 0.8;
        if (!isDemo) {
          game.fx.popup(g.level + ' / ' + MAPS, W / 2, H * 0.5, { color: INK, size: 80 });
          game.audio.play('se_milestone', 0.5);
        }
      } else {
        game.feedback.good(nx(n[0]), ny(n[1]), { text: 'GOOD', color: INK, count: 8 });
      }
    } else {
      if (g.lastBad === id) return;
      g.lastBad = id;
      g.wrongs++; g.combo = 0;
      if (!isDemo) g.timeLeft = Math.max(0, g.timeLeft - PENALTY);
      g.splat.push({ x: nx(n[0]), y: ny(n[1]), t: 0.6 });
      game.feedback.bad(nx(n[0]), ny(n[1]), { text: 'MISS', color: INK, flashColor: '#111111', shake: 8 });
    }
  }

  function endRound(ok) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5;
    var m = g.map;
    var w = ok ? m.path[m.path.length - 1] : m.path[Math.min(m.path.length - 1, m.step + 1)];
    g.hl = [nx(w[0]), ny(w[1])];
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += Math.round(g.timeLeft * 60) + (g.wrongs === 0 ? 300 : 0);
    game.audio.play(ok ? 'se_powerup' : 'se_bad', 0.5);
  }

  function step(dt, isDemo) {
    for (var i = g.splat.length - 1; i >= 0; i--) { g.splat[i].t -= dt; if (g.splat[i].t <= 0) g.splat.splice(i, 1); }
    if (g.pause > 0) {
      g.pause -= dt;
      if (g.pause <= 0) {
        if (g.level >= MAPS) { if (!isDemo) endRound(true); else { g.level = 0; g.map = buildMap(0); } }
        else g.map = buildMap(g.level);
      }
    }
    if (!isDemo) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function dither(x, y, w, h, step) {
    for (var yy = 0; yy < h; yy += step) {
      var odd = Math.floor(yy / step) % 2;
      for (var xx = odd ? step : 0; xx < w; xx += step * 2) game.draw.rect(x + xx, y + yy, 4, 4, INK);
    }
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 海(ディザの帯)
    dither(0, H * 0.21, W * 0.07, H * 0.58, 16);
    dither(W * 0.93, H * 0.21, W * 0.07, H * 0.58, 16);
    // カモメ(遠景、揺れ)
    for (var b = 0; b < 3; b++) {
      game.draw.sprite(GULL, { '#': INK }, (b * 360 + t * 60) % (W + 100) - 50, H * 0.2 + Math.sin(t * 2 + b) * 14 - 16, 6, { anchor: 'center' });
    }
    // 親指ゾーンの羅針盤
    var cx = W / 2, cy = H * 0.86;
    game.draw.line(cx - 120, cy, cx + 120, cy, INK, 3);
    game.draw.line(cx, cy - 90, cx, cy + 90, INK, 3);
    game.draw.circle(cx, cy, 16, INK);
    game.draw.circle(cx + Math.sin(t * 0.8) * 40, cy - Math.cos(t * 0.8) * 40, 8, INK);
    game.draw.rect(0, 0, W, H, INK, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function drawClue() {
    var m = g.map, n = m.clue.length + 1;
    var bw = 132, gap = 18, total = n * bw + (n - 1) * gap, x0 = (W - total) / 2, y = H * 0.155;
    game.draw.rect(x0 - 24, y - 84, total + 48, 168, PAPER);
    game.draw.rect(x0 - 24, y - 84, total + 48, 6, INK);
    game.draw.rect(x0 - 24, y + 78, total + 48, 6, INK);
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (bw + gap) + bw / 2;
      var done = i < m.step;
      var next = i === m.step;
      var art = i < m.clue.length ? GLYPHS[m.clue[i]] : CHEST;
      var bob = next ? Math.sin(game.time.elapsed * 6) * 6 : 0;
      if (next) game.draw.rect(x - bw / 2, y - 64, bw, 128, INK);
      game.draw.sprite(art, { '#': next ? PAPER : INK }, x, y + bob, 14, { anchor: 'center', alpha: done ? 0.3 : 1 });
      if (done) game.draw.line(x - 50, y + 50, x + 50, y - 50, INK, 8);
    }
  }

  function drawMap() {
    var t = game.time.elapsed;
    var m = g.map;
    // 墨線
    for (var s = 0; s < m.step; s++) {
      var a = m.path[s], b = m.path[s + 1];
      game.draw.line(nx(a[0]), ny(a[1]), nx(b[0]), ny(b[1]), INK, 18);
    }
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = nx(c), y = ny(r) + Math.sin(t * 1.6 + c * 0.7 + r) * 3;
        var gi = m.grid[r * COLS + c];
        var start = c === m.path[0][0] && r === m.path[0][1];
        var chest = c === m.path[m.path.length - 1][0] && r === m.path[m.path.length - 1][1];
        var visited = false;
        for (var v = 0; v <= m.step; v++) if (m.path[v][0] === c && m.path[v][1] === r) visited = true;
        game.draw.circle(x, y, NODE_R, INK);
        game.draw.circle(x, y, NODE_R - 8, visited ? INK : PAPER);
        var pal = { '#': visited ? PAPER : INK };
        if (start) game.draw.sprite(FOOT, pal, x, y, 14, { anchor: 'center' });
        else if (chest) game.draw.sprite(CHEST, pal, x, y, 14, { anchor: 'center' });
        else if (gi >= 0) game.draw.sprite(GLYPHS[gi], pal, x, y, 13, { anchor: 'center' });
      }
    }
    var tl = m.path[m.step];
    game.draw.circle(nx(tl[0]), ny(tl[1]), NODE_R + 14 + Math.sin(t * 8) * 6, INK, 0.25);
    for (var i = 0; i < g.splat.length; i++) {
      var sp = g.splat[i];
      for (var k = 0; k < 6; k++) game.draw.circle(sp.x + Math.cos(k * 1.1) * 60, sp.y + Math.sin(k * 1.1) * 60, 14 * sp.t / 0.6 + 4, INK);
    }
    if (g.hl && g.hitStop > 0) {
      game.draw.circle(g.hl[0], g.hl[1], NODE_R * (1.2 + (0.5 - g.hitStop)), '#ffffff', 0.7);
      game.draw.circle(g.hl[0], g.hl[1], NODE_R + 20, INK, 0.3);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 76, INK);
    txt(Math.min(g.level + 1, MAPS) + ' / ' + MAPS, W * 0.2, 40, 50, PAPER, INK);
    txt('SCORE ' + g.score, W * 0.68, 40, 40, PAPER, INK);
    var bw = W * 0.84, low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.08, 96, bw, 24, INK);
    game.draw.rect(W * 0.08 + 4, 100, (bw - 8) * Math.max(0, g.timeLeft / TIME_LIMIT), 16, low ? INK : PAPER);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, next: 0.6, cyc: 0, wrongDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.cyc++; demo.wrongDone = false; demo.next = 0.6; }
    step(dt, true);
    var m = g.map;
    var target = m.path[Math.min(m.path.length - 1, m.step + 1)];
    var wrongTry = demo.cyc % 2 === 0 && !demo.wrongDone && m.step === 2;
    if (wrongTry) {
      var cur = tail();
      for (var dc = -1; dc <= 1; dc++) {
        var cand = [cur[0] + dc, cur[1] - 1];
        if (cand[0] >= 0 && cand[0] < COLS && cand[1] >= 0 && !(cand[0] === target[0] && cand[1] === target[1])) { target = cand; break; }
      }
    }
    var tx = nx(target[0]), ty = ny(target[1]);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (ty + 30 - demo.gy) * Math.min(1, dt * 7);
    demo.next -= dt;
    demo.press = demo.next < 0.2;
    if (demo.next <= 0 && g.pause <= 0) {
      tryLink(target, true);
      if (wrongTry) demo.wrongDone = true;
      demo.next = 0.55;
    }
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
    g.lastBad = -1;
    var n = nodeAt(x, y);
    game.audio.play('se_tap', 0.15);
    if (n) tryLink(n, false);
    else game.fx.burst(x, y, { color: INK, count: 4, speed: 120 });
  });

  game.onMove(function (x, y) {
    if (state !== S.PLAYING || g.finished || g.ready > 0 || g.hitStop > 0) return;
    var n = nodeAt(x, y);
    if (n) tryLink(n, false);
    else if (game.random(0, 1) < 0.03) game.audio.play('se_tap', 0.03);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawClue(); drawMap();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, H * 0.02, W, 150, INK);
      txt(GAME_TITLE, W / 2, H * 0.045, 84, PAPER, INK);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.075, 38, PAPER, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, INK);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, INK);
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawMap();
      game.draw.rect(0, H * 0.06, W, H * 0.22, INK);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 110, PAPER, INK);
      txt(g.links + ' / ' + (MAPS * (ROWS - 1)), W / 2, H * 0.165, 60, PAPER, INK);
      txt('SCORE ' + g.score, W / 2, H * 0.21, 46, PAPER, INK);
      if (!g.ok) txt('あと' + (MAPS * (ROWS - 1) - g.links) + '個!', W / 2, H * 0.255, 50, PAPER, INK);
      else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.255, 54, PAPER, INK);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.255, 44, PAPER, INK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, INK);
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { links: g.links, maps: Math.min(g.level, MAPS), misreads: g.wrongs };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(g.hl[0], g.hl[1], { text: 'CLEAR', color: INK, count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.hl[0], g.hl[1], { text: 'TIME UP', color: INK, shake: 14 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawClue(); drawMap(); drawHud();
    if (g.ready > 0) {
      game.draw.rect(W * 0.2, H * 0.44, W * 0.6, 150, INK);
      txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 110, PAPER, INK);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['D4', 0.5], ['F4', 0.5], ['A4', 1], ['G4', 0.5], ['F4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['D4', 1.5],
    ], { tempo: 112, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

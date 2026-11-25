// I-DS-0001v3-village-pole-wire-link.js
// 山村の電線つなぎ — 灯りの来ている碍子から次の電柱の碍子へ指でなぞって電線を張り、木の枝を避けながら村の家まで灯りを届ける
// 操作: どこを押しても灯りの来ている碍子から電線が伸び、指について行く。届く距離は点線の輪で見える。別の電柱の碍子の上で離すと電線が張られ、その電柱に灯りが移る。輪の外や何もない所で離すと電線は戻る。木の枝に電線が触れると(なぞっている間は線と木が赤く光る)火花が散ってヒューズを1本失う。3軒目は風で木が揺れるので、枝がよけた隙に張る
// 終わり: 3軒の家に灯りを届ければCLEAR。ヒューズ3本を失うか24秒の時間切れでGAME OVER
// @mechanic: connect
// @theme: mountain_village_pole_wiring
// 世界観: 日暮れの山村で、電気工が電柱の碍子どうしを電線で結び、枝を張り出した杉をよけながら変電箱から谷あいの家まで1軒ずつ灯りを届けていく
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 灯した家の数・張った電線の本数・枝すれすれで張った数・火花の数・スコア
// スタイル: 70s VECTOR

(function (game) {
  var STYLE = { bg: ['#02070a', '#071a1e'], main: ['#3cff8c', '#38e8ff'], accent: ['#ffc23a', '#ff4848'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var VOID = STYLE.bg[0], DEEP = STYLE.bg[1];
  var GREEN = STYLE.main[0], CYAN = STYLE.main[1];
  var AMBER = STYLE.accent[0], RED = STYLE.accent[1];
  var DIMG = '#145a34', DIMC = '#0e4a56', DIMA = '#5a4214', DIMR = '#5a1a1a', WHITE = '#eaffff';

  var TITLE = 'WIRE LINK';
  var TIME_LIMIT = 24;
  var FUSES = 3;
  var MAX_SPAN = 360, SNAP = 80, NEAR = 40;
  var LAYOUTS = [
    { nodes: [[160, 430, 's'], [420, 560, 'p'], [700, 760, 'p'], [330, 900, 'p'], [760, 470, 'p'], [820, 1080, 'h']],
      trees: [[600, 520, 70, 0, 1], [560, 990, 80, 0, 1]] },
    { nodes: [[900, 420, 's'], [640, 520, 'p'], [380, 640, 'p'], [700, 860, 'p'], [300, 960, 'p'], [560, 1150, 'p'], [200, 1290, 'h']],
      trees: [[520, 780, 90, 0, 1], [420, 1120, 70, 0, 1]] },
    { nodes: [[160, 420, 's'], [460, 470, 'p'], [760, 600, 'p'], [480, 800, 'p'], [820, 950, 'p'], [560, 1130, 'p'], [860, 1300, 'h']],
      trees: [[620, 690, 80, 90, 2.4], [690, 1060, 70, 80, 2.0]] },
  ];

  var LINEMAN = [
    ['..####..', '.#....#.', '.######.', '..#..#..', '..####..', '.#.##.#.', '#..##..#', '...##...', '..#..#..', '..#..#..'],
    ['..####..', '.#....#.', '.######.', '..#..#..', '..####.#', '.#.##.#.', '#..##...', '...##...', '..#..#..', '.#....#.'],
    ['#.####.#', '##....##', '.######.', '..#..#..', '..####..', '...##...', '...##...', '...##...', '..#..#..', '.#....#.'],
  ];
  var FUSE = ['.#.', '###', '#.#', '#.#', '###', '.#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ri, nodes, trees, wires, cur, phase, phT, drag, lit, spans, nears, sparks, fuses, score, timeLeft, mFrame, mT, rt;
  var ready, halt, over, won, timeUp, endT, resT, sent, prevBest;

  function setupRound(i) {
    ri = i;
    var L = LAYOUTS[i];
    nodes = []; trees = []; wires = [];
    for (var n = 0; n < L.nodes.length; n++) nodes.push({ x: L.nodes[n][0], y: L.nodes[n][1], kind: L.nodes[n][2], live: L.nodes[n][2] === 's', pulse: 0 });
    for (var t = 0; t < L.trees.length; t++) trees.push({ bx: L.trees[t][0], y: L.trees[t][1], r: L.trees[t][2], sway: L.trees[t][3], per: L.trees[t][4], x: L.trees[t][0] });
    cur = 0; phase = 'wire'; phT = 0; drag = null; rt = 0;
  }

  function initGame() {
    setupRound(0);
    lit = 0; spans = 0; nears = 0; sparks = 0; fuses = FUSES; score = 0; timeLeft = TIME_LIMIT; mFrame = 0; mT = 0;
    ready = 0.8; halt = null; over = false; won = false; timeUp = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  function stepTrees(dt) {
    rt += dt;
    for (var i = 0; i < trees.length; i++) {
      var t = trees[i];
      t.x = t.bx + (t.sway ? Math.sin(rt * Math.PI * 2 / t.per + i * 1.7) * t.sway : 0);
    }
  }

  // 線分と点の距離
  function segDist(ax, ay, bx, by, px, py) {
    var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    var k = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
    return Math.hypot(px - (ax + vx * k), py - (ay + vy * k));
  }

  // 張ろうとしている電線を調べる
  function probe(x, y) {
    var a = nodes[cur];
    var len = Math.hypot(x - a.x, y - a.y);
    var hitTree = null, clear = 1e9;
    for (var i = 0; i < trees.length; i++) {
      var d = segDist(a.x, a.y, x, y, trees[i].x, trees[i].y) - trees[i].r;
      if (d < 6 && !hitTree) hitTree = trees[i];
      if (d < clear) clear = d;
    }
    var target = -1, best = SNAP;
    for (var n = 0; n < nodes.length; n++) {
      if (n === cur || nodes[n].live) continue;
      var dn = Math.hypot(x - nodes[n].x, y - nodes[n].y);
      if (dn < best) { best = dn; target = n; }
    }
    return { len: len, tree: hitTree, clear: clear, target: target, reach: len <= MAX_SPAN + SNAP * 0.5 };
  }

  // 電線を張る(プレイ・デモ共通)。'link' | 'house' | 'spark' | 'back'
  function attach(x, y, vol) {
    var p = probe(x, y);
    if (p.target >= 0) {
      var tn = nodes[p.target];
      var real = Math.hypot(tn.x - nodes[cur].x, tn.y - nodes[cur].y);
      var pr = probe(tn.x, tn.y);
      if (pr.tree) return { res: 'spark', x: (tn.x + nodes[cur].x) / 2, y: (tn.y + nodes[cur].y) / 2, tree: pr.tree };
      if (real <= MAX_SPAN) {
        var near = pr.clear < NEAR;
        wires.push([cur, p.target]);
        tn.live = true; tn.pulse = 0.5; cur = p.target;
        mFrame = 1; mT = 0.3;
        game.audio.tone(520, 0.05, { wave: 'square', volume: 0.06 * vol });
        game.audio.tone(1040, 0.08, { wave: 'square', volume: 0.04 * vol });
        game.feedback.good(tn.x, tn.y - 60, { text: near ? 'PERFECT' : 'GOOD', color: near ? AMBER : GREEN, count: near ? 14 : 8, volume: 0.45 * vol });
        if (tn.kind === 'h') { phase = 'lit'; phT = 1.0; mFrame = 2; mT = 1.0; return { res: 'house', near: near }; }
        return { res: 'link', near: near };
      }
    }
    game.audio.tone(200, 0.08, { wave: 'triangle', volume: 0.05 * vol, slide: -80 });
    return { res: 'back' };
  }

  function houseLit() {
    lit++;
    var bonus = 400 * (ri + 1);
    score += bonus;
    var h = nodes[cur];
    game.fx.popup('+' + bonus, h.x, h.y - 140, { color: AMBER, size: 64 });
    game.audio.play('se_milestone', 0.5);
    for (var i = 0; i < 3; i++) game.fx.burst(h.x, h.y + 60, { color: i % 2 ? AMBER : GREEN, count: 12, speed: 320 });
  }

  function nextRound() {
    if (ri >= LAYOUTS.length - 1) { finish(true); return; }
    setupRound(ri + 1);
    game.audio.tone(660, 0.08, { wave: 'square', volume: 0.05, slide: 220 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 40) + fuses * 150;
    mFrame = ok ? 2 : 0; mT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 5; i++) game.fx.burst(W * (0.15 + i * 0.18), H * (0.3 + (i % 2) * 0.1), { color: i % 2 ? AMBER : CYAN, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { houses: lit, wires: spans, closeCalls: nears, sparks: sparks };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !drag) game.audio.tone(330, 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || halt || ready > 0 || phase !== 'wire') return;
    drag = { x: x, y: y };
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function (x, y) {
    if (!drag || state !== S.PLAYING) return;
    var was = probe(drag.x, drag.y).tree;
    drag.x = x; drag.y = y;
    var now = probe(x, y).tree;
    if (now && !was) game.audio.tone(1800, 0.06, { wave: 'sawtooth', volume: 0.04 });
  });
  game.onRelease(function (x, y) {
    if (!drag || state !== S.PLAYING) { drag = null; return; }
    drag = null;
    if (over || halt || phase !== 'wire') return;
    var r = attach(x, y, 1);
    if (r.res === 'spark') {
      halt = { t: 0.4, max: 0.4, x: r.x, y: r.y, tree: r.tree, tx: x, ty: y };
      game.fx.flash(WHITE, 0.12);
      game.audio.play('se_break', 0.3);
    } else if (r.res === 'link' || r.res === 'house') {
      spans++;
      if (r.near) nears++;
      score += r.near ? 180 : 100;
      if (r.res === 'house') houseLit();
    }
  });

  // ── 描画(線だけで描く) ──
  function glowLine(x1, y1, x2, y2, col, dim, w) {
    game.draw.line(x1, y1, x2, y2, dim, w * 3);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function ring(x, y, r, col, w, n) {
    var k = n || 20;
    for (var i = 0; i < k; i++) {
      var a0 = i / k * Math.PI * 2, a1 = (i + 1) / k * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }
  function dashRing(x, y, r, col) {
    for (var i = 0; i < 36; i += 2) {
      var a0 = i / 36 * Math.PI * 2 + game.time.elapsed * 0.4, a1 = (i + 1) / 36 * Math.PI * 2 + game.time.elapsed * 0.4;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, 3);
    }
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawLand() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, VOID], [0.5, DEEP], [1, VOID]]);
    // 星と月
    for (var s = 0; s < 18; s++) {
      var sx = (s * 173) % W, sy = 250 + (s * 59) % 260, tw = (Math.sin(t * 2 + s) + 1) * 4 + 2;
      game.draw.line(sx - tw, sy, sx + tw, sy, DIMC, 2); game.draw.line(sx, sy - tw, sx, sy + tw, DIMC, 2);
    }
    ring(W * 0.84, 300, 50, CYAN, 3, 18);
    // 山の稜線(遠・近の2本)
    var far = [[0, 520], [180, 380], [330, 470], [520, 330], [700, 450], [880, 360], [1080, 480]];
    for (var i = 1; i < far.length; i++) game.draw.line(far[i - 1][0], far[i - 1][1], far[i][0], far[i][1], DIMG, 3);
    var near = [[0, 1420], [240, 1360], [480, 1440], [760, 1380], [1080, 1450]];
    for (var j = 1; j < near.length; j++) glowLine(near[j - 1][0], near[j - 1][1], near[j][0], near[j][1], GREEN, DIMG, 3);
    // 棚田の段(奥行き)
    for (var k = 0; k < 4; k++) game.draw.line(60, 1180 + k * 60, 1020 - k * 80, 1200 + k * 60, DIMG, 2);
  }

  function drawTrees(hl, warnTree) {
    for (var i = 0; i < trees.length; i++) {
      var tr = trees[i];
      var isH = halt && halt.tree === tr && hl > 0;
      var col = isH ? WHITE : (warnTree === tr && Math.floor(game.time.elapsed * 12) % 2 === 0) ? RED : GREEN;
      var r = tr.r * (isH ? 1 + hl * 0.3 : 1);
      // 杉: 三段の三角の輪郭 + 幹
      for (var l = 0; l < 3; l++) {
        var top = tr.y - r + l * r * 0.55, wdt = r * (0.55 + l * 0.25), bot = top + r * 0.7;
        glowLine(tr.x, top, tr.x - wdt, bot, col, isH ? '#ffffff' : DIMG, 3);
        glowLine(tr.x, top, tr.x + wdt, bot, col, isH ? '#ffffff' : DIMG, 3);
        game.draw.line(tr.x - wdt, bot, tr.x + wdt, bot, col, 3);
      }
      game.draw.line(tr.bx, tr.y + r * 0.9, tr.bx, tr.y + r * 1.8, col, 4);
      if (tr.sway) ring(tr.x, tr.y, r, DIMG, 2, 16);
    }
  }

  function drawNodes() {
    for (var n = 0; n < nodes.length; n++) {
      var nd = nodes[n];
      if (nd.pulse > 0) nd.pulse -= game.time.delta;
      var col = nd.live ? AMBER : CYAN;
      if (nd.kind === 's') {
        glowLine(nd.x - 60, nd.y + 20, nd.x + 60, nd.y + 20, AMBER, DIMA, 3);
        game.draw.line(nd.x - 60, nd.y + 20, nd.x - 60, nd.y + 130, AMBER, 3);
        game.draw.line(nd.x + 60, nd.y + 20, nd.x + 60, nd.y + 130, AMBER, 3);
        game.draw.line(nd.x - 60, nd.y + 130, nd.x + 60, nd.y + 130, AMBER, 3);
        for (var z = 0; z < 3; z++) game.draw.line(nd.x - 30 + z * 20, nd.y + 50, nd.x - 40 + z * 20, nd.y + 100, AMBER, 3);
      } else if (nd.kind === 'p') {
        glowLine(nd.x, nd.y, nd.x, nd.y + 180, col, nd.live ? DIMA : DIMC, 4);
        game.draw.line(nd.x - 50, nd.y + 20, nd.x + 50, nd.y + 20, col, 4);
        ring(nd.x - 40, nd.y + 8, 10, col, 3, 10); ring(nd.x + 40, nd.y + 8, 10, col, 3, 10);
      } else {
        var lit2 = nd.live;
        var hc = lit2 ? AMBER : CYAN;
        glowLine(nd.x - 110, nd.y + 40, nd.x, nd.y - 30, hc, lit2 ? DIMA : DIMC, 4);
        glowLine(nd.x, nd.y - 30, nd.x + 110, nd.y + 40, hc, lit2 ? DIMA : DIMC, 4);
        game.draw.line(nd.x - 90, nd.y + 40, nd.x - 90, nd.y + 170, hc, 4);
        game.draw.line(nd.x + 90, nd.y + 40, nd.x + 90, nd.y + 170, hc, 4);
        game.draw.line(nd.x - 90, nd.y + 170, nd.x + 90, nd.y + 170, hc, 4);
        for (var wd = 0; wd < 2; wd++) {
          var wx = nd.x - 60 + wd * 70;
          game.draw.line(wx, nd.y + 70, wx + 50, nd.y + 70, hc, 3); game.draw.line(wx, nd.y + 120, wx + 50, nd.y + 120, hc, 3);
          game.draw.line(wx, nd.y + 70, wx, nd.y + 120, hc, 3); game.draw.line(wx + 50, nd.y + 70, wx + 50, nd.y + 120, hc, 3);
          if (lit2) for (var hl2 = 0; hl2 < 5; hl2++) game.draw.line(wx + 4, nd.y + 78 + hl2 * 9, wx + 46, nd.y + 78 + hl2 * 9, AMBER, 3);
        }
      }
      var pr = n === cur && phase === 'wire' ? 18 + Math.sin(game.time.elapsed * 6) * 6 : 12;
      ring(nd.x, nd.y, pr, nd.live ? AMBER : CYAN, 3, 14);
      if (nd.pulse > 0) ring(nd.x, nd.y, 30 + (0.5 - nd.pulse) * 160, AMBER, 3, 20);
    }
  }

  function drawWires(hl) {
    for (var i = 0; i < wires.length; i++) {
      var a = nodes[wires[i][0]], b = nodes[wires[i][1]];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 30;
      glowLine(a.x, a.y, mx, my, AMBER, DIMA, 3);
      glowLine(mx, my, b.x, b.y, AMBER, DIMA, 3);
      var k = (game.time.elapsed * 1.5 + i * 0.3) % 1;
      var px = k < 0.5 ? a.x + (mx - a.x) * k * 2 : mx + (b.x - mx) * (k - 0.5) * 2;
      var py = k < 0.5 ? a.y + (my - a.y) * k * 2 : my + (b.y - my) * (k - 0.5) * 2;
      ring(px, py, 6, WHITE, 3, 8);
    }
    if (halt && hl > 0) {
      var c = nodes[cur];
      glowLine(c.x, c.y, halt.tx, halt.ty, WHITE, '#ffffff', 4 + hl * 6);
      for (var s = 0; s < 6; s++) { var a2 = s * 1.05 + game.time.elapsed * 20; game.draw.line(halt.x, halt.y, halt.x + Math.cos(a2) * 60 * (1 + hl), halt.y + Math.sin(a2) * 60 * (1 + hl), AMBER, 4); }
    }
  }

  function drawDrag() {
    if (!drag) return null;
    var c = nodes[cur];
    var p = probe(drag.x, drag.y);
    dashRing(c.x, c.y, MAX_SPAN, p.reach ? DIMC : DIMR);
    var col = p.tree ? RED : p.target >= 0 ? AMBER : CYAN;
    glowLine(c.x, c.y, drag.x, drag.y, col, p.tree ? DIMR : DIMC, 4);
    ring(drag.x, drag.y, 20, col, 3, 12);
    if (p.target >= 0) ring(nodes[p.target].x, nodes[p.target].y, 34, AMBER, 3, 16);
    return p.tree;
  }

  function drawLineman() {
    var c = nodes[cur];
    var f = mT > 0 ? mFrame : Math.floor(game.time.elapsed * 1.5) % 2;
    game.draw.sprite(LINEMAN[f], { '#': GREEN }, c.x - 70, c.y + 90 + Math.sin(game.time.elapsed * 2) * 4, 10, { anchor: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < LAYOUTS.length; i++) {
      var hx = 70 + i * 80, col = i < lit ? AMBER : i === ri ? CYAN : DIMC;
      game.draw.line(hx - 26, 100, hx, 76, col, 4); game.draw.line(hx, 76, hx + 26, 100, col, 4);
      game.draw.line(hx - 20, 100, hx - 20, 124, col, 4); game.draw.line(hx + 20, 100, hx + 20, 124, col, 4); game.draw.line(hx - 20, 124, hx + 20, 124, col, 4);
    }
    big(String(score), W / 2, 112, 66, GREEN);
    for (var f = 0; f < FUSES; f++) game.draw.sprite(FUSE, { '#': f < fuses ? AMBER : DIMA }, W - 80 - f * 60, 96, 9, { anchor: 'center' });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.line(60, 190, W - 60, 190, DIMG, 6);
    game.draw.line(60, 190, 60 + (W - 120) * fr, 190, timeLeft < 5 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? RED : GREEN, 6);
    big(wires.length + ' / ' + (nodes.length - 1), W / 2, H * 0.155, 40, CYAN);
  }

  // ── ATTRACT デモ: 碍子から碍子へ張る → 木の陰の電柱へ張ろうとして火花 → 張り直して家に灯り ──
  var DEMO_STEPS = [1, 4, 2, 5];
  var demo = { t: 0, k: 0, wait: 0, gx: 0, gy: 0, press: false, haltT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { setupRound(0); lit = 0; demo.k = 0; demo.wait = 0.5; demo.haltT = 0; halt = null; }
    stepTrees(dt);
    if (mT > 0) mT -= dt;
    if (demo.haltT > 0) {
      demo.haltT -= dt;
      if (demo.haltT <= 0) { game.feedback.bad(halt.x, halt.y, { text: 'MISS', volume: 0.3, shake: 4 }); halt = null; demo.wait = 0.5; }
      return;
    }
    if (phase !== 'wire' || demo.k >= DEMO_STEPS.length) { drag = null; demo.press = false; return; }
    demo.wait -= dt;
    var c = nodes[cur], tn = nodes[DEMO_STEPS[demo.k]];
    if (demo.wait > 0) { demo.gx = c.x; demo.gy = c.y; demo.press = false; drag = null; return; }
    var p = Math.min(1, -demo.wait / 0.8);
    demo.gx = c.x + (tn.x - c.x) * p; demo.gy = c.y + (tn.y - c.y) * p; demo.press = true;
    drag = { x: demo.gx, y: demo.gy };
    if (p >= 1) {
      drag = null; demo.press = false;
      var r = attach(tn.x, tn.y, 0.3);
      demo.k++; demo.wait = 0.45;
      if (r.res === 'spark') { halt = { t: 0.4, max: 0.4, x: r.x, y: r.y, tree: r.tree, tx: tn.x, ty: tn.y }; demo.haltT = 0.4; }
    }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.4) : 0;
      drawLand();
      drawWires(hlA);
      var wt = drawDrag();
      drawTrees(hlA, wt);
      drawNodes();
      drawLineman();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      big(TITLE, W / 2, H * 0.075, 104, GREEN);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 42, CYAN);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.96, 46, AMBER);
      else big('INSERT COIN', W / 2, H * 0.96, 40, GREEN);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      stepTrees(dt);
      drawLand();
      drawWires(0);
      drawTrees(0, null);
      drawNodes();
      drawLineman();
      game.draw.line(60, H * 0.12, W - 60, H * 0.12, GREEN, 4); game.draw.line(60, H * 0.37, W - 60, H * 0.37, GREEN, 4);
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, VOID, 0.85);
      big(won ? 'CLEAR' : timeUp ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.17, 104, won ? AMBER : RED);
      big('SCORE ' + score, W / 2, H * 0.22, 56, GREEN);
      big(lit + ' / ' + LAYOUTS.length + '   ' + spans + '   ★' + nears, W / 2, H * 0.265, 44, CYAN);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, AMBER);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, CYAN);
      if (!won) big('あと' + Math.max(1, LAYOUTS.length - lit) + '軒!', W / 2, H * 0.355, 58, AMBER);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.96, 40, GREEN);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var hx = halt.x, hy = halt.y;
        halt = null; fuses--; sparks++;
        game.feedback.bad(hx, hy, { text: 'MISS' });
        if (fuses <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepTrees(dt);
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      if (phase === 'lit') {
        phT -= dt;
        if (phT <= 0) nextRound();
      }
      if (!over && timeLeft <= 0) {
        timeLeft = 0; timeUp = true; drag = null;
        game.fx.flash(WHITE, 0.15);
        game.feedback.bad(nodes[cur].x, nodes[cur].y, { text: 'TIME UP' });
        finish(false);
      }
    }
    if (mT > 0 && !over) mT -= dt;

    drawLand();
    drawWires(hl);
    var warnTree = drawDrag();
    drawTrees(hl, warnTree);
    drawNodes();
    drawLineman();
    drawHud();
    if (spans === 0 && ri === 0 && !drag && ready <= 0 && !over) {
      var k = (game.time.elapsed % 1.6) / 1.6, a = nodes[0], b = nodes[1];
      game.draw.hand(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, { press: k < 0.9, scale: 12, alpha: 0.5 });
    }
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, GREEN);
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1.5], ['R', 0.5],
      ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['A4', 2],
    ], { tempo: 100, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 2], ['G2', 2], ['F2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

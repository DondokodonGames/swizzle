// J-N6424-0047-paper-lantern-cut.js
// ペーパーランタン・カット — 型紙に描かれた図形の辺を、一辺ずつ素早い一直線のスワイプで切り落として窓紙を抜く
// 操作: 点線の辺に沿って指を一気にまっすぐ払うとその辺が切れる。遅い・曲がった・ずれたスワイプは紙を破ってしまう
// 終わり: 3枚(三角・ひし形・回る台形)を全部切り抜けば成功。破り3回、または15秒の時間切れで失敗
// @mechanic: slice
// @theme: paper_lantern_workshop
// 世界観: 影絵灯籠の工房で、見習いの紙切り職人が祭りの夜までに灯籠の窓紙を型どおり切り抜く。刃は一息で引かないと和紙が破れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 切り抜いた枚数と切った辺の数・破り回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調、線の太さで語る
  var STYLE = { bg: ['#f4f1e8', '#d9d4c4', '#111111'], main: ['#111111', '#f4f1e8', '#6b6b6b'], accent: ['#111111', '#f4f1e8'] };
  var INK = '#111111', PAPER = '#f4f1e8', GREY = '#8a8a82';

  var TITLE = 'LANTERN CUT';
  var TIME_LIMIT = 15;
  var MAX_TEARS = 3;
  var CX = W / 2, CY = H * 0.5;
  var IDLE_LIMIT = 2.8;
  var SHAPES = [
    { pts: [[0, -300], [290, 220], [-290, 220]], spin: 0 },
    { pts: [[0, -330], [250, 0], [0, 330], [-250, 0]], spin: 0 },
    { pts: [[-170, -210], [170, -210], [300, 210], [-300, 210]], spin: 0.3 }
  ];
  var TOTAL_EDGES = 11;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KNIFE = ['......kk', '.....kwk', '....kwk.', '...kwk..', '.kkkk...', 'kkkk....', 'kk......'];
  var CRANE = ['k.......', 'kk......', '.kkk..kk', '..kkkkk.', '...kkk..', '....k...'];
  var LAMP = ['..kk..', '.kwwk.', 'kwwwwk', 'kwwwwk', '.kwwk.', '..kk..'];

  var c = null;
  var swipe = null;
  var demo = { t: 0, gx: CX, gy: CY, press: false, cut: null };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: color === INK ? PAPER : INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newBench(isDemo) {
    var b = {
      demo: isDemo, shape: 0, cut: [], angle: 0, done: 0, edges: 0, tears: 0, tearLines: [],
      idle: 0, fall: null, hitStop: 0, flashEdge: -1, over: false, win: false, endWait: -1,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, score: 0, milestone: false, lastBad: null
    };
    b.cut = SHAPES[0].pts.map(function() { return false; });
    return b;
  }

  function verts() {
    var sh = SHAPES[c.shape % SHAPES.length];
    var ca = Math.cos(c.angle), sa = Math.sin(c.angle);
    return sh.pts.map(function(p) { return [CX + p[0] * ca - p[1] * sa, CY + p[0] * sa + p[1] * ca]; });
  }

  function edgeOf(v, i) { return [v[i], v[(i + 1) % v.length]]; }

  // judge one stroke against every uncut edge; returns edge index or -1
  function matchEdge(sx, sy, ex, ey, pts) {
    var v = verts();
    var sdx = ex - sx, sdy = ey - sy;
    var slen = Math.sqrt(sdx * sdx + sdy * sdy);
    if (slen < 1) return -1;
    // straightness: every sampled point stays near the chord
    for (var k = 0; k < pts.length; k++) {
      var dev = Math.abs((pts[k][0] - sx) * sdy - (pts[k][1] - sy) * sdx) / slen;
      if (dev > 50) return -1;
    }
    var best = -1, bestScore = 1e9;
    for (var i = 0; i < v.length; i++) {
      if (c.cut[i]) continue;
      var e = edgeOf(v, i);
      var ax = e[0][0], ay = e[0][1], bx = e[1][0], by = e[1][1];
      var vx = bx - ax, vy = by - ay;
      var len = Math.sqrt(vx * vx + vy * vy);
      var cosA = Math.abs((vx * sdx + vy * sdy) / (len * slen));
      if (cosA < 0.965) continue;
      var d1 = Math.abs((sx - ax) * vy - (sy - ay) * vx) / len;
      var d2 = Math.abs((ex - ax) * vy - (ey - ay) * vx) / len;
      if (d1 > 60 || d2 > 60) continue;
      var u1 = ((sx - ax) * vx + (sy - ay) * vy) / (len * len);
      var u2 = ((ex - ax) * vx + (ey - ay) * vy) / (len * len);
      var cover = Math.min(1, Math.max(u1, u2)) - Math.max(0, Math.min(u1, u2));
      if (cover < 0.6) continue;
      var sc = d1 + d2;
      if (sc < bestScore) { bestScore = sc; best = i; }
    }
    return best;
  }

  function stroke(sx, sy, ex, ey, pts, dur) {
    var len = Math.sqrt((ex - sx) * (ex - sx) + (ey - sy) * (ey - sy));
    if (len < 110) { game.audio.play('se_tap', 0.1); return; }
    var hit = dur <= 0.6 ? matchEdge(sx, sy, ex, ey, pts) : -1;
    if (hit >= 0) {
      c.cut[hit] = true; c.edges++; c.idle = 0; c.flashEdge = hit;
      game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.05 });
      if (!c.demo) game.feedback.good((sx + ex) / 2, (sy + ey) / 2 - 40, { text: dur < 0.25 ? 'PERFECT' : 'GOOD', color: INK, size: 48 });
      c.score += dur < 0.25 ? 120 : 80;
      var all = true;
      for (var i = 0; i < c.cut.length; i++) if (!c.cut[i]) all = false;
      if (all) {
        c.done++;
        c.fall = { t: 0, v: verts() };
        c.hitStop = 0.3;
        game.audio.play('se_break', 0.3);
        game.fx.burst(CX, CY, { color: INK, count: 20, speed: 420 });
        if (!c.demo && !c.milestone) { c.milestone = true; game.fx.popup(c.done + ' / ' + SHAPES.length, W / 2, H * 0.22, { color: INK, size: 60 }); game.audio.play('se_milestone', 0.4); }
        if (!c.demo && c.done >= SHAPES.length) { c.over = true; c.win = true; c.hitStop = 0.5; return; }
        c.shape++; c.angle = 0;
        c.cut = SHAPES[c.shape % SHAPES.length].pts.map(function() { return false; });
      }
    } else {
      tear(sx, sy, ex, ey);
    }
  }

  function tear(sx, sy, ex, ey) {
    c.tearLines.push([sx, sy, ex, ey]);
    c.lastBad = [sx, sy, ex, ey];
    c.hitStop = 0.35; c.idle = 0;
    if (!c.demo) {
      c.tears++;
      game.feedback.bad((sx + ex) / 2, (sy + ey) / 2, { text: 'MISS', flashColor: '#000000' });
      if (c.tears >= MAX_TEARS) { c.over = true; c.win = false; c.hitStop = 0.6; }
    } else {
      game.audio.tone('C3', 0.12, { wave: 'sawtooth', volume: 0.05 });
    }
  }

  function step(dt) {
    if (c.fall) { c.fall.t += dt; if (c.fall.t > 1) c.fall = null; }
    if (c.hitStop > 0) {
      c.hitStop -= dt;
      if (c.hitStop <= 0) { c.flashEdge = -1; c.lastBad = null; if (c.over) c.endWait = 0.6; }
      return;
    }
    if (c.over) return;
    c.angle += SHAPES[c.shape % SHAPES.length].spin * dt;
    c.idle += dt;
    if (c.idle >= IDLE_LIMIT && !c.demo) {
      // the paper curls if the blade waits too long
      var v = verts();
      tear(v[0][0] - 120, v[0][1] + 40, v[0][0] + 120, v[0][1] + 70);
    }
    if (c.tearLines.length > 6) c.tearLines.shift();
  }

  function demoBlade(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { c = newBench(true); demo.cut = null; demo.slopped = false; }
    if (c.shape >= 2) { c = newBench(true); demo.cut = null; demo.slopped = false; }
    if (c.hitStop > 0) { demo.press = false; return; }
    if (!demo.cut) {
      var v = verts();
      var idx = -1;
      for (var i = 0; i < c.cut.length; i++) if (!c.cut[i]) { idx = i; break; }
      if (idx < 0) return;
      var e = edgeOf(v, idx);
      var sloppy = c.edges === 2 && !demo.slopped;
      if (sloppy) demo.slopped = true;
      var off = sloppy ? 150 : 0;
      demo.cut = { ax: e[0][0] + off, ay: e[0][1], bx: e[1][0] + off, by: e[1][1], t: -0.35, dur: 0.3, pts: [] };
    }
    var dc = demo.cut;
    dc.t += dt;
    if (dc.t < 0) { demo.press = false; demo.gx = dc.ax; demo.gy = dc.ay; return; }
    var u = Math.min(1, dc.t / dc.dur);
    demo.gx = dc.ax + (dc.bx - dc.ax) * (0.05 + u * 0.9);
    demo.gy = dc.ay + (dc.by - dc.ay) * (0.05 + u * 0.9);
    demo.press = true;
    dc.pts.push([demo.gx, demo.gy]);
    if (u >= 1) {
      var sx = dc.ax + (dc.bx - dc.ax) * 0.05, sy = dc.ay + (dc.by - dc.ay) * 0.05;
      stroke(sx, sy, demo.gx, demo.gy, dc.pts, dc.dur);
      demo.cut = null; demo.press = false;
    }
  }

  function dither(x, y, w, h, step) {
    for (var yy = y; yy < y + h; yy += step) {
      for (var xx = x + ((yy / step) % 2) * step; xx < x + w; xx += step * 2) game.draw.rect(xx, yy, 4, 4, INK, 0.35);
    }
  }

  function fillPoly(v, color, alpha) {
    var minY = 1e9, maxY = -1e9;
    for (var i = 0; i < v.length; i++) { minY = Math.min(minY, v[i][1]); maxY = Math.max(maxY, v[i][1]); }
    for (var y = minY; y < maxY; y += 12) {
      var lo = 1e9, hi = -1e9;
      for (var j = 0; j < v.length; j++) {
        var a = v[j], b = v[(j + 1) % v.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          var x = a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
          lo = Math.min(lo, x); hi = Math.max(hi, x);
        }
      }
      if (hi > lo) game.draw.rect(lo, y, hi - lo, 3, color, alpha);
    }
  }

  function drawDesk() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#2a2a2a'], [0.2, '#111111'], [1, '#2a2a2a']]);
    dither(0, 240, W, 40, 12);
    // sheet of washi
    game.draw.rect(90, H * 0.2, W - 180, H * 0.6, PAPER);
    game.draw.rect(90, H * 0.2, W - 180, 6, INK);
    game.draw.rect(90, H * 0.8 - 6, W - 180, 6, INK);
    dither(90, H * 0.8 - 60, W - 180, 54, 16);
    game.draw.sprite(CRANE, { k: GREY }, 190, H * 0.25 + Math.sin(t * 1.5) * 6, 10, { anchor: 'center' });
    game.draw.sprite(LAMP, { k: INK, w: PAPER }, W - 170, H * 0.26 + Math.cos(t * 1.7) * 6, 10, { anchor: 'center' });
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(t * 1.6));
  }

  function drawShape() {
    var t = game.time.elapsed;
    var v = verts();
    fillPoly(v, GREY, 0.45);
    for (var i = 0; i < v.length; i++) {
      var e = edgeOf(v, i);
      if (c.cut[i]) {
        game.draw.line(e[0][0], e[0][1], e[1][0], e[1][1], INK, i === c.flashEdge && c.hitStop > 0 ? 16 : 9);
      } else {
        var segs = 14;
        for (var s = 0; s < segs; s += 2) {
          var u1 = s / segs, u2 = (s + 1) / segs;
          game.draw.line(e[0][0] + (e[1][0] - e[0][0]) * u1, e[0][1] + (e[1][1] - e[0][1]) * u1, e[0][0] + (e[1][0] - e[0][0]) * u2, e[0][1] + (e[1][1] - e[0][1]) * u2, INK, 5);
        }
        var pulse = 12 + Math.sin(t * 6 + i) * 4;
        game.draw.circle(e[0][0], e[0][1], pulse, INK);
        game.draw.circle(e[0][0], e[0][1], pulse - 5, PAPER);
      }
    }
    for (var k = 0; k < c.tearLines.length; k++) {
      var tl = c.tearLines[k];
      var n = 8, px = tl[0], py = tl[1];
      for (var j = 1; j <= n; j++) {
        var qx = tl[0] + (tl[2] - tl[0]) * j / n + (j % 2 ? 10 : -10);
        var qy = tl[1] + (tl[3] - tl[1]) * j / n + (j % 2 ? -10 : 10);
        game.draw.line(px, py, qx, qy, '#555550', 4);
        px = qx; py = qy;
      }
    }
    if (c.lastBad && c.hitStop > 0) {
      var lb = c.lastBad;
      game.draw.circle((lb[0] + lb[2]) / 2, (lb[1] + lb[3]) / 2, 120, '#ffffff', 0.7);
      game.draw.line(lb[0], lb[1], lb[2], lb[3], INK, 14);
    }
    if (c.fall) {
      var f = c.fall;
      var drop = f.t * f.t * 900;
      var dv = f.v.map(function(p) { return [p[0] + Math.sin(f.t * 8) * 20, p[1] + drop]; });
      fillPoly(dv, INK, Math.max(0, 1 - f.t));
    }
  }

  function drawTrail() {
    if (!swipe) return;
    var p = swipe.pts;
    for (var i = 1; i < p.length; i++) game.draw.line(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], INK, 6);
    var last = p[p.length - 1];
    game.draw.sprite(KNIFE, { k: INK, w: '#ffffff' }, last[0] + 30, last[1] - 30, 8, { anchor: 'center' });
  }

  function drawHud() {
    txt(c.done + ' / ' + SHAPES.length, W / 2, 100, 64, PAPER);
    for (var i = 0; i < TOTAL_EDGES; i++) game.draw.rect(W / 2 - TOTAL_EDGES * 26 + i * 52, 150, 40, 14, i < c.edges ? PAPER : '#444444');
    for (var k = 0; k < MAX_TEARS; k++) game.draw.rect(60 + k * 44, 60, 30, 44, k < c.tears ? '#444444' : PAPER);
    var frac = Math.max(0, c.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 200, W - 120, 16, '#444444');
    game.draw.rect(60, 200, (W - 120) * frac, 16, c.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? '#888888' : PAPER);
    var idleF = Math.max(0, 1 - c.idle / IDLE_LIMIT);
    game.draw.rect(90, H * 0.82, (W - 180) * idleF, 12, idleF < 0.35 && Math.floor(game.time.elapsed * 8) % 2 ? '#888888' : PAPER);
  }

  function initGame() {
    c = newBench(false);
    swipe = null;
  }

  function close() {
    state = S.RESULT;
    game.audio.stopBgm();
    var stats = { sheets: c.done, edges: c.edges, tears: c.tears };
    if (c.win) {
      c.score += Math.round(c.timeLeft * 30) + (MAX_TEARS - c.tears) * 100;
      game.audio.play('se_success', 0.5);
      game.end.success(c.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 1], ['E4', 1]], { tempo: 116, wave: 'triangle', volume: 0.045, loop: true, bass: [['E3', 2], ['B2', 2]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || c.ready > 0 || c.over || c.hitStop > 0) return;
    swipe = { pts: [[x, y]], t0: game.time.elapsed };
    game.audio.play('se_tap', 0.12);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !swipe) return;
    swipe.pts.push([x, y]);
    if (swipe.pts.length % 6 === 0) game.audio.tone('C6', 0.02, { wave: 'square', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !swipe) return;
    var s = swipe;
    swipe = null;
    if (c.over || c.hitStop > 0) { game.audio.play('se_tap', 0.06); return; }
    var dur = game.time.elapsed - s.t0;
    s.pts.push([x, y]);
    stroke(s.pts[0][0], s.pts[0][1], x, y, s.pts, dur);
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!c || !c.demo) c = newBench(true);
      demoBlade(dt);
      step(dt);
      drawDesk();
      drawShape();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      txt(TITLE, W / 2 + Math.sin(t * 1.3) * 6, H * 0.07, 84, PAPER);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 36, PAPER);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.9, 44, PAPER);
      else txt('INSERT COIN', W / 2, H * 0.9, 36, PAPER);
      return;
    }
    if (state === S.RESULT) {
      drawDesk();
      game.draw.rect(0, 0, W, H, INK, 0.55);
      if (c.win) {
        for (var l = 0; l < 3; l++) {
          game.draw.circle(W * 0.25 + l * W * 0.25, H * 0.62, 90 + Math.sin(t * 3 + l) * 10, '#fff3b0', 0.35);
          game.draw.sprite(LAMP, { k: INK, w: '#fff3b0' }, W * 0.25 + l * W * 0.25, H * 0.62, 18, { anchor: 'center' });
        }
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: PAPER, count: 5, speed: 280 });
        txt('CLEAR', W / 2, H * 0.28, 120, PAPER);
      } else {
        txt(c.tears >= MAX_TEARS ? 'GAME OVER' : 'TIME UP', W / 2, H * 0.28, 100, PAPER);
        txt('あと' + (SHAPES.length - c.done) + '枚!', W / 2, H * 0.35, 60, PAPER);
      }
      txt(c.done + ' / ' + SHAPES.length, W / 2, H * 0.43, 64, PAPER);
      txt(c.edges + ' / ' + TOTAL_EDGES + '  MISS ' + c.tears, W / 2, H * 0.48, 44, '#bbbbbb');
      txt('SCORE ' + c.score, W / 2, H * 0.53, 48, PAPER);
      if (c.win && c.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.72, 52, PAPER);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.72, 40, '#bbbbbb');
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, PAPER);
      return;
    }
    // PLAYING
    if (c.ready > 0) {
      c.ready -= dt;
      if (c.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!c.over) {
        c.timeLeft -= dt;
        if (c.timeLeft <= 0) {
          c.timeLeft = 0; c.over = true; c.win = false; c.hitStop = 0.45;
          game.feedback.bad(CX, CY, { text: 'TIME UP', flashColor: '#000000' });
        }
      }
      step(dt);
      if (c.over && c.endWait > 0) {
        c.endWait -= dt;
        if (c.endWait <= 0) { close(); return; }
      }
    }
    drawDesk();
    drawShape();
    drawTrail();
    drawHud();
    if (c.ready > 0) {
      txt(c.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, PAPER);
      var v = verts();
      var u = Math.min(1, (0.8 - c.ready) / 0.7);
      game.draw.hand(v[0][0] + (v[1][0] - v[0][0]) * u, v[0][1] + (v[1][1] - v[0][1]) * u, { press: true, scale: 11 });
    }
  });

  game.onStart(function() {
    game.audio.melody([['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 1]], { tempo: 92, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    c = newBench(true);
    demo.t = 0;
  });
})(game);

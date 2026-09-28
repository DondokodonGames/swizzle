// J-GC4-0032-root-tunnel-lamp.js
// 根っこトンネルのランプ便 — 真っ暗な地下迷路を、ヘルメットの灯りが照らす範囲だけを頼りに指でモグラを導いて3つの部屋を抜ける
// 操作: 光る輪のモグラに指を置き、離さずにトンネルの幅からはみ出さないようなぞって出口の光まで運ぶ
// 終わり: 3つの部屋の出口を抜ければCLEAR。壁にぶつかると直前の曲がり角へ戻され、3回ぶつかる/時間切れでGAME OVER
// @mechanic: guide_path
// @theme: root_tunnel_lamp_courier
// 世界観: 大樹の根が張りめぐる地下で、ヘルメットランプのモグラの配達屋が、灯りの届く数歩先だけを頼りに曲がりくねった土のトンネルを進み、光る茸を目印に地上の泉まで荷を運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた部屋の数・拾った光る茸・ぶつかった回数
// スタイル: PIXEL HD

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス、ライティング
  var STYLE = {
    bg: ['#140c10', '#2a1a1c', '#4a2e22'],
    main: ['#8a5a3a', '#c48a5a', '#e8c89a'],
    accent: ['#7af0c8', '#ff5a5a'],
  };

  var GAME_TITLE = 'ROOT LAMP';
  var TIME_LIMIT = 25;
  var BUMPS = 3;
  var CHAMBERS = [
    { hw: 76, light: 250, pts: [[0.5, 0.84], [0.5, 0.72], [0.2, 0.66], [0.2, 0.5], [0.75, 0.44], [0.75, 0.3], [0.5, 0.24]] },
    { hw: 66, light: 225, pts: [[0.2, 0.84], [0.8, 0.78], [0.8, 0.64], [0.3, 0.6], [0.3, 0.46], [0.8, 0.4], [0.55, 0.3], [0.2, 0.24]] },
    { hw: 58, light: 200, pts: [[0.8, 0.84], [0.25, 0.8], [0.25, 0.68], [0.75, 0.62], [0.75, 0.5], [0.2, 0.46], [0.2, 0.34], [0.7, 0.3], [0.7, 0.24]] },
  ];

  var MOLE = [
    '...yy...',
    '..yyyy..',
    '.bbbbbb.',
    'bbwbbwbb',
    'bbbppbbb',
    '.bbbbbb.',
    'hb.bb.bh',
  ];
  var MOLE_PAL = { y: '#ffe07a', b: '#6a4a5a', w: '#ffffff', p: '#ff9aa8', h: '#e8c89a' };
  var SHROOM = ['.ccc.', 'ccccc', '..s..', '..s..'];
  var ROOT = ['#..', '.#.', '..#', '.#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function buildChamber(ci) {
    var ch = CHAMBERS[ci];
    var dense = [], corners = [0];
    for (var i = 1; i < ch.pts.length; i++) {
      var ax = ch.pts[i - 1][0] * W, ay = ch.pts[i - 1][1] * H, bx = ch.pts[i][0] * W, by = ch.pts[i][1] * H;
      var len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / 12));
      for (var k = (i === 1 ? 0 : 1); k <= n; k++) dense.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
      corners.push(dense.length - 1);
    }
    var shrooms = [];
    for (var s = 1; s < 4; s++) {
      var idx = Math.floor(dense.length * s / 4);
      shrooms.push({ i: idx, x: dense[idx][0], y: dense[idx][1], got: false });
    }
    return { hw: ch.hw, light: ch.light, dense: dense, corners: corners, shrooms: shrooms };
  }

  function initGame() {
    g = {
      ci: 0, ch: null, idx: 0, mx: 0, my: 0, dragging: false, bumps: 0, shrooms: 0, score: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, finished: false, done: false, ok: false,
      endWait: 0, dig: 0, flicker: 0, hl: null, cleared: 0, hint: 0,
    };
    enterChamber(0);
  }

  function enterChamber(ci) {
    g.ci = ci; g.ch = buildChamber(ci); g.idx = 0;
    g.mx = g.ch.dense[0][0]; g.my = g.ch.dense[0][1];
    g.dragging = false;
  }

  function nearest(x, y) {
    var d = g.ch.dense, lo = Math.max(0, g.idx - 15), hi = Math.min(d.length - 1, g.idx + 25);
    var best = 1e9, bi = g.idx;
    for (var i = lo; i <= hi; i++) {
      var dd = (d[i][0] - x) * (d[i][0] - x) + (d[i][1] - y) * (d[i][1] - y);
      if (dd < best) { best = dd; bi = i; }
    }
    return { dist: Math.sqrt(best), i: bi };
  }

  function checkpoint() {
    var c = g.ch.corners, cp = 0;
    for (var i = 0; i < c.length; i++) if (c[i] <= g.idx) cp = c[i];
    return cp;
  }

  function bump(x, y, isDemo) {
    g.dragging = false;
    g.flicker = 0.5;
    if (!isDemo) g.bumps++;
    if (g.bumps >= BUMPS) { endRound(false, [x, y]); return; }
    game.feedback.bad(x, y, { text: 'MISS', shake: 10, sound: 'se_break' });
    g.idx = checkpoint();
    g.mx = g.ch.dense[g.idx][0]; g.my = g.ch.dense[g.idx][1];
  }

  function moveTo(x, y, isDemo) {
    if (!g.dragging || g.dig > 0) return;
    var dx = x - g.mx, dy = y - g.my, len = Math.hypot(dx, dy);
    var n = Math.max(1, Math.ceil(len / 14));
    for (var k = 1; k <= n; k++) {
      var sx = g.mx + dx * k / n, sy = g.my + dy * k / n;
      var r = nearest(sx, sy);
      if (r.dist > g.ch.hw) { bump(sx, sy, isDemo); return; }
      if (r.i > g.idx) g.idx = r.i;
    }
    g.mx = x; g.my = y;
    for (var s = 0; s < g.ch.shrooms.length; s++) {
      var sh = g.ch.shrooms[s];
      if (!sh.got && g.idx >= sh.i - 2) {
        sh.got = true; g.shrooms++; g.score += 80;
        game.feedback.good(sh.x, sh.y, { text: 'NICE', color: STYLE.accent[0], count: 10, sound: 'se_coin' });
      }
    }
    if (g.idx >= g.ch.dense.length - 3) {
      g.cleared++;
      g.score += 300;
      g.dragging = false;
      if (g.ci >= CHAMBERS.length - 1) {
        if (!isDemo) endRound(true, [g.mx, g.my]);
        else { g.dig = 0.6; }
      } else {
        g.dig = 0.6;
        if (!isDemo) {
          game.fx.popup(g.cleared + ' / ' + CHAMBERS.length, W / 2, H * 0.5, { color: STYLE.accent[0], size: 76 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    }
  }

  function endRound(ok, hl) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.hl = hl; g.dragging = false;
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += Math.round(g.timeLeft * 60);
    game.audio.play(ok ? 'se_powerup' : 'se_bad', 0.5);
  }

  function step(dt, isDemo) {
    if (g.flicker > 0) g.flicker -= dt;
    if (g.hint > 0) g.hint -= dt;
    if (g.dig > 0) {
      g.dig -= dt;
      if (g.dig <= 0) enterChamber((g.ci + 1) % CHAMBERS.length);
    }
    if (!isDemo) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false, [g.mx, g.my]); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.5, STYLE.bg[2]], [1, STYLE.bg[0]]]);
    // 根(パララックス)
    for (var r = 0; r < 12; r++) {
      var rx = (r * 97) % W, ry = H * 0.2 + ((r * 173) % (H * 0.7));
      game.draw.sprite(ROOT, { '#': '#6a4a2a' }, rx + Math.sin(t * 0.6 + r) * 6, ry, 22, { anchor: 'center', alpha: 0.6 });
    }
    // 土の粒
    for (var p = 0; p < 40; p++) game.draw.rect((p * 137) % W, (p * 311) % H, 8, 8, STYLE.main[0], 0.35);
  }

  function drawTunnel() {
    var ch = g.ch, pts = CHAMBERS[g.ci].pts;
    for (var i = 1; i < pts.length; i++) {
      game.draw.line(pts[i - 1][0] * W, pts[i - 1][1] * H, pts[i][0] * W, pts[i][1] * H, STYLE.main[1], ch.hw * 2);
    }
    for (var j = 0; j < pts.length; j++) game.draw.circle(pts[j][0] * W, pts[j][1] * H, ch.hw, STYLE.main[1]);
    for (var k = 1; k < pts.length; k++) {
      game.draw.line(pts[k - 1][0] * W, pts[k - 1][1] * H, pts[k][0] * W, pts[k][1] * H, STYLE.main[2], 10);
    }
    // 通った跡
    var d = ch.dense;
    for (var m = 6; m <= g.idx; m += 6) game.draw.rect(d[m][0] - 5, d[m][1] - 5, 10, 10, '#ffe07a', 0.7);
  }

  function drawDark() {
    var R = g.ch.light * (g.flicker > 0 && Math.floor(g.flicker * 20) % 2 === 0 ? 0.55 : 1);
    var top = 230, bottom = H * 0.88;
    var ST = 12;
    for (var y = top; y < bottom; y += ST) {
      var dy = y + ST / 2 - g.my;
      var hw = Math.abs(dy) < R ? Math.sqrt(R * R - dy * dy) : 0;
      var hw2 = Math.abs(dy) < R * 0.7 ? Math.sqrt(R * R * 0.49 - dy * dy) : 0;
      if (hw <= 0) { game.draw.rect(0, y, W, ST, '#07040a', 0.93); continue; }
      game.draw.rect(0, y, Math.max(0, g.mx - hw), ST, '#07040a', 0.93);
      game.draw.rect(g.mx + hw, y, Math.max(0, W - g.mx - hw), ST, '#07040a', 0.93);
      // 柔らかい縁
      if (hw2 > 0) {
        game.draw.rect(g.mx - hw, y, hw - hw2, ST, '#07040a', 0.45);
        game.draw.rect(g.mx + hw2, y, hw - hw2, ST, '#07040a', 0.45);
      } else game.draw.rect(g.mx - hw, y, hw * 2, ST, '#07040a', 0.45);
    }
  }

  function drawLights() {
    var t = game.time.elapsed;
    var d = g.ch.dense, end = d[d.length - 1];
    // 出口の光(暗闇越しに見える)
    game.draw.circle(end[0], end[1], 70 + Math.sin(t * 4) * 10, '#fff4c0', 0.5);
    game.draw.rect(end[0] - 30, 230, 60, end[1] - 230, '#fff4c0', 0.18);
    for (var s = 0; s < g.ch.shrooms.length; s++) {
      var sh = g.ch.shrooms[s];
      if (sh.got) continue;
      game.draw.circle(sh.x, sh.y, 36 + Math.sin(t * 3 + s) * 6, STYLE.accent[0], 0.3);
      game.draw.sprite(SHROOM, { c: STYLE.accent[0], s: '#e8f8f0' }, sh.x, sh.y, 12, { anchor: 'center' });
    }
    // モグラ
    var bob = Math.sin(t * 6) * 4;
    if (!g.dragging) game.draw.circle(g.mx, g.my, 72 + Math.sin(t * 5) * 10, '#ffe07a', 0.3 + (g.hint > 0 ? 0.4 : 0));
    game.draw.circle(g.mx, g.my - 40, 26, '#fff4c0', 0.35);
    game.draw.sprite(MOLE, MOLE_PAL, g.mx, g.my + bob, 11, { anchor: 'center' });
    if (g.dig > 0) for (var p = 0; p < 6; p++) game.draw.rect(g.mx + Math.cos(p + t * 10) * 60, g.my + Math.sin(p * 2 + t * 10) * 60, 14, 14, STYLE.main[2]);
    if (g.hl && g.hitStop > 0) {
      game.draw.circle(g.hl[0], g.hl[1], 60 + (0.5 - g.hitStop) * 180, '#ffffff', 0.55);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#07040a', 0.85);
    txt((g.ci + 1) + ' / ' + CHAMBERS.length, W * 0.22, 80, 60, '#ffffff');
    txt('SCORE ' + g.score, W * 0.7, 80, 40, STYLE.accent[0]);
    for (var i = 0; i < BUMPS; i++) game.draw.circle(W * 0.08 + i * 56, 184, 18, i < BUMPS - g.bumps ? '#ffe07a' : '#3a2a2a');
    var bw = W * 0.64, low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.3, 174, bw, 20, '#3a2a2a');
    game.draw.rect(W * 0.3, 174, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 20, low ? STYLE.accent[1] : '#ffe07a');
    // 親指ゾーン: 部屋内の進み具合
    var prog = g.idx / Math.max(1, g.ch.dense.length - 1);
    game.draw.rect(W * 0.1, H * 0.91, W * 0.8, 16, '#3a2a2a');
    game.draw.rect(W * 0.1, H * 0.91, W * 0.8 * prog, 16, STYLE.accent[0]);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, cyc: 0, pos: 0, devDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.cyc++; demo.pos = 0; demo.devDone = false; }
    step(dt, true);
    if (g.dig > 0) { demo.press = false; demo.pos = 0; return; }
    g.dragging = true;
    demo.pos = Math.max(demo.pos, g.idx) + dt * 38;
    var d = g.ch.dense, i = Math.min(d.length - 1, Math.floor(demo.pos));
    var tx = d[i][0], ty = d[i][1];
    // 偶数サイクルは途中で壁へそれる失敗例
    if (demo.cyc % 2 === 0 && !demo.devDone && g.ci === 0 && i > d.length * 0.45 && i < d.length * 0.55) tx += (i - d.length * 0.45) * 14;
    moveTo(tx, ty, true);
    if (!g.dragging) { demo.pos = g.idx; demo.devDone = true; }
    demo.gx = g.mx; demo.gy = g.my + 20;
    demo.press = true;
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
    if (g.finished || g.ready > 0 || g.hitStop > 0 || g.dig > 0) { game.audio.play('se_tap', 0.1); return; }
    if (Math.hypot(x - g.mx, y - g.my) < 140) {
      g.dragging = true;
      game.audio.play('se_tap', 0.2);
      game.fx.burst(g.mx, g.my, { color: '#ffe07a', count: 5, speed: 120 });
    } else {
      g.hint = 0.5;
      game.audio.play('se_tap', 0.08);
      game.fx.burst(x, y, { color: STYLE.main[0], count: 3, speed: 90 });
    }
  });

  game.onMove(function (x, y) {
    if (state !== S.PLAYING || g.finished || g.hitStop > 0) return;
    if (g.dragging && game.random(0, 1) < 0.04) game.audio.play('se_tap', 0.03);
    moveTo(x, y, false);
  });

  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !g.dragging) return;
    g.dragging = false;
    game.fx.burst(g.mx, g.my, { color: '#ffe07a', count: 3, speed: 80 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawTunnel(); drawDark(); drawLights();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 92, STYLE.accent[0]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.105, 42, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, '#ffe07a');
      else txt('INSERT COIN', W / 2, H * 0.955, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawTunnel(); drawLights();
      game.draw.rect(0, H * 0.3, W, H * 0.32, '#07040a', 0.85);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 110, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(g.cleared + ' / ' + CHAMBERS.length, W / 2, H * 0.43, 64, '#ffffff');
      txt('SCORE ' + g.score, W / 2, H * 0.49, 48, '#ffe07a');
      var pct = Math.round(100 * g.idx / Math.max(1, g.ch.dense.length - 1));
      if (!g.ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.55, 54, '#ffb08a');
      else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.55, 56, '#ffe07a');
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.55, 46, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, '#ffffff');
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { chambers: g.cleared, shrooms: g.shrooms, bumps: g.bumps };
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

    drawBg(); drawTunnel(); drawDark(); drawLights(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 120, '#ffe07a');
  });

  game.onStart(function () {
    game.audio.melody([
      ['E3', 1], ['G3', 0.5], ['B3', 0.5], ['A3', 1], ['G3', 0.5], ['E3', 0.5],
      ['D3', 1], ['E3', 0.5], ['G3', 0.5], ['E3', 2],
    ], { tempo: 104, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

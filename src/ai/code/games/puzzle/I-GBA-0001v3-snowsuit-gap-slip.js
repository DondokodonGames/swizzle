// I-GBA-0001v3-snowsuit-gap-slip.js
// スノースーツスリップ — 迫ってくる雪玉の壁に空いた人型の隙間へ、体の形と立ち位置を合わせてすり抜ける
// 操作: 下の操作パッドを指でなぞる。横位置で立ち位置、パッドの上段/中段/下段で「背伸び/大の字/しゃがみ」の体の形が決まる
// 終わり: 10枚の雪玉壁を全てすり抜ければ成功。形か位置が合わず雪玉に当たる/時間切れで失敗
// @mechanic: gap_fit
// @theme: schoolyard_snowball_wall
// 世界観: 雪合戦の校庭で、雪だるまの着ぐるみを着た子どもが、上級生たちの投げる雪玉の列にできた隙間へ体の形を合わせてすり抜け、陣地の旗まで進む
// 残るもの: 正誤(CLEAR/GAME OVER) + すり抜けた枚数とPERFECT数
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 90s LOW POLY: 輪郭はline、面は横ストリップ塗り、遠景はフォグに溶ける
  var STYLE = { bg: ['#9fb7d6', '#dfe8f2', '#c7d3e0'], main: ['#ffffff', '#3d4f6b', '#e8604c'], accent: ['#ffcc33', '#58d68d'] };
  var FOG = '#dfe8f2';

  var VX = W / 2, HY = H * 0.30, GY = H * 0.70;
  var CELL = 118;
  var COLS = 9, ROWS = 5;
  var WALLS = 10;
  var TIME_LIMIT = 22;
  var PAD_T = H * 0.76, PAD_B = H * 0.96;

  // 体の形(セル単位の幅×高さ)。どれも他の形の穴には入らない
  var FORMS = [
    { w: 3, h: 1, art: ['.#####.', '#######', '#ee#ee#', '#######', '.##.##.'] },
    { w: 2, h: 2, art: ['..###..', '.#e#e#.', '#.###.#', '..###..', '.#####.', '.#####.', '..#.#..'] },
    { w: 1, h: 3, art: ['#.#', '#.#', '###', 'e#e', '###', '###', '###', '###', '.#.', '#.#'] },
  ];
  var KID_PAL = { '#': STYLE.main[0], 'e': STYLE.main[1] };
  var KID_HIT = { '#': '#ffe0e0', 'e': STYLE.main[2] };
  var FLAG = ['##..', '####', '####', '#...', '#...', '#...'];
  var THROWER = ['.##.', '####', '.##.', '#..#'];
  var THROWER_UP = ['###.', '.###', '.##.', '#..#'];

  var PH_ATTRACT = 'ATTRACT', PH_PLAY = 'PLAYING', PH_RESULT = 'RESULT';
  var phase = PH_ATTRACT;
  var G;

  function reset() {
    G = {
      kx: 0, tx: 0, form: 1, walls: [], windup: 0, pending: null, sent: 0, gapT: 0.4,
      passed: 0, perfect: 0, run: 0, clock: TIME_LIMIT, count: 0.8, freeze: 0, hitWall: null,
      cleared: false, over: false, puff: 0,
    };
  }

  function project(p) { var e = p * p; return { e: e, y: HY + (GY - HY) * e, c: CELL * (0.12 + 0.88 * e) }; }

  function planWall(n) {
    var f = Math.floor(game.random(0, 3));
    if (G.walls.length === 0 && f === G.form) f = (f + 1) % 3;
    var half = (COLS - FORMS[f].w) / 2 - 0.4;
    var cx = Math.round(game.random(-half, half) * 2) / 2;
    return { form: f, cx: cx, drift: n >= WALLS - 3 ? (cx > 0 ? -1.2 : 1.2) : 0, p: 0, spd: 1 / Math.max(1.0, 1.9 - n * 0.09), gone: false };
  }

  function holeOf(wl) {
    var fm = FORMS[wl.form];
    var cx = wl.cx + wl.drift * Math.min(1, Math.max(0, (wl.p - 0.35) / 0.4));
    return { l: cx - fm.w / 2 - 0.3, r: cx + fm.w / 2 + 0.3, top: fm.h + 0.3, cx: cx };
  }

  function fits(wl) {
    var fm = FORMS[G.form], hole = holeOf(wl);
    var l = G.kx - fm.w / 2, r = G.kx + fm.w / 2;
    return fm.h <= hole.top && l >= hole.l && r <= hole.r;
  }

  function setFromFinger(x, y) {
    var nx = Math.max(-1, Math.min(1, (x - W / 2) / (W * 0.44)));
    G.tx = nx * (COLS / 2 - 0.5);
    if (y >= PAD_T - 60) {
      var band = (y - PAD_T) / (PAD_B - PAD_T);
      var f = band < 0.34 ? 2 : band < 0.67 ? 1 : 0;
      if (f !== G.form) { G.form = f; G.puff = 0.2; game.audio.tone(['C5', 'E5', 'G5'][f], 0.06, { wave: 'triangle', volume: 0.06 }); }
    }
  }

  function arrive(wl) {
    wl.gone = true;
    if (!fits(wl)) {
      G.hitWall = wl; G.freeze = 0.5; G.over = true;
      game.fx.flash('#ffffff', 0.15);
      game.audio.play('se_break', 0.45);
      return;
    }
    var hole = holeOf(wl);
    var off = Math.abs(G.kx - hole.cx);
    var perfect = off < 0.18;
    G.passed++;
    if (perfect) { G.perfect++; G.run++; } else G.run = 0;
    var kxPx = VX + G.kx * CELL;
    game.feedback.good(kxPx, GY - 200, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : STYLE.accent[1], size: 46 });
    game.fx.burst(kxPx, GY - 80, { color: '#ffffff', count: 16, speed: 360 });
    if (G.run >= 3) game.fx.popup('x' + G.run, kxPx, GY - 300, { color: STYLE.accent[0], size: 40 });
    if (G.passed === WALLS / 2) { game.fx.popup(G.passed + ' / ' + WALLS, VX, H * 0.22, { color: STYLE.main[1], size: 50 }); game.audio.play('se_milestone', 0.4); }
    if (G.passed >= WALLS) { G.cleared = true; G.freeze = 0.5; }
  }

  function tick(dt) {
    G.clock -= dt;
    G.kx += (G.tx - G.kx) * Math.min(1, dt * 14);
    if (G.puff > 0) G.puff -= dt;
    if (G.pending) {
      G.windup -= dt;
      if (G.windup <= 0) { G.walls.push(G.pending); G.pending = null; G.sent++; game.audio.play('se_jump', 0.25); }
    } else if (G.sent < WALLS) {
      G.gapT -= dt;
      if (G.gapT <= 0) {
        G.pending = planWall(G.sent); G.windup = 0.6; G.gapT = Math.max(0.4, 0.9 - G.sent * 0.05);
        game.audio.tone('G4', 0.1, { wave: 'square', volume: 0.05 });
      }
    }
    for (var i = 0; i < G.walls.length; i++) {
      var wl = G.walls[i];
      if (wl.gone) continue;
      wl.p += wl.spd * dt;
      if (wl.p >= 1) { arrive(wl); if (G.over) return; }
    }
    G.walls = G.walls.filter(function (q) { return !q.gone; });
    if (G.clock <= 0 && !G.cleared) { G.clock = 0; G.over = true; G.freeze = 0.5; G.hitWall = G.walls[0] || null; game.fx.flash('#ffffff', 0.12); }
  }

  function wrapUp() {
    var stats = { passed: G.passed, total: WALLS, perfect: G.perfect };
    var kxPx = VX + G.kx * CELL;
    if (G.cleared) {
      game.feedback.good(kxPx, GY - 220, { text: 'CLEAR', color: STYLE.accent[0], size: 64 });
      game.audio.play('se_success', 0.6);
      game.end.success(G.passed * 100 + G.perfect * 50, stats);
    } else {
      game.feedback.bad(kxPx, GY - 160, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    phase = PH_RESULT;
  }

  // ── 描画 ─────────────────────────────────────
  function paintYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HY + 10, [[0, STYLE.bg[0]], [1, FOG]]);
    // 校舎(フォグに溶ける低ポリ面)
    for (var s = 0; s < 150; s += 3) game.draw.rect(W * 0.12, HY - 150 + s, W * 0.5, 3, s % 12 === 0 ? '#aab8c9' : '#b8c4d2', 0.8);
    for (var wdw = 0; wdw < 6; wdw++) game.draw.rect(W * 0.15 + wdw * 86, HY - 120, 50, 40, '#8ea0b8', 0.7 + 0.2 * Math.sin(t * 1.5 + wdw));
    var jit = Math.sin(t * 7) * 1.5;
    game.draw.line(W * 0.62, HY + 4, W * 0.78 + jit, HY - 120, '#7f93ad', 4);
    game.draw.line(W * 0.78 + jit, HY - 120, W * 0.98, HY + 4, '#7f93ad', 4);
    // 雪面: 横ストリップで奥から手前へ
    for (var y = HY; y < H; y += 6) {
      var k = (y - HY) / (H - HY);
      game.draw.rect(0, y, W, 6, k < 0.5 ? '#b7c6da' : '#c9d6e6', 0.7 + 0.3 * k);
    }
    for (var c = -4; c <= 4; c++) {
      var far = project(0), near = project(1);
      game.draw.line(VX + (c - 0.5) * far.c, far.y, VX + (c - 0.5) * near.c, near.y, '#c5d1df', 2);
    }
    game.draw.sprite(FLAG, { '#': STYLE.main[2] }, W * 0.9, HY - 30, 8, { anchor: 'center' });
  }

  function paintThrowers() {
    var d = project(0);
    var up = G.pending && Math.floor(game.time.elapsed * 10) % 2 === 0;
    for (var i = -3; i <= 3; i += 2) {
      game.draw.sprite(up ? THROWER_UP : THROWER, { '#': STYLE.main[1] }, VX + i * d.c * 1.3, d.y - 26, 6, { anchor: 'center' });
    }
  }

  function paintWall(wl, flash) {
    var d = project(Math.min(1, wl.p));
    var hole = holeOf(wl);
    var r = d.c * 0.42;
    var fogA = 0.35 + 0.65 * d.e;
    for (var col = 0; col < COLS; col++) {
      var cxCell = col - (COLS - 1) / 2;
      for (var row = 0; row < ROWS; row++) {
        var inHole = cxCell > hole.l && cxCell < hole.r && row + 0.5 < hole.top;
        if (inHole) continue;
        var bx = VX + cxCell * d.c, by = d.y - (row + 0.5) * d.c;
        game.draw.circle(bx, by, r * 1.1, '#4a5d7c', fogA);
        game.draw.circle(bx, by, flash ? r * 1.25 : r, flash ? '#ffffff' : STYLE.main[0], fogA);
      }
    }
    // 穴の輪郭(低ポリの線)
    var lx = VX + hole.l * d.c, rx = VX + hole.r * d.c, ty = d.y - hole.top * d.c;
    game.draw.line(lx, d.y, lx, ty, STYLE.main[1], 2 + 3 * d.e);
    game.draw.line(lx, ty, rx, ty, STYLE.main[1], 2 + 3 * d.e);
    game.draw.line(rx, ty, rx, d.y, STYLE.main[1], 2 + 3 * d.e);
  }

  function paintGhostHole() {
    var lead = null;
    for (var i = 0; i < G.walls.length; i++) if (!lead || G.walls[i].p > lead.p) lead = G.walls[i];
    if (!lead || lead.p < 0.4) return;
    var hole = holeOf(lead);
    var ok = fits(lead);
    var blink = lead.p > 0.72 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    var col = ok ? STYLE.accent[1] : STYLE.main[2];
    var lx = VX + hole.l * CELL, rx = VX + hole.r * CELL, ty = GY - hole.top * CELL;
    var wdt = blink ? 9 : 4;
    game.draw.line(lx, GY, lx, ty, col, wdt);
    game.draw.line(lx, ty, rx, ty, col, wdt);
    game.draw.line(rx, ty, rx, GY, col, wdt);
  }

  function paintKid() {
    var fm = FORMS[G.form];
    var x = VX + G.kx * CELL;
    var bob = Math.sin(game.time.elapsed * 6) * 5;
    game.draw.rect(x - fm.w * CELL / 2, GY - 6, fm.w * CELL, 14, '#9fb0c4', 0.6);
    var rowsN = fm.art.length, colsN = fm.art[0].length;
    var px = Math.min(fm.w * CELL / colsN, fm.h * CELL / rowsN) * 0.95;
    var hit = G.over && G.freeze > 0;
    game.draw.sprite(fm.art, { '#': STYLE.main[1], 'e': STYLE.main[1] }, x + 6, GY - fm.h * CELL / 2 + bob + 6, px, { anchor: 'center' });
    game.draw.sprite(fm.art, hit ? KID_HIT : KID_PAL, x, GY - fm.h * CELL / 2 + bob, px, { anchor: 'center' });
    game.draw.sprite(['.#.', '###'], { '#': STYLE.main[2] }, x, GY - fm.h * CELL - 14 + bob, 10, { anchor: 'center' });
    if (G.puff > 0) game.draw.circle(x, GY - 40, 90 * (1 - G.puff / 0.2) + 20, '#ffffff', 0.5);
  }

  function paintPad() {
    game.draw.rect(0, PAD_T - 20, W, H - PAD_T + 20, '#3d4f6b', 0.85);
    var bh = (PAD_B - PAD_T) / 3;
    for (var b = 0; b < 3; b++) {
      var f = 2 - b;
      var y0 = PAD_T + b * bh;
      game.draw.rect(W * 0.04, y0 + 4, W * 0.92, bh - 8, G.form === f ? '#5d7394' : '#4a5d7c', 0.9);
      game.draw.sprite(FORMS[f].art, KID_PAL, W * 0.1, y0 + bh / 2, 60 / FORMS[f].art.length, { anchor: 'center' });
    }
    var mx = W / 2 + (G.kx / (COLS / 2 - 0.5)) * W * 0.44;
    game.draw.line(mx, PAD_T, mx, PAD_B, STYLE.accent[0], 6);
  }

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#24324a', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function paintAll() {
    paintYard();
    paintThrowers();
    var list = G.walls.slice().sort(function (a, b) { return a.p - b.p; });
    for (var i = 0; i < list.length; i++) paintWall(list[i], false);
    if (G.over && G.hitWall && G.freeze > 0) paintWall(G.hitWall, true);
    paintGhostHole();
    paintKid();
    paintPad();
  }

  function paintHud() {
    say(G.passed + ' / ' + WALLS, W * 0.2, 70, 46, STYLE.main[1]);
    say('PERFECT ' + G.perfect, W * 0.72, 70, 36, '#b07d00');
    game.draw.rect(60, 150, W - 120, 18, '#ffffff', 0.6);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, G.clock / TIME_LIMIT), 18, G.clock < 4 ? STYLE.main[2] : STYLE.main[1]);
  }

  // ── ATTRACT: 本物の tick を動かし、指ボットがパッドをなぞる ──────
  var demo = { t: 0, gx: W / 2, gy: PAD_T + 100, press: false, second: false };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { reset(); G.count = 0; G.gapT = 0.1; demo.second = false; demo.told = false; }
    if (G.over) {
      if (!demo.told) { demo.told = true; game.feedback.bad(VX + G.kx * CELL, GY - 160, { text: 'MISS', size: 50 }); }
      G.freeze -= dt; demo.press = false; return;
    }
    tick(dt);
    var lead = null;
    for (var i = 0; i < G.walls.length; i++) if (!lead || G.walls[i].p > lead.p) lead = G.walls[i];
    if (lead && lead.p > 0.3) {
      if (G.passed >= 1) demo.second = true;
      var want = demo.second ? (lead.form + 1) % 3 : lead.form;
      var hole = holeOf(lead);
      var tx = W / 2 + (hole.cx / (COLS / 2 - 0.5)) * W * 0.44;
      var ty = PAD_T + ((2 - want) + 0.5) * (PAD_B - PAD_T) / 3;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
      demo.press = true;
      setFromFinger(demo.gx, demo.gy);
    } else demo.press = false;
  }

  function startRun() { reset(); phase = PH_PLAY; }

  game.onTap(function (x, y) {
    if (phase === PH_ATTRACT) { game.audio.play('se_coin', 0.5); startRun(); return; }
    if (phase === PH_RESULT) { game.audio.play('se_tap', 0.3); phase = PH_ATTRACT; reset(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (phase !== PH_PLAY || G.count > 0 || G.freeze > 0) return;
    game.audio.play('se_tap', 0.2);
    G.puff = 0.2;
    setFromFinger(x, y);
  });
  game.onMove(function (x, y) {
    if (phase !== PH_PLAY || G.count > 0 || G.freeze > 0) return;
    var before = G.form;
    setFromFinger(x, y);
    if (G.form !== before) game.fx.burst(VX + G.kx * CELL, GY - 60, { color: '#ffffff', count: 6, speed: 200 });
  });

  game.onUpdate(function (dt) {
    if (!G) reset();
    if (phase === PH_ATTRACT) {
      demoStep(dt);
      paintAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      say('SNOW SLIP', VX, 90, 64, STYLE.main[1]);
      say('BEST ' + (game.best > 0 ? game.best : '-'), VX, 165, 34, '#b07d00');
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) say('► 100円 投入 ◄', VX, H * 0.728, 42, STYLE.main[2]);
      else say('INSERT COIN', VX, H * 0.728, 36, STYLE.main[1]);
      return;
    }
    if (phase === PH_RESULT) {
      paintAll();
      game.draw.rect(0, H * 0.3, W, H * 0.28, '#24324a', 0.75);
      say(G.cleared ? 'CLEAR' : 'GAME OVER', VX, H * 0.36, 88, G.cleared ? STYLE.accent[0] : STYLE.main[2]);
      say(G.passed + ' / ' + WALLS, VX, H * 0.43, 52, '#ffffff');
      say('PERFECT ' + G.perfect, VX, H * 0.475, 38, STYLE.accent[1]);
      var sc = G.passed * 100 + G.perfect * 50;
      if (!G.cleared) say('あと' + (WALLS - G.passed) + '枚!', VX, H * 0.52, 46, STYLE.accent[0]);
      else say(sc > game.best ? 'NEW RECORD' : 'BEST ' + game.best, VX, H * 0.52, 44, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', VX, H * 0.62, 36, STYLE.main[1]);
      return;
    }
    if (G.count > 0) {
      G.count -= dt;
      if (G.count <= 0) game.audio.play('se_tap', 0.3);
    } else if (G.freeze > 0) {
      G.freeze -= dt;
      if (G.freeze <= 0) { wrapUp(); return; }
    } else {
      tick(dt);
    }
    paintAll();
    paintHud();
    if (G.count > 0) say(G.count > 0.35 ? 'READY?' : 'GO!', VX, H * 0.45, 92, STYLE.main[2]);
  });

  game.onStart(function () {
    game.audio.melody([['G4', 0.5], ['E4', 0.5], ['C5', 0.5], ['G4', 0.5], ['A4', 0.25], ['B4', 0.25], ['C5', 0.5], ['D5', 1]], { tempo: 138, wave: 'square', volume: 0.045, loop: true, bass: true });
    phase = PH_ATTRACT;
    reset();
    demo.t = 0;
  });
})(game);

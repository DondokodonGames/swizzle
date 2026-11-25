// J-3DSDSDSTOP10-0014-lantern-plaza-tag.js
// 灯籠広場の鬼ごっこ — 石畳のマスをスワイプで跳び移り、一歩ずつ迫るからくり鬼から最後まで逃げ切る
// 操作: 上下左右にスワイプすると隣のマスへ跳ぶ(隣のマスをタップしても跳べる)。灯籠のマスには入れない
// 終わり: 15秒逃げ切ればCLEAR。鬼と同じマスになったらGAME OVER
// @mechanic: swipe_direction
// @theme: night_market_tag
// 世界観: 夜市の灯籠広場で、紙のお面をかぶった子どもが、次に踏むマスを光らせて迫る大きなからくり鬼人形から、石畳を一マスずつ跳んで逃げ回り、屋台の飴玉も拾っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 逃げた秒数・拾った飴玉数・きわどいすり抜け数
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット + カラーセロハンの帯(上=赤、中=琥珀、下=緑)
  var STYLE = {
    bg: ['#050505', '#101010', '#1a1a1a'],
    main: ['#f4f4f4', '#bdbdbd', '#6e6e6e'],
    accent: ['#ff3b30', '#ffb000'],
  };
  var WH = '#f4f4f4', GR = '#8a8a8a', DK = '#101010';
  var BAND_R = '#ff3b30', BAND_A = '#ffb000', BAND_G = '#34e05a';

  var GAME_TITLE = 'LANTERN TAG';
  var TIME_LIMIT = 15;
  var COLS = 5, ROWS = 6, CELL = 170;
  var GX = Math.round((W - COLS * CELL) / 2);
  var GY = Math.round(H * 0.22);
  var LAYOUTS = [
    ['.....', '.#.#.', '.....', '..#..', '.#.#.', '.....'],
    ['.....', '#.#..', '.....', '.#.#.', '.....', '#...#'],
    ['..#..', '.....', '#.#.#', '.....', '.#.#.', '.....'],
  ];

  var KID_A = ['..www..', '.wkwkw.', '.wwwww.', '..www..', '.wwwww.', 'w.www.w', '..w.w..', '.w...w.'];
  var KID_B = ['..www..', '.wkwkw.', '.wwwww.', '..www..', 'wwwwwww', '..www..', '.w...w.', '..w.w..'];
  var ONI_A = ['w..wwww..w', 'ww.wwww.ww', '.wwwwwwww.', '.wkkwwkkw.', '.wwwwwwww.', '..wkkkkw..', '.wwwwwwww.', 'ww.wwww.ww', '...w..w...', '..ww..ww..'];
  var ONI_B = ['..wwwwww..', '.w.wwww.w.', 'wwwwwwwwww', '.wkkwwkkw.', '.wwwwwwww.', '..wkwwkw..', '.wwwwwwww.', '.w.wwww.w.', '..w....w..', '.ww....ww.'];
  var LANTERN = ['.www.', '..w..', 'wwwww', 'w.w.w', 'wwwww', '..w..', '.www.'];
  var CANDY = ['w.w.w', '.www.', 'wwwww', '.www.', 'w.w.w'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var z = null;

  function mono(str, x, y, sz, col) {
    game.draw.text(str, x, y, { size: sz, color: col || WH, bold: true, align: 'center', font: 'monospace' });
  }

  function cx(c) { return GX + c * CELL + CELL / 2; }
  function cy(r) { return GY + r * CELL + CELL / 2; }

  function initGame() {
    var lay = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
    z = {
      grid: lay.map(function (row) { return row.split('').map(function (ch) { return ch === '#' ? 1 : 0; }); }),
      pr: 5, pc: 2, hop: 0, fromR: 5, fromC: 2,
      onis: [{ r: 0, c: 0, nr: 0, nc: 0, beat: 0.9, anim: 0, fr: 0, fc: 0 }],
      spawnTele: 0, spawned: false, halfDone: false,
      candy: null, candies: 0, grazes: 0, survived: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: null,
      finished: false, done: false, ok: false, endWait: 0,
    };
    planOni(z.onis[0]);
    placeCandy();
  }

  function free(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS && z.grid[r][c] === 0; }

  function distMap() {
    var d = [], q = [[z.pr, z.pc]], i, r, c;
    for (i = 0; i < ROWS; i++) { d.push([]); for (var j = 0; j < COLS; j++) d[i].push(99); }
    d[z.pr][z.pc] = 0;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      var cur = q.shift(); r = cur[0]; c = cur[1];
      for (i = 0; i < 4; i++) {
        var nr = r + dirs[i][0], nc = c + dirs[i][1];
        if (free(nr, nc) && d[nr][nc] > d[r][c] + 1) { d[nr][nc] = d[r][c] + 1; q.push([nr, nc]); }
      }
    }
    return d;
  }

  // 鬼の次の一歩(プレイヤーへの最短路)を決めて予告マスに出す
  function planOni(o) {
    var d = distMap(), best = null, bestD = 999;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < 4; i++) {
      var nr = o.r + dirs[i][0], nc = o.c + dirs[i][1];
      if (!free(nr, nc)) continue;
      var taken = false;
      for (var k = 0; k < z.onis.length; k++) if (z.onis[k] !== o && z.onis[k].r === nr && z.onis[k].c === nc) taken = true;
      if (taken) continue;
      if (d[nr][nc] < bestD) { bestD = d[nr][nc]; best = [nr, nc]; }
    }
    if (best) { o.nr = best[0]; o.nc = best[1]; } else { o.nr = o.r; o.nc = o.c; }
  }

  function beatLen(o) { return Math.max(0.36, 0.64 - z.survived * 0.018) * (o.slow ? 1.25 : 1); }

  function placeCandy() {
    for (var tries = 0; tries < 30; tries++) {
      var r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
      if (!free(r, c) || (r === z.pr && c === z.pc)) continue;
      var onOni = false;
      for (var k = 0; k < z.onis.length; k++) if (z.onis[k].r === r && z.onis[k].c === c) onOni = true;
      if (onOni) continue;
      z.candy = { r: r, c: c };
      return;
    }
  }

  function hopTo(dr, dc) {
    if (z.finished || z.hitStop > 0) return;
    var nr = z.pr + dr, nc = z.pc + dc;
    if (!free(nr, nc)) {
      game.feedback.bad(cx(z.pc) + dc * 60, cy(z.pr) + dr * 60, { text: null, shake: 4, volume: 0.3 });
      return;
    }
    z.fromR = z.pr; z.fromC = z.pc; z.pr = nr; z.pc = nc; z.hop = 0.12;
    game.audio.play('se_jump', 0.25);
    for (var k = 0; k < z.onis.length; k++) {
      var o = z.onis[k];
      if (o.r === nr && o.c === nc) { caught(o); return; }
    }
    if (z.candy && z.candy.r === nr && z.candy.c === nc) {
      z.candies++;
      game.feedback.good(cx(nc), cy(nr), { text: String(z.candies), color: BAND_A, sound: 'se_coin', count: 10 });
      placeCandy();
    }
    for (var j = 0; j < z.onis.length; j++) planOni(z.onis[j]);
  }

  function caught(o) {
    z.finished = true; z.ok = false;
    z.hitStop = 0.5; z.hl = { r: o.r, c: o.c };
    game.fx.flash(WH, 0.25);
    game.feedback.bad(cx(o.c), cy(o.r), { text: 'MISS', color: BAND_R });
    finish();
  }

  function finish() {
    if (z.done) return;
    z.done = true; z.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(z.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function update(dt) {
    if (z.hop > 0) z.hop -= dt;
    if (z.hitStop > 0) { z.hitStop -= dt; return; }
    if (z.finished) return;
    z.survived += dt;
    // 2体目の鬼: 灯籠が瞬いて(予告)から現れる
    if (!z.halfDone && z.survived >= 7) {
      z.halfDone = true; z.spawnTele = 0.8;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE', W / 2, GY - 40, { color: BAND_A, size: 60 });
    }
    if (z.spawnTele > 0) {
      z.spawnTele -= dt;
      if (Math.floor(z.spawnTele * 10) % 2 === 0) game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.03 });
      if (z.spawnTele <= 0 && !z.spawned) {
        z.spawned = true;
        var o2 = { r: 0, c: 4, nr: 0, nc: 4, beat: 0.8, anim: 0, fr: 0, fc: 4, slow: true };
        if (o2.r === z.pr && o2.c === z.pc) o2.c = 3;
        z.onis.push(o2); planOni(o2);
      }
    }
    for (var k = 0; k < z.onis.length; k++) {
      var o = z.onis[k];
      if (o.anim > 0) o.anim -= dt;
      o.beat -= dt;
      if (o.beat <= 0) {
        o.fr = o.r; o.fc = o.c;
        o.r = o.nr; o.c = o.nc; o.anim = 0.15;
        o.beat = beatLen(o);
        game.audio.tone(k === 0 ? 'D2' : 'F2', 0.09, { wave: 'square', volume: 0.07 });
        if (o.r === z.pr && o.c === z.pc) { caught(o); return; }
        if (Math.abs(o.r - z.pr) + Math.abs(o.c - z.pc) === 1) {
          z.grazes++;
        }
        planOni(o);
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawPlaza() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#020202'], [0.5, '#141414'], [1, '#060606']]);
    game.draw.rect(0, 0, W, H, WH, 0.02 + 0.02 * Math.sin(t * 1.3));
    // 星のような白ドット
    for (var s = 0; s < 40; s++) {
      var sx = (s * 263) % W, sy = (s * 151) % Math.round(H * 0.2);
      if ((Math.floor(t * 2) + s) % 5 !== 0) game.draw.rect(sx, sy + 20, 5, 5, GR);
    }
    // 石畳
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GX + c * CELL, y = GY + r * CELL;
        for (var d = 0; d < 4; d++) {
          game.draw.rect(x + 12 + d * 40, y + 8, 6, 6, GR);
          game.draw.rect(x + 8, y + 12 + d * 40, 6, 6, GR);
        }
        if (z.grid[r][c]) {
          var flick = z.spawnTele > 0 && r === 0 && Math.floor(t * 16) % 2 === 0;
          game.draw.sprite(LANTERN, { w: flick ? BAND_A : WH }, x + CELL / 2, y + CELL / 2 + Math.sin(t * 2 + c) * 3, 18, { anchor: 'center' });
        }
      }
    }
    if (z.spawnTele > 0 && Math.floor(t * 12) % 2 === 0) game.draw.rect(GX + 4 * CELL + 10, GY + 10, CELL - 20, CELL - 20, BAND_R, 0.35);
    // 屋台ののれん(遠景)
    for (var n = 0; n < 6; n++) {
      var nx = n * 190 + 20 + Math.sin(t * 0.8 + n) * 4;
      game.draw.rect(nx, H * 0.84, 150, 12, WH);
      for (var f = 0; f < 5; f++) game.draw.rect(nx + f * 32, H * 0.84 + 16, 22, 70 + Math.sin(t * 2 + f + n) * 6, GR);
    }
  }

  function drawActors() {
    var t = game.time.elapsed;
    // 鬼の予告マス
    for (var k = 0; k < z.onis.length; k++) {
      var o = z.onis[k];
      if (!z.finished && Math.floor(t * 8) % 2 === 0) {
        var warn = o.beat < 0.3;
        game.draw.rect(GX + o.nc * CELL + 14, GY + o.nr * CELL + 14, CELL - 28, CELL - 28, warn ? BAND_R : WH, warn ? 0.45 : 0.15);
      }
    }
    if (z.candy) game.draw.sprite(CANDY, { w: WH }, cx(z.candy.c), cy(z.candy.r) + Math.sin(t * 4) * 6, 12, { anchor: 'center' });
    // 子ども(跳ぶ時だけ弧を描く)
    var hp = z.hop > 0 ? 1 - z.hop / 0.12 : 1;
    var px = cx(z.fromC) + (cx(z.pc) - cx(z.fromC)) * hp;
    var py = cy(z.fromR) + (cy(z.pr) - cy(z.fromR)) * hp - Math.sin(hp * Math.PI) * 40;
    var kid = Math.floor(t * 5) % 2 === 0 ? KID_A : KID_B;
    game.draw.sprite(kid, { w: WH, k: DK }, px + Math.sin(t * 3) * 4, py + Math.cos(t * 4) * 3, 14, { anchor: 'center' });
    for (var j = 0; j < z.onis.length; j++) {
      var on = z.onis[j];
      var ap = on.anim > 0 ? 1 - on.anim / 0.15 : 1;
      var ox = cx(on.fc) + (cx(on.c) - cx(on.fc)) * ap;
      var oy = cy(on.fr) + (cy(on.r) - cy(on.fr)) * ap - Math.sin(ap * Math.PI) * 30;
      var big = z.hl && z.hl.r === on.r && z.hl.c === on.c && z.hitStop > 0;
      var art = Math.floor(t * 3 + j) % 2 === 0 ? ONI_A : ONI_B;
      game.draw.sprite(art, { w: big ? '#ffffff' : WH, k: DK }, ox + Math.sin(t * 2 + j) * 5, oy - 10, big ? 19 : 15, { anchor: 'center' });
    }
  }

  function drawBands() {
    // セロハンの帯(時代の色付け)
    game.draw.rect(0, 0, W, Math.round(H * 0.2), BAND_R, 0.18);
    game.draw.rect(0, GY, W, CELL * 3, BAND_A, 0.08);
    game.draw.rect(0, GY + CELL * 3, W, CELL * 3, BAND_G, 0.08);
  }

  function scoreOf() { return Math.round(z.survived * 100) + z.candies * 150 + z.grazes * 20; }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, DK, 0.7);
    mono(Math.ceil(z.timeLeft) + '', W / 2, 90, 90, WH);
    mono(String(z.candies), 150, 90, 56, BAND_A);
    game.draw.sprite(CANDY, { w: BAND_A }, 70, 90, 9, { anchor: 'center' });
    mono(String(scoreOf()), W - 150, 90, 44, WH);
    var frac = Math.max(0, z.timeLeft / TIME_LIMIT);
    var low = z.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 176, W - 160, 16, GR);
    game.draw.rect(80, 176, (W - 160) * frac, 16, low ? BAND_R : WH);
  }

  function drawResult() {
    game.draw.rect(100, 640, W - 200, 500, DK, 0.92);
    game.draw.rect(100, 640, W - 200, 10, z.ok ? BAND_G : BAND_R);
    mono(z.ok ? 'CLEAR' : 'GAME OVER', W / 2, 740, 88, z.ok ? BAND_G : BAND_R);
    mono(z.survived.toFixed(1) + '秒', W / 2, 850, 64, WH);
    mono(z.candies + '個', W / 2, 940, 48, BAND_A);
    var sc = scoreOf();
    if (z.ok && sc > game.best) mono('NEW RECORD', W / 2, 1020, 52, BAND_A);
    else if (!z.ok) mono('あと' + Math.ceil(TIME_LIMIT - z.survived) + '秒!', W / 2, 1020, 52, WH);
    mono('BEST ' + Math.max(game.best, z.ok ? sc : 0), W / 2, 1095, 36, GR);
  }

  function drawScene() {
    drawPlaza();
    drawActors();
    drawBands();
  }

  // ── ATTRACT: AI が同じ hopTo で逃げる(遠いマスへ跳び続け、終盤わざと鬼の方へ跳んで捕まる)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, next: 0.5, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) { initGame(); z.ready = 0; demo.next = 0.6; }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.next -= dt;
    if (demo.next <= 0 && !z.finished) {
      demo.next = 0.42;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], best = null, bestScore = -99;
      var o = z.onis[0];
      for (var i = 0; i < 4; i++) {
        var nr = z.pr + dirs[i][0], nc = z.pc + dirs[i][1];
        if (!free(nr, nc)) continue;
        var dd = Math.abs(nr - o.nr) + Math.abs(nc - o.nc);
        var sc = cyc > 4.6 ? -dd : dd + (z.candy && z.candy.r === nr && z.candy.c === nc ? 1.5 : 0) + Math.random() * 0.5;
        if (sc > bestScore) { bestScore = sc; best = dirs[i]; }
      }
      var near = Math.abs(z.pr - o.r) + Math.abs(z.pc - o.c);
      if (best && (near <= 2 || cyc > 4.6)) {
        hopTo(best[0], best[1]);
        demo.gx = cx(z.pc) - best[1] * 120; demo.gy = cy(z.pr) - best[0] * 120 + 40;
        demo.pressT = 0.25;
      }
    }
    demo.press = demo.pressT > 0;
    update(dt);
    z.timeLeft = TIME_LIMIT - z.survived;
    if (z.done) { z.done = false; }
  }

  function tapStep(x, y) {
    var dx = x - cx(z.pc), dy = y - cy(z.pr);
    if (Math.abs(dx) < CELL * 0.4 && Math.abs(dy) < CELL * 0.4) { game.audio.play('se_tap', 0.2); return; }
    if (Math.abs(dx) >= Math.abs(dy)) hopTo(0, dx > 0 ? 1 : -1);
    else hopTo(dy > 0 ? 1 : -1, 0);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); song();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (z.ready > 0 || z.done) { game.audio.play('se_tap', 0.1); return; }
    tapStep(x, y);
  });
  game.onSwipe(function (dir) {
    if (state !== S.PLAYING || z.ready > 0 || z.done) return;
    game.audio.play('se_tap', 0.15);
    if (dir === 'up') hopTo(-1, 0);
    else if (dir === 'down') hopTo(1, 0);
    else if (dir === 'left') hopTo(0, -1);
    else hopTo(0, 1);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!z) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 230, DK, 0.7);
      mono(GAME_TITLE, W / 2, H * 0.045, 78, WH);
      mono('HI-SCORE ' + game.best, W / 2, 175, 34, BAND_A);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) mono('► 100円 投入 ◄', W / 2, H * 0.94, 48, BAND_A);
      else mono('INSERT COIN', W / 2, H * 0.94, 42, WH);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) mono('TAP TO CONTINUE', W / 2, H * 0.94, 38, WH);
      return;
    }

    if (z.done) {
      z.endWait -= dt;
      if (z.hitStop > 0) z.hitStop -= dt;
      if (z.endWait <= 0) {
        state = S.RESULT;
        var stats = { seconds: Math.round(z.survived * 10) / 10, candies: z.candies, grazes: z.grazes };
        if (z.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (z.ready > 0) {
      z.ready -= dt;
      if (z.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (z.hitStop <= 0 && !z.finished) z.timeLeft -= dt;
      if (z.timeLeft <= 0 && !z.finished) {
        z.timeLeft = 0; z.finished = true; z.ok = true; z.survived = TIME_LIMIT;
        game.feedback.good(cx(z.pc), cy(z.pr), { text: 'CLEAR', color: BAND_G, count: 24 });
        finish();
      } else {
        update(dt);
      }
    }

    drawScene();
    drawHud();
    if (z.ready > 0) mono(z.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, BAND_A);
    if (z.done) drawResult();
  });

  function song() {
    game.audio.melody(
      [['A4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['G4', 1], ['A4', 1]],
      { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['A2', 2], ['E2', 2], ['A2', 2]] }
    );
  }

  game.onStart(function () {
    song();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

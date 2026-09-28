// J-GC4-0028-basalt-honey-climb.js
// 玄武岩のみつ登り — 自動でよじ登る岩壁で指を左右に動かし、砂煙の予告から落ちてくる岩をかわして頂上の蜂の巣へ
// 操作: 画面を押したまま左右に動かすと登り手がその列へ移る。上端の砂煙マークの列に岩が落ちてくるのでよける
// 終わり: 頂上(100%)に着けばCLEAR。岩に3回当たる/時間切れでGAME OVER(当たるたびにずり落ちる)
// @mechanic: dodge
// @theme: basalt_cliff_honey_climb
// 世界観: 夕立前の玄武岩の崖で、蜜採りの少女がロープ一本でよじ登りながら、上の棚から転がり落ちる岩を左右にかわし、頂上の岩棚にある野生の蜂の巣へたどり着く
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達高度%・かすり回数・金の手がかり数
// スタイル: 8bit HOME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8タイル反復背景、1方向スクロール
  var STYLE = {
    bg: ['#000000', '#3c3c64', '#6c6ca4'],
    main: ['#a0582c', '#d8a070', '#fce0a8'],
    accent: ['#fcd800', '#f83800'],
  };

  var GAME_TITLE = 'HONEY CLIFF';
  var TIME_LIMIT = 22;
  var CLIMB_RATE = 6.6;
  var HITS = 3;
  var PX = 12;
  var CLIMB_Y = H * 0.64;
  var WARN_Y = H * 0.155;
  var MINX = W * 0.1, MAXX = W * 0.9;

  var GIRL_A = [
    '..yyyy..',
    '.yyyyyy.',
    '..ssss..',
    's.rrrr.s',
    '.srrrrs.',
    '..rrrr..',
    '..b..b..',
    '.bb..bb.',
  ];
  var GIRL_B = [
    '..yyyy..',
    '.yyyyyy.',
    's.ssss.s',
    '.srrrrs.',
    '..rrrr..',
    '..rrrr..',
    '.bb..b..',
    '.b...bb.',
  ];
  var GIRL_PAL = { y: '#fcd800', s: '#fce0a8', r: '#f83800', b: '#a0582c' };
  var ROCK = ['..##..', '.####.', '######', '###.##', '.####.', '..##..'];
  var CRACK = ['..##..', '.#..#.', '##..##', '#.##.#', '.#..#.', '..##..'];
  var DUST = ['.#.#.', '#.#.#', '.#.#.'];
  var HOLD = ['.##.', '####', '####', '.##.'];
  var HIVE = ['..yy..', '.yyyy.', 'yybbyy', 'yyyyyy', '.yyyy.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: '#000000', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function initGame() {
    g = {
      x: W / 2, tx: W / 2, height: 0, best: 0, hits: 0, grazes: 0, golds: 0, score: 0,
      timeLeft: TIME_LIMIT, elapsed: 0, ready: 0.8, hitStop: 0, finished: false, done: false,
      ok: false, endWait: 0, inv: 0, scroll: 0, rocks: [], warns: [], holds: [],
      spawnT: 0.8, holdT: 1.2, hl: null, marks: {}, slide: 0,
    };
  }

  function spawnWarn() {
    var x = game.random(MINX + 40, MAXX - 40);
    // 登り手の近くを狙う比率を上げる(物量+狙い撃ち)
    if (game.random(0, 1) < 0.45) x = Math.max(MINX + 40, Math.min(MAXX - 40, g.x + game.random(-120, 120)));
    var r = game.random(0, 1);
    var kind = r < 0.2 && g.elapsed > 4 ? 'split' : r < 0.4 ? 'big' : 'small';
    g.warns.push({ x: x, t: 0, kind: kind });
    game.audio.tone('E6', 0.05, { wave: 'square', volume: 0.05 });
  }

  function dropRock(w) {
    var big = w.kind === 'big';
    g.rocks.push({
      x: w.x, y: WARN_Y, vx: 0, vy: big ? 820 : 1050, r: big ? 72 : 46, kind: w.kind,
      split: w.kind === 'split' ? H * 0.42 : -1, grazed: false,
    });
  }

  function hurt(rk) {
    g.hits++;
    g.inv = 1.1;
    g.slide = 0.4;
    g.height = Math.max(0, g.height - 5);
    if (g.hits >= HITS) { endRound(false, [rk.x, rk.y, rk.r]); return; }
    game.feedback.bad(g.x, CLIMB_Y - 60, { text: 'MISS', shake: 14, sound: 'se_break' });
  }

  function endRound(ok, hl) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.hl = hl;
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += 1000 + Math.round(g.timeLeft * 80);
    game.audio.play(ok ? 'se_milestone' : 'se_bad', 0.5);
  }

  function step(dt, isDemo) {
    g.elapsed += dt;
    var dx = g.tx - g.x, mv = 1500 * dt;
    g.x += Math.max(-mv, Math.min(mv, dx));
    if (g.inv > 0) g.inv -= dt;
    if (g.slide > 0) g.slide -= dt;
    var rate = g.slide > 0 ? -12 : CLIMB_RATE;
    g.height = Math.min(100, Math.max(0, g.height + rate * dt));
    g.scroll += (g.slide > 0 ? -300 : 260) * dt;
    if (g.height > g.best) g.best = g.height;
    // 予告 → 落石
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.height < 97) {
      spawnWarn();
      if (g.elapsed > 9 && game.random(0, 1) < 0.35) spawnWarn();
      g.spawnT = Math.max(0.42, 0.85 - g.elapsed * 0.03);
    }
    for (var w = g.warns.length - 1; w >= 0; w--) {
      g.warns[w].t += dt;
      if (g.warns[w].t >= 0.7) { dropRock(g.warns[w]); g.warns.splice(w, 1); }
    }
    for (var i = g.rocks.length - 1; i >= 0; i--) {
      var rk = g.rocks[i];
      rk.x += rk.vx * dt; rk.y += rk.vy * dt;
      if (rk.split > 0 && rk.y >= rk.split) {
        rk.split = -1;
        game.audio.play('se_break', 0.25);
        game.fx.burst(rk.x, rk.y, { color: STYLE.main[1], count: 8, speed: 260 });
        g.rocks.push({ x: rk.x, y: rk.y, vx: 330, vy: 900, r: 38, kind: 'small', split: -1, grazed: false });
        rk.vx = -330; rk.r = 38; rk.kind = 'small';
      }
      var hit = game.hit.circle(rk.x, rk.y, rk.r * 0.8, g.x, CLIMB_Y, 42);
      if (hit && g.inv <= 0 && !g.finished) {
        g.rocks.splice(i, 1);
        if (!isDemo) hurt(rk); else { g.inv = 1.1; g.slide = 0.3; game.feedback.bad(g.x, CLIMB_Y - 60, { text: 'MISS', shake: 6 }); }
        continue;
      }
      if (!rk.grazed && rk.y > CLIMB_Y + 40 && Math.abs(rk.x - g.x) < rk.r + 90 && g.inv <= 0) {
        rk.grazed = true; g.grazes++; g.score += 30;
        game.fx.popup('NICE', g.x, CLIMB_Y - 120, { color: STYLE.accent[0], size: 44 });
      }
      if (rk.y > H + 100) g.rocks.splice(i, 1);
    }
    // 金の手がかり(スパイス)
    g.holdT -= dt;
    if (g.holdT <= 0) { g.holds.push({ x: game.random(MINX + 60, MAXX - 60), y: H * 0.18 }); g.holdT = game.random(1.6, 2.4); }
    for (var h = g.holds.length - 1; h >= 0; h--) {
      var hd = g.holds[h];
      hd.y += 260 * dt;
      if (Math.abs(hd.x - g.x) < 80 && Math.abs(hd.y - CLIMB_Y) < 70) {
        g.holds.splice(h, 1); g.golds++; g.score += 100; g.height = Math.min(100, g.height + 2);
        game.feedback.good(hd.x, hd.y, { text: 'NICE', color: STYLE.accent[0], count: 10, sound: 'se_coin' });
        continue;
      }
      if (hd.y > H + 60) g.holds.splice(h, 1);
    }
    if (isDemo) return;
    var m = Math.floor(g.height / 25);
    if (m >= 1 && m <= 3 && !g.marks[m]) {
      g.marks[m] = true;
      game.fx.popup(m * 25 + '%', W / 2, H * 0.4, { color: STYLE.accent[0], size: 72 });
      game.audio.play('se_milestone', 0.45);
    }
    if (g.height >= 100) endRound(true, [g.x, CLIMB_Y, 60]);
    g.timeLeft -= dt;
    if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false, [g.x, CLIMB_Y, 60]); }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.5, STYLE.bg[2]], [1, STYLE.bg[1]]]);
    var sc = g ? g.scroll : t * 200;
    var tile = PX * 8;
    var off = ((sc % tile) + tile) % tile;
    for (var ty = -1; ty < H / tile + 1; ty++) {
      for (var tx = 0; tx < W / tile + 1; tx++) {
        var x = tx * tile, y = ty * tile + off;
        var odd = (tx + ty + Math.floor(sc / tile)) % 2 === 0;
        game.draw.rect(x + 2, y + 2, tile - 4, tile - 4, odd ? STYLE.main[0] : '#884820');
        game.draw.rect(x + 2, y + 2, tile - 4, PX, STYLE.main[1], 0.5);
      }
    }
    // 岩棚(横の出っ張り)
    for (var l = 0; l < 4; l++) {
      var ly = ((l * 520 + sc) % (H + 200)) - 100;
      game.draw.rect(l % 2 ? W * 0.55 : 0, ly, W * 0.45, PX * 2, STYLE.bg[0]);
      game.draw.rect(l % 2 ? W * 0.55 : 0, ly - PX, W * 0.45, PX, STYLE.main[2]);
    }
    game.draw.rect(0, 0, W, H, '#fce0a8', 0.03 + 0.03 * Math.sin(t * 1.7));
  }

  function drawSummit() {
    if (g.height < 80) return;
    var y = CLIMB_Y - (100 - g.height) * 38 - 120;
    game.draw.rect(0, y, W, PX * 3, STYLE.main[2]);
    game.draw.rect(0, y + PX * 3, W, PX, STYLE.bg[0]);
    game.draw.sprite(HIVE, { y: STYLE.accent[0], b: STYLE.bg[0] }, W / 2, y - 60 + Math.sin(game.time.elapsed * 3) * 6, PX * 2, { anchor: 'center' });
  }

  function drawField() {
    var t = game.time.elapsed;
    for (var w = 0; w < g.warns.length; w++) {
      var wr = g.warns[w];
      var blink = Math.floor(wr.t * 14) % 2 === 0;
      game.draw.sprite(DUST, { '#': blink ? STYLE.accent[1] : STYLE.main[2] }, wr.x, WARN_Y, PX * (wr.kind === 'big' ? 3 : 2), { anchor: 'center' });
      game.draw.rect(wr.x - 4, WARN_Y + 40, 8, (CLIMB_Y - WARN_Y) * 0.9, STYLE.accent[1], blink ? 0.3 : 0.12);
    }
    for (var h = 0; h < g.holds.length; h++) {
      var hd = g.holds[h];
      game.draw.sprite(HOLD, { '#': Math.floor(t * 6) % 2 ? STYLE.accent[0] : STYLE.main[2] }, hd.x, hd.y, PX * 2, { anchor: 'center' });
    }
    for (var i = 0; i < g.rocks.length; i++) {
      var rk = g.rocks[i];
      var art = rk.split > 0 ? CRACK : ROCK;
      game.draw.circle(rk.x + 8, rk.y + 10, rk.r, STYLE.bg[0], 0.6);
      game.draw.sprite(art, { '#': '#d8d8d8' }, rk.x, rk.y, rk.r / 3, { anchor: 'center' });
    }
    // 登り手+ロープ
    game.draw.line(g.x, CLIMB_Y - 50, g.x, 0, STYLE.main[2], 4);
    var blinkInv = g.inv > 0 && Math.floor(t * 16) % 2 === 0;
    var frame = Math.floor(g.height * 1.3) % 2 ? GIRL_A : GIRL_B;
    if (!blinkInv) game.draw.sprite(frame, GIRL_PAL, g.x, CLIMB_Y + Math.sin(t * 5) * 4, PX * 1.5, { anchor: 'center' });
    if (g.hl && g.hitStop > 0) {
      game.draw.circle(g.hl[0], g.hl[1], g.hl[2] * 1.8, '#ffffff', 0.55);
      game.draw.sprite(ROCK, { '#': '#ffffff' }, g.hl[0], g.hl[1], g.hl[2] / 2.2, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, STYLE.bg[0], 0.75);
    txt(Math.floor(g.height) + '%', W * 0.22, 90, 70, STYLE.accent[0]);
    txt('SCORE ' + g.score, W * 0.68, 70, 38, '#ffffff');
    for (var i = 0; i < HITS; i++) game.draw.rect(W * 0.5 + i * 64, 120, 44, 36, i < HITS - g.hits ? STYLE.accent[1] : '#3c3c64');
    var bw = W * 0.84, low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.08, 190, bw, 18, '#3c3c64');
    game.draw.rect(W * 0.08, 190, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 18, low ? STYLE.accent[1] : STYLE.main[2]);
    // 高度メーター(右端)
    var mh = H * 0.5, my = H * 0.3;
    game.draw.rect(W - 44, my, 20, mh, STYLE.bg[0], 0.7);
    game.draw.rect(W - 44, my + mh * (1 - g.height / 100), 20, mh * g.height / 100, STYLE.accent[0]);
    // 親指ゾーンの足場帯
    game.draw.rect(0, H * 0.86, W, H * 0.14, STYLE.bg[0], 0.45);
    game.draw.rect(g.x - 70, H * 0.9, 140, 16, STYLE.main[2], 0.8);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, cyc: 0 };
  function demoTarget() {
    var best = g.x, bestScore = -1e9;
    for (var c = 0; c < 9; c++) {
      var x = MINX + 40 + c * (MAXX - MINX - 80) / 8;
      var sc = -Math.abs(x - g.x) * 0.15;
      for (var i = 0; i < g.rocks.length; i++) {
        var rk = g.rocks[i];
        if (rk.y < CLIMB_Y + 20) sc -= Math.max(0, 260 - Math.abs(rk.x + rk.vx * 0.3 - x)) * 3;
      }
      for (var w = 0; w < g.warns.length; w++) sc -= Math.max(0, 220 - Math.abs(g.warns[w].x - x)) * 2;
      if (sc > bestScore) { bestScore = sc; best = x; }
    }
    return best;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.cyc++; }
    // 奇数サイクルの5〜6秒目は手を止めて当たる例を見せる
    var idle = demo.cyc % 2 === 1 && cyc > 5 && cyc < 6.2;
    if (!idle) g.tx = demoTarget();
    step(dt, true);
    demo.gx += (g.tx - demo.gx) * Math.min(1, dt * 10);
    demo.gy = H * 0.9;
  }

  function steer(x) { g.tx = Math.max(MINX, Math.min(MAXX, x)); }

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
    if (g.finished || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    steer(x);
    game.audio.play('se_tap', 0.15);
    game.fx.burst(g.x, CLIMB_Y - 40, { color: STYLE.main[2], count: 4, speed: 120 });
  });

  game.onMove(function (x, y) {
    if (state !== S.PLAYING || g.finished) return;
    if (g.ready <= 0) steer(x);
    if (game.random(0, 1) < 0.05) game.audio.play('se_tap', 0.04);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawSummit(); drawField();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 92, STYLE.accent[0]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 44, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawSummit(); drawField();
      game.draw.rect(0, H * 0.28, W, H * 0.3, STYLE.bg[0], 0.8);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 110, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(Math.floor(g.best) + '%', W / 2, H * 0.41, 70, '#ffffff');
      txt('SCORE ' + g.score, W / 2, H * 0.47, 48, STYLE.accent[0]);
      if (!g.ok) txt('あと' + Math.max(1, Math.ceil(100 - g.best)) + '%!', W / 2, H * 0.53, 54, '#fc9838');
      else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.53, 58, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.53, 46, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, '#ffffff');
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { height: Math.floor(g.best), grazes: g.grazes, golds: g.golds, hits: g.hits };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(g.x, CLIMB_Y - 100, { text: 'CLEAR', color: STYLE.accent[0], count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.x, CLIMB_Y - 100, { text: g.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', shake: 18 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_jump', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawSummit(); drawField(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['A4', 1.5],
    ], { tempo: 170, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

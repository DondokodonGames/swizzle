// I-GBA-0049v2-indigo-crest-hunt.js
// 藍の干し場の紋さがし — 型紙で一瞬だけ見せられた紋を覚え、風に揺れる反物の列から同じ紋の一反を探して押す
// 操作: 親方が型紙の紋を一瞬見せて伏せる。干し場に並んだ反物の中から、外枠・中の柄・上の切れ込みまで同じ紋の一反をタップする
// 終わり: 5回見つければ成功。似た紋を押す/時間内に見つけられないと藍玉(残機3)を失い、0で失敗
// @mechanic: spot
// @theme: indigo_dye_yard
// 世界観: 藍染め工房の干し場で、染め職人が親方に一瞬見せられた型紙の紋を覚え、風にはためく干された反物の列から同じ紋が染め抜かれた一反を探し出す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(見つけた数と見つけた速さ)
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面はベタ塗り(横ストリップで塗る)、頂点を微小に揺らすジッター、遠景はフォグ色でつぶす
  var STYLE = { bg: ['#0e1a33', '#22385e', '#8ea6c4'], main: ['#1d3a8a', '#2a50b0', '#142a66'], accent: ['#eef3ff', '#e0a040'] };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], fog: STYLE.bg[2], indigo: STYLE.main[0], indigoHi: STYLE.main[1], indigoLo: STYLE.main[2],
    white: STYLE.accent[0], gold: STYLE.accent[1], pole: '#6a4a2a', ink: '#081020', good: '#7dffb0', bad: '#ff5a4a', ground: '#3a3020',
  };

  var GAME_TITLE = 'CREST HUNT';
  var ROUNDS = 5;
  var NEEDED = 5;
  var TIME_LIMIT = 13;          // spot = F族 8〜15s(探す時間の合計)
  var LIVES = 3;
  var PEEK = [1.0, 0.9, 0.8, 0.7, 0.6];
  var SEARCH = [3.0, 2.8, 2.6, 2.4, 2.2];
  var NEAR = [0, 3, 5, 7, 9];    // 1か所だけ違う紛らわしい反物の数
  var WIND = [0.3, 0.5, 0.7, 0.9, 1.1];
  var ROWS = [
    { y: Math.round(H * 0.38), w: 150, h: 210, fog: 0.45 },
    { y: Math.round(H * 0.54), w: 176, h: 245, fog: 0.22 },
    { y: Math.round(H * 0.71), w: 204, h: 280, fog: 0 },
  ];
  var COLS = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var target, cloths, round, phase, phaseT, lives, found, score, timeLeft;
  var countIn, over, won, endT, freeze, picked, nodT, frownT, milestoneDone, prevBest, tickDone;

  function cry(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var DIAMOND = ['....#....', '...#.#...', '..#...#..', '.#.....#.', '#.......#', '.#.....#.', '..#...#..', '...#.#...', '....#....'];
  var HEMP = ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'];
  // 親方(手ぬぐい・藍の前掛け)0,1=待機 2=型紙を掲げる 3=首をふる
  var MASTER = [
    ['..wwww..', '.wwwwww.', '.ssssss.', '.skssks.', '..smms..', '.aaaaaa.', 'saaaaaas', '.aaaaaa.', '..a..a..', '..k..k..'],
    ['..wwww..', '.wwwwww.', '.ssssss.', '.ssssss.', '..smms..', '.aaaaaa.', 'saaaaaas', '.aaaaaa.', '..a..a..', '..k..k..'],
    ['s.wwww.s', 'sswwwwss', '.ssssss.', '.skssks.', '..smms..', '.aaaaaa.', '.aaaaaa.', '.aaaaaa.', '..a..a..', '..k..k..'],
    ['.wwww...', 'wwwwww..', 'ssssss..', 'skssks..', '.smmss..', '.aaaaaa.', 'saaaaaas', '.aaaaaa.', '..a..a..', '.k....k.'],
  ];
  var MASTER_PAL = { w: '#eef3ff', s: '#e8c09a', k: '#081020', m: '#a04030', a: '#1d3a8a' };

  function same(a, b) { return a.outer === b.outer && a.inner === b.inner && a.tick === b.tick; }
  function diffCount(a, b) { return (a.outer !== b.outer) + (a.inner !== b.inner) + (a.tick !== b.tick); }
  function randomCrest() { return { outer: Math.floor(game.random(0, 3)), inner: Math.floor(game.random(0, 4)), tick: game.random(0, 1) < 0.5 ? 1 : 0 }; }
  function nearOf(t) {
    var c = { outer: t.outer, inner: t.inner, tick: t.tick };
    var k = Math.floor(game.random(0, 3));
    if (k === 0) c.outer = (t.outer + 1 + Math.floor(game.random(0, 2))) % 3;
    else if (k === 1) c.inner = (t.inner + 1 + Math.floor(game.random(0, 3))) % 4;
    else c.tick = 1 - t.tick;
    return c;
  }

  function buildRound(i, fixed) {
    target = fixed ? fixed.target : randomCrest();
    var n = ROWS.length * COLS;
    var answer = fixed ? fixed.answer : Math.floor(game.random(0, n));
    var nearN = fixed ? 2 : NEAR[Math.min(i, NEAR.length - 1)];
    cloths = [];
    for (var k = 0; k < n; k++) {
      var crest;
      if (k === answer) crest = target;
      else if (fixed) crest = fixed.others[k % fixed.others.length];
      else {
        do { crest = nearN > 0 ? nearOf(target) : randomCrest(); } while (same(crest, target) || (nearN <= 0 && diffCount(crest, target) < 2));
        nearN--;
      }
      var r = Math.floor(k / COLS), c = k % COLS;
      cloths.push({ crest: crest, row: r, col: c, answer: k === answer, flash: 0, glow: 0, phase: game.random(0, 6) });
    }
    if (!fixed) {
      // 紛らわしい反物の位置をばらす(答えの位置は保つ)
      for (var s = n - 1; s > 0; s--) {
        var j = Math.floor(game.random(0, s + 1));
        if (cloths[s].answer || cloths[j].answer) continue;
        var tc = cloths[s].crest; cloths[s].crest = cloths[j].crest; cloths[j].crest = tc;
      }
    }
    phase = 'peek'; phaseT = fixed ? 0.9 : PEEK[Math.min(i, PEEK.length - 1)]; picked = -1; tickDone = false;
    game.audio.tone(392, 0.12, { wave: 'triangle', volume: 0.1, slide: 120 });
  }

  function initGame() {
    round = 0; lives = LIVES; found = 0; score = 0; timeLeft = TIME_LIMIT;
    countIn = 0.8; over = false; won = false; endT = 0; freeze = 0; nodT = 0; frownT = 0;
    milestoneDone = false; prevBest = game.best;
    buildRound(0, null);
    phase = 'wait';   // 型紙は GO! の瞬間に見せる
  }

  function windAt() { return WIND[Math.min(round, WIND.length - 1)]; }
  function clothRect(cl) {
    var R = ROWS[cl.row];
    var gap = (W - 80 - COLS * R.w) / (COLS - 1);
    var x = 40 + cl.col * (R.w + gap) + (cl.row === 1 ? 10 : 0);
    return { x: x, y: R.y - R.h / 2, w: R.w, h: R.h };
  }
  function swayAt(cl, frac) {
    var t = game.time.elapsed;
    return Math.sin(t * 2.2 + cl.phase) * 26 * windAt() * Math.pow(frac, 1.4);
  }

  // 押して確かめる(本番・デモ共通)
  function choose(i) {
    if (phase !== 'search' || i < 0) return 'busy';
    var cl = cloths[i];
    picked = i;
    var r = clothRect(cl);
    var cx = r.x + r.w / 2 + swayAt(cl, 0.5), cy = r.y + r.h * 0.5;
    if (cl.answer) {
      cl.glow = 1; phase = 'reveal'; phaseT = 0.5;
      var quick = Math.max(0, phaseT2 / SEARCH[Math.min(round, SEARCH.length - 1)]);
      if (state === S.PLAYING) {
        found++;
        score += 100 + Math.round(quick * 150);
        nodT = 0.6;
        game.feedback.good(cx, cy - r.h * 0.4, { text: quick > 0.55 ? 'PERFECT' : 'GOOD', color: C.good, size: 60 });
        if (!milestoneDone && found === 3) {
          milestoneDone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(found + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 64 });
        }
      } else {
        game.feedback.good(cx, cy - r.h * 0.4, { text: 'GOOD', color: C.good, size: 56 });
      }
      return 'good';
    }
    cl.flash = 1;
    for (var k = 0; k < cloths.length; k++) if (cloths[k].answer) cloths[k].glow = 1;
    freeze = 0.5; phase = 'reveal'; phaseT = 0.6;
    game.feedback.bad(cx, cy, { text: 'MISS', color: C.bad });
    if (state === S.PLAYING) { lives--; frownT = 0.9; }
    return 'bad';
  }
  var phaseT2 = 0;

  function nextRound() {
    if (state !== S.PLAYING) return;
    if (lives <= 0) { over = true; won = false; finish(); return; }
    round++;
    if (round >= ROUNDS) { over = true; won = true; finish(); return; }
    buildRound(round, null);
  }

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(140, 940), game.random(500, 1300), { color: i % 2 ? C.white : C.gold, count: 20, speed: 440 });
    }
  }

  function stepYard(dt) {
    for (var i = 0; i < cloths.length; i++) {
      if (cloths[i].flash > 0 && freeze <= 0) cloths[i].flash = Math.max(0, cloths[i].flash - dt * 2);
      if (cloths[i].glow > 0 && phase !== 'reveal') cloths[i].glow = Math.max(0, cloths[i].glow - dt * 2);
    }
    if (nodT > 0) nodT -= dt;
    if (frownT > 0) frownT -= dt;
    if (phase === 'peek') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'search'; phaseT2 = SEARCH[Math.min(round, SEARCH.length - 1)]; game.audio.play('se_jump', 0.25); }
    } else if (phase === 'search') {
      phaseT2 -= dt;
      if (!tickDone && phaseT2 < 0.6) { tickDone = true; game.audio.tone(1240, 0.05, { wave: 'square', volume: 0.09 }); }
      if (phaseT2 <= 0) {
        for (var k = 0; k < cloths.length; k++) if (cloths[k].answer) { cloths[k].glow = 1; cloths[k].flash = 1; }
        freeze = 0.5; phase = 'reveal'; phaseT = 0.6;
        game.feedback.bad(W / 2, H * 0.47, { text: 'MISS', color: C.bad });
        if (state === S.PLAYING) { lives--; frownT = 0.9; }
      }
    } else if (phase === 'reveal') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'done'; nextRound(); }
    }
  }

  // ── 描画 ──
  function drawCrest(cr, x, y, s, col, bg) {
    if (cr.outer === 0) { game.draw.circle(x, y, 46 * s, col); game.draw.circle(x, y, 38 * s, bg); }
    else if (cr.outer === 1) { game.draw.rect(x - 44 * s, y - 44 * s, 88 * s, 88 * s, col); game.draw.rect(x - 36 * s, y - 36 * s, 72 * s, 72 * s, bg); }
    else game.draw.sprite(DIAMOND, { '#': col }, x, y, 11 * s, { anchor: 'center' });
    if (cr.inner === 0) { game.draw.circle(x, y - 14 * s, 9 * s, col); game.draw.circle(x - 13 * s, y + 10 * s, 9 * s, col); game.draw.circle(x + 13 * s, y + 10 * s, 9 * s, col); }
    else if (cr.inner === 1) { game.draw.rect(x - 22 * s, y - 5 * s, 44 * s, 10 * s, col); game.draw.rect(x - 5 * s, y - 22 * s, 10 * s, 44 * s, col); }
    else if (cr.inner === 2) game.draw.sprite(HEMP, { '#': col }, x, y, 8 * s, { anchor: 'center' });
    else { game.draw.rect(x - 22 * s, y - 12 * s, 44 * s, 8 * s, col); game.draw.rect(x - 22 * s, y + 4 * s, 44 * s, 8 * s, col); }
    if (cr.tick) game.draw.rect(x - 6 * s, y - 64 * s, 12 * s, 14 * s, col);
  }

  function drawCloth(cl) {
    var r = clothRect(cl), R = ROWS[cl.row];
    var t = game.time.elapsed;
    var sc = cl.flash > 0 ? 1 + cl.flash * 0.15 : 1;
    // 竿
    game.draw.rect(r.x - 20, r.y - 12, r.w + 40, 10, C.pole);
    // 反物: 横ストリップで塗る面(折り目で2トーン)+頂点ジッター
    var step = 8;
    for (var yy = 0; yy < r.h; yy += step) {
      var frac = yy / r.h;
      var dx = swayAt(cl, frac) + (Math.floor(t * 8 + cl.phase * 10) % 3 - 1) * 0.8;
      var w = r.w * sc;
      var x0 = r.x + r.w / 2 - w / 2 + dx;
      var fold = Math.sin(t * 2.2 + cl.phase + frac * 3) > 0;
      game.draw.rect(x0, r.y + yy, w * 0.5, step, fold ? C.indigoHi : C.indigo);
      game.draw.rect(x0 + w * 0.5, r.y + yy, w * 0.5, step, fold ? C.indigo : C.indigoLo);
    }
    var cx = r.x + r.w / 2 + swayAt(cl, 0.5), cy = r.y + r.h * 0.52;
    var cs = R.w / 210 * sc;
    var showCrest = (phase !== 'peek' && phase !== 'wait') || state === S.RESULT;
    if (showCrest) drawCrest(cl.crest, cx, cy, cs, C.white, C.indigo);
    else game.draw.circle(cx, cy, 30 * cs, C.indigoLo);
    if (R.fog > 0) game.draw.rect(r.x - 30, r.y - 12, r.w + 60, r.h + 14, C.fog, R.fog * 0.6);
    if (cl.glow > 0) {
      game.draw.rect(r.x - 10, r.y - 10, 8, r.h + 20, C.gold, cl.glow);
      game.draw.rect(r.x + r.w + 2, r.y - 10, 8, r.h + 20, C.gold, cl.glow);
    }
    if (cl.flash > 0) game.draw.rect(r.x - 10 + swayAt(cl, 0.5), r.y, r.w + 20, r.h, '#ffffff', cl.flash * 0.45);
  }

  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.22, C.sky2], [0.79, C.fog], [0.8, C.ground], [1, '#1a140c']]);
    // 遠景: 工房の屋根(低ポリの台形)
    for (var b = 0; b < 4; b++) {
      var bx = b * 300 - 40, bw = 280, bh = 80;
      for (var y = 0; y < bh; y += 8) game.draw.rect(bx + (bh - y) * 0.6, 470 + y, bw - (bh - y) * 1.2, 8, '#2e4466');
    }
    // 風の筋
    for (var k = 0; k < 8; k++) {
      var wx = ((k * 211 + t * 260 * (0.5 + (state === S.PLAYING ? windAt() : 0.5))) % (W + 300)) - 150;
      game.draw.rect(wx, 640 + k * 110, 120, 3, C.white, 0.12);
    }
    // 手前: 藍甕
    for (var v = 0; v < 5; v++) {
      var vx = 110 + v * 215, vy = Math.round(H * 0.88);
      game.draw.rect(vx - 70, vy - 30, 140, 110, '#3a2a1a');
      game.draw.rect(vx - 60, vy - 26, 120, 16, '#10204a');
      game.draw.rect(vx - 40, vy - 22, 30, 6, C.indigoHi, 0.6 + 0.3 * Math.sin(t * 3 + v));
    }
  }

  function drawMaster() {
    var t = game.time.elapsed;
    var f = frownT > 0 ? MASTER[3] : nodT > 0 ? MASTER[2] : (phase === 'peek' ? MASTER[2] : MASTER[Math.floor(t * 1.4) % 5 === 4 ? 1 : 0]);
    if (state === S.RESULT) f = won ? MASTER[2] : MASTER[3];
    var mx = W * 0.17, my = H * 0.17;
    game.draw.sprite(f, MASTER_PAL, mx, my + Math.sin(t * 2.5) * 4, 13, { anchor: 'center' });
    // 型紙の板: 覗き見の間だけ紋が見える
    var bx = W * 0.56, by = H * 0.17;
    game.draw.rect(bx - 150, by - 115, 300, 230, '#c8a870');
    game.draw.rect(bx - 136, by - 101, 272, 202, phase === 'peek' ? C.indigo : '#8a7048');
    if (phase === 'peek' || (phase === 'reveal' && state !== S.ATTRACT) || state === S.RESULT) drawCrest(target, bx, by, 1.4, C.white, phase === 'peek' ? C.indigo : '#8a7048');
    else {
      for (var i = 0; i < 4; i++) game.draw.rect(bx - 120, by - 80 + i * 44, 240, 18, '#a88a58');
    }
    if (phase === 'peek') {
      var frac = Math.max(0, phaseT / PEEK[Math.min(round, PEEK.length - 1)]);
      game.draw.rect(bx - 136, by + 108, 272 * frac, 10, C.gold);
    }
  }

  function hud() {
    cry(String(score), 150, 70, 52, C.white);
    cry(found + ' / ' + NEEDED, W - 150, 70, 44, C.white);
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(W / 2 - 60 + i * 60, 70, 20, C.ink);
      game.draw.circle(W / 2 - 60 + i * 60, 70, 15, i < lives ? C.indigoHi : '#333a48');
    }
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(100, 128, W - 200, 10, '#ffffff22');
    game.draw.rect(100, 128, (W - 200) * frac, 10, C.white);
    if (phase === 'search') {
      var sf = Math.max(0, phaseT2 / SEARCH[Math.min(round, SEARCH.length - 1)]);
      var warn = phaseT2 < 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.rect(60, Math.round(H * 0.8), (W - 120) * sf, 16, warn ? C.bad : C.gold);
    }
  }

  function drawWorld() {
    drawYard(); drawMaster();
    for (var i = 0; i < cloths.length; i++) drawCloth(cloths[i]);
  }

  // ── 入力 ──
  function clothAt(x, y) {
    for (var i = cloths.length - 1; i >= 0; i--) {
      var r = clothRect(cloths[i]);
      var dx = swayAt(cloths[i], Math.max(0, Math.min(1, (y - r.y) / r.h)));
      if (x > r.x + dx - 14 && x < r.x + r.w + dx + 14 && y > r.y - 10 && y < r.y + r.h + 10) return i;
    }
    return -1;
  }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.n = -1; return; }
    if (over || countIn > 0 || freeze > 0 || phase !== 'search') { game.audio.play('se_tap', 0.06); return; }
    var i = clothAt(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.15);
    choose(i);
  });

  // ── ATTRACT: 型紙を一瞬見せる → 同じ紋の一反を押す周 / 1か所違いの紋を押して失敗する周 ──
  var DEMO_T = { outer: 0, inner: 1, tick: 1 };
  var DEMO_ROUND = {
    target: DEMO_T, answer: 6,
    others: [{ outer: 1, inner: 1, tick: 1 }, { outer: 0, inner: 1, tick: 0 }, { outer: 2, inner: 0, tick: 1 }, { outer: 0, inner: 3, tick: 1 }, { outer: 1, inner: 2, tick: 0 }],
  };
  var demo = { t: 0, n: -1, gx: W / 2, gy: H * 0.9, press: false, want: 6, done: false };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      demo.n++; round = 0; freeze = 0;
      buildRound(0, DEMO_ROUND);
      demo.want = demo.n % 2 === 0 ? 6 : 11;   // 11 = 外枠と柄は同じで上の切れ込みだけ無い紋
      demo.done = false;
    }
    if (freeze > 0) freeze -= dt;
    else { stepYard(dt); if (phase === 'done') phase = 'idle'; }
    var r = clothRect(cloths[demo.want]);
    var tx = r.x + r.w / 2 + swayAt(cloths[demo.want], 0.6), ty = r.y + r.h * 0.6;
    demo.press = false;
    if (phase === 'search' && !demo.done) {
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6); demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
      if (cyc > 1.75) demo.press = true;
      if (cyc > 1.85) { demo.done = true; choose(demo.want); }
    } else if (!demo.done) {
      demo.gx += (W * 0.56 - demo.gx) * Math.min(1, dt * 3); demo.gy += (H * 0.3 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cloths) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      cry(GAME_TITLE, W / 2, H * 0.035, 72, C.white);
      cry('HI-SCORE ' + game.best, W / 2, H * 0.067, 32, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) cry('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else cry('TAP TO START', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(120, H * 0.4, W - 240, 360, C.ink, 0.75);
      cry(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.44, 92, won ? C.gold : C.bad);
      cry('SCORE ' + score, W / 2, H * 0.5, 54, C.white);
      if (score > prevBest && prevBest > 0) cry('NEW RECORD', W / 2, H * 0.55, 50, C.gold);
      else cry('BEST ' + Math.max(prevBest, score), W / 2, H * 0.55, 40, C.white);
      if (!won) cry('あと' + (NEEDED - found) + '反!', W / 2, H * 0.59, 46, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) cry('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { found: found, lives: lives, rounds: Math.min(ROUNDS, round + 1) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) { game.audio.play('se_tap', 0.3); buildRound(0, null); }
    } else if (freeze > 0) {
      freeze -= dt;
    } else if (!over) {
      if (phase === 'search') timeLeft -= dt;
      stepYard(dt);
      if (!over && timeLeft <= 0) {
        timeLeft = 0; over = true; won = false;
        game.feedback.bad(W / 2, H * 0.47, { text: 'TIME UP', color: C.bad });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) cry(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 1], ['F5', 0.5], ['E5', 0.5], ['D5', 1], ['A4', 1],
      ['C5', 0.5], ['D5', 0.5], ['F5', 1], ['E5', 2],
    ], { tempo: 104, wave: 'triangle', volume: 0.055, loop: true, bass: [['D3', 2], ['A2', 2], ['C3', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

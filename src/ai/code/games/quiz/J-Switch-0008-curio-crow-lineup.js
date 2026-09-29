// J-Switch-0008-curio-crow-lineup.js
// 骨董棚のカラス泥棒 — 灯りが消えた一瞬にカラスが棚の品を一つくすねる。巣の山の中から、消えた品を見つけてタップで取り返す
// 操作: 灯りがついている間に棚の並びを覚える。暗転のあと、下の巣に積まれたがらくたの中から棚から消えた品をタップ(社内メモ。画面には出さない)
// 終わり: 3回取り返せばCLEAR。取り違え/見つけられないまま時間切れ(1回3秒)が2回/全体の時間切れでGAME OVER
// @mechanic: spot
// @theme: night_curio_crow_theft
// 世界観: 夜更けの骨董屋、ランプの灯が揺らいで消えるたび、窓から入り込むカラスが棚の品を一つくわえて巣へ持ち去る。店番の少年は巣に積まれたがらくたの山から、盗られた品だけを見つけ出して取り返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 取り返した数・取り違え数・最速の見つけ秒
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り。半透明円の重ねでブルーム、四隅を落とすビネット
  var STYLE = { bg: ['#1c1612', '#3a2e24', '#5a4a3a'], main: ['#a89070', '#8a7a6a', '#6a5a4a'], accent: ['#ffcf7a', '#d86a4a'] };
  var C = {
    bg1: '#16110e', bg2: '#3a2e24', wood: '#5a4230', woodL: '#7a5a40', woodD: '#2e2218', lamp: '#ffcf7a', glow: '#ffb85a',
    ink: '#0c0806', white: '#f2eadc', bad: '#d86a4a', good: '#9ad88a', nest: '#4a3a28', twig: '#6a5238', crow: '#141418'
  };

  var GAME_TITLE = 'CURIO CROW';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var MAX_MISS = 2;
  var SHOW_T = 1.25, DIM_T = 0.45, ASK_T = 3.0;
  var SHELF_Y = H * 0.36;

  // 品(形+低彩度の色)
  var CURIOS = [
    { a: ['..kk..', '.kttk.', 'kttttk', 'ktTttk', 'kttttk', '.kkkk.'], p: { t: '#8aa0a8', T: '#c8d4d8' } },
    { a: ['.kkkk.', 'kccccK', 'kcKccK', 'kccKcK', 'kcccck', '.kkkk.'], p: { c: '#d8c8a0', K: '#6a5a4a' } },
    { a: ['..kk..', '..vv..', '.vvvv.', 'vvVvvv', '.vvvv.', '..vv..'], p: { v: '#6a8a6a', V: '#a8c8a0' } },
    { a: ['.kk...', 'k..k..', '.kkyyy', '....y.', '...yy.', '......'], p: { y: '#c8a050' } },
    { a: ['..ll..', '.llll.', '..rr..', '.rRRr.', '.rrrr.', 'rrrrrr'], p: { l: '#ffcf7a', r: '#8a6a4a', R: '#b08a5a' } },
    { a: ['bbbbb.', 'bBBBb.', 'bBBBbw', 'bBBBbw', 'bbbbbw', '......'], p: { b: '#7a4a4a', B: '#a86a5a', w: '#e8dcc0' } },
    { a: ['.mmmm.', 'mwmmwm', 'mmmmmm', 'mmmmmm', '.mkkm.', '..mm..'], p: { m: '#a08a70', w: '#1c1612' } },
    { a: ['..nn..', '.nNNn.', 'nNsNNn', 'nNNsNn', '.nNNn.', '..nn..'], p: { n: '#8a7a50', N: '#c8b890', s: '#d86a4a' } },
    { a: ['..gg..', '.gggg.', 'gggggg', 'gggggg', '..gg..', '.gggg.'], p: { g: '#b0905a' } },
    { a: ['...f..', '..ff..', '..ww..', '..ww..', '..ww..', '.wwww.'], p: { f: '#ffcf7a', w: '#e8dcc0' } }
  ];
  var SIZES = [4, 5, 6];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, round, found, misses, sub, subT, shelf, stolen, cands, pick, hitStop, outro, ok, fastest, halfShown, crowX, answerFx;

  var CROW = [
    ['.....kk...', '....kkkk..', 'kk.kkykkbb', '.kkkkkkk..', '..kkkkk...', '...k.k....'],
    ['kk...kk...', '.kk.kkkk..', '..kkkykkbb', '..kkkkkk..', '...kkkk...', '...k.k....']
  ];
  var BOY = [
    ['..hhh..', '.hhhhh.', '..fff..', '..fkf..', '.ccccc.', 'c.ccc.c', '..c.c..', '.k...k.'],
    ['..hhh..', '.hhhhh.', '..fff..', '..fkf..', 'ccccccc', '..ccc..', '..c.c..', '..k.k..']
  ];
  var LAMP = ['..l..', '.lll.', '.lll.', 'kkkkk', '.k.k.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)) % (i + 1); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  function newRound() {
    var n = SIZES[Math.min(SIZES.length - 1, round)];
    var ids = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    shelf = ids.slice(0, n);
    var si = Math.floor(game.random(0, n)) % n;
    stolen = shelf[si];
    // 巣の山: 盗られた品 + 棚に残っている品の一部 + 棚になかった品
    var pool = [stolen];
    for (var i = 0; i < n; i++) if (i !== si && pool.length < 5) pool.push(shelf[i]);
    for (var k = n; k < 10 && pool.length < 8; k++) pool.push(ids[k]);
    shuffle(pool);
    cands = [];
    for (var c = 0; c < pool.length; c++) {
      cands.push({ id: pool[c], x: W * 0.17 + (c % 4) * W * 0.22, y: H * 0.61 + Math.floor(c / 4) * H * 0.1 + (c % 2) * 18 });
    }
    sub = 'show'; subT = SHOW_T; pick = null; crowX = -200; answerFx = null;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; round = 0; found = 0; misses = 0;
    hitStop = 0; outro = 0; ok = false; fastest = 99; halfShown = false;
    newRound();
  }

  function remainShelf() {
    var out = [];
    for (var i = 0; i < shelf.length; i++) if (shelf[i] !== stolen) out.push(shelf[i]);
    return out;
  }

  // 1回分の流れ(実プレイ・デモ共用)
  function stepRound(dt, isDemo) {
    subT -= dt;
    if (answerFx) { answerFx.t -= dt; }
    if (sub === 'show' && subT <= 0) {
      sub = 'dim'; subT = DIM_T; crowX = -200;
      if (!isDemo) game.audio.tone('A2', 0.3, { wave: 'sawtooth', volume: 0.04, slide: -40 });
    } else if (sub === 'dim') {
      crowX += dt * (W + 400) / DIM_T;
      if (subT <= 0) { sub = 'ask'; subT = ASK_T; if (!isDemo) game.audio.play('se_jump', 0.25); }
    } else if (sub === 'ask' && subT <= 0) {
      answer(null, isDemo);
    } else if (sub === 'reveal' && subT <= 0) {
      if (isDemo) { round = (round + 1) % 3; newRound(); return; }
      if (phase === 'play') { round++; newRound(); }
    }
  }

  // 答える(実プレイ・デモ共用)。c=null は時間切れ
  function answer(c, isDemo) {
    if (sub !== 'ask') return null;
    var right = c && c.id === stolen;
    pick = c;
    var took = ASK_T - subT;
    sub = 'reveal'; subT = 0.8;
    var target = null;
    for (var i = 0; i < cands.length; i++) if (cands[i].id === stolen) target = cands[i];
    answerFx = { t: 0.8, right: right, x: target.x, y: target.y };
    if (isDemo) { game.fx.burst(target.x, target.y, { color: right ? C.lamp : C.bad, count: 10, speed: 220 }); return right; }
    if (right) {
      found++;
      if (took < fastest) fastest = took;
      game.feedback.good(target.x, target.y - 110, { text: took < 1 ? 'PERFECT' : 'GOOD', color: C.lamp, count: 16 });
      game.audio.play('se_coin', 0.35);
      if (!halfShown && found >= 1 && found < NEEDED) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(found + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.lamp, size: 64 });
      }
      if (found >= NEEDED) finish(true);
      return true;
    }
    misses++;
    if (misses >= MAX_MISS) { finish(false); return false; }
    hitStop = 0.45;
    game.feedback.bad(c ? c.x : W / 2, (c ? c.y : H * 0.6) - 110, { text: 'MISS', color: C.bad });
    return false;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.lamp, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, H * 0.5, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  function candAt(x, y) {
    var best = null, bd = 95;
    for (var i = 0; i < cands.length; i++) {
      var d = Math.hypot(x - cands[i].x, y - cands[i].y);
      if (d < bd) { bd = d; best = cands[i]; }
    }
    return best;
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    var c = sub === 'ask' ? candAt(x, y) : null;
    if (c) { game.audio.play('se_tap', 0.3); answer(c, false); }
    else game.audio.tone('D3', 0.04, { wave: 'triangle', volume: 0.03 });
  });

  // ── demo(盗られた品を見つけて指す。3回目は棚に残っている品を取り違える)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 12;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.n = 0; newRound(); }
    stepRound(dt, true);
    demo.press = false;
    if (sub === 'ask') {
      var wrong = demo.n % 3 === 2;
      var aim = null;
      for (var i = 0; i < cands.length; i++) {
        var isS = cands[i].id === stolen;
        if ((!wrong && isS) || (wrong && !isS && !aim)) aim = cands[i];
      }
      var k = Math.min(1, dt * 5);
      demo.gx += (aim.x - demo.gx) * k; demo.gy += (aim.y + 30 - demo.gy) * k;
      if (ASK_T - subT > 0.9) { demo.press = true; answer(aim, true); demo.n++; }
    } else if (sub === 'show') {
      var sx = W * 0.5 + Math.sin(demo.t * 3) * W * 0.3;
      demo.gx += (sx - demo.gx) * Math.min(1, dt * 4); demo.gy += (SHELF_Y + 140 - demo.gy) * Math.min(1, dt * 4);
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function lit() { return sub === 'show' || sub === 'ask' || sub === 'reveal'; }

  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.4, C.bg2], [1, C.bg1]]);
    // 奥の棚板と窓(一枚絵の奥行き)
    for (var r = 0; r < 3; r++) game.draw.rect(60, H * 0.14 + r * 50, W - 120, 10, C.woodD);
    game.draw.rect(W * 0.72, H * 0.13, 200, 150, '#2a3a4a');
    game.draw.circle(W * 0.72 + 150, H * 0.13 + 40, 26, C.white, 0.5);
    // 手前の棚(品が並ぶ)
    game.draw.rect(40, SHELF_Y + 70, W - 80, 30, C.woodL);
    game.draw.rect(40, SHELF_Y + 100, W - 80, 20, C.woodD);
    // ランプのブルーム(半透明円の重ね)
    var flick = lit() ? 1 : 0.15;
    var fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7);
    for (var b = 0; b < 4; b++) game.draw.circle(W / 2, H * 0.24, 120 + b * 110, C.glow, 0.06 * flick * fl);
    game.draw.sprite(LAMP, { l: lit() ? C.lamp : C.woodD, k: C.woodD }, W / 2, H * 0.24, 16, { anchor: 'center' });
    // 巣(下の山)
    game.draw.circle(W / 2, H * 0.72, 500, C.nest, 0.9);
    for (var tw = 0; tw < 16; tw++) {
      var a = tw * 0.39;
      game.draw.line(W / 2 + Math.cos(a) * 480, H * 0.72 + Math.sin(a) * 120 - 60, W / 2 + Math.cos(a + 1.3) * 470, H * 0.72 + Math.sin(a + 1.3) * 130 - 60, C.twig, 8);
    }
    game.draw.rect(0, 0, W, H, C.lamp, 0.015 + 0.015 * Math.sin(t * 1.3));
  }

  function drawShelf() {
    var t = game.time.elapsed;
    var items = sub === 'show' ? shelf : remainShelf();
    if (sub === 'dim') items = shelf;
    var n = items.length;
    var gap = (W - 160) / n;
    for (var i = 0; i < n; i++) {
      var cx = 80 + gap * (i + 0.5);
      var cu = CURIOS[items[i]];
      var pal = { k: C.ink }; for (var key in cu.p) pal[key] = cu.p[key];
      game.draw.sprite(cu.a, pal, cx, SHELF_Y + 20 + Math.sin(t * 2 + i) * 3, 16, { anchor: 'center', alpha: sub === 'dim' ? 0.25 : 1 });
    }
    if (sub === 'dim') {
      game.draw.rect(0, 225, W, H * 0.4, C.ink, 0.7);
      game.draw.sprite(CROW[Math.floor(t * 12) % 2], { k: C.crow, y: C.lamp, b: '#6a6a6a' }, crowX, SHELF_Y - 40 + Math.sin(t * 20) * 10, 18, { anchor: 'center' });
    }
  }

  function drawNest() {
    var t = game.time.elapsed;
    if (sub !== 'ask' && sub !== 'reveal') {
      for (var d = 0; d < 6; d++) game.draw.circle(W * 0.2 + d * 130, H * 0.66 + Math.sin(t + d) * 6, 30, C.twig, 0.6);
      return;
    }
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      var cu = CURIOS[c.id];
      var pal = { k: C.ink }; for (var key in cu.p) pal[key] = cu.p[key];
      var isAns = answerFx && c.id === stolen;
      var isPick = pick === c;
      if (isAns && Math.floor(t * 12) % 2 === 0) game.draw.circle(c.x, c.y, 100, answerFx.right ? C.lamp : C.white, 0.4);
      if (isPick && !answerFx.right) game.draw.circle(c.x, c.y, 90, C.bad, 0.35);
      game.draw.rect(c.x - 60, c.y + 60, 120, 14, C.ink, 0.35);
      game.draw.sprite(cu.a, pal, c.x, c.y + Math.sin(t * 3 + i) * 4, isAns ? 18 : 15, { anchor: 'center' });
    }
    if (sub === 'ask') {
      var p = Math.max(0, subT / ASK_T);
      game.draw.rect(W * 0.2, H * 0.53, W * 0.6, 14, C.woodD);
      game.draw.rect(W * 0.2, H * 0.53, W * 0.6 * p, 14, p < 0.3 ? C.bad : C.lamp);
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.84, W, H * 0.16, C.bg1, 0.85);
    game.draw.sprite(BOY[Math.floor(t * 2) % 2], { h: '#3a2a1a', f: '#d8b890', k: C.ink, c: '#5a6a7a' }, W * 0.14, H * 0.9 + Math.sin(t * 2.4) * 5, 14, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W * 0.42 + i * 90, H * 0.9, 26, i < found ? C.lamp : C.woodD);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W * 0.76 + m * 80, H * 0.89, 50, 20, m < misses ? C.bad : C.woodD);
    // ビネット
    game.draw.rect(0, 0, 40, H, C.ink, 0.5); game.draw.rect(W - 40, 0, 40, H, C.ink, 0.5);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.75);
    txt(found + ' / ' + NEEDED, W / 2, 90, 66, C.lamp);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.woodD);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.lamp);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawShop(); drawShelf(); drawNest(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.75);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.lamp);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 40, C.lamp);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawShop(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.lamp : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepRound(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = found * 300 + Math.max(0, MAX_MISS - misses) * 60 + Math.round(timeLeft * 10);
        var stats = { found: found, misses: misses, fastest: fastest < 99 ? Math.round(fastest * 10) / 10 : 0 };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawShop(); drawShelf(); drawNest(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, C.lamp);
    if (phase === 'outro') {
      var sc = found * 300 + Math.max(0, MAX_MISS - misses) * 60 + Math.round(timeLeft * 10);
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.ink, 0.88);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.lamp : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.lamp);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - found) + '個!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['F#4', 0.5], ['E4', 1], ['B3', 1],
      ['C4', 1], ['E4', 0.5], ['D4', 0.5], ['B3', 2]
    ], { tempo: 88, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['E2', 2], ['A2', 2], ['B2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

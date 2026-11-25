// I-DS-0010v2-museum-sherd-pairs.js
// 整理室の割れ目合わせ — 伏せた土器片を2枚ずつめくり、割れ目の凸凹がぴったり噛み合う対を見つけて貼り合わせる
// 操作: 伏せた破片をタップしてめくる。2枚めくって割れ目と釉の帯が噛み合えば貼り合わさり、違えば伏せ直る(社内メモ)
// 終わり: 3つの台(4→6→8枚)の破片を時間内にすべて貼り合わせれば成功。時間切れで失敗(めくり違いは持ち時間を削る)
// @mechanic: pair_match
// @theme: museum_sherd_pairing
// 世界観: 博物館の整理室で、整理係が作業台に伏せた土器のかけらをめくり、割れ目の凸凹が噛み合う対を探して貼り合わせ、壺を組み直していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 貼り合わせた対の数・めくり違い数・最大連続一致
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 板(sprite)のまま距離でpxを変え、真下に楕円の接地影。奥ほど彩度を落とす
  var STYLE = { bg: ['#e6dccb', '#b9ab92', '#5e5446'], main: ['#c4643a', '#3a5f8a', '#6f9a6a'], accent: ['#f2c14e', '#ffffff'] };
  var K = {
    wallTop: STYLE.bg[0], wallLow: STYLE.bg[1], floor: STYLE.bg[2],
    wood: '#9a7650', woodLight: '#b48c62', woodDark: '#5e4430',
    clay: '#e8c49a', ink: '#2a2018', gold: STYLE.accent[0], white: STYLE.accent[1],
    red: '#d8402c', green: '#3fae5a', shadow: '#2a2018', fog: '#cfc6b4',
  };
  var GLAZE = [
    { G: STYLE.main[0], B: '#f4dcae', R: '#8a3e20' },
    { G: STYLE.main[1], B: '#e6eef6', R: '#22405e' },
    { G: STYLE.main[2], B: '#f6ecbe', R: '#46663f' },
    { G: '#8a4a7a', B: '#f2c14e', R: '#5a2a50' },
  ];
  // 割れ目の凸凹(行ごとの食い込み量)。Lは右端、Rは左端がこの形で、合わさると隙間なく噛み合う
  var EDGES = [
    [0, 1, 2, 1, 0, 1, 2],
    [2, 1, 0, 0, 1, 2, 2],
    [1, 2, 2, 1, 0, 0, 1],
    [0, 0, 1, 2, 2, 1, 0],
    [2, 0, 2, 0, 2, 0, 2],
  ];

  var GAME_TITLE = 'SHERD PAIRS';
  var TIME_LIMIT = 20;
  var ROUND_SIZES = [4, 6, 8];
  var PEEK = [1.1, 0.9, 0.7];
  var NEEDED = 9;
  var PENALTY = 1.5;
  var JOIN_PX = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var cards, picks, judgeT, rejectT, rejected, peekT, round, pairsDone, misses, combo, maxCombo;
  var timeLeft, score, getReady, freeze, cleared, ending, resultT, endSent, gap, shelf, between;
  var halfShown, roundMiss, mood, tickAcc, lastJoin;

  // ---- ビットマップ ----
  function buildHalf(edge, side) {
    var rows = [];
    for (var r = 0; r < 7; r++) {
      var s = '';
      for (var c = 0; c < 7; c++) {
        var fill, isEdge, joined;
        if (side === 'L') {
          var lim = 3 + edge[r];
          fill = c <= lim; isEdge = c === lim; joined = c;
          if ((r === 0 || r === 6) && c === 0) fill = false;
        } else {
          fill = c >= edge[r]; isEdge = c === edge[r]; joined = c + 4;
          if ((r === 0 || r === 6) && c === 6) fill = false;
        }
        var ch = '.';
        if (fill) {
          if (isEdge) ch = 'E';
          else if (r === 0) ch = 'R';
          else if (r === 2) ch = 'B';
          else if (r === 3) ch = joined % 2 === 0 ? 'B' : 'G';
          else ch = 'G';
        }
        s += ch;
      }
      rows.push(s);
    }
    return rows;
  }
  var HALVES = [];
  for (var ei = 0; ei < EDGES.length; ei++) HALVES.push({ L: buildHalf(EDGES[ei], 'L'), R: buildHalf(EDGES[ei], 'R') });

  var BACK = ['.ddddd.', 'dkkkkkd', 'dkkxkkd', 'dkkkkkd', 'dkxkkkd', 'dkkkkxd', '.ddddd.'];
  var BACK_PAL = { d: '#8c745a', k: '#b39a7c', x: '#9a8266' };
  var RIM_PAL = { d: '#ffffff', k: '#ffffff', x: '#ffffff' };

  var KEEPER_A = [
    '...hhhh...', '..hhhhhh..', '..hffffh..', '..gwfgwg..', '...ffff...', '....ff....',
    '..aaaaaa..', '.aaaaaaaa.', 'fa.aaaa.af', '...aaaa...', '...a..a...', '...k..k...',
  ];
  var KEEPER_B = [
    '...hhhh...', '..hhhhhh..', '..hffffh..', '..gffgfg..', '...ffff...', '....ff....',
    '..aaaaaa..', '.aaaaaaaa.', 'fa.aaaa.af', '...aaaa...', '...a..a...', '...k..k...',
  ];
  var KEEPER_JOY = [
    'f..hhhh..f', 'a.hhhhhh.a', 'a.hffffh.a', 'aagwfgwgaa', '..fmmmmf..', '....ff....',
    '..aaaaaa..', '..aaaaaa..', '...aaaa...', '...aaaa...', '..a....a..', '..k....k..',
  ];
  var KEEPER_SAD = [
    '..........', '...hhhh...', '..hhhhhh..', '..hffffh..', '..gffgfg..', '...fmmf...',
    '.faaaaaaf.', '.aaaaaaaa.', '...aaaa...', '...aaaa...', '...a..a...', '...k..k...',
  ];
  var KEEPER_PAL = { h: '#4a3426', f: '#f0c8a0', g: '#2a2018', w: '#ffffff', a: '#5a7a9a', k: '#2a2018', m: '#a0402a' };
  var GLUE = ['..bb..', '..bb..', '.wwww.', 'pppppp', 'pyyyyp', 'pppppp', '.pppp.'];
  var GLUE_PAL = { b: '#7a5a3a', w: '#f4f0e8', p: '#5a7a9a', y: '#f2c14e' };
  var URN = ['.rr.', 'gggg', '.gg.', 'gggg', 'gggg', '.gg.'];

  function say(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: K.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      if (j > i) j = i;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function oval(x, y, rx, ry, col, a) {
    for (var k = -ry; k <= ry; k += 3) {
      var w = rx * Math.sqrt(Math.max(0, 1 - (k * k) / (ry * ry)));
      game.draw.rect(x - w, y + k, w * 2, 3, col, a);
    }
  }

  // ---- 台の上の配置(奥の段ほど小さく) ----
  function spotsFor(n) {
    var rows = n === 4 ? [2, 2] : n === 6 ? [3, 3] : [2, 3, 3];
    var ys = rows.length === 2 ? [H * 0.46, H * 0.62] : [H * 0.39, H * 0.515, H * 0.645];
    var pxs = rows.length === 2 ? [16, 20] : [13, 16.5, 20];
    var out = [];
    for (var r = 0; r < rows.length; r++) {
      for (var i = 0; i < rows[r]; i++) {
        out.push({ x: W / 2 + (i - (rows[r] - 1) / 2) * pxs[r] * 17, y: ys[r], px: pxs[r], depth: r / (rows.length - 1) });
      }
    }
    return out;
  }

  function placeDeck(deck) {
    var spots = spotsFor(deck.length);
    cards = [];
    for (var i = 0; i < deck.length; i++) {
      var d = deck[i], s = spots[i];
      cards.push({ pair: d.pair, side: d.side, e: d.e, g: d.g, x: s.x, y: s.y, px: s.px, depth: s.depth, up: true, gone: false, lift: 0, shake: 0, join: null, flash: 0 });
    }
    picks = []; judgeT = 0; rejectT = 0; rejected = null; between = 0;
  }

  function deal(rn) {
    var n = ROUND_SIZES[rn], pn = n / 2;
    var edges = shuffle([0, 1, 2, 3, 4]);
    var glazes = shuffle([0, 1, 2, 3]);
    var specs = [];
    for (var p = 0; p < pn; p++) specs.push({ e: edges[p], g: glazes[p % 4] });
    if (rn === 2) specs[1].g = specs[0].g; // 同じ釉で割れ目だけ違う紛らわしい対
    var deck = [];
    for (var q = 0; q < specs.length; q++) {
      deck.push({ pair: q, side: 'L', e: specs[q].e, g: specs[q].g });
      deck.push({ pair: q, side: 'R', e: specs[q].e, g: specs[q].g });
    }
    placeDeck(shuffle(deck));
    peekT = PEEK[rn]; roundMiss = 0;
  }

  function initGame() {
    round = 0; pairsDone = 0; misses = 0; combo = 0; maxCombo = 0; score = 0;
    timeLeft = TIME_LIMIT; getReady = 0.8; freeze = 0; cleared = false; ending = false;
    resultT = 0; endSent = false; gap = null; shelf = []; halfShown = false; mood = null; tickAcc = 0; lastJoin = null;
    deal(0);
  }

  // ---- 本番とデモ共通のロジック ----
  function canFlip(c) {
    return c && !c.up && !c.gone && !c.join && peekT <= 0 && picks.length < 2 && rejectT <= 0 && between <= 0;
  }

  function flipCard(c) {
    if (!canFlip(c)) return false;
    c.up = true; c.lift = 1;
    picks.push(c);
    game.audio.tone(c.side === 'L' ? 'E5' : 'A5', 0.06, { wave: 'triangle', volume: 0.1 });
    if (picks.length === 2) judgeT = 0.42;
    return true;
  }

  function resolvePicks(live) {
    var a = picks[0], b = picks[1];
    picks = [];
    var mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 30;
    if (a.pair === b.pair) {
      var L = a.side === 'L' ? a : b, R = L === a ? b : a;
      L.join = { t: 0, fx: L.x, fy: L.y, fpx: L.px, tx: mx - 2 * JOIN_PX, ty: my };
      R.join = { t: 0, fx: R.x, fy: R.y, fpx: R.px, tx: mx + 2 * JOIN_PX, ty: my };
      combo++; if (combo > maxCombo) maxCombo = combo;
      pairsDone++;
      lastJoin = { x: mx, y: my };
      if (live) {
        score += 100 * combo;
        shelf.push({ e: L.e, g: L.g });
      }
      game.feedback.good(mx, my - 70, { text: combo > 1 ? 'x' + combo : 'GOOD', color: K.gold, size: 54 });
      mood = { k: 'joy', t: 0.8 };
      if (live && !halfShown && pairsDone >= 5) {
        halfShown = true;
        game.fx.popup('NICE', W / 2, H * 0.27, { color: K.gold, size: 80 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      a.shake = 0.55; b.shake = 0.55;
      rejected = [a, b]; rejectT = 0.6;
      combo = 0;
      gap = { x: mx, y: my + 30, t: 0.55 };
      roundMiss++;
      if (live) {
        misses++;
        timeLeft = Math.max(0.01, timeLeft - PENALTY);
      }
      game.feedback.bad(mx, my - 50, { text: live ? '-1.5' : 'MISS', shake: 6 });
      mood = { k: 'sad', t: 0.8 };
    }
  }

  function roundDone(live) {
    between = 0.9;
    game.audio.play('se_powerup', 0.45);
    var perfect = roundMiss === 0;
    game.fx.popup(perfect ? 'PERFECT' : 'CLEAR', W / 2, H * 0.31, { color: perfect ? K.gold : K.green, size: 72 });
    if (live) {
      if (perfect) score += 300;
      if (round >= ROUND_SIZES.length - 1) closeOut(true);
    }
  }

  function stepTable(dt, live) {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.lift > 0) c.lift = Math.max(0, c.lift - dt * 4);
      if (c.shake > 0) c.shake -= dt;
      if (c.flash > 0) c.flash -= dt;
      if (c.join && !c.gone) {
        c.join.t += dt;
        if (c.join.t >= 0.75) c.gone = true;
      }
    }
    if (gap) { gap.t -= dt; if (gap.t <= 0) gap = null; }
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
    if (peekT > 0) {
      peekT -= dt;
      if (peekT <= 0) {
        for (var j = 0; j < cards.length; j++) cards[j].up = false;
        game.audio.play('se_tap', 0.35);
      }
      return;
    }
    if (judgeT > 0) {
      judgeT -= dt;
      if (judgeT <= 0) resolvePicks(live);
    }
    if (rejectT > 0) {
      rejectT -= dt;
      if (rejectT <= 0 && rejected) {
        rejected[0].up = false; rejected[1].up = false; rejected = null;
        game.audio.tone('C4', 0.05, { wave: 'square', volume: 0.06 });
      }
    }
    if (between > 0) {
      between -= dt;
      if (between <= 0 && live && !ending) { round++; deal(round); }
      return;
    }
    var all = true;
    for (var k = 0; k < cards.length; k++) if (!cards[k].gone) { all = false; break; }
    if (all) roundDone(live);
  }

  function cardAt(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.gone || c.join) continue;
      var hw = Math.max(62, c.px * 5.2), hh = hw;
      if (Math.abs(x - c.x) < hw && Math.abs(y - c.y) < hh) {
        var d = Math.abs(x - c.x) + Math.abs(y - c.y);
        if (d < bd) { bd = d; best = c; }
      }
    }
    return best;
  }

  function closeOut(win) {
    if (ending) return;
    ending = true; cleared = win; freeze = 0.5;
    game.audio.stopBgm();
    if (win) {
      score += Math.round(timeLeft * 20);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.55);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!endSent) { game.audio.play('se_tap', 0.1); return; }
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
    if (ending) return;
    if (getReady > 0) { game.audio.play('se_tap', 0.08); return; }
    var c = cardAt(x, y);
    if (!c) {
      game.audio.play('se_tap', 0.08);
      game.fx.burst(x, y, { color: K.fog, count: 4, speed: 90 });
      return;
    }
    if (!flipCard(c)) {
      game.audio.tone('G3', 0.04, { wave: 'square', volume: 0.05 });
      c.shake = Math.max(c.shake, 0.15);
      return;
    }
    game.fx.burst(c.x, c.y - c.px * 3, { color: K.white, count: 5, speed: 120 });
  });

  // ---- 描画 ----
  function room() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, K.wallTop], [0.3, K.wallLow], [0.32, '#a89a80'], [1, K.floor]]);
    // 奥の収蔵棚(遠景は霞ませる)
    for (var s = 0; s < 2; s++) {
      var sy = H * 0.2 + s * 120;
      game.draw.rect(60, sy, W - 120, 12, '#8a7a64', 0.6);
      for (var u = 0; u < 9; u++) {
        game.draw.sprite(URN, { r: '#9a8a74', g: u % 3 === 0 ? '#a07a64' : '#8e8a7a' }, 120 + u * 105, sy - 34, 9, { anchor: 'center', alpha: 0.45 });
      }
    }
    // 吊りランプ(揺れ)
    var lx = W * 0.86 + Math.sin(t * 0.9) * 26;
    game.draw.line(W * 0.86, 0, lx, H * 0.26, '#5e5446', 4);
    game.draw.circle(lx, H * 0.27, 26, '#f6e6b4');
    game.draw.circle(lx, H * 0.27, 60, '#fff4cc', 0.18);
    // 作業台(奥ほど狭い台形をストリップで)
    var y0 = H * 0.33, y1 = H * 0.72;
    for (var y = y0; y < y1; y += 6) {
      var k = (y - y0) / (y1 - y0);
      var hw = 300 + 240 * k;
      game.draw.rect(W / 2 - hw, y, hw * 2, 6, Math.floor(y / 30) % 2 === 0 ? K.wood : K.woodLight);
    }
    game.draw.rect(0, y1, W, 34, K.woodDark);
    game.draw.rect(0, y1 + 34, W, 10, '#3a2a1c', 0.6);
    // 奥にフォグ
    game.draw.rect(W / 2 - 300, y0, 600, 40, K.fog, 0.35);
  }

  function drawCard(c) {
    if (c.gone) return;
    var x = c.x, y = c.y, px = c.px, alpha = 0.7 + 0.3 * c.depth;
    if (c.join) {
      var k = Math.min(1, c.join.t / 0.32);
      var e = 1 - (1 - k) * (1 - k);
      x = c.join.fx + (c.join.tx - c.join.fx) * e;
      y = c.join.fy + (c.join.ty - c.join.fy) * e;
      px = c.join.fpx + (JOIN_PX - c.join.fpx) * e;
      alpha = 1;
    }
    var sx = c.shake > 0 ? Math.sin(c.shake * 70) * 9 : 0;
    var lift = c.lift * 28 + (c.join ? 30 : 0);
    var bob = (!c.up && !c.join) ? Math.sin(game.time.elapsed * 3 + c.x * 0.01) * 3 : 0;
    oval(x, y + px * 4.2, px * 4, Math.max(4, px * 0.9), K.shadow, 0.22);
    if (c.flash > 0) {
      var g = 1 + 0.25 * (1 - c.flash / 0.5);
      game.draw.sprite(BACK, RIM_PAL, x, y - lift, px * 1.1 * g, { anchor: 'center', alpha: 0.9 });
    }
    if (c.up || c.join) {
      var bmp = HALVES[c.e][c.side];
      var pal = { G: GLAZE[c.g].G, B: GLAZE[c.g].B, R: GLAZE[c.g].R, E: K.clay };
      game.draw.sprite(bmp, pal, x + sx, y - lift, px, { anchor: 'center', alpha: alpha });
    } else {
      var blink = 0.25 + 0.25 * Math.sin(game.time.elapsed * 6 + c.x);
      if (peekT <= 0 && picks.length < 2 && rejectT <= 0) game.draw.sprite(BACK, RIM_PAL, x + sx, y - lift + bob, px * 1.12, { anchor: 'center', alpha: blink });
      game.draw.sprite(BACK, BACK_PAL, x + sx, y - lift + bob, px, { anchor: 'center', alpha: alpha });
    }
  }

  function drawTable() {
    for (var i = 0; i < cards.length; i++) if (!cards[i].join) drawCard(cards[i]);
    for (var j = 0; j < cards.length; j++) if (cards[j].join) drawCard(cards[j]);
    if (gap) {
      var a = gap.t / 0.55;
      game.draw.line(gap.x, gap.y - 60, gap.x, gap.y + 60, K.red, 10);
      game.draw.circle(gap.x, gap.y, 70 * (1.4 - a * 0.4), K.red, 0.18 * a);
    }
    if (lastJoin && between > 0) {
      game.draw.circle(lastJoin.x, lastJoin.y, 90 + Math.sin(game.time.elapsed * 12) * 10, K.gold, 0.18);
    }
  }

  function drawShelf() {
    for (var i = 0; i < NEEDED; i++) {
      var sx = W / 2 + (i - 4) * 108, sy = 196;
      if (i < shelf.length) {
        var p = shelf[i], pal = { G: GLAZE[p.g].G, B: GLAZE[p.g].B, R: GLAZE[p.g].R, E: K.clay };
        game.draw.sprite(HALVES[p.e].L, pal, sx - 10, sy, 5, { anchor: 'center' });
        game.draw.sprite(HALVES[p.e].R, pal, sx + 10, sy, 5, { anchor: 'center' });
      } else {
        game.draw.rect(sx - 26, sy - 18, 52, 36, K.ink, 0.12);
        game.draw.rect(sx - 26, sy + 16, 52, 3, K.ink, 0.3);
      }
    }
  }

  function drawKeeper() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 2.5) % 2 === 0 ? KEEPER_A : KEEPER_B;
    var hop = 0;
    if (mood && mood.k === 'joy') { fr = KEEPER_JOY; hop = -Math.abs(Math.sin(t * 14)) * 24; }
    if (mood && mood.k === 'sad') fr = KEEPER_SAD;
    if (ending && state !== S.ATTRACT) fr = cleared ? KEEPER_JOY : KEEPER_SAD;
    oval(W * 0.18, H * 0.86 + 6, 70, 14, K.shadow, 0.25);
    game.draw.sprite(fr, KEEPER_PAL, W * 0.18, H * 0.8 + hop + Math.sin(t * 2) * 3, 13, { anchor: 'center' });
    game.draw.sprite(GLUE, GLUE_PAL, W * 0.84, H * 0.81 + Math.sin(t * 1.6) * 2, 12, { anchor: 'center' });
  }

  function drawPlinths() {
    for (var r = 0; r < ROUND_SIZES.length; r++) {
      var x = W / 2 + (r - 1) * 150, y = H * 0.9;
      var done = r < round || (r === round && between > 0) || (cleared && ending);
      var cur = r === round && !done;
      game.draw.rect(x - 52, y, 104, 40, done ? K.gold : '#7a6a54');
      game.draw.rect(x - 60, y + 40, 120, 14, K.woodDark);
      var pal = { r: done ? '#8a3e20' : '#5e5446', g: done ? '#c4643a' : '#8a7a64' };
      var pulse = cur ? Math.sin(game.time.elapsed * 6) * 4 : 0;
      game.draw.sprite(URN, pal, x, y - 34 + pulse, 10 + r * 2, { anchor: 'center' });
    }
  }

  function drawHud() {
    say(pairsDone + ' / ' + NEEDED, W / 2, 66, 54, K.ink);
    game.draw.text('SCORE ' + score, W - 40, 46, { size: 30, color: K.ink, bold: true, align: 'right' });
    var low = timeLeft < 4;
    game.draw.rect(70, 122, W - 140, 22, K.ink, 0.35);
    var col = low && Math.floor(game.time.elapsed * 8) % 2 === 0 ? K.red : K.green;
    game.draw.rect(74, 126, (W - 148) * Math.max(0, timeLeft / TIME_LIMIT), 14, col);
    drawShelf();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.14, W, H * 0.5, '#1a140e', 0.55);
    say(cleared ? 'CLEAR' : 'TIME UP', W / 2, H * 0.22, 110, cleared ? K.gold : K.red);
    say('SCORE ' + score, W / 2, H * 0.31, 60, K.white);
    say(pairsDone + ' / ' + NEEDED, W / 2, H * 0.37, 48, K.white);
    say('MISS ' + misses + '   COMBO x' + maxCombo, W / 2, H * 0.42, 38, K.white);
    if (cleared && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W / 2, H * 0.49, 64, K.gold);
    } else {
      say('BEST ' + Math.max(game.best, cleared ? score : 0), W / 2, H * 0.49, 40, K.gold);
    }
    if (!cleared) say('あと' + (NEEDED - pairsDone) + '組!', W / 2, H * 0.56, 64, K.gold);
    if (endSent && Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.965, 36, K.white);
  }

  // ---- ATTRACT: 実ロジック(flipCard/stepTable)で 1回めくり違い → 2組そろえる ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, step: 0 };
  var DEMO_SCRIPT = [[1.5, 0], [2.3, 1], [3.6, 0], [4.3, 3], [5.4, 2], [6.1, 1]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); getReady = 0;
      placeDeck([
        { pair: 0, side: 'L', e: 0, g: 0 }, { pair: 1, side: 'R', e: 3, g: 1 },
        { pair: 1, side: 'L', e: 3, g: 1 }, { pair: 0, side: 'R', e: 0, g: 0 },
      ]);
      peekT = 1.0; demo.step = 0; demo.gx = W * 0.5; demo.gy = H * 0.74;
    }
    stepTable(dt, false);
    demo.press = false;
    if (demo.step < DEMO_SCRIPT.length) {
      var sc = DEMO_SCRIPT[demo.step];
      var c = cards[sc[1]];
      demo.gx += (c.x - demo.gx) * Math.min(1, dt * 7);
      demo.gy += (c.y - demo.gy) * Math.min(1, dt * 7);
      demo.press = cyc > sc[0] - 0.18 && cyc < sc[0] + 0.1;
      if (cyc >= sc[0]) {
        flipCard(c);
        demo.step++;
      }
    } else {
      demo.gx += (W * 0.78 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.74 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      room();
      drawTable();
      drawKeeper();
      drawPlinths();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      var bob = Math.sin(game.time.elapsed * 2.4) * 6;
      say(GAME_TITLE, W / 2, H * 0.07 + bob, 92, K.gold);
      say('HI-SCORE ' + game.best, W / 2, H * 0.12, 40, K.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.965, 46, K.red);
      else say('TAP TO START', W / 2, H * 0.965, 40, K.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      room();
      drawTable();
      drawKeeper();
      drawPlinths();
      drawHud();
      if (cleared && Math.floor(resultT * 5) !== Math.floor((resultT - dt) * 5)) {
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.6), { color: [K.gold, STYLE.main[0], STYLE.main[1], STYLE.main[2]][Math.floor(game.random(0, 4)) % 4], count: 16, speed: 420 });
      }
      drawResult();
      if (!endSent && resultT >= 1.3) {
        endSent = true;
        var stats = { pairs: pairsDone, misses: misses, maxCombo: maxCombo };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
      }
      return;
    }

    // PLAYING
    if (ending) {
      for (var f = 0; f < cards.length; f++) if (cards[f].flash > 0) cards[f].flash = Math.max(0.01, cards[f].flash - dt);
      freeze -= dt;
      if (freeze <= 0) { state = S.RESULT; resultT = 0; }
    } else if (getReady > 0) {
      getReady -= dt;
      if (getReady <= 0) game.audio.play('se_tap', 0.4);
    } else {
      var live = true;
      timeLeft -= dt;
      stepTable(dt, live);
      if (timeLeft < 4) {
        tickAcc += dt;
        if (tickAcc >= 0.5) { tickAcc = 0; game.audio.tone('A5', 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && !ending) {
        timeLeft = 0;
        for (var i = 0; i < cards.length; i++) if (!cards[i].gone) { cards[i].flash = 0.5; cards[i].up = true; }
        game.feedback.bad(W / 2, 140, { text: 'TIME UP', size: 64 });
        closeOut(false);
      }
    }

    room();
    drawTable();
    drawKeeper();
    drawPlinths();
    drawHud();
    if (getReady > 0) say(getReady > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.29, 110, K.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A4', 0.5], ['D5', 2],
    ], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['Bb2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

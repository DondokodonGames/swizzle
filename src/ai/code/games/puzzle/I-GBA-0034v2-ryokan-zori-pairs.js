// I-GBA-0034v2-ryokan-zori-pairs.js
// 下足番の草履合わせ — 玄関の土間に裏返った草履を2つずつめくり、鼻緒の色と大きさが同じで左右が逆の対を見つけて客の足もとへそろえる
// 操作: 裏返った草履をタップするとめくれる。2つ目が同じ鼻緒の色・同じ大きさで左右が逆なら対になって上がり框の客の足もとへ飛ぶ。違えば両方が裏に戻り、待つ客がじれて持ち時間が1秒減る
// 終わり: 3組の客(2対→3対→4対)を20秒以内に送り出せばCLEAR。時間切れでGAME OVER。2組目には同じ色で大きさ違いの草履、3組目には同じ色・同じ大きさが2足あって左右の取り違えが起きる
// @mechanic: pair_match
// @theme: old_ryokan_genkan_zori
// 世界観: 老舗旅館の玄関で、下足番の老人が客の脱いで裏返った草履を2つずつめくり、鼻緒と大きさと左右がそろう対を見つけて上がり框で待つ客の足もとへ並べて送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた対の数・取り違え回数・一発で当てた数・スコア
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 輪郭は line、面は横ストリップのベタ塗り。頂点は毎フレームわずかに揺れ、奥はフォグ色で潰す
  var STYLE = { bg: ['#2a2430', '#6a5a5a'], main: ['#b89a6a', '#7a6248', '#d8c8a0'], accent: ['#ffcc55', '#ffffff'] };
  var WOOD = STYLE.main[0], WOOD_D = STYLE.main[1], STRAW = STYLE.main[2];
  var GOLD = STYLE.accent[0], WHITE = STYLE.accent[1];
  var FOG = '#8a7a78';
  var STRAPS = ['#d83a3a', '#3a5ad8', '#3a9a5a', '#d88a2a', '#9a4ab8'];

  var LOGO = 'ZORI PAIRS';
  var TIME_LIMIT = 20;
  var ROUNDS = [
    [{ c: 0, s: 1 }, { c: 1, s: 1 }],
    [{ c: 2, s: 1 }, { c: 3, s: 1 }, { c: 2, s: 0.78 }],
    [{ c: 4, s: 1 }, { c: 0, s: 1 }, { c: 0, s: 1 }, { c: 1, s: 0.8 }],
  ];
  var NEEDED = 9;
  var STEP_Y = H * 0.3;

  var SCN = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var scn = SCN.ATTRACT;

  // ── スプライト: 下足番の老人と客 ──
  var KEEPER = [
    ['....GGGG....', '...GGGGGG...', '...SSSSSS...', '...SKSSKS...', '...SSSSSS...', '....SMMS....', '..HHHHHHHH..', '.HHHHWHHHHH.', 'HHHHHWHHHHHH', 'S.HHHWHHHH.S', '..HHHHHHHH..', '..HH....HH..'],
    ['............', '....GGGG....', '...GGGGGG...', '...SSSSSS...', '...SKSSKS...', '..HHSSSSHH..', '.HHHHWHHHHH.', 'SHHHHWHHHHHS', 'HHHHHWHHHHHH', '..HHHWHHHH..', '..HHHHHHHH..', '..HH....HH..'],
  ];
  var KEEPER_PAL = { G: '#c8c8c8', S: '#e0b088', K: '#2a1a10', M: '#8a3a2a', H: '#3a3a5a', W: '#e8e0d0' };
  var GUEST = ['..KKKK..', '.KSSSSK.', '..SKKS..', '..SSSS..', '.YYYYYY.', 'YYYYYYYY', 'YYYYYYYY', '.YYYYYY.', '.YYYYYY.', '..Y..Y..'];

  // ── ローポリの面塗り(横ストリップ走査) ──
  function poly(pts, col, a) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i].y); maxY = Math.max(maxY, pts[i].y); }
    for (var y = Math.floor(minY); y < maxY; y += 3) {
      var yc = y + 1.5, xl = 1e9, xr = -1e9;
      for (i = 0; i < pts.length; i++) {
        var p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p.y <= yc && q.y > yc) || (q.y <= yc && p.y > yc)) {
          var x = p.x + (yc - p.y) * (q.x - p.x) / (q.y - p.y);
          xl = Math.min(xl, x); xr = Math.max(xr, x);
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, 3, col, a);
    }
  }
  function outline(pts, col, w) {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      game.draw.line(p.x, p.y, q.x, q.y, col, w);
    }
  }
  function jit(i, seed) { return Math.sin(game.time.elapsed * 13 + i * 1.7 + seed) * 1.6; }

  // 草履の形(左右で親指側がふくらむ)。a=+1 左足 / -1 右足
  var SOLE = [[0.05, -0.5], [0.45, -0.38], [0.5, -0.05], [0.42, 0.35], [0.15, 0.5], [-0.2, 0.48], [-0.45, 0.3], [-0.48, -0.1], [-0.35, -0.4]];
  function solePts(x, y, w, h, a, sx, seed) {
    var out = [];
    for (var i = 0; i < SOLE.length; i++) out.push({ x: x + SOLE[i][0] * a * w * sx + jit(i, seed), y: y + SOLE[i][1] * h + jit(i + 5, seed) });
    return out;
  }

  // ── 玄関モデル(本番・デモ共通) ──
  function makeBoard(round) {
    var spec = ROUNDS[round];
    var deck = [];
    for (var p = 0; p < spec.length; p++) {
      deck.push({ c: spec[p].c, s: spec[p].s, foot: 1, pair: p });
      deck.push({ c: spec[p].c, s: spec[p].s, foot: -1, pair: p });
    }
    for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    var cols = deck.length / 2;
    var cards = [];
    for (var k = 0; k < deck.length; k++) {
      var r = k < cols ? 0 : 1, c = k % cols;
      var depth = r === 0 ? 0.84 : 1;
      var spacing = Math.min(250, 900 / cols) * depth;
      cards.push({ x: W / 2 + (c - (cols - 1) / 2) * spacing, y: r === 0 ? H * 0.47 : H * 0.64, depth: depth, c: deck[k].c, s: deck[k].s, foot: deck[k].foot,
        flip: 0, up: false, gone: false, fly: 0, seen: false, seed: k * 3.1 });
    }
    var guests = [];
    for (var g = 0; g < spec.length; g++) guests.push({ c: spec[g].c, s: spec[g].s, x: W * 0.5 + (g - (spec.length - 1) / 2) * 190, served: false, leave: 0 });
    return { cards: cards, guests: guests, first: -1, second: -1, judgeT: 0, backT: 0 };
  }
  function cardAt(B, x, y) {
    for (var i = 0; i < B.cards.length; i++) {
      var c = B.cards[i];
      if (c.gone) continue;
      var dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy < Math.pow(95 * c.depth, 2)) return i;
    }
    return -1;
  }
  function flipCard(B, i) {
    if (i < 0 || B.backT > 0 || B.second >= 0) return false;
    var c = B.cards[i];
    if (c.up || c.gone) return false;
    c.up = true;
    if (B.first < 0) B.first = i;
    else { B.second = i; B.judgeT = 0.25; }
    return true;
  }
  function matches(a, b) { return a.c === b.c && a.s === b.s && a.foot !== b.foot; }
  // 戻り値: イベント配列
  function stepBoard(B, dt) {
    var out = [];
    for (var i = 0; i < B.cards.length; i++) {
      var c = B.cards[i];
      c.flip += ((c.up ? 1 : 0) - c.flip) * Math.min(1, dt * 14);
      if (c.gone && c.fly < 1) c.fly = Math.min(1, c.fly + dt * 2.6);
    }
    for (var g = 0; g < B.guests.length; g++) if (B.guests[g].served) B.guests[g].leave += dt;
    if (B.second >= 0 && B.judgeT > 0) {
      B.judgeT -= dt;
      if (B.judgeT <= 0) {
        var a = B.cards[B.first], b = B.cards[B.second];
        if (matches(a, b)) {
          var fresh = !a.seen && !b.seen;
          a.gone = b.gone = true; a.fly = b.fly = 0;
          var gi = -1;
          for (var k = 0; k < B.guests.length; k++) if (!B.guests[k].served && B.guests[k].c === a.c && B.guests[k].s === a.s) { gi = k; break; }
          if (gi >= 0) { B.guests[gi].served = true; a.to = b.to = B.guests[gi]; }
          out.push({ kind: 'match', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, fresh: fresh });
          B.first = -1; B.second = -1;
        } else {
          a.seen = b.seen = true;
          B.backT = 0.55;
          out.push({ kind: 'miss', x: b.x, y: b.y, a: a, b: b });
        }
      }
    }
    if (B.backT > 0) {
      B.backT -= dt;
      if (B.backT <= 0) { B.cards[B.first].up = false; B.cards[B.second].up = false; B.first = -1; B.second = -1; }
    }
    return out;
  }
  function leftCount(B) { var n = 0; for (var i = 0; i < B.cards.length; i++) if (!B.cards[i].gone) n++; return n; }

  // ── 描画 ──
  function drawGenkan() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.3, '#4a3e40'], [0.8, STYLE.bg[1]], [1, '#3a3236']]);
    // 奥の柱と暖簾(面ベタ)
    for (var p = 0; p < 3; p++) {
      var px = W * (0.12 + p * 0.38);
      poly([{ x: px, y: 236 }, { x: px + 44, y: 236 }, { x: px + 40 + jit(p, 1), y: STEP_Y }, { x: px + 4, y: STEP_Y }], WOOD_D, 1);
    }
    poly([{ x: W * 0.3, y: 236 }, { x: W * 0.7, y: 236 }, { x: W * 0.7 + jit(1, 2), y: 380 }, { x: W * 0.3 + jit(2, 2), y: 380 }], '#2a3a6a', 1);
    game.draw.rect(W * 0.5 - 3, 236, 6, 144, STYLE.bg[0]);
    // 上がり框(客が待つ段)
    poly([{ x: 0, y: STEP_Y - 40 }, { x: W, y: STEP_Y - 40 }, { x: W, y: STEP_Y + 50 }, { x: 0, y: STEP_Y + 50 }], WOOD, 1);
    poly([{ x: 0, y: STEP_Y + 50 }, { x: W, y: STEP_Y + 50 }, { x: W, y: STEP_Y + 90 }, { x: 0, y: STEP_Y + 90 }], WOOD_D, 1);
    game.draw.line(0, STEP_Y + 50, W, STEP_Y + 50, '#2a1a10', 3);
    // 土間(奥ほどフォグ)
    poly([{ x: 0, y: STEP_Y + 90 }, { x: W, y: STEP_Y + 90 }, { x: W, y: H * 0.76 }, { x: 0, y: H * 0.76 }], '#6a6260', 1);
    for (var t = 0; t < 8; t++) {
      var ty = STEP_Y + 90 + t * t * 9;
      game.draw.line(0, ty, W, ty, '#5a5250', 2);
    }
    for (var v = -4; v <= 4; v++) game.draw.line(W / 2 + v * 70, STEP_Y + 90, W / 2 + v * 190, H * 0.76, '#5a5250', 2);
    game.draw.rect(0, STEP_Y + 90, W, 120, FOG, 0.3);
    // 下駄箱(手前)
    poly([{ x: W * 0.52, y: H * 0.8 }, { x: W * 0.97, y: H * 0.8 }, { x: W * 0.97, y: H * 0.97 }, { x: W * 0.52, y: H * 0.97 }], WOOD_D, 1);
    for (var s = 0; s < 3; s++) game.draw.line(W * 0.52, H * (0.84 + s * 0.045), W * 0.97, H * (0.84 + s * 0.045), '#2a1a10', 3);
  }

  function drawSandal(c, x, y, scale, hl) {
    var w = 120 * c.depth * c.s * scale, h = 170 * c.depth * c.s * scale;
    var sx = Math.max(0.06, Math.abs(Math.cos(c.flip * Math.PI)));
    var faceUp = c.flip > 0.5;
    // 影
    poly([{ x: x - w * 0.5 * sx + 10, y: y + h * 0.5 + 6 }, { x: x + w * 0.5 * sx + 10, y: y + h * 0.5 + 6 }, { x: x + w * 0.45 * sx + 14, y: y + h * 0.5 + 18 }, { x: x - w * 0.45 * sx + 14, y: y + h * 0.5 + 18 }], '#2a2224', 0.5);
    var pts = solePts(x, y, w, h, c.foot, sx, c.seed);
    if (!faceUp) {
      // 裏(わら底) — 全部同じに見える
      poly(pts, '#a88a5a', 1);
      for (var i = -2; i <= 2; i++) game.draw.line(x + i * w * 0.16 * sx, y - h * 0.4, x + i * w * 0.16 * sx, y + h * 0.4, '#8a6a42', 3);
      poly(solePts(x, y + h * 0.28, w * 0.6, h * 0.25, c.foot, sx, c.seed + 9), '#4a3a30', 1);
      outline(pts, '#2a1a10', 3);
      var bob = Math.sin(game.time.elapsed * 4 + c.seed) * 0.5 + 0.5;
      game.draw.line(pts[0].x, pts[0].y - 4, pts[1].x, pts[1].y - 4, WHITE, 2 + bob * 2);
    } else {
      // 表(畳表 + 鼻緒)。親指側の前つぼの位置で左右が分かる
      poly(pts, STRAW, 1);
      poly(solePts(x + 0.04 * c.foot * w * sx, y, w * 0.78, h * 0.86, c.foot, sx, c.seed + 4), '#e8dcb8', 1);
      outline(pts, '#2a1a10', 3);
      var post = { x: x + 0.14 * c.foot * w * sx, y: y - 0.3 * h };
      var col = STRAPS[c.c];
      game.draw.line(post.x, post.y, x + 0.47 * c.foot * w * sx, y + 0.02 * h, col, 12 * c.s);
      game.draw.line(post.x, post.y, x - 0.47 * c.foot * w * sx, y - 0.04 * h, col, 12 * c.s);
      game.draw.circle(post.x, post.y, 9 * c.s, col);
      game.draw.circle(post.x - 3, post.y - 3, 3, WHITE, 0.7);
    }
    if (hl) outline(pts, WHITE, 6);
  }

  function drawCards(B, hlA, hlB, hk) {
    for (var i = 0; i < B.cards.length; i++) {
      var c = B.cards[i];
      if (c.gone) {
        if (c.fly >= 1 || !c.to) continue;
        var tx = c.to.x + (c.foot > 0 ? -26 : 26), ty = STEP_Y + 30;
        var k = c.fly;
        drawSandal(c, c.x + (tx - c.x) * k, c.y + (ty - c.y) * k - Math.sin(k * Math.PI) * 120, 1 - 0.55 * k, false);
        continue;
      }
      var lift = c.up ? 0 : Math.sin(game.time.elapsed * 3 + c.seed) * 4;
      var hl = c === hlA || c === hlB;
      drawSandal(c, c.x, c.y + lift, hl ? 1 + hk * 0.15 : 1, hl);
    }
  }

  function drawGuests(B) {
    for (var g = 0; g < B.guests.length; g++) {
      var gu = B.guests[g];
      var walk = gu.leave > 0.5 ? (gu.leave - 0.5) * 900 : 0;
      if (walk > W) continue;
      var x = gu.x + (g % 2 ? walk : -walk);
      var bob = Math.sin(game.time.elapsed * (gu.served ? 10 : 3) + g) * (gu.served ? 6 : 3);
      game.draw.sprite(GUEST, { K: '#2a1a10', S: '#e8c098', Y: STRAPS[gu.c] }, x, STEP_Y - 70 + bob - (gu.served && gu.leave < 0.5 ? 20 : 0), 13 * gu.s, { anchor: 'center' });
      if (gu.served && gu.leave > 0.3) {
        game.draw.line(x - 26, STEP_Y + 30, x - 26, STEP_Y + 10, STRAPS[gu.c], 8);
        game.draw.line(x + 26, STEP_Y + 30, x + 26, STEP_Y + 10, STRAPS[gu.c], 8);
      }
      if (!gu.served) {
        // 足もとの空き(ここへそろえる)
        game.draw.rect(x - 52, STEP_Y + 22, 40, 14, WHITE, 0.25 + 0.15 * Math.sin(game.time.elapsed * 5 + g));
        game.draw.rect(x + 12, STEP_Y + 22, 40, 14, WHITE, 0.25 + 0.15 * Math.sin(game.time.elapsed * 5 + g));
      }
    }
  }

  function drawKeeper(mood) {
    var fr = mood === 'bow' || mood === 'joy' ? 1 : 0;
    var hop = mood === 'joy' ? -Math.abs(Math.sin(game.time.elapsed * 8)) * 40 : 0;
    var shake = mood === 'sad' ? Math.sin(game.time.elapsed * 30) * 4 : 0;
    game.draw.sprite(KEEPER[fr], KEEPER_PAL, W * 0.24 + shake, H * 0.87 + hop, 18, { anchor: 'center' });
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#1a1014', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col || WHITE, bold: true, align: 'center' });
  }

  // ── 状態 ──
  var board, round, paired, slips, fresh, streak, timeLeft, countIn, stop, over, won, endT, score, prevBest, keeperMood, moodT, nextT, celebT;

  function initGame() {
    round = 0; board = makeBoard(0); paired = 0; slips = 0; fresh = 0; streak = 0;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; keeperMood = ''; moodT = 0; nextT = 0; celebT = 0;
  }

  function handle(evs) {
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.kind === 'match') {
        paired++; streak++;
        if (e.fresh) fresh++;
        score += (e.fresh ? 150 : 100) + streak * 20;
        keeperMood = 'bow'; moodT = 0.5;
        game.feedback.good(e.x, e.y - 60, { text: e.fresh ? 'PERFECT' : 'GOOD', color: GOLD, count: 16 });
        game.audio.play('se_coin', 0.3);
        if (leftCount(board) === 0) {
          if (round >= ROUNDS.length - 1) { won = true; wrapUp(); return; }
          game.fx.popup(paired + ' / ' + NEEDED, W / 2, H * 0.2, { color: GOLD, size: 64 });
          game.audio.play('se_milestone', 0.4);
          nextT = 0.9;
        }
      } else if (e.kind === 'miss') {
        streak = 0; slips++;
        timeLeft = Math.max(0.05, timeLeft - 1);
        game.feedback.bad(e.x, e.y - 60, { text: 'MISS', shake: 8 });
        game.fx.popup('-1', W * 0.85, 200, { color: '#ff6a5a', size: 48 });
      }
    }
  }

  // ── 入力 ──
  game.onPress(function (x, y) {
    if (scn === SCN.ATTRACT) { game.audio.play('se_coin', 0.45); scn = SCN.PLAYING; initGame(); return; }
    if (scn === SCN.RESULT) { game.audio.play('se_tap', 0.2); scn = SCN.ATTRACT; initGame(); demo.t = 0; return; }
    if (countIn > 0 || stop || over || nextT > 0) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.04 }); return; }
    var i = cardAt(board, x, y);
    if (i >= 0 && flipCard(board, i)) {
      game.audio.play('se_tap', 0.3);
      game.audio.tone(board.second >= 0 ? 'E5' : 'C5', 0.05, { wave: 'triangle', volume: 0.08 });
    } else {
      game.audio.tone('A3', 0.05, { wave: 'square', volume: 0.05 });
      game.fx.burst(x, y, { color: '#a88a5a', count: 3, speed: 80 });
    }
  });

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 25);
    keeperMood = won ? 'joy' : 'sad';
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash(GOLD, 0.3);
  }

  function enterResult() {
    scn = SCN.RESULT;
    var stats = { pairs: paired, slips: slips, firstTry: fresh, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT: 赤い鼻緒の左右をめくってそろえ、次は同じ色の左足どうしをめくって取り違える ──
  var demo = { t: 0, B: null, plan: null, idx: 0, hx: W * 0.5, hy: H * 0.8, press: 0 };
  var DEMO_CYCLE = 4.4;
  function demoFind(B, pred) { for (var i = 0; i < B.cards.length; i++) if (!B.cards[i].gone && !B.cards[i].up && pred(B.cards[i])) return i; return -1; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.B) { demo.B = makeBoard(2); demo.idx = 0; }
    var B = demo.B;
    var plan = [
      { at: 0.5, pick: function (c) { return c.c === 4 && c.foot === 1; } },
      { at: 1.0, pick: function (c) { return c.c === 4 && c.foot === -1; } },
      { at: 2.2, pick: function (c) { return c.c === 0 && c.foot === 1; } },
      { at: 2.7, pick: function (c) { return c.c === 0 && c.foot === 1; } },
    ];
    var next = plan[demo.idx];
    if (next) {
      var target = demoFind(B, next.pick);
      if (target >= 0) {
        var tc = B.cards[target];
        demo.hx += (tc.x - demo.hx) * Math.min(1, dt * 8);
        demo.hy += (tc.y + 20 - demo.hy) * Math.min(1, dt * 8);
        if (cyc >= next.at) { flipCard(B, target); demo.press = 0.15; demo.idx++; game.audio.play('se_tap', 0.12); }
      } else demo.idx++;
    }
    if (demo.press > 0) demo.press -= dt;
    var evs = stepBoard(B, dt);
    for (var i = 0; i < evs.length; i++) {
      if (evs[i].kind === 'match') game.feedback.good(evs[i].x, evs[i].y - 60, { text: 'PERFECT', color: GOLD, count: 10, volume: 0.2 });
      else game.feedback.bad(evs[i].x, evs[i].y - 60, { text: 'MISS', volume: 0.15, shake: 3 });
    }
  }

  function drawHud() {
    ink(paired + ' / ' + NEEDED, W * 0.18, 90, 54, GOLD);
    ink(String(score), W * 0.5, 90, 44);
    for (var r = 0; r < ROUNDS.length; r++) game.draw.circle(W * 0.76 + r * 64, 90, 20, r < round || (r === round && over && won) ? GOLD : '#5a4a4a');
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 170, W - 140, 22, '#1a1014', 0.6);
    game.draw.rect(70, 170, (W - 140) * fr, 22, low ? '#ff6a5a' : WHITE);
  }

  game.onUpdate(function (dt) {
    if (scn === SCN.ATTRACT) {
      stepDemo(dt);
      drawGenkan();
      drawGuests(demo.B);
      drawCards(demo.B, null, null, 0);
      drawKeeper(Math.floor(game.time.elapsed) % 3 === 0 ? 'bow' : '');
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 15 });
      ink(LOGO, W / 2, 90, 76, GOLD);
      ink('HI-SCORE ' + (game.best > 0 ? game.best : '-'), W / 2, 170, 34);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', W * 0.74, H * 0.79, 40, GOLD);
      else ink('INSERT COIN', W * 0.74, H * 0.79, 36);
      return;
    }

    if (scn === SCN.RESULT) {
      drawGenkan();
      drawGuests(board);
      drawKeeper(won ? 'joy' : 'sad');
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.47, 100, won ? GOLD : '#ff6a5a');
      ink(paired + ' / ' + NEEDED, W / 2, H * 0.54, 60);
      ink('SCORE ' + score, W / 2, H * 0.6, 50);
      if (won && score > prevBest) ink('NEW RECORD', W / 2, H * 0.66, 52, GOLD);
      else ink('BEST ' + Math.max(prevBest, score), W / 2, H * 0.66, 40);
      if (!won) ink('あと' + (NEEDED - paired) + '足!', W / 2, H * 0.72, 56, GOLD);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W * 0.74, H * 0.79, 34);
      return;
    }

    // ── PLAYING ──
    var hk = 0;
    if (moodT > 0) { moodT -= dt; if (moodT <= 0 && !over) keeperMood = ''; }
    if (over) {
      endT -= dt;
      stepBoard(board, dt);
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.15; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.25, H * 0.65), { color: game.random(0, 1) < 0.5 ? GOLD : STRAPS[Math.floor(game.random(0, 5))], count: 14, speed: 420 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      hk = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('G5', 0.12, { wave: 'square', volume: 0.1 });
    } else {
      timeLeft -= dt;
      if (nextT > 0) {
        stepBoard(board, dt);
        nextT -= dt;
        if (nextT <= 0) { round++; board = makeBoard(round); game.audio.play('se_jump', 0.25); }
      } else {
        handle(stepBoard(board, dt));
      }
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0;
        stop = { t: 0.45, max: 0.45, after: function () { game.feedback.bad(W / 2, H * 0.55, { text: 'TIME UP' }); won = false; wrapUp(); } };
        game.audio.play('se_tap', 0.3);
      }
    }

    drawGenkan();
    drawGuests(board);
    var hl = null;
    if (stop) for (var i = 0; i < board.cards.length; i++) if (!board.cards[i].gone) { hl = board.cards[i]; break; }
    drawCards(board, hl, stop ? null : (board.backT > 0 ? board.cards[board.second] : null), hk);
    drawKeeper(stop ? 'sad' : keeperMood);
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.56, 110, GOLD);
  });

  game.onStart(function () {
    game.audio.melody([['D5', 1], ['F5', 0.5], ['G5', 0.5], ['A5', 1], ['C6', 1], ['A5', 0.5], ['G5', 0.5], ['F5', 1], ['D5', 2],
      ['F5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['D5', 1], ['C5', 1], ['D5', 3]],
      { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['F2', 2], ['D3', 2], ['G2', 2], ['A2', 2], ['D3', 4]] });
    scn = SCN.ATTRACT;
    initGame();
  });
})(game);

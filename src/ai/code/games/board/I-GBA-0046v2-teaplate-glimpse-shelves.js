// I-GBA-0046v2-teaplate-glimpse-shelves.js
// 小皿の目合わせ — 一瞬だけ表を見せた上下二段の小皿を伏せたまま、上の段と下の段から同じ柄の2枚をめくって揃える
// 操作: 上の棚の小皿と下の棚の小皿を1枚ずつタップしてめくる。柄と色が同じなら揃って残り、違えば伏せ直る
// 終わり: 3回の棚(3対→3対→4対)をすべて揃えれば成功。持ち時間が尽きたら失敗。違う2枚をめくると時間が減る
// @mechanic: pair_match
// @theme: teaware_shelf_glimpse
// 世界観: 茶道具店の奥座敷で、見習い店員が灯りに一瞬照らされた上下二段の小皿の絵柄を覚え、伏せたまま上の段と下の段から同柄の2枚を選んで組にする
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(揃えた組数・一発で当てた数・残り時間)
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色、影もグラデも使わない(背景は同系2色)、丸く大きい形と余白
  var STYLE = { bg: ['#f3efe6', '#ece6da'], main: ['#7fa89a', '#ffffff', '#c9b79c'], accent: ['#2f4fa8', '#e0483e'] };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1], celadon: STYLE.main[0], glaze: STYLE.main[1], wood: STYLE.main[2], woodDark: '#a8946f',
    indigo: STYLE.accent[0], red: STYLE.accent[1], ink: '#2b2a33', good: '#29b37a', bad: '#e0483e', gold: '#f2a516', mute: '#d8d0c2',
  };

  var GAME_TITLE = 'PLATE GLIMPSE';
  var TIME_LIMIT = 18;          // pair_match 10〜20s
  var STAGES = [
    { pairs: 3, peek: 1.1, twins: 0 },
    { pairs: 3, peek: 0.85, twins: 1 },
    { pairs: 4, peek: 0.7, twins: 2 },
  ];
  var NEEDED = 10;
  var MISS_COST = 1.0;
  var PLATE_R = 80;
  var TOP_Y = Math.round(H * 0.38), BOT_Y = Math.round(H * 0.62);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var plates, stage, peekT, firstPick, lockT, lockPair, pairs, firstTry, misses, score, timeLeft;
  var countIn, gapT, over, won, endT, freeze, lampT, nodT, sighT, milestoneDone, prevBest, warnT, tried;

  function word(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var WAVE = ['...###...', '..#...#..', '.#.###.#.', '#.#...#.#', '.#.###.#.', '#.#...#.#'];
  var PINE = ['...#...', '.#.#.#.', '..###..', '#.###.#', '.#####.', '...#...'];
  // 見習い店員(前掛け)0,1=待機 2=うなずき 3=ため息
  var CLERK = [
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sksksh..', '...ssss...', '..kkkkkk..', '.kkwwwwkk.', '.skwwwwks.', '..kwwwwk..', '..kkkkkk..', '...s..s...'],
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..ssssss..', '...ssss...', '..kkkkkk..', '.kkwwwwkk.', '.skwwwwks.', '..kwwwwk..', '..kkkkkk..', '...s..s...'],
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sksksh..', '...smms...', 's.kkkkkk.s', '.kkwwwwkk.', '..kwwwwk..', '..kwwwwk..', '..kkkkkk..', '...s..s...'],
    ['..hhhh....', '.hhhhhh...', '.hssssh...', '.sssssss..', '..smmss...', '..kkkkkk..', '.kkwwwwkk.', '.skwwwwks.', '..kwwwwk..', '..kkkkkk..', '...s..s...'],
  ];
  var CLERK_PAL = { h: '#2b2a33', s: '#f1cfae', k: '#2f4fa8', w: '#ffffff', m: '#e0483e' };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // 柄 = 文様(0..4) + 色(0藍/1朱)。twins は「同じ文様で色違い」の紛らわしい組の数
  function makePatterns(st) {
    var motifs = shuffle([0, 1, 2, 3, 4]);
    var list = [], m = 0;
    for (var t = 0; t < st.twins && list.length + 2 <= st.pairs; t++) {
      list.push({ motif: motifs[m], color: 0 }); list.push({ motif: motifs[m], color: 1 }); m++;
    }
    while (list.length < st.pairs) { list.push({ motif: motifs[m], color: game.random(0, 1) < 0.5 ? 0 : 1 }); m++; }
    return list;
  }

  function slotX(i, n) { return W / 2 + (i - (n - 1) / 2) * (n >= 4 ? 230 : 280); }

  function buildStage(idx, fixed) {
    var st = STAGES[idx];
    var pats = fixed ? fixed.pats : makePatterns(st);
    var topOrder = fixed ? fixed.top : shuffle(pats.slice());
    var botOrder = fixed ? fixed.bot : shuffle(pats.slice());
    plates = [];
    for (var i = 0; i < pats.length; i++) {
      plates.push({ row: 0, x: slotX(i, pats.length), y: TOP_Y, pat: topOrder[i], open: true, done: false, pop: 0, red: 0 });
      plates.push({ row: 1, x: slotX(i, pats.length), y: BOT_Y, pat: botOrder[i], open: true, done: false, pop: 0, red: 0 });
    }
    peekT = fixed ? fixed.peek : st.peek;
    lampT = 1; firstPick = -1; lockT = 0; lockPair = null;
    game.audio.tone(988, 0.12, { wave: 'sine', volume: 0.1, slide: 200 });
  }

  function initGame() {
    stage = 0; pairs = 0; firstTry = 0; misses = 0; score = 0; timeLeft = TIME_LIMIT;
    countIn = 0.8; gapT = 0; over = false; won = false; endT = 0; freeze = 0; nodT = 0; sighT = 0;
    milestoneDone = false; prevBest = game.best; warnT = 0; tried = {};
    buildStage(0, null);
    // 最初の覗き見は GO! の瞬間から(READY? の間は伏せて待つ)
    for (var i = 0; i < plates.length; i++) plates[i].open = false;
    peekT = 0; lampT = 0;
  }

  function openPeek() {
    for (var i = 0; i < plates.length; i++) { plates[i].open = true; plates[i].pop = 1; }
    peekT = STAGES[stage].peek; lampT = 1;
    game.audio.tone(988, 0.12, { wave: 'sine', volume: 0.1, slide: 200 });
  }

  function samePat(a, b) { return a.motif === b.motif && a.color === b.color; }

  function plateAt(x, y) {
    for (var i = 0; i < plates.length; i++) {
      var p = plates[i];
      if (p.done) continue;
      if (Math.hypot(p.x - x, p.y - y) < PLATE_R + 24) return i;
    }
    return -1;
  }

  // めくる(本番・デモ共通)
  function flip(i) {
    if (peekT > 0 || lockT > 0 || i < 0) return 'busy';
    var p = plates[i];
    if (p.done || p.open) return 'busy';
    if (firstPick >= 0 && plates[firstPick].row === p.row) {
      // 同じ段をめくり直し: 先の1枚を伏せて持ち替える
      plates[firstPick].open = false; plates[firstPick].pop = 1;
      firstPick = -1;
    }
    p.open = true; p.pop = 1;
    game.audio.tone(p.row === 0 ? 660 : 880, 0.06, { wave: 'triangle', volume: 0.12 });
    if (firstPick < 0) { firstPick = i; return 'first'; }
    var a = plates[firstPick], b = p;
    var key = a.pat.motif + '-' + a.pat.color;
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    firstPick = -1;
    if (samePat(a.pat, b.pat)) {
      a.done = true; b.done = true;
      if (state === S.PLAYING) {
        pairs++;
        var clean = !tried[key];
        if (clean) firstTry++;
        score += clean ? 150 : 100;
        game.feedback.good(mx, my, { text: clean ? 'PERFECT' : 'GOOD', color: C.good, size: 58 });
        nodT = 0.6;
        if (!milestoneDone && pairs === 5) {
          milestoneDone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(pairs + ' / ' + NEEDED, W / 2, H * 0.5, { color: C.gold, size: 64 });
        }
      } else {
        game.feedback.good(mx, my, { text: 'GOOD', color: C.good, size: 56 });
      }
      checkStage();
      return 'match';
    }
    tried[key] = true; tried[b.pat.motif + '-' + b.pat.color] = true;
    lockT = 0.55; lockPair = [plates.indexOf(a), plates.indexOf(b)]; a.red = 1; b.red = 1;
    game.feedback.bad(mx, my, { text: 'MISS', color: C.bad });
    if (state === S.PLAYING) { misses++; timeLeft -= MISS_COST; sighT = 0.7; }
    return 'miss';
  }

  function checkStage() {
    for (var i = 0; i < plates.length; i++) if (!plates[i].done) return;
    if (state !== S.PLAYING) return;
    game.audio.play('se_coin', 0.45);
    game.fx.burst(W / 2, (TOP_Y + BOT_Y) / 2, { color: C.gold, count: 24, speed: 420 });
    if (stage >= STAGES.length - 1) {
      won = true; over = true; freeze = 0.35;
      score += Math.round(Math.max(0, timeLeft) * 40);
      return;
    }
    gapT = 0.6;
  }

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 6; i++) game.fx.burst(game.random(140, 940), game.random(500, 1300), { color: i % 2 ? C.indigo : C.red, count: 20, speed: 440 });
  }

  function stepShelf(dt) {
    if (peekT > 0) {
      peekT -= dt;
      if (peekT <= 0) {
        for (var i = 0; i < plates.length; i++) { plates[i].open = false; plates[i].pop = 1; }
        game.audio.play('se_jump', 0.25);
      }
    }
    if (lampT > 0) lampT = Math.max(0, lampT - dt * 2.5);
    for (var k = 0; k < plates.length; k++) {
      var p = plates[k];
      if (p.pop > 0) p.pop = Math.max(0, p.pop - dt * 7);
      if (p.red > 0) p.red = Math.max(0, p.red - dt * 1.8);
    }
    if (lockT > 0) {
      lockT -= dt;
      if (lockT <= 0 && lockPair) {
        plates[lockPair[0]].open = false; plates[lockPair[0]].pop = 1;
        plates[lockPair[1]].open = false; plates[lockPair[1]].pop = 1;
        lockPair = null;
      }
    }
    if (nodT > 0) nodT -= dt;
    if (sighT > 0) sighT -= dt;
  }

  // ── 描画 ──
  function drawMotif(pat, x, y, r) {
    var col = pat.color === 0 ? C.indigo : C.red;
    if (pat.motif === 0) {
      for (var k = 0; k < 5; k++) { var a = k * 1.2566 - 1.5708; game.draw.circle(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, r * 0.22, col); }
      game.draw.circle(x, y, r * 0.14, C.gold);
    } else if (pat.motif === 1) {
      game.draw.sprite(WAVE, { '#': col }, x, y, r * 0.12, { anchor: 'center' });
    } else if (pat.motif === 2) {
      game.draw.sprite(PINE, { '#': col }, x, y, r * 0.14, { anchor: 'center' });
    } else if (pat.motif === 3) {
      for (var d = 0; d < 8; d++) { var b = d * 0.7854; game.draw.circle(x + Math.cos(b) * r * 0.45, y + Math.sin(b) * r * 0.45, r * 0.1, col); }
      game.draw.circle(x, y, r * 0.18, col);
    } else {
      for (var g = -1; g <= 1; g++) {
        game.draw.line(x + g * r * 0.3, y - r * 0.5, x + g * r * 0.3, y + r * 0.5, col, r * 0.09);
        game.draw.line(x - r * 0.5, y + g * r * 0.3, x + r * 0.5, y + g * r * 0.3, col, r * 0.09);
      }
    }
  }

  function drawPlate(p, idx, hint) {
    var r = PLATE_R * (1 - p.pop * 0.35);
    var y = p.y - (p.open ? 8 : 0);
    if (p.done) {
      game.draw.circle(p.x, y, r * 0.92, C.glaze);
      game.draw.circle(p.x, y, r * 0.92, C.good, 0.12);
      drawMotif(p.pat, p.x, y, r * 0.8);
      return;
    }
    if (p.open && p.pop < 0.5) {
      game.draw.circle(p.x, y, r, p.red > 0 ? C.bad : C.mute);
      game.draw.circle(p.x, y, r - 8, C.glaze);
      drawMotif(p.pat, p.x, y, r);
      if (p.red > 0) game.draw.circle(p.x, y, r, '#ffffff', p.red * 0.45);
    } else {
      game.draw.circle(p.x, y, r, C.celadon);
      game.draw.circle(p.x, y, r * 0.48, '#6c9486');
      game.draw.circle(p.x, y, r * 0.36, C.celadon);
      if (firstPick === idx) game.draw.circle(p.x, y, r + 10, C.gold, 0.4);
      if (hint) game.draw.circle(p.x, y, r + 8 + 6 * Math.sin(game.time.elapsed * 8), C.glaze, 0.5);
    }
  }

  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [C.bg1, C.bg2]);
    // 障子の桟(ゆっくり明るさが揺れる)
    for (var c = 0; c < 6; c++) game.draw.rect(60 + c * 180, 250, 8, 1180, C.mute, 0.6 + 0.2 * Math.sin(t + c));
    for (var r = 0; r < 4; r++) game.draw.rect(60, 250 + r * 300, W - 120, 8, C.mute, 0.7);
    // 吊り灯(覗き見の光源)
    var sw = Math.sin(t * 1.4) * 10;
    game.draw.line(W / 2, 230, W / 2 + sw, 300, C.ink, 4);
    game.draw.circle(W / 2 + sw, 318, 26, C.gold);
    // 棚板
    game.draw.rect(70, TOP_Y + PLATE_R + 6, W - 140, 22, C.wood);
    game.draw.rect(70, BOT_Y + PLATE_R + 6, W - 140, 22, C.wood);
    game.draw.rect(70, TOP_Y + PLATE_R + 28, W - 140, 8, C.woodDark);
    game.draw.rect(70, BOT_Y + PLATE_R + 28, W - 140, 8, C.woodDark);
    if (lampT > 0) game.draw.rect(0, 230, W, BOT_Y + 140 - 230, '#fff6d0', lampT * 0.55);
  }

  function drawClerk() {
    var t = game.time.elapsed;
    var f = sighT > 0 ? CLERK[3] : nodT > 0 ? CLERK[2] : CLERK[Math.floor(t * 1.2) % 5 === 4 ? 1 : 0];
    if (state === S.RESULT) f = won ? CLERK[2] : CLERK[3];
    var hop = nodT > 0 ? Math.abs(Math.sin(t * 12)) * 18 : 0;
    game.draw.sprite(f, CLERK_PAL, W * 0.2, H * 0.84 + Math.sin(t * 2) * 4 - hop, 15, { anchor: 'center' });
    // 揃えた組を並べる盆
    var tx = W * 0.62, ty = Math.round(H * 0.86);
    game.draw.rect(tx - 290, ty - 60, 580, 150, C.wood);
    game.draw.rect(tx - 274, ty - 44, 548, 118, C.woodDark);
    for (var i = 0; i < NEEDED; i++) {
      var cx = tx - 240 + (i % 5) * 120, cy = ty - 12 + Math.floor(i / 5) * 58;
      game.draw.circle(cx, cy, 22, i < pairs ? C.glaze : '#00000018');
      if (i < pairs) game.draw.circle(cx, cy, 9, C.indigo);
    }
  }

  function hud() {
    word(String(score), 160, 90, 56, C.ink);
    word(pairs + ' / ' + NEEDED, W - 160, 90, 46, C.ink);
    for (var i = 0; i < STAGES.length; i++) game.draw.circle(W / 2 - 50 + i * 50, 90, 14, i < stage || won ? C.indigo : (i === stage ? C.gold : C.mute));
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var warn = timeLeft < 3.5 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(90, 170, W - 180, 20, C.mute);
    game.draw.rect(90, 170, (W - 180) * frac, 20, warn ? C.bad : C.indigo);
  }

  function drawWorld(hint) {
    drawRoom();
    for (var i = 0; i < plates.length; i++) drawPlate(plates[i], i, hint && plates[i].row === 0);
    drawClerk();
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0 || gapT > 0 || freeze > 0) { game.audio.play('se_tap', 0.06); return; }
    var i = plateAt(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.1); return; }
    var r = flip(i);
    if (r === 'busy') game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT: 一瞬見せる → 上下で当たり → 外れ(伏せ直り) → 当たり ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, k: 0 };
  var DEMO_STAGE = {
    pats: [{ motif: 0, color: 1 }, { motif: 1, color: 0 }, { motif: 2, color: 0 }],
    peek: 0.9,
  };
  DEMO_STAGE.top = [DEMO_STAGE.pats[0], DEMO_STAGE.pats[1], DEMO_STAGE.pats[2]];
  DEMO_STAGE.bot = [DEMO_STAGE.pats[1], DEMO_STAGE.pats[2], DEMO_STAGE.pats[0]];
  // [時刻, plates の添字]  上0=0 下0=1 上1=2 下1=3 上2=4 下2=5
  var DEMO_TAPS = [[1.4, 0], [1.9, 5], [2.6, 2], [3.1, 3], [4.0, 2], [4.5, 1]];
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { buildStage(0, DEMO_STAGE); demo.k = 0; }
    stepShelf(dt);
    demo.press = false;
    if (demo.k < DEMO_TAPS.length) {
      var tap = DEMO_TAPS[demo.k], p = plates[tap[1]];
      demo.gx += (p.x - demo.gx) * Math.min(1, dt * 7); demo.gy += (p.y + 30 - demo.gy) * Math.min(1, dt * 7);
      if (cyc > tap[0] - 0.12) demo.press = true;
      if (cyc >= tap[0]) { flip(tap[1]); demo.k++; }
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 2); demo.gy += (H * 0.92 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!plates) initGame();
      demoStep(dt);
      drawWorld(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      word(GAME_TITLE, W / 2, H * 0.06, 80, C.indigo);
      word('HI-SCORE ' + game.best, W / 2, H * 0.1, 34, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) word('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.red);
      else word('TAP TO START', W / 2, H * 0.975, 40, C.ink);
      return;
    }

    if (state === S.RESULT) {
      stepShelf(dt);
      drawWorld(false);
      game.draw.rect(140, H * 0.4, W - 280, 380, C.glaze);
      word(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.44, 92, won ? C.indigo : C.bad);
      word('SCORE ' + score, W / 2, H * 0.5, 54, C.ink);
      if (score > prevBest && prevBest > 0) word('NEW RECORD', W / 2, H * 0.55, 50, C.gold);
      else word('BEST ' + Math.max(prevBest, score), W / 2, H * 0.55, 40, C.ink);
      if (!won) word('あと' + (NEEDED - pairs) + '組!', W / 2, H * 0.59, 46, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) word('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.ink);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      stepShelf(dt);
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { pairs: pairs, firstTry: firstTry, misses: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (freeze > 0) {
      freeze -= dt;
      if (freeze <= 0) finish();
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) { game.audio.play('se_tap', 0.3); openPeek(); }
    } else {
      stepShelf(dt);
      if (peekT <= 0) timeLeft -= dt;
      if (timeLeft < 3.5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.45; game.audio.tone(1175, 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (gapT > 0) {
        gapT -= dt;
        if (gapT <= 0) { stage++; buildStage(stage, null); }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0; over = true; won = false; freeze = 0.5; sighT = 1.5;
        for (var i = 0; i < plates.length; i++) if (!plates[i].done) { plates[i].open = true; plates[i].pop = 0; plates[i].red = 0.8; }
        game.feedback.bad(W / 2, (TOP_Y + BOT_Y) / 2, { text: 'TIME UP', color: C.bad });
      }
    }

    drawWorld(peekT <= 0 && pairs === 0 && stage === 0 && firstPick < 0 && timeLeft > TIME_LIMIT - 1.6);
    hud();
    if (countIn > 0) word(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5],
      ['A4', 0.5], ['G4', 0.5], ['A4', 2], ['R', 1],
    ], { tempo: 100, wave: 'triangle', volume: 0.055, loop: true, bass: [['A2', 2], ['E2', 2], ['D2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

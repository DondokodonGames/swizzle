// I-GBA-0007v2-mural-cloth-pairs.js
// ミューラル・クロスペア — 布をかけた壁画タイルを1枚ずつめくり、同じ絵柄の2枚を突き合わせる
// 操作: 布のかかったタイルをタップしてめくる。2枚目が同じ絵なら揃って残り、違えば布が戻る
// 終わり: 3面(4枚→6枚→8枚)を全て揃えればCLEAR。18秒の作業時間が尽きればGAME OVER(不一致1回ごとに時間が削れる)
// @mechanic: pair_match
// @theme: ruin_archive_mural_restoration
// 世界観: 遺跡調査の資料室で、修復員が布をかけた壁画タイルを1枚ずつめくり、対になる絵柄を突き合わせて壁画の並びを復元していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた対の数・最大連続一致・スコア
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗い金属質の1枚絵背景 + 粒状ノイズ + 面取りで擬似奥行き
  var STYLE = { bg: ['#14110e', '#2a231c', '#3b3129'], main: ['#c9a36b', '#8a6a44'], accent: ['#e8d7b0', '#7fb3c9'] };
  var BRONZE = STYLE.main[0], UMBER = STYLE.main[1], BONE = STYLE.accent[0], PATINA = STYLE.accent[1];
  var RED = '#d0563a';

  var TITLE = 'MURAL PAIRS';
  var TIME_LIMIT = 18;
  var MISS_COST = 1.5;
  var BOARDS = [4, 6, 8];
  var NEEDED = 9; // 2 + 3 + 4 対

  var STATE = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = STATE.ATTRACT;

  // 壁画の絵柄(8x8)
  var GLYPHS = [
    ['...##...', '.#.##.#.', '..####..', '########', '########', '..####..', '.#.##.#.', '...##...'], // 太陽
    ['........', '..###..#', '.######.', '#o#####.', '.######.', '..###..#', '........', '........'], // 魚
    ['........', '##....##', '.##..##.', '..####..', '...##...', '...##...', '..#..#..', '........'], // 鳥
    ['........', '..####..', '.#....#.', '#..##..#', '#..##..#', '.#....#.', '..####..', '........'], // 目
    ['........', '.##..##.', '#..##..#', '........', '.##..##.', '#..##..#', '........', '........'], // 波
    ['...#....', '..###...', '.#####..', '#######.', '...#.#..', '...###..', '..#####.', '########'], // 山と家
    ['#.....#.', '.#...#..', '..###...', '.#####..', '.#o#o#..', '..###...', '..#.#...', '..#.#...'], // 鹿
  ];
  var GLYPH_COL = [BRONZE, PATINA, BONE, RED, PATINA, BRONZE, BONE];

  var RESTORER = [
    ['...##...', '..####..', '..#oo#..', '...##...', '.######.', '#.####.#', '..####..', '..#..#..', '.##..##.'],
    ['...##...', '..####..', '..#oo#..', '...##...', '.######.', '.#####.#', '#.####..', '..#..#..', '.##..##.'],
  ];

  // ── 盤面 ──
  function layout(n) {
    var cols = n === 4 ? 2 : n === 6 ? 3 : 4;
    var rows = n / cols;
    var tw = n === 8 ? 200 : 230, th = n === 8 ? 230 : 260, gap = 26;
    var ox = W / 2 - (cols * tw + (cols - 1) * gap) / 2;
    var oy = H * 0.46 - (rows * th + (rows - 1) * gap) / 2;
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push({ x: ox + (i % cols) * (tw + gap), y: oy + Math.floor(i / cols) * (th + gap), w: tw, h: th });
    }
    return out;
  }

  function buildBoard(n, fixedOrder) {
    var pool = [];
    for (var g = 0; g < GLYPHS.length; g++) pool.push(g);
    for (var a = pool.length - 1; a > 0; a--) { var b = Math.floor(game.random(0, a + 1)); var t = pool[a]; pool[a] = pool[b]; pool[b] = t; }
    var glyphs = [];
    for (var p = 0; p < n / 2; p++) { glyphs.push(pool[p]); glyphs.push(pool[p]); }
    if (!fixedOrder) {
      for (var c = glyphs.length - 1; c > 0; c--) { var d = Math.floor(game.random(0, c + 1)); var u = glyphs[c]; glyphs[c] = glyphs[d]; glyphs[d] = u; }
    } else {
      glyphs = fixedOrder.slice();
    }
    var rects = layout(n);
    var tiles = [];
    for (var i = 0; i < n; i++) tiles.push({ g: glyphs[i], x: rects[i].x, y: rects[i].y, w: rects[i].w, h: rects[i].h, lift: 0, open: false, done: false, glow: 0 });
    return tiles;
  }

  // ── 状態 ──
  var tiles, stage, first, lockT, peekT, timeLeft, ready, pairs, streak, bestStreak, misses, score, halt, over, won, endT, prevBest;

  function initGame() {
    stage = 0; pairs = 0; streak = 0; bestStreak = 0; misses = 0; score = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; halt = null; over = false; won = false; endT = 0;
    prevBest = game.best || 0;
    startStage();
  }

  function startStage() {
    tiles = buildBoard(BOARDS[stage]);
    first = -1; lockT = 0;
    peekT = 0.7 - stage * 0.15; // 面の頭で一瞬だけ全部めくれる(徐々に短く)
  }

  function tileAt(x, y) {
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return i;
    }
    return -1;
  }

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 描画 ──
  function drawRoom() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.35, STYLE.bg[2]], [0.8, STYLE.bg[1]], [1, '#0c0a08']]);
    // 奥の石壁(ブロック目地)
    for (var r = 0; r < 12; r++) {
      var yy = 250 + r * 90;
      game.draw.rect(0, yy, W, 3, '#000000', 0.25);
      for (var c = 0; c < 7; c++) game.draw.rect(((r % 2) * 80 + c * 160) % W, yy, 3, 90, '#000000', 0.2);
    }
    // 吊りランプの光だまり
    var flick = 0.1 + 0.03 * Math.sin(game.time.elapsed * 7) + 0.02 * Math.sin(game.time.elapsed * 13);
    game.draw.circle(W / 2, H * 0.3, 520, BONE, flick * 0.4);
    game.draw.circle(W / 2, H * 0.3, 300, BONE, flick * 0.5);
    game.draw.line(W / 2, 230, W / 2, 300, UMBER, 4);
    game.draw.circle(W / 2, 310, 18, BONE, 0.8 + flick);
    // 作業台(手前)
    game.draw.gradient(H * 0.78, H, [[0, '#3a2c1f'], [1, '#120d09']]);
    game.draw.rect(0, H * 0.78, W, 6, BRONZE, 0.5);
  }

  function drawGrain() {
    for (var i = 0; i < 90; i++) game.draw.rect(Math.random() * W, Math.random() * H, 3, 3, i % 2 ? '#ffffff' : '#000000', 0.06);
    // ビネット
    game.draw.rect(0, 0, 60, H, '#000000', 0.3);
    game.draw.rect(W - 60, 0, 60, H, '#000000', 0.3);
  }

  function drawTile(t, highlight) {
    // 石板の面取り(上明・下暗)
    game.draw.rect(t.x - 6, t.y - 6, t.w + 12, t.h + 12, '#000000', 0.5);
    game.draw.rect(t.x, t.y, t.w, t.h, '#5a4a3a');
    game.draw.rect(t.x, t.y, t.w, 8, BONE, 0.35);
    game.draw.rect(t.x, t.y + t.h - 8, t.w, 8, '#000000', 0.4);
    if (t.lift > 0.3 || t.done) {
      game.draw.sprite(GLYPHS[t.g], { '#': GLYPH_COL[t.g], 'o': '#1a1410' }, t.x + t.w / 2, t.y + t.h / 2, 20, { anchor: 'center' });
    }
    if (t.done) {
      var gl = 0.15 + 0.1 * Math.sin(game.time.elapsed * 4 + t.x);
      game.draw.rect(t.x, t.y, t.w, t.h, BRONZE, gl + t.glow * 0.5);
    }
    // 布(下からまくれ上がる)
    var cover = 1 - t.lift;
    if (!t.done && cover > 0.02) {
      var ch = t.h * cover;
      game.draw.rect(t.x - 4, t.y - 4, t.w + 8, ch + 4, '#8c7a5c');
      for (var f = 0; f < 4; f++) game.draw.line(t.x + 20 + f * (t.w - 40) / 3, t.y, t.x + 12 + f * (t.w - 40) / 3, t.y + ch, '#6e5f46', 4);
      game.draw.rect(t.x - 4, t.y + ch - 10, t.w + 8, 10, '#5d4f3a');
    }
    if (highlight) {
      game.draw.rect(t.x - 10, t.y - 10, t.w + 20, t.h + 20, '#ffffff', highlight);
    }
  }

  function drawBoard(list) {
    for (var i = 0; i < list.length; i++) drawTile(list[i], 0);
  }

  function drawTray(frame, stageIdx) {
    game.draw.sprite(RESTORER[frame], { '#': BONE, 'o': '#1a1410' }, W * 0.15, H * 0.86, 16, { anchor: 'center' });
    // 面の進捗プレート
    for (var s = 0; s < BOARDS.length; s++) {
      var px = W * 0.42 + s * 150, py = H * 0.86;
      game.draw.rect(px - 55, py - 40, 110, 80, s < stageIdx ? BRONZE : '#2a2018');
      game.draw.rect(px - 55, py - 40, 110, 8, BONE, 0.3);
      txt(String(BOARDS[s]), px, py + 4, 40, s < stageIdx ? '#1a1410' : UMBER);
    }
  }

  // ── ロジック(プレイとデモで共有) ──
  function stepTiles(list, dt) {
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var want = t.open || t.done ? 1 : 0;
      t.lift += (want - t.lift) * Math.min(1, dt * 14);
      if (t.glow > 0) t.glow -= dt;
    }
  }

  // 1枚めくる。戻り値: 'first' | 'match' | 'miss'
  function reveal(list, idx, prevIdx) {
    list[idx].open = true;
    if (prevIdx < 0) return 'first';
    if (list[prevIdx].g === list[idx].g) {
      list[prevIdx].done = true; list[idx].done = true;
      list[prevIdx].glow = 0.6; list[idx].glow = 0.6;
      return 'match';
    }
    return 'miss';
  }

  function allDone(list) {
    for (var i = 0; i < list.length; i++) if (!list[i].done) return false;
    return true;
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.45); state = STATE.PLAYING; initGame(); return; }
    if (state === STATE.RESULT) { game.audio.play('se_tap', 0.2); state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt) { game.audio.play('se_tap', 0.05); return; }
    if (ready > 0 || peekT > 0 || lockT > 0) { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: UMBER, count: 4, speed: 90 }); return; }
    var i = tileAt(x, y);
    if (i < 0 || tiles[i].done || tiles[i].open) { game.audio.play('se_tap', 0.06); game.fx.burst(x, y, { color: UMBER, count: 3, speed: 60 }); return; }
    game.audio.play('se_tap', 0.3);
    game.fx.burst(tiles[i].x + tiles[i].w / 2, tiles[i].y + tiles[i].h * 0.8, { color: '#8c7a5c', count: 8, speed: 160 });
    var res = reveal(tiles, i, first);
    if (res === 'first') { first = i; return; }
    var a = first, b = i;
    first = -1;
    if (res === 'match') {
      pairs++; streak++; bestStreak = Math.max(bestStreak, streak);
      score += 100 + (streak - 1) * 40;
      var cx = tiles[b].x + tiles[b].w / 2, cy = tiles[b].y + tiles[b].h / 2;
      game.feedback.good(cx, cy, { text: streak >= 3 ? 'PERFECT' : 'GOOD', color: BRONZE, count: 14 });
      if (streak === 3) { game.fx.popup('COMBO x' + streak, W / 2, H * 0.2, { color: PATINA, size: 54 }); game.audio.play('se_milestone', 0.35); }
      if (allDone(tiles)) {
        lockT = 0.55;
        game.audio.play('se_powerup', 0.4);
        game.fx.popup(pairs + ' / ' + NEEDED, W / 2, H * 0.72, { color: BONE, size: 48 });
      }
    } else {
      streak = 0; misses++;
      halt = { t: 0.4, max: 0.4, a: a, b: b };
    }
  });

  function endRun(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) score += Math.floor(timeLeft * 30);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  // ── ATTRACT ゴースト実演(4枚の盤で「外れ→当たり→当たり」) ──
  var demo = { t: 0, board: null, gx: W / 2, gy: H * 0.8, press: false, first: -1, step: 0, shut: [0, 0], shutT: 0 };
  var DEMO_PLAN = [[0.5, 0], [1.0, 1], [1.9, 0], [2.4, 3], [3.1, 1], [3.6, 2]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt || !demo.board) {
      demo.board = buildBoard(4, [5, 1, 1, 5]);
      demo.first = -1; demo.step = 0; demo.shutT = 0;
    }
    var nx = DEMO_PLAN[Math.min(demo.step, DEMO_PLAN.length - 1)];
    var target = demo.board[nx[1]];
    var tx = target.x + target.w / 2, ty = target.y + target.h / 2 + 30;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 8);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 8);
    demo.press = false;
    if (demo.step < DEMO_PLAN.length && cyc >= nx[0]) {
      demo.press = true;
      var res = reveal(demo.board, nx[1], demo.first);
      if (res === 'first') demo.first = nx[1];
      else {
        if (res === 'match') game.feedback.good(tx, ty - 30, { text: 'GOOD', color: BRONZE, count: 8, volume: 0.2 });
        else { demo.shut = [demo.first, nx[1]]; demo.shutT = 0.4; game.audio.play('se_bad', 0.12); }
        demo.first = -1;
      }
      demo.step++;
    }
    if (demo.shutT > 0) {
      demo.shutT -= dt;
      if (demo.shutT <= 0) { demo.board[demo.shut[0]].open = false; demo.board[demo.shut[1]].open = false; }
    }
    if (cyc - (demo.step > 0 ? DEMO_PLAN[demo.step - 1][0] : 0) < 0.18) demo.press = true;
    stepTiles(demo.board, dt);
  }

  game.onUpdate(function (dt) {
    var frame = Math.floor(game.time.elapsed * 2.5) % 2;

    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawRoom();
      drawBoard(demo.board);
      drawTray(frame, 0);
      drawGrain();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(TITLE, W / 2, H * 0.07, 64, BONE);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 34, BRONZE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 44, BRONZE);
      else txt('INSERT COIN', W / 2, H * 0.955, 36, BONE);
      return;
    }

    if (state === STATE.RESULT) {
      stepTiles(tiles, dt);
      drawRoom();
      drawBoard(tiles);
      drawTray(frame, stage);
      game.draw.rect(0, H * 0.2, W, H * 0.28, '#000000', 0.6);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 96, won ? BRONZE : RED);
      txt(pairs + ' / ' + NEEDED, W / 2, H * 0.32, 54, BONE);
      txt('SCORE ' + score + '   COMBO x' + bestStreak, W / 2, H * 0.37, 40, BONE);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.42, 48, PATINA);
      else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.42, 36, UMBER);
      if (!won) txt('あと' + (NEEDED - pairs) + '対!', W / 2, H * 0.46, 42, PATINA);
      drawGrain();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 36, BONE);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        state = STATE.RESULT;
        var stats = { pairs: pairs, misses: misses, bestStreak: bestStreak, stage: stage + (won ? 0 : 1) };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) {
        var ta = tiles[halt.a], tb = tiles[halt.b];
        game.feedback.bad(tb.x + tb.w / 2, tb.y + tb.h / 2, { text: 'MISS', shake: 10 });
        ta.open = false; tb.open = false;
        timeLeft -= MISS_COST;
        game.fx.popup('-' + MISS_COST, W - 150, 200, { color: RED, size: 40 });
        halt = null;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      if (peekT > 0) {
        peekT -= dt;
        for (var p = 0; p < tiles.length; p++) tiles[p].open = peekT > 0;
      }
      if (lockT > 0) {
        lockT -= dt;
        if (lockT <= 0) {
          stage++;
          if (stage >= BOARDS.length) { stage = BOARDS.length; endRun(true); }
          else { startStage(); game.audio.play('se_milestone', 0.3); }
        }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP' });
        endRun(false);
      }
    }
    if (timeLeft < 0) timeLeft = 0;
    stepTiles(tiles, dt);

    drawRoom();
    for (var i = 0; i < tiles.length; i++) {
      var hl = 0;
      if (halt && (i === halt.a || i === halt.b)) hl = 0.5 * (halt.t / halt.max) + 0.15;
      if (halt && hl > 0) {
        var t = tiles[i], k = 1 - halt.t / halt.max;
        var big = { g: t.g, x: t.x - 12 * k, y: t.y - 12 * k, w: t.w + 24 * k, h: t.h + 24 * k, lift: 1, open: true, done: false, glow: 0 };
        drawTile(big, hl);
      } else {
        drawTile(tiles[i], 0);
      }
    }
    drawTray(frame, stage);
    drawGrain();

    // HUD
    txt(pairs + ' / ' + NEEDED, W * 0.18, 90, 50, BONE);
    txt(String(score), W * 0.82, 90, 46, BRONZE);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var warn = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 22, '#000000', 0.5);
    game.draw.rect(60, 170, (W - 120) * frac, 22, warn ? RED : PATINA);
    game.draw.rect(60, 170, (W - 120) * frac, 6, '#ffffff', 0.25);
    if (streak >= 2) txt('x' + streak, W / 2, 90, 44, PATINA);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 96, BONE);
  });

  game.onStart(function () {
    game.audio.melody([['D4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1], ['D4', 0.5], ['C4', 0.5], ['D4', 1.5], ['R', 0.5]], { tempo: 96, wave: 'sine', volume: 0.05, loop: true });
    state = STATE.ATTRACT;
    initGame();
  });
})(game);

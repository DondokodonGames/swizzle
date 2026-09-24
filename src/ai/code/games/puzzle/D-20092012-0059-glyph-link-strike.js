// D-20092012-0059-glyph-link-strike.js
// グリフリンクストライク — 石盤に浮かぶ紋章を指でなぞって3つ以上つなぎ、揃えた属性で門番像を撃つ
// 操作: 盤面の同じ紋章を指でなぞって連結(3つ以上)、指を離すと連結数ぶん門番像に攻撃が入る
// 終わり: 門番像のHPを0にすれば成功。制限時間内に倒せなければ失敗
// @mechanic: connect
// @theme: rune_shrine_duel
// 世界観: 地下祭壇に立つ石の門番像と対峙する紋章使い。盤に浮かぶ紋章をつないで力を練り、まとめて解き放って像を打ち崩す
// 残るもの: 正誤(CLEAR/GAME OVER) + 与えた合計ダメージ
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒輪郭 + 明暗2色だけ。中間調を作らない
  var C = {
    bg: '#1c1030', bg2: '#120a20', ink: '#08050c',
    stoneLit: '#8a7aa8', stoneDark: '#463658',
    glyphA: ['#ff5566', '#a01020'], glyphB: ['#3fd0ff', '#0a5a80'],
    glyphC: ['#ffd23f', '#a07a10'], glyphD: ['#5cff8a', '#0a7a3a'],
    white: '#f4eefa', gold: '#ffd23f', bad: '#ff4d5e', good: '#5cff8a',
  };
  var GLYPHS = [C.glyphA, C.glyphB, C.glyphC, C.glyphD];

  var GAME_TITLE = 'GLYPH LINK';
  var COLS = 4, ROWS = 5;
  var GX0 = W * 0.14, GY0 = H * 0.30, CELL = (W * 0.72) / COLS;
  var BOSS_HP_MAX = 20;
  var TIME_LIMIT = 19;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, chain, dragging, bossHp, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, bossFlash, bossShakeT, milestoneShown, totalDmg;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GOLEM = [
    '..####..',
    '.######.',
    '##.##.##',
    '########',
    '.##..##.',
    '.##..##.',
  ];

  function cellPos(c, r) { return { x: GX0 + CELL * (c + 0.5), y: GY0 + CELL * (r + 0.5) }; }

  function makeGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(Math.floor(game.random(0, GLYPHS.length)));
      g.push(row);
    }
    return g;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, H * 0.16 + i * 14, W, H * 0.16 + i * 14, '#00000022', 2);
    }
  }

  function drawBoss(hp, flashT, shakeAmt) {
    var bob = Math.sin(game.time.elapsed * 1.7) * 6;
    var bx = W * 0.5 + (shakeAmt > 0 ? Math.sin(game.time.elapsed * 60) * shakeAmt * 18 : 0);
    var by = H * 0.14 + bob;
    var pal = flashT > 0 ? { '#': '#ffffff' } : { '#': hp > BOSS_HP_MAX * 0.3 ? C.stoneLit : C.bad };
    game.draw.sprite(GOLEM, pal, bx, by, 16, { anchor: 'center' });
    game.draw.rect(W * 0.5 - 160, H * 0.20, 320, 22, C.ink, 0.6);
    game.draw.rect(W * 0.5 - 160, H * 0.20, 320 * Math.max(0, hp / BOSS_HP_MAX), 22, C.bad);
  }

  function drawGrid(g, chainArr) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (g[r][c] < 0) continue;
        var p = cellPos(c, r);
        var inChain = chainArr && chainArr.some(function(k) { return k.c === c && k.r === r; });
        var pal = GLYPHS[g[r][c]];
        game.draw.circle(p.x, p.y, CELL * 0.42, pal[1]);
        game.draw.circle(p.x, p.y, CELL * 0.34, inChain ? C.white : pal[0]);
      }
    }
    if (chainArr && chainArr.length > 1) {
      for (var i = 1; i < chainArr.length; i++) {
        var a = cellPos(chainArr[i - 1].c, chainArr[i - 1].r);
        var b = cellPos(chainArr[i].c, chainArr[i].r);
        game.draw.line(a.x, a.y, b.x, b.y, C.white, 10);
      }
    }
  }

  function cellAt(x, y) {
    var c = Math.floor((x - GX0) / CELL);
    var r = Math.floor((y - GY0) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    var p = cellPos(c, r);
    if (Math.hypot(x - p.x, y - p.y) > CELL * 0.48) return null;
    return { c: c, r: r };
  }

  function refill() {
    for (var c = 0; c < COLS; c++) {
      var stack = [];
      for (var r = ROWS - 1; r >= 0; r--) if (grid[r][c] >= 0) stack.push(grid[r][c]);
      for (var r2 = ROWS - 1; r2 >= 0; r2--) {
        grid[r2][c] = stack.length ? stack.shift() : Math.floor(game.random(0, GLYPHS.length));
      }
    }
  }

  function initGame() {
    grid = makeGrid(); chain = []; dragging = false;
    bossHp = BOSS_HP_MAX; timeLeft = TIME_LIMIT; totalDmg = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; bossFlash = 0; bossShakeT = 0; milestoneShown = false;
  }

  function startChain(x, y) {
    if (ready > 0 || finished) return;
    var cell = cellAt(x, y);
    if (!cell) { game.audio.play('se_tap', 0.05); return; }
    dragging = true; chain = [cell];
    game.audio.play('se_tap', 0.15);
  }

  function extendChain(x, y) {
    if (!dragging || finished) return;
    var cell = cellAt(x, y);
    if (!cell) return;
    var last = chain[chain.length - 1];
    if (last.c === cell.c && last.r === cell.r) return;
    if (chain.length >= 2) {
      var prev = chain[chain.length - 2];
      if (prev.c === cell.c && prev.r === cell.r) { chain.pop(); return; }
    }
    var adj = Math.abs(cell.c - last.c) <= 1 && Math.abs(cell.r - last.r) <= 1;
    if (!adj) return;
    if (grid[cell.r][cell.c] !== grid[last.r][last.c]) return;
    if (chain.some(function(k) { return k.c === cell.c && k.r === cell.r; })) return;
    chain.push(cell);
    game.audio.play('se_tap', 0.08);
  }

  function releaseChain() {
    if (!dragging) return;
    dragging = false;
    if (chain.length >= 3) {
      var dmg = chain.length;
      totalDmg += dmg;
      for (var i = 0; i < chain.length; i++) grid[chain[i].r][chain[i].c] = -1;
      refill();
      bossHp -= dmg;
      bossFlash = 0.15; bossShakeT = 0.2;
      game.feedback.good(W * 0.5, H * 0.16, { text: dmg >= 5 ? 'PERFECT' : 'GOOD', color: C.gold });
      game.fx.burst(W * 0.5, H * 0.16, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_break', 0.4);
      if (!milestoneShown && bossHp <= BOSS_HP_MAX * 0.5) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W * 0.5, H * 0.24, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (bossHp <= 0) { ok = true; finished = true; hitStop = 0.2; finish(); }
    } else if (chain.length > 0) {
      game.feedback.bad(cellPos(chain[0].c, chain[0].r).x, cellPos(chain[0].c, chain[0].r).y, { text: '' });
    }
    chain = [];
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) startChain(x, y); });
  game.onMove(function(x, y) { if (state === S.PLAYING) extendChain(x, y); });
  game.onRelease(function() { if (state === S.PLAYING) releaseChain(); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 'move', path: [], idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      grid = makeGrid();
      bossHp = BOSS_HP_MAX;
      chain = [];
      demo.path = [{ c: 0, r: 2 }, { c: 1, r: 2 }, { c: 1, r: 1 }];
      var v = grid[2][0];
      grid[2][1] = v; grid[1][1] = v;
      demo.idx = 0; demo.phase = 'move';
    }
    var stepDur = 0.42;
    var into = cyc / stepDur;
    if (demo.phase === 'move') {
      var target = demo.path[Math.min(demo.idx, demo.path.length - 1)];
      var tp = cellPos(target.c, target.r);
      demo.gx = tp.x; demo.gy = tp.y; demo.press = true;
      if (chain.length <= demo.idx) chain.push(target);
      if (into > (demo.idx + 1) && demo.idx < demo.path.length - 1) demo.idx++;
      if (cyc > stepDur * demo.path.length) { demo.phase = 'release'; }
    } else if (demo.phase === 'release') {
      demo.press = false;
      if (chain.length) {
        var dmg = chain.length;
        for (var i = 0; i < chain.length; i++) grid[chain[i].r][chain[i].c] = -1;
        refill();
        bossHp -= dmg;
        bossFlash = 0.15;
        chain = [];
        demo.phase = 'wait';
      }
    }
  }

  game.onUpdate(function(dt) {
    if (bossFlash > 0) bossFlash -= dt;
    if (bossShakeT > 0) bossShakeT -= dt;

    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBoss(bossHp, bossFlash, bossShakeT);
      drawGrid(grid, chain);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.245, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoss(Math.max(0, bossHp), 0, 0);
      drawGrid(grid, null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt('DMG ' + totalDmg, W / 2, H * 0.245, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.ceil(bossHp)) + '!', W / 2, H * 0.29, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(totalDmg, { dmg: totalDmg, time: Math.max(0, timeLeft).toFixed(1) });
        else game.end.failure({ dmg: totalDmg });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoss(bossHp, bossFlash, bossShakeT);
    if (!finished) drawGrid(grid, chain);

    txt('TIME ' + Math.max(0, timeLeft).toFixed(1), W * 0.5, H * 0.965, 30, C.white);
    txt('DMG ' + totalDmg + ' / ' + BOSS_HP_MAX, W * 0.5, H * 0.06, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

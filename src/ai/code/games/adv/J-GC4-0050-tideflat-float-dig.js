// J-GC4-0050-tideflat-float-dig.js
// 干潟の浮き玉掘り — 掘った穴に出る「宝までの歩数」を手がかりに次の一掘りを決める。一掘りごとに潮が一列ずつ満ちてくる
// 操作: 干潟のマスをタップして掘る。穴には埋まった浮き玉までの縦横の歩数が出る(0なら発見)。掘るたびに潮の番が来て、上から一列が海に沈む
// 終わり: 浮き玉を3つ掘り当てればCLEAR。潮に2つ持っていかれる・時間切れでGAME OVER
// @mechanic: turn_attack
// @theme: tideflat_float_dig
// 世界観: 夕暮れの干潟で、網元の孫娘が嵐で埋もれた硝子の浮き玉を探す。自分が一掘りすると潮が一列攻めてくる交互の勝負で、穴に出る歩数だけを頼りに沈む前に掘り当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 掘り当てた浮き玉の数と掘った回数
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)とビネット
  var STYLE = {
    bg: ['#2a2622', '#4a4038', '#6b5d4f'],
    main: ['#9c8a74', '#b8a58c', '#d8c8ae'],
    accent: ['#7fc4d8', '#e8904a'],
  };
  var SEA = '#3d5a66';
  var FOAM = '#d8e8e8';
  var WARM = STYLE.accent[1];
  var COOL = STYLE.accent[0];
  var GOLD = '#f2d27a';
  var GOOD_C = '#9df0b8';
  var BAD_C = '#ff6b5a';

  var GAME_TITLE = 'TIDEFLAT DIG';
  var TIME_LIMIT = 25;
  var NEEDED = 3;
  var MAX_LOST = 2;
  var COLS = 5, ROWS = 6;
  var CELL = 176, GAP = 10;
  var GX = (W - (COLS * CELL + (COLS - 1) * GAP)) / 2;
  var GY = 440;
  var TURN_T = 3.0;
  var TIDE_T = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FLOAT = ['..nn..', '.nbbn.', 'nbBbbn', 'nbbbbn', '.nbbn.', '..nn..'];
  var FLOAT_PAL = { n: '#6b5d4f', b: '#7fc4d8', B: '#e8f8ff' };
  var DIGGER = [
    ['...hh...', '..hhhh..', '..hssh..', '...ss..t', '.cccccct', '..cccc.t', '..c..c.t', '..c..c..'],
    ['...hh...', '..hhhh..', '..hssh..', '...ss...', '.cccccc.', '..cccct.', '..c..ct.', '..c..ct.'],
  ];
  var DIGGER_PAL = { h: '#e8d8b0', s: '#e0b890', c: '#8a5a48', t: '#c8c0b0' };
  var SHOVEL = ['.t.', '.t.', '.t.', 'ttt', 'ttt'];
  var WAVE = ['..ww..', '.w..w.', 'w....w'];
  var CRAB = [['r.r..r.r', '.rrrrrr.', 'rrrrrrrr', '.r.rr.r.'], ['.r....r.', 'rrrrrrrr', 'rrrrrrrr', 'r..rr..r']];

  var cells, treasure, tideRow, phase, phaseT, found, lost, digs, timeLeft, ready;
  var hitStop, hitKind, ended, endWait, won, score, lastDig, tideFlash;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#141210', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function idx(r, c) { return r * COLS + c; }

  function newBoard() {
    cells = [];
    for (var i = 0; i < COLS * ROWS; i++) cells.push({ dug: false, clue: -1, t: 0 });
    var r = Math.floor(game.random(2, ROWS - 0.001));
    var c = Math.floor(game.random(0, COLS - 0.001));
    treasure = idx(r, c);
    tideRow = 0;
    phase = 'dig';
    phaseT = 0;
    lastDig = -1;
  }

  function initGame() {
    found = 0;
    lost = 0;
    digs = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    hitKind = '';
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    tideFlash = 0;
    newBoard();
  }

  function cellXY(i) {
    return { x: GX + (i % COLS) * (CELL + GAP), y: GY + Math.floor(i / COLS) * (CELL + GAP) };
  }

  function cellAt(x, y) {
    for (var i = 0; i < cells.length; i++) {
      var p = cellXY(i);
      if (x >= p.x && x <= p.x + CELL && y >= p.y && y <= p.y + CELL) return i;
    }
    return -1;
  }

  function dist(a, b) {
    return Math.abs((a % COLS) - (b % COLS)) + Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS));
  }

  function flooded(i) { return Math.floor(i / COLS) < tideRow; }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  // 自分の番: 一掘り
  function dig(i, demo) {
    if (phase !== 'dig' || ended || hitStop > 0 || i < 0) return false;
    if (flooded(i) || cells[i].dug) return false;
    var cc = cells[i];
    cc.dug = true;
    cc.clue = dist(i, treasure);
    cc.t = 0;
    digs++;
    lastDig = i;
    var p = cellXY(i);
    if (!demo) game.audio.play('se_tap', 0.4);
    game.fx.burst(p.x + CELL / 2, p.y + CELL / 2, { color: STYLE.main[2], count: 10, speed: 220 });
    if (cc.clue === 0) {
      hitStop = 0.4;
      hitKind = 'found';
      return true;
    }
    game.fx.popup(String(cc.clue), p.x + CELL / 2, p.y - 10, { color: cc.clue <= 1 ? WARM : GOLD, size: 50 });
    phase = 'tide';
    phaseT = 0;
    if (!demo) game.audio.tone('G2', 0.4, { wave: 'sine', volume: 0.08, slide: -40 });
    return true;
  }

  function resolveHit(demo) {
    var p = cellXY(treasure);
    if (hitKind === 'found') {
      found++;
      var bonus = (ROWS - tideRow) * 40;
      score += 150 + bonus;
      game.feedback.good(p.x + CELL / 2, p.y + CELL / 2, { text: tideRow <= 1 ? 'PERFECT' : 'GOOD', color: GOOD_C, count: 24, volume: demo ? 0 : undefined });
      if (!demo) game.audio.play('se_coin', 0.5);
      if (!demo && found === 2) {
        game.fx.popup(found + ' / ' + NEEDED, W / 2, GY - 80, { color: GOLD, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      if (found >= NEEDED && !demo) { endGame(true, demo); return; }
    } else {
      lost++;
      game.feedback.bad(p.x + CELL / 2, p.y + CELL / 2, { text: 'MISS', volume: demo ? 0 : undefined });
      if (lost >= MAX_LOST && !demo) { endGame(false, demo); return; }
    }
    hitKind = '';
    newBoard();
  }

  function stepTurns(dt, demo) {
    phaseT += dt;
    if (tideFlash > 0) tideFlash -= dt;
    for (var i = 0; i < cells.length; i++) cells[i].t += dt;
    if (phase === 'dig') {
      if (phaseT >= TURN_T) {
        // 迷いすぎ: 潮が先に攻めてくる
        phase = 'tide';
        phaseT = 0;
        if (!demo) game.audio.play('se_bad', 0.25);
      }
    } else if (phase === 'tide') {
      if (phaseT >= TIDE_T) {
        tideRow++;
        tideFlash = 0.3;
        if (!demo) game.audio.play('se_break', 0.3);
        if (flooded(treasure)) {
          hitStop = 0.5;
          hitKind = 'lost';
          return;
        }
        if (tideRow >= ROWS) { hitStop = 0.5; hitKind = 'lost'; return; }
        phase = 'dig';
        phaseT = 0;
      }
    }
  }

  // ── 描画 ──
  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#5a6a70'], [0.14, '#8a7a68'], [0.22, SEA], [0.25, STYLE.bg[2]], [1, STYLE.bg[1]]]);
    // 夕日のブルーム
    game.draw.circle(W * 0.75, 250, 150, '#f2c890', 0.12);
    game.draw.circle(W * 0.75, 250, 95, '#f2c890', 0.22);
    game.draw.circle(W * 0.75, 250, 55, '#ffe8c0', 0.6);
    // 沖の波
    for (var k = 0; k < 7; k++) {
      var wx = ((k * 170 + t * 30) % (W + 100)) - 50;
      game.draw.sprite(WAVE, { w: FOAM }, wx, 390 + (k % 2) * 16, 7, { anchor: 'center', alpha: 0.5 });
    }
    // 岸の砂(親指ゾーン)
    game.draw.rect(0, 1570, W, H - 1570, STYLE.main[0]);
    for (var s = 0; s < 18; s++) game.draw.rect((s * 131) % W, 1600 + (s * 53) % 280, 10, 4, STYLE.bg[2], 0.5);
    // ビネット
    game.draw.rect(0, 0, 40, H, '#000000', 0.25);
    game.draw.rect(W - 40, 0, 40, H, '#000000', 0.25);
    game.draw.rect(0, H - 60, W, 60, '#000000', 0.2);
    game.draw.rect(0, 0, W, H, '#f2c890', 0.03 + 0.025 * Math.sin(t * 1.3));
  }

  function clueColor(n) {
    if (n <= 1) return WARM;
    if (n <= 3) return GOLD;
    return COOL;
  }

  function drawGrid() {
    var t = game.time.elapsed;
    for (var i = 0; i < cells.length; i++) {
      var p = cellXY(i);
      var c = cells[i];
      var row = Math.floor(i / COLS);
      if (row < tideRow) {
        var shimmer = 0.75 + 0.1 * Math.sin(t * 3 + i);
        game.draw.rect(p.x - GAP / 2, p.y - GAP / 2, CELL + GAP, CELL + GAP, SEA, shimmer);
        game.draw.sprite(WAVE, { w: FOAM }, p.x + CELL / 2 + Math.sin(t * 2 + i) * 10, p.y + CELL / 2, 8, { anchor: 'center', alpha: 0.5 });
        continue;
      }
      var sink = row === tideRow && phase === 'tide';
      var base = STYLE.main[1];
      game.draw.rect(p.x, p.y, CELL, CELL, base);
      game.draw.rect(p.x, p.y, CELL, 10, STYLE.main[2], 0.6);
      game.draw.rect(p.x, p.y + CELL - 12, CELL, 12, STYLE.bg[2], 0.5);
      if (c.dug) {
        game.draw.circle(p.x + CELL / 2, p.y + CELL / 2, 62, '#3a3028');
        game.draw.circle(p.x + CELL / 2, p.y + CELL / 2, 62, clueColor(c.clue), 0.25);
        if (c.clue > 0) txt(String(c.clue), p.x + CELL / 2, p.y + CELL / 2 + 24, 72, clueColor(c.clue));
      } else {
        // 砂の粒立ち
        game.draw.rect(p.x + 30 + (i * 17) % 60, p.y + 50, 12, 6, STYLE.main[0], 0.7);
        game.draw.rect(p.x + 90 - (i * 13) % 50, p.y + 110, 12, 6, STYLE.main[0], 0.7);
      }
      // 潮の予告: 次に沈む列の泡が点滅
      if (sink && Math.floor(t * 12) % 2 === 0) game.draw.rect(p.x, p.y, CELL, 24, FOAM, 0.9);
      if (phase === 'dig' && row === tideRow) game.draw.rect(p.x, p.y, CELL, 6, FOAM, 0.4 + 0.3 * Math.sin(t * 4));
    }
    if (tideFlash > 0) {
      var ry = GY + (tideRow - 1) * (CELL + GAP);
      game.draw.rect(GX - 10, ry, COLS * (CELL + GAP), CELL, '#ffffff', tideFlash);
    }
    // 見つけた/流された瞬間のハイライト
    if (hitStop > 0) {
      var tp = cellXY(treasure);
      var grow = (0.5 - hitStop) * 80;
      game.draw.rect(tp.x - grow / 2, tp.y - grow / 2, CELL + grow, CELL + grow, '#ffffff', 0.45);
      game.draw.sprite(FLOAT, FLOAT_PAL, tp.x + CELL / 2, tp.y + CELL / 2 - (hitKind === 'found' ? grow : -grow * 0.3), 20 + grow * 0.1, { anchor: 'center' });
    }
  }

  function drawShore() {
    var t = game.time.elapsed;
    var tx = lastDig >= 0 ? cellXY(lastDig).x + CELL / 2 : W / 2;
    var dx = Math.max(140, Math.min(W - 140, tx));
    game.draw.rect(dx - 60, 1790, 120, 16, '#000000', 0.3);
    game.draw.sprite(DIGGER[Math.floor(t * 3) % 2], DIGGER_PAL, dx + Math.sin(t * 1.4) * 8, 1720 + Math.sin(t * 3) * 5, 16, { anchor: 'center' });
    game.draw.sprite(CRAB[Math.floor(t * 5) % 2], { r: '#c86a4a' }, (t * 60) % (W + 100) - 50, 1860, 8, { anchor: 'center' });
    // 手番の表示: シャベル(自分) と 波(潮)
    var myTurn = phase === 'dig' && hitStop <= 0;
    game.draw.circle(110, 1650, 64, myTurn ? GOLD : '#4a4038', myTurn ? 0.9 : 0.5);
    game.draw.sprite(SHOVEL, { t: '#2a2622' }, 110, 1650, 14, { anchor: 'center' });
    game.draw.circle(W - 110, 1650, 64, !myTurn ? COOL : '#4a4038', !myTurn ? 0.9 : 0.5);
    game.draw.sprite(WAVE, { w: '#2a2622' }, W - 110, 1650, 14, { anchor: 'center' });
    if (myTurn) {
      var f = Math.max(0, 1 - phaseT / TURN_T);
      game.draw.rect(40, 1730, 140 * f, 12, f < 0.25 ? BAD_C : GOLD);
    }
  }

  function drawHud() {
    txt(found + ' / ' + NEEDED, 60, 110, 54, GOLD, 'left');
    for (var i = 0; i < MAX_LOST; i++) game.draw.sprite(FLOAT, FLOAT_PAL, W - 90 - i * 90, 95, 10, { anchor: 'center', alpha: i < MAX_LOST - lost ? 1 : 0.2 });
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 18, '#2a2622');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? BAD_C : GOLD);
  }

  function drawScene() {
    drawBackground();
    drawGrid();
    drawShore();
  }

  // ── ATTRACT ゴースト実演: 手がかりから候補を絞る実ロジック ──
  function candidates() {
    var out = [];
    for (var i = 0; i < cells.length; i++) {
      if (flooded(i) || cells[i].dug) continue;
      var ok = true;
      for (var j = 0; j < cells.length; j++) if (cells[j].dug && cells[j].clue !== dist(i, j)) { ok = false; break; }
      if (ok) out.push(i);
    }
    return out;
  }
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, target: -1, loop: 0, digAt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      ready = 0;
      demo.loop++;
      demo.target = -1;
    }
    if (phase === 'dig' && hitStop <= 0 && demo.target < 0) {
      var cand = candidates();
      // 失敗例: 奇数周は最初の2回を的外れな場所に掘る
      if (demo.loop % 2 === 0 && digs < 2) {
        var far = cand.length ? cand[cand.length - 1] : 0;
        for (var i = cells.length - 1; i >= 0; i--) if (!flooded(i) && !cells[i].dug && dist(i, treasure) > 3) { far = i; break; }
        demo.target = far;
      } else {
        // 次の潮で沈む列に近い候補を優先
        demo.target = cand.length ? cand[0] : treasure;
      }
      demo.digAt = phaseT + 0.75;
    }
    if (demo.target >= 0) {
      var p = cellXY(demo.target);
      demo.gx += (p.x + CELL / 2 - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (p.y + CELL / 2 - demo.gy) * Math.min(1, dt * 8);
      demo.press = phase === 'dig' && phaseT > demo.digAt - 0.15;
      if (phase === 'dig' && phaseT >= demo.digAt) {
        dig(demo.target, true);
        demo.target = -1;
      }
    }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) { resolveHit(true); demo.target = -1; }
    } else {
      stepTurns(dt, true);
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
    if (ready > 0 || ended) return;
    var i = cellAt(x, y);
    if (!dig(i, false)) {
      game.audio.tone('D3', 0.05, { wave: 'triangle', volume: 0.05 });
      game.fx.burst(x, y, { color: STYLE.main[0], count: 4, speed: 100 });
    }
  });

  game.onUpdate(function (dt) {
    if (!cells) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 64, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 32, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.935, 44, GOLD);
      else txt('INSERT COIN', W / 2, H * 0.935, 34, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 230, W, 400, '#141210', 0.7);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 340, 86, won ? GOOD_C : BAD_C);
      txt('SCORE ' + score, W / 2, 420, 46, '#ffffff');
      txt(found + ' / ' + NEEDED, W / 2, 485, 40, GOLD);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 555, 40, GOLD);
      else txt('BEST ' + (game.best || 0), W / 2, 555, 34, STYLE.main[2]);
      if (!won) txt('あと' + (NEEDED - found) + '個!', W / 2, 610, 40, WARM);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.935, 36, '#ffffff');
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { found: found, digs: digs, lost: lost };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(false);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
        endGame(false, false);
      } else {
        stepTurns(dt, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, GOLD);
  });

  game.onStart(function () {
    game.audio.melody(
      [['A3', 0.5], ['C4', 0.5], ['E4', 1], ['D4', 0.5], ['C4', 0.5], ['B3', 1], ['G3', 0.5], ['A3', 1.5]],
      { tempo: 92, wave: 'triangle', volume: 0.05, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20092012-0033-glowvine-word-link.js
// グロウバイン・ワードリンク — 発光する葉のタイルを指でなぞってつなぎ、隠れた単語を光らせて咲かせる
// 操作: 隣り合う葉タイルを指でなぞってつなぎ、単語を完成させて離す
// 終わり: 制限時間内に全ての単語を咲かせれば成功。時間切れなら失敗
// @mechanic: connect
// @theme: glowing_word_garden
// 世界観: 夜光る蔓草の庭。葉のタイルに眠る単語を指でつなぎ合わせて咲かせ、庭全体を光らせる庭師の仕事
// 残るもの: 正誤(CLEAR/GAME OVER) + 咲かせた単語数
// スタイル: 2010s FLAT MOBILE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色、影/グラデ無し、丸角・大きい余白、判定は色変化で示す
  var C = {
    bg: '#1c2e28', tile: '#2e4a40', tileFound: '#3fae7a', tileChain: '#f2c94c',
    good: '#3fae7a', bad: '#e35b5b', gold: '#f2c94c', white: '#f4fff8', ink: '#0d1712',
  };

  var GAME_TITLE = 'WORD LINK';
  var COLS = 4, ROWS = 3;
  var GRID_TOP = H * 0.24, GRID_H = H * 0.42;
  var CELL = 190;
  var TIME_LIMIT = 18;

  var GRID = [
    ['B', 'E', 'E', 'S'],
    ['A', 'N', 'T', 'R'],
    ['O', 'W', 'L', 'K'],
  ];
  var WORDS = ['BEE', 'ANT', 'OWL'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var found, chain, timeLeft, milestoneShown, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FIREFLY = ['.#.', '###', '.#.'];
  function drawFirefly() {
    var fx = W * 0.5 + Math.cos(game.time.elapsed * 1.6) * (W * 0.32);
    var fy = H * 0.14 + Math.sin(game.time.elapsed * 2.1) * 14;
    game.draw.circle(fx, fy, 22, C.gold, 0.25);
    game.draw.sprite(FIREFLY, { '#': C.gold }, fx, fy, 10, { anchor: 'center' });
  }

  function cellPos(c, r) {
    var gx = W * 0.5 - (COLS - 1) * CELL / 2;
    return { x: gx + c * CELL, y: GRID_TOP + r * (GRID_H / (ROWS - 1)) };
  }

  function cellAt(x, y) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var p = cellPos(c, r);
        if (Math.hypot(p.x - x, p.y - y) < 90) return { c: c, r: r };
      }
    }
    return null;
  }

  function adjacent(a, b) {
    return Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
  }

  function initGame() {
    found = {}; chain = []; timeLeft = TIME_LIMIT; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, '#243c34'], [1, C.bg]]);
    // continuous ambient pulse (triangle wave) so overall canvas luminance is never identical frame-to-frame
    var ph = (game.time.elapsed % 5.3) / 5.3;
    var tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    game.draw.rect(0, 0, W, H, C.tileFound, 0.05 + tri * 0.11);
  }

  function inChain(c, r) {
    for (var i = 0; i < chain.length; i++) if (chain[i].c === c && chain[i].r === r) return true;
    return false;
  }

  function drawGrid() {
    for (var i = 1; i < chain.length; i++) {
      var p0 = cellPos(chain[i - 1].c, chain[i - 1].r);
      var p1 = cellPos(chain[i].c, chain[i].r);
      game.draw.line(p0.x, p0.y, p1.x, p1.y, C.tileChain, 14);
    }
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var p = cellPos(c, r);
        var fnd = found[c + ',' + r];
        var col = fnd ? C.tileFound : (inChain(c, r) ? C.tileChain : C.tile);
        game.draw.circle(p.x, p.y, 78, col);
        txt(GRID[r][c], p.x, p.y + 16, 46, fnd ? C.ink : C.white);
      }
    }
  }

  function chainWord() {
    var s = '';
    for (var i = 0; i < chain.length; i++) s += GRID[chain[i].r][chain[i].c];
    return s;
  }
  function reverse(s) { return s.split('').reverse().join(''); }

  function beginChain(x, y) {
    if (ready > 0 || finished || done) return;
    var cell = cellAt(x, y);
    if (!cell) return;
    chain = [cell];
    game.audio.play('se_tap', 0.08);
  }
  function extendChain(x, y) {
    if (chain.length === 0) return;
    var cell = cellAt(x, y);
    if (!cell) return;
    var last = chain[chain.length - 1];
    if (cell.c === last.c && cell.r === last.r) return;
    if (adjacent(last, cell) && !inChain(cell.c, cell.r)) {
      chain.push(cell);
      game.audio.play('se_tap', 0.05);
    }
  }
  function releaseChain() {
    if (chain.length < 2) { chain = []; game.audio.play('se_tap', 0.02); return; }
    var w = chainWord(), rw = reverse(w);
    var hitIdx = -1;
    for (var i = 0; i < WORDS.length; i++) {
      if (found[WORDS[i]]) continue;
      if (WORDS[i] === w || WORDS[i] === rw) { hitIdx = i; break; }
    }
    if (hitIdx >= 0) {
      var word = WORDS[hitIdx];
      found[word] = true;
      for (var k = 0; k < chain.length; k++) found[chain[k].c + ',' + chain[k].r] = true;
      var last2 = cellPos(chain[chain.length - 1].c, chain[chain.length - 1].r);
      game.feedback.good(last2.x, last2.y, { text: 'GOOD', color: C.good, size: 28 });
      game.fx.burst(last2.x, last2.y, { color: C.gold, count: 16, speed: 300 });
      game.audio.play('se_coin', 0.4);
      var foundCount = 0;
      for (var f = 0; f < WORDS.length; f++) if (found[WORDS[f]]) foundCount++;
      if (!milestoneShown && foundCount >= 2) {
        milestoneShown = true;
        game.fx.popup('NICE', W * 0.5, H * 0.16, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
      if (foundCount >= WORDS.length) { ok = true; finished = true; hitStop = 0.1; finish(); }
    } else {
      var lastp = cellPos(chain[chain.length - 1].c, chain[chain.length - 1].r);
      game.feedback.bad(lastp.x, lastp.y, { text: 'MISS', size: 22 });
    }
    chain = [];
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.02); beginChain(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.005); extendChain(x, y); } });
  game.onRelease(function() { if (state === S.PLAYING) { game.audio.play('se_tap', 0.02); releaseChain(); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { found = {}; chain = []; milestoneShown = false; demo.idx = 0; }
    var wordCells = [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }]; // BEE
    if (cyc < 0.4) { chain = []; demo.gx = cellPos(wordCells[0].c, wordCells[0].r).x; demo.gy = cellPos(wordCells[0].c, wordCells[0].r).y; demo.press = false; }
    else if (cyc < 2.2) {
      demo.press = true;
      var seg = Math.min(2, Math.floor((cyc - 0.4) / 0.6));
      var segT = ((cyc - 0.4) % 0.6) / 0.6;
      var from = wordCells[seg], to = wordCells[Math.min(2, seg + 1)];
      var pf = cellPos(from.c, from.r), pt = cellPos(to.c, to.r);
      demo.gx = pf.x + (pt.x - pf.x) * segT;
      demo.gy = pf.y + (pt.y - pf.y) * segT;
      var newChain = [];
      for (var i = 0; i <= seg; i++) newChain.push(wordCells[i]);
      chain = newChain;
    } else if (!demo._done) {
      demo._done = true;
      chain = wordCells;
      found['BEE'] = true; found['0,0'] = true; found['1,0'] = true; found['2,0'] = true;
      var p2 = cellPos(2, 0);
      game.feedback.good(p2.x, p2.y, { text: 'GOOD', color: C.good, size: 28 });
      game.fx.burst(p2.x, p2.y, { color: C.gold, count: 14, speed: 280 });
      game.audio.play('se_coin', 0.3);
      demo.press = false;
    }
    if (cyc < dt) demo._done = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (found === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGrid();
      drawFirefly();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    var foundCount2 = 0;
    for (var f2 = 0; f2 < WORDS.length; f2++) if (found[WORDS[f2]]) foundCount2++;

    if (state === S.RESULT) {
      bg();
      drawGrid();
      drawFirefly();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(foundCount2 + ' / ' + WORDS.length, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (WORDS.length - foundCount2) + '語!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(foundCount2, { found: foundCount2, total: WORDS.length });
        else game.end.failure({ found: foundCount2, total: WORDS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W * 0.5, GRID_TOP, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();
    drawFirefly();

    txt(foundCount2 + ' / ' + WORDS.length, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 130, W - 120, 14, C.ink, 0.4);
    game.draw.rect(60, 130, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, timeLeft < 4 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

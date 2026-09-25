// D-20092012-0058-lantern-moth-ward.js
// ランタンモス・ウォード — 行灯の光紋を指でなぞってつなげ、迷い込んだ影蛾の弱点の光で祓う
// 操作: 影蛾の羽に浮かぶ弱点の光紋と同じ行灯を、3つ以上つながるよう指でなぞって離す
// 終わり: 3回すべて弱点の光を浴びせられれば成功。違う光紋の行灯に触れる/時間切れ/3つ未満で離すと失敗
// @mechanic: trace
// @theme: night_market_lantern_ward
// 世界観: 灯りの連なる夜市の路地。行灯の間を影蛾が飛び回り、光紋を変えながら居座る。灯り番は行灯をなぞって同じ光紋を3つ以上つなげ、その光を影蛾に浴びせて祓う
// 残るもの: 正誤(CLEAR/GAME OVER) + 祓えた回数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 高彩度多色、背景2〜3層で奥行き、暗色輪郭+ハイライト
  var C = {
    sky1: '#101a34', sky2: '#081020', street: '#1c2c46', streetEdge: '#2c4064',
    lantern: '#4a2f1a', lanternEdge: '#8a5a2a', moth: '#4a3a5a', mothDark: '#2a1c38', mothEye: '#ffd25a',
    t0: '#ff9a4d', t1: '#4dc8ff', t2: '#c88dff',
    good: '#5dffb0', bad: '#ff4d5e', gold: '#ffd400', white: '#f6f0ff', ink: '#0a0612',
  };
  var TYPE_COL = [C.t0, C.t1, C.t2];

  var GAME_TITLE = 'LANTERN WARD';
  var ROUNDS = 3;
  var COLS = 3, ROWS = 3;
  var CELL_R = 118;
  var GX = W * 0.5, GY = H * 0.52;
  var SPACING = 250;
  var ROUND_TIME = 4.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GLOW_SPRITES = [
    ['.###.', '#####', '#.#.#', '#####', '.###.'],
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    ['..#..', '..#..', '#####', '..#..', '..#..'],
  ];
  var MOTH_A = ['#.###.#', '.#####.', '..###..', '.#####.', '#.###.#'];
  var MOTH_B = ['#.###.#', '.#####.', '..#o#..', '.#####.', '#.###.#'];

  function cellPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GX + (c - 1) * SPACING, y: GY + (r - 1) * SPACING };
  }
  function adjacent(a, b) {
    var ca = a % COLS, ra = Math.floor(a / COLS), cb = b % COLS, rb = Math.floor(b / COLS);
    return Math.abs(ca - cb) + Math.abs(ra - rb) === 1;
  }

  var grid, weak, round, chain, dragging, roundT, hpBar, mothHitFlash, mothFail;
  var done, endWait, finished, ready, hitStop, shake;

  function newGrid() {
    var g = [];
    for (var i = 0; i < COLS * ROWS; i++) g.push(Math.floor(Math.random() * 3));
    var w = Math.floor(Math.random() * 3);
    var count = g.filter(function(t) { return t === w; }).length;
    if (count < 3) {
      var idxs = [];
      for (var j = 0; j < g.length; j++) idxs.push(j);
      idxs.sort(function() { return Math.random() - 0.5; });
      for (var k = 0; k < 3; k++) g[idxs[k]] = w;
    }
    return { g: g, w: w };
  }

  function initGame() {
    var ng = newGrid();
    grid = ng.g; weak = ng.w; round = 0; chain = []; dragging = false; roundT = ROUND_TIME;
    hpBar = ROUNDS; mothHitFlash = 0; mothFail = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function panelAt(x, y) {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      if (Math.hypot(x - p.x, y - p.y) < CELL_R) return i;
    }
    return -1;
  }

  function tryStart(x, y) {
    if (ready > 0 || finished || done) return;
    var i = panelAt(x, y);
    if (i < 0) return;
    if (grid[i] !== weak) { wrongTouch(x, y); return; }
    chain = [i]; dragging = true;
  }
  function tryDrag(x, y) {
    if (!dragging) return;
    var i = panelAt(x, y);
    if (i < 0) return;
    var last = chain[chain.length - 1];
    if (i === last) return;
    if (grid[i] !== weak) { wrongTouch(x, y); return; }
    if (chain.indexOf(i) >= 0) return;
    if (!adjacent(last, i)) return;
    chain.push(i);
    game.audio.play('se_tap', 0.08);
    if (chain.length === 3) game.audio.play('se_milestone', 0.3);
  }
  function tryEnd() {
    if (!dragging) return;
    dragging = false;
    if (chain.length >= 3) roundSuccess();
    else wrongTouch(GX, GY);
  }
  function wrongTouch(x, y) {
    dragging = false; chain = [];
    ok = false; finished = true; hitStop = 0.35; mothFail = 0.5;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    finish();
  }
  function roundSuccess() {
    hitStop = 0.14; mothHitFlash = 0.3;
    game.feedback.good(GX, GY, { text: 'HIT', color: C.good });
    game.fx.burst(GX, GY, { color: TYPE_COL[weak], count: 16, speed: 340 });
    game.audio.play('se_success', 0.35);
    hpBar--; chain = [];
    round++;
    if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
    if (round === Math.ceil(ROUNDS / 2)) game.fx.popup(round + ' / ' + ROUNDS, GX, GY - 320, { color: C.gold, size: 40 });
    var ng = newGrid(); grid = ng.g; weak = ng.w; roundT = ROUND_TIME;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.4, C.street], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.30 + i * 60, W, H * 0.30 + i * 60, C.streetEdge, 2);
  }

  function drawMoth() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    var flash = mothHitFlash > 0 || mothFail > 0;
    var sprite = (Math.floor(game.time.elapsed * 3) % 2 === 0) ? MOTH_A : MOTH_B;
    var pal = { '#': flash ? C.white : C.moth, 'o': C.mothEye };
    game.draw.circle(GX, H * 0.21 + 60, 90, '#000000', 0.2);
    game.draw.sprite(sprite, pal, GX, H * 0.21 + bob, 20, { anchor: 'center' });
    var wp = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.circle(GX, H * 0.11 + wp, 46, TYPE_COL[weak], 0.9);
    game.draw.sprite(GLOW_SPRITES[weak], { '#': C.ink }, GX, H * 0.11 + wp, 8, { anchor: 'center' });
  }

  function drawGrid() {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      var inChain = chain.indexOf(i) >= 0;
      var sway = Math.sin(game.time.elapsed * 1.6 + i) * 2;
      game.draw.circle(p.x, p.y + sway, CELL_R, C.lanternEdge, inChain ? 1 : 0.9);
      game.draw.circle(p.x, p.y + sway, CELL_R - 10, inChain ? TYPE_COL[grid[i]] : C.lantern, 1);
      game.draw.sprite(GLOW_SPRITES[grid[i]], { '#': inChain ? C.ink : TYPE_COL[grid[i]] }, p.x, p.y + sway, 16, { anchor: 'center' });
    }
    if (chain.length > 1) {
      for (var j = 1; j < chain.length; j++) {
        var a = cellPos(chain[j - 1]), b = cellPos(chain[j]);
        game.draw.line(a.x, a.y, b.x, b.y, C.gold, 14);
      }
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.12); tryStart(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { if (Math.random() < 0.1) game.audio.play('se_tap', 0.03); tryDrag(x, y); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); tryEnd(); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: GX, gy: GY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { var ng = newGrid(); grid = ng.g; weak = ng.w; round = 0; hpBar = ROUNDS; chain = []; }
    var order = [];
    for (var i = 0; i < grid.length; i++) if (grid[i] === weak) order.push(i);
    if (cyc < 0.4) { demo.press = false; var p0 = cellPos(order[0] || 0); demo.gx = p0.x; demo.gy = p0.y; }
    else if (cyc < 0.7) { if (!dragging && chain.length === 0) tryStart(cellPos(order[0] || 0).x, cellPos(order[0] || 0).y); demo.press = true; }
    else if (cyc < 2.4 && order.length > 1) {
      var idx = Math.min(order.length - 1, 1 + Math.floor(((cyc - 0.7) / 1.7) * (order.length - 1)));
      var pp = cellPos(order[idx]);
      demo.gx = pp.x; demo.gy = pp.y;
      tryDrag(pp.x, pp.y);
    } else if (cyc < 2.7) { if (dragging) tryEnd(); demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (mothHitFlash > 0) mothHitFlash -= dt;
    if (mothFail > 0) mothFail -= dt;

    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      bg();
      stepDemo(dt);
      drawMoth();
      drawGrid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawMoth();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(round + ' / ' + ROUNDS, W / 2, H * 0.10, 30, C.gold);
      if (!ok && round === ROUNDS - 1) txt('あと1回!', W / 2, H * 0.14, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round * 100, { rounds: round }); else game.end.failure({ rounds: round });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT -= dt;
      if (roundT <= 0) { wrongTouch(GX, GY); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMoth();
    drawGrid();

    txt(round + ' / ' + ROUNDS, W / 2, 100, 34, C.white);
    game.draw.rect(W * 0.5 - 200, 150, 400, 16, C.ink, 0.5);
    game.draw.rect(W * 0.5 - 200, 150, 400 * ((ROUNDS - hpBar) / ROUNDS), 16, C.gold);
    if (!finished && !done) {
      var frac = Math.max(0, roundT / ROUND_TIME);
      game.draw.circle(W - 90, 100, 34, C.ink, 0.4);
      for (var a = 0; a < 12; a++) {
        if (a / 12 > frac) continue;
        var ang = -Math.PI / 2 + (a / 12) * Math.PI * 2;
        game.draw.circle(W - 90 + Math.cos(ang) * 34, 100 + Math.sin(ang) * 34, 3, C.gold);
      }
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.85, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 0.6]], bassWave: 'sine', bassVolume: 0.05 });
    state = S.ATTRACT;
    initGame();
  });
})(game);

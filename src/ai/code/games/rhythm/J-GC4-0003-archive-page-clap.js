// J-GC4-0003-archive-page-clap.js
// ページクラップ — 拍に合わせて開閉する巨大な本の間を、開いた拍でくぐり抜けて出口へ進む
// 操作: 本が開ききる拍(チッという刻み)に合わせてタップするとくぐり抜ける。赤い背表紙の本は2拍に1回しか開かない
// 終わり: 12冊くぐればCLEAR。閉じた瞬間に飛び込むと挟まれて1ミス、3ミスか時間切れでGAME OVER
// @mechanic: rhythm
// @theme: archive_page_clap
// 世界観: 閉館後の古書庫で迷子になったしおりの妖精が、拍子を刻んで開閉する巨大な本の間を拍どおりにくぐり抜け、朝までに出口の窓へ帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった冊数・PERFECT数・最大コンボのスコア
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズ、1枚絵の擬似奥行き
  var STYLE = {
    bg: ['#140f1f', '#2a1e33', '#3e2c3a'],
    main: ['#c9a66b', '#efe3c8', '#0c0910'],
    accent: ['#7fd1ff', '#e0524a'],
  };

  var GAME_TITLE = 'PAGE CLAP';
  var TIME_LIMIT = 14;
  var NEEDED = 12;
  var LIVES = 3;
  var GATE_Y = H * 0.5;
  var FAIRY_Y = H * 0.7;
  var SPACING = 250;
  var WINDOW = 0.13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FAIRY_A = [
    'w......w',
    'ww.pp.ww',
    '.wpffpw.',
    '..fkkf..',
    '..pppp..',
    '..pyyp..',
    '..p..p..',
    '...tt...',
    '...t....',
  ];
  var FAIRY_B = [
    '........',
    '.w.pp.w.',
    'wwpffpww',
    'w.fkkf.w',
    '..pppp..',
    '..pyyp..',
    '..p..p..',
    '....tt..',
    '.....t..',
  ];
  var FAIRY_PAL = { w: '#bfe9ff', p: '#e8c170', f: '#ffe7c7', k: '#2a1e33', y: '#e0524a', t: '#7fd1ff' };
  var CLASP = ['.gg.', 'g..g', 'gggg', 'gkkg', 'gggg'];
  var WINDOW_ART = ['bbbbbb', 'bllllb', 'blblbb', 'bllllb', 'bbbbbb'];

  var gates, passed, lives, timeLeft, ready, beatLen, bpm, phase, beatNo, pendingBpm, freeze, ended, endWait, won, score, combo, maxCombo, perfects, scroll, transit, lastPassBeat, flap, lastMile;

  function makeGate(i) {
    var twice = i > 2 && Math.random() < 0.35;
    return { period: twice ? 2 : 1, hue: twice ? STYLE.accent[1] : ['#3f6e8c', '#5b4a7a', '#4c7a5a'][i % 3] };
  }

  function initGame() {
    gates = [];
    for (var i = 0; i < NEEDED + 4; i++) gates.push(makeGate(i));
    passed = 0;
    lives = LIVES;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    bpm = 100;
    beatLen = 60 / bpm;
    pendingBpm = bpm;
    phase = 0;
    beatNo = 0;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    combo = 0;
    maxCombo = 0;
    perfects = 0;
    scroll = 0;
    transit = 0;
    lastPassBeat = -9;
    flap = 0;
    lastMile = 0;
  }

  function isOpenBeat(g, n) { return g.period === 1 || n % 2 === 0; }

  // 最も近い拍(番号とずれ秒)
  function nearestBeat() {
    if (phase < 0.5) return { n: beatNo, d: phase * beatLen };
    return { n: beatNo + 1, d: -(1 - phase) * beatLen };
  }

  function openness(g) {
    var nb = nearestBeat();
    if (!isOpenBeat(g, nb.n)) return 0;
    return Math.max(0, 1 - Math.abs(nb.d) / (beatLen * 0.42));
  }

  function tickBeat(silent) {
    if (silent) return;
    var g = gates[passed];
    var hi = g && isOpenBeat(g, beatNo);
    var line = ['A4', 'C5', 'E5', 'C5', 'D5', 'B4', 'G4', 'B4'];
    game.audio.tone(hi ? line[beatNo % 8] : 'A3', 0.09, { wave: 'square', volume: hi ? 0.08 : 0.05 });
  }

  function stepBeat(dt, silent) {
    phase += dt / beatLen;
    while (phase >= 1) {
      phase -= 1;
      beatNo++;
      if (pendingBpm !== bpm) { bpm = pendingBpm; beatLen = 60 / bpm; }
      flap = 0.12;
      tickBeat(silent);
    }
  }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  function hop(demo) {
    if (ended || freeze || transit > 0) { if (!demo) game.audio.play('se_tap', 0.08); return; }
    var g = gates[passed];
    var nb = nearestBeat();
    if (nb.n === lastPassBeat) { if (!demo) game.audio.play('se_tap', 0.08); return; }
    var ok = isOpenBeat(g, nb.n) && Math.abs(nb.d) <= WINDOW;
    if (ok) {
      var perfect = Math.abs(nb.d) < 0.05;
      lastPassBeat = nb.n;
      passed++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      if (perfect) perfects++;
      score += (perfect ? 150 : 100) + combo * 10;
      transit = 0.22;
      scroll = 1;
      if (!demo) game.audio.play('se_jump', 0.35);
      game.feedback.good(W * 0.5, GATE_Y - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : STYLE.main[1], sound: demo ? 'se_good' : 'se_good', volume: demo ? 0 : 0.4 });
      pendingBpm = Math.min(150, 100 + passed * 5);
      if (!demo && passed % 4 === 0 && passed > lastMile && passed < NEEDED) {
        lastMile = passed;
        game.fx.popup(passed + ' / ' + NEEDED, W * 0.5, H * 0.3, { color: STYLE.main[0], size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      if (!demo && passed >= NEEDED) {
        freeze = { t: 0.4, color: STYLE.accent[0], done: function () {
          score += Math.round(timeLeft * 40);
          game.feedback.good(W * 0.5, FAIRY_Y - 60, { text: 'CLEAR', color: STYLE.accent[0], count: 30 });
          endGame(true);
        } };
      }
      return;
    }
    // 閉じる本に飛び込んだ → 挟まれる
    combo = 0;
    freeze = { t: 0.4, color: STYLE.accent[1], done: function () {
      game.feedback.bad(W * 0.5, GATE_Y, { text: 'MISS' });
      lives--;
      if (lives <= 0 && !demo) endGame(false);
    } };
    if (!demo) game.audio.play('se_break', 0.4);
  }

  function stepWorld(dt, silent) {
    if (flap > 0) flap -= dt;
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    stepBeat(dt, silent);
    if (transit > 0) transit -= dt;
    if (scroll > 0) scroll = Math.max(0, scroll - dt * 5);
  }

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 奥へ続く書架(擬似奥行き)
    for (var i = 0; i < 9; i++) {
      var k = i / 8;
      var y = H * 0.18 + k * H * 0.5;
      var inset = 320 - k * 300;
      game.draw.rect(0, y, inset, 10, '#241a2c', 0.9);
      game.draw.rect(W - inset, y, inset, 10, '#241a2c', 0.9);
      for (var b = 0; b < 5; b++) {
        game.draw.rect(inset - 60 - b * 44 * (0.4 + k), y - 50 * (0.4 + k), 30 * (0.4 + k), 50 * (0.4 + k), ['#5b3a3a', '#3a4a5b', '#4a5b3a'][(b + i) % 3], 0.8);
        game.draw.rect(W - inset + 30 + b * 44 * (0.4 + k), y - 50 * (0.4 + k), 30 * (0.4 + k), 50 * (0.4 + k), ['#3a4a5b', '#5b3a3a', '#4a5b3a'][(b + i) % 3], 0.8);
      }
    }
    // 出口の窓(ゴール)
    game.draw.circle(W * 0.5, H * 0.2, 90, '#7fd1ff', 0.08 + 0.05 * Math.sin(t * 1.4));
    game.draw.sprite(WINDOW_ART, { b: '#5a4a6a', l: '#bfe9ff' }, W * 0.5, H * 0.2, 16, { anchor: 'center', alpha: 0.7 });
    // 粒状ノイズ
    for (var n = 0; n < 40; n++) {
      var nx = ((n * 7919 + Math.floor(t * 24) * 131) % W);
      var ny = ((n * 104729 + Math.floor(t * 24) * 977) % H);
      game.draw.rect(nx, ny, 3, 3, '#ffffff', 0.06);
    }
    game.draw.rect(0, 0, W, H, '#c9a66b', 0.03 + 0.025 * Math.sin(t * 2.1));
  }

  function drawBook(g, cy, sc, open) {
    var half = 360 * sc;
    var hgt = 250 * sc;
    var gap = (40 + 520 * open) * sc;
    var lx = W * 0.5 - gap / 2;
    var rx = W * 0.5 + gap / 2;
    // 表紙(左右)— 横ストリップで金属光沢のグラデ
    for (var s = 0; s < 5; s++) {
      var shade = s / 5;
      game.draw.rect(lx - half, cy - hgt / 2 + shade * hgt, half, hgt / 5 + 1, g.hue, 1 - shade * 0.35);
      game.draw.rect(rx, cy - hgt / 2 + shade * hgt, half, hgt / 5 + 1, g.hue, 1 - shade * 0.35);
    }
    // ページの小口(白)
    game.draw.rect(lx - 26 * sc, cy - hgt / 2 + 10 * sc, 26 * sc, hgt - 20 * sc, STYLE.main[1]);
    game.draw.rect(rx, cy - hgt / 2 + 10 * sc, 26 * sc, hgt - 20 * sc, STYLE.main[1]);
    for (var p = 0; p < 4; p++) {
      game.draw.line(lx - 24 * sc, cy - hgt / 2 + (30 + p * 55) * sc, lx - 2, cy - hgt / 2 + (30 + p * 55) * sc, '#b8a88a', 2);
      game.draw.line(rx + 2, cy - hgt / 2 + (30 + p * 55) * sc, rx + 24 * sc, cy - hgt / 2 + (30 + p * 55) * sc, '#b8a88a', 2);
    }
    // 金の縁
    game.draw.line(lx - half, cy - hgt / 2, lx, cy - hgt / 2, STYLE.main[0], 6 * sc);
    game.draw.line(rx, cy - hgt / 2, rx + half, cy - hgt / 2, STYLE.main[0], 6 * sc);
    // 2拍に1回の本には留め金
    if (g.period === 2) {
      game.draw.sprite(CLASP, { g: STYLE.main[0], k: STYLE.main[2] }, lx - half + 60 * sc, cy, 12 * sc, { anchor: 'center' });
      game.draw.sprite(CLASP, { g: STYLE.main[0], k: STYLE.main[2] }, rx + half - 60 * sc, cy, 12 * sc, { anchor: 'center' });
    }
  }

  function drawWorld() {
    var off = scroll * SPACING;
    for (var i = 3; i >= 0; i--) {
      var gi = passed + i;
      if (gi >= gates.length || gi >= NEEDED) continue;
      var sc = Math.pow(0.72, i);
      var cy = GATE_Y - i * SPACING * (0.9 - i * 0.08) + off * sc;
      drawBook(gates[gi], cy, sc, openness(gates[gi]));
    }
    // 妖精
    var t = game.time.elapsed;
    var art = Math.floor(t * 8) % 2 === 0 ? FAIRY_A : FAIRY_B;
    var fy = FAIRY_Y + Math.sin(t * 4) * 12 - transit * 400;
    var fx = W * 0.5 + Math.sin(t * 1.3) * 16;
    game.draw.circle(fx, FAIRY_Y + 110, 60, '#000000', 0.25);
    game.draw.circle(fx, fy, 70, STYLE.accent[0], 0.12 + flap);
    game.draw.sprite(art, FAIRY_PAL, fx, fy, 16, { anchor: 'center' });
    if (freeze) {
      var a = 0.5 + 0.5 * Math.sin(freeze.t * 45);
      game.draw.circle(W * 0.5, GATE_Y, 180 + (0.4 - freeze.t) * 300, freeze.color, 0.3 * a);
      game.draw.rect(0, GATE_Y - 20, W, 40, '#ffffff', 0.4 * a);
    }
    // 拍の足場(親指ゾーン):刻みに合わせて光る
    var nb = nearestBeat();
    for (var k = 0; k < 4; k++) {
      var on = ((beatNo % 4) === k);
      var g0 = gates[passed];
      var openB = g0 && isOpenBeat(g0, beatNo - (beatNo % 4) + k);
      game.draw.circle(W * (0.2 + k * 0.2), H * 0.87, on ? 46 + flap * 120 : 34, openB ? STYLE.accent[0] : STYLE.accent[1], on ? 0.95 : 0.35);
    }
    game.draw.rect(W * 0.1, H * 0.87 - 4, W * 0.8 * (Math.abs(nb.d) < WINDOW ? 1 : 0), 8, STYLE.main[0], 0.3);
  }

  function drawHud() {
    txt(passed + ' / ' + NEEDED, W * 0.5, H * 0.05, 64, STYLE.main[1]);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.085, bw, 20, '#000000', 0.5);
    game.draw.rect(80, H * 0.085, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? STYLE.accent[1] : STYLE.main[0]);
    for (var i = 0; i < LIVES; i++) {
      game.draw.sprite(FAIRY_A, FAIRY_PAL, 80 + i * 80, H * 0.125, 6, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    }
    if (combo >= 2) txt('x' + combo, W * 0.82, H * 0.125, 44, STYLE.accent[0]);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.3, W, H * 0.28, STYLE.main[2], 0.6);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.37, 96, won ? STYLE.accent[0] : STYLE.accent[1]);
    txt('SCORE ' + score, W * 0.5, H * 0.44, 52, STYLE.main[1]);
    if (!won) txt('あと' + (NEEDED - passed) + '冊!', W * 0.5, H * 0.5, 48, STYLE.main[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.5, 48, STYLE.main[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.5, 42, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演 ───────────────────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.8, press: 0, fails: 0, tapped: -1, didFail: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || !gates) { initGame(); ready = 0; demo.tapped = -1; demo.didFail = false; }
    if (passed >= 6 || lives <= 1) { initGame(); ready = 0; demo.tapped = -1; demo.fails++; demo.didFail = false; }
    demo.press = Math.max(0, demo.press - dt);
    if (freeze) return;
    var g = gates[passed];
    var nb = nearestBeat();
    // 4冊目は一度だけ閉じ拍にわざと飛び込み、挟まれる因果を見せる
    var wantFail = passed === 3 && !demo.didFail && demo.fails % 2 === 0;
    if (nb.n !== demo.tapped) {
      if (!wantFail && isOpenBeat(g, nb.n) && nb.d > -0.02 && nb.d < 0.04) {
        demo.tapped = nb.n; demo.press = 0.18; hop(true);
      } else if (wantFail && ((!isOpenBeat(g, nb.n) && Math.abs(nb.d) < 0.03) || (g.period === 1 && phase > 0.45 && phase < 0.5))) {
        demo.tapped = nb.n; demo.press = 0.18; demo.didFail = true; hop(true);
      }
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      game.audio.stopBgm();
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    hop(false);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawWorld();
      game.draw.hand(W * 0.5, H * 0.78, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W * 0.5, H * 0.08, 92, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.135, 40, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.95, 48, STYLE.main[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.95, 40, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawWorld();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.95, 40, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      if (freeze) stepWorld(dt, true);
      drawBg();
      drawWorld();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { books: passed, perfect: perfects, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      stepBeat(dt, false);
    } else {
      if (!freeze) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          freeze = { t: 0.4, color: STYLE.accent[1], done: function () {
            game.feedback.bad(W * 0.5, FAIRY_Y, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawWorld();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.3, 110, STYLE.main[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['A4', 1], ['C5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['B4', 1], ['A4', 2]],
      { tempo: 100, wave: 'triangle', volume: 0.045, loop: true, bass: [['A2', 2], ['F2', 2], ['E2', 2], ['A2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

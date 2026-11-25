// J-GC4-0052-lilypad-beat-hop.js
// 蓮の葉ビートホップ — 蛙の合唱の拍に合わせて、光った蓮の葉をその拍ちょうどに踏む。3回ずれたら池に落ちて脱落
// 操作: 蓮の葉の周りの輪が縮みきって葉が光る拍の瞬間に、その葉をタップして跳び移る。違う葉・拍ずれ・踏み遅れはMISS
// 終わり: 20拍を踏み切ればCLEAR。MISS 3回でGAME OVER(ラウンド全体の制限時間あり)
// @mechanic: rhythm
// @theme: lilypad_beat_hop
// 世界観: 夏の夜の蓮池で、若い蛙が合唱団の拍に合わせて光る蓮の葉を渡る入団試験。拍を外すと葉を踏み損ねて池にどぼんと落ちる
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏めた拍数・PERFECT数・最大コンボ
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景+単色、柔らかい影の丸い塊。当たり判定は見た目どおり
  var STYLE = {
    bg: ['#f4fbff', '#dff3fb', '#c4e9f5'],
    main: ['#3ccf7a', '#2aa860', '#9be8b8'],
    accent: ['#ff5fa2', '#ffc93c'],
  };
  var PINK = STYLE.accent[0];
  var SUN = STYLE.accent[1];
  var LEAF = STYLE.main[0];
  var LEAF_D = STYLE.main[1];
  var INK = '#28424f';
  var RED = '#ff4d4d';

  var GAME_TITLE = 'LILY BEAT';
  var TIME_LIMIT = 14;
  var NEEDED = 20;
  var MAX_MISS = 3;
  var P0 = 0.5, P1 = 0.42;
  var WIN_GOOD = 0.16, WIN_PERF = 0.06;
  var COUNT_IN = 2;
  var PAD_R = 118;
  var PADS = [];
  for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) PADS.push({ x: 240 + c * 300, y: 690 + r * 300 });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FROG = [
    [
      '.ww..ww.',
      'wkgggwkg',
      'gggggggg',
      'gpppppgg',
      'gggggggg',
      '.gg..gg.',
      'gg....gg',
    ],
    [
      '.ww..ww.',
      'wkgggwkg',
      'gggggggg',
      'gggggggg',
      '.gggggg.',
      'g.g..g.g',
      '........',
    ],
  ];
  var FROG_PAL = { w: '#ffffff', k: INK, g: '#46b86a', p: PINK };
  var LOTUS = ['..p..', '.ppp.', 'ppypp', '.ppp.'];
  var CHORUS = ['.gg.', 'gkgk', 'gggg', 'g..g'];

  var beats, seq, clock, nextJ, hits, perfects, misses, combo, maxCombo, timeLeft, ready;
  var hitStop, ended, endWait, won, score, frogPad, frogHop, splash, lastBeatTick, padFlash;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x, y + 4, { size: size, color: 'rgba(40,66,79,0.18)', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function buildBeats() {
    beats = [];
    seq = [];
    var t = COUNT_IN * P0;
    var prev = 4;
    for (var k = 0; k < NEEDED; k++) {
      beats.push({ t: t, done: false });
      var n;
      do { n = Math.floor(game.random(0, 8.999)); } while (n === prev);
      seq.push(n);
      prev = n;
      t += P0 + (P1 - P0) * (k / NEEDED);
    }
  }

  function initGame() {
    buildBeats();
    clock = -0.0001;
    nextJ = 0;
    hits = 0;
    perfects = 0;
    misses = 0;
    combo = 0;
    maxCombo = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    frogPad = 4;
    frogHop = 0;
    splash = 0;
    lastBeatTick = -1;
    padFlash = [];
    for (var i = 0; i < 9; i++) padFlash.push(0);
  }

  function padAt(x, y) {
    for (var i = 0; i < PADS.length; i++) if (Math.hypot(x - PADS[i].x, y - PADS[i].y) < PAD_R + 20) return i;
    return -1;
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.4;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function addMiss(x, y, demo) {
    misses++;
    combo = 0;
    splash = 0.5;
    game.feedback.bad(x, y, { text: 'MISS', volume: demo ? 0 : undefined });
    if (misses >= MAX_MISS && !demo) hitStop = 0.45;
  }

  function stepPad(i, demo) {
    if (ended || hitStop > 0 || nextJ >= beats.length) return;
    var b = beats[nextJ];
    var d = clock - b.t;
    var p = PADS[i];
    padFlash[i] = 0.2;
    if (d < -WIN_GOOD) {
      // 早すぎ(拍の前)
      addMiss(p.x, p.y - 150, demo);
      return;
    }
    b.done = true;
    nextJ++;
    if (i !== seq[nextJ - 1]) { addMiss(p.x, p.y - 150, demo); return; }
    frogPad = i;
    frogHop = 0.25;
    hits++;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    var perfect = Math.abs(d) <= WIN_PERF;
    if (perfect) perfects++;
    var mult = 1 + Math.floor(combo / 5) * 0.5;
    score += Math.round((perfect ? 150 : 100) * mult);
    game.feedback.good(p.x, p.y - 150, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? PINK : LEAF_D, count: perfect ? 16 : 8, volume: demo ? 0 : undefined });
    if (!demo) game.audio.play('se_jump', 0.25);
    if (!demo && (combo === 10 || combo === 15)) {
      game.fx.popup(combo + ' COMBO', W / 2, 520, { color: SUN, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepClock(dt, demo) {
    clock += dt;
    if (frogHop > 0) frogHop -= dt;
    if (splash > 0) splash -= dt;
    for (var i = 0; i < 9; i++) if (padFlash[i] > 0) padFlash[i] -= dt;
    // 拍の音(カウントインも含む)
    var bi = -1;
    for (var k = 0; k < beats.length; k++) if (clock >= beats[k].t) bi = k;
    var countBeat = Math.floor(clock / P0);
    var tick = clock < COUNT_IN * P0 ? countBeat - COUNT_IN : bi;
    if (tick !== lastBeatTick && clock >= 0) {
      lastBeatTick = tick;
      if (!demo) {
        var note = tick < 0 ? 'C5' : ['C4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4'][seq[Math.max(0, tick)] || 0];
        game.audio.tone(note, 0.1, { wave: 'square', volume: 0.07 });
        game.audio.tone('C3', 0.06, { wave: 'triangle', volume: 0.08 });
      }
    }
    // 踏み遅れ
    if (nextJ < beats.length && clock > beats[nextJ].t + WIN_GOOD) {
      var p = PADS[seq[nextJ]];
      beats[nextJ].done = true;
      nextJ++;
      addMiss(p.x, p.y - 150, demo);
    }
    if (nextJ >= beats.length && !ended && hitStop <= 0 && !demo && misses < MAX_MISS) {
      endGame(true, demo);
    }
  }

  // ── 描画 ──
  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.3, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 池の波紋
    for (var i = 0; i < 6; i++) {
      var rr = ((t * 60 + i * 120) % 700);
      game.draw.circle(W / 2, 1000, rr, '#ffffff', Math.max(0, 0.18 - rr / 4000));
    }
    // 岸と合唱団(遠景)
    game.draw.rect(0, 380, W, 60, '#bfe6c9');
    for (var c = 0; c < 6; c++) {
      var bob = Math.abs(Math.sin(t * Math.PI * 2 + c)) * 10;
      game.draw.sprite(CHORUS, { g: '#58c47d', k: INK }, 110 + c * 172, 400 - bob, 10, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.03 * Math.sin(t * 1.6));
  }

  function drawPads() {
    var t = game.time.elapsed;
    var cur = nextJ < beats.length ? nextJ : -1;
    for (var i = 0; i < PADS.length; i++) {
      var p = PADS[i];
      var sway = Math.sin(t * 1.5 + i) * 4;
      // 柔らかい影
      game.draw.circle(p.x + 10, p.y + 22, PAD_R, '#6aaec2', 0.35);
      var lit = false;
      if (cur >= 0 && seq[cur] === i) {
        var d = beats[cur].t - clock;
        if (d < 0.08 && d > -WIN_GOOD) lit = true;
      }
      game.draw.circle(p.x, p.y + sway, PAD_R, lit ? SUN : LEAF);
      game.draw.circle(p.x - 30, p.y - 30 + sway, PAD_R * 0.45, '#ffffff', 0.22);
      game.draw.rect(p.x - 4, p.y - PAD_R + sway, 8, PAD_R, LEAF_D, 0.6);
      if (padFlash[i] > 0) game.draw.circle(p.x, p.y + sway, PAD_R + 12, '#ffffff', padFlash[i] * 2.5);
      if (i === 2 || i === 6) game.draw.sprite(LOTUS, { p: PINK, y: SUN }, p.x + 70, p.y + 60 + sway, 9, { anchor: 'center' });
    }
    // 予告の輪: 次の拍まで1拍分かけて縮む
    for (var k = 0; k < 2; k++) {
      var j = nextJ + k;
      if (j >= beats.length) break;
      var dd = beats[j].t - clock;
      var per = j > 0 ? beats[j].t - beats[j - 1].t : P0;
      if (dd > per * 1.2 || dd < -WIN_GOOD) continue;
      var pp = PADS[seq[j]];
      var rad = PAD_R + Math.max(0, dd / per) * 110;
      var a = k === 0 ? 0.95 : 0.35;
      // 太い輪(円周を細かい点で描く)
      for (var q = 0; q < 28; q++) {
        var ang = q / 28 * Math.PI * 2;
        game.draw.circle(pp.x + Math.cos(ang) * rad, pp.y + Math.sin(ang) * rad, k === 0 ? 9 : 5, k === 0 ? PINK : '#ffffff', a);
      }
    }
  }

  function drawFrog() {
    var t = game.time.elapsed;
    var p = PADS[frogPad];
    var hop = frogHop > 0 ? Math.sin((frogHop / 0.25) * Math.PI) * 60 : 0;
    var sink = splash > 0 ? splash * 60 : 0;
    game.draw.circle(p.x, p.y + 30, 44, '#2a7a4a', 0.25);
    game.draw.sprite(FROG[frogHop > 0 ? 1 : Math.floor(t * 2) % 2], FROG_PAL, p.x + Math.sin(t * 2) * 3, p.y - 10 - hop + sink, 14, { anchor: 'center', alpha: splash > 0 ? 0.6 : 1 });
    if (splash > 0) {
      for (var i = 0; i < 6; i++) game.draw.circle(p.x + Math.cos(i) * 80 * (1 - splash), p.y + 40 - (1 - splash) * 40, 10, '#ffffff', splash * 1.6);
    }
  }

  function drawBeatDots() {
    // 親指ゾーン: 拍のメトロノーム玉
    var y = H * 0.84;
    var ph = beats.length ? (clock < 0 ? 0 : clock) : 0;
    var cur = Math.floor(ph / P0);
    for (var i = 0; i < 4; i++) {
      var on = ((cur % 4) + 4) % 4 === i && clock >= 0;
      game.draw.circle(W / 2 - 240 + i * 160 + 6, y + 10, 46, '#6aaec2', 0.3);
      game.draw.circle(W / 2 - 240 + i * 160, y, 46, on ? PINK : '#ffffff');
    }
    // 残りMISS
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.sprite(FROG[0], FROG_PAL, W / 2 - 120 + m * 120, y + 150, 7, { anchor: 'center', alpha: m < MAX_MISS - misses ? 1 : 0.2 });
    }
  }

  function drawScene() {
    drawBackground();
    drawPads();
    drawFrog();
    drawBeatDots();
  }

  function drawHud() {
    txt(hits + ' / ' + NEEDED, 70, 110, 56, INK, 'left');
    txt('SCORE ' + score, W - 70, 110, 40, INK, 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 165, W - 140, 16, '#ffffff');
    game.draw.rect(70, 165, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? RED : LEAF);
    if (combo >= 3) txt('x' + combo, W / 2, 300, 48, PINK);
  }

  // ── ATTRACT ゴースト実演: 同じ拍クロックでAIが踏む ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, loop: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.loop++; }
    if (nextJ < beats.length) {
      var target = PADS[seq[nextJ]];
      // 失敗例: 奇数周の5拍目は隣の葉を踏む
      var wrong = demo.loop % 2 === 1 && nextJ === 4;
      var tp = wrong ? PADS[(seq[nextJ] + 1) % 9] : target;
      demo.gx += (tp.x - demo.gx) * Math.min(1, dt * 10);
      demo.gy += (tp.y + 40 - demo.gy) * Math.min(1, dt * 10);
      var d = beats[nextJ].t - clock;
      demo.press = d < 0.1;
      if (d <= 0.01) stepPad(wrong ? (seq[nextJ] + 1) % 9 : seq[nextJ], true);
    }
    stepClock(dt, true);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      game.audio.stopBgm();
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
    if (ready > 0 || ended || hitStop > 0) return;
    var i = padAt(x, y);
    if (i < 0) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: '#ffffff', count: 4, speed: 100 });
      return;
    }
    game.audio.play('se_tap', 0.2);
    stepPad(i, false);
  });

  game.onUpdate(function (dt) {
    if (!beats) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.085, 76, LEAF_D);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.13, 34, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, PINK);
      else txt('INSERT COIN', W / 2, H * 0.96, 34, INK);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 220, W, 400, '#ffffff', 0.85);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 340, 90, won ? LEAF_D : RED);
      txt('SCORE ' + score, W / 2, 420, 46, INK);
      txt(hits + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, 485, 36, PINK);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 555, 42, SUN);
      else txt('BEST ' + (game.best || 0), W / 2, 555, 36, INK);
      if (!won) txt('あと' + Math.max(1, NEEDED - nextJ) + '拍!', W / 2, 610, 36, PINK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 36, INK);
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, perfects: perfects, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) endGame(false, false);
    } else {
      timeLeft -= dt;
      stepClock(dt, false);
      if (timeLeft <= 0 && !ended && hitStop <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
        endGame(false, false);
      }
    }

    drawScene();
    drawHud();
    if (hitStop > 0) {
      var fp = PADS[frogPad];
      game.draw.circle(fp.x, fp.y, PAD_R + (0.45 - hitStop) * 120, '#ffffff', 0.5);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, 560, 96, PINK);
    else if (clock < COUNT_IN * P0) txt(String(COUNT_IN - Math.floor(clock / P0)), W / 2, 560, 96, PINK);
  });

  game.onStart(function () {
    game.audio.melody(
      [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 1]],
      { tempo: 120, wave: 'triangle', volume: 0.045, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

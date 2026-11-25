// I-GBA-0044v2-egg-grade-roll.js
// 選卵ころころ — 並んで転がってくる卵2つのうち、ほんの少し大きいほうを転がり切る前にすくい上げる
// 操作: 左右のレーンを並んで転がり下りてくる2つの卵のうち、大きいほうの側をタップしてL玉かごへすくう
// 終わり: 9組を選り分ければ成功。小さいほうを選ぶ/どちらも選ばずゲートを越えると卵マークを失い、3つなくなると失敗
// @mechanic: size_judge
// @theme: henhouse_egg_grading
// 世界観: 朝の養鶏場の選卵台で、選卵係が鶏小屋の口から2列で転がってくる卵を見比べ、わずかに大きいほうだけをL玉のかごへすくい上げて選り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(正しく選んだ組数と早取りボーナス)
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒。粗い8pxドット、輪郭線なし。背景はレンガのタイル反復、縦1方向スクロール
  var STYLE = { bg: ['#000000', '#7c0800', '#a81000'], main: ['#fcd8a8', '#f8f8f8', '#00a800'], accent: ['#f8b800', '#3cbcfc'] };
  var C = {
    black: STYLE.bg[0], brick: STYLE.bg[1], brickHi: STYLE.bg[2], egg: STYLE.main[0], white: STYLE.main[1], green: STYLE.main[2],
    gold: STYLE.accent[0], sky: STYLE.accent[1], bad: '#f83800', shell: '#e4a672', rail: '#503000',
  };

  var GAME_TITLE = 'EGG GRADER';
  var PAIRS = 9;
  var NEEDED = 9;
  var TIME_LIMIT = 14;           // size_judge = F族 8〜15s
  var LIVES = 3;
  var DIFFS = [3.4, 3.0, 2.6, 2.2, 1.9, 1.6, 1.35, 1.15, 1.0];   // 大小の差(ドット倍率)
  var TRAVEL = [2.0, 1.9, 1.8, 1.65, 1.55, 1.45, 1.35, 1.25, 1.15];

  var LANES = [Math.round(W * 0.3), Math.round(W * 0.7)];
  var SPAWN_Y = Math.round(H * 0.25), GATE_Y = Math.round(H * 0.73);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var pair, idx, lives, good, score, streak, timeLeft, countIn, freeze, over, won, endT, waitT, basket, milestoneDone, prevBest, tickT, hen;

  function pix(str, x, y, sz, color) {
    game.draw.text(str, x + 6, y + 6, { size: sz, color: C.black, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  // 卵(転がり2フレーム: ハイライトの位置が回る)
  var EGG = [
    ['..ww..', '.wwww.', 'whwwww', 'wwwwww', 'wwwwww', 'wwwwww', '.wwws.', '..ss..'],
    ['..ww..', '.wwww.', 'wwwwhw', 'wwwwww', 'wwwwww', 'wwwwww', '.swww.', '..ss..'],
  ];
  var EGG_PAL = { w: C.egg, h: C.white, s: C.shell };
  var EGG_FLASH = { w: C.white, h: C.white, s: C.white };
  // めんどり(3フレーム: 待機・鳴く・産む)
  var HEN = [
    ['....rr....', '...rwwr...', '..wwwkww..', '..wwwwwyy.', '.wwwwwww..', 'wwwwwwww..', 'wwwwwwww..', '.wwwwww...', '..y..y....'],
    ['....rr....', '...rwwr...', '..wwwkwwy.', '..wwwww.yy', '.wwwwwwwy.', 'wwwwwwww..', 'wwwwwwww..', '.wwwwww...', '..y..y....'],
    ['...rr.....', '..rwwr....', '.wwwkww...', '.wwwwwyy..', 'wwwwwwwww.', 'wwwwwwwwww', '.wwwwwwww.', '..wwwwww..', '..........'],
  ];
  var HEN_PAL = { r: C.bad, w: C.white, k: C.black, y: C.gold };

  function spawnPair(i, fixed) {
    var base = fixed ? 14 : 13.5 + game.random(0, 3);
    var d = DIFFS[Math.min(i, DIFFS.length - 1)];
    var bigSide = fixed ? fixed.big : (game.random(0, 1) < 0.5 ? 0 : 1);
    var travel = fixed ? 2.0 : TRAVEL[Math.min(i, TRAVEL.length - 1)];
    var lagSide = game.random(0, 1) < 0.5 ? 0 : 1;
    var lag = (!fixed && i >= 3) ? game.random(0.08, 0.2) * travel : 0;
    pair = { t: 0, travel: travel, big: bigSide, mode: 'roll', pick: -1, eggs: [] };
    for (var s = 0; s < 2; s++) {
      pair.eggs.push({ px: s === bigSide ? base + d : base, lag: s === lagSide ? lag : 0, flash: 0, fly: 0, phase: game.random(0, 6) });
    }
    hen = 0.35;
    game.audio.tone(392, 0.06, { wave: 'square', volume: 0.08 });
  }

  function initGame() {
    idx = 0; lives = LIVES; good = 0; score = 0; streak = 0; timeLeft = TIME_LIMIT;
    countIn = 0.8; freeze = 0; over = false; won = false; endT = 0; waitT = 0; basket = 0; milestoneDone = false;
    prevBest = game.best; tickT = 0; hen = 0;
    spawnPair(0, null);
  }

  function progressOf(e) { return (pair.t - e.lag) / pair.travel; }
  function eggPos(s) {
    var e = pair.eggs[s];
    var p = Math.max(0, progressOf(e));
    var x = LANES[s], y = SPAWN_Y + (GATE_Y - SPAWN_Y) * p;
    if (e.fly > 0) {
      var t = e.fly;
      x = x + (W / 2 - x) * t; y = y + (H * 0.86 - y) * t - Math.sin(t * Math.PI) * 260;
    }
    return { x: x, y: y + Math.abs(Math.sin(pair.t * 9 + e.phase)) * -6 };
  }
  function leadP() { return Math.max(progressOf(pair.eggs[0]), progressOf(pair.eggs[1])); }

  // 片側をすくう(本番・デモ共通)
  function pick(side) {
    if (!pair || pair.mode !== 'roll') return;
    pair.pick = side;
    var p = eggPos(side);
    if (side === pair.big) {
      pair.mode = 'good';
      pair.eggs[side].fly = 0.01;
      var early = Math.max(0, 1 - leadP());
      if (state === S.PLAYING) {
        good++; streak++;
        var gain = 100 + Math.round(early * 100);
        score += gain * (streak >= 3 ? 2 : 1);
        game.feedback.good(p.x, p.y - 90, { text: early > 0.55 ? 'PERFECT' : (streak >= 3 ? 'NICE' : 'GOOD'), color: C.white, size: 60 });
        if (!milestoneDone && good === 5) {
          milestoneDone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(good + ' / ' + NEEDED, W / 2, H * 0.5, { color: C.gold, size: 72 });
        }
      } else {
        game.feedback.good(p.x, p.y - 90, { text: 'GOOD', color: C.white, size: 56 });
      }
      waitT = 0.5;
    } else {
      wrong('MISS');
    }
  }

  function wrong(word) {
    pair.mode = 'bad';
    pair.eggs[pair.big].flash = 1;
    freeze = 0.45;
    var p = eggPos(pair.big);
    game.feedback.bad(p.x, p.y, { text: word, color: C.bad });
    game.audio.play('se_break', 0.3);
    if (state === S.PLAYING) { lives--; streak = 0; }
    waitT = 0.55;
  }

  function nextPair() {
    if (state !== S.PLAYING) return;
    idx++;
    if (lives <= 0) { over = true; won = false; finish(); return; }
    if (idx >= PAIRS) { over = true; won = true; finish(); return; }
    spawnPair(idx, null);
  }

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.5);
    if (won) {
      score += lives * 200 + Math.round(timeLeft * 20);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(120, 960), game.random(400, 1300), { color: i % 2 ? C.gold : C.sky, count: 20, speed: 420 });
    }
  }

  function stepBoard(dt) {
    if (hen > 0) hen -= dt;
    for (var s = 0; s < 2; s++) {
      var e = pair.eggs[s];
      if (e.flash > 0 && freeze <= 0) e.flash = Math.max(0, e.flash - dt * 2);
      if (e.fly > 0 && e.fly < 1) { e.fly = Math.min(1, e.fly + dt * 3); if (e.fly >= 1) { basket++; game.audio.play('se_coin', 0.3); } }
    }
    if (pair.mode === 'roll') {
      pair.t += dt;
      var lp = leadP();
      if (lp > 0.78) {
        tickT -= dt;
        if (tickT <= 0) { tickT = 0.16; game.audio.tone(1320, 0.03, { wave: 'square', volume: 0.06 }); }
      }
      if (lp >= 1) wrong('MISS');
    } else {
      if (pair.mode === 'good' || pair.mode === 'bad') pair.t += dt * 0.6;
      waitT -= dt;
      if (waitT <= 0) nextPair();
    }
  }

  // ── 描画 ──
  function drawBarn() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.black], [0.12, C.brick], [1, C.black]]);
    // レンガのタイル(縦にゆっくり流れる)
    var scroll = Math.floor((t * 24) % 64);
    for (var row = -1; row < 32; row++) {
      var y = row * 64 + scroll;
      for (var col = 0; col < 10; col++) {
        var x = col * 128 + (row % 2 ? 64 : 0) - 64;
        game.draw.rect(x + 8, y + 8, 112, 48, row % 3 ? C.brick : C.brickHi);
      }
    }
    // 選卵台(緑のフェルト)
    game.draw.rect(96, SPAWN_Y - 40, W - 192, GATE_Y - SPAWN_Y + 160, C.black);
    game.draw.rect(112, SPAWN_Y - 24, W - 224, GATE_Y - SPAWN_Y + 128, C.green);
    for (var l = 0; l < 2; l++) {
      game.draw.rect(LANES[l] - 120, SPAWN_Y - 24, 16, GATE_Y - SPAWN_Y + 128, C.rail);
      game.draw.rect(LANES[l] + 104, SPAWN_Y - 24, 16, GATE_Y - SPAWN_Y + 128, C.rail);
    }
    // 鶏小屋の口
    game.draw.rect(W / 2 - 300, SPAWN_Y - 150, 600, 120, C.rail);
    game.draw.rect(LANES[0] - 80, SPAWN_Y - 110, 160, 80, C.black);
    game.draw.rect(LANES[1] - 80, SPAWN_Y - 110, 160, 80, C.black);
  }

  function drawGate() {
    var lp = pair && pair.mode === 'roll' ? leadP() : 0;
    var warn = lp > 0.78 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    for (var x = 112; x < W - 112; x += 48) game.draw.rect(x, GATE_Y + 64, 32, 16, warn ? C.bad : C.gold);
  }

  function drawEggs() {
    if (!pair) return;
    var fr = Math.floor(pair.t * 8) % 2;
    for (var s = 0; s < 2; s++) {
      var e = pair.eggs[s];
      var p = eggPos(s);
      var px = e.px * (e.flash > 0 ? 1 + e.flash * 0.2 : 1);
      if (e.fly >= 1) continue;
      game.draw.rect(p.x - 3 * px, p.y + 4 * px - 8, 6 * px, 8, C.black, 0.5);
      game.draw.sprite(EGG[fr], e.flash > 0 ? EGG_FLASH : EGG_PAL, p.x, p.y, px, { anchor: 'center' });
    }
    // 外したら大小を重ねて見せる(納得の根拠)
    if (pair.mode === 'bad') {
      var b = pair.eggs[pair.big], sm = pair.eggs[1 - pair.big];
      var cy = H * 0.47;
      game.draw.sprite(EGG[0], { w: C.gold, h: C.gold, s: C.gold }, W / 2, cy, b.px, { anchor: 'center' });
      game.draw.sprite(EGG[0], { w: C.sky, h: C.sky, s: C.sky }, W / 2, cy + (b.px - sm.px) * 4, sm.px, { anchor: 'center' });
    }
  }

  function drawBasket() {
    var y = Math.round(H * 0.87);
    game.draw.rect(W / 2 - 200, y - 20, 400, 150, C.black);
    game.draw.rect(W / 2 - 184, y - 4, 368, 118, C.gold);
    for (var i = 0; i < 3; i++) game.draw.rect(W / 2 - 184, y + 20 + i * 32, 368, 8, C.rail);
    for (var k = 0; k < Math.min(basket, 9); k++) {
      game.draw.sprite(EGG[0], EGG_PAL, W / 2 - 150 + (k % 5) * 75, y - 30 - Math.floor(k / 5) * 46, 7, { anchor: 'center' });
    }
  }

  function drawHen() {
    var t = game.time.elapsed;
    var f = hen > 0 ? HEN[2] : HEN[Math.floor(t * 3) % 4 === 0 ? 1 : 0];
    if (state === S.RESULT && !won) f = HEN[1];
    var bob = Math.round(Math.sin(t * 4) * 1) * 8;
    game.draw.sprite(f, HEN_PAL, W / 2, SPAWN_Y - 215 + bob, 14, { anchor: 'center' });
  }

  function hud() {
    pix(String(score), 170, 70, 52, C.white);
    pix(good + ' / ' + NEEDED, W - 170, 70, 46, C.white);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(EGG[0], i < lives ? EGG_PAL : { w: C.rail, h: C.rail, s: C.rail }, W / 2 - 80 + i * 80, 70, 6, { anchor: 'center' });
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    for (var b = 0; b < 20; b++) game.draw.rect(100 + b * 44, 150, 36, 20, b < Math.ceil(frac * 20) ? C.sky : C.rail);
  }

  function drawWorld() { drawBarn(); drawGate(); drawHen(); drawEggs(); drawBasket(); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.n = -1; return; }
    if (over || countIn > 0 || freeze > 0 || !pair || pair.mode !== 'roll') { game.audio.play('se_tap', 0.06); return; }
    game.audio.play('se_tap', 0.15);
    pick(x < W / 2 ? 0 : 1);
  });

  // ── ATTRACT: 大きいほうをすくう組 → 小さいほうを取って失敗する組 ──
  var demo = { t: 0, n: -1, gx: W / 2, gy: H * 0.9, press: false, want: 0, tapAt: 0, done: false };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      demo.n++;
      spawnPair(0, { big: demo.n % 2 === 0 ? 1 : 0 });
      demo.want = demo.n % 2 === 0 ? pair.big : 1 - pair.big;
      demo.tapAt = 1.0; demo.done = false;
    }
    if (freeze > 0) { freeze -= dt; for (var s = 0; s < 2; s++) if (pair.eggs[s].flash > 0) pair.eggs[s].flash = Math.max(0.01, freeze / 0.45); }
    else if (pair.mode === 'roll') stepBoard(dt);
    else {
      pair.t += dt * 0.6;
      for (var k = 0; k < 2; k++) { var e = pair.eggs[k]; if (e.fly > 0 && e.fly < 1) e.fly = Math.min(1, e.fly + dt * 3); if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 2); }
    }
    var tp = eggPos(demo.want);
    demo.press = false;
    if (!demo.done) {
      demo.gx += (tp.x - demo.gx) * Math.min(1, dt * 6); demo.gy += (tp.y + 40 - demo.gy) * Math.min(1, dt * 6);
      if (cyc > demo.tapAt - 0.12) demo.press = true;
      if (cyc >= demo.tapAt) { demo.done = true; pick(demo.want); }
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 2); demo.gy += (H * 0.8 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pair) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      pix(GAME_TITLE, W / 2, H * 0.045, 86, C.gold);
      pix('HI-SCORE ' + game.best, W / 2, H * 0.09, 36, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) pix('► 100円 投入 ◄', W / 2, H * 0.97, 42, C.gold);
      else pix('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      pix(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, won ? C.gold : C.bad);
      pix('SCORE ' + score, W / 2, H * 0.47, 56, C.white);
      if (score > prevBest && prevBest > 0) pix('NEW RECORD', W / 2, H * 0.53, 52, C.gold);
      else pix('BEST ' + Math.max(prevBest, score), W / 2, H * 0.53, 42, C.white);
      if (!won) pix('あと' + (NEEDED - good) + '組!', W / 2, H * 0.59, 50, C.sky);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) pix('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { good: good, lives: lives, pairs: Math.min(PAIRS, idx + 1) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (freeze > 0) {
      freeze -= dt;
    } else if (!over) {
      if (pair.mode === 'roll') timeLeft -= dt;
      stepBoard(dt);
      if (!over && timeLeft <= 0) {
        timeLeft = 0; over = true; won = false;
        game.feedback.bad(W / 2, GATE_Y, { text: 'TIME UP', color: C.bad });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) pix(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 1],
      ['C5', 0.5], ['C5', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 2],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

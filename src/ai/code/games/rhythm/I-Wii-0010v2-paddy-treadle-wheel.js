// I-Wii-0010v2-paddy-treadle-wheel.js
// 踏み車の囃子踏み — 囃子の拍で回る足踏み水車のてっぺんに来た板を、印のある板の拍だけ踏んで水を田へくみ上げる
// 操作: 水車は拍ごとに板1枚ぶん回る。赤い印の板がてっぺん(三角の下)に来た拍でタップして踏む。印のない板の拍に踏むとよろけて水がこぼれる。囃子は3段で速くなり、速くなる前に鐘が鳴って水車の縁が金色に光る
// 終わり: 囃子1曲(3段・26拍)が終わったとき田の水位が旗に届いていればCLEAR。届かなければGAME OVER
// @mechanic: rhythm
// @theme: paddy_treadle_waterwheel
// 世界観: 初夏の田んぼのほとりで、農夫が足踏み水車の踏み板に乗り、村の囃子の拍に合わせて踏み板を踏み続けて、用水から田へ水をくみ上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(くみ上げた水の量・PERFECT数・最長連続)
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板(sprite)のまま距離で px を変え、真下に楕円の接地影。奥ほど彩度を落とす
  var STYLE = { bg: ['#9ad0f0', '#d8eef8', '#a8b8a0'], main: ['#8a5a2e', '#4aa83a', '#3a8ad0'], accent: ['#e83a2a', '#ffd43a'] };
  var C = {
    sky: STYLE.bg[0], haze: STYLE.bg[1], farHill: STYLE.bg[2], wood: STYLE.main[0], rice: STYLE.main[1], water: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1], ink: '#1c1a14', white: '#ffffff', mud: '#7a6040', woodDk: '#5a3a1a', good: '#8cff8a',
  };

  var GAME_TITLE = 'TREADLE BEAT';
  var TIME_LIMIT = 14;
  var GOAL = 24;                      // 田の水位(旗)
  var PERFECT_W = 0.07, GOOD_W = 0.14;
  var WHEEL_X = 540, WHEEL_Y = Math.round(H * 0.6), WHEEL_R = 300;
  var PADDLES = 8;
  var SECTIONS = [
    { bpm: 112, pat: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1] },
    { bpm: 126, pats: [[1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1, 1], [1, 1, 1, 0, 1, 1, 0, 1]] },
    { bpm: 140, pats: [[1, 0, 1, 1, 1, 0, 1, 1], [1, 1, 0, 1, 0, 1, 1, 1], [0, 1, 1, 1, 0, 1, 1, 1]] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var beats, songT, lastBeat, water, streak, bestStreak, perfects, hitsN, stumbleT, stepT, rimGold, judgeWord, judgeT, sectionIdx;
  var score, countIn, over, won, endT, prevBest, playT, stopT;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 菅笠の農夫: 右足/左足/よろけ/喜び
  var FARMER = [
    ['..yyyyyy..', '.yyyyyyyy.', '...ssss...', '...sese...', '...ssms...', '.wttttttw.', 's.tttttt.s', '..tttttt..', '..bb..bb..', '..bb...b..', '..ss...s..', '.......s..'],
    ['..yyyyyy..', '.yyyyyyyy.', '...ssss...', '...sese...', '...ssms...', '.wttttttw.', 's.tttttt.s', '..tttttt..', '..bb..bb..', '..b...bb..', '..s...ss..', '..s.......'],
    ['....yyyyyy', '...yyyyyyy', '....ssss..', '....sOsO..', '....ssos..', '..ttttttw.', '.stttttt.s', '..tttttt..', '..bb..bb..', '.bb....bb.', 'ss......ss', '..........'],
    ['s.yyyyyy.s', 's.yyyyyy.s', '.s.ssss.s.', '...sese...', '...sOOs...', '..tttttt..', '..tttttt..', '..tttttt..', '..bb..bb..', '..bb..bb..', '..ss..ss..', '..........'],
  ];
  var FARMER_PAL = { y: '#e8c870', s: '#e8b088', e: '#1c1a14', m: '#a04a3a', O: '#1c1a14', o: '#a04a3a', w: '#ffffff', t: '#3a5a8a', b: '#2a2a3a' };
  var SPROUT = ['.g.g.', 'g.g.g', '.ggg.', '..g..'];

  function buildBeats(demo) {
    var list = [], t = 0, i, k;
    if (demo) {
      var DP = [0, 1, 1, 1, 0, 1, 1, 1, 0, 0];
      for (i = 0; i < DP.length; i++) { list.push({ t: t, mark: DP[i], sec: 0, done: false }); t += 60 / 112; }
      return list;
    }
    for (k = 0; k < SECTIONS.length; k++) {
      var sec = SECTIONS[k];
      var pat = sec.pat || sec.pats[Math.floor(Math.random() * sec.pats.length)];
      for (i = 0; i < pat.length; i++) { list.push({ t: t, mark: pat[i], sec: k, done: false }); t += 60 / sec.bpm; }
    }
    return list;
  }

  function spbAt(i) {
    if (i + 1 < beats.length) return beats[i + 1].t - beats[i].t;
    return beats.length > 1 ? beats[beats.length - 1].t - beats[beats.length - 2].t : 0.5;
  }
  // 連続した拍の位置(水車の回転角に使う)
  function beatPhase(t) {
    if (t < beats[0].t) return (t - beats[0].t) / spbAt(0);
    for (var i = 0; i < beats.length; i++) {
      var sp = spbAt(i);
      if (t < beats[i].t + sp || i === beats.length - 1) return i + (t - beats[i].t) / sp;
    }
    return beats.length;
  }

  function resetRun(demo) {
    beats = buildBeats(demo);
    songT = -0.0001; lastBeat = -1; water = 0; streak = 0; bestStreak = 0; perfects = 0; hitsN = 0;
    stumbleT = 0; stepT = 0; rimGold = 0; judgeWord = ''; judgeT = 0; sectionIdx = 0;
  }

  function initGame() {
    resetRun(false);
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0; stopT = 0;
  }

  function startSectionMusic(k) {
    var bpm = SECTIONS[k].bpm;
    game.audio.melody(TUNE, { tempo: bpm, wave: 'triangle', volume: 0.05 + k * 0.01, loop: true, bass: TUNE_BASS });
  }

  // ── 判定(本番・デモ共通) ──
  function stepOn() {
    var best = -1, bd = 1e9;
    for (var i = 0; i < beats.length; i++) {
      var d = Math.abs(beats[i].t - songT);
      if (d < bd) { bd = d; best = i; }
    }
    var b = beats[best];
    stepT = 0.18;
    if (b && b.mark && !b.done && bd <= GOOD_W) {
      b.done = true;
      var res = bd <= PERFECT_W ? 'PERFECT' : 'GOOD';
      streak++; bestStreak = Math.max(bestStreak, streak);
      var add = res === 'PERFECT' ? 2 : 1;
      water += add;
      var pts = (res === 'PERFECT' ? 100 : 50) + streak * 5;
      if (state === S.PLAYING) { score += pts; hitsN++; if (res === 'PERFECT') perfects++; }
      judgeWord = res; judgeT = 0.35;
      var scale = [0, 2, 4, 7, 9, 12, 14, 16];
      game.audio.tone(392 * Math.pow(2, scale[Math.min(scale.length - 1, Math.floor(streak / 3))] / 12), 0.1, { wave: 'square', volume: 0.09 });
      game.feedback.good(WHEEL_X, WHEEL_Y - WHEEL_R - 260, { text: res, color: res === 'PERFECT' ? C.gold : C.good, size: 52, count: 8 });
      game.fx.burst(220, Math.round(H * 0.39), { color: C.water, count: 6 + add * 3, speed: 220 });
      if (state === S.PLAYING && water >= GOAL && water - add < GOAL) { game.audio.play('se_milestone', 0.45); game.fx.popup('GOOD', W / 2, Math.round(H * 0.22), { color: C.gold, size: 80 }); }
      return 'hit';
    }
    // 印のない板の拍に踏む/拍から外れて踏む: よろけて水がこぼれる
    stumbleT = 0.4; streak = 0;
    water = Math.max(0, water - 1);
    judgeWord = 'MISS'; judgeT = 0.35;
    game.feedback.bad(WHEEL_X, WHEEL_Y - WHEEL_R - 220, { text: 'MISS', shake: 0.05 });
    return 'stumble';
  }

  function stepSong(dt) {
    songT += dt;
    if (stumbleT > 0) stumbleT -= dt;
    if (stepT > 0) stepT -= dt;
    if (rimGold > 0) rimGold -= dt;
    if (judgeT > 0) judgeT -= dt;
    // 拍の頭: 太鼓(印の板は「ドン」、休みの板は「ツ」)
    for (var i = lastBeat + 1; i < beats.length && beats[i].t <= songT; i++) {
      lastBeat = i;
      var b = beats[i];
      if (b.mark) game.audio.tone(98, 0.09, { wave: 'triangle', volume: 0.2 });
      else game.audio.tone(1760, 0.02, { wave: 'square', volume: 0.04 });
      // 段の変わり目の予告: 鐘と縁の金色
      var nx = beats[i + 1];
      if (nx && nx.sec !== b.sec) { rimGold = 0.8; game.audio.tone(1568, 0.25, { wave: 'triangle', volume: 0.08 }); }
      if (i > 0 && beats[i - 1].sec !== b.sec && state === S.PLAYING) { sectionIdx = b.sec; startSectionMusic(b.sec); }
    }
    // 踏み逃し
    for (var k = 0; k < beats.length; k++) {
      var bb = beats[k];
      if (bb.mark && !bb.done && songT - bb.t > GOOD_W) {
        bb.done = true; streak = 0; judgeWord = 'MISS'; judgeT = 0.35;
        game.audio.tone(147, 0.08, { wave: 'sawtooth', volume: 0.06 });
      }
    }
  }

  // ── 描画 ──
  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, Math.round(H * 0.34), [[0, C.sky], [1, C.haze]]);
    // 遠い山(彩度を落とす)
    for (var m = 0; m < 5; m++) {
      var mx = m * 260 - 60, mh = 90 + (m % 2) * 50, base = Math.round(H * 0.3);
      for (var r = 0; r < mh; r += 8) game.draw.rect(mx + 130 * (1 - r / mh), base - mh + r, 260 * (r / mh), 8, C.farHill);
    }
    // 田んぼ(奥ほど小さく・淡い苗の板)。水位で水面の色が濃くなる
    var top = Math.round(H * 0.3), bot = Math.round(H * 0.44);
    var fill = Math.min(1, water / GOAL);
    game.draw.gradient(top, bot, [[0, '#b8c8a8'], [1, '#8a9a6a']]);
    game.draw.rect(0, top, W, bot - top, C.water, 0.15 + fill * 0.55);
    for (var row = 0; row < 6; row++) {
      var u = row / 5, y = top + 10 + (bot - top - 20) * u * u;
      var px = 4 + u * 6, gap = 60 + u * 70;
      for (var x = ((row % 2) * gap) / 2; x < W; x += gap) {
        game.draw.rect(x - px * 2, y + px * 3.4, px * 4, px, C.ink, 0.15 + u * 0.15);
        game.draw.sprite(SPROUT, { g: u < 0.4 ? '#8ab878' : C.rice }, x, y, px, { anchor: 'center' });
      }
    }
    // 用水から田への樋
    game.draw.rect(60, Math.round(H * 0.44), 280, 26, C.wood);
    game.draw.rect(60, Math.round(H * 0.44) + 6, 280, 10, C.water, 0.6 + Math.sin(t * 6) * 0.2);
    // 手前の用水路と土手
    game.draw.gradient(Math.round(H * 0.44), H, [[0, '#8a7a50'], [0.2, C.mud], [0.62, '#3a6a8a'], [1, '#2a4a6a']]);
    var off = (t * 120) % 140;
    for (var w = 0; w < 12; w++) game.draw.rect(((w * 140 + off) % (W + 140)) - 70, Math.round(H * 0.82) + (w % 3) * 50, 80, 6, '#8ac0e8', 0.6);
  }

  function drawWheel() {
    var t = game.time.elapsed;
    var ph = beatPhase(songT);
    var step = Math.PI * 2 / PADDLES;
    // 接地影(楕円)
    for (var e = 0; e < 4; e++) game.draw.rect(WHEEL_X - 300 + e * 30, WHEEL_Y + WHEEL_R + 90 + e * 6, 600 - e * 60, 10, C.ink, 0.12);
    // 縁(段の変わり目は金色に光る)
    var rimCol = rimGold > 0 && Math.floor(t * 12) % 2 === 0 ? C.gold : C.wood;
    game.draw.circle(WHEEL_X, WHEEL_Y, WHEEL_R + 16, rimCol);
    game.draw.circle(WHEEL_X, WHEEL_Y, WHEEL_R - 8, '#2a4a5a');
    // 踏み板と輻(拍ごとに板1枚ぶん回る)
    var k0 = Math.ceil(ph - PADDLES / 2), k1 = Math.floor(ph + PADDLES / 2);
    for (var k = k0; k <= k1; k++) {
      var a = -Math.PI / 2 + (k - ph) * step;
      var cx = Math.cos(a), cy = Math.sin(a);
      game.draw.line(WHEEL_X, WHEEL_Y, WHEEL_X + cx * WHEEL_R, WHEEL_Y + cy * WHEEL_R, C.woodDk, 12);
      var b = k >= 0 && k < beats.length ? beats[k] : null;
      var marked = b && b.mark;
      var col = marked ? (b.done ? '#8a7060' : C.red) : '#a08a6a';
      var x1 = WHEEL_X + cx * (WHEEL_R - 10), y1 = WHEEL_Y + cy * (WHEEL_R - 10), x2 = WHEEL_X + cx * (WHEEL_R + 80), y2 = WHEEL_Y + cy * (WHEEL_R + 80);
      if (marked && !b.done) game.draw.line(x1, y1, x2, y2, C.white, 46 + Math.sin(t * 10) * 6);
      game.draw.line(x1, y1, x2, y2, col, 34);
      if (marked && !b.done) game.draw.circle(x2, y2, 12, C.gold);
    }
    game.draw.circle(WHEEL_X, WHEEL_Y, 46, C.wood);
    game.draw.circle(WHEEL_X, WHEEL_Y, 20, C.woodDk);
    // てっぺんの判定位置(三角)と手すり
    var ty = WHEEL_Y - WHEEL_R - 96;
    game.draw.line(WHEEL_X - 40, ty - 60, WHEEL_X, ty - 20, C.gold, 10);
    game.draw.line(WHEEL_X + 40, ty - 60, WHEEL_X, ty - 20, C.gold, 10);
    game.draw.line(WHEEL_X - 260, ty - 230, WHEEL_X + 260, ty - 230, C.woodDk, 14);
    game.draw.line(WHEEL_X - 250, ty - 230, WHEEL_X - 250, WHEEL_Y + WHEEL_R + 80, C.woodDk, 12);
    game.draw.line(WHEEL_X + 250, ty - 230, WHEEL_X + 250, WHEEL_Y + WHEEL_R + 80, C.woodDk, 12);
    // 拍の光(てっぺんで脈打つ)
    var frac = ph - Math.floor(ph);
    game.draw.circle(WHEEL_X, ty - 20, 26 + (1 - frac) * 18, C.white, 0.15 + (1 - frac) * 0.35);
  }

  function drawFarmer() {
    var ph = beatPhase(songT);
    var fr = FARMER[Math.floor(ph) % 2 === 0 ? 0 : 1];
    if (stepT <= 0 && stumbleT <= 0) fr = FARMER[Math.floor(ph) % 2 === 0 ? 1 : 0];
    if (stumbleT > 0 || (over && !won)) fr = FARMER[2];
    if (over && won) fr = FARMER[3];
    var y = WHEEL_Y - WHEEL_R - 96 - 100 + (stepT > 0 ? 8 : 0);
    game.draw.sprite(fr, FARMER_PAL, WHEEL_X + (stumbleT > 0 ? Math.sin(game.time.elapsed * 40) * 8 : 0), y, 14, { anchor: 'center' });
  }

  function drawGauge() {
    // 田の水位(旗まで)
    var gx = 80, gw = W - 160, gy = 160;
    var cap = GOAL * 1.5;
    game.draw.rect(gx, gy, gw, 30, C.ink, 0.35);
    game.draw.rect(gx, gy, gw * Math.min(1, water / cap), 30, water >= GOAL ? C.gold : C.water);
    var fx = gx + gw * (GOAL / cap);
    game.draw.rect(fx - 3, gy - 30, 6, 66, C.ink);
    game.draw.rect(fx, gy - 30, 40, 24, C.red);
    if (stopT > 0) game.draw.rect(gx - 10, gy - 10, gw + 20, 50, C.white, 0.6);
    var timeBar = Math.max(0, 1 - songT / (beats[beats.length - 1].t + 0.6));
    game.draw.rect(gx, gy + 40, gw * timeBar, 8, C.white, 0.7);
  }

  function drawWorld() {
    drawField(); drawWheel(); drawFarmer();
    if (judgeT > 0 && judgeWord) label(judgeWord, WHEEL_X, WHEEL_Y + 40, 64, judgeWord === 'MISS' ? C.red : C.gold);
  }

  function hud() {
    label(String(score), 190, 110, 60, C.ink);
    label(water + ' / ' + GOAL, W - 190, 110, 52, C.water);
    drawGauge();
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0 || stopT > 0) { game.audio.play('se_tap', 0.05); return; }
    if (stepOn() === 'stumble') game.audio.play('se_tap', 0.06);
  });

  // ── ATTRACT: 実判定で印の板を拍どおりに踏む → 印のない板の拍でわざと踏んでよろける ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.88, press: 0, k: 1, bad: false };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) { resetRun(true); demo.k = 0; demo.bad = false; }
    stepSong(dt);
    if (demo.press > 0) demo.press -= dt;
    while (demo.k < beats.length && !beats[demo.k].mark && !(demo.k === 4 && !demo.bad)) demo.k++;
    if (demo.k < beats.length && songT >= beats[demo.k].t) {
      if (demo.k === 4) demo.bad = true;
      stepOn(); demo.press = 0.15; demo.k++;
    }
    if (songT > beats[beats.length - 1].t + 0.3) demo.t = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!beats) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      label(GAME_TITLE, W / 2, 110, 88, C.red);
      label('HI-SCORE ' + game.best, W / 2, 180, 38, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1880, 44, C.gold);
      else label('TAP TO START', W / 2, 1880, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(0, 250, W, 340, C.ink, 0.55);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 345, 100, won ? C.gold : C.red);
      label('SCORE ' + score, W / 2, 425, 58, C.white);
      label('PERFECT ' + perfects + '  COMBO ' + bestStreak, W / 2, 485, 40, C.white);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 555, 52, C.gold);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 555, 42, C.white);
      if (!won) label('あと' + Math.max(1, GOAL - water) + '杯!', W / 2, Math.round(H * 0.47), 64, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1880, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { water: water, perfect: perfects, hits: hitsN, maxCombo: bestStreak };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      // hit-stop: 旗に届かなかった水位計を白く光らせて止める
      stopT -= dt;
      if (stopT <= 0) { game.feedback.bad(W / 2, 260, { text: 'MISS' }); finish(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) { songT = 0; lastBeat = -1; startSectionMusic(0); }
    } else if (!over) {
      playT += dt;
      stepSong(dt);
      if (songT > beats[beats.length - 1].t + 0.6 || playT >= TIME_LIMIT) {
        over = true; won = water >= GOAL;
        if (won) { score += water * 20; finish(); }
        else { stopT = 0.45; game.audio.tone(196, 0.2, { wave: 'sawtooth', volume: 0.1 }); }
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.5), 120, C.gold);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(350, 1200), { color: i % 2 ? C.water : C.gold, count: 22, speed: 460 });
  }

  // 水車囃子(オリジナル)。拍の数=段のテンポで鳴らし直す
  var TUNE = [
    ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
    ['A4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 1],
  ];
  var TUNE_BASS = [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['D3', 1], ['A2', 1], ['E3', 1], ['A2', 1]];

  game.onStart(function() {
    game.audio.melody(TUNE, { tempo: 112, wave: 'triangle', volume: 0.05, loop: true, bass: TUNE_BASS });
    state = S.ATTRACT;
    initGame();
  });
})(game);

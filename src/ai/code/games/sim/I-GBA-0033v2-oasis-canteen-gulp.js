// I-GBA-0033v2-oasis-canteen-gulp.js
// オアシスのひと飲み — 日にかざした水筒の残りを一瞬だけ見て覚え、押している間だけ流れ込む水を「ゴクッ」の数で数えて、ちょうど飲み干した瞬間に離す
// 操作: 水筒が日にかざされた一瞬、上に浮かぶ水滴の数が中身の量。手元のパッドを押している間だけ水が口へ流れ、水滴1つぶんごとにゴクッと鳴る。最後のゴクッの直後に離す。早く離すと水筒に残り、押しすぎるとむせてこぼす
// 終わり: 15秒以内に4本飲み干せばCLEAR。2回しくじる(残す/こぼす/押さずに見送る)か時間切れでGAME OVER。後の水筒ほど量が多く、ゴクッの間隔が変わり、中身が見えるのが短い
// @mechanic: hold_duration
// @theme: desert_oasis_canteen_gulp
// 世界観: 砂漠のオアシスで、喉の渇いたらくだ使いが隊商の休憩の間に、残りの違う水筒を一本ずつ日にかざして量を見極め、こぼさず一滴も残さず飲み干す
// 残るもの: 正誤(CLEAR/GAME OVER) + 飲み干した本数・PERFECT数・最小誤差(秒)・スコア
// スタイル: MODE7 PSEUDO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横ストリップを奥ほど圧縮した砂の床が地平線へ収束。空は地平グラデ。少色
  var STYLE = { bg: ['#ff8a3c', '#ffd27a'], main: ['#e8b860', '#d49c48', '#3a6ad8'], accent: ['#5ad0ff', '#ffffff'] };
  var SAND_A = STYLE.main[0], SAND_B = STYLE.main[1], ROBE = STYLE.main[2];
  var WATER = STYLE.accent[0], WHITE = STYLE.accent[1];
  var LEATHER = '#8a4a20', DARK = '#3a2010';

  var LOGO = 'OASIS GULP';
  var NEEDED = 4;
  var MISS_MAX = 2;
  var TIME_LIMIT = 15;
  var PERFECT_WIN = 0.15, GOOD_WIN = 0.4, SPILL_AT = 0.55;

  var HORIZON = H * 0.4;
  var CX = W * 0.5;
  var PAD_Y = H * 0.86;
  var VESSELS = [
    { units: 3, gap: 0.42, peek: 0.75 },
    { units: 4, gap: 0.36, peek: 0.7 },
    { units: 5, gap: 0.3, peek: 0.6 },
    { units: 4, gap: 0.44, peek: 0.5 },
    { units: 6, gap: 0.28, peek: 0.5 },
    { units: 5, gap: 0.38, peek: 0.45 },
  ];

  var MODES = { ATTRACT: 'attract', PLAYING: 'playing', RESULT: 'result' };
  var mode = MODES.ATTRACT;

  // ── スプライト ──
  var DRIVER = [
    ['....TTTT....', '...TTTTTT...', '..TTTTTTTT..', '...SSSSSS...', '...SKSSKS...', '...SSSSSS...', '....SMMS....', '..RRRRRRRR..', '.RRRRRRRRRR.', 'RRRRRRRRRRRR', 'S.RRRRRRRR.S', '..RRRRRRRR..', '..RR....RR..', '..BB....BB..'],
    ['............', '....TTTT....', '...TTTTTT...', '..TTTTTTTT..', '...SKSSKS...', '...SSMMSS...', '...SSSSSS...', '..RRRRRRRR..', '.SRRRRRRRRS.', 'RRRRRRRRRRRR', 'RRRRRRRRRRRR', '..RRRRRRRR..', '..RR....RR..', '..BB....BB..'],
    ['....TTTT....', '...TTTTTT...', '..TTTTTTTT..', '...SSSSSS...', '...KSSSSK...', '...SKMMKS...', '....MMMM....', '..RRRRRRRR..', 'SRRRRRRRRRRS', 'RRRRRRRRRRRR', '..RRRRRRRR..', '..RRRRRRRR..', '..RR....RR..', '..BB....BB..'],
    ['....TTTT....', '...TTTTTT...', '..TTTTTTTT..', '...SSSSSS...', '...SKSSKS...', '...SMSSMS...', '....SMMS....', 'S.RRRRRRRR.S', 'SRRRRRRRRRRS', 'RRRRRRRRRRRR', '..RRRRRRRR..', '..RRRRRRRR..', '..RR....RR..', '..BB....BB..'],
  ];
  var DRIVER_PAL = { T: '#f4f0e0', S: '#c88a58', K: DARK, M: '#7a2a1a', R: ROBE, B: DARK };
  var CAMEL = [
    ['..........CC....', '.........CCCC...', '.........CKCCC..', '..CCC....CCCCC..', '.CCCCC...CC.....', 'CCCCCCCCCCC.....', 'CCCCCCCCCCC.....', '.CCCCCCCCC......', '..LL....LL......'],
    ['..........CC....', '.........CCCC...', '.........CCCCC..', '..CCC....CCCCC..', '.CCCCC...CC.....', 'CCCCCCCCCCC.....', 'CCCCCCCCCCC.....', '.CCCCCCCCC......', '..LL....LL......'],
  ];
  var CAMEL_PAL = { C: '#c8904a', K: DARK, L: '#9a6a34' };
  var CANTEEN = ['....NN....', '....NN....', '..LLLLLL..', '.LLLLLLLL.', 'LLLHLLLLLL', 'LLHLLLLLLL', 'LLLLLLLLLL', '.LLLLLLLL.', '..LLLLLL..'];
  var CANTEEN_TILT = ['NN........', 'NNNL......', '.NLLLLL...', '..LLLLLLL.', '..LHLLLLLL', '..LLLLLLLL', '...LLLLLLL', '....LLLLL.', '.....LLL..'];
  var CANTEEN_PAL = { N: DARK, L: LEATHER, H: '#c87a40' };
  var DROP = ['..W..', '.WWW.', 'WWWWW', 'WWHWW', '.WWW.'];
  var DROP_PAL = { W: WATER, H: WHITE };
  var PALM = ['.GG.GG.', 'GGGGGGG', '.GGTGG.', '...T...', '...T...', '...T...', '...T...'];

  // ── 1本ぶんの水筒モデル(本番・デモ共通) ──
  function makeVessel(i) {
    var v = VESSELS[Math.min(VESSELS.length - 1, i)];
    return { units: v.units, gap: v.gap, peek: v.peek, D: v.units * v.gap, stage: 'present', st: 0, pourT: 0, glugs: 0, wait: 0 };
  }
  // 戻り値: '' / 'peek' / 'ready' / 'glug' / 'empty' / 'spill' / 'idle'
  function tickVessel(v, dt) {
    v.st += dt;
    if (v.stage === 'present' && v.st >= 0.3) { v.stage = 'peek'; v.st = 0; return 'peek'; }
    if (v.stage === 'peek' && v.st >= v.peek) { v.stage = 'ready'; v.st = 0; return 'ready'; }
    if (v.stage === 'ready' && v.st >= 2.6) { v.stage = 'over'; return 'idle'; }
    if (v.stage === 'pour') {
      v.pourT += dt;
      var g = Math.min(v.units, Math.floor(v.pourT / v.gap + 1e-6));
      if (g > v.glugs) { v.glugs = g; return g >= v.units ? 'empty' : 'glug'; }
      if (v.pourT >= v.D + SPILL_AT) { v.stage = 'over'; return 'spill'; }
    }
    return '';
  }
  function startPour(v) { if (v.stage !== 'ready') return false; v.stage = 'pour'; v.pourT = 0; v.glugs = 0; return true; }
  // 離した瞬間の判定
  function stopPour(v) {
    if (v.stage !== 'pour') return null;
    v.stage = 'over';
    var d = v.pourT - v.D;
    if (d < -0.02) return { kind: 'left', left: v.units - v.glugs, err: -d };
    if (d <= PERFECT_WIN) return { kind: 'perfect', err: Math.abs(d) };
    if (d <= GOOD_WIN) return { kind: 'good', err: d };
    return { kind: 'spill', err: d };
  }

  // ── 状態 ──
  var vessel, idx, drunk, misses, perfects, bestErr, timeLeft, countIn, stop, over, won, endT, score, prevBest, scroll, celebT, holding, mood, moodT, nextT;

  function initGame() {
    idx = 0; vessel = makeVessel(0); drunk = 0; misses = 0; perfects = 0; bestErr = 9;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; celebT = 0; holding = false; mood = ''; moodT = 0; nextT = 0;
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#5a2a10', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col || WHITE, bold: true, align: 'center' });
  }

  // ── 描画 ──
  scroll = 0;
  function drawDesert() {
    game.draw.gradient(0, HORIZON, [[0, '#ff6a3a'], [0.6, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.circle(W * 0.72, HORIZON - 230, 90, '#fff2b0', 0.95);
    game.draw.circle(W * 0.72, HORIZON - 230, 150, '#fff2b0', 0.25);
    // 地平線の砂丘とオアシス
    for (var d = 0; d < 7; d++) game.draw.circle(d * 190 - 40, HORIZON + 10, 120, '#e0a050', 1);
    game.draw.rect(W * 0.55, HORIZON - 8, 300, 16, WATER, 0.9);
    for (var p = 0; p < 3; p++) game.draw.sprite(PALM, { G: '#3a8a3a', T: '#7a5a2a' }, W * 0.58 + p * 110, HORIZON - 40, 9, { anchor: 'center' });
    // MODE7 の床: 奥ほど圧縮されたストリップ + 手前だけ市松
    for (var y = HORIZON; y < H; y += 8) {
      var dy = y - HORIZON + 4;
      var z = 2400 / dy;
      var band = Math.floor(z / 1.4 + scroll);
      if (z >= 12) {
        game.draw.rect(0, y, W, 8, band % 2 ? SAND_A : SAND_B);
        game.draw.rect(0, y, W, 8, '#ffd27a', Math.min(0.5, (z - 12) / 80));
        continue;
      }
      var cw = 420 / z;
      var off = ((CX % cw) + cw) % cw;
      for (var x = off - cw; x < W; x += cw) {
        var cell = Math.floor((x - CX) / cw + 1000);
        game.draw.rect(x, y, cw + 1, 8, (band + cell) % 2 ? SAND_A : SAND_B);
      }
    }
    // 熱のゆらぎ
    for (var h = 0; h < 4; h++) game.draw.rect(0, HORIZON + 20 + h * 18 + Math.sin(game.time.elapsed * 3 + h) * 4, W, 3, '#fff2b0', 0.18);
  }

  function drawCamp(v, m) {
    var bob = Math.sin(game.time.elapsed * 2) * 4;
    // らくだ(瞬き)
    var blink = Math.floor(game.time.elapsed * 1.3) % 5 === 0 ? 1 : 0;
    game.draw.circle(W * 0.22, H * 0.67, 120, DARK, 0.15);
    game.draw.sprite(CAMEL[blink], CAMEL_PAL, W * 0.24, H * 0.6 + bob * 0.5, 18, { anchor: 'center' });
    // らくだ使い
    var fr = 0;
    if (m === 'choke') fr = 2;
    else if (m === 'joy') fr = 3;
    else if (v && v.stage === 'pour') fr = 1;
    var hop = m === 'joy' ? -Math.abs(Math.sin(game.time.elapsed * 9)) * 40 : 0;
    var px = CX + 120, py = H * 0.6 + bob + hop + (m === 'sad' ? 24 : 0);
    game.draw.circle(px, H * 0.705, 110, DARK, 0.18);
    game.draw.sprite(DRIVER[fr], DRIVER_PAL, px, py, 20, { anchor: 'center' });
    return { x: px, y: py };
  }

  function drawCanteen(v, who, hl) {
    if (!v) return;
    var mouth = { x: who.x, y: who.y - 60 };
    if (v.stage === 'present') {
      var k = Math.min(1, v.st / 0.3);
      game.draw.sprite(CANTEEN, CANTEEN_PAL, W * 0.3 + (who.x - 90 - W * 0.3) * k, H * 0.62 - 120 * k, 14, { anchor: 'center' });
      return;
    }
    if (v.stage === 'peek') {
      // 日にかざすと透けて中身の量(水滴の数)が見える
      var cx = who.x - 40, cy = HORIZON - 120;
      game.draw.circle(cx, cy, 120, '#fff2b0', 0.35);
      game.draw.sprite(CANTEEN, { N: DARK, L: '#e8a060', H: WHITE }, cx, cy, 16, { anchor: 'center', alpha: 0.85 });
      var lv = v.units / 7;
      game.draw.rect(cx - 64, cy + 64 - 110 * lv, 128, 110 * lv, WATER, 0.55);
      for (var i = 0; i < v.units; i++) {
        var dx = cx + (i - (v.units - 1) / 2) * 70;
        game.draw.sprite(DROP, DROP_PAL, dx, cy - 150 + Math.sin(game.time.elapsed * 6 + i) * 6, 11, { anchor: 'center' });
      }
      return;
    }
    if (v.stage === 'pour') {
      var tx = mouth.x - 120, ty = mouth.y - 110;
      game.draw.sprite(CANTEEN_TILT, CANTEEN_PAL, tx, ty, 14, { anchor: 'center' });
      var empty = v.pourT >= v.D;
      if (!empty) {
        game.draw.line(tx - 60, ty - 50, mouth.x - 10, mouth.y, WATER, 16);
        game.draw.line(tx - 60, ty - 50, mouth.x - 10, mouth.y, WHITE, 4);
      } else {
        var ph = (game.time.elapsed * 6) % 1;
        game.draw.circle(tx - 60 + (mouth.x - tx + 50) * ph, ty - 50 + (mouth.y - ty + 50) * ph, 8, WATER);
        // むせる予告: 喉元が白く点滅
        if (Math.floor(game.time.elapsed * 14) % 2 === 0) game.draw.circle(mouth.x, mouth.y + 20, 46, WHITE, 0.5);
      }
      // ゴクッの泡(首を上る)
      var gp = (v.pourT % v.gap) / v.gap;
      if (!empty) game.draw.circle(tx - 40 + gp * 40, ty - 30 + gp * 50, 12 * (1 - gp) + 4, WHITE, 0.8);
      if (hl) game.draw.circle(tx, ty, 60 + hl * 120, WHITE, 0.6 * (1 - hl) + 0.2);
      return;
    }
    if (v.stage === 'ready') {
      var wob = Math.sin(game.time.elapsed * 8) * 6;
      game.draw.sprite(CANTEEN, CANTEEN_PAL, who.x - 90, who.y + 10 + wob, 14, { anchor: 'center' });
    }
    if (v.stage === 'over' && hl) {
      game.draw.sprite(CANTEEN, CANTEEN_PAL, who.x - 90, who.y + 10, 14 + hl * 6, { anchor: 'center' });
      game.draw.circle(who.x - 90, who.y + 10, 60 + hl * 120, WHITE, 0.6 * (1 - hl) + 0.2);
    }
  }

  function drawPad(v, pressed) {
    var ready = v && v.stage === 'ready';
    var pouring = v && v.stage === 'pour';
    var y = PAD_Y + (pressed ? 10 : 0) + (ready ? Math.sin(game.time.elapsed * 9) * 6 : 0);
    game.draw.circle(CX, PAD_Y + 120, 220, DARK, 0.15);
    game.draw.circle(CX, y, 170, ready || pouring ? '#f4f0e0' : '#b88a50', 1);
    game.draw.circle(CX, y, 140, ready || pouring ? WATER : '#9a6a34', ready || pouring ? 0.9 : 1);
    game.draw.sprite(CANTEEN, CANTEEN_PAL, CX, y, 12, { anchor: 'center', alpha: ready || pouring ? 1 : 0.5 });
    if (ready) {
      var g = 0.5 + 0.5 * Math.sin(game.time.elapsed * 10);
      game.draw.circle(CX, y, 190 + g * 10, WHITE, 0.25 + g * 0.2);
    }
    // 経過表示: 押している間に満ちていく輪(ゴクッの度に点が灯る)
    if (pouring) {
      var n = 48;
      var frac = Math.min(1, v.pourT / 3);
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        if (i / n > frac) break;
        game.draw.circle(CX + Math.cos(a) * 200, y + Math.sin(a) * 200, 9, WHITE, 0.9);
      }
      for (var gg = 1; gg <= v.glugs; gg++) {
        var ga = -Math.PI / 2 + Math.min(1, gg * v.gap / 3) * Math.PI * 2;
        game.draw.circle(CX + Math.cos(ga) * 200, y + Math.sin(ga) * 200, 18, WATER);
      }
    }
  }

  function drawHud() {
    ink(drunk + ' / ' + NEEDED, W * 0.18, 90, 54);
    ink(String(score), CX, 90, 44, '#fff2b0');
    for (var i = 0; i < MISS_MAX; i++) game.draw.sprite(CANTEEN, i < misses ? { N: DARK, L: '#5a3a2a', H: '#5a3a2a' } : CANTEEN_PAL, W * 0.78 + i * 80, 88, 7, { anchor: 'center', alpha: i < misses ? 0.5 : 1 });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 170, W - 140, 22, DARK, 0.35);
    game.draw.rect(70, 170, (W - 140) * fr, 22, low ? '#ff3a2a' : WHITE);
  }

  // ── 進行 ──
  function haltThen(after) { stop = { t: 0.42, max: 0.42, after: after }; }

  function takeMiss(label) {
    mood = 'choke'; moodT = 0.9;
    haltThen(function () {
      misses++;
      game.feedback.bad(CX, H * 0.48, { text: label, shake: 12 });
      if (misses >= MISS_MAX) { won = false; wrapUp(); return; }
      nextT = 0.35;
    });
  }

  function onResult(r) {
    if (!r) return;
    if (r.kind === 'perfect' || r.kind === 'good') {
      drunk++;
      bestErr = Math.min(bestErr, r.err);
      if (r.kind === 'perfect') perfects++;
      score += r.kind === 'perfect' ? 150 : 100;
      mood = 'joy'; moodT = 0.6;
      game.feedback.good(CX + 120, H * 0.5, { text: r.kind === 'perfect' ? 'PERFECT' : 'GOOD', color: WATER, count: 16 });
      if (drunk === 2) { game.fx.popup('2 / ' + NEEDED, CX, H * 0.25, { color: WHITE, size: 64 }); game.audio.play('se_milestone', 0.4); }
      if (drunk >= NEEDED) { won = true; wrapUp(); return; }
      nextT = 0.4;
    } else if (r.kind === 'left') {
      game.audio.play('se_tap', 0.3);
      game.fx.popup('あと' + r.left + '口', CX - 40, H * 0.4, { color: WATER, size: 50 });
      takeMiss('MISS');
    } else {
      game.audio.play('se_break', 0.35);
      game.fx.burst(CX + 120, H * 0.53, { color: WATER, count: 20, speed: 380 });
      takeMiss('MISS');
    }
  }

  game.onPress(function (x, y) {
    if (mode === MODES.ATTRACT) { game.audio.play('se_coin', 0.45); mode = MODES.PLAYING; initGame(); return; }
    if (mode === MODES.RESULT) { game.audio.play('se_tap', 0.2); mode = MODES.ATTRACT; initGame(); demo.t = 0; return; }
    holding = true;
    if (countIn > 0 || stop || over || !startPour(vessel)) { game.audio.tone('D4', 0.04, { wave: 'square', volume: 0.05 }); return; }
    game.audio.play('se_tap', 0.25);
    game.fx.burst(CX, PAD_Y, { color: WATER, count: 6, speed: 140 });
  });
  game.onRelease(function (x, y) {
    holding = false;
    if (mode !== MODES.PLAYING || over || stop) return;
    var r = stopPour(vessel);
    if (r) onResult(r);
    else game.audio.tone('G3', 0.03, { wave: 'triangle', volume: 0.04 });
  });

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 20) + (MISS_MAX - misses) * 60;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash(WATER, 0.3);
  }

  function enterResult() {
    mode = MODES.RESULT;
    var stats = { drunk: drunk, misses: misses, perfect: perfects, bestErr: bestErr < 9 ? Math.round(bestErr * 100) / 100 : null, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  function glugSound(ev, v) {
    if (ev === 'glug') game.audio.tone(330 - v.glugs * 18, 0.09, { wave: 'sine', volume: 0.14, slide: -120 });
    else if (ev === 'empty') game.audio.tone(200, 0.12, { wave: 'sine', volume: 0.16, slide: -80 });
    else if (ev === 'peek') game.audio.tone('E6', 0.1, { wave: 'triangle', volume: 0.07 });
  }

  // ── ATTRACT: 1本目は最後のゴクッ直後に離してPERFECT、2本目は早く離して残す ──
  var demo = { t: 0, v: null, idx: 0, press: false, hl: 0, mood: '', moodT: 0, after: 0 };
  var DEMO_CYCLE = 5.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.v) { demo.v = makeVessel(0); demo.v.peek = 0.55; demo.idx = 0; demo.press = false; demo.hl = 0; demo.mood = ''; demo.after = 0; }
    var v = demo.v;
    var ev = tickVessel(v, dt);
    if (ev === 'glug' || ev === 'empty') glugSound(ev, v);
    if (v.stage === 'ready' && v.st > 0.2) { startPour(v); demo.press = true; }
    if (v.stage === 'pour') {
      var releaseAt = demo.idx === 0 ? v.D + 0.06 : v.gap * 2 + 0.1;
      if (v.pourT >= releaseAt) {
        var r = stopPour(v); demo.press = false;
        if (r.kind === 'perfect' || r.kind === 'good') { game.feedback.good(CX + 120, H * 0.5, { text: 'PERFECT', color: WATER, count: 10, volume: 0.2 }); demo.mood = 'joy'; }
        else { game.feedback.bad(CX, H * 0.48, { text: 'MISS', volume: 0.15, shake: 3 }); demo.mood = 'choke'; demo.hl = 0.01; }
        demo.moodT = 0.7; demo.after = 0.6;
      }
    }
    if (demo.after > 0) {
      demo.after -= dt;
      if (demo.after <= 0 && demo.idx === 0) { demo.idx = 1; demo.v = makeVessel(1); demo.v.peek = 0.55; demo.hl = 0; }
    }
    if (demo.moodT > 0) { demo.moodT -= dt; if (demo.moodT <= 0) demo.mood = ''; }
    if (demo.hl > 0) demo.hl = Math.min(1, demo.hl + dt * 1.6);
  }

  game.onUpdate(function (dt) {
    scroll += dt * 0.25;
    if (mode === MODES.ATTRACT) {
      stepDemo(dt);
      drawDesert();
      var who = drawCamp(demo.v, demo.mood);
      drawCanteen(demo.v, who, demo.hl);
      drawPad(demo.v, demo.press);
      game.draw.hand(CX + 30, PAD_Y + (demo.press ? 0 : -80), { press: demo.press, scale: 16 });
      ink(LOGO, CX, H * 0.07, 80, WHITE);
      ink('BEST ' + (game.best > 0 ? game.best : '-'), CX, H * 0.115, 36, '#fff2b0');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', CX, H * 0.72, 46, WHITE);
      else ink('INSERT COIN', CX, H * 0.72, 40, '#fff2b0');
      return;
    }

    if (mode === MODES.RESULT) {
      drawDesert();
      drawCamp(null, won ? 'joy' : 'sad');
      drawPad(null, false);
      ink(won ? 'CLEAR' : 'GAME OVER', CX, H * 0.2, 100, won ? WHITE : '#ff3a2a');
      ink(drunk + ' / ' + NEEDED, CX, H * 0.27, 60);
      ink('SCORE ' + score, CX, H * 0.33, 50);
      if (won && score > prevBest) ink('NEW RECORD', CX, H * 0.73, 52, '#fff2b0');
      else ink('BEST ' + Math.max(prevBest, score), CX, H * 0.73, 40, '#fff2b0');
      if (!won) ink('あと' + (NEEDED - drunk) + '本!', CX, H * 0.39, 56, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', CX, H * 0.97, 38);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (moodT > 0) { moodT -= dt; if (moodT <= 0 && !over) mood = ''; }
    if (over) {
      endT -= dt;
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.15; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.25, H * 0.6), { color: game.random(0, 1) < 0.5 ? WATER : WHITE, count: 14, speed: 420 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      hl = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('A5', 0.12, { wave: 'square', volume: 0.1 });
    } else {
      timeLeft -= dt;
      if (nextT > 0) {
        nextT -= dt;
        if (nextT <= 0) { idx++; vessel = makeVessel(idx); game.audio.play('se_jump', 0.2); }
      } else {
        var ev = tickVessel(vessel, dt);
        glugSound(ev, vessel);
        if (ev === 'spill') {
          game.audio.play('se_break', 0.35);
          game.fx.burst(CX + 120, H * 0.53, { color: WATER, count: 20, speed: 380 });
          takeMiss('MISS');
        } else if (ev === 'idle') {
          game.audio.play('se_tap', 0.3);
          takeMiss('MISS');
        }
      }
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0;
        if (vessel.stage === 'pour') vessel.stage = 'over';
        haltThen(function () { game.feedback.bad(CX, H * 0.45, { text: 'TIME UP' }); won = false; wrapUp(); });
      }
    }

    drawDesert();
    var w2 = drawCamp(vessel, stop ? 'choke' : (over ? (won ? 'joy' : 'sad') : mood));
    drawCanteen(vessel, w2, hl);
    drawPad(vessel, holding);
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', CX, H * 0.46, 110, WHITE);
  });

  game.onStart(function () {
    game.audio.melody([['D5', 0.5], ['E5', 0.5], ['F5', 1], ['A5', 0.5], ['G#5', 0.5], ['F5', 1], ['E5', 0.5], ['D5', 0.5], ['C#5', 1], ['D5', 2],
      ['F5', 0.5], ['G5', 0.5], ['A5', 1], ['A#5', 0.5], ['A5', 0.5], ['G5', 1], ['F5', 0.5], ['E5', 0.5], ['D5', 3]],
      { tempo: 96, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['D3', 2], ['A2', 2], ['D3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] });
    mode = MODES.ATTRACT;
    initGame();
  });
})(game);

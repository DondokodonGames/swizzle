// I-DS-0020v2-well-bucket-flap-drop.js
// 釣瓶くぐらせ — 井戸の中で回り続ける滑車の羽根が縦に開いた瞬間を読んで釣瓶を一段ずつ落とし、底の水面まで届ける
// 操作: タップすると釣瓶が一段下の滑車の手前まで落ちる。左右の滑車の羽根は回り続け、縦に開いている時だけ通れる。落ちる途中も回るので少し早めに落とす(1杯目は落ちた瞬間の羽根の位置が薄く見える)
// 終わり: 釣瓶2杯を水面まで届けて汲めばCLEAR。羽根に3回ぶつけるか時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: old_well_pulley_flaps
// 世界観: 古い井戸端で、水汲みの少年が井戸の中で回る滑車の羽根の隙間に合わせて釣瓶を一段ずつ落とし入れ、底の水面まで届けて水がめを満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 汲めた釣瓶の数・くぐらせた段数・ぶつけた回数
// スタイル: 90s PRE-RENDER
var STYLE = { bg: ['#0a0c10', '#1c2028', '#2c2a2a'], main: ['#6a6460', '#8a6038', '#3a3a40'], accent: ['#7ab8d8', '#d8483a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'WELL DROP';
  var TIME_LIMIT = 18;
  var NEEDED = 2;
  var MISS_MAX = 3;
  var CX = W * 0.5, HALF = 200, BW = 58, BLADE = 185;
  var LAYERS = [H * 0.33, H * 0.45, H * 0.57, H * 0.69];
  var WATER_Y = H * 0.8;
  var REST_UP = 140;
  var G = 2400;
  var T_CROSS = Math.sqrt((2 * REST_UP) / G);
  var BUCKETS = [
    { w: [1.9, 2.2, -2.4, 2.7], guide: true },
    { w: [2.7, -3.0, 3.3, -3.6], guide: false },
    { w: [3.2, -3.5, 3.8, -4.1], guide: false },
  ];
  var C = {
    dark: STYLE.bg[0], mid: STYLE.bg[1], stone: STYLE.main[0], wood: STYLE.main[1], iron: STYLE.main[2],
    water: STYLE.accent[0], red: STYLE.accent[1], light: '#e8dcc0', gold: '#f0c040', ink: '#050608',
  };

  var BUCKET = [
    '....rr....',
    '...r..r...',
    '..r....r..',
    'hhhhhhhhhh',
    '.wwwwwwww.',
    '.whhhhhhw.',
    '.wwwwwwww.',
    '..wwwwww..',
    '..hhhhhh..',
  ];
  var BUCKET_FULL = [
    '....rr....',
    '...r..r...',
    '..r....r..',
    'hbbbbbbbbh',
    '.wwbbbbww.',
    '.whhhhhhw.',
    '.wwwwwwww.',
    '..wwwwww..',
    '..hhhhhh..',
  ];
  var BUCKET_PAL = { r: '#c8b080', h: C.iron, w: C.wood, b: C.water };
  var BUCKET_HIT = { r: '#ffffff', h: '#ffffff', w: '#ffffff', b: '#ffffff' };
  var BOY_A = [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hrrrrrrh..',
    '...ffffff...',
    '...fkffkf...',
    '...ffmmff...',
    '....ffff....',
    '..ccccccccff',
    '.ccccccccc.f',
    '.f.cccccc...',
    '...pppppp...',
    '...pp..pp...',
    '...ss..ss...',
  ];
  var BOY_B = [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hrrrrrrh..',
    '...ffffff...',
    '...fkffkf...',
    '...ffffff...',
    '....ffff..ff',
    '..cccccccc.f',
    '.cccccccccc.',
    '.f.cccccc...',
    '...pppppp...',
    '..pp....pp..',
    '..ss....ss..',
  ];
  var BOY_SAD = [
    '............',
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hrrrrrrh..',
    '...ffffff...',
    '...kkffkk...',
    '....ffff....',
    '..cccccccc..',
    '.cccccccccc.',
    '.f.cccccc.f.',
    '...pppppp...',
    '..pp....pp..',
    '.ss......ss.',
  ];
  var BOY_PAL = { h: '#2a2420', r: C.red, f: '#d8a880', k: C.ink, m: '#a04a3a', c: '#4a6a8a', p: '#3a3430', s: '#1a1410' };
  var FROG = ['.k..k.', 'gggggg', 'gyyyyg', 'g.gg.g'];
  var JAR = ['.oooooo.', 'oooooooo', 'oo....oo', 'oooooooo', 'oooooooo', '.oooooo.'];

  var STONES = [];
  for (var sr = 0; sr < 26; sr++) {
    for (var scn = 0; scn < 3; scn++) STONES.push({ r: sr, c: scn, v: ((sr * 7 + scn * 13) % 5) / 5 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, bIx, delivered, misses, passes, perfects, score, spin, phase0, cfg;
  var level, by, vy, phase, phT, hitStop, hitLayer, badPending, ready, done, endT, won, resultT, endSent, newRec, finalScore, celebT, splashT, jarFill;

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }
  function restY(i) { return i < LAYERS.length ? LAYERS[i] - REST_UP : WATER_Y - 30; }
  function angleOf(i, t) { return phase0[i] + cfg.w[i] * t; }
  function intrusion(i, t) { return BLADE * Math.abs(Math.cos(angleOf(i, t))); }
  function isOpen(i, t) { return HALF - intrusion(i, t) >= BW + 4; }

  function initGame() {
    clock = TIME_LIMIT; bIx = 0; delivered = 0; misses = 0; passes = 0; perfects = 0; score = 0; spin = 0;
    hitStop = 0; hitLayer = -1; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; celebT = 0; splashT = 0; jarFill = 0;
    setupBucket(0);
  }
  function setupBucket(i) {
    cfg = BUCKETS[Math.min(i, BUCKETS.length - 1)];
    phase0 = [];
    for (var k = 0; k < LAYERS.length; k++) phase0.push(game.random(0, Math.PI * 2));
    level = 0; by = restY(0) - 160; vy = 0; phase = 'enter'; phT = 0;
  }

  function drop(real) {
    if (phase !== 'rest') return false;
    vy = 0; phase = 'fall'; phT = 0;
    game.audio.play('se_tap', real ? 0.3 : 0.15);
    game.audio.tone('G3', 0.1, { wave: 'triangle', volume: 0.05, slide: -200 });
    return true;
  }

  function simulate(dt, real) {
    spin += dt;
    phT += dt;
    if (phase === 'enter') {
      by += (restY(0) - by) * Math.min(1, dt * 9);
      if (phT > 0.35) { by = restY(0); phase = 'rest'; phT = 0; }
    } else if (phase === 'fall') {
      var prevY = by;
      vy += G * dt; by += vy * dt;
      if (level < LAYERS.length && prevY < LAYERS[level] && by >= LAYERS[level]) {
        if (!isOpen(level, spin)) { clang(level, real); return; }
        var perfect = intrusion(level, spin) < BLADE * 0.3;
        game.feedback.good(CX, LAYERS[level], { text: perfect ? 'PERFECT' : 'GOOD', color: C.water, sound: 'se_good', volume: 0.25 });
        if (real) { passes++; score += perfect ? 120 : 60; if (perfect) perfects++; }
      }
      var target = restY(level + 1);
      if (by >= target) {
        by = target; vy = 0; level++;
        if (level >= LAYERS.length) { phase = 'fill'; phT = 0; splashT = 0.5; reachWater(real); }
        else { phase = 'rest'; phT = 0; game.audio.tone('C4', 0.05, { wave: 'square', volume: 0.05 }); }
      }
    } else if (phase === 'fill') {
      if (phT > 0.75) nextBucket(real);
    }
    if (splashT > 0) splashT -= dt;
  }

  function clang(i, real) {
    hitStop = 0.42; hitLayer = i; badPending = { real: real, i: i };
    by = LAYERS[i] - 46;
    game.audio.play('se_break', real ? 0.4 : 0.2);
    game.fx.flash('#ffffff', 0.12);
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    game.feedback.bad(CX, LAYERS[b ? b.i : 0], { text: 'MISS' });
    hitLayer = -1;
    by = restY(level); vy = 0; phase = 'rest'; phT = 0;
    if (b && b.real) {
      misses++;
      if (misses >= MISS_MAX) finish(false);
    }
  }

  function reachWater(real) {
    game.audio.play('se_coin', 0.45);
    game.fx.burst(CX, WATER_Y, { color: C.water, count: 20, speed: 360 });
    if (real) {
      delivered++; score += 300;
      jarFill = delivered;
      game.fx.popup(delivered + ' / ' + NEEDED, CX, WATER_Y - 160, { color: C.water, size: 70 });
      game.audio.play('se_milestone', 0.4);
    }
  }

  function nextBucket(real) {
    if (real) {
      bIx++;
      if (delivered >= NEEDED) { finish(true); return; }
    }
    setupBucket(real ? bIx : 0);
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score + (ok ? Math.round(Math.max(0, clock) * 20) : 0);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { buckets: delivered, layers: passes, perfect: perfects, hits: misses };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 開くのを先読みして3段くぐらせ、1段だけ早まって羽根にぶつける ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: 0, wait: 0, bad: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.bad = false; demo.wait = 0.5; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) resolveBad(); }
    else simulate(dt, false);
    demo.wait -= dt;
    if (phase === 'rest' && demo.wait <= 0 && level < LAYERS.length) {
      var c = Math.abs(Math.cos(angleOf(level, spin + T_CROSS)));
      var wantBad = level === 2 && !demo.bad;
      if ((!wantBad && c < 0.3) || (wantBad && c > 0.95)) {
        if (wantBad) demo.bad = true;
        demo.press = 0.18; demo.wait = 0.35;
        drop(false);
      }
    }
    demo.press = Math.max(0, demo.press - dt);
    demo.gx += (W * 0.5 + 220 - demo.gx) * Math.min(1, dt * 4);
    demo.gy += (H * 0.9 - demo.gy) * Math.min(1, dt * 4);
  }

  // ── 描画(プリレンダ風: 暗い石組み + 粒状ノイズ + 金属のハイライト) ─────────────
  function drawWell() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#30302c'], [0.2, C.mid], [0.75, C.dark], [1, '#04050a']]);
    // 井戸の奥の壁(石組み)
    for (var i = 0; i < STONES.length; i++) {
      var s = STONES[i];
      var x = CX - HALF + s.c * 134 + (s.r % 2) * 40, y = H * 0.2 + s.r * 52;
      if (y > H * 0.86) continue;
      game.draw.rect(x + 4, y + 4, 126, 44, s.v > 0.5 ? '#3a3834' : '#33312e', 0.9);
      game.draw.rect(x + 4, y + 4, 126, 4, '#5a5650', 0.5);
    }
    game.draw.rect(CX - HALF, H * 0.2, 60, H * 0.66, '#000000', 0.35);
    game.draw.rect(CX + HALF - 60, H * 0.2, 60, H * 0.66, '#000000', 0.35);
    // 上から差す光
    game.draw.rect(CX - 120, H * 0.2, 240, H * 0.62, C.light, 0.05 + 0.02 * Math.sin(t * 1.3));
    // 水面
    game.draw.rect(CX - HALF, WATER_Y, HALF * 2, H * 0.86 - WATER_Y, '#1a3a4a');
    for (var w = 0; w < 6; w++) {
      var wx = CX - HALF + 30 + ((w * 71 + t * 40) % (HALF * 2 - 60));
      game.draw.rect(wx, WATER_Y + 8 + (w % 3) * 18, 40, 4, C.water, 0.5);
    }
    if (splashT > 0) for (var sp = 0; sp < 5; sp++) game.draw.circle(CX + (sp - 2) * 40, WATER_Y - splashT * 120 * (1 - Math.abs(sp - 2) * 0.3), 10, C.water, 0.8);
    game.draw.sprite(FROG, { k: C.ink, g: '#5a8a4a', y: '#c8d890' }, CX + HALF - 70, WATER_Y - 18 + (Math.floor(t * 1.5) % 2) * 3, 8, { anchor: 'center' });
  }

  function drawBlades(i, t, ghost) {
    var y = LAYERS[i];
    var a = angleOf(i, t);
    var hit = hitLayer === i && hitStop > 0;
    var col = ghost ? '#ffffff' : (hit && Math.floor(game.time.elapsed * 18) % 2 === 0 ? '#ffffff' : '#7a6e66');
    var wdt = ghost ? 4 : (hit ? 30 : 20);
    for (var side = -1; side <= 1; side += 2) {
      var px = CX + side * HALF;
      for (var b = 0; b < 2; b++) {
        var ang = a + b * Math.PI;
        var dx = Math.cos(ang) * BLADE, dy = Math.sin(ang) * BLADE;
        var tx = px - side * dx, ty = y + dy;
        if ((tx - px) * side > 0) continue; // 壁の中に入る側は見えない
        if (ghost) { game.draw.line(px, y, tx, ty, col, wdt); continue; }
        game.draw.line(px, y, tx, ty, '#2a2624', wdt + 8);
        game.draw.line(px, y, tx, ty, col, wdt);
        game.draw.line(px, y - 4, tx, ty - 4, '#c8c0b4', 3);
        for (var k = 1; k <= 3; k++) {
          var qx = px + (tx - px) * (k / 3.4), qy = y + (ty - y) * (k / 3.4);
          game.draw.rect(qx - 7, qy - 7, 14, 14, C.red);
        }
      }
    }
  }

  function drawWallsAndPulleys() {
    game.draw.gradient(0, H * 0.2, [[0, '#4a4640'], [1, '#2a2826']]);
    game.draw.rect(0, H * 0.2, CX - HALF, H * 0.66, '#24221f');
    game.draw.rect(CX + HALF, H * 0.2, W - CX - HALF, H * 0.66, '#24221f');
    game.draw.rect(CX - HALF - 10, H * 0.2, 10, H * 0.66, '#5a5650');
    game.draw.rect(CX + HALF, H * 0.2, 10, H * 0.66, '#5a5650');
    for (var i = 0; i < LAYERS.length; i++) {
      for (var side = -1; side <= 1; side += 2) {
        var px = CX + side * HALF, py = LAYERS[i];
        var a = angleOf(i, spin);
        game.draw.circle(px, py, 46, '#1a1816');
        game.draw.circle(px, py, 38, '#5a524a');
        for (var k = 0; k < 4; k++) {
          var sa = a * side + k * Math.PI / 2;
          game.draw.line(px, py, px + Math.cos(sa) * 34, py + Math.sin(sa) * 34, '#2a2624', 5);
        }
        game.draw.circle(px, py, 10, '#c8c0b4');
        var open = isOpen(i, spin);
        game.draw.circle(px + side * 70, py, 10, i === level && phase === 'rest' ? (open ? C.water : C.red) : '#2a2624');
      }
    }
    // 井戸の縁と滑車
    game.draw.rect(CX - HALF - 60, H * 0.195, HALF * 2 + 120, 40, '#5a5650');
    game.draw.rect(CX - HALF - 60, H * 0.195, HALF * 2 + 120, 8, '#8a847a');
    game.draw.rect(CX - 6, H * 0.13, 12, H * 0.07, C.wood);
    game.draw.circle(CX, H * 0.135, 30, C.iron);
    game.draw.circle(CX, H * 0.135, 12, '#c8c0b4');
  }

  function drawBucket() {
    var t = game.time.elapsed;
    var sway = phase === 'rest' ? Math.sin(t * 3) * 4 : 0;
    game.draw.line(CX, H * 0.135, CX + sway, by - 40, '#c8b080', 4);
    var hit = hitStop > 0;
    var full = phase === 'fill';
    game.draw.sprite(full ? BUCKET_FULL : BUCKET, hit && Math.floor(t * 18) % 2 === 0 ? BUCKET_HIT : BUCKET_PAL, CX + sway, by, hit ? 13 : 11, { anchor: 'center' });
  }

  function drawGrain() {
    var t = Math.floor(game.time.elapsed * 15);
    for (var i = 0; i < 40; i++) {
      game.draw.rect((i * 211 + t * 53) % W, (i * 389 + t * 97) % H, 3, 3, '#ffffff', 0.05);
    }
  }

  function drawBoy(mood) {
    var t = game.time.elapsed;
    var spr = mood === 'sad' ? BOY_SAD : (phase === 'fall' || Math.floor(t * 2) % 2 === 0 ? BOY_A : BOY_B);
    var hop = mood === 'win' ? -Math.abs(Math.sin(t * 7)) * 36 : 0;
    game.draw.sprite(spr, BOY_PAL, W * 0.16, H * 0.155 + hop, 9, { anchor: 'center' });
    game.draw.line(W * 0.16 + 50, H * 0.15, CX - 30, H * 0.135, '#c8b080', 4);
  }

  function drawJar() {
    game.draw.sprite(JAR, { o: '#8a5a38' }, W * 0.87, H * 0.92, 16, { anchor: 'center' });
    var f = Math.min(1, jarFill / NEEDED);
    if (f > 0) game.draw.rect(W * 0.87 - 48, H * 0.92 + 30 - f * 60, 96, f * 60, C.water, 0.85);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(BUCKET, i < delivered ? { r: '#c8b080', h: C.iron, w: C.gold, b: C.water } : { r: '#3a3632', h: '#2a2826', w: '#3a3632', b: '#3a3632' }, W * 0.12 + i * 110, H * 0.93, 7, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.8);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 90 - m * 70, 84, 24, m < MISS_MAX - misses ? C.water : '#2a2826');
    for (var l = 0; l < LAYERS.length; l++) game.draw.rect(70 + l * 56, 64, 40, 40, (level > l || phase === 'fill') ? C.water : '#2a2826');
    say(delivered + ' / ' + NEEDED, W * 0.5, 76, 60, C.light);
    say('SCORE ' + score, W * 0.5, 138, 32, C.water);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(70, 186, W - 140, 18, '#2a2826');
    game.draw.rect(70, 186, (W - 140) * frac, 18, frac < 0.25 ? C.red : C.gold);
  }

  function drawScene() {
    drawWell();
    if (cfg.guide && phase === 'rest' && level < LAYERS.length && state !== S.RESULT) drawBlades(level, spin + T_CROSS, true);
    for (var i = 0; i < LAYERS.length; i++) drawBlades(i, spin, false);
    drawBucket();
    drawWallsAndPulleys();
    drawGrain();
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0) { game.audio.tone('E3', 0.04, { wave: 'triangle', volume: 0.05 }); return; }
    if (!drop(true)) game.fx.burst(x, y, { color: C.light, count: 3, speed: 80 });
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawScene();
      drawBoy('');
      drawJar();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.125, C.ink, 0.85);
      say(TITLE, W * 0.5, H * 0.05, 92, C.water);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 36, C.light);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.965, 44, C.gold);
      else say('INSERT COIN', W * 0.5, H * 0.965, 40, C.light);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawScene();
      drawBoy(won ? 'win' : 'sad');
      drawJar();
      game.draw.rect(90, H * 0.2, W - 180, 540, C.ink, 0.88);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, won ? C.water : C.red);
      say(delivered + ' / ' + NEEDED, W * 0.5, H * 0.32, 68, C.light);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.light);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.gold);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.gold); }
      else if (!won) say('あと' + Math.max(1, LAYERS.length - level) + '段!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.955, 40, C.light);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt; spin += dt * 0.3;
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.22, H * 0.7), { color: Math.random() < 0.5 ? C.water : C.gold, count: 14, speed: 420 });
      }
      if (endT <= 0) { state = S.RESULT; resultT = 0; }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else if (ready > 0) {
      ready -= dt; spin += dt;
      if (ready <= 0) game.audio.play('se_tap', 0.35);
    } else {
      simulate(dt, true);
      if (phase === 'rest' || phase === 'fall') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }

    drawScene();
    drawBoy(done ? (won ? 'win' : 'sad') : '');
    drawJar();
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.4, 100, C.gold);
      game.draw.hand(W * 0.5 + 220, H * 0.9, { press: ready < 0.4, scale: 14 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 0.5], ['A4', 0.5],
      ['G4', 1], ['F4', 0.5], ['D4', 0.5], ['E4', 1], ['D4', 1],
    ], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: [['D2', 2], ['A2', 2], ['G2', 2], ['D2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

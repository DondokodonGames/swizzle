// I-GBA-0052v2-funpark-wall-hold-hop.js
// ファンパーク・ウォール — 手の届く出っ張りをタップで選んで跳び移り、乗った出っ張りが外れる前に頂上の鐘まで登る
// 操作: 少女から届く範囲の出っ張り(白く明滅)をタップすると、そこへ跳び移る。乗った出っ張りは数秒でぐらつき外れるので、その前に次へ。届かない出っ張りのタップは空振り
// 終わり: 最上段に届いて鐘を鳴らせばCLEAR。乗っている出っ張りが外れる/20秒で届かなければGAME OVER(安全ロープでぶら下がる)
// @mechanic: camera_climb
// @theme: summer_funpark_climbing_wall
// 世界観: 夏の遊園地のクライミング壁で、腕自慢の少女が色とりどりの出っ張りを蹴って跳び移り、てっぺんの鐘を鳴らして景品の旗をもらう
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った高さm・跳び移り回数・星の数・スコア
// スタイル: PIXEL HD

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // PIXEL HD: 多色+光。パララックス3層(雲・観覧車・壁)、光源は左上の太陽1つで陰影を統一
  var STYLE = { bg: ['#3fa8ff', '#9ad8ff', '#fff2d0'], main: ['#e8e2d6', '#b8aea0', '#ff6fa8'], accent: ['#ffd23a', '#33c4b0'] };
  var INK = '#1c1a2a', RED = '#ff4a3a';
  var HOLD_COLS = ['#ff6fa8', '#33c4b0', '#ffb43a', '#7a6cff', '#7ad84a'];

  var TITLE = 'FUNPARK WALL';
  var TIME_LIMIT = 20;
  var ROWS = 13, ROW_GAP = 210, START_Y = -160;
  var TOP_Y = START_Y - ROWS * ROW_GAP;
  var REACH_X = 330, REACH_UP = 440;
  var GIRL_SY = H * 0.66;

  var MODE = 'ATTRACT';
  var w = null;

  // ── スプライト ─────────────────────────────────────
  var GIRL_A = ['.s......s.', '.s.hhhh.s.', '.shhhhhhs.', '.shsesehs.', '..hssssh..', '..tttttt..', '..tttttt..', '...tttt...', '...pppp...', '...p..p...', '..pp..pp..', '..ff..ff..'];
  var GIRL_B = ['.s......s.', '.s.hhhh.s.', '.shhhhhhs.', '.shsesehs.', '..hssssh..', '..tttttt..', '..tttttt..', '...tttt...', '...pppp...', '..p....p..', '.pp....pp.', '.ff....ff.'];
  var GIRL_JUMP = ['..s....s..', '..s....s..', '..shhhhs..', '..hhhhhh..', '..hsesesh.', '..hssssh..', '..tttttt..', '..tttttt..', '...tttt...', '...pppp...', '...pppp...', '...ffff...'];
  var GIRL_FALL = ['..........', '...hhhh...', '..hhhhhh..', '..hsoosh..', 'ss.ssss.ss', '.sttttttss', '..tttttt..', '...tttt...', '...pppp...', '..pp..pp..', '.pp....pp.', '.f......f.'];
  var GIRL_CHEER = ['s........s', '.s.hhhh.s.', '..hhhhhh..', '..hsesesh.', '..hsmmsh..', '..tttttt..', '..tttttt..', '...tttt...', '...pppp...', '..pp..pp..', '.pp....pp.', '.ff....ff.'];
  var PAL_GIRL = { h: '#7a3a1e', s: '#ffc8a0', e: INK, o: INK, m: '#d03a3a', t: STYLE.main[2], p: '#3a5ad8', f: '#ffffff' };
  var HOLD = ['..gggg..', '.gLLgggg', 'gLLggggg', 'gggggggd', '.gggggdd', '..dddd..'];
  var HOLD_S = ['.gggg.', 'gLgggg', 'ggggdd', '.dddd.'];
  var STAR = ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'];
  var BELL = ['...kk...', '..yyyy..', '.yLyyyy.', '.yLyyyy.', 'yyyyyyyy', 'dddddddd', '...kk...'];
  var PAL_BELL = { k: '#6a5a3a', y: STYLE.accent[0], L: '#fff8c0', d: '#c08a1a' };
  var CLOUD = ['..wwww....', '.wwwwwww..', 'wwwwwwwwww', '.wwwwwwww.'];

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    var b = Math.min(255, Math.round((n & 255) * f));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ── 壁の生成 ───────────────────────────────────────
  function makeRng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function genHolds(rng) {
    var holds = [{ x: W / 2, y: START_Y, big: true, col: HOLD_COLS[0], gold: false, popped: false, fall: 0, timer: -1, left: false, row: 0 }];
    var pathX = W / 2;
    for (var k = 1; k <= ROWS; k++) {
      var y = START_Y - k * ROW_GAP;
      pathX = Math.max(190, Math.min(W - 190, pathX + (rng() - 0.5) * 520));
      var xs = [pathX];
      var extra = k < 5 ? 2 : 1;
      for (var e = 0; e < extra; e++) {
        var cand = 190 + Math.floor(rng() * 5) * 175;
        var okX = true;
        for (var q = 0; q < xs.length; q++) if (Math.abs(xs[q] - cand) < 170) okX = false;
        if (okX) xs.push(cand);
      }
      for (var i = 0; i < xs.length; i++) {
        var big = k < 4 || rng() < 0.6;
        holds.push({ x: xs[i], y: y + (rng() - 0.5) * 50, big: big, col: HOLD_COLS[Math.floor(rng() * HOLD_COLS.length)], gold: i > 0 && rng() < 0.35, popped: false, fall: 0, timer: -1, left: false, row: k });
      }
    }
    return holds;
  }

  function freshWorld(demo) {
    var rng = demo ? makeRng(4242) : function () { return game.random(0, 1); };
    var hs = genHolds(rng);
    return {
      demo: !!demo, holds: hs, cur: 0, gx: hs[0].x, gy: hs[0].y, jump: null, camY: START_Y - GIRL_SY,
      stretch: 0, stretchX: 0, clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false, why: '',
      score: 0, hops: 0, stars: 0, bestRow: 0, milestone: 0, warned: -1, fallY: 0,
    };
  }

  function initGame() { w = freshWorld(false); }

  function crumbleFor(h) {
    var base = Math.max(0.95, 1.8 - h.row * 0.07);
    return h.big ? base : base * 0.65;
  }

  function reachable(i) {
    var h = w.holds[i], c = w.holds[w.cur];
    if (h.popped || i === w.cur) return false;
    var dx = Math.abs(h.x - c.x), dy = c.y - h.y;
    return dx <= REACH_X && dy <= REACH_UP && dy >= -40;
  }

  // ── 行動(本番とデモで共通) ─────────────────────────
  function holdAt(x, y) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < w.holds.length; i++) {
      var h = w.holds[i];
      if (h.popped) continue;
      var d = Math.hypot(h.x - x, h.y - w.camY - y);
      if (d < 115 && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function leap(i) {
    if (w.phase !== 'run' || w.jump) return 'busy';
    if (i < 0) return 'empty';
    if (!reachable(i)) {
      w.stretch = 0.3; w.stretchX = w.holds[i].x > w.gx ? 1 : -1;
      game.feedback.bad(w.holds[i].x, w.holds[i].y - w.camY, { text: 'MISS', size: 40, shake: 3 });
      return 'far';
    }
    var from = w.holds[w.cur];
    from.left = true; from.timer = Math.min(from.timer < 0 ? 0.4 : from.timer, 0.4);
    w.jump = { from: { x: w.gx, y: w.gy }, to: i, t: 0 };
    game.audio.play('se_jump', 0.3);
    return 'jump';
  }

  function land(i) {
    var h = w.holds[i];
    var gained = Math.max(0, h.row - w.bestRow);
    w.cur = i; w.gx = h.x; w.gy = h.y; w.jump = null; w.hops++;
    h.timer = crumbleFor(h);
    if (gained > 0) { w.bestRow = h.row; w.score += 60 * gained + (gained >= 2 ? 80 : 0); }
    game.fx.burst(h.x, h.y - w.camY, { color: h.col, count: 8, speed: 200 });
    if (h.gold) {
      h.gold = false; w.stars++; w.score += 200;
      game.audio.play('se_coin', 0.45);
      game.fx.popup('+200', h.x, h.y - w.camY - 110, { color: STYLE.accent[0], size: 46 });
    } else {
      game.audio.tone(300 + h.row * 40, 0.06, { wave: 'square', volume: 0.07 });
    }
    var m = Math.floor((START_Y - h.y) / 500);
    if (m > w.milestone && !w.demo) {
      w.milestone = m;
      game.fx.popup((m * 5) + 'm', W / 2, H * 0.3, { color: '#ffffff', size: 64 });
      game.audio.play('se_milestone', 0.4);
    }
    if (h.row >= ROWS && !w.demo) {
      w.phase = 'stop'; w.stopT = 0.7; w.won = true;
      game.feedback.good(W / 2, TOP_Y - 260 - w.camY, { text: 'CLEAR', color: STYLE.accent[0], size: 60 });
      game.fx.burst(W / 2, TOP_Y - 260 - w.camY, { color: STYLE.accent[0], count: 30, speed: 520 });
    } else if (gained > 0) {
      game.feedback.good(h.x, h.y - w.camY - 90, { text: gained >= 2 ? 'NICE' : null, color: '#ffffff', size: 40, count: 4 });
    }
  }

  function fail(why) {
    w.phase = 'stop'; w.stopT = 0.55; w.won = false; w.why = why;
    game.fx.flash('#ffffff', 0.12);
    game.audio.play('se_break', 0.4);
  }

  function advance(dt) {
    if (!w.demo) w.clock -= dt;
    if (w.stretch > 0) w.stretch -= dt;
    if (w.jump) {
      w.jump.t += dt / 0.22;
      var to = w.holds[w.jump.to];
      var k = Math.min(1, w.jump.t);
      w.gx = w.jump.from.x + (to.x - w.jump.from.x) * k;
      w.gy = w.jump.from.y + (to.y - w.jump.from.y) * k - Math.sin(k * Math.PI) * 60;
      if (k >= 1) land(w.jump.to);
    }
    for (var i = 0; i < w.holds.length; i++) {
      var h = w.holds[i];
      if (h.popped) { h.fall += dt; continue; }
      if (h.timer < 0) continue;
      h.timer -= dt;
      if (i === w.cur && !w.jump && h.timer < 0.7 && w.warned !== i) {
        w.warned = i;
        game.audio.tone('E6', 0.07, { wave: 'square', volume: 0.06 });
      }
      if (h.timer <= 0) {
        h.popped = true; h.fall = 0;
        if (i === w.cur && !w.jump) { fail('pop'); return; }
      }
    }
    var target = w.gy - GIRL_SY;
    w.camY += (target - w.camY) * Math.min(1, dt * 5);
    if (w.clock <= 0) { w.clock = 0; fail('time'); }
  }

  function settle() {
    var meters = Math.round((START_Y - w.holds[w.cur].y) / 100);
    var stats = { meters: meters, hops: w.hops, stars: w.stars };
    if (w.won) {
      w.score += 400 + Math.round(w.clock * 40);
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(w.gx, w.gy - w.camY - 120, { text: w.why === 'time' ? 'TIME UP' : 'MISS', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    game.draw.circle(150, 260, 120, '#fff8d0', 0.25);
    game.draw.circle(150, 260, 70, '#fff8d0');
    // 雲(遠景・ゆっくり流れる)
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + t * 18) % (W + 300)) - 150;
      var cy = 420 + c * 260 - (w.camY * 0.05) % 300;
      game.draw.sprite(CLOUD, { w: '#ffffff' }, cx, cy, 16, { anchor: 'center', alpha: 0.75 });
    }
    // 観覧車(中景・視差0.2)
    var fx = W * 0.86, fy = H * 0.62 - w.camY * 0.2 + START_Y * 0.2;
    game.draw.circle(fx, fy, 330, '#ffffff', 0.18);
    for (var s = 0; s < 8; s++) {
      var a = s / 8 * Math.PI * 2 + t * 0.15;
      game.draw.line(fx, fy, fx + Math.cos(a) * 320, fy + Math.sin(a) * 320, '#ffffff', 4);
      game.draw.rect(fx + Math.cos(a) * 320 - 22, fy + Math.sin(a) * 320 - 16, 44, 36, HOLD_COLS[s % 5], 0.7);
    }
    game.draw.line(fx, fy, fx - 160, fy + 900, '#d8e4f0', 10);
    game.draw.line(fx, fy, fx + 160, fy + 900, '#d8e4f0', 10);
  }

  function drawWall() {
    var top = TOP_Y - 380 - w.camY;
    var left = 90, right = W - 90;
    var y0 = Math.max(0, top), y1 = Math.min(H, -w.camY);
    if (y1 > y0) {
      game.draw.rect(left, y0, right - left, y1 - y0, STYLE.main[0]);
      game.draw.rect(left, y0, 16, y1 - y0, '#ffffff', 0.5);
      game.draw.rect(right - 22, y0, 22, y1 - y0, STYLE.main[1]);
      // パネル継ぎ目とボルト穴(壁と一緒にスクロール)
      var off = ((-w.camY) % 270 + 270) % 270;
      for (var y = off - 270; y < H; y += 270) {
        if (y < y0 || y > y1) continue;
        game.draw.rect(left, y, right - left, 4, STYLE.main[1]);
        for (var bx = left + 60; bx < right; bx += 120) game.draw.rect(bx, y + 135, 8, 8, '#8a8478');
      }
    }
    // 頂上の鐘と旗
    var by = TOP_Y - 260 - w.camY;
    if (by > -200 && by < H + 200) {
      game.draw.rect(left, top, right - left, 30, STYLE.accent[1]);
      for (var f = 0; f < 9; f++) {
        var fxp = left + 40 + f * 100;
        game.draw.rect(fxp, top + 30, 50, 40, HOLD_COLS[f % 5]);
      }
      game.draw.line(W / 2, top, W / 2, by - 60, '#6a5a3a', 6);
      var ring = w.phase === 'stop' && w.won ? Math.sin(game.time.elapsed * 30) * 12 : Math.sin(game.time.elapsed * 2) * 3;
      game.draw.circle(W / 2, by, 120, STYLE.accent[0], 0.15 + 0.1 * Math.sin(game.time.elapsed * 4));
      game.draw.sprite(BELL, PAL_BELL, W / 2 + ring, by, 18, { anchor: 'center' });
    }
    // 地面のマット
    var gy = -w.camY;
    if (gy < H + 50) {
      game.draw.rect(0, gy, W, 90, '#2f8a7a');
      game.draw.rect(60, gy - 30, W - 120, 40, '#3ab0e0');
      game.draw.rect(0, gy + 90, W, Math.max(0, H - gy - 90), '#d8b878');
    }
  }

  function drawHolds() {
    var t = game.time.elapsed;
    for (var i = 0; i < w.holds.length; i++) {
      var h = w.holds[i];
      var sy = h.y - w.camY + (h.popped ? h.fall * h.fall * 1800 : 0);
      if (sy < -100 || sy > H + 100) continue;
      if (h.popped && h.fall > 1.2) continue;
      var shaking = h.timer >= 0 && h.timer < 0.7 && !h.popped;
      var jx = shaking ? Math.sin(t * 60 + i) * 7 : 0;
      var canGo = w.phase === 'run' && !w.jump && reachable(i);
      if (canGo) {
        game.draw.circle(h.x, sy, 78, '#ffffff', 0.22 + 0.18 * Math.sin(t * 8 + i));
        game.draw.circle(h.x, sy, 60, '#ffffff', 0.2);
      }
      var col = shaking ? (Math.floor(t * 12) % 2 ? RED : h.col) : h.col;
      var hl = w.phase === 'stop' && !w.won && w.why === 'pop' && i === w.cur;
      var pal = hl ? { g: '#ffffff', L: '#ffffff', d: '#e0e0e0' } : { g: col, L: shade(col, 1.35), d: shade(col, 0.6) };
      game.draw.circle(h.x + 10, sy + 14, h.big ? 46 : 32, '#000000', 0.12);
      game.draw.sprite(h.big ? HOLD : HOLD_S, pal, h.x + jx, sy, hl ? 20 : h.big ? 13 : 12, { anchor: 'center' });
      if (shaking) {
        game.draw.line(h.x - 30 + jx, sy - 20, h.x + jx, sy + 6, INK, 4);
        game.draw.line(h.x + jx, sy + 6, h.x + 26 + jx, sy - 14, INK, 4);
      }
      if (h.gold && !h.popped) game.draw.sprite(STAR, { y: STYLE.accent[0] }, h.x + 54, sy - 54 + Math.sin(t * 5 + i) * 6, 7, { anchor: 'center' });
    }
  }

  function drawGirl() {
    var t = game.time.elapsed;
    var x = w.gx, y = w.gy - w.camY - 70;
    var art = Math.floor(t * 3) % 2 ? GIRL_A : GIRL_B;
    if (w.jump || w.stretch > 0) art = GIRL_JUMP;
    if (w.phase === 'stop' && w.won) art = GIRL_CHEER;
    var failed = (w.phase === 'stop' && !w.won) || (MODE === 'RESULT' && !w.won);
    if (failed) {
      art = GIRL_FALL;
      w.fallY = Math.min(260, w.fallY + 6);
      // 安全ロープでぶら下がる
      game.draw.line(x, TOP_Y - 380 - w.camY, x, y + w.fallY - 60, '#ff8a3a', 5);
      y += w.fallY + Math.sin(t * 4) * 10;
    }
    if (!failed) game.draw.line(x, TOP_Y - 380 - w.camY, x, y - 60, '#ff8a3a', 3);
    var lean = w.stretch > 0 ? w.stretchX * 24 : 0;
    game.draw.sprite(art, PAL_GIRL, x + lean, y, 12, { anchor: 'center', flipX: w.stretchX < 0 });
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawMeter() {
    var x = 46, y0 = H * 0.3, y1 = H * 0.78;
    game.draw.rect(x - 10, y0, 20, y1 - y0, INK, 0.45);
    var f = Math.min(1, w.bestRow / ROWS);
    game.draw.rect(x - 10, y1 - (y1 - y0) * f, 20, (y1 - y0) * f, STYLE.accent[0]);
    game.draw.sprite(BELL, PAL_BELL, x, y0 - 30, 5, { anchor: 'center' });
  }

  function drawStage() {
    drawBack();
    drawWall();
    drawHolds();
    drawGirl();
    drawMeter();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK, 0.5);
    label('SCORE ' + w.score, W * 0.3, 72, 40, '#ffffff');
    label(Math.round((START_Y - w.holds[w.cur].y) / 100) + 'm', W * 0.78, 72, 46, STYLE.accent[0]);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 132, W - 160, 20, '#3a3a5a');
    game.draw.rect(80, 132, (W - 160) * frac, 20, frac < 0.2 ? RED : STYLE.accent[1]);
    var progress = Math.min(1, w.bestRow / ROWS);
    game.draw.rect(80, 176, W - 160, 12, '#3a3a5a');
    game.draw.rect(80, 176, (W - 160) * progress, 12, STYLE.accent[0]);
    for (var s = 0; s < w.stars; s++) game.draw.sprite(STAR, { y: STYLE.accent[0] }, W - 100 - s * 50, 210, 4, { anchor: 'center' });
  }

  // ── ATTRACT(実ロジック + ボット) ───────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: 0, k: 0 };
  var DEMO_CYCLE = 6.6;
  function botPick() {
    // 一番高く届く出っ張りを選ぶ
    var best = -1, by = 1e9;
    for (var i = 0; i < w.holds.length; i++) if (reachable(i) && w.holds[i].y < by) { by = w.holds[i].y; best = i; }
    return best;
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; demo.k = 0; }
    if (demo.press > 0) demo.press -= dt;
    var tgt = w.phase === 'run' && !w.jump ? botPick() : -1;
    if (tgt >= 0) {
      var h = w.holds[tgt];
      demo.gx += (h.x - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (h.y - w.camY + 20 - demo.gy) * Math.min(1, dt * 8);
      var cur = w.holds[w.cur];
      // 3回目までは余裕をもって跳ぶ(成功例)。4回目は外れるまで待ってしまう(失敗例)
      var waitTill = demo.k < 3 ? 0.9 : -1;
      if (cur.timer >= 0 && cur.timer < waitTill || (cur.timer < 0 && cyc > 0.6)) {
        if (Math.hypot(demo.gx - h.x, demo.gy - (h.y - w.camY + 20)) < 40) { leap(tgt); demo.press = 0.22; demo.k++; }
      }
    }
    if (w.phase === 'run') advance(dt);
    else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0 && !w.demoShown) { w.demoShown = true; game.feedback.bad(w.gx, w.gy - w.camY - 120, { text: 'MISS', size: 56 }); }
    }
  }

  function begin() {
    initGame();
    MODE = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function (x, y) {
    if (MODE === 'ATTRACT') { begin(); return; }
    if (MODE === 'RESULT') { MODE = 'ATTRACT'; initGame(); demo.t = 0; game.audio.play('se_tap', 0.3); return; }
    var r = leap(holdAt(x, y));
    if (r === 'empty' || r === 'busy') {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: '#ffffff', count: 3, speed: 90 });
    }
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, INK, 0.5);
      label(TITLE, W / 2, 95, 74, STYLE.accent[0]);
      label('HI-SCORE ' + game.best, W / 2, 178, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 42, STYLE.main[2]);
      else label('INSERT COIN', W / 2, H * 0.955, 36, INK);
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.06, W, H * 0.22, INK, 0.75);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.11, 86, w.won ? STYLE.accent[0] : RED);
      label('SCORE ' + w.score, W / 2, H * 0.17, 48, '#ffffff');
      label(Math.round((START_Y - w.holds[w.cur].y) / 100) + 'm   ' + w.hops + '回', W / 2, H * 0.21, 36, STYLE.accent[1]);
      if (!w.won) label('あと' + Math.max(1, ROWS - w.bestRow) + '段!', W / 2, H * 0.255, 44, STYLE.accent[0]);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.255, 46, STYLE.accent[0]);
      else label('BEST ' + game.best, W / 2, H * 0.255, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 36, '#ffffff');
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    drawHud();
    if (w.phase === 'ready') {
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, STYLE.accent[0]);
      var first = botPick();
      if (first >= 0) game.draw.hand(w.holds[first].x, w.holds[first].y - w.camY + 20, { press: false, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 夏の遊園地の弾む行進曲
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G4', 0.5], ['C5', 1],
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['C3', 2]], bassVolume: 0.06 });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);

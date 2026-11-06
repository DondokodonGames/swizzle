// I-GBA-0050v2-bell-pitch-pairs.js
// ベルピッチペア — 伏せた鈴を持ち上げると鳴る。同じ高さで鳴る2つを耳で聞き分けて組にする
// 操作: 弧に並んだ伏せ鈴をタップすると持ち上がって鳴る。2つ目が同じ音なら紐で組になり、違えば両方伏せ直す
// 終わり: 3台(4個→6個→6個。台が進むほど音程が近くなる)を全部組にすればCLEAR。作業時間20秒が尽きればGAME OVER
// @mechanic: pair_match
// @theme: bell_tuning_room_pairs
// 世界観: 楽器工房の調律室で、鈴職人がフェルトの作業台に伏せた鈴を一つずつ鳴らし、同じ音の2つを赤紐で組にして出荷する
// 残るもの: 正誤(CLEAR/GAME OVER) + 組にした数・最大連続一致・スコア
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // HD POST 3D: 褐色〜灰に寄せた低彩度。ランプのブルーム(半透明円の重ね)と四辺のビネット
  var STYLE = { bg: ['#2b2520', '#4b4036', '#6e604f'], main: ['#c4a26c', '#8d7656', '#ddd0b8'], accent: ['#ffd27a', '#8fb2a8'] };
  var INK = '#120e0b', CORD = '#c8503e', FELT = '#41503f', FELT_D = '#2f3a2e';

  var TITLE = 'BELL PAIRS';
  var TIME_LIMIT = 20;
  var NEEDED = 8; // 2 + 3 + 3 組
  // 台ごとの音程。後の台ほど近い音になり、聞き分けが難しくなる(精度型)
  var ROUNDS = [
    [262, 392],        // C4 / G4
    [294, 440, 659],   // D4 / A4 / E5
    [330, 349, 392],   // E4 / F4 / G4
  ];
  var ARC_CX = W / 2, ARC_CY = H * 0.77, ARC_RX = 430, ARC_RY = 620;

  var MODE = 'ATTRACT';
  var w = null;

  // ── スプライト ─────────────────────────────────────
  var BELL = [
    '.....hh.....',
    '....h..h....',
    '....hhhh....',
    '...bbbbbb...',
    '..bLLbbbbb..',
    '..bLbbbbbb..',
    '..bLbbbbbb..',
    '.bbLbbbbbbb.',
    '.bbbbbbbbbb.',
    'bbbbbbbbbbbb',
    'dddddddddddd',
  ];
  var BELL_OPEN = BELL.concat(['....d..d....', '.....cc.....', '.....cc.....']);
  var PAL_BELL = { h: '#5a4a38', b: STYLE.main[0], L: STYLE.main[2], d: '#6a5236', c: '#3a2e22' };
  var PAL_RING = { h: '#6a5844', b: '#e2c48c', L: '#fff4dc', d: '#86683f', c: '#3a2e22' };
  var PAL_GOLD = { h: '#7a5a2a', b: STYLE.accent[0], L: '#fffbe8', d: '#b0782a', c: '#5a3a18' };
  var PAL_WHITE = { h: '#ffffff', b: '#ffffff', L: '#ffffff', d: '#e8e8e8', c: '#ffffff' };
  var PAL_FAR = { h: '#3a3029', b: '#4a3d31', L: '#5a4c3d', d: '#352b23', c: '#352b23' };

  var SMITH_A = [
    '....kkkk....',
    '...kkkkkk...',
    '...ssssss...',
    '...sesses...',
    '...ssssss...',
    '....smms....',
    '..aaaaaaaa..',
    '.saaaaaaaas.',
    '.saaWWWWaas.',
    '..aaWWWWaa..',
    '..aaWWWWaa..',
    '..aaaaaaaa..',
    '...pp..pp...',
    '...pp..pp...',
    '..bbb..bbb..',
  ];
  var SMITH_B = [
    '....kkkk....',
    '...kkkkkk...',
    '...ssssss...',
    '...ssssss...',
    '...ssssss...',
    '....smms....',
    '..aaaaaaaa..',
    '.saaaaaaaas.',
    '.saaWWWWaas.',
    '..aaWWWWaa..',
    '..aaWWWWaa..',
    '..aaaaaaaa..',
    '...pp..pp...',
    '...pp..pp...',
    '..bbb..bbb..',
  ];
  var SMITH_UP = [
    '....kkkk..s.',
    '...kkkkkk.s.',
    '...ssssss.a.',
    '...sesses.a.',
    '...ssssssaa.',
    '....smmsaa..',
    '..aaaaaaaa..',
    '.saaaaaaaa..',
    '.saaWWWWaa..',
    '..aaWWWWaa..',
    '..aaWWWWaa..',
    '..aaaaaaaa..',
    '...pp..pp...',
    '...pp..pp...',
    '..bbb..bbb..',
  ];
  var SMITH_SAD = [
    '............',
    '....kkkk....',
    '...kkkkkk...',
    '...ssssss...',
    '...s-ss-s...',
    '...ssssss...',
    '....smms....',
    '.saaaaaaaas.',
    '.saaWWWWaas.',
    '..aaWWWWaa..',
    '..aaWWWWaa..',
    '..aaaaaaaa..',
    '...pp..pp...',
    '..bbb..bbb..',
    '............',
  ];
  var PAL_SMITH = { k: '#3b2c22', s: '#e0b48c', e: INK, '-': INK, m: '#a0503c', a: '#5e6e66', W: '#cfc2a6', p: '#3c3a36', b: '#2a221c' };

  // ── 盤面 ───────────────────────────────────────────
  function slots(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = Math.PI * (1.13 + 0.74 * (i / (n - 1)));
      out.push({ x: ARC_CX + Math.cos(a) * ARC_RX, y: ARC_CY + Math.sin(a) * ARC_RY });
    }
    return out;
  }

  function buildBoard(hzList, shuffle) {
    var list = hzList.slice();
    if (shuffle) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(game.random(0, i + 1));
        if (j > i) j = i;
        var t = list[i]; list[i] = list[j]; list[j] = t;
      }
    }
    var pos = slots(list.length);
    w.bells = [];
    for (var k = 0; k < list.length; k++) {
      w.bells.push({ hz: list[k], x: pos[k].x, y: pos[k].y, open: false, matched: false, lift: 0, ring: 0, hl: 0, drop: 0.35 + k * 0.05 });
    }
    w.cords = []; w.first = -1; w.verdict = null; w.lock = 0;
  }

  function roundBoard(r) {
    var base = ROUNDS[r], out = [];
    for (var i = 0; i < base.length; i++) { out.push(base[i]); out.push(base[i]); }
    return out;
  }

  function freshWorld() {
    return {
      round: 0, bells: [], cords: [], first: -1, verdict: null, lock: 0,
      pairs: 0, combo: 0, maxCombo: 0, misses: 0, score: 0, clock: TIME_LIMIT,
      phase: 'ready', readyT: 0.8, betweenT: 0, stopT: 0, won: false, culprits: [],
      demo: false, smithPose: 0, lastTick: 99,
    };
  }

  function initGame() {
    w = freshWorld();
    buildBoard(roundBoard(0), true);
  }

  // ── 音 ─────────────────────────────────────────────
  function chime(hz) {
    game.audio.tone(hz, 0.55, { wave: 'triangle', volume: 0.2 });
    game.audio.tone(hz * 2.01, 0.28, { wave: 'sine', volume: 0.05 });
  }

  // ── ロジック(本番とデモで共通) ──────────────────────
  function bellAt(x, y) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < w.bells.length; i++) {
      var b = w.bells[i];
      var d = Math.hypot(b.x - x, b.y - 40 - y);
      if (d < 105 && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function tryLift(i) {
    if (w.phase !== 'run' || w.lock > 0 || i < 0) return false;
    var b = w.bells[i];
    if (b.open || b.matched) return false;
    b.open = true; b.ring = 0.7;
    w.smithPose = 0.25;
    chime(b.hz);
    if (w.first < 0) { w.first = i; w.lock = 0.1; return true; }
    var j = w.first; w.first = -1;
    if (w.bells[j].hz === b.hz) { w.verdict = { t: 0.32, ok: true, a: j, b: i }; w.lock = 0.34; }
    else { w.verdict = { t: 0.55, ok: false, a: j, b: i }; w.lock = 0.6; }
    return true;
  }

  function roundDone() {
    for (var i = 0; i < w.bells.length; i++) if (!w.bells[i].matched) return false;
    return true;
  }

  function resolveVerdict() {
    var v = w.verdict; w.verdict = null;
    var a = w.bells[v.a], b = w.bells[v.b];
    if (v.ok) {
      a.matched = b.matched = true; a.hl = b.hl = 0.4;
      w.cords.push([v.a, v.b]);
      w.pairs++; w.combo++;
      if (w.combo > w.maxCombo) w.maxCombo = w.combo;
      var mult = Math.min(3, w.combo);
      w.score += 100 * mult + w.round * 50;
      game.feedback.good(b.x, b.y - 150, { text: mult > 1 ? 'x' + mult : 'GOOD', color: STYLE.accent[0], size: 50 });
      if (w.combo === 3) game.audio.play('se_powerup', 0.4);
      if (roundDone()) startBetween();
    } else {
      a.open = b.open = false;
      w.combo = 0; w.misses++;
      game.feedback.bad(b.x, b.y - 150, { text: 'MISS', size: 44, shake: 4 });
    }
  }

  function startBetween() {
    if (w.demo) { game.fx.popup('CLEAR', W / 2, H * 0.42, { color: STYLE.accent[0], size: 60 }); return; }
    if (w.round >= ROUNDS.length - 1) {
      w.phase = 'stop'; w.stopT = 0.6; w.won = true;
      game.fx.burst(W / 2, H * 0.55, { color: STYLE.accent[0], count: 30, speed: 520 });
      game.fx.flash('#fff2cc', 0.15);
      return;
    }
    w.phase = 'between'; w.betweenT = 1.0;
    game.audio.play('se_milestone', 0.45);
    game.fx.popup((w.round + 1) + ' / ' + ROUNDS.length, W / 2, H * 0.4, { color: '#ffffff', size: 64 });
  }

  function advance(dt) {
    if (w.lock > 0) w.lock -= dt;
    if (w.smithPose > 0) w.smithPose -= dt;
    for (var i = 0; i < w.bells.length; i++) {
      var b = w.bells[i];
      var target = b.open || b.matched ? 1 : 0;
      b.lift += (target - b.lift) * Math.min(1, dt * 14);
      if (b.ring > 0) b.ring -= dt;
      if (b.hl > 0) b.hl -= dt;
      if (b.drop > 0) b.drop -= dt;
    }
    if (w.verdict) { w.verdict.t -= dt; if (w.verdict.t <= 0) resolveVerdict(); }
    if (w.phase === 'run' && !w.demo) {
      w.clock -= dt;
      var sec = Math.ceil(w.clock);
      if (w.clock < 4 && sec !== w.lastTick) { w.lastTick = sec; game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.05 }); }
      if (w.clock <= 0) {
        w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.culprits = [];
        for (var k = 0; k < w.bells.length; k++) if (!w.bells[k].matched) { w.culprits.push(k); w.bells[k].open = true; }
        game.fx.flash('#ffffff', 0.12);
        game.audio.play('se_break', 0.35);
      }
    }
  }

  function settle() {
    var stats = { pairs: w.pairs, total: NEEDED, misses: w.misses, maxCombo: w.maxCombo };
    if (w.won) {
      w.score += Math.round(w.clock * 40);
      game.feedback.good(W / 2, H * 0.45, { text: 'CLEAR', color: STYLE.accent[0], size: 70 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      var c = w.bells[w.culprits[0]] || { x: W / 2, y: H * 0.5 };
      game.feedback.bad(c.x, c.y - 150, { text: 'TIME UP', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.4, STYLE.bg[1]], [0.42, '#3a312a'], [1, STYLE.bg[0]]]);
    // 奥の棚と出荷待ちの鈴のシルエット(遠景)
    for (var s = 0; s < 2; s++) {
      var sy = H * 0.2 + s * 170;
      game.draw.rect(60, sy + 64, W - 120, 14, '#3a3029');
      for (var k = 0; k < 7; k++) {
        var bx = 140 + k * 133 + (s ? 60 : 0);
        if (bx > W - 100) continue;
        game.draw.line(bx, sy - 10, bx, sy + 4, '#3a3029', 3);
        game.draw.sprite(BELL, PAL_FAR, bx, sy + 30, 5 + s, { anchor: 'center', alpha: 0.8 });
      }
    }
    // 吊りランプとブルーム
    var lx = W / 2, ly = H * 0.16;
    game.draw.line(lx, 0, lx, ly - 20, '#1e1915', 4);
    game.draw.rect(lx - 50, ly - 26, 100, 22, '#2a221c');
    var pulse = 0.5 + 0.5 * Math.sin(t * 1.7);
    game.draw.circle(lx, ly, 260, '#ffd9a0', 0.05 + 0.02 * pulse);
    game.draw.circle(lx, ly, 150, '#ffd9a0', 0.08 + 0.03 * pulse);
    game.draw.circle(lx, ly, 60, '#fff0d0', 0.35);
    // 粒状ノイズ
    for (var n = 0; n < 30; n++) game.draw.rect((n * 197 + Math.floor(t * 7) * 31) % W, (n * 83) % H, 2, 2, '#ffffff', 0.04);
  }

  function drawBench() {
    // 作業台(奥行きのある天板)
    game.draw.rect(0, H * 0.4, W, H * 0.36, '#5a4634');
    for (var g = 0; g < 9; g++) game.draw.rect(0, H * 0.42 + g * 70, W, 3, '#4a3828', 0.8);
    game.draw.rect(0, H * 0.76, W, 30, '#3a2c20');
    // フェルトの弧(横1pxストリップで塗る)
    var rxo = ARC_RX + 110, ryo = ARC_RY + 110, rxi = ARC_RX - 110, ryi = ARC_RY - 110;
    for (var y = ARC_CY - ryo; y < H * 0.7; y += 6) {
      var dy = y - ARC_CY;
      var xo = rxo * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ryo * ryo)));
      var xi = Math.abs(dy) < ryi ? rxi * Math.sqrt(1 - (dy * dy) / (ryi * ryi)) : 0;
      var col = Math.floor(y / 6) % 2 ? FELT : FELT_D;
      game.draw.rect(ARC_CX - xo, y, xo - xi, 6, col);
      game.draw.rect(ARC_CX + xi, y, xo - xi, 6, col);
    }
  }

  function shadow(x, y, rx, ry, a) {
    for (var k = -3; k <= 3; k++) {
      var f = Math.sqrt(1 - (k * k) / 16);
      game.draw.rect(x - rx * f, y + k * ry / 4, rx * 2 * f, ry / 4 + 1, '#000000', a);
    }
  }

  function drawWave(b) {
    var amp = 26 * Math.max(0, b.ring / 0.7);
    if (amp <= 0.5) return;
    var cycles = b.hz / 88;
    var by = b.y - 205, t = game.time.elapsed;
    var px = b.x - 80, py = by;
    for (var k = 1; k <= 28; k++) {
      var f = k / 28;
      var x = b.x - 80 + f * 160;
      var y = by + Math.sin(f * cycles * Math.PI * 2 + t * 24) * amp;
      game.draw.line(px, py, x, y, '#fff0c8', 4);
      px = x; py = y;
    }
    game.draw.circle(b.x, b.y - 60, 90 + (0.7 - b.ring) * 120, '#fff0c8', 0.12 * (b.ring / 0.7));
  }

  function drawBells() {
    var t = game.time.elapsed;
    // 組の紐(先に描く)
    for (var c = 0; c < w.cords.length; c++) {
      var a = w.bells[w.cords[c][0]], b = w.bells[w.cords[c][1]];
      var sag = 0;
      game.draw.line(a.x, a.y - 135, (a.x + b.x) / 2, Math.min(a.y, b.y) - 70 + sag, CORD, 6);
      game.draw.line((a.x + b.x) / 2, Math.min(a.y, b.y) - 70, b.x, b.y - 135, CORD, 6);
    }
    for (var i = 0; i < w.bells.length; i++) {
      var bl = w.bells[i];
      var hot = w.phase === 'stop' && w.culprits.indexOf(i) >= 0;
      var dropOff = bl.drop > 0 ? -bl.drop * 900 : 0;
      var lift = bl.lift * 70;
      var sway = bl.ring > 0 ? Math.sin(t * 30) * 8 * (bl.ring / 0.7) : 0;
      var idle = !bl.open && !bl.matched ? Math.sin(t * 3 + i) * 3 : 0;
      var x = bl.x + sway, y = bl.y - lift + dropOff + idle;
      shadow(bl.x, bl.y + 50, 70 - lift * 0.3, 18, 0.12);
      if (!bl.open && !bl.matched && w.phase === 'run') {
        var blink = 0.1 + 0.08 * Math.sin(t * 5 + i * 0.7);
        game.draw.circle(x, y - 10, 86, '#ffffff', blink);
      }
      if (bl.matched) game.draw.circle(x, y - 20, 95, STYLE.accent[0], 0.12 + (bl.hl > 0 ? 0.25 : 0));
      var pal = hot ? PAL_WHITE : bl.matched ? PAL_GOLD : bl.ring > 0 ? PAL_RING : PAL_BELL;
      var px = hot ? 14 : 11;
      game.draw.sprite(bl.open || bl.matched ? BELL_OPEN : BELL, pal, x, y - 10, px, { anchor: 'center' });
      drawWave({ x: x, y: y, hz: bl.hz, ring: bl.ring });
    }
  }

  function drawSmith() {
    var t = game.time.elapsed;
    var x = W / 2, y = H * 0.85 + Math.sin(t * 2.4) * 6;
    var art;
    if (MODE === 'RESULT' && !w.won) art = SMITH_SAD;
    else if (w.smithPose > 0 || (w.phase === 'stop' && w.won)) art = SMITH_UP;
    else art = Math.floor(t * 1.5) % 4 === 3 ? SMITH_B : SMITH_A;
    var hop = w.phase === 'stop' && w.won ? Math.abs(Math.sin(t * 10)) * 30 : 0;
    shadow(x, H * 0.85 + 104, 80, 20, 0.14);
    game.draw.sprite(art, PAL_SMITH, x, y - hop, 13, { anchor: 'center' });
    // 調律用の音叉(机上の小物)
    game.draw.line(W * 0.22, H * 0.9, W * 0.22, H * 0.84, '#9a9088', 6);
    game.draw.line(W * 0.2, H * 0.84, W * 0.2, H * 0.8, '#b8aea4', 5);
    game.draw.line(W * 0.24, H * 0.84, W * 0.24, H * 0.8, '#b8aea4', 5);
    game.draw.line(W * 0.2, H * 0.84, W * 0.24, H * 0.84, '#b8aea4', 5);
    // 台の進み(3枚の札)
    for (var r = 0; r < ROUNDS.length; r++) {
      var on = r < w.round || (r === w.round && (w.phase === 'between' || (w.phase === 'stop' && w.won)));
      var cur = r === w.round;
      game.draw.rect(W * 0.7 + r * 70, H * 0.86, 52, 64, on ? STYLE.accent[0] : '#3a2f26');
      if (cur && !on) game.draw.rect(W * 0.7 + r * 70, H * 0.86 + 58, 52, 6, '#ffffff', 0.5 + 0.5 * Math.sin(t * 6));
    }
  }

  function vignette() {
    game.draw.rect(0, 0, 70, H, '#000000', 0.3);
    game.draw.rect(W - 70, 0, 70, H, '#000000', 0.3);
    game.draw.rect(0, 0, W, 60, '#000000', 0.25);
    game.draw.rect(0, H - 60, W, 60, '#000000', 0.3);
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawRoom();
    drawBench();
    drawBells();
    drawSmith();
    vignette();
  }

  function drawHud() {
    label('SCORE ' + w.score, W * 0.3, 80, 40, '#ffffff');
    label(w.pairs + ' / ' + NEEDED, W * 0.75, 80, 44, STYLE.accent[0]);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    var warn = w.clock < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(80, 128, W - 160, 20, INK, 0.7);
    game.draw.rect(80, 128, (W - 160) * frac, 20, warn ? '#ff5a48' : STYLE.accent[1]);
    for (var i = 0; i < NEEDED; i++) {
      var ix = W / 2 - (NEEDED - 1) * 30 + i * 60;
      game.draw.sprite(BELL, i < w.pairs ? PAL_GOLD : PAL_BELL, ix, 192, 3, { anchor: 'center', alpha: i < w.pairs ? 1 : 0.35 });
    }
    if (w.combo >= 2) label('x' + Math.min(3, w.combo), W * 0.9, 192, 34, STYLE.accent[0]);
  }

  // ── ATTRACT(実ロジック + ゴースト) ─────────────────
  var DEMO_BOARD = [262, 392, 392, 262];
  var DEMO_STEPS = [[0.5, 0], [1.1, 1], [2.0, 3], [2.6, 0], [3.3, 1], [3.9, 2]];
  var DEMO_CYCLE = 5.4;
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: 0, k: 0 };
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      w = freshWorld(); w.demo = true; w.phase = 'run';
      buildBoard(DEMO_BOARD, false);
      demo.k = 0;
    }
    if (demo.press > 0) demo.press -= dt;
    var step = DEMO_STEPS[demo.k];
    var tx = W / 2, ty = H * 0.9;
    if (step) { tx = w.bells[step[1]].x; ty = w.bells[step[1]].y - 30; }
    var k = Math.min(1, dt * 7);
    demo.gx += (tx - demo.gx) * k; demo.gy += (ty - demo.gy) * k;
    if (step && cyc >= step[0]) { tryLift(step[1]); demo.press = 0.22; demo.k++; }
    advance(dt);
  }

  function begin() {
    initGame();
    MODE = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function (x, y) {
    if (MODE === 'ATTRACT') { begin(); return; }
    if (MODE === 'RESULT') { MODE = 'ATTRACT'; initGame(); demo.t = 0; game.audio.play('se_tap', 0.3); return; }
    var i = bellAt(x, y);
    if (!tryLift(i)) {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: STYLE.main[2], count: 3, speed: 90 });
    }
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      label(TITLE, W / 2, 96, 72, STYLE.accent[0]);
      label('HI-SCORE ' + game.best, W / 2, 175, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 40, STYLE.accent[0]);
      else label('INSERT COIN', W / 2, H * 0.965, 34, '#ffffff');
      return;
    }
    if (MODE === 'RESULT') {
      advance(dt);
      drawStage();
      game.draw.rect(0, H * 0.27, W, H * 0.22, INK, 0.75);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 86, w.won ? STYLE.accent[0] : '#ff6a58');
      label('SCORE ' + w.score, W / 2, H * 0.38, 50, '#ffffff');
      label(w.pairs + ' / ' + NEEDED + '   COMBO ' + w.maxCombo, W / 2, H * 0.425, 36, STYLE.accent[1]);
      if (!w.won) label('あと' + (NEEDED - w.pairs) + '組!', W / 2, H * 0.465, 44, STYLE.accent[0]);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.465, 46, STYLE.accent[0]);
      else label('BEST ' + game.best, W / 2, H * 0.465, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 34, '#ffffff');
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
      advance(dt);
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'between') {
      advance(dt);
      w.betweenT -= dt;
      if (w.betweenT <= 0) { w.round++; buildBoard(roundBoard(w.round), true); w.phase = 'run'; }
    } else if (w.phase === 'stop') {
      advance(dt);
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    drawHud();
    if (w.phase === 'ready') label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, STYLE.accent[0]);
  });

  game.onStart(function () {
    // 作業場の柱時計のような低い刻み(鈴の音域と重ならないよう低音だけで鳴らす)
    game.audio.melody([['C3', 1], ['R', 0.5], ['G2', 0.5], ['A2', 1], ['R', 0.5], ['E2', 0.5], ['F2', 1], ['G2', 1], ['C3', 2]], {
      tempo: 96, wave: 'sine', volume: 0.04, loop: true, bass: [['C2', 4], ['F2', 2], ['G2', 2]], bassVolume: 0.03,
    });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);

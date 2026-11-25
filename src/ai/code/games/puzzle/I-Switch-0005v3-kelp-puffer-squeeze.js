// I-Switch-0005v3-kelp-puffer-squeeze.js
// 海藻の森のフグくぐり — 迫ってくる岩と岩の隙間の大きさに体のふくらみを合わせ、ぴったりの大きさでくぐり抜ける
// 操作: 押している間フグがふくらむ(速い)。離すとしぼむ(ゆっくり)。隙間より大きいと岩のトゲに当たる。小さすぎると隙間の渦に巻かれてMISS。点線の輪が「ちょうどの大きさ」。しぼむのが遅いので、大→小の続く所は早めに離す
// 終わり: 12の隙間を抜け終えた時、ぴったり(GOOD以上)が8つ以上ならCLEAR。岩に3回当たる/8つに届かない/20秒でGAME OVER
// @mechanic: gap_fit
// @theme: kelp_puffer_squeeze
// 世界観: 夜の海藻の森で、まだ若いフグが体をふくらませたりしぼませたりして、垂れ下がる岩と海底の岩のあいだの大きさの違う隙間をぴったりの体でくぐり、森の奥の寝床へ帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + ぴったり数・PERFECT数・当たった数のスコア
// スタイル: 80s NEON

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 80s NEON: 濃紺〜黒のグラデ + シアン/マゼンタ/イエロー/白、同色を重ねた疑似グロー、点滅
  var STYLE = { bg: ['#02041a', '#081646', '#0a2a50'], main: ['#00eaff', '#ff3ad0', '#fff03a'], accent: ['#ff8a00', '#ffffff'] };
  var DEEP = '#01020c';

  var GAPS = [150, 72, 125, 62, 160, 95, 56, 145, 78, 165, 58, 132];
  var NEED = 8, HITS = 3, TIME_LIMIT = 20;
  var PX = W * 0.3, CY = H * 0.46, TOP = H * 0.13, FLOOR = H * 0.76;
  var R_MIN = 40, R_MAX = 175, PUFF = 280, SHRINK = 140, ROCK_W = 130;

  var scene = 'ATTRACT';
  var f = null;

  var SLIM_A = [
    '............',
    '....yyyy....',
    '..yyyyyyyy.t',
    '.yyewyyyyytt',
    'yyyyyyyyyytt',
    '.yywwwwwyytt',
    '..yyyyyyyy.t',
    '....yyyy....',
  ];
  var SLIM_B = [
    '............',
    '....yyyy....',
    '..yyyyyyyy..',
    '.yyewyyyyy.t',
    'yyyyyyyyyytt',
    '.yywwwwwyy.t',
    '..yyyyyyyy..',
    '....yyyy....',
  ];
  var BALL_A = [
    '..s..s..s...',
    's.yyyyyyy.s.',
    '.yyyyyyyyyy.',
    'syyewyyyyyys',
    '.yyyyyyyyyyt',
    'syymmyyyyyyt',
    '.ywwwwwwwwy.',
    's.wwwwwwww.s',
    '..s..s..s...',
  ];
  var BALL_B = [
    '.s..s..s..s.',
    '..yyyyyyyy..',
    'syyyyyyyyyys',
    '.yyewyyyyyy.',
    'syyyyyyyyyyt',
    '.yymmyyyyyy.',
    'sywwwwwwwwys',
    '..wwwwwwww..',
    '.s..s..s..s.',
  ];
  var FISH_PAL = { y: STYLE.main[2], e: DEEP, w: '#fff8d0', t: STYLE.accent[0], s: STYLE.accent[0], m: '#ff6a6a' };
  var FISH_WHITE = { y: '#ffffff', e: '#ffffff', w: '#ffffff', t: '#ffffff', s: '#ffffff', m: '#ffffff' };

  function freshSwim() {
    var gates = [], at = 1.2;
    for (var i = 0; i < GAPS.length; i++) {
      var spd = 430 + i * 20;
      gates.push({ g: GAPS[i], spd: spd, spawn: at - (W + ROCK_W - PX) / spd, x: W + ROCK_W, live: false, done: false, res: null, hitNow: false, hl: 0 });
      at += Math.max(0.9, 1.6 - i * 0.065);
    }
    return {
      phase: 'ready', readyT: 0.8, clock: TIME_LIMIT, t: 0,
      r: R_MIN, puffing: false, gates: gates, cleared: 0,
      fits: 0, perfects: 0, hits: 0, chain: 0, score: 0, closest: 999,
      spin: 0, stopT: 0, pauseT: 0, won: false, culprit: null, prevBest: 0, partyT: 0,
    };
  }

  function nextGate() {
    for (var i = 0; i < f.gates.length; i++) if (!f.gates[i].done) return f.gates[i];
    return null;
  }

  function rockHit(gt) {
    f.hits++; f.chain = 0;
    gt.res = 'hit'; gt.hitNow = true; gt.hl = 0.5;
    game.audio.play('se_break', 0.35);
    if (f.hits >= HITS) { f.phase = 'stop'; f.stopT = 0.5; f.won = false; f.culprit = gt; game.fx.flash('#ffffff', 0.14); return; }
    f.pauseT = 0.32; f.culprit = gt;
    game.fx.flash('#ffffff', 0.1);
  }

  function judge(gt) {
    var ratio = f.r / gt.g;
    if (ratio >= 0.9) {
      f.fits++; f.perfects++; f.chain++;
      gt.res = 'perfect';
      var m = f.chain >= 3 ? 2 : 1;
      f.score += 300 * m;
      game.feedback.good(PX, CY - f.r - 40, { text: 'PERFECT', color: STYLE.main[2], size: 52 });
      if (m > 1) game.fx.popup('x2', PX + 140, CY - f.r - 60, { color: STYLE.main[1], size: 44 });
    } else if (ratio >= 0.74) {
      f.fits++; f.chain = 0;
      gt.res = 'good';
      f.score += 120;
      game.feedback.good(PX, CY - f.r - 40, { text: 'GOOD', color: STYLE.main[0], size: 46 });
    } else {
      f.chain = 0;
      gt.res = 'loose';
      f.spin = 0.6;
      f.closest = Math.min(f.closest, Math.round((0.74 - ratio) * 100));
      game.feedback.bad(PX, CY, { text: 'MISS', size: 44 });
      game.fx.popup('あと' + Math.max(1, Math.round((0.74 - ratio) * 100)) + '%', PX + 120, CY - 140, { color: STYLE.accent[1], size: 34 });
    }
    if (f.fits === 5 && gt.res !== 'loose') { game.fx.popup('5 / ' + NEED, W / 2, H * 0.2, { color: STYLE.main[0], size: 60 }); game.audio.play('se_milestone', 0.45); }
  }

  function advance(dt) {
    f.t += dt;
    f.clock -= dt;
    if (f.puffing) f.r = Math.min(R_MAX, f.r + PUFF * dt); else f.r = Math.max(R_MIN, f.r - SHRINK * dt);
    if (f.spin > 0) f.spin -= dt;
    for (var i = 0; i < f.gates.length; i++) {
      var gt = f.gates[i];
      if (gt.hl > 0) gt.hl -= dt;
      if (gt.done && gt.x < -ROCK_W * 2) continue;
      if (!gt.live && f.t >= gt.spawn) { gt.live = true; game.audio.tone(gt.g > 110 ? 196 : 392, 0.06, { wave: 'square', volume: 0.04 }); }
      if (!gt.live) continue;
      gt.x = W + ROCK_W - gt.spd * (f.t - gt.spawn);
      if (gt.done) continue;
      var dx = gt.x - PX;
      if (!gt.hitNow && Math.abs(dx) < ROCK_W * 0.5 + f.r * 0.5 && f.r > gt.g) { rockHit(gt); if (f.phase !== 'run') return; if (f.pauseT > 0) { f.r = Math.min(f.r, gt.g * 0.9); } }
      if (dx <= 0 && gt.res === null) judge(gt);
      if (dx < -ROCK_W * 0.5 - 20) { gt.done = true; f.cleared++; }
    }
    if (f.cleared >= f.gates.length) {
      f.phase = 'stop'; f.stopT = 0.55; f.won = f.fits >= NEED;
      if (!f.won) { f.culprit = null; game.fx.flash('#ffffff', 0.12); }
      return;
    }
    if (f.clock <= 0) { f.clock = 0; f.phase = 'stop'; f.stopT = 0.5; f.won = false; f.culprit = nextGate(); game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    f.prevBest = game.best;
    var stats = { fits: f.fits, need: NEED, perfect: f.perfects, hits: f.hits, gates: f.gates.length };
    if (f.won) {
      f.score += (HITS - f.hits) * 150;
      game.feedback.good(PX, CY - 120, { text: 'CLEAR', color: STYLE.main[2], size: 72 });
      game.audio.play('se_success', 0.6);
      game.end.success(f.score, stats);
    } else {
      game.feedback.bad(f.culprit ? Math.max(120, f.culprit.x) : PX, CY, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    scene = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawSea() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠景の海藻(ゆらぐネオンの線)
    for (var k = 0; k < 9; k++) {
      var kx = ((k * 140 - t * 40) % (W + 140) + W + 140) % (W + 140) - 70;
      var prevX = kx, prevY = FLOOR;
      for (var s = 1; s <= 8; s++) {
        var yy = FLOOR - s * 110;
        var xx = kx + Math.sin(t * 1.5 + k + s * 0.6) * 22;
        game.draw.line(prevX, prevY, xx, yy, k % 2 ? '#0a5a4a' : '#0a4a5a', 10);
        prevX = xx; prevY = yy;
      }
    }
    // 泡
    for (var b2 = 0; b2 < 14; b2++) {
      var bx = (b2 * 83) % W, by = H - ((t * 90 + b2 * 151) % H);
      game.draw.circle(bx + Math.sin(t * 2 + b2) * 8, by, 5 + (b2 % 3) * 2, STYLE.main[0], 0.25);
    }
    game.draw.rect(0, FLOOR, W, H - FLOOR, '#06102a');
    game.draw.line(0, FLOOR, W, FLOOR, STYLE.main[0], 3);
  }

  function rockColumn(x, y0, y1, hl) {
    if (y1 <= y0) return;
    var col = hl ? '#ffffff' : '#1a2a5a';
    game.draw.rect(x - ROCK_W / 2, y0, ROCK_W, y1 - y0, col);
    game.draw.rect(x - ROCK_W / 2, y0, 8, y1 - y0, hl ? '#ffffff' : STYLE.main[1], 0.6);
    game.draw.rect(x + ROCK_W / 2 - 8, y0, 8, y1 - y0, hl ? '#ffffff' : STYLE.main[1], 0.6);
  }

  function drawGates(hlStop) {
    var t = game.time.elapsed;
    for (var i = 0; i < f.gates.length; i++) {
      var gt = f.gates[i];
      if (!gt.live || gt.x < -ROCK_W || gt.x > W + ROCK_W * 1.5) continue;
      var white = gt.hl > 0 || (hlStop && f.culprit === gt);
      var topEnd = CY - gt.g, botStart = CY + gt.g;
      rockColumn(gt.x, TOP, topEnd, white);
      rockColumn(gt.x, botStart, FLOOR, white);
      // トゲ(危険の記号)
      for (var s = -2; s <= 2; s++) {
        var sx = gt.x + s * 26;
        game.draw.line(sx, topEnd, sx + 6, topEnd + 22, white ? '#ffffff' : '#ff3a5a', 6);
        game.draw.line(sx, botStart, sx + 6, botStart - 22, white ? '#ffffff' : '#ff3a5a', 6);
      }
      // 渦(小さすぎると巻かれる)
      var sw = t * 6 + i;
      for (var q = 0; q < 3; q++) {
        var a = sw + q * 2.1;
        game.draw.circle(gt.x + Math.cos(a) * gt.g * 0.55, CY + Math.sin(a) * gt.g * 0.55, 6, STYLE.main[0], 0.35);
      }
      // ちょうどの大きさ(点線の輪)
      if (gt.res === null) {
        var ring = gt.g * 0.92;
        var n = 18;
        for (var d = 0; d < n; d++) {
          var an = (d / n) * Math.PI * 2 + t * 0.8;
          game.draw.circle(gt.x + Math.cos(an) * ring, CY + Math.sin(an) * ring, 5, STYLE.main[2], 0.85);
        }
      }
    }
  }

  function drawPuffer(hl) {
    var t = game.time.elapsed;
    var round = f.r >= 72;
    var frames = round ? [BALL_A, BALL_B] : [SLIM_A, SLIM_B];
    var art = frames[Math.floor(t * 6) % 2];
    var cols = 12, px = (f.r * 2.1) / cols;
    if (hl) px *= 1.3;
    var wob = f.spin > 0 ? Math.sin(t * 40) * 26 : 0;
    game.draw.circle(PX, CY, f.r + 26, STYLE.main[2], 0.08);
    game.draw.circle(PX, CY, f.r + 10, STYLE.main[2], 0.12);
    var dead = scene === 'RESULT' && !f.won;
    game.draw.sprite(art, hl ? FISH_WHITE : FISH_PAL, PX + wob * 0.3, CY + wob, px, { anchor: 'center', flipY: dead || (f.spin > 0 && Math.floor(t * 12) % 2 === 0) });
  }

  function drawPad() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.8, W, H * 0.2, DEEP, 0.7);
    // サイズ計: 今の大きさと次の隙間のちょうど帯
    var gx = 120, gw = W - 240, gy = H * 0.84;
    game.draw.rect(gx, gy, gw, 26, '#14204a');
    var nx = nextGate();
    if (nx) {
      var a0 = (nx.g * 0.74 - R_MIN) / (R_MAX - R_MIN), a1 = (nx.g - R_MIN) / (R_MAX - R_MIN);
      game.draw.rect(gx + gw * Math.max(0, a0), gy, gw * Math.max(0, a1 - a0), 26, STYLE.main[0], 0.55);
      game.draw.rect(gx + gw * Math.min(1, a1), gy - 6, 6, 38, '#ff3a5a');
    }
    var cur = (f.r - R_MIN) / (R_MAX - R_MIN);
    game.draw.rect(gx + gw * cur - 5, gy - 14, 10, 54, STYLE.main[2]);
    // ふくらましボタン
    var pr = f.puffing ? 1 : 0;
    game.draw.circle(W / 2, H * 0.925, 84 + pr * 10, STYLE.main[1], 0.25 + 0.1 * Math.sin(t * 5) + pr * 0.3);
    game.draw.circle(W / 2, H * 0.925, 46 + pr * 22, STYLE.main[2], 0.55);
  }

  function neon(s, x, y, size, color) {
    game.draw.text(s, x, y + 3, { size: size, color: color, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: '#ffffff', bold: true, align: 'center' });
  }

  function drawHud() {
    neon(f.fits + ' / ' + NEED, 150, 80, 50, STYLE.main[0]);
    neon('SCORE ' + f.score, W - 250, 80, 36, STYLE.main[1]);
    game.draw.rect(80, 136, W - 160, 12, '#14204a');
    var fr = Math.max(0, f.clock / TIME_LIMIT);
    game.draw.rect(80, 136, (W - 160) * fr, 12, fr < 0.25 ? '#ff3a5a' : STYLE.main[0]);
    for (var i = 0; i < f.gates.length; i++) {
      var x = W / 2 - (f.gates.length - 1) * 33 + i * 66, y = 188;
      var r = f.gates[i].res;
      var col = r === 'perfect' ? STYLE.main[2] : r === 'good' ? STYLE.main[0] : r === 'hit' ? '#ff3a5a' : r === 'loose' ? '#3a4a6a' : '#1a2a5a';
      game.draw.circle(x, y, 20, col);
    }
    for (var h = 0; h < HITS; h++) game.draw.circle(W - 60, 260 + h * 50, 16, h < HITS - f.hits ? STYLE.main[0] : '#3a1a2a', 0.8);
  }

  function drawWorld(hl) {
    drawSea();
    drawGates(hl);
    drawPuffer(hl && f.won);
    drawPad();
  }

  // ── ATTRACT(実ロジック+ボット) ───────────────────────
  var demo = { t: 0, hold: false };
  function botHold(greedy) {
    var nx = nextGate();
    if (!nx || !nx.live) return f.r < 60;
    var want = nx.g * (greedy ? 1.15 : 0.95);
    var eta = (nx.x - PX) / nx.spd;
    if (f.r > want) return false;
    if (eta > (want - f.r) / PUFF + 0.15 && f.r > want - 30) return false;
    return f.r < want - 4;
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { f = freshSwim(); f.phase = 'run'; }
    if (f.phase === 'run') {
      if (f.pauseT > 0) {
        f.pauseT -= dt;
        if (f.pauseT <= 0) game.feedback.bad(PX, CY, { text: 'MISS', size: 48 });
        return;
      }
      demo.hold = botHold(f.cleared === 2);
      f.puffing = demo.hold;
      advance(dt);
    } else if (f.phase === 'stop') f.stopT -= dt;
  }

  function begin() {
    f = freshSwim();
    scene = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function () {
    if (scene === 'ATTRACT') { begin(); return; }
    if (scene === 'RESULT') { game.audio.play('se_tap', 0.3); scene = 'ATTRACT'; f = freshSwim(); demo.t = 0; return; }
  });
  game.onPress(function () {
    if (scene !== 'PLAYING' || !f || f.phase !== 'run') return;
    game.audio.tone(260, 0.1, { wave: 'triangle', volume: 0.05, slide: 220 });
  });
  game.onRelease(function () {
    if (scene !== 'PLAYING' || !f || f.phase !== 'run') return;
    game.audio.tone(330, 0.12, { wave: 'triangle', volume: 0.04, slide: -160 });
  });

  game.onUpdate(function (dt) {
    if (!f) f = freshSwim();
    if (scene === 'ATTRACT') {
      runDemo(dt);
      drawWorld(false);
      game.draw.hand(W / 2, H * 0.925, { press: demo.hold, scale: 14 });
      neon('PUFF SQUEEZE', W / 2, H * 0.05 + 20, 80, STYLE.main[1]);
      neon('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 26, 34, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) neon('► 100円 投入 ◄', W / 2, H * 0.78, 42, STYLE.main[1]);
      else neon('INSERT COIN', W / 2, H * 0.78, 36, STYLE.main[0]);
      return;
    }
    if (scene === 'RESULT') {
      f.puffing = false;
      drawWorld(false);
      if (f.won) {
        f.partyT -= dt;
        if (f.partyT <= 0) { f.partyT = 0.35; game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.6), { color: [STYLE.main[0], STYLE.main[1], STYLE.main[2]][Math.floor(Math.random() * 3)], count: 18, speed: 420 }); }
      }
      game.draw.rect(0, H * 0.28, W, H * 0.32, DEEP, 0.8);
      neon(f.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 86, f.won ? STYLE.main[2] : STYLE.main[1]);
      neon('SCORE ' + f.score, W / 2, H * 0.405, 52, STYLE.main[0]);
      neon('PERFECT ' + f.perfects + '    ' + f.fits + ' / ' + NEED, W / 2, H * 0.455, 38, STYLE.main[2]);
      if (!f.won) {
        neon('あと' + Math.max(1, NEED - f.fits) + '個!', W / 2, H * 0.51, 46, STYLE.main[2]);
        if (f.closest < 999) neon('あと' + Math.max(1, f.closest) + '%', W / 2, H * 0.56, 34, STYLE.main[0]);
      } else if (f.score > f.prevBest) neon('NEW RECORD', W / 2, H * 0.51, 48, STYLE.main[2]);
      else neon('BEST ' + f.prevBest, W / 2, H * 0.51, 40, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) neon('TAP TO CONTINUE', W / 2, H * 0.78, 36, STYLE.main[0]);
      return;
    }
    f.puffing = game.input.pressing && f.phase === 'run' && f.pauseT <= 0;
    if (f.phase === 'ready') {
      f.readyT -= dt;
      if (f.readyT <= 0) { f.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (f.phase === 'run') {
      if (f.pauseT > 0) {
        f.pauseT -= dt;
        if (f.pauseT <= 0) game.feedback.bad(PX, CY, { text: 'MISS', size: 48 });
      } else advance(dt);
    } else if (f.phase === 'stop') {
      f.stopT -= dt;
      if (f.stopT <= 0) settle();
    }
    drawWorld(f.phase === 'stop' || f.pauseT > 0);
    drawHud();
    if (f.phase === 'ready') neon(f.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, STYLE.main[2]);
    if (f.phase === 'run' && f.t < 1.4) {
      var nx = nextGate();
      if (nx && f.r < nx.g * 0.74) game.draw.hand(W / 2, H * 0.925, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['A4', 2],
    ], {
      tempo: 100, wave: 'square', volume: 0.05, loop: true,
      bass: [['E2', 2], ['C3', 2], ['D3', 2], ['A2', 2]],
    });
    scene = 'ATTRACT';
    f = freshSwim();
    demo.t = 0;
  });
})(game);

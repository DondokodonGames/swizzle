// K-GBA-0011v2-signshop-model-stroke.js
// 看板屋の手本なぞり — 親方の小太鼓の三拍子に合わせて伸びていく手本の線を、拍と同じ速さで筆先でなぞり切る
// 操作: 下書きの点線が出た小節のうちに始点へ指(筆)を置いて待つ。次の小節の頭から手本の線が1拍に1区間ずつ伸びるので、指を離さず同じ速さでなぞる。節目を拍の頭ちょうどに通るとPERFECT、少しずれるとGOOD。先走り・遅れ・線からはみ出し・指を離すとMISSでその線は失敗
// 終わり: 4本(3区間×2本・6区間×2本)を通し終えて MISS 2回以内ならCLEAR(PERFECT/GOODの点+完走ボーナス)。MISS 3回でGAME OVER
// @mechanic: trace
// @theme: sign_painter_model_stroke
// 世界観: 古い看板屋の作業場で、親方が小太鼓で刻む三拍子に合わせ、見習いの看板書きが板に浮かぶ手本の筆線(文字ではない抽象の線形)を一息でなぞり写す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・なぞり終えた本数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り。半透明円の重ねでブルーム、四辺を暗くするビネット、コントラストは潰す
  var STYLE = { bg: ['#1a1510', '#2c241a', '#463a2c'], main: ['#b08a5a', '#8c7860', '#d6c4a0'], accent: ['#ffdca0', '#c0503c'] };
  var C = {
    deep: STYLE.bg[0], wall: STYLE.bg[1], wall2: STYLE.bg[2],
    wood: STYLE.main[0], dusk: STYLE.main[1], pale: STYLE.main[2],
    glow: STYLE.accent[0], red: STYLE.accent[1],
    ink: '#0c0a07', paint: '#24180f', plank: '#6a5238', plank2: '#584430',
    guideLine: '#c0503c70', dot: '#d6c4a0',
  };

  var GAME_TITLE = 'MODEL STROKE';
  var BPM = 132;
  var SPB = 60 / BPM;           // 1拍の秒数
  var BAR = 3;                  // 三拍子(ワルツ)
  var PERFECT_W = 0.08;         // 拍の頭からのずれ(秒)
  var GOOD_W = 0.18;
  var TOL = 80;                 // 線からのはみ出し許容(px)
  var MISS_MAX = 3;
  var TIME_LIMIT = 14;

  // 手本の線(抽象の筆線)。1区間 = 1拍。3区間 = 1小節
  var STROKES = [
    [[230, 760], [440, 700], [650, 780], [860, 720]],
    [[300, 620], [420, 820], [600, 960], [820, 1000]],
    [[200, 1040], [310, 840], [420, 1040], [540, 840], [660, 1040], [770, 840], [880, 1040]],
    [[240, 620], [460, 620], [680, 620], [840, 780], [680, 940], [460, 940], [300, 1060]],
  ];
  // 小節割り: 下書き1小節 → なぞり(区間数ぶんの拍)。最後の節目が次の下書きの1拍目に重なる
  var PLAN = [];
  (function() {
    var b = 0;
    for (var i = 0; i < STROKES.length; i++) {
      var n = STROKES[i].length - 1;
      PLAN.push({ pre: b, start: b + BAR, end: b + BAR + n, n: n, pts: STROKES[i] });
      b += BAR + n;
    }
  })();
  var TOTAL_BEATS = PLAN[PLAN.length - 1].end;

  // 親方の三拍子(オリジナル)。8小節 = 24拍で1周
  var WALTZ = [
    ['A4', 2], ['C5', 1], ['E5', 1.5], ['D5', 0.5], ['C5', 1], ['B4', 2], ['G4', 1], ['A4', 2], ['R', 1],
    ['C5', 2], ['E5', 1], ['G5', 1.5], ['F5', 0.5], ['E5', 1], ['D5', 1], ['B4', 1], ['G4', 1], ['A4', 3],
  ];
  var WALTZ_BASS = [
    ['A2', 1], ['E3', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['E3', 1], ['G2', 1], ['D3', 1], ['D3', 1], ['A2', 1], ['E3', 1], ['E3', 1],
    ['C3', 1], ['G3', 1], ['G3', 1], ['C3', 1], ['G3', 1], ['G3', 1], ['G2', 1], ['D3', 1], ['D3', 1], ['A2', 1], ['E3', 1], ['E3', 1],
  ];
  function startSong() {
    game.audio.melody(WALTZ, { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: WALTZ_BASS, bassVolume: 0.06 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, blot, ss, brush;
  var score, combo, maxCombo, perfects, goods, misses, strokesDone, over, won, outroT, prevBest, milestone, drumHit, lastScratch;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; blot = null;
    ss = [];
    for (var i = 0; i < PLAN.length; i++) ss.push({ phase: 'wait', prog: 0, next: 1, started: false, marks: [], failX: 0, failY: 0 });
    brush = { down: false, x: W / 2, y: H * 0.5 };
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; strokesDone = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; drumHit = 0; lastScratch = 0;
    if (isDemo) { startClock(); startSong(); }
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    onBeat(0);
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    var pos = b % BAR;
    var vol = demoMode ? 0.5 : 1;
    drumHit = 0.16;
    if (pos === 0) game.audio.tone(110, 0.16, { wave: 'sine', volume: 0.22 * vol });
    else game.audio.tone(1320, 0.03, { wave: 'square', volume: 0.035 * vol });
    for (var i = 0; i < PLAN.length; i++) {
      // 下書き最後の拍: 次の小節頭から手本が伸びる予告音
      if (b === PLAN[i].pre + BAR - 1) game.audio.tone('E6', 0.07, { wave: 'triangle', volume: 0.07 * vol });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    for (var i = 0; i < PLAN.length; i++) {
      var p = PLAN[i], s = ss[i];
      if (s.phase === 'wait' && beatN >= p.pre) s.phase = 'pre';
      if (s.phase === 'pre' && songT >= p.start * SPB) s.phase = 'trace';
      if (s.phase === 'trace') traceStep(i);
    }
    if (!demoMode && !over) {
      var all = true;
      for (var j = 0; j < PLAN.length; j++) if (ss[j].phase !== 'done' && ss[j].phase !== 'fail') all = false;
      if (all) finish(misses < MISS_MAX);
    }
  }

  function pointAt(pts, prog) {
    var n = pts.length - 1;
    var p = Math.max(0, Math.min(n, prog));
    var i = Math.min(n - 1, Math.floor(p));
    var u = p - i;
    return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u };
  }

  // 筆先を線へ投影(今の区間の前後だけを見る)
  function project(pts, prog, x, y) {
    var n = pts.length - 1;
    var base = Math.floor(prog);
    var best = { d: 1e9, prog: prog };
    for (var i = Math.max(0, base - 1); i <= Math.min(n - 1, base + 1); i++) {
      var ax = pts[i][0], ay = pts[i][1], vx = pts[i + 1][0] - ax, vy = pts[i + 1][1] - ay;
      var l2 = vx * vx + vy * vy;
      var u = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
      var d = Math.hypot(x - (ax + vx * u), y - (ay + vy * u));
      if (d < best.d) best = { d: d, prog: i + u };
    }
    return best;
  }

  function traceStep(i) {
    var p = PLAN[i], s = ss[i], pts = p.pts;
    var t0 = p.start * SPB;
    if (!s.started) {
      if (brush.down && Math.hypot(brush.x - pts[0][0], brush.y - pts[0][1]) < TOL * 1.3) {
        s.started = true; s.prog = 0;
      } else if (songT > t0 + GOOD_W) {
        failStroke(i, pts[0][0], pts[0][1]); return;
      } else return;
    }
    if (hitStop > 0) return;
    if (!brush.down) { var q = pointAt(pts, s.prog); failStroke(i, q.x, q.y); return; }
    var pr = project(pts, s.prog, brush.x, brush.y);
    if (pr.d > TOL) { failStroke(i, brush.x, brush.y); return; }
    if (pr.prog > s.prog) s.prog = pr.prog;
    // 節目を通った瞬間を、その節目の拍の頭と比べる
    while (s.next <= p.n && s.prog >= s.next - 0.06) {
      var off = songT - (p.start + s.next) * SPB;
      if (!judgeKnot(i, s.next, off)) return;
      s.next++;
    }
    if (s.next <= p.n && songT > (p.start + s.next) * SPB + GOOD_W) {
      var q2 = pointAt(pts, s.prog); failStroke(i, q2.x, q2.y); return;
    }
    if (s.next > p.n) completeStroke(i);
  }

  function judgeKnot(i, kIdx, off) {
    var pt = PLAN[i].pts[kIdx];
    var a = Math.abs(off);
    var s = ss[i];
    if (a <= PERFECT_W) {
      s.marks[kIdx] = 2; perfects++; combo++;
      score += 100 + Math.min(combo, 10) * 10;
      game.feedback.good(pt[0], pt[1] - 70, { text: 'PERFECT', color: C.glow, size: 46, count: 10, volume: 0.25 });
    } else if (a <= GOOD_W) {
      s.marks[kIdx] = 1; goods++; combo++;
      score += 50;
      game.feedback.good(pt[0], pt[1] - 70, { text: 'GOOD', color: C.pale, size: 40, count: 6, volume: 0.2 });
    } else {
      failStroke(i, pt[0], pt[1]);
      return false;
    }
    if (combo > maxCombo) maxCombo = combo;
    return true;
  }

  function failStroke(i, x, y) {
    var s = ss[i];
    if (s.phase !== 'trace') return;
    s.phase = 'fail'; s.failX = x; s.failY = y;
    combo = 0; misses++;
    hitStop = 0.42; blot = { x: x, y: y, t: 0.42 };
    game.feedback.bad(x, y - 60, { text: 'MISS', shake: demoMode ? 4 : 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function completeStroke(i) {
    var s = ss[i];
    s.phase = 'done'; strokesDone++;
    var e = PLAN[i].pts[PLAN[i].n];
    var clean = true;
    for (var k = 1; k <= PLAN[i].n; k++) if (s.marks[k] !== 2) clean = false;
    score += clean ? 300 : 150;
    game.fx.burst(e[0], e[1], { color: C.glow, count: 18, speed: 380 });
    if (!demoMode && strokesDone === 2 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('2 / ' + PLAN.length, W / 2, H * 0.26, { color: C.glow, size: 72 });
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += strokesDone * 100 + maxCombo * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(600, 1100), { color: i % 2 ? C.glow : C.wood, count: 20, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    brush.down = true; brush.x = x; brush.y = y;
    var near = false;
    for (var i = 0; i < PLAN.length; i++) {
      if ((ss[i].phase === 'pre' || ss[i].phase === 'trace') && Math.hypot(x - PLAN[i].pts[0][0], y - PLAN[i].pts[0][1]) < TOL * 1.3) near = true;
    }
    if (near) { game.audio.play('se_tap', 0.3); game.fx.burst(x, y, { color: C.pale, count: 6, speed: 160 }); }
    else game.audio.tone(170, 0.05, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !brush.down) return;
    brush.x = x; brush.y = y;
    if (game.time.elapsed - lastScratch > 0.09) { lastScratch = game.time.elapsed; game.audio.tone(2400, 0.015, { wave: 'triangle', volume: 0.01 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    brush.down = false;
    if (!over) game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function bloom(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2.2, col, a * 0.12);
    game.draw.circle(x, y, r * 1.6, col, a * 0.2);
    game.draw.circle(x, y, r * 1.2, col, a * 0.35);
    game.draw.circle(x, y, r, col, a);
  }
  function vignette() {
    game.draw.rect(0, 0, W, 80, C.ink, 0.35); game.draw.rect(0, H - 80, W, 80, C.ink, 0.4);
    game.draw.rect(0, 0, 54, H, C.ink, 0.3); game.draw.rect(W - 54, 0, 54, H, C.ink, 0.3);
  }

  function drawPath(pts, to, col, width, joint, a) {
    var n = pts.length - 1;
    var end = Math.max(0, Math.min(n, to));
    for (var i = 0; i < n && i < end; i++) {
      var a0 = pointAt(pts, i), a1 = pointAt(pts, Math.min(end, i + 1));
      game.draw.line(a0.x, a0.y, a1.x, a1.y, col, width);
      game.draw.circle(a0.x, a0.y, width / 2, joint, a);
      game.draw.circle(a1.x, a1.y, width / 2, joint, a);
    }
  }

  // 親方(小太鼓)と見習い(筆)
  var MASTER = [
    ['....wwww....', '...hhhhhh...', '...hfffff...', '...ffefef.s.', '....ffff..s.', '..kkkkkk.s..', '.kkkkkkkks..', '.kk.kkkk....', '....kkkk....', '...kk..kk...', '..kkk..kkk..'],
    ['....wwww....', '...hhhhhh...', '...hfffff...', '...ffefef...', '....ffff....', '..kkkkkk....', '.kkkkkkkkss.', '.kk.kkkk..s.', '....kkkk....', '...kk..kk...', '..kkk..kkk..'],
  ];
  var MPAL = { w: '#d6c4a0', h: '#3a3028', f: '#c8a888', e: '#1a1208', k: '#4a4238', s: '#b08a5a' };
  var PAINTER = [
    ['...hhhh....', '..hhhhhh...', '..hffff....', '..fefef....', '...fff.....', '..aaaaa.b..', '.aaaaaa.b..', '.a.aaaa.p..', '...aaaa....', '...a..a....', '..aa..aa...'],
    ['...hhhh....', '..hhhhhh...', '..hffff....', '..fefef....', '...fff.....', '..aaaaabb..', '.aaaaaa..bp', '.a.aaaa....', '...aaaa....', '...a..a....', '..aa..aa...'],
  ];
  var PPAL = { h: '#2a2018', f: '#d0b090', e: '#1a1208', a: '#8c7860', b: '#b08a5a', p: '#24180f' };

  function drawWorkshop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.deep], [0.45, C.wall], [1, C.wall2]]);
    // 吊りランプ(ブルーム)
    var lx = W * 0.2, ly = 330 + Math.sin(t * 1.3) * 6;
    game.draw.line(lx, 230, lx, ly - 30, C.dusk, 3);
    bloom(lx, ly, 34, C.glow, 0.55 + 0.08 * Math.sin(t * 2.2));
    // 棚と絵の具壺
    for (var r = 0; r < 2; r++) {
      var sy = 300 + r * 110;
      game.draw.rect(W * 0.46, sy, 470, 12, C.plank2);
      for (var k = 0; k < 5; k++) {
        var px = W * 0.46 + 50 + k * 92;
        var cols = [C.red, C.wood, C.pale, C.dusk, C.glow];
        game.draw.circle(px, sy - 30, 30, C.ink, 0.5);
        game.draw.circle(px, sy - 32, 26, cols[(k + r) % 5], 0.75);
      }
    }
    // 看板の板
    var x0 = 110, y0 = 540, bw = W - 220, bh = 640;
    game.draw.rect(x0 - 16, y0 - 16, bw + 32, bh + 32, C.ink, 0.55);
    for (var p = 0; p < 8; p++) game.draw.rect(x0, y0 + p * 80, bw, 80, p % 2 ? C.plank : C.plank2);
    for (var g = 0; g < 8; g++) game.draw.line(x0, y0 + g * 80 + 40, x0 + bw, y0 + g * 80 + 36 + Math.sin(g * 1.7) * 8, '#4a382680', 2);
    game.draw.circle(W * 0.2, y0 + 40, 90, C.glow, 0.05);
    // 床
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.deep, 0.55);
    for (var f = 0; f < 6; f++) game.draw.rect(0, H * 0.7 + f * 96, W, 3, C.wall2, 0.5);
  }

  function drawOneStroke(i, a) {
    var p = PLAN[i], s = ss[i], pts = p.pts, n = p.n;
    var t = game.time.elapsed;
    // 下書きの点線
    for (var q = 0; q <= n * 10; q++) { var d = pointAt(pts, q / 10); game.draw.circle(d.x, d.y, 5, C.dot, 0.32 * a); }
    // 手本の線(拍と同じ速さで伸びる)
    if (s.phase !== 'pre' && s.phase !== 'wait') {
      var guide = Math.max(0, Math.min(n, (songT - p.start * SPB) / SPB));
      drawPath(pts, guide, C.guideLine, 40, C.red, 0.0);
      if (s.phase === 'trace') { var gh = pointAt(pts, guide); bloom(gh.x, gh.y, 15, C.red, 0.85 * a); }
    }
    // 節目(拍の位置)
    for (var k = 0; k <= n; k++) {
      var mk = s.marks[k];
      var col = mk === 2 ? C.glow : (mk === 1 ? C.pale : C.dusk);
      game.draw.circle(pts[k][0], pts[k][1], mk ? 17 : 10, col, (mk ? 0.95 : 0.6) * a);
    }
    // 始点の脈動(下書き中)。最後の拍で点滅して予告
    if (s.phase === 'pre') {
      var into = (songT - p.pre * SPB) / SPB;
      var pulse = 1 - (into % 1);
      var flash = into >= BAR - 1 && Math.floor(t * 12) % 2 === 0;
      bloom(pts[0][0], pts[0][1], 24 + pulse * 18, flash ? C.glow : C.red, 0.85);
      game.draw.circle(pts[n][0], pts[n][1], 22, C.pale, 0.25);
    }
    // 自分の筆跡
    drawPath(pts, s.prog, C.paint, 26, C.paint, a);
    if (s.started && s.phase === 'trace') { var tip = pointAt(pts, s.prog); game.draw.circle(tip.x, tip.y, 16, C.paint, a); }
    // 失敗した線の墨だまり
    if (s.phase === 'fail') {
      game.draw.circle(s.failX, s.failY, 34, C.paint, 0.8 * a);
      game.draw.circle(s.failX + 26, s.failY + 18, 14, C.paint, 0.7 * a);
    }
  }

  function drawStrokes() {
    var cur = -1;
    for (var i = 0; i < PLAN.length; i++) if (ss[i].phase !== 'wait') cur = i;
    if (cur < 0) return;
    if (cur > 0) {
      var keep = ss[cur - 1].phase === 'trace' ? 1 : 1 - Math.min(1, (songT - PLAN[cur].pre * SPB) / (BAR * SPB));
      if (keep > 0) drawOneStroke(cur - 1, keep);
    }
    drawOneStroke(cur, 1);
  }

  function drawBlot() {
    if (!blot || blot.t <= 0) return;
    var k = blot.t / 0.42;
    game.draw.circle(blot.x, blot.y, 50 + (1 - k) * 120, '#ffffff', 0.5 * k);
    game.draw.circle(blot.x, blot.y, 30 + (1 - k) * 40, '#ffffff', 0.9 * k);
    game.draw.circle(blot.x, blot.y, 26 + (1 - k) * 22, C.paint, 1);
  }

  function drawCrew() {
    var t = game.time.elapsed;
    var hit = drumHit > 0;
    var my = H * 0.8 + Math.sin(t * 2) * 3;
    // 小太鼓
    game.draw.circle(330, H * 0.83 + 40, 70, C.ink, 0.4);
    game.draw.rect(270, H * 0.83 - 10, 120, 70, '#6a3020');
    game.draw.circle(330, H * 0.83 - 10, 60, hit ? C.glow : C.pale, hit ? 0.9 : 0.7);
    if (hit) bloom(330, H * 0.83 - 10, 30, C.glow, 0.5);
    game.draw.sprite(MASTER[hit ? 1 : 0], MPAL, 190, my, 13, { anchor: 'center' });
    // 見習い(指を置いている間は筆を下ろす)
    var down = brush && brush.down;
    var py = H * 0.8 + Math.sin(t * 2.6 + 1) * 4;
    game.draw.circle(880, H * 0.8 + 90, 70, C.ink, 0.4);
    game.draw.sprite(PAINTER[down ? 1 : 0], PPAL, 880, py, 13, { anchor: 'center', flipX: true });
  }

  function drawBeatLamps() {
    var pos = beatN % BAR;
    for (var i = 0; i < BAR; i++) {
      var x = W / 2 - 120 + i * 120 + 40, y = H * 0.9, r = i === 0 ? 34 : 24;
      var lit = running && i === pos ? 1 - beatT / SPB : 0;
      game.draw.circle(x, y, r + 10, C.ink, 0.55);
      bloom(x, y, r, i === 0 ? C.red : C.wood, 0.3 + lit * 0.7);
    }
  }

  function drawScene() {
    drawWorkshop();
    drawStrokes();
    drawBlot();
    drawCrew();
    drawBeatLamps();
    vignette();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.82);
    label('SCORE ' + score, 70, 96, 54, C.pale, 'left');
    label('BEST ' + prevBest, 70, 172, 32, C.dusk, 'left');
    label(strokesDone + ' / ' + PLAN.length, W - 70, 96, 56, C.glow, 'right');
    for (var i = 0; i < MISS_MAX; i++) bloom(W - 230 + i * 70, 168, 17, i < misses ? C.red : C.dusk, 0.9);
    var progress = Math.min(1, songT / (TOTAL_BEATS * SPB));
    game.draw.rect(0, 222, W, 8, '#000000');
    game.draw.rect(0, 222, W * progress, 8, C.wood);
  }

  // ---- ATTRACT: 実ロジックで1本目はPERFECT、2本目は途中ではみ出してMISS、3本目を通しきる ----
  var demo = { t: 0, press: false };
  var DEMO_LEN = PLAN[2].end * SPB + 0.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); }
    // なぞり中の線を優先(最後の節目の判定待ちで次の下書きと重なるため)
    var cur = -1;
    for (var i = 0; i < PLAN.length; i++) if (ss[i].phase !== 'wait') cur = i;
    for (var j = PLAN.length - 1; j >= 0; j--) if (ss[j].phase === 'trace') cur = j;
    if (cur >= 0) {
      var p = PLAN[cur], s = ss[cur];
      if (s.phase === 'pre') {
        brush.down = songT - p.pre * SPB > SPB * 1.5;
        brush.x = p.pts[0][0]; brush.y = p.pts[0][1];
      } else if (s.phase === 'trace') {
        var g = Math.max(0, (songT + dt - p.start * SPB) / SPB - 0.02);
        var q = pointAt(p.pts, g);
        brush.down = true; brush.x = q.x; brush.y = q.y;
        if (cur === 1 && g > 1.45) brush.y = q.y + 160 * Math.min(1, (g - 1.45) * 4);
      } else {
        brush.down = false;
      }
    }
    demo.press = brush.down;
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (drumHit > 0) drumHit -= dt;
    if (hitStop > 0) hitStop -= dt;
    if (blot && blot.t > 0) blot.t -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      var hx = brush.down ? brush.x : brush.x + 40 + Math.sin(t * 3) * 10;
      var hy = brush.down ? brush.y : brush.y + 60 + Math.cos(t * 3) * 10;
      game.draw.hand(hx, hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.82);
      label(GAME_TITLE, W / 2, 110, 80 + Math.sin(t * 3) * 3, C.glow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.pale);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.67, 52, C.glow);
      else label('TAP TO START', W / 2, H * 0.67, 46, C.pale);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.3, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.glow : C.red);
      label('SCORE ' + score, W / 2, H * 0.39, 56, C.pale);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.435, 36, C.wood);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.49, 50, C.glow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.49, 38, C.pale);
      if (!won) label('あと' + Math.max(1, PLAN.length - strokesDone) + '本!', W / 2, H * 0.25, 56, C.glow);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.55, 36, C.pale);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, strokes: strokesDone, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { startClock(); startSong(); }
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT + 1) finish(misses < MISS_MAX);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.glow);
    if (over && won) label('FINISH', W / 2, H * 0.45, 100, C.glow);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

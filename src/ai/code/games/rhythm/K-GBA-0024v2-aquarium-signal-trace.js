// K-GBA-0024v2-aquarium-signal-trace.js
// 大水槽の合図なぞり — 先輩が拍ごとに描いた手振りの光跡を、次の小節で同じ拍の速さで指でなぞり返す。途中で4拍子から3拍子へ切り替わる
// 操作: 先輩の小節では光の点が拍ごとに1区間ずつ進んで型を描く(見るだけ)。光跡が残っているうちに始点へ指を置き、次の小節の頭から指を離さず、各節目を拍の頭ちょうどに通るようになぞる(なぞる間は動く手本が出ない)。節目を拍の頭で通るとPERFECT、少しずれるとGOOD、先走り・遅れはその節目がMISS。線から大きく外れる・指を離すとその型は打ち切りでMISS。後半は合図音と拍ランプ(4つ→3つ)の予告の後、3拍子の型(6つの節目)に変わる
// 終わり: 3つの型(4拍子×2・3拍子×1)を通し終えてMISS 2回以内ならCLEAR(PERFECT/GOODの点+完走ボーナス)。MISS 3回でGAME OVER
// @mechanic: trace
// @theme: aquarium_signal_trace
// 世界観: 夜の水族館の大水槽の前で、新人飼育員が先輩の合図の手振りの軌跡をなぞって覚える
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・なぞり終えた型の数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var STYLE = { bg: ['#000000', '#0c1c58'], main: ['#2878f8', '#3cbcfc', '#fcfcfc'], accent: ['#f87858', '#f8d878'] };
  // 8bit HOME: 黒 + 3〜4色、8pxグリッドの粗いドット、輪郭線なし、タイル反復の背景、1方向スクロール
  var C = {
    black: STYLE.bg[0], navy: STYLE.bg[1], blue: STYLE.main[0], cyan: STYLE.main[1], white: STYLE.main[2],
    coral: STYLE.accent[0], sand: STYLE.accent[1], brick: '#1c2c78', teal: '#008888', deep: '#001860', green: '#00a800',
  };

  var GAME_TITLE = 'SIGNAL TRACE';
  var BPM = 120;
  var SPB = 60 / BPM;            // 1拍 0.5秒
  var SWITCH_BEAT = 16;          // ここから3拍子(メドレーの切り替え)
  var END_BEAT = 28;
  var TIME_LIMIT = 14;           // 28拍 × 0.5秒
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var TOL = 95;                  // 線からのはみ出し許容(px)
  var MISS_MAX = 3;

  // 型: call=先輩が描き始める拍 / resp=自分がなぞり始める拍。節目 k は call+k / resp+k の拍の頭
  var FIGS = [
    { call: 0, resp: 4, pts: [[336, 640], [744, 640], [744, 1000], [336, 1000]] },
    { call: 8, resp: 12, pts: [[296, 704], [616, 560], [464, 920], [800, 1080]] },
    { call: 16, resp: 22, pts: [[248, 904], [416, 680], [640, 680], [824, 880], [640, 1080], [416, 1080]] },
  ];

  // 4拍子の口笛(16拍)と、切り替え後の3拍子(12拍)。どちらもオリジナル
  var TUNE_A = [['C5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['D5', 2],
                ['C5', 1], ['E5', 0.5], ['G5', 0.5], ['C6', 1], ['A5', 1], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 2]];
  var BASS_A = [['C3', 1], ['G3', 1], ['C3', 1], ['G3', 1], ['A2', 1], ['E3', 1], ['G2', 1], ['D3', 1],
                ['F2', 1], ['C3', 1], ['A2', 1], ['E3', 1], ['G2', 1], ['D3', 1], ['C3', 2]];
  var TUNE_B = [['E5', 2], ['G5', 1], ['A5', 1.5], ['G5', 0.5], ['E5', 1], ['D5', 2], ['E5', 1], ['C5', 3]];
  var BASS_B = [['A2', 1], ['E3', 1], ['E3', 1], ['F2', 1], ['C3', 1], ['C3', 1], ['G2', 1], ['D3', 1], ['D3', 1], ['C3', 1], ['G3', 1], ['G3', 1]];
  function startSong(part, quiet) {
    var v = quiet ? 0.5 : 1;
    if (part === 0) game.audio.melody(TUNE_A, { tempo: BPM, wave: 'square', volume: 0.04 * v, loop: true, bass: BASS_A, bassWave: 'triangle', bassVolume: 0.08 * v });
    else game.audio.melody(TUNE_B, { tempo: BPM, wave: 'square', volume: 0.04 * v, loop: true, bass: BASS_B, bassWave: 'triangle', bassVolume: 0.08 * v });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, flash, brush, fs, knotFlash;
  var score, combo, maxCombo, perfects, goods, misses, figsDone, over, won, outroT, prevBest, milestone, schoolT, lastBubble;

  function meterAt(b) { return b < SWITCH_BEAT ? 4 : 3; }
  function posInBar(b) { return b < SWITCH_BEAT ? b % 4 : (b - SWITCH_BEAT) % 3; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flash = null; knotFlash = 0;
    brush = { down: false, x: W * 0.8, y: H * 0.8 };
    fs = [];
    for (var i = 0; i < FIGS.length; i++) fs.push({ phase: 'wait', started: false, prog: 0, next: 1, marks: [], fx: 0, fy: 0 });
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; figsDone = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; schoolT = -1; lastBubble = 0;
    if (isDemo) { startClock(); startSong(0, true); }
  }

  // ---- 拍クロック(1本だけ) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    onBeat(0);
  }

  function onBeat(b) {
    var v = demoMode ? 0.4 : 1;
    if (posInBar(b) === 0) {
      game.audio.tone(b < SWITCH_BEAT ? 'C3' : 'A2', 0.12, { wave: 'triangle', volume: 0.2 * v });
      game.audio.tone(880, 0.03, { wave: 'square', volume: 0.05 * v });
    } else {
      game.audio.tone(1568, 0.02, { wave: 'square', volume: 0.03 * v });
    }
    // 先輩の光が節目を打つ音(だんだん高く)
    for (var i = 0; i < FIGS.length; i++) {
      var k = b - FIGS[i].call;
      if (k >= 0 && k < FIGS[i].pts.length) {
        game.audio.tone(523 * Math.pow(2, k / 6), 0.08, { wave: 'square', volume: 0.08 * v });
        knotFlash = 0.25;
      }
    }
    // メドレー切り替えの予告(2拍前から音と画面で)
    if (b === SWITCH_BEAT - 2 || b === SWITCH_BEAT - 1) {
      game.audio.tone(b === SWITCH_BEAT - 2 ? 'E5' : 'G5', 0.12, { wave: 'triangle', volume: 0.12 * v, slide: 200 });
      if (schoolT < 0) schoolT = 0;
    }
    if (b === SWITCH_BEAT) {
      startSong(1, demoMode);
      game.audio.play('se_powerup', demoMode ? 0.15 : 0.4);
      game.fx.popup('3/4', W / 2, H * 0.24, { color: C.sand, size: 110 });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    for (var i = 0; i < FIGS.length; i++) {
      var F = FIGS[i], s = fs[i];
      if (s.phase === 'wait' && songT >= F.call * SPB) s.phase = 'call';
      if (s.phase === 'call' && songT >= F.resp * SPB) s.phase = 'resp';
      if (s.phase === 'resp') traceStep(i);
      if (over) return;
    }
    if (!demoMode && !over) {
      var all = true;
      for (var j = 0; j < fs.length; j++) if (fs[j].phase !== 'done' && fs[j].phase !== 'fail') all = false;
      if (all || songT >= TIME_LIMIT) finish(misses < MISS_MAX);
    }
  }

  function pointAt(pts, prog) {
    var n = pts.length - 1;
    var p = Math.max(0, Math.min(n, prog));
    var i = Math.min(n - 1, Math.floor(p)), u = p - i;
    return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u };
  }

  // 指先を、今いる区間とその前後の区間へ投影する
  function nearest(pts, prog, x, y) {
    var n = pts.length - 1, seg = Math.floor(prog), out = { d: 1e9, prog: prog };
    for (var i = Math.max(0, seg - 1); i <= Math.min(n - 1, seg + 1); i++) {
      var ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
      var u = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
      u = u < 0 ? 0 : (u > 1 ? 1 : u);
      var d = Math.hypot(x - ax - dx * u, y - ay - dy * u);
      if (d < out.d) { out.d = d; out.prog = i + u; }
    }
    return out;
  }

  function traceStep(i) {
    var F = FIGS[i], s = fs[i], n = F.pts.length - 1, t0 = F.resp * SPB;
    if (!s.started) {
      if (brush.down && Math.hypot(brush.x - F.pts[0][0], brush.y - F.pts[0][1]) < TOL * 1.2) {
        s.started = true; s.prog = 0; s.next = 1;
      } else if (songT > t0 + GOOD_W) { abort(i, F.pts[0][0], F.pts[0][1]); return; }
      else return;
    }
    if (!brush.down) { var q = pointAt(F.pts, s.prog); abort(i, q.x, q.y); return; }
    var pr = nearest(F.pts, s.prog, brush.x, brush.y);
    if (pr.d > TOL) { abort(i, brush.x, brush.y); return; }
    if (pr.prog > s.prog) s.prog = pr.prog;
    while (s.next <= n && s.prog >= s.next - 0.08) {
      judgeKnot(i, s.next, songT - (F.resp + s.next) * SPB);
      s.next++;
      if (over) return;
    }
    while (s.next <= n && songT > (F.resp + s.next) * SPB + GOOD_W) {
      knotMiss(i, s.next);
      s.next++;
      if (over) return;
    }
    if (s.next > n) complete(i);
  }

  function judgeKnot(i, k, off) {
    var p = FIGS[i].pts[k], a = Math.abs(off), s = fs[i];
    if (a <= PERFECT_W) {
      s.marks[k] = 2; perfects++; combo++;
      score += 100 + Math.min(combo, 10) * 10;
      game.feedback.good(p[0], p[1] - 80, { text: 'PERFECT', color: C.sand, size: 46, count: 10, volume: demoMode ? 0.12 : 0.25 });
    } else if (a <= GOOD_W) {
      s.marks[k] = 1; goods++; combo++;
      score += 50 + Math.min(combo, 10) * 5;
      game.feedback.good(p[0], p[1] - 80, { text: 'GOOD', color: C.cyan, size: 40, count: 6, volume: demoMode ? 0.1 : 0.2 });
    } else {
      knotMiss(i, k);
      return;
    }
    if (combo > maxCombo) maxCombo = combo;
  }

  function knotMiss(i, k) {
    var p = FIGS[i].pts[k];
    fs[i].marks[k] = -1;
    misses++; combo = 0;
    hitStop = 0.4; flash = { x: p[0], y: p[1], t: 0.4 };
    game.feedback.bad(p[0], p[1] - 80, { text: 'MISS', shake: demoMode ? 4 : 10, volume: demoMode ? 0.15 : 0.5 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function abort(i, x, y) {
    var s = fs[i];
    if (s.phase !== 'resp') return;
    s.phase = 'fail'; s.fx = x; s.fy = y;
    misses++; combo = 0;
    hitStop = 0.4; flash = { x: x, y: y, t: 0.4 };
    game.feedback.bad(x, y - 80, { text: 'MISS', shake: demoMode ? 4 : 10, volume: demoMode ? 0.15 : 0.5 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function complete(i) {
    var s = fs[i], F = FIGS[i];
    s.phase = 'done'; figsDone++;
    var clean = true;
    for (var k = 1; k < F.pts.length; k++) if (s.marks[k] !== 2) clean = false;
    score += clean ? 250 : 100;
    var e = F.pts[F.pts.length - 1];
    game.fx.burst(e[0], e[1], { color: C.cyan, count: 16, speed: 360 });
    if (!demoMode && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE!', W / 2, H * 0.3, { color: C.sand, size: 90 });
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += figsDone * 150 + maxCombo * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(500, 1100), { color: i % 2 ? C.sand : C.cyan, count: 20, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over) return;
    brush.down = true; brush.x = x; brush.y = y;
    var near = false;
    for (var i = 0; i < FIGS.length; i++) {
      if ((fs[i].phase === 'call' || (fs[i].phase === 'resp' && !fs[i].started)) && Math.hypot(x - FIGS[i].pts[0][0], y - FIGS[i].pts[0][1]) < TOL * 1.2) near = true;
    }
    if (near) { game.audio.play('se_tap', 0.3); game.fx.burst(x, y, { color: C.white, count: 6, speed: 150 }); }
    else game.audio.tone(196, 0.04, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !brush.down) return;
    brush.x = x; brush.y = y;
    if (game.time.elapsed - lastBubble > 0.1) { lastBubble = game.time.elapsed; game.audio.tone(1900 + (y % 300), 0.015, { wave: 'triangle', volume: 0.012 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    brush.down = false;
    if (!over) game.audio.tone(392, 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 8bit 描画 ----
  function snap(v) { return Math.round(v / 8) * 8; }
  function blk(x, y, s, col, a) { game.draw.rect(snap(x - s / 2), snap(y - s / 2), s, s, col, a); }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var TANK = { x: 64, y: 288, w: 952, h: 1008 };

  var FISH = [
    ['..bb....', '.bbbb..b', 'bwbbbbbb', 'bbbbbbbb', '.bbbb..b', '..bb....'],
    ['..bb....', '.bbbb...', 'bwbbbbbb', 'bbbbbbbb', '.bbbb...', '..bb....'],
  ];
  var FISH_PALS = [{ b: '#f87858', w: '#fcfcfc' }, { b: '#f8d878', w: '#000000' }, { b: '#3cbcfc', w: '#fcfcfc' }];
  var WEED = [['.g..', 'g...', '.g..', '..g.', '.g..', 'g...', '.g..', '..g.'], ['..g.', '.g..', 'g...', '.g..', '..g.', '.g..', 'g...', '.g..']];
  var RAY = [
    ['....cc....', '...cccc...', 'cccccccccc', '.cwccccwc.', '..cccccc..', '....cc....', '....c.....'],
    ['..........', 'c..cccc..c', 'cccccccccc', '.cwccccwc.', '..cccccc..', '....cc....', '.....c....'],
  ];
  var KEEPER = [
    ['...hhh..', '..hhhhh.', '..ffff..', '..fef...', '.uuuuuu.', 'uuuuuuuu', 'u.uuuu.u', 'f.uuuu.f', '..pppp..', '..p..p..', '..p..p..', '.kk..kk.'],
    ['l..hhh..', 'f.hhhhh.', 'u.ffff..', 'u.fef...', 'uuuuuuu.', '.uuuuuuu', '..uuuu.u', '..uuuu.f', '..pppp..', '..p..p..', '..p..p..', '.kk..kk.'],
  ];
  var SENPAI_PAL = { h: '#000000', f: '#f8b878', e: '#000000', u: '#2878f8', p: '#0c1c58', k: '#000000', l: '#f8d878' };
  var ROOKIE_PAL = { h: '#f87858', f: '#f8b878', e: '#000000', u: '#00a800', p: '#0c1c58', k: '#000000', l: '#fcfcfc' };

  function drawHall() {
    game.draw.gradient(0, H, [[0, C.black], [0.3, C.navy], [1, C.black]]);
    // 館内のレンガ壁(タイル反復)
    for (var r = 0; r < 44; r++) {
      var y = 232 + r * 40;
      if (y > H) break;
      for (var c = -1; c < 12; c++) {
        var x = c * 96 + (r % 2 ? 48 : 0);
        game.draw.rect(x, y, 88, 32, C.brick, 0.55);
      }
    }
    // 床(市松)
    for (var fy = 0; fy < 6; fy++) {
      for (var fx = 0; fx < 17; fx++) {
        if ((fx + fy) % 2 === 0) game.draw.rect(fx * 64, H * 0.78 + fy * 64, 64, 64, C.deep, 0.8);
      }
    }
  }

  function drawTank() {
    var t = game.time.elapsed;
    var part2 = running && beatN >= SWITCH_BEAT;
    game.draw.rect(TANK.x - 16, TANK.y - 16, TANK.w + 32, TANK.h + 32, C.blue);
    game.draw.rect(TANK.x, TANK.y, TANK.w, TANK.h, part2 ? C.teal : C.deep);
    game.draw.rect(TANK.x, TANK.y, TANK.w, 160, C.blue, 0.35);
    // 上へ流れる泡(タイル反復・1方向スクロール)
    var scroll = (t * 48) % 64;
    for (var by = 0; by < 16; by++) {
      for (var bx = 0; bx < 10; bx++) {
        if ((bx * 3 + by) % 4 !== 0) continue;
        var py = TANK.y + by * 64 - scroll + 64;
        if (py < TANK.y || py > TANK.y + TANK.h - 120) continue;
        game.draw.rect(TANK.x + 40 + bx * 96, snap(py), 8, 8, C.cyan, 0.35);
      }
    }
    // 砂と海藻
    for (var sx = 0; sx < 15; sx++) game.draw.rect(TANK.x + sx * 64, TANK.y + TANK.h - 64, 64, 64, sx % 2 ? C.sand : '#c8a858');
    var wf = Math.floor(t * 3) % 2;
    for (var w = 0; w < 5; w++) game.draw.sprite(WEED[(wf + w) % 2], { g: C.green }, TANK.x + 80 + w * 200, TANK.y + TANK.h - 128, 16, { anchor: 'center' });
    // 魚(左→右へ1方向)
    for (var f = 0; f < 3; f++) {
      var fxp = ((t * (90 + f * 40) + f * 380) % (TANK.w + 200)) + TANK.x - 100;
      if (fxp > TANK.x - 40 && fxp < TANK.x + TANK.w + 40) {
        game.draw.sprite(FISH[Math.floor(t * 5 + f) % 2], FISH_PALS[f], snap(fxp), snap(TANK.y + 120 + f * 300 + Math.sin(t + f) * 16), 12, { anchor: 'center' });
      }
    }
    // 切り替え予告: 小魚の群れが横切る
    if (schoolT >= 0 && schoolT < 2.2) {
      for (var m = 0; m < 9; m++) {
        var mx = TANK.x - 200 + schoolT * 700 + (m % 3) * 70;
        if (mx < TANK.x || mx > TANK.x + TANK.w) continue;
        game.draw.sprite(FISH[m % 2], FISH_PALS[1], snap(mx), snap(TANK.y + 80 + Math.floor(m / 3) * 56), 6, { anchor: 'center' });
      }
    }
    // ガラスの反射
    game.draw.rect(TANK.x + 24, TANK.y + 24, 16, TANK.h - 140, C.white, 0.12);
  }

  function drawFigure(i, alpha) {
    var F = FIGS[i], s = fs[i], pts = F.pts, n = pts.length - 1, t = game.time.elapsed;
    if (s.phase === 'wait') return;
    // 先輩の光跡: 呼びかけの小節では拍の速さで伸び、その後は点線で残る
    var lead = s.phase === 'call' ? Math.max(0, Math.min(n, (songT - F.call * SPB) / SPB)) : n;
    var dim = s.phase === 'call' ? 1 : 0.4;
    for (var q = 0; q <= lead * 12; q++) {
      var d = pointAt(pts, q / 12);
      blk(d.x, d.y, 16, C.sand, dim * alpha * (s.phase === 'call' ? 0.9 : 0.6));
    }
    if (s.phase === 'call') {
      var hp = pointAt(pts, lead);
      var sp = 16 + Math.floor(t * 16) % 2 * 8;
      blk(hp.x, hp.y, 40, C.white, alpha);
      blk(hp.x - sp - 8, hp.y, 16, C.sand, alpha); blk(hp.x + sp + 8, hp.y, 16, C.sand, alpha);
      blk(hp.x, hp.y - sp - 8, 16, C.sand, alpha); blk(hp.x, hp.y + sp + 8, 16, C.sand, alpha);
      // 最後の拍: 始点が点滅して「次はあなた」を予告
      if (songT > (F.resp - 1) * SPB && Math.floor(t * 10) % 2 === 0) blk(pts[0][0], pts[0][1], 72, C.coral, 0.8 * alpha);
    }
    // 節目
    for (var k = 0; k <= n; k++) {
      var mk = s.marks[k];
      var col = mk === 2 ? C.sand : (mk === 1 ? C.cyan : (mk === -1 ? C.coral : C.white));
      blk(pts[k][0], pts[k][1], mk ? 48 : 32, col, (mk ? 1 : 0.55) * alpha);
      if (!mk) blk(pts[k][0], pts[k][1], 16, C.deep, alpha);
    }
    // 始点(自分の番の直前・直後は大きく脈打つ)
    if (s.phase === 'resp' && !s.started) {
      var pulse = 56 + Math.floor((1 - beatT / SPB) * 3) * 8;
      blk(pts[0][0], pts[0][1], pulse, C.coral, 0.85);
    }
    // 自分のなぞり跡
    if (s.started || s.phase === 'done') {
      var upto = s.phase === 'done' ? n : s.prog;
      for (var r = 0; r <= upto * 12; r++) { var e = pointAt(pts, r / 12); blk(e.x, e.y, 24, C.white, alpha); }
      if (s.phase === 'resp') { var tip = pointAt(pts, s.prog); blk(tip.x, tip.y, 40, C.white, alpha); }
    }
    if (s.phase === 'fail') { blk(s.fx, s.fy, 56, C.coral, 0.8 * alpha); blk(s.fx, s.fy, 24, C.black, alpha); }
  }

  function drawFigures() {
    var cur = -1;
    for (var i = 0; i < FIGS.length; i++) if (fs[i].phase !== 'wait') cur = i;
    if (cur < 0) return;
    if (cur > 0) {
      var fade = 1 - Math.min(1, (songT - FIGS[cur].call * SPB) / (SPB * 2));
      if (fade > 0) drawFigure(cur - 1, fade);
    }
    drawFigure(cur, 1);
    // 型を描き切ったら光のエイが跡をなぞって泳ぐ
    for (var j = 0; j < FIGS.length; j++) {
      if (fs[j].phase !== 'done') continue;
      var since = songT - FIGS[j].resp * SPB - (FIGS[j].pts.length - 1) * SPB;
      if (since < 0 || since > 1.6) continue;
      var rp = pointAt(FIGS[j].pts, (since / 1.6) * (FIGS[j].pts.length - 1));
      game.draw.sprite(RAY[Math.floor(game.time.elapsed * 6) % 2], { c: C.cyan, w: C.white }, snap(rp.x), snap(rp.y), 10, { anchor: 'center' });
    }
  }

  function drawFlash() {
    if (!flash || flash.t <= 0) return;
    var k = flash.t / 0.4;
    blk(flash.x, flash.y, 64 + (1 - k) * 96, C.white, 0.8 * k);
    blk(flash.x, flash.y, 40, C.coral, 1);
  }

  function drawKeepers() {
    var t = game.time.elapsed;
    var callOn = false;
    for (var i = 0; i < FIGS.length; i++) if (fs[i].phase === 'call') callOn = true;
    var hop = running ? (posInBar(beatN) === 0 ? 1 : 0) * Math.max(0, 1 - beatT / (SPB * 0.5)) * 16 : 0;
    game.draw.sprite(KEEPER[callOn ? 1 : 0], SENPAI_PAL, 176, snap(H * 0.86 - hop), 18, { anchor: 'center' });
    var mine = brush.down;
    game.draw.sprite(KEEPER[mine ? 1 : 0], ROOKIE_PAL, W - 176, snap(H * 0.86 + Math.sin(t * 3) * 4), 18, { anchor: 'center', flipX: true });
    if (callOn) blk(176 - 50, H * 0.86 - 140, 24, C.sand, Math.floor(t * 8) % 2 ? 1 : 0.4);
  }

  function drawBeatLamps() {
    var cy = H * 0.74;
    var m = running ? meterAt(beatN) : 4, pos = running ? posInBar(beatN) : -1;
    game.draw.rect(0, cy - 60, W, 120, C.black, 0.7);
    for (var i = 0; i < m; i++) {
      var x = W / 2 + (i - (m - 1) / 2) * 150;
      var on = i === pos ? Math.max(0.35, 1 - beatT / (SPB * 0.8)) : 0.25;
      blk(x, cy, i === 0 ? 72 : 48, i === 0 ? C.coral : C.cyan, on);
    }
    // 切り替え2拍前から、3つのランプが重なって点滅する
    if (running && beatN >= SWITCH_BEAT - 3 && beatN < SWITCH_BEAT && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      for (var j = 0; j < 3; j++) blk(W / 2 + (j - 1) * 150, cy - 88, 32, C.sand, 0.9);
    }
  }

  function scanlines() { for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, C.black, 0.12); }

  function drawScene() {
    drawHall();
    drawTank();
    drawFigures();
    drawFlash();
    drawBeatLamps();
    drawKeepers();
    scanlines();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black);
    label('SCORE ' + score, 56, 96, 52, C.white, 'left');
    label('BEST ' + prevBest, 56, 172, 32, C.cyan, 'left');
    label(figsDone + ' / ' + FIGS.length, W - 56, 96, 56, C.sand, 'right');
    var warn = running && beatN >= SWITCH_BEAT - 3 && beatN < SWITCH_BEAT && Math.floor(game.time.elapsed * 8) % 2 === 0;
    label((running && beatN >= SWITCH_BEAT) || warn ? '3/4' : '4/4', W / 2, 120, 64, warn ? C.coral : C.white);
    for (var i = 0; i < MISS_MAX; i++) blk(W - 290 + i * 64, 168, 40, i < misses ? C.coral : C.navy, 1);
    var progress = Math.min(1, songT / TIME_LIMIT);
    game.draw.rect(0, 222, W, 8, C.navy);
    game.draw.rect(0, 222, snap(W * progress), 8, C.cyan);
  }

  // ---- ATTRACT: 実ロジックで1つ目をPERFECT、2つ目は途中で遅れてMISS、3拍子の型まで通す ----
  var demo = { t: 0, press: false };
  var DEMO_LEN = END_BEAT * SPB + 0.8;
  function demoProg(i, g) {
    if (i !== 1 || g < 1.4) return g;
    if (g < 2.5) return 1.4 + (g - 1.4) * 0.5;
    return Math.min(3, 1.95 + (g - 2.5) * 2.1);
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); }
    var cur = -1;
    for (var i = 0; i < FIGS.length; i++) if (fs[i].phase === 'call' || fs[i].phase === 'resp') cur = i;
    for (var j = FIGS.length - 1; j >= 0; j--) if (fs[j].phase === 'resp') cur = j;
    if (cur >= 0) {
      var F = FIGS[cur], s = fs[cur];
      if (s.phase === 'call') {
        brush.down = songT - F.call * SPB > SPB * 1.5;
        brush.x += (F.pts[0][0] - brush.x) * Math.min(1, dt * 8);
        brush.y += (F.pts[0][1] - brush.y) * Math.min(1, dt * 8);
        if (brush.down) { brush.x = F.pts[0][0]; brush.y = F.pts[0][1]; }
      } else {
        var g = Math.max(0, (songT + dt - F.resp * SPB) / SPB - 0.02);
        var q = pointAt(F.pts, demoProg(cur, g));
        brush.down = true; brush.x = q.x; brush.y = q.y;
      }
    } else {
      brush.down = false;
    }
    demo.press = brush.down;
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flash && flash.t > 0) flash.t -= dt;
    if (knotFlash > 0) knotFlash -= dt;
    if (schoolT >= 0) schoolT += dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      var hx = brush.down ? brush.x : brush.x + 40 + Math.sin(t * 3) * 10;
      var hy = brush.down ? brush.y : brush.y + 70 + Math.cos(t * 3) * 10;
      game.draw.hand(hx, hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.black);
      label(GAME_TITLE, W / 2, 112, 84 + Math.floor(t * 2) % 2 * 4, C.sand);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 194, 36, C.cyan);
      game.draw.rect(0, H * 0.645, W, 96, C.black, 0.75);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.645 + 68, 52, C.sand);
      else label('TAP TO START', W / 2, H * 0.645 + 66, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.25, W, H * 0.34, C.black, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.sand : C.coral);
      label('SCORE ' + score, W / 2, H * 0.38, 56, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.425, 36, C.cyan);
      label('COMBO ' + maxCombo + '   ' + figsDone + ' / ' + FIGS.length, W / 2, H * 0.465, 36, C.sand);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.515, 52, C.sand);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.515, 40, C.white);
      if (!won) label('あと' + Math.max(1, FIGS.length - figsDone) + '本!', W / 2, H * 0.22, 60, C.sand);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.57, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, figures: figsDone, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { startClock(); startSong(0, false); }
    } else {
      stepPlay(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 120, C.sand);
    if (over && won) label('FINISH', W / 2, H * 0.44, 110, C.sand);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

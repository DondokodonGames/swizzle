// K-DS-0017v2-snowfield-rabbit-hop.js
// 雪穴うさぎ — 見回りのかんじきの足音と灯りが拍を刻む間はじっと潜み、足音も伴奏も途切れた無音の拍の頭だけで次の雪穴へ跳ぶ
// 操作: 見回りが歩く拍(ザクッという足音・灯りの点滅・伴奏)の間は画面に触らない。足音が途切れる1拍前に見回りが立ち止まって踏みしめる(重い足音+頭上に休みの印)。次の無音の拍の頭で画面のどこかを押すと、うさぎが次の雪穴へ跳ぶ(拍の頭からのずれでPERFECT/GOOD)。足音の拍に触る・無音の拍に早すぎる/遅すぎる・無音の拍を見送るとMISS。後半は無音が2拍続くので2回跳ぶ
// 終わり: 7小節(約14秒・無音の拍8回)を終えて MISS 2回以内ならCLEAR(判定の点+巣穴に帰ったボーナス)。MISS 3回(見つかる)でGAME OVER
// @mechanic: freeze
// @theme: snowfield_burrow_rabbit_hop
// 世界観: 夕暮れの雪原で、雪穴に潜んだ白ウサギが見回りの足音の拍を数え、足音が途切れた無音の一拍だけ跳び出して雪穴から雪穴へ巣穴まで渡っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・渡れた雪穴の数
// スタイル: 90s 16bit
var STYLE = { bg: ['#16214f', '#4d3f86', '#d98aa6'], main: ['#f4f8ff', '#9fc4e8', '#3d5a8a'], accent: ['#ffcf4a', '#ff6a5a'] };

(function(game) {
  // 90s 16bit: 空グラデ+遠景の山+中景の針葉樹+近景の雪原の3層。暗色輪郭+ハイライトのスプライト
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], sky2: STYLE.bg[2],
    snow: STYLE.main[0], ice: STYLE.main[1], navy: STYLE.main[2],
    lamp: STYLE.accent[0], alert: STYLE.accent[1],
    mtn: '#2c2f6a', mtnSnow: '#8d8fc8', pine: '#1c2f4a', pine2: '#284566', shade: '#c9daf0', hole: '#22305a', ink: '#141a33', white: '#ffffff',
  };

  var GAME_TITLE = 'SNOW HOP';
  var BPM = 120;
  var SPB = 60 / BPM;
  var GAPS = [[], [2], [3], [1], [2, 3], [3], [1, 2]];   // 小節ごとの「足音が途切れる拍」
  var BARS = GAPS.length;
  var TOTAL_BEATS = BARS * 4;
  var PERFECT_W = 0.07;
  var GOOD_W = 0.14;
  var MISS_MAX = 3;
  var HIT_STOP = 0.42;
  var TIME_LIMIT = 14;
  var RIDGE_Y = Math.round(H * 0.4);
  var HOLES = [
    [150, 1600], [390, 1620], [630, 1600], [880, 1540], [760, 1380], [500, 1350], [250, 1310], [330, 1150], [620, 1080],
  ];

  var GAP_LIST = [];
  for (var gb = 0; gb < BARS; gb++) for (var gi = 0; gi < GAPS[gb].length; gi++) GAP_LIST.push(gb * 4 + GAPS[gb][gi]);
  function isGap(k) { var bar = Math.floor(k / 4); return bar >= 0 && bar < BARS && GAPS[bar].indexOf(k % 4) >= 0; }
  function gapRun(k) { var n = 0; while (isGap(k + n)) n++; return n; }

  // 雪原の歌(オリジナル・ト長調)。1拍ずつ拍クロックから鳴らすので、足音の途切れる拍は伴奏ごと抜ける
  var MEL = [
    [['G5', 0.5], ['B5', 0.5]], [['D6', 1]], [['B5', 0.5], ['A5', 0.5]], [['G5', 1]],
    [['E5', 0.5], ['G5', 0.5]], [['A5', 1]], [['G5', 0.5], ['E5', 0.5]], [['D5', 1]],
    [['C5', 0.5], ['E5', 0.5]], [['G5', 1]], [['A5', 0.5], ['B5', 0.5]], [['C6', 1]],
    [['B5', 0.5], ['G5', 0.5]], [['A5', 1]], [['F#5', 0.5], ['A5', 0.5]], [['G5', 1]],
  ];
  var BASS = ['G2', 'D3', 'G2', 'D3', 'E2', 'B2', 'E2', 'B2', 'C3', 'G3', 'C3', 'G3', 'D3', 'A2', 'D3', 'A2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, flashT, missIdx, res;
  var rabbit, rangerX, rangerDir, rangerStep, stopT, restMarks, lampT, foundT, prints, ears;
  var score, perfects, goods, misses, hops, over, won, outroT, prevBest, milestone, stars;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; missIdx = 0; res = {};
    rabbit = { pos: 0, from: 0, hopT: 1 };
    rangerX = 300; rangerDir = 1; rangerStep = 0; stopT = 0; restMarks = 0; lampT = 0; foundT = 0;
    prints = ['', '', '', '']; ears = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; hops = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (!stars) { stars = []; for (var i = 0; i < 40; i++) stars.push({ x: game.random(0, W), y: game.random(240, 640), p: game.random(0, 6) }); }
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= TOTAL_BEATS) return;
    var pos = k % 4;
    if (pos === 0) prints = ['', '', '', ''];
    ears = 1;
    if (isGap(k)) {
      // 足音も伴奏も灯りも抜ける(プレイヤーは心の中で拍を保つ)
      prints[pos] = 'rest';
      return;
    }
    // 見回りの一歩: ザクッ + 灯りの点滅 + 伴奏
    prints[pos] = 'step';
    lampT = 1;
    rangerStep++;
    rangerX += rangerDir * 56;
    if (rangerX > 900) rangerDir = -1;
    if (rangerX < 180) rangerDir = 1;
    tone(95, 0.07, { wave: 'square', volume: 0.12 * vol() });
    tone(2400, 0.025, { wave: 'triangle', volume: 0.03 * vol() });
    if (armed) game.audio.melody(MEL[k % 16], { tempo: BPM, wave: 'square', volume: demoMode ? 0.02 : 0.04, bass: [[BASS[k % 16], 1]], bassWave: 'triangle', bassVolume: demoMode ? 0.04 : 0.08 });
    var run = gapRun(k + 1);
    if (run > 0) {
      // 予告(1拍前): 立ち止まって踏みしめる重い足音 + 頭上に休みの印
      stopT = (run + 1) * SPB; restMarks = run;
      tone(62, 0.18, { wave: 'triangle', volume: 0.2 * vol() });
      tone(330, 0.14, { wave: 'sine', volume: 0.05 * vol(), slide: 160 });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    // 見送った無音の拍
    while (missIdx < GAP_LIST.length && songT > GAP_LIST[missIdx] * SPB + GOOD_W) {
      var gk = GAP_LIST[missIdx];
      if (!res[gk]) { res[gk] = 'miss'; missFx('slow'); }
      missIdx++;
    }
    if (!demoMode && !over && songT > TOTAL_BEATS * SPB - 0.2) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function holePt(i) { return { x: HOLES[i][0], y: HOLES[i][1] }; }
  function rabbitPt() {
    var a = holePt(rabbit.from), b = holePt(rabbit.pos);
    var k = Math.min(1, rabbit.hopT);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 140, air: k < 1 };
  }

  function missFx(why) {
    misses++;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    if (why === 'found') foundT = 0.9;
    var p = rabbitPt();
    game.feedback.bad(p.x, p.y - 120, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.45 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function hop(b, off) {
    res[b] = 'hop';
    rabbit.from = rabbit.pos; rabbit.pos = Math.min(HOLES.length - 1, rabbit.pos + 1); rabbit.hopT = 0;
    hops++;
    var dbl = gapRun(b) === 1 && isGap(b - 1);     // 2拍続く無音の2拍目
    var p = holePt(rabbit.pos);
    if (armed) game.audio.play('se_jump', 0.35 * vol());
    if (Math.abs(off) <= PERFECT_W) {
      perfects++; score += dbl ? 150 : 100;
      game.feedback.good(p.x, p.y - 150, { text: 'PERFECT', color: C.lamp, size: 50, count: 10, volume: armed ? 0.22 : 0.001 });
    } else {
      goods++; score += dbl ? 80 : 50;
      game.feedback.good(p.x, p.y - 150, { text: 'GOOD', color: C.ice, size: 44, count: 6, volume: armed ? 0.18 : 0.001 });
    }
    if (!demoMode && hops === 4 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(hops + ' / ' + GAP_LIST.length, W / 2, Math.round(H * 0.5), { color: C.lamp, size: 80 });
    }
    if (rabbit.pos === HOLES.length - 1) {
      score += 300;
      game.fx.burst(p.x, p.y, { color: C.snow, count: 24, speed: 380 });
    }
  }

  // 押した瞬間の判定(入力とデモで共通)
  function tapAction() {
    if (!running || over || hitStop > 0) return 'none';
    var b = Math.round(songT / SPB);
    if (b < 0 || b >= TOTAL_BEATS) return 'none';
    var off = songT - b * SPB;
    if (isGap(b)) {
      if (res[b]) return 'none';
      if (Math.abs(off) <= GOOD_W) { hop(b, off); return 'ok'; }
      res[b] = 'miss'; missFx(off < 0 ? 'found' : 'slow'); return 'miss';
    }
    missFx('found');      // 足音の拍に動いた = 見つかる
    return 'miss';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += hops * 40;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(900, 1400), { color: i % 2 ? C.snow : C.lamp, count: 20, speed: 400 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, Math.round(H * 0.45), { color: C.lamp, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over || readyT > 0) return;
    var r = tapAction();
    if (r === 'none') { game.audio.tone(520, 0.03, { wave: 'triangle', volume: 0.04 }); game.fx.burst(x, y, { color: C.shade, count: 4, speed: 120 }); }
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  // 三角(山・木)を横ストリップで塗る
  function tri(cx, baseY, w, h, col) {
    for (var y = 0; y < h; y += 8) {
      var hw = w / 2 * (y / h);
      game.draw.rect(cx - hw, baseY - h + y, hw * 2, 8, col);
    }
  }
  function oval(cx, cy, rx, ry, col, a) {
    for (var y = -ry; y < ry; y += 5) {
      var yy = y + 2.5;
      var hw = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(cx - hw, cy + y, hw * 2, 5, col, a === undefined ? 1 : a);
    }
  }

  var RAB = [
    ['..oo..oo..', '.owpoowpo.', '.owpoowpo.', '..owwwwo..', '.owwwwwwo.', '.owewwewo.', '.owwppwwo.', 'owwwwwwwso', 'owwwwwwsso', '.oooooooo.'],
    ['.oo....oo.', 'owpo..owpo', '.owpoowpo.', '..owwwwo..', '.owwwwwwo.', '.owewwewo.', '.owwppwwo.', 'owwwwwwwso', 'owwwwwwsso', '.oooooooo.'],
  ];
  var RAB_HOP = ['..oo..oo..', '.owpoowpo.', '..owwwwo..', '.owewwewo.', '.owwppwwo.', 'owwwwwwwwo', 'owwwwwwwso', '.owwwwwso.', '..ow..wo..', '.oo....oo.'];
  var RPAL = { o: '#2b3a63', w: '#ffffff', p: '#ffb3c6', e: '#2b3a63', s: '#c9daf0' };
  var RAB_FLASH = { o: '#ffffff', w: '#ffffff', p: '#ffffff', e: '#ff6a5a', s: '#ffffff' };
  var RANGER = [
    ['..hhhhhh..', '.hhhhhhhh.', '..ssssss..', '..sesses..', '...ssss...', '.cccccccc.', 'cccccccccc', 'cccbbbbccc', '.cccccccc.', '.cccccccc.', '..bb..bb..', '.bbb..bbb.', 'oooo..oooo'],
    ['..hhhhhh..', '.hhhhhhhh.', '..ssssss..', '..sesses..', '...ssss...', '.cccccccc.', 'cccccccccc', 'cccbbbbccc', '.cccccccc.', '.cccccccc.', '...bbbb...', '..bb..bb..', '.oooooooo.'],
    ['..hhhhhh..', '.hhhhhhhh.', '..seesss..', '..ssssss..', '...ssss...', '.cccccccc.', 'cccccccccc', 'cccbbbbccc', '.cccccccc.', '.cccccccc.', '..bb..bb..', '..bb..bb..', 'oooo..oooo'],
  ];
  var GPAL = { h: '#7a4a2a', s: '#f0c8a0', e: '#2b2b3a', c: '#c43c3c', b: '#2b2b3a', o: '#5a3a22' };

  function drawField(t) {
    var cam = (rangerX - 540);
    game.draw.gradient(0, H, [[0, C.sky0], [0.22, C.sky1], [0.36, C.sky2], [0.4, C.shade], [1, C.snow]]);
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      game.draw.rect(st.x - cam * 0.01, st.y, 4, 4, C.white, 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + st.p)));
    }
    // 層1: 遠景の山
    var o1 = -cam * 0.03;
    tri(160 + o1, RIDGE_Y - 40, 520, 300, C.mtn);
    tri(560 + o1, RIDGE_Y - 40, 640, 380, C.mtn);
    tri(940 + o1, RIDGE_Y - 40, 560, 280, C.mtn);
    tri(560 + o1, RIDGE_Y - 300, 120, 80, C.mtnSnow);
    tri(160 + o1, RIDGE_Y - 250, 100, 70, C.mtnSnow);
    // 層2: 中景の針葉樹と尾根道
    var o2 = -cam * 0.08;
    for (var p = 0; p < 9; p++) {
      var px = 40 + p * 130 + o2 + (p % 2) * 30;
      tri(px, RIDGE_Y + 30, 110, 190 + (p % 3) * 30, p % 2 ? C.pine : C.pine2);
      game.draw.rect(px - 9, RIDGE_Y + 30, 18, 24, '#3a2a2a');
    }
    game.draw.rect(0, RIDGE_Y + 40, W, 40, C.shade);
    game.draw.rect(0, RIDGE_Y + 40, W, 8, C.white);
    // 層3: 近景の雪原(吹きだまり)
    for (var d = 0; d < 7; d++) oval(80 + d * 160 + ((d * 37) % 50), RIDGE_Y + 160 + (d % 3) * 30, 150, 34, C.white, 0.7);
    for (var e = 0; e < 5; e++) oval(120 + e * 230, 1760 + (e % 2) * 40, 200, 40, C.shade, 0.5);
  }

  function drawRanger(t) {
    var x = rangerX, y = RIDGE_Y - 10;
    var stopped = stopT > 0;
    var fr = stopped ? 2 : rangerStep % 2;
    game.draw.sprite(RANGER[fr], GPAL, x, y, 11, { anchor: 'center', flipX: rangerDir < 0 });
    // 竿の灯り(合図灯): 一歩ごとに点滅、足音の途切れる間は暗い
    var hx = x + rangerDir * 46, hy = y - 10;
    var lx = x + rangerDir * 110, ly = y - 110 - (stopped ? 30 : 0);
    game.draw.line(hx, hy, lx, ly, '#5a3a22', 7);
    var lit = lampT > 0 ? lampT : 0;
    if (lit > 0) game.draw.circle(lx, ly + 24, 50 + lit * 20, C.lamp, 0.25 * lit);
    game.draw.rect(lx - 16, ly, 32, 44, C.ink);
    game.draw.rect(lx - 11, ly + 5, 22, 34, lit > 0.05 ? C.lamp : '#6a5a3a');
    // 灯りの光の帯(見つかると、うさぎへ向く)
    var tgt = foundT > 0 ? rabbitPt() : { x: rangerX + Math.sin(t * 0.8) * 160, y: 1180 };
    var n = 10;
    for (var i = 1; i <= n; i++) {
      var k = i / n;
      game.draw.circle(lx + (tgt.x - lx) * k, ly + 30 + (tgt.y - ly - 30) * k, 18 + k * 90, foundT > 0 ? C.alert : C.lamp, (foundT > 0 ? 0.08 : 0.035) + lit * 0.02);
    }
    // 休みの印(予告): 足音が途切れる拍の数だけ
    if (stopped && restMarks > 0) {
      for (var m = 0; m < restMarks; m++) {
        var mx = x - (restMarks - 1) * 30 + m * 60, my = y - 150 + Math.sin(t * 8 + m) * 4;
        game.draw.circle(mx, my, 22, C.ink, 0.6);
        game.draw.rect(mx - 12, my - 4, 24, 8, C.snow);
      }
    }
    // 見つかった印(縦棒+点)
    if (foundT > 0) {
      game.draw.rect(x - 9, y - 220, 18, 54, C.alert);
      game.draw.rect(x - 9, y - 154, 18, 18, C.alert);
    }
  }

  function drawHoles(t) {
    // 雪穴の道筋(足跡の点線)と巣穴
    for (var i = 0; i < HOLES.length - 1; i++) {
      var a = holePt(i), b = holePt(i + 1);
      for (var s = 1; s < 4; s++) game.draw.circle(a.x + (b.x - a.x) * s / 4, a.y + (b.y - a.y) * s / 4 - 10, 6, C.ice, i < rabbit.pos ? 0.9 : 0.4);
    }
    for (var h = 0; h < HOLES.length; h++) {
      var p = holePt(h);
      var home = h === HOLES.length - 1;
      var next = running && h === rabbit.pos + 1;
      if (home) {
        game.draw.rect(p.x - 120, p.y - 70, 240, 44, '#5a3a22');
        game.draw.rect(p.x - 120, p.y - 84, 240, 18, C.white);
        game.draw.circle(p.x - 120, p.y - 48, 22, '#7a5232');
      }
      oval(p.x, p.y, home ? 84 : 64, home ? 30 : 24, C.shade);
      oval(p.x, p.y + 4, home ? 70 : 52, home ? 22 : 17, C.hole);
      if (next) oval(p.x, p.y + 4, 70, 26, C.lamp, 0.18 + 0.12 * Math.sin(t * 6));
    }
  }

  function drawRabbit(t) {
    var p = rabbitPt();
    var stop = flashT > 0;
    var sc = stop ? 13 * (1 + (flashT / HIT_STOP) * 0.3) : 13;
    var pal = stop && Math.floor(t * 20) % 2 === 0 ? RAB_FLASH : RPAL;
    if (p.air) {
      game.draw.sprite(RAB_HOP, pal, p.x, p.y - 70, sc, { anchor: 'center', flipX: holePt(rabbit.pos).x < holePt(rabbit.from).x });
      oval(p.x, holePt(rabbit.pos).y, 40, 10, C.navy, 0.2);
      return;
    }
    // 穴に潜む(耳と目だけ)。拍で耳がぴくり
    var fr = ears > 0.5 ? 1 : 0;
    var spr = RAB[fr].slice(0, 7);
    game.draw.sprite(spr, pal, p.x, p.y - 34, sc, { anchor: 'center' });
    oval(p.x, p.y + 8, 54, 12, C.shade);
  }

  // 足跡の帯(この小節の4拍): 歩いた拍は足跡、途切れた拍は空き
  function drawPrints() {
    var y = Math.round(H * 0.915);
    game.draw.rect(170, y - 70, 740, 140, C.navy, 0.35);
    var cur = running ? beatN % 4 : -1;
    for (var i = 0; i < 4; i++) {
      var x = 260 + i * 187;
      if (i === cur) game.draw.rect(x - 70, y - 62, 140, 124, C.white, 0.35);
      if (prints[i] === 'step') {
        oval(x - 20, y - 6, 18, 34, C.navy);
        oval(x + 22, y + 10, 18, 34, C.navy);
      } else if (prints[i] === 'rest') {
        game.draw.circle(x, y, 30, C.lamp, 0.25);
        game.draw.rect(x - 20, y - 6, 40, 12, C.lamp);
      } else {
        game.draw.circle(x, y, 10, C.white, 0.5);
      }
    }
  }

  function drawScene(t) {
    drawField(t);
    drawRanger(t);
    drawHoles(t);
    drawRabbit(t);
    drawPrints();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, Math.round(H * 0.12), C.ink, 0.6);
    label('SCORE ' + score, 50, 96, 52, C.white, 'left');
    label('BEST ' + prevBest, 50, 164, 30, C.lamp, 'left');
    label(hops + ' / ' + GAP_LIST.length, W - 50, 96, 54, C.ice, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 210 + m * 64, 160, 18, m < misses ? C.alert : '#3d4a7a');
    game.draw.rect(0, 222, W, 8, '#3d4a7a');
    game.draw.rect(0, 222, W * Math.min(1, songT / (TOTAL_BEATS * SPB)), 8, C.lamp);
  }

  // ---- ATTRACT: 実ロジックで 無音の拍で跳ぶ×2 → 足音の拍に触って見つかる(MISS) → 次の無音で跳ぶ → 2拍の無音で2回跳ぶ ----
  var demo = { t: 0, press: 0, done: {} };
  var DEMO_BEATS = 20;
  var DEMO_TAPS = [6, 11, 12, 13, 18, 19];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; }
    for (var i = 0; i < DEMO_TAPS.length; i++) {
      var b = DEMO_TAPS[i];
      if (!demo.done[b] && songT + dt >= b * SPB - 0.005) { demo.done[b] = true; demo.press = 0.18; tapAction(); }
    }
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (stopT > 0) stopT -= dt;
    if (lampT > 0) lampT -= dt * 3;
    if (foundT > 0) foundT -= dt;
    if (ears > 0) ears -= dt * 5;
    if (demo.press > 0) demo.press -= dt;
    if (hitStop <= 0 && rabbit.hopT < 1) rabbit.hopT += dt / 0.3;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      var np = holePt(Math.min(HOLES.length - 1, rabbit.pos + 1));
      game.draw.hand(np.x + 30, np.y + 60, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, Math.round(H * 0.12), C.ink, 0.6);
      label(GAME_TITLE, W / 2, 112, 88 + Math.sin(t * 3) * 3, C.white);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.lamp);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, Math.round(H * 0.52), 50, C.alert);
      else label('TAP TO START', W / 2, Math.round(H * 0.52), 46, C.navy);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      game.draw.rect(70, Math.round(H * 0.24), W - 140, 560, C.ink, 0.85);
      var ry = Math.round(H * 0.24);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, ry + 130, 100, won ? C.lamp : C.alert);
      label('SCORE ' + score, W / 2, ry + 230, 58, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, ry + 310, 34, C.ice);
      label(hops + ' / ' + GAP_LIST.length, W / 2, ry + 380, 44, C.ice);
      if (won && score > prevBest) label('NEW RECORD', W / 2, ry + 470, 54, C.lamp);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, ry + 470, 42, C.lamp);
      if (!won) label('あと' + Math.max(1, GAP_LIST.length - hops) + '穴!', W / 2, ry - 40, 54, C.alert);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, Math.round(H * 0.82), 40, C.navy);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, hops: hops, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.52), 110, C.alert);
    if (over && won) label('FINISH', W / 2, Math.round(H * 0.52), 100, C.alert);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

// K-DS-0026v3-florist-bench-waltz-sort.js
// 花屋のワルツ仕分け — 三拍子の一拍目ごとに台へ届く切り花を、次の一拍目ちょうどに同じ色のバケツへドラッグして挿す。後半はバケツの回転台が二拍目で回る
// 操作: 一拍目に台の丸皿へ届いた花を押さえてつまみ、同じ色のバケツの口までドラッグして、次の一拍目(花のまわりの縮む輪が閉じる瞬間)に指を離して挿す。拍の頭からのずれでPERFECT/GOOD。早く離しすぎると花は丸皿へ戻る(やり直せる)。バケツの外で離しても戻る。違う色のバケツ・次の一拍目を過ぎても挿せない花はMISS。5本目からはバケツを載せた回転台が二拍目で90度回る(回る前に台の中央に矢印と歯車の音)。9本目からは回る向きが毎小節入れ替わる
// 終わり: 前奏1小節+11小節(120BPM・約18秒・11本)を挿し切ってMISS 2回以内ならCLEAR(判定の点×連続ボーナス、回転台の間は1.5倍)。MISS 3回でGAME OVER
// @mechanic: drag_sort
// @theme: florist_bench_waltz_sort
// 世界観: 街角の花屋の作業台で、店員がワルツに乗って一拍目ごとに届く切り花を、回る台に載った色ごとのバケツへ次の一拍目までに挿し分けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・挿せた花の本数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var STYLE = { bg: ['#ffffff', '#f1f5f8', '#e3ecf1'], main: ['#ff5d73', '#ffc53d', '#4f8dff'], accent: ['#a46bff', '#2fc59a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊。物の真下に柔らかい半透明の影。見た目どおりの当たり判定
  var C = { ink: '#2d3142', soft: '#9aa6b2', white: '#ffffff', shadow: '#5a6478', table: '#f4e6d4', tableDark: '#e2cdb2', green: STYLE.accent[1], red: '#ff4d5e', gold: '#ffb21e' };
  var COLORS = [STYLE.main[0], STYLE.main[1], STYLE.main[2], STYLE.accent[0]];
  var LIGHT = ['#ffb3bf', '#ffe29a', '#a9c8ff', '#d4b8ff'];

  var GAME_TITLE = 'FLOWER WALTZ';
  var BPM = 120;
  var SPB = 60 / BPM;
  var BAR = 3;
  var BAR_T = BAR * SPB;
  var LEAD = 0.06;
  var PERFECT_W = 0.06;
  var GOOD_W = 0.13;
  var MISS_MAX = 3;
  // 花の色(届く小節の順)と、その小節の二拍目の回転(1/4回転単位、+は時計回り)
  var SEQ = [0, 1, 2, 3, 1, 0, 3, 2, 0, 2, 1];
  var ROT = [0, 0, 0, 0, 1, 1, 1, 1, -1, 1, -1];
  var DEMO_SEQ = [1, 2, 0, 3, 1];
  var DEMO_ROT = [0, 0, 0, 1, 1];
  var DEMO_WRONG = 2;          // デモは3本目を違う色のバケツへ挿してMISSを見せる
  var ROT_T = 0.3;
  var WARN_T = 0.65;

  var SPOT_X = 540, SPOT_Y = 960;
  var CH_X0 = -60, CH_Y0 = 600;
  var TT_X = 540, TT_Y = 1590, TT_RX = 340, TT_RY = 130, MOUTH_UP = 120, MOUTH_R = 135;
  var BEAT_Y = 312;

  // 店員(エプロン・顔)。一拍目で左右へ揺れる
  var CLERK_A = ['..hhhh..', '.hhhhhh.', '.hssssh.', '..sese..', '..ssss..', '...ss...', '.gaaaag.', 'gaaaaaag', 's.aaaa.s', '..aaaa..', '..d..d..'];
  var CLERK_B = ['..hhhh..', '.hhhhhh.', '.hssssh.', '..sese..', '..ssss..', '...ss...', '.gaaaag.', 'gaaaaaag', '.saaaas.', '..aaaa..', '.d....d.'];
  var CLERK_OOPS = ['..hhhh..', '.hhhhhh.', '.hssssh.', '.seesee.', '..ssss..', 's..ss..s', '.gaaaag.', 'gaaaaaag', '..aaaa..', '..aaaa..', '..d..d..'];
  var PAL_CLERK = { h: '#5b4636', s: '#ffd6b8', e: C.ink, g: '#ffffff', a: STYLE.accent[1], d: '#5a6478' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, seq, rotPlan, endBeats, running, songT, beatN, schedB, readyT, hitStop, flashT, beatPulse;
  var flowers, held, rotCur, rotFrom, rotTo, rotStart, tickDone, score, perfects, goods, misses, combo, maxCombo, inserted, binCount;
  var over, won, outroT, prevBest, milestone, oopsT, wilts, bounce;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    seq = demoMode ? DEMO_SEQ : SEQ;
    rotPlan = demoMode ? DEMO_ROT : ROT;
    endBeats = (seq.length + 2) * BAR - 2;   // 最後の花を挿す一拍目まで
    running = false; songT = 0; beatN = 0; schedB = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; beatPulse = 0;
    flowers = [];
    for (var i = 0; i < seq.length; i++) flowers.push({ c: seq[i], arrive: (i + 1) * BAR, st: 'chute', x: CH_X0, y: CH_Y0, flash: 0 });
    held = null; rotCur = 0; rotFrom = 0; rotTo = 0; rotStart = -9; tickDone = {};
    score = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; inserted = 0; binCount = [0, 0, 0, 0];
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; oopsT = 0; wilts = []; bounce = 0;
    if (demoMode) startClock();
  }

  function startClock() { running = true; songT = 0; beatN = 0; schedB = 0; beatPulse = 1; }

  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナルのワルツ。1拍目=低音+歌、2・3拍目=刻み) ----
  var MEL = [['R', 'R', 'D5'], ['G5', 'F#5', 'G5'], ['A5', 'R', 'D5'], ['B5', 'A5', 'G5'], ['E5', 'R', 'G5'], ['D5', 'B4', 'D5'],
    ['E5', 'G5', 'B5'], ['A5', 'G5', 'E5'], ['F#5', 'R', 'A5'], ['B5', 'C6', 'B5'], ['A5', 'F#5', 'D5'], ['G5', 'R', 'B5'], ['G5', 'R', 'R']];
  var ROOT = ['G2', 'G2', 'D3', 'G2', 'C3', 'G2', 'E2', 'A2', 'D3', 'G2', 'D3', 'G2', 'G2'];
  var PAH = [['B3', 'D4'], ['B3', 'D4'], ['F#3', 'C4'], ['B3', 'D4'], ['E4', 'G4'], ['B3', 'D4'], ['G3', 'B3'], ['G3', 'C#4'], ['F#3', 'A3'], ['B3', 'D4'], ['F#3', 'C4'], ['B3', 'D4'], ['B3', 'D4']];
  function playBeatMusic(b) {
    if (demoMode) return;
    var bar = Math.min(MEL.length - 1, Math.floor(b / BAR)), i = b % BAR;
    var m = MEL[bar][i];
    if (i === 0) game.audio.melody([[m, 0.9], ['R', 0.1]], { tempo: BPM, wave: 'triangle', volume: 0.09, bass: [[ROOT[bar], 0.8], ['R', 0.2]], bassWave: 'triangle', bassVolume: 0.13 });
    else game.audio.melody([[m, 0.9], ['R', 0.1]], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: [[PAH[bar][i - 1], 0.3], ['R', 0.7]], bassWave: 'square', bassVolume: 0.025 });
  }

  // ---- 回転台 ----
  function rotBeat(i) { return flowers[i].arrive + 1; }          // 届いた小節の二拍目で回る
  function bucketPos(c) {
    var a = Math.PI / 4 + (c + rotCur) * Math.PI / 2;
    var x = TT_X + Math.cos(a) * TT_RX, y = TT_Y + Math.sin(a) * TT_RY;
    return { x: x, y: y, mx: x, my: y - MOUTH_UP };
  }
  function bucketAt(x, y) {
    var best = -1, bd = MOUTH_R;
    for (var c = 0; c < 4; c++) {
      var p = bucketPos(c);
      var d = Math.sqrt((x - p.mx) * (x - p.mx) + (y - p.my) * (y - p.my));
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < endBeats && songT >= schedB * SPB - LEAD) { playBeatMusic(schedB); schedB++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; beatPulse = 1; }
    // 回転の予告(歯車の音)と回転
    for (var i = 0; i < flowers.length; i++) {
      if (!rotPlan[i]) continue;
      var rt = rotBeat(i) * SPB;
      if (!tickDone[i] && songT >= rt - WARN_T) {
        tickDone[i] = true;
        sfxTone(1400, 0.05, { wave: 'square', volume: 0.04 });
        sfxTone(1050, 0.05, { wave: 'square', volume: 0.04 });
      }
      if (rotStart < rt - 0.001 && songT >= rt) {
        rotFrom = rotTo; rotTo = rotTo + rotPlan[i]; rotStart = rt;
        sfxTone(220, 0.25, { wave: 'triangle', volume: 0.08, slide: 120 });
      }
    }
    rotCur = rotFrom + (rotTo - rotFrom) * ease((songT - rotStart) / ROT_T);
    // 届く花
    for (var j = 0; j < flowers.length; j++) {
      var f = flowers[j];
      if (f.st === 'chute' && songT >= f.arrive * SPB) { f.st = 'spot'; f.x = SPOT_X; f.y = SPOT_Y; }
      // 次の一拍目を過ぎても挿せなかった花はしおれる
      if ((f.st === 'spot' || f.st === 'held') && songT > (f.arrive + BAR) * SPB + GOOD_W) {
        if (held === f) held = null;
        f.st = 'gone';
        missAt(f, f.x, f.y);
        if (over) return;
      }
    }
    if (songT >= endBeats * SPB + GOOD_W + 0.08) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function missAt(f, x, y) {
    misses++; combo = 0; oopsT = 0.7;
    hitStop = 0.36; flashT = 0.36;
    wilts.push({ c: f.c, x: x, y: y, vy: -200, vx: x < W / 2 ? -160 : 160, flash: 0.4 });
    sfxTone(150, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    if (demoMode) { game.fx.popup('MISS', x, y - 110, { color: C.red, size: 58 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(x, y - 110, { text: 'MISS', shake: 9 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function current() {
    for (var i = 0; i < flowers.length; i++) if (flowers[i].st === 'spot' || flowers[i].st === 'held') return flowers[i];
    return null;
  }

  function grabAt(x, y) {
    if (!running || hitStop > 0 || over || held) return false;
    var f = current();
    if (!f || f.st !== 'spot') return false;
    if (Math.sqrt((x - f.x) * (x - f.x) + (y - f.y) * (y - f.y)) > 170) return false;
    f.st = 'held'; held = f; f.x = x; f.y = y;
    sfxTone(880, 0.05, { wave: 'sine', volume: 0.06, slide: 200 });
    return true;
  }

  function moveHeld(x, y) { if (held) { held.x = x; held.y = y; } }

  function releaseAt(x, y) {
    var f = held;
    if (!f) return 'none';
    held = null;
    var c = bucketAt(x, y);
    if (c < 0) { f.st = 'spot'; f.x = SPOT_X; f.y = SPOT_Y; bounce = 0.25; sfxTone(330, 0.08, { wave: 'sine', volume: 0.05, slide: -80 }); return 'back'; }
    var p = bucketPos(c);
    if (c !== f.c) { f.st = 'gone'; missAt(f, p.mx, p.my); return 'miss'; }
    var off = songT - (f.arrive + BAR) * SPB;
    if (off < -GOOD_W) {
      // 早すぎ: 花は丸皿へ戻る(やり直せる)
      f.st = 'spot'; f.x = SPOT_X; f.y = SPOT_Y; bounce = 0.3;
      sfxTone(392, 0.1, { wave: 'sine', volume: 0.06, slide: -120 });
      if (demoMode) game.fx.popup('...', p.mx, p.my - 80, { color: C.soft, size: 40 });
      return 'early';
    }
    var a = Math.abs(off);
    var w = a <= PERFECT_W ? 'PERFECT' : 'GOOD';
    f.st = 'in'; binCount[c]++; inserted++;
    combo++; if (combo > maxCombo) maxCombo = combo;
    var spin = rotPlan[flowers.indexOf(f)] !== 0;
    var mult = (1 + Math.floor(combo / 4) * 0.5) * (spin ? 1.5 : 1);
    score += Math.round((w === 'PERFECT' ? 100 : 50) * mult);
    if (w === 'PERFECT') perfects++; else goods++;
    var col = COLORS[c];
    if (demoMode) game.fx.popup(w, p.mx, p.my - 150, { color: col, size: 50 });
    else game.feedback.good(p.mx, p.my - 150, { text: w, color: col, size: w === 'PERFECT' ? 54 : 46, count: 12, volume: 0.15 });
    sfxTone(['C6', 'E6', 'G6', 'A6'][c], 0.18, { wave: 'sine', volume: 0.07 });
    if (!demoMode && combo === 6 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('6 COMBO', W / 2, 700, { color: C.gold, size: 76 });
      game.fx.burst(W / 2, 700, { color: C.gold, count: 20, speed: 380 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (held) { held.st = 'gone'; held = null; }
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(200, 880), game.random(1300, 1650), { color: COLORS[i % 4], count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    for (var i = wilts.length - 1; i >= 0; i--) {
      var w = wilts[i];
      if (w.flash > 0) w.flash -= dt;
      w.vy += 1800 * dt; w.x += w.vx * dt; w.y += w.vy * dt;
      if (w.y > H + 100) wilts.splice(i, 1);
    }
    if (oopsT > 0) oopsT -= dt;
    if (bounce > 0) bounce -= dt;
  }

  // ---- 入力 ----
  var dragId = null;
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    if (grabAt(x, y)) { dragId = id; return; }
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || id !== dragId) return;
    moveHeld(x, y);
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING || id !== dragId) return;
    dragId = null;
    var r = releaseAt(x, y);
    if (r === 'back') game.fx.burst(SPOT_X, SPOT_Y, { color: C.soft, count: 6, speed: 160 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); dragId = null; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function ellipse(x, y, rx, ry, col, alpha) {
    var st = 4;
    for (var dy = -ry; dy < ry; dy += st) {
      var k = 1 - Math.pow((dy + st / 2) / ry, 2);
      if (k <= 0) continue;
      var hw = rx * Math.sqrt(k);
      game.draw.rect(x - hw, y + dy, hw * 2, st + 0.5, col, alpha);
    }
  }
  function softShadow(x, y, rx, ry) {
    ellipse(x, y, rx, ry, C.shadow, 0.1);
    ellipse(x, y, rx * 0.75, ry * 0.7, C.shadow, 0.1);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: 'rgba(45,49,66,0.25)', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawFlower(c, x, y, sc, flash, droop) {
    var col = flash ? C.white : COLORS[c];
    var lt = flash ? C.white : LIGHT[c];
    var hy = y - 70 * sc + (droop ? 30 * sc : 0);
    game.draw.line(x, y, x + (droop ? 26 * sc : 0), hy, flash ? C.white : '#3faa6a', 9 * sc);
    ellipse(x + 18 * sc, y - 30 * sc, 18 * sc, 9 * sc, flash ? C.white : '#58c47f', 1);
    var bx = x + (droop ? 26 * sc : 0);
    for (var k = 0; k < 5; k++) {
      var a = k * Math.PI * 2 / 5 + 0.3;
      game.draw.circle(bx + Math.cos(a) * 24 * sc, hy + Math.sin(a) * 24 * sc, 22 * sc, col);
    }
    game.draw.circle(bx, hy, 20 * sc, lt);
    game.draw.circle(bx - 7 * sc, hy - 3 * sc + (droop ? 4 * sc : 0), 3.5 * sc, C.ink);
    game.draw.circle(bx + 7 * sc, hy - 3 * sc + (droop ? 4 * sc : 0), 3.5 * sc, C.ink);
  }

  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 店先のひさしと窓
    for (var s = 0; s < 9; s++) game.draw.rect(s * 120, 236, 120, 84, s % 2 ? '#ffffff' : '#ffd1d8');
    for (var s2 = 0; s2 < 9; s2++) game.draw.circle(s2 * 120 + 60, 320, 60, s2 % 2 ? '#ffffff' : '#ffd1d8');
    game.draw.rect(40, 400, 1000, 420, '#e8f3fb');
    game.draw.rect(40, 400, 1000, 12, '#d0e2ee');
    for (var p = 0; p < 6; p++) {
      var px = 120 + p * 170, sway = Math.sin(t * 1.6 + p) * 6;
      softShadow(px, 800, 60, 14);
      ellipse(px, 760, 46, 40, COLORS[p % 4], 0.35);
      game.draw.circle(px + sway, 700, 36, LIGHT[p % 4], 0.8);
    }
    // 作業台
    game.draw.rect(0, 830, W, H - 830, C.table);
    game.draw.rect(0, 830, W, 18, C.tableDark);
  }

  function drawChute() {
    game.draw.line(CH_X0, CH_Y0 + 40, SPOT_X - 60, SPOT_Y + 30, '#dfe6ec', 90);
    game.draw.line(CH_X0, CH_Y0 + 8, SPOT_X - 60, SPOT_Y - 2, '#ffffff', 16);
    softShadow(SPOT_X, SPOT_Y + 20, 140, 36);
    ellipse(SPOT_X, SPOT_Y, 130, 40, '#ffffff', 1);
    ellipse(SPOT_X, SPOT_Y - 4, 112, 30, '#f5f8fb', 1);
    // シュートの上を次の花が滑ってくる(1小節前から見える)
    for (var i = 0; i < flowers.length; i++) {
      var f = flowers[i];
      if (f.st !== 'chute') continue;
      var p = 1 - (f.arrive * SPB - songT) / BAR_T;
      if (p < 0) continue;
      var x = CH_X0 + (SPOT_X - CH_X0) * p, y = CH_Y0 + (SPOT_Y - CH_Y0) * p;
      softShadow(x, y + 10, 50, 12);
      drawFlower(f.c, x, y, 0.8, false, false);
    }
  }

  function drawTurntable() {
    softShadow(TT_X, TT_Y + 40, TT_RX + 90, TT_RY + 40);
    ellipse(TT_X, TT_Y + 22, TT_RX + 70, TT_RY + 34, '#d9e2ea', 1);
    ellipse(TT_X, TT_Y, TT_RX + 70, TT_RY + 34, '#ffffff', 1);
    ellipse(TT_X, TT_Y, 60, 24, '#e6edf3', 1);
    // 回転の予告矢印
    var warn = false, dir = 0;
    for (var i = 0; i < flowers.length; i++) {
      if (!rotPlan[i]) continue;
      var rt = rotBeat(i) * SPB;
      if (songT >= rt - WARN_T && songT < rt + ROT_T) { warn = true; dir = rotPlan[i]; }
    }
    if (warn && running && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      var ax = TT_X, ay = TT_Y + 8;
      game.draw.rect(ax - 110, ay - 9, 220, 18, C.gold);
      var hx = ax + dir * 110;
      for (var k = 0; k < 7; k++) game.draw.rect(hx - dir * k * 6 - 3, ay - 36 + k * 6, 6, 72 - k * 12, C.gold);
    }
    // バケツ(奥から順に)
    var order = [0, 1, 2, 3].sort(function(a, b) { return bucketPos(a).y - bucketPos(b).y; });
    for (var o = 0; o < 4; o++) drawBucket(order[o]);
  }

  function drawBucket(c) {
    var p = bucketPos(c);
    var glow = held && bucketAt(held.x, held.y) === c;
    softShadow(p.x, p.y + 6, 110, 26);
    ellipse(p.x, p.y, 92, 26, COLORS[c], 1);
    game.draw.rect(p.x - 92, p.my, 184, MOUTH_UP, COLORS[c]);
    game.draw.rect(p.x - 70, p.my + 20, 22, MOUTH_UP - 30, '#ffffff', 0.35);
    for (var k = 0; k < Math.min(5, binCount[c]); k++) {
      var fx = p.x - 60 + k * 30, fy = p.my - 30 - (k % 2) * 18;
      game.draw.line(fx, p.my, fx, fy, '#3faa6a', 6);
      game.draw.circle(fx, fy, 20, LIGHT[c]);
      game.draw.circle(fx, fy, 10, COLORS[c]);
    }
    ellipse(p.mx, p.my, 100, 30, LIGHT[c], 1);
    ellipse(p.mx, p.my + 3, 80, 20, COLORS[c], 0.6);
    if (glow) {
      ellipse(p.mx, p.my, 112, 8, C.white, 0.9);
    }
  }

  function drawFlowersLive() {
    var cur = current();
    for (var n = 0; n < flowers.length; n++) {
      var g = flowers[n];
      if (g !== cur && g.st === 'spot') drawFlower(g.c, g.x, g.y, 1.15, false, false);
    }
    if (cur) {
      var due = (cur.arrive + BAR) * SPB, tt = due - songT;
      var bx = cur.x, by = cur.y + (cur.st === 'spot' && bounce > 0 ? -Math.sin(bounce * 20) * 20 : 0);
      if (cur.st === 'spot') {
        var pu = 0.5 + 0.5 * Math.sin(game.time.elapsed * 12);
        game.draw.circle(bx, by - 60, 96, C.white, 0.35 + pu * 0.3);
      } else {
        softShadow(bx, by + 30, 50, 12);
      }
      if (tt > -GOOD_W && tt < BAR_T) {
        var r = 70 + 150 * Math.max(0, tt) / BAR_T;
        for (var k = 0; k < 24; k++) {
          var a = k * Math.PI / 12;
          game.draw.circle(bx + Math.cos(a) * r, by - 60 + Math.sin(a) * r, 7, tt < 0.1 ? C.gold : COLORS[cur.c], 0.85);
        }
      }
      drawFlower(cur.c, bx, by, 1.15, false, false);
    }
    for (var i = 0; i < wilts.length; i++) {
      var w = wilts[i];
      var fl = w.flash > 0 && hitStop > 0;
      drawFlower(w.c, w.x, w.y, fl ? 1.4 : 1.0, fl, true);
    }
  }

  function drawClerk() {
    var t = game.time.elapsed;
    var art = oopsT > 0 ? CLERK_OOPS : (Math.floor(beatN / BAR) % 2 ? CLERK_B : CLERK_A);
    var sway = Math.sin(songT / BAR_T * Math.PI) * 18;
    var fl = flashT > 0 && Math.floor(flashT * 20) % 2 === 0;
    softShadow(890 + sway, 826, 80, 16);
    game.draw.sprite(art, fl ? { h: C.white, s: C.white, e: C.white, g: C.white, a: C.white, d: C.white } : PAL_CLERK, 890 + sway, 700 - beatPulse * 10 + Math.sin(t * 2) * 3, 14, { anchor: 'center' });
  }

  // 三拍子の拍表示: 大・小・小の丸。今の拍が跳ねる
  function drawBeats() {
    var cur = beatN % BAR;
    for (var i = 0; i < BAR; i++) {
      var x = 430 + i * 110, r = i === 0 ? 40 : 28;
      var lift = running && i === cur ? beatPulse * 22 : 0;
      softShadow(x, BEAT_Y + 46, r, 8);
      game.draw.circle(x, BEAT_Y - lift, r, running && i === cur ? (i === 0 ? C.gold : C.green) : '#dfe6ec');
      game.draw.circle(x - r * 0.3, BEAT_Y - lift - r * 0.3, r * 0.25, C.white, 0.7);
    }
  }

  function drawScene() {
    drawShop();
    drawClerk();
    drawChute();
    drawTurntable();
    drawFlowersLive();
    drawBeats();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white, 0.92);
    game.draw.rect(0, 226, W, 4, '#e3ecf1');
    label('SCORE ' + score, 60, 96, 54, C.ink, 'left');
    label('BEST ' + prevBest, 60, 168, 32, C.soft, 'left');
    label(inserted + ' / ' + seq.length, W - 60, 100, 54, C.green, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.circle(W - 240 + i * 70, 176, 22, i < misses ? C.red : '#dfe6ec');
    game.draw.rect(0, 226, W * Math.min(1, songT / (endBeats * SPB)), 4, C.gold);
  }

  function drawResult(t) {
    game.draw.rect(70, H * 0.25, W - 140, H * 0.36, C.white, 0.95);
    game.draw.rect(70, H * 0.25, W - 140, 10, won ? C.green : C.red);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.green : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 58, C.ink);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 34, C.soft);
    label(maxCombo + ' COMBO', W / 2, H * 0.455, 40, C.gold);
    for (var c = 0; c < 4; c++) { game.draw.circle(W / 2 - 210 + c * 140, H * 0.5, 34, COLORS[c]); label('' + binCount[c], W / 2 - 210 + c * 140, H * 0.5 + 16, 40, C.white); }
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 50, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, C.gold);
    if (!won) label('あと' + Math.max(1, seq.length - inserted) + '本', W / 2, H * 0.22, 60, C.red);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.59, 36, C.ink);
  }

  // ---- ATTRACT: 実ロジックで花をつまんで同じ色へ挿す。3本目は違う色へ挿してMISS、4本目から回転台 ----
  var demo = { t: 0, x: SPOT_X, y: SPOT_Y + 200, press: false };
  var DEMO_LEN = (DEMO_SEQ.length + 2) * BAR * SPB + 1.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = false; demo.x = SPOT_X; demo.y = SPOT_Y + 200; }
    tickWorld(dt);
    if (!running || hitStop > 0) { demo.press = false; return; }
    var f = current(), tx = SPOT_X + 120, ty = SPOT_Y + 220;
    if (f) {
      var idx = flowers.indexOf(f);
      var due = (f.arrive + BAR) * SPB;
      if (f.st === 'spot') {
        tx = f.x; ty = f.y;
        if (songT >= f.arrive * SPB + 0.12 && Math.abs(demo.x - f.x) < 40 && Math.abs(demo.y - f.y) < 40) { grabAt(demo.x, demo.y); demo.press = true; }
      } else if (f.st === 'held') {
        var target = idx === DEMO_WRONG ? (f.c + 1) % 4 : f.c;
        var spin = rotPlan[idx] !== 0;
        var bp = bucketPos(target);
        var waitRot = spin && songT < rotBeat(idx) * SPB + ROT_T;
        tx = waitRot ? SPOT_X : bp.mx; ty = waitRot ? SPOT_Y + 160 : bp.my;
        moveHeld(demo.x, demo.y);
        if (songT >= due - 0.01) { releaseAt(demo.x, demo.y); demo.press = false; }
      }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 9);
    demo.y += (ty - demo.y) * Math.min(1, dt * 9);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.white, 0.92);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, COLORS[Math.floor(t) % 4]);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.soft);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1860, 50, C.red);
      else label('TAP TO START', W / 2, 1860, 46, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, inserted: inserted };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 110, C.gold);
    if (over && outroT > 1.5) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.34, 100, won ? C.green : C.red);
    else if (over || state === S.RESULT) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

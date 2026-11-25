// K-DS-0041v3-night-bog-lantern-post.js
// 夜の沼の丸太渡り — 拍の頭ごとにタップで一歩ずつ浮き丸太を渡り、跳ね上がる丸太の拍は長押しで跳び乗り、沈む丸太の拍は何もせず待つ。カエルの伴奏が抜ける小節も拍を保って渡る
// 操作: 拍の頭で画面を短くタップ=次の丸太へ一歩。次の丸太の片端が泡立って橙に縁取られたら、その拍の頭で押して0.2秒以上押さえる=高く跳んで跳ね上がる丸太に乗る(離すと着地)。次の丸太が青黒く沈みかけて泡の輪が出たら、その拍は触らずに待つ(丸太は半拍で浮き直り、次の拍でそこへ一歩)。判定は指が触れた瞬間で、拍の頭からのずれでPERFECT/GOOD。違う動き・拍外れ・押し漏らし・沈む拍の一歩はMISS(落水)。上の小節の帯で暗いマス=伴奏が抜ける小節(その1拍前にカエルが目を閉じ「しーっ」と下がる音で予告)。抜けている間もランタンは拍の頭で振り切れる
// 終わり: 100BPM・前奏2拍+8小節(32拍・約19秒)を渡り切って対岸の家の灯りに着けばCLEAR。MISS4回でランタンが消えてGAME OVER
// @mechanic: camera_run
// @theme: night_bog_lantern_log_crossing
// 世界観: 月夜の沼地で、つば広の雨帽子に郵便かばんを掛けた夜便の配達人がランタンを提げ、浮き沈みする丸太を一歩ずつ渡って対岸の一軒家へ手紙を届ける(カエルの合唱が伴奏)
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・渡った丸太の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 90s 16bit
var STYLE = { bg: ['#14123a', '#3a2a6a'], main: ['#1e4a52', '#7a5030', '#5aa040'], accent: ['#ffb840', '#ff5a6a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度。空グラデ+遠景の枯れ木+近景の葦の3層、暗色輪郭+ハイライトのスプライト
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], water: STYLE.main[0], log: STYLE.main[1], frog: STYLE.main[2],
    lamp: STYLE.accent[0], red: STYLE.accent[1], ink: '#0c0814', logHi: '#b07a4a', logEnd: '#e0b884',
    ring: '#9a6a40', moon: '#fff4c8', water2: '#16383f', reed: '#2a4a2a', white: '#ffffff', sink: '#2a3050', mist: '#8a8ab0'
  };

  var GAME_TITLE = 'BOG POST RUN';
  var BPM = 100;
  var SPB = 60 / BPM;
  // 小節の型。J=跳ね上がる丸太、Wt=沈む丸太、H=どちらか(毎回変わる)
  var BARS = [
    ['rest', 'rest', 'step', 'step'],
    ['step', 'step', 'J', 'step'],
    ['step', 'Wt', 'step', 'step'],
    ['step', 'H', 'step', 'H'],
    ['step', 'step', 'H', 'step'],
    ['step', 'H', 'step', 'H'],
    ['step', 'step', 'H', 'H'],
    ['step', 'H', 'step', 'step']
  ];
  var BREAK_BARS = [false, false, true, false, false, true, true, false];
  var DEMO_ACTS = ['rest', 'step', 'step', 'jump', 'step', 'wait', 'step', 'jump', 'step', 'rest'];
  var DEMO_BREAK = [false, false, true];
  var TIME_LIMIT = 19;            // 32拍 × 0.6秒 = 19.2秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.13, STRAY_W = 0.3, HOLD_T = 0.22;
  var TELE_T = 0.75;
  var LIVES = 4;
  var ROW_H = 170, Y0 = 1250, STEP_T = 0.18;

  // 伴奏(オリジナル)。沼の短調ペンタと、2・4拍のカエルの声
  var LEAD = ['E4', 'G4', 'A4', 'B4', 'D5', 'B4', 'A4', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'R'];
  var BASS = ['E2', 'E2', 'C2', 'D2'];

  // ---- スプライト(背中から見た夜便の配達人) ----
  var MAN_PAL = { k: '#0c0814', h: '#5a3a22', H: '#d8a040', c: '#7a2e3a', C: '#b04a58', s: '#8a6030', b: '#c89a5a', e: '#f0ead8', p: '#2a2a3a', o: '#3a2418' };
  var TOP = [
    '....kkkkkk....',
    '..kkhhhhhhkk..',
    '.khhhhhhhhhhk.',
    'kkHHHHHHHHHHkk',
    '...khhhhhhk...',
    '..kccsccccck..',
    '.kcccsccccCck.',
    '.kccccsccccck.',
    '.kcccccsbbbck.',
    '.kccccccbebck.',
    '.kcccccccbbck.',
    '..kcccccccck..',
    '..kcccccccck..'
  ];
  var WALK = [
    TOP.concat(['...kppkkppk...', '...kppk..kpk..', '...kppk..kpk..', '..kooook.kok..', '..kkkkk..kkk..']),
    TOP.concat(['...kppkkppk...', '..kpk..kppk...', '..kpk..kppk...', '..kok.kooook..', '..kkk..kkkkk..'])
  ];
  var JUMP = TOP.concat(['..kpppkkpppk..', '..kpppkkpppk..', '..kook..kook..', '..kkkk..kkkk..']);
  var WET_PAL = { k: '#0c0814', h: '#3a4a6a', H: '#7a9ab0', c: '#3a4a7a', C: '#5a6a9a', s: '#3a4a6a', b: '#6a8aa0', e: '#c8d8e8', p: '#1a2a4a', o: '#1a2a3a' };
  var FROG = ['.ee..ee.', 'eKgggeKe', 'gggggggg', '.gggggg.', 'g.gggg.g'];
  var FROG_SHUT = ['.gg..gg.', 'gkgggkgg', 'gggggggg', '.gggggg.', 'g.gggg.g'];
  var LANTERN = ['.kk.', 'kyyk', 'kyyk', 'kkkk'];
  var HOUSE = ['....kk....', '...kRRk...', '..kRRRRk..', '.kRRRRRRk.', 'kkkkkkkkkk', '.kwwwwwwk.', '.kwyywwwk.', '.kwyywddk.', '.kwwwwddk.', '.kkkkkkkk.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var beats, rowHaz, totalRows, clock, endT, score, combo, maxCombo, nPerfect, nGood, nMiss, crossed;
  var hitStop, hitObj, over, won, outroT, lastCue, lastBeat, demoMode, prevBest, resultT, realT;
  var beatPulse, gest, soakT, splashes, milestoneDone, holdVis, breakArr, pressFx;

  function buildBeats(demo) {
    var acts = [];
    breakArr = demo ? DEMO_BREAK : BREAK_BARS;
    if (demo) acts = DEMO_ACTS.slice();
    else {
      var prev = '', run = 0;
      for (var b = 0; b < BARS.length; b++) {
        for (var i = 0; i < 4; i++) {
          var a = BARS[b][i];
          if (a === 'J') a = 'jump';
          else if (a === 'Wt') a = 'wait';
          else if (a === 'H') {
            if (acts[acts.length - 1] === 'wait') a = 'wait';
            else {
              a = game.random(0, 1) < 0.5 ? 'jump' : 'wait';
              if (a === prev && run >= 1) a = a === 'jump' ? 'wait' : 'jump';
            }
            run = a === prev ? run + 1 : 0;
            prev = a;
          }
          acts.push(a);
        }
      }
    }
    beats = []; rowHaz = {};
    var rows = 0;
    for (var n = 0; n < acts.length; n++) {
      var bt = { n: n, t: n * SPB, act: acts[n], res: 0, row: -1, brk: !!breakArr[Math.floor(n / 4)] };
      if (bt.act === 'step' || bt.act === 'jump') { rows++; bt.row = rows; }
      else if (bt.act === 'wait') bt.row = rows + 1;
      if (bt.act === 'jump') { rowHaz[bt.row] = rowHaz[bt.row] || {}; rowHaz[bt.row].rise = bt; }
      if (bt.act === 'wait') { rowHaz[bt.row] = rowHaz[bt.row] || {}; rowHaz[bt.row].sink = bt; }
      beats.push(bt);
    }
    totalRows = rows;
    endT = acts.length * SPB;
  }

  function initRun(demo) {
    demoMode = !!demo;
    buildBeats(demo);
    clock = demo ? -0.3 : -READY_T;
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; crossed = 0;
    hitStop = 0; hitObj = null; over = false; won = false; outroT = 0; lastCue = -1; lastBeat = -1;
    prevBest = game.best; resultT = 0; realT = 0;
    beatPulse = 0; gest = null; soakT = 0; splashes = []; milestoneDone = false; holdVis = 0; pressFx = 0;
  }

  // 自分のいる丸太の列(拍の時刻で1列ずつ、時計は1本)
  function camRow() {
    var z = 0;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.row < 0 || b.act === 'wait') continue;
      var k = (clock - b.t) / STEP_T;
      if (k <= 0) break;
      k = Math.min(1, k);
      z += k * k * (3 - 2 * k);
    }
    return z;
  }
  function isBreakBeat(n) { return n >= 0 && !!breakArr[Math.floor(n / 4)]; }

  // ---- 拍クロックと伴奏(抜ける小節は鳴らさない) ----
  function cueBeats() {
    for (var n = lastCue + 1; n < beats.length; n++) {
      if (clock + 0.06 < n * SPB) break;
      lastCue = n;
      if (!demoMode) playBeat(n);
    }
  }
  function playBeat(n) {
    if (isBreakBeat(n)) return;
    var lead = LEAD[n % 16];
    game.audio.melody([[lead, 0.5], [n % 2 ? LEAD[(n + 7) % 16] : 'R', 0.5]], {
      tempo: BPM, wave: 'square', volume: 0.035,
      bass: [[BASS[n % 4], 0.8], ['R', 0.2]], bassWave: 'triangle', bassVolume: 0.12
    });
    if (n % 2 === 1) game.audio.tone(120, 0.09, { wave: 'square', volume: 0.05, slide: 70 });
    else game.audio.tone(1500, 0.02, { wave: 'triangle', volume: 0.03 });
  }
  function onBeat(n) {
    if (!isBreakBeat(n)) beatPulse = 1;
    // 抜ける小節の1拍前: カエルが目を閉じ、「しーっ」と下がる音
    if (!demoMode && n % 4 === 3 && !isBreakBeat(n) && isBreakBeat(n + 1)) game.audio.tone(1400, 0.35, { wave: 'sine', volume: 0.05, slide: -1100 });
    // 伴奏が戻る小節の頭
    if (!demoMode && n % 4 === 0 && n > 0 && isBreakBeat(n - 1) && !isBreakBeat(n)) {
      game.audio.play('se_powerup', 0.3);
      game.fx.popup('GO!', W / 2, 560, { color: C.frog, size: 64 });
    }
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var bi = Math.floor(clock / SPB);
    while (lastBeat < bi) { lastBeat++; if (lastBeat >= 0) onBeat(lastBeat); }
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.tele || b.act === 'step' || b.act === 'rest') continue;
      if (clock >= b.t - TELE_T) {
        b.tele = true;
        if (!demoMode) {
          if (b.act === 'jump') game.audio.tone(90, 0.3, { wave: 'sawtooth', volume: 0.05, slide: 220 });
          else game.audio.tone(420, 0.3, { wave: 'sine', volume: 0.07, slide: -300 });
        }
      }
    }
    // 長押し待ちのまま0.22秒 → 跳ぶに確定
    if (gest && clock - gest.tp >= HOLD_T) commit('jump');
    if (over) return;
    for (var j = 0; j < beats.length; j++) {
      var bb = beats[j];
      if (bb.res || bb.act === 'rest') continue;
      if (clock <= bb.t + GOOD_W) break;
      if (gest && Math.abs(gest.tp - bb.t) <= GOOD_W) break;
      if (bb.act === 'wait') waitOk(bb);
      else { fall(bb, 'late'); return; }
    }
    if (!demoMode && clock >= endT + 0.1) finishRun(true);
  }

  // ---- 入力の形(本番の指もATTRACTのゴーストも同じ関数) ----
  function pressStart() {
    gest = { tp: clock };
    pressFx = 0.15;
  }
  function pressEnd() {
    if (!gest) return null;
    return commit(clock - gest.tp >= HOLD_T ? 'jump' : 'step');
  }
  function commit(kind) {
    var tp = gest.tp;
    gest = null;
    if (kind === 'jump') holdVis = 0.3;
    return doAction(kind, tp);
  }

  function doAction(kind, tp) {
    var best = null, bd = 1e9;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.res || b.act === 'rest') continue;
      var d = tp - b.t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = b; }
    }
    if (!best || Math.abs(bd) > STRAY_W || over) {
      // 拍から遠い足踏み: 連続が切れるだけ
      combo = 0;
      game.feedback.bad(W / 2, Y0 - 120, { text: null, color: C.mist, flashColor: C.sky1, shake: 2, volume: demoMode ? 0.02 : 0.15 });
      return 'stray';
    }
    if (best.act === 'wait') { fall(best, 'sink'); return 'miss'; }
    if (Math.abs(bd) > GOOD_W) { fall(best, 'timing'); return 'miss'; }
    if (kind !== best.act) { fall(best, kind === 'step' ? 'bump' : 'slip'); return 'miss'; }
    return hitBeat(best, Math.abs(bd) <= PERFECT_W ? 1 : 2);
  }

  function hitBeat(b, grade) {
    b.res = grade; crossed++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    var mul = b.brk ? 1.5 : 1;
    var gain = Math.round(((b.act === 'jump' ? (grade === 1 ? 170 : 110) : (grade === 1 ? 100 : 60)) + Math.min(10, combo) * 10) * mul);
    score += gain;
    game.feedback.good(W / 2, Y0 - ROW_H - 80, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.lamp : C.frog, size: grade === 1 ? 54 : 44,
      count: grade === 1 ? 12 : 7, volume: demoMode ? 0.03 : 0.14
    });
    if (!demoMode) {
      if (b.act === 'jump') game.audio.play('se_jump', 0.3);
      else game.audio.tone(260, 0.05, { wave: 'triangle', volume: 0.1 });
      if (combo % 8 === 0) game.fx.popup('x' + combo, W - 170, 400, { color: C.lamp, size: 60 });
      if (!milestoneDone && crossed >= Math.ceil(totalRows / 2)) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, 480, { color: C.lamp, size: 92 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function waitOk(b) {
    b.res = 1;
    combo++; maxCombo = Math.max(maxCombo, combo);
    score += Math.round((80 + Math.min(10, combo) * 10) * (b.brk ? 1.5 : 1));
    splashes.push({ x: W / 2 + xOff(b.row), y: Y0 - ROW_H, t: 0, ring: true });
    if (!demoMode) game.audio.tone(330, 0.12, { wave: 'sine', volume: 0.08, slide: 240 });
  }

  function fall(b, why) {
    b.res = 3;
    nMiss++; combo = 0;
    hitStop = 0.45; hitObj = b; soakT = 1.0;
    for (var k = 0; k < 12; k++) splashes.push({ x: W / 2 + game.random(-120, 120), y: Y0 + game.random(-30, 30), vx: game.random(-260, 260), vy: game.random(-480, -140), t: 0 });
    game.feedback.bad(W / 2, Y0 - 140, { text: 'MISS', color: C.red, flashColor: C.white, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && nMiss >= LIVES) { game.audio.play('se_break', 0.3); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7; gest = null;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (LIVES - nMiss) * 250 + 500;
      for (var i = 0; i < 6; i++) game.fx.burst(240 + (i % 3) * 300, 520 + Math.floor(i / 3) * 260, { color: i % 2 ? C.lamp : C.moon, count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, crossed: crossed, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < -0.35 || hitStop > 0 || y < 230 || gest) return;
    pressStart();
    if (gest) game.audio.tone(180, 0.03, { wave: 'triangle', volume: 0.06 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !gest) return;
    var r = pressEnd();
    if (r === 'stray') game.audio.tone(150, 0.06, { wave: 'triangle', volume: 0.05 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function glow(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2, col, a * 0.15);
    game.draw.circle(x, y, r * 1.4, col, a * 0.3);
    game.draw.circle(x, y, r, col, a);
  }
  function ring(x, y, rx, ry, col, w) {
    var n = 24;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * rx, y + Math.sin(a0) * ry, x + Math.cos(a1) * rx, y + Math.sin(a1) * ry, col, w);
    }
  }
  function xOff(r) { return r <= 0 ? 0 : Math.sin(r * 1.7) * 90; }
  function rowY(k) { return Y0 - ROW_H * k * (1 - 0.035 * k); }
  function rowS(k) { return Math.max(0.5, 1 - 0.065 * k); }

  // ---- 描画 ----
  function drawSky(cr) {
    var t = game.time.elapsed;
    game.draw.gradient(230, 560, [[0, C.sky0], [1, C.sky1]]);
    for (var s = 0; s < 22; s++) {
      var sx = (s * 197) % W, sy = 250 + (s * 83) % 200;
      game.draw.rect(sx, sy, 4, 4, C.moon, 0.3 + 0.3 * Math.sin(t * 2 + s));
    }
    glow(820, 330, 54, C.moon, 0.9);
    game.draw.circle(840, 320, 46, '#e8dca8');
    // 遠景: 枯れ木の影(ゆっくり動く)
    var par = cr * 4;
    for (var tr = 0; tr < 6; tr++) {
      var tx = ((tr * 230 + 60) % (W + 100)) - 50, ty = 520 + par % 40;
      game.draw.rect(tx - 8, ty - 170, 16, 170, '#1a1430');
      game.draw.line(tx, ty - 120, tx - 60, ty - 180, '#1a1430', 8);
      game.draw.line(tx, ty - 90, tx + 50, ty - 150, '#1a1430', 6);
    }
    game.draw.gradient(480, 600, [[0, 'rgba(138,138,176,0)'], [0.5, 'rgba(138,138,176,0.35)'], [1, 'rgba(138,138,176,0)']]);
  }

  function drawWater(cr) {
    var t = game.time.elapsed;
    game.draw.gradient(540, 1440, [[0, C.water2], [1, C.water]]);
    // さざ波(1倍速)
    var base = Math.floor(cr * 2) / 2;
    for (var j = -2; j < 16; j++) {
      var k = base + j * 0.5 - cr;
      var y = rowY(k) + ROW_H * 0.5;
      if (y < 560 || y > 1440) continue;
      var s = rowS(k);
      var x0 = (j * 157 + Math.floor(t * 30)) % 300;
      for (var x = x0 - 300; x < W; x += 300) game.draw.rect(x, y, 120 * s, 4, '#3a7a84', 0.5);
    }
    // 近景: 両岸の葦(0.7倍速の視差)
    for (var r = -2; r < 12; r++) {
      var kk = r - (cr * 0.7) % 1;
      var ry = rowY(kk);
      if (ry < 560 || ry > 1480) continue;
      var sc = rowS(kk);
      for (var side = -1; side <= 1; side += 2) {
        var rx = W / 2 + side * (470 + (r % 3) * 30) * sc;
        for (var b = 0; b < 4; b++) {
          var bx = rx + (b - 1.5) * 16 * sc, sw = Math.sin(t * 1.5 + r + b) * 8;
          game.draw.line(bx, ry, bx + sw, ry - (110 + b * 20) * sc, C.reed, 7 * sc);
          game.draw.rect(bx + sw - 5 * sc, ry - (130 + b * 20) * sc, 10 * sc, 26 * sc, '#5a3a22');
        }
      }
    }
  }

  function drawLog(r, cr) {
    var k = r - cr;
    if (k < -1.4 || k > 6.5) return;
    var y = rowY(k), s = rowS(k);
    var x = W / 2 + xOff(r);
    var hz = rowHaz[r] || {};
    var lift = 0, sinkA = 1, jitter = 0, edge = null, flash = false;
    if (hz.rise) {
      var lr = hz.rise.t - clock;
      if (lr <= TELE_T && lr > 0) {
        jitter = Math.sin(clock * 60) * 5;
        edge = Math.floor(clock * 10) % 2 === 0 ? C.lamp : C.red;
        for (var bb = 0; bb < 3; bb++) game.draw.circle(x + 250 * s + Math.sin(clock * 8 + bb) * 14, y + 20 - ((clock * 120 + bb * 20) % 50), 7 * s, C.white, 0.6);
      } else if (lr <= 0 && lr > -0.45) {
        lift = Math.sin(Math.PI * (-lr / 0.45)) * 60;
      }
      if (hitStop > 0 && hitObj === hz.rise) flash = true;
    }
    if (hz.sink) {
      var ls = hz.sink.t - clock;
      if (ls <= TELE_T && ls > 0) {
        sinkA = 0.75;
        ring(x, y, (120 + (1 - ls / TELE_T) * 200) * s, (30 + (1 - ls / TELE_T) * 40) * s, '#9ad0e0', 4);
        for (var q = 0; q < 4; q++) game.draw.circle(x - 200 * s + q * 130 * s, y - 10 - ((clock * 90 + q * 17) % 40), 6 * s, C.white, 0.5);
      } else if (ls <= 0 && ls > -0.45) {
        sinkA = 0.25;
        ring(x, y, 280 * s, 50 * s, '#9ad0e0', 5);
      }
      if (hitStop > 0 && hitObj === hz.sink) flash = true;
    }
    var w = 520 * s, h = 64 * s;
    var ly = y - lift;
    if (lift > 0) game.draw.rect(x - w / 2, y + h * 0.2, w, h * 0.5, '#000000', 0.3);
    var X = x + jitter;
    if (flash) {
      game.draw.rect(X - w / 2 - 10, ly - h / 2 - 10, w + 20, h + 20, C.white);
      return;
    }
    game.draw.rect(X - w / 2 - 4, ly - h / 2 - 4, w + 8, h + 8, edge || C.ink, sinkA);
    game.draw.rect(X - w / 2, ly - h / 2, w, h, sinkA < 1 ? C.sink : C.log, sinkA < 1 ? 0.9 : 1);
    game.draw.rect(X - w / 2, ly - h / 2, w, h * 0.28, C.logHi, sinkA);
    for (var m = 0; m < 5; m++) game.draw.rect(X - w / 2 + (60 + m * 95) * s, ly - h * 0.1, 36 * s, 6 * s, '#4a2e18', sinkA);
    game.draw.circle(X - w / 2, ly, h / 2 + 3, C.ink, sinkA);
    game.draw.circle(X + w / 2, ly, h / 2 + 3, C.ink, sinkA);
    game.draw.circle(X - w / 2, ly, h / 2, C.logEnd, sinkA);
    game.draw.circle(X + w / 2, ly, h / 2, C.logEnd, sinkA);
    game.draw.circle(X + w / 2, ly, h / 4, C.ring, sinkA);
    game.draw.circle(X - w / 2, ly, h / 4, C.ring, sinkA);
    // カエル(拍で喉がふくらむ。抜ける小節は目を閉じる)
    if (r > 0 && r % 3 === 1) {
      var side = r % 2 ? -1 : 1;
      var fx = x + side * (w / 2 + 70 * s), fy = y + 4;
      game.draw.circle(fx, fy + 10 * s, 46 * s, '#2f6a3a');
      var quiet = isBreakBeat(Math.max(0, lastBeat)) || isBreakBeat(lastBeat + 1);
      if (!quiet) game.draw.circle(fx, fy + 16 * s, (10 + beatPulse * 14) * s, '#f0e070');
      game.draw.sprite(quiet ? FROG_SHUT : FROG, { e: '#f0f0e0', K: C.ink, g: C.frog, k: C.ink }, fx, fy - 8 * s, 8 * s, { anchor: 'center' });
    }
  }

  function drawHouse(cr) {
    var k = totalRows + 1.3 - cr;
    if (k > 7) return;
    var y = rowY(k), s = rowS(k);
    game.draw.rect(0, y - 20 * s, W, 140 * s, '#1e2a1e');
    glow(W / 2 + 40 * s, y - 120 * s, 40 * s, C.lamp, 0.5);
    game.draw.sprite(HOUSE, { k: C.ink, R: '#6a3a3a', w: '#8a7a6a', y: '#ffd870', d: '#4a3020' }, W / 2, y - 120 * s, 22 * s, { anchor: 'center' });
  }

  function drawMan(cr) {
    var t = game.time.elapsed;
    var hop = 0, jumping = false;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.row < 0 || b.act === 'wait') continue;
      var k = (clock - b.t) / STEP_T;
      if (k > 0 && k < 1) { hop = Math.sin(Math.PI * k) * (b.act === 'jump' ? 120 : 26); jumping = b.act === 'jump'; }
    }
    if (holdVis > 0) jumping = true;
    var r = Math.round(cr);
    var fr = Math.floor(cr), fk = cr - fr;
    var x = W / 2 + xOff(fr) + (xOff(fr + 1) - xOff(fr)) * fk;
    var pal = soakT > 0 ? WET_PAL : MAN_PAL;
    var spr = jumping ? JUMP : WALK[(r + 100) % 2];
    var sink = soakT > 0 ? 40 : 0;
    var y = Y0 - 120 - hop + sink + (pressFx > 0 ? 8 : 0);
    game.draw.circle(x, Y0 + 6, 70 - Math.min(40, hop * 0.3), '#000000', 0.35);
    // ランタン: 拍の頭で左右に振り切れる振り子(伴奏が抜けても揺れ続ける)
    var sw = Math.cos(Math.PI * clock / SPB) * 0.45;
    var hx = x + 70, hy = y - 70;
    var lx = hx + Math.sin(sw) * 110, ly = hy - Math.cos(sw) * 110 + 40;
    game.draw.line(hx, hy + 40, hx, hy - 60, '#5a3a22', 8);
    game.draw.line(hx, hy - 60, lx, ly - 30, '#c8c0a0', 3);
    var lightR = 70 + (LIVES - nMiss) * 25;
    if (nMiss < LIVES || demoMode) glow(lx, ly, 28 + beatPulse * 6, C.lamp, 0.55);
    game.draw.sprite(LANTERN, { k: C.ink, y: nMiss < LIVES || demoMode ? '#ffe080' : '#4a4a4a' }, lx, ly, 10, { anchor: 'center' });
    if (hitStop > 0) glow(x, y, 90, C.white, 0.5);
    game.draw.sprite(spr, pal, x, y, hitStop > 0 ? 12 : 10, { anchor: 'center' });
    if (soakT > 0) ring(x, Y0, 120, 30, '#9ad0e0', 4);
    return { lx: lx, ly: ly, r: lightR };
  }

  function drawSplashes(dt) {
    for (var i = splashes.length - 1; i >= 0; i--) {
      var s = splashes[i];
      s.t += dt;
      if (s.ring) {
        if (s.t > 0.6) { splashes.splice(i, 1); continue; }
        ring(s.x, s.y, 80 + s.t * 260, 20 + s.t * 60, '#9ad0e0', 4);
        continue;
      }
      if (s.t > 0.7) { splashes.splice(i, 1); continue; }
      s.vy += 1400 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      game.draw.circle(s.x, s.y, 12 * (1 - s.t), '#bfe6f4', 0.85);
    }
  }

  function drawScene(dt) {
    var cr = camRow();
    drawSky(cr);
    drawWater(cr);
    drawHouse(cr);
    for (var r = Math.ceil(cr + 6.5); r >= Math.floor(cr - 1.4); r--) {
      if (r < 0 || r > totalRows) continue;
      if (r === 0) {
        var y0 = rowY(-cr);
        if (y0 < 1500) game.draw.rect(0, y0 - 30, W, 300, '#1e2a1e');
        continue;
      }
      drawLog(r, cr);
    }
    var lamp = drawMan(cr);
    drawSplashes(dt);
    // 夜の暗さ(奥ほど濃い) → ランタンの光(MISSで小さくなる)
    game.draw.gradient(540, 1440, [[0, 'rgba(8,6,20,0.55)'], [0.6, 'rgba(8,6,20,0.25)'], [1, 'rgba(8,6,20,0.1)']]);
    game.draw.circle(lamp.lx, lamp.ly + 120, lamp.r * 2.6, C.lamp, 0.06);
    game.draw.circle(lamp.lx, lamp.ly + 60, lamp.r * 1.6, C.lamp, 0.08);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.12);
  }

  function drawPad() {
    game.draw.gradient(1440, H, [[0, '#2a2030'], [1, '#120c18']]);
    game.draw.rect(0, 1440, W, 8, C.lamp, 0.5);
    var pr = gest ? Math.min(1, (clock - gest.tp) / HOLD_T) : 0;
    // 左: 短いタップ=一歩 / 右: 長押し=跳ぶ(輪が満ちる)
    var items = [[290, false], [790, true]];
    for (var i = 0; i < 2; i++) {
      var cx = items[i][0], cy = 1680, hold = items[i][1];
      var lit = gest && (hold ? pr >= 1 : pr < 1);
      game.draw.circle(cx, cy, 170, C.ink);
      game.draw.circle(cx, cy, 160, lit ? '#4a3a5a' : '#2e2438');
      game.draw.sprite(hold ? JUMP : WALK[0], MAN_PAL, cx, cy - 30 - (hold ? 30 : 0), 6, { anchor: 'center', alpha: lit ? 1 : 0.7 });
      game.draw.rect(cx - 90, cy + 90, 180, 10, '#7a5030');
      if (hold) {
        ring(cx, cy, 140, 140, '#5a4a6a', 8);
        var seg = 24, filled = Math.floor((gest ? pr : (Math.sin(game.time.elapsed * 2) * 0.5 + 0.5) * 0.3) * seg);
        for (var sgi = 0; sgi < filled; sgi++) {
          var a0 = -Math.PI / 2 + sgi / seg * Math.PI * 2, a1 = -Math.PI / 2 + (sgi + 1) / seg * Math.PI * 2;
          game.draw.line(cx + Math.cos(a0) * 140, cy + Math.sin(a0) * 140, cx + Math.cos(a1) * 140, cy + Math.sin(a1) * 140, C.lamp, 10);
        }
        game.draw.line(cx - 50, cy - 120, cx, cy - 150, C.lamp, 6); game.draw.line(cx, cy - 150, cx + 50, cy - 120, C.lamp, 6);
      } else {
        game.draw.circle(cx, cy - 135, 12, C.lamp, gest && pr < 1 ? 1 : 0.6);
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#0c0a18', 0.94);
    game.draw.rect(0, 224, W, 6, C.lamp, 0.5);
    label('SCORE ' + score, 40, 64, 46, C.moon, 'left');
    label(crossed + ' / ' + totalRows, 40, 132, 34, C.lamp, 'left');
    if (combo >= 2) label('x' + combo, 600, 64, 46, C.lamp, 'center');
    // ランタンの火(MISSで消えていく)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - nMiss;
      var fx = 820 + i * 62;
      if (on) glow(fx, 58, 12, C.lamp, 0.5);
      game.draw.sprite(LANTERN, { k: C.ink, y: on ? '#ffe080' : '#3a3440' }, fx, 62, 9, { anchor: 'center' });
    }
    // 小節の帯: 暗いマス=伴奏が抜ける小節、今の小節は明るい枠
    var bars = Math.ceil(beats.length / 4);
    var cur = Math.floor(Math.max(0, clock) / (SPB * 4));
    var bw = Math.min(90, 680 / bars);
    for (var b = 0; b < bars; b++) {
      var bx = 330 + b * bw;
      var brk = !!breakArr[b];
      game.draw.rect(bx, 150, bw - 8, 52, b === cur ? C.lamp : C.ink);
      game.draw.rect(bx + 4, 154, bw - 16, 44, brk ? '#1a1626' : '#2f6a3a');
      if (!brk) game.draw.circle(bx + (bw - 8) / 2, 176, 9 + (b === cur ? beatPulse * 8 : 0), '#f0e070');
      else { game.draw.line(bx + 16, 176, bx + bw - 24, 176, '#5a5470', 5); }
      if (b === cur && clock >= 0) {
        var ph = (clock / SPB) % 4;
        game.draw.rect(bx + 4 + (bw - 16) * ph / 4, 146, 4, 60, C.white, 0.9);
      }
    }
    var quiet = isBreakBeat(Math.max(0, lastBeat));
    game.draw.sprite(quiet ? FROG_SHUT : FROG, { e: '#f0f0e0', K: C.ink, g: C.frog, k: C.ink }, 275, 176, 7 + (quiet ? 0 : beatPulse * 2), { anchor: 'center' });
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.4;
    game.draw.rect(40, y0, W - 80, hh, '#0c0a18', 0.92);
    game.draw.rect(60, y0 + 18, W - 120, 6, C.lamp, 0.6);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.lamp : C.red);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.moon);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.448, 34, C.moon);
    label(crossed + ' / ' + totalRows, W / 2, H * 0.495, 52, C.lamp);
    label('COMBO ' + maxCombo, W / 2, H * 0.535, 38, C.moon);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.58, 58, C.lamp);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.58, 42, C.moon);
    if (!won) label('あと' + Math.max(1, totalRows - crossed) + '本!', W / 2, H * 0.625, 50, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.69, 36, C.moon);
  }

  // ---- ATTRACT: 実ロジックで タップ→タップ→長押し→タップ→待つ→…。偶数周は沈む拍で一歩出して落水 ----
  var demo = { t: 0, cyc: 0, next: 0, x: 540, y: 1680, press: 0, holdUntil: -1 };
  var DEMO_CYC = DEMO_ACTS.length * SPB + 0.3 + 1.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.next = 0; demo.holdUntil = -1; }
    if (demo.press > 0) demo.press -= dt;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (clock < endT + 0.3) stepRun(dt);
    if (gest && demo.holdUntil >= 0 && clock >= demo.holdUntil) { pressEnd(); demo.holdUntil = -1; }
    var b = beats[demo.next];
    if (!b) return;
    if (b.act === 'rest') { demo.next++; return; }
    var act = b.act;
    if (act === 'wait' && demo.cyc % 2 === 0) act = 'step';
    var tx = act === 'jump' ? 790 : 290;
    if (act !== 'wait') {
      demo.x += (tx - demo.x) * Math.min(1, dt * 8);
      demo.y += (1680 - demo.y) * Math.min(1, dt * 8);
    }
    if (clock >= b.t - 0.005) {
      if (act !== 'wait' && !gest) {
        pressStart();
        demo.press = act === 'jump' ? 0.36 : 0.12;
        demo.holdUntil = clock + (act === 'jump' ? 0.32 : 0.07);
      }
      demo.next++;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    soakT = Math.max(0, soakT - dt); holdVis = Math.max(0, holdVis - dt); pressFx = Math.max(0, pressFx - dt);

    if (state === S.ATTRACT) {
      if (!beats) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      drawPad();
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#0c0a18', 0.94);
      glow(W / 2, 100, 60, C.lamp, 0.1 + Math.sin(t * 3) * 0.04);
      label(GAME_TITLE, W / 2, 104, 88, C.lamp);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.moon);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.lamp);
      else label('TAP TO START', W / 2, H * 0.965, 40, C.moon);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene(dt);
      drawPad();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { hitStop = 0; finishRun(nMiss < LIVES); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(hitStop > 0 ? 0 : dt);
    drawPad();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.4, W, 170, '#0c0a18', 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 88, 100, C.lamp);
    }
    // 最初の一歩と最初の跳ぶ拍だけ、ゴーストの手を薄く出す
    for (var i = 0; i < beats.length && !over; i++) {
      var b = beats[i];
      if (b.res || b.act === 'rest' || b.act === 'wait') continue;
      if (b.n > 7 || clock < b.t - 0.7) break;
      game.draw.hand(b.act === 'jump' ? 790 : 290, 1680, { press: clock >= b.t - 0.03, scale: 12, alpha: 0.5 });
      break;
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);

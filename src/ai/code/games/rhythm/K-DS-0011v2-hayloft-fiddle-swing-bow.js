// K-DS-0011v2-hayloft-fiddle-swing-bow.js
// 干し草小屋のスウィング弓 — 跳ねる拍に合わせて弓を上下にこすり続け、往復の返しが拍にそろうほど小屋じゅうに音が響く
// 操作: 画面下の弓を指で上下にこすり続ける。下へ引き始める瞬間(返し)を拍の頭に、上へ戻し始める瞬間を跳ねた裏(拍の2/3)に合わせる(長い下げ・短い上げ)。返しの瞬間ごとに拍からのずれでPERFECT/GOOD/MISS。そろうほど響きのメーターが上がり踊り手が増える。拍を外した返し・返し損ねは響きが下がる。呼び込み役が両手を上げて灯が赤く瞬く拍(止め)は弓を止めて待つ(止めの拍で返すとキーッと鳴ってMISS)
// 終わり: 7小節(14秒)弾き終えた時に響きが金の線を越えていればCLEAR(判定の点×響き)。止めの拍で3回鳴らすか、響きが線に届かなければGAME OVER
// @mechanic: rub
// @theme: harvest_barn_fiddle_swing
// 世界観: 秋の収穫祭の干し草小屋で、村のフィドル弾きが跳ねる拍に合わせて弦を弓で上下にこすり続け、返しがそろうほど響く音で踊りの輪を盛り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・響きの%・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 70s VECTOR

(function(game) {
  var STYLE = { bg: ['#020308', '#0b0a1c'], main: ['#ffb347', '#7ff6ff', '#e8f4ff'], accent: ['#ff4f9a', '#ffe46b'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線だけ。塗りは使わず、太さ違いの線を重ねて光らせる。発光色は琥珀・水色・桃の3色
  var C = { bg: STYLE.bg[0], bg2: STYLE.bg[1], amber: STYLE.main[0], cyan: STYLE.main[1], white: STYLE.main[2], pink: STYLE.accent[0], gold: STYLE.accent[1] };

  var GAME_TITLE = 'HAYLOFT SWING';
  var BPM = 120;
  var SPB = 60 / BPM;
  var SWING = 2 / 3;          // 跳ねる裏の位置(拍の2/3)
  var LEAD = 0.06;
  var PERFECT_W = 0.035;
  var GOOD_W = 0.06;          // まっすぐな8分(裏=拍の1/2)だと上げの返しが0.083秒ずれてMISSになる
  var SWEEP_LAG = 0.3;        // 返しは指が離れてから分かるので、返し損ねの判定はこれだけ待つ
  var TOTAL_BEATS = 28;       // 7小節
  var TIME_LIMIT = 14;
  var INTRO_BEATS = 4;        // 1小節目は返し損ねを数えない
  var STOPS = [11, 19, 22, 23];
  var DEMO_STOPS = [7];
  var DEMO_BEATS = 12;
  var SQUEAK_MAX = 3;
  var GOAL = 0.7;
  var HYST = 36, REST = 10;

  var BOW_X = 760, STR_Y = 1612, BOW_MIN = Math.round(H * 0.77), BOW_MAX = Math.round(H * 0.965);
  var TRACK_Y = 476, TRACK_X = 100, CELL = 220;
  var METER_Y = 300;

  // フィドルの旋律(オリジナル): 返し1回につき1音。下げ(拍頭)と上げ(跳ねた裏)の交互で2小節16音
  var TUNE = ['G4', 'B4', 'D5', 'B4', 'G5', 'F#5', 'E5', 'D5', 'C5', 'E5', 'G5', 'E5', 'D5', 'C5', 'B4', 'A4'];
  var ROOTS = [['G2', 'D3', 'B4'], ['G2', 'D3', 'D5'], ['C3', 'G2', 'E5'], ['G2', 'D3', 'B4'], ['D3', 'A2', 'F#5'], ['C3', 'G2', 'E5'], ['G2', 'D3', 'G4']];

  // ---- スプライト(輪郭だけのドット。発光は重ね描き) ----
  var FIDDLER_A = ['...oooo...', '..o....o..', '.oooooooo.', '..o.oo.o..', '..o....o..', '...oooo...', '....oo....', '.ooooooo.o', 'o..o..o.o.', 'o..o..oo..', '...o..o...', '...oooo...', '...o..o...', '..oo..oo..'];
  var FIDDLER_B = ['..........', '...oooo...', '..o....o..', '.oooooooo.', '..o.oo.o..', '..o....o..', '...oooo...', '.ooooooo.o', 'o..o..o.o.', 'o..o..oo..', '...o..o...', '...oooo...', '...o..o...', '..oo...oo.'];
  var DANCER_A = ['..ooo..', '..o.o..', '..ooo..', 'o..o..o', '.ooooo.', '...o...', '..o.o..', '.o...o.'];
  var DANCER_B = ['..ooo..', '..o.o..', '..ooo..', '...o...', '.ooooo.', 'o..o..o', '..o.o..', '.o..o..'];
  var CALLER_UP = ['o.ooo.o', 'o.o.o.o', 'o.ooo.o', '.ooooo.', '...o...', '...o...', '..o.o..', '.o...o.'];
  var CALLER = ['..ooo..', '..o.o..', '..ooo..', '...o...', '.ooooo.', 'o..o..o', '..o.o..', '.o...o.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, stops, endBeats, running, songT, beatN, schedBar, gridK, readyT, hitStop, flashT, beatPulse;
  var bow, used, res, score, perfects, goods, misses, squeaks, combo, maxCombo, over, won, outroT, prevBest, milestone, judgeW, judgeT, bowGlow, warnBeat;

  function isStop(b) { for (var i = 0; i < stops.length; i++) if (stops[i] === b) return true; return false; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    stops = demoMode ? DEMO_STOPS : STOPS;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    running = false; songT = 0; beatN = 0; schedBar = 0; gridK = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; beatPulse = 0;
    bow = { down: false, y: (BOW_MIN + BOW_MAX) / 2, ey: 0, et: 0, dir: 0 };
    used = {}; res = 0.2;
    score = 0; perfects = 0; goods = 0; misses = 0; squeaks = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = 0;
    judgeW = ''; judgeT = 0; bowGlow = 0; warnBeat = -1;
    if (demoMode) startClock();
  }

  function startClock() { running = true; songT = 0; beatN = 0; schedBar = 0; gridK = 0; onBeat(0); }

  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // 伴奏: ベースは拍頭(長)、刻みは跳ねた裏(短)。止めの拍は全部休む
  function playBar(n) {
    if (demoMode) return;
    var ch = ROOTS[n % ROOTS.length], mel = [], bass = [];
    for (var i = 0; i < 4; i++) {
      var b = n * 4 + i;
      if (isStop(b)) { mel.push(['R', 1]); bass.push(['R', 1]); continue; }
      mel.push(['R', SWING]); mel.push([ch[2], 1 - SWING]);
      bass.push([i % 2 === 0 ? ch[0] : ch[1], SWING]); bass.push(['R', 1 - SWING]);
    }
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.03, bass: bass, bassWave: 'triangle', bassVolume: 0.09 });
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    if (isStop(b)) return;
    beatPulse = 1;
    sfxTone(b % 4 === 0 ? 1400 : 1100, 0.02, { wave: 'square', volume: b % 4 === 0 ? 0.04 : 0.025 });
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar * 4 < endBeats && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
    // 予告: 止めの拍の1.25拍前(0.625秒)から呼び込み役が両手を上げ、灯が桃色に瞬く
    for (var s = 0; s < stops.length; s++) {
      var st = stops[s] * SPB;
      if (warnBeat !== stops[s] && songT >= st - 1.25 * SPB && songT < st && !isStop(stops[s] - 1)) {
        warnBeat = stops[s];
        sfxTone(1760, 0.09, { wave: 'triangle', volume: 0.07, slide: -600 });
      }
    }
    // 返し損ね: 窓が過ぎた格子点
    while (gridK < endBeats * 2) {
      var b = Math.floor(gridK / 2), gt = (b + (gridK % 2 ? SWING : 0)) * SPB;
      if (songT <= gt + GOOD_W + SWEEP_LAG) break;
      if (!used[gridK] && !isStop(b) && b >= INTRO_BEATS) { res = Math.max(0, res - 0.02); combo = 0; }
      gridK++;
    }
    if (songT >= endBeats * SPB) {
      running = false;
      if (!demoMode && !over) finish(res >= GOAL);
    }
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(res >= GOAL);
  }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  function showJudge(w) { judgeW = w; judgeT = 0.45; }

  // 返し(弓の向きが変わった瞬間)を1回の打鍵として判定する。d=1 下げ(拍頭) / d=-1 上げ(跳ねた裏)
  function strokeAt(d, T) {
    if (!running || hitStop > 0) return 'none';
    var off0 = d > 0 ? 0 : SWING;
    var k = Math.max(0, Math.round(T / SPB - off0));
    if (k >= endBeats) return 'none';
    var off = T - (k + off0) * SPB;
    var key = k * 2 + (d > 0 ? 0 : 1);
    if (isStop(k)) { squeak(); return 'miss'; }
    var w = judge(off);
    if (w === 'MISS' || used[key]) {
      misses++; combo = 0; res = Math.max(0, res - 0.05);
      showJudge('MISS');
      game.fx.burst(BOW_X, STR_Y, { color: C.pink, count: 5, speed: 160 });
      sfxTone(150, 0.08, { wave: 'sawtooth', volume: 0.04 });
      return 'miss';
    }
    used[key] = 1;
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') { perfects++; res = Math.min(1, res + 0.06); score += Math.round(100 * (1 + res)); }
    else { goods++; res = Math.min(1, res + 0.04); score += Math.round(50 * (1 + res)); }
    showJudge(w);
    bowGlow = 0.2;
    sfxTone(TUNE[key % TUNE.length], d > 0 ? 0.3 : 0.15, { wave: 'sawtooth', volume: 0.025 + res * 0.09 });
    game.fx.burst(BOW_X, STR_Y, { color: w === 'PERFECT' ? C.gold : C.amber, count: 4 + Math.round(res * 8), speed: 200 + res * 200 });
    if (combo > 0 && combo % 16 === 0 && milestone < combo) {
      milestone = combo;
      if (demoMode) game.fx.popup(combo + ' COMBO', W / 2, H * 0.36, { color: C.gold, size: 70 });
      else {
        game.audio.play('se_milestone', 0.4);
        game.feedback.good(W / 2, H * 0.36, { text: combo + ' COMBO', color: C.gold, size: 70, count: 16, volume: 0.2 });
      }
    }
    return 'ok';
  }

  function squeak() {
    squeaks++; misses++; combo = 0; res = Math.max(0, res - 0.15);
    showJudge('MISS');
    hitStop = 0.42; flashT = 0.42;
    if (demoMode) {
      game.fx.popup('MISS', BOW_X, STR_Y - 260, { color: C.pink, size: 56 }); game.fx.shake(4, 0.2);
      // デモは失敗を1回見せたら、止めの拍が終わるまで弓を上で止めて待つ
      demo.hold = true; bow.dir = 0; bow.ey = BOW_MIN + 30; bow.et = songT; bow.y = bow.ey;
    } else {
      game.audio.tone(1900, 0.2, { wave: 'sawtooth', volume: 0.08, slide: 500 });
      game.feedback.bad(BOW_X, STR_Y - 260, { text: 'MISS', shake: 10 });
    }
    if (!demoMode && squeaks >= SQUEAK_MAX) finish(false);
  }

  // 指の上下の動きから「返し」を見つける(行き止まりの時刻を返しの瞬間とする)
  function bowMove(y) {
    if (!bow.down) return 'none';
    bow.y = Math.max(BOW_MIN, Math.min(BOW_MAX, y));
    var dy = y - bow.ey;
    if (bow.dir === 0) {
      if (Math.abs(dy) < REST) { bow.et = songT; return 'none'; }
      if (Math.abs(dy) < HYST) return 'none';
      bow.dir = dy > 0 ? 1 : -1;
      var r0 = strokeAt(bow.dir, bow.et);
      bow.ey = y; bow.et = songT;
      return r0;
    }
    if (dy * bow.dir >= 0) { bow.ey = y; bow.et = songT; return 'none'; }
    if (-dy * bow.dir < REST) { bow.et = songT; return 'none'; }
    if (-dy * bow.dir >= HYST) {
      bow.dir = -bow.dir;
      var r1 = strokeAt(bow.dir, bow.et);
      bow.ey = y; bow.et = songT;
      return r1;
    }
    return 'none';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false; bow.down = false;
    if (ok) {
      score += Math.round(res * 500);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(700, 1300), { color: i % 2 ? C.amber : C.gold, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    if (judgeT > 0) judgeT -= dt;
    if (bowGlow > 0) bowGlow -= dt;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over) return;
    bow.down = true; bow.dir = 0; bow.ey = y; bow.et = songT;
    bow.y = Math.max(BOW_MIN, Math.min(BOW_MAX, y));
    game.audio.tone(300, 0.04, { wave: 'triangle', volume: 0.03 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || over) return;
    var r = bowMove(y);
    if (r === 'miss') game.fx.shake(3, 0.08);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (bow.down) game.audio.tone(220, 0.03, { wave: 'triangle', volume: 0.02 });
    bow.down = false; bow.dir = 0;
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画(線だけ) ----
  function vl(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '30', w * 3.4);
    game.draw.line(x1, y1, x2, y2, col + '80', w * 1.9);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function vpoly(pts, col, w, closed) {
    for (var i = 0; i + 1 < pts.length; i++) vl(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, w);
    if (closed) vl(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], col, w);
  }
  function vcirc(x, y, rx, ry, col, w, n) {
    var pts = [];
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
    vpoly(pts, col, w, true);
  }
  function vrect(x, y, w, h, col, lw) { vpoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, lw, true); }
  function vsprite(art, col, x, y, px) {
    game.draw.sprite(art, { o: col }, x, y, px * 1.15, { anchor: 'center', alpha: 0.25 });
    game.draw.sprite(art, { o: col }, x, y, px, { anchor: 'center' });
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col + '55', bold: true, align: align || 'center' });
    game.draw.text(str, x, y - 2, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function warnOn() {
    for (var s = 0; s < stops.length; s++) {
      var st = stops[s] * SPB;
      if (songT >= st - 1.25 * SPB && songT < st + SPB) return true;
    }
    return false;
  }

  function drawBarn() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [0.5, C.bg], [1, C.bg]]);
    var warn = running && warnOn();
    var blink = warn && Math.floor(t * 10) % 2 === 0;
    // 屋根・柱・梁
    vpoly([[40, 800], [540, 560], [1040, 800]], C.amber, 4, false);
    vl(100, 772, 100, 1390, C.amber, 3); vl(980, 772, 980, 1390, C.amber, 3);
    vl(100, 880, 980, 880, C.amber, 2);
    vl(40, 1390, 1040, 1390, C.amber, 3);
    // 屋根裏の干し草の束
    for (var h = 0; h < 4; h++) {
      var hx = 150 + h * 120 + (h > 1 ? 320 : 0), hy = 800;
      vrect(hx, hy, 100, 70, C.amber, 2);
      for (var k = 1; k < 4; k++) vl(hx + k * 25, hy + 6, hx + k * 25 - 12, hy + 64, C.amber, 1);
    }
    // 床の干し草とかぼちゃ
    for (var f = 0; f < 2; f++) { var fx = f ? 860 : 130; vrect(fx, 1300, 110, 80, C.amber, 2); vl(fx, 1340, fx + 110, 1340, C.amber, 1); }
    vcirc(310, 1360, 34, 26, C.amber, 3, 10); vcirc(780, 1360, 30, 22, C.amber, 3, 10);
    // 灯(拍と響きで明るさが変わる。止めの予告で桃色に瞬く)
    for (var l = 0; l < 2; l++) {
      var lx = l ? 800 : 280, ly = 720;
      vl(lx, 640 + l * 40, lx, ly - 30, C.white, 1);
      var lc = blink ? C.pink : C.gold;
      vcirc(lx, ly, 26 + beatPulse * 6 + res * 10, 30 + beatPulse * 6 + res * 10, lc, 3, 8);
      if (res > 0.4 || blink) vcirc(lx, ly, 48 + res * 20, 52 + res * 20, lc, 1, 10);
    }
    // 呼び込み役(止めの予告で両手を上げる)
    vsprite(warn ? CALLER_UP : CALLER, warn ? C.pink : C.cyan, 540, 700, 10);
    // 踊りの輪: 響きが高いほど踊り手が増える
    var dancing = Math.floor(res * 6.99);
    var xs = [170, 290, 410, 670, 790, 910];
    var step = Math.floor(songT / SPB) % 2;
    for (var d = 0; d < 6; d++) {
      var on = d < dancing && running;
      var hop = on ? -Math.abs(Math.sin((songT / SPB) * Math.PI)) * 30 : 0;
      vsprite(on && step ? DANCER_B : DANCER_A, on ? C.cyan : '#3a5a66', xs[d], 1300 + hop, 10);
    }
    // フィドル弾き
    var fb = Math.floor(songT / SPB) % 2;
    vsprite(fb ? FIDDLER_B : FIDDLER_A, C.white, 540, 1150, 12);
  }

  function drawMeter() {
    var x0 = TRACK_X, x1 = W - TRACK_X, w = x1 - x0;
    vrect(x0, METER_Y - 30, w, 60, C.amber, 2);
    for (var x = x0 + 10; x < x0 + w * res; x += 14) vl(x, METER_Y - 20, x, METER_Y + 20, C.amber, 3);
    var gx = x0 + w * GOAL;
    vl(gx, METER_Y - 50, gx, METER_Y + 50, C.gold, 4);
    label(Math.round(res * 100) + '%', x1, METER_Y + 92, 40, res >= GOAL ? C.gold : C.amber, 'right');
  }

  // 跳ねる拍の帯: 1拍 = 長い下げ(水色) + 短い上げ(琥珀)
  function drawTrack() {
    var bar = Math.floor(beatN / 4);
    for (var i = 0; i < 4; i++) {
      var b = bar * 4 + i, cx = TRACK_X + i * CELL;
      if (isStop(b)) {
        vl(cx + 40, TRACK_Y - 40, cx + CELL - 40, TRACK_Y + 40, C.pink, 4);
        vl(cx + 40, TRACK_Y + 40, cx + CELL - 40, TRACK_Y - 40, C.pink, 4);
        continue;
      }
      var dw = CELL * SWING - 12, uw = CELL * (1 - SWING) - 12;
      var dk = used[b * 2], uk = used[b * 2 + 1];
      vrect(cx + 4, TRACK_Y - 26, dw, 52, C.cyan, dk ? 5 : 2);
      vpoly([[cx + dw / 2 - 20, TRACK_Y - 10], [cx + dw / 2, TRACK_Y + 10], [cx + dw / 2 + 20, TRACK_Y - 10]], C.cyan, 2, false);
      vrect(cx + dw + 12, TRACK_Y - 26, uw, 52, C.amber, uk ? 5 : 2);
      vpoly([[cx + dw + 12 + uw / 2 - 14, TRACK_Y + 8], [cx + dw + 12 + uw / 2, TRACK_Y - 8], [cx + dw + 12 + uw / 2 + 14, TRACK_Y + 8]], C.amber, 2, false);
    }
    if (running) {
      var pos = songT / SPB - bar * 4;
      var px = TRACK_X + pos * CELL;
      vl(px, TRACK_Y - 56, px, TRACK_Y + 56, C.white, 3);
    }
    if (judgeT > 0) label(judgeW, W / 2, TRACK_Y + 112, 58, judgeW === 'MISS' ? C.pink : (judgeW === 'PERFECT' ? C.gold : C.cyan));
  }

  function drawFiddle() {
    // 横に寝かせたフィドル(胴は8の字の輪郭)
    vcirc(470, 1640, 150, 120, C.amber, 3, 16);
    vcirc(700, 1640, 120, 100, C.amber, 3, 14);
    vl(600, 1590, 600, 1690, C.amber, 2);
    vrect(40, 1615, 300, 50, C.amber, 2);
    vcirc(60, 1640, 30, 34, C.amber, 2, 8);
    for (var s = 0; s < 4; s++) vl(60, STR_Y + s * 18, 880, STR_Y + s * 18, C.white, 1.5);
    vl(880, STR_Y - 6, 880, STR_Y + 62, C.amber, 3);
    // 弓(縦。指の上下でこする)
    var by = bow.y;
    var glow = bowGlow > 0 ? C.gold : C.cyan;
    var fl = flashT > 0 && Math.floor(flashT * 20) % 2 === 0;
    vl(BOW_X, by - 170, BOW_X, by + 170, fl ? C.white : glow, fl ? 9 : 5);
    vl(BOW_X + 22, by - 160, BOW_X + 22, by + 160, C.white, 2);
    vrect(BOW_X - 16, by + 140, 50, 46, glow, 3);
    if (fl) vcirc(BOW_X, STR_Y + 30, 140, 140, C.pink, 4, 12);
  }

  function drawScene() {
    drawBarn();
    drawMeter();
    drawTrack();
    drawFiddle();
  }

  function drawHud() {
    label('SCORE ' + score, 60, 96, 54, C.white, 'left');
    label('BEST ' + prevBest, 60, 166, 32, C.amber, 'left');
    label(combo + ' COMBO', W - 60, 96, 44, C.cyan, 'right');
    for (var i = 0; i < SQUEAK_MAX; i++) vcirc(W - 230 + i * 70, 164, 18, 18, i < squeaks ? C.pink : '#40405a', 3, 8);
    var progress = Math.min(1, songT / (endBeats * SPB));
    vl(0, 222, W * progress, 222, C.cyan, 3);
  }

  // ---- ATTRACT: 実ロジックで跳ねる拍どおりにこすり、止めの拍でもこすってMISSを見せる ----
  var demo = { t: 0, press: false, hold: false };
  var DEMO_LEN = DEMO_BEATS * SPB + 0.5;
  function demoY(t) {
    var p = t / SPB, f = p - Math.floor(p);
    var top = BOW_MIN + 30, bot = BOW_MAX - 30;
    if (f < SWING) return top + (bot - top) * (f / SWING);
    return bot - (bot - top) * ((f - SWING) / (1 - SWING));
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) {
      initGame(true);
      demo.hold = false;
      bow.down = true; bow.dir = 0; bow.ey = demoY(0); bow.et = 0; bow.y = bow.ey;
    }
    if (running && hitStop <= 0) {
      var nt = songT + dt;
      if (demo.hold && isStop(Math.floor(nt / SPB))) bowMove(BOW_MIN + 30);
      else bowMove(demoY(nt));
    }
    demo.press = bow.down;
    tickWorld(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(BOW_X + 40, bow.y, { press: demo.press, scale: 15 });
      label(GAME_TITLE, W / 2, 112, 82 + Math.sin(t * 3) * 3, C.amber);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.745, 50, C.gold);
      else label('TAP TO START', W / 2, H * 0.745, 46, C.cyan);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(70, H * 0.26, W - 140, H * 0.34, C.bg, 0.9);
      vrect(70, H * 0.26, W - 140, H * 0.34, won ? C.gold : C.pink, 3);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.gold : C.pink);
      label('SCORE ' + score, W / 2, H * 0.38, 58, C.white);
      label(Math.round(res * 100) + '%', W / 2, H * 0.43, 54, res >= GOAL ? C.gold : C.amber);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.47, 34, C.cyan);
      label(maxCombo + ' COMBO', W / 2, H * 0.505, 36, C.cyan);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 50, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 40, C.amber);
      if (!won && res < GOAL) label('あと' + Math.max(1, Math.round((GOAL - res) * 100)) + '%', W / 2, H * 0.23, 56, C.pink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.585, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, resonance: Math.round(res * 100), perfect: perfects, good: goods, miss: misses, squeak: squeaks, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      // 指を止めて待っている間は、返しの瞬間を「動き出し」に合わせて更新する
      if (bow.down && game.input.pressing && Math.abs(game.input.y - bow.ey) < REST) bow.et = songT;
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.cyan);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

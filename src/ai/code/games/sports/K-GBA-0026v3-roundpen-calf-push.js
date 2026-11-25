// K-GBA-0026v3-roundpen-calf-push.js
// 丸囲いの子牛押し — 押し寄せる子牛が拍ごとに見せる突っ込みの型(左・正面・右)を1拍前に見切り、表拍の頭で同じ側を受けた拍ごとに一歩ずつ押し返して、丸い囲いの奥の門から外へ出す
// 操作: 子牛は突っ込む1拍前に頭を下げた向きと頭上の札(左=黄・正面=赤・右=青)で型を見せ、その側の音を鳴らす。次の拍の頭に、画面の左/真ん中/右(下のパッドと同じ並び)をタップして受ける。合っていれば子牛が一歩下がり、違う側・拍ずれ・受け損ねは一歩押し込まれる。窓の外のタップは空振り(連続が切れるだけ)
// 終わり: 3頭(1頭目=1拍おきに左右だけ / 2頭目=毎拍・正面入り / 3頭目=毎拍・一歩多い)を門の外へ出せばCLEAR。手前の柵まで押し込まれたらGAME OVER、40拍(約23秒)で出し切れなければTIME UP
// @mechanic: push_out
// @theme: roundpen_calf_push
// 世界観: 牧場の丸い囲いの中で、若い牧童が次々に押し寄せる子牛の突っ込む向きを読んで受け止め、一歩ずつ押し返して奥の門から外の放牧地へ出していく
// 残るもの: 正誤(CLEAR/GAME OVER/TIME UP) + スコア・PERFECT/GOOD/MISS数・出した頭数・最大連続
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var STYLE = { bg: ['#7cc4f0', '#e6f2e0'], main: ['#8a5a32', '#5fa84a', '#c79a62'], accent: ['#ffc83a', '#ff5a4a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: キャラも柵も板(sprite)のまま、距離で px を変える。足元に楕円の接地影。奥ほど彩度を落とす
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], wood: STYLE.main[0], grass: STYLE.main[1], dirt: STYLE.main[2],
    yel: STYLE.accent[0], red: STYLE.accent[1], blue: '#4ab0ff', fog: '#cfdbd8', ink: '#22201c', white: '#ffffff',
    shadow: '#2a2418', grassFar: '#9cc08c', dirtFar: '#c4ad88'
  };
  var LANE_COL = { L: C.yel, C: C.red, R: C.blue };

  var GAME_TITLE = 'PEN PUSH';
  var BPM = 104, SPB = 60 / BPM;
  var BEATS = 40;
  var TIME_LIMIT = 23.1;               // 40拍 × 0.577秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.13;
  var START_P = 3;                     // 押し合いの位置(0=手前の柵に押し付けられる)
  var CALVES = [
    { need: 4, every: 2, types: ['L', 'R'] },
    { need: 4, every: 1, types: ['L', 'C', 'R'] },
    { need: 5, every: 1, types: ['L', 'C', 'R'] }
  ];

  // 擬似3D: 地面の z(奥行き)を画面に投影する
  var HOR = Math.round(H * 0.25), FY = 1000, FX = 900;
  var PEN_Z = 3.6, PEN_R = 2.5;
  function sy(z) { return HOR + FY / z; }
  function sx(X, z) { return W / 2 + X * FX / z; }
  function contactZ(p) { return 1.35 + p * 0.5; }
  var CALF_X = -0.2, HAND_X = 0.36;
  var FIG = 44;                        // 人物の板の大きさ(距離で割って px にする)

  // 伴奏(オリジナル): ブン・チャッの2ビートに乗るハーモニカ風の主旋律。4小節で一巡
  var LEAD = [
    [['G4', 1]], [['B4', 1]], [['D5', 1]], [['B4', 1]],
    [['C5', 1]], [['E5', 1]], [['D5', 0.5], ['B4', 0.5]], [['A4', 1]],
    [['B4', 1]], [['D5', 1]], [['G5', 1]], [['F#5', 0.5], ['E5', 0.5]],
    [['D5', 1]], [['A4', 1]], [['B4', 0.5], ['A4', 0.5]], [['G4', 1]]
  ];
  var BOOM = ['G2', 'B3', 'D3', 'B3', 'C3', 'E4', 'G2', 'D4', 'G2', 'B3', 'D3', 'B3', 'D3', 'C4', 'G2', 'B3'];
  var LANE_NOTE = { L: 'G4', C: 'C5', R: 'E5' };

  // ---- スプライト ----
  var CALF_HEAD = ['.ee......ee.', '..ebbbbbbe..', '...bwbbwb...', '...bkbbkb...', '...bbbbbb...', '....pppp....', '....pkkp....'];
  var CALF_BODY = [
    ['..bbbbbbbb..', '.bwwbbbbwwb.', '.bwwbbbbbbb.', '.bb.bbbb.bb.', '.bb......bb.', '.dd......dd.'],
    ['..bbbbbbbb..', '.bwwbbbbwwb.', '.bwwbbbbbbb.', '..bbbbbbbb..', '..bb....bb..', '..dd....dd..']
  ];
  function composeCalf(dx, dy, leg) {
    var rows = [], i, c;
    for (i = 0; i < 13; i++) rows.push('............'.split(''));
    var body = CALF_BODY[leg];
    for (i = 0; i < body.length; i++) for (c = 0; c < 12; c++) if (body[i][c] !== '.') rows[7 + i][c] = body[i][c];
    for (i = 0; i < CALF_HEAD.length; i++) {
      for (c = 0; c < 12; c++) {
        var ch = CALF_HEAD[i][c], rr = i + dy, cc = c + dx;
        if (ch !== '.' && rr >= 0 && rr < 13 && cc >= 0 && cc < 12) rows[rr][cc] = ch;
      }
    }
    return rows.map(function(r) { return r.join(''); });
  }
  // 子牛の型: 立ち / 左に頭を下げる / 右 / 正面に頭を下げる / 走り
  var CALF = { S: composeCalf(0, 0, 0), L: composeCalf(-2, 3, 0), R: composeCalf(2, 3, 0), C: composeCalf(0, 4, 0), RUN: composeCalf(0, 1, 1) };
  // 牧童(後ろ姿)。腕は押す向きへ伸びる線で描く
  var HAND = [
    ['...hhhhhh...', '.hhhhhhhhhh.', '....nnnn....', '....ssss....', '..vvvvvvvv..', '..vvvvvvvv..', '..vvvvvvvv..', '..vvvvvvvv..', '...jjjjjj...', '...jjjjjj...', '...jj..jj...', '...jj..jj...', '..bbb..bbb..'],
    ['...hhhhhh...', '.hhhhhhhhhh.', '....nnnn....', '....ssss....', '..vvvvvvvv..', '..vvvvvvvv..', '..vvvvvvvv..', '..vvvvvvvv..', '...jjjjjj...', '...jjjjjj...', '..jj....jj..', '..jj....jj..', '.bbb....bbb.']
  ];
  var POST = ['ww', 'ww', 'dd', 'ww', 'ww', 'dd', 'ww', 'ww', 'ww'];
  var TREE = ['...gggg...', '..gggggg..', '.gggggggg.', 'gggggggggg', '.gggggggg.', '..gggggg..', '....tt....', '....tt....'];
  var BARN = ['.....rr.....', '...rrrrrr...', '.rrrrrrrrrr.', 'rrrrrrrrrrrr', 'rrrwwwwwwrrr', 'rrrwddddwrrr', 'rrrwddddwrrr', 'rrrwddddwrrr'];

  // 奥ほど霧色へ寄せたパレット(3段)
  function hex2(n) { var s = Math.max(0, Math.min(255, Math.round(n))).toString(16); return s.length < 2 ? '0' + s : s; }
  function mix(a, b, t) {
    var ar = parseInt(a.substr(1, 2), 16), ag = parseInt(a.substr(3, 2), 16), ab = parseInt(a.substr(5, 2), 16);
    var br = parseInt(b.substr(1, 2), 16), bg = parseInt(b.substr(3, 2), 16), bb = parseInt(b.substr(5, 2), 16);
    return '#' + hex2(ar + (br - ar) * t) + hex2(ag + (bg - ag) * t) + hex2(ab + (bb - ab) * t);
  }
  function fogPal(pal) {
    var out = [];
    for (var lv = 0; lv < 3; lv++) {
      var p = {};
      for (var k in pal) p[k] = mix(pal[k], C.fog, lv * 0.22);
      out.push(p);
    }
    return out;
  }
  var CALF_PAL = fogPal({ e: '#5a3a22', b: '#9a6234', w: '#f4efe4', k: '#1e1612', p: '#f0a8a0', d: '#2e2420' });
  var HAND_PAL = fogPal({ h: '#c89a50', n: '#5a3a22', s: '#f0c8a0', v: '#b8403a', j: '#3a5a9a', b: '#4a2e1a' });
  var POST_PAL = fogPal({ w: '#9a6a3a', d: '#6a4424' });
  var FLASH = { e: '#fff', b: '#fff', w: '#fff', k: '#fff', p: '#fff', d: '#fff' };
  var DIRT_LV = [];
  for (var dl = 0; dl < 8; dl++) DIRT_LV.push(mix(C.dirt, C.dirtFar, dl / 7));
  function fogLv(z) { return z < 2.6 ? 0 : (z < 4.2 ? 1 : 2); }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, lastBeat, lastCue, beatPulse, attacks, calfIdx, p, pShow, phase, phaseEnd, outCount;
  var score, combo, maxCombo, nPerfect, nGood, nMiss, hitStop, over, won, timeUp, outroT, prevBest, demoMode;
  var calfZ, calfXs, calfPose, lungeT, recoilT, pushLane, pushT, flashT, lastType, sameRun, stopBudget;

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.4 : -READY_T;
    lastBeat = -99; lastCue = -1; beatPulse = 0; attacks = [];
    calfIdx = 0; p = demo ? 4 : START_P; pShow = p; outCount = 0;
    phase = demo ? 'fight' : 'enter'; phaseEnd = demo ? 0 : 2;
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0;
    hitStop = 0; over = false; won = false; timeUp = false; outroT = 0; prevBest = game.best;
    calfZ = demo ? contactZ(p) + 0.25 : 6.6; calfXs = demo ? CALF_X : 0; calfPose = 'S';
    lungeT = 0; recoilT = 0; pushLane = null; pushT = 0; flashT = 0; lastType = ''; sameRun = 0; stopBudget = 1.6;
  }

  // ---- 拍クロック(1本)。伴奏は0.06秒先読みで1拍ずつ ----
  function playBeat(bi) {
    var k = bi % 16;
    var downs = k % 2 === 0;
    game.audio.melody(LEAD[k], { tempo: BPM, wave: 'square', volume: 0.04, bass: [[BOOM[k], downs ? 1 : 0.4], ['R', downs ? 0 : 0.6]], bassWave: downs ? 'triangle' : 'square', bassVolume: downs ? 0.11 : 0.03 });
  }

  function pickType() {
    var types = CALVES[calfIdx].types, tp;
    tp = types[Math.floor(game.random(0, types.length)) % types.length];
    if (tp === lastType && sameRun >= 1) tp = types[(types.indexOf(tp) + 1 + Math.floor(game.random(0, types.length - 1))) % types.length];
    sameRun = tp === lastType ? sameRun + 1 : 0;
    lastType = tp;
    return tp;
  }

  function schedule(nb) {
    if (nb >= BEATS || calfIdx >= CALVES.length) return;
    if (CALVES[calfIdx].every === 2 && nb % 2 !== 0) return;
    var tp = pickType();
    attacks.push({ beat: nb, t: nb * SPB, type: tp, res: 0 });
    calfPose = tp;
    // 型の予告音: 側ごとに音程が違う(左=低い / 正面=中 / 右=高い)+ 子牛の鳴き声
    game.audio.tone(LANE_NOTE[tp], 0.09, { wave: 'square', volume: 0.05 });
    game.audio.tone(210, 0.16, { wave: 'sawtooth', volume: 0.025, slide: -60 });
  }

  function onBeat(bi) {
    beatPulse = 1;
    game.audio.tone(bi % 4 === 0 ? 1040 : 1560, 0.025, { wave: 'square', volume: bi % 4 === 0 ? 0.035 : 0.018 });
    if (phase === 'exit' && bi >= phaseEnd) {
      calfIdx++;
      if (calfIdx >= CALVES.length) { finishRun(true); return; }
      phase = 'enter'; phaseEnd = bi + 2; p = START_P; calfZ = 6.6; calfXs = 0; calfPose = 'S'; lastType = ''; sameRun = 0;
    } else if (phase === 'enter' && bi >= phaseEnd) {
      phase = 'fight';
    }
    if (phase === 'fight' || (phase === 'enter' && bi + 1 >= phaseEnd)) schedule(bi + 1);
  }

  function beatClock() {
    var cue = Math.floor((clock + 0.06) / SPB);
    if (cue > lastCue && cue >= 0 && cue < BEATS) { lastCue = cue; if (!demoMode) playBeat(cue); }
    var bi = Math.floor(clock / SPB);
    if (bi === lastBeat) return;
    lastBeat = bi;
    if (clock < 0 || bi >= BEATS) return;
    if (!demoMode) onBeat(bi);
    else beatPulse = 1;
  }

  // ---- 判定 ----
  function block(a, grade, lane) {
    a.res = grade;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += (grade === 1 ? 100 : 60) + Math.min(10, combo) * 10;
    p++; recoilT = 0.25; calfPose = 'S';
    var fx = sx(CALF_X, calfZ), fy = sy(calfZ) - 15 * FIG / calfZ;
    game.feedback.good(fx, fy, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? LANE_COL[lane] : C.white, size: grade === 1 ? 52 : 44, count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.12 });
    if (!demoMode) game.audio.tone(392 * Math.pow(2, Math.min(12, combo) / 12), 0.07, { wave: 'triangle', volume: 0.07 });
    var need = START_P + (demoMode ? 9 : CALVES[calfIdx].need);
    if (p >= need) calfOut();
  }

  function shoved(a, x, y) {
    if (a) a.res = 3;
    combo = 0; nMiss++;
    // hit-stop は1プレイ合計1.6秒まで(放置でも28秒以内に終わるように)
    var hs = Math.min(0.38, stopBudget);
    stopBudget -= hs;
    p--; lungeT = 0.3; flashT = 0.38; hitStop = hs;
    game.feedback.bad(x, y, { text: 'MISS', shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && p <= 0) { game.audio.play('se_break', 0.4); finishRun(false); }
  }

  function calfOut() {
    outCount++;
    score += 300;
    phase = 'exit'; phaseEnd = Math.max(0, Math.floor(clock / SPB + 0.5)) + 2;
    for (var i = 0; i < attacks.length; i++) if (!attacks[i].res) attacks[i].res = 9;
    if (!demoMode && outCount >= CALVES.length) finishRun(true);
    if (!demoMode) {
      game.fx.popup('NICE', W / 2, sy(PEN_Z + PEN_R) - 120, { color: C.yel, size: 84 });
      game.fx.popup(outCount + ' / ' + CALVES.length, W / 2, H * 0.3, { color: C.white, size: 64 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += Math.max(0, BEATS - Math.floor(clock / SPB)) * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, sy(PEN_Z + PEN_R) - 60 - (i % 2) * 70, { color: i % 2 ? C.yel : C.red, count: 18, speed: 400 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, perfect: nPerfect, good: nGood, miss: nMiss, calvesOut: outCount, maxCombo: maxCombo, timeUp: timeUp };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 受ける(本番の指もゴーストも同じ関数)
  function receive(lane) {
    pushLane = lane; pushT = 0.2;
    var best = null, bd = 1e9;
    for (var i = 0; i < attacks.length; i++) {
      var a = attacks[i];
      if (a.res) continue;
      var d = Math.abs(clock - a.t);
      if (d <= GOOD_W && d < bd) { bd = d; best = a; }
    }
    if (!best) { combo = 0; return 'whiff'; }
    if (best.type === lane) { block(best, bd <= PERFECT_W ? 1 : 2, lane); return 'ok'; }
    calfPose = best.type;
    shoved(best, sx(HAND_X, contactZ(pShow) - 0.25), sy(contactZ(pShow) - 0.25) - 260);
    return 'wrong';
  }

  // 見た目の位置を拍に合わせて寄せる(終わりの演出中も動かす)
  function ease(dt) {
    pShow += (p - pShow) * Math.min(1, dt * 10);
    var tz = contactZ(pShow) + 0.25 + (recoilT > 0 ? 0.25 * recoilT / 0.25 : 0) - (lungeT > 0 ? 0.2 : 0);
    if (phase === 'exit') { tz = 7.0; calfXs += (0 - calfXs) * Math.min(1, dt * 4); }
    else calfXs += (CALF_X - calfXs) * Math.min(1, dt * 4);
    calfZ += (tz - calfZ) * Math.min(1, dt * (phase === 'fight' ? 12 : 3.2));
  }

  function stepRun(dt) {
    clock += dt;
    if (lungeT > 0) lungeT -= dt;
    if (recoilT > 0) recoilT -= dt;
    if (pushT > 0) pushT -= dt;
    beatClock();
    ease(dt);
    if (over) return;
    for (var i = 0; i < attacks.length; i++) {
      var a = attacks[i];
      if (!a.res && clock > a.t + GOOD_W) {
        calfPose = a.type;
        shoved(a, sx(HAND_X, contactZ(pShow) - 0.25), sy(contactZ(pShow) - 0.25) - 260);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && !over && clock >= BEATS * SPB + GOOD_W) { timeUp = true; finishRun(false); }
  }

  // ---- 入力 ----
  function laneAt(x) { return x < W / 3 ? 'L' : (x < W * 2 / 3 ? 'C' : 'R'); }
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    var lane = laneAt(x);
    var r = receive(lane);
    if (r === 'whiff') { game.audio.play('se_tap', 0.12); game.fx.burst(x, y, { color: C.dirt, count: 4, speed: 90 }); }
    else if (r === 'ok') game.audio.tone(LANE_NOTE[lane], 0.06, { wave: 'square', volume: 0.06, slide: 120 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.k = 0; return; }
  });

  // ---- 描画 ----
  function oval(cx, cy, rx, ry, col, a) {
    var n = Math.max(2, Math.round(ry / 4)), h = ry * 2 / (2 * n + 1);
    for (var i = -n; i <= n; i++) {
      var yy = i / (n + 0.5), hw = rx * Math.sqrt(Math.max(0, 1 - yy * yy));
      game.draw.rect(cx - hw, cy - ry + (i + n) * h, hw * 2, h + 0.5, col, a);
    }
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function chevron(cx, cy, lane, s, col, wdt) {
    if (lane === 'L') { game.draw.line(cx + s * 0.4, cy - s, cx - s * 0.5, cy, col, wdt); game.draw.line(cx - s * 0.5, cy, cx + s * 0.4, cy + s, col, wdt); }
    else if (lane === 'R') { game.draw.line(cx - s * 0.4, cy - s, cx + s * 0.5, cy, col, wdt); game.draw.line(cx + s * 0.5, cy, cx - s * 0.4, cy + s, col, wdt); }
    else { for (var k = 0; k < 2; k++) { var oy = (k - 0.5) * s * 0.8; game.draw.line(cx - s * 0.7, cy + oy - s * 0.35, cx, cy + oy + s * 0.35, col, wdt); game.draw.line(cx, cy + oy + s * 0.35, cx + s * 0.7, cy + oy - s * 0.35, col, wdt); } }
  }

  function drawLand() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR + 4, [[0, C.sky0], [1, C.sky1]]);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 420 + t * (14 + c * 5)) % (W + 400)) - 200;
      oval(cx, 300 + c * 50, 120 - c * 20, 26, C.white, 0.9);
    }
    // 遠景の丘(霧で薄い)
    oval(200, HOR + 10, 360, 70, mix(C.grassFar, C.fog, 0.5));
    oval(860, HOR + 16, 420, 60, mix(C.grassFar, C.fog, 0.35));
    game.draw.gradient(HOR, H, [[0, C.grassFar], [0.35, C.grass], [1, '#4a8a3a']]);
    // 遠くの納屋と木(板。小さく、彩度を落として)
    oval(sx(1.9, 11), sy(11) + 2, 70, 10, C.shadow, 0.2);
    game.draw.sprite(BARN, { r: mix('#b84030', C.fog, 0.45), w: mix('#f4efe4', C.fog, 0.45), d: mix('#5a3020', C.fog, 0.45) }, sx(1.9, 11), sy(11) - 36, 9, { anchor: 'center' });
    for (var i = 0; i < 4; i++) {
      var tz = 8 + i * 1.6, tx = -2.6 + i * 1.5;
      oval(sx(tx, tz), sy(tz) + 2, 50, 8, C.shadow, 0.2);
      game.draw.sprite(TREE, { g: mix('#3f7a34', C.fog, 0.4 + i * 0.05), t: mix('#6a4424', C.fog, 0.4) }, sx(tx, tz), sy(tz) - 52, 13 - i, { anchor: 'center' });
    }
    // 囲いの土(横ストリップで楕円に塗る。奥ほど霧に寄せる)
    var yTop = sy(PEN_Z + PEN_R), yBot = sy(PEN_Z - PEN_R);
    for (var y = yTop; y < yBot; y += 4) {
      var z = FY / (y + 2 - HOR), dz = z - PEN_Z;
      if (Math.abs(dz) >= PEN_R) continue;
      var hw = Math.sqrt(PEN_R * PEN_R - dz * dz) * FX / z;
      game.draw.rect(W / 2 - hw, y, hw * 2, 4.5, DIRT_LV[Math.max(0, Math.min(7, Math.floor((z - 1.2) / 4.5 * 8)))]);
    }
    // 蹄のあと(拍で揺れる小さな影)
    for (var h = 0; h < 10; h++) {
      var hz = 1.6 + (h * 0.37) % 3.8, hx = -1.2 + ((h * 0.83) % 2.4);
      oval(sx(hx, hz), sy(hz), 26 / hz * 2, 7 / hz * 2, C.shadow, 0.12);
    }
  }

  // 柵と人物を奥から順に描く
  function drawPen() {
    var items = [], i, a, X, z;
    var N = 22;
    for (i = 0; i < N; i++) {
      a = i / N * Math.PI * 2;
      X = PEN_R * Math.sin(a); z = PEN_Z - PEN_R * Math.cos(a);
      if (z < 1.5 || Math.abs(a - Math.PI) < 0.15) continue;
      var gate = Math.abs(a - Math.PI) < 0.3;
      items.push({ kind: 'post', X: X, z: z, gate: gate, a: a });
    }
    items.push({ kind: 'calf', z: calfZ });
    items.push({ kind: 'hand', z: contactZ(pShow) - 0.25 });
    items.push({ kind: 'mark', z: calfZ - 0.05 });
    items.sort(function(u, v) { return v.z - u.z; });
    // 横木(柱の上端どうしを結ぶ)
    var prev = null;
    for (i = 0; i < N + 1; i++) {
      a = (i % N) / N * Math.PI * 2;
      X = PEN_R * Math.sin(a); z = PEN_Z - PEN_R * Math.cos(a);
      var cur = z >= 1.5 && Math.abs(a - Math.PI) >= 0.15 ? { x: sx(X, z), y: sy(z), s: 1 / z } : null;
      if (prev && cur && z > PEN_Z) {
        var col = POST_PAL[fogLv(z)].w;
        game.draw.line(prev.x, prev.y - 150 * prev.s * 1.9, cur.x, cur.y - 150 * cur.s * 1.9, col, Math.max(3, 18 * cur.s));
        game.draw.line(prev.x, prev.y - 80 * prev.s * 1.9, cur.x, cur.y - 80 * cur.s * 1.9, col, Math.max(3, 18 * cur.s));
      }
      prev = cur;
    }
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind === 'post') drawPost(it);
      else if (it.kind === 'calf') drawCalf();
      else if (it.kind === 'hand') drawHand(it.z);
      else drawMark();
    }
    // 手前側の横木(人物より前)
    prev = null;
    for (i = 0; i < N + 1; i++) {
      a = (i % N) / N * Math.PI * 2;
      X = PEN_R * Math.sin(a); z = PEN_Z - PEN_R * Math.cos(a);
      var c2 = z >= 1.5 ? { x: sx(X, z), y: sy(z), s: 1 / z } : null;
      if (prev && c2 && z <= PEN_Z) {
        game.draw.line(prev.x, prev.y - 150 * prev.s * 1.9, c2.x, c2.y - 150 * c2.s * 1.9, POST_PAL[0].w, Math.max(3, 18 * c2.s));
        game.draw.line(prev.x, prev.y - 80 * prev.s * 1.9, c2.x, c2.y - 80 * c2.s * 1.9, POST_PAL[0].w, Math.max(3, 18 * c2.s));
      }
      prev = c2;
    }
  }

  function drawPost(it) {
    var x = sx(it.X, it.z), y = sy(it.z), px = 34 / it.z;
    oval(x, y, 50 / it.z * 1.6, 12 / it.z * 1.6, C.shadow, 0.25);
    game.draw.sprite(POST, POST_PAL[fogLv(it.z)], x, y - 9 * px / 2, px, { anchor: 'center' });
    if (it.gate && it.X > 0) {
      // 開いた門扉
      var gx = x + 120 / it.z * 1.6;
      game.draw.line(x, y - 120 / it.z * 1.9, gx, y - 60 / it.z * 1.9, POST_PAL[2].w, Math.max(3, 14 / it.z));
      game.draw.line(x, y - 60 / it.z * 1.9, gx, y - 20 / it.z * 1.9, POST_PAL[2].w, Math.max(3, 14 / it.z));
    }
  }

  function calfSprite() {
    if (phase === 'enter' || phase === 'exit') return Math.floor(game.time.elapsed * 8) % 2 ? CALF.RUN : CALF.S;
    if (recoilT > 0) return CALF.S;
    return CALF[calfPose] || CALF.S;
  }

  function drawCalf() {
    if (calfZ > 6.9 && phase === 'exit') return;
    var z = calfZ, x = sx(calfXs, z), y = sy(z), px = FIG / z;
    var big = flashT > 0 && hitStop > 0;
    oval(x, y, 70 * px / 10, 16 * px / 10, C.shadow, 0.3);
    var bounce = (phase !== 'fight' ? Math.abs(Math.sin(game.time.elapsed * 10)) * 10 : beatPulse * 6) * px / 10;
    var spr = calfSprite();
    if (big) game.draw.circle(x, y - 6.5 * px, 9 * px, C.white, 0.5);
    game.draw.sprite(spr, big ? FLASH : CALF_PAL[fogLv(z)], x, y - 6.5 * px - bounce, big ? px * 1.25 : px, { anchor: 'center', flipX: phase === 'exit' });
  }

  function drawHand(z) {
    var x = sx(HAND_X, z), y = sy(z), px = FIG / z;
    oval(x, y, 70 * px / 10, 16 * px / 10, C.shadow, 0.3);
    var fr = lungeT > 0 ? 1 : Math.floor((clock >= 0 ? clock / SPB : game.time.elapsed * 2)) % 2;
    var lean = lungeT > 0 ? 12 * px / 10 : 0;
    var top = y - 13 * px;
    game.draw.sprite(HAND[fr], HAND_PAL[fogLv(z)], x + lean, y - 6.5 * px, px, { anchor: 'center' });
    // 腕: 受けた側へ伸びる(待ちは子牛の肩へ)
    var cz = calfZ, cx = sx(calfXs, cz), cy = sy(cz) - 7 * (FIG / cz);
    var off = pushT > 0 && pushLane ? (pushLane === 'L' ? -60 : (pushLane === 'R' ? 60 : 0)) : 0;
    var hx = cx + off + 30 * (FIG / cz) / 10, hy = cy + (pushT > 0 ? -10 : 10);
    var sxL = x + lean - 3.5 * px, sxR = x + lean + 3.5 * px, shY = top + 5 * px;
    game.draw.line(sxL, shY, hx - 20, hy, HAND_PAL[0].s, Math.max(4, px * 1.4));
    game.draw.line(sxR, shY, hx + 20, hy + 6, HAND_PAL[0].s, Math.max(4, px * 1.4));
    game.draw.circle(hx - 20, hy, px * 1.1, '#6a4424');
    game.draw.circle(hx + 20, hy + 6, px * 1.1, '#6a4424');
  }

  // 次の型の札(子牛の頭上に浮く板)と、突っ込んでくる側の地面の印
  function drawMark() {
    if (phase !== 'fight' && !(phase === 'enter' && attacks.length && !attacks[attacks.length - 1].res)) return;
    var a = null;
    for (var i = 0; i < attacks.length; i++) if (!attacks[i].res) { a = attacks[i]; break; }
    if (!a) return;
    var z = calfZ, px = FIG / z;
    var dtv = a.t - clock;
    var blink = dtv > 0.08 ? Math.floor(game.time.elapsed * 12) % 2 === 0 : true;
    var lx = { L: -0.5, C: 0, R: 0.5 }[a.type];
    var gx = sx(calfXs + lx, z - 0.15), gy = sy(z - 0.15);
    oval(gx, gy, 9 * px, 2.4 * px, LANE_COL[a.type], blink ? 0.75 : 0.35);
    var bx = sx(calfXs, z), by = sy(z) - 17 * px;
    oval(bx, by + 5.5 * px, 4 * px, 1.2 * px, C.shadow, 0.2);
    game.draw.circle(bx, by, 4.6 * px, C.white);
    game.draw.circle(bx, by, 3.9 * px, blink ? LANE_COL[a.type] : mix(LANE_COL[a.type], C.white, 0.4));
    chevron(bx, by, a.type, 2.2 * px, C.white, Math.max(4, px * 0.9));
  }

  function drawPads() {
    var top = Math.round(H * 0.79), hgt = H - top - 50;
    var lanes = ['L', 'C', 'R'];
    var next = null;
    for (var i = 0; i < attacks.length; i++) if (!attacks[i].res) { next = attacks[i]; break; }
    for (var k = 0; k < 3; k++) {
      var ln = lanes[k], x0 = 40 + k * 340, w = 320;
      var lit = pushT > 0 && pushLane === ln;
      var hint = next && next.type === ln && next.t - clock < 0.12 && next.t - clock > -GOOD_W;
      game.draw.rect(x0 + 10, top + 16, w, hgt, C.shadow, 0.3);
      game.draw.rect(x0, top + (lit ? 10 : 0), w, hgt, lit ? C.white : mix(LANE_COL[ln], '#ffffff', 0.15));
      game.draw.rect(x0 + 12, top + 12 + (lit ? 10 : 0), w - 24, 20, '#ffffff', 0.45);
      if (hint) game.draw.rect(x0 - 8, top - 8, w + 16, 8, LANE_COL[ln]);
      chevron(x0 + w / 2, top + hgt / 2 + (lit ? 10 : 0), ln, 70, lit ? LANE_COL[ln] : C.white, 18);
    }
  }

  function drawHud() {
    game.draw.gradient(0, 230, [[0, '#3a2a1c'], [1, '#5a3e26']]);
    game.draw.rect(0, 224, W, 6, C.yel);
    label('SCORE ' + score, 46, 70, 42, C.white, 'left');
    for (var i = 0; i < CALVES.length; i++) {
      var x = W - 80 - (CALVES.length - 1 - i) * 90;
      game.draw.sprite(CALF.S, i < outCount ? CALF_PAL[0] : CALF_PAL[2], x, 70, 4.4, { anchor: 'center', alpha: i < outCount ? 1 : 0.45 });
    }
    // 押し合いの位置(門=右端 / 手前の柵=左端)
    var need = START_P + CALVES[Math.min(calfIdx, CALVES.length - 1)].need;
    game.draw.rect(46, 140, W - 92, 26, '#2a1c12');
    var f = Math.max(0, Math.min(1, pShow / need));
    game.draw.rect(46, 140, (W - 92) * f, 26, f > 0.25 ? C.grass : C.red);
    for (var s = 1; s < need; s++) game.draw.rect(46 + (W - 92) * s / need - 2, 140, 4, 26, '#2a1c12');
    var progress = Math.max(0, Math.min(1, clock / (BEATS * SPB)));
    game.draw.rect(46, 186, W - 92, 10, '#2a1c12');
    game.draw.rect(46, 186, (W - 92) * (1 - progress), 10, C.yel);
    if (combo >= 2) label('x' + combo, W / 2, 70, 44, C.yel);
  }

  function drawScene() {
    drawLand();
    drawPen();
    drawPads();
  }

  function drawResult(showTap) {
    game.draw.rect(70, H * 0.27, W - 140, H * 0.35, '#2a1c12', 0.92);
    game.draw.rect(70, H * 0.27, W - 140, 8, won ? C.yel : C.red);
    label(won ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.325, 92, won ? C.yel : C.red);
    label('SCORE ' + score, W / 2, H * 0.39, 56, C.white);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.435, 34, '#e8dcc8');
    label(outCount + ' / ' + CALVES.length, W / 2, H * 0.475, 46, C.yel);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 54, C.yel);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 42, '#e8dcc8');
    if (!won) label('あと' + Math.max(1, CALVES.length - outCount) + '頭!', W / 2, H * 0.56, 46, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, C.white);
  }

  // ---- ATTRACT: 実ロジック。左に来る型を左で受け、正面を真ん中で受け、右に来る型を左で受けてしまい押し込まれる ----
  var demo = { t: 0, k: 0, x: W / 2, y: H * 0.88, press: false, pressT: 0 };
  var DEMO_SCRIPT = [['L', 'L'], ['C', 'C'], ['R', 'L']];
  var DEMO_CYC = 4.4;
  var LANE_X = { L: 200, C: 540, R: 880 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.k = 0; demo.pressT = 0; }
    if (flashT > 0) flashT -= dt;
    if (hitStop > 0) hitStop -= dt;
    else {
      var before = lastBeat;
      stepRun(dt);
      // デモ用の型の出し方(本番と同じ1拍前の予告)
      if (lastBeat !== before && clock >= 0 && demo.k < DEMO_SCRIPT.length && attacks.length === demo.k) {
        var tp = DEMO_SCRIPT[demo.k][0];
        attacks.push({ beat: lastBeat + 1, t: (lastBeat + 1) * SPB, type: tp, res: 0 });
        calfPose = tp;
      }
    }
    var a = attacks[demo.k];
    var tx = W / 2;
    if (a) {
      tx = LANE_X[DEMO_SCRIPT[demo.k][1]];
      if (clock >= a.t - 0.01 && hitStop <= 0 && !a.res) { receive(DEMO_SCRIPT[demo.k][1]); demo.k++; demo.pressT = 0.15; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    demo.x += (tx - demo.x) * Math.min(1, dt * 9);
    demo.y += ((demo.press ? H * 0.87 : H * 0.9) - demo.y) * Math.min(1, dt * 12);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!attacks) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.gradient(0, 230, [[0, '#3a2a1c'], [1, '#5a3e26']]);
      label(GAME_TITLE, W / 2, 90, 92 + Math.sin(t * 3) * 3, C.yel);
      label('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.755, 50, C.yel);
      else label('TAP TO START', W / 2, H * 0.755, 44, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
      if (flashT > 0) flashT -= dt;
    } else if (over) {
      outroT -= dt;
      ease(dt);
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.45, W, 170, '#2a1c12', 0.8);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.495, 100, C.yel);
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.k = 0;
  });
})(game);

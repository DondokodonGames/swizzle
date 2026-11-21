// K-DS-0009v3-snow-jump-apex-press.js
// 夜のジャンプ台の頂点撮り — 1小節に1人、拍に乗って滑り出した選手が4拍目の頭で宙の頂点に来る。頂点にシャッターを合わせ、外れても頂点との差をcmで見せる
// 操作: 画面のどこでも押すとシャッター(押した瞬間で判定)。1拍目にゲートが開いて助走、3拍目に踏み切り、4拍目の頭で照準の十字(頂点)に届く。そこで押す。近いほど高得点で、写真の位置と頂点の差がcmで残る。外すと「あと○cm」とその差が線で出てMISS。撮り逃し・同じ選手への2枚目もMISS
// 終わり: 100→125→150BPM(各2小節・1小節1人)の6人、前奏1小節込みで約14秒。MISS3回でGAME OVER、6人を撮り終えればCLEAR。段が上がる1小節前からテンポ板が次のBPMを点滅させ、上昇チャイムで予告
// @mechanic: near_miss
// @theme: night_ski_jump_apex_photo
// 世界観: 雪山の夜間照明のジャンプ台の脇で、報道カメラマンが拍に乗って次々に飛び出す選手の宙の頂点を狙い、段ごとに速まる進行の中で頂点ぎりぎりの一枚を撮る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・撮れた枚数・PERFECT/GOOD/MISS数・頂点との最小差(cm)
// スタイル: 90s PRE-RENDER

(function(game) {
  var STYLE = { bg: ['#0c1424', '#2a3a52'], main: ['#8a9ab0', '#d8e2ee', '#3a4658'], accent: ['#ffb040', '#e85a4a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗く金属質。背景は動かない1枚絵として描き込み、粒状ノイズを散らす。キャラだけドットで動かす
  var C = {
    night: STYLE.bg[0], steelSky: STYLE.bg[1], steel: STYLE.main[0], snow: STYLE.main[1], metal: STYLE.main[2],
    amber: STYLE.accent[0], red: STYLE.accent[1],
    ink: '#060a12', snowD: '#9aa8ba', snowS: '#6a7a90', gold: '#ffd060', green: '#7ad89a', white: '#ffffff', panel: '#141c2a'
  };

  var GAME_TITLE = 'APEX PRESS';
  var STAGE_BPM = [100, 125, 150];
  var BAR_ST = [0, 0, 0, 1, 1, 2, 2];   // 小節ごとの段(0小節目は前奏)
  var NBAR = BAR_ST.length;
  var NB = NBAR * 4;
  var JUMPS = 6;
  var NEEDED = 6;
  var MISS_LIMIT = 3;
  var PERFECT_W = 0.045, GOOD_W = 0.1;
  var READY_T = 0.8;
  var TIME_LIMIT = 15;
  var GATE = { x: 120, y: 400 }, LIP = { x: 440, y: 900 };
  var HMAX = 320, FLY_X = 260;
  var APEX = { x: LIP.x + FLY_X, y: LIP.y - HMAX };

  // 拍の時刻表(段ごとにBPMが上がる)
  var beatT = [];
  (function() {
    var t = 0;
    for (var i = 0; i <= NB; i++) { beatT.push(t); t += 60 / STAGE_BPM[BAR_ST[Math.min(NBAR - 1, Math.floor(i / 4))]]; }
  })();
  function startT(k) { return beatT[(k + 1) * 4]; }
  function takeT(k) { return beatT[(k + 1) * 4 + 2]; }
  function apexT(k) { return beatT[(k + 1) * 4 + 3]; }
  function spbK(k) { return 60 / STAGE_BPM[BAR_ST[k + 1]]; }

  // 伴奏(オリジナル): 夜の競技場の行進曲。小節ごとにその段のテンポで鳴らす
  var MEL = [
    [['E4', 1], ['G4', 1], ['B4', 1], ['E5', 1]],
    [['D5', 1], ['B4', 1], ['G4', 1], ['A4', 1]],
    [['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1]],
    [['B4', 1], ['D5', 1], ['F#5', 1], ['B5', 1]]
  ];
  var BASS = [
    [['E2', 1], ['E3', 1], ['E2', 1], ['E3', 1]],
    [['G2', 1], ['G3', 1], ['D2', 1], ['D3', 1]],
    [['C2', 1], ['C3', 1], ['C2', 1], ['C3', 1]],
    [['B1', 1], ['B2', 1], ['B1', 1], ['B2', 1]]
  ];

  // ---- スプライト ----
  var SKI_CROUCH = [
    '..........',
    '..hhh.....',
    '.hhggh....',
    '..fff.....',
    '.sssss....',
    'sssssss...',
    '.sss.pp...',
    '..pppp....',
    'kkkkkkkkkk'
  ];
  var SKI_FLY = [
    '.......hhh..',
    '......hhggh.',
    '.....sssff..',
    '...sssss....',
    '.ssssss.....',
    'pppp........',
    '.........kkk',
    'kkk...kkk...',
    '...kkk......'
  ];
  var SKI_PAL = { h: '#e85a4a', g: '#ffb040', f: '#f0c8a0', s: '#d8e2ee', p: '#3a4658', k: '#ffb040' };
  var SKI_WHITE = { h: '#ffffff', g: '#ffffff', f: '#ffffff', s: '#ffffff', p: '#ffffff', k: '#ffffff' };
  var PHOTOG_A = [
    '..cccc......',
    '.cccccc.....',
    '..ffff......',
    '..fkkLLLL...',
    '..ffLLLLLL..',
    '.jjjjLLLLLLl',
    'jjjjjjjLLLLl',
    'jjjjjjj.....',
    '.jjjjj......',
    '.pp..pp.....',
    '.pp..pp.....',
    'bbb..bbb....'
  ];
  var PHOTOG_B = [
    '............',
    '..cccc......',
    '.cccccc.....',
    '..ffff......',
    '..fkkLLLL...',
    '..ffLLLLLLL.',
    '.jjjjLLLLLLl',
    'jjjjjjjLLLLl',
    'jjjjjjj.....',
    '.jjjjj......',
    '.pp..pp.....',
    'bbb..bbb....'
  ];
  var PHOTOG_PAL = { c: '#3a4658', f: '#f0c8a0', k: '#060a12', L: '#8a9ab0', l: '#d8e2ee', j: '#e85a4a', p: '#3a4658', b: '#060a12' };
  var ROLL = ['.mm.', 'mffm', 'mffm', '.mm.'];

  // 粒状ノイズ(1枚絵の質感)
  var GRAIN = [];
  for (var gi = 0; gi < 170; gi++) GRAIN.push({ x: game.random(0, W), y: game.random(230, 1440), p: game.random(0, 6.28) });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, prevClock, cuedBar, shotDone, shots, photos, misses, score, nP, nG, combo, maxCombo;
  var over, won, outroT, hitStop, demoMode, prevBest, photo, flashT, camPose, bestGap, nearGap, curStage;
  var beatPulse = 0;

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; prevClock = clock; cuedBar = -99;
    shotDone = []; shots = []; photos = 0; misses = 0; score = 0; nP = 0; nG = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    photo = null; flashT = 0; camPose = 0; bestGap = -1; nearGap = -1; curStage = 0;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function barNow() { var b = 0; for (var i = 0; i < NBAR; i++) if (clock >= beatT[i * 4]) b = i; return b; }
  function beatNow() { var b = 0; for (var i = 0; i < NB; i++) if (clock >= beatT[i]) b = i; return b; }

  // 選手 k の時刻 t の位置(助走 → 踏み切り → 放物線)
  function jumperPos(k, t) {
    var s = startT(k), to = takeT(k), sp = spbK(k);
    if (t < s) return { x: GATE.x, y: GATE.y, pose: 0, air: false };
    if (t < to) {
      var f = (t - s) / (to - s);
      f = f * f;
      return { x: GATE.x + (LIP.x - GATE.x) * f, y: GATE.y + (LIP.y - GATE.y) * f, pose: 0, air: false };
    }
    var u = (t - to) / sp;
    return { x: LIP.x + FLY_X * u, y: LIP.y - HMAX * (1 - (u - 1) * (u - 1)), pose: 1, air: true };
  }
  function gapCm(k, t) {
    var p = jumperPos(k, t);
    var dx = (p.x - APEX.x) * 0.25, dy = p.y - APEX.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }
  function nearestJump(t) {
    var best = 0, bd = 99;
    for (var k = 0; k < JUMPS; k++) { var d = Math.abs(t - apexT(k)); if (d < bd) { bd = d; best = k; } }
    return best;
  }

  // ---- 判定 ----
  function miss(k, cm) {
    misses++; combo = 0;
    shots[k] = shots[k] === undefined ? { ok: 0, cm: cm } : shots[k];
    if (cm >= 0 && (nearGap < 0 || cm < nearGap)) nearGap = cm;
    game.feedback.bad(photo ? photo.x : APEX.x, (photo ? photo.y : APEX.y) - 110, { text: 'MISS', shake: demoMode ? 3 : 8, volume: demoMode ? 0 : 0.45 });
    if (!demoMode && misses >= MISS_LIMIT) { hitStop = 0.45; finish(false); }
  }

  function shutter() {
    if (over) return 'over';
    camPose = 0.16; flashT = 0.12;
    tone(1800, 0.02, { wave: 'square', volume: 0.06 });
    tone(600, 0.05, { wave: 'square', volume: 0.05 });
    if (clock < startT(0)) return 'air';
    var k = nearestJump(clock), ad = Math.abs(clock - apexT(k));
    if (shotDone[k] && shots[k] && shots[k].ok === 0) return 'air';   // 撮り逃した選手への押し直しは空シャッター
    var p = jumperPos(k, clock), cm = gapCm(k, clock);
    photo = { k: k, x: p.x, y: p.y, pose: p.pose, cm: cm, ok: ad <= GOOD_W && !shotDone[k], t: 0.6 };
    if (shotDone[k]) { photo.ok = false; miss(k, -1); return 'miss'; }
    if (ad > GOOD_W) { miss(k, cm); return 'miss'; }
    shotDone[k] = true;
    var perfect = ad <= PERFECT_W;
    if (perfect) nP++; else nG++;
    photos++; combo++; maxCombo = Math.max(maxCombo, combo);
    shots[k] = { ok: perfect ? 2 : 1, cm: cm };
    if (bestGap < 0 || cm < bestGap) bestGap = cm;
    var close = Math.max(0, 1 - ad / GOOD_W);
    score += Math.round((perfect ? 150 : 60 + 60 * close) * (1 + BAR_ST[k + 1] * 0.4)) + Math.min(60, combo * 15);
    game.feedback.good(p.x, p.y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.green, size: perfect ? 52 : 44, count: 10, volume: demoMode ? 0 : 0.25 });
    if (!demoMode && photos === 3) { game.fx.popup(photos + ' / ' + NEEDED, W / 2, 470, { color: C.amber, size: 72 }); sfx('se_milestone', 0.45); }
    if (!demoMode && combo >= 3) game.fx.popup('COMBO ' + combo, W / 2, 400, { color: C.snow, size: 52 });
    return 'hit';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_LIMIT - misses) * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 620 + (i % 2) * 220, { color: [C.amber, C.snow, C.gold][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.snow, 0.15);
      sfx('se_success', 0.55);
    } else {
      game.fx.flash('#ffffff', 0.18);
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, photos: photos, total: NEEDED, perfect: nP, good: nG, miss: misses, maxCombo: maxCombo, bestGapCm: bestGap };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.24, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function cueBar(b) {
    if (demoMode) return;
    var bpm = STAGE_BPM[BAR_ST[b]];
    if (b === 0) game.audio.melody([['E4', 1], ['R', 1], ['E4', 1], ['B4', 1]], { tempo: bpm, wave: 'triangle', volume: 0.04, bass: BASS[0], bassVolume: 0.07 });
    else game.audio.melody(MEL[(b - 1) % 4], { tempo: bpm, wave: BAR_ST[b] === 2 ? 'square' : 'triangle', volume: 0.045, bass: BASS[(b - 1) % 4], bassVolume: 0.08 });
  }

  function onBeat(i) {
    beatPulse = 1;
    var inBar = i % 4, b = Math.floor(i / 4);
    if (inBar === 3 && b >= 1) tone(1320, 0.07, { wave: 'triangle', volume: 0.07 });          // 頂点の拍
    else if (inBar === 2 && b >= 1) tone(300, 0.12, { wave: 'sine', volume: 0.05, slide: 500 }); // 踏み切り
    else tone(inBar === 0 ? 'E5' : 'B4', 0.04, { wave: 'square', volume: 0.04 });
    // 段替えの予告: 段の最後の小節の1拍目と3拍目に上昇チャイム
    if (b >= 1 && b + 1 < NBAR && BAR_ST[b + 1] > BAR_ST[b] && (inBar === 0 || inBar === 2)) {
      tone('E5', 0.08, { wave: 'square', volume: 0.06 });
      tone('A5', 0.1, { wave: 'square', volume: 0.06 });
    }
    // 段の頭: 新しいBPMを表示
    if (inBar === 0 && b >= 1 && BAR_ST[b] > curStage) {
      curStage = BAR_ST[b];
      if (!demoMode) { game.fx.popup(String(STAGE_BPM[curStage]), W / 2, 400, { color: C.amber, size: 96 }); sfx('se_powerup', 0.4); }
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    for (var b = 0; b < NBAR; b++) if (b > cuedBar && clock + 0.06 >= beatT[b * 4]) { cuedBar = b; cueBar(b); }
    for (var i = 0; i < NB; i++) if (prevClock < beatT[i] && clock >= beatT[i]) onBeat(i);
    if (over) return;
    for (var k = 0; k < JUMPS; k++) {
      if (shotDone[k] || clock <= apexT(k) + GOOD_W) continue;
      shotDone[k] = true;
      photo = null;
      if (shots[k] === undefined) {
        miss(k, -1);
        if (over) return;
      }
    }
    if (clock >= beatT[NB] || clock > TIME_LIMIT) finish(misses < MISS_LIMIT);
  }

  function tickFx(dt) {
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (flashT > 0) flashT -= dt;
    if (camPose > 0) camPose -= dt;
    if (photo) { photo.t -= dt; if (photo.t <= 0) photo = null; }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || y < 240) return;
    var r = shutter();
    game.fx.burst(300, 1560, { color: r === 'hit' ? C.gold : (r === 'miss' ? C.red : C.snow), count: 4, speed: 140 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function plate(x, y, w, h, edgeCol) {
    game.draw.rect(x, y, w, h, C.panel, 0.92);
    game.draw.rect(x, y, w, 4, C.steel); game.draw.rect(x, y + h - 4, w, 4, C.ink);
    game.draw.rect(x, y, 4, h, C.steel); game.draw.rect(x + w - 4, y, 4, h, C.ink);
    game.draw.rect(x + 10, y + 10, w - 20, 3, edgeCol, 0.8);
  }
  function stripPoly(pts, col, alpha) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y < maxY; y += 3) {
      var xl = 1e9, xr = -1e9, yy = y + 1.5;
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          var x = a[0] + (yy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
          xl = Math.min(xl, x); xr = Math.max(xr, x);
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, 3, col, alpha);
    }
  }

  function drawStill() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.3, '#16223a'], [0.5, C.steelSky], [0.75, '#1a2436'], [1, C.ink]]);
    // 星
    for (var s = 0; s < 24; s++) game.draw.rect((s * 137) % W, 250 + (s * 53) % 260, 3, 3, C.snow, 0.4);
    // 雪山の稜線(1枚絵)
    stripPoly([[0, 760], [180, 560], [330, 680], [520, 470], [760, 640], [900, 540], [1080, 700], [1080, 900], [0, 900]], '#1e2a40');
    stripPoly([[520, 470], [600, 540], [560, 560], [480, 520]], C.snowS, 0.7);
    stripPoly([[180, 560], [240, 610], [150, 600]], C.snowS, 0.7);
    // 照明塔とブルーム
    var lights = [[960, 300], [60, 330]];
    for (var l = 0; l < lights.length; l++) {
      var lx = lights[l][0], ly = lights[l][1];
      game.draw.line(lx, ly, lx, 1000, C.metal, 10);
      game.draw.rect(lx - 50, ly - 20, 100, 40, C.steel);
      game.draw.circle(lx, ly, 150, C.amber, 0.06);
      game.draw.circle(lx, ly, 90, C.amber, 0.1);
      game.draw.circle(lx, ly, 40, '#fff2c8', 0.6);
    }
    // 着地斜面(雪面)
    stripPoly([[460, 950], [1080, 1330], [1080, 1440], [0, 1440], [0, 1100], [380, 1000]], C.snowD);
    stripPoly([[460, 950], [1080, 1330], [1080, 1360], [450, 985]], C.snow, 0.8);
    for (var m = 0; m < 6; m++) game.draw.line(520 + m * 95, 990 + m * 58, 560 + m * 95, 1060 + m * 58, C.snowS, 3);
    // 助走路(金属の骨組み + 雪のレール)
    game.draw.line(GATE.x - 20, GATE.y + 40, LIP.x - 10, LIP.y + 50, C.ink, 30);
    game.draw.line(GATE.x, GATE.y + 20, LIP.x, LIP.y + 20, C.metal, 22);
    game.draw.line(GATE.x, GATE.y + 8, LIP.x, LIP.y + 8, C.snow, 8);
    for (var p = 0; p < 5; p++) {
      var f = 0.15 + p * 0.18, px = GATE.x + (LIP.x - GATE.x) * f, py = GATE.y + (LIP.y - GATE.y) * f;
      game.draw.line(px, py + 30, px - 20, 1100, C.metal, 8);
      game.draw.line(px - 4, py + 30, px - 22, 1100, C.steel, 2);
    }
    // スタートゲート小屋
    game.draw.rect(GATE.x - 90, GATE.y - 120, 130, 120, C.metal);
    game.draw.rect(GATE.x - 90, GATE.y - 120, 130, 8, C.steel);
    // 粒状ノイズ
    for (var g = 0; g < GRAIN.length; g++) {
      var gr = GRAIN[g];
      game.draw.rect(gr.x, gr.y, 2, 2, C.snow, 0.05 + 0.06 * (0.5 + 0.5 * Math.sin(t * 13 + gr.p)));
    }
  }

  function drawLamps() {
    // ゲートの4灯: 拍ごとに1灯ずつ点く。4灯目(頂点の拍)は琥珀色
    var bi = clock >= 0 ? beatNow() % 4 : -1;
    for (var k = 0; k < 4; k++) {
      var on = k <= bi && clock >= 0;
      var col = on ? (k === 3 ? C.amber : C.green) : '#2a3242';
      game.draw.circle(GATE.x - 70 + k * 30, GATE.y - 80, 11 + (k === bi ? beatPulse * 5 : 0), col);
    }
    // テンポ板(段替えの1小節前から次のBPMが点滅)
    var b = barNow(), st = BAR_ST[b];
    var nextUp = b + 1 < NBAR && BAR_ST[b + 1] > st && b >= 1;
    var blink = Math.floor(game.time.elapsed * 6) % 2 === 0;
    plate(780, 700, 220, 110, nextUp ? C.amber : C.steel);
    label(String(nextUp && blink ? STAGE_BPM[BAR_ST[b + 1]] : STAGE_BPM[st]), 890, 760, 60, nextUp && blink ? C.amber : C.snow);
  }

  function drawReticle() {
    // 照準: 頂点の位置。頂点の拍が近いほど四隅が締まる
    var k = nearestJump(Math.max(0, clock));
    var until = apexT(k) - clock;
    var tight = until > 0 && until < spbK(k) * 2 ? until / (spbK(k) * 2) : 1;
    var r = 46 + tight * 60, a = 0.5 + (1 - tight) * 0.4;
    var col = until > -GOOD_W && until < spbK(k) * 2 ? C.amber : C.steel;
    game.draw.line(APEX.x - 30, APEX.y, APEX.x + 30, APEX.y, col, 3);
    game.draw.line(APEX.x, APEX.y - 30, APEX.x, APEX.y + 30, col, 3);
    var cs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (var c = 0; c < 4; c++) {
      var cx = APEX.x + cs[c][0] * r, cy = APEX.y + cs[c][1] * r;
      game.draw.rect(cx - (cs[c][0] > 0 ? 24 : 0), cy - 3, 24, 6, col, a);
      game.draw.rect(cx - 3, cy - (cs[c][1] > 0 ? 24 : 0), 6, 24, col, a);
    }
    for (var d = 0; d < 10; d++) game.draw.rect(LIP.x + d * 60, APEX.y - 1, 26, 3, C.steel, 0.35);
  }

  function drawJumpers() {
    for (var k = 0; k < JUMPS; k++) {
      var s = startT(k);
      if (clock < s - beatT[4] * 0.8 && k > 0) continue;
      if (k > 0 && clock < startT(k - 1) + 0.3) continue;
      var p = jumperPos(k, clock);
      if (p.air && p.x > W + 80) continue;
      if (photo && photo.k === k && photo.t > 0.25) continue;   // 写真の瞬間は止め絵を描く
      if (p.air) {
        var groundY = 950 + (p.x - 460) * 0.61;
        game.draw.rect(p.x - 30, groundY, 60, 8, C.ink, 0.25);
      }
      game.draw.sprite(p.pose ? SKI_FLY : SKI_CROUCH, SKI_PAL, p.x, p.y - 30, 11, { anchor: 'center' });
    }
  }

  function drawPhoto() {
    if (!photo) return;
    var hold = photo.t > 0.25;
    var big = hold ? 14 : 11;
    // 止め絵(白フラッシュ + 拡大)
    game.draw.sprite(photo.pose ? SKI_FLY : SKI_CROUCH, hold ? SKI_WHITE : SKI_PAL, photo.x, photo.y - 30, big, { anchor: 'center', alpha: hold ? 1 : photo.t * 3 });
    // 頂点の影絵と差の線
    game.draw.sprite(SKI_FLY, SKI_PAL, APEX.x, APEX.y - 30, 11, { anchor: 'center', alpha: 0.35 });
    var lx = Math.max(photo.x, APEX.x) + 90;
    game.draw.line(photo.x, photo.y, lx, photo.y, photo.ok ? C.green : C.red, 3);
    game.draw.line(APEX.x, APEX.y, lx, APEX.y, C.amber, 3);
    game.draw.line(lx, photo.y, lx, APEX.y, photo.ok ? C.green : C.red, 6);
    var my = (photo.y + APEX.y) / 2;
    if (photo.ok) label(photo.cm + 'cm', lx + 20, my, 40, C.gold, 'left');
    else label('あと' + photo.cm + 'cm', Math.min(lx + 20, W - 260), my, 44, C.red, 'left');
  }

  function drawThumb() {
    game.draw.gradient(1440, H, [[0, '#101826'], [1, C.ink]]);
    game.draw.rect(0, 1440, W, 6, C.steel, 0.6);
    game.draw.rect(0, H - 24, W, 24, C.metal, 0.5);
    // 報道カメラマン(長いレンズを照準へ向ける)
    game.draw.rect(140, 1745, 200, 12, C.ink, 0.5);
    game.draw.sprite(camPose > 0 ? PHOTOG_B : PHOTOG_A, PHOTOG_PAL, 220, 1650, 14, { anchor: 'center' });
    if (flashT > 0) { game.draw.circle(310, 1580, 60, C.white, 0.7); game.draw.circle(310, 1580, 120, C.white, 0.2); }
    // シャッターボタン(頂点の拍で脈打つ)
    var bi = clock >= 0 ? beatNow() % 4 : -1;
    var pulse = bi === 3 ? beatPulse : 0;
    game.draw.circle(820, 1640, 150 + pulse * 16, C.metal);
    game.draw.circle(820, 1640, 120 + pulse * 16, bi === 3 ? C.amber : C.steel);
    game.draw.circle(800, 1615, 40, C.white, 0.25);
    // 6枚のフィルム
    for (var k = 0; k < JUMPS; k++) {
      var sh = shots[k], fx = 130 + k * 165;
      game.draw.rect(fx - 60, 1800, 120, 80, C.ink);
      game.draw.rect(fx - 52, 1808, 104, 64, sh === undefined ? '#22304a' : (sh.ok === 2 ? C.gold : (sh.ok === 1 ? C.green : C.red)), sh === undefined ? 1 : 0.85);
      if (sh !== undefined && sh.cm >= 0) label(String(sh.cm), fx, 1842, 30, C.ink);
    }
  }

  function drawHud() {
    plate(20, 16, W - 40, 210, C.amber);
    label('SCORE ' + score, 60, 72, 40, C.snow, 'left');
    label(photos + ' / ' + NEEDED, W - 60, 72, 44, C.amber, 'right');
    for (var i = 0; i < MISS_LIMIT; i++) game.draw.sprite(ROLL, { m: C.steel, f: i < MISS_LIMIT - misses ? C.amber : '#2a3242' }, 80 + i * 60, 152, 11, { anchor: 'center' });
    var bi = clock >= 0 ? beatNow() % 4 : -1;
    for (var k = 0; k < 4; k++) {
      var on = bi === k;
      game.draw.circle(W / 2 - 120 + k * 80, 152, on ? 20 + beatPulse * 8 : 13, on ? (k === 3 ? C.amber : C.snow) : '#2a3242');
    }
    if (combo >= 2) label('COMBO ' + combo, W - 60, 162, 34, C.snow, 'right');
    var prog = Math.max(0, Math.min(1, clock / beatT[NB]));
    game.draw.rect(60, 198, W - 120, 10, '#2a3242');
    game.draw.rect(60, 198, (W - 120) * prog, 10, C.amber);
  }

  function drawScene() {
    drawStill();
    drawLamps();
    drawReticle();
    drawJumpers();
    drawPhoto();
    drawThumb();
  }

  function drawResult(showTap) {
    var top = H * 0.26;
    plate(70, top, W - 140, H * 0.37, won ? C.gold : C.red);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.305, 90, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.36, 56, C.snow);
    label(photos + ' / ' + NEEDED, W / 2, H * 0.405, 50, C.amber);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + misses, W / 2, H * 0.45, 32, C.snow);
    if (bestGap >= 0) {
      game.draw.sprite(SKI_FLY, SKI_PAL, W / 2 - 110, H * 0.485, 6, { anchor: 'center' });
      label(bestGap + 'cm', W / 2 + 30, H * 0.485, 40, C.gold);
    }
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.53, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.53, 42, C.snow);
    if (!won) label(nearGap >= 0 ? 'あと' + nearGap + 'cm!' : 'あと' + Math.max(1, NEEDED - photos) + '枚!', W / 2, H * 0.575, 48, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.612, 32, C.snow);
  }

  // ---- ATTRACT: 実ロジックで2人を撮る。頂点の拍でシャッター。1周おきに2人目を早撃ちして「あと○cm」を見せる ----
  var demo = { t: 0, n: 0, next: 0, hx: 820, hy: 1640, press: 0 };
  var DEMO_START = beatT[4] - 0.4;
  var DEMO_CYC = apexT(1) + 0.75 - DEMO_START;
  function demoReset() {
    initRun(true);
    clock = DEMO_START; prevClock = clock; cuedBar = 99;
    demo.n++; demo.next = 0; demo.press = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    tickFx(dt);
    var k = demo.next;
    if (k < 2) {
      var early = demo.n % 2 === 0 && k === 1 ? 0.17 : -0.012;
      if (clock >= apexT(k) - early) { shutter(); demo.press = 0.12; demo.next++; }
    }
    var ready = k < 2 && apexT(k) - clock < spbK(k) * 1.5;
    demo.hx += (820 - demo.hx) * Math.min(1, dt * 12);
    demo.hy += ((ready ? 1640 : 1500) - demo.hy) * Math.min(1, dt * 12);
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 14 });
      plate(20, 16, W - 40, 210, C.amber);
      label(GAME_TITLE, W / 2, 92, 82 + Math.sin(t * 3) * 3, C.amber);
      label('HI-SCORE ' + game.best, W / 2, 180, 34, C.snow);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.145, 48, C.snow);
      else label('TAP TO START', W / 2, H * 0.145, 44, C.amber);
      return;
    }

    if (state === S.RESULT) {
      tickFx(dt);
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      tickFx(dt);
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      tickFx(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      plate(140, H * 0.4, W - 280, 150, C.amber);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.amber);
    }
    // 最初の1人だけ、頂点の拍でボタンを押す手を薄く見せる
    if (clock >= startT(0) && clock < apexT(0) + 0.3 && !over) {
      game.draw.hand(820, 1640, { press: Math.abs(clock - apexT(0)) < 0.08, scale: 12, alpha: 0.45 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);

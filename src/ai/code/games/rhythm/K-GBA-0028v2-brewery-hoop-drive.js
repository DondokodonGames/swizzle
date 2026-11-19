// K-GBA-0028v2-brewery-hoop-drive.js
// 酒蔵の箍締め — 相棒の掛け声の拍が段ごとに速まる中、光る箍を拍の頭ごとに木槌で連打し、拍に乗った打数だけ箍を締め込む
// 操作: 仕込み樽に箍が4本。光っている箍の帯をタップすると木槌で叩く(押した瞬間で判定)。相棒の掛け声(拍の頭)にずれ小さく乗った1打で箍が1目盛り下がり、6目盛りで締まる。拍外れ・同じ拍への2打目・光っていない箍を叩くとMISSで箍が1目盛り浮く。樽の外を押しても空振りだけ
// 終わり: 4段(120→144→168→192BPM、各2小節・約13秒)。段の終わりに箍が締まっていなければ緩み(MISS)。緩み2本でGAME OVER、4段を終えて緩みが1本以内ならCLEAR。段が変わる2拍前に相棒が手を挙げ、次の箍が点滅し、掛け声が上がって予告する
// @mechanic: mash
// @theme: winter_brewery_hoop_drive
// 世界観: 雪の降る冬の酒蔵で、樽職人の若者が樽を押さえる相棒の掛け声に合わせ、仕込み樽の箍を上から一本ずつ木槌で叩き締める。一本ごとに掛け声が速くなる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・締めた箍の数・PERFECT数・最大コンボ
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var STYLE = { bg: ['#cdc6a6', '#9c9678'], main: ['#a86a3c', '#4a4a3c', '#ece4c8'], accent: ['#c4604e', '#e2b04a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 彩度を落とした少色。小画面向けの太く単純な形で、密度を上げない
  var C = {
    wall: STYLE.bg[0], wall2: STYLE.bg[1], wood: STYLE.main[0], iron: STYLE.main[1], light: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1],
    ink: '#2c2a22', dwood: '#7a4a2a', lwood: '#c48a5a', sky: '#8c9cac', snow: '#f4f2e8', green: '#7a9a5a', gray: '#8a8670'
  };

  var GAME_TITLE = 'HOOP DRIVE';
  var BPMS = [120, 144, 168, 192];
  var PERFECT_W = 0.05, GOOD_W = 0.1;
  var READY_T = 0.8, LIVES = 2, LEAD = 2, SB = 8, NEED = 6;
  var NB = LEAD + BPMS.length * SB;
  var TIME_LIMIT = 15;
  var BX = 540, BTOP = 560, BBOT = 1450;
  var HOOP_Y = [700, 900, 1100, 1300];

  // 拍の時刻表(段ごとにBPMが上がる。前ノリ2拍は最初のBPM)
  var beatT = [];
  (function() {
    var t = 0;
    for (var i = 0; i <= NB; i++) {
      beatT.push(t);
      var st = i < LEAD ? 0 : Math.min(BPMS.length - 1, Math.floor((i - LEAD) / SB));
      t += 60 / BPMS[st];
    }
  })();
  function stageOf(i) { return i < LEAD ? -1 : Math.min(BPMS.length - 1, Math.floor((i - LEAD) / SB)); }

  // 伴奏(オリジナル): 五音の仕事唄。1小節ずつ、その段のテンポで鳴らす
  var MEL = [
    [['A4', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1]],
    [['G4', 0.5], ['A4', 0.5], ['C5', 1], ['D5', 1], ['C5', 0.5], ['A4', 0.5]]
  ];
  var BASS = [['A2', 1], ['E2', 1], ['A2', 1], ['E2', 1]];

  // ---- スプライト ----
  var COOP_A = ['....hhhh..', '...hhhhhh.', '...ffffff.', '...fkffkf.', '...ffffff.', '....ffff..', '..jjjjjjj.', '.jjjjjjjjf', '.jjjjjjjjf', '.jjjjjjj..', '..pppppp..', '..pp..pp..', '..pp..pp..', '..bb..bb..'];
  var COOP_B = ['..........', '....hhhh..', '...hhhhhh.', '...ffffff.', '...fkffkf.', '...ffffff.', 'ffjjjjjjj.', 'fjjjjjjjj.', '.jjjjjjjj.', '.jjjjjjj..', '..pppppp..', '..pp..pp..', '.pp....pp.', '.bb....bb.'];
  var COOP_OH = ['....hhhh..', '...hhhhhh.', '...ffffff.', '...fwffwf.', '...ffffff.', '....fkkf..', 'f.jjjjjjjf', '.jjjjjjjj.', '.jjjjjjjj.', '.jjjjjjj..', '..pppppp..', '..pp..pp..', '..pp..pp..', '..bb..bb..'];
  var COOP_PAL = { h: '#4a4a3c', f: '#e0b48a', k: '#2c2a22', w: '#ffffff', j: '#5c6c8c', p: '#4a4a3c', b: '#2c2a22' };
  var PART_A = ['..cccc....', '.cccccc...', '.ffffff...', '.fkffkf...', '.ffffff...', '..ffff....', '.jjjjjjj..', 'fjjjjjjjj.', 'fjjjjjjjj.', '..jjjjjjj.', '..pppppp..', '..pp..pp..', '..pp..pp..', '..bb..bb..'];
  var PART_B = ['..cccc....', '.cccccc...', '.ffffff...', '.fkffkf...', '.ffffff...', '..fkkf....', '.jjjjjjj..', 'fjjjjjjjj.', 'fjjjjjjjj.', '..jjjjjjj.', '..pppppp..', '..pp..pp..', '..pp..pp..', '..bb..bb..'];
  var PART_UP = ['f.cccc....', 'fcccccc...', 'fffffff...', '.fkffkf...', '.ffffff...', '..fkkf....', '.jjjjjjj..', '.jjjjjjjj.', 'fjjjjjjjj.', '..jjjjjjj.', '..pppppp..', '..pp..pp..', '..pp..pp..', '..bb..bb..'];
  var PART_PAL = { c: '#c4604e', f: '#e0b48a', k: '#2c2a22', j: '#7a6a4a', p: '#4a4a3c', b: '#2c2a22' };
  var KEG = ['.bbbb.', 'biiiib', 'bbbbbb', 'biiiib', '.bbbb.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, prevClock, lastBeat, cuedBar, lives, score, seated, nP, nG, nM, combo, maxCombo;
  var depth, closed, struck, over, won, outroT, hitStop, demoMode, prevBest, nearText, flashHoop, flashT, coopPose, hitPos, curStage;
  var beatPulse = 0;
  var SNOW = [];
  for (var si = 0; si < 26; si++) SNOW.push({ x: game.random(80, 420), y: game.random(270, 500), v: game.random(30, 70) });

  function initRun(demo) {
    demoMode = !!demo;
    clock = -READY_T; prevClock = clock; lastBeat = -99; cuedBar = -99;
    lives = LIVES; score = 0; seated = 0; nP = 0; nG = 0; nM = 0; combo = 0; maxCombo = 0;
    depth = [0, 0, 0, 0]; closed = [false, false, false, false]; struck = [];
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best; nearText = '';
    flashHoop = -1; flashT = 0; coopPose = 0; hitPos = null; curStage = 0;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function nearestBeat(t) {
    var best = LEAD, bd = 99;
    for (var i = LEAD; i < NB; i++) { var d = Math.abs(t - beatT[i]); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function hoopDrawY(s) { return HOOP_Y[s] - (NEED - Math.min(NEED, depth[s])) * 16; }
  function onBarrel(x, y) { return Math.abs(x - BX) < 340 && y > BTOP - 60 && y < BBOT + 40; }
  function stageNow() { var i = nearestBeat(clock); return Math.max(0, stageOf(i)); }

  function miss(s, why, ad) {
    nM++; combo = 0;
    if (!closed[s] && depth[s] > 0) depth[s]--;
    flashHoop = s; flashT = 0.35;
    game.feedback.bad(hitPos ? hitPos.x : BX, hoopDrawY(s) - 60, { text: 'MISS', shake: demoMode ? 3 : 7, volume: demoMode ? 0 : 0.45 });
    if (why === 'off' && ad !== undefined) nearText = 'あと' + Math.max(0.01, ad).toFixed(2) + '秒!';
  }

  // 木槌の1打(押した瞬間で判定)
  function strike(x, y) {
    if (over) return 'over';
    if (!onBarrel(x, y) || clock < beatT[LEAD] - GOOD_W * 2) { tone(240, 0.04, { wave: 'triangle', volume: 0.08 }); return 'air'; }
    hitPos = { x: x, y: y, t: 0.14 }; coopPose = 0.14;
    var j = nearestBeat(clock), d = clock - beatT[j], ad = Math.abs(d), s = Math.max(0, stageOf(j));
    tone(150, 0.05, { wave: 'square', volume: 0.12 });
    if (ad > GOOD_W) { miss(s, 'off', ad - GOOD_W); return 'miss'; }
    if (struck[j]) { miss(s, 'double'); return 'miss'; }
    if (Math.abs(y - hoopDrawY(s)) > 110) { struck[j] = true; miss(s, 'hoop'); return 'miss'; }
    struck[j] = true;
    var perfect = ad <= PERFECT_W;
    if (perfect) nP++; else nG++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    var mult = 1 + s * 0.5;
    if (depth[s] < NEED) {
      depth[s]++;
      score += Math.round((perfect ? 120 : 80) * mult);
      if (depth[s] === NEED) {
        seated++;
        score += 300;
        if (!demoMode) { game.fx.popup(seated + ' / 4', BX, HOOP_Y[s] - 150, { color: C.gold, size: 70 }); sfx('se_milestone', 0.45); }
      }
    } else {
      score += Math.round(60 * mult);   // 締まった箍への追い打ち
    }
    game.feedback.good(x, hoopDrawY(s) - 50, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.green, size: perfect ? 52 : 44, count: 8, volume: demoMode ? 0 : 0.25 });
    if (combo > 0 && combo % 8 === 0 && !demoMode) game.fx.popup('COMBO ' + combo, BX, 470, { color: C.red, size: 56 });
    return 'hit';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 760 + (i % 2) * 180, { color: [C.gold, C.light, C.green][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.light, 0.12);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, seated: seated, hoops: 4, perfect: nP, good: nG, miss: nM, maxCombo: maxCombo };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function beatClock() {
    // 小節ごとの伴奏(その段のテンポで)
    for (var k = 0; k < BPMS.length * 2; k++) {
      if (k > cuedBar && clock + 0.06 >= beatT[LEAD + k * 4]) {
        cuedBar = k;
        var st = Math.floor(k / 2);
        if (!demoMode) game.audio.melody(MEL[k % 2], { tempo: BPMS[st], wave: st === 3 ? 'square' : 'triangle', volume: 0.05, bass: BASS, bassVolume: 0.08 });
      }
    }
    // 相棒の掛け声 = 拍の頭
    for (var i = 0; i < NB; i++) {
      if (prevClock < beatT[i] && clock >= beatT[i]) {
        beatPulse = 1;
        var inStage = (i - LEAD) % SB;
        tone(i % 2 ? 'A4' : 'D5', 0.06, { wave: 'square', volume: 0.07 });
        // 段が変わる2拍前: 相棒が手を挙げ、掛け声が上がる
        if (i >= LEAD && inStage >= SB - 2 && stageOf(i) < BPMS.length - 1) tone(inStage === SB - 2 ? 'E5' : 'A5', 0.1, { wave: 'square', volume: 0.08 });
        var st2 = stageOf(i);
        if (i >= LEAD && inStage === 0 && st2 > curStage) {
          curStage = st2;
          if (!demoMode) { game.fx.popup(String(BPMS[st2]), BX, 470, { color: C.red, size: 90 }); sfx('se_powerup', 0.4); }
        }
        // 緩みの予告: 最後の拍の2拍前で締まっていなければ箍が赤く点滅し、警告音
        if (i >= LEAD && inStage === SB - 3 && depth[st2] < NEED) tone(200, 0.09, { wave: 'sawtooth', volume: 0.07 });
      }
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    if (flashT > 0) flashT -= dt;
    if (coopPose > 0) coopPose -= dt;
    if (hitPos) { hitPos.t -= dt; if (hitPos.t <= 0) hitPos = null; }
    beatClock();
    if (over) return;
    for (var s = 0; s < BPMS.length; s++) {
      if (closed[s] || clock <= beatT[LEAD + s * SB + SB - 1] + GOOD_W) continue;
      closed[s] = true;
      if (depth[s] < NEED) {
        // 箍が緩んだまま段が終わった
        nM++; combo = 0;
        flashHoop = s; flashT = 0.45;
        if (!demoMode) lives--;
        var last = !demoMode && lives <= 0;
        nearText = 'あと' + (NEED - depth[s]) + '打!';
        sfx('se_break', 0.5);
        game.feedback.bad(BX, HOOP_Y[s] - 80, { text: 'MISS', shake: last ? 16 : 9, volume: demoMode ? 0 : 0.5 });
        if (last) { hitStop = 0.45; finish(false); return; }
      }
    }
    if (closed[BPMS.length - 1] || clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || clock < 0) return;
    var r = strike(x, y);
    if (r === 'hit') game.fx.burst(x, y, { color: C.light, count: 5, speed: 160 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function box(x, y, w, h, edge, fill) {
    game.draw.rect(x, y, w, h, fill || C.ink, 0.92);
    game.draw.rect(x, y, w, 8, edge); game.draw.rect(x, y + h - 8, w, 8, edge);
    game.draw.rect(x, y, 8, h, edge); game.draw.rect(x + w - 8, y, 8, h, edge);
  }

  function drawBrewery(dt) {
    game.draw.gradient(0, H, [[0, C.wall2], [0.3, C.wall], [0.78, C.wall2], [1, '#7a7460']]);
    // 太い梁
    game.draw.rect(0, 236, W, 30, C.dwood);
    for (var p = 0; p < 3; p++) game.draw.rect(60 + p * 440, 236, 36, 1200, C.dwood, 0.55);
    // 雪の窓
    game.draw.rect(70, 270, 360, 250, C.sky);
    for (var i = 0; i < SNOW.length; i++) {
      var f = SNOW[i];
      f.y += f.v * dt;
      if (f.y > 510) { f.y = 275; f.x = game.random(80, 420); }
      game.draw.rect(f.x, f.y, 10, 10, C.snow);
    }
    game.draw.rect(70, 270, 360, 12, C.dwood); game.draw.rect(70, 508, 360, 12, C.dwood);
    game.draw.rect(70, 270, 12, 250, C.dwood); game.draw.rect(418, 270, 12, 250, C.dwood); game.draw.rect(244, 270, 12, 250, C.dwood);
    // 奥に並ぶ大樽
    for (var k = 0; k < 2; k++) {
      var kx = 690 + k * 230;
      game.draw.rect(kx - 90, 330, 180, 210, C.dwood, 0.5);
      game.draw.rect(kx - 90, 370, 180, 14, C.iron, 0.5);
      game.draw.rect(kx - 90, 480, 180, 14, C.iron, 0.5);
    }
    // 床
    game.draw.rect(0, BBOT + 10, W, H - BBOT - 10, '#8a8064');
    for (var b = 0; b < 6; b++) game.draw.rect(0, BBOT + 40 + b * 70, W, 6, C.gray, 0.6);
  }

  function drawBarrel() {
    var hgt = BBOT - BTOP;
    for (var y = BTOP; y < BBOT; y += 10) {
      var u = (y - BTOP) / hgt, w = 500 + 90 * Math.sin(u * Math.PI);
      game.draw.rect(BX - w / 2, y, w, 10, C.wood);
      for (var st = 1; st < 7; st++) game.draw.rect(BX - w / 2 + st * w / 7 - 3, y, 6, 10, C.dwood);
      game.draw.rect(BX - w / 2, y, 18, 10, C.lwood);
    }
    game.draw.rect(BX - 250, BTOP - 24, 500, 30, C.dwood);
    game.draw.rect(BX - 250, BTOP - 24, 500, 8, C.lwood);
    var sNow = stageNow();
    for (var s = 0; s < 4; s++) {
      var hy = hoopDrawY(s), u2 = (hy - BTOP) / hgt, hw = 520 + 90 * Math.sin(u2 * Math.PI);
      var active = !over && !closed[s] && s === sNow && clock >= beatT[LEAD] - 0.6;
      var next = !over && !closed[s] && s === sNow + 1 && clock >= beatT[LEAD + s * SB] - 2 * (60 / BPMS[s - 1]);
      var white = flashT > 0 && flashHoop === s;
      var danger = active && depth[s] < NEED && clock >= beatT[LEAD + s * SB + SB - 3] - 0.05;
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      var col = white ? '#ffffff' : (danger && blink ? C.red : (closed[s] || depth[s] >= NEED ? C.iron : '#6a6a5a'));
      var th = white ? 52 : 38;
      if (active) game.draw.rect(BX - hw / 2 - 20, hy - 70, hw + 40, 140, C.gold, 0.18 + beatPulse * 0.15);
      if (next && blink) game.draw.rect(BX - hw / 2 - 20, hy - 60, hw + 40, 120, C.light, 0.25);
      game.draw.rect(BX - hw / 2 - 6, hy - th / 2, hw + 12, th, col);
      game.draw.rect(BX - hw / 2 - 6, hy - th / 2, hw + 12, 6, white ? '#ffffff' : C.gray);
      if (depth[s] >= NEED) for (var r = 0; r < 5; r++) game.draw.rect(BX - hw / 2 + 40 + r * (hw - 80) / 4 - 6, hy - 6, 12, 12, C.gold);
      // 目盛り: あと何打で締まるか
      for (var n = 0; n < NEED; n++) game.draw.rect(BX + hw / 2 + 24, HOOP_Y[s] + 30 - n * 16, 26, 10, n < depth[s] ? C.gold : C.gray, active ? 1 : 0.5);
    }
  }

  function drawPeople() {
    var sNow = stageNow();
    var bIdx = nearestBeat(clock);
    var announce = !over && clock >= 0 && sNow < 3 && (bIdx - LEAD) % SB >= SB - 2 && bIdx >= LEAD;
    var pArt = announce ? PART_UP : (beatPulse > 0.5 ? PART_B : PART_A);
    game.draw.sprite(pArt, PART_PAL, 150, 1370 - beatPulse * 6, 11, { anchor: 'center' });
    // 相棒の掛け声の輪
    if (beatPulse > 0.2) game.draw.circle(205, 1260, 30 + (1 - beatPulse) * 40, C.light, beatPulse * 0.5);
    var miss = flashT > 0;
    var cArt = miss ? COOP_OH : (coopPose > 0 ? COOP_B : COOP_A);
    var cx = 950, cy = 1370;
    game.draw.sprite(cArt, COOP_PAL, cx, cy, 11, { anchor: 'center' });
    // 木槌
    if (hitPos) {
      game.draw.line(cx - 40, cy - 40, hitPos.x + 40, hitPos.y, C.dwood, 14);
      game.draw.rect(hitPos.x - 30, hitPos.y - 40, 90, 80, C.lwood);
      game.draw.rect(hitPos.x - 30, hitPos.y - 40, 90, 10, C.light);
    } else {
      game.draw.line(cx - 30, cy - 20, cx - 70, cy - 170, C.dwood, 14);
      game.draw.rect(cx - 120, cy - 230, 90, 80, C.lwood);
      game.draw.rect(cx - 120, cy - 230, 90, 10, C.light);
    }
  }

  // 床の段メーター(4段のテンポ)
  function drawTempo() {
    var y = Math.round(H * 0.84);
    var sNow = stageNow();
    for (var s = 0; s < 4; s++) {
      var x = 150 + s * 260, on = s === sNow && clock >= 0, done = closed[s];
      box(x - 105, y - 60, 210, 120, on ? C.gold : (done ? C.iron : C.gray), on ? C.dwood : C.ink);
      label(String(BPMS[s]), x, y, 52, on ? C.gold : (done ? (depth[s] >= NEED ? C.green : C.red) : C.light));
    }
  }

  function drawHud() {
    box(20, 16, W - 40, 210, C.iron, C.ink);
    label('SCORE ' + score, 60, 66, 38, C.light, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(KEG, { b: i < lives ? C.wood : C.gray, i: C.iron }, W - 90 - i * 70, 66, 10, { anchor: 'center' });
    label(seated + ' / 4', W / 2 + 130, 66, 38, C.gold);
    // 拍の灯(4拍)。ふくらむ灯が拍の頭
    var bIdx = Math.max(0, Math.floor(clock >= 0 ? nearestBeatFloor() : 0));
    for (var k = 0; k < 4; k++) {
      var on = clock >= 0 && ((bIdx - LEAD) % 4 + 4) % 4 === k;
      game.draw.circle(W / 2 - 210 + k * 140, 150, on ? 22 + beatPulse * 10 : 16, on ? C.gold : C.gray);
    }
    if (combo >= 2) label('COMBO ' + combo, W - 70, 150, 34, C.red, 'right');
    var progress = Math.max(0, Math.min(1, clock / beatT[NB]));
    game.draw.rect(60, 196, W - 120, 10, C.gray);
    game.draw.rect(60, 196, (W - 120) * progress, 10, C.gold);
  }
  function nearestBeatFloor() { var b = 0; for (var i = 0; i < NB; i++) if (clock >= beatT[i]) b = i; return b; }

  function drawScene(dt) {
    drawBrewery(dt);
    drawBarrel();
    drawPeople();
    drawTempo();
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    box(70, top, W - 140, H * 0.36, won ? C.gold : C.red, C.ink);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 90, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.365, 56, C.light);
    game.draw.sprite(KEG, { b: C.wood, i: C.iron }, W / 2 - 140, H * 0.415, 10, { anchor: 'center' });
    label(seated + ' / 4', W / 2 + 10, H * 0.415, 48, C.gold);
    label('PERFECT ' + nP + '  MISS ' + nM + '  COMBO ' + maxCombo, W / 2, H * 0.46, 32, C.light);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.51, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.51, 42, C.light);
    if (!won) label(nearText || 'あと1本!', W / 2, H * 0.555, 46, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.605, 32, C.light);
  }

  // ---- ATTRACT: 実ロジックで光る箍を拍の頭ごとに叩いて締め、次の段で速くなる。1周おきに拍外れの1打でMISSを見せる ----
  var demo = { t: 0, n: 0, next: LEAD, hx: BX, hy: HOOP_Y[0], press: 0, offDone: false };
  var DEMO_CYC = beatT[LEAD + SB + 3] + 0.3;
  function demoReset() {
    initRun(true);
    clock = 0; prevClock = 0; lastBeat = 0; cuedBar = 99;
    demo.n++; demo.next = LEAD; demo.press = 0; demo.offDone = false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var s = Math.max(0, stageOf(demo.next));
    var tx = BX - 120 + (demo.next % 2) * 160, ty = hoopDrawY(s);
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 14);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 14);
    // 失敗例: 4打目だけ半拍遅れて叩く
    if (demo.n % 2 === 0 && !demo.offDone && demo.next === LEAD + 3 && clock >= beatT[LEAD + 3] + (beatT[LEAD + 4] - beatT[LEAD + 3]) * 0.5) {
      demo.offDone = true; strike(demo.hx, demo.hy); demo.press = 0.12; demo.next++;
    } else if (demo.next < NB && clock >= beatT[demo.next] + 0.015 && !(demo.n % 2 === 0 && demo.next === LEAD + 3 && !demo.offDone)) {
      strike(demo.hx, demo.hy); demo.press = 0.12; demo.next++;
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.hx, demo.hy + 20, { press: demo.press > 0, scale: 14 });
      box(20, 16, W - 40, 210, C.iron, C.ink);
      label(GAME_TITLE, W / 2, 88, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 176, 34, C.light);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.135, 48, C.ink);
      else label('TAP TO START', W / 2, H * 0.135, 44, C.red);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(hitStop > 0 ? 0 : dt);
    drawHud();
    if (clock < 0) {
      box(140, H * 0.4, W - 280, 150, C.gold, C.ink);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.gold);
    }
    // 最初の2拍だけ、光る箍の上で拍に合わせて叩く手を薄く見せる
    if (clock >= 0 && clock < beatT[LEAD + 2] && !over) {
      var ph = nearestBeatFloor();
      game.draw.hand(BX, hoopDrawY(0) + 20, { press: clock - beatT[ph] < 0.12, scale: 12, alpha: 0.5 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);

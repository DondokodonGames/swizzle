// I-Wii-0024v2-station-shoeshine-beat.js
// 駅前の靴みがき拍子 — 拍に合わせて左右の手を交互にタップし、布を小刻みに往復させるほど靴の艶が増す
// 操作: 靴の真ん中から左右へ流れる光の粒が、左右の真鍮の取っ手に重なった瞬間にその側をタップ(左右交互)。途中で拍が倍の細かさ(8分)に変わる小節があり、前の小節の終わりの鈴2つで予告される
// 終わり: 7小節(約14秒)を刻み終えた時点で艶ゲージが7割以上ならCLEAR、足りなければGAME OVER
// @mechanic: rhythm
// @theme: station_shoeshine_beat
// 世界観: 駅前の路上で、靴磨き職人が客の革靴に布を当て、駅の雑踏に負けない拍で布を小刻みに往復させて、鏡のような艶を出していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 艶%・PERFECT数・最大コンボ・スコア
// スタイル: SKEUOMORPH

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 革・木目・真鍮の質感をグラデと細線で。ボタンは上明・下暗+白ハイライト
  var STYLE = { bg: ['#5a3a2a', '#2a1a12'], main: ['#7a4422', '#d8a84a', '#f2e6cc'], accent: ['#ffffff', '#c83a2a'] };
  var LEATHER = STYLE.main[0], BRASS = STYLE.main[1], CLOTH = STYLE.main[2], WHITE = STYLE.accent[0], RED = STYLE.accent[1];
  var DARK = '#1a100a', WOOD = '#8a5a32';

  var TITLE = 'SHOE SHINE';
  var BPM = 120;
  var SPB = 60 / BPM;
  var EIGHTH = SPB / 2;
  var BARS = 7;
  var TIME_LIMIT = BARS * 4 * SPB;
  var NEED_SHINE = 0.7;
  var PERFECT_W = 0.05, GOOD_W = 0.11, LATE_MISS = 0.15;
  var PAD_Y = Math.round(H * 0.84);
  var PAD_X = [W * 0.2, W * 0.8];
  var CX = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 譜面: 小節ごとの刻み('-'=休み、'q'=4分で左右交互、'e'=8分で左右交互)
  var CHART = ['-', 'q', 'q', 'e', 'q', 'e', 'q'];
  function buildNotes(chart) {
    var notes = [], side = 0;
    for (var b = 0; b < chart.length; b++) {
      var kind = chart[b];
      if (kind === '-') continue;
      var step = kind === 'e' ? 1 : 2;
      for (var e = 0; e < 8; e += step) {
        notes.push({ t: (b * 8 + e) * EIGHTH, side: side, res: null, hitT: 0, fast: kind === 'e' });
        side = 1 - side;
      }
    }
    return notes;
  }

  var SHINER = [
    ['...cccc...', '..cccccc..', '.cccccccc.', '...ffff...', '..fkffkf..', '...fmmf...', '..aaaaaa..', '.faaaaaaf.', 'f.aaaaaa.f', '..aaaaaa..', '..pp..pp..'],
    ['...cccc...', '..cccccc..', '.cccccccc.', '...ffff...', '..fkffkf..', '...fmmf...', 'f.aaaaaa..', '.faaaaaaf.', '..aaaaaa.f', '..aaaaaa..', '..pp..pp..'],
    ['...cccc...', '..cccccc..', '.cccccccc.', '...ffff...', '..fkffkf..', '...fmmf...', '..aaaaaa.f', '.faaaaaaf.', 'f.aaaaaa..', '..aaaaaa..', '..pp..pp..'],
  ];
  var SPAL = { c: '#3a4a6a', f: '#e8b890', k: DARK, m: '#a83a2a', a: '#5a6a3a', p: '#3a2a1a' };
  var SPARK = ['..w..', '.wyw.', 'wyyyw', '.wyw.', '..w..'];

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x, y + 3, { size: sz, color: DARK, bold: true, align: 'center', font: 'serif' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'serif' });
  }

  // ── 背景: 駅前のレンガ壁と木の靴磨き台 ──
  function drawStreet(t, pulse) {
    game.draw.gradient(0, H, [[0, '#6a4a3a'], [0.45, STYLE.bg[0]], [0.62, '#3a2418'], [1, STYLE.bg[1]]]);
    for (var y = 240; y < H * 0.45; y += 48) {
      game.draw.line(0, y, W, y, '#3a2418', 3);
      for (var x = ((y / 48) % 2) * 60; x < W; x += 120) game.draw.line(x, y, x, y + 48, '#3a2418', 3);
    }
    // 駅の時計(拍で針が刻む)
    game.draw.circle(W * 0.82, 330, 74, BRASS);
    game.draw.circle(W * 0.82, 330, 62, CLOTH);
    var ha = -Math.PI / 2 + Math.floor(t / SPB) * Math.PI / 6;
    game.draw.line(W * 0.82, 330, W * 0.82 + Math.cos(ha) * 50, 330 + Math.sin(ha) * 50, DARK, 6);
    game.draw.circle(W * 0.82, 330, 8 + pulse * 6, RED);
    // 木の台(木目の細線)
    game.draw.rect(60, H * 0.56, W - 120, H * 0.14, WOOD);
    for (var g = 0; g < 9; g++) game.draw.line(70, H * 0.565 + g * 28, W - 70, H * 0.565 + g * 28 + Math.sin(g) * 6, '#6a4222', 2);
    game.draw.rect(60, H * 0.56, W - 120, 10, '#b8844a');
  }

  // ── 革靴(艶で光が増える) ──
  function drawShoe(shine, t, dull) {
    var sx = CX, sy = H * 0.47;
    // ズボンの裾
    game.draw.rect(sx + 40, 230, 260, sy - 230 - 30, '#2a2a3a');
    for (var l = 0; l < 6; l++) game.draw.line(sx + 60 + l * 40, 240, sx + 60 + l * 40, sy - 40, '#34344a', 2);
    // 靴本体(上明・下暗の重ね)
    game.draw.circle(sx - 120, sy + 40, 150, '#3a1e10');
    game.draw.rect(sx - 120, sy - 110, 420, 260, '#3a1e10');
    game.draw.circle(sx - 120, sy + 30, 140, LEATHER);
    game.draw.rect(sx - 120, sy - 100, 410, 240, LEATHER);
    game.draw.rect(sx - 260, sy + 120, 560, 34, '#24120a');
    game.draw.circle(sx - 140, sy - 20, 70, '#9a5a30');
    // 艶: 白いハイライトが大きく・はっきりになる
    var k = dull ? 0.05 : shine;
    game.draw.circle(sx - 170, sy - 30, 20 + k * 70, '#ffffff' + (k > 0.6 ? '88' : (k > 0.3 ? '55' : '22')));
    game.draw.rect(sx - 60, sy - 70, 280 * Math.max(0.1, k), 14, '#ffffff' + (k > 0.5 ? '77' : '33'));
    if (k > 0.75) for (var s = 0; s < 3; s++) {
      if (Math.floor(t * 4 + s) % 3 === 0) game.draw.sprite(SPARK, { w: WHITE, y: '#fff6c0' }, sx - 220 + s * 160, sy - 90 + (s % 2) * 60, 10, { anchor: 'center' });
    }
    // 靴ひも
    for (var h = 0; h < 4; h++) game.draw.line(sx + 70 + h * 40, sy - 90, sx + 90 + h * 40, sy - 60, CLOTH, 4);
  }

  // ── 布と手(左右の取っ手) ──
  function drawCloth(pull, hitSide, hitK) {
    var y = H * 0.56 - 20;
    var off = pull * 70;
    var lx = PAD_X[0] + 60 + off, rx = PAD_X[1] - 60 + off;
    game.draw.line(lx, y + 60, CX - 200 + off, y, CLOTH, 26);
    game.draw.line(CX - 200 + off, y, CX + 200 + off, y, CLOTH, 34);
    game.draw.line(CX + 200 + off, y, rx, y + 60, CLOTH, 26);
    for (var st = 0; st < 5; st++) game.draw.line(CX - 160 + st * 80 + off, y - 14, CX - 160 + st * 80 + off, y + 14, RED, 4);
  }

  function drawPads(lit, pressSide, pressK, missSide, missK) {
    for (var s = 0; s < 2; s++) {
      var x = PAD_X[s], y = PAD_Y;
      var down = pressSide === s ? pressK : 0;
      var r = 120 * (1 - down * 0.08);
      game.draw.circle(x, y + 10, r + 10, DARK);
      game.draw.circle(x, y, r + 6, missSide === s && missK > 0 ? RED : (lit[s] ? WHITE : '#8a6a2a'));
      game.draw.circle(x, y, r, '#a8782a');
      game.draw.circle(x, y - 10, r * 0.86, BRASS);
      game.draw.circle(x, y - 22, r * 0.6, '#ecc870');
      game.draw.circle(x - r * 0.3, y - r * 0.4, r * 0.18, '#fff4cc');
    }
  }

  // ── 流れる拍の粒(真ん中から左右の取っ手へ、拍の頭で重なる) ──
  var TRAVEL = SPB * 1.2;
  function noteX(n, songT) {
    var k = 1 - (n.t - songT) / TRAVEL;
    return CX + (PAD_X[n.side] - CX) * k;
  }
  function drawNotes(notes, songT) {
    // 中央の発射口
    game.draw.circle(CX, PAD_Y, 40, DARK);
    game.draw.circle(CX, PAD_Y, 30, '#5a3a1a');
    game.draw.line(PAD_X[0], PAD_Y, PAD_X[1], PAD_Y, '#00000055', 22);
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res && n.res !== 'MISS') continue;
      var dt = n.t - songT;
      if (dt > TRAVEL || dt < -LATE_MISS - 0.2) continue;
      var x = noteX(n, songT);
      var col = n.res === 'MISS' ? '#6a5a4a' : (n.fast ? '#ffe680' : WHITE);
      game.draw.circle(x, PAD_Y, n.fast ? 26 : 32, DARK);
      game.draw.circle(x, PAD_Y, n.fast ? 20 : 26, col);
      game.draw.circle(x - 6, PAD_Y - 8, 7, WHITE);
    }
  }

  // ── 判定(本番・デモ共通) ──
  function judge(notes, side, songT) {
    var best = null, bd = 1e9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res || n.side !== side) continue;
      var d = Math.abs(n.t - songT);
      if (d < bd) { bd = d; best = n; }
    }
    if (!best || bd > LATE_MISS) return { res: 'MISS', note: null };
    best.res = bd <= PERFECT_W ? 'PERFECT' : (bd <= GOOD_W ? 'GOOD' : 'MISS');
    best.hitT = songT;
    return { res: best.res, note: best };
  }
  function expire(notes, songT) {
    var out = [];
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (!n.res && songT - n.t > LATE_MISS) { n.res = 'MISS'; out.push(n); }
    }
    return out;
  }

  // ── 伴奏(拍クロックから鳴らす) ──
  var BASS = ['C3', 'C3', 'G2', 'G2', 'A2', 'A2', 'F2', 'G2'];
  var LEAD = ['E5', 'R', 'G5', 'E5', 'D5', 'R', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'R', 'D5', 'R'];
  function playEighth(idx, chart) {
    var bar = Math.floor(idx / 8), e = idx % 8;
    if (e % 2 === 0) game.audio.tone(BASS[(bar * 2 + e / 4) % BASS.length | 0], 0.18, { wave: 'triangle', volume: e === 0 ? 0.1 : 0.07 });
    game.audio.tone(e % 2 === 0 ? 2200 : 3200, 0.02, { wave: 'square', volume: e % 2 === 0 ? 0.03 : 0.015 });
    var ld = LEAD[idx % LEAD.length];
    if (bar > 0 && ld !== 'R') game.audio.tone(ld, 0.12, { wave: 'square', volume: 0.025 });
    // 次の小節が8分なら、この小節の最後の拍で鈴を2つ(予告)
    if (bar + 1 < chart.length && chart[bar + 1] === 'e' && e >= 6) game.audio.tone('A6', 0.05, { wave: 'sine', volume: 0.06 });
  }

  // ── ゲーム状態 ──
  var notes, songT, lastE, shine, combo, maxCombo, perfects, goods, misses, score, ready, over, won, endT, prevBest, pressSide, pressK, missSide, missK, pull, halt, lastSide;

  function initGame() {
    notes = buildNotes(CHART); songT = -0.0001; lastE = -1; shine = 0.05; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0;
    score = 0; ready = 0.8; over = false; won = false; endT = 0; prevBest = game.best || 0;
    pressSide = -1; pressK = 0; missSide = -1; missK = 0; pull = 0; halt = null; lastSide = 1;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.round(shine * 1000);
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function onResult(r, side) {
    var x = PAD_X[side];
    if (r.res === 'PERFECT' || r.res === 'GOOD') {
      combo++; maxCombo = Math.max(maxCombo, combo);
      if (r.res === 'PERFECT') perfects++; else goods++;
      shine = Math.min(1, shine + (r.res === 'PERFECT' ? 0.03 : 0.018) + Math.min(combo, 10) * 0.0004);
      score += (r.res === 'PERFECT' ? 100 : 60) * (1 + Math.floor(combo / 8));
      game.feedback.good(x, PAD_Y - 190, { text: r.res, color: r.res === 'PERFECT' ? BRASS : CLOTH, count: r.res === 'PERFECT' ? 12 : 6, sound: false });
      game.audio.tone(523 * Math.pow(1.059, Math.min(combo, 12)), 0.07, { wave: 'triangle', volume: 0.07 });
      if (combo === 8 || combo === 16) { game.fx.popup('x' + combo, CX, H * 0.3, { color: BRASS, size: 70 }); game.audio.play('se_milestone', 0.35); }
    } else {
      combo = 0; misses++;
      shine = Math.max(0, shine - 0.06);
      missSide = side; missK = 0.35;
      game.feedback.bad(x, PAD_Y - 190, { text: 'MISS', shake: 5 });
    }
  }

  function tapSide(side) {
    pressSide = side; pressK = 1;
    pull = side === 0 ? -1 : 1; lastSide = side;
    var r = judge(notes, side, songT);
    if (r.res === 'MISS' && !r.note) game.audio.tone('C3', 0.06, { wave: 'square', volume: 0.06 });
    else game.audio.play('se_tap', 0.15);
    onResult(r, side);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); game.audio.stopBgm(); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || ready > 0 || halt) return;
    tapSide(x < W / 2 ? 0 : 1);
  });

  // ── ATTRACT ゴースト実演: 拍どおりに左右交互 → 最後の1つを遅れて叩いてMISS ──
  var DEMO_CHART = ['q', 'e'];
  var demo = { t: 0, notes: null, songT: 0, lastE: -1, side: 0, press: 0, pull: 0, shine: 0.3, gx: W / 2, gy: PAD_Y, miss: 0, missSide: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var len = DEMO_CHART.length * 4 * SPB + 0.6;
    var cyc = demo.t % len;
    if (cyc < dt || demo.t <= dt || !demo.notes) { demo.notes = buildNotes(DEMO_CHART); demo.lastE = -1; demo.shine = 0.3; }
    demo.songT = cyc - 0.3;
    var e = Math.floor(demo.songT / EIGHTH);
    if (e !== demo.lastE && e >= 0 && e < DEMO_CHART.length * 8) { demo.lastE = e; if (e % 2 === 0) game.audio.tone(2200, 0.02, { wave: 'square', volume: 0.015 }); }
    if (demo.press > 0) demo.press -= dt;
    if (demo.miss > 0) demo.miss -= dt;
    var lastIdx = demo.notes.length - 1;
    for (var i = 0; i < demo.notes.length; i++) {
      var n = demo.notes[i];
      if (n.res) continue;
      var late = i === lastIdx ? 0.13 : 0;
      if (demo.songT >= n.t + late) {
        var r = judge(demo.notes, n.side, demo.songT);
        demo.press = 0.12; demo.side = n.side; demo.pull = n.side === 0 ? -1 : 1;
        if (r.res === 'MISS') { demo.miss = 0.35; demo.missSide = n.side; game.feedback.bad(PAD_X[n.side], PAD_Y - 190, { text: 'MISS', volume: 0.2, shake: 3 }); }
        else { demo.shine = Math.min(1, demo.shine + 0.08); game.feedback.good(PAD_X[n.side], PAD_Y - 190, { text: r.res, color: BRASS, count: 6, volume: 0.2 }); }
      }
    }
    demo.gx += (PAD_X[demo.side] - demo.gx) * Math.min(1, dt * 14);
    demo.pull *= Math.exp(-dt * 8);
  }

  function drawHud(st) {
    // 艶ゲージ(革のベルト+真鍮の目盛り。7割の線が合格)
    game.draw.rect(60, 60, W - 120, 56, DARK);
    game.draw.rect(68, 68, W - 136, 40, '#4a2a18');
    game.draw.rect(68, 68, (W - 136) * shine, 40, shine >= NEED_SHINE ? '#f6e08a' : BRASS);
    game.draw.rect(68, 70, (W - 136) * shine, 10, '#ffffff55');
    var nx = 68 + (W - 136) * NEED_SHINE;
    game.draw.rect(nx - 4, 52, 8, 72, WHITE);
    txt(Math.round(shine * 100) + '%', 150, 160, 44, shine >= NEED_SHINE ? '#f6e08a' : CLOTH);
    txt(String(score), W / 2, 160, 44, CLOTH);
    if (combo >= 2) txt('COMBO ' + combo, W - 180, 160, 36, BRASS);
    // 小節の進み(7つの鋲)
    var bar = Math.max(0, Math.floor(st / (4 * SPB)));
    for (var b = 0; b < BARS; b++) game.draw.circle(W / 2 - 180 + b * 60, 212, 12, b < bar ? BRASS : (b === bar ? WHITE : '#4a2a18'));
    txt(Math.min(bar + 1, BARS) + ' / ' + BARS, W / 2 + 290, 212, 30, CLOTH);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.18, W - 160, 420, DARK);
    game.draw.rect(92, H * 0.18 + 12, W - 184, 396, '#3a2216');
    game.draw.rect(92, H * 0.18 + 12, W - 184, 8, BRASS);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.18 + 90, 96, won ? '#f6e08a' : RED);
    txt(Math.round(shine * 100) + '%   PERFECT ' + perfects, W / 2, H * 0.18 + 185, 42, CLOTH);
    txt('COMBO ' + maxCombo, W / 2, H * 0.18 + 245, 38, BRASS);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD ' + score, W / 2, H * 0.18 + 310, 48, '#f6e08a');
    else txt('SCORE ' + score + '  BEST ' + Math.max(prevBest, score), W / 2, H * 0.18 + 310, 38, CLOTH);
    if (!won) txt('あと' + Math.max(1, Math.round((NEED_SHINE - shine) * 100)) + '%!', W / 2, H * 0.18 + 375, 52, RED);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var pulseD = 1 - ((demo.songT % SPB) + SPB) % SPB / SPB;
      drawStreet(demo.songT, pulseD);
      drawShoe(demo.shine, t, false);
      drawCloth(demo.pull, -1, 0);
      game.draw.sprite(SHINER[demo.pull < -0.3 ? 1 : (demo.pull > 0.3 ? 2 : 0)], SPAL, CX, H * 0.66, 14, { anchor: 'center' });
      var litD = [false, false];
      for (var i = 0; i < demo.notes.length; i++) { var n = demo.notes[i]; if (!n.res && Math.abs(n.t - demo.songT) < 0.12) litD[n.side] = true; }
      drawPads(litD, demo.press > 0 ? demo.side : -1, demo.press > 0 ? 1 : 0, demo.missSide, demo.miss);
      drawNotes(demo.notes, demo.songT);
      game.draw.hand(demo.gx, PAD_Y + (demo.press > 0 ? 0 : -30), { press: demo.press > 0, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 96, BRASS);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 40, CLOTH);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 42, BRASS);
      else txt('TAP TO START', W / 2, H * 0.97, 40, CLOTH);
      return;
    }
    if (state === S.RESULT) {
      drawStreet(t, 0);
      drawShoe(shine, t, !won);
      drawResult();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 36, CLOTH);
      return;
    }

    // ── PLAYING ──
    if (pressK > 0) pressK = Math.max(0, pressK - dt * 8);
    if (missK > 0) missK -= dt;
    pull *= Math.exp(-dt * 8);
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { shine: Math.round(shine * 100), perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      // 曲の終わりに艶が足りない: 曇った靴を止めて見せる
      halt.t -= dt;
      if (halt.t <= 0) { game.feedback.bad(CX, H * 0.4, { text: 'MISS' }); game.audio.play('se_break', 0.3); halt = null; finish(false); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.2);
    } else {
      songT += dt;
      var e = Math.floor(songT / EIGHTH);
      if (e !== lastE && e >= 0 && e < BARS * 8) { lastE = e; playEighth(e, CHART); }
      var gone = expire(notes, songT);
      for (var g = 0; g < gone.length; g++) onResult({ res: 'MISS' }, gone[g].side);
      if (songT >= TIME_LIMIT) {
        if (shine >= NEED_SHINE) { game.fx.popup('FINISH', W / 2, H * 0.3, { color: '#f6e08a', size: 90 }); finish(true); }
        else halt = { t: 0.5 };
      }
    }

    var pulse = 1 - ((Math.max(0, songT) % SPB) / SPB);
    drawStreet(Math.max(0, songT), pulse);
    drawShoe(shine, t, !!halt);
    if (halt) game.draw.circle(CX - 120, H * 0.47, 200 * (1 + halt.t), '#ffffff33');
    drawCloth(pull, -1, 0);
    game.draw.sprite(SHINER[pull < -0.3 ? 1 : (pull > 0.3 ? 2 : 0)], SPAL, CX, H * 0.66 + (pressK > 0 ? 6 : 0), 14, { anchor: 'center' });
    var lit = [false, false];
    for (var k = 0; k < notes.length; k++) { var nn = notes[k]; if (!nn.res && Math.abs(nn.t - songT) < 0.12) lit[nn.side] = true; }
    drawPads(lit, pressSide, pressK, missSide, missK);
    drawNotes(notes, songT);
    // 開始時お手本: イントロの小節で最初に叩く側へ手を出す
    if (ready <= 0 && songT < 4 * SPB && songT > 0) game.draw.hand(PAD_X[0], PAD_Y - 20, { press: Math.floor(songT / SPB) % 2 === 1, scale: 12, alpha: 0.6 });
    drawHud(songT);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, BRASS);
    if (over) drawResult();
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 0.5], ['E5', 0.5], ['G4', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 2],
    ], { tempo: BPM, wave: 'triangle', volume: 0.04, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['F2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

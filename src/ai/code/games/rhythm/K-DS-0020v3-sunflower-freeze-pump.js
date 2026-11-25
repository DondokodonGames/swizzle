// K-DS-0020v3-sunflower-freeze-pump.js
// ひまわり畑のぴたり止め — 曲の拍ごとに拳を突き上げ、伴奏が抜けた拍はひまわりに見られながらぴたりと止まり、曲が戻る拍の頭で再び突き上げる
// 操作: 画面のどこでも押すと拳を突き上げる(押した瞬間で判定)。伴奏が鳴る拍の頭で押すとPERFECT/GOOD。小節の頭に上の芽ランプで閉じた芽の拍は伴奏が抜ける(1拍前にひまわりが一斉にこちらを向き始め、太鼓の合いの手が鳴る)。抜けた拍の間に触るとひまわりに見つかってMISS(抜けている間は拍ランプも消え、セミの声がおとりで鳴る)。伴奏が戻る拍の頭で押すと戻りボーナス。伴奏の拍の押し漏らし・拍の間の押しもMISS
// 終わり: 7小節+締めの1拍(約15秒)を終えてMISS3回以内ならCLEAR(判定の点+止まり切った拍+戻りボーナス)。MISS4回でGAME OVER
// @mechanic: freeze
// @theme: sunflower_farm_freeze_pump
// 世界観: 夏の農園のひまわり畑の真ん中の広場で、夏祭りに来た少女が、やぐらのスピーカーから流れる曲の拍に合わせて拳を突き上げ、曲が途切れた瞬間はこちらを向くひまわりたちに見られながらぴたりと止まる遊びをする
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・止まり切った拍数
// スタイル: 90s HANDHELD COLOR
var STYLE = { bg: ['#cfcb9c', '#aeb47e', '#e6dfb2'], main: ['#5d6c3b', '#d6a93e', '#7b5030'], accent: ['#bf5a4a', '#3e4b6a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 彩度を落とした日焼け液晶の少色。太く単純な形、密度を抑える
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], pale: STYLE.bg[2],
    leaf: STYLE.main[0], sun: STYLE.main[1], brown: STYLE.main[2],
    red: STYLE.accent[0], navy: STYLE.accent[1],
    dark: '#2e3324', skin: '#e8c49a', white: '#f4f0d8', grey: '#8f9478',
  };

  var GAME_TITLE = 'SUNFLOWER STOP';
  var BPM = 116;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.07;
  var GOOD_W = 0.16;
  var MISS_MAX = 4;
  // M = 伴奏が鳴る拍(突き上げる) / S = 伴奏が抜ける拍(止まる)
  var PATTERN = ['MMMM', 'MMMS', 'MMSS', 'MMMM', 'MSSS', 'MMSM', 'MSMS', 'M'];
  var TOTAL = 29;
  var TIME_LIMIT = TOTAL * SPB + 1.0;

  // 畑の歌(オリジナル)。拍ごとに8分2つ + ベース
  var SONG = [
    [['G4', 'B4'], ['D5', 'B4'], ['C5', 'E5'], ['D5', 'R']],
    [['B4', 'D5'], ['G5', 'D5'], ['E5', 'C5'], ['R', 'R']],
    [['A4', 'C5'], ['E5', 'C5'], ['R', 'R'], ['R', 'R']],
    [['G4', 'B4'], ['D5', 'G5'], ['F#5', 'D5'], ['E5', 'F#5']],
    [['G5', 'R'], ['R', 'R'], ['R', 'R'], ['R', 'R']],
    [['D5', 'B4'], ['G4', 'B4'], ['R', 'R'], ['C5', 'D5']],
    [['E5', 'R'], ['R', 'R'], ['D5', 'R'], ['R', 'R']],
    [['G5', 'G5']],
  ];
  var BASS = ['G2', 'D3', 'C3', 'D3'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, halfDone, nextSched, checkB;
  var hitBeat, movedBeat, hitStop, flashT, pumpT, caughtT, cicadaT;
  var score, perfects, goods, misses, frozen, spansOk, over, won, outroT, prevBest, milestone, nearOff;

  function typeOf(b) {
    if (b < 0 || b >= TOTAL) return 'X';
    var row = PATTERN[Math.floor(b / 4)];
    return row.charAt(b % 4) || 'X';
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; halfDone = false; nextSched = 1; checkB = 0;
    readyT = isDemo ? 0 : 0.8;
    hitBeat = []; movedBeat = []; hitStop = 0; flashT = 0; pumpT = 0; caughtT = 0; cicadaT = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; frozen = 0; spansOk = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; nearOff = -1;
    if (isDemo) startClock();
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; halfDone = false; nextSched = 1;
    playBeatMusic(0);
    onBeat(0);
  }

  function playBeatMusic(b) {
    if (typeOf(b) !== 'M') return;
    var bar = Math.floor(b / 4), p = SONG[bar][b % 4];
    var v = demoMode ? 0.5 : 1;
    game.audio.melody([[p[0], 0.5], [p[1], 0.5]], { tempo: BPM, wave: 'square', volume: 0.05 * v, bass: [[b === TOTAL - 1 ? 'G2' : BASS[b % 4], 1]], bassWave: 'triangle', bassVolume: 0.08 * v });
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    halfDone = false;
    var v = demoMode ? 0.5 : 1;
    var ty = typeOf(b);
    if (ty === 'M') {
      game.audio.tone(b % 4 === 0 ? 110 : 150, 0.1, { wave: 'triangle', volume: 0.18 * v, slide: -50 });
      // 次の拍で伴奏が抜ける: 太鼓の合いの手(予告)
      if (typeOf(b + 1) === 'S') game.audio.tone(330, 0.06, { wave: 'square', volume: 0.08 * v });
    }
  }
  function onHalf(b) {
    var v = demoMode ? 0.5 : 1;
    var ty = typeOf(b);
    if (ty === 'M' && typeOf(b + 1) === 'S') game.audio.tone(392, 0.06, { wave: 'square', volume: 0.09 * v });
    else if (ty === 'M') game.audio.tone(1800, 0.02, { wave: 'square', volume: 0.02 * v });
    // 抜けた拍の裏でセミが鳴く(おとり)
    if (ty === 'S' && typeOf(b - 1) === 'S') { cicadaT = 0.3; game.audio.tone(3100, 0.22, { wave: 'sawtooth', volume: 0.015 * v, slide: -400 }); }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    if (!halfDone && beatT >= SPB * 0.5) { halfDone = true; onHalf(beatN); }
    songT = beatN * SPB + beatT;
    // 次の拍の伴奏を少し前に仕込む(発音の遅れを吸収)
    if (nextSched < TOTAL && songT >= nextSched * SPB - 0.06) { playBeatMusic(nextSched); nextSched++; }
    while (checkB < TOTAL && songT > checkB * SPB + GOOD_W) {
      var ty = typeOf(checkB);
      if (ty === 'M' && !hitBeat[checkB]) { hitBeat[checkB] = true; missAt('lazy'); }
      else if (ty === 'S' && !movedBeat[checkB]) {
        frozen++; score += 30;
        if (typeOf(checkB + 1) !== 'S') {
          spansOk++;
          game.audio.tone(1047, 0.08, { wave: 'triangle', volume: demoMode ? 0.04 : 0.08 });
          if (!demoMode && spansOk === 3 && !milestone) {
            milestone = true;
            game.audio.play('se_milestone', 0.45);
            game.fx.popup('NICE', W / 2, H * 0.3, { color: C.red, size: 90 });
          }
        }
      }
      checkB++;
    }
    if (!demoMode && !over && songT > (TOTAL - 1) * SPB + GOOD_W + 0.5) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  var GX = W / 2, GY = Math.round(H * 0.69);

  function missAt(why, nb) {
    misses++;
    hitStop = 0.45; flashT = 0.45;
    if (why === 'moved') caughtT = 0.6;
    game.feedback.bad(GX, GY - 260, { text: 'MISS', shake: demoMode ? 4 : 12 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function pressAction() {
    if (!running || hitStop > 0) return 'none';
    var nb = Math.max(0, Math.min(TOTAL - 1, Math.round(songT / SPB)));
    var off = songT - nb * SPB;
    pumpT = 0.22;
    if (typeOf(nb) === 'S') { movedBeat[nb] = true; missAt('moved', nb); return 'miss'; }
    if (hitBeat[nb]) return 'dup';
    hitBeat[nb] = true;
    var w = judge(off);
    if (w === 'MISS') {
      if (nearOff < 0 || Math.abs(off) - GOOD_W < nearOff) nearOff = Math.abs(off) - GOOD_W;
      missAt('off'); return 'miss';
    }
    var reentry = typeOf(nb - 1) === 'S';
    if (w === 'PERFECT') { perfects++; score += 100; } else { goods++; score += 50; }
    game.feedback.good(GX + 120, GY - 300, { text: w, color: w === 'PERFECT' ? C.red : C.navy, size: w === 'PERFECT' ? 56 : 46, count: 8, volume: 0.22 });
    if (reentry) {
      score += 100;
      game.fx.popup('+100', GX - 160, GY - 360, { color: C.sun, size: 60 });
      game.fx.burst(GX, GY - 200, { color: C.sun, count: 14, speed: 320 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(150, W - 150), game.random(H * 0.35, H * 0.6), { color: i % 2 ? C.sun : C.red, count: 20, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var res = pressAction();
    if (res === 'dup') game.audio.play('se_tap', 0.15);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.dark, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // ひまわり: 後ろ向き(緑のがく)/ 振り向き途中 / こちらを見る(目と口)
  var FLOWER = [
    ['...y...', '..yyy..', '..ygy..', '..ggy..', '..ygy..', '..yyy..', '...y...'],
    ['..yyy..', '.ybbby.', 'yb-b-by', 'ybbbbby', 'ybbbbby', '.ybbby.', '..yyy..'],
    ['.yyyyy.', 'yybbbyy', 'ybwbwby', 'ybbbbby', 'ybbmbby', 'yybbbyy', '.yyyyy.'],
  ];
  var FPAL = { y: C.sun, g: C.leaf, b: C.brown, '-': C.dark, w: C.white, m: C.dark };
  var FLOWERS = [];
  (function plant() {
    var rows = [{ y: 0.40, px: 9, n: 7 }, { y: 0.47, px: 13, n: 5 }, { y: 0.56, px: 18, n: 4 }];
    for (var r = 0; r < rows.length; r++) {
      for (var i = 0; i < rows[r].n; i++) {
        var x = (i + 0.5) * (W / rows[r].n) + (r % 2 ? 40 : -20);
        if (r === 2 && Math.abs(x - W / 2) < 260) continue;
        FLOWERS.push({ x: x, y: Math.round(H * rows[r].y), px: rows[r].px, ph: i * 0.7 + r });
      }
    }
  })();

  var GIRL = [
    ['...hhhhhh...', '..hhhhhhhh..', '.hhhrrrrhhh.', '..kffffffk..', '..kfeffefk..', '..kffffffk..', '...ffmmff...', '....dddd....', '..dddddddd..', '..dddddddd..', '..dddddddd..', '..dddddddd..', '...f....f...', '...f....f...', '..bb....bb..'],
    ['...hhhhhh...', '..hhhhhhhh..', '.hhhrrrrhhh.', '..kffffffk..', '..kowffwok..', '..kffffffk..', '...ffOOff...', '....dddd....', '..dddddddd..', '..dddddddd..', '..dddddddd..', '..dddddddd..', '...f....f...', '...f....f...', '..bb....bb..'],
  ];
  var GPAL = { h: '#e2cf8a', r: C.red, k: C.brown, f: C.skin, e: C.dark, m: C.red, d: '#e8eef0', b: C.navy, o: C.white, w: C.dark, O: C.dark };
  var WHITE_PAL = { h: '#fff', r: '#fff', k: '#fff', f: '#fff', e: '#fff', m: '#fff', d: '#fff', b: '#fff', o: '#fff', w: '#fff', O: '#fff' };

  function watchLevel() {
    if (!running) return 0;
    var ty = typeOf(beatN);
    if (ty === 'S') return 1;
    if (typeOf(beatN + 1) === 'S') return Math.min(1, beatT / (SPB * 0.8));
    if (typeOf(beatN - 1) === 'S') return Math.max(0, 1 - beatT / 0.15);
    return 0;
  }

  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky0], [0.38, C.pale], [0.4, C.sky1], [1, C.leaf]]);
    // 雲と遠くの納屋
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 380 + t * 18) % (W + 300)) - 150;
      game.draw.circle(cx, H * 0.17 + c * 40, 60, C.white, 0.7);
      game.draw.circle(cx + 60, H * 0.17 + c * 40 + 10, 46, C.white, 0.7);
    }
    game.draw.rect(90, H * 0.33, 150, 110, C.red, 0.8);
    game.draw.rect(110, H * 0.31, 110, 40, C.brown, 0.8);
    game.draw.rect(150, H * 0.36, 30, 60, C.dark, 0.6);
    // スピーカーのやぐら(右)
    var sx = 920, sy = Math.round(H * 0.25);
    game.draw.rect(sx - 10, sy, 20, H * 0.38 - sy + 40, C.brown);
    game.draw.rect(sx - 70, H * 0.38, 140, 16, C.brown);
    var silent = running && typeOf(beatN) === 'S';
    var pulse = running && !silent ? Math.max(0, 1 - beatT / (SPB * 0.4)) : 0;
    for (var k = 0; k < 2; k++) {
      var hx = sx + (k ? 40 : -40), hy = sy + 10;
      game.draw.rect(hx - 30, hy - 26, 60, 52, silent ? C.grey : C.navy);
      game.draw.circle(hx + (k ? 30 : -30), hy, 34 + pulse * 10, silent ? C.grey : C.navy);
      game.draw.circle(hx + (k ? 30 : -30), hy, 18 + pulse * 8, C.pale, silent ? 0.3 : 0.8);
    }
    // 広場の土
    game.draw.circle(W / 2, H * 0.78, 470, '#b8a46a');
    game.draw.circle(W / 2, H * 0.78, 430, '#c9b57a');
  }

  function drawFlowers() {
    var t = game.time.elapsed;
    var wl = watchLevel();
    var caught = caughtT > 0;
    var frame = wl >= 0.95 ? 2 : (wl > 0.15 ? 1 : 0);
    for (var i = 0; i < FLOWERS.length; i++) {
      var f = FLOWERS[i];
      var sway = frame === 0 ? Math.sin(t * 2.2 + f.ph) * f.px * 0.6 : 0;
      var stemTop = f.y + f.px * 3;
      game.draw.line(f.x, stemTop, f.x, f.y + f.px * 12, C.leaf, f.px * 0.9);
      game.draw.rect(f.x, f.y + f.px * 7, f.px * 3, f.px * 1.4, C.leaf);
      game.draw.sprite(FLOWER[frame], caught ? { y: C.red, g: C.leaf, b: C.brown, '-': C.dark, w: C.white, m: C.dark } : FPAL, f.x + sway, f.y, f.px, { anchor: 'center' });
    }
  }

  function drawGirl() {
    var t = game.time.elapsed;
    var white = flashT > 0;
    var sc = white ? 1 + (flashT / 0.45) * 0.25 : 1;
    var px = 20 * sc;
    var silent = running && typeOf(beatN) === 'S';
    var bob = silent ? 0 : Math.abs(Math.sin((running ? songT / SPB : t * 2) * Math.PI)) * -8;
    var y = GY + bob;
    for (var i = -2; i <= 2; i++) game.draw.circle(GX + i * 40, GY + 165, 50 - Math.abs(i) * 10, C.dark, 0.25);
    game.draw.sprite(GIRL[caughtT > 0 ? 1 : 0], white ? WHITE_PAL : GPAL, GX, y, px, { anchor: 'center' });
    var shY = y - 150 * sc + 8 * px;
    var rx = GX + 4 * px, lx = GX - 4 * px;
    var armCol = white ? '#ffffff' : C.skin;
    if (pumpT > 0) {
      game.draw.line(rx, shY, rx + 40, shY - 220, armCol, 22);
      game.draw.circle(rx + 40, shY - 220, 30, armCol);
      game.draw.circle(rx + 40, shY - 220, 70 * (pumpT / 0.22), C.sun, 0.3);
    } else if (silent) {
      // ぴたり止めのポーズ(腕を斜めに上げたまま固まる)
      game.draw.line(rx, shY, rx + 110, shY - 110, armCol, 22);
      game.draw.circle(rx + 110, shY - 110, 28, armCol);
      game.draw.circle(GX + 70, y - 110, 9, '#9fc4e0');
    } else {
      game.draw.line(rx, shY, rx + 60, shY + 110, armCol, 22);
      game.draw.circle(rx + 60, shY + 110, 26, armCol);
    }
    game.draw.line(lx, shY, lx - 60, shY + 110, armCol, 22);
  }

  function drawBuds() {
    var bar = Math.min(PATTERN.length - 1, Math.floor(beatN / 4));
    var row = PATTERN[bar];
    var pos = beatN % 4;
    var silent = running && typeOf(beatN) === 'S';
    var y = Math.round(H * 0.16);
    game.draw.rect(0, y - 70, W, 140, C.dark, 0.35);
    for (var i = 0; i < 4; i++) {
      var x = W / 2 - 300 + i * 200;
      var ch = row.charAt(i);
      if (!ch) { game.draw.circle(x, y, 14, C.grey, 0.5); continue; }
      var lit = running && !silent && i === pos ? 1 - beatT / SPB : 0;
      game.draw.line(x, y + 20, x, y + 60, C.leaf, 8);
      if (ch === 'M') {
        game.draw.circle(x, y, 44 + lit * 12, C.sun, 0.55 + lit * 0.45);
        game.draw.circle(x, y, 22, C.brown);
      } else {
        // 閉じた芽 = 伴奏が抜ける拍
        game.draw.circle(x, y + 6, 26, C.leaf);
        game.draw.circle(x, y - 14, 14, C.leaf);
        game.draw.circle(x, y + 6, 10, C.sun, 0.5);
      }
    }
  }

  function drawPad() {
    var x = W / 2, y = Math.round(H * 0.885);
    var silent = running && typeOf(beatN) === 'S';
    var p = pumpT > 0;
    game.draw.circle(x, y + 12, 150, C.dark, 0.3);
    game.draw.circle(x, y + (p ? 8 : 0), p ? 136 : 146, silent ? C.grey : C.red);
    if (silent) {
      // 見られている: 目のしるし
      game.draw.circle(x, y, 60, C.white);
      game.draw.circle(x, y, 26, C.dark);
    } else {
      game.draw.circle(x, y - 10 + (p ? 8 : 0), 46, C.skin);
      game.draw.rect(x - 46, y - 10 + (p ? 8 : 0), 92, 34, C.skin);
    }
  }

  function scanlines() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, C.dark, 0.05);
  }

  function drawScene() {
    drawField();
    drawFlowers();
    drawGirl();
    drawBuds();
    drawPad();
    if (cicadaT > 0) game.draw.circle(160, H * 0.42, 30 + (0.3 - cicadaT) * 120, C.white, cicadaT);
    scanlines();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.dark, 0.85);
    label('SCORE ' + score, 50, 96, 52, C.pale, 'left');
    label('BEST ' + prevBest, 50, 168, 32, C.sun, 'left');
    for (var i = 0; i < MISS_MAX; i++) game.draw.circle(W - 300 + i * 70, 80, 20, i < misses ? C.red : C.grey);
    var bar = Math.min(PATTERN.length, Math.floor(beatN / 4) + 1);
    label(bar + ' / ' + PATTERN.length, W - 60, 180, 44, C.pale, 'right');
  }

  // ---- ATTRACT: 実ロジックで伴奏の拍は突き上げ、1小節目の抜けた拍はぴたり止め、2小節目の抜けた拍でつい触ってMISS ----
  var demo = { t: 0, press: 0 };
  var DEMO_LEN = 13 * SPB + 0.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.next = 0; }
    if (running && hitStop <= 0) {
      var nt = songT + dt;
      while (demo.next < TOTAL && typeOf(demo.next) === 'S' && demo.next !== 11) demo.next++;
      if (demo.next < TOTAL && nt >= demo.next * SPB - 0.005) { pressAction(); demo.press = 0.18; demo.next++; }
    }
    if (demo.press > 0) demo.press -= dt;
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (pumpT > 0) pumpT -= dt;
    if (caughtT > 0) caughtT -= dt;
    if (cicadaT > 0) cicadaT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, H * 0.885 + 30, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.dark, 0.85);
      label(GAME_TITLE, W / 2, 110, 80 + Math.sin(t * 3) * 3, C.sun);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.pale);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.225, 56, C.red);
      else label('TAP TO START', W / 2, H * 0.225, 48, C.navy);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.25, W, H * 0.33, C.dark, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.sun : C.red);
      label('SCORE ' + score, W / 2, H * 0.37, 60, C.pale);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.41, 36, C.sun);
      game.draw.circle(W / 2 - 80, H * 0.445 - 14, 26, C.leaf);
      game.draw.circle(W / 2 - 80, H * 0.445 - 14, 10, C.sun, 0.6);
      label(String(frozen), W / 2 + 10, H * 0.445, 46, C.pale);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.5, 54, C.red);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.5, 40, C.sun);
      if (!won) label(nearOff >= 0 ? 'あと' + Math.max(0.01, nearOff).toFixed(2) + '秒' : 'あと' + Math.max(1, PATTERN.length - Math.floor(beatN / 4)) + '小節', W / 2, H * 0.27, 52, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.55, 38, C.pale);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, frozenBeats: frozen };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.3, 110, C.red);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

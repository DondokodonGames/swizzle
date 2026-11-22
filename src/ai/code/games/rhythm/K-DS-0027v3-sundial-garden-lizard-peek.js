// K-DS-0027v3-sundial-garden-lizard-peek.js
// 日時計の庭のトカゲ — 影の針が拍ごとに一目盛りずつ回る間はじっと隠れ、針が印のある石像を指した拍の頭だけ、その石像の陰のトカゲに顔を出させる。雲が太陽を隠して影も伴奏も消える間も拍を数え続ける
// 操作: 日時計の影の針は1拍で1目盛り(8目盛りで一周)進む。まわりの4体の石像のうち、足もとに金の印が光る石像を針が指した拍の頭で、その石像を押す(拍の頭からのずれでPERFECT/GOOD)。それ以外の時に画面に触れる(身じろぎ)・違う石像・印を指した拍を見送るとMISS。5〜6小節目は雲が太陽を隠し、影の針・拍の灯・伴奏がすべて消える(雲が来る0.6秒前に風鈴が鳴る)。印は見えたままなので拍を数えて押す
// 終わり: 前奏1小節+6小節半(96BPM・約19秒・印9回)を終えてMISS 2回以内ならCLEAR(判定の点×連続ボーナス、雲の間は2倍+無傷なら雲明けボーナス)。MISS 3回でGAME OVER
// @mechanic: freeze
// @theme: sundial_garden_lizard_peek
// 世界観: 昼下がりの日時計の庭で、石像の陰に潜むトカゲたちが、影の針が金の印に届く拍の一瞬だけ顔を出して日を浴び、雲が日差しを遮った間も拍を数えて出番を待つ
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・雲の間に顔を出せた回数
// スタイル: 8bit HOME

(function(game) {
  var STYLE = { bg: ['#3cbcfc', '#a4e4fc', '#00a800'], main: ['#00a800', '#bcbcbc', '#f8b800'], accent: ['#f83800', '#000000'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 粗いドット(8px格子)、輪郭線なし、少色。背景は芝の市松とレンガのタイル反復
  var C = {
    sky: STYLE.bg[0], skyLow: STYLE.bg[1], grass: STYLE.main[0], grassDark: '#005800', stone: STYLE.main[1], stoneDark: '#7c7c7c',
    stoneDeep: '#3c3c3c', gold: STYLE.main[2], red: STYLE.accent[0], black: STYLE.accent[1], white: '#fcfcfc', brick: '#a81000', brickLight: '#e45c10',
    lizard: '#58d854', lizardDark: '#00a844'
  };

  var GAME_TITLE = 'SUNDIAL PEEK';
  var BPM = 96;
  var SPB = 60 / BPM;
  var LEAD = 0.06;
  var PERFECT_W = 0.06;
  var GOOD_W = 0.13;
  var TOTAL_BEATS = 30;
  var MISS_MAX = 3;
  var CUES = [6, 8, 12, 14, 18, 22, 24, 26, 28];   // 針が印の石像を指す拍(石像 = (拍%8)/2)
  var BREAK_A = 16, BREAK_B = 24;                   // 5〜6小節目: 雲で影も伴奏も消える
  var DEMO_BEATS = 16;
  var DEMO_CUES = [6, 8, 12, 14];
  var DEMO_FIDGET = 10;                              // デモはこの拍で印の無い石像を押してMISSを見せる

  var CX = 536, CY = 960, DIAL_R = 304, NEEDLE_R = 272, STATUE_R = 384, MARK_R = 330;
  var LAMP_Y = 296;

  // ---- スプライト ----
  var STATUE = ['...llll...', '..llllll..', '..ldlldl..', '..llllll..', '...llll...', '..gggggg..', '.gggggggg.', '.gglggggg.', '.gggggggg.', '..gggggg..', '..gggggg..', '.dddddddd.', 'dddddddddd'];
  var PAL_STATUE = { l: C.stone, g: C.stoneDark, d: C.stoneDeep };
  var PAL_WHITE = { l: C.white, g: C.white, d: '#fcd8a8' };
  var LZ_A = ['..gggg...', '.gkgggggg', 'ggggggg..', '.gggggg..', '..g...g..'];
  var LZ_B = ['..gggg...', '.gkgggggg', 'gggggggrr', '.gggggg..', '..g...g..'];
  var TAIL_A = ['gg....', '.ggg..', '...gg.'];
  var TAIL_B = ['....gg', '..ggg.', '.gg...'];
  var PAL_LZ = { g: C.lizard, k: C.black, r: C.red };
  var BIRD_A = ['.bb...', 'bkbbo.', 'bbbb..', '.bwbb.', '..y.y.'];
  var BIRD_B = ['b....b', 'bb.bbo', '.bbbb.', '..bb..', '......'];
  var PAL_BIRD = { b: '#ac7c00', k: C.black, o: C.gold, w: C.white, y: C.gold };
  var MARK = ['...y...', '..yyy..', '.yyoyy.', 'yyoooyy', '.yyoyy.', '..yyy..', '...y...'];
  var PAL_MARK = { y: C.gold, o: C.white };
  var MARK_DIM = { y: '#887000', o: '#c8a800' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, cues, endBeats, running, songT, beatN, schedB, readyT, hitStop, flashT, beatPulse;
  var judged, peekT, flinch, score, perfects, goods, misses, combo, maxCombo, peeks, breakPeeks, breakMiss;
  var over, won, outroT, prevBest, milestone, chimeDone, clearDone, bird, rings;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function snap(v) { return Math.round(v / 8) * 8; }
  function statueOfBeat(b) { var p = ((b % 8) + 8) % 8; return p % 2 ? -1 : p / 2; }   // 0=北 1=東 2=南 3=西
  function statuePos(s) { var a = -Math.PI / 2 + s * Math.PI / 2; return { x: snap(CX + Math.cos(a) * STATUE_R), y: snap(CY + Math.sin(a) * STATUE_R) }; }
  function isBreak(b) { return !demoMode && b >= BREAK_A && b < BREAK_B; }
  function cloudCover() {
    if (demoMode) return 0;
    var bt = songT / SPB;
    if (bt < BREAK_A - 1.5 || bt > BREAK_B + 0.6) return 0;
    if (bt < BREAK_A) return ease((bt - (BREAK_A - 1.5)) / 1.5);
    if (bt < BREAK_B) return 1;
    return 1 - ease((bt - BREAK_B) / 0.6);
  }
  function needlePos(t) { var b = Math.floor(t), fr = t - b; return b + ease((fr - 0.86) / 0.14); }   // 拍の頭でちょうど次の目盛りに着く

  function initGame(isDemo) {
    demoMode = !!isDemo;
    cues = demoMode ? DEMO_CUES : CUES;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    running = false; songT = 0; beatN = 0; schedB = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; beatPulse = 0;
    judged = {}; peekT = [0, 0, 0, 0]; flinch = [0, 0, 0, 0];
    score = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; peeks = 0; breakPeeks = 0; breakMiss = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; chimeDone = false; clearDone = false;
    bird = { x: CX + 8, y: CY - 70, vy: 0, away: 0 }; rings = [];
    if (demoMode) startClock();
  }

  function startClock() { running = true; songT = 0; beatN = 0; schedB = 0; beatPulse = 1; }

  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル: 矩形波の8分 + 三角波のベース)。雲の小節は完全に無音 ----
  var MEL = [
    ['F#5', 'A5', 'D6', 'A5', 'F#5', 'E5', 'D5', 'E5'],
    ['D5', 'F#5', 'B5', 'F#5', 'D5', 'C#5', 'B4', 'C#5'],
    ['B4', 'D5', 'G5', 'D5', 'B4', 'D5', 'E5', 'F#5'],
    ['E5', 'A5', 'C#6', 'A5', 'G5', 'F#5', 'E5', 'C#5']
  ];
  var BASS = [['D3', 'A2', 'D3', 'A2'], ['B2', 'F#2', 'B2', 'F#2'], ['G2', 'D3', 'G2', 'D3'], ['A2', 'E2', 'A2', 'C#3']];
  function playBeatMusic(b) {
    if (demoMode || isBreak(b)) return;
    var bar = Math.floor(b / 4) % 4, i = b % 4;
    var mel = b < 4 ? [['R', 1]] : [[MEL[bar][i * 2], 0.5], [MEL[bar][i * 2 + 1], 0.5]];
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.035, bass: [[BASS[bar][i], 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: 0.13 });
  }

  function cueIndex(b) { for (var i = 0; i < cues.length; i++) if (cues[i] === b) return i; return -1; }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < endBeats && songT >= schedB * SPB - LEAD) { playBeatMusic(schedB); schedB++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; if (!isBreak(beatN)) beatPulse = 1; }
    // 予告: 雲が太陽を隠す0.6秒前に風鈴
    if (!demoMode && !chimeDone && songT >= BREAK_A * SPB - 0.6) {
      chimeDone = true;
      sfxTone('E6', 0.4, { wave: 'sine', volume: 0.07 });
      sfxTone('B6', 0.5, { wave: 'sine', volume: 0.05 });
    }
    // 雲明け: 雲の間をMISSなしで乗り切ったらボーナス
    if (!demoMode && !clearDone && songT >= BREAK_B * SPB) {
      clearDone = true;
      if (breakMiss === 0) {
        score += 300;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('BONUS +300', CX, CY - 120, { color: C.gold, size: 70 });
      }
    }
    // 見送った印
    for (var i = 0; i < cues.length; i++) {
      var b = cues[i];
      if (judged[b] || songT <= b * SPB + GOOD_W) continue;
      judged[b] = 'skip';
      missAt(statueOfBeat(b), b);
      if (over) return;
    }
    if (songT >= endBeats * SPB + 0.1) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function statueAt(x, y) {
    for (var s = 0; s < 4; s++) {
      var p = statuePos(s);
      if (Math.abs(x - p.x) < 120 && Math.abs(y - p.y) < 130) return s;
    }
    return -1;
  }

  function missAt(s, b) {
    misses++; combo = 0;
    if (b >= 0 && isBreak(b)) breakMiss++;
    hitStop = 0.38; flashT = 0.38;
    if (s >= 0) flinch[s] = 0.5;
    bird.away = 1.6; bird.vy = -900;
    var p = s >= 0 ? statuePos(s) : { x: CX, y: CY };
    sfxTone(1800, 0.06, { wave: 'square', volume: 0.05, slide: 600 });
    if (demoMode) { game.fx.popup('MISS', p.x, p.y - 140, { color: C.red, size: 58 }); game.fx.shake(5, 0.2); }
    else game.feedback.bad(p.x, p.y - 140, { text: 'MISS', shake: 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function pressAt(x, y) {
    if (!running || hitStop > 0 || over) return 'none';
    rings.push({ x: x, y: y, t: 0.25 });
    if (songT < 3.5 * SPB) return 'intro';                  // 前奏の間はまだ身じろぎを数えない
    var s = statueAt(x, y);
    var b = Math.round(songT / SPB);
    var off = songT - b * SPB, a = Math.abs(off);
    var isCue = cueIndex(b) >= 0 && !judged[b];
    if (isCue && a <= GOOD_W && s === statueOfBeat(b)) {
      var w = a <= PERFECT_W ? 'PERFECT' : 'GOOD';
      judged[b] = w;
      peekT[s] = 0.7;
      combo++; if (combo > maxCombo) maxCombo = combo;
      peeks++;
      var br = isBreak(b);
      if (br) breakPeeks++;
      score += Math.round((w === 'PERFECT' ? 100 : 50) * (1 + Math.floor(combo / 4) * 0.5) * (br ? 2 : 1));
      if (w === 'PERFECT') perfects++; else goods++;
      var p = statuePos(s);
      if (demoMode) game.fx.popup(w, p.x, p.y - 150, { color: C.gold, size: 50 });
      else game.feedback.good(p.x, p.y - 150, { text: w, color: C.gold, size: w === 'PERFECT' ? 54 : 46, count: 10, volume: 0.15 });
      sfxTone(['C6', 'E6', 'G6', 'A6'][s], 0.12, { wave: 'square', volume: 0.05 });
      if (!demoMode && combo === 5 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('5 COMBO', CX, CY + 120, { color: C.white, size: 70 });
      }
      return 'ok';
    }
    if (isCue && a <= 0.3) judged[b] = 'miss';
    missAt(s, isCue ? b : -1);
    return 'miss';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var s = 0; s < 4; s++) { peekT[s] = 2.2; var p = statuePos(s); game.fx.burst(p.x, p.y - 60, { color: s % 2 ? C.gold : C.lizard, count: 16, speed: 380 }); }
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    for (var s = 0; s < 4; s++) { if (peekT[s] > 0) peekT[s] -= dt; if (flinch[s] > 0) flinch[s] -= dt; }
    if (bird.away > 0) {
      bird.away -= dt; bird.y += bird.vy * dt; bird.vy += 300 * dt;
      if (bird.away <= 0) { bird.y = CY - 70; bird.vy = 0; }
    }
    for (var i = rings.length - 1; i >= 0; i--) { rings[i].t -= dt; if (rings[i].t <= 0) rings.splice(i, 1); }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    game.audio.tone(statueAt(x, y) >= 0 ? 520 : 300, 0.03, { wave: 'square', volume: 0.03 });
    pressAt(x, y);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画(8px格子のドット) ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function pixDisc(cx, cy, r, col, st) {
    for (var dy = -r; dy < r; dy += st) {
      var k = 1 - Math.pow((dy + st / 2) / r, 2);
      if (k <= 0) continue;
      var hw = snap(r * Math.sqrt(k));
      game.draw.rect(snap(cx - hw), snap(cy + dy), hw * 2, st, col);
    }
  }

  function drawGarden(cover) {
    var t = game.time.elapsed;
    game.draw.gradient(0, 440, [[0, C.sky], [1, C.skyLow]]);
    // 遠景: 生け垣と太陽
    var sunX = 880, sunY = 330;
    for (var r = 0; r < 8; r++) {
      var a = r * Math.PI / 4 + (Math.floor(t * 2) % 2) * 0.2;
      game.draw.rect(snap(sunX + Math.cos(a) * 92) - 8, snap(sunY + Math.sin(a) * 92) - 8, 16, 16, C.gold);
    }
    pixDisc(sunX, sunY, 64, C.gold, 8);
    pixDisc(sunX - 8, sunY - 8, 40, '#fce0a8', 8);
    // 雲(右から太陽へ流れてくる)
    var cx = snap(1400 - cover * 520 + Math.sin(t) * 6);
    if (cover > 0) {
      var blobs = [[0, 0, 80], [-90, 24, 64], [90, 24, 64], [-40, -40, 56], [50, -36, 56]];
      for (var b = 0; b < blobs.length; b++) pixDisc(cx + blobs[b][0], sunY + blobs[b][1], blobs[b][2], C.white, 8);
    }
    for (var h = 0; h < 18; h++) {
      var hh = 48 + (h % 3) * 16;
      game.draw.rect(h * 64, 440 - hh, 64, hh, h % 2 ? C.grassDark : '#007800');
    }
    // 芝の市松
    game.draw.rect(0, 440, W, 1080, C.grass);
    for (var gy = 0; gy < 17; gy++) for (var gx = 0; gx < 17; gx++) if ((gx + gy) % 2) game.draw.rect(gx * 64, 440 + gy * 64, 64, 64, '#00b800');
    // 手前のレンガ道
    game.draw.rect(0, 1520, W, H - 1520, C.brick);
    for (var by = 0; by < 13; by++) for (var bx = 0; bx < 10; bx++) game.draw.rect(bx * 128 + (by % 2) * 64, 1520 + by * 32, 120, 24, C.brickLight);
    // 石畳の輪
    pixDisc(CX, CY, STATUE_R + 72, '#d8d8a0', 16);
    pixDisc(CX, CY, STATUE_R - 56, C.grass, 16);
  }

  function drawDial(cover) {
    var bt = songT / SPB;
    pixDisc(CX, CY + 16, DIAL_R, C.stoneDeep, 16);
    pixDisc(CX, CY, DIAL_R, C.stone, 16);
    pixDisc(CX, CY, DIAL_R - 48, '#d8d8d8', 16);
    for (var s = 0; s < 8; s++) {
      var a = -Math.PI / 2 + s * Math.PI / 4;
      var big = s % 2 === 0;
      game.draw.rect(snap(CX + Math.cos(a) * (DIAL_R - 24)) - (big ? 12 : 8), snap(CY + Math.sin(a) * (DIAL_R - 24)) - (big ? 12 : 8), big ? 24 : 16, big ? 24 : 16, C.stoneDeep);
    }
    // 影の針(雲の間は消える)
    var shade = 1 - cover;
    if (shade > 0.02 && running) {
      var a2 = -Math.PI / 2 + needlePos(bt) * Math.PI / 4;
      for (var r = 32; r < NEEDLE_R; r += 16) {
        var sz = r < NEEDLE_R - 64 ? 24 : 16;
        game.draw.rect(snap(CX + Math.cos(a2) * r) - sz / 2, snap(CY + Math.sin(a2) * r) - sz / 2, sz, sz, '#5c5c5c', shade);
      }
    } else if (!running && !over) {
      for (var r2 = 32; r2 < NEEDLE_R; r2 += 16) game.draw.rect(CX - 12, snap(CY - r2) - 12, 24, 24, '#5c5c5c');
    }
    // 中央の指時針
    game.draw.rect(CX - 24, CY - 40, 48, 64, C.stoneDeep);
    game.draw.rect(CX - 16, CY - 72, 32, 40, C.stoneDark);
    // 金の印(印のある石像の前の文字盤の縁)
    for (var i = 0; i < cues.length; i++) {
      var cb = cues[i];
      if (judged[cb] && judged[cb] !== 'skip' && judged[cb] !== 'miss') continue;
      if (bt <= cb - 7.5 || bt > cb + GOOD_W / SPB) continue;
      var st = statueOfBeat(cb), ma = -Math.PI / 2 + st * Math.PI / 2;
      var soon = !isBreak(cb) && cb * SPB - songT <= SPB && cb * SPB - songT > -GOOD_W;
      var on = !soon || Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.sprite(MARK, on ? PAL_MARK : MARK_DIM, snap(CX + Math.cos(ma) * MARK_R), snap(CY + Math.sin(ma) * MARK_R), soon ? 12 : 9, { anchor: 'center' });
    }
    // 小鳥(身じろぎすると飛び立つ)
    var bf = bird.away > 0 ? (Math.floor(game.time.elapsed * 12) % 2 ? BIRD_A : BIRD_B) : BIRD_A;
    game.draw.sprite(bird.away > 0 ? BIRD_B : bf, PAL_BIRD, CX + 8 + (bird.away > 0 ? (1.6 - bird.away) * 260 : 0), bird.y - 40, 8, { anchor: 'center' });
  }

  function drawStatues() {
    var t = game.time.elapsed;
    for (var s = 0; s < 4; s++) {
      var p = statuePos(s);
      var dir = s === 3 ? 1 : -1;            // 文字盤の方へ顔を出す
      var fl = flinch[s] > 0 && hitStop > 0;
      var flash = flashT > 0 && fl && Math.floor(flashT * 20) % 2 === 0;
      game.draw.rect(p.x - 64, p.y + 56, 128, 16, C.grassDark);
      // しっぽ(隠れている間もときどき揺れる)
      var tailArt = Math.floor(t * 2 + s) % 3 === 0 ? TAIL_B : TAIL_A;
      if (peekT[s] <= 0) game.draw.sprite(tailArt, PAL_LZ, p.x - dir * 64, p.y + 40, 8, { anchor: 'center', flipX: dir > 0 });
      game.draw.sprite(STATUE, flash ? PAL_WHITE : PAL_STATUE, p.x, p.y, fl ? 11 : 10, { anchor: 'center' });
      if (peekT[s] > 0) {
        var up = ease(Math.min(1, (0.7 - Math.min(0.7, peekT[s])) / 0.08 + (peekT[s] > 0.7 ? 1 : 0)));
        var art = Math.floor(t * 8) % 2 ? LZ_B : LZ_A;
        game.draw.sprite(art, PAL_LZ, p.x + dir * (40 + up * 56), p.y - 24, 10, { anchor: 'center', flipX: dir < 0 });
        game.draw.rect(p.x + dir * 72 - 16, p.y - 96, 8, 8, C.gold);
        game.draw.rect(p.x + dir * 100, p.y - 112, 8, 8, C.white);
      } else if (fl) {
        game.draw.sprite(LZ_A, { g: C.white, k: C.black, r: C.red }, p.x + dir * 70, p.y - 24, 12, { anchor: 'center', flipX: dir < 0 });
      }
    }
  }

  // 拍の灯: 1小節に4つ(1拍目が大きい)。雲の間は消える
  function drawLamps(cover) {
    var cur = beatN % 4;
    for (var i = 0; i < 4; i++) {
      var x = 120 + i * 120, on = running && i === cur && cover < 0.5;
      var sz = i === 0 ? 48 : 40;
      game.draw.rect(x - sz / 2, LAMP_Y - sz / 2 - (on ? snap(beatPulse * 16) : 0), sz, sz, on ? C.gold : (cover >= 0.5 ? '#2c5c8c' : '#fcfcfc'));
    }
  }

  function drawScene() {
    var cover = cloudCover();
    drawGarden(cover);
    drawDial(cover);
    drawStatues();
    if (cover > 0) game.draw.rect(0, 440, W, 1080, '#002858', 0.32 * cover);
    drawLamps(cover);
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i], d = snap(48 - r.t * 120);
      game.draw.rect(r.x - d, r.y - d, 16, 16, C.white); game.draw.rect(r.x + d - 16, r.y - d, 16, 16, C.white);
      game.draw.rect(r.x - d, r.y + d - 16, 16, 16, C.white); game.draw.rect(r.x + d - 16, r.y + d - 16, 16, 16, C.white);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.black);
    label('SCORE ' + score, 56, 96, 52, C.white, 'left');
    label('BEST ' + prevBest, 56, 168, 32, C.gold, 'left');
    label(peeks + ' / ' + cues.length, W - 56, 100, 52, C.lizard, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.rect(W - 248 + i * 64, 160, 40, 40, i < misses ? C.red : '#3c3c3c');
    game.draw.rect(0, 224, snap(W * Math.min(1, songT / (endBeats * SPB))), 8, C.gold);
  }

  function drawResult(t) {
    game.draw.rect(64, H * 0.25, W - 128, H * 0.36, C.black, 0.92);
    game.draw.rect(64, H * 0.25, W - 128, 16, won ? C.lizard : C.red);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 58, C.white);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 34, C.lizard);
    label(maxCombo + ' COMBO', W / 2, H * 0.455, 40, C.gold);
    game.draw.sprite(LZ_A, PAL_LZ, W / 2 - 150, H * 0.497, 9, { anchor: 'center' });
    label(peeks + ' / ' + cues.length + '   ☁ ' + breakPeeks, W / 2 + 40, H * 0.505, 40, C.white);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 50, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, C.gold);
    if (!won) label('あと' + Math.max(1, cues.length - peeks) + '回', W / 2, H * 0.22, 60, C.red);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.59, 36, C.white);
  }

  // ---- ATTRACT: 実ロジックで印の石像を拍の頭に押し、10拍目は印の無い石像を押して小鳥が飛び立つMISS ----
  var demo = { t: 0, x: CX, y: 1640, press: 0, done: {} };
  var DEMO_LEN = DEMO_BEATS * SPB + 1.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = 0; demo.done = {}; }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
    var tx = CX + 160, ty = 1640;
    if (running && hitStop <= 0) {
      var nb = Math.floor(songT / SPB) + 1;
      var targets = DEMO_CUES.concat([DEMO_FIDGET]);
      for (var k = 0; k < 2; k++) {
        var b = Math.round(songT / SPB) + k;
        if (targets.indexOf(b) >= 0 && !demo.done[b] && b * SPB - songT < SPB * 0.9) {
          var p = statuePos(statueOfBeat(b));
          tx = p.x; ty = p.y + 40;
          if (songT >= b * SPB - 0.008) { demo.done[b] = true; pressAt(p.x, p.y + 20); demo.press = 0.18; }
          break;
        }
      }
      if (nb < 0) tx = CX;
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    demo.y += (ty - demo.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 232, C.black);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.lizard);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1760, 50, C.gold);
      else label('TAP TO START', W / 2, 1760, 46, C.white);
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
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, peeks: peeks, breakPeeks: breakPeeks };
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
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.gold);
    if (over && outroT > 1.5) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.5, 100, won ? C.gold : C.red);
    else if (over || state === S.RESULT) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

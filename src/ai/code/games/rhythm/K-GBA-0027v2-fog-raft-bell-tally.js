// K-GBA-0027v2-fog-raft-bell-tally.js
// 霧の筏鐘かぞえ — 霧の入り江で違う速さの鐘が重なる中、印の鐘が裏拍で鳴った数だけを数え、2小節目の終わりの裏拍で潮見板の目盛りを合わせて答える
// 操作: 1回は2小節。赤い灯の付いた浮き鐘は裏拍(ウラ)にだけ鳴り、ほかの鐘は表拍・付点・2拍おきの違う速さで鳴る。画面を押したまま左右に滑らせると下の潮見板(1〜6)の真鍮の針が動く(数えながら1つずつ進めてよい)。親方の灯が上がってから1拍半後、2小節目4拍目のウラちょうどに指を離す(目盛りをタップしてもよい)。数が合い拍のずれが小さければPERFECT/GOOD。数違い・表拍で離す・離さないはMISS
// 終わり: 3回答えてMISS1回以内ならCLEAR(判定の点+数の多さ+残りの貝ボーナス)。MISS2回でGAME OVER
// @mechanic: counting
// @theme: foggy_oyster_raft_bell_tally
// 世界観: 霧の立ちこめる入り江の牡蠣筏で、養殖漁師の娘が小舟から、自分の筏に吊った印の鐘が波で鳴った数だけを数え、小節の終わりの裏拍で潮見板の目盛りを合わせて岸の親方に知らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・数え当てた回数・PERFECT/GOOD/MISS数
// スタイル: 90s PRE-RENDER

(function(game) {
  var STYLE = { bg: ['#0c1216', '#22303a', '#56666a'], main: ['#b08a4a', '#7c8e92', '#d6cfbb'], accent: ['#e2503a', '#f2d68a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 霧・山影・筏・粒状ノイズの背景は動かない1枚絵として毎回同じに描き込み、鐘と人物だけドットで動かす。真鍮に金属のハイライト
  var C = {
    night: STYLE.bg[0], deep: STYLE.bg[1], fog: STYLE.bg[2],
    brass: STYLE.main[0], steel: STYLE.main[1], bone: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1],
    ink: '#05080a', water: '#16222a', wood: '#4a3422', woodL: '#7a5a3a', dbrass: '#6a5028', green: '#86c294', gray: '#3a464c'
  };

  var GAME_TITLE = 'FOG BELL TALLY';
  var BPM = 120, SPB = 60 / BPM;
  var PERFECT_W = 0.06, GOOD_W = 0.12;
  var READY_T = 0.8, LIVES = 2;
  var ROUND_N = 3, LEAD = 2, RB = 8;              // 1回 = 2小節(8拍)。頭に2拍の前ノリ
  var ANS_OFF = 7.5, WARN_OFF = 6;                 // 答えは2小節目4拍目のウラ。親方の灯はその1拍半(0.75秒)前
  var END_BEAT = LEAD + ROUND_N * RB;
  var TIME_LIMIT = 14;
  var PEGS = 6;
  var BOARD_X = 110, BOARD_W = 860, BOARD_Y = Math.round(H * 0.775), BOARD_H = 270;
  var PEG_W = BOARD_W / PEGS;
  var LAMP_X = W - 90, LAMP_Y = Math.round(H * 0.735);
  var BUOYS = [{ x: 180, y: 900 }, { x: 410, y: 770 }, { x: 660, y: 860 }, { x: 900, y: 745 }];
  var PITCH = ['E5', 'A5', 'C6', 'G5'];

  // 印の鐘の型(1回の中の拍位置。すべてウラ = x.5)。回を追って数が増える
  var T_POOL = [
    [[1.5, 3.5], [2.5, 4.5, 5.5], [1.5, 2.5, 4.5]],
    [[1.5, 2.5, 4.5, 5.5], [1.5, 3.5, 4.5], [1.5, 2.5, 3.5, 5.5]],
    [[1.5, 2.5, 3.5, 5.5], [1.5, 2.5, 3.5, 4.5, 5.5], [1.5, 3.5, 4.5, 5.5]]
  ];
  // ほかの鐘の速さ: 表拍ごと / 付点(3つ割り) / 2拍ごと / 2拍おきのウラ(いちばん紛らわしい)
  var D_RHY = {
    quarter: [0, 1, 2, 3, 4, 5],
    dotted: [0, 1.5, 3, 4.5],
    halves: [0, 2, 4],
    offtwo: [0.5, 2.5, 4.5]
  };
  var D_SET = [['quarter', 'dotted', null], ['quarter', 'dotted', 'halves'], ['dotted', 'offtwo', 'quarter']];

  // 伴奏(オリジナル): ベースは表、刻みはウラ。2小節目は最後のウラに高い音を置いて答えの位置を示す
  var BAR1_MEL = [['R', 0.5], ['E4', 0.5], ['R', 0.5], ['E4', 0.5], ['R', 0.5], ['G4', 0.5], ['R', 0.5], ['E4', 0.5]];
  var BAR1_BASS = [['A2', 1], ['A2', 1], ['E2', 1], ['A2', 1]];
  var BAR2_MEL = [['R', 0.5], ['E4', 0.5], ['R', 0.5], ['G4', 0.5], ['R', 1.5], ['A4', 0.5]];
  var BAR2_BASS = [['F2', 1], ['G2', 1], ['A2', 1.5], ['R', 0.5]];

  // ---- スプライト ----
  var BELL = ['...ss...', '..bbbb..', '.bhbbbb.', '.bhbbbb.', '.bhbbbd.', 'bbbbbbdd', 'dddddddd', '...cc...'];
  var BELL_PAL = { s: C.steel, b: C.brass, h: C.gold, d: C.dbrass, c: '#3a2a18' };
  var GIRL_A = ['...rrrr...', '..rrrrrr..', '..rffffr..', '..fkffkf..', '..ffffff..', '...fppf...', '.nnnnnnnn.', 'nnnnnnnnnn', 'fnnnnnnnnf', '.nnnnnnnn.'];
  var GIRL_B = ['..........', '...rrrr...', '..rrrrrr..', '..rffffr..', '..fkffkf..', '..ffffff..', '...fppf...', 'fnnnnnnnnf', 'nnnnnnnnnn', '.nnnnnnnn.'];
  var GIRL_OH = ['...rrrr...', '..rrrrrr..', '..rffffr..', '..fwffwf..', '..ffffff..', '...fkkf...', 'fnnnnnnnnf', 'nnnnnnnnnn', '.nnnnnnnn.', '.nnnnnnnn.'];
  var GIRL_PAL = { r: '#a04a3a', f: '#d8b08a', k: C.ink, p: '#8a4a3a', n: '#4a6a78', w: '#ffffff' };
  var MASTER = ['..gggg..', '.gggggg.', '..ffff..', '..fkfk..', '..ffff..', '.oooooo.', 'oooooooo', 'oooooooo', '.oo..oo.', '.dd..dd.'];
  var MASTER_PAL = { g: '#56666a', f: '#c8a07a', k: C.ink, o: '#7a6c3a', d: '#2a2018' };
  var SHELL = ['.bbbb.', 'bbhhbb', 'bhhhhb', 'bbbbbb', '.bbbb.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ---- 状態 ----
  var rounds, clock, prevClock, lastBeat, cuedBar, lives, score, correct, nP, nG, nM;
  var over, won, outroT, hitStop, demoMode, prevBest, nearText, missFlash, needle, needleX, finger, lastMark, markFlash;
  var beatPulse = 0;
  var GRAIN = [];
  for (var gi = 0; gi < 260; gi++) GRAIN.push({ x: game.random(0, W), y: game.random(240, H), s: game.random(1, 3.5), a: game.random(0.03, 0.1) });

  function pickIdx(n) { var i = Math.floor(game.random(0, n)); return i >= n ? n - 1 : i; }

  function initRun(demo) {
    demoMode = !!demo;
    rounds = [];
    var prev = -1;
    for (var r = 0; r < ROUND_N; r++) {
      var tg = pickIdx(4);
      if (tg === prev) tg = (tg + 1 + pickIdx(3)) % 4;
      prev = tg;
      var tp = T_POOL[r][pickIdx(3)];
      var others = [];
      for (var g = 0; g < 4; g++) if (g !== tg) others.push(g);
      for (var s = others.length - 1; s > 0; s--) { var j = pickIdx(s + 1), tmp = others[s]; others[s] = others[j]; others[j] = tmp; }
      var rings = [];
      for (var k = 0; k < tp.length; k++) rings.push({ b: tp[k], g: tg, tgt: true });
      var silent = -1;
      for (var o = 0; o < 3; o++) {
        var name = D_SET[r][o];
        if (!name) { silent = others[o]; continue; }
        var pat = D_RHY[name];
        for (var q = 0; q < pat.length; q++) rings.push({ b: pat[q], g: others[o], tgt: false });
      }
      rounds.push({ start: LEAD + r * RB, tg: tg, count: tp.length, rings: rings, silent: silent, ans: false, v: -1, res: 0, revealT: -1, shown: 0, warned: false });
    }
    clock = -READY_T; prevClock = clock; lastBeat = -99; cuedBar = -99;
    lives = LIVES; score = 0; correct = 0; nP = 0; nG = 0; nM = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best; nearText = '';
    missFlash = 0; needle = 0; needleX = BOARD_X; finger = false; lastMark = 0; markFlash = 0.6;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function ansTime(rd) { return (rd.start + ANS_OFF) * SPB; }
  function markIdx() {
    for (var i = 0; i < rounds.length; i++) if (clock < ansTime(rounds[i]) + 0.04) return i;
    return rounds.length - 1;
  }
  function openRound() {
    for (var i = 0; i < rounds.length; i++) if (!rounds[i].ans) return rounds[i];
    return null;
  }
  function revealRound() {
    var best = null;
    for (var i = 0; i < rounds.length; i++) if (rounds[i].ans && rounds[i].revealT >= 0 && rounds[i].revealT < 1.1) best = rounds[i];
    return best;
  }

  // ---- 判定 ----
  function resolve(rd, g, v, why, ad) {
    rd.ans = true; rd.res = g; rd.v = v; rd.revealT = 0; rd.shown = 0;
    var x = BOARD_X + (Math.max(1, v) - 0.5) * PEG_W, y = BOARD_Y - 40;
    if (g === 3) {
      nM++;
      if (!demoMode) lives--;
      var last = !demoMode && lives <= 0;
      missFlash = 0.4;
      game.feedback.bad(x, y, { text: 'MISS', shake: last ? 16 : (demoMode ? 3 : 8), volume: demoMode ? 0 : 0.5 });
      if (why === 'wrong' && v < rd.count) nearText = 'あと' + (rd.count - v) + '個!';
      else if (why === 'early' && ad !== undefined) nearText = 'あと' + Math.max(0.01, ad).toFixed(2) + '秒!';
      else nearText = '';
      if (last) { hitStop = 0.45; finish(false); }
      return;
    }
    correct++;
    if (g === 1) nP++; else nG++;
    score += (g === 1 ? 300 : 200) + rd.count * 40;
    game.feedback.good(x, y, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.gold : C.green, size: g === 1 ? 60 : 50, count: 14, volume: demoMode ? 0 : 0.35 });
    if (!demoMode && correct === 2) {
      game.fx.popup(correct + ' / ' + ROUND_N, 540, 430, { color: C.gold, size: 72 });
      sfx('se_milestone', 0.45);
    }
  }

  // 指を離した(またはタップした)瞬間の答え
  function commit() {
    var rd = openRound();
    if (!rd || over) return 'none';
    var d = clock - ansTime(rd), ad = Math.abs(d);
    if (ad <= GOOD_W) {
      if (needle !== rd.count) resolve(rd, 3, needle, 'wrong');
      else resolve(rd, ad <= PERFECT_W ? 1 : 2, needle);
      return 'judged';
    }
    // 4拍目の表(ウラの半拍前)以降に離したら、表拍で答えたことになる
    if (clock >= (rd.start + 7) * SPB - GOOD_W && d < -GOOD_W) { resolve(rd, 3, needle, 'early', ad - GOOD_W); return 'judged'; }
    return 'set';
  }

  function pegFromX(x) {
    var p = Math.floor((x - BOARD_X) / PEG_W) + 1;
    return Math.max(1, Math.min(PEGS, p));
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5;
    if (demoMode) return;
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 700 + (i % 2) * 160, { color: [C.gold, C.green, C.bone][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.gold, 0.12);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, counted: correct, rounds: ROUND_N, perfect: nP, good: nG, miss: nM };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 拍クロック: 拍の刻み・小節ごとの伴奏・鐘・親方の灯・印の移動 ----
  function beatClock() {
    var nb = Math.floor((clock + 0.06 - LEAD * SPB) / (4 * SPB));
    if (!demoMode && nb > cuedBar && nb >= 0 && nb < ROUND_N * 2) {
      cuedBar = nb;
      if (nb % 2 === 0) game.audio.melody(BAR1_MEL, { tempo: BPM, wave: 'square', volume: 0.03, bass: BAR1_BASS, bassVolume: 0.07 });
      else game.audio.melody(BAR2_MEL, { tempo: BPM, wave: 'square', volume: 0.035, bass: BAR2_BASS, bassVolume: 0.07 });
    }
    var b = Math.floor(clock / SPB);
    if (b !== lastBeat) {
      lastBeat = b;
      if (clock >= 0 && b < END_BEAT) {
        beatPulse = 1;
        tone(((b - LEAD) % 4 + 4) % 4 === 0 ? 1100 : 800, 0.012, { wave: 'square', volume: 0.03 });
      }
    }
    var mi = markIdx();
    if (mi !== lastMark) {
      lastMark = mi; markFlash = 0.6;
      if (!finger) needle = 0;
      tone(PITCH[rounds[mi].tg], 0.08, { wave: 'sine', volume: 0.08 });
    }
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      for (var k = 0; k < rd.rings.length; k++) {
        var rg = rd.rings[k], t = (rd.start + rg.b) * SPB;
        if (prevClock < t && clock >= t) {
          tone(PITCH[rg.g], 0.32, { wave: 'triangle', volume: rg.tgt ? 0.2 : 0.13 });
          tone(PITCH[rg.g], 0.12, { wave: 'sine', volume: 0.04, slide: 600 });
        }
      }
      var wt = (rd.start + WARN_OFF) * SPB;
      if (!rd.ans && !rd.warned && prevClock < wt && clock >= wt) {
        rd.warned = true;
        tone('E6', 0.05, { wave: 'square', volume: 0.06 });
        tone('A6', 0.06, { wave: 'square', volume: 0.05 });
      }
      // 正解発表: 実際に印の鐘が鳴った数だけ目盛りを一つずつ灯す
      if (rd.revealT >= 0) {
        rd.revealT += clock - prevClock;
        var want = Math.min(rd.count, Math.floor(rd.revealT / 0.08));
        while (rd.shown < want) { rd.shown++; tone(PITCH[rd.tg], 0.05, { wave: 'triangle', volume: 0.12 }); }
      }
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    if (missFlash > 0) missFlash -= dt;
    if (markFlash > 0) markFlash -= dt;
    beatClock();
    if (over) return;
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      if (!rd.ans && clock > ansTime(rd) + GOOD_W) { resolve(rd, 3, needle, 'none'); if (over) return; }
    }
    var lastR = rounds[rounds.length - 1];
    if ((lastR.ans && lastR.revealT > 0.7) || clock > END_BEAT * SPB + 0.6 || clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || clock < 0) return;
    finger = true;
    var p = pegFromX(x);
    if (p !== needle) { needle = p; game.audio.tone(300 + p * 70, 0.03, { wave: 'square', volume: 0.07 }); }
    game.fx.burst(x, y, { color: C.gold, count: 3, speed: 70 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !finger || over) return;
    var p = pegFromX(x);
    if (p !== needle) { needle = p; game.audio.tone(300 + p * 70, 0.03, { wave: 'square', volume: 0.07 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !finger) return;
    finger = false;
    if (over || hitStop > 0) return;
    needle = pegFromX(x);
    var r = commit();
    if (r === 'set') game.audio.tone(220, 0.04, { wave: 'triangle', volume: 0.08 });   // 答えの拍でなければ針を置くだけ
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function plate(x, y, w, h, edge, fill) {
    game.draw.rect(x, y, w, h, fill || C.night, 0.9);
    game.draw.rect(x, y, w, 4, edge); game.draw.rect(x, y + h - 4, w, 4, C.dbrass);
    game.draw.rect(x, y, 4, h, edge); game.draw.rect(x + w - 4, y, 4, h, C.dbrass);
    game.draw.rect(x + 10, y + 8, w - 20, 2, C.gold, 0.35);
  }
  function ripple(x, y, r, col, a) {
    for (var k = 0; k < 18; k++) {
      var an = k / 18 * Math.PI * 2;
      game.draw.rect(x + Math.cos(an) * r - 4, y + Math.sin(an) * r * 0.28 - 1, 8, 3, col, a);
    }
  }

  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.16, C.deep], [0.3, C.fog], [0.345, '#3c4a50'], [0.36, C.water], [0.7, '#101a20'], [1, C.night]]);
    // 遠い山影(霧に溶ける)
    for (var m = 0; m < 9; m++) {
      var mh = 40 + ((m * 37) % 70);
      game.draw.rect(m * 130 - 20, 690 - mh, 170, mh, '#2c3a40', 0.55);
    }
    game.draw.rect(0, 688, W, 6, C.steel, 0.25);
    // 筏の丸太(格子)
    for (var lg = 0; lg < 4; lg++) {
      var ly = 800 + lg * 70;
      game.draw.rect(40, ly, W - 80, 10, C.wood, 0.75);
      game.draw.rect(40, ly, W - 80, 2, C.woodL, 0.6);
    }
    for (var lx = 0; lx < 6; lx++) game.draw.rect(70 + lx * 185, 790, 10, 230, C.wood, 0.6);
    // 水面の光の筋
    for (var s = 0; s < 14; s++) game.draw.rect((s * 211 + t * 12) % (W + 200) - 100, 1060 + (s % 5) * 36, 120 + (s % 3) * 40, 3, C.steel, 0.18);
    // 粒状ノイズ
    for (var i = 0; i < GRAIN.length; i++) { var gp = GRAIN[i]; game.draw.rect(gp.x, gp.y, gp.s, gp.s, C.bone, gp.a); }
    // 流れる霧
    for (var f = 0; f < 4; f++) {
      var fx = ((t * (14 + f * 6) + f * 300) % (W + 600)) - 600;
      game.draw.rect(fx, 600 + f * 120, 600, 90, C.fog, 0.12);
      game.draw.rect(fx + 80, 620 + f * 120, 440, 50, C.bone, 0.05);
    }
  }

  function drawPier(warnOn) {
    // 岸の桟橋と親方。予告の拍で灯を高く掲げる
    game.draw.rect(760, 560, 320, 18, C.wood);
    game.draw.rect(760, 560, 320, 4, C.woodL);
    for (var p = 0; p < 4; p++) game.draw.rect(780 + p * 80, 578, 12, 110, C.wood, 0.85);
    var mx = 900, my = 495 + (beatPulse * 3);
    game.draw.sprite(MASTER, MASTER_PAL, mx, my, 7, { anchor: 'center' });
    var ly = warnOn ? my - 110 : my - 10, lx = mx + 44;
    game.draw.line(mx + 26, my - 6, lx, ly + 10, '#7a6c3a', 6);
    if (warnOn) {
      var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 24);
      game.draw.circle(lx, ly, 70, C.gold, 0.12 + pulse * 0.1);
      game.draw.circle(lx, ly, 40, C.gold, 0.25);
    }
    game.draw.rect(lx - 12, ly - 14, 24, 30, warnOn ? C.gold : C.dbrass);
    game.draw.rect(lx - 14, ly - 18, 28, 6, C.steel);
  }

  function ringAges() {
    var ages = [-1, -1, -1, -1];
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      for (var k = 0; k < rd.rings.length; k++) {
        var rg = rd.rings[k], a = clock - (rd.start + rg.b) * SPB;
        if (a >= 0 && (ages[rg.g] < 0 || a < ages[rg.g])) ages[rg.g] = a;
      }
    }
    return ages;
  }

  function drawBuoys() {
    var mi = markIdx(), rd = rounds[mi], ages = ringAges();
    var tgtAge = -1;
    for (var k = 0; k < rd.rings.length; k++) {
      var rg = rd.rings[k], a = clock - (rd.start + rg.b) * SPB;
      if (rg.tgt && a >= 0 && (tgtAge < 0 || a < tgtAge)) tgtAge = a;
    }
    for (var g = 0; g < 4; g++) {
      var b = BUOYS[g], bob = Math.sin(game.time.elapsed * 1.4 + g * 1.7) * 6;
      var x = b.x, y = b.y + bob, marked = g === rd.tg;
      var age = marked ? tgtAge : ages[g];
      var dim = g === rd.silent ? 0.45 : 1;
      game.draw.rect(x - 44, y, 88, 72, C.gray, dim);
      game.draw.rect(x - 44, y, 14, 72, '#6a7a80', dim);
      game.draw.rect(x - 44, y + 28, 88, 14, marked ? C.red : C.bone, 0.85 * dim);
      game.draw.rect(x - 58, y + 68, 116, 12, C.ink, 0.8);
      game.draw.rect(x - 72, y + 84, 144, 4, C.steel, 0.3);
      game.draw.line(x - 30, y, x, y - 150, C.steel, 5);
      game.draw.line(x + 30, y, x, y - 150, C.steel, 5);
      var sw = age >= 0 && age < 0.45 ? Math.sin(age * 32) * (1 - age / 0.45) * 14 : 0;
      game.draw.sprite(BELL, BELL_PAL, x + sw, y - 112, 10, { anchor: 'center', alpha: dim });
      game.draw.rect(x + sw - 26, y - 142, 6, 34, '#ffffff', 0.35 * dim);   // 金属のハイライト
      if (age >= 0 && age < 0.6) ripple(x, y + 86, 50 + age * 260, marked ? C.gold : C.steel, (1 - age / 0.6) * (marked ? 0.9 : 0.5));
      if (marked) {
        var flare = (age >= 0 && age < 0.35 ? 1 - age / 0.35 : 0) + (markFlash > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0 ? 0.6 : 0);
        game.draw.circle(x, y - 186, 34 + flare * 40, C.red, 0.18 + flare * 0.25);
        game.draw.circle(x, y - 186, 16, flare > 0.3 ? '#ffffff' : C.red);
        game.draw.line(x, y - 150, x, y - 172, C.steel, 4);
      }
    }
  }

  function drawBoat() {
    var bx = 540, by = 1265 + Math.sin(game.time.elapsed * 1.6) * 7;
    for (var i = 0; i < 6; i++) { var w = 420 - i * 34; game.draw.rect(bx - w / 2, by + 40 + i * 12, w, 12, i === 0 ? C.woodL : C.wood); }
    game.draw.rect(bx - 210, by + 38, 420, 4, C.gold, 0.4);
    var art = missFlash > 0 ? GIRL_OH : (Math.floor(Math.max(0, clock) / SPB) % 2 ? GIRL_A : GIRL_B);
    var pal = missFlash > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0 ? { r: '#ffffff', f: '#ffffff', k: '#ffffff', p: '#ffffff', n: '#ffffff', w: '#ffffff' } : GIRL_PAL;
    game.draw.sprite(art, pal, bx - 60, by - 22 - beatPulse * 5, 10, { anchor: 'center' });
    game.draw.rect(bx + 30, by - 30, 120, 8, C.woodL);   // 櫂
  }

  // 潮見板: 1〜6の目盛り。押したまま滑らせると真鍮の針が動く
  function drawBoard(dt) {
    var open = openRound();
    var rv = revealRound();
    var warnOn = open && !over && clock >= (open.start + WARN_OFF) * SPB && clock <= ansTime(open) + GOOD_W;
    var blink = warnOn && Math.floor(game.time.elapsed * 10) % 2 === 0;
    plate(BOARD_X - 30, BOARD_Y, BOARD_W + 60, BOARD_H, blink ? C.gold : C.brass, '#1c140c');
    for (var i = 0; i < PEGS; i++) {
      var x = BOARD_X + i * PEG_W, cx = x + PEG_W / 2;
      var lit = rv && i < rv.shown;
      var picked = rv && rv.v === i + 1;
      var fill = picked ? (rv.res === 3 ? C.red : C.green) : (lit ? C.gold : (i % 2 ? '#2a1e12' : '#33251a'));
      game.draw.rect(x + 8, BOARD_Y + 30, PEG_W - 16, BOARD_H - 60, fill, picked || lit ? 0.85 : 1);
      if (rv && rv.count === i + 1) { game.draw.rect(x + 2, BOARD_Y + 20, PEG_W - 4, 6, C.gold); game.draw.rect(x + 2, BOARD_Y + BOARD_H - 26, PEG_W - 4, 6, C.gold); }
      game.draw.circle(cx, BOARD_Y + 80, 12, C.brass);
      game.draw.circle(cx - 3, BOARD_Y + 77, 4, C.gold);
      label(String(i + 1), cx, BOARD_Y + 170, 70, lit || picked ? C.ink : C.bone);
    }
    // 針
    var tx = needle > 0 ? BOARD_X + (needle - 0.5) * PEG_W : BOARD_X - 10;
    needleX += (tx - needleX) * Math.min(1, dt * 18 + 0.01);
    var white = missFlash > 0;
    var ns = white ? 1.4 : 1;
    for (var k = 0; k < 6; k++) game.draw.rect(needleX - (24 - k * 4) * ns, BOARD_Y - 40 + k * 9 * ns, (48 - k * 8) * ns, 9 * ns, white ? '#ffffff' : (k < 2 ? C.gold : C.brass));
    game.draw.rect(needleX - 4, BOARD_Y - 70, 8, 34, white ? '#ffffff' : C.steel);
    // 答えのウラを示す灯: 予告から縮む輪が答えの瞬間に灯へ届く
    var lamp = C.dbrass;
    if (open && warnOn) {
      var left = ansTime(open) - clock;
      if (left > 0) ripple(LAMP_X, LAMP_Y, 26 + left * 160, C.gold, 0.9);
      if (Math.abs(left) < 0.08) lamp = '#ffffff';
      else lamp = C.gold;
    }
    game.draw.circle(LAMP_X, LAMP_Y, 30, C.ink);
    game.draw.circle(LAMP_X, LAMP_Y, 22, lamp);
  }

  function drawHud() {
    plate(20, 16, W - 40, 210, C.brass, C.night);
    label('SCORE ' + score, 60, 66, 38, C.bone, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(SHELL, { b: i < lives ? C.bone : C.gray, h: i < lives ? C.gold : C.gray }, W - 90 - i * 70, 66, 9, { anchor: 'center' });
    label(correct + ' / ' + ROUND_N, W / 2 + 130, 66, 38, C.gold);
    // 8分の格子: ウラ(大きい丸)を強調
    var e = Math.floor((clock - LEAD * SPB) / (SPB / 2));
    for (var d = 0; d < 8; d++) {
      var on = clock >= LEAD * SPB && ((e % 8) + 8) % 8 === d;
      var x = W / 2 - 315 + d * 90;
      if (d % 2) game.draw.circle(x, 145, on ? 22 : 16, on ? C.gold : C.dbrass);
      else game.draw.rect(x - 7, 138, 14, 14, on ? C.bone : C.gray);
    }
    var progress = Math.max(0, Math.min(1, clock / (END_BEAT * SPB)));
    game.draw.rect(60, 194, W - 120, 8, C.gray);
    game.draw.rect(60, 194, (W - 120) * progress, 8, C.brass);
  }

  function drawScene(dt) {
    drawBackdrop();
    var open = openRound();
    drawPier(open && !over && clock >= (open.start + WARN_OFF) * SPB && clock <= ansTime(open) + GOOD_W);
    drawBuoys();
    drawBoat();
    drawBoard(dt);
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    plate(70, top, W - 140, H * 0.36, won ? C.gold : C.red, C.night);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 90, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.365, 56, C.bone);
    game.draw.sprite(BELL, BELL_PAL, W / 2 - 140, H * 0.415, 7, { anchor: 'center' });
    label(correct + ' / ' + ROUND_N, W / 2 + 10, H * 0.415, 48, C.gold);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.46, 32, C.steel);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.51, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.51, 42, C.bone);
    if (!won) label(nearText || ('あと' + Math.max(1, ROUND_N - 1 - correct) + '回!'), W / 2, H * 0.555, 46, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.605, 32, C.bone);
  }

  // ---- ATTRACT: 実ロジックで印の鐘が鳴るたび針を1つ進め、最後のウラで離して答える。1周おきに印のない鐘も数えてMISSになる失敗例 ----
  var demo = { t: 0, n: 0, adv: [], ai: 0, done: false, down: false, hx: BOARD_X, press: 0 };
  var DEMO_CYC = (LEAD + RB) * SPB + 0.9;
  function demoReset() {
    initRun(true);
    clock = 0; prevClock = 0; lastBeat = 0;
    demo.n++; demo.ai = 0; demo.done = false; demo.down = false; demo.press = 0;
    var rd = rounds[0], times = [];
    for (var i = 0; i < rd.rings.length; i++) if (rd.rings[i].tgt) times.push(rd.rings[i].b);
    if (demo.n % 2 === 0) times.push(3);   // 失敗例: 表拍で鳴ったほかの鐘まで数える
    times.sort(function(a, b) { return a - b; });
    demo.adv = times;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var rd = rounds[0];
    while (demo.ai < demo.adv.length && clock >= (rd.start + demo.adv[demo.ai]) * SPB + 0.12) {
      demo.ai++; demo.down = true; finger = true;
      needle = Math.min(PEGS, demo.ai);
    }
    if (!demo.done && clock >= ansTime(rd)) { demo.done = true; demo.down = false; finger = false; commit(); demo.press = 0.25; }
    if (demo.press > 0) demo.press -= dt;
    var tx = needle > 0 ? BOARD_X + (needle - 0.5) * PEG_W : BOARD_X + PEG_W * 0.5;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      var hy = BOARD_Y + (demo.down ? 150 : 110) + (demo.press > 0 ? 20 : 0);
      game.draw.hand(demo.hx, hy, { press: demo.down || demo.press > 0, scale: 14 });
      plate(20, 16, W - 40, 210, C.brass, C.night);
      label(GAME_TITLE, W / 2, 88, 80 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 176, 34, C.bone);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.155, 50, C.bone);
      else label('TAP TO START', W / 2, H * 0.155, 44, C.gold);
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
      plate(140, H * 0.4, W - 280, 150, C.gold, C.night);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.gold);
    }
    // 最初の答えの拍だけ、潮見板の上に手の誘導を薄く出す
    var r0 = rounds[0];
    if (!over && !r0.ans && clock > (r0.start + WARN_OFF) * SPB && clock < ansTime(r0) + 0.1) {
      game.draw.hand(needle > 0 ? needleX : BOARD_X + BOARD_W / 2, BOARD_Y + 130, { press: clock > ansTime(r0) - 0.06, scale: 13, alpha: 0.55 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);

// K-GBA-0018v3-greenhouse-gutter-drip-count.js
// 温室の雨樋しずく数え — 重なって落ちる三本の雨樋のしずくから札を下げた一本だけを数え、次の小節で数字がその数に来た拍の頭で手帳に判を押す
// 操作: 1回は2小節。1小節目は札(黄色の枠)の雨樋のしずくだけを数える(食いの8分で落ちる)。2小節目は手帳の数字が8分ごとに1→8と進むので、数えた数に来た瞬間に画面のどこでもタップ。ずれでPERFECT/GOOD。違う数・ずれすぎ・押さないはMISS
// 終わり: 3回を通してMISS1回以内ならCLEAR(判定の点+数の多さボーナス)。MISS2回でGAME OVER
// @mechanic: counting
// @theme: rainy_greenhouse_gutter_drip_count
// 世界観: 雨の降る植物園の温室。植物学者が三本の雨樋から重なって落ちるしずくのうち、札を下げた一本の雨樋のしずくだけを数え、拍に合わせて観察手帳に数を記す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・数え当てた回数・PERFECT/GOOD/MISS数
// スタイル: 8bit PC MONITOR

(function(game) {
  var STYLE = { bg: ['#000000', '#0000aa'], main: ['#00aaaa', '#55ff55', '#ffffff'], accent: ['#ffff55', '#ff5555'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ。黒地に細い線、二重線のウィンドウ枠UI、市松ディザで中間色を作る
  var C = {
    black: STYLE.bg[0], blue: STYLE.bg[1], cyan: STYLE.main[0], green: STYLE.main[1], white: STYLE.main[2],
    yellow: STYLE.accent[0], red: STYLE.accent[1], brown: '#aa5500', gray: '#555555', dgreen: '#00aa00'
  };

  var GAME_TITLE = 'DRIP COUNT';
  var BPM = 104, SPB = 60 / BPM, E = SPB / 2;     // 8分 = 半拍
  var PERFECT_W = 0.055, GOOD_W = 0.11;
  var READY_T = 0.8, LIVES = 2;
  var ROUND_N = 3, LEAD = 1;                      // 拍0は札を下げる前ノリ。1回 = 数える小節 + 答える小節
  var END_BEAT = LEAD + ROUND_N * 8;
  var TIME_LIMIT = 15;
  var FALL = 0.32;
  var G_X = [220, 540, 860], SPOUT_Y = 610, BASIN_Y = 1000;
  var NOTE_X = 250, NOTE_Y = Math.round(H * 0.6), NOTE_W = 790, NOTE_H = 250;
  var PAD_Y = Math.round(H * 0.775), PAD_H = 330;
  var PITCH = ['E6', 'B5', 'G6'];

  // 札の雨樋の型(8分の位置 0〜7)。3+3+2 の食いから始まり、回を追って密になる
  var T_POOL = [
    [[0, 3, 6], [1, 4, 6], [0, 3, 5]],
    [[0, 3, 4, 6, 7], [1, 2, 4, 5, 7], [0, 2, 3, 6]],
    [[0, 1, 3, 4, 6, 7], [1, 2, 3, 5, 6], [0, 2, 3, 5, 6, 7]]
  ];
  var D_POOL = [
    [[0, 4], [2, 6], [0, 2, 4, 6]],
    [[0, 2, 4, 6], [1, 3, 5, 7], [0, 3, 6]],
    [[1, 3, 5, 7], [0, 2, 3, 4, 6], [0, 1, 4, 5, 7]]
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 伴奏(オリジナル): 数える小節は 3+3+2 のベースだけ(しずくを聞かせる)、答える小節は食いの節
  var COUNT_BASS = [['A2', 1.5], ['A2', 1.5], ['E2', 1]];
  var ANSWER_TUNES = [
    [['R', 0.5], ['C5', 1], ['E5', 1], ['G5', 1], ['A5', 0.5]],
    [['R', 0.5], ['D5', 1], ['F5', 1], ['A5', 1], ['G5', 0.5]],
    [['R', 0.5], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 0.5]]
  ];
  var ANSWER_BASS = [['A2', 1.5], ['C3', 1.5], ['E2', 1]];

  // ---- スプライト ----
  var DROP = ['..#..', '.###.', '#####', '#####', '.###.'];
  var TAG = ['.y.', 'yyy', 'yky', 'yyy', 'yyy'];
  var POTSPR = ['bbbbbbbbbb', '.bbbbbbbb.', '.bbbbbbbb.', '..bbbbbb..', '..bbbbbb..'];
  var PLANTS = [
    ['g.g.g.g', '.ggggg.', 'g.ggg.g', '..ggg..', '...g...'],
    ['..ggg..', '.ggggg.', '.gg.gg.', '..ggg..', '..ggg..'],
    ['..rrr..', '.rryrr.', '..rrr..', '...g...', '.ggggg.']
  ];
  var PLANT_PAL = { g: '#55ff55', r: '#ff5555', y: '#ffff55' };
  var SCI_A = ['...wwww...', '..wwwwww..', '..ffffff..', '..fkffkf..', '..ffffff..', '...ffff...', '.cccccccc.', 'ccccccnnnn', 'ccccccnwwn', 'ccccccnwwn', '.ccccccnn.', '.cccccccc.', '..gg..gg..', '..gg..gg..'];
  var SCI_B = ['...wwww...', '..wwwwww..', '..ffffff..', '..fkffkf..', '..ffffff..', '...ffff...', '.cccccccc.', 'ccccccnnnn', 'ccccccnwwn', 'ccccccnwwn', '.ccccccnn.', '.cccccccc.', '.gg....gg.', '.gg....gg.'];
  var SCI_PAL = { w: '#aaaaaa', f: '#ffaa55', k: '#000000', c: '#ffffff', n: '#00aaaa', g: '#555555' };
  var STAMP = ['..yyyy..', '..yyyy..', '...yy...', '...yy...', 'rrrrrrrr', 'rrrrrrrr', 'r.r..r.r'];
  var LIFE = ['..#..', '.###.', '#####', '#####', '.###.'];

  // ---- 状態 ----
  var rounds, clock, prevClock, lastBeat, cuedBar, lives, score, correct, nP, nG, nM;
  var over, won, outroT, hitStop, demoMode, prevBest, nearText, padFlash, warnT, noteBlink;
  var beatPulse = 0;
  var rain = [];
  for (var ri = 0; ri < 40; ri++) rain.push({ x: game.random(0, W), y: game.random(230, 560), v: game.random(500, 900) });

  function pickIdx(n) { var i = Math.floor(game.random(0, n)); return i >= n ? n - 1 : i; }

  function initRun(demo) {
    demoMode = !!demo;
    rounds = [];
    var prevT = -1;
    for (var r = 0; r < ROUND_N; r++) {
      var tg = pickIdx(3);
      if (tg === prevT) tg = (tg + 1 + pickIdx(2)) % 3;
      prevT = tg;
      var tp = T_POOL[r][pickIdx(3)];
      var d0 = pickIdx(3), d1 = (d0 + 1 + pickIdx(2)) % 3;
      var ds = [D_POOL[r][d0], D_POOL[r][d1]], pats = [], di = 0;
      for (var g = 0; g < 3; g++) pats.push(g === tg ? tp : ds[di++]);
      rounds.push({ cs: LEAD + r * 8, as: LEAD + r * 8 + 4, tg: tg, count: tp.length, pats: pats, ans: false, v: -1, res: 0, revealT: -1, shown: 0, warned: false });
    }
    clock = -READY_T; prevClock = clock; lastBeat = -99; cuedBar = -99;
    lives = LIVES; score = 0; correct = 0; nP = 0; nG = 0; nM = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best; nearText = '';
    padFlash = 0; warnT = 0; noteBlink = 0;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function roundForCount() {
    var b = clock / SPB;
    for (var i = 0; i < rounds.length; i++) if (b < rounds[i].as) return (i === 0 || b >= rounds[i].cs - LEAD - 0.001) ? rounds[i] : null;
    return null;
  }
  function roundForAnswer() {
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      if (clock >= rd.as * SPB - GOOD_W && clock < (rd.as + 4) * SPB) return rd;
    }
    return null;
  }
  function slotNow(rd) { return Math.floor((clock - rd.as * SPB) / E + 0.5); }

  // ---- 判定 ----
  function resolve(rd, g, v, why, ad) {
    rd.ans = true; rd.res = g; rd.v = v; rd.revealT = 0; rd.shown = 0;
    var x = NOTE_X + NOTE_W / 2, y = NOTE_Y - 40;
    if (g === 3) {
      nM++;
      if (!demoMode) lives--;
      var last = !demoMode && lives <= 0;
      game.feedback.bad(x, y, { text: 'MISS', shake: last ? 16 : (demoMode ? 3 : 8), volume: demoMode ? 0 : 0.5 });
      if (why === 'wrong' && v < rd.count) nearText = 'あと' + (rd.count - v) + '個!';
      else if (why === 'off' && ad !== undefined) nearText = 'あと' + Math.max(0.01, ad - GOOD_W).toFixed(2) + '秒!';
      else nearText = '';
      if (last) { hitStop = 0.45; finish(false); }
      return;
    }
    correct++;
    if (g === 1) nP++; else nG++;
    score += (g === 1 ? 300 : 200) + rd.count * 30;
    game.feedback.good(x, y, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.yellow : C.green, size: g === 1 ? 56 : 46, count: 14, volume: demoMode ? 0 : 0.35 });
    if (!demoMode && correct === 2) {
      game.fx.popup(correct + ' / ' + ROUND_N, 540, 420, { color: C.yellow, size: 72 });
      sfx('se_milestone', 0.45);
    }
  }

  function answerTap() {
    padFlash = 0.15;
    if (over) return;
    var rd = roundForAnswer();
    if (!rd || rd.ans) {
      tone(330, 0.03, { wave: 'square', volume: 0.06 });   // 数える小節中のタップは手帳を鳴らすだけ
      return;
    }
    var j = Math.round((clock - rd.as * SPB) / E), ad = Math.abs(clock - (rd.as * SPB + j * E));
    if (j < 0 || j > 7 || ad > GOOD_W) { resolve(rd, 3, -1, 'off', ad); return; }
    var v = j + 1;
    if (v !== rd.count) resolve(rd, 3, v, 'wrong');
    else resolve(rd, ad <= PERFECT_W ? 1 : 2, v);
    sfx('se_tap', 0.25);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    if (ok) {
      score += lives * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 760 + (i % 2) * 140, { color: [C.yellow, C.green, C.cyan][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.white, 0.12);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, counted: correct, rounds: ROUND_N, perfect: nP, good: nG, miss: nM };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.yellow, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 拍クロック: 4分の刻み + 小節頭で伴奏。しずくは8分の格子(食いの位置)で鉢に落ちる
  function beatClock() {
    var nb = Math.floor((clock + 0.06 - LEAD * SPB) / (4 * SPB));
    if (!demoMode && nb > cuedBar && nb >= 0 && nb < ROUND_N * 2) {
      cuedBar = nb;
      if (nb % 2 === 0) game.audio.melody([['R', 4]], { tempo: BPM, volume: 0.01, bass: COUNT_BASS, bassVolume: 0.07 });
      else game.audio.melody(ANSWER_TUNES[(nb >> 1) % 3], { tempo: BPM, wave: 'square', volume: 0.04, bass: ANSWER_BASS, bassVolume: 0.07 });
    }
    var b = Math.floor(clock / SPB);
    if (b !== lastBeat) {
      lastBeat = b;
      if (clock >= 0 && b < END_BEAT) {
        beatPulse = 1;
        var inBar = ((b - LEAD) % 4 + 4) % 4;
        tone(inBar === 0 ? 1600 : 1200, 0.015, { wave: 'square', volume: 0.04 });
        for (var i = 0; i < rounds.length; i++) {
          // 答える小節の1拍前(0.58秒前)に手帳が点滅して予告
          if (b === rounds[i].as - 1) { noteBlink = SPB; tone('C6', 0.05, { wave: 'square', volume: 0.06 }); tone('G6', 0.05, { wave: 'square', volume: 0.05 }); }
        }
      }
    }
    // しずくが鉢に落ちた瞬間に鳴らす
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      for (var g = 0; g < 3; g++) {
        var pat = rd.pats[g];
        for (var k = 0; k < pat.length; k++) {
          var lt = rd.cs * SPB + pat[k] * E;
          if (prevClock < lt && clock >= lt) tone(PITCH[g], 0.06, { wave: 'triangle', volume: 0.2 });
        }
      }
      // 答えの締め切り0.6秒前に残りの枠が赤く点滅
      if (!rd.ans && !rd.warned && clock > rd.as * SPB + 7 * E + GOOD_W - 0.6) { rd.warned = true; warnT = 0.6; tone(220, 0.08, { wave: 'square', volume: 0.08 }); }
      // 正解発表: 実際のしずくの数だけ刻みを一つずつ足しながら鳴らす
      if (rd.revealT >= 0) {
        rd.revealT += clock - prevClock;
        var want = Math.min(rd.count, Math.floor(rd.revealT / 0.07));
        while (rd.shown < want) { rd.shown++; tone(PITCH[rd.tg], 0.04, { wave: 'triangle', volume: 0.12 }); }
      }
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    if (padFlash > 0) padFlash -= dt;
    if (warnT > 0) warnT -= dt;
    if (noteBlink > 0) noteBlink -= dt;
    beatClock();
    if (over) return;
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      if (!rd.ans && clock > rd.as * SPB + 7 * E + GOOD_W) { resolve(rd, 3, -1, 'none'); if (over) return; }
    }
    var lastR = rounds[rounds.length - 1];
    if ((lastR.ans && lastR.revealT > 0.9) || clock > END_BEAT * SPB || clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    game.fx.burst(x, y, { color: C.cyan, count: 3, speed: 80 });
    answerTap();
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.blue, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col, fill) {
    if (fill) game.draw.rect(x, y, w, h, fill);
    game.draw.rect(x, y, w, 3, col); game.draw.rect(x, y + h - 3, w, 3, col);
    game.draw.rect(x, y, 3, h, col); game.draw.rect(x + w - 3, y, 3, h, col);
    game.draw.rect(x + 9, y + 9, w - 18, 2, col); game.draw.rect(x + 9, y + h - 11, w - 18, 2, col);
    game.draw.rect(x + 9, y + 9, 2, h - 18, col); game.draw.rect(x + w - 11, y + 9, 2, h - 18, col);
  }
  function dither(x, y, w, h, col, cell, dot) {
    cell = cell || 12; dot = dot || cell / 2;
    for (var yy = 0; yy < h; yy += cell) {
      for (var xx = ((yy / cell) % 2) * cell; xx < w; xx += cell * 2) game.draw.rect(x + xx, y + yy, dot, dot, col);
    }
  }

  function drawHouse(dt) {
    game.draw.gradient(0, H, [[0, C.black], [0.45, C.blue], [1, C.black]]);
    // 外の雨(ガラスの向こう)
    for (var i = 0; i < rain.length; i++) {
      var r = rain[i];
      r.y += r.v * dt;
      if (r.y > 560) { r.y = 230; r.x = game.random(0, W); }
      game.draw.rect(r.x, r.y, 2, 18, C.cyan);
    }
    // 温室の骨組み(細線)
    for (var s = 0; s <= 8; s++) game.draw.line(s * 135, 250, s * 135, 560, C.white, 2);
    game.draw.line(0, 405, W, 405, C.white, 2);
    game.draw.line(0, 250, W, 250, C.white, 3);
    game.draw.line(0, 560, W, 560, C.white, 3);
    for (var gl = 0; gl < 4; gl++) game.draw.line(40 + gl * 270, 300, 90 + gl * 270, 270, C.cyan, 2);
  }

  function drawGutters() {
    var rd = roundForCount();
    var counting = rd && clock >= rd.cs * SPB - LEAD * SPB && clock < rd.as * SPB;
    for (var g = 0; g < 3; g++) {
      var x = G_X[g];
      var mark = rd && rd.tg === g && (counting || clock < 0 || demoMode && clock < rd.as * SPB);
      if (mark) {
        dither(x - 120, 560, 240, BASIN_Y - 520, C.yellow, 20, 5);
        frame(x - 128, 548, 256, BASIN_Y - 488, C.yellow, null);
      }
      game.draw.rect(x - 120, 566, 240, 20, C.cyan);
      game.draw.rect(x - 120, 566, 240, 4, C.white);
      game.draw.rect(x - 10, 586, 20, 26, C.cyan);
      if (mark) game.draw.sprite(TAG, { y: C.yellow, k: C.black }, x + 70, 616 + Math.sin(game.time.elapsed * 4) * 4, 9, { anchor: 'center' });
      // 鉢と植物
      game.draw.sprite(PLANTS[g], PLANT_PAL, x, BASIN_Y - 10, 14, { anchor: 'center' });
      game.draw.sprite(POTSPR, { b: C.brown }, x, BASIN_Y + 60, 14, { anchor: 'center' });
    }
  }

  function drawDrops() {
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      for (var g = 0; g < 3; g++) {
        var pat = rd.pats[g], tgt = g === rd.tg;
        for (var k = 0; k < pat.length; k++) {
          var lt = rd.cs * SPB + pat[k] * E, dtl = clock - lt;
          if (dtl < -FALL || dtl > 0.25) continue;
          var x = G_X[g];
          if (dtl < 0) {
            var u = 1 + dtl / FALL;
            game.draw.sprite(DROP, { '#': tgt ? C.white : C.cyan }, x, SPOUT_Y + (BASIN_Y - 70 - SPOUT_Y) * u * u, tgt ? 9 : 7, { anchor: 'center' });
          } else {
            var w = 40 + dtl * 400;
            game.draw.rect(x - w, BASIN_Y - 60, w * 0.4, 4, tgt ? C.white : C.cyan);
            game.draw.rect(x + w * 0.6, BASIN_Y - 60, w * 0.4, 4, tgt ? C.white : C.cyan);
            game.draw.rect(x - 3, BASIN_Y - 80 - dtl * 200, 6, 6, tgt ? C.white : C.cyan);
          }
        }
      }
    }
  }

  // 観察手帳(テキスト枠のウィンドウ)。答える小節は 1〜8 が8分ごとに進む
  function drawNotebook() {
    var blink = noteBlink > 0 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    frame(NOTE_X, NOTE_Y, NOTE_W, NOTE_H, blink ? C.yellow : C.white, C.blue);
    game.draw.rect(NOTE_X + 12, NOTE_Y + 12, NOTE_W - 24, 30, C.cyan);
    var ar = roundForAnswer(), cr = roundForCount();
    var rd = ar || cr || rounds[0];
    // 見出しの帯に、どの雨樋を数えるかの小さな印
    for (var g = 0; g < 3; g++) game.draw.rect(NOTE_X + NOTE_W - 140 + g * 40, NOTE_Y + 18, 28, 18, g === rd.tg ? C.yellow : C.blue);
    var cw = 84, gap = 10, x0 = NOTE_X + (NOTE_W - (8 * cw + 7 * gap)) / 2, cy = NOTE_Y + 70;
    var sl = ar ? slotNow(ar) : -1;
    for (var i = 0; i < 8; i++) {
      var x = x0 + i * (cw + gap);
      var cur = ar && !ar.ans && sl === i;
      var picked = ar && ar.ans && ar.v === i + 1;
      var truth = ar && ar.ans && ar.count === i + 1;
      var warn = warnT > 0 && ar && !ar.ans && i >= sl && Math.floor(game.time.elapsed * 10) % 2 === 0;
      var fill = cur ? C.yellow : (picked ? (ar.res === 3 ? C.red : C.green) : (warn ? C.red : C.black));
      game.draw.rect(x, cy, cw, 96, fill);
      game.draw.rect(x, cy, cw, 3, C.white); game.draw.rect(x, cy + 93, cw, 3, C.white);
      game.draw.rect(x, cy, 3, 96, C.white); game.draw.rect(x + cw - 3, cy, 3, 96, C.white);
      if (truth) { game.draw.rect(x - 6, cy - 6, cw + 12, 4, C.yellow); game.draw.rect(x - 6, cy + 98, cw + 12, 4, C.yellow); }
      var dim = !ar;
      label(String(i + 1), x + cw / 2, cy + 50, 56, cur ? C.black : (dim ? C.gray : C.white));
    }
    // 正解発表の刻み(実際のしずくの数)
    if (ar && ar.ans) {
      for (var t = 0; t < ar.shown; t++) {
        var tx = NOTE_X + 60 + t * 34 + Math.floor(t / 5) * 20;
        game.draw.rect(tx, NOTE_Y + 186, 8, 46, C.yellow);
      }
    } else if (!ar) {
      // 数える小節: 8分の格子を点で見せる(しずくの位置は見せない)
      var cs = cr ? cr.cs * SPB : 0, sl2 = Math.floor((clock - cs) / E);
      for (var d = 0; d < 8; d++) game.draw.rect(NOTE_X + 70 + d * 84, NOTE_Y + 204, d % 2 ? 14 : 22, d % 2 ? 14 : 22, sl2 === d && clock >= cs ? C.cyan : C.gray);
    }
  }

  function drawScientist() {
    var miss = false;
    for (var i = 0; i < rounds.length; i++) if (rounds[i].res === 3 && rounds[i].revealT >= 0 && rounds[i].revealT < 0.5) miss = true;
    var white = hitStop > 0 || miss && Math.floor(game.time.elapsed * 12) % 2 === 0;
    var pal = white ? { w: '#ffffff', f: '#ffffff', k: '#ffffff', c: '#ffffff', n: '#ffffff', g: '#ffffff' } : SCI_PAL;
    var art = Math.floor(clock / SPB) % 2 ? SCI_A : SCI_B;
    game.draw.sprite(art, pal, 130, NOTE_Y + 150 - beatPulse * 6, white && hitStop > 0 ? 12 : 10, { anchor: 'center' });
  }

  function drawPad() {
    var ar = roundForAnswer();
    var live = ar && !ar.ans && !over;
    frame(120, PAD_Y, W - 240, PAD_H, padFlash > 0 ? C.white : (live ? C.yellow : C.cyan), live ? C.blue : C.black);
    if (live) dither(140, PAD_Y + 20, W - 280, PAD_H - 40, C.cyan, 20, 4);
    game.draw.sprite(STAMP, { y: live ? C.yellow : C.gray, r: live ? C.red : C.gray }, 540, PAD_Y + PAD_H / 2 + (padFlash > 0 ? 14 : 0), 22, { anchor: 'center' });
  }

  function drawHud() {
    frame(20, 16, W - 40, 210, C.white, C.black);
    label('SCORE ' + score, 60, 66, 38, C.white, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LIFE, { '#': i < lives ? C.cyan : C.gray }, W - 90 - i * 60, 66, 10, { anchor: 'center' });
    label(correct + ' / ' + ROUND_N, W / 2 + 120, 66, 38, C.yellow);
    // 8分の格子(4分は大きい四角)
    var hb = Math.floor((clock - LEAD * SPB) / E);
    for (var d = 0; d < 8; d++) {
      var on = clock >= LEAD * SPB && ((hb % 8) + 8) % 8 === d;
      var sz = d % 2 ? 16 : 26;
      game.draw.rect(W / 2 - 300 + d * 86 - sz / 2, 150 - sz / 2, sz, sz, on ? C.yellow : C.gray);
    }
    var progress = Math.max(0, Math.min(1, clock / (END_BEAT * SPB)));
    game.draw.rect(60, 196, W - 120, 8, C.gray);
    game.draw.rect(60, 196, (W - 120) * progress, 8, C.cyan);
  }

  function drawScene(dt) {
    drawHouse(dt);
    drawGutters();
    drawDrops();
    drawNotebook();
    drawScientist();
    drawPad();
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    frame(70, top, W - 140, H * 0.4, won ? C.yellow : C.red, C.black);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 90, won ? C.yellow : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 56, C.white);
    game.draw.sprite(DROP, { '#': C.white }, W / 2 - 130, H * 0.42, 10, { anchor: 'center' });
    label(correct + ' / ' + ROUND_N, W / 2 + 20, H * 0.42, 48, C.yellow);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.47, 32, C.cyan);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 56, C.yellow);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 42, C.white);
    if (!won) label(nearText || ('あと' + Math.max(1, ROUND_N - correct) + '回!'), W / 2, H * 0.57, 46, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.62, 32, C.white);
  }

  // ---- ATTRACT: 実ロジックで札の雨樋を数え、答える小節で数が来た拍に判を押す。1周おきに1つ手前で押してMISSになる失敗例 ----
  var demo = { t: 0, n: 0, done: false, press: 0 };
  var DEMO_CYC = (LEAD + 8) * SPB + 0.6;
  function demoReset() {
    initRun(true);
    clock = 0; prevClock = 0; lastBeat = 0;
    demo.done = false; demo.press = 0; demo.n++;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var rd = rounds[0];
    var want = demo.n % 2 === 1 ? rd.count : Math.max(1, rd.count - 1);
    if (!demo.done && clock >= rd.as * SPB + (want - 1) * E) { demo.done = true; answerTap(); demo.press = 0.2; }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(560, PAD_Y + (demo.press > 0 ? 190 : 120), { press: demo.press > 0, scale: 14 });
      frame(20, 16, W - 40, 210, C.white, C.black);
      label(GAME_TITLE, W / 2, 90, 84 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + game.best, W / 2, 180, 34, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.155, 50, C.white);
      else label('TAP TO START', W / 2, H * 0.155, 44, C.yellow);
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
      frame(140, H * 0.4, W - 280, 150, C.yellow, C.black);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.yellow);
    }
    // 開始時お手本: 最初の答える小節の頭で、判の台へ手を出す
    var r0 = rounds[0];
    if (!over && !r0.ans && clock > (r0.as - 0.8) * SPB && clock < r0.as * SPB + 0.3) {
      game.draw.hand(560, PAD_Y + 120, { press: false, scale: 13, alpha: 0.7 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);

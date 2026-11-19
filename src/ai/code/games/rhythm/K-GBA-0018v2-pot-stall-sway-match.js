// K-GBA-0018v2-pot-stall-sway-match.js
// 鍋直し露店の拍合わせ — 違う速さで揺れて鳴る鍋の中から、灯の拍と同じ速さで揺れる一つを見つけて拍の頭で叩く。途中で4拍子の行進から3拍子のワルツへ切り替わる
// 操作: 吊るした鍋(または真下の台)をタップして槌で叩く。灯が光る拍の頭ごとに真ん中を通って鳴る鍋が当たり。拍の頭からのずれでPERFECT/GOOD。違う鍋・拍外れ・見つけられないまま回が終わるとMISS
// 終わり: 5回(4拍子3回→切り替えの1小節→3拍子2回)を通してMISS2回以内ならCLEAR(判定の点+早く見つけたボーナス)。MISS3回でGAME OVER
// @mechanic: spot
// @theme: market_pot_mender_sway_match
// 世界観: 市場の鍋修理の露店。職人が梁に吊るして揺らした鍋の響きを聞き比べ、軒の灯が刻む拍と同じ速さで鳴る一つを探し当てて槌で叩く。途中で市場の楽隊の拍子が行進からワルツへ変わる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・見つけた鍋の数・PERFECT/GOOD/MISS数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var STYLE = { bg: ['#d6cfa8', '#b3ad88'], main: ['#4f5d57', '#a0654a', '#ece5c6'], accent: ['#d9a23f', '#b4473a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 日焼けした液晶の低彩度・少色。太く単純な形で、画面の密度を上げない
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], slate: STYLE.main[0], rust: STYLE.main[1], cream: STYLE.main[2],
    amber: STYLE.accent[0], red: STYLE.accent[1], ink: '#2e2f33', wood: '#7d6449', wood2: '#5e4a37', shade: '#9a9478', good: '#6f8f5a'
  };

  var GAME_TITLE = 'POT BEAT';
  var BPM = 112, SPB = 60 / BPM;
  var PERFECT_W = 0.06, GOOD_W = 0.13;
  var READY_T = 0.8, LIVES = 3;
  var SWITCH = 12;                          // 拍12から3拍子(拍12〜14は切り替えを知らせる1小節)
  var PLAN = [
    { s: 0, n: 4, r: [1, 1.5, 0.7, 1.33] },
    { s: 4, n: 4, r: [1, 1.25, 0.8, 1.4] },
    { s: 8, n: 4, r: [1, 1.2, 0.85, 0.7] },
    { s: 15, n: 6, r: [1, 1.25, 0.8, 1.15, 0.7] },
    { s: 21, n: 6, r: [1, 1.15, 0.87, 1.3, 0.78] }
  ];
  var END_BEAT = 27;
  var TIME_LIMIT = 15;
  var PIVOT_Y = 520, ROPE = 300, SWING = 0.17;
  var CRAFT_Y = Math.round(H * 0.64);
  var PAD_Y = Math.round(H * 0.77), PAD_H = 330;
  var PITCH = ['G4', 'A4', 'C5', 'D5', 'E5'];
  var DEMO_TO = 7.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 伴奏(オリジナル): 前半は4拍子の行進、拍12で上行の合図、後半は3拍子のワルツ(ベースが1拍目、和音が2・3拍目)
  var BARS = [
    { b: 0, m: [['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['C5', 0.5], ['D5', 1]], bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]] },
    { b: 4, m: [['E5', 0.5], ['F5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1]], bass: [['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1]] },
    { b: 8, m: [['D5', 0.5], ['E5', 0.5], ['F5', 1], ['D5', 0.5], ['B4', 0.5], ['C5', 1]], bass: [['F2', 1], ['G2', 1], ['G2', 1], ['C3', 1]] },
    { b: 12, m: [['G5', 0.5], ['B5', 0.5], ['D6', 0.5], ['G6', 0.5], ['R', 1]], bass: [['G2', 1], ['R', 2]] },
    { b: 15, m: [['E5', 1.5], ['D5', 0.5], ['C5', 1]], bass: [['A2', 1], ['E3', 1], ['E3', 1]] },
    { b: 18, m: [['A5', 1.5], ['G5', 0.5], ['E5', 1]], bass: [['F2', 1], ['C3', 1], ['C3', 1]] },
    { b: 21, m: [['F5', 1], ['E5', 1], ['D5', 1]], bass: [['G2', 1], ['D3', 1], ['D3', 1]] },
    { b: 24, m: [['C5', 2], ['R', 1]], bass: [['C3', 1], ['G2', 1], ['C3', 1]] }
  ];

  // ---- スプライト(太く単純な形) ----
  var POT = ['..ccccccccc..', 'kkkkkkkkkkkkk', 'k.bbbbbbbbb.k', 'k.bbbbbbbbb.k', '..bbbbbbbbb..', '..bbbbdbbbb..', '..bbbbbbbbb..', '...bbbbbbb...', '....kkkkk....'];
  var POT_PAL = { c: '#ece5c6', k: '#2e2f33', b: '#4f5d57', d: '#9a9478' };
  var POT_WHITE = { c: '#ffffff', k: '#ffffff', b: '#ffffff', d: '#ffffff' };
  var POT_GOLD = { c: '#ece5c6', k: '#2e2f33', b: '#d9a23f', d: '#ece5c6' };
  var LANTERN = ['..kkk..', '.lllll.', 'lllllll', 'lkkkkkl', 'lllllll', 'lkkkkkl', 'lllllll', '.lllll.', '..kkk..'];
  var CRAFT_IDLE = ['....hhhh....', '...wwwwww...', '...ffffff...', '...fkffkf...', '...ffffff...', '....ffff....', '..aaaaaaaa..', '.faaaaaaaaf.', '.faaaaaaaaf.', '..aaaaaaaa..', '..aaaaaaaa..', '...nn..nn...', '...nn..nn...'];
  var CRAFT_HIT = ['....hhhh..f.', '...wwwwww.f.', '...ffffff.a.', '...fkffkfaa.', '...ffffff.a.', '....ffff..a.', '..aaaaaaaa..', '.faaaaaaaa..', '.faaaaaaaa..', '..aaaaaaaa..', '..aaaaaaaa..', '...nn..nn...', '...nn..nn...'];
  var CRAFT_PAL = { h: '#2e2f33', w: '#ece5c6', f: '#d9b38c', k: '#2e2f33', a: '#a0654a', n: '#4f5d57' };
  var MALLET = ['mmmmm', 'mmmmm', '..t..', '..t..', '..t..', '..t..'];
  var MALLET_PAL = { m: '#5e4a37', t: '#7d6449' };

  // ---- 状態 ----
  var rounds, clock, lastBeat, cued, lives, score, combo, found, nP, nG, nM;
  var over, won, outroT, hitStop, demoMode, prevBest, nearText, lamp, craftX, craftT, strikeX, strikeY, warnT;
  var bannerT;

  function shuffleIdx(n, avoid) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var t = 0; t < 8; t++) {
      for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(game.random(0, j + 1)); if (k > j) k = j; var tmp = a[j]; a[j] = a[k]; a[k] = tmp; }
      if (a.indexOf(0) !== avoid) break;
    }
    return a;
  }

  function initRun(demo) {
    demoMode = !!demo;
    rounds = [];
    var prevMatch = -1;
    for (var i = 0; i < PLAN.length; i++) {
      var p = PLAN[i], m = p.r.length, order = shuffleIdx(m, prevMatch), pots = [];
      for (var j = 0; j < m; j++) pots.push({ x0: W * (j + 1) / (m + 1), T: SPB * p.r[order[j]], n: -1, spark: 0, flash: 0, pad: 0 });
      var match = order.indexOf(0);
      prevMatch = match;
      rounds.push({ s: p.s, last: p.s + p.n - 1, pots: pots, match: match, done: false, res: 0, k: -1, warned: false, reveal: 0 });
    }
    clock = -READY_T; lastBeat = -99; cued = {};
    lives = LIVES; score = 0; combo = 0; found = 0; nP = 0; nG = 0; nM = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best; nearText = '';
    lamp = 0; craftX = W / 2; craftT = 9; strikeX = W / 2; strikeY = 0; warnT = 0; bannerT = 9;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function curRound() {
    var b = clock / SPB;
    for (var i = 0; i < rounds.length; i++) if (b >= rounds[i].s - 0.001 && b < rounds[i].last + 1) return rounds[i];
    return null;
  }
  function inSwitch() { var b = clock / SPB; return b >= SWITCH && b < PLAN[3].s; }
  function waltz() { return clock / SPB >= SWITCH; }
  function beatInBar(b) { return b < SWITCH ? b % 4 : (b - SWITCH) % 3; }

  function potPos(rd, p) {
    var t0 = rd.s * SPB, th = 0;
    if (clock > t0) th = SWING * Math.sin(Math.PI * (clock - t0) / p.T);
    return { x: p.x0 + ROPE * Math.sin(th), y: PIVOT_Y + ROPE * Math.cos(th) };
  }

  // ---- 判定 ----
  function fail(rd, p, why, ad) {
    rd.done = true; rd.res = 3; rd.reveal = 1.4;
    combo = 0; nM++;
    if (!demoMode) lives--;
    var pos = p ? potPos(rd, p) : potPos(rd, rd.pots[rd.match]);
    if (p) p.flash = 0.35;
    var last = !demoMode && lives <= 0;
    game.feedback.bad(pos.x, pos.y - 40, { text: 'MISS', shake: last ? 16 : (demoMode ? 3 : 8), volume: demoMode ? 0 : 0.5 });
    if (why === 'wrong') sfx('se_break', 0.25);
    if (last) {
      hitStop = 0.45;
      if (why === 'off' && ad !== undefined) nearText = 'あと' + Math.max(0.01, ad - GOOD_W).toFixed(2) + '秒!';
      else nearText = 'あと' + (PLAN.length - (rounds.indexOf(rd) + 1) + 1) + '回!';
      finish(false);
    }
  }

  function success(rd, p, g, k) {
    rd.done = true; rd.res = g; rd.k = k;
    combo++; found++;
    if (g === 1) nP++; else nG++;
    score += (g === 1 ? 300 : 200) + (rd.last - k) * 60 + combo * 20;
    var pos = potPos(rd, p);
    game.feedback.good(pos.x, pos.y - 40, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.amber : C.good, size: g === 1 ? 54 : 46, count: 14, volume: demoMode ? 0 : 0.35 });
    tone(PITCH[rounds.indexOf(rd) % PITCH.length], 0.22, { wave: 'triangle', volume: 0.16 });
    if (!demoMode && combo === 3) {
      game.fx.popup('3 COMBO', 540, 420, { color: C.amber, size: 70 });
      sfx('se_milestone', 0.45);
    }
  }

  function tapPot(i) {
    var rd = curRound();
    craftT = 0;
    if (!rd || rd.done || clock < 0) {
      tone(160, 0.05, { wave: 'square', volume: 0.06 });
      return;
    }
    var p = rd.pots[i];
    var pos = potPos(rd, p);
    strikeX = pos.x; strikeY = pos.y;
    var k = Math.round(clock / SPB), ad = Math.abs(clock - k * SPB);
    if (i !== rd.match) { fail(rd, p, 'wrong'); return; }
    if (k <= rd.s || k > rd.last || ad > GOOD_W) { fail(rd, p, 'off', ad); return; }
    success(rd, p, ad <= PERFECT_W ? 1 : 2, k);
  }

  function columnAt(x) {
    var rd = curRound();
    if (!rd) return -1;
    var m = rd.pots.length, best = -1, bd = W / (m + 1) / 2 + 10;
    for (var i = 0; i < m; i++) { var d = Math.abs(x - rd.pots[i].x0); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 700 + (i % 2) * 140, { color: [C.amber, C.cream, C.rust][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.cream, 0.15);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, found: found, rounds: PLAN.length, perfect: nP, good: nG, miss: nM };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.amber, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 拍クロック: 灯が毎拍光る(小節頭は強く)。鍋は真ん中を通るたびに鳴る
  function beatClock(dt) {
    for (var bi2 = 0; bi2 < BARS.length; bi2++) {
      var bar = BARS[bi2];
      if (!cued[bar.b] && clock + 0.06 >= bar.b * SPB && clock < (bar.b + 1) * SPB) {
        cued[bar.b] = true;
        if (!demoMode) game.audio.melody(bar.m, { tempo: BPM, wave: 'square', volume: 0.035, bass: bar.bass, bassVolume: 0.07 });
      }
    }
    var b = Math.floor(clock / SPB);
    if (b !== lastBeat) {
      lastBeat = b;
      if (clock >= 0 && b < END_BEAT) {
        var acc = beatInBar(b) === 0;
        lamp = acc ? 1.25 : 1;
        tone(acc ? 1250 : 940, 0.03, { wave: 'triangle', volume: acc ? 0.12 : 0.08 });
        if (b === SWITCH) {
          // 拍子の切り替え: 鍋を下ろし、灯と拍の点が3つに変わる
          bannerT = 0;
          sfx('se_powerup', 0.4);
          if (!demoMode && found > 0) game.fx.popup(found + ' / ' + PLAN.length, 540, 420, { color: C.cream, size: 60 });
        }
      }
    }
    var rd = curRound();
    if (rd) {
      for (var i = 0; i < rd.pots.length; i++) {
        var p = rd.pots[i];
        if (p.spark > 0) p.spark -= dt * 3;
        if (p.flash > 0) p.flash -= dt;
        if (p.pad > 0) p.pad -= dt * 4;
        if (clock < rd.s * SPB) continue;
        var n = Math.floor((clock - rd.s * SPB) / p.T + 1e-6);
        if (n > p.n) {
          p.n = n; p.spark = 1; p.pad = 1;
          tone(PITCH[i], 0.08, { wave: 'square', volume: 0.045 });
        }
      }
      // 見つけられないまま回が終わる0.65秒前に、灯が赤く点滅して予告
      if (!rd.done && !rd.warned && clock > (rd.last * SPB + GOOD_W) - 0.65) {
        rd.warned = true; warnT = 0.65;
        tone('E6', 0.05, { wave: 'square', volume: 0.07 });
        tone('C6', 0.08, { wave: 'square', volume: 0.06 });
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    craftT += dt; bannerT += dt;
    if (warnT > 0) warnT -= dt;
    lamp = Math.max(0, lamp - dt * 3.5);
    for (var r = 0; r < rounds.length; r++) if (rounds[r].reveal > 0) rounds[r].reveal -= dt;
    beatClock(dt);
    craftX += (strikeX - craftX) * Math.min(1, dt * 10);
    if (over) return;
    for (var i = 0; i < rounds.length; i++) {
      var q = rounds[i];
      if (!q.done && clock > q.last * SPB + GOOD_W) { fail(q, null, 'timeout'); if (over) return; }
    }
    if (clock > (END_BEAT - 1) * SPB + GOOD_W + 0.2 || clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    if (y < 380) { game.audio.play('se_tap', 0.1); return; }
    var col = columnAt(x);
    game.fx.burst(x, y, { color: C.cream, count: 4, speed: 100 });
    if (col < 0) { tone(160, 0.05, { wave: 'square', volume: 0.06 }); return; }
    tapPot(col);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function roundRect(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - r * 2, h, col, a);
    game.draw.rect(x, y + r, r, h - r * 2, col, a);
    game.draw.rect(x + w - r, y + r, r, h - r * 2, col, a);
    game.draw.circle(x + r, y + r, r, col, a); game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a); game.draw.circle(x + w - r, y + h - r, r, col, a);
  }

  function drawStall() {
    game.draw.gradient(0, H, [[0, C.bg0], [0.55, C.bg1], [1, C.shade]]);
    // 遠くの露店の屋根(太い形を少しだけ)
    for (var i = 0; i < 4; i++) game.draw.rect(i * 290 - 40, 600 + (i % 2) * 40, 230, 120, C.shade, 0.45);
    // 日よけ(太い縞)とひだ
    for (var s = 0; s < 6; s++) game.draw.rect(s * 180, 236, 180, 140, s % 2 ? C.cream : C.rust);
    for (var c = 0; c < 12; c++) game.draw.circle(45 + c * 90, 376, 45, c % 2 ? C.cream : C.rust);
    // 梁
    game.draw.rect(0, PIVOT_Y - 26, W, 40, C.wood2);
    game.draw.rect(0, PIVOT_Y - 26, W, 10, C.wood);
    // 作業台
    game.draw.rect(0, CRAFT_Y + 70, W, 230, C.wood);
    game.draw.rect(0, CRAFT_Y + 70, W, 18, C.wood2);
    for (var r = 0; r < 5; r++) game.draw.circle(130 + r * 200, CRAFT_Y + 160, 9, C.slate);
  }

  function drawLantern() {
    var x = 540, y = 300;
    game.draw.line(x, 236, x, y - 50, C.ink, 6);
    var warn = warnT > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    var lit = waltz() ? C.rust : C.amber;
    var col = warn ? C.red : (lamp > 0.2 ? lit : C.cream);
    if (lamp > 0.05) {
      game.draw.circle(x, y, 90 + lamp * 40, warn ? C.red : lit, 0.25 * Math.min(1, lamp));
      game.draw.circle(x, y, 60 + lamp * 20, C.cream, 0.25 * Math.min(1, lamp));
    }
    game.draw.sprite(LANTERN, { k: C.ink, l: col }, x, y, 11 + lamp * 1.5, { anchor: 'center' });
  }

  function drawPots() {
    if (inSwitch()) {
      // 切り替えの小節: 鍋は上げられ、3つの点が強・弱・弱で光る
      var b = clock / SPB, bi = Math.floor(b) - SWITCH;
      for (var d = 0; d < 3; d++) {
        var on = bi === d;
        game.draw.circle(360 + d * 180, 830, (d === 0 ? 62 : 46) + (on ? lamp * 18 : 0), on ? C.rust : C.shade);
        game.draw.circle(360 + d * 180, 830, (d === 0 ? 40 : 28), C.cream, on ? 0.9 : 0.4);
      }
      return;
    }
    var rd = curRound();
    if (!rd) rd = rounds[clock < 0 ? 0 : rounds.length - 1];
    var lift = Math.max(0, 1 - (clock - rd.s * SPB) / 0.18);
    for (var i = 0; i < rd.pots.length; i++) {
      var p = rd.pots[i], pos = potPos(rd, p);
      var py = pos.y - lift * 40;
      game.draw.line(p.x0, PIVOT_Y + 10, pos.x, py - 10, C.ink, 5);
      if (p.spark > 0.05) {
        game.draw.circle(pos.x, py + 40, 70 + (1 - p.spark) * 50, C.cream, 0.4 * p.spark);
        game.draw.rect(pos.x - 70, py + 102, 140, 8, C.amber, p.spark);
      }
      var isMatch = i === rd.match;
      var showGold = isMatch && rd.done && (rd.res === 1 || rd.res === 2 || rd.reveal > 0);
      if (showGold) game.draw.circle(pos.x, py + 40, 100, C.amber, 0.3 + 0.15 * Math.sin(game.time.elapsed * 12));
      var white = p.flash > 0 && (p.flash > 0.2 || hitStop > 0);
      game.draw.sprite(POT, white ? POT_WHITE : (showGold ? POT_GOLD : POT_PAL), pos.x, py + 40, white ? 12 : 10, { anchor: 'center' });
    }
    if (craftT < 0.18 && strikeY > 0) {
      game.draw.sprite(MALLET, MALLET_PAL, strikeX + 70, strikeY + 30 - (1 - craftT / 0.18) * 40, 12, { anchor: 'center' });
    }
  }

  function drawCraftsman() {
    var hit = craftT < 0.2;
    game.draw.circle(craftX, CRAFT_Y + 72, 70, C.ink, 0.15);
    game.draw.sprite(hit ? CRAFT_HIT : CRAFT_IDLE, CRAFT_PAL, craftX, CRAFT_Y + (hit ? -6 : 0) - lamp * 4, 10, { anchor: 'center' });
  }

  function drawPads() {
    game.draw.rect(0, PAD_Y - 30, W, H - PAD_Y + 30, C.slate);
    var rd = curRound();
    if (!rd || inSwitch()) {
      roundRect(60, PAD_Y, W - 120, PAD_H, 30, C.ink, 0.35);
      return;
    }
    var m = rd.pots.length, w = W / (m + 1) - 20;
    for (var i = 0; i < m; i++) {
      var p = rd.pots[i], x = p.x0 - w / 2;
      var hot = p.pad > 0;
      roundRect(x, PAD_Y, w, PAD_H, 24, hot ? C.cream : C.wood);
      roundRect(x + 10, PAD_Y + 10, w - 20, PAD_H - 20, 18, hot ? C.amber : C.wood2);
      game.draw.sprite(POT, POT_PAL, p.x0, PAD_Y + PAD_H / 2, 6, { anchor: 'center' });
    }
    // 灯の拍(パッドの上の帯も光る)。回の終わりの予告は赤
    var warn = warnT > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.rect(0, PAD_Y - 30, W, 16, warn ? C.red : C.amber, warn ? 0.9 : lamp * 0.8);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.slate);
    label('SCORE ' + score, 40, 62, 40, C.cream, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(POT, i < lives ? POT_GOLD : POT_PAL, W - 80 - i * 110, 62, 5, { anchor: 'center' });
    label(found + ' / ' + PLAN.length, W / 2, 62, 40, C.amber);
    // 拍の点: 前半4つ、後半3つ(小節頭は大きい)
    var nb = waltz() ? 3 : 4, b = Math.floor(clock / SPB), inBar = clock >= 0 ? beatInBar(b) : -1;
    for (var d = 0; d < nb; d++) {
      var x = W / 2 - (nb - 1) * 45 + d * 90, on = inBar === d;
      game.draw.circle(x, 150, (d === 0 ? 22 : 16) + (on ? lamp * 8 : 0), on ? (waltz() ? C.rust : C.amber) : C.ink);
    }
    var progress = Math.max(0, Math.min(1, clock / (END_BEAT * SPB)));
    game.draw.rect(40, 200, W - 80, 14, C.ink);
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.cream);
  }

  function drawScene() {
    drawStall();
    drawLantern();
    drawPots();
    drawCraftsman();
    drawPads();
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    roundRect(60, top, W - 120, H * 0.4, 30, C.slate, 0.95);
    roundRect(80, top + 20, W - 160, H * 0.4 - 40, 22, C.ink, 0.35);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 92, won ? C.amber : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 58, C.cream);
    game.draw.sprite(POT, POT_GOLD, W / 2 - 140, H * 0.42, 6, { anchor: 'center' });
    label(found + ' / ' + PLAN.length, W / 2 + 30, H * 0.42, 48, C.amber);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.47, 34, C.cream);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 56, C.amber);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 42, C.cream);
    if (!won) label(nearText || ('あと' + Math.max(1, PLAN.length - found) + '回!'), W / 2, H * 0.57, 48, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.625, 34, C.cream);
  }

  // ---- ATTRACT: 実ロジックで鍋を見比べ、灯と同じ速さの鍋を拍の頭で叩く。次の回は違う鍋を叩いてMISSになる失敗例 ----
  var demo = { t: 0, x: W / 2, y: PAD_Y + 160, press: 0, done0: false, done1: false };
  function demoReset() {
    initRun(true);
    clock = -0.3; lastBeat = -99;
    demo.done0 = false; demo.done1 = false; demo.press = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_TO * SPB + 0.3);
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var b = clock / SPB, r0 = rounds[0], r1 = rounds[1], tx = W / 2;
    if (b < 3) {
      // 拍ごとに鍋を一つずつ見比べてから、当たりの鍋へ
      var look = Math.max(0, Math.min(r0.pots.length - 1, Math.floor(b)));
      tx = b < 2 ? r0.pots[look].x0 : r0.pots[r0.match].x0;
    } else if (b < 4) tx = r0.pots[r0.match].x0;
    else tx = r1.pots[(r1.match + 1) % r1.pots.length].x0;
    if (!demo.done0 && b >= 3) { demo.done0 = true; tapPot(r0.match); demo.press = 0.18; }
    if (!demo.done1 && b >= 6) { demo.done1 = true; tapPot((r1.match + 1) % r1.pots.length); demo.press = 0.18; }
    if (demo.press > 0) demo.press -= dt;
    demo.x += (tx - demo.x) * Math.min(1, dt * 12);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, PAD_Y + (demo.press > 0 ? 190 : 120), { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.slate);
      label(GAME_TITLE, W / 2, 88, 92 + Math.sin(t * 3) * 3, C.amber);
      label('HI-SCORE ' + game.best, W / 2, 186, 36, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.555, 54, C.red);
      else label('TAP TO START', W / 2, H * 0.555, 48, C.ink);
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
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      roundRect(140, H * 0.44, W - 280, 150, 30, C.slate, 0.9);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44 + 75, 96, C.amber);
    }
    // 開始時お手本: 最初の回の始めに、手が台を端から順に見比べる(答えは見せない)
    var r0 = rounds[0];
    if (!over && !r0.done && clock > 0 && clock < 2 * SPB) {
      var u = clock / (2 * SPB);
      game.draw.hand(r0.pots[0].x0 + (r0.pots[r0.pots.length - 1].x0 - r0.pots[0].x0) * u, PAD_Y + 120, { press: false, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);

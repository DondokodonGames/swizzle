// K-GBA-0027v3-clockshop-twin-pendulum.js
// 振り子時計のつい — 跳ねる拍で揺れる壁の振り子時計の中から同じ拍で刻む二つを見つけ、拍の頭で二本の指で同時に触れる
// 操作: 壁の時計はそれぞれ違う速さ・違う刻み(跳ねる8分・まっすぐな8分・4分・2分・付点など)で振り子を揺らしコチコチ鳴る。まったく同じ刻みで揺れる二つが1組だけある。その二つを二本の指で同時に(0.16秒以内)押さえ、押した瞬間が拍の頭に合っていればPERFECT/GOOD。違う組・拍の頭から外れた同時押しはMISSでその回は終わり。1本指だけで触れると時計が鳴るだけ。1回は最長2小節、最後の拍の1拍前に時計の枠が赤く点滅
// 終わり: 4回(時計4→5→6→6面・似た刻みが増える)を通してMISS1回以内ならCLEAR(判定の点+早見つけボーナス)。MISS2回でGAME OVER
// @mechanic: pair_match
// @theme: clockshop_twin_pendulum_swing
// 世界観: 古い時計店の壁一面に掛かった振り子時計の前で、白ひげの店主が、跳ねる拍で揺れる時計の中から同じ拍で刻む二つを探し当て、拍の頭に両手で同時に触れて揃いの札を掛ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・揃えた組の数・PERFECT/GOOD/MISS数
// スタイル: 80s ISO

(function(game) {
  var STYLE = { bg: ['#2e2440', '#5a4a6a'], main: ['#c8884a', '#f0e0b0', '#6a8aa8'], accent: ['#ffd04a', '#e04848'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 部屋の角を等角で見下ろす。床は菱形格子、壁は2面の平行四辺形。高さは壁に落ちる影の距離で示し、奥でも小さくしない
  var C = {
    night: STYLE.bg[0], wall: STYLE.bg[1], wood: STYLE.main[0], cream: STYLE.main[1], blue: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1],
    ink: '#1a1222', wallR: '#463a56', floorA: '#7a5a3a', floorB: '#684a30', dwood: '#7a4e2a', white: '#ffffff', green: '#8ad08a', gray: '#5a5266'
  };

  var GAME_TITLE = 'TWIN TICK';
  var BPM = 104, SPB = 60 / BPM;
  var PERFECT_W = 0.06, GOOD_W = 0.12, PAIR_W = 0.16;
  var READY_T = 0.8, LIVES = 2, LEAD = 2, ROUND_N = 4, RBEATS = 8;
  var TIME_LIMIT = 20;
  var CORNER_Y = 1150, SIDE_Y = 1420, WALL_H = 800;

  // 壁の6か所の掛け位置(左壁3・右壁3)。y は壁の下辺から決める
  function wallBase(x) { return x < 540 ? SIDE_Y - x * 0.5 : CORNER_Y + (x - 540) * 0.5; }
  var SLOTS = [110, 270, 430, 650, 810, 970].map(function(x, i) { return { x: x, y: wallBase(x) - 430 + (i % 2 ? -30 : 20) }; });
  var SLOT_SETS = [[0, 2, 3, 5], [0, 1, 2, 3, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]];
  var TICK_HZ = [1500, 1800, 2100, 1650, 1950, 2300];

  // 刻みの型(1小節4拍の中の拍位置)。swing は長短の跳ねる8分
  var PAT = {
    swing: [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3],
    straight: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    quarter: [0, 1, 2, 3],
    half: [0, 2],
    shuffle2: [0, 2 / 3, 2, 8 / 3],
    dotted: [0, 0.75, 1, 1.75, 2, 2.75, 3, 3.75],
    push: [0, 1, 5 / 3, 2, 3, 11 / 3]
  };
  var PAIR_POOL = [['swing'], ['shuffle2', 'swing'], ['push', 'swing', 'shuffle2'], ['dotted', 'swing', 'push']];
  var DECOY_POOL = [
    ['straight', 'quarter', 'half'],
    ['straight', 'quarter', 'half', 'swing', 'shuffle2'],
    ['dotted', 'straight', 'shuffle2', 'quarter', 'half', 'swing', 'push'],
    ['swing', 'straight', 'dotted', 'shuffle2', 'push', 'quarter']
  ];

  // 伴奏(オリジナル): 跳ねるベース(長短)と、2小節で一巡りする跳ねた旋律
  var BASS = [['C3', 2 / 3], ['G2', 1 / 3], ['E3', 2 / 3], ['G2', 1 / 3], ['F3', 2 / 3], ['A2', 1 / 3], ['G3', 2 / 3], ['B2', 1 / 3]];
  var MEL = [
    [['E5', 2 / 3], ['G5', 1 / 3], ['R', 1], ['A5', 2 / 3], ['G5', 1 / 3], ['E5', 1]],
    [['D5', 2 / 3], ['E5', 1 / 3], ['G5', 1], ['R', 2 / 3], ['C5', 1 / 3], ['D5', 1]]
  ];

  // ---- スプライト ----
  var KEEP_A = ['...wwwww....', '..wwwwwww...', '..fffffff...', '.gfkfffkgf..', '..fffffff...', '..fwwwwwf...', '...fffff....', '..aaaaaaaa..', '.aaapppaaaa.', 'faaapppaaaaf', 'f.aapppaaa.f', '..aapppaa...', '..aa...aa...', '..dd...dd...'];
  var KEEP_B = ['............', '...wwwww....', '..wwwwwww...', '..fffffff...', '.gfkfffkgf..', '..fffffff...', '..fwwwwwf...', '...fffff....', 'faaaaaaaaaaf', 'faaapppaaaaf', '..aapppaaa..', '..aapppaa...', '..aa...aa...', '..dd...dd...'];
  var KEEP_UP = ['f..wwwww..f.', 'f.wwwwwww.f.', 'f.fffffff.f.', 'fgfkfffkgff.', '.ffffffffff.', '..fwwwwwf...', '...fffff....', '..aaaaaaaa..', '.aaapppaaaa.', '.aaapppaaaa.', '..aapppaaa..', '..aapppaa...', '..aa...aa...', '..dd...dd...'];
  var KEEP_OH = ['...wwwww....', '..wwwwwww...', '..fffffff...', '.gfwfffwgf..', '..fffffff...', '..fwkkkwf...', '...fffff....', 'f.aaaaaaaa.f', 'faaapppaaaaf', '.aaapppaaaa.', '..aapppaaa..', '..aapppaa...', '..aa...aa...', '..dd...dd...'];
  var KEEP_PAL = { w: '#e8e8f0', f: '#e0b090', g: '#6a8aa8', k: '#1a1222', a: '#6a8aa8', p: '#c8884a', d: '#3a2a20' };
  var CROWN = ['....oo....', '...oooo...', '.wwwwwwww.', 'wwwwwwwwww'];
  var TAG = ['.gg.', 'gggg', 'gkgg', 'gggg', 'gggg'];
  var LIFE = ['.ww.', 'wccw', 'wckw', 'wccw', '.ww.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var rounds, ri, clock, prevClock, lastBeat, cuedBar, lives, score, matched, nP, nG, nM;
  var over, won, outroT, hitStop, demoMode, prevBest, nearText, pending, flashSlots, flashT, keepPose, tagged;
  var beatPulse = 0;

  function pickIdx(n) { var i = Math.floor(game.random(0, n)); return i >= n ? n - 1 : i; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = pickIdx(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function initRun(demo) {
    demoMode = !!demo;
    rounds = [];
    for (var r = 0; r < ROUND_N; r++) {
      var slots = SLOT_SETS[r].slice();
      var pairName = PAIR_POOL[r][pickIdx(PAIR_POOL[r].length)];
      var decoys = shuffle(DECOY_POOL[r].filter(function(n) { return n !== pairName; })).slice(0, slots.length - 2);
      var order = shuffle(slots.slice());
      var pats = [null, null, null, null, null, null];
      pats[order[0]] = pairName; pats[order[1]] = pairName;
      for (var k = 2; k < order.length; k++) pats[order[k]] = decoys[k - 2];
      rounds.push({ pats: pats, pair: [order[0], order[1]], start: r === 0 ? LEAD : -1, ans: false, res: 0, warned: false });
    }
    ri = 0;
    clock = -READY_T; prevClock = clock; lastBeat = -99; cuedBar = -99;
    lives = LIVES; score = 0; matched = 0; nP = 0; nG = 0; nM = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best; nearText = '';
    pending = []; flashSlots = []; flashT = 0; keepPose = 0; tagged = [];
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 振り子: 刻みのたびに端に届き、次の刻みまでに反対の端へ振れる ----
  function pendState(name, tb) {
    var pat = PAT[name], n = pat.length;
    var bar = Math.floor(tb / 4), pos = tb - bar * 4, k = -1;
    for (var i = 0; i < n; i++) if (pat[i] <= pos) k = i;
    var t0, t1, side;
    if (k < 0) { t0 = pat[n - 1] - 4; t1 = pat[0]; side = (n - 1) % 2; }
    else { t0 = pat[k]; t1 = k + 1 < n ? pat[k + 1] : pat[0] + 4; side = k % 2; }
    var p = (pos - t0) / (t1 - t0);
    return { ang: (side ? 1 : -1) * Math.cos(p * Math.PI) * 0.4, age: (pos - t0) * SPB };
  }

  function nextBarHead(beat) { return LEAD + 4 * (Math.floor((beat - LEAD) / 4 + 0.001) + 1); }

  function endRound(rd, atBeat) {
    rd.ans = true;
    var nr = rounds[ri + 1];
    if (nr) nr.start = Math.max(nextBarHead(atBeat), rd.start + 4);
    else if (!over) finish(lives > 0);
  }

  // ---- 判定: 二本の指が同時に触れた二つの時計 ----
  function judgePair(a, b, tj) {
    var rd = rounds[ri];
    if (over) return;
    if (rd.ans || rd.start < 0) { tone(400, 0.04, { wave: 'triangle', volume: 0.08 }); return; }   // 札を掛けた後は次の小節まで待つ
    var nb = Math.round(tj / SPB), off = Math.abs(tj - nb * SPB);
    if (nb < rd.start + 1) { tone(400, 0.04, { wave: 'triangle', volume: 0.08 }); return; }   // 入れ替わった直後の拍は聞くだけ
    flashSlots = [a, b]; flashT = 0.35; keepPose = 0.35;
    var mx = (SLOTS[a].x + SLOTS[b].x) / 2, my = Math.min(SLOTS[a].y, SLOTS[b].y) - 120;
    var hit = (a === rd.pair[0] && b === rd.pair[1]) || (a === rd.pair[1] && b === rd.pair[0]);
    if (!hit || off > GOOD_W) {
      nM++;
      rd.res = 3;
      if (!demoMode) lives--;
      var last = !demoMode && lives <= 0;
      game.feedback.bad(mx, my, { text: 'MISS', shake: last ? 16 : (demoMode ? 3 : 8), volume: demoMode ? 0 : 0.5 });
      if (!hit) nearText = 'あと' + Math.max(1, ROUND_N - 1 - matched) + '組!';
      else nearText = 'あと' + (off - GOOD_W).toFixed(2) + '秒!';
      if (last) { hitStop = 0.45; finish(false); return; }
      endRound(rd, nb);
      return;
    }
    var perfect = off <= PERFECT_W;
    rd.res = perfect ? 1 : 2;
    matched++;
    if (perfect) nP++; else nG++;
    score += (perfect ? 300 : 200) + Math.max(0, rd.start + RBEATS - nb) * 25;
    tagged.push({ a: a, b: b, r: ri, t: 0 });
    game.feedback.good(mx, my, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.green, size: perfect ? 60 : 50, count: 16, volume: demoMode ? 0 : 0.35 });
    game.fx.burst(SLOTS[a].x, SLOTS[a].y, { color: C.gold, count: 10, speed: 260 });
    game.fx.burst(SLOTS[b].x, SLOTS[b].y, { color: C.gold, count: 10, speed: 260 });
    if (!demoMode) { tone(TICK_HZ[a] / 2, 0.25, { wave: 'triangle', volume: 0.12 }); tone(TICK_HZ[b] / 2, 0.25, { wave: 'triangle', volume: 0.12 }); }
    if (!demoMode && matched === 2) {
      game.fx.popup(matched + ' / ' + ROUND_N, 540, 420, { color: C.gold, size: 72 });
      sfx('se_milestone', 0.45);
    }
    endRound(rd, nb);
  }

  function slotAt(x, y) {
    var rd = rounds[ri];
    for (var s = 0; s < 6; s++) {
      if (!rd.pats[s]) continue;
      if (Math.abs(x - SLOTS[s].x) < 92 && y > SLOTS[s].y - 210 && y < SLOTS[s].y + 200) return s;
    }
    return -1;
  }

  // 押した瞬間を記録し、0.16秒以内に別の時計への押しがあれば対として判定する
  function touchClock(s, t) {
    for (var i = 0; i < pending.length; i++) {
      var p = pending[i];
      if (p.s !== s && Math.abs(t - p.t) <= PAIR_W) {
        pending.splice(i, 1);
        judgePair(p.s, s, (p.t + t) / 2);
        return true;
      }
    }
    pending.push({ s: s, t: t });
    return false;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5;
    if (demoMode) return;
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 700 + (i % 2) * 160, { color: [C.gold, C.cream, C.green][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.gold, 0.12);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, matched: matched, rounds: ROUND_N, perfect: nP, good: nG, miss: nM };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 拍クロック ----
  function beatClock() {
    var nb = Math.floor((clock + 0.06 - LEAD * SPB) / (4 * SPB));
    if (!demoMode && nb > cuedBar && nb >= 0 && !over) {
      cuedBar = nb;
      game.audio.melody(MEL[nb % 2], { tempo: BPM, wave: 'square', volume: 0.035, bass: BASS, bassVolume: 0.08 });
    }
    var b = Math.floor(clock / SPB);
    if (b !== lastBeat) {
      lastBeat = b;
      if (clock >= 0 && !over) {
        beatPulse = 1;
        tone(((b - LEAD) % 4 + 4) % 4 === 0 ? 520 : 390, 0.03, { wave: 'triangle', volume: 0.06 });
      }
    }
    // 次の回へ: 小節の頭で時計の刻みが入れ替わる
    var nr = rounds[ri + 1];
    if (nr && nr.start >= 0 && clock >= nr.start * SPB) {
      ri++;
      tone('C6', 0.06, { wave: 'square', volume: 0.06 });
      tone('G6', 0.08, { wave: 'square', volume: 0.05 });
    }
    // 時計の刻み音
    var rd = rounds[ri];
    var tb0 = prevClock / SPB - LEAD, tb1 = clock / SPB - LEAD;
    for (var s = 0; s < 6; s++) {
      var name = rd.pats[s];
      if (!name) continue;
      var pat = PAT[name];
      for (var bar = Math.floor(tb0 / 4); bar <= Math.floor(tb1 / 4); bar++) {
        for (var k = 0; k < pat.length; k++) {
          var tt = bar * 4 + pat[k];
          if (tt > tb0 && tt <= tb1) tone(TICK_HZ[s], 0.02, { wave: 'square', volume: 0.045 });
        }
      }
    }
    // 締め切りの1拍前に予告
    if (!rd.ans && !rd.warned && rd.start >= 0 && clock >= (rd.start + RBEATS - 2) * SPB) {
      rd.warned = true;
      tone(330, 0.1, { wave: 'square', volume: 0.08 });
      tone(247, 0.12, { wave: 'square', volume: 0.07 });
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    if (flashT > 0) flashT -= dt;
    if (keepPose > 0) keepPose -= dt;
    for (var i = 0; i < tagged.length; i++) tagged[i].t += dt;
    beatClock();
    // 相手のいない片手の押しは時計が鳴るだけで消える
    for (var p = pending.length - 1; p >= 0; p--) if (clock - pending[p].t > PAIR_W) pending.splice(p, 1);
    if (over) return;
    var rd = rounds[ri];
    if (!rd.ans && rd.start >= 0 && clock > (rd.start + RBEATS - 1) * SPB + GOOD_W) {
      nM++; rd.res = 3;
      if (!demoMode) lives--;
      var last = !demoMode && lives <= 0;
      flashSlots = rd.pair.slice(); flashT = 0.4;
      game.feedback.bad(540, 560, { text: 'MISS', shake: last ? 16 : 8, volume: demoMode ? 0 : 0.5 });
      nearText = 'あと' + Math.max(1, ROUND_N - 1 - matched) + '組!';
      if (last) { hitStop = 0.45; finish(false); return; }
      endRound(rd, rd.start + RBEATS - 1);
    }
    if (clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || hitStop > 0 || clock < 0) return;
    var s = slotAt(x, y);
    if (s < 0) { game.audio.tone(180, 0.04, { wave: 'triangle', volume: 0.08 }); return; }
    var paired = touchClock(s, clock);
    if (!paired) {
      game.audio.tone(TICK_HZ[s] / 2, 0.05, { wave: 'square', volume: 0.07 });
      game.fx.burst(SLOTS[s].x, SLOTS[s].y - 40, { color: C.cream, count: 4, speed: 90 });
    }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function frame(x, y, w, h, edge, fill) {
    game.draw.rect(x, y, w, h, fill || C.night, 0.92);
    game.draw.rect(x, y, w, 5, edge); game.draw.rect(x, y + h - 5, w, 5, edge);
    game.draw.rect(x, y, 5, h, edge); game.draw.rect(x + w - 5, y, 5, h, edge);
  }

  function drawRoom() {
    game.draw.gradient(0, H, [[0, C.night], [0.5, '#3a2e4c'], [1, C.night]]);
    // 左右の壁(平行四辺形を縦の帯で塗る)と縦縞の壁紙
    for (var x = 0; x < W; x += 6) {
      var left = x < 540;
      var top = left ? SIDE_Y - WALL_H - x * 0.5 : CORNER_Y - WALL_H + (x - 540) * 0.5;
      var bot = wallBase(x);
      game.draw.rect(x, top, 6, bot - top, left ? C.wall : C.wallR);
      if (x % 60 === 0) game.draw.rect(x, top, 3, bot - top, '#000000', 0.12);
      game.draw.rect(x, bot - 46, 6, 46, C.dwood);
      game.draw.rect(x, bot - 46, 6, 5, C.wood);
    }
    game.draw.line(540, CORNER_Y - WALL_H, 540, CORNER_Y, C.ink, 4);
    // 床: 菱形格子
    for (var y = CORNER_Y; y < SIDE_Y + (SIDE_Y - CORNER_Y); y += 5) {
      var hw = y <= SIDE_Y ? (y - CORNER_Y) * 2 : (2 * SIDE_Y - CORNER_Y - y) * 2;
      game.draw.rect(540 - hw, y, hw * 2, 5, Math.floor((y - CORNER_Y) / 45) % 2 ? C.floorA : C.floorB);
    }
    var L = { x: 0, y: SIDE_Y }, T = { x: 540, y: CORNER_Y }, R = { x: W, y: SIDE_Y }, B = { x: 540, y: 2 * SIDE_Y - CORNER_Y };
    for (var i = 1; i < 6; i++) {
      var f = i / 6;
      game.draw.line(T.x + (L.x - T.x) * f, T.y + (L.y - T.y) * f, R.x + (B.x - R.x) * f, R.y + (B.y - R.y) * f, '#000000', 2);
      game.draw.line(T.x + (R.x - T.x) * f, T.y + (R.y - T.y) * f, L.x + (B.x - L.x) * f, L.y + (B.y - L.y) * f, '#000000', 2);
    }
  }

  function drawClock(s, rd, tb, warnBlink) {
    var sl = SLOTS[s], name = rd.pats[s];
    var x = sl.x, y = sl.y;
    if (!name) {   // 空いた釘
      game.draw.rect(x - 6, y - 200, 12, 12, C.gray);
      return;
    }
    var st = pendState(name, tb);
    var white = flashT > 0 && flashSlots.indexOf(s) >= 0;
    var big = white ? 1.12 : 1;
    var cw = 150 * big, ch = 380 * big;
    // 壁に落ちる影(高さ = 影の距離)
    game.draw.rect(x - cw / 2 + 18, y - ch / 2 + 22, cw, ch, '#000000', 0.3);
    game.draw.rect(x - cw / 2, y - ch / 2, cw, ch, white ? C.white : (warnBlink ? C.red : C.dwood));
    game.draw.rect(x - cw / 2 + 10, y - ch / 2 + 10, cw - 20, ch - 20, white ? C.white : C.wood);
    game.draw.rect(x - cw / 2 + 10, y - ch / 2 + 10, 8, ch - 20, C.cream, 0.35);
    game.draw.sprite(CROWN, { o: st.age < 0.12 ? C.white : C.gold, w: C.dwood }, x, y - ch / 2 - 18, 15, { anchor: 'center' });
    // 文字盤(顔)
    var fy = y - ch / 2 + 92;
    game.draw.circle(x, fy, 58 * big, C.ink);
    game.draw.circle(x, fy, 52 * big, C.cream);
    var blink = Math.floor(game.time.elapsed * 0.7 + s * 0.37) % 6 === 0 && (game.time.elapsed * 0.7 + s * 0.37) % 1 < 0.15;
    game.draw.rect(x - 22, fy - 18, 10, blink ? 3 : 12, C.ink);
    game.draw.rect(x + 12, fy - 18, 10, blink ? 3 : 12, C.ink);
    var hr = (game.time.elapsed * 0.05 + s) * Math.PI * 2;
    game.draw.line(x, fy + 6, x + Math.cos(hr) * 26, fy + 6 + Math.sin(hr) * 26, C.ink, 5);
    game.draw.line(x, fy + 6, x, fy + 36, C.ink, 3);
    // 振り子の窓
    var wy = fy + 78;
    game.draw.rect(x - 52, wy, 104, 190, '#2a1a12');
    game.draw.rect(x - 52, wy, 104, 4, C.gold, 0.6);
    var len = 140, bx = x + Math.sin(st.ang) * len, by = wy + 10 + Math.cos(st.ang) * len;
    game.draw.line(x, wy + 8, bx, by, C.gold, 4);
    game.draw.circle(bx, by, 22, st.age < 0.1 ? C.white : C.gold);
    game.draw.circle(bx - 6, by - 6, 6, C.white, 0.7);
  }

  function drawTags() {
    for (var i = 0; i < tagged.length; i++) {
      var tg = tagged[i];
      if (tg.r !== ri) continue;
      var a = SLOTS[tg.a], b = SLOTS[tg.b];
      if (tg.t < 0.6) game.draw.line(a.x, a.y - 120, b.x, b.y - 120, C.gold, 6 * (1 - tg.t / 0.6) + 1);
      game.draw.sprite(TAG, { g: C.gold, k: C.red }, a.x + 60, a.y - 150 + Math.sin(game.time.elapsed * 5) * 4, 10, { anchor: 'center' });
      game.draw.sprite(TAG, { g: C.gold, k: C.red }, b.x + 60, b.y - 150 + Math.sin(game.time.elapsed * 5 + 1) * 4, 10, { anchor: 'center' });
    }
  }

  function drawKeeper() {
    var kx = 540, ky = Math.round(H * 0.81);
    game.draw.circle(kx, ky + 70, 70, '#000000', 0.3);
    var art = flashT > 0 && rounds[ri].res === 3 ? KEEP_OH : (keepPose > 0 ? KEEP_UP : (Math.floor(Math.max(0, clock) / SPB) % 2 ? KEEP_A : KEEP_B));
    game.draw.sprite(art, KEEP_PAL, kx, ky - beatPulse * 6, 11, { anchor: 'center' });
  }

  function drawScene() {
    drawRoom();
    var rd = rounds[ri];
    var tb = clock / SPB - LEAD;
    var warn = !rd.ans && rd.start >= 0 && clock >= (rd.start + RBEATS - 2) * SPB && !over;
    var warnBlink = warn && Math.floor(game.time.elapsed * 10) % 2 === 0;
    for (var s = 0; s < 6; s++) drawClock(s, rd, tb, warnBlink);
    drawTags();
    drawKeeper();
  }

  function drawHud() {
    frame(20, 16, W - 40, 210, C.gold, C.night);
    label('SCORE ' + score, 60, 66, 38, C.cream, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LIFE, { w: i < lives ? C.gold : C.gray, c: C.cream, k: C.ink }, W - 90 - i * 60, 66, 10, { anchor: 'center' });
    label(matched + ' / ' + ROUND_N, W / 2 + 130, 66, 38, C.gold);
    // 跳ねる8分の格子(長い枠と短い枠)
    var tb = clock / SPB - LEAD, pos = ((tb % 4) + 4) % 4;
    var x0 = W / 2 - 330;
    for (var bt = 0; bt < 4; bt++) {
      var bx = x0 + bt * 165;
      var onLong = clock >= LEAD * SPB && pos >= bt && pos < bt + 2 / 3;
      var onShort = clock >= LEAD * SPB && pos >= bt + 2 / 3 && pos < bt + 1;
      game.draw.rect(bx, 130, 100, 30, onLong ? C.gold : C.gray);
      game.draw.rect(bx + 108, 136, 44, 18, onShort ? C.cream : C.gray);
    }
    // この回の残り(縮むバー)
    var rd = rounds[ri], left = 1;
    if (rd.start >= 0 && !rd.ans) left = Math.max(0, Math.min(1, 1 - (clock / SPB - rd.start) / RBEATS));
    else if (rd.ans) left = 0;
    game.draw.rect(60, 194, W - 120, 10, C.gray);
    game.draw.rect(60, 194, (W - 120) * left, 10, left < 0.25 ? C.red : C.blue);
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    frame(70, top, W - 140, H * 0.36, won ? C.gold : C.red, C.night);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 90, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.365, 56, C.cream);
    game.draw.sprite(TAG, { g: C.gold, k: C.red }, W / 2 - 140, H * 0.415, 10, { anchor: 'center' });
    label(matched + ' / ' + ROUND_N, W / 2 + 10, H * 0.415, 48, C.gold);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.46, 32, C.blue);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.51, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.51, 42, C.cream);
    if (!won) label(nearText || ('あと' + Math.max(1, ROUND_N - 1 - matched) + '組!'), W / 2, H * 0.555, 46, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.605, 32, C.cream);
  }

  // ---- ATTRACT: 実ロジックで同じ刻みの二つへ両手を運び、拍の頭で同時に押さえる。1周おきに似た刻みの時計を選んでMISS ----
  var demo = { t: 0, n: 0, done: false, a: 0, b: 0, ax: 300, ay: 1100, bx: 780, by: 1100, press: 0 };
  var DEMO_HIT = 3, DEMO_CYC = (LEAD + DEMO_HIT + 1.6) * SPB;
  function demoReset() {
    initRun(true);
    clock = 0; prevClock = 0; lastBeat = 0;
    demo.n++; demo.done = false; demo.press = 0;
    var rd = rounds[0];
    demo.a = rd.pair[0]; demo.b = rd.pair[1];
    if (demo.n % 2 === 0) {   // 失敗例: 片方を似た刻みの時計にしてしまう
      for (var s = 0; s < 6; s++) if (rd.pats[s] && s !== rd.pair[0] && s !== rd.pair[1]) { demo.b = s; break; }
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var hitT = (LEAD + DEMO_HIT) * SPB;
    var k = Math.min(1, dt * 5);
    var near = clock > hitT - 1.2;
    var ta = near ? SLOTS[demo.a] : { x: 300, y: 1180 }, tb = near ? SLOTS[demo.b] : { x: 780, y: 1180 };
    demo.ax += (ta.x - demo.ax) * k; demo.ay += (ta.y + 40 - demo.ay) * k;
    demo.bx += (tb.x - demo.bx) * k; demo.by += (tb.y + 40 - demo.by) * k;
    if (!demo.done && clock >= hitT) {
      demo.done = true; demo.press = 0.35;
      touchClock(demo.a, clock);
      touchClock(demo.b, clock);
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.ax, demo.ay, { press: demo.press > 0, scale: 13 });
      game.draw.hand(demo.bx, demo.by, { press: demo.press > 0, scale: 13 });
      frame(20, 16, W - 40, 210, C.gold, C.night);
      label(GAME_TITLE, W / 2, 88, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 176, 34, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.155, 50, C.cream);
      else label('TAP TO START', W / 2, H * 0.155, 44, C.gold);
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
    // 押さえている指の下に光の輪(二本押さえているかが見える)
    var ts = game.touches || [];
    for (var ti = 0; ti < ts.length; ti++) {
      game.draw.circle(ts[ti].x, ts[ti].y, 70, C.gold, 0.18);
      game.draw.circle(ts[ti].x, ts[ti].y, 36, C.cream, 0.3);
    }
    drawHud();
    if (clock < 0) {
      frame(140, H * 0.4, W - 280, 150, C.gold, C.night);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.gold);
    }
    // 始まりの前ノリだけ、二本の指で同時に押す形を左右の壁で薄く見せる
    if (clock >= 0 && clock < LEAD * SPB) {
      var pr = (clock / SPB) % 1 < 0.3;
      game.draw.hand(260, 1160, { press: pr, scale: 12, alpha: 0.5 });
      game.draw.hand(820, 1160, { press: pr, scale: 12, alpha: 0.5 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);

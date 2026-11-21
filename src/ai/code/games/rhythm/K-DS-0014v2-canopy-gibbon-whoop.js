// K-DS-0014v2-canopy-gibbon-whoop.js
// 梢のテナガ返し — 群れの長が1小節で鳴いた短い声と長い声の並びを覚え、鳴き終わった直後の小節で同じ拍・同じ長さのまま鳴き返す
// 操作: 長の小節(上の画面)は見て聞くだけで入力は効かない。若いテナガザルの小節(下の画面)で画面を押すと鳴き始め、離すと鳴き止む。短い声=8分の頭でちょんと押す。長い声=8分の頭で押し、長が伸ばしたのと同じ長さだけ押し続けて伸ばし終わりの8分の頭で離す。押しの拍ずれでPERFECT/GOOD。離しが早すぎ/遅すぎ・並びに無い声・鳴き漏らしはMISS。ラウンドごとに長の並びは前回の並びのどこかに1声ずつ差し込まれて伸びる
// 終わり: 4ラウンド(お手本1小節→返し1小節、3声→4声→5声→6声)を返し切ればCLEAR(判定点+連続+きれいに返したラウンド+残り)。MISS3回でGAME OVER
// @mechanic: memory_sequence
// @theme: rainforest_gibbon_call_echo
// 世界観: 熱帯雨林の樹の上で、若いテナガザルが群れの長の鳴き声の並び(短い声と長い声)を覚え、鳴き終わった直後の小節で同じ並びを鳴き返して群れに迎えられる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・きれいに返せたラウンド数・最大連続
// スタイル: 2000s HANDHELD PASTEL
var STYLE = { bg: ['#fbe3ee', '#e2f4ec', '#f8f2d8'], main: ['#7cc9a6', '#f49bbb', '#9fc2ee'], accent: ['#ffffff', '#ff8a4c'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステルの本体に白縁の2画面。上の画面=長(お手本)、下の画面=若いテナガザル(返し)
  var INK = '#5a4a6a';
  var LEAF = ['#bfe8d2', '#9edcbc', '#7cc9a6'];
  var BARK = '#d6a982', BARK_D = '#b0846a';
  var CALL_COL = STYLE.main[1], RESP_COL = STYLE.accent[1];

  var GAME_TITLE = 'WHOOP ECHO';
  var BPM = 100, SPB = 60 / BPM, EIGHTH = SPB / 2, BAR = SPB * 4;
  var ROUNDS = 4, BARS = ROUNDS * 2, BEATS = BARS * 4;
  var TIME_LIMIT = 19.2;               // 8小節 × 2.4秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.13, REL_W = 0.15;
  var MISS_MAX = 3;

  var TOP_Y = 250, TOP_H = 650;        // 上の画面 250..900
  var HINGE_Y = 945;
  var BOT_Y = 990, BOT_H = 830;        // 下の画面 990..1820
  var LANE_X0 = 160, SLOT_DX = 108;
  var CALL_Y = 810, RESP_Y = 1100;
  var ELDER_X = 300, ELDER_Y = 575, BRANCH_Y = 400;
  var YOUNG_X = 790, YOUNG_Y = 1300;
  var PAD_X = W / 2, PAD_Y = Math.round(H * 0.83), PAD_R = 180;

  // 長の並びの種(3声・長い声1つ)と、後から差し込める8分のコマ(長い声の伸ばし中と離す頭は避ける)
  var BASES = [
    { notes: [[0, 1], [1, 1], [2, 2]], free: [5, 6, 7] },
    { notes: [[0, 2], [3, 1], [5, 1]], free: [4, 6, 7] },
    { notes: [[0, 1], [2, 2], [6, 1]], free: [1, 5, 7] },
    { notes: [[1, 2], [4, 1], [6, 1]], free: [0, 5, 7] },
    { notes: [[0, 1], [3, 2], [6, 1]], free: [1, 2, 7] }
  ];

  // 伴奏(オリジナル)。長の小節は木琴風の動機+低音、返しの小節は1拍目の低音だけで声の隙間を空ける
  var ROOT = ['D3', 'Bb2', 'G2', 'A2'];
  var MOTIF = [
    [[['D5', 0.25], ['R', 0.25], ['A4', 0.5]], [['R', 0.5], ['F5', 0.5]], [['E5', 0.5], ['D5', 0.5]], [['C5', 0.5], ['R', 0.5]]],
    [[['Bb4', 0.25], ['R', 0.25], ['F4', 0.5]], [['R', 0.5], ['D5', 0.5]], [['C5', 0.5], ['Bb4', 0.5]], [['A4', 0.5], ['R', 0.5]]]
  ];

  // ---- スプライト ----
  // 群れの長: 片腕で枝にぶら下がる。待ち2コマ+鳴きコマ
  var ELDER = [
    ['..dd..........', '..ff..........', '..ff..........', '..ff..dddd....', '..ff.dwwwwd...', '..ffdwkwwkwd..', '...fdwwmmwwd..', '....ddwwwwdd..', '....ffffffff..', '...fffffffff..', '...ff.ffffff..', '...ff.fffff...', '...ff..ffff...', '..ff...f..f...', '..f....f..f...', '.......ff.ff..'],
    ['..dd..........', '..ff..........', '..ff..........', '..ff..dddd....', '..ff.dwwwwd...', '..ffdwkwwkwd..', '...fdwwmmwwd..', '....ddwwwwdd..', '....ffffffff..', '...fffffffff..', '....ffffffff..', '....ffffffff..', '....ff.ffff...', '...ff..f..f...', '...f...f..f...', '.......ff.ff..'],
    ['..dd..........', '..ff..........', '..ff......ff..', '..ff..dddd.f..', '..ff.dwwwwdf..', '..ffdwkwwkwf..', '...fdwwoowwd..', '....ddwoowdd..', '....ffffffff..', '...fffffffff..', '...ff.ffffff..', '...ff.fffff...', '...ff..ffff...', '..ff...f..f...', '..f....f..f...', '.......ff.ff..']
  ];
  // 若いテナガザル: 枝に座る。待ち2コマ+鳴きコマ(両腕を上げる)
  var YOUNG = [
    ['....dddd....', '...dwwwwd...', '..dwkwwkwd..', '..dwwmmwwd..', '...dwwwwd...', '....ffff....', '..ffffffff..', '.ff.ffff.ff.', '.f..ffff..f.', '.f..ffff..f.', '....f..f....', '...ff..ff...'],
    ['....dddd....', '...dwwwwd...', '..dwkwwkwd..', '..dwwmmwwd..', '...dwwwwd...', '....ffff....', '..ffffffff..', '.ff.ffff.ff.', '.f..ffff..f.', '..f.ffff.f..', '....f..f....', '...ff..ff...'],
    ['.f..dddd..f.', '.f.dwwwwd.f.', '.fdwkwwkwdf.', '.fdwwoowwdf.', '.f.dwoowd.f.', '.ff.ffff.ff.', '..ffffffff..', '....ffff....', '....ffff....', '....ffff....', '....f..f....', '...ff..ff...']
  ];
  var BUTTERFLY = [['b.b', '.k.', 'b.b'], ['.b.', 'bkb', '.b.']];
  var PAL_ELDER = { f: '#a48fb4', d: '#76628a', w: '#fff7f0', k: '#3a2a40', m: '#e88aa6', o: '#c4486e' };
  var PAL_YOUNG = { f: '#f2c58e', d: '#c8955c', w: '#fffaf2', k: '#4a3020', m: '#f19ab0', o: '#d0507a' };
  var PAL_WHITE = { f: '#ffffff', d: '#ffffff', w: '#ffffff', k: '#ffffff', m: '#ffffff', o: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, evs, misses, score, combo, maxCombo, nPerfect, nGood, nMiss, roundRes, roundDirty, extras;
  var hitStop, over, won, outroT, lastBeat, lastCue, demoMode, prevBest, failX, failY, resultT;
  var elderT, elderLen, voiceOn, holdEv, holdLock, trillT, lockT, turnT, beatPulse, mouthT, milestoneDone;

  function buildEvents(demo) {
    var base = demo ? BASES[0] : BASES[Math.floor(game.random(0, BASES.length)) % BASES.length];
    var order = base.free.slice();
    if (!demo) {
      for (var k = order.length - 1; k > 0; k--) {
        var j = Math.floor(game.random(0, k + 1)) % (k + 1);
        var tmp = order[k]; order[k] = order[j]; order[j] = tmp;
      }
    }
    var cur = base.notes.slice();
    var list = [];
    var n = demo ? 1 : ROUNDS;
    for (var r = 0; r < n; r++) {
      if (r > 0) cur = cur.concat([[order[r - 1], 1]]);
      var sorted = cur.slice().sort(function(a, b) { return a[0] - b[0]; });
      for (var i = 0; i < sorted.length; i++) {
        var s = sorted[i][0], len = sorted[i][1];
        list.push({
          r: r, slot: s, len: len, isNew: r > 0 && s === order[r - 1],
          callT: 2 * r * BAR + s * EIGHTH, respT: (2 * r + 1) * BAR + s * EIGHTH,
          relT: (2 * r + 1) * BAR + (s + len) * EIGHTH,
          shown: false, res: 0, pg: 0, grade: 0, cut: -1
        });
      }
    }
    return list;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.4 : -READY_T;
    evs = buildEvents(demo);
    misses = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0;
    roundRes = [0, 0, 0, 0]; roundDirty = [false, false, false, false]; extras = [];
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -99; lastCue = -1;
    prevBest = game.best; failX = -999; failY = -999; resultT = 0;
    elderT = 0; elderLen = 0; voiceOn = false; holdEv = null; holdLock = false; trillT = 0;
    lockT = 0; turnT = 0; beatPulse = 0; mouthT = 0; milestoneDone = false;
  }

  function slotX(s) { return LANE_X0 + s * SLOT_DX; }
  function phase() {
    if (clock < 0) return { bar: -1, resp: false, inBar: 0, r: 0 };
    var bar = Math.floor(clock / BAR);
    return { bar: bar, resp: bar % 2 === 1, inBar: clock - bar * BAR, r: Math.min(ROUNDS - 1, Math.floor(bar / 2)) };
  }

  // ---- 音 ----
  function elderCall(len) {
    if (len > 1) game.audio.tone('C5', len * EIGHTH * 0.95, { wave: 'triangle', volume: 0.09, slide: 520 });
    else game.audio.tone('E5', 0.14, { wave: 'triangle', volume: 0.09, slide: 200 });
  }
  function youngHoot() { game.audio.tone('A5', 0.11, { wave: 'square', volume: 0.05, slide: 260 }); }
  function playBeat(bi) {
    var bar = Math.floor(bi / 4), inBar = bi % 4, r = Math.min(ROUNDS - 1, Math.floor(bar / 2));
    if (bar % 2 === 0) {
      game.audio.melody(MOTIF[r % 2][inBar], { tempo: BPM, wave: 'triangle', volume: 0.035, bass: [[inBar % 2 === 0 ? ROOT[r] : 'R', 0.5], ['R', 0.5]], bassVolume: 0.08, bassWave: 'triangle' });
    } else {
      game.audio.melody([[inBar === 0 ? ROOT[r] : 'R', 0.5], ['R', 0.5]], { tempo: BPM, wave: 'triangle', volume: 0.07 });
    }
  }

  function beatClock() {
    var cue = Math.floor((clock + 0.06) / SPB);
    if (cue > lastCue && cue >= 0 && cue < BEATS) { lastCue = cue; if (!demoMode) playBeat(cue); }
    var bi = Math.floor(clock / SPB);
    if (bi === lastBeat) return;
    lastBeat = bi;
    if (clock < 0 || bi >= BEATS) return;
    beatPulse = 1;
    var inBar = bi % 4, bar = Math.floor(bi / 4);
    if (!demoMode) game.audio.tone(inBar === 0 ? 1320 : 1760, 0.02, { wave: 'triangle', volume: inBar === 0 ? 0.04 : 0.02 });
    // 長の小節の4拍目: 次は自分の番(葉っぱパッドが点滅 + 上がる2音)
    if (bar % 2 === 0 && inBar === 3) {
      turnT = SPB;
      if (!demoMode) { game.audio.tone(784, 0.06, { wave: 'triangle', volume: 0.05 }); game.audio.tone(1175, 0.09, { wave: 'triangle', volume: 0.05, slide: 140 }); }
    }
  }

  // ---- 判定 ----
  function checkRound(r) {
    if (roundRes[r]) return;
    for (var i = 0; i < evs.length; i++) if (evs[i].r === r && evs[i].res < 2) return;
    roundRes[r] = roundDirty[r] ? 2 : 1;
    if (roundRes[r] === 1) {
      score += 300;
      if (!demoMode) {
        game.fx.popup('NICE', W / 2, RESP_Y + 120, { color: RESP_COL, size: 80 });
        game.audio.play('se_milestone', 0.45);
        if (!milestoneDone && r >= 1) { milestoneDone = true; game.fx.burst(YOUNG_X, YOUNG_Y - 60, { color: STYLE.main[2], count: 20, speed: 360 }); }
      }
    }
  }

  function hitEvent(e, grade) {
    e.res = 2; e.grade = grade;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += (grade === 1 ? 100 : 60) + (e.len > 1 ? 60 : 0) + Math.min(10, combo) * 10;
    var x = e.len > 1 ? slotX(e.slot + e.len) : slotX(e.slot);
    game.feedback.good(x, RESP_Y - 70, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? STYLE.main[2] : RESP_COL,
      size: grade === 1 ? 50 : 42, count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.16
    });
    checkRound(e.r);
  }

  function missEvent(e, x, y) {
    if (e) { e.res = 3; roundDirty[e.r] = true; }
    misses++; nMiss++; combo = 0;
    hitStop = 0.34; failX = x; failY = y;
    game.feedback.bad(x, y - 70, { text: 'MISS', shake: demoMode ? 3 : 11, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && misses >= MISS_MAX) { game.audio.play('se_break', 0.4); finishRun(false); }
    if (e) checkRound(e.r);
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    voiceOn = false; holdEv = null;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - misses) * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 168, TOP_Y + 120 + (i % 2) * 140, { color: i % 2 ? CALL_COL : STYLE.main[2], count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var clean = 0;
    for (var r = 0; r < ROUNDS; r++) if (roundRes[r] === 1) clean++;
    var stats = { score: score, perfect: nPerfect, good: nGood, miss: nMiss, cleanRounds: clean, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 鳴き始め(本番の指もATTRACTのゴーストも同じ関数)
  function pressVoice() {
    voiceOn = true; holdLock = false; mouthT = 0.18; trillT = 0;
    var best = null, bd = 1e9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res) continue;
      var d = Math.abs(clock - e.respT);
      if (d <= GOOD_W && d < bd) { bd = d; best = e; }
    }
    if (best) {
      best.pg = bd <= PERFECT_W ? 1 : 2;
      if (best.len > 1) { best.res = 1; holdEv = best; return 'hold'; }
      hitEvent(best, best.pg);
      return 'hit';
    }
    var ph = phase();
    if (ph.resp && ph.bar < BARS) {
      // 長の並びに無いコマで鳴いた(余計な声)
      var rr = (ph.bar - 1) / 2, sx = slotX(ph.inBar / EIGHTH);
      roundDirty[rr] = true;
      extras.push({ x: sx, r: rr });
      voiceOn = false;
      missEvent(null, sx, RESP_Y);
      return 'extra';
    }
    voiceOn = false;
    lockT = 0.22;
    return 'locked';
  }

  // 鳴き止め
  function releaseVoice() {
    voiceOn = false;
    if (holdLock) { holdLock = false; return 'none'; }
    if (!holdEv) return 'none';
    var e = holdEv; holdEv = null;
    var d = clock - e.relT;
    if (Math.abs(d) <= REL_W) {
      var rg = Math.abs(d) <= PERFECT_W * 1.5 ? 1 : 2;
      hitEvent(e, Math.max(e.pg, rg));
      return 'hit';
    }
    // 伸ばしが足りない(早く離した)
    e.cut = clock;
    var cx = slotX(e.slot) + SLOT_DX * Math.max(0, (clock - e.respT) / EIGHTH);
    missEvent(e, cx, RESP_Y);
    return 'short';
  }

  function stepRun(dt) {
    clock += dt;
    if (lockT > 0) lockT -= dt;
    if (turnT > 0) turnT -= dt;
    if (elderT > 0) elderT -= dt;
    if (mouthT > 0) mouthT -= dt;
    beatClock();
    if (over) return;
    // 長い声を伸ばしている間は、音程が上がっていく震え声
    if (holdEv && !demoMode) {
      trillT -= dt;
      if (trillT <= 0) {
        trillT = 0.075;
        var held = Math.max(0, clock - holdEv.respT);
        game.audio.tone(760 + held * 900, 0.08, { wave: 'triangle', volume: 0.05 });
      }
    }
    // 伸ばしすぎ(離す頭を過ぎても押している)
    if (holdEv && clock > holdEv.relT + REL_W) {
      var he = holdEv; holdEv = null; holdLock = true; voiceOn = false;
      missEvent(he, slotX(he.slot + he.len), RESP_Y);
      if (over || hitStop > 0) return;
    }
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      // 長が拍クロックどおりに鳴く
      if (!e.shown && clock >= e.callT) {
        e.shown = true; elderT = e.len > 1 ? e.len * EIGHTH : 0.2; elderLen = e.len;
        if (!demoMode) elderCall(e.len);
      }
      // 返しの窓を過ぎても鳴かなかった
      if (!e.res && clock > e.respT + GOOD_W) {
        missEvent(e, slotX(e.slot), RESP_Y);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && !over && (clock >= BARS * BAR + REL_W || clock > TIME_LIMIT + 0.5)) finishRun(misses < MISS_MAX);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    var res = pressVoice();
    if (res === 'locked') {
      // 長の番は口を押さえて黙る: こもった音で空振り
      game.audio.tone(170, 0.07, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(YOUNG_X, YOUNG_Y - 40, { color: LEAF[1], count: 4, speed: 90 });
    } else if (res === 'hit' || res === 'hold') {
      youngHoot();
    } else {
      game.audio.tone(200, 0.12, { wave: 'sawtooth', volume: 0.06, slide: -70 });
    }
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) { voiceOn = false; return; }
    var res = releaseVoice();
    if (res === 'hit') game.audio.tone('D6', 0.1, { wave: 'triangle', volume: 0.06, slide: 120 });
    else if (res === 'short') game.audio.tone(320, 0.1, { wave: 'sawtooth', volume: 0.05, slide: -120 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x, y + 4, { size: sz, color: '#ffffff', bold: true, align: a });
    game.draw.text(str, x + 3, y, { size: sz, color: '#ffffff', bold: true, align: a });
    game.draw.text(str, x - 3, y, { size: sz, color: '#ffffff', bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function rrect(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - 2 * r, h, col, a);
    game.draw.rect(x, y + r, r, h - 2 * r, col, a);
    game.draw.rect(x + w - r, y + r, r, h - 2 * r, col, a);
    game.draw.circle(x + r, y + r, r, col, a);
    game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a);
    game.draw.circle(x + w - r, y + h - r, r, col, a);
  }
  function capsule(x1, x2, y, r, col, a) {
    if (x2 < x1) x2 = x1;
    game.draw.rect(x1, y - r, x2 - x1, r * 2, col, a);
    game.draw.circle(x1, y, r, col, a);
    game.draw.circle(x2, y, r, col, a);
  }
  function ring(x, y, r, w, col, inner) {
    game.draw.circle(x, y, r, col);
    game.draw.circle(x, y, r - w, inner);
  }
  function rimSprite(spr, pal, x, y, px) {
    var o = { anchor: 'center' };
    var d = px * 0.7;
    game.draw.sprite(spr, PAL_WHITE, x - d, y, px, o);
    game.draw.sprite(spr, PAL_WHITE, x + d, y, px, o);
    game.draw.sprite(spr, PAL_WHITE, x, y - d, px, o);
    game.draw.sprite(spr, PAL_WHITE, x, y + d, px, o);
    game.draw.sprite(spr, pal, x, y, px, o);
  }
  function leafBall(x, y, r, col) {
    game.draw.circle(x, y, r + 6, '#ffffff');
    game.draw.circle(x, y, r, col);
    game.draw.circle(x - r * 0.3, y - r * 0.3, r * 0.3, '#ffffff', 0.35);
  }

  // ---- 描画 ----
  function drawBody() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[2]], [1, STYLE.bg[1]]]);
    var t = game.time.elapsed;
    for (var i = 0; i < 14; i++) {
      var x = (i * 173 + 40) % W, y = 40 + (i * 131) % (H - 80);
      game.draw.circle(x, y + Math.sin(t + i) * 6, 6 + (i % 3) * 3, '#ffffff', 0.45);
    }
  }

  function drawTopScreen() {
    var t = game.time.elapsed;
    rrect(28, TOP_Y - 12, W - 56, TOP_H + 24, 40, '#ffffff');
    rrect(40, TOP_Y, W - 80, TOP_H, 30, '#eaf8f1');
    game.draw.gradient(TOP_Y + 30, TOP_Y + TOP_H - 30, ['#fff4e2', '#e3f6ec']);
    game.draw.rect(40, TOP_Y + 30, W - 80, TOP_H - 60, '#f2fbf6', 0.35);
    // 遠景の樹冠(丸い葉のかたまり)
    for (var i = 0; i < 9; i++) {
      var lx = 70 + i * 120, ly = TOP_Y + 110 + (i % 3) * 30 + Math.sin(t * 0.8 + i) * 4;
      leafBall(lx, ly, 62 + (i % 2) * 16, LEAF[i % 3]);
    }
    // 垂れる蔓
    for (var v = 0; v < 4; v++) {
      var vx = 520 + v * 130 + Math.sin(t * 1.2 + v) * 8;
      game.draw.line(vx, TOP_Y + 150, vx + Math.sin(t + v) * 14, TOP_Y + 330 + v * 30, LEAF[2], 6);
      leafBall(vx + Math.sin(t + v) * 14, TOP_Y + 340 + v * 30, 14, LEAF[1]);
    }
    // 枝と群れの長
    game.draw.line(40, BRANCH_Y + 8, 760, BRANCH_Y - 10, '#ffffff', 34);
    game.draw.line(40, BRANCH_Y + 8, 760, BRANCH_Y - 10, BARK, 24);
    game.draw.line(40, BRANCH_Y + 14, 760, BRANCH_Y - 4, BARK_D, 6);
    var calling = elderT > 0;
    var fr = calling ? 2 : Math.floor(t * 1.5) % 2;
    var sway = calling ? 0 : Math.sin(t * 1.5) * 10;
    rimSprite(ELDER[fr], PAL_ELDER, ELDER_X + sway, ELDER_Y, 15);
    if (calling) {
      var ca = elderLen > 1 ? 0.35 : 0.5;
      game.draw.circle(ELDER_X + 50, ELDER_Y - 40, 60 + (1 - Math.min(1, elderT / 0.3)) * 50, CALL_COL, ca * 0.6);
      game.draw.circle(ELDER_X + 50, ELDER_Y - 40, 26, '#ffffff', ca);
    }
    // ちょうちょ(2コマ)
    for (var b = 0; b < 2; b++) {
      var bx = 640 + Math.sin(t * 0.7 + b * 2) * 220, by = TOP_Y + 260 + b * 120 + Math.sin(t * 2.3 + b) * 30;
      game.draw.sprite(BUTTERFLY[Math.floor(t * 6 + b) % 2], { b: b ? STYLE.main[2] : CALL_COL, k: INK }, bx, by, 9, { anchor: 'center' });
    }
    drawLane(CALL_Y, 'call');
  }

  function drawLane(y, which) {
    var ph = phase();
    var active = ph.bar >= 0 && ph.bar < BARS && (which === 'call' ? !ph.resp : ph.resp);
    var col = which === 'call' ? CALL_COL : RESP_COL;
    rrect(LANE_X0 - 60, y - 52, 8 * SLOT_DX + 100, 104, 52, '#ffffff', 0.9);
    rrect(LANE_X0 - 50, y - 42, 8 * SLOT_DX + 80, 84, 42, active ? '#fff1e8' : '#f3f0f5');
    for (var s = 0; s < 8; s++) {
      var big = s % 2 === 0;
      game.draw.circle(slotX(s), y, big ? 11 : 6, active ? col : '#d6cfe0');
    }
    if (active) {
      var cx = slotX(ph.inBar / EIGHTH);
      game.draw.rect(cx - 5, y - 46, 10, 92, INK, 0.55);
    }
  }

  function drawCallMarks() {
    var ph = phase();
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (!e.shown || e.r !== ph.r) continue;
      var a = ph.resp ? Math.max(0, 1 - ph.inBar / 0.3) : 1;
      if (a <= 0) continue;
      var x1 = slotX(e.slot);
      if (e.len > 1) {
        var p = ph.resp ? 1 : Math.min(1, (clock - e.callT) / (e.len * EIGHTH));
        capsule(x1, x1 + SLOT_DX * e.len * p, CALL_Y, 30, '#ffffff', a);
        capsule(x1, x1 + SLOT_DX * e.len * p, CALL_Y, 22, CALL_COL, a);
      } else {
        game.draw.circle(x1, CALL_Y, 30, '#ffffff', a);
        game.draw.circle(x1, CALL_Y, 22, CALL_COL, a);
      }
      if (e.isNew && !ph.resp) game.draw.circle(x1, CALL_Y - 46, 8, STYLE.accent[1], a);
    }
  }

  function drawHinge() {
    rrect(70, HINGE_Y - 34, W - 140, 68, 34, '#ffffff');
    var ph = phase();
    var cur = clock >= 0 && ph.bar < BARS ? Math.floor(ph.inBar / SPB) : -1;
    var col = ph.resp ? RESP_COL : CALL_COL;
    for (var i = 0; i < 4; i++) {
      var x = W / 2 - 240 + i * 160, on = i === cur;
      var r = (i === 0 ? 20 : 15) + (on ? beatPulse * 9 : 0);
      game.draw.circle(x, HINGE_Y, r + 4, on ? '#ffffff' : '#e8e2ee');
      game.draw.circle(x, HINGE_Y, r, on ? col : '#d6cfe0');
    }
  }

  function drawBottomScreen() {
    var t = game.time.elapsed;
    rrect(28, BOT_Y - 12, W - 56, BOT_H + 24, 40, '#ffffff');
    rrect(40, BOT_Y, W - 80, BOT_H, 30, '#fdeef3');
    game.draw.gradient(BOT_Y + 30, BOT_Y + BOT_H - 30, ['#fff6ea', '#fde3ec']);
    // 下草の葉
    for (var i = 0; i < 8; i++) leafBall(80 + i * 135, BOT_Y + BOT_H - 70 + (i % 2) * 18, 54, LEAF[(i + 1) % 3]);
    drawLane(RESP_Y, 'resp');
    drawRespMarks();
    // 若いテナガザルの枝
    game.draw.line(260, YOUNG_Y + 100, 1040, YOUNG_Y + 80, '#ffffff', 34);
    game.draw.line(260, YOUNG_Y + 100, 1040, YOUNG_Y + 80, BARK, 24);
    var big = hitStop > 0 && state === S.PLAYING;
    var singing = voiceOn || mouthT > 0;
    var fr = singing ? 2 : Math.floor(t * 1.8) % 2;
    var bob = singing ? -8 : Math.sin(t * 3.4) * 4 - beatPulse * 6;
    if (big) {
      game.draw.circle(YOUNG_X, YOUNG_Y, 150, '#ffffff', 0.7);
      game.draw.sprite(YOUNG[fr], PAL_WHITE, YOUNG_X, YOUNG_Y, 19, { anchor: 'center' });
    } else {
      rimSprite(YOUNG[fr], PAL_YOUNG, YOUNG_X, YOUNG_Y + bob, 15);
    }
    if (voiceOn) {
      for (var k = 0; k < 3; k++) {
        var ph2 = (t * 3 + k / 3) % 1;
        game.draw.circle(YOUNG_X - 40, YOUNG_Y - 70, 30 + ph2 * 110, RESP_COL, 0.3 * (1 - ph2));
      }
    }
    drawPad();
  }

  function drawRespMarks() {
    var ph = phase(), i, e;
    for (i = 0; i < evs.length; i++) {
      e = evs[i];
      if (e.r !== ph.r) continue;
      var x1 = slotX(e.slot);
      if (e.res === 2) {
        var x2 = e.len > 1 ? slotX(e.slot + e.len) : x1;
        capsule(x1, x2, RESP_Y, 30, '#ffffff');
        capsule(x1, x2, RESP_Y, 22, RESP_COL);
        if (e.grade === 1) game.draw.circle(x2, RESP_Y, 9, '#ffffff');
      } else if (e.res === 1) {
        var gx = Math.min(slotX(e.slot + e.len) + 30, x1 + SLOT_DX * Math.max(0, (clock - e.respT) / EIGHTH));
        capsule(x1, gx, RESP_Y, 30, '#ffffff');
        capsule(x1, gx, RESP_Y, 22, RESP_COL, 0.75);
        // 離す頭の目印
        game.draw.circle(slotX(e.slot + e.len), RESP_Y - 42, 9, INK, 0.6);
      } else if (e.res === 3) {
        // 答え合わせ: 正しい長さを白い枠で
        var xe = e.len > 1 ? slotX(e.slot + e.len) : x1;
        capsule(x1, xe, RESP_Y, 28, INK, 0.5);
        capsule(x1, xe, RESP_Y, 20, '#fff1e8');
        if (e.cut >= 0) {
          var xc = x1 + SLOT_DX * Math.max(0, (e.cut - e.respT) / EIGHTH);
          capsule(x1, xc, RESP_Y, 14, RESP_COL, 0.7);
        }
      }
    }
    for (i = 0; i < extras.length; i++) {
      var m = extras[i];
      if (m.r !== ph.r) continue;
      game.draw.line(m.x - 20, RESP_Y - 20, m.x + 20, RESP_Y + 20, INK, 8);
      game.draw.line(m.x + 20, RESP_Y - 20, m.x - 20, RESP_Y + 20, INK, 8);
    }
  }

  function drawPad() {
    var t = game.time.elapsed;
    var ph = phase();
    var live = (ph.resp && ph.bar >= 0 && ph.bar < BARS) || turnT > 0;
    var blink = turnT > 0 && Math.floor(t * 10) % 2 === 0;
    var pressed = voiceOn;
    var r = PAD_R + (blink ? 14 : 0) - (pressed ? 10 : 0);
    if (live) game.draw.circle(PAD_X, PAD_Y, r + 30 + Math.sin(t * 6) * 6, RESP_COL, 0.2);
    game.draw.circle(PAD_X, PAD_Y, r + 12, blink ? RESP_COL : '#ffffff');
    game.draw.circle(PAD_X, PAD_Y, r, live ? (pressed ? '#ffd2b8' : '#ffe6d4') : '#efe9f2');
    // 葉っぱの印(押す場所)
    var lc = live ? LEAF[2] : '#cfc6da';
    game.draw.circle(PAD_X - 34, PAD_Y + 10, 54, lc);
    game.draw.circle(PAD_X + 34, PAD_Y - 10, 54, lc);
    game.draw.line(PAD_X - 70, PAD_Y + 46, PAD_X + 70, PAD_Y - 46, '#ffffff', 8);
    if (lockT > 0) game.draw.circle(PAD_X, PAD_Y, PAD_R, '#ffffff', 0.5);
  }

  function drawHitFlash() {
    if (hitStop <= 0 || failX < -900) return;
    var p = 1 - hitStop / 0.34;
    game.draw.circle(failX, failY, 40 + p * 100, '#ffffff', 0.6 * (1 - p));
    ring(failX, failY, 46 + p * 40, 8, '#ffffff', '#ff8aa0');
  }

  function drawHud() {
    rrect(28, 18, W - 56, 196, 36, '#ffffff', 0.92);
    label('SCORE ' + score, 70, 82, 42, INK, 'left');
    var ph = phase();
    label((ph.r + 1) + ' / ' + ROUNDS, W / 2, 82, 44, CALL_COL);
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      leafBall(W - 90 - i * 78, 72, 24, on ? LEAF[2] : '#e2dbe8');
    }
    for (var r = 0; r < ROUNDS; r++) {
      var x = W / 2 - 150 + r * 100;
      game.draw.circle(x, 140, 20, '#e8e2ee');
      if (roundRes[r] === 1) game.draw.circle(x, 140, 16, STYLE.main[2]);
      else if (roundRes[r] === 2) game.draw.circle(x, 140, 16, '#cbbfd6');
    }
    var progress = Math.max(0, Math.min(1, clock / (BARS * BAR)));
    capsule(70, W - 70, 188, 8, '#e8e2ee');
    capsule(70, 70 + (W - 140) * progress, 188, 8, STYLE.main[0]);
    if (combo >= 2) label('x' + combo, W - 70, 150, 36, RESP_COL, 'right');
  }

  function drawScene() {
    drawBody();
    drawTopScreen();
    drawCallMarks();
    drawHinge();
    drawBottomScreen();
    drawHitFlash();
  }

  function drawResult(showTap) {
    var clean = 0, left = 0, i;
    for (i = 0; i < ROUNDS; i++) if (roundRes[i] === 1) clean++;
    for (i = 0; i < evs.length; i++) if (evs[i].res === 0 || evs[i].res === 3) left++;
    var y0 = H * 0.28, hh = H * 0.35;
    rrect(50, y0 - 12, W - 100, hh + 24, 44, '#ffffff');
    rrect(62, y0, W - 124, hh, 34, won ? '#e6f7ee' : '#fde8ee');
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 96, won ? STYLE.main[0] : CALL_COL);
    label('SCORE ' + score, W / 2, H * 0.4, 56, INK);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, INK);
    label('NICE ' + clean + ' / ' + ROUNDS, W / 2, H * 0.485, 38, STYLE.main[2]);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.53, 54, RESP_COL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.53, 40, INK);
    if (!won) label('あと' + Math.max(1, left) + '声!', W / 2, H * 0.57, 46, RESP_COL);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.612, 34, INK);
  }

  // ---- ATTRACT: 実ロジックで1ラウンド(短・短・長)。奇数周はきれいに返してNICE、偶数周は長い声を早く離してMISS ----
  var demo = { t: 0, x: PAD_X + 50, y: PAD_Y + 40, press: false, gi: 0, holding: false, relAt: 0, cyc: 0 };
  var DEMO_CYC = 2 * BAR + 0.9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.gi = 0; demo.holding = false; demo.cyc++; }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var cut = demo.cyc % 2 === 0;
    if (demo.gi < evs.length && hitStop <= 0) {
      var e = evs[demo.gi];
      if (!demo.holding && clock >= e.respT - 0.005) {
        pressVoice(); demo.holding = true;
        demo.relAt = e.len > 1 ? (cut ? e.respT + EIGHTH * 0.9 : e.relT) : e.respT + 0.12;
      } else if (demo.holding && clock >= demo.relAt) {
        releaseVoice(); demo.holding = false; demo.gi++;
      }
    }
    demo.press = demo.holding;
    var ty = PAD_Y + (demo.press ? 20 : 60);
    demo.y += (ty - demo.y) * Math.min(1, dt * 14);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      rrect(28, 18, W - 56, 196, 36, '#ffffff', 0.95);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, CALL_COL);
      label('HI-SCORE ' + game.best, W / 2, 182, 36, INK);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H - 50, 46, RESP_COL);
      else label('TAP TO START', W / 2, H - 50, 42, INK);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
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
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      rrect(80, HINGE_Y - 80, W - 160, 160, 60, '#ffffff', 0.95);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, HINGE_Y + 30, 100, RESP_COL);
    }
    // 最初の返しの直前だけ、葉っぱパッドの上に手を1回出す
    if (!over && clock > BAR - SPB && clock < BAR + 0.25) {
      game.draw.hand(PAD_X + 50, PAD_Y + 40, { press: clock >= BAR - 0.05, scale: 13, alpha: 0.7 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);

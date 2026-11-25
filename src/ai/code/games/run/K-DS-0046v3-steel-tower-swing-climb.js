// K-DS-0046v3-steel-tower-swing-climb.js
// 鉄塔のはね足のぼり — 先輩の号令の跳ねる拍(トン・タ)に合わせて指を左右に振り、足を交互に掛け替えて建設中の鉄塔を一段ずつ登る
// 操作: 画面を押したまま指を左右に振る(ワイパーのように真ん中の線をまたぐ)。またいだ瞬間にその側の足が上のステップボルトへ掛かり一段登る。押すだけ・離すだけでは足は動かない。足を掛ける時刻は下の譜面帯の足印(左=青・右=橙)が判定線に来る瞬間で、跳ねる8分(長・短)の「トン」と「タ」に並ぶ。ずれでPERFECT/GOOD、またがずに足印が過ぎると遅れてMISS(登れない)。赤い手の帯の拍は先輩が安全帯を掛け替える「待て」で、0.6秒前に先輩が赤い手袋を上げて笛が鳴る。その拍にまたぐと足を滑らせてMISS(安全帯に受け止められて一段下がる)。足印も赤帯もない所でまたぐと空踏み(連続が切れるだけ)
// 終わり: 8小節(96BPM・20秒・足掛け45回)を登り切ればCLEAR(登った段数+判定+連続+残った安全帯の札)。MISS6回でGAME OVER
// @mechanic: camera_climb
// @theme: steel_tower_apprentice_swing_climb
// 世界観: 建設中の送電用の鉄塔で、黄色いヘルメットに安全帯を着けた鳶職の見習いが、上を行く先輩の跳ねる号令に足並みを揃えて、脚柱のステップボルトを左右交互に踏んで登っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・登った段数と高さ(m)・PERFECT/GOOD/MISS数・滑った回数・最大連続
// スタイル: 80s ISO
var STYLE = { bg: ['#2c4a78', '#8ab4d8'], main: ['#c8ccd2', '#4e5e70', '#e8642a'], accent: ['#f2c230', '#ff3a3a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの床、等角に組んだ鉄骨(奥でも小さくしない)、高さは影と目盛りで示す。6〜8色
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], steel: STYLE.main[0], steelD: STYLE.main[1], paint: STYLE.main[2],
    helmet: STYLE.accent[0], red: STYLE.accent[1], navy: '#1a2236', white: '#f4f4ee', skin: '#e2a878', ground: '#7a6a52'
  };

  var GAME_TITLE = 'TOWER SHUFFLE';
  var BPM = 96, SPB = 60 / BPM, SW = SPB * 2 / 3, BAR = SPB * 4;
  var BARS = 8, END_T = BARS * BAR;       // 20秒
  var TIME_LIMIT = 20;
  var READY_T = 0.8;
  var PERFECT_W = 0.055, GOOD_W = 0.1;
  var TELE_T = 0.6;
  var MISS_MAX = 6;
  var CX = 540, HYS = 40;
  var RUNG_H = 56;
  var PLAYER_SY = 1150;                   // 見習いの画面上の高さ
  var LANE_Y = H * 0.765, JUDGE_X = 190, PXS = 560;
  var RAIL_Y = H * 0.89;
  var LX = 330, RX = 750;

  // 小節ごとの足掛け(8分の位置0〜7: 偶数=拍の頭「トン」、奇数=跳ねた裏「タ」)と「待て」の拍(0〜3)
  var PAT = [
    { steps: [0, 2, 4, 6], rest: [] },
    { steps: [0, 1, 4, 5], rest: [] },
    { steps: [0, 1, 2, 3, 4, 5], rest: [3] },
    { steps: [0, 1, 4, 5, 6, 7], rest: [] },
    { steps: [0, 1, 2, 3, 6, 7], rest: [2] },
    { steps: [0, 1, 2, 3, 4, 5, 6, 7], rest: [] },
    { steps: [2, 3, 4, 5, 6, 7], rest: [0] },
    { steps: [0, 1, 2, 3, 4], rest: [] }
  ];
  var DEMO_PAT = [{ steps: [0, 1, 4, 5], rest: [] }, { steps: [0, 1, 2, 3], rest: [3] }];

  // 伴奏(オリジナル・ト長調のシャッフル)。1拍ずつ「長・短」で鳴らして拍クロックと揃える
  var T2 = 2 / 3, T1 = 1 / 3;
  var LEAD = [
    [['G4', T2], ['B4', T1]], [['D5', 1]], [['B4', T2], ['D5', T1]], [['G5', 1]],
    [['E5', T2], ['C5', T1]], [['G4', 1]], [['A4', T2], ['C5', T1]], [['E5', 1]],
    [['D5', T2], ['B4', T1]], [['G4', T2], ['B4', T1]], [['D5', T2], ['E5', T1]], [['D5', 1]],
    [['F#5', T2], ['E5', T1]], [['D5', T2], ['A4', T1]], [['F#4', T2], ['A4', T1]], [['D5', 1]],
    [['B4', T2], ['D5', T1]], [['G5', T2], ['F#5', T1]], [['E5', T2], ['D5', T1]], [['B4', 1]],
    [['C5', T2], ['E5', T1]], [['G5', T2], ['E5', T1]], [['C5', T2], ['E5', T1]], [['G5', 1]],
    [['A4', T2], ['D5', T1]], [['F#5', T2], ['A5', T1]], [['F#5', T2], ['E5', T1]], [['D5', T2], ['C5', T1]],
    [['B4', T2], ['D5', T1]], [['G5', 1]], [['D5', T2], ['B4', T1]], [['G4', 1]]
  ];
  var WALK = [
    ['G2', 'B2', 'D3', 'B2'], ['C3', 'E3', 'G2', 'E3'], ['G2', 'B2', 'D3', 'B2'], ['D3', 'F#2', 'A2', 'F#2'],
    ['G2', 'B2', 'D3', 'B2'], ['C3', 'E3', 'G2', 'E3'], ['D3', 'F#2', 'A2', 'C3'], ['G2', 'D3', 'G2', 'G2']
  ];

  // ---- スプライト(登る人。顔をこちらへ向けて見下ろす) ----
  var CLIMB = [
    ['.s........s.', '.b..yyyy..b.', '.b.yyyyyy.b.', '.b.sesses.b.', '.bb.ssss.bb.', '..bobbbbob..', '...obbbbo...',
     '...bobbob...', '...oooooo...', '...bbbbbb...', '..bbb..bb...', '.bb.....bb..', '.kk.....bb..', '........kk..'],
    ['.s........s.', '.b..yyyy..b.', '.b.yyyyyy.b.', '.b.sesses.b.', '.bb.ssss.bb.', '..bobbbbob..', '...obbbbo...',
     '...bobbob...', '...oooooo...', '...bbbbbb...', '...bb..bbb..', '..bb.....bb.', '..bb.....kk.', '..kk........']
  ];
  var DANGLE = ['....yyyy....', '...yyyyyy...', '...sesses...', 's...ssss...s', '.bbobbbbobb.', '...obbbbo...',
    '...bobbob...', '...oooooo...', '...bbbbbb...', '...bb..bb...', '..bb....bb..', '..kk....kk..'];
  var HANDSIGN = ['.r.r.r.', '.r.r.r.', 'rrrrrr.', 'rrrrrrr', '.rrrrr.', '..rrr..'];
  var CLIP = ['.yy.', 'y..y', 'y..y', '.yy.', '.oo.'];
  var APAL = { s: C.skin, b: C.navy, y: C.helmet, e: '#101420', o: C.paint, k: '#2a2a30' };
  var SPAL = { s: C.skin, b: '#3a4a64', y: C.white, e: '#101420', o: C.helmet, k: '#2a2a30' };
  var WPAL = { s: '#ffffff', b: '#ffffff', y: '#ffffff', e: '#ffffff', o: '#ffffff', k: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, steps, rests, totalSteps, score, combo, maxCombo, nPerfect, nGood, nMiss, nSlip, nStray, rung, maxRung, judge;
  var hitStop, over, won, outroT, lastE, lastCue, demoMode, prevBest, realT, resultT, beatPulse, nextMile;
  var side, knobX, appY, camY, footT, footSide, slipT, whistled, stumbleT, progress;

  function eighthTime(bar, i) { return (bar * 4 + Math.floor(i / 2)) * SPB + (i % 2 ? SW : 0); }

  function buildEvents(demo) {
    steps = []; rests = [];
    var pat = demo ? DEMO_PAT : PAT;
    for (var b = 0; b < pat.length; b++) {
      for (var i = 0; i < pat[b].steps.length; i++) {
        var p = pat[b].steps[i];
        steps.push({ t: eighthTime(b, p), up: p % 2 === 1, res: 0, d: 0 });
      }
      for (var r = 0; r < pat[b].rest.length; r++) {
        var t0 = (b * 4 + pat[b].rest[r]) * SPB;
        rests.push({ t0: t0, t1: t0 + SPB - 0.12, teled: false, res: 0 });
      }
    }
    totalSteps = steps.length;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    buildEvents(demo);
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nSlip = 0; nStray = 0; rung = 0; maxRung = 0; judge = null;
    hitStop = 0; over = false; won = false; outroT = 0; lastE = -1; lastCue = -1; prevBest = game.best; realT = 0; resultT = 0;
    beatPulse = 0; nextMile = 10;
    side = null; knobX = LX; appY = 0; camY = -PLAYER_SY; footT = 0; footSide = 'L'; slipT = 0; whistled = false; stumbleT = 0; progress = 0;
  }

  // ---- 拍クロック(8分の格子: 拍の頭と跳ねた裏) ----
  function cueBeats() {
    var q = Math.floor((clock + 0.06) / SPB);
    if (q > lastCue && q >= 0 && q < BARS * 4) { lastCue = q; if (!demoMode && !over) playBeat(q); }
  }
  function playBeat(q) {
    var bar = Math.floor(q / 4) % 8, k = q % 4;
    game.audio.melody(LEAD[q % LEAD.length], {
      tempo: BPM, wave: 'square', volume: 0.03,
      bass: [[WALK[bar][k], 0.85], ['R', 0.15]], bassWave: 'triangle', bassVolume: 0.11
    });
  }
  function eighthIndexAt(t) {
    var q = Math.floor(t / SPB);
    return q * 2 + (t - q * SPB >= SW ? 1 : 0);
  }
  function onEighth(i) {
    if (i < 0 || i >= BARS * 8) return;
    var head = i % 2 === 0;
    if (head) beatPulse = 1;
    if (demoMode || over) return;
    if (head && (i / 2) % 2 === 0) game.audio.tone(80, 0.1, { wave: 'sine', volume: 0.11, slide: -30 });
    game.audio.tone(head ? 1500 : 1900, 0.03, { wave: 'square', volume: head ? 0.018 : 0.012 });
    // 先輩の足音(鉄を踏むカン)
    var t = Math.floor(i / 2) * SPB + (head ? 0 : SW);
    for (var s = 0; s < steps.length; s++) if (Math.abs(steps[s].t - t) < 0.01) game.audio.tone(head ? 'E6' : 'B5', 0.05, { wave: 'triangle', volume: 0.03 });
  }

  function stepsPassed() {
    var n = 0;
    for (var i = 0; i < steps.length; i++) if (steps[i].t <= clock) n++;
    return n;
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var ei = eighthIndexAt(Math.max(0, clock));
    if (clock < 0) ei = -1;
    while (lastE < ei) { lastE++; onEighth(lastE); }
    if (over) return;
    // 「待て」の予告: 先輩が赤い手袋を上げて笛
    for (var r = 0; r < rests.length; r++) {
      var rs = rests[r];
      if (!rs.teled && clock >= rs.t0 - TELE_T) {
        rs.teled = true;
        if (!demoMode) game.audio.tone('A6', 0.22, { wave: 'square', volume: 0.04 });
      }
    }
    // またがずに過ぎた足印は遅れ
    for (var i = 0; i < steps.length; i++) {
      var st = steps[i];
      if (!st.res && clock > st.t + GOOD_W) {
        st.res = 4;
        miss('late', CX, PLAYER_SY - 40);
        return;
      }
    }
    if (!demoMode && clock >= END_T) finishRun(true);
  }

  // ---- 判定 ----
  function crossing(s) {
    if (clock < -0.05 || over) return 'none';
    var best = null, bd = 1e9;
    for (var i = 0; i < steps.length; i++) {
      var st = steps[i];
      if (st.res) continue;
      var d = clock - st.t;
      if (Math.abs(d) <= GOOD_W && Math.abs(d) < bd) { bd = Math.abs(d); best = st; }
    }
    footSide = s; footT = 0.2;
    if (best) {
      var d2 = clock - best.t;
      var grade = Math.abs(d2) <= PERFECT_W ? 1 : 2;
      best.res = grade; best.d = d2;
      rung++; maxRung = Math.max(maxRung, rung);
      combo++; maxCombo = Math.max(maxCombo, combo);
      if (grade === 1) nPerfect++; else nGood++;
      score += (grade === 1 ? 200 : 100) + Math.min(20, combo) * 10;
      judge = { kind: grade === 1 ? 'perfect' : 'good', d: d2, t: 0.7 };
      var fx = s === 'L' ? CX - 60 : CX + 60;
      game.feedback.good(fx, PLAYER_SY - 150, {
        text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.helmet : C.white, size: grade === 1 ? 52 : 42,
        count: grade === 1 ? 10 : 6, volume: demoMode ? 0.02 : 0.1
      });
      if (!demoMode) {
        if (combo > 0 && combo % 10 === 0) game.fx.popup('x' + combo, W - 170, 330, { color: C.helmet, size: 60 });
        if (rung >= nextMile) {
          game.fx.popup(Math.floor(nextMile / 2) + 'm', W / 2, 520, { color: C.helmet, size: 90 });
          game.audio.play('se_milestone', 0.45);
          nextMile += 10;
        }
      }
      return 'step';
    }
    for (var r = 0; r < rests.length; r++) {
      if (clock >= rests[r].t0 && clock <= rests[r].t1 && !rests[r].res) {
        rests[r].res = 1;
        nSlip++;
        rung = Math.max(0, rung - 1);
        slipT = 0.9;
        miss('slip', CX, PLAYER_SY - 60);
        return 'slip';
      }
    }
    combo = 0; nStray++; stumbleT = 0.25;
    game.feedback.bad(CX, PLAYER_SY - 40, { text: null, color: C.steel, shake: 2, volume: demoMode ? 0.02 : 0.2 });
    return 'stray';
  }

  function miss(kind, x, y) {
    combo = 0; nMiss++;
    hitStop = kind === 'slip' ? 0.45 : 0.32;
    judge = { kind: kind, d: null, t: 0.9 };
    game.feedback.bad(x, y, { text: 'MISS', color: C.red, flashColor: C.white, shake: demoMode ? 3 : (kind === 'slip' ? 12 : 6), volume: demoMode ? 0.03 : 0.45 });
    if (!demoMode && nMiss >= MISS_MAX) { game.audio.play('se_break', 0.3); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - nMiss) * 150 + rung * 20;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 500 + (i % 2) * 90, { color: i % 2 ? C.helmet : C.paint, count: 16, speed: 360 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = {
      score: score, rungs: rung, total: totalSteps, meters: Math.floor(rung / 2), perfect: nPerfect, good: nGood,
      miss: nMiss, slips: nSlip, maxCombo: maxCombo
    };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 指の左右振り(本番の指もATTRACTのゴーストも同じ関数)
  function slideTo(x, silent) {
    knobX = x;
    if (side === null) { side = x < CX ? 'L' : 'R'; return 'none'; }
    if (side === 'L' && x > CX + HYS) { side = 'R'; return silent ? 'none' : crossing('R'); }
    if (side === 'R' && x < CX - HYS) { side = 'L'; return silent ? 'none' : crossing('L'); }
    return 'none';
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || y < 230) return;
    side = null;
    slideTo(x, true);
    game.audio.tone(side === 'L' ? 520 : 620, 0.03, { wave: 'triangle', volume: 0.03 });
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || over || side === null) return;
    var res = slideTo(x, hitStop > 0);
    if (res === 'step') game.audio.tone(footSide === 'L' ? 'C6' : 'G6', 0.05, { wave: 'triangle', volume: 0.05 });
    else if (res === 'stray') game.audio.tone(180, 0.08, { wave: 'square', volume: 0.04 });
  });

  game.onRelease(function(x, y) {
    if (side === null) return;
    side = null;
    if (state === S.PLAYING && !over) game.audio.tone(330, 0.03, { wave: 'triangle', volume: 0.02 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.navy, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  // 菱形(等角の板)を横ストリップで塗る
  function diamond(cx, cy, hw, hh, col, a) {
    for (var dy = -hh; dy < hh; dy += 4) {
      var w = hw * 2 * (1 - Math.abs(dy + 2) / hh);
      if (w > 0) game.draw.rect(cx - w / 2, cy + dy, w, 4, col, a);
    }
  }
  // 等角の箱(上面・左面・右面の3明度)
  function isoBox(cx, by, hw, h, top, left, right) {
    var hh = hw / 2;
    for (var x = 0; x < hw; x += 4) {
      var k = x / hw;
      game.draw.rect(cx - hw + x, by - h - hh * (1 - k), 4, h, left);
      game.draw.rect(cx + x, by - h - hh * k, 4, h, right);
    }
    diamond(cx, by - h - hh, hw, hh, top, 1);
  }
  function wy(worldY) { return worldY - camY; }

  function drawSky() {
    game.draw.gradient(0, H, [[0, C.sky0], [0.75, C.sky1], [1, '#c4d8e8']]);
    // 遠くの街(等角の箱・ゆっくり流れる)
    var par = (-camY - PLAYER_SY) * 0.12;
    var base = 1780 + par;
    if (base < H + 400) {
      isoBox(150, base, 90, 160, '#9ab0c8', '#5a7090', '#7890ac');
      isoBox(360, base + 40, 70, 260, '#9ab0c8', '#5a7090', '#7890ac');
      isoBox(760, base + 20, 110, 120, '#9ab0c8', '#5a7090', '#7890ac');
      isoBox(960, base + 60, 70, 210, '#9ab0c8', '#5a7090', '#7890ac');
    }
    // 雲(菱形の平たい塊)
    var cpar = (-camY) * 0.3;
    for (var c = 0; c < 5; c++) {
      var cy = ((c * 420 + cpar) % 2100 + 2100) % 2100 - 120;
      var cx = 120 + ((c * 337) % 840);
      diamond(cx, cy, 120, 30, '#e6eef6', 0.55);
      diamond(cx + 80, cy + 18, 90, 24, '#e6eef6', 0.45);
    }
  }

  function drawTower() {
    var top = camY - 200, bot = camY + H + 200;
    var BX = 330, BH = 165;
    // 奥の脚(細い・暗い)
    game.draw.line(CX - BX, 0, CX - BX, H, C.steelD, 16);
    game.draw.line(CX + BX, 0, CX + BX, H, C.steelD, 16);
    // 横材と筋交い(8段ごと)
    var seg = 8 * RUNG_H;
    var s0 = Math.floor(-bot / seg) - 1, s1 = Math.floor(-top / seg) + 1;
    for (var s = s0; s <= s1; s++) {
      var y0 = wy(-s * seg), y1 = wy(-(s + 1) * seg);
      game.draw.line(CX, y0, CX - BX, y0 - BH, C.steelD, 9);
      game.draw.line(CX, y0, CX + BX, y0 - BH, C.steel, 9);
      game.draw.line(CX, y0, CX - BX, y1 - BH, C.steelD, 5);
      game.draw.line(CX - BX, y0 - BH, CX, y1, C.steelD, 5);
      game.draw.line(CX, y0, CX + BX, y1 - BH, C.steel, 5);
      game.draw.line(CX + BX, y0 - BH, CX, y1, C.steel, 5);
    }
    // 手前の脚柱(赤白の塗り分け)
    var band = 16 * RUNG_H;
    var b0 = Math.floor(-bot / band) - 1, b1 = Math.floor(-top / band) + 1;
    for (var b = b0; b <= b1; b++) {
      var ya = wy(-b * band), yb = wy(-(b + 1) * band);
      game.draw.rect(CX - 14, yb, 28, ya - yb, b % 2 === 0 ? C.paint : C.white);
      game.draw.rect(CX + 6, yb, 8, ya - yb, '#000000', 0.15);
    }
    // ステップボルト(左右交互)
    var r0 = Math.max(0, Math.floor(-bot / RUNG_H)), r1 = Math.floor(-top / RUNG_H);
    for (var r = r0; r <= r1; r++) {
      var ry = wy(-r * RUNG_H);
      var dir = r % 2 === 0 ? -1 : 1;
      game.draw.line(CX + dir * 14, ry, CX + dir * 54, ry - 18, C.steelD, 9);
      game.draw.circle(CX + dir * 54, ry - 18, 6, C.steel);
      // 10段ごとの足場(菱形の板)
      if (r > 0 && r % 12 === 0) {
        diamond(CX, ry + 20, 150, 75, '#b88a52', 1);
        diamond(CX, ry + 14, 150, 75, '#d8aa6a', 1);
        for (var p = -2; p <= 2; p++) game.draw.line(CX + p * 50 - 60, ry + 14 - 30 + Math.abs(p) * 0, CX + p * 50 + 60, ry + 14 + 30, '#a07040', 2);
      }
    }
    // 地上(菱形グリッドの資材置き場)
    var gy = wy(70);
    if (gy < H + 10) {
      game.draw.rect(0, gy, W, H - gy + 10, C.ground);
      for (var g = -10; g <= 20; g++) {
        game.draw.line(g * 120, gy, g * 120 - 1800, gy + 900, '#6a5a44', 3);
        game.draw.line(g * 120 - 1200, gy, g * 120 + 600, gy + 900, '#6a5a44', 3);
      }
      game.draw.rect(0, gy - 8, W, 8, '#8a7a60');
      isoBox(220, gy + 140, 70, 50, '#d8aa6a', '#9a6a3a', '#b8884a');
      isoBox(880, gy + 120, 60, 40, '#c8ccd2', '#6a7a8c', '#9aa8b8');
    }
    // 天辺(最後の足掛けの先)
    var topY = wy(-(totalSteps + 5) * RUNG_H);
    if (topY > -100 && topY < H) {
      game.draw.line(CX - 240, topY + 60, CX + 240, topY - 60, C.steel, 14);
      game.draw.line(CX - 240, topY - 60, CX + 240, topY + 60, C.steelD, 14);
      game.draw.line(CX, topY - 160, CX, topY, C.steelD, 8);
      game.draw.rect(CX, topY - 160, 90, 50, C.paint);
    }
  }

  function drawSenior() {
    var sr = 4 + stepsPassed();
    var sy = wy(-sr * RUNG_H) - 50;
    if (sy < -120) return;
    var fr = sr % 2;
    // 影(脚柱の面に落ちる)
    game.draw.circle(CX + 30, sy + 70, 40, '#000000', 0.18);
    game.draw.sprite(CLIMB[fr], SPAL, CX, sy, 8, { anchor: 'center' });
    // 「待て」の予告: 赤い手袋を上げる
    var warn = null;
    for (var r = 0; r < rests.length; r++) {
      var rs = rests[r];
      if (clock >= rs.t0 - TELE_T && clock <= rs.t1) warn = rs;
    }
    if (warn) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.circle(CX + 110, sy - 70, 54, C.red, blink ? 0.35 : 0.18);
      game.draw.sprite(HANDSIGN, { r: C.red }, CX + 110, sy - 70, 11, { anchor: 'center' });
      game.draw.line(CX + 40, sy - 30, CX + 100, sy - 50, '#3a4a64', 12);
    }
  }

  function drawApprentice() {
    var y = wy(appY) - 50;
    // 安全帯のロープ(脚柱の上の掛け金へ)
    var anchorY = wy(-(rung + 3) * RUNG_H);
    var taut = slipT > 0;
    game.draw.line(CX + 6, y + 10, CX + 18, anchorY, taut ? '#ffffff' : C.helmet, taut ? 7 : 4);
    game.draw.sprite(CLIP, { y: C.helmet, o: C.paint }, CX + 18, anchorY, 7, { anchor: 'center' });
    game.draw.circle(CX + 30, y + 70, 42, '#000000', 0.18);
    if (slipT > 0) {
      var sw = Math.sin(slipT * 18) * 16 * slipT;
      if (hitStop > 0) game.draw.circle(CX + sw, y, 110, '#ffffff', 0.3);
      game.draw.sprite(DANGLE, hitStop > 0 ? WPAL : APAL, CX + sw, y + 20, hitStop > 0 ? 10 : 8, { anchor: 'center' });
      return;
    }
    var fr = footSide === 'L' ? 0 : 1;
    var lift = footT > 0 ? Math.sin(footT / 0.2 * Math.PI) * 10 : 0;
    var wob = stumbleT > 0 ? Math.sin(stumbleT * 60) * 8 : 0;
    game.draw.sprite(CLIMB[fr], APAL, CX + wob, y - lift, 8, { anchor: 'center' });
  }

  // 譜面帯: 足印は判定線へ流れる。跳ねる8分の長短がそのまま間隔になる
  function drawLane() {
    var y = LANE_Y;
    game.draw.rect(40, y - 62, W - 80, 124, C.navy, 0.72);
    game.draw.rect(40, y - 62, W - 80, 4, C.steel, 0.5);
    var q0 = Math.floor(clock / SPB) - 1;
    for (var q = q0; q < q0 + 6; q++) {
      if (q < 0 || q >= BARS * 4) continue;
      var hx = JUDGE_X + (q * SPB - clock) * PXS;
      var ax = JUDGE_X + (q * SPB + SW - clock) * PXS;
      if (hx > 40 && hx < W - 40) game.draw.rect(hx - 2, y - 50, 4, 100, C.steel, q % 4 === 0 ? 0.8 : 0.45);
      if (ax > 40 && ax < W - 40) game.draw.rect(ax - 1, y - 30, 3, 60, C.steel, 0.3);
    }
    for (var r = 0; r < rests.length; r++) {
      var rs = rests[r];
      var x0 = JUDGE_X + (rs.t0 - clock) * PXS, x1 = JUDGE_X + (rs.t0 + SPB - clock) * PXS;
      if (x1 < 40 || x0 > W - 40) continue;
      var a0 = Math.max(40, x0), a1 = Math.min(W - 40, x1);
      game.draw.rect(a0, y - 44, a1 - a0, 88, C.red, 0.35);
      if ((x0 + x1) / 2 > 40 && (x0 + x1) / 2 < W - 40) game.draw.sprite(HANDSIGN, { r: C.red }, (x0 + x1) / 2, y, 7, { anchor: 'center' });
    }
    for (var i = 0; i < steps.length; i++) {
      var st = steps[i];
      var x = JUDGE_X + (st.t - clock) * PXS;
      if (x < 40 || x > W - 40) continue;
      if (st.res === 1 || st.res === 2) continue;
      var col = i % 2 === 0 ? '#5a9ad8' : C.paint;
      var miss2 = st.res === 4;
      game.draw.circle(x, y, st.up ? 24 : 30, miss2 ? C.steelD : '#ffffff', miss2 ? 0.4 : 0.9);
      game.draw.circle(x, y, st.up ? 18 : 23, miss2 ? C.steelD : col);
    }
    // 判定線
    game.draw.rect(JUDGE_X - 4, y - 58, 8, 116, C.helmet);
    game.draw.circle(JUDGE_X, y, 38 + beatPulse * 8, C.helmet, 0.18);
  }

  // 親指の帯: 真ん中の線をまたぐたびに足が掛かる
  function drawRail(gx, pressing) {
    game.draw.rect(140, RAIL_Y - 12, W - 280, 24, C.steelD);
    game.draw.rect(140, RAIL_Y - 12, W - 280, 6, C.steel, 0.6);
    game.draw.rect(CX - 4, RAIL_Y - 70, 8, 140, C.helmet, 0.8);
    var litL = footT > 0 && footSide === 'L', litR = footT > 0 && footSide === 'R';
    game.draw.circle(LX, RAIL_Y, litL ? 64 : 54, '#5a9ad8', litL ? 0.85 : 0.35);
    game.draw.circle(RX, RAIL_Y, litR ? 64 : 54, C.paint, litR ? 0.85 : 0.35);
    game.draw.sprite(['.kk.', 'kkkk', 'kkkk', '.kk.', 'kkk.'], { k: C.white }, LX, RAIL_Y, 9, { anchor: 'center' });
    game.draw.sprite(['.kk.', 'kkkk', 'kkkk', '.kk.', '.kkk'], { k: C.white }, RX, RAIL_Y, 9, { anchor: 'center' });
    if (pressing) {
      game.draw.circle(gx, RAIL_Y, 42, C.helmet, 0.35);
      game.draw.circle(gx, RAIL_Y, 20, C.helmet, 0.8);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.navy, 0.8);
    game.draw.rect(0, 226, W, 4, C.paint);
    label('SCORE ' + score, 50, 84, 44, C.white, 'left');
    if (combo >= 2) label('x' + combo, W - 50, 84, 44, C.helmet, 'right');
    // 安全帯の札(MISSで減る)
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - nMiss;
      game.draw.sprite(CLIP, { y: on ? C.helmet : C.steelD, o: on ? C.paint : C.steelD }, 420 + i * 50, 150, 7, { anchor: 'center' });
    }
    label(Math.floor(rung / 2) + 'm', 120, 166, 44, C.helmet);
    label(rung + ' / ' + totalSteps, W - 50, 166, 36, C.steel, 'right');
    progress = Math.max(0, Math.min(1, clock / END_T));
    game.draw.rect(60, 200, W - 120, 12, C.steelD);
    game.draw.rect(60, 200, (W - 120) * progress, 12, C.paint);
    // 高度計(右端の目盛り)
    game.draw.rect(W - 36, 260, 10, 1100, C.navy, 0.5);
    var hk = Math.min(1, rung / Math.max(1, totalSteps));
    game.draw.rect(W - 36, 260 + 1100 * (1 - hk), 10, 1100 * hk, C.helmet);
  }

  function drawScanlines() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.07);
  }

  function drawScene(gx, pressing) {
    drawSky();
    drawTower();
    drawSenior();
    drawApprentice();
    drawLane();
    drawRail(gx, pressing);
    drawScanlines();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.39;
    game.draw.rect(40, y0, W - 80, hh, C.navy, 0.88);
    game.draw.rect(56, y0 + 16, W - 112, 6, C.paint);
    game.draw.rect(56, y0 + hh - 22, W - 112, 6, C.paint);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.helmet : C.red);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.white);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.white);
    label(rung + ' / ' + totalSteps + '段', W / 2, H * 0.49, 46, C.white);
    label(Math.floor(rung / 2) + 'm', W / 2, H * 0.53, 46, C.helmet);
    if (maxCombo > 1) label('COMBO ' + maxCombo, W / 2, H * 0.565, 36, C.steel);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.605, 56, C.helmet);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.605, 42, C.white);
    if (!won) label('あと' + Math.max(1, totalSteps - rung) + '段!', W / 2, H * 0.645, 50, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.69, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックで2小節。奇数周は足印どおりに振る、偶数周は「待て」の拍で振って滑る ----
  var demo = { t: 0, cyc: 0, x: LX, plan: [], k: 0, moving: false, target: LX };
  var DEMO_CYC = 2 * BAR + 1.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++;
      demo.plan = [];
      for (var i = 0; i < steps.length; i++) demo.plan.push(steps[i].t);
      if (demo.cyc % 2 === 0 && rests.length) demo.plan.push(rests[0].t0 + 0.12);
      demo.plan.sort(function(a, b) { return a - b; });
      demo.k = 0; demo.x = LX; demo.moving = false; demo.target = LX;
      side = null; slideTo(demo.x, true);
    }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    if (!demo.moving && demo.k < demo.plan.length && clock >= demo.plan[demo.k] - 0.06 && hitStop <= 0) {
      demo.moving = true; demo.target = side === 'L' ? RX : LX; demo.k++;
    }
    if (demo.moving) {
      var dir = demo.target > demo.x ? 1 : -1;
      demo.x += dir * 3500 * dt;
      if ((dir > 0 && demo.x >= demo.target) || (dir < 0 && demo.x <= demo.target)) { demo.x = demo.target; demo.moving = false; }
      slideTo(demo.x, hitStop > 0);
    }
  }

  function animate(dt) {
    var target = -rung * RUNG_H;
    appY += (target - appY) * Math.min(1, dt * 14);
    var camTarget = appY - PLAYER_SY;
    camY += (camTarget - camY) * Math.min(1, dt * 6);
    if (footT > 0) footT -= dt;
    if (stumbleT > 0) stumbleT -= dt;
    if (slipT > 0 && hitStop <= 0) slipT -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (judge) { judge.t -= dt; if (judge.t <= 0) judge = null; }

    if (state === S.ATTRACT) {
      if (!steps) initRun(true);
      stepDemo(dt);
      animate(dt);
      drawScene(demo.x, true);
      game.draw.hand(demo.x, RAIL_Y, { press: true, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.navy, 0.8);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 2.5) * 3, C.helmet);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.helmet);
      else label('TAP TO START', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      animate(dt);
      drawScene(knobX, false);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 3) { hitStop = 0; finishRun(nMiss < MISS_MAX); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      stepRun(dt);
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }
    animate(dt);
    drawScene(knobX, side !== null);
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.3, W, 170, C.navy, 0.8);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3 + 115, 100, C.helmet);
    }
    // 最初の2歩だけ、振る手を薄いゴーストで示す
    if (!over && steps.length > 1 && steps[1].res === 0 && clock > -0.5) {
      var gx = steps[0].res ? RX : LX;
      game.draw.hand(gx, RAIL_Y, { press: true, scale: 13, alpha: 0.45 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);

// K-GBA-0025v2-breakwater-bell-echo.js
// 防波堤の鐘返し — 沖の船が1小節で打った鐘の並びを覚え、打ち終わった直後の小節で同じ並びを同じ間隔のまま浜の鐘で打ち返す
// 操作: 沖の小節(上の列)は見て聞くだけで入力は効かない。浜の小節(下の列)になったら画面のどこでもタップで浜の鐘を打つ。沖と同じ8分のコマで打てばPERFECT/GOOD。コマずれの一打・余計な一打・打ち漏らしはMISS。3ラウンド目から沖に霧が出て、上の列の印が消え、船の灯りと鐘の音だけになる
// 終わり: 4ラウンド(3打→4打→5打→6打、お手本1小節→返し1小節)を返し切ればCLEAR(判定点+連続+きれいに返したラウンド+残り)。MISS3回でGAME OVER
// @mechanic: memory_sequence
// @theme: breakwater_bell_echo
// 世界観: 夜明け前の漁村の防波堤で、若い漁師が沖の船の打つ鐘の並びを覚え、浜の鐘で同じ並びを打ち返して帰り船に港の口を知らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・きれいに返せたラウンド数・最大連続
// スタイル: 70s MONO

(function(game) {
  var STYLE = { bg: ['#000000', '#0c0c0c'], main: ['#ffffff', '#b4b4b4', '#5c5c5c'], accent: ['#3cd2ff', '#ffaa2a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白いドットだけで描き、画面の横帯ごとにカラーセロハンを貼った色で見せる
  // 上の帯(空と沖)=水色 / 中の帯(防波堤)=素の白 / 下の帯(浜と鐘)=琥珀。各帯は 明・中・暗 の3段だけ
  var BAND_TOP = Math.round(H * 0.385), BAND_LOW = Math.round(H * 0.588);
  var INKS = [
    [STYLE.accent[0], '#1f809e', '#0e3a48'],
    [STYLE.main[0], STYLE.main[1], STYLE.main[2]],
    [STYLE.accent[1], '#a86a14', '#4e320a']
  ];
  function ink(y, lv) { return INKS[y < BAND_TOP ? 0 : (y < BAND_LOW ? 1 : 2)][lv || 0]; }

  var GAME_TITLE = 'BELL ECHO';
  var BPM = 100, SPB = 60 / BPM, EIGHTH = SPB / 2, BAR = SPB * 4;
  var ROUNDS = 4, BARS = ROUNDS * 2, BEATS = BARS * 4;
  var TIME_LIMIT = 19.2;               // 8小節 × 2.4秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.13;
  var MISS_MAX = 3;
  var FOG_ROUND = 2;                   // 0始まり: 3ラウンド目から霧
  var LANE_X0 = 165, SLOT_DX = 107;
  var CALL_Y = Math.round(H * 0.175), RESP_Y = Math.round(H * 0.64);
  var HORIZON = Math.round(H * 0.29);
  var QUAY_Y = Math.round(H * 0.448);  // 防波堤の天端
  var LAMP_Y = Math.round(H * 0.575);  // 拍ランプ
  var BELL_X = W / 2, BELL_Y = Math.round(H * 0.865);
  var FISHER_X = 330;

  // ラウンドごとの鐘の並び(1小節=8分8コマ)。打数が増え、後半は連打が混ざる
  var POOLS = [
    [[0, 2, 4], [0, 2, 6], [0, 4, 6]],
    [[0, 2, 3, 6], [0, 1, 4, 6], [0, 3, 4, 6]],
    [[0, 1, 2, 4, 6], [0, 2, 3, 4, 6], [0, 2, 4, 5, 6]],
    [[0, 1, 2, 4, 5, 6], [0, 1, 3, 4, 5, 6], [0, 2, 3, 4, 6, 7]]
  ];
  var DEMO_PATTERN = [0, 2, 4];

  // 伴奏(オリジナル・矩形波の単音)。沖の小節は低いボンと短い動機、浜の小節は1拍目の低音だけ(無音の間で張り詰める)
  var MOTIF = [
    [[['A3', 0.5], ['R', 0.5]], [['C4', 0.5], ['E4', 0.5]], [['D4', 1]], [['R', 0.5], ['E4', 0.5]]],
    [[['G3', 0.5], ['R', 0.5]], [['B3', 0.5], ['D4', 0.5]], [['C4', 1]], [['R', 0.5], ['B3', 0.5]]]
  ];
  var ROOT = ['A2', 'G2', 'F2', 'E2'];

  // ---- スプライト(白ドット。色は帯で決まる) ----
  var BOAT = [
    '..........b.........',
    '.........bbb........',
    '..........w.........',
    '..........w....gg...',
    '..........w....gg...',
    '...ggggg..w....gg...',
    '...g...g..w....gg...',
    'wwwwwwwwwwwwwwwwwwww',
    '.wwwwwwwwwwwwwwwwww.',
    '...wwwwwwwwwwwwww...'
  ];
  // 若い漁師: 待ち2コマ + 綱を引くコマ
  var FISHER = [
    ['....hh....', '...hhhh...', '..wwwwww..', '...wkwk...', '...wwww...', '....ww...g', '..wwwwwwwg', '.w.wwww..g', '.w.wwww..g', '...wwww...', '...w..w...', '...w..w...', '..ww..ww..'],
    ['....hh....', '...hhhh...', '..wwwwww..', '...wkwk...', '...wwww...', '....ww...g', '..wwwwww.g', '.w.wwwwwwg', '.w.wwww..g', '...wwww...', '...w..w...', '...w..w...', '..ww..ww..'],
    ['....hh....', '...hhhh...', '..wwwwww..', '...wkwk...', '...wwww...', '....ww....', '..wwwwww..', '.w.wwww...', '.w.wwwwww.', '...wwww.wg', '...w..w..g', '...w..w..g', '..ww..ww.g']
  ];
  var BELL = ['....ww....', '...wwww...', '..wwwwww..', '..wwwwww..', '..wwwwww..', '.wwwwwwww.', '.wwwwwwww.', 'wwwwwwwwww', 'gggggggggg', '....gg....'];
  var LIGHT = ['..ll..', '.wwww.', '..ww..', '..gg..', '..ww..', '..gg..', '..ww..', '..gg..', '.wwww.'];
  var TETRA = ['...w...', '..www..', '.ww.ww.', 'ww...ww', 'w.....w'];
  var GULL = [['w.....w', '.w...w.', '..w.w..'], ['.......', 'www.www', '...w...']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, evs, misses, score, combo, maxCombo, nPerfect, nGood, nMiss, roundRes, roundDirty, marks;
  var hitStop, over, won, outroT, lastBeat, lastCue, demoMode, prevBest, failX, failY;
  var lampT, bellSwing, pullT, lockT, turnT, lightT, beatPulse, fogA, horn;

  function buildEvents(demo) {
    var list = [];
    var n = demo ? 1 : ROUNDS;
    for (var r = 0; r < n; r++) {
      var pool = POOLS[r];
      var pat = demo ? DEMO_PATTERN : pool[Math.floor(game.random(0, pool.length)) % pool.length];
      for (var i = 0; i < pat.length; i++) {
        list.push({ r: r, slot: pat[i], callT: 2 * r * BAR + pat[i] * EIGHTH, respT: (2 * r + 1) * BAR + pat[i] * EIGHTH, shown: false, res: 0 });
      }
    }
    return list;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.4 : -READY_T;
    evs = buildEvents(demo);
    misses = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0;
    roundRes = [0, 0, 0, 0]; roundDirty = [false, false, false, false]; marks = [];
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -99; lastCue = -1;
    prevBest = game.best; failX = -999; failY = -999;
    lampT = 0; bellSwing = 0; pullT = 0; lockT = 0; turnT = 0; lightT = 0; beatPulse = 0; fogA = 0; horn = false;
  }

  function slotX(s) { return LANE_X0 + s * SLOT_DX; }
  function phase() {
    if (clock < 0) return { bar: -1, resp: false, inBar: 0, r: 0 };
    var bar = Math.floor(clock / BAR);
    return { bar: bar, resp: bar % 2 === 1, inBar: clock - bar * BAR, r: Math.min(ROUNDS - 1, Math.floor(bar / 2)) };
  }

  // ---- 音 ----
  function boatBell() {
    game.audio.tone('E6', 0.22, { wave: 'square', volume: 0.06 });
    game.audio.tone('B6', 0.12, { wave: 'square', volume: 0.025, slide: -40 });
  }
  function shoreBell(c) {
    // 連続で返すほど鐘の音が半音ずつ上がる
    var up = Math.pow(2, Math.min(7, c) / 12);
    game.audio.tone(880 * up, 0.3, { wave: 'square', volume: 0.09 });
    game.audio.tone(1320 * up, 0.16, { wave: 'square', volume: 0.04, slide: -60 });
  }
  // 1拍ぶんの伴奏(0.06秒先読みで出すので拍クロックと揃う)
  function playBeat(bi) {
    var bar = Math.floor(bi / 4), inBar = bi % 4, r = Math.min(ROUNDS - 1, Math.floor(bar / 2));
    if (bar % 2 === 0) {
      game.audio.melody(MOTIF[r % 2][inBar], { tempo: BPM, wave: 'square', volume: 0.045, bass: [[inBar === 0 ? ROOT[r] : 'R', 1]], bassVolume: 0.1, bassWave: 'square' });
    } else {
      game.audio.melody([[inBar === 0 ? ROOT[r] : 'R', 1]], { tempo: BPM, wave: 'square', volume: 0.06 });
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
    if (inBar === 0) lightT = 0.35;
    if (!demoMode) game.audio.tone(inBar === 0 ? 990 : 1480, 0.025, { wave: 'square', volume: inBar === 0 ? 0.04 : 0.02 });
    // 沖の小節の4拍目: 次は浜の番(鐘が点滅 + 上がる2音)
    if (bar % 2 === 0 && inBar === 3) {
      turnT = SPB;
      if (!demoMode) { game.audio.tone(660, 0.06, { wave: 'square', volume: 0.05 }); game.audio.tone(990, 0.08, { wave: 'square', volume: 0.05, slide: 120 }); }
    }
    // 霧の入り: 霧笛(低い長音)で知らせる
    if (bar === FOG_ROUND * 2 && inBar === 0 && !horn) {
      horn = true;
      if (!demoMode) game.audio.tone(98, 0.9, { wave: 'square', volume: 0.07, slide: -8 });
    }
  }

  // ---- 判定 ----
  function checkRound(r) {
    if (roundRes[r]) return;
    for (var i = 0; i < evs.length; i++) if (evs[i].r === r && !evs[i].res) return;
    roundRes[r] = roundDirty[r] ? 2 : 1;
    if (roundRes[r] === 1) {
      score += 300;
      if (!demoMode) {
        game.fx.popup('NICE', W / 2, RESP_Y - 170, { color: INKS[2][0], size: 80 });
        game.audio.play('se_milestone', 0.45);
      }
    }
  }

  function hitEvent(e, grade) {
    e.res = grade;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += (grade === 1 ? 100 : 60) + Math.min(10, combo) * 10;
    marks.push({ x: slotX(e.slot), ok: true, perfect: grade === 1, r: e.r });
    game.feedback.good(slotX(e.slot), RESP_Y - 70, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? '#ffffff' : INKS[2][0],
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
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - misses) * 150;
      for (var i = 0; i < 5; i++) game.fx.burst(140 + i * 200, QUAY_Y - 120 - (i % 2) * 90, { color: i % 2 ? INKS[0][0] : '#ffffff', count: 16, speed: 380 });
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

  // 浜の鐘を打つ(本番の指も ATTRACT のゴーストも同じ関数)
  function strike() {
    bellSwing = 1; pullT = 0.2;
    var best = null, bd = 1e9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res) continue;
      var d = Math.abs(clock - e.respT);
      if (d <= GOOD_W && d < bd) { bd = d; best = e; }
    }
    if (best) { hitEvent(best, bd <= PERFECT_W ? 1 : 2); return 'hit'; }
    var ph = phase();
    if (ph.resp && ph.bar < BARS) {
      // お手本に無いコマで打った(余計な一打)
      var rr = (ph.bar - 1) / 2, x = slotX(ph.inBar / EIGHTH);
      roundDirty[rr] = true;
      marks.push({ x: x, ok: false, r: rr });
      missEvent(null, x, RESP_Y);
      return 'extra';
    }
    lockT = 0.22;
    return 'locked';
  }

  function stepRun(dt) {
    clock += dt;
    if (lampT > 0) lampT -= dt;
    if (lockT > 0) lockT -= dt;
    if (turnT > 0) turnT -= dt;
    if (lightT > 0) lightT -= dt;
    var ph = phase();
    fogA += ((ph.r >= FOG_ROUND && ph.bar >= 0 ? 1 : 0) - fogA) * Math.min(1, dt * 2);
    beatClock();
    if (over) return;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      // 沖の船が拍クロックどおりに鐘を打つ
      if (!e.shown && clock >= e.callT) {
        e.shown = true; lampT = 0.22;
        if (!demoMode) boatBell();
      }
      // 返しの窓を過ぎても打たれなかった
      if (!e.res && clock > e.respT + GOOD_W) {
        missEvent(e, slotX(e.slot), RESP_Y);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && !over && (clock >= BARS * BAR + GOOD_W || clock > TIME_LIMIT + 0.5)) finishRun(misses < MISS_MAX);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    var res = strike();
    if (res === 'locked') {
      // 沖の番は綱が重い: 鈍い音で空振り
      game.audio.tone(130, 0.07, { wave: 'square', volume: 0.07 });
      game.fx.burst(BELL_X, BELL_Y + 150, { color: INKS[2][1], count: 4, speed: 90 });
    } else if (res === 'hit') {
      shoreBell(combo);
    } else {
      game.audio.tone(180, 0.12, { wave: 'sawtooth', volume: 0.06, slide: -60 });
    }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function box(x, y, s, col, w) {
    game.draw.line(x - s, y - s, x + s, y - s, col, w); game.draw.line(x + s, y - s, x + s, y + s, col, w);
    game.draw.line(x + s, y + s, x - s, y + s, col, w); game.draw.line(x - s, y + s, x - s, y - s, col, w);
  }

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, '#040404'], [1, STYLE.bg[1]]]);
    for (var i = 0; i < 34; i++) {
      var sx = (i * 197 + 61) % W, sy = 250 + (i * 83) % (HORIZON - 290);
      game.draw.rect(sx, sy, 6, 6, ink(sy, Math.sin(t * 2.2 + i * 1.3) > 0.2 ? 1 : 2));
    }
    // 欠けた月
    game.draw.circle(960, 450, 40, ink(450, 1));
    game.draw.circle(978, 438, 36, STYLE.bg[0]);
    // カモメ(2コマ)
    for (var g = 0; g < 2; g++) {
      var gx = ((t * (34 + g * 12) + g * 520) % (W + 200)) - 100, gy = 420 + g * 50 + Math.sin(t * 1.5 + g) * 12;
      game.draw.sprite(GULL[Math.floor(t * 4 + g) % 2], { w: ink(gy, 1) }, gx, gy, 6, { anchor: 'center' });
    }
  }

  function drawSea() {
    var t = game.time.elapsed;
    game.draw.rect(0, HORIZON, W, 4, ink(HORIZON, 1));
    for (var j = 0; j < 11; j++) {
      var y = HORIZON + 14 + j * 10 + j * j * 2.4;
      if (y > QUAY_Y - 6) break;
      var len = 18 + j * 6, gap = 60 + j * 14, sp = 16 + j * 9;
      var off = (t * sp + j * 37) % gap;
      for (var x = -gap + off; x < W; x += gap) game.draw.rect(x, y, len, 4, ink(y, j < 4 ? 2 : 1));
    }
  }

  function drawBoat() {
    var t = game.time.elapsed;
    var bx = W * 0.5 + Math.sin(t * 0.4) * 40, by = HORIZON - 34 + Math.sin(t * 1.6) * 4, px = 9;
    var lit = lampT > 0;
    var a = 1 - 0.6 * fogA;
    game.draw.sprite(BOAT, { w: ink(by, 0), g: ink(by, 1), b: lit ? '#ffffff' : ink(by, 1) }, bx, by, px, { anchor: 'center', alpha: a });
    if (lit) {
      var lx = bx + px * 0.5, ly = by - px * 3.5;
      game.draw.circle(lx, ly, 26 + (0.22 - lampT) * 180, ink(ly, 0), 0.5 * lampT / 0.22);
      game.draw.circle(lx, ly, 14, '#ffffff');
    }
  }

  function drawFog() {
    if (fogA < 0.02) return;
    var t = game.time.elapsed;
    for (var i = 0; i < 70; i++) {
      var y = 250 + (i * 53) % (BAND_TOP - 260);
      var x = ((i * 137 + t * 30 * (1 + i % 3)) % (W + 80)) - 40;
      game.draw.rect(x, y, 30, 6, ink(y, 1), 0.55 * fogA);
    }
  }

  function drawLane(y, active, cursor) {
    var lv = active ? 1 : 2;
    game.draw.rect(LANE_X0 - 40, y - 2, 8 * SLOT_DX + 20, 4, ink(y, lv));
    for (var s = 0; s < 8; s++) {
      var big = s % 2 === 0, hh = big ? 96 : 48;
      game.draw.rect(slotX(s) - 4, y - hh / 2, 8, hh, ink(y, lv));
    }
    if (active && cursor !== null) game.draw.rect(cursor - 6, y - 70, 12, 140, ink(y, 0));
  }

  function drawMarks() {
    var ph = phase(), i, e;
    var fog = ph.r >= FOG_ROUND;
    // 上の列: 沖の鐘の印(浜の小節に入るとすぐ消える。霧のラウンドは出ない)
    if (!fog) {
      for (i = 0; i < evs.length; i++) {
        e = evs[i];
        if (!e.shown || e.r !== ph.r) continue;
        var a = ph.resp ? Math.max(0, 1 - ph.inBar / 0.3) : 1;
        if (a > 0) game.draw.rect(slotX(e.slot) - 20, CALL_Y - 20, 40, 40, ink(CALL_Y, 0), a);
      }
    }
    // 下の列: 自分の一打(四角=合っている / 中抜き=余計)と、打ち漏らした正解(点線の枠で答え合わせ)
    for (i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.r !== ph.r) continue;
      if (m.ok) {
        game.draw.rect(m.x - 20, RESP_Y - 20, 40, 40, ink(RESP_Y, 0));
        if (m.perfect) box(m.x, RESP_Y, 32, ink(RESP_Y, 0), 4);
      } else {
        box(m.x, RESP_Y, 20, ink(RESP_Y, 1), 5);
        game.draw.line(m.x - 20, RESP_Y - 20, m.x + 20, RESP_Y + 20, ink(RESP_Y, 1), 5);
      }
    }
    for (i = 0; i < evs.length; i++) {
      e = evs[i];
      if (e.r === ph.r && e.res === 3) box(slotX(e.slot), RESP_Y, 34, '#ffffff', 5);
    }
  }

  function drawQuay() {
    var t = game.time.elapsed;
    // 防波堤の天端・壁・消波ブロック
    game.draw.rect(0, QUAY_Y, W, 12, ink(QUAY_Y, 0));
    for (var row = 0; row < 4; row++) {
      var wy = QUAY_Y + 26 + row * 30;
      for (var bx = (row % 2) * 40 - 40; bx < W; bx += 80) game.draw.rect(bx, wy, 66, 18, ink(wy, 2));
    }
    for (var k = 0; k < 7; k++) game.draw.sprite(TETRA, { w: ink(QUAY_Y + 150, 1) }, 70 + k * 160, QUAY_Y + 150 + (k % 2) * 10, 10, { anchor: 'center' });
    // 灯台(1拍目で光る)
    var lx = 930, ly = QUAY_Y - 54;
    game.draw.sprite(LIGHT, { l: lightT > 0 ? '#ffffff' : ink(ly, 2), w: ink(ly, 0), g: ink(ly, 2) }, lx, ly, 12, { anchor: 'center' });
    if (lightT > 0) {
      game.draw.line(lx, ly - 48, lx - 360, ly - 120, ink(ly - 48, 1), 6);
      game.draw.line(lx, ly - 48, lx - 360, ly - 10, ink(ly - 48, 1), 6);
    }
    // 若い漁師(MISSの瞬間は白く光って大きくなる)
    var big = hitStop > 0;
    var fr = pullT > 0 ? 2 : Math.floor(t * 1.6) % 2;
    var fy = QUAY_Y - 58 - (big ? 0 : beatPulse * 6);
    if (big) game.draw.circle(FISHER_X, fy, 110, '#ffffff', 0.5);
    var pal = big ? { h: '#ffffff', w: '#ffffff', k: '#ffffff', g: '#ffffff' } : { h: ink(fy, 1), w: ink(fy, 0), k: STYLE.bg[0], g: ink(fy, 1) };
    game.draw.sprite(FISHER[fr], pal, FISHER_X, fy, big ? 12 : 9, { anchor: 'center' });
  }

  function drawBeatLamps() {
    var ph = phase();
    var cur = clock >= 0 && ph.bar < BARS ? Math.floor(ph.inBar / SPB) : -1;
    for (var i = 0; i < 4; i++) {
      var x = W / 2 - 210 + i * 140, on = i === cur;
      var s = (i === 0 ? 34 : 26) + (on ? beatPulse * 10 : 0);
      game.draw.rect(x - s, LAMP_Y - s, s * 2, s * 2, ink(LAMP_Y, on ? 0 : 2));
    }
  }

  function drawBell() {
    var t = game.time.elapsed;
    var ph = phase();
    var live = (ph.resp && ph.bar < BARS) || turnT > 0;
    var blink = turnT > 0 && Math.floor(t * 10) % 2 === 0;
    var beamY = Math.round(H * 0.765);
    game.draw.rect(230, beamY, 620, 26, ink(beamY, 1));
    game.draw.rect(244, beamY, 26, H - beamY - 30, ink(beamY, 2));
    game.draw.rect(810, beamY, 26, H - beamY - 30, ink(beamY, 2));
    game.draw.rect(0, H - 34, W, 6, ink(H - 34, 2));
    var swing = Math.sin(t * 22) * bellSwing * 34 + (lockT > 0 ? Math.sin(t * 70) * 6 : 0);
    var bx = BELL_X + swing;
    game.draw.line(BELL_X, beamY + 26, bx, BELL_Y - 120, ink(beamY, 1), 8);
    if (live) box(BELL_X, BELL_Y, 168 + (blink ? 14 : 0), blink ? '#ffffff' : ink(BELL_Y, 1), 6);
    var big = hitStop > 0;
    var lv = live ? 0 : 1;
    var pal = big ? { w: '#ffffff', g: '#ffffff' } : { w: ink(BELL_Y, lv), g: ink(BELL_Y, 2) };
    game.draw.sprite(BELL, pal, bx, BELL_Y, big ? 28 : 24, { anchor: 'center' });
    // 舌(鐘の中の振り子)
    game.draw.rect(bx - 12 - swing * 0.6, BELL_Y + 120, 24, 24, ink(BELL_Y, 1));
  }

  function drawHitFlash() {
    if (hitStop <= 0 || failX < -900) return;
    var p = 1 - hitStop / 0.34;
    box(failX, failY, 40 + p * 90, '#ffffff', 8);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, STYLE.bg[0]);
    game.draw.rect(0, 222, W, 6, INKS[0][2]);
    label('SCORE ' + score, 50, 70, 42, '#ffffff', 'left');
    var ph = phase();
    label((ph.r + 1) + ' / ' + ROUNDS, W / 2, 70, 44, INKS[0][0]);
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      game.draw.sprite(BELL, { w: on ? INKS[2][0] : INKS[2][2], g: on ? INKS[2][1] : INKS[2][2] }, W - 70 - i * 80, 70, 5, { anchor: 'center' });
    }
    for (var r = 0; r < ROUNDS; r++) {
      var x = W / 2 - 150 + r * 100;
      if (roundRes[r] === 1) game.draw.rect(x - 16, 134, 32, 32, INKS[0][0]);
      else if (roundRes[r] === 2) game.draw.rect(x - 16, 134, 32, 32, INKS[0][2]);
      box(x, 150, 20, INKS[0][1], 3);
    }
    var progress = Math.max(0, Math.min(1, clock / (BARS * BAR)));
    game.draw.rect(50, 196, W - 100, 10, INKS[0][2]);
    game.draw.rect(50, 196, (W - 100) * progress, 10, INKS[0][0]);
    if (combo >= 2) label('x' + combo, W - 50, 150, 36, '#ffffff', 'right');
  }

  function drawScene() {
    var ph = phase();
    var callOn = ph.bar >= 0 && ph.bar < BARS && !ph.resp;
    var respOn = ph.bar >= 0 && ph.bar < BARS && ph.resp;
    drawSky();
    drawLane(CALL_Y, callOn, callOn ? slotX(ph.inBar / EIGHTH) : null);
    drawSea();
    drawBoat();
    drawFog();
    drawQuay();
    drawBeatLamps();
    drawLane(RESP_Y, respOn, respOn ? slotX(ph.inBar / EIGHTH) : null);
    drawMarks();
    drawBell();
    drawHitFlash();
  }

  function drawResult(showTap) {
    var clean = 0, left = 0, i;
    for (i = 0; i < ROUNDS; i++) if (roundRes[i] === 1) clean++;
    for (i = 0; i < evs.length; i++) if (evs[i].res === 0 || evs[i].res === 3) left++;
    var y0 = H * 0.28, hh = H * 0.34;
    game.draw.rect(40, y0, W - 80, hh, STYLE.bg[0]);
    game.draw.rect(40, y0, W - 80, 6, INKS[0][0]); game.draw.rect(40, y0 + hh - 6, W - 80, 6, INKS[2][0]);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? INKS[0][0] : INKS[2][0]);
    label('SCORE ' + score, W / 2, H * 0.395, 56, '#ffffff');
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.44, 34, STYLE.main[1]);
    label('NICE ' + clean + ' / ' + ROUNDS, W / 2, H * 0.48, 38, INKS[0][0]);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.525, 52, INKS[2][0]);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.525, 40, STYLE.main[1]);
    if (!won) label('あと' + Math.max(1, left) + '打!', W / 2, H * 0.565, 44, INKS[2][0]);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.603, 34, '#ffffff');
  }

  // ---- ATTRACT: 実ロジックで1ラウンド。奇数周は3打とも返してNICE、偶数周は3打目を打ち漏らしてMISS ----
  var demo = { t: 0, x: BELL_X + 60, y: BELL_Y + 40, press: false, gi: 0, pressT: 0, cyc: 0 };
  var DEMO_CYC = 2 * BAR + 0.9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.gi = 0; demo.pressT = 0; demo.cyc++; }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var forget = demo.cyc % 2 === 0;
    if (demo.gi < evs.length) {
      var e = evs[demo.gi];
      if (forget && demo.gi === evs.length - 1) {
        // 覚えきれずに手が止まる
      } else if (clock >= e.respT - 0.01 && hitStop <= 0) {
        strike(); demo.gi++; demo.pressT = 0.16;
      }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    var ty = BELL_Y + (demo.press ? 20 : 50);
    demo.y += (ty - demo.y) * Math.min(1, dt * 14);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (bellSwing > 0) bellSwing = Math.max(0, bellSwing - dt * 2.4);
    if (pullT > 0) pullT -= dt;

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, STYLE.bg[0]);
      label(GAME_TITLE, W / 2, 92, 90 + Math.sin(t * 3) * 3, INKS[0][0]);
      label('HI-SCORE ' + game.best, W / 2, 180, 36, '#ffffff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.705, 50, INKS[2][0]);
      else label('TAP TO START', W / 2, H * 0.705, 44, '#ffffff');
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
      game.draw.rect(0, H * 0.47, W, 140, STYLE.bg[0], 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, '#ffffff');
    }
    // 最初の返しの直前だけ、鐘の上に手を1回出す
    if (!over && clock > BAR - SPB && clock < BAR + 0.25) {
      game.draw.hand(BELL_X + 60, BELL_Y + 40, { press: clock >= BAR - 0.05, scale: 13, alpha: 0.7 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);

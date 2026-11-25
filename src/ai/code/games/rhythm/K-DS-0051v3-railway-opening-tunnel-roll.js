// K-DS-0051v3-railway-opening-tunnel-roll.js
// 開通一番列車のトンネル連打 — 灯が点く駅の小節は8分の拍に乗せて太鼓を連打し、灯が消えて楽隊が止むトンネルの小節は拍を保って手を止め、出口の一打目を拍の頭で決める
// 操作: 画面のどこでも押すと太鼓を打つ(押した瞬間で判定)。灯が点いている小節(駅を通る間・楽隊が鳴る)は8分の拍(1小節に8打。下の8つの枠の光る位置)に合わせて連打する。拍に乗った1打で枠が1つ埋まり、6つ埋まればその駅の人たちが盛り上がる。同じ拍への2打目・拍から外れた打ちはMISS(枠が1つ減る)。灯が消えるトンネルの小節は伴奏が止み、拍の目印も消える(壁の灯りが拍ごとに薄く流れるだけ)ので、心の中で拍を保って打たない。トンネルで打つと太鼓が響いてMISS。トンネルの入口は1小節前から地平線に見え、0.7秒前に汽笛が鳴り灯が赤く点滅して予告。出口の明かりが近づき、出た小節の一打目を拍の頭で打てばNICE
// 終わり: 前奏1小節(指揮の4拍)+8小節(132BPM・約14.5秒、駅5つ・トンネル3小節)。駅を4つ以上盛り上げて終点のテープまで走ればCLEAR。盛り上げ損ねた駅が2つ、またはトンネルで3回打ったらGAME OVER
// @mechanic: mash
// @theme: railway_opening_band_tunnel_roll
// 世界観: 新しい鉄道の開通式典の日、飾りつけた一番列車の先頭の展望台に乗った楽隊の太鼓手が、沿線の駅で灯がともる小節は拍に乗せた連打で見物の人たちを盛り上げ、灯の消えるトンネルでは拍を保って手を止めながら終点のテープを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・盛り上げた駅の数・拍に乗った打数・PERFECT/GOOD数・トンネルで打った回数・最大コンボ
// スタイル: MODE7 PSEUDO

(function (game) {
  var STYLE = { bg: ['#7ac0f0', '#dff2ff'], main: ['#6aa85a', '#8a8a90', '#c08850'], accent: ['#ffd24a', '#e04a4a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 画面を横ストリップに分け、奥ほど詰めて床(線路と畑)を描く。地平線から上は空グラデ
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], grass1: STYLE.main[0], grass2: '#82bc6a', ballast1: STYLE.main[1], ballast2: '#9a9aa0',
    sleeper: STYLE.main[2], rail: '#e0e0e8', stone: '#d8d0c0', edge: '#ffe066', hill: '#4a7a4a', hillD: '#3a5e3a',
    portal: '#d0c0a0', dark: '#16120e', dark2: '#241e18', dark3: '#33281e',
    gold: STYLE.accent[0], red: STYLE.accent[1], navy: '#2a3a7a', white: '#ffffff', ink: '#1a1a2a', good: '#7ae07a', bad: '#ff5a6a', deck: '#a8743e', deckD: '#7a5028'
  };

  var TITLE = 'FIRST TRAIN';
  var BPM = 132;
  var SPB = 60 / BPM;              // 1拍 約0.455秒
  var HALF = SPB / 2;              // 8分 約0.227秒
  var BAR_T = 4 * SPB;
  var KINDS = ['P', 'L', 'L', 'T', 'L', 'L', 'T', 'T', 'L'];   // P=前奏 L=駅(灯) T=トンネル(無音)
  var DEMO_KINDS = ['L', 'T', 'L'];
  var TIME_LIMIT = 14.5;           // 前奏のあと8小節 = 14.5秒。放置でも READY 0.8 + 前奏1.8 + 14.5 + 余韻1.7 = 18.8秒で終わる
  var LEAD = 0.06;
  var PERFECT_W = 0.045, GOOD_W = 0.085;
  var QUOTA = 6;                   // 1駅で埋める枠
  var MAX_BOOM = 3, MAX_FAIL = 2;
  var HIT_STOP = 0.4;
  var HY = Math.round(H * 0.36);                // 地平線
  var FLOOR_BOT = Math.round(H * 0.72);         // 床の手前(展望台の手すり)
  var SLOT_Y = Math.round(H * 0.955);           // 8つの枠
  var MAN_Y = Math.round(H * 0.85);             // 太鼓手
  var LAMP_X = 940, LAMP_Y = Math.round(H * 0.68);
  var UNIT = 8;                                 // 1小節で進む距離
  var V = UNIT / BAR_T;                         // 列車の速さ

  // 伴奏(オリジナル): 行進の金管(矩形波) + 三角波のベース。トンネルの小節は鳴らさない
  var MEL = [
    ['G4', 'B4', 'D5', 'B4', 'G5', 'D5', 'B4', 'D5'],
    ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'C5'],
    ['D5', 'F#5', 'A5', 'F#5', 'D6', 'A5', 'F#5', 'A5'],
    ['G5', 'D5', 'B4', 'G4', 'A4', 'B4', 'C5', 'D5'],
    ['G5', 'G5', 'B5', 'B5', 'D6', 'D6', 'G6', 'G6']
  ];
  var BASS = [['G2', 'D3', 'G2', 'D3'], ['C3', 'G2', 'C3', 'G2'], ['D3', 'A2', 'D3', 'A2'], ['G2', 'D3', 'G2', 'D3'], ['G2', 'D3', 'G2', 'G2']];

  // ---- スプライト ----
  var DRUMMER = [
    '.....rr.......', '.....rr.......', '....nnnnn.....', '...nnnnnnn....', '...ggggggg....', '....hhhhh.....',
    '..yNNNNNNNy...', '.NNNNNNNNNNN..', '.NNNwwwwNNNN..', '.NNNNwwNNNNN..', '..NNNNNNNNN...', '..NNNNNNNNN...',
    '...ppp.ppp....', '...ppp.ppp....', '...kkk.kkk....', '..kkkk.kkkk...'
  ];
  var DR_PAL = { r: C.red, n: C.navy, g: C.gold, h: '#5a3a28', y: C.gold, N: C.navy, w: C.white, p: '#22284a', k: C.ink };
  var DR_HIT = { r: C.white, n: C.white, g: C.white, h: C.white, y: C.white, N: C.white, w: C.white, p: C.white, k: C.white };
  var FOLK_A = ['.h.', 'hhh', 'bbb', 'bbb', 'b.b', 'l.l'];
  var FOLK_B = ['.h.', 'hhh', 'bbb', 'bbb', 'l.l', '...'];
  var FOLK_UP = ['f..', 'fh.', 'hhh', 'bbb', 'bbb', 'l.l'];
  var FLAG = ['fffr', 'ffr.', 'fr..', 'p...', 'p...', 'p...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, kinds, litIdx, tunnels, running, songT, halfN, barN, schedBar, readyT, beatPulse, endT;
  var used, gauge, stationRes, stickT, stickSide, stopT, lampWarn, whistled, judgeW, judgeT, reentryBar;
  var score, perfects, goods, sloppy, booms, roused, failed, combo, maxCombo, over, won, outroT, prevBest, milestone, cut;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    kinds = demoMode ? DEMO_KINDS : KINDS;
    litIdx = []; stationRes = [];
    var n = 0;
    for (var b = 0; b < kinds.length; b++) { litIdx.push(kinds[b] === 'L' ? n++ : -1); }
    for (var s = 0; s < n; s++) stationRes.push('');
    tunnels = [];
    for (var t = 0; t < kinds.length; t++) {
      if (kinds[t] !== 'T') continue;
      if (tunnels.length && tunnels[tunnels.length - 1][1] === t * UNIT) tunnels[tunnels.length - 1][1] = (t + 1) * UNIT;
      else tunnels.push([t * UNIT, (t + 1) * UNIT]);
    }
    endT = kinds.length * BAR_T;
    running = false; songT = 0; halfN = -1; barN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    beatPulse = 0;
    used = {}; gauge = []; for (var g = 0; g < kinds.length; g++) gauge.push(0);
    stickT = 0; stickSide = 0; stopT = 0; lampWarn = 0; whistled = {}; judgeW = ''; judgeT = 0; reentryBar = -1;
    score = 0; perfects = 0; goods = 0; sloppy = 0; booms = 0; roused = 0; failed = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; cut = false;
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function kindAt(b) { return b >= 0 && b < kinds.length ? kinds[b] : ''; }
  function stationsLeft() { var c = 0; for (var i = 0; i < stationRes.length; i++) if (!stationRes[i]) c++; return c; }

  function playBar(b) {
    if (demoMode || over || b >= kinds.length) return;
    var k = kinds[b], mel = [], bass = [];
    if (k === 'T') return;      // トンネル: 楽隊が止む
    if (k === 'P') {
      mel = [['G4', 1], ['G4', 1], ['G4', 1], ['D5', 1]];
      bass = [['G2', 1], ['G2', 1], ['G2', 1], ['D3', 1]];
    } else {
      var li = Math.min(MEL.length - 1, litIdx[b]);
      if (litIdx[b] === stationRes.length - 1) li = MEL.length - 1;
      for (var i = 0; i < 8; i++) mel.push([MEL[li][i], 0.5]);
      for (var j = 0; j < 4; j++) bass.push([BASS[li][j], 1]);
    }
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.06, bass: bass, bassWave: 'triangle', bassVolume: 0.14 });
  }

  // ---- 拍クロック(1本だけ。8分で数える)。ヒットストップ中も止めない ----
  function onBar(b) {
    // 前の小節が駅なら、盛り上がったか判定
    var pb = b - 1;
    if (pb >= 0 && kindAt(pb) === 'L') judgeStation(pb);
    if (kindAt(b) === 'L' && kindAt(b - 1) === 'T') reentryBar = b;
  }
  function onHalf(h) {
    if (h % 2 === 0) beatPulse = 1;
    var b = Math.floor(h / 8);
    if (h % 8 === 0 && b !== barN) { barN = b; onBar(b); }
  }
  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < kinds.length && songT >= schedBar * BAR_T - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (halfN + 1) * HALF) { halfN++; onHalf(halfN); }
    // トンネルの予告: 0.7秒前に汽笛 + 灯が赤く点滅
    var nb = Math.floor(songT / BAR_T) + 1;
    lampWarn = 0;
    if (kindAt(nb) === 'T' && kindAt(nb - 1) !== 'T' && nb * BAR_T - songT < 0.7) {
      lampWarn = 1;
      if (!whistled[nb]) { whistled[nb] = true; sfx(880, 0.18, { wave: 'square', volume: 0.06 }); sfx(1175, 0.3, { wave: 'square', volume: 0.05, slide: -60 }); }
    }
  }

  function judgeStation(b) {
    var si = litIdx[b];
    if (si < 0 || stationRes[si]) return;
    var ok = gauge[b] >= QUOTA;
    stationRes[si] = ok ? 'ok' : 'fail';
    if (ok) {
      roused++; score += 200;
      game.fx.burst(W * 0.25, HY + 120, { color: C.gold, count: 14, speed: 320 });
      game.fx.burst(W * 0.75, HY + 120, { color: C.red, count: 14, speed: 320 });
      sfx(784, 0.08, { wave: 'square', volume: 0.07 }); sfx(1047, 0.14, { wave: 'square', volume: 0.06 });
      if (!milestone && roused >= 3) {
        milestone = true;
        if (!demoMode) game.audio.play('se_milestone', 0.4);
        game.fx.popup(roused + ' / ' + stationRes.length, W / 2, H * 0.27, { color: C.gold, size: 84 });
      }
    } else {
      failed++;
      game.fx.popup('MISS', W / 2, H * 0.27, { color: C.bad, size: 70 });
      sfx(220, 0.3, { wave: 'triangle', volume: 0.08, slide: -80 });
      if (!demoMode && failed >= MAX_FAIL) finish(false);
    }
  }

  function say(word, col) {
    judgeW = word; judgeT = 0.4;
  }

  // ---- 太鼓を打つ ----
  function strike() {
    if (!running || over) return 'none';
    stickT = 0.1; stickSide = 1 - stickSide;
    if (stopT > 0) return 'busy';
    var s = Math.round(songT / HALF);
    var off = songT - s * HALF;
    var b = Math.floor(s / 8);
    var k = kindAt(b);
    if (k === 'T') {
      // トンネルで打つ: 響いてMISS(ヒットストップ)
      booms++; combo = 0;
      stopT = HIT_STOP;
      say('MISS', C.bad);
      sfx(98, 0.5, { wave: 'sine', volume: 0.2, slide: -30 });
      sfx(147, 0.4, { wave: 'triangle', volume: 0.08 });
      game.fx.flash(C.white, 0.12);
      return 'boom';
    }
    sfx(180, 0.08, { wave: 'sine', volume: 0.16, slide: -60 });
    sfx(900, 0.03, { wave: 'square', volume: 0.03 });
    if (k !== 'L') return 'free';
    if (used[s] || Math.abs(off) > GOOD_W) {
      sloppy++; combo = 0;
      gauge[b] = Math.max(0, gauge[b] - 1);
      say('MISS', C.bad);
      sfx(330, 0.06, { wave: 'square', volume: 0.04, slide: -120 });
      return 'sloppy';
    }
    used[s] = true;
    var perfect = Math.abs(off) <= PERFECT_W;
    gauge[b] = Math.min(8, gauge[b] + 1);
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (perfect) perfects++; else goods++;
    score += perfect ? 100 + combo * 5 : 50 + combo * 3;
    if (b === reentryBar && s % 8 === 0) {
      score += 300;
      say('NICE', C.gold);
      game.fx.popup('NICE', W / 2, H * 0.47, { color: C.gold, size: 90 });
    } else {
      say(perfect ? 'PERFECT' : 'GOOD', perfect ? C.gold : C.good);
    }
    if (gauge[b] === QUOTA) {
      sfx(1319, 0.1, { wave: 'square', volume: 0.06 });
      if (!demoMode) game.feedback.good(W / 2, MAN_Y - 300, { text: null, color: C.gold, count: 8, volume: 0.25 });
    }
    return perfect ? 'perfect' : 'good';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (ok) {
      cut = true;
      score += 400 + (MAX_BOOM - booms) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 7; i++) game.fx.burst(game.random(120, 960), game.random(300, 1100), { color: i % 2 ? C.gold : C.red, count: 16, speed: 380 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    if (judgeT > 0) judgeT -= dt;
    if (stickT > 0) stickT -= dt;
    if (!running) return;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        stopT = 0;
        if (!demoMode) game.feedback.bad(W / 2, MAN_Y - 120, { text: null, shake: 10 });
        else game.fx.shake(6, 0.15);
        if (!demoMode && booms >= MAX_BOOM) finish(false);
      }
    }
    if (!demoMode && !over && songT >= endT) {
      judgeStation(kinds.length - 1);
      if (!over) finish(roused >= stationRes.length - 1 && booms < MAX_BOOM);
    }
    if (!demoMode && !over && roused + stationsLeft() < stationRes.length - 1) finish(false);
    if (!demoMode && !over && songT > endT + 1) finish(false);
  }

  // ---- 描画 ----
  function txt(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function camZ() { return Math.max(0, running ? songT : 0) * V; }
  function insideTunnel(z) {
    for (var i = 0; i < tunnels.length; i++) if (z >= tunnels[i][0] - 0.5 && z < tunnels[i][1] - 0.5) return tunnels[i];
    return null;
  }
  function nextTunnel(z) {
    for (var i = 0; i < tunnels.length; i++) if (tunnels[i][0] - 0.5 > z) return tunnels[i];
    return null;
  }
  function isStation(z) {
    var b = Math.floor(z / UNIT);
    return kindAt(b) === 'L' && (z - b * UNIT) > 0.6 && (z - b * UNIT) < UNIT - 0.6;
  }

  function drawFloorStrip(y, z, sc, clip) {
    var cx = W / 2;
    var par = Math.floor(z) % 2 === 0;
    var x0 = clip ? cx - clip : 0, w0 = clip ? clip * 2 : W;
    game.draw.rect(x0, y, w0, 4, par ? C.grass1 : C.grass2);
    if (isStation(z)) {
      var pw = Math.min(0.9 * sc, clip ? clip : W);
      game.draw.rect(cx + 1.1 * sc, y, pw, 4, C.stone);
      game.draw.rect(cx - 1.1 * sc - pw, y, pw, 4, C.stone);
      game.draw.rect(cx + 1.1 * sc, y, Math.max(2, 0.08 * sc), 4, C.edge);
      game.draw.rect(cx - 1.1 * sc - Math.max(2, 0.08 * sc), y, Math.max(2, 0.08 * sc), 4, C.edge);
    }
    var bw = Math.min(0.85 * sc, clip ? clip : W);
    game.draw.rect(cx - bw, y, bw * 2, 4, par ? C.ballast1 : C.ballast2);
    if (z - Math.floor(z) < 0.2) game.draw.rect(cx - 0.75 * sc, y, 1.5 * sc, 4, C.sleeper);
  }

  function drawOutside(cz) {
    var t = game.time.elapsed;
    game.draw.gradient(0, HY, [[0, C.sky0], [1, C.sky1]]);
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + t * 14) % 1400) - 160, cy = 300 + (c % 2) * 120;
      game.draw.circle(cx, cy, 46, C.white, 0.85); game.draw.circle(cx + 50, cy + 8, 38, C.white, 0.85); game.draw.circle(cx - 46, cy + 10, 32, C.white, 0.85);
    }
    // 遠い山並み(地平線)
    for (var m = 0; m < 7; m++) game.draw.circle(m * 180 + 40, HY + 40, 150 + (m % 3) * 30, '#8ab890');
    var nt = nextTunnel(cz);
    for (var y = HY + 2; y < FLOOR_BOT; y += 4) {
      var sc = y - HY;
      drawFloorStrip(y, cz + 560 / sc, sc, 0);
    }
    // レール(消失点へ収束)
    game.draw.line(W / 2 - 0.5 * (FLOOR_BOT - HY), FLOOR_BOT, W / 2, HY, C.rail, 7);
    game.draw.line(W / 2 + 0.5 * (FLOOR_BOT - HY), FLOOR_BOT, W / 2, HY, C.rail, 7);
    drawBillboards(cz, nt);
    // トンネルの入口(1小節前から地平線に見える)
    if (nt) drawPortal(nt[0] - cz);
  }

  function drawPortal(dz) {
    if (dz > UNIT * 1.6 || dz < 0.3) return;
    var sc = 560 / dz;
    var bot = HY + sc;
    game.draw.rect(0, HY - 2.8 * sc - 40, W, bot - (HY - 2.8 * sc - 40), C.hill);
    for (var i = 0; i < 6; i++) game.draw.circle(i * 220 + 20, HY - 2.8 * sc - 40, 90 + sc * 0.3, C.hill);
    game.draw.rect(0, bot - 10, W, 10, C.hillD);
    game.draw.rect(W / 2 - 1.45 * sc, bot - 2.0 * sc, 2.9 * sc, 2.0 * sc, C.portal);
    game.draw.circle(W / 2, bot - 2.0 * sc, 1.45 * sc, C.portal);
    game.draw.rect(W / 2 - 1.2 * sc, bot - 2.0 * sc, 2.4 * sc, 2.0 * sc, C.dark);
    game.draw.circle(W / 2, bot - 2.0 * sc, 1.2 * sc, C.dark);
  }

  function drawInside(cz, tun) {
    var t = game.time.elapsed;
    game.draw.rect(0, 0, W, FLOOR_BOT, C.dark);
    var dz1 = tun[1] - cz;
    var sc1 = 560 / Math.max(0.3, dz1);
    // 出口の明かり(近づくと大きくなる)
    var clip = 1.2 * sc1;
    game.draw.rect(W / 2 - clip, HY - sc1, clip * 2, sc1, C.sky1);
    game.draw.circle(W / 2, HY - sc1, clip, C.sky1);
    for (var y = HY + 2; y < FLOOR_BOT; y += 4) {
      var sc = y - HY;
      var z = cz + 560 / sc;
      if (z >= tun[1]) { drawFloorStrip(y, z, sc, clip); continue; }
      var par = Math.floor(z) % 2 === 0;
      game.draw.rect(W / 2 - 0.85 * sc, y, 1.7 * sc, 4, par ? C.dark2 : C.dark3);
      if (z - Math.floor(z) < 0.2) game.draw.rect(W / 2 - 0.75 * sc, y, 1.5 * sc, 4, '#3e3226');
    }
    game.draw.line(W / 2 - 0.5 * (FLOOR_BOT - HY), FLOOR_BOT, W / 2, HY, '#5a5a62', 6);
    game.draw.line(W / 2 + 0.5 * (FLOOR_BOT - HY), FLOOR_BOT, W / 2, HY, '#5a5a62', 6);
    // 壁の灯り: 拍ごと(2単位ごと)に薄く流れる
    for (var q = Math.ceil(cz + 0.9); q < Math.min(tun[1], cz + 14); q++) {
      if (q % 2 !== 0) continue;
      var dz = q - cz, s = 560 / dz;
      var ly = HY - 0.6 * s;
      game.draw.circle(W / 2 - 1.4 * s, ly, Math.max(3, 0.08 * s), '#a08040', 0.5);
      game.draw.circle(W / 2 + 1.4 * s, ly, Math.max(3, 0.08 * s), '#a08040', 0.5);
    }
    game.draw.rect(0, 0, W, FLOOR_BOT, '#000000', 0.15 + Math.sin(t * 3) * 0.03);
  }

  function drawBillboards(cz, nt) {
    var limit = nt ? nt[0] - 0.5 : 1e9;
    var t = game.time.elapsed;
    for (var z = Math.ceil((cz + 24) * 2) / 2; z > cz + 0.85; z -= 0.5) {
      if (z >= limit) continue;
      var dz = z - cz, sc = 560 / dz;
      var gy = HY + sc;
      var b = Math.floor(z / UNIT);
      // 飾り旗の柱(2単位ごと)
      if (Math.abs(z / 2 - Math.round(z / 2)) < 0.01 && !isStation(z)) {
        var top = HY - 0.7 * sc;
        game.draw.line(W / 2 - 1.0 * sc, gy, W / 2 - 1.0 * sc, top, '#e8e8e8', Math.max(2, 0.05 * sc));
        game.draw.line(W / 2 + 1.0 * sc, gy, W / 2 + 1.0 * sc, top, '#e8e8e8', Math.max(2, 0.05 * sc));
        var fp = Math.max(1, 0.1 * sc);
        if (fp >= 1.5) {
          game.draw.sprite(FLAG, { f: Math.round(z) % 4 ? C.gold : C.red, r: C.white, p: '#e8e8e8' }, W / 2 - 1.0 * sc, top, fp, { anchor: 'topleft' });
          game.draw.sprite(FLAG, { f: Math.round(z) % 4 ? C.red : C.gold, r: C.white, p: '#e8e8e8' }, W / 2 + 1.0 * sc, top, fp, { anchor: 'topleft', flipX: true });
        }
      }
      // 駅の見物の人たち(盛り上がると旗を振って跳ねる)
      if (isStation(z) && Math.abs(z * 2 - Math.round(z * 2)) < 0.01 && Math.round(z * 2) % 3 === 0) {
        var si = litIdx[b];
        var res = si >= 0 ? stationRes[si] : '';
        var px = 1.3 * sc / 6;
        if (px < 1.5) continue;
        var cheering = res === 'ok' || (si >= 0 && !res && gauge[b] >= QUOTA);
        var jump = cheering ? beatPulse * 0.25 * sc : 0;
        var art = cheering ? FOLK_UP : (Math.floor(Math.max(0, songT) / SPB) + Math.round(z)) % 2 ? FOLK_A : FOLK_B;
        var pal = { h: '#5a3a28', f: C.red, b: Math.round(z * 2) % 2 ? '#5a8ad0' : '#e08a4a', l: C.ink };
        if (res === 'fail') pal = { h: '#6a6a6a', f: '#6a6a6a', b: '#8a8a8a', l: '#5a5a5a' };
        game.draw.sprite(art, pal, W / 2 + 1.55 * sc, gy - jump, px, { anchor: 'center' });
        game.draw.sprite(art, pal, W / 2 - 1.55 * sc, gy - jump, px, { anchor: 'center', flipX: true });
      }
    }
    // 終点のテープ(最後の駅の先)
    var zEnd = kinds.length * UNIT;
    var dzE = zEnd - cz;
    if (dzE > 0.85 && dzE < 24 && zEnd < limit) {
      var se = 560 / dzE, gyE = HY + se;
      game.draw.line(W / 2 - 1.0 * se, gyE, W / 2 - 1.0 * se, HY - 0.2 * se, C.white, Math.max(2, 0.06 * se));
      game.draw.line(W / 2 + 1.0 * se, gyE, W / 2 + 1.0 * se, HY - 0.2 * se, C.white, Math.max(2, 0.06 * se));
      if (!cut) {
        game.draw.rect(W / 2 - 1.0 * se, HY + 0.15 * se, 2.0 * se, Math.max(3, 0.1 * se), C.red);
        game.draw.rect(W / 2 - 1.0 * se, HY + 0.15 * se, 2.0 * se, Math.max(1, 0.03 * se), C.white);
      }
    }
  }

  function drawWorld() {
    var cz = camZ();
    var tun = insideTunnel(cz);
    if (tun) drawInside(cz, tun);
    else drawOutside(cz);
  }

  function drawDeck() {
    var t = game.time.elapsed;
    var lit = kindAt(Math.floor(Math.max(0, songT) / BAR_T)) !== 'T';
    if (!running) lit = true;
    game.draw.gradient(FLOOR_BOT, H, [[0, C.deck], [1, C.deckD]]);
    for (var p = 0; p < 9; p++) game.draw.rect(p * 135 - 4, FLOOR_BOT, 8, 90, C.gold);
    game.draw.rect(0, FLOOR_BOT - 6, W, 16, C.gold);
    game.draw.rect(0, FLOOR_BOT + 80, W, 12, C.gold);
    for (var f = 0; f < 12; f++) game.draw.sprite(['wwww', 'rrr.', 'rr..', 'r...'], { w: C.white, r: f % 2 ? C.red : C.navy }, f * 92 + 10, FLOOR_BOT + 12, 9, { anchor: 'topleft' });
    // 灯(駅の小節は点灯、トンネルは消灯、0.7秒前から赤く点滅)
    game.draw.rect(LAMP_X - 6, LAMP_Y, 12, FLOOR_BOT + 90 - LAMP_Y, C.ink);
    var warnOn = lampWarn > 0 && Math.floor(t * 10) % 2 === 0;
    var lampCol = warnOn ? C.red : lit ? C.gold : '#3a3020';
    if (lit && !warnOn) game.draw.circle(LAMP_X, LAMP_Y, 80 + beatPulse * 14, C.gold, 0.25);
    if (warnOn) game.draw.circle(LAMP_X, LAMP_Y, 90, C.red, 0.3);
    game.draw.rect(LAMP_X - 40, LAMP_Y - 50, 80, 90, C.ink);
    game.draw.rect(LAMP_X - 30, LAMP_Y - 40, 60, 70, lampCol);
    game.draw.rect(LAMP_X - 46, LAMP_Y - 62, 92, 14, C.ink);
  }

  function drawDrummer() {
    var hit = stopT > 0;
    var px = hit ? 18 : 16;
    // 太鼓(背中越しに両脇の縁が見える)
    game.draw.rect(W / 2 - 170, MAN_Y + 20, 340, 80, hit ? C.white : C.white);
    game.draw.rect(W / 2 - 170, MAN_Y + 20, 340, 14, hit ? C.white : C.red);
    game.draw.rect(W / 2 - 170, MAN_Y + 86, 340, 14, hit ? C.white : C.red);
    for (var z = 0; z < 7; z++) game.draw.line(W / 2 - 160 + z * 50, MAN_Y + 34, W / 2 - 135 + z * 50, MAN_Y + 86, C.gold, 4);
    game.draw.sprite(DRUMMER, hit ? DR_HIT : DR_PAL, W / 2, MAN_Y - 40, px, { anchor: 'center' });
    // ばち(打つたびに左右交互に振り下ろす)
    var lDown = stickT > 0 && stickSide === 0, rDown = stickT > 0 && stickSide === 1;
    var lh = { x: W / 2 - 120, y: MAN_Y - 10 + (lDown ? 40 : 0) }, rh = { x: W / 2 + 120, y: MAN_Y - 10 + (rDown ? 40 : 0) };
    game.draw.line(lh.x, lh.y, lh.x + 40, lDown ? MAN_Y + 30 : MAN_Y - 130, '#e8d0a0', 12);
    game.draw.line(rh.x, rh.y, rh.x - 40, rDown ? MAN_Y + 30 : MAN_Y - 130, '#e8d0a0', 12);
    game.draw.circle(lh.x, lh.y, 20, C.white);
    game.draw.circle(rh.x, rh.y, 20, C.white);
    if (hit) game.draw.circle(W / 2, MAN_Y - 20, 190, C.white, 0.3);
  }

  function drawSlots() {
    var b = Math.floor(Math.max(0, songT) / BAR_T);
    var k = running ? kindAt(b) : 'L';
    var inBar = running ? Math.floor((songT - b * BAR_T) / HALF) : -1;
    var x0 = 130, bw = 96;
    game.draw.rect(x0 - 24, SLOT_Y - 44, bw * 8 + 48, 88, C.ink, 0.75);
    for (var i = 0; i < 8; i++) {
      var x = x0 + i * bw;
      var filled = k === 'L' && i < gauge[b];
      var col = k === 'T' ? '#2a2a32' : filled ? C.gold : '#4a4a5a';
      if ((k === 'L' || k === 'P') && i === inBar) col = filled ? '#fff2a0' : '#8a8aa0';
      game.draw.rect(x + 6, SLOT_Y - 30, bw - 12, 60, col);
      if (i % 2 === 0 && k !== 'T') game.draw.rect(x + 6, SLOT_Y + 32, bw - 12, 6, C.white, 0.6);
    }
    // 目標の旗(6つ目のあと)
    game.draw.rect(x0 + QUOTA * bw - 3, SLOT_Y - 52, 6, 104, C.red);
    game.draw.sprite(FLAG, { f: C.red, r: C.white, p: C.white }, x0 + QUOTA * bw, SLOT_Y - 92, 7, { anchor: 'topleft' });
  }

  function drawHud(showPlay) {
    game.draw.gradient(0, 230, [[0, '#1a2a5a'], [1, '#2a3a7a']]);
    game.draw.rect(0, 222, W, 8, C.gold);
    if (!showPlay) return;
    txt('SCORE ' + score, 40, 70, 50, C.white, 'left');
    txt('BEST ' + prevBest, 40, 135, 32, C.gold, 'left');
    // 駅の旗(残りN個)
    for (var i = 0; i < stationRes.length; i++) {
      var r = stationRes[i];
      game.draw.sprite(FLAG, { f: r === 'ok' ? C.gold : r === 'fail' ? '#5a5a6a' : '#9aa0c0', r: r === 'ok' ? C.red : '#5a5a6a', p: C.white }, W - 340 + i * 64, 40, 9, { anchor: 'topleft' });
    }
    for (var m = 0; m < MAX_BOOM; m++) game.draw.circle(W - 60 - m * 50, 160, 16, m < MAX_BOOM - booms ? C.red : '#4a4a6a');
    txt(roused + ' / ' + stationRes.length, W - 360, 160, 36, C.gold, 'right');
    if (combo >= 4) txt(combo + ' COMBO', W / 2, 190, 34, C.gold);
  }

  function drawScene() {
    drawWorld();
    drawDeck();
    drawDrummer();
    drawSlots();
    if (judgeT > 0) txt(judgeW, W / 2, MAN_Y - 230, 64, judgeW === 'MISS' ? C.bad : judgeW === 'GOOD' ? C.good : C.gold);
  }

  // ---- ATTRACT: 駅の小節は8分で連打、トンネルで1回うっかり打って響かせ、出口の一打目を決める ----
  var demo = { t: 0, press: 0, lastS: -1 };
  var DEMO_LEN = DEMO_KINDS.length * BAR_T;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = 0; demo.lastS = -1; }
    var s = Math.floor(songT / HALF);
    if (s > demo.lastS && songT - s * HALF < 0.05) {
      demo.lastS = s;
      var k = kindAt(Math.floor(s / 8));
      if (k === 'L' || (k === 'T' && s % 8 === 4)) { strike(); demo.press = 0.1; }
    }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var r = strike();
    if (r === 'free') game.fx.burst(x, y, { color: C.gold, count: 4, speed: 100 });
    else if (r === 'busy') game.audio.tone(120, 0.04, { wave: 'square', volume: 0.03 });
    else if (r === 'perfect' || r === 'good') game.fx.burst(W / 2, MAN_Y + 40, { color: C.gold, count: 5, speed: 200 });
  });
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      drawHud(false);
      game.draw.hand(W / 2 + 200, MAN_Y + 10 + (demo.press > 0 ? 0 : -30), { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, 90 + Math.sin(t * 3) * 4, 96, C.gold);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 180, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.27, 50, C.gold);
      else txt('TAP TO START', W / 2, H * 0.27, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud(false);
      game.draw.rect(80, H * 0.18, W - 160, H * 0.46, C.ink, 0.9);
      game.draw.rect(96, H * 0.18 + 16, W - 192, H * 0.46 - 32, C.navy, 0.95);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 104, won ? C.good : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.31, 62, C.white);
      txt(roused + ' / ' + stationRes.length, W / 2, H * 0.365, 58, C.gold);
      txt('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + (sloppy + booms), W / 2, H * 0.415, 34, C.white);
      txt(maxCombo + ' COMBO', W / 2, H * 0.46, 40, C.gold);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.515, 56, C.gold);
      else txt('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.515, 42, C.gold);
      if (!won) txt('あと' + Math.max(1, stationRes.length - 1 - roused) + '駅', W / 2, H * 0.57, 52, C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.6, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, stations: roused, stationTotal: stationRes.length, perfect: perfects, good: goods, sloppy: sloppy, booms: booms, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      tickWorld(dt);
      if (readyT <= 0) { running = true; songT = -0.1; halfN = -1; barN = -1; schedBar = 0; game.audio.play('se_tap', 0.3); }
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud(true);
    if (readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.27, 120, C.gold);
    if (over) txt(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.27, 110, won ? C.good : C.bad);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

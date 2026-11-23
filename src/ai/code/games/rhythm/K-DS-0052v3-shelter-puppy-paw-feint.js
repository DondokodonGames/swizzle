// K-DS-0052v3-shelter-puppy-paw-feint.js
// 保護犬広場のフェイント見極め — 子犬が拍の裏に食い込んで出すフェイントの前脚にはじっと動かず、拍の頭で本気で伸ばしてきた前脚にだけ同じ側の手のひらを合わせる
// 操作: 画面の左半分=左の手、右半分=右の手(下の大きな手のひら)。押すとその手を上げて子犬の前脚に合わせる(押した瞬間で判定)。本気の前脚は拍の頭で伸び切り、肉球が金色に光る(上の拍ランプにその拍の頭と左右が肉球で出て、伸ばす前にワフッと鳴く)。フェイントは拍の裏(8分の食い)で途中まで伸びて引っ込む(0.5〜0.75秒前に子犬の目がきらりと細まり、ランプの裏の点に赤いトゲ印、鼻をふすっと鳴らす)。フェイント・何もない時に手を動かす・左右違い・ずれすぎ・本気の前脚を見送るとMISS。動かずにやり過ごしたフェイントはボーナス
// 終わり: 前奏1小節+6小節(120BPM・28拍・約14秒・本気の前脚11回・フェイント10回)を終えてMISS 3回以内ならCLEAR(判定点+連続+やり過ごしボーナス+残りハート)。MISS 4回で子犬が飽きて寝転びGAME OVER
// @mechanic: freeze
// @theme: shelter_puppy_paw_feint
// 世界観: 動物保護施設の芝生の遊び場で、世話係の職員が、拍の裏に食い込むフェイントを混ぜて前脚を出してくる子犬と向き合い、フェイントには身じろぎせず本気の前脚にだけ手のひらを合わせて遊んでやる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・合わせた前脚の数・やり過ごしたフェイントの数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: MODERN AD-GAME
var STYLE = { bg: ['#38c8ff', '#e8fbff'], main: ['#ffb020', '#3ad06a', '#ff3d8b'], accent: ['#ffe600', '#1a1a2e'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い縁取り・大きなアイコン・飛ぶ数字(+100 / COMBO x3)。3秒で何をするか伝わる画面
  var SKY = STYLE.bg[0], SKY2 = STYLE.bg[1], GOLDF = STYLE.main[0], TURF = STYLE.main[1], PINK = STYLE.main[2];
  var YEL = STYLE.accent[0], INK = STYLE.accent[1];
  var WHITE = '#ffffff', CYAN = '#22d3ff', MAG = '#ff4fd8', RED = '#ff2d3d', TURF2 = '#27a650';

  var GAME_TITLE = 'PAW PAT';
  var BPM = 120;
  var SPB = 60 / BPM;          // 1拍 0.5秒
  var E8 = SPB / 2;            // 8分 0.25秒
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.1, OFF_W = 0.18, FEINT_W = 0.2;
  var READY_T = 0.8;
  var TIME_LIMIT = 14;         // 7小節 × 2秒。放置でも READY 0.8 + 14 + 余韻 2.4 ≒ 17秒で終わる
  var MISS_MAX = 4;
  // 小節ごとの出来事 [8分の位置(偶数=拍の頭・奇数=裏の食い), 側, 本気/フェイント]
  var PLAN = [
    [],
    [[0, 'R', 'real'], [4, 'L', 'real']],
    [[1, 'L', 'feint'], [2, 'L', 'real'], [5, 'R', 'feint'], [6, 'R', 'real']],
    [[3, 'R', 'feint'], [4, 'L', 'real'], [7, 'L', 'feint']],
    [[0, 'R', 'real'], [3, 'L', 'feint'], [5, 'R', 'feint'], [6, 'L', 'real']],
    [[1, 'R', 'feint'], [3, 'L', 'feint'], [4, 'R', 'real'], [7, 'R', 'feint']],
    [[0, 'L', 'real'], [2, 'R', 'real'], [5, 'L', 'feint'], [6, 'R', 'real']]
  ];
  var DEMO_PLAN = [
    [[0, 'R', 'real'], [3, 'L', 'feint'], [4, 'L', 'real']],
    [[1, 'R', 'feint'], [2, 'R', 'real'], [5, 'L', 'feint'], [6, 'L', 'real']],
    [[3, 'R', 'feint'], [4, 'R', 'real'], [6, 'L', 'real']]
  ];
  var DEMO_FAIL = { bar: 2, pos: 3 };   // デモは最後の小節の裏のフェイントにつられて手を出してMISS

  var PUP_X = 540, PUP_Y = 880;
  var HAND_X = { L: 300, R: 780 }, HAND_Y = 1660, HAND_UP = 1440;
  var SHOULDER = { L: 430, R: 650 }, SHOULDER_Y = 1040;
  var PAW_REST = { L: 400, R: 680 }, PAW_REST_Y = 1110;
  var PAW_FULL = { L: 310, R: 770 }, PAW_FULL_Y = 1340;
  var LAMP_Y = 330;

  // ---- スプライト ----
  var PUP = [
    '..ee........ee..',
    '.eeebbbbbbbbeee.',
    '.eebbbbbbbbbbee.',
    '.eebbwwbbwwbbee.',
    '..ebbwkbbwkbbe..',
    '...bbbbbbbbbb...',
    '...bbbwnnwbbb...',
    '....bwwnnwwb....',
    '....bbwwwwbb....',
    '...bbbbbbbbbb...',
    '..bbcccccccccb..',
    '..bbbbbbbbbbbb..',
    '..bbbbbbbbbbbb..',
    '...bbbbbbbbbb...'
  ];
  var PUP_SLY = [
    '..ee........ee..',
    '.eeebbbbbbbbeee.',
    '.eebbbbbbbbbbee.',
    '.eebbbbbbbbbbee.',
    '..ebkkkbbkkkbe..',
    '...bbbbbbbbbb...',
    '...bbbwnnwbbb...',
    '....bwwnnwwb....',
    '....bbwwwwbb....',
    '...bbbbbbbbbb...',
    '..bbcccccccccb..',
    '..bbbbbbbbbbbb..',
    '..bbbbbbbbbbbb..',
    '...bbbbbbbbbb...'
  ];
  var PUP_HAPPY = [
    '.ee..........ee.',
    'eeebbbbbbbbbbeee',
    '.eebbbbbbbbbbee.',
    '.eebkbbbbbbkbee.',
    '..ebbkbbbbkbbe..',
    '...bbbbbbbbbb...',
    '...bbbwnnwbbb...',
    '....bwwnnwwb....',
    '....bbwttwbb....',
    '...bbbbttbbbb...',
    '..bbcccccccccb..',
    '..bbbbbbbbbbbb..',
    '..bbbbbbbbbbbb..',
    '...bbbbbbbbbb...'
  ];
  var PUP_PAL = { e: '#a0561a', b: GOLDF, w: WHITE, k: INK, n: INK, t: PINK, c: CYAN };
  var PAW_REAL = [
    '.bbbbbbbb.',
    'bpbbppbbpb',
    'bbbbbbbbbb',
    'bbbppppbbb',
    'bbppppppbb',
    'bbppppppbb',
    '.bbppppbb.',
    '..bbbbbb..'
  ];
  var PAW_CURL = [
    '..........',
    '.bbbbbbbb.',
    'bkbbkbbkbb',
    'bbbbbbbbbb',
    'bbbbbbbbbb',
    'bbbbbbbbbb',
    '.bbbbbbbb.',
    '..bbbbbb..'
  ];
  var PALM = [
    '.f.f.f.f..',
    '.f.f.f.f..',
    '.f.f.f.f..',
    '.fffffff.f',
    '.fffffffff',
    '.ffffffff.',
    '.fffffff..',
    '..fffff...',
    '..ccccc...',
    '..ccccc...'
  ];
  var HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
  var BONE = ['ww....ww', 'wwwwwwww', 'wwwwwwww', 'ww....ww'];
  var STAR = ['..y..', '.yyy.', 'yyyyy', '.yyy.', '..y..'];
  var ZZ = ['zzzz', '..z.', '.z..', 'zzzz'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, events, reals, nBars, endT, running, songT, schedB, beatN, readyT, realT, hitStop;
  var score, combo, maxCombo, perfects, goods, misses, held, matched, over, won, outroT, prevBest;
  var beatPulse, hands, pupHappy, pupGotcha, contact;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var plan = demoMode ? DEMO_PLAN : PLAN;
    nBars = plan.length;
    events = []; reals = 0;
    for (var k = 0; k < plan.length; k++) {
      for (var i = 0; i < plan[k].length; i++) {
        var p = plan[k][i];
        events.push({ t: (k * 8 + p[0]) * E8, bar: k, pos: p[0], side: p[1], kind: p[2], res: '', cued: false });
        if (p[2] === 'real') reals++;
      }
    }
    endT = nBars * 4 * SPB;
    running = demoMode; songT = demoMode ? -0.3 : 0; schedB = 0; beatN = -1;
    readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; held = 0; matched = 0;
    over = false; won = false; outroT = 0; prevBest = game.best;
    beatPulse = 0; pupHappy = 0; pupGotcha = 0; contact = null;
    hands = { L: { up: 0, flash: 0 }, R: { up: 0, flash: 0 } };
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル、Fメジャーの食い込むファンク)。ベースが2拍目と4拍目の裏に食い込む ----
  var MEL = [
    ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R'],
    ['F5', 'R', 'A5', 'C6', 'R', 'A5', 'R', 'G5'],
    ['F5', 'R', 'D5', 'F5', 'R', 'A5', 'R', 'G5'],
    ['D5', 'R', 'F5', 'Bb5', 'R', 'A5', 'R', 'F5'],
    ['E5', 'R', 'G5', 'C6', 'R', 'Bb5', 'R', 'A5'],
    ['F5', 'R', 'A5', 'C6', 'R', 'D6', 'R', 'C6'],
    ['Bb5', 'R', 'A5', 'G5', 'R', 'E5', 'R', 'F5']
  ];
  var ROOT = [['F2', 'C3'], ['F2', 'C3'], ['D2', 'A2'], ['Bb1', 'F2'], ['C2', 'G2'], ['F2', 'C3'], ['C2', 'G2']];
  function playBeat(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4), i = b % 4;
    var m = MEL[bar % MEL.length], r = ROOT[bar % ROOT.length];
    // ベース: 1拍目の頭・2拍目の裏・3拍目の裏・4拍目の裏(次の小節へ食う)
    var bass = i === 0 ? [[r[0], 0.5], ['R', 0.5]] : (i === 1 ? [['R', 0.5], [r[0], 0.5]] : (i === 2 ? [['R', 0.5], [r[1], 0.5]] : [['R', 0.5], [ROOT[(bar + 1) % ROOT.length][0], 0.5]]));
    game.audio.melody([[m[i * 2], 0.5], [m[i * 2 + 1], 0.5]], { tempo: BPM, wave: 'square', volume: 0.032, bass: bass, bassWave: 'triangle', bassVolume: 0.15 });
    if (i === 1 || i === 3) game.audio.melody([[190, 0.3], ['R', 0.7]], { tempo: BPM, wave: 'sawtooth', volume: 0.05 });
    game.audio.melody([[6200, 0.08], ['R', 0.42], [6200, 0.08], ['R', 0.42]], { tempo: BPM, wave: 'square', volume: i === 0 ? 0.018 : 0.01 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    var nb = nBars * 4;
    while (schedB < nb && songT >= schedB * SPB - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < nb && songT >= (beatN + 1) * SPB) { beatN++; beatPulse = 1; }
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      // 予告音: 本気=ワフッ / フェイント=ふすっ(0.5秒前)
      if (!e.cued && songT >= e.t - 0.5) {
        e.cued = true;
        if (e.kind === 'real') sfx(420, 0.12, { wave: 'triangle', volume: 0.07, slide: -120 });
        else sfx(2400, 0.08, { wave: 'sawtooth', volume: 0.02, slide: -1600 });
      }
      if (e.res) continue;
      if (e.kind === 'real' && songT > e.t + GOOD_W + 0.02) { e.res = 'skip'; missAt(e.side, 'skip'); if (over || hitStop > 0) return; }
      if (e.kind === 'feint' && songT > e.t + FEINT_W) {
        e.res = 'held'; held++;
        score += 30;
        var pp = pawPos(e.side, 0.55);
        game.fx.popup('+30', pp.x, pp.y - 90, { color: CYAN, size: 44 });
        sfx(1320, 0.05, { wave: 'triangle', volume: 0.04 });
      }
    }
    if (songT >= endT + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  // 前脚の伸び(0〜1)と、いちばん伸びている出来事の種類
  function pawState(side) {
    var ext = 0, kind = '', lit = false;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.side !== side) continue;
      var u = songT - e.t, v = 0;
      if (u < -0.3 || u > 0.4) continue;
      if (e.kind === 'real') {
        if (u < -0.24) v = 0;
        else if (u < 0) v = (u + 0.24) / 0.24;
        else if (u < 0.16) v = 1;
        else v = Math.max(0, 1 - (u - 0.16) / 0.2);
      } else {
        if (u < -0.18) v = 0;
        else if (u < 0) v = (u + 0.18) / 0.18 * 0.55;
        else v = Math.max(0, 0.55 * (1 - u / 0.14));
      }
      if (v > ext) { ext = v; kind = e.kind; lit = e.kind === 'real' && v > 0.85; }
    }
    return { ext: ext, kind: kind, lit: lit };
  }
  function pawPos(side, ext) {
    return { x: lerp(PAW_REST[side], PAW_FULL[side], ext), y: lerp(PAW_REST_Y, PAW_FULL_Y, ext) };
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function highFive(side) {
    if (!running || over || hitStop > 0) return;
    hands[side].up = 0.32;
    if (songT < 4 * SPB - OFF_W && !demoMode) { sfx(700, 0.03, { wave: 'square', volume: 0.03 }); return; }   // 前奏の小節は練習(罰なし)
    var best = null, bd = 9, fe = null, fd = 9;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.res) continue;
      var d = Math.abs(songT - e.t);
      if (e.kind === 'real' && d < bd) { bd = d; best = e; }
      if (e.kind === 'feint' && d < fd) { fd = d; fe = e; }
    }
    if (best && bd <= GOOD_W && best.side === side) { hitAt(best, bd); return; }
    if (best && bd <= OFF_W) { best.res = 'miss'; missAt(side, 'off'); return; }
    if (fe && fd <= FEINT_W) fe.res = 'fooled';
    missAt(side, 'move');
  }

  function hitAt(e, d) {
    var w = d <= PERFECT_W ? 'PERFECT' : 'GOOD';
    e.res = w;
    combo++; matched++;
    if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    var pts = (w === 'PERFECT' ? 100 : 60) + 20 * (combo - 1);
    score += pts;
    pupHappy = 0.45;
    var p = pawPos(e.side, 1);
    contact = { x: p.x, y: p.y + 40, t: 0.25 };
    if (demoMode) game.fx.popup(w, p.x, p.y - 140, { color: YEL, size: 54 });
    else game.feedback.good(p.x, p.y - 140, { text: w, color: w === 'PERFECT' ? YEL : WHITE, size: w === 'PERFECT' ? 62 : 50, count: 14 });
    game.fx.popup('+' + pts, p.x, p.y - 60, { color: WHITE, size: 46 });
    game.fx.burst(p.x, p.y + 40, { color: PINK, count: 10, speed: 300 });
    sfx(784, 0.04, { wave: 'square', volume: 0.07 });
    sfx(1568, 0.07, { wave: 'triangle', volume: 0.06 });
    if (combo >= 2) game.fx.popup('COMBO x' + combo, W / 2, 560, { color: PINK, size: 56 + Math.min(combo, 8) * 4 });
    if (!demoMode && (combo === 5 || combo === 9)) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('FEVER', W / 2, 470, { color: YEL, size: 96 });
    }
  }

  function missAt(side, why) {
    misses++; combo = 0;
    hitStop = 0.4; pupGotcha = 0.8;
    hands[side].flash = 0.45;
    var hx = HAND_X[side], hy = why === 'skip' ? PAW_FULL_Y - 120 : HAND_UP - 120;
    sfx(140, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -50 });
    if (demoMode) { game.fx.popup('MISS', hx, hy, { color: RED, size: 64 }); game.fx.shake(5, 0.2); }
    else game.feedback.bad(hx, hy, { text: 'MISS', shake: 10, flashColor: WHITE });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.4; running = false;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 8; i++) game.fx.burst(120 + i * 120, 700 + (i % 3) * 180, { color: [YEL, PINK, CYAN, WHITE][i % 4], count: 18, speed: 460 });
      pupHappy = 2.4;
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hands.L.flash > 0) hands.L.flash -= dt;
    if (hands.R.flash > 0) hands.R.flash -= dt;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (hands.L.up > 0) hands.L.up -= dt;
    if (hands.R.up > 0) hands.R.up -= dt;
    if (pupHappy > 0) pupHappy -= dt;
    if (pupGotcha > 0) pupGotcha -= dt;
    if (contact) { contact.t -= dt; if (contact.t <= 0) contact = null; }
    stepPlay(dt);
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var side = x < W / 2 ? 'L' : 'R';
    game.audio.tone(side === 'L' ? 520 : 620, 0.03, { wave: 'square', volume: 0.03 });
    highFive(side);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function darkPal(pal) { var o = {}; for (var k in pal) o[k] = INK; return o; }
  function spriteOL(art, pal, x, y, px, opts) {
    var o = opts || {}, d = Math.max(4, px * 0.45), dp = darkPal(pal);
    var oo = { anchor: 'center', flipX: !!o.flipX, alpha: o.alpha === undefined ? 1 : o.alpha };
    game.draw.sprite(art, dp, x - d, y, px, oo);
    game.draw.sprite(art, dp, x + d, y, px, oo);
    game.draw.sprite(art, dp, x, y - d, px, oo);
    game.draw.sprite(art, dp, x, y + d, px, oo);
    game.draw.sprite(art, pal, x, y, px, oo);
  }
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x - 4, y, { size: sz, color: INK, bold: true, align: a });
    game.draw.text(str, x + 4, y, { size: sz, color: INK, bold: true, align: a });
    game.draw.text(str, x, y + 6, { size: sz, color: INK, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function ring(x, y, r, col, w) {
    for (var i = 0; i < 20; i++) {
      var a1 = i / 20 * Math.PI * 2, a2 = (i + 1) / 20 * Math.PI * 2;
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, col, w);
    }
  }
  function spike(x, y, r, col) {
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      game.draw.line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, INK, 12);
    }
    for (var j = 0; j < 8; j++) {
      var b = j / 8 * Math.PI * 2;
      game.draw.line(x, y, x + Math.cos(b) * (r - 4), y + Math.sin(b) * (r - 4), col, 6);
    }
    game.draw.circle(x, y, r * 0.45, col);
  }

  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(230, 760, [[0, SKY], [1, SKY2]]);
    // 遠景: 雲と保護施設の屋根(看板は肉球の絵だけ)
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + t * 18) % 1400) - 160;
      game.draw.circle(cx, 470 + c * 30, 50, WHITE);
      game.draw.circle(cx + 50, 455 + c * 30, 60, WHITE);
      game.draw.circle(cx + 110, 472 + c * 30, 44, WHITE);
    }
    game.draw.rect(640, 520, 400, 200, INK);
    game.draw.rect(648, 528, 384, 184, '#ff8a3d');
    for (var r = 0; r < 6; r++) game.draw.line(620 + r * 8, 520 - r * 26, 1060 - r * 8, 520 - r * 26, r % 2 ? RED : '#ff5a5a', 26);
    game.draw.rect(740, 580, 120, 132, INK);
    game.draw.rect(748, 588, 104, 124, '#ffe0b0');
    game.draw.circle(940, 600, 44, INK);
    game.draw.circle(940, 600, 38, WHITE);
    game.draw.circle(940, 610, 14, PINK);
    for (var pd = 0; pd < 3; pd++) game.draw.circle(922 + pd * 18, 588, 7, PINK);
    // 芝生
    game.draw.gradient(720, 1440, [[0, TURF], [1, TURF2]]);
    for (var g = 0; g < 26; g++) {
      var gx = (g * 157) % 1040 + 20, gy = 760 + (g * 89) % 640;
      game.draw.line(gx, gy, gx - 8, gy - 22, TURF2, 5);
      game.draw.line(gx, gy, gx + 8, gy - 20, TURF2, 5);
    }
    // 白い柵(太い縁取り)
    game.draw.rect(0, 700, W, 18, INK);
    game.draw.rect(0, 704, W, 10, WHITE);
    for (var f = 0; f < 11; f++) {
      var fx = 20 + f * 104;
      game.draw.rect(fx - 4, 620, 44, 120, INK);
      game.draw.rect(fx, 626, 36, 110, WHITE);
    }
    // おもちゃ: ボールと結び目のロープと骨形の水皿
    game.draw.circle(150, 1260, 54, INK);
    game.draw.circle(150, 1260, 46, RED);
    game.draw.rect(108, 1252, 84, 14, WHITE);
    game.draw.line(870, 1220, 990, 1300, INK, 26);
    game.draw.line(870, 1220, 990, 1300, '#ffcf3d', 16);
    game.draw.circle(870, 1220, 22, INK); game.draw.circle(870, 1220, 16, CYAN);
    game.draw.circle(990, 1300, 22, INK); game.draw.circle(990, 1300, 16, CYAN);
    // 子犬のマット
    game.draw.circle(PUP_X, 1120, 250, INK, 0.12);
    game.draw.rect(PUP_X - 250, 1060, 500, 110, INK);
    game.draw.rect(PUP_X - 242, 1066, 484, 98, CYAN);
    for (var m = 0; m < 6; m++) game.draw.rect(PUP_X - 230 + m * 80, 1080, 40, 70, '#5ae2ff');
  }

  function warnFor(side) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.kind === 'feint' && !e.res && e.side === side && songT > e.t - 0.75 && songT < e.t + 0.12) return e;
    }
    return null;
  }

  function drawPaw(side, ps) {
    var sx = SHOULDER[side], p = pawPos(side, ps.ext);
    game.draw.line(sx, SHOULDER_Y, p.x, p.y, INK, 92);
    game.draw.line(sx, SHOULDER_Y, p.x, p.y, GOLDF, 74);
    var real = ps.kind === 'real' || ps.ext < 0.02;
    var art = real ? PAW_REAL : PAW_CURL;
    var pal = { b: GOLDF, p: ps.lit ? YEL : PINK, k: INK };
    if (ps.lit) { game.draw.circle(p.x, p.y, 120, YEL, 0.35); ring(p.x, p.y, 112, WHITE, 6); }
    if (ps.kind === 'feint' && ps.ext > 0.05) game.draw.circle(p.x, p.y, 100, RED, 0.22);
    spriteOL(art, pal, p.x, p.y, 15, { flipX: side === 'R' });
  }

  function drawPuppy() {
    var t = game.time.elapsed;
    var sly = warnFor('L') || warnFor('R');
    var art = pupHappy > 0 || (over && won) ? PUP_HAPPY : (sly ? PUP_SLY : PUP);
    var bounce = pupHappy > 0 ? Math.abs(Math.sin(t * 16)) * 26 : Math.sin(t * 4) * 6 + beatPulse * 10;
    var tilt = Math.sin(t * 2.4) * 10;
    if (over && !won) { art = PUP_SLY; bounce = -40; }
    if (pupGotcha > 0 && hitStop <= 0) bounce = Math.sin(pupGotcha * 30) * 18;
    // しっぽ(拍で振る)
    var wag = Math.sin(songT * Math.PI * 2 / SPB) * 70;
    game.draw.line(PUP_X + 120, 1020, PUP_X + 200 + wag, 900, INK, 40);
    game.draw.line(PUP_X + 120, 1020, PUP_X + 200 + wag, 900, GOLDF, 26);
    spriteOL(art, PUP_PAL, PUP_X + tilt, PUP_Y - bounce, 26);
    if (sly) {
      var sp = 0.6 + 0.4 * Math.sin(t * 30);
      game.draw.sprite(STAR, { y: WHITE }, PUP_X - 100 + tilt, PUP_Y - 120 - bounce, 10 * sp, { anchor: 'center' });
      game.draw.sprite(STAR, { y: WHITE }, PUP_X + 120 + tilt, PUP_Y - 110 - bounce, 8 * sp, { anchor: 'center' });
      var wx = sly.side === 'L' ? PUP_X - 280 : PUP_X + 280;
      spike(wx, PUP_Y - 210, 46 + 8 * Math.sin(t * 24), RED);
    }
    if (over && !won && outroT < 1.6) {
      for (var z = 0; z < 3; z++) spriteOL(ZZ, { z: WHITE }, PUP_X + 200 + z * 50, PUP_Y - 220 - z * 60 - ((t * 40) % 30), 9 + z * 3);
    }
  }

  function drawHand(side) {
    var h = hands[side];
    var up = h.up > 0 ? Math.sin(clamp(h.up / 0.32, 0, 1) * Math.PI) : 0;
    var y = lerp(HAND_Y, HAND_UP, up);
    var flash = h.flash > 0 && Math.floor(h.flash * 20) % 2 === 0;
    var sc = h.flash > 0 ? 1.3 : 1;
    var cuff = side === 'L' ? CYAN : MAG;
    var pal = flash ? { f: WHITE, c: WHITE } : { f: '#ffd2a8', c: cuff };
    game.draw.circle(HAND_X[side], y + 20, 150 * sc, cuff, 0.18 + up * 0.25);
    spriteOL(PALM, pal, HAND_X[side], y, 22 * sc, { flipX: side === 'L' });
  }

  function drawLamps() {
    // 上の拍ランプ: 4つの骨(拍の頭)と間の点(裏)。本気の前脚は肉球、フェイントは赤いトゲ(0.75秒前から)
    game.draw.rect(0, LAMP_Y - 90, W, 180, INK, 0.85);
    var bar = Math.max(0, Math.floor(Math.max(0, songT) / (4 * SPB)));
    var pos = songT / E8 - bar * 8;
    for (var i = 0; i < 4; i++) {
      var x = 165 + i * 250, b = bar * 4 + i;
      var now = b === beatN && running;
      game.draw.sprite(BONE, { w: now ? YEL : WHITE }, x, LAMP_Y, now ? 16 + beatPulse * 4 : 14, { anchor: 'center', alpha: b < beatN ? 0.5 : 1 });
      game.draw.circle(x + 125, LAMP_Y + 6, 12, pos > i * 2 + 1 && pos < i * 2 + 2 ? WHITE : '#5a5a7a');
    }
    for (var k = 0; k < events.length; k++) {
      var e = events[k];
      if (e.bar !== bar && !(e.bar === bar + 1 && e.t - songT < 0.75)) continue;
      var lead = e.t - songT;
      if (lead > 0.75 || lead < -0.3) continue;
      var ex = e.bar === bar ? 165 + e.pos * 125 : W - 40;
      if (e.kind === 'real') {
        var col = e.side === 'L' ? CYAN : MAG;
        var off = e.side === 'L' ? -38 : 38;
        game.draw.circle(ex + off, LAMP_Y - 54, 30, INK);
        game.draw.circle(ex + off, LAMP_Y - 54, 24, col);
        game.draw.circle(ex + off, LAMP_Y - 50, 10, WHITE);
        for (var q = 0; q < 3; q++) game.draw.circle(ex + off - 12 + q * 12, LAMP_Y - 66, 5, WHITE);
        if (!e.res) ring(ex, LAMP_Y, 40 + Math.max(0, lead) * 120, col, 5);
      } else if (!e.res) {
        spike(ex, LAMP_Y - 44, 22, RED);
      }
    }
    if (running && pos >= 0 && pos < 8) {
      var cx = 165 + pos * 125;
      game.draw.line(cx, LAMP_Y - 80, cx, LAMP_Y + 80, YEL, 6);
    }
  }

  function drawScene() {
    drawYard();
    drawPuppy();
    var psL = pawState('L'), psR = pawState('R');
    drawPaw('L', psL);
    drawPaw('R', psR);
    if (contact) { ring(contact.x, contact.y, 60 + (0.25 - contact.t) * 400, YEL, 8); }
    // 親指ゾーン
    game.draw.gradient(1440, H, [[0, '#2a2a4a'], [1, INK]]);
    game.draw.rect(0, 1440, W, 12, YEL);
    game.draw.line(W / 2, 1470, W / 2, H - 40, '#4a4a6a', 6);
    drawHand('L');
    drawHand('R');
    drawLamps();
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.04);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK);
    game.draw.rect(0, 222, W, 8, PINK);
    label('SCORE ' + score, 40, 92, 52, WHITE, 'left');
    label('BEST ' + prevBest, 40, 160, 32, YEL, 'left');
    label(matched + ' / ' + reals, W - 40, 92, 52, YEL, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.sprite(HEART, { r: i < MISS_MAX - misses ? PINK : '#444466' }, W - 250 + i * 64, 160, 10, { anchor: 'center' });
    var progress = clamp(songT / endT, 0, 1);
    game.draw.rect(0, 222, W * progress, 8, YEL);
  }

  function drawResult(t) {
    var y0 = H * 0.24, hh = H * 0.37;
    game.draw.rect(56, y0 - 8, W - 112, hh + 16, INK);
    game.draw.rect(64, y0, W - 128, hh, won ? '#2a7cff' : '#5a2a6a');
    game.draw.rect(64, y0, W - 128, 18, won ? YEL : RED);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, won ? YEL : RED);
    label('SCORE ' + score, W / 2, H * 0.36, 64, WHITE);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 34, WHITE);
    label(matched + ' / ' + reals, W / 2, H * 0.45, 54, YEL);
    label('+30 x' + held, W / 2, H * 0.49, 40, CYAN);
    label('COMBO ' + maxCombo, W / 2, H * 0.53, 40, PINK);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.575, 60, YEL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.575, 44, YEL);
    if (!won) label('あと' + Math.max(1, reals - matched) + '回', W / 2, H * 0.21, 64, RED);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.635, 38, WHITE);
  }

  // ---- ATTRACT: ゴーストの手が本気の前脚にだけ左右の手を合わせ、フェイントの間はじっと待つ。最後の小節の裏のフェイントにつられてMISS ----
  var demo = { t: 0, x: HAND_X.R, y: HAND_Y + 40, press: 0, done: {} };
  var DEMO_LEN = 3 * 4 * SPB + 1.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.press = 0; }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
    var next = null;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var fail = e.bar === DEMO_FAIL.bar && e.pos === DEMO_FAIL.pos;
      if ((e.kind === 'real' || fail) && !e.res && !demo.done[i]) { next = e; if (running && hitStop <= 0 && songT >= e.t - 0.008) { demo.done[i] = true; demo.press = 0.16; demo.x = HAND_X[e.side]; highFive(e.side); } break; }
    }
    if (next) demo.x += (HAND_X[next.side] - demo.x) * Math.min(1, dt * 7);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.press > 0 ? HAND_Y - 40 : HAND_Y + 40, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, INK);
      game.draw.rect(0, 222, W, 8, PINK);
      label(GAME_TITLE, W / 2, 124 + Math.sin(t * 3) * 5, 104, Math.floor(t * 3) % 2 ? YEL : WHITE);
      label('HI-SCORE ' + game.best, W / 2, 202, 34, CYAN);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.968, 46, YEL);
      else label('TAP TO START', W / 2, H * 0.968, 42, WHITE);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (pupHappy > 0) pupHappy -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, matched: matched, total: reals, held: held, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = -LEAD; game.audio.play('se_tap', 0.4); }
    } else {
      tickWorld(dt);
      if (!over && realT > READY_T + TIME_LIMIT + 2.5) finish(misses < MISS_MAX);
    }

    drawScene();
    drawHud();
    if (readyT > 0) {
      game.draw.rect(0, H * 0.42, W, 180, INK, 0.9);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 126, 120, YEL);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.5, 110, won ? YEL : RED);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);

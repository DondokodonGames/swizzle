// K-DS-0039v3-ship-wedding-clap-medley.js
// 船上披露宴の手拍子メドレー — 掛け声の山ごとに手拍子を拍へそろえるたび客席の歓声の倍率が伸び、外すと倍率が戻る。拍の型が途中で二度切り替わる
// 操作: 画面のどこを押しても手拍子(押した瞬間で判定)。空の電飾の綱に今の小節の提灯が拍の数だけ並び、光の粒が拍の頭ごとに提灯へ届く。花の印の付いた赤い提灯(掛け声の山)に粒が届く瞬間に押す(ずれでPERFECT/GOOD)。暗い小さな提灯の拍は叩かない(叩くとMISS)。上の細い綱に次の小節が見えている。型が変わる1小節前に汽笛が鳴り、マストの信号旗と次の綱が点滅して予告。4拍の裏打ち(2・4拍)→3拍子(2・3拍)→3つ・3つ・7つの応援拍子へ切り替わる。拍の頭から外れた手拍子・押し漏らしで倍率がx1に戻る
// 終わり: 前奏1小節+10小節(126BPM・40拍・約19秒、手拍子25回)を終えてMISS 4回以内ならCLEAR(得点=判定点×その時の倍率の合計)。MISS 5回で宴が冷めてGAME OVER
// @mechanic: jackpot_combo
// @theme: ship_wedding_clap_medley
// 世界観: 夜の港を出た客船の甲板で開かれる結婚披露宴。招待客たちが掛け声の山ごとに手拍子をそろえ、そろうほど席を立って歓声を上げ、拍の型が変わっても新郎新婦を盛り上げ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(倍率込み)・最大倍率・PERFECT/GOOD/MISS数・そろえた手拍子の数
// スタイル: NEO-RETRO
var STYLE = { bg: ['#1b1f3b', '#3a6b7c'], main: ['#f2e6cc', '#e9a3a6', '#3a6b7c'], accent: ['#ff5e3a', '#f2c14e'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 6色だけ(紺・青緑・クリーム・桃・金 + 差し色の珊瑚色)。12〜16pxの大きなドット
  var NV = STYLE.bg[0], TL = STYLE.bg[1], CR = STYLE.main[0], PK = STYLE.main[1], CO = STYLE.accent[0], GD = STYLE.accent[1];

  var GAME_TITLE = 'CLAP MEDLEY';
  var BPM = 126;
  var SPB = 60 / BPM;
  var LEAD = 0.06;
  var PERFECT_W = 0.045, GOOD_W = 0.1, OFF_W = 0.18;
  var READY_T = 0.8;
  var TIME_LIMIT = 19;          // 40拍 × 0.476秒 ≒ 19.0秒
  var MISS_MAX = 5;
  var MULT_MAX = 8;
  // 小節の並び: n=拍数, pat=手拍子の拍(1)/叩かない拍(0), sec=型(0:裏打ち 1:3拍子 2:応援拍子)
  var A4 = { n: 4, pat: [0, 1, 0, 1], sec: 0 }, B3 = { n: 3, pat: [0, 1, 1], sec: 1 };
  var C1 = { n: 4, pat: [1, 1, 1, 0], sec: 2 }, C2 = { n: 4, pat: [1, 1, 1, 1], sec: 2 };
  var PLAN = [A4, A4, A4, B3, B3, B3, B3, C1, C1, C2, C1];
  var DEMO_PLAN = [A4, A4, B3, B3, C1];
  var DEMO_FAIL = { bar: 3, i: 0 };   // デモは2つめの3拍子小節の1拍目(叩かない拍)で叩いてMISS

  // ---- スプライト ----
  var G_SIT = ['........', '........', '..nnnn..', '..cccc..', '..cccc..', '.pppppp.', 'pppppppp', 'pppppppp', '........', '........'];
  var G_UP = ['c......c', '.c.nn.c.', '..nnnn..', '..cccc..', '..cccc..', '.pppppp.', 'pppppppp', '.pppppp.', '.pp..pp.', '.pp..pp.'];
  var G_CLAP = ['...cc...', '..c..c..', '..nnnn..', '..cccc..', '..cccc..', '.pppppp.', 'pppppppp', '.pppppp.', '.pp..pp.', '.pp..pp.'];
  var G_PAL = [
    { n: NV, c: CR, p: PK }, { n: GD, c: CR, p: TL }, { n: NV, c: CR, p: TL }, { n: CO, c: CR, p: PK }
  ];
  var BRIDE = ['..cccc..', '.cnnnnc.', 'cnppppnc', 'c.pppp.c', 'cccccccc', '.cccccc.', 'cccccccc', 'cccccccc', 'cccccccc'];
  var GROOM = ['..nnnn..', '.nnnnnn.', '..pppp..', '..pppp..', 'nnnccnnn', 'nnncgnnn', 'nnnnnnnn', '.nnnnnn.', '.nn..nn.'];
  var COUPLE_PAL = { c: CR, n: NV, p: PK, g: CO };
  var LANTERN = ['.kkk.', 'lllll', 'lflfl', 'lllll', 'lllll', '.kkk.'];
  var HANDS_OPEN = ['cc....cc', 'cc....cc', 'cc....cc', 'ccc..ccc', '.cc..cc.', '.cc..cc.'];
  var HANDS_CLAP = ['...cc...', '..cccc..', '..cccc..', '.cccccc.', '..cccc..', '..cccc..'];
  var HEART = ['.c.c.', 'ccccc', 'ccccc', '.ccc.', '..c..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, bars, beats, endT, clapTotal, running, songT, schedB, beatN, readyT, realT, hitStop;
  var score, combo, mult, maxMult, perfects, goods, misses, claps, curBar, announce, switchT;
  var over, won, outroT, prevBest, clapT, flashT, flashBeat, beatPulse, sighT, fever, rings;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function buildSong() {
    var plan = demoMode ? DEMO_PLAN : PLAN;
    bars = []; beats = []; clapTotal = 0;
    var t = 0;
    for (var k = 0; k < plan.length; k++) {
      var intro = !demoMode && k === 0;
      bars.push({ n: plan[k].n, pat: plan[k].pat, sec: plan[k].sec, t0: t, intro: intro, first: beats.length });
      for (var i = 0; i < plan[k].n; i++) {
        var clap = plan[k].pat[i] === 1;
        beats.push({ t: t, bar: k, i: i, clap: clap, intro: intro, res: intro ? 'auto' : '' });
        if (clap && !intro) clapTotal++;
        t += SPB;
      }
    }
    endT = t;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    buildSong();
    running = demoMode; songT = demoMode ? -0.3 : 0; schedB = 0; beatN = -1; readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    score = 0; combo = 0; mult = 1; maxMult = 1; perfects = 0; goods = 0; misses = 0; claps = 0; curBar = 0; announce = 0; switchT = 0;
    over = false; won = false; outroT = 0; prevBest = game.best;
    clapT = 0; flashT = 0; flashBeat = -1; beatPulse = 0; sighT = 0; fever = false; rings = [];
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル、Fメジャー)。型ごとに旋律とベースの刻みが変わる ----
  var TUNES = [
    ['C5', 'A4', 'F4', 'A4', 'Bb4', 'C5', 'D5', 'C5', 'A4', 'F4', 'G4', 'A4'],
    ['F5', 'C5', 'A4', 'G5', 'E5', 'C5', 'A5', 'F5', 'C5', 'Bb4', 'A4', 'G4'],
    ['F4', 'A4', 'C5', 'R', 'F4', 'A4', 'C5', 'R', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'F5', 'R']
  ];
  var BASSES = [['F2', 'R', 'C3', 'R'], ['F2', 'A2', 'A2'], ['F2', 'F2', 'C3', 'F2']];
  function playBeat(b) {
    if (demoMode) return;
    var be = beats[b], bar = bars[be.bar], sec = bar.sec;
    var tune = TUNES[sec], bs = BASSES[sec];
    var idx = 0;
    for (var k = 0; k < b; k++) if (bars[beats[k].bar].sec === sec) idx++;
    game.audio.melody([[tune[idx % tune.length], 0.9], ['R', 0.1]], { tempo: BPM, wave: 'square', volume: 0.028, bass: [[bs[be.i % bs.length], 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: be.i === 0 ? 0.16 : 0.11 });
    if (be.clap) game.audio.melody([[sec === 2 ? 90 : 2200, 0.08], ['R', 0.92]], { tempo: BPM, wave: sec === 2 ? 'triangle' : 'square', volume: sec === 2 ? 0.12 : 0.01 });
    if (be.intro && be.clap) game.audio.melody([[1700, 0.05], [1100, 0.05], ['R', 0.9]], { tempo: BPM, wave: 'square', volume: 0.03 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < beats.length && songT >= beats[schedB].t - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < beats.length && songT >= beats[beatN + 1].t) { beatN++; onBeat(beatN); }
    for (var b = Math.max(0, beatN - 2); b <= beatN; b++) {
      var be = beats[b];
      if (be.clap && !be.res && songT > be.t + GOOD_W + 0.02) { be.res = 'skip'; missAt(b); if (over || hitStop > 0) return; }
    }
    if (songT >= endT + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function onBeat(b) {
    beatPulse = 1;
    var be = beats[b];
    curBar = be.bar;
    if (be.intro && be.clap) clapT = 0.16;
    if (be.i === 0) {
      var bar = bars[be.bar], nx = bars[be.bar + 1];
      if (be.bar > 0 && bars[be.bar - 1].sec !== bar.sec) {
        announce = 0; switchT = 0.6;
        if (!demoMode) { game.audio.play('se_powerup', 0.35); game.fx.flash(GD, 0.15); }
      }
      if (nx && nx.sec !== bar.sec) {
        announce = 1;
        sfx(196, 0.35, { wave: 'sawtooth', volume: 0.04 });
        sfx(247, 0.35, { wave: 'square', volume: 0.03 });
      }
    }
  }

  function nearestBeat(t) {
    var best = -1, bd = 9;
    for (var b = Math.max(0, beatN - 1); b < Math.min(beats.length, beatN + 3); b++) {
      var d = Math.abs(t - beats[b].t);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function clapAt() {
    if (!running || hitStop > 0 || over) return;
    rings.push({ t: 0.3 });
    var b = nearestBeat(songT);
    if (b < 0) return;
    var be = beats[b], d = Math.abs(songT - be.t);
    if (be.intro) return;
    if (d > OFF_W) { breakCombo(); return; }
    if (be.res) { sfx(700, 0.03, { wave: 'square', volume: 0.03 }); return; }
    if (!be.clap) {
      if (d <= GOOD_W) { be.res = 'miss'; missAt(b); } else breakCombo();
      return;
    }
    if (d > GOOD_W) { be.res = 'miss'; missAt(b); return; }
    hitAt(b, d);
  }

  function lanternPos(b) {
    var be = beats[b], bar = bars[be.bar];
    return { x: 140 + (be.i + 0.5) * 800 / bar.n, y: 560 };
  }

  function hitAt(b, d) {
    var w = d <= PERFECT_W ? 'PERFECT' : 'GOOD';
    beats[b].res = w;
    combo++; claps++;
    var nm = Math.min(MULT_MAX, 1 + Math.floor(combo / 2));
    var up = nm > mult;
    mult = nm; if (mult > maxMult) maxMult = mult;
    if (w === 'PERFECT') perfects++; else goods++;
    score += (w === 'PERFECT' ? 100 : 60) * mult;
    clapT = 0.18;
    var lp = lanternPos(b);
    if (demoMode) game.fx.popup(w, lp.x, lp.y - 110, { color: GD, size: 46 });
    else game.feedback.good(lp.x, lp.y - 110, { text: w, color: w === 'PERFECT' ? GD : CR, size: w === 'PERFECT' ? 54 : 44, count: 10, volume: 0.1 });
    game.fx.burst(lp.x, lp.y, { color: GD, count: 8, speed: 240 });
    sfx(1800, 0.03, { wave: 'square', volume: 0.06 });
    sfx(1100, 0.04, { wave: 'square', volume: 0.04, slide: -300 });
    if (up) {
      game.fx.popup('x' + mult, W / 2, 1000, { color: CO, size: 70 + mult * 4 });
      sfx(['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'C6', 'F6'][mult - 1], 0.12, { wave: 'triangle', volume: 0.08 });
      for (var i = 0; i < 2; i++) game.fx.burst(120 + game.random(0, 840), 1100 + game.random(0, 200), { color: i ? PK : GD, count: 10, speed: 300 });
    }
    if (!demoMode && mult === MULT_MAX && !fever) {
      fever = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('FEVER', W / 2, 860, { color: GD, size: 110 });
    }
  }

  function breakCombo() {
    var had = mult > 1;
    combo = 0; mult = 1;
    if (had) sighT = 0.5;
    if (!demoMode) game.feedback.bad(W / 2, 1690, { text: null, shake: 2, volume: 0.15 });
  }

  function missAt(b) {
    misses++; combo = 0; mult = 1; sighT = 0.8;
    hitStop = 0.4; flashT = 0.4; flashBeat = b;
    var lp = lanternPos(b);
    sfx(120, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -50 });
    if (demoMode) { game.fx.popup('MISS', lp.x, lp.y - 110, { color: CO, size: 58 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(lp.x, lp.y - 110, { text: 'MISS', shake: 10, flashColor: CR });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += (MISS_MAX - misses) * 100 + maxMult * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 8; i++) game.fx.burst(120 + i * 120, 400 + (i % 3) * 140, { color: [GD, PK, CO, CR][i % 4], count: 18, speed: 440 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    game.audio.tone(1400, 0.02, { wave: 'square', volume: 0.03 });
    clapAt();
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: NV, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ringLine(x, y, r, col, w) {
    for (var i = 0; i < 24; i++) {
      var a1 = i / 24 * Math.PI * 2, a2 = (i + 1) / 24 * Math.PI * 2;
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, col, w);
    }
  }
  function secOf() { return bars[curBar] ? bars[curBar].sec : 0; }

  function drawSky() {
    var t = game.time.elapsed, sec = secOf();
    var low = sec === 0 ? TL : (sec === 1 ? PK : NV);
    game.draw.gradient(230, 780, [[0, NV], [0.65, NV], [1, low]]);
    for (var s = 0; s < 24; s++) {
      if ((s + Math.floor(t * 2)) % 6 === 0) continue;
      game.draw.rect((s * 173) % 1040 + 20, 250 + (s * 97) % 300, 12, 12, sec === 2 ? GD : CR);
    }
    game.draw.circle(190, 330, 56, CR);
    game.draw.circle(214, 316, 50, NV);
    // 海
    game.draw.rect(0, 700, W, 90, NV);
    for (var w = 0; w < 9; w++) {
      var wx = ((w * 137 - t * 40) % 1180 + 1180) % 1180 - 60;
      game.draw.rect(wx, 720 + (w % 3) * 22, 48, 12, TL);
    }
    // マストと信号旗(型の数だけ旗が並ぶ。予告中は次の型の旗が点滅)
    game.draw.rect(964, 250, 16, 540, CR);
    var showSec = announce && Math.floor(t * 8) % 2 === 0 && bars[curBar + 1] ? bars[curBar + 1] : bars[curBar];
    var nf = showSec ? (showSec.sec === 2 ? 5 : showSec.n) : 4;
    for (var f = 0; f < nf; f++) {
      var fc = showSec && showSec.sec === 2 ? (f % 2 ? GD : CO) : (showSec && showSec.sec === 1 ? PK : TL);
      game.draw.rect(980, 270 + f * 52, 60, 40, fc);
      game.draw.rect(980, 270 + f * 52, 60, 8, CR);
    }
  }

  // 電飾の綱: 下=今の小節(大きな提灯)、上=次の小節(小さな提灯)。光の粒が拍の頭ごとに提灯へ届く
  function drawGarland(barIdx, y, scale, isNow) {
    var bar = bars[barIdx];
    if (!bar) return;
    var t = game.time.elapsed;
    var blink = !isNow && announce && Math.floor(t * 8) % 2 === 0;
    var ropeCol = bar.sec === 0 ? TL : (bar.sec === 1 ? PK : GD);
    for (var k = 0; k < 20; k++) {
      var x1 = 100 + k * 43, x2 = 100 + (k + 1) * 43;
      var y1 = y - 40 + Math.sin(k / 20 * Math.PI) * 30, y2 = y - 40 + Math.sin((k + 1) / 20 * Math.PI) * 30;
      game.draw.line(x1, y1, x2, y2, blink ? CR : ropeCol, isNow ? 6 : 4);
    }
    for (var i = 0; i < bar.n; i++) {
      var b = bar.first + i, be = beats[b];
      var x = 140 + (i + 0.5) * 800 / bar.n;
      var sway = Math.sin(t * 2 + i) * 4;
      var flash = isNow && flashT > 0 && hitStop > 0 && flashBeat === b;
      if (be.clap) {
        var lit = be.res && be.res !== 'miss' && be.res !== 'skip';
        var pal = flash ? { k: CR, l: CR, f: CR } : { k: NV, l: lit ? GD : CO, f: lit ? CR : PK };
        var px = (flash ? 22 : 18) * scale;
        if (isNow) {
          var near = clamp(1 - (be.t - songT) / (SPB * 1.2), 0, 1);
          if (!be.res && near > 0) game.draw.circle(x, y + sway, 40 + near * 50, GD, 0.12 + near * 0.18);
        }
        game.draw.sprite(LANTERN, pal, x, y + sway, px, { anchor: 'center', alpha: isNow ? 1 : 0.75 });
      } else {
        game.draw.sprite(LANTERN, flash ? { k: CR, l: CR, f: CR } : { k: NV, l: TL, f: NV }, x, y + 10 + sway, (flash ? 13 : 10) * scale, { anchor: 'center', alpha: isNow ? 1 : 0.75 });
        if (isNow) game.draw.rect(x - 30, y + 64, 60, 8, TL);
      }
    }
    if (isNow && running) {
      var pos = (songT - bar.t0) / SPB;
      if (pos >= -0.2 && pos <= bar.n) {
        var sx = 140 + (pos + 0.5) * 800 / bar.n;
        game.draw.circle(sx, y - 70, 18 + beatPulse * 8, GD);
        game.draw.circle(sx, y - 70, 8, CR);
      }
    }
  }

  function drawDeck() {
    var t = game.time.elapsed;
    // 手すり
    game.draw.rect(0, 780, W, 20, CR);
    for (var p = 0; p < 12; p++) game.draw.rect(20 + p * 92, 800, 14, 60, CR);
    game.draw.rect(0, 860, W, 580, TL);
    for (var pl = 0; pl < 10; pl++) game.draw.rect(0, 880 + pl * 56, W, 6, NV);
    // 花のアーチと新郎新婦
    for (var a = 0; a < 13; a++) {
      var ang = Math.PI + a / 12 * Math.PI;
      game.draw.circle(540 + Math.cos(ang) * 150, 1010 + Math.sin(ang) * 150, 20, a % 2 ? PK : CR);
    }
    var hop = clapT > 0 ? -12 : 0;
    game.draw.sprite(BRIDE, COUPLE_PAL, 490, 960 + hop, 12, { anchor: 'center' });
    game.draw.sprite(GROOM, COUPLE_PAL, 590, 960 + hop, 12, { anchor: 'center' });
    if (sighT <= 0 && mult >= 4) game.draw.sprite(HEART, { c: CO }, 540, 870 + Math.sin(t * 6) * 8, 12, { anchor: 'center' });
    // 招待客: 倍率の数だけ席を立って歓声を上げる
    var seats = [[200, 1100], [420, 1100], [660, 1100], [880, 1100], [130, 1290], [380, 1290], [700, 1290], [950, 1290]];
    var order = [4, 7, 0, 3, 5, 6, 1, 2];
    for (var r = 0; r < 2; r++) {
      for (var g = r * 4; g < r * 4 + 4; g++) {
        var rank = order.indexOf(g);
        var up = rank < mult && sighT <= 0;
        var art = up ? (clapT > 0 ? G_CLAP : G_UP) : G_SIT;
        var bob = up ? Math.round(Math.sin(t * 8 + g) * 4) : 0;
        game.draw.sprite(art, G_PAL[g % 4], seats[g][0], seats[g][1] + bob, 14, { anchor: 'center' });
      }
      var ty = r ? 1340 : 1150;
      game.draw.rect(60, ty, 960, 26, CR);
      game.draw.rect(60, ty + 26, 960, 30, PK);
      for (var c = 0; c < 6; c++) game.draw.rect(140 + c * 160, ty - 18, 20, 20, c % 2 ? GD : CR);
    }
  }

  // 親指ゾーン: 自分の両手と歓声の倍率の段
  function drawThumb() {
    game.draw.gradient(1440, H, [[0, NV], [1, '#11142a']]);
    game.draw.rect(0, 1440, W, 10, CR);
    for (var m = 0; m < MULT_MAX; m++) {
      var on = m < mult;
      game.draw.rect(84 + m * 116, 1478, 96, 44, on ? (m >= 6 ? GD : CO) : TL);
      game.draw.rect(84 + m * 116, 1478, 96, 8, CR, on ? 0.8 : 0.2);
    }
    var art = clapT > 0 ? HANDS_CLAP : HANDS_OPEN;
    var nextClap = null;
    for (var b = Math.max(0, beatN); b < Math.min(beats.length, beatN + 3); b++) if (beats[b].clap && !beats[b].res && beats[b].t > songT - GOOD_W) { nextClap = beats[b]; break; }
    if (nextClap && running) {
      var pr = clamp((nextClap.t - songT) / SPB, 0, 1);
      ringLine(540, 1700, 120 + pr * 140, CR, 6);
    }
    ringLine(540, 1700, 120, GD, 4);
    game.draw.sprite(art, { c: CR }, 540, 1700, 22, { anchor: 'center' });
    for (var i = rings.length - 1; i >= 0; i--) {
      rings[i].t -= game.time.delta;
      if (rings[i].t <= 0) { rings.splice(i, 1); continue; }
      ringLine(540, 1700, 130 + (0.3 - rings[i].t) * 400, GD, 5);
    }
  }

  function drawScene() {
    drawSky();
    drawGarland(curBar + 1, 380, 0.6, false);
    drawGarland(curBar, 590, 1, true);
    drawDeck();
    drawThumb();
    if (switchT > 0) game.draw.rect(0, 230, W, 1210, GD, switchT * 0.25);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.07);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, NV);
    game.draw.rect(0, 222, W, 8, CO);
    label('SCORE ' + score, 44, 90, 50, CR, 'left');
    label('BEST ' + prevBest, 44, 158, 30, GD, 'left');
    label('x' + mult, W / 2, 140 + (mult > 1 ? Math.sin(game.time.elapsed * 10) * 3 : 0), 70 + mult * 4, mult >= MULT_MAX ? GD : CO);
    label(claps + ' / ' + clapTotal, W - 44, 90, 46, CR, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.sprite(HEART, { c: i < MISS_MAX - misses ? PK : TL }, W - 300 + i * 62, 162, 9, { anchor: 'center' });
    var progress = clamp(songT / endT, 0, 1);
    game.draw.rect(0, 214, W * progress, 8, GD);
  }

  function drawResult(t) {
    var y0 = H * 0.24, hh = H * 0.38;
    game.draw.rect(60, y0, W - 120, hh, NV, 0.95);
    game.draw.rect(60, y0, W - 120, 12, won ? GD : CO);
    game.draw.rect(60, y0 + hh - 12, W - 120, 12, PK);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, won ? GD : CO);
    label('SCORE ' + score, W / 2, H * 0.36, 60, CR);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 34, PK);
    label('x' + maxMult, W / 2, H * 0.45, 56, CO);
    label(claps + ' / ' + clapTotal, W / 2, H * 0.495, 46, CR);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 56, GD);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 42, GD);
    if (!won) label('あと' + Math.max(1, clapTotal - claps) + '回', W / 2, H * 0.21, 60, CO);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, CR);
  }

  // ---- ATTRACT: 実ロジックで赤い提灯の拍ごとに手拍子、倍率が伸びる。3拍子の2小節目の1拍目は叩いてしまいMISSで倍率が戻る ----
  var demo = { t: 0, y: 1700, press: 0, done: {} };
  var DEMO_LEN = 18 * SPB + 1.5;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.press = 0; }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
    if (!running || hitStop > 0) return;
    for (var b = Math.max(0, beatN); b < Math.min(beats.length, beatN + 2); b++) {
      var be = beats[b];
      var fail = be.bar === DEMO_FAIL.bar && be.i === DEMO_FAIL.i;
      if ((be.clap || fail) && !be.res && !demo.done[b] && songT >= be.t - 0.008) {
        demo.done[b] = true;
        clapAt();
        demo.press = 0.14;
        break;
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 5);
    if (clapT > 0) clapT -= dt;
    if (flashT > 0) flashT -= dt;
    if (sighT > 0) sighT -= dt;
    if (switchT > 0) switchT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(560, demo.press > 0 ? 1720 : 1680, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, NV);
      game.draw.rect(0, 222, W, 8, CO);
      label(GAME_TITLE, W / 2, 116 + Math.sin(t * 3) * 4, 90, Math.floor(t * 3) % 2 ? CO : CR);
      label('HI-SCORE ' + game.best, W / 2, 196, 36, GD);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, GD);
      else label('TAP TO START', W / 2, H * 0.965, 42, CR);
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
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, maxMult: maxMult, perfect: perfects, good: goods, miss: misses, claps: claps, total: clapTotal };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = -LEAD; game.audio.play('se_tap', 0.4); }
    } else {
      tickWorld(dt);
      if (!over && realT > READY_T + TIME_LIMIT + 2) finish(misses < MISS_MAX);
    }

    drawScene();
    drawHud();
    if (readyT > 0) {
      game.draw.rect(0, H * 0.4, W, 170, NV, 0.9);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 118, 110, GD);
    }
    if (over && outroT > 1.5) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? GD : CO);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);

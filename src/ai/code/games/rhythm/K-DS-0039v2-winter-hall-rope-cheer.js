// K-DS-0039v2-winter-hall-rope-cheer.js
// 公民館のなわとび応援 — 左手で食い込む拍に跳ねる調子を取り、右手で掛け声の山に手拍子を打って、なわとび大会を盛り上げる
// 操作: 画面の左半分=跳ねる(応援係の子が着地する瞬間に押す)、右半分=手拍子(掛け声の山の頂上で押す)。左の帯は左端から粒が流れてきて中央寄りの輪に重なる時が着地。粒の間隔は3・3・2や拍の裏に食い込む型で、子の跳ぶ高さも次の着地までの長さに合わせて変わる。右の帯は掛け声の山なみが右端から流れてきて、山の頂上が輪に重なる時が手拍子(拍の頭)。両方が同時の拍は両手で押す。拍外れ・反対の手・押し漏らしはMISS
// 終わり: 前奏1小節(子のお手本)+6小節(100BPM・28拍・約17秒、跳ね16回+手拍子12回)を終えてMISS 3回以内ならCLEAR(判定の点×連続ボーナス、両手そろいにボーナス)。MISS 4回で子が転んでGAME OVER
// @mechanic: coop_2zone
// @theme: winter_hall_jump_rope_cheer
// 世界観: 冬の公民館のなわとび大会で、はちまきを締めた応援係の子が、大縄の拍に合わせて食い込むリズムで跳ねながら掛け声の山ごとに手拍子を打って跳び手を励ます
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・跳ねと手拍子それぞれの成功数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 8bit HANDHELD
var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f', '#8bac0f'], accent: ['#0f380f', '#9bbc0f'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄りの4階調だけ。残像(前の位置を薄く残す)と低コントラスト、画面枠を描く
  var K0 = '#0f380f', K1 = '#306230', K2 = '#8bac0f', K3 = '#9bbc0f';

  var GAME_TITLE = 'ROPE CHEER';
  var BPM = 100;
  var SPB = 60 / BPM;
  var LEAD = 0.06;
  var PERFECT_W = 0.045, GOOD_W = 0.095, OFF_W = 0.15;
  var READY_T = 0.8;
  var TIME_LIMIT = 17;          // 28拍 × 0.6秒 = 16.8秒
  var MISS_MAX = 4;
  var JUDGE_FROM = 4;
  var LPX = 300;                // 帯の流れる速さ(px/秒)
  var LJX = 400, RJX = 680, LANE_Y = 1360;
  var KX = 540, KY = 1236;      // 応援係の子の足元
  // 1小節ごとの8分の位置(0〜7)。左=食い込む跳ね、右=掛け声の山(拍の頭)
  var LEFT = [[0, 3, 6], [0, 3, 6], [0, 3, 7], [3, 6], [0, 3, 6], [0, 3, 7], [3, 5]];
  var RIGHT = [[2, 6], [2, 6], [6], [2, 4, 6], [2, 6], [2, 6], [2, 6]];
  var DEMO_BARS = 3, DEMO_FAIL = { zone: 'R', bar: 2, pos: 6 };   // デモはこの山で左手を押してMISS

  // ---- スプライト(4階調: k=最暗 d=暗 m=明) ----
  var KID_CROUCH = [
    '............', '....kkkk....', '...kkkkkk...', '..dddddddd..', '...mkmmkm...', '...mmmmmm...', '....mkkm....',
    '..dddddddd..', '.mddddddddm.', '.m.dddddd.m.', '...kkkkkk...', '..kkk..kkk..', '..kk....kk..', '.kkk....kkk.'
  ];
  var KID_AIR = [
    '.m........m.', '.m..kkkk..m.', '.d.kkkkkk.d.', '.dddddddddd.', '.d.mkmmkm.d.', '.d.mmmmmm.d.', '.dd.mkkm.dd.',
    '..dddddddd..', '...dddddd...', '...dddddd...', '...kkkkkk...', '...kk..kk...', '...kk..kk...', '...kk..kk...'
  ];
  var KID_CLAP = [
    '.....mm.....', '....dmmd....', '...dkkkkd...', '..dddddddd..', '...mkmmkm...', '...mmmmmm...', '....mkkm....',
    '..dddddddd..', '...dddddd...', '...dddddd...', '...kkkkkk...', '..kkk..kkk..', '..kk....kk..', '.kkk....kkk.'
  ];
  var KID_FALL = [
    '............', '............', '....kkkk....', '...kkkkkk...', '..dddddddd..', '...kmmmmk...', '...mmmmmm...',
    '..m.kkkk.m..', '.mdddddddddm', '..dddddddd..', '..kkkkkkkk..', '.kk......kk.', 'kk........kk', '............'
  ];
  var KID_PAL = { k: K0, d: K1, m: K2 };
  var INV_PAL = { k: K3, d: K3, m: K3 };
  var JUMPER = [['..kk..', '.kkkk.', '..mm..', '.dddd.', 'd.dd.d', '..dd..', '.k..k.', '.k..k.'],
                ['..kk..', '.kkkk.', 'd.mm.d', '.dddd.', '..dd..', '..dd..', '.kkkk.', '......']];
  var HANDS = ['.k...k.', 'kk...kk', 'kk...kk', 'kkk.kkk', '.kk.kk.', '..k.k..'];
  var SPRING = ['kkkkkkk', '.k...k.', '..k.k..', '.k...k.', '..k.k..', 'kkkkkkk'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, bars, endBeats, cues, lTimes, running, songT, schedB, beatN, readyT, realT, hitStop;
  var score, combo, maxCombo, perfects, goods, misses, hitsL, hitsR, totL, totR, pairs;
  var over, won, outroT, prevBest, clapT, fallT, flashT, flashZone, beatPulse, rings, ghosts, halfDone, combo12;
  var padFx = { L: 0, R: 0 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function eighthT(bar, pos) { return (bar * 4 + pos / 2) * SPB; }

  function buildCues() {
    cues = []; lTimes = []; totL = 0; totR = 0;
    for (var bar = 0; bar < bars; bar++) {
      for (var i = 0; i < LEFT[bar].length; i++) {
        var auto = bar === 0;
        cues.push({ zone: 'L', t: eighthT(bar, LEFT[bar][i]), bar: bar, pos: LEFT[bar][i], res: auto ? 'auto' : '', auto: auto });
        lTimes.push(eighthT(bar, LEFT[bar][i]));
        if (!auto) totL++;
      }
      for (var j = 0; j < RIGHT[bar].length; j++) {
        var au = bar === 0;
        cues.push({ zone: 'R', t: eighthT(bar, RIGHT[bar][j]), bar: bar, pos: RIGHT[bar][j], res: au ? 'auto' : '', auto: au });
        if (!au) totR++;
      }
    }
    cues.sort(function(a, b) { return a.t - b.t; });
    for (var k = 0; k < cues.length; k++) cues[k].id = k;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    bars = demoMode ? DEMO_BARS : LEFT.length;
    endBeats = bars * 4;
    buildCues();
    running = demoMode; songT = demoMode ? -0.2 : 0; schedB = 0; beatN = -1; readyT = demoMode ? 0 : READY_T; realT = 0; hitStop = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hitsL = 0; hitsR = 0; pairs = 0;
    over = false; won = false; outroT = 0; prevBest = game.best;
    clapT = 0; fallT = 0; flashT = 0; flashZone = ''; beatPulse = 0; rings = []; ghosts = []; halfDone = false; combo12 = false;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル): ベースが左手の食い込む型を刻み、掛け声の声が右手の山を歌う。大縄が拍の頭で床を打つ ----
  var BASS = ['D2', 'D2', 'G2', 'A2', 'D2', 'Bb1', 'A1'];
  var PEAK = ['A5', 'A5', 'C6', 'B5', 'A5', 'D6', 'D6'];
  function cueAt(zone, bar, pos) {
    var arr = zone === 'L' ? LEFT[bar] : RIGHT[bar];
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) if (arr[i] === pos) return true;
    return false;
  }
  function playBeat(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4), p0 = (b % 4) * 2;
    var voice = [], bass = [];
    for (var e = 0; e < 2; e++) {
      var pos = p0 + e;
      var nextPeak = pos + 1 < 8 ? cueAt('R', bar, pos + 1) : cueAt('R', bar + 1, 0);
      voice.push([cueAt('R', bar, pos) ? PEAK[bar % PEAK.length] : (nextPeak ? 'E5' : 'R'), 0.5]);
      bass.push([cueAt('L', bar, pos) ? BASS[bar % BASS.length] : 'R', 0.5]);
    }
    game.audio.melody(voice, { tempo: BPM, wave: 'square', volume: 0.034, bass: bass, bassWave: 'triangle', bassVolume: 0.16 });
    game.audio.melody([[1500, 0.06], ['R', 0.44], [900, 0.04], ['R', 0.46]], { tempo: BPM, wave: 'square', volume: 0.012 });
    game.audio.melody([[72, 0.12], ['R', 0.88]], { tempo: BPM, wave: 'triangle', volume: 0.1 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < endBeats && songT >= schedB * SPB - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < endBeats && songT >= (beatN + 1) * SPB) { beatN++; beatPulse = 1; }
    // 前奏のお手本: 子が自分で跳ねて手を叩く
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (c.auto && !c.shown && songT >= c.t) { c.shown = true; if (c.zone === 'R') clapT = 0.16; }
      if (c.res || c.t > songT) continue;
      if (songT > c.t + GOOD_W + 0.02) { missCue(c, 'skip'); if (over || hitStop > 0) return; }
    }
    if (songT >= endBeats * SPB + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function nearestCue(zone, t) {
    var best = null, bd = 9;
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (c.zone !== zone || c.res) continue;
      var d = Math.abs(t - c.t);
      if (d < bd) { bd = d; best = c; }
    }
    return bd <= OFF_W ? best : null;
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function pressZone(z, x, y) {
    if (!running || hitStop > 0 || over) return;
    padFx[z] = 0.15;
    rings.push({ x: x, y: y, t: 0.3 });
    if (songT < (JUDGE_FROM - 0.25) * SPB) return;   // 前奏はお手本を見る間
    var c = nearestCue(z, songT);
    var d = c ? Math.abs(songT - c.t) : 9;
    if (c && d <= GOOD_W) { hitCue(c, d); return; }
    if (c) { missCue(c, 'off'); return; }
    var o = nearestCue(z === 'L' ? 'R' : 'L', songT);
    if (o && Math.abs(songT - o.t) <= GOOD_W) { missCue(o, 'wrong'); return; }
    sfx(z === 'L' ? 200 : 700, 0.04, { wave: 'triangle', volume: 0.04 });
  }

  function judgeXY(zone) { return zone === 'L' ? { x: LJX, y: LANE_Y } : { x: RJX, y: LANE_Y }; }

  function hitCue(c, d) {
    var w = d <= PERFECT_W ? 'PERFECT' : 'GOOD';
    c.res = w;
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    if (c.zone === 'L') hitsL++; else { hitsR++; clapT = 0.16; }
    score += Math.round((w === 'PERFECT' ? 100 : 50) * (1 + Math.floor(combo / 5) * 0.5));
    var jp = judgeXY(c.zone);
    var mate = null;
    for (var i = 0; i < cues.length; i++) if (cues[i] !== c && Math.abs(cues[i].t - c.t) < 0.01) mate = cues[i];
    var both = mate && mate.res && mate.res !== 'miss' && mate.res !== 'auto';
    if (both) { pairs++; score += 80; }
    if (demoMode) game.fx.popup(both ? 'NICE' : w, jp.x, jp.y - 150, { color: K0, size: 48 });
    else game.feedback.good(jp.x, jp.y - 150, { text: both ? 'NICE' : w, color: K0, size: w === 'PERFECT' ? 54 : 44, count: 10, volume: 0.1 });
    game.fx.burst(c.zone === 'L' ? KX - 40 : KX, c.zone === 'L' ? KY : KY - 190, { color: K1, count: 8, speed: 240 });
    if (c.zone === 'L') sfx(170, 0.08, { wave: 'triangle', volume: 0.12, slide: 140 });
    else { sfx(1900, 0.03, { wave: 'square', volume: 0.05 }); sfx(1300, 0.04, { wave: 'square', volume: 0.04 }); }
    if (!demoMode && !halfDone && hitsL + hitsR >= Math.ceil((totL + totR) / 2)) {
      halfDone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE', W / 2, 520, { color: K0, size: 96 });
    }
    if (!demoMode && combo === 12 && !combo12) {
      combo12 = true;
      game.audio.play('se_powerup', 0.35);
      game.fx.popup('12 COMBO', W / 2, 640, { color: K1, size: 76 });
    }
  }

  function missCue(c, why) {
    c.res = 'miss';
    misses++; combo = 0;
    hitStop = 0.35; flashT = 0.35; flashZone = c.zone; fallT = 0.6;
    var jp = judgeXY(c.zone);
    sfx(110, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -40 });
    if (demoMode) { game.fx.popup('MISS', jp.x, jp.y - 150, { color: K0, size: 58 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(jp.x, jp.y - 150, { text: 'MISS', color: K0, flashColor: K3, shake: 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 150;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, 600 + (i % 2) * 200, { color: i % 2 ? K0 : K1, count: 16, speed: 400 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
  }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    var z = x < W / 2 ? 'L' : 'R';
    game.audio.tone(z === 'L' ? 330 : 990, 0.02, { wave: 'square', volume: 0.025 });
    pressZone(z, x, y);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 子の跳ね: 左の着地から次の着地までを放物線で跳ぶ(高さは間の長さの2乗) ----
  function kidHop(t) {
    for (var i = 0; i + 1 < lTimes.length; i++) {
      var t0 = lTimes[i], t1 = lTimes[i + 1];
      if (t >= t0 && t < t1) {
        var T = t1 - t0, u = (t - t0) / T;
        return 220 * (T / 1.2) * (T / 1.2) * 4 * u * (1 - u);
      }
    }
    return 0;
  }

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: col === K0 ? K2 : K0, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ringLine(x, y, r, col, w) {
    for (var i = 0; i < 20; i++) {
      var a1 = i / 20 * Math.PI * 2, a2 = (i + 1) / 20 * Math.PI * 2;
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, col, w);
    }
  }

  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(230, 1000, [[0, K2], [1, K3]]);
    // 窓の外は雪
    for (var w = 0; w < 3; w++) {
      var wx = 90 + w * 330;
      game.draw.rect(wx, 290, 240, 200, K1);
      for (var s = 0; s < 10; s++) {
        var sx = wx + ((s * 47 + t * 20) % 230), sy = 290 + ((s * 61 + t * 60) % 196);
        game.draw.rect(sx, sy, 8, 8, K3);
      }
      game.draw.rect(wx + 116, 290, 8, 200, K0);
      game.draw.rect(wx - 8, 282, 256, 8, K0);
      game.draw.rect(wx - 8, 490, 256, 8, K0);
    }
    // 三角の小旗(拍で揺れる)
    for (var f = 0; f < 18; f++) {
      var fx = 30 + f * 60, sway = Math.sin(t * 3 + f) * 3 + beatPulse * 4;
      for (var r = 0; r < 4; r++) game.draw.rect(fx + r * 6, 520 + r * 8 + sway, 36 - r * 12, 8, f % 2 ? K0 : K1);
    }
    game.draw.line(0, 518, W, 518, K0, 3);
    // 板張りの床
    game.draw.rect(0, 800, W, 640, K2);
    for (var fl = 0; fl < 11; fl++) game.draw.rect(0, 820 + fl * 58, W, 4, K1);
    for (var v = 0; v < 6; v++) game.draw.rect(90 + v * 180 + (v % 2) * 40, 800, 4, 640, K3);
  }

  // 大縄: 1拍で1回転、拍の頭で床を打つ
  function drawRope() {
    var ph = songT / SPB;
    var c = Math.cos(ph * Math.PI * 2);
    var ropeY = 690 + 150 * c;            // 頭で床(840)、拍の裏で上(540)
    var front = Math.sin(ph * Math.PI * 2) > 0;
    var x0 = 170, x1 = 910, hy = 690;
    var pts = [];
    for (var i = 0; i <= 16; i++) {
      var u = i / 16;
      pts.push({ x: x0 + (x1 - x0) * u, y: hy + (ropeY - hy) * Math.sin(Math.PI * u) });
    }
    function rope(col) { for (var k = 0; k < 16; k++) game.draw.line(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y, col, 8); }
    if (!front) rope(K1);
    // 跳び手3人(縄が足元を通る頭で空中)
    for (var j = 0; j < 3; j++) {
      var jh = Math.max(0, c) * 60;
      game.draw.sprite(JUMPER[jh > 20 ? 1 : 0], KID_PAL, 420 + j * 120, 790 - jh, 9, { anchor: 'center' });
    }
    if (front) rope(K0);
    // 回し手
    game.draw.sprite(JUMPER[0], KID_PAL, x0 - 40, 750, 10, { anchor: 'center' });
    game.draw.sprite(JUMPER[0], KID_PAL, x1 + 40, 750, 10, { anchor: 'center', flipX: true });
    if (Math.abs(ropeY - 840) < 12) game.draw.rect(400, 836, 280, 6, K0);
  }

  function drawKid() {
    var h = running || demoMode ? kidHop(songT) : 0;
    var art = fallT > 0 ? KID_FALL : (clapT > 0 ? KID_CLAP : (h > 30 ? KID_AIR : KID_CROUCH));
    var y = KY - 7 * 11 - h;
    // 残像(液晶の尾)
    for (var g = 0; g < ghosts.length; g++) game.draw.sprite(ghosts[g].art, KID_PAL, KX, ghosts[g].y, 11, { anchor: 'center', alpha: 0.18 + g * 0.06 });
    ghosts.push({ art: art, y: y });
    if (ghosts.length > 3) ghosts.shift();
    // マット
    game.draw.rect(KX - 110, KY, 220, 18, K1);
    game.draw.rect(KX - 110, KY, 220, 4, K0);
    var fl = hitStop > 0 && flashT > 0 && Math.floor(flashT * 20) % 2 === 0;
    game.draw.sprite(art, fl ? INV_PAL : KID_PAL, KX, y, hitStop > 0 ? 12 : 11, { anchor: 'center' });
    if (fl) ringLine(KX, y, 110, K0, 6);
  }

  // 左の帯: 着地の粒が左端から流れて輪へ。右の帯: 掛け声の山なみが右端から流れて輪へ
  function drawLanes() {
    game.draw.rect(20, LANE_Y - 60, W - 40, 120, K3);
    game.draw.rect(20, LANE_Y - 60, W - 40, 6, K1);
    game.draw.rect(20, LANE_Y + 54, W - 40, 6, K1);
    game.draw.line(30, LANE_Y + 30, LJX, LANE_Y + 30, K1, 4);
    game.draw.line(RJX, LANE_Y + 30, W - 30, LANE_Y + 30, K1, 4);
    // 拍の目盛り(左右両方の帯)
    for (var b = Math.max(0, beatN - 1); b <= Math.min(endBeats, beatN + 5); b++) {
      var dt0 = b * SPB - songT;
      var lx = LJX - dt0 * LPX, rx = RJX + dt0 * LPX;
      if (lx > 20 && lx <= LJX + 4) game.draw.rect(lx - 2, LANE_Y + 18, 4, 28, K1);
      if (rx < W - 20 && rx >= RJX - 4) game.draw.rect(rx - 2, LANE_Y + 18, 4, 28, K1);
    }
    // 右: 山なみ
    var prev = null;
    for (var s = 0; s <= 30; s++) {
      var tt = songT + s * 0.05;
      var hgt = 0;
      for (var i = 0; i < cues.length; i++) {
        var c = cues[i];
        if (c.zone !== 'R') continue;
        var dd = Math.abs(tt - c.t);
        if (dd < 0.3) hgt = Math.max(hgt, (1 - dd / 0.3) * (1 - dd / 0.3) * 110);
      }
      var pt = { x: RJX + s * 0.05 * LPX, y: LANE_Y + 24 - hgt };
      if (pt.x > W - 26) break;
      if (prev) game.draw.line(prev.x, prev.y, pt.x, pt.y, K0, 7);
      prev = pt;
    }
    for (var r = 0; r < cues.length; r++) {
      var q = cues[r];
      var dq = q.t - songT;
      if (dq < -0.3 || dq > 1.5) continue;
      if (q.zone === 'R') {
        var px = RJX + dq * LPX;
        if (px > W - 30 || px < RJX - 60) continue;
        var col = q.res === 'miss' ? K2 : (q.res && q.res !== 'auto' ? K2 : K0);
        game.draw.rect(px - 14, LANE_Y - 70, 28, 28, col);
        game.draw.rect(px - 4, LANE_Y - 80, 8, 48, col);
      } else {
        var lx2 = LJX - dq * LPX;
        if (lx2 < 30 || lx2 > LJX + 60) continue;
        var lc = q.res === 'miss' ? K2 : (q.res && q.res !== 'auto' ? K2 : (q.auto ? K1 : K0));
        game.draw.circle(lx2, LANE_Y + 6, 26, lc);
        game.draw.circle(lx2, LANE_Y + 6, 9, K3);
      }
    }
    // 判定の輪
    var fl = flashT > 0 && hitStop > 0;
    ringLine(LJX, LANE_Y + 6, 34 + beatPulse * 6, fl && flashZone === 'L' ? K0 : K1, fl && flashZone === 'L' ? 10 : 6);
    ringLine(RJX, LANE_Y - 12, 40 + beatPulse * 6, fl && flashZone === 'R' ? K0 : K1, fl && flashZone === 'R' ? 10 : 6);
  }

  // 親指ゾーン: 左=跳ねる(ばね)、右=手拍子(両手)
  function drawPads() {
    game.draw.gradient(1440, H, [[0, K2], [1, K1]]);
    var t = game.time.elapsed;
    for (var s = 0; s < 2; s++) {
      var z = s ? 'R' : 'L';
      var x0 = s ? 552 : 28;
      var c = null;
      for (var i = 0; i < cues.length; i++) if (cues[i].zone === z && !cues[i].res && cues[i].t - songT < 0.45 && cues[i].t - songT > -GOOD_W) { c = cues[i]; break; }
      var hot = c && running && Math.floor(t * 10) % 2 === 0;
      var pr = padFx[z] > 0;
      game.draw.rect(x0, 1466 + (pr ? 8 : 0), 500, 400, hot ? K3 : K2);
      game.draw.rect(x0, 1466 + (pr ? 8 : 0), 500, 10, K0);
      game.draw.rect(x0, 1856 + (pr ? 8 : 0), 500, 10, K0);
      game.draw.rect(x0, 1466 + (pr ? 8 : 0), 10, 400, K0);
      game.draw.rect(x0 + 490, 1466 + (pr ? 8 : 0), 10, 400, K0);
      if (z === 'L') game.draw.sprite(SPRING, { k: K0 }, x0 + 250, 1666 + (pr ? 18 : 0), 26, { anchor: 'center' });
      else game.draw.sprite(HANDS, { k: K0 }, x0 + 250, 1666 + (pr ? 8 : 0), 30, { anchor: 'center' });
    }
  }

  function drawBezel() {
    game.draw.rect(0, 0, W, 12, K0);
    game.draw.rect(0, H - 12, W, 12, K0);
    game.draw.rect(0, 0, 12, H, K0);
    game.draw.rect(W - 12, 0, 12, H, K0);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, K0, 0.06);
  }

  function drawScene(dt) {
    drawHall();
    drawRope();
    drawKid();
    drawLanes();
    drawPads();
    for (var i = rings.length - 1; i >= 0; i--) {
      rings[i].t -= dt;
      if (rings[i].t <= 0) { rings.splice(i, 1); continue; }
      ringLine(rings[i].x, rings[i].y, 30 + (0.3 - rings[i].t) * 240, K0, 4);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, K3);
    game.draw.rect(0, 222, W, 8, K0);
    label('SCORE ' + score, 44, 92, 50, K0, 'left');
    label('BEST ' + prevBest, 44, 158, 30, K1, 'left');
    label((hitsL + hitsR) + ' / ' + (totL + totR), W - 44, 92, 50, K0, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.rect(W - 296 + i * 66, 146, 40, 40, i < misses ? K0 : K2);
    if (combo >= 2) label('x' + combo, W / 2, 160, 40, K1);
    var progress = clamp(songT / (endBeats * SPB), 0, 1);
    game.draw.rect(20, 208, (W - 40) * progress, 8, K1);
  }

  function drawResult(t) {
    var y0 = H * 0.24, hh = H * 0.38;
    game.draw.rect(60, y0, W - 120, hh, K3);
    game.draw.rect(60, y0, W - 120, 12, K0);
    game.draw.rect(60, y0 + hh - 12, W - 120, 12, K0);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, K0);
    label('SCORE ' + score, W / 2, H * 0.36, 58, K0);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 34, K1);
    label(hitsL + ' / ' + totL, W * 0.3, H * 0.455, 46, K0);
    label(hitsR + ' / ' + totR, W * 0.7, H * 0.455, 46, K0);
    game.draw.sprite(SPRING, { k: K1 }, W * 0.3, H * 0.495, 8, { anchor: 'center' });
    game.draw.sprite(HANDS, { k: K1 }, W * 0.7, H * 0.495, 8, { anchor: 'center' });
    label(maxCombo + ' COMBO', W / 2, H * 0.535, 40, K1);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.58, 52, K0);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.58, 40, K0);
    if (!won) label('あと' + Math.max(1, totL + totR - hitsL - hitsR) + '回', W / 2, H * 0.21, 60, K0);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.61, 34, K1);
  }

  // ---- ATTRACT: 実ロジックで左右の指が拍を取る。3小節目の最後の山は左手を押してしまいMISS ----
  var demo = { t: 0, l: { x: 278, y: 1690 }, r: { x: 802, y: 1690 }, pl: 0, pr: 0, done: {} };
  var DEMO_LEN = DEMO_BARS * 4 * SPB + 1.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; demo.pl = 0; demo.pr = 0; }
    if (demo.pl > 0) demo.pl -= dt;
    if (demo.pr > 0) demo.pr -= dt;
    tickWorld(dt);
    if (running && hitStop <= 0) {
      for (var i = 0; i < cues.length; i++) {
        var c = cues[i];
        if (c.auto || c.res || demo.done[c.id] || songT < c.t - 0.008) continue;
        demo.done[c.id] = true;
        var fail = c.zone === DEMO_FAIL.zone && c.bar === DEMO_FAIL.bar && c.pos === DEMO_FAIL.pos;
        var z = fail ? 'L' : c.zone;
        if (z === 'L') { pressZone('L', 278, 1690); demo.pl = 0.14; }
        else { pressZone('R', 802, 1690); demo.pr = 0.14; }
        if (hitStop > 0) break;
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 5);
    if (clapT > 0) clapT -= dt;
    if (fallT > 0 && hitStop <= 0) fallT -= dt;
    if (flashT > 0) flashT -= dt;
    padFx.L = Math.max(0, padFx.L - dt); padFx.R = Math.max(0, padFx.R - dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.l.x, demo.l.y + (demo.pl > 0 ? 10 : -20), { press: demo.pl > 0, scale: 14 });
      game.draw.hand(demo.r.x, demo.r.y + (demo.pr > 0 ? 10 : -20), { press: demo.pr > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, K3);
      game.draw.rect(0, 222, W, 8, K0);
      label(GAME_TITLE, W / 2, 116 + Math.sin(t * 3) * 4, 92, Math.floor(t * 3) % 2 ? K0 : K1);
      label('HI-SCORE ' + game.best, W / 2, 196, 36, K1);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, K0);
      else label('TAP TO START', W / 2, H * 0.965, 42, K0);
      drawBezel();
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(t);
      drawBezel();
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, bounce: hitsL, claps: hitsR, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, pairs: pairs };
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

    drawScene(dt);
    drawHud();
    if (readyT > 0) {
      game.draw.rect(0, H * 0.4, W, 170, K3);
      game.draw.rect(0, H * 0.4, W, 8, K0);
      game.draw.rect(0, H * 0.4 + 162, W, 8, K0);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 118, 110, K0);
    }
    if (over && outroT > 1.5) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, K0);
    else if (over) drawResult(t);
    drawBezel();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);

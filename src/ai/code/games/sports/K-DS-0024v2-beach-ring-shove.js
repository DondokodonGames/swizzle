// K-DS-0024v2-beach-ring-shove.js
// 砂の輪の押しくら — 食い込んだ拍で相手のかかとが砂に取られた瞬間だけ押し込み、一歩ずつ砂の円の外へ押し出す
// 操作: 画面を押している間は腰を落として溜め、指を離した瞬間に両手で押す(判定は離した瞬間)。相手の構えが崩れるのは拍の頭の半拍前(食いの裏)だけで、円のまわりの貝殻に光の波が届く瞬間。そこで離せばPERFECT/GOODで相手が一歩外へ。3/4拍以上溜めてからのPERFECTは溜め押し(大きく押して高得点)。構えている拍や、肩だけ揺らすフェイントの拍に離すと弾かれて一歩下がる。崩れを見送ると相手が寄ってきて一歩下がる。崩れの0.75秒前に貝殻が点滅し、0.5秒前にかかとの砂が鳴る
// 終わり: 相手を円の外まで押し出せばCLEAR(判定点+溜め押し+連続+残り拍)。自分が円の外まで下がるか、10小節(120BPM・20秒)で押し出せなければGAME OVER
// @mechanic: push_out
// @theme: beach_sand_ring_shove
// 世界観: 夕方の浜辺。漁師の子どもたちが砂に描いた円の中で押し合い遊びをし、相手のかかとが砂に取られる食い込んだ拍だけを見切って一歩ずつ円の外へ押し出す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・押し出した最大歩数・PERFECT/GOOD/MISS数・溜め押し数・最大連続
// スタイル: 70s MONO
var STYLE = { bg: ['#05060a', '#0d0f18'], main: ['#f4f4f4', '#6ff0ff', '#ffb347'], accent: ['#ff5fb0', '#9dff6a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドットだけで描き、横の帯ごとにセロハンの単色を重ねる。矩形波の単音と無音の間
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], white: STYLE.main[0], cyan: STYLE.main[1], amber: STYLE.main[2],
    pink: STYLE.accent[0], green: STYLE.accent[1], ink: '#000000'
  };
  // セロハン帯: HUD=琥珀 / 海=水色 / 砂の円=白 / 波打ち際=黄緑 / 親指ゾーン=桃
  var B1 = 230, B2 = 560, B3 = 1310, B4 = 1460;
  function bandCol(y) { return y < B1 ? C.amber : (y < B2 ? C.cyan : (y < B3 ? C.white : (y < B4 ? C.green : C.pink))); }

  var GAME_TITLE = 'SAND RING SHOVE';
  var BPM = 120, SPB = 60 / BPM, E8 = SPB / 2, BAR = SPB * 4;
  var BARS = 10;
  var TIME_LIMIT = 20;                 // 10小節 × 2秒
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.1;
  var CHARGE_T = SPB * 0.75;           // これ以上溜めてからのPERFECTは溜め押し(大きく押して高得点)
  var TELE_T = 0.75;                   // 貝殻の点滅は崩れの0.75秒前から
  var GOAL = 10, LOSE = -6;            // 押し合いの歩数: +10で相手が円の外 / -6で自分が円の外
  var CX = 540, CY = 860, R = 400;
  var KID_OFF = 100;
  var STEP = (2 * R - 2 * KID_OFF) / (GOAL - LOSE);
  var Y0 = CY - R + KID_OFF + GOAL * STEP;  // 押し合いの接点(0歩)
  var RING_R = R + 62;                 // 拍の輪(貝殻の並ぶ円)
  var PAD_X = 540, PAD_Y = 1610;

  // 1小節8つの8分。o=相手が崩れる食いの裏(奇数) / f=肩だけ揺らすフェイント(拍の頭)
  var POOL_A = [{ o: [7], f: [] }, { o: [3], f: [] }];
  var POOL_B = [{ o: [3, 7], f: [] }, { o: [3, 7], f: [] }, { o: [1, 7], f: [] }, { o: [3, 5], f: [] }];
  var POOL_C = [{ o: [3, 7], f: [4] }, { o: [1, 5], f: [2] }, { o: [3, 7], f: [6] }, { o: [1, 3, 7], f: [] }, { o: [5, 7], f: [2] }];
  var DEMO_PAT = [{ o: [3, 7], f: [] }, { o: [7], f: [4] }];

  // 伴奏(オリジナル)。食いの裏で次の拍のベースを先取りし、その拍の頭は鳴らさない
  var ROOTS = ['A2', 'F2', 'G2', 'E2'];
  var LEAD = [
    ['A4', 0, 0, 'C5', 0, 0, 'E5', 0],
    ['D5', 0, 0, 'C5', 0, 0, 'A4', 0],
    ['G4', 0, 0, 'A4', 0, 0, 'C5', 0],
    ['B4', 0, 0, 'G4', 0, 'E4', 0, 0]
  ];

  // ---- スプライト(単色。帯の色で塗る) ----
  var OPP = [
    ['...wwwww...', '..wwwwwww..', '.wwwwwwwww.', '.ww.www.ww.', '.wwwwwwwww.', '..www.www..', '...wwwww...', 'ww.wwwww.ww', 'ww.wwwww.ww', '.wwwwwwwww.', '...wwwww...', '...ww.ww...', '...ww.ww...', '..www.www..'],
    ['...wwwww...', '..wwwwwww..', '.wwwwwwwww.', '.ww.www.ww.', '.wwwwwwwww.', '..www.www..', '...wwwww...', '.w.wwwww.w.', 'ww.wwwww.ww', 'wwwwwwwwwww', '...wwwww...', '...ww.ww...', '...ww.ww...', '..www.www..']
  ];
  var OPP_SLIP = ['w..wwwww..w', 'w.wwwwwww.w', 'wwwwwwwwwww', '.ww.www.ww.', '.wwwwwwwww.', '..ww...ww..', '...wwwww...', '...wwwww...', '...wwwww...', '...wwwww...', '...ww.ww...', '..ww...ww..', '.ww.....ww.', 'ww.......ww'];
  var PLY = ['.w.......w.', '.ww.....ww.', '..w.www.w..', '..wwwwwww..', '..wwwwwww..', '...wwwww...', '..wwwwwww..', '.wwwwwwwww.', '.ww.....ww.', '.wwwwwwwww.', '...ww.ww...', '...ww.ww...', '..www.www..'];
  var PLY_CROUCH = ['...........', '...........', '....www....', '...wwwww...', '...wwwww...', 'w...www...w', 'ww.wwwww.ww', '.wwwwwwwww.', '.ww.....ww.', '.wwwwwwwww.', '.www...www.', 'ww.......ww', 'w.........w'];
  var PLY_SHOVE = ['w.........w', 'w.........w', 'ww.......ww', '.w.......w.', '.ww.www.ww.', '..wwwwwww..', '..wwwwwww..', '...wwwww...', '..wwwwwww..', '.ww.....ww.', '.wwwwwwwww.', '...ww.ww...', '..ww...ww..'];
  var SHELL = ['..w..', '.www.', 'w.w.w', 'wwwww', '.www.'];
  var GULL = [['w...w', '.w.w.', '..w..'], ['.....', 'wwwww', '..w..']];
  var BOAT = ['....w.....', '....ww....', '....www...', 'wwwwwwwwww', '.wwwwwwww.'];
  var STAR = ['...w...', '...w...', 'wwwwwww', '.wwwww.', '..www..', '.ww.ww.', 'ww...ww'];
  var PALM = ['.w.w.w.', '.w.w.w.', 'wwwwwww', 'wwwwwww', '.wwwww.', '..www..'];

  function pal(y) { return { w: bandCol(y) }; }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, evs, feints, openAt, p, pVis, bestP, score, combo, maxCombo, nPerfect, nGood, nMiss, nCharge;
  var held, holdStart, hitStop, over, won, timeUp, outroT, lastE, lastCue, realT, demoMode, prevBest, resultT;
  var beatPulse, feintT, oppLeanT, oppHitT, shoveT, failFlash, fallT, puffs, rings, milestoneDone, chargedCue;

  function buildEvents(demo) {
    var bars = [];
    if (demo) bars = DEMO_PAT;
    else {
      for (var b = 0; b < BARS; b++) {
        var pool = b < 2 ? POOL_A : (b < 6 ? POOL_B : POOL_C);
        bars.push(pool[Math.floor(game.random(0, pool.length)) % pool.length]);
      }
    }
    evs = []; feints = []; openAt = {};
    for (var bb = 0; bb < bars.length; bb++) {
      for (var i = 0; i < bars[bb].o.length; i++) {
        var ei = bb * 8 + bars[bb].o[i];
        evs.push({ i: ei, k: ei % 8, t: ei * E8, res: 0, puffed: false });
        openAt[ei] = true;
      }
      for (var j = 0; j < bars[bb].f.length; j++) {
        var fi = bb * 8 + bars[bb].f[j];
        feints.push({ i: fi, t: fi * E8, done: false });
      }
    }
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    buildEvents(demo);
    p = 0; pVis = 0; bestP = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nCharge = 0;
    held = false; holdStart = 0; hitStop = 0; over = false; won = false; timeUp = false; outroT = 0; lastE = -1; lastCue = -1; realT = 0;
    prevBest = game.best; resultT = 0;
    beatPulse = 0; feintT = 0; oppLeanT = 0; oppHitT = 0; shoveT = 0; failFlash = false; fallT = 0;
    puffs = []; rings = []; milestoneDone = false; chargedCue = false;
  }

  function lineY(v) { return Y0 - v * STEP; }

  // ---- 拍クロック(8分単位) ----
  // 伴奏は1拍ずつ melody で先読み予約(拍の頭の0.06秒前)。食いの裏で次の拍のベースを先取りし、その拍の頭は休む
  function cueBeats() {
    var q = Math.floor((clock + 0.06) / SPB);
    if (q > lastCue && q >= 0 && q < BARS * 4) { lastCue = q; if (!demoMode) playBeat(q); }
  }
  function playBeat(q) {
    var e0 = q * 2, e1 = e0 + 1, bar = Math.floor(e0 / 8), k0 = e0 % 8;
    var tied = openAt[e0 - 1];
    var l0 = tied ? 'R' : (LEAD[bar % 4][k0] || 'R'), l1 = LEAD[bar % 4][k0 + 1] || 'R';
    var b0 = tied ? 'R' : ((k0 === 0 || k0 === 4) ? ROOTS[bar % 4] : 'R');
    var b1 = openAt[e1] ? ROOTS[Math.floor((e1 + 1) / 8) % 4] : 'R';
    game.audio.melody([[l0, 0.5], [l1, 0.5]], { tempo: BPM, wave: 'square', volume: 0.03, bass: [[b0, 0.5], [b1, 0.5]], bassWave: 'triangle', bassVolume: 0.12 });
  }
  function onEighth(i) {
    if (i < 0 || i > BARS * 8) return;
    var k = i % 8;
    if (k % 2 === 0) beatPulse = 1;
    if (demoMode || i === BARS * 8) return;
    if (openAt[i]) {
      game.audio.tone('E5', E8 * 2.2, { wave: 'square', volume: 0.04 });
      game.audio.tone(1760, 0.03, { wave: 'square', volume: 0.025 });
      return;
    }
    if (openAt[i - 1]) return;   // 食った次の拍の頭は無音(間で緊張を作る)
    if (k === 2 || k === 6) game.audio.tone(1320, 0.02, { wave: 'square', volume: 0.018 });
  }

  function stepRun(dt) {
    clock += dt;
    if (feintT > 0) feintT -= dt;
    if (oppLeanT > 0) oppLeanT -= dt;
    if (oppHitT > 0) oppHitT -= dt;
    if (shoveT > 0) shoveT -= dt;
    cueBeats();
    var ei = Math.floor(clock / E8);
    while (lastE < ei) { lastE++; onEighth(lastE); }
    if (over) return;
    if (held && !chargedCue && clock - holdStart >= CHARGE_T) {
      chargedCue = true;
      if (!demoMode) game.audio.tone(988, 0.05, { wave: 'square', volume: 0.04 });
    }
    for (var j = 0; j < evs.length; j++) {
      var e = evs[j];
      // 予告: 崩れの0.5秒前にかかとの砂がずれる(音+砂煙)
      if (!e.puffed && clock >= e.t - 0.5) {
        e.puffed = true;
        puffs.push({ x: CX + 50, y: lineY(pVis) - 20, t: 0 });
        if (!demoMode) game.audio.tone(170, 0.09, { wave: 'triangle', volume: 0.05, slide: -60 });
      }
      // 崩れを見送った → 相手が立て直して寄ってくる
      if (!e.res && clock > e.t + GOOD_W) {
        e.res = 3; oppLeanT = 0.3;
        pushBack(1);
        if (over || hitStop > 0) return;
      }
    }
    for (var f = 0; f < feints.length; f++) {
      var fe = feints[f];
      if (!fe.done && clock >= fe.t - 0.03) {
        fe.done = true; feintT = 0.24;
        if (!demoMode) game.audio.tone(260, 0.05, { wave: 'sawtooth', volume: 0.03 });
      }
    }
    if (!demoMode && clock >= TIME_LIMIT + GOOD_W) { timeUp = true; finishRun(false); }
  }

  // ---- 押し引き ----
  function pushForward(grade, charged) {
    var n = charged ? 2 : 1;   // 2 = 溜め押し(歩数は1歩、演出と得点が大きい)
    p += 1; bestP = Math.max(bestP, p);
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    if (n === 2) nCharge++;
    oppHitT = 0.3; shoveT = 0.22;
    score += (grade === 1 ? 120 : 70) + (n === 2 ? 150 : 0) + Math.min(10, combo) * 10;
    var y = lineY(p);
    game.feedback.good(CX, y - 150, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.amber : C.white, size: grade === 1 ? 58 : 46,
      count: n === 2 ? 22 : 12, flashColor: C.white, volume: demoMode ? 0.03 : 0.15
    });
    rings.push({ x: CX, y: y, t: 0, big: n === 2 });
    if (!demoMode) {
      game.audio.play('se_jump', 0.25);
      if (n === 2) game.fx.popup('+150', CX + 230, y - 60, { color: C.pink, size: 60 });
      if (combo > 0 && combo % 4 === 0) game.fx.popup('x' + combo, W - 160, 320, { color: C.cyan, size: 60 });
      if (!milestoneDone && p >= GOAL / 2) {
        milestoneDone = true;
        game.fx.popup('NICE', CX, y - 260, { color: C.cyan, size: 88 });
        game.audio.play('se_milestone', 0.45);
      }
      if (p >= GOAL) finishRun(true);
    }
  }

  function pushBack(n) {
    p -= n;
    combo = 0; nMiss++;
    hitStop = 0.4; failFlash = true; shoveT = 0;
    var y = lineY(pVis) + KID_OFF;
    game.feedback.bad(CX, y - 40, { text: 'MISS', color: C.pink, flashColor: C.white, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && p <= LOSE) { game.audio.play('se_break', 0.4); finishRun(false); }
  }

  // 押す(本番の指もATTRACTのゴーストも同じ関数)
  function shove() {
    var heldT = clock - holdStart;
    held = false; chargedCue = false;
    var best = null, bd = 1e9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res) continue;
      var d = Math.abs(clock - e.t);
      if (d <= GOOD_W && d < bd) { bd = d; best = e; }
    }
    if (best) {
      var grade = bd <= PERFECT_W ? 1 : 2;
      best.res = grade;
      pushForward(grade, grade === 1 && heldT >= CHARGE_T);
      return true;
    }
    // 構えている拍・フェイント・拍の間に押した → 弾き返される
    pushBack(1);
    return false;
  }

  function brace() {
    held = true; holdStart = clock; chargedCue = false;
    puffs.push({ x: CX - 50, y: lineY(pVis) + 180, t: 0 });
    puffs.push({ x: CX + 50, y: lineY(pVis) + 180, t: 0 });
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7; fallT = 0; held = false;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      var left = Math.max(0, BARS * 4 - Math.floor(clock / SPB));
      score += left * 20 + 500;
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 152, 420 + (i % 2) * 90, { color: i % 2 ? C.cyan : C.amber, count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, steps: bestP, perfect: nPerfect, good: nGood, miss: nMiss, chargeShove: nCharge, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    brace();
    game.audio.tone(196, 0.06, { wave: 'square', volume: 0.05, slide: -40 });
  });

  game.onRelease(function(x, y) {
    if (!held) return;
    if (state !== S.PLAYING || over || hitStop > 0) { held = false; return; }
    var ok = shove();
    if (ok) game.audio.tone(523, 0.06, { wave: 'square', volume: 0.06, slide: 120 });
    else game.audio.tone(140, 0.12, { wave: 'sawtooth', volume: 0.06, slide: -50 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: a, font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a, font: 'monospace' });
  }
  function dotCircle(x, y, r, n, sz, alpha) {
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      game.draw.rect(px - sz / 2, py - sz / 2, sz, sz, bandCol(py), alpha);
    }
  }
  function dotFrame(x, y, w, h, sz) {
    for (var i = x; i <= x + w; i += sz * 2) { game.draw.rect(i, y, sz, sz, bandCol(y)); game.draw.rect(i, y + h, sz, sz, bandCol(y + h)); }
    for (var j = y; j <= y + h; j += sz * 2) { game.draw.rect(x, j, sz, sz, bandCol(j)); game.draw.rect(x + w, j, sz, sz, bandCol(j)); }
  }

  // ---- 描画 ----
  function drawBeach() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.45, C.bg0], [1, C.bg1]]);
    // 水平線と夕陽(半分沈んだ点の円)
    for (var hx = 0; hx < W; hx += 12) game.draw.rect(hx, 252, 6, 3, bandCol(252));
    for (var s = 0; s < 5; s++) game.draw.rect(160 - s * 14, 250 - s * 9, 40 + s * 28, 6, bandCol(240), 0.7);
    // 沖の漁船(2隻)
    game.draw.sprite(BOAT, pal(240), 820 + Math.sin(t * 0.4) * 20, 238, 6, { anchor: 'center' });
    game.draw.sprite(BOAT, pal(240), 560 + Math.sin(t * 0.3 + 2) * 14, 244, 4, { anchor: 'center', flipX: true });
    // 海の波(奥ほど細く)
    for (var j = 0; j < 9; j++) {
      var y = 276 + j * 30, gap = 120 - j * 6, len = 10 + j * 3;
      var off = (t * (20 + j * 6) + j * 53) % gap;
      for (var x = -gap + off; x < W; x += gap) game.draw.rect(x, y, len, 4, bandCol(y), 0.45 + j * 0.04);
    }
    // 波打ち際(寄せては返す)
    var surf = Math.sin(t * 1.2) * 14;
    for (var sx = 0; sx < W; sx += 18) game.draw.rect(sx, 548 + surf + Math.sin(sx * 0.02 + t * 2) * 6, 10, 6, bandCol(548));
    // カモメ
    for (var g = 0; g < 3; g++) {
      var gx = (t * (40 + g * 14) + g * 360) % (W + 200) - 100, gy = 330 + g * 50 + Math.sin(t * 2 + g) * 12;
      game.draw.sprite(GULL[Math.floor(t * 5 + g) % 2], pal(gy), gx, gy, 6, { anchor: 'center' });
    }
    // 砂の粒・足跡・小物
    for (var d = 0; d < 110; d++) {
      var dx = (d * 197) % W, dy = 590 + (d * 131) % 1300;
      game.draw.rect(dx, dy, 4, 4, bandCol(dy), 0.3);
    }
    var steps = [[110, 1380], [150, 1430], [96, 1480], [140, 1530], [930, 1350], [970, 1400]];
    for (var f = 0; f < steps.length; f++) {
      game.draw.rect(steps[f][0], steps[f][1], 18, 26, bandCol(steps[f][1]), 0.5);
      game.draw.rect(steps[f][0] + 4, steps[f][1] - 10, 10, 6, bandCol(steps[f][1]), 0.5);
    }
    // 円を描いた棒とヒトデ
    game.draw.line(890, 1420, 1010, 1300, bandCol(1360), 6);
    game.draw.sprite(STAR, pal(1360), 100, 1370, 9, { anchor: 'center' });
  }

  function drawRing() {
    // 砂に描いた円(拍の頭でわずかにふくらむ)
    dotCircle(CX, CY, R + beatPulse * 6, 80, 10, 0.95);
    dotCircle(CX, CY, R - 18, 80, 4, 0.4);
    // 拍の輪: 8分の位置。上=1拍目、時計回り
    var barT = ((clock % BAR) + BAR) % BAR;
    for (var k = 0; k < 8; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 4;
      var mx = CX + Math.cos(a) * RING_R, my = CY + Math.sin(a) * RING_R;
      if (k % 2 === 0) {
        var big = k === 0 ? 18 : 12;
        game.draw.rect(mx - big / 2, my - big / 2, big, big, bandCol(my), 0.8);
      } else {
        game.draw.rect(mx - 3, my - 3, 6, 6, bandCol(my), 0.35);
      }
    }
    // 崩れの拍 = 貝殻(0.75秒前から点滅)
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      var dt = e.t - clock;
      if (dt > BAR - 0.3 || dt < -0.35) continue;
      var ea = -Math.PI / 2 + e.k * Math.PI / 4;
      var ex = CX + Math.cos(ea) * RING_R, ey = CY + Math.sin(ea) * RING_R;
      var col = bandCol(ey);
      if (e.res === 1 || e.res === 2) {
        game.draw.circle(ex, ey, e.res === 1 ? 40 : 32, col, 0.9);
        game.draw.sprite(SHELL, { w: C.ink }, ex, ey, 9, { anchor: 'center' });
      } else if (e.res === 3) {
        game.draw.line(ex - 24, ey - 24, ex + 24, ey + 24, C.pink, 8);
        game.draw.line(ex + 24, ey - 24, ex - 24, ey + 24, C.pink, 8);
      } else {
        var lit = dt <= TELE_T;
        var on = !lit || Math.floor(game.time.elapsed * 12) % 2 === 0;
        if (lit) game.draw.circle(ex, ey, 36 + (1 - dt / TELE_T) * 14, col, 0.25);
        if (on) game.draw.sprite(SHELL, pal(ey), ex, ey, lit ? 10 : 7, { anchor: 'center' });
      }
    }
    // 光の波(1小節で一周)
    var sa = -Math.PI / 2 + barT / BAR * Math.PI * 2;
    for (var tr = 0; tr < 6; tr++) {
      var ta = sa - tr * 0.07;
      var tx = CX + Math.cos(ta) * RING_R, ty = CY + Math.sin(ta) * RING_R;
      game.draw.rect(tx - (14 - tr * 2), ty - (14 - tr * 2), 28 - tr * 4, 28 - tr * 4, bandCol(ty), 1 - tr * 0.15);
    }
    game.draw.line(CX + Math.cos(sa) * (RING_R - 34), CY + Math.sin(sa) * (RING_R - 34), CX + Math.cos(sa) * (RING_R + 34), CY + Math.sin(sa) * (RING_R + 34), bandCol(CY + Math.sin(sa) * RING_R), 6);
  }

  function opening() {
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res === 3) continue;
      if (clock >= e.t - 0.1 && clock <= e.t + GOOD_W + 0.05) return true;
    }
    return false;
  }

  function drawKids() {
    var t = game.time.elapsed;
    var ly = lineY(pVis);
    // 相手(上・こちら向き)
    var oy = ly - KID_OFF, ox = CX, opx = 13;
    var spr = OPP[Math.floor(Math.max(0, clock) / SPB) % 2];
    if (over && won) {
      fallT += game.time.delta;
      var f = Math.min(1, fallT / 0.8);
      oy = ly - KID_OFF - f * 130; ox = CX + f * 40;
      spr = OPP_SLIP;
    } else if (oppHitT > 0) {
      spr = OPP_SLIP; oy -= Math.sin(oppHitT / 0.3 * Math.PI) * 26;
    } else if (opening()) {
      spr = OPP_SLIP; ox += Math.sin(t * 40) * 5;
    } else if (feintT > 0) {
      ox += (Math.floor(t * 30) % 2 ? 9 : -9);
    } else if (oppLeanT > 0) {
      oy += 22;
    }
    game.draw.circle(ox, oy + 80, 66, bandCol(oy + 80), 0.12);
    game.draw.sprite(spr, pal(oy), ox, oy, opx, { anchor: 'center' });
    // 自分(下・背中)
    var py = ly + KID_OFF;
    if (over && !won && !demoMode) py += Math.min(120, (1.7 - outroT) * 150);
    if (hitStop > 0 && failFlash) {
      game.draw.circle(CX, py, 140, C.white, 0.85);
      game.draw.sprite(PLY, { w: C.ink }, CX, py, 16, { anchor: 'center' });
    } else {
      var ps = held ? PLY_CROUCH : (shoveT > 0 ? PLY_SHOVE : PLY);
      if (held) py += 10;
      if (shoveT > 0) py -= 14;
      game.draw.circle(CX, py + 72, 64, bandCol(py + 72), 0.12);
      game.draw.sprite(ps, pal(py), CX, py, 13, { anchor: 'center' });
    }
    // 接点の手のひら(押し合いの線)
    for (var dx = -110; dx <= 110; dx += 20) game.draw.rect(CX + dx - 3, ly - 3, 6, 6, bandCol(ly), 0.6);
  }

  function drawFx() {
    var dt = game.time.delta;
    for (var i = puffs.length - 1; i >= 0; i--) {
      var pf = puffs[i];
      pf.t += dt;
      if (pf.t > 0.45) { puffs.splice(i, 1); continue; }
      for (var k = 0; k < 6; k++) {
        var a = k / 6 * Math.PI * 2;
        var rr = 10 + pf.t * 110;
        game.draw.rect(pf.x + Math.cos(a) * rr - 4, pf.y + Math.sin(a) * rr * 0.5 - 4, 8, 8, bandCol(pf.y), 0.8 - pf.t * 1.6);
      }
    }
    for (var j = rings.length - 1; j >= 0; j--) {
      var rg = rings[j];
      rg.t += dt;
      if (rg.t > 0.5) { rings.splice(j, 1); continue; }
      dotCircle(rg.x, rg.y, 40 + rg.t * (rg.big ? 520 : 320), rg.big ? 28 : 18, rg.big ? 10 : 7, 1 - rg.t * 2);
    }
    if (hitStop > 0 && failFlash) {
      var q = 1 - hitStop / 0.4;
      dotCircle(CX, lineY(pVis) + KID_OFF, 140 + q * 150, 26, 9, 1 - q * 0.6);
    }
  }

  function drawPad(press, chargeK) {
    var col = bandCol(PAD_Y);
    dotCircle(PAD_X, PAD_Y, 150, 36, 10, press ? 1 : 0.55);
    if (press) game.draw.circle(PAD_X, PAD_Y, 140, col, 0.18);
    game.draw.sprite(PALM, { w: col }, PAD_X - 52, PAD_Y + (press ? 8 : 0), 11, { anchor: 'center', alpha: press ? 1 : 0.6 });
    game.draw.sprite(PALM, { w: col }, PAD_X + 52, PAD_Y + (press ? 8 : 0), 11, { anchor: 'center', alpha: press ? 1 : 0.6 });
    // 溜めの目盛り(16点が一周で満ちる)
    var n = Math.floor(16 * Math.min(1, chargeK));
    for (var i = 0; i < 16; i++) {
      var a = -Math.PI / 2 + i / 16 * Math.PI * 2;
      var on = i < n;
      game.draw.rect(PAD_X + Math.cos(a) * 190 - (on ? 9 : 4), PAD_Y + Math.sin(a) * 190 - (on ? 9 : 4), on ? 18 : 8, on ? 18 : 8, chargeK >= 1 ? C.amber : col, on ? 1 : 0.35);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.bg0);
    dotFrame(16, 16, W - 40, 200, 6);
    label('SCORE ' + score, 50, 82, 42, C.amber, 'left');
    if (combo >= 2) label('x' + combo, W - 50, 82, 42, C.amber, 'right');
    // 押し合いメーター(左=自分の円の端 / 右=相手の円の端)
    var mx0 = 200, mx1 = W - 200, my = 140;
    for (var k = LOSE; k <= GOAL; k++) {
      var kx = mx0 + (k - LOSE) / (GOAL - LOSE) * (mx1 - mx0);
      var big = k === 0 || k === GOAL || k === LOSE;
      game.draw.rect(kx - (big ? 8 : 5), my - (big ? 8 : 5), big ? 16 : 10, big ? 16 : 10, C.amber, big ? 1 : 0.6);
    }
    var px = mx0 + (Math.max(LOSE, Math.min(GOAL, pVis)) - LOSE) / (GOAL - LOSE) * (mx1 - mx0);
    game.draw.rect(px - 16, my - 26, 32, 52, C.amber);
    game.draw.sprite(PLY, { w: C.amber }, mx0 - 70, my, 4, { anchor: 'center' });
    game.draw.sprite(OPP[0], { w: C.amber }, mx1 + 70, my, 4, { anchor: 'center' });
    // 残り時間(縮む点の列)
    var remain = Math.max(0, Math.min(1, 1 - clock / TIME_LIMIT));
    var nd = Math.ceil(remain * 40);
    for (var i = 0; i < 40; i++) game.draw.rect(60 + i * 24, 192, 14, 10, C.amber, i < nd ? 1 : 0.2);
  }

  function drawScene() {
    drawBeach();
    drawRing();
    drawKids();
    drawFx();
  }

  function scan() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, C.ink, 0.16);
    // セロハンの薄い色(帯ごと)
    game.draw.rect(0, B1, W, B2 - B1, C.cyan, 0.04);
    game.draw.rect(0, B3, W, B4 - B3, C.green, 0.05);
    game.draw.rect(0, B4, W, H - B4, C.pink, 0.05);
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.37;
    game.draw.rect(40, y0, W - 80, hh, C.bg0);
    dotFrame(50, y0 + 10, W - 100, hh - 20, 10);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.cyan : C.pink);
    if (timeUp) label('TIME UP', W / 2, H * 0.37, 44, C.white);
    label('SCORE ' + score, W / 2, H * 0.415, 58, C.white);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.46, 34, C.white);
    label(Math.max(0, bestP) + ' / ' + GOAL, W / 2, H * 0.5, 46, C.white);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 56, C.green);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 42, C.white);
    if (!won) label('あと' + Math.max(1, GOAL - Math.max(0, bestP)) + '歩!', W / 2, H * 0.59, 50, C.pink);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.625, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックで2小節。奇数周は崩れの裏で離して押し出す、偶数周はフェイントで離して弾かれる ----
  var demo = { t: 0, x: PAD_X, y: PAD_Y, press: false, plan: [], next: 0, cyc: 0 };
  var DEMO_CYC = 2 * BAR + 1.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++; demo.next = 0;
      var fail = demo.cyc % 2 === 0;
      // [押す時刻, 離す時刻](拍クロック基準)
      demo.plan = fail ?
        [[0.1, 0.75], [1.0, 1.75], [2.55, 3.0], [3.2, 3.75]] :
        [[0.1, 0.75], [1.5, 1.76], [2.3, 3.75]];
    }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var step = demo.plan[demo.next];
    if (step && hitStop <= 0) {
      if (!held && clock >= step[0] && clock < step[1]) brace();
      if (held && clock >= step[1]) { shove(); demo.next++; }
    }
    demo.press = held;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    pVis += (p - pVis) * Math.min(1, dt * 12);

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      drawPad(demo.press, demo.press ? (clock - holdStart) / CHARGE_T : 0);
      game.draw.hand(demo.x + 40, demo.y + (demo.press ? 0 : 40), { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.bg0);
      dotFrame(16, 16, W - 40, 200, 6);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.amber);
      label('HI-SCORE ' + game.best, W / 2, 188, 36, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.pink);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.pink);
      scan();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawHud();
      drawResult(true);
      scan();
      return;
    }

    // ---- PLAYING ----
    // ヒットストップで拍クロックが止まっても、実時間で上限を超えたら打ち切る(放置・連続ミスでも28秒以内に終わる)
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { timeUp = true; hitStop = 0; finishRun(false); }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) failFlash = false;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawPad(held, held ? (clock - holdStart) / CHARGE_T : 0);
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.43, W, 170, C.bg0);
      dotFrame(10, H * 0.43, W - 30, 170, 8);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.43 + 115, 100, C.white);
    }
    // 最初の崩れだけ、溜めて離す手を薄く出す
    if (!over && evs.length && clock > evs[0].t - 1.1 && clock < evs[0].t + 0.25) {
      var pr = clock >= evs[0].t - 0.9 && clock < evs[0].t;
      game.draw.hand(PAD_X + 40, PAD_Y + (pr ? 0 : 40), { press: pr, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
    scan();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);

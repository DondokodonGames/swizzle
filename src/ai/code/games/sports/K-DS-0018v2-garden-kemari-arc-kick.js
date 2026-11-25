// K-DS-0018v2-garden-kemari-arc-kick.js
// 庭の蹴鞠 — 跳ねる拍に乗って弧を描く鞠の落ちる場所と拍を読み、足をそこへ運んで、落ちてくる拍の点で離して蹴り上げる
// 操作: 画面のどこかを押すと貴族が片足を上げ、押したまま指を横に動かすとその位置へ滑って寄る(寄る速さには上限がある)。指を離した瞬間に蹴る。鞠は拍の頭(琥珀の輪)か跳ねた裏(拍の2/3・水色の輪)に足元へ落ちてくる。弧が高いほど長く飛ぶ(2拍=いちばん高い、1拍=低い)。落ちる拍の点で、落下点の近くで離せば蹴り上げ(拍のずれでPERFECT/GOOD)。落ちる直前に早く離す・足が届かない・離さずに落とすとMISS。落ちる瞬間から遠い空蹴りは罰なし
// 終わり: 7小節(約16秒・17球)を落とさずに蹴り続ければCLEAR。MISSが3つでGAME OVER。後半は低く速い弧と裏拍の落下が増え、落下点の輪が出るのが遅くなる
// @mechanic: trajectory
// @theme: old_capital_garden_kemari
// 世界観: 古都の庭園の蹴鞠場で、四隅に木を植えた砂の庭に立つ若い貴族が、跳ねる拍に乗って落ちてくる鞠の弧を読み、落ちる拍の点へ足を運んで蹴り上げ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・蹴り上げた数・裏拍で蹴った数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 70s VECTOR

(function (game) {
  var STYLE = { bg: ['#010207', '#0b0d22'], main: ['#ffb84d', '#6ff0ff', '#eef6ff'], accent: ['#ff5c8a', '#c4ff6a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線だけ。塗りは使わず、太さ違いの線を3回重ねて光らせる
  var INK0 = STYLE.bg[0], INK1 = STYLE.bg[1];
  var AMBER = STYLE.main[0], CYAN = STYLE.main[1], WHITE = STYLE.main[2];
  var PINK = STYLE.accent[0], LIME = STYLE.accent[1];

  var TITLE = 'KEMARI ARC';
  var BPM = 100;
  var SPB = 60 / BPM;            // 1拍 0.6秒
  var SW = 2 / 3;                // 跳ねた裏(拍の2/3)
  var LEAD = 0.06;               // 伴奏は合成側で0.06秒遅れて鳴るので先に出す
  var BARS = 7;
  var PERFECT_W = 0.05, GOOD_W = 0.11, WHIFF_RANGE = 0.28;
  var REACH = 115;               // 足が届く横の距離
  var SLIDE = 2600;              // 貴族が寄る速さの上限(px/秒)
  var G = 5000;                  // 弧の重さ: 滞空Tの弧の高さ = G*T*T/8
  var KICK_Y = 1290, GROUND_Y = 1336;
  var X_MIN = 150, X_MAX = 930;
  var DROP_STOP = 0.35;          // 落とした瞬間のヒットストップ
  var MISS_MAX = 3;
  var TIME_LIMIT = 16;           // 放置でも READY 0.8 + 16.2 + 余韻 1.6 = 18.6秒で終わる
  var THUMB_Y = Math.round(H * 0.86);
  var TL_Y = 318, NOW_X = 190, PX_BEAT = 104;

  // 落ちる拍(拍の番号、裏は +SW)と落下点。前半は2拍の高い弧、中盤から裏拍、後半は1拍の低い弧が混ざる
  var LANDS = [
    [2, 540], [4, 380], [6, 640],
    [7 + SW, 470], [9, 700], [11, 400],
    [12 + SW, 600], [14, 330], [15, 520],
    [16 + SW, 760], [18, 560], [19, 360],
    [20 + SW, 560], [22, 780], [23, 600], [24 + SW, 380], [26, 560]
  ];
  var LATE_FROM = 8;             // この球から落下点の輪が遅れて出る
  var DEMO_LANDS = [[2, 540], [4, 380], [5 + SW, 660], [7, 460]];
  var DEMO_OFF = [0, 0.015, -0.2, 0];   // デモの離すずれ。3球目は早く離して落とす失敗例

  // 伴奏(オリジナル): 1拍 = 長い頭 + 短い裏。琴の手のような三角波と、頭だけのベース
  var MEL = [
    ['E5', 'A4', 'C5', 'A4', 'D5', 'E5', 'C5', 'B4'],
    ['A4', 'E5', 'G5', 'E5', 'D5', 'C5', 'B4', 'G4'],
    ['F4', 'A4', 'C5', 'F5', 'E5', 'C5', 'A4', 'C5'],
    ['B4', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5'],
    ['C5', 'E5', 'A5', 'E5', 'G5', 'E5', 'D5', 'B4'],
    ['F5', 'E5', 'C5', 'A4', 'B4', 'C5', 'D5', 'E5'],
    ['A4', 'C5', 'E5', 'C5', 'A4', 'A4', 'A4', 'A4']
  ];
  var ROOT = [['A2', 'E3'], ['E2', 'B2'], ['F2', 'C3'], ['G2', 'D3'], ['A2', 'E3'], ['F2', 'C3'], ['A2', 'E3']];

  // ---- スプライト(輪郭だけのドット。発光は重ね描き) ----
  var NOBLE_A = ['...ooo...', '...o.o...', '...o.o...', '..ooooo..', '...ooo...', '...o.o...', '...ooo...', '.ooooooo.', 'o.o...o.o', 'o.o...o.o', 'o.ooooo.o', '..o...o..', '..o...o..', '..o...o..', '.oo...oo.'];
  var NOBLE_B = ['.........', '...ooo...', '...o.o...', '..ooooo..', '...ooo...', '...o.o...', '...ooo...', 'ooooooooo', '..o...o..', '..o...o..', '..ooooo..', '..o...o..', '..o...o..', '..o...o..', '.oo...oo.'];
  var NOBLE_LIFT = ['...ooo...', '...o.o...', '...o.o...', '..ooooo..', '...ooo...', '...o.o...', '...ooo...', '.ooooooo.', 'o.o...o.o', 'o.o...o.o', 'o.ooooo.o', '..o...o..', '..o...ooo', '..o.....o', '.oo......'];
  var NOBLE_KICK = ['...ooo...', '...o.o...', '...o.o...', '..ooooo..', '...ooo...', '...o.o...', '...ooo...', 'ooooooooo', '..o...o.o', '..o...oo.', '..ooooo..', '..o......', '..o......', '..o......', '.oo......'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, lands, running, songT, beatN, schedBar, readyT, beatPulse;
  var cur, seg, segT0, segX0, dropT, dropX, badPending, trail;
  var held, aimX, footX, kickPose, judgeW, judgeT;
  var score, kicks, offKicks, perfects, goods, misses, combo, maxCombo, over, won, outroT, prevBest, milestone;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var src = demoMode ? DEMO_LANDS : LANDS;
    lands = [];
    for (var i = 0; i < src.length; i++) {
      var b = src[i][0];
      lands.push({ t: b * SPB, x: src[i][1], off: b - Math.floor(b) > 0.01, done: false, whiff: false, pressed: false });
    }
    running = false; songT = 0; beatN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    beatPulse = 0;
    cur = 0; seg = 0; segT0 = 0; segX0 = 540; dropT = -9; dropX = 540; badPending = false; trail = [];
    held = false; aimX = 540; footX = 540; kickPose = 0; judgeW = ''; judgeT = 0;
    score = 0; kicks = 0; offKicks = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = 0;
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function playBar(n) {
    if (demoMode) return;
    var m = MEL[n % MEL.length], r = ROOT[n % ROOT.length], mel = [], bass = [];
    var last = n === BARS - 1;
    for (var i = 0; i < 4; i++) {
      if (last && i >= 2) { mel.push(['A4', 2]); bass.push(['A2', 2]); break; }
      mel.push([m[i * 2], SW]); mel.push([m[i * 2 + 1], 1 - SW]);
      bass.push([i % 2 ? r[1] : r[0], SW]); bass.push(['R', 1 - SW]);
    }
    game.audio.melody(mel, { tempo: BPM, wave: 'triangle', volume: 0.045, bass: bass, bassWave: 'sine', bassVolume: 0.1 });
  }

  // ---- 拍クロック(1本だけ)。ヒットストップ中も止めない ----
  function onBeat(b) {
    beatPulse = 1;
    sfx(b % 4 === 0 ? 1320 : 990, 0.025, { wave: 'square', volume: b % 4 === 0 ? 0.035 : 0.02 });
  }

  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < BARS && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
  }

  function clampX(x) { return Math.max(X_MIN, Math.min(X_MAX, x)); }

  function say(word, x, y, col) {
    judgeW = word; judgeT = 0.5;
    if (demoMode) game.fx.popup(word, x, y, { color: col, size: 58 });
  }

  // ---- 入力(押す=足を上げる / 動かす=寄る / 離す=蹴る) ----
  function press(x) {
    if (!running || over) return false;
    held = true; aimX = clampX(x);
    return true;
  }

  function release() {
    if (!held) return 'none';
    held = false;
    kickPose = 0.24;
    if (!running || over) return 'none';
    var L = lands[cur];
    var off = L ? songT - L.t : 99;
    if (!L || L.whiff || Math.abs(off) > WHIFF_RANGE) return 'free';   // 遠い空蹴り: 罰なし
    var a = Math.abs(off);
    if (a <= GOOD_W && Math.abs(footX - L.x) <= REACH) { kickUp(L, a); return 'kick'; }
    // 早すぎ・届かない: この球はもう蹴れない(落ちた瞬間にMISSを数える)
    L.whiff = true;
    say('MISS', footX, KICK_Y - 240, PINK);
    sfx(180, 0.08, { wave: 'sawtooth', volume: 0.04, slide: -60 });
    game.fx.burst(footX, KICK_Y, { color: PINK, count: 5, speed: 160 });
    return 'miss';
  }

  function kickUp(L, a) {
    L.done = true;
    var perfect = a <= PERFECT_W;
    kicks++; if (L.off) offKicks++;
    combo++; if (combo > maxCombo) maxCombo = combo;
    var pts = perfect ? 100 + combo * 10 : 50 + combo * 5;
    if (L.off) pts = Math.round(pts * 1.2);
    score += pts;
    if (perfect) perfects++; else goods++;
    say(perfect ? 'PERFECT' : 'GOOD', L.x, KICK_Y - 260, perfect ? LIME : CYAN);
    sfx(perfect ? 1568 : 1175, 0.12, { wave: 'triangle', volume: 0.09, slide: 300 });
    game.fx.burst(L.x, KICK_Y, { color: L.off ? CYAN : AMBER, count: perfect ? 14 : 8, speed: 320 });
    if (!demoMode) game.feedback.good(L.x, KICK_Y - 120, { text: null, color: L.off ? CYAN : AMBER, count: 6, volume: 0.15 });
    if (combo === 8 || combo === 14) {
      if (!demoMode) game.audio.play('se_milestone', 0.4);
      game.fx.popup(combo + ' COMBO', W / 2, 760, { color: LIME, size: 76 });
    }
    seg = cur + 1; segT0 = L.t; segX0 = L.x;
    cur++;
  }

  function drop(L) {
    L.done = true;
    misses++; combo = 0;
    dropT = songT; dropX = L.x; badPending = true;
    if (!L.whiff) say('MISS', L.x, KICK_Y - 240, PINK);
    sfx(110, 0.18, { wave: 'square', volume: 0.08, slide: -40 });
    game.fx.flash('#ffffff', 0.08);
    var nx = lands[cur + 1];
    seg = cur + 1; segX0 = L.x;
    segT0 = Math.min(songT + DROP_STOP, nx ? nx.t - 0.12 : songT + DROP_STOP);
    cur++;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; held = false;
    if (ok) {
      score += 300 + perfects * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(500, 1200), { color: i % 2 ? CYAN : AMBER, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (!running) return;
    if (held) {
      var step = SLIDE * dt, d = aimX - footX;
      footX += Math.abs(d) <= step ? d : (d > 0 ? step : -step);
    }
    if (kickPose > 0) kickPose -= dt;
    if (judgeT > 0) judgeT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    var L = lands[cur];
    if (L && songT > L.t + GOOD_W) drop(L);
    if (badPending && songT >= dropT + DROP_STOP) {
      badPending = false;
      if (!demoMode) game.feedback.bad(dropX, KICK_Y - 160, { text: null, shake: 8 });
      else game.fx.shake(5, 0.15);
      if (!demoMode && misses >= MISS_MAX) finish(false);
    }
    if (!demoMode && !over && cur >= lands.length && songT >= lands[lands.length - 1].t + 0.4) finish(true);
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(misses < MISS_MAX);
    var p = ballPos();
    if (p && !p.frozen) { trail.push([p.x, p.y]); if (trail.length > 9) trail.shift(); }
  }

  // ---- 鞠の位置(弧は落ちる拍から逆算する。高さ = 滞空時間で決まる) ----
  function ballPos() {
    if (songT < dropT + DROP_STOP) return { x: dropX, y: GROUND_Y - 30, frozen: true };
    var e = lands[seg];
    var u = songT - segT0;
    if (!e) return { x: segX0, y: KICK_Y - u * 1500, frozen: false };   // 最後の一蹴りは空へ抜ける
    var T = Math.max(0.05, e.t - segT0);
    var k = Math.max(0, Math.min(1, u / T));
    var x = segX0 + (e.x - segX0) * k;
    var y = KICK_Y - 0.5 * G * Math.max(0, u) * (T - u);
    return { x: x, y: Math.min(GROUND_Y - 30, y), frozen: false };
  }

  // ---- 描画ヘルパー(線だけ) ----
  function beam(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '2a', w * 3.6);
    game.draw.line(x1, y1, x2, y2, col + '77', w * 2);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function path(pts, col, w, closed) {
    for (var i = 0; i + 1 < pts.length; i++) beam(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, w);
    if (closed) beam(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], col, w);
  }
  function ring(x, y, rx, ry, col, w, n) {
    var pts = [];
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
    path(pts, col, w, true);
  }
  function glowSprite(art, col, x, y, px, flip) {
    game.draw.sprite(art, { o: col }, x, y, px * 1.12, { anchor: 'center', alpha: 0.22, flipX: !!flip });
    game.draw.sprite(art, { o: col }, x, y, px, { anchor: 'center', flipX: !!flip });
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y + 3, { size: sz, color: col + '44', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawTree(x, base, h, kind, col) {
    beam(x - 10, base, x - 6, base - h * 0.62, col, 2);
    beam(x + 10, base, x + 6, base - h * 0.62, col, 2);
    var top = base - h;
    if (kind === 0) {             // 松: 横に重なる枝
      for (var i = 0; i < 3; i++) { var yy = top + i * h * 0.17, ww = 70 + i * 28; path([[x - ww, yy + 30], [x, yy], [x + ww, yy + 30], [x - ww, yy + 30]], col, 2, false); }
    } else if (kind === 1) {      // 柳: 垂れる枝
      for (var j = -3; j <= 3; j++) { var sx = x + j * 22; beam(x, top + 30, sx, top + 10, col, 1.5); beam(sx, top + 10, sx + j * 4, top + h * 0.5, col, 1.5); }
    } else if (kind === 2) {      // 桜: 丸い枝ぶりに花の点
      ring(x, top + h * 0.26, 95, 80, col, 2, 11);
      for (var k = 0; k < 6; k++) { var a = k * 1.1; ring(x + Math.cos(a) * 55, top + h * 0.26 + Math.sin(a) * 40, 7, 7, PINK, 1.5, 5); }
    } else {                      // 楓: とがった葉の輪郭
      var pts = [];
      for (var m = 0; m < 10; m++) { var aa = m / 10 * Math.PI * 2, rr = m % 2 ? 50 : 95; pts.push([x + Math.cos(aa) * rr, top + h * 0.26 + Math.sin(aa) * rr * 0.8]); }
      path(pts, col, 2, true);
    }
  }

  function drawGarden() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, INK1], [0.55, INK0], [1, INK0]]);
    // 月と星
    ring(900, 520, 48, 48, WHITE, 2, 14);
    for (var s = 0; s < 14; s++) {
      var sx = (s * 263 + 90) % 1020 + 30, sy = 420 + (s * 137) % 320;
      if (Math.floor(t * 1.5 + s) % 4 !== 0) game.draw.line(sx - 3, sy, sx + 3, sy, CYAN + '88', 2);
    }
    // 築地塀と奥の殿舎
    var wallY = 930;
    beam(0, wallY, W, wallY, AMBER, 2);
    for (var r = 0; r < 18; r++) beam(r * 62, wallY - 22, r * 62 + 31, wallY - 34, AMBER, 1.2);
    beam(0, wallY - 22, W, wallY - 22, AMBER, 1.5);
    path([[380, 900], [440, 830], [640, 830], [700, 900]], AMBER, 2.5, false);
    beam(410, 860, 670, 860, AMBER, 1.5);
    // 砂の庭(奥へ収束する線)
    for (var g = 0; g < 7; g++) {
      var gy = 980 + g * g * 9 + g * 30;
      beam(0, gy, W, gy, CYAN + '', g === 0 ? 1 : 1.2);
    }
    for (var v = -4; v <= 4; v++) beam(540 + v * 60, 980, 540 + v * 260, 1440, CYAN, 1);
    // 四隅の木(懸りの木): 奥の二本は小さく
    drawTree(240, 990, 300, 0, LIME);
    drawTree(840, 990, 300, 1, LIME);
    drawTree(80, 1420, 560, 2, LIME);
    drawTree(1000, 1420, 560, 3, PINK);
    // 親指の帯(足を運ぶ所)
    beam(X_MIN, THUMB_Y, X_MAX, THUMB_Y, AMBER, 2);
    for (var k = 0; k <= 8; k++) { var kx = X_MIN + (X_MAX - X_MIN) * k / 8; beam(kx, THUMB_Y - 14, kx, THUMB_Y + 14, AMBER, 1.5); }
    ring(footX, THUMB_Y, 34, 34, held ? WHITE : AMBER, held ? 4 : 2.5, 10);
  }

  function landingRings() {
    for (var i = cur; i < lands.length && i <= cur + 1; i++) {
      var L = lands[i];
      var lead = (!demoMode && i >= LATE_FROM) ? 0.55 : 0.75;
      var dtL = L.t - songT;
      if (dtL > lead || L.done) continue;
      var p = Math.max(0, dtL / lead);
      var col = L.off ? CYAN : AMBER;
      ring(L.x, GROUND_Y, 64 + 120 * p, 18 + 34 * p, col, 3, 16);
      if (p < 0.35) ring(L.x, GROUND_Y, 64, 18, WHITE, 2, 16);
      beam(L.x, GROUND_Y - 70, L.x, GROUND_Y - 40 - 60 * p, col, 2);
    }
  }

  function drawBall() {
    var p = ballPos();
    if (!p) return;
    for (var i = 1; i < trail.length; i++) {
      var a = Math.round(40 + i * 18).toString(16);
      game.draw.line(trail[i - 1][0], trail[i - 1][1], trail[i][0], trail[i][1], AMBER + (a.length < 2 ? '0' + a : a), 3 + i);
    }
    if (p.frozen) {
      // ヒットストップ: 白く光って大きく
      ring(p.x, p.y, 52, 52, WHITE, 5, 14);
      ring(p.x, p.y, 80, 80, PINK, 2, 14);
      return;
    }
    var spin = songT * 7;
    ring(p.x, p.y, 30, 30, WHITE, 3, 12);
    beam(p.x + Math.cos(spin) * 28, p.y + Math.sin(spin) * 28, p.x - Math.cos(spin) * 28, p.y - Math.sin(spin) * 28, AMBER, 2);
    beam(p.x + Math.cos(spin + 1.57) * 18, p.y + Math.sin(spin + 1.57) * 18, p.x - Math.cos(spin + 1.57) * 18, p.y - Math.sin(spin + 1.57) * 18, AMBER, 1.5);
    // 地面の小さな影の線
    var hgt = Math.max(0, GROUND_Y - p.y);
    var sw = Math.max(10, 40 - hgt * 0.03);
    beam(p.x - sw, GROUND_Y + 6, p.x + sw, GROUND_Y + 6, CYAN, 1.5);
  }

  function drawNoble() {
    var art;
    if (kickPose > 0) art = NOBLE_KICK;
    else if (held) art = NOBLE_LIFT;
    else art = Math.floor(game.time.elapsed * 2.4) % 2 ? NOBLE_B : NOBLE_A;
    var flip = aimX < footX - 4;
    glowSprite(art, WHITE, footX, GROUND_Y - 88, 12, flip);
    // 足が届く範囲
    ring(footX, GROUND_Y + 4, REACH, 16, held ? LIME : '#5a6a88', 1.5, 14);
  }

  // 跳ねる拍の譜面: 頭の長い目盛り(琥珀)と跳ねた裏の短い目盛り(水色)が流れ、落ちる拍に菱形が乗る
  function drawTimeline() {
    var x1 = W - 70;
    beam(70, TL_Y, x1, TL_Y, '#4a5a7a', 1.5);
    var b0 = Math.floor(songT / SPB) - 1;
    for (var b = b0; b < b0 + 10; b++) {
      if (b < 0) continue;
      var hx = NOW_X + (b * SPB - songT) / SPB * PX_BEAT;
      var ax = hx + SW * PX_BEAT;
      if (hx > 70 && hx < x1) beam(hx, TL_Y - 26, hx, TL_Y + 26, AMBER, 2);
      if (ax > 70 && ax < x1) beam(ax, TL_Y - 12, ax, TL_Y + 12, CYAN, 1.5);
    }
    for (var i = 0; i < lands.length; i++) {
      var L = lands[i];
      var lx = NOW_X + (L.t - songT) / SPB * PX_BEAT;
      if (lx < 60 || lx > x1) continue;
      var col = L.done ? '#3a4a5a' : (L.off ? CYAN : AMBER);
      path([[lx, TL_Y - 44], [lx + 14, TL_Y - 30], [lx, TL_Y - 16], [lx - 14, TL_Y - 30]], col, 2.5, true);
    }
    var pr = 30 + beatPulse * 14;
    beam(NOW_X, TL_Y - pr, NOW_X, TL_Y + pr, WHITE, 3);
    if (judgeT > 0) label(judgeW, W / 2, TL_Y + 120, 60, judgeW === 'MISS' ? PINK : (judgeW === 'PERFECT' ? LIME : CYAN));
  }

  function drawScene() {
    drawGarden();
    drawTimeline();
    landingRings();
    drawNoble();
    drawBall();
  }

  function drawHud() {
    label('SCORE ' + score, 60, 100, 52, WHITE, 'left');
    label('BEST ' + prevBest, 60, 166, 32, AMBER, 'left');
    label(kicks + ' / ' + lands.length, W - 60, 100, 46, CYAN, 'right');
    for (var i = 0; i < MISS_MAX; i++) ring(W - 220 + i * 70, 166, 18, 18, i < misses ? PINK : '#3a3f5a', 3, 8);
    var progress = Math.min(1, songT / (lands[lands.length - 1].t + 0.4));
    beam(0, 224, W * progress, 224, CYAN, 3);
    if (combo >= 2) label(combo + ' COMBO', W / 2, 166, 34, LIME);
  }

  // ---- ATTRACT: 実ロジックで寄って離す。3球目は早く離して落とす ----
  var demo = { t: 0, hx: 540 };
  var DEMO_LEN = (DEMO_LANDS[DEMO_LANDS.length - 1][0] + 1.6) * SPB;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.hx = 540; }
    var L = lands[cur];
    if (L) {
      var tr = L.t + DEMO_OFF[cur];
      if (!held && !L.pressed && songT >= L.t - 0.5 && songT < tr) { L.pressed = true; press(footX); demo.hx = footX; }
      if (held) {
        var d = L.x - demo.hx, st = 1700 * dt;
        demo.hx += Math.abs(d) <= st ? d : (d > 0 ? st : -st);
        aimX = clampX(demo.hx);
        if (songT >= tr) release();
      }
    }
    tickWorld(dt);
  }

  var stepCell = -1;
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    if (press(x)) { stepCell = Math.floor(aimX / 98); game.audio.tone(420, 0.04, { wave: 'triangle', volume: 0.035 }); }
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !held) return;
    aimX = clampX(x);
    // 砂を擦る足音: 指が帯の目盛りを1つ越えるごとに小さく鳴らす
    var c = Math.floor(aimX / 98);
    if (c !== stepCell) { stepCell = c; game.audio.tone(2400, 0.015, { wave: 'square', volume: 0.012 }); }
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    var r = release();
    if (r === 'free') game.audio.tone(260, 0.05, { wave: 'triangle', volume: 0.03, slide: -80 });
    else if (r === 'none') game.fx.burst(x, y, { color: '#5a6a88', count: 2, speed: 60 });
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
      game.draw.hand(demo.hx, THUMB_Y + 30, { press: held, scale: 15 });
      label(TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, AMBER);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 196, 36, CYAN);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.78, 50, LIME);
      else label('TAP TO START', W / 2, H * 0.78, 46, CYAN);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(70, H * 0.25, W - 140, H * 0.36, INK0, 0.9);
      path([[70, H * 0.25], [W - 70, H * 0.25], [W - 70, H * 0.61], [70, H * 0.61]], won ? LIME : PINK, 3, true);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? LIME : PINK);
      label('SCORE ' + score, W / 2, H * 0.37, 58, WHITE);
      label(kicks + ' / ' + lands.length, W / 2, H * 0.42, 52, AMBER);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.465, 34, CYAN);
      label(maxCombo + ' COMBO', W / 2, H * 0.505, 36, CYAN);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 52, LIME);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, AMBER);
      if (!won) label('あと' + Math.max(1, lands.length - cur) + '球', W / 2, H * 0.225, 56, PINK);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 36, WHITE);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      stepClock(dt);
      if (judgeT > 0) judgeT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, kicks: kicks, offbeatKicks: offKicks, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = 0; beatN = -1; schedBar = 0; game.audio.play('se_tap', 0.3); }
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, CYAN);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, LIME);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

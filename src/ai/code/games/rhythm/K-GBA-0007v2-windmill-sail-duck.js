// K-GBA-0007v2-windmill-sail-duck.js
// 風車小屋のくぐり跳び — 食いの拍で頭上へ回り込む羽根と、拍に乗って跳ねてくる麻袋を、伏せて跳んでかわし続ける
// 操作: 画面下の左パッドを押すと跳ぶ・右パッドを押すと伏せる。跳ねる麻袋は跳んで、真下へ回り込む羽根は伏せてかわす。押す瞬間は攻撃が届く拍(食いの裏拍を含む)の頭に合わせる
// 終わり: 10小節(20秒)を走り切れば成功。3回当たれば失敗
// @mechanic: dodge
// @theme: windmill_sail_sack_dodge
// 世界観: 夕暮れの丘の風車小屋の足元。食い気味の拍で頭の高さまで回り込む羽根と、拍に乗って跳ねてくる麻袋を、粉屋の見習いが伏せて跳んでよけ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + SCORE(PERFECT/GOOD/MISS数・最大コンボ)
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点ジッター、遠景はフォグで沈める
  var STYLE = { bg: ['#3c3466', '#f2b680'], main: ['#efe2c4', '#7a5236', '#5e8a3e'], accent: ['#ff4a3a', '#ffe060'] };
  var C = {
    sky0: STYLE.bg[0], sky1: '#b4708c', sky2: STYLE.bg[1], fog: '#d8a8a0',
    hillA: '#8a6a8e', hillB: '#a07a8a', grassA: STYLE.main[2], grassB: '#46682e', path: '#c2a272',
    wallL: '#e2d2b0', wallR: '#b09a78', roofL: '#8a4030', roofR: '#5e2a20', door: '#3a2418',
    cloth: STYLE.main[0], spar: STYLE.main[1], danger: STYLE.accent[0], gold: STYLE.accent[1],
    good: '#6aff9a', white: '#ffffff', ink: '#1a1420', padA: '#5a4c78', padB: '#2e2644', padLit: '#9a8ac8',
  };

  var GAME_TITLE = 'WINDMILL HOP';
  var BPM = 120;
  var SPB = 60 / BPM;            // 1拍 0.5秒
  var EIGHTH = SPB / 2;          // 8分 0.25秒
  var BARS = 10;
  var TIME_LIMIT = 20;           // 10小節 × 4拍 × 0.5秒
  var SONG_LEN = BARS * 4 * SPB;
  var COUNT_IN = 2 * SPB;        // READY? → GO! を2拍で刻む
  var PERF_W = 0.06, GOOD_W = 0.15, CATCH_W = 0.24;
  var TELEGRAPH = 3 * EIGHTH;    // 0.75秒前に予告(音+赤マーカー)
  var APPROACH = 5 * EIGHTH;     // 麻袋は 1.25秒前に画面右から跳ねてくる
  var JUMP_T = 0.32, DUCK_T = 0.34, STUN_T = 0.3, FINAL_STOP = 0.5;
  var LIVES = 3;
  var RESULT_HOLD = 2.0;
  // 8分の位置(1小節=8)。最初は表拍、3小節目から 3-3-2 の食い、後半は2拍裏・4拍裏(食い)が主役
  var CHART = [4, 8, 10, 12, 14, 16, 19, 22, 24, 27, 30, 32, 35, 39, 42, 44, 47,
               50, 53, 55, 58, 61, 63, 66, 68, 71, 74, 77, 79];

  var HX = W * 0.36, GY = H * 0.62, HUB_Y = H * 0.30, HEAD_Y = GY - 120;
  var R = HEAD_Y - HUB_Y;        // 羽根の長さ = 真下を通るとき先端が頭の高さ
  var RULER_Y = H * 0.705, PPS = 430;
  var PAD_Y = H * 0.765, PAD_H = H * 0.18;
  var PAD_UP = { x: 50, w: W / 2 - 70, cx: W * 0.27 };
  var PAD_DN = { x: W / 2 + 20, w: W / 2 - 70, cx: W * 0.73 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null, ok = false, resultT = 0, endSent = false, newRecord = false;

  // ── スプライト ─────────────────────────────────────────────
  var HERO_A = [
    '..WWWW..',
    '.WWWWWW.',
    '..SSSS..',
    '..KSSK..',
    '..SSSS..',
    '.BBBBBB.',
    'SBBBBBBS',
    '.BAAAAB.',
    '..AAAA..',
    '..D..D..',
    '.DD..DD.',
  ];
  var HERO_B = [
    '..WWWW..',
    '.WWWWWW.',
    '..SSSS..',
    '..KSSK..',
    '..SSSS..',
    '.BBBBBB.',
    'SBBBBBBS',
    '.BAAAAB.',
    '..AAAA..',
    '.D....D.',
    'DD....DD',
  ];
  var HERO_JUMP = [
    'S.WWWW.S',
    'SWWWWWWS',
    '.BSSSSB.',
    '.BKSSKB.',
    '..SSSS..',
    '..BBBB..',
    '..BBBB..',
    '.BAAAAB.',
    '..AAAA..',
    '.DD..DD.',
  ];
  var HERO_DUCK = [
    '...WWWW...',
    '..WWWWWW..',
    '..SKSSKS..',
    'SBBBBBBBBS',
    '.BAAAAAAB.',
    'DD......DD',
  ];
  var HERO_HIT = [
    '..WWWW..',
    '.WWWWWW.',
    '..SSSS..',
    '..XSSX..',
    '..SOOS..',
    '.BBBBBB.',
    'SBBBBBBS',
    '.BAAAAB.',
    '..AAAA..',
    '.DD..DD.',
    '.DD..DD.',
  ];
  var HERO_PAL = { W: '#f8f4ec', S: '#f0c090', K: '#1a1420', B: '#4a7ab8', A: '#e8dcc0', D: '#5a3a28', X: '#1a1420', O: '#c04040' };
  var SACK_A = [
    '...RR...',
    '..TRRT..',
    '.TTTTTT.',
    'TTKTTKTT',
    'TTTTTTTT',
    'TTTMMTTT',
    '.TTTTTT.',
  ];
  var SACK_B = [
    '...RR....',
    '.TTRRTTT.',
    'TTKTTTKTT',
    'TTTTTTTTT',
    'TTTTMMTTT',
    '.TTTTTTT.',
  ];
  var SACK_PAL = { R: '#ff4a3a', T: '#c8a070', K: '#2a1a10', M: '#8a5a3a' };
  var LIFE = ['.WWWW.', 'WWWWWW', '.SKKS.', '..SS..'];
  var LIFE_PAL = { W: '#f8f4ec', S: '#f0c090', K: '#1a1420' };
  function whitePal(p) { var o = {}; for (var k in p) o[k] = '#ffffff'; return o; }
  var HERO_WHITE = whitePal(HERO_PAL), SACK_WHITE = whitePal(SACK_PAL);

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ── ローポリ描画(横4pxストリップで面を塗る) ─────────────────
  function jit(i) { return Math.sin(game.time.elapsed * 9 + i * 2.3) * 1.6; }
  function tri(ax, ay, bx, by, cx, cy, col, al) {
    var p0 = [ax, ay], p1 = [bx, by], p2 = [cx, cy], tmp;
    if (p1[1] < p0[1]) { tmp = p0; p0 = p1; p1 = tmp; }
    if (p2[1] < p0[1]) { tmp = p0; p0 = p2; p2 = tmp; }
    if (p2[1] < p1[1]) { tmp = p1; p1 = p2; p2 = tmp; }
    var y0 = p0[1], y1 = p1[1], y2 = p2[1];
    if (y2 - y0 < 1) return;
    for (var y = y0; y < y2; y += 4) {
      var xa = p0[0] + (p2[0] - p0[0]) * (y - y0) / (y2 - y0);
      var xb = y < y1 ? p0[0] + (p1[0] - p0[0]) * (y - y0) / Math.max(1, y1 - y0)
                      : p1[0] + (p2[0] - p1[0]) * (y - y1) / Math.max(1, y2 - y1);
      game.draw.rect(Math.min(xa, xb), y, Math.abs(xb - xa) + 1, 4.5, col, al);
    }
  }
  function quad(a, b, c, d, col, al) { tri(a.x, a.y, b.x, b.y, c.x, c.y, col, al); tri(a.x, a.y, c.x, c.y, d.x, d.y, col, al); }
  function outline(pts, col, w) {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      game.draw.line(p.x, p.y, q.x, q.y, col, w);
    }
  }

  // ── 伴奏(固有メロディ、3-3-2 の食いでベースが跳ねる) ──────────
  var BGM_LEAD = [['E5', 0.5], ['R', 0.5], ['C5', 0.5], ['A4', 1], ['C5', 0.5], ['D5', 1],
                  ['E5', 0.5], ['G5', 0.5], ['R', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 1]];
  var BGM_BASS = [['A2', 1.5], ['A2', 1.5], ['E2', 1], ['F2', 1.5], ['G2', 1.5], ['E2', 1]];
  function startBgm() {
    game.audio.melody(BGM_LEAD, { tempo: BPM, wave: 'square', volume: 0.045, loop: true, bass: BGM_BASS, bassWave: 'triangle', bassVolume: 0.08 });
  }

  // ── 1回分の走り(本番とATTRACT実演で同じロジックを使う) ─────────
  function makeRun(eighths, types, t0) {
    var r = { t: t0, haz: [], hTimes: [], lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, pose: 'run', poseT: 0, stunT: 0, stopT: 0, cool: 0,
      pad: [0, 0], over: false, beatIdx: -99, beatFlash: 0, pend: null, demo: false, bgmCue: false };
    for (var i = 0; i < eighths.length; i++) {
      var typ = types ? types[i] : (game.random(0, 1) < 0.5 ? 'L' : 'H');
      r.haz.push({ t: eighths[i] * EIGHTH, type: typ, done: false, res: '', early: false, warned: false, hitT: 0 });
    }
    for (var j = 0; j < r.haz.length; j++) if (r.haz[j].type === 'H') r.hTimes.push(r.haz[j].t);
    return r;
  }

  function initGame() {
    run = makeRun(CHART, null, -COUNT_IN);
    ok = false; resultT = 0; endSent = false; newRecord = false;
  }

  function hitHaz(r, h) {
    h.done = true; h.res = 'M'; h.hitT = STUN_T + 0.12;
    r.miss++; r.combo = 0; r.lives--;
    r.pose = 'hit'; r.poseT = STUN_T + 0.15;
    r.pend = { x: HX, y: h.type === 'H' ? HEAD_Y : GY - 50 };
    game.audio.tone(98, 0.18, { wave: 'sawtooth', volume: r.demo ? 0.05 : 0.14 });
    if (r.lives <= 0 && !r.demo) { r.over = true; r.stopT = FINAL_STOP; game.audio.stopBgm(); }
    else r.stunT = STUN_T;
  }
  function badNow(r) {
    var p = r.pend; r.pend = null;
    if (p) game.feedback.bad(p.x, p.y, { text: 'MISS', volume: r.demo ? 0.3 : 0.9 });
  }

  function pressDir(r, dir) {
    if (r.over || r.stopT > 0) return;
    r.pad[dir === 'up' ? 0 : 1] = 0.15;
    if (r.stunT > 0 || r.cool > 0) return;
    r.pose = dir; r.poseT = dir === 'up' ? JUMP_T : DUCK_T;
    var best = null, bd = 99;
    for (var i = 0; i < r.haz.length; i++) {
      var h = r.haz[i];
      if (h.done || h.early) continue;
      var d = r.t - h.t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = h; }
    }
    if (!best || Math.abs(bd) > CATCH_W) { r.cool = 0.1; return; }
    var need = best.type === 'L' ? 'up' : 'down';
    if (dir !== need || bd < -GOOD_W) {
      // 逆向き/早すぎ: その姿勢のまま攻撃が届いて当たる
      if (bd >= 0) hitHaz(r, best); else best.early = true;
      return;
    }
    best.done = true;
    var perfect = Math.abs(bd) <= PERF_W;
    best.res = perfect ? 'P' : 'G';
    r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfect++; else r.good++;
    r.score += (perfect ? 100 : 50) + Math.min(10, r.combo) * 5;
    var fy = best.type === 'H' ? HEAD_Y - 60 : GY - 90;
    game.feedback.good(HX + 90, fy, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good, volume: r.demo ? 0.3 : 0.8 });
    if (!r.demo && r.combo % 8 === 0) {
      game.fx.popup(r.combo + ' COMBO', W / 2, H * 0.36, { color: C.gold, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(r, dt) {
    if (r.stopT > 0) {            // 最後の被弾: 画面全体を止める hit-stop
      r.stopT -= dt;
      if (r.stopT <= 0) { badNow(r); finish(false); }
      return;
    }
    r.t += dt;
    var bi = Math.floor(r.t / SPB);
    if (bi !== r.beatIdx) {
      r.beatIdx = bi; r.beatFlash = 1;
      if (r.t < 0) { if (!r.demo) game.audio.tone(bi === -1 ? 1320 : 880, 0.08, { wave: 'square', volume: 0.09 }); }
      else if (r.t < SONG_LEN) game.audio.tone(bi % 4 === 0 ? 1760 : 1320, 0.025, { wave: 'triangle', volume: r.demo ? 0.015 : 0.035 });
    }
    if (!r.demo && !r.bgmCue && r.t >= -0.06) { r.bgmCue = true; startBgm(); }
    for (var i = 0; i < r.haz.length; i++) {
      var h = r.haz[i];
      if (!h.warned && r.t >= h.t - TELEGRAPH) {
        h.warned = true;
        if (h.type === 'H') game.audio.tone(1046, 0.07, { wave: 'triangle', volume: r.demo ? 0.025 : 0.07, slide: -360 });
        else game.audio.tone(196, 0.07, { wave: 'square', volume: r.demo ? 0.025 : 0.07 });
      }
      if (!h.done && h.early && r.t >= h.t) hitHaz(r, h);
      else if (!h.done && r.t > h.t + GOOD_W) hitHaz(r, h);
      if (h.hitT > 0) h.hitT -= dt;
      if (r.stopT > 0) return;
    }
    if (r.poseT > 0) { r.poseT -= dt; if (r.poseT <= 0) r.pose = 'run'; }
    if (r.cool > 0) r.cool -= dt;
    r.pad[0] = Math.max(0, r.pad[0] - dt); r.pad[1] = Math.max(0, r.pad[1] - dt);
    if (r.stunT > 0) { r.stunT -= dt; if (r.stunT <= 0) badNow(r); }
    r.beatFlash = Math.max(0, r.beatFlash - dt * 4);
    if (!r.demo && !r.over && r.t >= SONG_LEN + 0.25) { r.over = true; finish(true); }
  }

  function finish(cleared) {
    if (state !== S.PLAYING) return;
    ok = cleared;
    state = S.RESULT; resultT = 0; endSent = false;
    newRecord = cleared && run.score > game.best;
    game.audio.stopBgm();
    game.audio.play(cleared ? 'se_success' : 'se_failure', 0.6);
    if (cleared) game.fx.burst(W / 2, H * 0.3, { color: C.gold, count: 30, speed: 520 });
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.44, { color: C.gold, size: 72 });
  }
  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, bars: BARS };
    if (ok) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 羽根の回転: 'H' 攻撃の時刻ちょうどに次の羽根が真下(頭の高さ)を通るよう区間等速で回す ──
  function sailPhase(r, t) {
    var ht = r.hTimes;
    if (!ht.length) return t * 0.5;
    if (t <= ht[0]) return 1 - (ht[0] - t) / 2.0;
    for (var i = 0; i < ht.length - 1; i++) {
      if (t <= ht[i + 1]) return (i + 1) + (t - ht[i]) / (ht[i + 1] - ht[i]);
    }
    return ht.length + (t - ht[ht.length - 1]) / 2.0;
  }

  // ── 描画 ─────────────────────────────────────────────────
  function drawBg() {
    game.draw.gradient(0, GY + 40, [[0, C.sky0], [0.55, C.sky1], [1, C.sky2]]);
    tri(-80, GY - 30, 280 + jit(1), H * 0.44, 640, GY - 30, C.hillA, 0.85);
    tri(440, GY - 30, 860 + jit(2), H * 0.41, 1220, GY - 30, C.hillB, 0.85);
    game.draw.rect(0, H * 0.46, W, GY - H * 0.46, C.fog, 0.3);
    game.draw.gradient(GY - 30, H, [[0, C.grassA], [0.25, C.grassB], [1, '#1c2414']]);
    tri(0, GY - 30, W, GY - 30, W * 0.72 + jit(3), GY + 110, C.grassB, 0.55);
    tri(0, GY + 150, W * 0.42, GY + 40 + jit(4), W, GY + 190, '#3a5a28', 0.5);
    quad({ x: HX - 60, y: GY - 30 }, { x: HX + 60, y: GY - 30 }, { x: HX + 260, y: GY + 150 }, { x: HX - 220, y: GY + 150 }, C.path, 0.5);
  }

  function drawTower(r) {
    var j = jit(5);
    var bl = { x: HX - 175, y: GY + 10 }, br = { x: HX + 175, y: GY + 10 };
    var tl = { x: HX - 100 + j, y: HUB_Y + 40 }, tr = { x: HX + 100 - j, y: HUB_Y + 40 };
    var mb = { x: HX + 30, y: GY + 10 }, mt = { x: HX + 18, y: HUB_Y + 40 };
    quad(bl, mb, mt, tl, C.wallL);
    quad(mb, br, tr, mt, C.wallR);
    outline([bl, br, tr, tl], C.ink, 3);
    tri(HX - 132, HUB_Y + 44, HX + 18, HUB_Y + 44, HX + 6 + j, HUB_Y - 110, C.roofL);
    tri(HX + 18, HUB_Y + 44, HX + 132, HUB_Y + 44, HX + 6 + j, HUB_Y - 110, C.roofR);
    quad({ x: HX - 52, y: GY + 10 }, { x: HX + 52, y: GY + 10 }, { x: HX + 46, y: GY - 150 }, { x: HX - 46, y: GY - 150 }, C.door);
    quad({ x: HX + 70, y: HUB_Y + 150 }, { x: HX + 110, y: HUB_Y + 150 }, { x: HX + 108, y: HUB_Y + 210 }, { x: HX + 72, y: HUB_Y + 210 }, '#ffd890', 0.55 + r.beatFlash * 0.4);
  }

  function drawHero(r, result) {
    var fr;
    if (result) fr = ok ? HERO_JUMP : HERO_HIT;
    else if (r.pose === 'hit') fr = HERO_HIT;
    else if (r.pose === 'up') fr = HERO_JUMP;
    else if (r.pose === 'down') fr = HERO_DUCK;
    else fr = Math.floor(r.t / SPB) % 2 === 0 ? HERO_A : HERO_B;   // 拍ごとに足踏み
    var px = 14, yOff = 0;
    if (!result && r.pose === 'up') {
      var k = Math.max(0, Math.min(1, 1 - r.poseT / JUMP_T));
      yOff = -Math.sin(Math.PI * k) * 165;
    }
    if (result && ok) yOff = -Math.abs(Math.sin(game.time.elapsed * 6)) * 60;
    if (!result && r.pose === 'run') yOff = -r.beatFlash * 10;
    var white = !result && r.pose === 'hit' && (r.stunT > 0 || r.stopT > 0);
    var sc = white ? 1.3 : 1;
    var h = fr.length * px * sc;
    var shw = 66 + yOff * 0.2;
    quad({ x: HX - shw, y: GY + 6 }, { x: HX, y: GY - 6 }, { x: HX + shw, y: GY + 6 }, { x: HX, y: GY + 18 }, '#000000', 0.28);
    game.draw.sprite(fr, white ? HERO_WHITE : HERO_PAL, HX, GY + yOff - h / 2, px * sc, { anchor: 'center' });
  }

  function drawBlade(a, hot, j) {
    var dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    var p1 = { x: HX + dx * 50, y: HUB_Y + dy * 50 };
    var p2 = { x: HX + dx * R + j, y: HUB_Y + dy * R - j };
    var p3 = { x: HX + dx * R + px * 80, y: HUB_Y + dy * R + py * 80 };
    var p4 = { x: HX + dx * 80 + px * 48, y: HUB_Y + dy * 80 + py * 48 };
    quad(p1, p2, p3, p4, hot ? '#ffc0b0' : C.cloth, 0.95);
    for (var s = 1; s < 4; s++) {
      var rr = 50 + (R - 50) * s / 4;
      game.draw.line(HX + dx * rr, HUB_Y + dy * rr, HX + dx * rr + px * (48 + 32 * s / 4), HUB_Y + dy * rr + py * (48 + 32 * s / 4), C.spar, 3);
    }
    game.draw.line(HX, HUB_Y, p2.x, p2.y, C.spar, 12);
    outline([p2, p3, p4], C.spar, 3);
    if (hot) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.circle(p2.x, p2.y, blink ? 34 : 24, C.danger, 0.75);
      tri(p2.x - 18, p2.y - 30, p2.x + 18, p2.y - 30, p2.x, p2.y + 10, C.danger);
    }
  }

  function drawSails(r) {
    var ph = sailPhase(r, r.t);
    var nextIdx = -1, nextT = 0;
    for (var i = 0; i < r.hTimes.length; i++) if (r.hTimes[i] > r.t - 0.05) { nextIdx = i; nextT = r.hTimes[i]; break; }
    var hotK = nextIdx >= 0 ? (((-nextIdx) % 4) + 4) % 4 : -1;
    var hot = nextIdx >= 0 && nextT - r.t < TELEGRAPH && nextT - r.t > -0.05;
    for (var k = 0; k < 4; k++) drawBlade((ph + k) * Math.PI / 2, hot && k === hotK, jit(10 + k));
    game.draw.circle(HX, HUB_Y, 34 + r.beatFlash * 10, C.spar);
    game.draw.circle(HX, HUB_Y, 14, C.gold);
    if (hot) {   // 頭上の警告マーカー
      var bl = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (bl) { tri(HX - 50, HEAD_Y - 150, HX + 50, HEAD_Y - 150, HX, HEAD_Y - 100, C.danger); }
    }
    for (var m = 0; m < r.haz.length; m++) {
      var h = r.haz[m];
      if (h.type === 'H' && h.res === 'M' && h.hitT > 0) {
        game.draw.circle(HX, HEAD_Y, 90, C.white, 0.85);
        game.draw.circle(HX, HEAD_Y, 52, C.danger, 0.6);
      }
    }
  }

  function sackPos(h, t) {
    var dtt = h.t - t;
    var x = HX + dtt * (W + 70 - HX) / APPROACH;
    var ph = (dtt / SPB) % 1; if (ph < 0) ph += 1;
    return { x: x, y: GY - 44 - Math.sin(Math.PI * ph) * 150, land: ph < 0.12 || ph > 0.88 };
  }

  function drawSacks(r) {
    for (var i = 0; i < r.haz.length; i++) {
      var h = r.haz[i];
      if (h.type !== 'L') continue;
      var dtt = h.t - r.t;
      if (dtt > APPROACH || dtt < -0.9) continue;
      if (h.res === 'M') {
        if (h.hitT <= 0) continue;
        game.draw.sprite(SACK_A, SACK_WHITE, HX + 46, GY - 50, 15, { anchor: 'center' });
        continue;
      }
      if (dtt < TELEGRAPH && dtt > -0.05 && Math.floor(game.time.elapsed * 12) % 2 === 0) {
        tri(HX - 70, GY + 22, HX - 40, GY - 18, HX - 10, GY + 22, C.danger);
        tri(HX + 10, GY + 22, HX + 40, GY - 18, HX + 70, GY + 22, C.danger);
      }
      var p = sackPos(h, r.t);
      game.draw.sprite(p.land ? SACK_B : SACK_A, SACK_PAL, p.x, p.y, 11, { anchor: 'center', flipX: Math.floor(r.t / SPB) % 2 === 0 });
    }
  }

  function drawRuler(r) {
    var t = r.t, y = RULER_Y, x0 = 40, x1 = W - 40;
    game.draw.rect(x0, y - 50, x1 - x0, 100, C.padB, 0.82);
    var eFirst = Math.ceil((t - (HX - x0) / PPS) / EIGHTH), eLast = Math.floor((t + (x1 - HX) / PPS) / EIGHTH);
    for (var e = eFirst; e <= eLast; e++) {
      var x = HX + (e * EIGHTH - t) * PPS;
      var bar = ((e % 8) + 8) % 8 === 0, beat = ((e % 2) + 2) % 2 === 0;
      var hh = bar ? 44 : beat ? 28 : 10;
      game.draw.line(x, y - hh, x, y + hh, bar ? C.cloth : beat ? '#a898c8' : '#6a5a88', bar ? 4 : beat ? 3 : 2);
    }
    for (var i = 0; i < r.haz.length; i++) {
      var h = r.haz[i];
      var hx = HX + (h.t - t) * PPS;
      if (hx < x0 + 10 || hx > x1 - 10) continue;
      var near = h.t - t < TELEGRAPH && !h.done;
      var col = h.res === 'P' ? C.gold : h.res === 'G' ? C.good : h.res === 'M' ? C.danger
        : (near && Math.floor(game.time.elapsed * 12) % 2 === 0 ? C.danger : C.cloth);
      if (h.type === 'H') tri(hx - 20, y - 42, hx + 20, y - 42, hx, y - 6, col);
      else game.draw.sprite(SACK_A, h.res || near ? { R: col, T: col, K: C.ink, M: col } : SACK_PAL, hx, y + 22, 4, { anchor: 'center' });
    }
    game.draw.line(HX, y - 54, HX, y + 54, r.beatFlash > 0.5 ? C.gold : C.white, 4 + r.beatFlash * 6);
  }

  function drawPad(p, lit, dir) {
    var y = PAD_Y, h = PAD_H;
    quad({ x: p.x, y: y }, { x: p.x + p.w, y: y }, { x: p.x + p.w - 18, y: y + h - 34 }, { x: p.x + 18, y: y + h - 34 }, lit ? C.padLit : C.padA);
    game.draw.rect(p.x + 18, y + h - 34, p.w - 36, 34, C.padB);
    outline([{ x: p.x, y: y }, { x: p.x + p.w, y: y }, { x: p.x + p.w - 18, y: y + h - 34 }, { x: p.x + 18, y: y + h - 34 }], lit ? C.gold : '#8a7aa8', 4);
    var cx = p.cx, cy = y + h * 0.34;
    var col = lit ? C.white : C.gold;
    if (dir === 'up') tri(cx - 80, cy + 34, cx + 80, cy + 34, cx, cy - 50, col);
    else tri(cx - 80, cy - 40, cx + 80, cy - 40, cx, cy + 44, col);
    game.draw.sprite(dir === 'up' ? HERO_JUMP : HERO_DUCK, HERO_PAL, cx, y + h * 0.7, 6, { anchor: 'center' });
  }

  function drawScene(r, result) {
    drawBg();
    drawTower(r);
    drawHero(r, result);
    drawSails(r);
    if (!result) drawSacks(r);
    drawRuler(r);
    drawPad(PAD_UP, r.pad[0] > 0, 'up');
    drawPad(PAD_DN, r.pad[1] > 0, 'down');
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 216, C.ink, 0.55);
    txt('SCORE ' + r.score, 50, 80, 42, C.cloth, 'left');
    for (var i = 0; i < LIVES; i++) {
      game.draw.sprite(LIFE, LIFE_PAL, W - 80 - i * 84, 62, 10, { anchor: 'center', alpha: i < r.lives ? 1 : 0.18 });
    }
    var progress = Math.max(0, Math.min(1, r.t / SONG_LEN));
    game.draw.rect(50, 126, W - 100, 18, C.padB);
    game.draw.rect(50, 126, (W - 100) * progress, 18, C.gold);
    for (var b = 1; b < BARS; b++) game.draw.rect(50 + (W - 100) * b / BARS - 1, 122, 3, 26, C.ink, 0.6);
    var bInBar = ((Math.floor(r.t / SPB) % 4) + 4) % 4;
    for (var k = 0; k < 4; k++) {
      var on = k === bInBar && r.t >= 0;
      game.draw.circle(W / 2 - 105 + k * 70, 186, on ? 13 + r.beatFlash * 6 : 10, on ? C.gold : '#6a5a88');
    }
    if (r.combo >= 2) txt(r.combo + ' COMBO', 50, 198, 30, C.good, 'left');
  }

  // ── ATTRACT 実演(実ロジックで2小節: 3回成功 + 1回わざと逆を押して被弾) ──
  var DEMO_E = [5, 8, 11, 14];
  var DEMO_TY = ['L', 'H', 'L', 'H'];
  var DEMO_DIR = ['up', 'down', 'down', 'down'];
  var DEMO_CYC = 16 * EIGHTH;
  var demo = { t: 0, run: null, i: 0, hx: PAD_UP.cx, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt || !demo.run) {
      demo.run = makeRun(DEMO_E, DEMO_TY, 0);
      demo.run.demo = true; demo.run.lives = 99; demo.i = 0;
      startBgm();   // 実演の拍と伴奏を小節頭でそろえる
    }
    var r = demo.run;
    stepRun(r, dt);
    if (demo.i < DEMO_E.length) {
      var h = r.haz[demo.i];
      var tgt = DEMO_DIR[demo.i] === 'up' ? PAD_UP.cx : PAD_DN.cx;
      demo.hx += (tgt - demo.hx) * Math.min(1, dt * 9);
      if (r.t >= h.t - 0.02) { pressDir(r, DEMO_DIR[demo.i]); demo.press = 0.2; demo.i++; }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.7);
      game.audio.stopBgm();
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) {
      if (!endSent) sendEnd();
      game.audio.play('se_tap', 0.5);
      state = S.ATTRACT; initGame(); demo.t = 0; demo.run = null;
      return;
    }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !run || run.t < -0.3) return;
    var dir = x < W / 2 ? 'up' : 'down';
    game.audio.tone(dir === 'up' ? 660 : 392, 0.05, { wave: 'square', volume: 0.06, slide: dir === 'up' ? 240 : -120 });
    pressDir(run, dir);
  });

  game.onUpdate(function(dt) {
    if (dt > 0.1) dt = 0.1;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.run, false);
      game.draw.hand(demo.hx, PAD_Y + PAD_H * 0.42, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.5);
      txt(GAME_TITLE, W / 2, H * 0.055, 80, C.gold);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 36, C.cloth);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 32, C.white);
      return;
    }

    if (state === S.PLAYING) {
      stepRun(run, dt);
      drawScene(run, false);
      drawHud(run);
      if (run.t < 0) txt(run.t < -SPB ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.gold);
      return;
    }

    // RESULT
    resultT += dt;
    drawScene(run, true);
    game.draw.rect(0, 0, W, H * 0.4, C.ink, 0.6);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 96, ok ? C.good : C.danger);
    txt('SCORE ' + (ok ? run.score : 0), W / 2, H * 0.16, 56, C.white);
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.215, 34, C.cloth);
    txt(run.maxCombo + ' COMBO', W / 2, H * 0.26, 34, C.good);
    txt('BEST ' + Math.max(game.best, ok ? run.score : 0), W / 2, H * 0.305, 36, C.gold);
    if (!ok) {
      var leftBars = Math.max(1, BARS - Math.floor(Math.max(0, run.t) / (4 * SPB)));
      txt('あと' + leftBars + '小節!', W / 2, H * 0.355, 44, C.gold);
    } else if (newRecord && Math.floor(game.time.elapsed * 3) % 2 === 0) {
      txt('NEW RECORD', W / 2, H * 0.355, 48, C.gold);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 34, C.white);
    if (resultT >= RESULT_HOLD) sendEnd();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startBgm();
  });
})(game);

// K-GBA-0007v3-sheepdog-fence-run.js
// 牧羊犬の柵沿いラン — 表拍ごとに一マスずつ駆け、倒れた丸太は拍の頭で指を離して跳び、垂れた枝は押さえて伏せたままくぐる
// 操作: 画面を押さえている間は牧羊犬が低く伏せる(垂れ枝をくぐる)。指を離した瞬間に跳ぶ(丸太を越える)。丸太の拍の頭で離し、枝の拍の頭で押さえる
// 終わり: 8小節(32拍)を走り切って羊の群れに追いつけば成功。3回ぶつかれば失敗
// @mechanic: camera_run
// @theme: sheepdog_fence_path_run
// 世界観: 牧場の柵沿いの小道。牧羊犬が表拍ごとに一マスずつ駆け、倒れた丸太を跳び越え垂れた枝を伏せてくぐりながら、先を行く羊の群れを追う
// 残るもの: 正誤(CLEAR/GAME OVER) + SCORE(PERFECT/GOOD/MISS数・最大コンボ)
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの床、上面/左面/右面の3明度、高さは影との距離で示す(奥でも縮めない)
  var STYLE = { bg: ['#5aa040', '#2e5a22'], main: ['#d8b070', '#f0e8d8', '#c8884a'], accent: ['#ff4040', '#ffd23a'] };
  var C = {
    grass: STYLE.bg[0], grassDark: STYLE.bg[1], grass2: '#4a8a34', grid: '#3e7a2c',
    path: STYLE.main[0], path2: '#c49a5c', fenceT: STYLE.main[1], fenceL: '#c8bca8', fenceR: '#9a8e7a',
    logT: STYLE.main[2], logL: '#9a6232', logR: '#6e4220', ring: '#e8b880',
    bark: '#6e4a2a', barkL: '#553820', barkR: '#3e2816', leafT: '#5aaa4a', leafL: '#3a7a3a', leafR: '#2a5a2a',
    danger: STYLE.accent[0], gold: STYLE.accent[1], good: '#7affb0', white: '#ffffff', ink: '#14200e',
    padT: '#7a6aa8', padL: '#55487a', padR: '#3a3058', padLit: '#a898d8',
  };

  var GAME_TITLE = 'SHEEPDOG RUN';
  var BPM = 108;
  var SPB = 60 / BPM;            // 1拍 ≒ 0.556秒 = 1マス
  var BEATS = 32;
  var TIME_LIMIT = 18;           // 8小節 × 4拍
  var SONG_LEN = BEATS * SPB;
  var COUNT_IN = 2 * SPB;
  var PERF_W = 0.07, GOOD_W = 0.16;
  var JUMP_T = 0.38, STUN_T = 0.3, FINAL_STOP = 0.5;
  var LIVES = 3;
  var RESULT_HOLD = 2.0;
  // [拍, 種類] L=倒れた丸太(離して跳ぶ) B=垂れた枝(押さえて伏せる)。すべて表拍(拍の頭)
  var CHART = [[2, 'L'], [4, 'B'], [6, 'L'], [8, 'L'], [10, 'B'], [11, 'B'], [12, 'L'], [13, 'L'], [15, 'B'],
               [16, 'B'], [17, 'L'], [19, 'L'], [20, 'B'], [21, 'B'], [22, 'L'], [23, 'B'],
               [24, 'L'], [25, 'B'], [26, 'L'], [27, 'B'], [28, 'L'], [29, 'L'], [30, 'B'], [31, 'L']];

  var TW = 220, TH = 110;
  var DOG_X = W * 0.22, DOG_Y = H * 0.64;
  var OX = DOG_X - TW / 4, OY = DOG_Y - TH / 4;
  var PAD_CX = W * 0.5, PAD_CY = H * 0.855, PAD_RX = 320, PAD_RY = 120, PAD_D = 44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null, ok = false, resultT = 0, endSent = false, newRecord = false;

  // ── スプライト ─────────────────────────────────────────────
  var DOG_A = [
    '........KK...',
    '.......KKKK..',
    '.......KWEKN.',
    'K.KKKKKKWWW..',
    '.KKKKKKKKW...',
    '..KWWKKKKW...',
    '..K.W...K.W..',
    '.K..W...K..W.',
  ];
  var DOG_B = [
    '........KK...',
    '.......KKKK..',
    '.......KWEKN.',
    'K.KKKKKKWWW..',
    '.KKKKKKKKW...',
    '..KWWKKKKW...',
    '...KW..KW....',
    '...K.W.K.W...',
  ];
  var DOG_LOW = [
    '........KK...',
    '.......KKKK..',
    'KKKKKKKKWEKN.',
    '.KKKKKKKKWW..',
    'KWWKKKKKKW.W.',
  ];
  var DOG_JUMP = [
    '........KK...',
    '.......KKKK..',
    'K......KWEKN.',
    '.KKKKKKKWWW..',
    '..KKKKKKKW...',
    '.KWW....KWW..',
    'KW.........W.',
  ];
  var DOG_HIT = [
    '..KKKKKKKK...',
    '.KWWKKKKKKKK.',
    'KW.WKKKKKXWN.',
    '....KK..KWW..',
  ];
  var DOG_PAL = { K: '#1e1e2a', W: '#f4f0e8', E: '#101018', N: '#101018', X: '#ff4a3a' };
  var SHEEP_A = ['.WWWW...', 'WWWWWWKK', 'WWWWWWKE', 'WWWWWWKK', '.K..K...'];
  var SHEEP_B = ['.WWWW...', 'WWWWWWKK', 'WWWWWWKE', 'WWWWWWKK', '..K..K..'];
  var SHEEP_PAL = { W: '#fbf8f0', K: '#2a2430', E: '#ffffff' };
  var BONE = ['W....W', 'WWWWWW', 'W....W'];
  function whitePal(p) { var o = {}; for (var k in p) o[k] = '#ffffff'; return o; }
  var DOG_WHITE = whitePal(DOG_PAL);

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ── 等角投影と面塗り ─────────────────────────────────────
  function P(u, v, z, cu) {
    var du = u - cu;
    return { x: OX + (du + v) * TW / 2, y: OY - (du - v) * TH / 2 - (z || 0) };
  }
  function tri(ax, ay, bx, by, cx, cy, col, al) {
    var p0 = [ax, ay], p1 = [bx, by], p2 = [cx, cy], tmp;
    if (p1[1] < p0[1]) { tmp = p0; p0 = p1; p1 = tmp; }
    if (p2[1] < p0[1]) { tmp = p0; p0 = p2; p2 = tmp; }
    if (p2[1] < p1[1]) { tmp = p1; p1 = p2; p2 = tmp; }
    var y0 = p0[1], y1 = p1[1], y2 = p2[1];
    if (y2 - y0 < 1) return;
    for (var y = y0; y < y2; y += 3) {
      var xa = p0[0] + (p2[0] - p0[0]) * (y - y0) / (y2 - y0);
      var xb = y < y1 ? p0[0] + (p1[0] - p0[0]) * (y - y0) / Math.max(1, y1 - y0)
                      : p1[0] + (p2[0] - p1[0]) * (y - y1) / Math.max(1, y2 - y1);
      game.draw.rect(Math.min(xa, xb), y, Math.abs(xb - xa) + 1, 3.5, col, al);
    }
  }
  function quad(a, b, c, d, col, al) { tri(a.x, a.y, b.x, b.y, c.x, c.y, col, al); tri(a.x, a.y, c.x, c.y, d.x, d.y, col, al); }
  function diamond(u0, u1, v0, v1, z, cu, col, al) {
    quad(P(u0, v0, z, cu), P(u1, v0, z, cu), P(u1, v1, z, cu), P(u0, v1, z, cu), col, al);
  }
  function box(u0, u1, v0, v1, z0, z1, cu, top, left, right) {
    var a = P(u0, v0, z1, cu), b = P(u1, v0, z1, cu), c = P(u1, v1, z1, cu), d = P(u0, v1, z1, cu);
    quad(a, d, P(u0, v1, z0, cu), P(u0, v0, z0, cu), left);
    quad(d, c, P(u1, v1, z0, cu), P(u0, v1, z0, cu), right);
    quad(a, b, c, d, top);
  }

  // ── 伴奏(固有メロディ、4分のベースで表拍を刻む) ──────────────
  var BGM_LEAD = [['G4', 1], ['B4', 1], ['D5', 1], ['B4', 1], ['C5', 1], ['E5', 1], ['D5', 1], ['B4', 0.5], ['A4', 0.5]];
  var BGM_BASS = [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1], ['C3', 1], ['G2', 1], ['D3', 1], ['D2', 1]];
  function startBgm() {
    game.audio.melody(BGM_LEAD, { tempo: BPM, wave: 'square', volume: 0.045, loop: true, bass: BGM_BASS, bassWave: 'triangle', bassVolume: 0.09 });
  }

  // ── 1回分の走り(本番とATTRACT実演で同じロジック) ───────────
  function makeRun(chart, t0) {
    var r = { t: t0, obs: [], lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0,
      hold: false, holdStart: -99, pose: 'run', jumpT: 0, stunT: 0, stopT: 0, padT: 0,
      over: false, beatIdx: -99, beatFlash: 0, pend: null, demo: false, bgmCue: false };
    for (var i = 0; i < chart.length; i++) {
      r.obs.push({ k: chart[i][0], t: chart[i][0] * SPB, type: chart[i][1], done: false, res: '', warned: false, hitT: 0 });
    }
    return r;
  }
  function initGame() {
    run = makeRun(CHART, -COUNT_IN);
    ok = false; resultT = 0; endSent = false; newRecord = false;
  }
  function camU(r) { return r.t / SPB; }
  function dogZ(r) {
    if (r.pose !== 'jump') return 0;
    return Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - r.jumpT / JUMP_T))) * 135;
  }
  function dogPos(r) { return P(camU(r), 0.5, dogZ(r), camU(r)); }

  function nearest(r, type) {
    var best = null, bd = 99;
    for (var i = 0; i < r.obs.length; i++) {
      var o = r.obs[i];
      if (o.done || (type && o.type !== type)) continue;
      var d = Math.abs(r.t - o.t);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function clearObs(r, o, d) {
    o.done = true;
    var perfect = d <= PERF_W;
    o.res = perfect ? 'P' : 'G';
    r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfect++; else r.good++;
    r.score += (perfect ? 100 : 50) + Math.min(10, r.combo) * 5;
    var p = dogPos(r);
    game.feedback.good(p.x + 70, p.y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good, volume: r.demo ? 0.3 : 0.8 });
    if (!r.demo && r.combo % 8 === 0) {
      game.fx.popup(r.combo + ' COMBO', W / 2, H * 0.3, { color: C.gold, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
  }
  function hitObs(r, o) {
    o.done = true; o.res = 'M'; o.hitT = STUN_T + 0.12;
    r.miss++; r.combo = 0; r.lives--;
    r.pose = 'hit'; r.jumpT = 0;
    var p = dogPos(r);
    r.pend = { x: p.x, y: p.y - 50 };
    game.audio.tone(90, 0.2, { wave: 'sawtooth', volume: r.demo ? 0.05 : 0.14 });
    if (r.lives <= 0 && !r.demo) { r.over = true; r.stopT = FINAL_STOP; game.audio.stopBgm(); }
    else r.stunT = STUN_T;
  }
  function badNow(r) {
    var p = r.pend; r.pend = null;
    if (p) game.feedback.bad(p.x, p.y, { text: 'MISS', volume: r.demo ? 0.3 : 0.9 });
  }

  function doPress(r) {
    if (r.over || r.stopT > 0) return;
    r.hold = true; r.holdStart = r.t; r.padT = 0.15;
    if (r.stunT > 0) return;
    if (r.pose !== 'jump') r.pose = 'low';
    var o = nearest(r, 'B');
    if (o && Math.abs(r.t - o.t) <= GOOD_W) clearObs(r, o, Math.abs(r.t - o.t));
  }
  function doRelease(r) {
    if (!r.hold) return;
    r.hold = false;
    if (r.over || r.stopT > 0 || r.stunT > 0) return;
    r.pose = 'jump'; r.jumpT = JUMP_T;
    var o = nearest(r, null);
    if (o && Math.abs(r.t - o.t) <= GOOD_W) {
      if (o.type === 'L') clearObs(r, o, Math.abs(r.t - o.t));
      else hitObs(r, o);   // 枝の真下で跳び上がるとぶつかる
    }
  }

  function stepRun(r, dt) {
    if (r.stopT > 0) {            // 最後の衝突: 画面全体を止める hit-stop
      r.stopT -= dt;
      if (r.stopT <= 0) { badNow(r); finish(false); }
      return;
    }
    r.t += dt;
    var bi = Math.floor(r.t / SPB);
    if (bi !== r.beatIdx) {
      r.beatIdx = bi; r.beatFlash = 1;
      if (r.t < 0) { if (!r.demo) game.audio.tone(bi === -1 ? 1320 : 880, 0.08, { wave: 'square', volume: 0.09 }); }
      else if (r.t < SONG_LEN) game.audio.tone(bi % 4 === 0 ? 1568 : 1175, 0.02, { wave: 'triangle', volume: r.demo ? 0.015 : 0.03 });
    }
    if (!r.demo && !r.bgmCue && r.t >= -0.06) { r.bgmCue = true; startBgm(); }
    for (var i = 0; i < r.obs.length; i++) {
      var o = r.obs[i];
      if (!o.warned && r.t >= o.t - SPB) {     // 1拍前(0.56秒)に予告音
        o.warned = true;
        if (o.type === 'L') game.audio.tone(165, 0.08, { wave: 'square', volume: r.demo ? 0.025 : 0.07 });
        else game.audio.tone(1175, 0.07, { wave: 'triangle', volume: r.demo ? 0.025 : 0.07, slide: -400 });
      }
      if (!o.done && o.type === 'B' && r.hold && r.t >= o.t) clearObs(r, o, Math.abs(r.holdStart - o.t));
      if (!o.done && r.t > o.t + GOOD_W) hitObs(r, o);
      if (o.hitT > 0) o.hitT -= dt;
      if (r.stopT > 0) return;
    }
    if (r.jumpT > 0) { r.jumpT -= dt; if (r.jumpT <= 0) r.pose = r.hold ? 'low' : 'run'; }
    if (r.stunT > 0) { r.stunT -= dt; if (r.stunT <= 0) { r.pose = r.hold ? 'low' : 'run'; badNow(r); } }
    if (r.padT > 0) r.padT -= dt;
    r.beatFlash = Math.max(0, r.beatFlash - dt * 4);
    if (!r.demo && !r.over && r.t >= SONG_LEN + 0.2) { r.over = true; finish(true); }
  }

  function finish(cleared) {
    if (state !== S.PLAYING) return;
    ok = cleared;
    state = S.RESULT; resultT = 0; endSent = false;
    newRecord = cleared && run.score > game.best;
    game.audio.stopBgm();
    game.audio.play(cleared ? 'se_success' : 'se_failure', 0.6);
    if (cleared) game.fx.burst(DOG_X, DOG_Y - 60, { color: C.gold, count: 30, speed: 520 });
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.46, { color: C.gold, size: 72 });
  }
  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, beats: BEATS };
    if (ok) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 描画 ─────────────────────────────────────────────────
  function flockDist(r, result) {
    if (result && ok) return 2.6;
    var endIn = SONG_LEN - r.t;
    if (!r.demo && endIn < 4 * SPB) return 2.8 + 3.4 * Math.max(0, endIn) / (4 * SPB);
    return 6.2;
  }

  function drawTree(k, v, cu, tall) {
    box(k - 0.12, k + 0.12, v - 0.12, v + 0.12, 0, tall, cu, C.bark, C.barkL, C.barkR);
    box(k - 0.42, k + 0.42, v - 0.42, v + 0.42, tall, tall + 70, cu, C.leafT, C.leafL, C.leafR);
  }

  function drawObstacle(o, r, cu) {
    var hot = !o.done && o.t - r.t < SPB && o.t - r.t > -GOOD_W;
    var blink = hot && Math.floor(game.time.elapsed * 12) % 2 === 0;
    var flash = o.res === 'M' && o.hitT > 0;
    var k = o.k;
    if (o.type === 'L') {
      var g = flash ? 0.06 : 0;
      if (flash) box(k - 0.2 - g, k + 0.2 + g, 0.04 - g, 0.96 + g, 0, 44, cu, C.white, C.white, C.white);
      else box(k - 0.2, k + 0.2, 0.04, 0.96, 0, 36, cu, blink ? '#ffb090' : C.logT, C.logL, C.logR);
      var e = P(k, 0.96, 18, cu);
      if (!flash) game.draw.circle(e.x, e.y, 15, C.ring);
      if (hot) {
        for (var s = 0; s < 3; s++) {
          var q = P(k, 0.2 + s * 0.3, 36, cu);
          tri(q.x - 12, q.y, q.x + 12, q.y, q.x, q.y - 30, C.danger);
        }
      }
    } else {
      diamond(k - 0.16, k + 0.16, -0.1, 1.08, 0, cu, '#000000', 0.28);   // 地面の影: 高さ = 影との距離
      if (flash) box(k - 0.2, k + 0.2, -1.35, 1.12, 74, 112, cu, C.white, C.white, C.white);
      else {
        box(k - 0.14, k + 0.14, -1.35, 1.08, 82, 104, cu, C.bark, C.barkL, C.barkR);
        box(k - 0.24, k + 0.24, 0.15, 0.55, 104, 132, cu, blink ? '#ffa080' : C.leafT, C.leafL, C.leafR);
        box(k - 0.24, k + 0.24, 0.62, 1.02, 104, 128, cu, blink ? '#ffa080' : C.leafT, C.leafL, C.leafR);
      }
      if (hot) {
        for (var t2 = 0; t2 < 4; t2++) {
          var q2 = P(k, -0.05 + t2 * 0.33, 82, cu);
          tri(q2.x - 11, q2.y, q2.x + 11, q2.y, q2.x, q2.y + 30, C.danger);
        }
      }
    }
  }

  function drawDog(r, result) {
    var cu = camU(r);
    var z = dogZ(r);
    var fr;
    if (result) fr = ok ? DOG_JUMP : DOG_HIT;
    else if (r.pose === 'hit') fr = DOG_HIT;
    else if (r.pose === 'jump') fr = DOG_JUMP;
    else if (r.pose === 'low') fr = DOG_LOW;
    else fr = Math.floor(r.t / SPB) % 2 === 0 ? DOG_A : DOG_B;   // 拍ごとに一歩
    var sh = 0.32 - z / 900;
    diamond(cu - 0.3, cu + 0.3, 0.2, 0.8, 0, cu, '#000000', Math.max(0.1, sh));
    var p = P(cu, 0.5, z, cu);
    var bob = (r.pose === 'run' && !result) ? -Math.abs(Math.sin(Math.PI * ((r.t / SPB) % 1))) * 12 : 0;
    if (result && ok) bob = -Math.abs(Math.sin(game.time.elapsed * 6)) * 40;
    var white = !result && r.pose === 'hit' && (r.stunT > 0 || r.stopT > 0);
    var px = white ? 14 : 11;
    game.draw.sprite(fr, white ? DOG_WHITE : DOG_PAL, p.x, p.y + bob - fr.length * px / 2, px, { anchor: 'center' });
  }

  function drawSheep(r, cu, result) {
    var fd = flockDist(r, result);
    var off = [[0, 0.25], [0.55, 0.8], [0.35, -0.05], [0.9, 0.45]];
    for (var i = off.length - 1; i >= 0; i--) {
      var bt = r.t / SPB + i * 0.25;
      var p = P(cu + fd + off[i][0], off[i][1], Math.abs(Math.sin(Math.PI * (bt % 1))) * 14, cu);
      game.draw.sprite(Math.floor(bt) % 2 === 0 ? SHEEP_A : SHEEP_B, SHEEP_PAL, p.x, p.y - 30, 9, { anchor: 'center' });
    }
  }

  function drawWorld(r, result) {
    var cu = camU(r);
    var base = Math.floor(cu);
    game.draw.gradient(0, H, [[0, C.grassDark], [0.18, C.grass], [0.72, C.grass2], [1, '#24401a']]);
    for (var u = base - 5; u <= base + 10; u++) {
      var a = P(u - 0.5, -7, 0, cu), b = P(u - 0.5, 6, 0, cu);
      game.draw.line(a.x, a.y, b.x, b.y, C.grid, 2);
    }
    for (var v = -7; v <= 6; v++) {
      var c = P(base - 5.5, v, 0, cu), d = P(base + 10.5, v, 0, cu);
      game.draw.line(c.x, c.y, d.x, d.y, C.grid, 2);
    }
    for (var k = base + 9; k >= base - 3; k--) {    // 小道: 1拍 = 1マス
      diamond(k - 0.5, k + 0.5, 0, 1, 0, cu, ((k % 2) + 2) % 2 === 0 ? C.path : C.path2);
    }
    // 奥: 木立(枝の根元の木 + 遠くの木)
    for (var k2 = base + 9; k2 >= base - 3; k2--) {
      if (((k2 % 3) + 3) % 3 === 0) drawTree(k2 + 0.5, -2.5, cu, 120);
      for (var i = 0; i < r.obs.length; i++) if (r.obs[i].type === 'B' && r.obs[i].k === k2) drawTree(k2, -1.35, cu, 90);
    }
    // 柵: 杭は毎拍、拍の頭で手前の杭が光る
    var nowK = Math.round(cu);
    for (var k3 = base + 9; k3 >= base - 3; k3--) {
      var lit = k3 === nowK && r.beatFlash > 0.3;
      var r1 = P(k3, -0.36, 48, cu), r2 = P(k3 + 1, -0.36, 48, cu), r3 = P(k3, -0.36, 24, cu), r4 = P(k3 + 1, -0.36, 24, cu);
      game.draw.line(r1.x, r1.y, r2.x, r2.y, C.fenceL, 7);
      game.draw.line(r3.x, r3.y, r4.x, r4.y, C.fenceL, 7);
      box(k3 - 0.06, k3 + 0.06, -0.42, -0.3, 0, 66, cu, lit ? C.gold : C.fenceT, C.fenceL, C.fenceR);
    }
    drawSheep(r, cu, result);
    // 小道の上: 奥から手前へ。犬より手前の列に来たら先に犬を描く
    var dogDone = false;
    var list = [];
    for (var m = 0; m < r.obs.length; m++) {
      var o = r.obs[m];
      if (o.k > cu + 5.6 || o.k < cu - 3) continue;
      if (o.res === 'M' && o.hitT <= 0 && o.k < cu) continue;
      list.push(o);
    }
    list.sort(function(p1, p2) { return p2.k - p1.k; });
    for (var n = 0; n < list.length; n++) {
      if (!dogDone && list[n].k < cu) { drawDog(r, result); dogDone = true; }
      if (!(result && list[n].k > cu + 1)) drawObstacle(list[n], r, cu);
    }
    if (!dogDone) drawDog(r, result);
  }

  function drawPad(r, held) {
    var dz = held ? 22 : 0;
    var top = { x: PAD_CX, y: PAD_CY - PAD_RY + dz }, rt = { x: PAD_CX + PAD_RX, y: PAD_CY + dz },
        bt = { x: PAD_CX, y: PAD_CY + PAD_RY + dz }, lf = { x: PAD_CX - PAD_RX, y: PAD_CY + dz };
    var d = PAD_D - dz;
    quad(lf, bt, { x: bt.x, y: bt.y + d }, { x: lf.x, y: lf.y + d }, C.padL);
    quad(bt, rt, { x: rt.x, y: rt.y + d }, { x: bt.x, y: bt.y + d }, C.padR);
    quad(top, rt, bt, lf, held ? C.padLit : C.padT);
    var glow = r.beatFlash;
    game.draw.line(lf.x, lf.y, top.x, top.y, glow > 0.4 ? C.gold : C.fenceT, 4 + glow * 4);
    game.draw.line(top.x, top.y, rt.x, rt.y, glow > 0.4 ? C.gold : C.fenceT, 4 + glow * 4);
    game.draw.sprite(held ? DOG_LOW : DOG_JUMP, DOG_PAL, PAD_CX, PAD_CY + dz - 6, 8, { anchor: 'center' });
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 220, C.ink, 0.55);
    txt('SCORE ' + r.score, 50, 80, 42, C.fenceT, 'left');
    for (var i = 0; i < LIVES; i++) {
      game.draw.sprite(BONE, { W: '#f4f0e8' }, W - 90 - i * 90, 60, 11, { anchor: 'center', alpha: i < r.lives ? 1 : 0.2 });
    }
    var progress = Math.max(0, Math.min(1, r.t / SONG_LEN));
    var x0 = 60, x1 = W - 140;
    game.draw.rect(x0, 134, x1 - x0, 14, C.grassDark);
    game.draw.rect(x0, 134, (x1 - x0) * progress, 14, C.gold);
    game.draw.sprite(DOG_A, DOG_PAL, x0 + (x1 - x0) * progress, 128, 4, { anchor: 'center' });
    game.draw.sprite(SHEEP_A, SHEEP_PAL, x1 + 50, 130, 6, { anchor: 'center' });
    var bInBar = ((Math.floor(r.t / SPB) % 4) + 4) % 4;
    for (var k = 0; k < 4; k++) {
      var on = k === bInBar && r.t >= 0;
      game.draw.circle(W / 2 - 105 + k * 70, 192, on ? 13 + r.beatFlash * 6 : 10, on ? C.gold : '#3a5a2a');
    }
    if (r.combo >= 2) txt(r.combo + ' COMBO', 50, 204, 30, C.good, 'left');
  }

  // ── ATTRACT 実演(実ロジック: 跳ぶ・伏せる・伏せから跳ぶ の成功3回 + 押さえっぱなしで丸太にぶつかる失敗1回) ──
  var DEMO_CHART = [[2, 'L'], [4, 'B'], [5, 'L'], [7, 'L']];
  var DEMO_PLAN = [[2 * SPB - 0.14, 'p'], [2 * SPB, 'r'], [4 * SPB - 0.02, 'p'], [5 * SPB, 'r'], [6.3 * SPB, 'p'], [7 * SPB + 0.3, 'r']];
  var DEMO_CYC = 8 * SPB;
  var demo = { t: 0, run: null, i: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt || !demo.run) {
      demo.run = makeRun(DEMO_CHART, 0);
      demo.run.demo = true; demo.run.lives = 99; demo.i = 0;
      startBgm();
    }
    var r = demo.run;
    stepRun(r, dt);
    while (demo.i < DEMO_PLAN.length && r.t >= DEMO_PLAN[demo.i][0]) {
      if (DEMO_PLAN[demo.i][1] === 'p') doPress(r); else doRelease(r);
      demo.i++;
    }
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
    if (!run.over) game.audio.tone(330, 0.06, { wave: 'triangle', volume: 0.07, slide: -140 });
    doPress(run);
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !run || !run.hold) return;
    if (!run.over && run.stunT <= 0) game.audio.play('se_jump', 0.45);
    doRelease(run);
  });

  game.onUpdate(function(dt) {
    if (dt > 0.1) dt = 0.1;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld(demo.run, false);
      drawPad(demo.run, demo.run.hold);
      game.draw.hand(PAD_CX + 70, PAD_CY - 20 + (demo.run.hold ? 22 : 0), { press: demo.run.hold, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.5);
      txt(GAME_TITLE, W / 2, H * 0.055, 80, C.gold);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 36, C.fenceT);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 32, C.white);
      return;
    }

    if (state === S.PLAYING) {
      stepRun(run, dt);
      drawWorld(run, false);
      drawPad(run, run.hold);
      drawHud(run);
      if (run.t < 0) txt(run.t < -SPB ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.gold);
      return;
    }

    // RESULT
    resultT += dt;
    drawWorld(run, true);
    drawPad(run, false);
    game.draw.rect(0, H * 0.06, W, H * 0.33, C.ink, 0.62);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 96, ok ? C.good : C.danger);
    txt('SCORE ' + (ok ? run.score : 0), W / 2, H * 0.19, 56, C.white);
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.245, 34, C.fenceT);
    txt(run.maxCombo + ' COMBO', W / 2, H * 0.29, 34, C.good);
    txt('BEST ' + Math.max(game.best, ok ? run.score : 0), W / 2, H * 0.335, 36, C.gold);
    if (!ok) {
      var left = Math.max(1, BEATS - Math.max(0, Math.floor(run.t / SPB)));
      txt('あと' + left + '歩!', W / 2, H * 0.375, 44, C.gold);
    } else if (newRecord && Math.floor(game.time.elapsed * 3) % 2 === 0) {
      txt('NEW RECORD', W / 2, H * 0.375, 48, C.gold);
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

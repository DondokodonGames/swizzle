// K-DS-0034v3-balloon-plant-twin-bounce.js
// 風船検査の両手打ち — 左右の透明管から食い込んだ拍で落ちてくる風船を、左手と右手でそれぞれの跳ね台を叩いて天井の網へ打ち上げる
// 操作: 画面の左半分=左の跳ね台、右半分=右の跳ね台(押した瞬間で判定・両手同時押し可)。風船は管の中を降りて管口で一瞬止まり、ポンと放たれてからちょうど1拍で跳ね台に触れる。その拍(多くは裏の8分に食い込む)の頭で同じ側を押す。拍の頭からのずれでPERFECT/GOOD。外れた押し・押し損ねはMISS(風船は床でしぼむ)。風船が近くにいない時の空打ちは罰なし
// 終わり: 前奏1小節+7小節と最後の一打(104BPM・約19秒・29個)を打ち切ればCLEAR。MISS 3回でGAME OVER
// @mechanic: coop_2zone
// @theme: balloon_plant_twin_bounce
// 世界観: 風船工場の検査場で、検査員が天井から伸びる左右の管から落ちてくる膨らみたての風船を、両手で跳ね台を叩いて天井の検査済みの網へ打ち上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・左右それぞれの打ち上げ数・最大コンボ)
// スタイル: 90s LOW POLY

(function(game) {
  var STYLE = { bg: ['#1a2640', '#46628a', '#b4c2d2'], main: ['#e2485c', '#f4cc4e', '#4aa8dc'], accent: ['#f6f4ee', '#78dc80'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点を毎フレーム微小に揺らす。奥の機械はフォグ色の帯で潰す
  var C = {
    sky0: STYLE.bg[0], wall: STYLE.bg[1], fog: STYLE.bg[2],
    red: STYLE.main[0], yel: STYLE.main[1], blue: STYLE.main[2],
    white: STYLE.accent[0], good: STYLE.accent[1],
    ink: '#0e1220', steel: '#66728a', steelDk: '#343c52', steelHi: '#9aa6bc',
    pad: '#d88a3a', padHi: '#f2b45e', glass: '#cfe4f0', bad: '#ff5a3a', skin: '#f0c49a', coat: '#e8ecf2', navy: '#2c3a60'
  };
  var BAL_COL = [[C.red, '#a82c3c'], [C.yel, '#b88e24'], [C.blue, '#2c709c']];

  var GAME_TITLE = 'TWIN BOUNCE';
  var BPM = 104;
  var SPB = 60 / BPM;
  var WIN_P = 0.065, WIN_G = 0.14, WIN_M = 0.26;
  var LIVES = 3;
  // 譜面: [8分の位置(1小節=8), 側 0=左 1=右]。食い(2拍目の裏・4拍目の裏)が中心。最後は両手同時
  var CHART = [
    [8, 0], [11, 1], [14, 0],
    [16, 1], [19, 0], [22, 1],
    [24, 0], [27, 1], [30, 0], [31, 1],
    [34, 0], [35, 1], [38, 0], [39, 1],
    [40, 0], [40, 1], [43, 0], [46, 1], [47, 0],
    [49, 1], [51, 0], [54, 1], [55, 0],
    [56, 0], [59, 1], [62, 0], [63, 1],
    [64, 0], [64, 1]
  ];
  var SONG_END_B = 32.6;
  var DEMO_CHART = [[4, 0], [7, 1], [10, 0], [11, 1], [14, 0]];
  var DEMO_FAIL = 3;          // ゴーストはこの風船を見送ってMISSを見せる
  var DEMO_CYCLE = 8 * SPB + 1.7;

  var TUBE_X = [270, 810];
  var TUBE_TOP = 310, MOUTH = 690;
  var PADDLE_Y = 1310;
  var FLOOR_Y = 1420;
  var NET = { x: 540, y: 320 };
  var BTN_Y = 1650;
  var BR = 56;

  // 伴奏(8分): 3-3-2 のベース、1・3拍のキック、2・4拍の手拍子、リードは食いのメロディ
  var ROOTS = ['C3', 'A2', 'F2', 'G2'];
  var LEADM = ['E5', 0, 0, 'G5', 0, 0, 'A5', 'G5', 'E5', 0, 0, 'D5', 0, 0, 'C5', 'D5'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, pl: 0, pr: 0 };

  // ── 検査員のスプライト(白帽・白衣) ──────────────────
  var INSP_BASE = [
    '............',
    '...wwwwww...',
    '..wwwwwwww..',
    '...ssssss...',
    '...sesses...',
    '...ssssss...',
    '....smms....',
    '..cccccccc..',
    '..ccnccncc..',
    '..cccccccc..',
    '..cccccccc..',
    '..nnn..nnn..',
    '..kk....kk..'
  ];
  function setCh(rows, r, c, ch) { rows[r] = rows[r].substring(0, c) + ch + rows[r].substring(c + 1); }
  function inspFrame(lUp, rUp, oops, step) {
    var f = INSP_BASE.slice();
    if (lUp) { setCh(f, 4, 0, 's'); setCh(f, 5, 1, 's'); setCh(f, 6, 1, 'c'); } else { setCh(f, 8, 1, 'c'); setCh(f, 9, 0, 's'); }
    if (rUp) { setCh(f, 4, 11, 's'); setCh(f, 5, 10, 's'); setCh(f, 6, 10, 'c'); } else { setCh(f, 8, 10, 'c'); setCh(f, 9, 11, 's'); }
    if (oops) { f[4] = '...sossos...'; f[6] = '....sOOs....'; }
    if (step) { f[11] = '.nnn....nnn.'; f[12] = '.kk......kk.'; }
    return f;
  }
  var FR = {
    idleA: inspFrame(false, false, false, false), idleB: inspFrame(false, false, false, true),
    left: inspFrame(true, false, false, false), right: inspFrame(false, true, false, false),
    both: inspFrame(true, true, false, false), oops: inspFrame(false, false, true, true)
  };
  var INSP_PAL = { w: C.white, s: C.skin, e: C.ink, o: C.ink, m: '#b05a4a', O: '#7a2a2a', c: C.coat, n: C.navy, k: C.ink };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // 凸多角形を横ストリップで塗る(clipY を渡すとその高さより上だけ=光の面)
  function polyFill(pts, col, clipY) {
    var top = 1e9, bot = -1e9, i;
    for (i = 0; i < pts.length; i++) { top = Math.min(top, pts[i][1]); bot = Math.max(bot, pts[i][1]); }
    if (clipY !== undefined) bot = Math.min(bot, clipY);
    for (var y = Math.ceil(top); y < bot; y += 2) {
      var lo = 1e9, hi = -1e9;
      for (i = 0; i < pts.length; i++) {
        var p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p[1] <= y) !== (q[1] <= y)) {
          var x = p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]);
          lo = Math.min(lo, x); hi = Math.max(hi, x);
        }
      }
      if (hi > lo) game.draw.rect(lo, y, hi - lo, 2, col);
    }
  }
  function polyEdge(pts, col, w) {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      game.draw.line(p[0], p[1], q[0], q[1], col, w);
    }
  }
  function jit(i, k) { return Math.sin(game.time.elapsed * 21 + i * 2.3 + k) * 2; }
  function balloonPts(cx, cy, r, sx, sy) {
    var pts = [];
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 4;
      var rr = r * (i === 4 ? 1.12 : 1);  // 下が少しとがる
      pts.push([cx + Math.cos(a) * rr * sx + jit(i, cx), cy + Math.sin(a) * rr * sy * 1.12 + jit(i, cy)]);
    }
    return pts;
  }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var ch = isDemo ? DEMO_CHART : CHART;
    var bs = [];
    for (var i = 0; i < ch.length; i++) {
      bs.push({ b: ch[i][0] / 2, side: ch[i][1], st: 'wait', col: (i * 2 + ch[i][1]) % 3, x: TUBE_X[ch[i][1]], y: TUBE_TOP, at: 0, fx: 0, fy: 0, puffed: false });
    }
    return {
      demo: isDemo, bs: bs, bp: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, hitL: 0, hitR: 0,
      padT: [0, 0], padGood: [0, 0], pulse: 0, oops: 0, armT: [0, 0],
      stop: 0, stopB: null, netCount: 0, netFlash: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < LEADM.length; i++) notes.push([LEADM[i] || 'R', 0.5]);
    for (var j = 0; j < 2; j++) {
      var r = ROOTS[j];
      bass.push([r, 1.5], [r, 1.5], [r, 1]);
    }
    game.audio.melody(notes, { tempo: BPM, wave: 'square', volume: 0.04, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function playStep(s) {
    var slot = s % 8, bar = Math.floor(s / 8);
    var root = ROOTS[bar % 4];
    // 3-3-2 のベース(食いの骨組み)。4拍目の裏は次の和音を先取り
    if (slot === 0 || slot === 3 || slot === 6) game.audio.tone(root, SPB * 0.7, { wave: 'triangle', volume: 0.1 });
    if (slot === 7) game.audio.tone(ROOTS[(bar + 1) % 4], SPB * 0.4, { wave: 'triangle', volume: 0.08 });
    if (slot === 0 || slot === 4) game.audio.tone(110, 0.08, { wave: 'sine', volume: 0.14, slide: -60 });
    if (slot === 2 || slot === 6) game.audio.tone(1500, 0.05, { wave: 'square', volume: 0.035, slide: -900 });
    game.audio.tone(5200, 0.02, { wave: 'triangle', volume: 0.02 });
    var m = LEADM[s % 16];
    if (bar >= 1 && m) game.audio.tone(m, SPB * 0.4, { wave: 'square', volume: 0.04 });
  }

  function landT(bl) { return bl.b * SPB; }

  function balloonPos(bl) {
    var u;
    if (bl.st === 'tube') {
      u = (R.bp - (bl.b - 2.5)) / 1.5;
      return { x: TUBE_X[bl.side], y: TUBE_TOP + 40 + (MOUTH - TUBE_TOP - 40) * Math.min(1, u) };
    }
    if (bl.st === 'fall') {
      u = R.bp - (bl.b - 1);
      var y = MOUTH + (PADDLE_Y - BR - MOUTH) * u * u;
      return { x: TUBE_X[bl.side], y: y };
    }
    return { x: bl.fx, y: bl.fy };
  }

  // 片側を押した: 戻り値は判定
  function pressSide(side) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    R.padT[side] = 0.16; R.armT[side] = 0.25;
    var now = R.bp * SPB;
    var best = null, bd = 1e9;
    for (var i = 0; i < R.bs.length; i++) {
      var bl = R.bs[i];
      if (bl.side !== side || (bl.st !== 'fall' && bl.st !== 'tube')) continue;
      var d = now - landT(bl);
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = bl; }
    }
    if (!best || Math.abs(bd) > WIN_M) return 'empty';
    if (Math.abs(bd) > WIN_G) { missBalloon(best); return 'off'; }
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    hitBalloon(best, grade);
    return grade;
  }

  function hitBalloon(bl, grade) {
    var p = balloonPos(bl);
    bl.st = 'up'; bl.at = 0; bl.fx = p.x; bl.fy = Math.min(p.y, PADDLE_Y - BR);
    R.padGood[bl.side] = 0.3;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (bl.side === 0) R.hitL++; else R.hitR++;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    game.feedback.good(TUBE_X[bl.side], PADDLE_Y - 170, { text: grade, color: grade === 'PERFECT' ? C.yel : C.good, count: grade === 'PERFECT' ? 14 : 8 });
    game.fx.burst(TUBE_X[bl.side], PADDLE_Y - 20, { color: BAL_COL[bl.col][0], count: 10, speed: 320 });
    if (!R.demo) game.audio.tone(bl.side === 0 ? 'G5' : 'C6', 0.07, { wave: 'square', volume: 0.06 });
    if (!R.demo && R.combo % 8 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, 900, { color: C.yel, size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missBalloon(bl) {
    var p = balloonPos(bl);
    bl.st = 'stop'; bl.fx = p.x; bl.fy = Math.min(p.y, FLOOR_Y - BR);
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.45; R.stopB = bl; R.oops = 1.2;
    if (!R.demo) game.audio.tone(140, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function releaseStop() {
    var bl = R.stopB;
    R.stopB = null;
    if (!bl) return;
    bl.st = 'flop'; bl.at = 0;
    game.feedback.bad(bl.fx, bl.fy - 110, { text: 'MISS' });
    game.audio.play('se_break', 0.25);
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 3; i++) game.fx.burst(300 + i * 240, NET.y + 40, { color: BAL_COL[i][0], count: 24, speed: 460 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.yel, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function animBalloons(dt) {
    for (var i = 0; i < R.bs.length; i++) {
      var bl = R.bs[i];
      if (bl.st === 'up') {
        bl.at += dt;
        if (bl.at >= 0.9) { bl.st = 'gone'; R.netCount++; R.netFlash = 1; }
      } else if (bl.st === 'flop') {
        bl.at += dt;
        if (bl.at >= 0.8) bl.st = 'gone';
      }
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.2);
    R.oops = Math.max(0, R.oops - dt);
    R.netFlash = Math.max(0, R.netFlash - dt * 2);
    for (var s = 0; s < 2; s++) {
      R.padT[s] = Math.max(0, R.padT[s] - dt);
      R.padGood[s] = Math.max(0, R.padGood[s] - dt);
      R.armT[s] = Math.max(0, R.armT[s] - dt);
    }
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    animBalloons(dt);
    if (R.over) return;
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('E5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.bs.length; i++) {
      var bl = R.bs[i];
      if (bl.st === 'wait' && R.bp >= bl.b - 2.5) bl.st = 'tube';
      if (bl.st === 'tube' && R.bp >= bl.b - 1) {
        // 管口から放たれる(ちょうど1拍後に跳ね台へ)。ポンという予告音
        bl.st = 'fall';
        if (!R.demo) game.audio.tone(bl.side === 0 ? 520 : 700, 0.06, { wave: 'triangle', volume: 0.05, slide: -240 });
      }
      if (bl.st === 'fall' && R.bp * SPB - landT(bl) > WIN_G) { missBalloon(bl); return; }
    }
    if (!R.demo && R.bp >= SONG_END_B) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストの両手が遊ぶ(左右を拍の頭で打ち上げ、4つ目は見送ってMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); startAttractBgm(); }
    demo.pl = Math.max(0, demo.pl - dt);
    demo.pr = Math.max(0, demo.pr - dt);
    if (R.stop > 0 || R.over) return;
    for (var i = 0; i < R.bs.length; i++) {
      var bl = R.bs[i];
      if (bl.st !== 'fall' || i === DEMO_FAIL) continue;
      if (R.bp >= bl.b) {
        pressSide(bl.side);
        if (bl.side === 0) demo.pl = 0.18; else demo.pr = 0.18;
      }
    }
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky0], [0.5, C.wall], [1, C.fog]]);
    // 遠景の機械(フォグで潰した多角形の煙突と梁)
    for (var k = 0; k < 4; k++) {
      var bx = 120 + k * 280;
      polyFill([[bx - 50, 560], [bx + 50, 560], [bx + 70, 1200], [bx - 70, 1200]], '#5a7496');
    }
    game.draw.rect(0, 760, W, 520, C.fog, 0.45 + 0.04 * Math.sin(e * 1.3));
    for (var b = 0; b < 3; b++) game.draw.line(0, 450 + b * 120, W, 430 + b * 120, '#6a84a6', 6);
    // 床
    polyFill([[0, FLOOR_Y], [W, FLOOR_Y], [W, H], [0, H]], C.steelDk);
    polyFill([[0, FLOOR_Y], [W, FLOOR_Y], [W, FLOOR_Y + 30], [0, FLOOR_Y + 30]], C.steel);
  }

  function drawNet() {
    // 天井の検査済みの網(打ち上げた風船が溜まる)
    var x0 = 380, x1 = 700, y0 = 280, y1 = 380;
    var n = Math.min(12, R.netCount);
    for (var i = 0; i < n; i++) {
      var cx = x0 + 40 + (i % 6) * 56, cy = y0 + 40 + Math.floor(i / 6) * 46;
      polyFill(balloonPts(cx, cy, 24, 1, 0.9), BAL_COL[i % 3][0]);
    }
    var col = R.netFlash > 0 ? C.good : C.steelHi;
    for (var gx = x0; gx <= x1; gx += 45) game.draw.line(gx, y0, gx + 20, y1, col, 3);
    for (var gy = y0; gy <= y1; gy += 36) game.draw.line(x0, gy, x1, gy + 8, col, 3);
    polyEdge([[x0, y0], [x1, y0], [x1 + 10, y1 + 8], [x0 - 10, y1]], col, 6);
  }

  function drawTube(side) {
    var x = TUBE_X[side];
    // 透明な管(枠は line、ガラス面は薄いストリップ)
    var pts = [[x - 70, TUBE_TOP - 20], [x + 70, TUBE_TOP - 20], [x + 70, MOUTH], [x - 70, MOUTH]];
    for (var y = TUBE_TOP - 20; y < MOUTH; y += 6) game.draw.rect(x - 70, y, 140, 2, C.glass, 0.26);
    game.draw.rect(x - 52, TUBE_TOP - 20, 10, MOUTH - TUBE_TOP + 20, C.white, 0.35);
    polyEdge(pts, C.ink, 10);
    polyEdge(pts, C.steelHi, 5);
    // 管口の口金(放つ瞬間に開く)
    var open = false;
    for (var i = 0; i < R.bs.length; i++) {
      var bl = R.bs[i];
      if (bl.side === side && bl.st === 'fall' && R.bp - (bl.b - 1) < 0.25) open = true;
    }
    var lip = open ? 22 : 0;
    polyFill([[x - 90, MOUTH - 10], [x - 40 - lip, MOUTH - 10], [x - 46 - lip, MOUTH + 26], [x - 84, MOUTH + 26]], C.steel);
    polyFill([[x + 40 + lip, MOUTH - 10], [x + 90, MOUTH - 10], [x + 84, MOUTH + 26], [x + 46 + lip, MOUTH + 26]], C.steel);
    // 天井側の送り口と予告ランプ(風船が管に入ると灯る)
    polyFill([[x - 90, TUBE_TOP - 60], [x + 90, TUBE_TOP - 60], [x + 80, TUBE_TOP - 16], [x - 80, TUBE_TOP - 16]], C.steelDk);
    var lit = false;
    for (var j = 0; j < R.bs.length; j++) if (R.bs[j].side === side && R.bs[j].st === 'tube') lit = true;
    game.draw.circle(x, TUBE_TOP - 38, 14, lit && Math.floor(game.time.elapsed * 10) % 2 === 0 ? C.yel : C.ink);
  }

  function drawBalloon(x, y, ci, sx, sy, face, white) {
    var pts = balloonPts(x, y, BR, sx, sy);
    var cs = BAL_COL[ci];
    if (white) {
      polyFill(pts, C.white);
    } else {
      polyFill(pts, cs[1]);
      polyFill(pts, cs[0], y - BR * 0.1 * sy);
    }
    polyEdge(pts, C.ink, 4);
    // 結び目とひも
    game.draw.line(x, y + BR * 1.2 * sy, x + 6, y + BR * 1.2 * sy + 26, C.ink, 3);
    if (face) {
      game.draw.rect(x - 20 * sx, y - 8, 9, 14, C.ink);
      game.draw.rect(x + 11 * sx, y - 8, 9, 14, C.ink);
    }
  }

  function drawBalloons() {
    var e = game.time.elapsed;
    for (var i = 0; i < R.bs.length; i++) {
      var bl = R.bs[i];
      if (bl.st === 'tube' || bl.st === 'fall') {
        var p = balloonPos(bl);
        drawBalloon(p.x, p.y, bl.col, 1, 1, true, false);
      } else if (bl.st === 'stop') {
        var white = Math.floor(e * 20) % 2 === 0;
        drawBalloon(bl.fx, bl.fy, bl.col, 1.35, 1.35, true, white);
      } else if (bl.st === 'up') {
        var t = Math.min(1, bl.at / 0.9);
        var ux = bl.fx + (NET.x + (bl.side === 0 ? -100 : 100) - bl.fx) * t;
        var uy = bl.fy + (NET.y + 40 - bl.fy) * (1 - (1 - t) * (1 - t));
        var sq = t < 0.15 ? 1 - (0.15 - t) * 2 : 1;
        drawBalloon(ux, uy, bl.col, 1 - t * 0.5, (1 - t * 0.5) * sq, false, false);
      } else if (bl.st === 'flop') {
        // 床でしぼむ
        var t2 = Math.min(1, bl.at / 0.8);
        var fy = bl.fy + (FLOOR_Y - 20 - bl.fy) * Math.min(1, t2 * 2.5);
        drawBalloon(bl.fx, fy, bl.col, 1 + t2 * 0.4, Math.max(0.2, 1 - t2 * 0.8), false, false);
      }
    }
  }

  function nearestFall(side) {
    var best = null;
    for (var i = 0; i < R.bs.length; i++) {
      var bl = R.bs[i];
      if (bl.side === side && bl.st === 'fall' && (!best || bl.b < best.b)) best = bl;
    }
    return best;
  }

  function drawPaddle(side) {
    var x = TUBE_X[side];
    var press = R.padT[side] > 0;
    var lift = press ? -26 * (R.padT[side] / 0.16) : 0;
    var nx = nearestFall(side);
    var soon = nx && nx.b - R.bp < 0.5;
    // 着地の目印(跳ね台の上で縮む輪の代わりに、迫る菱形の枠)
    if (nx) {
      var k = Math.max(0, Math.min(1, (nx.b - R.bp)));
      var hw = 120 + k * 120;
      polyEdge([[x, PADDLE_Y - 40 - hw * 0.5], [x + hw, PADDLE_Y - 40], [x, PADDLE_Y - 40 + hw * 0.5], [x - hw, PADDLE_Y - 40]], soon ? C.yel : C.steelHi, 5);
    }
    // 支柱とばね
    for (var z = 0; z < 4; z++) game.draw.line(x - 30, PADDLE_Y + 20 + z * 22 + lift * (1 - z / 4), x + 30, PADDLE_Y + 31 + z * 22 + lift * (1 - z / 4), C.steelHi, 8);
    polyFill([[x - 60, FLOOR_Y - 6], [x + 60, FLOOR_Y - 6], [x + 70, FLOOR_Y + 10], [x - 70, FLOOR_Y + 10]], C.steel);
    // 跳ね台の板(上面は明るい面)
    var top = PADDLE_Y + lift;
    var col = R.padGood[side] > 0 ? C.good : (soon ? C.padHi : C.pad);
    polyFill([[x - 120, top], [x + 120, top], [x + 104, top + 30], [x - 104, top + 30]], '#9a5a20');
    polyFill([[x - 120, top], [x + 120, top], [x + 112, top + 14], [x - 112, top + 14]], col);
    polyEdge([[x - 120, top], [x + 120, top], [x + 104, top + 30], [x - 104, top + 30]], C.ink, 4);
  }

  function drawInspector() {
    var e = game.time.elapsed;
    var lUp = R.armT[0] > 0, rUp = R.armT[1] > 0;
    var f = R.oops > 0 ? FR.oops : (lUp && rUp ? FR.both : (lUp ? FR.left : (rUp ? FR.right : (Math.floor(e * 2.4) % 2 === 0 ? FR.idleA : FR.idleB))));
    var bob = R.pulse * 10;
    polyFill([[460, FLOOR_Y + 4], [620, FLOOR_Y + 4], [600, FLOOR_Y + 24], [480, FLOOR_Y + 24]], C.ink);
    game.draw.sprite(f, INSP_PAL, 540, 1300 - bob, 15, { anchor: 'center' });
  }

  function drawButtons() {
    for (var s = 0; s < 2; s++) {
      var x = s === 0 ? 270 : 810;
      var press = R.padT[s] > 0;
      var nx = nearestFall(s);
      var soon = nx && nx.b - R.bp < 0.5;
      var r = press ? 150 : 165;
      var pts = [];
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + Math.PI / 6;
        pts.push([x + Math.cos(a) * r + jit(i, s), BTN_Y + Math.sin(a) * r * 0.7 + jit(i, s + 3)]);
      }
      polyFill(pts, press ? C.padHi : C.steelDk);
      polyFill(pts, press ? C.white : (soon ? C.pad : C.steel), BTN_Y - r * 0.2);
      polyEdge(pts, soon ? C.yel : C.ink, 6);
    }
    game.draw.line(540, 1470, 540, 1860, C.steel, 6);
  }

  function drawWorld() {
    drawBg();
    drawNet();
    drawTube(0);
    drawTube(1);
    drawPaddle(0);
    drawPaddle(1);
    drawInspector();
    drawBalloons();
    drawButtons();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 70, 36, C.yel, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      polyFill(balloonPts(W - 70 - i * 64, 150, 20, 1, 0.9), on ? C.red : C.steelDk);
    }
    // 拍ランプ: 大=拍の頭、小=裏。今の8分が灯る(食いの位置が見える)
    var cur = R.ready > 0 ? -1 : Math.floor(R.bp * 2) % 8;
    for (var k = 0; k < 8; k++) {
      var big = k % 2 === 0;
      var x = 90 + k * 62;
      var lit = k === cur;
      var hasNote = false;
      var barStart = Math.floor(R.bp / 4) * 8;
      for (var j = 0; j < R.bs.length; j++) if (R.bs[j].b * 2 === barStart + k && R.bs[j].st !== 'wait') hasNote = true;
      game.draw.circle(x, 150, big ? 22 : 14, lit ? C.yel : (hasNote ? C.pad : C.steelDk));
    }
    var progress = Math.min(1, R.bp / SONG_END_B);
    game.draw.rect(40, 200, W - 80, 14, C.steelDk);
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.good);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, 1050, 44, C.yel);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 620, 110, C.yel);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.24, W, H * 0.32, C.ink, 0.78);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.36, 62, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.41, 34, C.fog);
    txt('◀ ' + R.hitL + '   ' + R.hitR + ' ▶   COMBO ' + R.maxCombo, W / 2, H * 0.45, 36, C.fog);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.5, 50, C.yel);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.5, 42, C.yel);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.bs.length; i++) if (R.bs[i].st === 'wait' || R.bs[i].st === 'tube' || R.bs[i].st === 'fall') left++;
      txt('あと' + Math.max(1, left) + '個', W / 2, H * 0.54, 46, C.yel);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, 110 + 6 + bob, { size: 104, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 110 + bob, { size: 104, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 2, 106 + bob, { size: 104, color: C.yel, bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 200, 40, C.white);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 50, C.yel);
    else txt('INSERT COIN', W / 2, H * 0.95, 42, C.white);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || !R) return;
    var side = x < W / 2 ? 0 : 1;
    var res = pressSide(side);
    if (res === 'empty') {
      game.audio.play('se_tap', 0.35);
      game.fx.burst(TUBE_X[side], PADDLE_Y, { color: C.steelHi, count: 4, speed: 120 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      var hb = Math.sin(game.time.elapsed * 3) * 10;
      game.draw.hand(270 + 30, BTN_Y + 40 + hb - (demo.pl > 0 ? 30 : 0), { press: demo.pl > 0, scale: 14 });
      game.draw.hand(810 + 30, BTN_Y + 40 - hb - (demo.pr > 0 ? 30 : 0), { press: demo.pr > 0, scale: 14 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      animBalloons(dt);
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 42, C.white);
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, left: R.hitL, right: R.hitR };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);

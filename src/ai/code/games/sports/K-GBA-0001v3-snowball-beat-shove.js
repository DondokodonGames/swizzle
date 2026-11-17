// K-GBA-0001v3-snowball-beat-shove.js
// 大雪玉ビート突き — 転がり寄る大雪玉に拍ごとの突きを重ね、だんだん速まる拍に乗ったまま陣地の外まで押し返す
// 操作: 拍の頭でタップすると手袋で突く(1拍に1回)。拍を外した突きは空振りで雪玉が寄る。テンポは2小節ごとに上がる
// 終わり: 雪玉を陣地の縄の外まで押し出せばCLEAR。子どもの足元まで寄られたらGAME OVER、曲が終わればTIME UP
// @mechanic: push_out
// @theme: snowfield_snowball_shove
// 世界観: 雪原の雪合戦広場。厚手の手袋をはめた子どもが、転がってくる大雪玉を拍に乗った突きだけで陣地の外へ突き返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ・押し出した拍)
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの雪原、高さは影の距離で示す(奥でも小さくしない)
  var STYLE = { bg: ['#4a6ab8', '#a8c4ec'], main: ['#eef4ff', '#b8cce8', '#3c5cc8'], accent: ['#e8403c', '#ffc83c'] };
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], snow: STYLE.main[0], shade: STYLE.main[1], coat: STYLE.main[2],
    red: STYLE.accent[0], mitt: STYLE.accent[1],
    grid: '#9fb6dc', ink: '#1c2440', skin: '#ffd2b0', good: '#3ce08c', white: '#ffffff', dark: '#5a6c94'
  };

  var GAME_TITLE = 'SNOW SHOVE';
  var BPMS = [100, 120, 140, 160];      // 2小節ごとに加速(tempo_ramp)
  var DEMO_BPMS = [100, 130];
  var WIN_P = 0.06, WIN_G = 0.13;
  var P_START = 0.32;
  var PUSH_P = 0.055, PUSH_G = 0.04, FUMBLE = 0.035;
  var CREEP = [0.02, 0.024, 0.028, 0.032];
  var SEMI = [0, 2, 4, 7];              // 段ごとに伴奏の調も上がる
  // 陣地(等角の円)と雪玉の通り道
  var CCX = W * 0.52, CCY = H * 0.52, CRX = 440, CRY = 220;
  var KX = W * 0.28, KY = H * 0.6;      // 子どもの足元
  var UX = 0.894, UY = -0.447;          // 等角の奥向き
  var S0 = 150, S1 = 700;               // 接触点〜縄の外
  var BALL_R = 100;
  var PAD_X = W * 0.5, PAD_Y = H * 0.86;
  var MEL = [0, null, 3, 0, 7, null, 5, 3, 0, 3, null, 7, 10, null, 7, 5];
  var BASS = [-24, -24, -17, -19];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, pressT: 0, gx: PAD_X, gy: PAD_Y, done: {} };

  // 子ども(右奥を向いて構える)
  var KID_A = [
    '....ww......',
    '...rrrr.....',
    '..rrrrrr....',
    '..rrrrrr....',
    '..sssskss...',
    '..ssssssss..',
    '..cccccc....',
    '.bbbbbbbmm..',
    '.bbbbbbbmm..',
    '.bbbbbb.....',
    '..bb.bb.....',
    '..dd.dd.....',
    '.ddd.ddd....'
  ];
  var KID_B = [
    '............',
    '....ww......',
    '...rrrr.....',
    '..rrrrrr....',
    '..sssskss...',
    '..ssssssss..',
    '..cccccc....',
    '.bbbbbbbmm..',
    '.bbbbbbbmm..',
    '.bbbbbb.....',
    '..bb.bb.....',
    '..dd.dd.....',
    '.ddd.ddd....'
  ];
  var KID_PUSH = [
    '.....ww.....',
    '....rrrr....',
    '...rrrrrr...',
    '...rrrrrr...',
    '...sssskss..',
    '...ssssssss.',
    '..cccccc....',
    '.bbbbbbbbbmm',
    '.bbbbbbbbbmm',
    '.bbbbbb.....',
    '.bb...bb....',
    '.dd....dd...',
    'ddd....ddd..'
  ];
  var KID_SLIP = [
    '............',
    '............',
    '..ww........',
    '.rrrr.......',
    'rrrrrr......',
    'rrrrrr..mm..',
    'sskksbbbmm..',
    'ssssssbbb...',
    '.cccccbbb...',
    '.bbbbbbbbdd.',
    '.bbbbbbbbddd',
    '..mm........',
    '..mm........'
  ];
  var KID_CHEER = [
    'mm..ww....mm',
    'mm.rrrr...mm',
    '.brrrrrr.bb.',
    '..brrrrrrb..',
    '..sssskss...',
    '..ssssssss..',
    '..cccccc....',
    '.bbbbbbbb...',
    '.bbbbbbbb...',
    '.bbbbbb.....',
    '..bb.bb.....',
    '..dd.dd.....',
    '.ddd.ddd....'
  ];
  var MITT = ['.mm.m', 'mmmmm', 'mmmmm', 'mmmm.', '.mm..'];
  var FLAG = ['rrr', 'rr.', 'r..', 'k..', 'k..'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function fillPoly(pts, col, alpha) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    for (var y = Math.floor(minY); y <= maxY; y += 2) {
      var xl = 1e9, xr = -1e9;
      for (var j = 0; j < pts.length; j++) {
        var a = pts[j], b = pts[(j + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          var x = a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, 2, col, alpha);
    }
  }
  function fillEllipse(cx, cy, rx, ry, col, alpha) {
    for (var y = -ry; y <= ry; y += 3) {
      var hw = rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)));
      game.draw.rect(cx - hw, cy + y, hw * 2, 3, col, alpha);
    }
  }
  function diamond(cx, cy, rx, ry, col, w) {
    game.draw.line(cx, cy - ry, cx + rx, cy, col, w);
    game.draw.line(cx + rx, cy, cx, cy + ry, col, w);
    game.draw.line(cx, cy + ry, cx - rx, cy, col, w);
    game.draw.line(cx - rx, cy, cx, cy - ry, col, w);
  }
  // 接地点(x,y)を手前の頂点とする雪のブロック(上面/左面/右面の3明度)
  function isoBlock(x, y, w, h) {
    fillPoly([[x - w, y - w / 2], [x, y], [x, y - h], [x - w, y - w / 2 - h]], C.shade);
    fillPoly([[x, y], [x + w, y - w / 2], [x + w, y - w / 2 - h], [x, y - h]], C.dark);
    fillPoly([[x, y - h], [x + w, y - w / 2 - h], [x, y - w - h], [x - w, y - w / 2 - h]], C.snow);
  }

  function buildBeats(bpms, per) {
    var t = [0], st = [];
    for (var s = 0; s < bpms.length; s++) {
      for (var k = 0; k < per; k++) { st.push(s); t.push(t[t.length - 1] + 60 / bpms[s]); }
    }
    return { t: t, st: st };
  }

  function newRun(isDemo) {
    var bpms = isDemo ? DEMO_BPMS : BPMS;
    var per = isDemo ? 4 : 8;
    var tl = buildBeats(bpms, per);
    return {
      demo: isDemo, bpms: bpms, per: per, bt: tl.t, bst: tl.st, nBeats: bpms.length * per,
      songT: 0, beatIdx: -1, stepIdx: -1, checked: 0, used: {}, stage: 0,
      p: isDemo ? 0.76 : P_START, pv: isDemo ? 0.76 : P_START, bestP: 0, hop: 0, roll: 0, flash: 0,
      ready: isDemo ? 0 : 0.8, stop: 0, stopKind: '', over: false, ok: false, endWait: 0, endKind: '',
      perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, outBeat: 0,
      pose: 0, poseT: 0, pulse: 0, ramp: 0, milestone: false, outT: 0
    };
  }

  function curBpm() { return R.bpms[Math.min(R.stage, R.bpms.length - 1)]; }

  function startAttractBgm() {
    game.audio.melody([
      ['A4', 0.5], ['R', 0.5], ['C5', 0.5], ['A4', 0.5], ['E5', 0.5], ['R', 0.5], ['D5', 0.5], ['C5', 0.5],
      ['A4', 0.5], ['C5', 0.5], ['R', 0.5], ['E5', 0.5], ['G5', 0.5], ['R', 0.5], ['E5', 0.5], ['D5', 0.5]
    ], {
      tempo: 100, wave: 'square', volume: 0.05, loop: true,
      bass: [['A2', 1], ['A2', 1], ['E3', 1], ['D3', 1], ['A2', 1], ['A2', 1], ['E3', 1], ['D3', 1]]
    });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function hz(semi) { return 440 * Math.pow(2, semi / 12); }

  // 拍クロックの8分ステップで鳴らす伴奏(段ごとに調が上がる)
  function playStep(s, beatK) {
    var off = SEMI[R.bst[Math.min(beatK, R.nBeats - 1)]];
    var m = MEL[s % 16];
    var spb = 60 / curBpm();
    if (m !== null) game.audio.tone(hz(m + off), spb * 0.35, { wave: 'square', volume: 0.05 });
    if (s % 2 === 0) {
      var b = (s / 2) % 4;
      game.audio.tone(hz(BASS[b] + off), spb * 0.7, { wave: 'triangle', volume: 0.09 });
      game.audio.tone(b % 2 === 0 ? 110 : 300, 0.06, { wave: b % 2 === 0 ? 'square' : 'sawtooth', volume: 0.07, slide: -60 });
    }
  }

  function pathPos(p) {
    var s = S0 + (S1 - S0) * p;
    return { x: KX + UX * s, y: KY + UY * s };
  }

  function onBeat(k) {
    R.pulse = 1;
    var st = R.bst[k];
    if (k > 0 && k % R.per === 0 && st !== R.stage) {
      R.stage = st;
      if (!R.demo) {
        game.fx.popup(String(curBpm()), W / 2, H * 0.3, { color: C.mitt, size: 72 });
        game.audio.play('se_powerup', 0.4);
      }
    }
    // 次の段の2拍前から加速を予告(ランプ点滅+上昇音)
    R.ramp = (k % R.per >= R.per - 2 && st < R.bpms.length - 1) ? 1 : 0;
    if (R.ramp && !R.demo) game.audio.tone(660 + (k % R.per) * 220, 0.06, { wave: 'triangle', volume: 0.07 });
    // 雪玉が転がり寄る(最初の1拍は聞くだけ)
    if (k >= 1) {
      R.p -= CREEP[Math.min(st, CREEP.length - 1)] * (R.demo ? 0.6 : 1);
      if (R.p <= 0 && !R.demo) {
        R.p = 0;
        R.stop = 0.5; R.stopKind = 'crush'; R.flash = 0.5; R.pose = 3; R.poseT = 9;
        game.audio.tone(140, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -70 });
      }
      if (R.demo && R.p < 0.2) R.p = 0.2;
    }
  }

  // 1回の突き: 一番近い拍の頭からのずれで判定
  function thrust() {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    var best = -1, bestD = 1e9;
    for (var k = Math.max(0, R.beatIdx - 1); k <= Math.min(R.nBeats - 1, R.beatIdx + 1); k++) {
      var d = R.songT - R.bt[k];
      if (Math.abs(d) < Math.abs(bestD)) { bestD = d; best = k; }
    }
    var pos = pathPos(R.pv);
    if (best >= 0 && Math.abs(bestD) <= WIN_G && !R.used[best]) {
      R.used[best] = true;
      var grade = Math.abs(bestD) <= WIN_P ? 'PERFECT' : 'GOOD';
      R.combo++;
      if (R.combo > R.maxCombo) R.maxCombo = R.combo;
      if (grade === 'PERFECT') { R.perfect++; R.p += PUSH_P; R.score += 100 + R.combo * 5; }
      else { R.good++; R.p += PUSH_G; R.score += 60 + R.combo * 3; }
      R.hop = 1; R.pose = 1; R.poseT = 0.18;
      game.feedback.good(pos.x, pos.y - BALL_R * 2 - 30, { text: grade, color: grade === 'PERFECT' ? C.mitt : C.good, count: grade === 'PERFECT' ? 16 : 8 });
      game.fx.burst(pos.x - 60, pos.y - BALL_R, { color: C.snow, count: 10, speed: 260 });
      if (!R.demo && !R.milestone && R.p >= 0.7) {
        R.milestone = true;
        game.fx.popup('NICE', W / 2, H * 0.32, { color: C.mitt, size: 72 });
        game.audio.play('se_milestone', 0.5);
      }
      if (R.p > R.bestP) R.bestP = R.p;
      if (R.p >= 1) { R.outBeat = best; endRun(true, 'out'); }
      return grade;
    }
    // 拍を外した突き: 空振りでよろけ、雪玉が寄る
    R.combo = 0; R.miss++;
    R.p -= FUMBLE;
    R.stop = 0.3; R.stopKind = 'fumble'; R.flash = 0.3; R.pose = 2; R.poseT = 0.6;
    return 'fumble';
  }

  function releaseStop() {
    var pos = pathPos(R.pv);
    var kind = R.stopKind;
    R.stopKind = '';
    game.feedback.bad(pos.x, pos.y - BALL_R * 2 - 30, { text: 'MISS' });
    if (kind === 'crush' || (R.p <= 0 && !R.demo)) {
      R.p = 0;
      endRun(false, 'crush');
    }
    if (R.demo && R.p < 0.2) R.p = 0.2;
  }

  function endRun(ok, kind) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endKind = kind; R.endWait = 1.8;
    if (!R.demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    }
    if (ok) {
      R.pose = 4; R.poseT = 9;
      var left = R.nBeats - R.outBeat;
      R.score += left * 40;
      var pos = pathPos(1);
      game.fx.burst(pos.x, pos.y - BALL_R, { color: C.snow, count: 30, speed: 520 });
      game.fx.burst(CCX, CCY - 200, { color: C.mitt, count: 24, speed: 460 });
    }
    if (!R.demo && R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.mitt, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.hop = Math.max(0, R.hop - dt * 4);
    R.flash = Math.max(0, R.flash - dt);
    if (R.poseT > 0) { R.poseT -= dt; if (R.poseT <= 0) R.pose = 0; }
    var prev = R.pv;
    R.pv += (R.p - R.pv) * Math.min(1, dt * 12);
    R.roll += (R.pv - prev) * 9;
    if (R.over) {
      if (R.ok) { R.outT += dt; R.p = 1 + R.outT * 0.8; }
      return;
    }
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('E5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    while (R.beatIdx + 1 <= R.nBeats && R.songT >= R.bt[R.beatIdx + 1]) {
      R.beatIdx++;
      if (R.beatIdx >= R.nBeats) break;
      onBeat(R.beatIdx);
      if (R.stop > 0) return;
    }
    if (R.beatIdx >= R.nBeats) {
      if (!R.demo) endRun(false, 'time');
      return;
    }
    // 8分ステップ
    var k = Math.max(0, R.beatIdx);
    var f = (R.songT - R.bt[k]) / (R.bt[k + 1] - R.bt[k]);
    var stepAbs = k * 2 + (f >= 0.5 ? 1 : 0);
    while (R.stepIdx < stepAbs) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx, Math.floor(R.stepIdx / 2)); }
    // 突かずに過ぎた拍はコンボが切れる
    while (R.checked < R.nBeats && R.songT > R.bt[R.checked] + WIN_G) {
      if (!R.used[R.checked] && R.checked >= 1) R.combo = 0;
      R.checked++;
    }
  }

  // ATTRACT: ゴーストが拍の頭で突く。3拍目の後に1回だけ拍を外して空振り(失敗例)
  function stepDemo(dt) {
    demo.t += dt;
    var len = 4 * 60 / DEMO_BPMS[0] + 4 * 60 / DEMO_BPMS[1] + 0.8;
    var cyc = demo.t % len;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.done = {}; demo.pressT = 0; }
    demo.pressT = Math.max(0, demo.pressT - dt);
    if (!R.over && R.stop <= 0) {
      for (var k = 1; k < R.nBeats; k++) {
        if (!demo.done[k] && R.songT >= R.bt[k]) { demo.done[k] = true; thrust(); demo.pressT = 0.12; }
      }
      var mid = (R.bt[3] + R.bt[4]) / 2;
      if (!demo.done.off && R.songT >= mid) { demo.done.off = true; thrust(); demo.pressT = 0.12; }
    }
    demo.press = demo.pressT > 0;
    demo.gx = PAD_X + 40 + Math.sin(demo.t * 1.7) * 10;
    demo.gy = PAD_Y + 30 + (demo.press ? 0 : -30);
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawField() {
    var e = game.time.elapsed;
    game.draw.rect(0, H * 0.3, W, H * 0.7, C.snow);
    var cA = CCY - 0.5 * CCX, cB = CCY + 0.5 * CCX;
    for (var n = -30; n <= 30; n++) {
      var a = cA + n * 80, b = cB + n * 80;
      game.draw.line(0, a, W, a + 0.5 * W, C.grid, 2);
      game.draw.line(0, b, W, b - 0.5 * W, C.grid, 2);
    }
    game.draw.gradient(0, H * 0.3, [[0, C.sky0], [1, C.sky1]]);
    // 遠景の雪山(菱形の連なり)
    for (var m = 0; m < 6; m++) {
      var mx = m * 220 + 40, mh = 120 + (m % 3) * 50;
      fillPoly([[mx - 160, H * 0.3], [mx, H * 0.3 - mh], [mx + 160, H * 0.3]], m % 2 ? '#d8e4f8' : '#c4d4f0');
    }
    game.draw.rect(0, H * 0.285, W, H * 0.03, C.white, 0.5 + 0.1 * Math.sin(e * 1.2));
    // 陣地(拍で明滅)
    fillEllipse(CCX, CCY, CRX, CRY, C.white, 0.35 + R.pulse * 0.25);
    var prev = null;
    for (var i = 0; i <= 40; i++) {
      var ang = (i / 40) * Math.PI * 2;
      var pt = [CCX + Math.cos(ang) * CRX, CCY + Math.sin(ang) * CRY];
      if (prev && i % 2 === 0) game.draw.line(prev[0], prev[1], pt[0], pt[1], C.red, 6);
      prev = pt;
    }
    for (var f = 0; f < 8; f++) {
      var fa = (f / 8) * Math.PI * 2 + 0.2;
      game.draw.sprite(FLAG, { r: C.red, k: C.ink }, CCX + Math.cos(fa) * CRX, CCY + Math.sin(fa) * CRY - 30, 10, { anchor: 'center' });
    }
    // 雪のブロック(等角に積む)
    isoBlock(W * 0.1, H * 0.42, 60, 50);
    isoBlock(W * 0.9, H * 0.68, 70, 60);
    isoBlock(W * 0.08, H * 0.74, 50, 40);
    isoBlock(W * 0.86, H * 0.37, 50, 70);
  }

  function drawBall() {
    var p = R.over && R.ok ? R.p : R.pv;
    var pos = pathPos(p);
    var hop = R.hop * 46;
    fillEllipse(pos.x, pos.y, BALL_R * 0.95, BALL_R * 0.42, C.dark, 0.3);
    var cx = pos.x, cy = pos.y - BALL_R * 0.9 - hop;
    var big = R.stop > 0 ? 1.18 : 1;
    var r = BALL_R * big;
    var white = R.flash > 0 && Math.floor(game.time.elapsed * 20) % 2 === 0;
    game.draw.circle(cx, cy, r + 6, C.ink);
    game.draw.circle(cx, cy, r, white ? C.white : C.shade);
    if (!white) game.draw.circle(cx - r * 0.12, cy - r * 0.12, r * 0.86, C.snow);
    for (var i = 0; i < 3; i++) {
      var a = R.roll + i * 2.1;
      var sx = Math.cos(a) * r * 0.55, sy = Math.sin(a) * r * 0.55;
      if (Math.sin(a) > -0.2) game.draw.circle(cx + sx, cy + sy * 0.8, r * 0.1, C.shade);
    }
    game.draw.circle(cx - r * 0.42, cy - r * 0.45, r * 0.14, C.white);
    // 大玉の顔(むすっとした目と眉)
    game.draw.rect(cx - r * 0.45, cy - r * 0.08, 14, 20, C.ink);
    game.draw.rect(cx - r * 0.12, cy - r * 0.08, 14, 20, C.ink);
    game.draw.line(cx - r * 0.55, cy - r * 0.26, cx - r * 0.3, cy - r * 0.16, C.ink, 6);
    game.draw.line(cx - r * 0.2, cy - r * 0.16, cx + r * 0.02, cy - r * 0.26, C.ink, 6);
  }

  function drawKid() {
    var e = game.time.elapsed;
    var frames = [Math.floor(e * 3) % 2 === 0 ? KID_A : KID_B, KID_PUSH, KID_SLIP, KID_SLIP, KID_CHEER];
    var spr = frames[R.pose] || KID_A;
    var pal = { w: C.white, r: C.red, s: C.skin, k: C.ink, c: C.mitt, b: C.coat, m: C.mitt, d: C.ink };
    var bob = R.pose === 0 ? Math.sin(e * 5) * 4 : 0;
    var lean = R.pose === 1 ? 26 : 0;
    fillEllipse(KX, KY, 80, 30, C.dark, 0.3);
    game.draw.sprite(spr, pal, KX + lean, KY - 92 + bob, 14, { anchor: 'center' });
  }

  function drawPad() {
    // 親指ゾーン: 拍の頭で重なる迫る菱形 + 手袋のボタン
    diamond(PAD_X, PAD_Y, 210, 105, C.coat, 6);
    if (!R.over && R.ready <= 0 && R.beatIdx >= -1 && R.beatIdx < R.nBeats) {
      var k = Math.max(0, R.beatIdx);
      var tNext = R.bt[Math.min(R.nBeats, k + 1)];
      var span = R.bt[Math.min(R.nBeats, k + 1)] - R.bt[k];
      var q = Math.max(0, Math.min(1, (tNext - R.songT) / span));
      diamond(PAD_X, PAD_Y, 210 + q * 170, 105 + q * 85, R.ramp ? C.red : C.mitt, 5);
    }
    fillPoly([[PAD_X, PAD_Y - 90], [PAD_X + 180, PAD_Y], [PAD_X, PAD_Y + 90], [PAD_X - 180, PAD_Y]], C.white, 0.35 + R.pulse * 0.4);
    game.draw.sprite(MITT, { m: C.mitt }, PAD_X, PAD_Y, 22 * (1 + R.pulse * 0.12), { anchor: 'center' });
  }

  function drawWorld() {
    drawField();
    var ballPos = pathPos(R.pv);
    if (ballPos.y < KY) { drawBall(); drawKid(); } else { drawKid(); drawBall(); }
    drawPad();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.35);
    txt('SCORE ' + R.score, 40, 64, 44, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 64, 34, C.mitt, 'right');
    // 段のピップ(テンポ段階)
    for (var s = 0; s < R.bpms.length; s++) {
      var on = s <= R.stage;
      fillPoly([[70 + s * 70, 130], [100 + s * 70, 150], [70 + s * 70, 170], [40 + s * 70, 150]], on ? C.mitt : C.dark);
    }
    // メトロノーム(振り子が拍で往復)+BPM数
    var k = Math.max(0, R.beatIdx);
    var span = R.bt[Math.min(R.nBeats, k + 1)] - R.bt[Math.min(R.nBeats - 1, k)];
    var ph = R.ready > 0 ? 0 : (R.songT - R.bt[Math.min(R.nBeats - 1, k)]) / Math.max(0.01, span);
    var sw = Math.cos(ph * Math.PI) * ((k % 2) ? -1 : 1);
    fillPoly([[W / 2 - 40, 190], [W / 2 + 40, 190], [W / 2 + 18, 110], [W / 2 - 18, 110]], C.red);
    game.draw.line(W / 2, 185, W / 2 + sw * 46, 115, C.white, 6);
    txt(String(curBpm()), W / 2 + 120, 150, 44, R.ramp ? C.red : C.white);
    // 拍ランプ
    for (var b = 0; b < 4; b++) {
      var lit = R.ready <= 0 && ((R.beatIdx % 4) + 4) % 4 === b && R.pulse > 0.2;
      game.draw.circle(W - 250 + b * 60, 150, b === 0 ? 20 : 15, lit ? (R.ramp ? C.red : C.mitt) : C.dark);
    }
    var progress = Math.min(1, R.songT / R.bt[R.nBeats]);
    game.draw.rect(40, 208, W - 80, 12, C.dark);
    game.draw.rect(40, 208, (W - 80) * progress, 12, C.good);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, H * 0.27, 40, C.mitt);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, C.red);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.2, W, H * 0.3, C.ink, 0.75);
    var head = R.ok ? 'CLEAR' : (R.endKind === 'time' ? 'TIME UP' : 'GAME OVER');
    txt(head, W / 2, H * 0.26, 92, R.ok ? C.good : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.33, 60, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.38, 34, C.snow);
    txt('MAX COMBO ' + R.maxCombo, W / 2, H * 0.42, 34, C.snow);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.47, 48, C.mitt);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.47, 40, C.mitt);
    if (!R.ok) txt('あと' + Math.max(1, Math.round((1 - Math.max(R.bestP, R.p, 0)) * 100)) + '%', W / 2, H * 0.51, 44, C.mitt);
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.4) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, H * 0.08 + 6 + bob, { size: 108, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, H * 0.08 + bob, { size: 108, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 3, H * 0.08 + bob - 4, { size: 108, color: C.white, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, H * 0.125, 40, C.mitt);
    txt(String(curBpm()), W / 2, H * 0.19, 48, C.white);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 48, C.red);
    else txt('INSERT COIN', W / 2, H * 0.96, 40, C.ink);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  // 判定は指が触れた瞬間(タップの離しではなく押しの頭)
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var r = thrust();
    if (r === 'PERFECT' || r === 'GOOD') game.audio.tone(r === 'PERFECT' ? 880 : 660, 0.05, { wave: 'square', volume: 0.07 });
    else if (r === 'fumble') { game.audio.play('se_jump', 0.3); game.fx.burst(KX + 60, KY - 80, { color: C.snow, count: 8, speed: 200 }); }
    else game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40, C.ink);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, pushedOut: R.ok };
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

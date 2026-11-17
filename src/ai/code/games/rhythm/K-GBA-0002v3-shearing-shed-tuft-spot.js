// K-GBA-0002v3-shearing-shed-tuft-spot.js
// 刈り残し見つけ — 拍ごとに開く刈り跡の中から色の違う一本を見つけ、食いの拍の頭でつまみ抜く
// 操作: 羊の背に刈り跡が開き、毛が何本も生える。色の違う一本だけを、迫る輪が刈り跡に重なる瞬間(3+3+2の食いの拍)にタップする
// 終わり: 6小節(15秒)を乗り切ればCLEAR。違う毛を摘む/拍を外す/見逃すが3回でGAME OVER
// @mechanic: spot
// @theme: shearing_shed_tuft_spot
// 世界観: 羊の毛刈り小屋。見習いの毛刈り職人が、食い気味に刻まれる拍に乗って羊の背の刈り残しの長い毛を探し、一本ずつ摘む
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ・摘んだ本数)
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なしのベタ塗り、丸角、大きい余白、アイコン的な形。判定はUIの色変化で示す
  var STYLE = { bg: ['#f6e7cf', '#f1dfc2'], main: ['#fbf8f2', '#f4b0a6', '#7a5a48'], accent: ['#ff7a3c', '#3cbfa0'] };
  var C = {
    wall0: STYLE.bg[0], wall1: STYLE.bg[1], wool: STYLE.main[0], skin: STYLE.main[1], wood: STYLE.main[2],
    orange: STYLE.accent[0], teal: STYLE.accent[1],
    plank: '#ead4b2', ink: '#3a2a24', sky: '#8fd3f4', red: '#f05454', curl: '#efe8da', face: '#5a4a48',
    white: '#ffffff', board: '#c89a6a', cap: '#3c7ad8', apron: '#3cbfa0', basket: '#d8a050'
  };

  var GAME_TITLE = 'TUFT SPOT';
  var BPM = 96;
  var SPB = 60 / BPM;
  var EI = SPB / 2;                    // 8分
  // 小節ごとの「食い」のアクセント(8分の位置)。1小節目だけ表拍で導入
  var PAT = [[4], [0, 3, 6], [3, 7], [3, 6], [0, 3, 6], [3, 7]];
  var MELP = [['G4'], ['E5', 'D5', 'C5'], ['G5', 'A5'], ['F5', 'E5'], ['E5', 'D5', 'C5'], ['G5', 'C6']];
  var BASSP = ['C3', 'C3', 'F2', 'F2', 'A2', 'G2'];
  var SONG_STEPS = PAT.length * 8;
  var LEAD = 4 * EI;                   // 刈り跡は2拍前に開く(予告)
  var WIN_P = 0.07, WIN_G = 0.16;
  var LIVES = 3;
  var PATCH_R = 105;
  var POS = [[W * 0.3, H * 0.45], [W * 0.5, H * 0.4], [W * 0.7, H * 0.45], [W * 0.4, H * 0.565], [W * 0.62, H * 0.565]];
  var POS_SEQ = [1, 0, 2, 4, 3, 1, 0, 2, 3, 4, 1, 0, 2];
  var DEMO_STEPS = [4, 7, 10, 12];
  var DEMO_LEN = 13;
  var TRACK_Y = H * 0.775;

  function buildSteps(pat) {
    var out = [];
    for (var b = 0; b < pat.length; b++) for (var i = 0; i < pat[b].length; i++) out.push(b * 8 + pat[b][i]);
    return out;
  }
  var CHART = buildSteps(PAT);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, pressT: 0, gx: W * 0.5, gy: H * 0.86 };
  var CURLS = [];
  for (var ci = 0; ci < 26; ci++) CURLS.push([W * 0.16 + ((ci * 271) % 720), H * 0.36 + ((ci * 157) % 300), 22 + (ci % 3) * 8]);

  // 羊の頭(左向き)と見習い職人
  var SHEEP_A = ['...oooo..', '..oooooo.', 'eeffffoo.', '.fwkffff.', '.ffffffo.', '..ffff...', '..fppf...', '...ff....'];
  var SHEEP_BLINK = ['...oooo..', '..oooooo.', 'eeffffoo.', '.ffffffff', '.ffffffo.', '..ffff...', '..fppf...', '...ff....'];
  var SHEEP_STARTLE = ['..o.oo.o.', '..oooooo.', 'eeffffoo.', 'wwkfffff.', 'wwwffffo.', '..ffff...', '..pppf...', '..pppf...'];
  var SHEEP_HAPPY = ['...oooo..', '..oooooo.', 'eeffffoo.', '.fkkffff.', '.ffffffo.', '..ffff...', '..fppf...', '...ff....'];
  var KID_A = ['..cccc..', '.cccccc.', 'cccccccc', '..ssss..', '..kssk..', '..ssss..', '.aaaaaa.', 'saaaaaas', '.aaaaaa.', '..a..a..', '..d..d..'];
  var KID_B = ['........', '..cccc..', '.cccccc.', 'cccccccc', '..ssss..', '..kssk..', '..ssss..', '.aaaaaa.', 'saaaaaas', '.aaaaaa.', '.dd..dd.'];
  var KID_YAY = ['..cccc..', '.cccccc.', 'cccccccc', 's.ssss.s', 's.kssk.s', '..ssss..', '.aaaaaa.', '.aaaaaa.', '.aaaaaa.', '..a..a..', '..d..d..'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function rrect(x, y, w, h, r, col, alpha) {
    game.draw.rect(x + r, y, w - r * 2, h, col, alpha);
    game.draw.rect(x, y + r, w, h - r * 2, col, alpha);
    game.draw.circle(x + r, y + r, r, col, alpha);
    game.draw.circle(x + w - r, y + r, r, col, alpha);
    game.draw.circle(x + r, y + h - r, r, col, alpha);
    game.draw.circle(x + w - r, y + h - r, r, col, alpha);
  }
  function ring(cx, cy, r, col, w) {
    var n = 28;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      game.draw.line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, col, w);
    }
  }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  function newRun(isDemo) {
    var steps = isDemo ? DEMO_STEPS : CHART;
    var sets = [];
    for (var i = 0; i < steps.length; i++) {
      var lvl = isDemo ? 0 : i / (steps.length - 1);
      var n = 3 + Math.round(lvl * 4);
      var p = POS[POS_SEQ[i % POS_SEQ.length]];
      var odd = Math.floor(game.random(0, n)) % n;
      var rot = game.random(0, Math.PI * 2);
      var hairs = [];
      for (var h = 0; h < n; h++) {
        var a = rot + (h / n) * Math.PI * 2;
        var rr = n <= 4 ? 54 : (h % 2 ? 32 : 74);
        hairs.push({ x: p[0] + Math.cos(a) * rr, y: p[1] + Math.sin(a) * rr * 0.85 + 16, odd: h === odd, len: (h === odd && lvl < 0.35) ? 62 : 38, sway: game.random(0, 6) });
      }
      // 難度カーブ: 本数が増え、色の差と長さの手がかりが減る
      var oddCol = lvl < 0.35 ? '#c47a32' : (lvl < 0.7 ? '#d49548' : '#d8a862');
      sets.push({ step: steps[i], T: steps[i] * EI, px: p[0], py: p[1], hairs: hairs, oddCol: oddCol, st: 'wait', open: 0, flash: 0, lift: 0, pick: -1, hit: false });
    }
    return {
      demo: isDemo, steps: steps, sets: sets, songT: 0, stepIdx: -1, ready: isDemo ? 0 : 0.8,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, basket: 0,
      stop: 0, stopSet: null, over: false, ok: false, endWait: 0,
      pulse: 0, tick: 0, startle: 0, happy: 0, snip: 0, snipX: 0, snipY: 0
    };
  }

  function startAttractBgm() {
    // 3+3+2 の食いで刻む固有旋律
    game.audio.melody([
      ['E5', 1.5], ['D5', 1.5], ['C5', 1], ['R', 1.5], ['G5', 1.5], ['A5', 1],
      ['F5', 1.5], ['E5', 1.5], ['D5', 0.5], ['G5', 0.5], ['R', 1.5], ['C6', 2.5]
    ], {
      tempo: BPM, wave: 'square', volume: 0.05, loop: true,
      bass: [['C3', 1.5], ['C3', 1.5], ['G2', 1], ['F2', 1.5], ['F2', 1.5], ['G2', 1],
        ['A2', 1.5], ['A2', 1.5], ['G2', 1], ['C3', 1.5], ['C3', 1.5], ['G2', 1]]
    });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 8分ステップの伴奏: キックは表拍(1・3拍目)で拍を保ち、ベースと旋律は食いのアクセントに乗る
  function onStep(s) {
    R.tick = 1;
    if (s % 2 === 0) R.pulse = 1;
    if (R.demo) return;
    if (s >= SONG_STEPS) {
      if (s === SONG_STEPS) {
        game.audio.tone('C5', 0.5, { wave: 'square', volume: 0.06 });
        game.audio.tone('E5', 0.5, { wave: 'square', volume: 0.05 });
        game.audio.tone('G5', 0.5, { wave: 'triangle', volume: 0.06 });
      }
      return;
    }
    var bar = Math.floor(s / 8), st = s % 8;
    game.audio.tone(4200, 0.015, { wave: 'square', volume: 0.015 });
    if (st === 0 || st === 4) game.audio.tone(90, 0.08, { wave: 'square', volume: 0.07, slide: -50 });
    if (st === 0 || st === 3 || st === 6) game.audio.tone(BASSP[bar], EI * 1.6, { wave: 'triangle', volume: 0.09 });
    var idx = PAT[bar].indexOf(st);
    if (idx >= 0) game.audio.tone(MELP[bar][idx], EI * 1.8, { wave: 'square', volume: 0.06 });
  }

  // 1回のタップ: 刈り跡の中で一番近い毛を摘む。色違い かつ 食いの拍の頭なら抜ける
  function tapAt(x, y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    var set = null, bd = 1e9, i;
    for (i = 0; i < R.sets.length; i++) {
      var q = R.sets[i];
      if (q.st !== 'show') continue;
      if (dist(x, y, q.px, q.py) < PATCH_R + 25) {
        var dT = Math.abs(R.songT - q.T);
        if (dT < bd) { bd = dT; set = q; }
      }
    }
    R.snip = 0.15; R.snipX = x; R.snipY = y;
    if (!set) return 'air';
    var hi = 0, hd = 1e9;
    for (i = 0; i < set.hairs.length; i++) {
      var hh = set.hairs[i];
      var dh = dist(x, y, hh.x, hh.y - hh.len * 0.5);
      if (dh < hd) { hd = dh; hi = i; }
    }
    set.pick = hi;
    var d = R.songT - set.T;
    if (set.hairs[hi].odd && Math.abs(d) <= WIN_G) {
      var grade = Math.abs(d) <= WIN_P ? 'PERFECT' : 'GOOD';
      set.st = 'pluck'; set.lift = 0;
      R.combo++;
      if (R.combo > R.maxCombo) R.maxCombo = R.combo;
      if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; }
      else { R.good++; R.score += 60 + R.combo * 5; }
      R.happy = 0.5;
      var hx = set.hairs[hi].x, hy = set.hairs[hi].y - set.hairs[hi].len;
      game.feedback.good(hx, hy - 40, { text: grade, color: grade === 'PERFECT' ? C.orange : C.teal, count: grade === 'PERFECT' ? 14 : 8 });
      game.fx.burst(hx, hy, { color: set.oddCol, count: 8, speed: 220 });
      if (!R.demo && R.combo % 5 === 0) {
        game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.27, { color: C.orange, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      return grade;
    }
    missSet(set);
    return 'miss';
  }

  function missSet(set) {
    set.st = 'stop'; set.flash = 0.4;
    R.stop = 0.4; R.stopSet = set; R.startle = 1.1;
    R.combo = 0; R.miss++; R.lives--;
    if (!R.demo) {
      game.audio.tone(320, 0.12, { wave: 'sawtooth', volume: 0.08, slide: -40 });
      game.audio.tone(250, 0.2, { wave: 'sawtooth', volume: 0.07, slide: -60 });
    }
  }

  function releaseStop() {
    var set = R.stopSet;
    R.stopSet = null;
    if (!set) return;
    set.st = 'gone';
    game.feedback.bad(set.px, set.py - 80, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.happy = 3;
      for (var i = 0; i < POS.length; i++) game.fx.burst(POS[i][0], POS[i][1], { color: i % 2 ? C.orange : C.teal, count: 16, speed: 420 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.22, { color: C.orange, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 4);
    R.tick = Math.max(0, R.tick - dt * 6);
    R.startle = Math.max(0, R.startle - dt);
    R.happy = Math.max(0, R.happy - dt);
    R.snip = Math.max(0, R.snip - dt);
    for (var j = 0; j < R.sets.length; j++) {
      var q = R.sets[j];
      if (q.st === 'show' || q.st === 'pluck') q.open = Math.min(1, q.open + dt * 7);
      if (q.st === 'pluck') { q.lift += dt * 2.2; if (q.lift >= 1) { q.st = 'gone'; R.basket++; } }
    }
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('G4', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var si = Math.floor(R.songT / EI);
    while (R.stepIdx < si) { R.stepIdx++; onStep(R.stepIdx); }
    for (var i = 0; i < R.sets.length; i++) {
      var s = R.sets[i];
      if (s.flash > 0) s.flash -= dt;
      if (s.st === 'wait' && R.songT >= s.T - LEAD) {
        s.st = 'show'; s.open = 0;
        // 予告: 刈り跡が開く「シャッ」
        if (!R.demo) game.audio.tone(1400, 0.06, { wave: 'triangle', volume: 0.05, slide: -700 });
      }
      if (s.st === 'show' && R.songT > s.T + WIN_G) { s.pick = -1; missSet(s); return; }
    }
    if (!R.demo && R.songT >= SONG_STEPS * EI + 0.2) endRun(true);
  }

  // ATTRACT: ゴーストが色違いの毛を食いの拍で摘む。最後の1つは違う毛を摘んで失敗例
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_LEN * EI + 0.8);
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.pressT = 0; }
    demo.pressT = Math.max(0, demo.pressT - dt);
    var tx = W * 0.5 + Math.sin(demo.t * 1.6) * 40, ty = H * 0.88;
    var next = null;
    for (var i = 0; i < R.sets.length; i++) {
      if (R.sets[i].st === 'wait' || R.sets[i].st === 'show') { next = R.sets[i]; break; }
    }
    if (next && next.st === 'show') {
      var last = next === R.sets[R.sets.length - 1];
      var hi = 0;
      for (var h = 0; h < next.hairs.length; h++) { if (next.hairs[h].odd !== last) { hi = h; break; } }
      var hh = next.hairs[hi];
      var dtA = next.T - R.songT;
      if (dtA < 0.5) { tx = hh.x; ty = hh.y - hh.len * 0.5; }
      if (dtA <= 0 && !next.hit && R.stop <= 0) { next.hit = true; tapAt(hh.x, hh.y - hh.len * 0.5); demo.pressT = 0.15; }
    }
    var k = Math.min(1, dt * 12);
    demo.gx += (tx - demo.gx) * k;
    demo.gy += (ty - demo.gy) * k;
    demo.press = demo.pressT > 0;
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawShed() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall0], [1, C.wall1]]);
    for (var x = 60; x < W; x += 150) game.draw.rect(x, 0, 12, H * 0.66, C.plank);
    // 丸窓(空と雲)
    game.draw.circle(W * 0.82, H * 0.2, 96, C.wood);
    game.draw.circle(W * 0.82, H * 0.2, 80, C.sky);
    game.draw.circle(W * 0.82 + Math.sin(e * 0.3) * 30, H * 0.2 + 10, 26, C.white);
    game.draw.rect(W * 0.82 - 80, H * 0.2 - 5, 160, 10, C.wood);
    game.draw.rect(W * 0.82 - 5, H * 0.2 - 80, 10, 160, C.wood);
    // 吊りランプ(拍で揺れる)
    var sw = Math.sin(e * Math.PI * 2 * (BPM / 60) / 2) * 30;
    game.draw.line(W * 0.18, 230, W * 0.18 + sw, H * 0.2, C.wood, 6);
    game.draw.circle(W * 0.18 + sw, H * 0.2 + 20, 40 + R.pulse * 6, C.orange);
    game.draw.rect(W * 0.18 + sw - 40, H * 0.2 - 10, 80, 30, C.orange);
    // 毛刈り台
    rrect(40, H * 0.64, W - 80, 90, 40, C.board);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.wood);
    for (var f = 0; f < 6; f++) game.draw.rect(0, H * 0.72 + f * 90, W, 6, C.ink, 0.12);
  }

  function drawSheep() {
    var e = game.time.elapsed;
    var breathe = Math.sin(e * 2.4) * 6;
    // 脚
    for (var l = 0; l < 4; l++) rrect(W * 0.26 + l * 150, H * 0.6, 50, 90, 22, C.face);
    // 胴(丸の重ね)
    game.draw.circle(W * 0.3, H * 0.5, 210 + breathe * 0.5, C.wool);
    game.draw.circle(W * 0.7, H * 0.5, 210 + breathe * 0.5, C.wool);
    game.draw.circle(W * 0.5, H * 0.45, 250 + breathe, C.wool);
    game.draw.circle(W * 0.5, H * 0.55, 220, C.wool);
    for (var i = 0; i < CURLS.length; i++) game.draw.circle(CURLS[i][0], CURLS[i][1] + breathe * 0.3, CURLS[i][2], C.curl);
    // 頭
    var frame = R.startle > 0 ? SHEEP_STARTLE : (R.happy > 0 ? SHEEP_HAPPY : (Math.floor(e * 0.8) % 5 === 0 ? SHEEP_BLINK : SHEEP_A));
    game.draw.sprite(frame, { o: C.wool, e: C.face, f: C.face, w: C.white, k: C.ink, p: C.skin }, W * 0.1 + (R.startle > 0 ? -8 : 0), H * 0.42 + breathe * 0.5, 22, { anchor: 'center' });
  }

  function drawSets() {
    var e = game.time.elapsed;
    for (var i = 0; i < R.sets.length; i++) {
      var s = R.sets[i];
      if (s.st !== 'show' && s.st !== 'stop' && s.st !== 'pluck') continue;
      var big = s.st === 'stop' ? 1.2 : 1;
      var flashOn = s.st === 'stop' && Math.floor(e * 20) % 2 === 0;
      var pr = PATCH_R * Math.max(0.2, s.open) * big;
      game.draw.circle(s.px, s.py, pr, flashOn ? C.white : C.skin);
      if (s.st === 'show') {
        // 迫る輪: 食いの拍の頭で刈り跡のふちに重なる
        var q = Math.max(0, s.T - R.songT) / LEAD;
        var near = q < 0.25;
        ring(s.px, s.py, PATCH_R + 8 + q * 150, near ? C.orange : C.teal, near ? 10 : 7);
        ring(s.px, s.py, PATCH_R + 4, C.white, 4);
      }
      for (var h = 0; h < s.hairs.length; h++) {
        var hh = s.hairs[h];
        var col = hh.odd ? s.oddCol : C.white;
        if (s.st === 'stop' && h === s.pick) col = C.red;
        var len = hh.len * Math.max(0.2, s.open) * big;
        var bx = s.px + (hh.x - s.px) * big, by = s.py + (hh.y - s.py) * big;
        if (s.st === 'pluck' && hh.odd) {
          // 摘んだ毛はかごへ飛ぶ
          var t = s.lift;
          var fx = bx + (W * 0.86 - bx) * t, fy = by - len - Math.sin(t * Math.PI) * 260 + (H * 0.88 - by) * t;
          game.draw.line(fx, fy, fx + 6, fy + len, col, 12);
          game.draw.circle(fx, fy, 7, col);
          continue;
        }
        var sway = Math.sin(e * 3 + hh.sway) * 4;
        game.draw.line(bx, by, bx + sway, by - len, col, 16);
        game.draw.circle(bx + sway, by - len, 9, col);
      }
    }
    if (R.snip > 0) {
      var g = R.snip / 0.15;
      game.draw.line(R.snipX - 30 * g, R.snipY - 30, R.snipX, R.snipY, C.ink, 6);
      game.draw.line(R.snipX + 30 * g, R.snipY - 30, R.snipX, R.snipY, C.ink, 6);
    }
  }

  function drawTrack() {
    // 親指ゾーン: 今の小節の8分マス。橙=摘む拍(食い)、点=表拍
    var cur = R.ready > 0 ? -1 : R.stepIdx;
    var bar = Math.max(0, Math.floor(Math.max(0, cur) / 8));
    var acc = {}, accN = {};
    for (var i = 0; i < R.steps.length; i++) {
      if (Math.floor(R.steps[i] / 8) === bar) acc[R.steps[i] % 8] = true;
      if (Math.floor(R.steps[i] / 8) === bar + 1) accN[R.steps[i] % 8] = true;
    }
    rrect(60, TRACK_Y - 20, W - 120, 170, 40, C.white, 0.85);
    for (var c = 0; c < 8; c++) {
      var x = 96 + c * 112;
      var lit = cur >= 0 && cur % 8 === c && cur < SONG_STEPS;
      var col = acc[c] ? C.orange : C.plank;
      rrect(x, TRACK_Y, 92, 80, 20, lit ? (acc[c] ? C.teal : C.wood) : col);
      if (c % 4 === 0) game.draw.circle(x + 46, TRACK_Y + 40, 10, lit ? C.white : C.wood);
      rrect(x + 26, TRACK_Y + 100, 40, 26, 12, accN[c] ? C.orange : C.plank, 0.8);
    }
  }

  function drawFolk() {
    var e = game.time.elapsed;
    var frame = R.happy > 0 ? KID_YAY : (Math.floor(e * 3) % 2 ? KID_A : KID_B);
    game.draw.sprite(frame, { c: C.cap, s: '#ffd2b0', k: C.ink, a: C.apron, d: C.ink }, W * 0.12, H * 0.9 + Math.sin(e * 4) * 4, 16, { anchor: 'center' });
    // かご(摘んだ本数)
    rrect(W * 0.76, H * 0.86, 210, 120, 30, C.basket);
    for (var b = 0; b < Math.min(R.basket, 12); b++) game.draw.circle(W * 0.79 + (b % 6) * 30, H * 0.865 - Math.floor(b / 6) * 22, 13, '#c47a32');
    game.draw.rect(W * 0.76 + 20, H * 0.9, 170, 8, C.wood, 0.4);
  }

  function drawWorld() {
    drawShed();
    drawSheep();
    drawSets();
    drawTrack();
    drawFolk();
  }

  function drawHud() {
    rrect(24, 24, W - 48, 200, 40, C.white, 0.9);
    txt('SCORE ' + R.score, 70, 92, 44, C.ink, 'left');
    txt('BEST ' + game.best, W - 70, 92, 34, C.orange, 'right');
    for (var i = 0; i < LIVES; i++) game.draw.circle(W - 90 - i * 64, 160, 22, i < R.lives ? C.teal : C.plank);
    var progress = Math.min(1, R.songT / (SONG_STEPS * EI));
    rrect(70, 150, 560, 24, 12, C.plank);
    if (progress > 0.04) rrect(70, 150, 560 * progress, 24, 12, C.teal);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, H * 0.3, 44, C.orange);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.3, 104, C.orange);
  }

  function drawResult() {
    rrect(60, H * 0.22, W - 120, H * 0.34, 48, C.white, 0.95);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 92, R.ok ? C.teal : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.345, 60, C.ink);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.395, 34, C.wood);
    txt('MAX COMBO ' + R.maxCombo + '   ' + R.basket + '本', W / 2, H * 0.435, 34, C.wood);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.485, 48, C.orange);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.485, 40, C.orange);
    if (!R.ok) {
      var left = Math.max(1, Math.ceil((SONG_STEPS * EI - R.songT) / (8 * EI)));
      txt('あと' + left + '小節', W / 2, H * 0.535, 44, C.orange);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    rrect(W / 2 - 330, H * 0.04 + bob, 660, 150, 60, C.orange);
    txt(GAME_TITLE, W / 2, H * 0.09 + bob, 100, C.white);
    txt('BEST ' + game.best, W / 2, H * 0.15, 40, C.ink);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.white);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.plank);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  // 判定は指が触れた瞬間
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var r = tapAt(x, y);
    if (r === 'PERFECT' || r === 'GOOD') game.audio.tone(r === 'PERFECT' ? 1568 : 1175, 0.05, { wave: 'square', volume: 0.07 });
    else if (r === 'air') game.audio.play('se_tap', 0.25);
    else if (r === 'none') game.audio.tone(200, 0.03, { wave: 'square', volume: 0.04 });
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
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, tufts: R.basket };
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

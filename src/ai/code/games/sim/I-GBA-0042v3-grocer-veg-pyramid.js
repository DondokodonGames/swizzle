// I-GBA-0042v3-grocer-veg-pyramid.js
// 八百屋の盛り台 — 店先に転がり込んだ野菜を大きい順に台へ積み、崩さずに一山に盛る
// 操作: ござに散らばった野菜を大きいものから順にタップすると、盛り台の山のてっぺんへ跳んで載る。小さい物の上に大きい物を載せると山が崩れる
// 終わり: 4回の入荷をすべて崩さず盛り切れば成功。順番を誤って山を崩す/全体の制限時間切れで失敗
// @mechanic: stack
// @theme: shopfront_veg_pyramid
// 世界観: 商店街の八百屋の店先で、店主が入荷のたびにござへ転がり込むかぼちゃと玉ねぎとすだちを大きい順に盛り台へ積み上げ、崩さずに一つの山にまとめて店頭に出す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(盛った個数と残り時間ボーナス)
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光。光源は左上の1つに固定(右下に影・左上にハイライト)、背景はパララックス3層
  var STYLE = { bg: ['#f7dcae', '#eaa96b', '#6b3f2a'], main: ['#2f5a34', '#c98a3a', '#8cc63f'], accent: ['#e8433a', '#fff6dc'] };
  var C = {
    sky: STYLE.bg[0], dusk: STYLE.bg[1], wood: STYLE.bg[2], woodHi: '#9a6440', woodLo: '#3f2414',
    mat: '#d9b66c', matLine: '#b48d48', red: STYLE.accent[0], cream: STYLE.accent[1],
    good: '#5fd068', bad: '#ff3b3b', gold: '#ffc83a', ink: '#24140c', far: '#c98d63', mid: '#a86a48',
  };

  var GAME_TITLE = 'VEGGIE PILE';
  var TIME_LIMIT = 20;        // stack = E族 15〜25s。4回の入荷で共有する全体の持ち時間
  var WAVES = [
    { kinds: [0, 1, 2], gap: 0 },
    { kinds: [0, 1, 1, 2], gap: 15 },
    { kinds: [0, 0, 1, 2, 2], gap: 11 },
    { kinds: [0, 0, 1, 1, 2, 2], gap: 7 },
  ];
  var NEEDED = 18;            // 3+4+5+6 個

  // 0=かぼちゃ 1=玉ねぎ 2=すだち(半径の帯。種類内でも大小がある)
  var KINDS = [
    { lo: 90, hi: 112, body: '#2f5a34', dark: '#1c3a20', light: '#5d8a4c', fixed: 104 },
    { lo: 56, hi: 74, body: '#c98a3a', dark: '#94602a', light: '#ecc07a', fixed: 66 },
    { lo: 28, hi: 40, body: '#8cc63f', dark: '#5f9a24', light: '#cfee8a', fixed: 35 },
  ];

  var STAND_X = 640, STAND_TOP = Math.round(H * 0.693);
  var MAT_TOP = Math.round(H * 0.77), MAT_BOT = Math.round(H * 0.963);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var pile, mat, flying, debris, wave, timeLeft, score, placedTotal, cleared, over, endT;
  var freeze, culprit, countIn, waveGap, slideOut, cheerT, panicT, milestoneDone, reason, tickT, prevBest;

  function say(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // ── 店主(はちまき・前掛け)4フレーム ──
  var GROCER = [
    ['...tttttt...', '..hhhhhhhh..', '..hssssssh..', '..sesssses..', '..ssssssss..', '...ssmmss...', '....ssss....',
      '..rraaaarr..', '.rrraaaarrr.', '.ss.aaaa.ss.', '....aaaa....', '....aaaa....', '....kkkk....', '....k..k....', '...kk..kk...'],
    ['...tttttt...', '..hhhhhhhh..', '..hssssssh..', '..ssssssss..', '..ssssssss..', '...ssmmss...', '....ssss....',
      '..rraaaarr..', '.rrraaaarrr.', '.ss.aaaa.ss.', '....aaaa....', '....aaaa....', '....kkkk....', '....k..k....', '...kk..kk...'],
    ['s..tttttt..s', 's.hhhhhhhh.s', 'r.hssssssh.r', 'r.sesssses.r', 'rrssssssssrr', '.r.smmmms.r.', '..rrssssrr..',
      '...raaaar...', '....aaaa....', '....aaaa....', '....aaaa....', '....aaaa....', '....kkkk....', '...k....k...', '..kk....kk..'],
    ['...tttttt...', '..hhhhhhhh..', '..hssssssh..', '..seesseess.', '..ssssssss..', '...smmmms...', '....ssss....',
      '.srraaaarrs.', 's.rraaaarr.s', '....aaaa....', '....aaaa....', '....aaaa....', '....kkkk....', '....k..k....', '...kk..kk...'],
  ];
  var GROCER_PAL = { t: '#ffffff', h: '#2b2420', s: '#f2c79a', e: '#1a1410', m: '#b8503a', r: '#d0452f', a: '#2f6fb0', k: '#3a2a20' };
  var STEM = ['.gg.', 'gggg', '.g..'];
  var LEAF = ['..ll', '.ll.', 'l...'];
  var TIP = ['.o.', 'ooo'];

  function rnd(a, b) { return game.random(a, b); }

  function sizesFor(w, fixed) {
    var out = [];
    var counts = [0, 0, 0];
    for (var i = 0; i < w.kinds.length; i++) counts[w.kinds[i]]++;
    for (var k = 0; k < 3; k++) {
      var K = KINDS[k], n = counts[k];
      if (!n) continue;
      if (fixed) { out.push({ kind: k, r: K.fixed }); continue; }
      var span = (K.hi - K.lo) - w.gap * (n - 1);
      var base = K.lo + rnd(0, Math.max(0, span));
      for (var j = 0; j < n; j++) out.push({ kind: k, r: Math.round(base + w.gap * j + (j > 0 ? rnd(0, 2) : 0)) });
    }
    return out;
  }

  function placeOnMat(list, fixed) {
    var FIX = [{ x: 300, y: 1665 }, { x: 830, y: 1590 }, { x: 640, y: 1770 }];
    var placed = [];
    // 並び順をばらす(入荷はいつもバラバラ。デモだけ固定配置)
    for (var s = list.length - 1; s > 0 && !fixed; s--) {
      var j = Math.floor(rnd(0, s + 1));
      var tmp = list[s]; list[s] = list[j]; list[j] = tmp;
    }
    for (var i = 0; i < list.length; i++) {
      var v = list[i], pos = null;
      if (fixed) pos = FIX[i];
      for (var tries = 0; !pos && tries < 80; tries++) {
        var cx = rnd(v.r + 40, W - v.r - 40), cy = rnd(MAT_TOP + v.r * 0.6, MAT_BOT - v.r * 0.55);
        var okPos = true;
        for (var q = 0; q < placed.length; q++) {
          if (Math.hypot(placed[q].x - cx, placed[q].y - cy) < placed[q].r + v.r + 14) { okPos = false; break; }
        }
        if (okPos) pos = { x: cx, y: cy };
      }
      if (!pos) pos = { x: 160 + (i % 3) * 380, y: MAT_TOP + 90 + Math.floor(i / 3) * 200 };
      v.x = pos.x; v.y = pos.y; v.arrive = -i * 0.07; v.flash = 0;
      placed.push(v);
    }
    return placed;
  }

  function deliver(idx, fixed) {
    mat = placeOnMat(sizesFor(WAVES[idx], fixed), fixed);
    game.audio.play('se_jump', 0.25);
  }

  function resetBoard() {
    pile = []; mat = []; flying = []; debris = [];
    freeze = 0; culprit = null; slideOut = 0; waveGap = 0; cheerT = 0; panicT = 0;
  }

  function initGame() {
    resetBoard();
    wave = 0; timeLeft = TIME_LIMIT; score = 0; placedTotal = 0;
    cleared = false; over = false; endT = 0; countIn = 0.8; milestoneDone = false; reason = ''; tickT = 0;
    prevBest = game.best;
    deliver(0, false);
  }

  function lastStacked() {
    if (flying.length) return flying[flying.length - 1].v;
    return pile.length ? pile[pile.length - 1] : null;
  }

  function seatY(under, r) {
    if (!under) return STAND_TOP - r * 0.92;
    return under.py - under.r * 0.78 - r * 0.86;
  }

  function vegAt(x, y) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < mat.length; i++) {
      var v = mat[i];
      if (v.arrive < 1) continue;
      var d = Math.hypot(v.x - x, v.y - y);
      if (d < v.r + 26 && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function launch(i) {
    var v = mat.splice(i, 1)[0];
    var under = lastStacked();
    v.py = seatY(under, v.r);
    v.px = STAND_X + (under ? (under.px - STAND_X) * 0.5 : 0) + rnd(-4, 4);
    flying.push({ v: v, x0: v.x, y0: v.y, t: 0 });
    game.audio.tone(330 + pile.length * 70, 0.07, { wave: 'triangle', volume: 0.12, slide: 180 });
  }

  function topple() {
    for (var i = 0; i < pile.length; i++) {
      var p = pile[i];
      var dir = i % 2 === 0 ? -1 : 1;
      debris.push({ v: p, x: p.px, y: p.py, vx: dir * rnd(220, 520), vy: rnd(-700, -260) });
    }
    pile = [];
  }

  function land(f) {
    var v = f.v;
    var top = pile.length ? pile[pile.length - 1] : null;
    pile.push(v);
    if (top && v.r > top.r) {
      // 大きい物を小さい物の上に載せた → 崩れる(hit-stop で犯人を見せてから)
      culprit = v; freeze = 0.5; panicT = 1.2;
      v.flash = 1;
      game.audio.play('se_break', 0.5);
      game.feedback.bad(v.px, v.py, { text: 'MISS', color: C.bad });
      if (state === S.PLAYING) { reason = 'fall'; over = true; }
      return;
    }
    if (state === S.PLAYING) {
      placedTotal++;
      score += 100;
      game.feedback.good(v.px, v.py - v.r, { text: '+100', color: C.good, size: 40, count: 8 });
    } else {
      game.fx.burst(v.px, v.py - v.r, { color: C.good, count: 6, speed: 220 });
      game.audio.play('se_good', 0.25);
    }
    if (!mat.length && !flying.length) waveDone();
  }

  function waveDone() {
    cheerT = 0.9;
    var top = pile[pile.length - 1];
    if (state !== S.PLAYING) { game.fx.popup('NICE', STAND_X, top.py - 140, { color: C.gold, size: 64 }); return; }
    score += 200;
    game.fx.burst(STAND_X, top.py - 40, { color: C.gold, count: 22, speed: 380 });
    game.fx.popup('NICE', STAND_X, top.py - 150, { color: C.gold, size: 70 });
    if (!milestoneDone && wave === 1) {
      milestoneDone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(placedTotal + ' / ' + NEEDED, W / 2, 420, { color: C.cream, size: 56 });
    } else {
      game.audio.play('se_coin', 0.4);
    }
    if (wave >= WAVES.length - 1) {
      score += Math.round(timeLeft * 30);
      cleared = true; over = true; reason = 'clear'; freeze = 0.4; culprit = top; top.flash = 1;
      return;
    }
    waveGap = 0.75; slideOut = 0;
  }

  function finish() {
    if (endT > 0 || state !== S.PLAYING) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(cleared ? 'se_success' : 'se_failure', 0.55);
    if (cleared) for (var i = 0; i < 5; i++) game.fx.burst(rnd(150, 930), rnd(500, 1200), { color: i % 2 ? C.gold : C.red, count: 18, speed: 420 });
  }

  // ── 物の動き(本番とデモで共通) ──
  function stepWorld(dt) {
    for (var i = 0; i < mat.length; i++) if (mat[i].arrive < 1) mat[i].arrive = Math.min(1, mat[i].arrive + dt * 2.6);
    if (freeze > 0) {
      freeze -= dt;
      if (culprit) culprit.flash = Math.max(0, freeze / 0.5);
      for (var m = 0; m < mat.length; m++) if (mat[m].flash > 0) mat[m].flash = Math.max(0, freeze / 0.45);
      if (freeze <= 0 && culprit && !cleared) { topple(); culprit = null; }
      return;
    }
    for (var f = flying.length - 1; f >= 0; f--) {
      var fl = flying[f];
      fl.t += dt / 0.2;
      if (fl.t >= 1) { flying.splice(f, 1); land(fl); if (freeze > 0) return; }
    }
    for (var d = 0; d < debris.length; d++) {
      var db = debris[d];
      db.vy += 2400 * dt; db.x += db.vx * dt; db.y += db.vy * dt;
    }
    if (cheerT > 0) cheerT -= dt;
    if (panicT > 0) panicT -= dt;
  }

  // ── 描画 ──
  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.34, C.dusk], [0.62, '#b8744c'], [1, C.wood]]);
    // 遠景: 向かいの店並び(ゆっくり流れる)
    for (var i = 0; i < 7; i++) {
      var bx = ((i * 190 - t * 6) % 1330 + 1330) % 1330 - 160;
      var bh = 190 + (i % 3) * 60;
      game.draw.rect(bx, 760 - bh, 170, bh, C.far, 0.55);
      game.draw.rect(bx + 20, 760 - bh + 30, 50, 40, C.cream, 0.35 + 0.15 * Math.sin(t * 2 + i));
    }
    // 中景: 提灯の列(揺れる)
    for (var j = 0; j < 9; j++) {
      var lx = ((j * 140 + t * 14) % 1260 + 1260) % 1260 - 90;
      var ly = 560 + Math.sin(t * 1.6 + j) * 8;
      game.draw.line(lx, 520, lx, ly - 22, C.ink, 2);
      game.draw.circle(lx, ly, 22, C.red, 0.85);
      game.draw.circle(lx - 7, ly - 7, 7, C.cream, 0.6);
    }
    // 近景: 店のひさし(紅白)
    for (var k = 0; k < 12; k++) game.draw.rect(k * 90, 236, 90, 92, k % 2 ? C.cream : C.red);
    for (var a = 0; a < 12; a++) game.draw.circle(a * 90 + 45, 328 + Math.sin(t * 2.4 + a) * 3, 45, a % 2 ? C.cream : C.red);
    game.draw.rect(0, 236, W, 10, '#00000022');
    // 裸電球
    var sw = Math.sin(t * 1.9) * 14;
    game.draw.line(W * 0.5, 330, W * 0.5 + sw, 470, C.ink, 3);
    game.draw.circle(W * 0.5 + sw, 482, 26, '#fff2a8', 0.95);
    game.draw.circle(W * 0.5 + sw, 482, 60, '#fff2a8', 0.18);
  }

  function drawStand() {
    game.draw.rect(STAND_X - 220 + 14, STAND_TOP + 14, 440, 150, '#00000033');
    game.draw.rect(STAND_X - 220, STAND_TOP, 440, 150, C.wood);
    game.draw.rect(STAND_X - 220, STAND_TOP, 440, 18, C.woodHi);
    for (var i = 0; i < 4; i++) game.draw.rect(STAND_X - 200 + i * 110, STAND_TOP + 40, 90, 8, C.woodLo, 0.6);
    // ござ
    game.draw.rect(40, MAT_TOP - 20, W - 80, MAT_BOT - MAT_TOP + 60, C.mat);
    for (var r = MAT_TOP; r < MAT_BOT + 40; r += 26) game.draw.rect(40, r, W - 80, 3, C.matLine, 0.7);
    game.draw.rect(40, MAT_TOP - 20, W - 80, 10, '#ffffff33');
  }

  function drawVeg(v, x, y, scale) {
    var r = v.r * (scale || 1);
    var K = KINDS[v.kind];
    game.draw.circle(x + r * 0.16, y + r * 0.2, r, '#000000', 0.2);
    if (v.kind === 0) {
      game.draw.circle(x, y, r, K.body);
      game.draw.circle(x - r * 0.48, y + r * 0.05, r * 0.5, K.dark, 0.45);
      game.draw.circle(x + r * 0.48, y + r * 0.05, r * 0.5, K.dark, 0.45);
      game.draw.circle(x, y + r * 0.08, r * 0.42, K.body);
      game.draw.circle(x - r * 0.38, y - r * 0.42, r * 0.24, K.light, 0.8);
      game.draw.sprite(STEM, { g: '#6a4a26' }, x, y - r * 0.92, Math.max(4, r / 9), { anchor: 'center' });
    } else if (v.kind === 1) {
      game.draw.circle(x, y, r, K.body);
      game.draw.line(x - r * 0.4, y - r * 0.8, x - r * 0.5, y + r * 0.75, K.dark, Math.max(3, r * 0.08));
      game.draw.line(x + r * 0.4, y - r * 0.8, x + r * 0.5, y + r * 0.75, K.dark, Math.max(3, r * 0.08));
      game.draw.circle(x - r * 0.36, y - r * 0.36, r * 0.26, K.light, 0.85);
      game.draw.sprite(TIP, { o: K.dark }, x, y - r * 1.02, Math.max(4, r / 6), { anchor: 'center' });
    } else {
      game.draw.circle(x, y, r, K.body);
      game.draw.circle(x + r * 0.3, y + r * 0.3, r * 0.42, K.dark, 0.4);
      game.draw.circle(x - r * 0.34, y - r * 0.34, r * 0.3, K.light, 0.9);
      game.draw.sprite(LEAF, { l: '#3f8a2a' }, x + r * 0.35, y - r * 0.95, Math.max(4, r / 5), { anchor: 'center' });
    }
    if (v.flash > 0) game.draw.circle(x, y, r * 1.04, '#ffffff', 0.85 * v.flash);
  }

  function pileSway(i) {
    var n = pile.length;
    return Math.sin(game.time.elapsed * 2.3) * Math.min(1, n / 6) * 7 * (i / Math.max(1, n));
  }

  function drawPile() {
    var sx = slideOut * 700;
    for (var i = 0; i < pile.length; i++) {
      var p = pile[i];
      var sc = p === culprit && freeze > 0 ? 1 + 0.25 * (1 - freeze / 0.5) : 1;
      drawVeg(p, p.px + pileSway(i) + sx, p.py, sc);
    }
    for (var f = 0; f < flying.length; f++) {
      var fl = flying[f], v = fl.v, t = Math.min(1, fl.t);
      var x = fl.x0 + (v.px - fl.x0) * t;
      var y = fl.y0 + (v.py - fl.y0) * t - Math.sin(t * Math.PI) * 220;
      drawVeg(v, x, y, 1);
    }
    for (var d = 0; d < debris.length; d++) drawVeg(debris[d].v, debris[d].x, debris[d].y, 1);
  }

  function drawMat() {
    for (var i = 0; i < mat.length; i++) {
      var v = mat[i];
      var a = Math.max(0, v.arrive);
      var x = v.x + (1 - a) * (W + 200 - v.x);
      var hop = Math.abs(Math.sin(a * Math.PI * 2)) * (1 - a) * 90;
      var bob = state === S.PLAYING && a >= 1 ? Math.sin(game.time.elapsed * 5 + i) * 3 : 0;
      if (a >= 1 && state === S.PLAYING && !over) game.draw.circle(v.x, v.y + bob, v.r + 10, '#ffffff', 0.22 + 0.12 * Math.sin(game.time.elapsed * 6 + i));
      drawVeg(v, x, v.y - hop + bob, 1);
    }
  }

  function drawGrocer() {
    var t = game.time.elapsed;
    var frame;
    if (panicT > 0) frame = GROCER[2];
    else if (cheerT > 0 || (state === S.RESULT && cleared)) frame = Math.floor(t * 8) % 2 ? GROCER[3] : GROCER[0];
    else frame = Math.floor(t * 1.5) % 5 === 4 ? GROCER[1] : GROCER[0];
    var jump = cheerT > 0 ? Math.abs(Math.sin(t * 12)) * 30 : 0;
    var y = 1210 + Math.sin(t * 2.2) * 5 - jump;
    game.draw.rect(130, 1306, 150, 14, '#000000', 0.18);
    game.draw.rect(150, 1302, 110, 22, '#000000', 0.1);
    game.draw.sprite(frame, GROCER_PAL, 200, y, 12, { anchor: 'center', flipX: false });
  }

  function hud() {
    say(String(score), 160, 80, 52, C.cream);
    say(placedTotal + ' / ' + NEEDED, W - 170, 80, 44, C.cream);
    for (var i = 0; i < WAVES.length; i++) {
      var on = i < wave || (i === wave && cleared);
      game.draw.circle(W / 2 - 90 + i * 60, 80, 18, on ? C.gold : '#00000044');
      if (i === wave && !cleared) game.draw.circle(W / 2 - 90 + i * 60, 80, 18 + 6 * Math.abs(Math.sin(game.time.elapsed * 4)), C.cream, 0.35);
    }
    var bw = W - 160, frac = Math.max(0, timeLeft / TIME_LIMIT);
    var warn = timeLeft < 3 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(80, 168, bw, 22, '#00000055');
    game.draw.rect(80, 168, bw * frac, 22, warn ? C.bad : C.gold);
    game.draw.rect(80, 168, bw * frac, 6, '#ffffff55');
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.cycle = -1; return; }
    if (over || countIn > 0 || freeze > 0 || waveGap > 0) { game.audio.play('se_tap', 0.08); return; }
    var i = vegAt(x, y);
    if (i < 0) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: C.matLine, count: 4, speed: 120 });
      return;
    }
    launch(i);
  });

  // ── ATTRACT: 実ロジックで1回盛る(成功周)→ 次の周は順番を誤って崩す(失敗周) ──
  var demo = { t: 0, cycle: -1, gx: W / 2, gy: 1700, press: false, plan: [0, 1, 2], step: 0, nextAt: 0 };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      demo.cycle++;
      resetBoard();
      deliver(0, true);
      demo.plan = demo.cycle % 2 === 0 ? [0, 1, 2] : [0, 2, 1];
      demo.step = 0; demo.nextAt = 0.8;
    }
    stepWorld(dt);
    demo.press = false;
    if (demo.step < demo.plan.length) {
      var idx = -1;
      for (var i = 0; i < mat.length; i++) if (mat[i].kind === demo.plan[demo.step]) idx = i;
      if (idx >= 0) {
        var v = mat[idx];
        demo.gx += (v.x - demo.gx) * Math.min(1, dt * 8);
        demo.gy += (v.y - demo.gy) * Math.min(1, dt * 8);
        demo.press = demo.nextAt - cyc < 0.14;
        if (cyc >= demo.nextAt && freeze <= 0) { launch(idx); demo.step++; demo.nextAt = cyc + 0.6; }
      }
    } else {
      demo.gx += (W * 0.78 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (1720 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mat) initGame();
      demoStep(dt);
      drawBackdrop(); drawStand(); drawPile(); drawMat(); drawGrocer();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      say(GAME_TITLE, W / 2, H * 0.057, 84, C.cream);
      say('HI-SCORE ' + game.best, W / 2, H * 0.102, 34, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else say('TAP TO START', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    if (state === S.RESULT) {
      stepWorld(dt);
      drawBackdrop(); drawStand(); drawPile(); drawMat(); drawGrocer();
      say(cleared ? 'CLEAR' : (reason === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.29, 92, cleared ? C.gold : C.bad);
      say('SCORE ' + score, W / 2, 670, 54, C.cream);
      if (score > prevBest && prevBest > 0) say('NEW RECORD', W / 2, 750, 50, C.gold);
      else say('BEST ' + Math.max(prevBest, score), W / 2, 750, 40, C.cream);
      if (!cleared) say('あと' + (NEEDED - placedTotal) + '個!', W / 2, 840, 48, C.cream);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.965, 38, C.cream);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      stepWorld(dt);
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { placed: placedTotal, waves: cleared ? WAVES.length : wave, timeLeft: Math.round(timeLeft * 10) / 10 };
        if (cleared) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      stepWorld(dt);
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else {
      var wasFrozen = freeze > 0;
      stepWorld(dt);
      if (over && freeze <= 0) finish();
      else if (!over) {
        if (!wasFrozen) timeLeft -= dt;
        if (timeLeft < 3) {
          tickT -= dt;
          if (tickT <= 0) { tickT = 0.5; game.audio.tone(1240, 0.04, { wave: 'square', volume: 0.08 }); }
        }
        if (waveGap > 0) {
          waveGap -= dt;
          slideOut = Math.min(1, slideOut + dt * 1.6);
          if (waveGap <= 0) { wave++; pile = []; slideOut = 0; deliver(wave, false); }
        }
        if (timeLeft <= 0) {
          timeLeft = 0; reason = 'time'; over = true; freeze = 0.45;
          for (var i = 0; i < mat.length; i++) mat[i].flash = 1;
          culprit = null;
          game.feedback.bad(W / 2, MAT_TOP + 120, { text: 'TIME UP', color: C.bad });
          panicT = 1.2;
        }
      }
    }

    drawBackdrop(); drawStand(); drawPile(); drawMat(); drawGrocer();
    hud();
    if (countIn > 0) say(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 2],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

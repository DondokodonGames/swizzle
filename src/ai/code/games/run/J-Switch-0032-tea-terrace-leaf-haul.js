// J-Switch-0032-tea-terrace-leaf-haul.js
// 茶畑の新芽便 — 縄でつないだ竹の小ぞりを引いて、畝あいの細道からそりをはみ出させずに製茶小屋まで運ぶ
// 操作: 指を置いた方へ摘み子が歩き、縄でつながったそりが後ろから引きずられる。そりは曲がり角の内側へ近道するので、角では外側へ大回りして道の幅に収める。影が落ちる場所には上の段から剪定くずの束が落ちてくるので避ける(社内メモ。画面には出さない)
// 終わり: そりが製茶小屋に着けばCLEAR。そりが道から外れる/剪定くずに埋まるとミス、3回ミスか時間切れでGAME OVER
// @mechanic: guide_path
// @theme: tea_terrace_leaf_haul
// 世界観: 初夏の段々の茶畑で、摘み子見習いの少女が、摘みたての新芽を載せた竹の小ぞりを縄で引き、茶の木の畝のあいだの細道から外さずに、丘の上の製茶小屋まで運び上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 運んだ距離%・残り時間・ミス数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケール、位置は接地影で示す
  var STYLE = { bg: ['#a9d98a', '#79b95e', '#4f8a3e'], main: ['#2b3a7a', '#c9a24a'], accent: ['#3fae4a', '#2f7a38'] };
  var C = {
    sky: '#cfe8ff', field1: STYLE.bg[0], field2: STYLE.bg[1], field3: STYLE.bg[2],
    trail: '#ecdcb4', trailEdge: '#8a6a3e', dew: '#ffffff',
    girl: STYLE.main[0], sash: '#d24a3a', bamboo: STYLE.main[1], leaf: STYLE.accent[0], leaf2: '#a8e060', leaf3: STYLE.accent[1],
    good: '#ffd23a', bad: '#ff4a3a', ink: '#23361c', shadow: '#2f4a22', white: '#ffffff'
  };

  var GAME_TITLE = 'TEA HAUL';
  var TIME_LIMIT = 16;
  var HALF = 88;          // 道の半幅
  var TETHER = 118;       // 縄の長さ
  var WALK_SPEED = 500;    // 摘み子の最高速度 px/s
  var MAX_LIVES = 3;
  var OFF_GRACE = 0.3;    // そりが道の外にいられる猶予

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var RAW = [[0.50, 0.86], [0.22, 0.76], [0.30, 0.64], [0.78, 0.58], [0.74, 0.46], [0.24, 0.40], [0.30, 0.28], [0.70, 0.22]];
  var PTS = [];
  for (var pi = 0; pi < RAW.length; pi++) PTS.push({ x: RAW[pi][0] * W, y: RAW[pi][1] * H });
  var SEG = [], TOTAL = 0;
  for (var si = 1; si < PTS.length; si++) {
    var sl = Math.hypot(PTS[si].x - PTS[si - 1].x, PTS[si].y - PTS[si - 1].y);
    SEG.push(sl); TOTAL += sl;
  }
  var DROP_AT = [0.26, 0.5, 0.72];

  // ── スプライト ──
  var GIRL_A = [
    '....hhh....',
    '..hhhhhhh..',
    'hhhhhhhhhhh',
    '...fefef...',
    '....fff....',
    '...kkrkk...',
    '..fkkrkkf..',
    '...kkkkk...',
    '...kkkkk...',
    '...kk.kk...',
    '...f...f...',
    '..ff...ff..'
  ];
  var GIRL_B = [
    '....hhh....',
    '..hhhhhhh..',
    'hhhhhhhhhhh',
    '...fefef...',
    '....fff....',
    '...kkrkk...',
    '.f.kkrkk.f.',
    '...kkkkk...',
    '...kkkkk...',
    '....k.k....',
    '....f.f....',
    '...ff.ff...'
  ];
  var GIRL_PAL = { h: '#e8c872', f: '#ffd8b0', e: '#2b1d12', k: C.girl, r: C.sash };
  var SLED = [
    '.t.......t.',
    'tttttttttt.',
    '.t.pp.yy.t.',
    '.tppppyyyt.',
    '.t.pp.yy.t.',
    '.t..bb...t.',
    '.t.bbbb..t.',
    '.tttttttttt',
    '.t.......t.'
  ];
  var SLED_PAL = { t: C.bamboo, p: C.leaf, y: C.leaf2, b: C.leaf3 };
  var HUT = [
    '.....rr.....',
    '...rrrrrr...',
    '.rrrrrrrrrr.',
    'rrrrrrrrrrrr',
    '.wwwwwwwwww.',
    '.wwkkwwwwww.',
    '.wwkkwwddww.',
    '.wwwwwwddww.'
  ];
  var HUT_PAL = { r: '#7a5a32', w: '#f2e6c8', k: '#3a2412', d: '#8a5a2b' };
  var BASKET = [
    '.bbbbbb.',
    'bBbBbBbb',
    'bbBbBbBb',
    'bBbBbBbb',
    '.bbbbbb.',
    '..bbbb..'
  ];
  var BASKET_PAL = { b: '#c99a5a', B: '#8a5a2b' };
  var PILE = [
    '...ss...',
    '.ssSSss.',
    'sSSSSSSs'
  ];
  var PILE_PAL = { s: '#8ab85a', S: '#557f33' };

  // ── 状態 ──
  var girl, sled, progress, timeLeft, lives, offT, drops, dropIdx, walkT;
  var ready, hitStop, pendingReset, finished, ok, done, endWait, snagFx, halfShown, celebrate;
  var result = { pct: 0, time: 0, misses: 0, score: 0 };

  function pointAt(len) {
    var L = Math.max(0, Math.min(TOTAL, len)), acc = 0;
    for (var i = 0; i < SEG.length; i++) {
      if (L <= acc + SEG[i] || i === SEG.length - 1) {
        var t = SEG[i] > 0 ? Math.min(1, (L - acc) / SEG[i]) : 0;
        return { x: PTS[i].x + (PTS[i + 1].x - PTS[i].x) * t, y: PTS[i].y + (PTS[i + 1].y - PTS[i].y) * t };
      }
      acc += SEG[i];
    }
    return { x: PTS[PTS.length - 1].x, y: PTS[PTS.length - 1].y };
  }

  function project(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 0; i < SEG.length; i++) {
      var ax = PTS[i].x, ay = PTS[i].y, vx = PTS[i + 1].x - ax, vy = PTS[i + 1].y - ay;
      var l2 = vx * vx + vy * vy;
      var t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
      var d = Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
      if (d < best) { best = d; bestLen = acc + t * SEG[i]; }
      acc += SEG[i];
    }
    return { dist: best, len: bestLen };
  }

  function placeAt(len) {
    var s = pointAt(len), a = pointAt(len + TETHER);
    sled = { x: s.x, y: s.y };
    girl = { x: a.x, y: a.y, face: false };
  }

  function initGame() {
    progress = 0; placeAt(0);
    timeLeft = TIME_LIMIT; lives = MAX_LIVES; offT = 0; drops = []; dropIdx = 0; walkT = 0;
    ready = 0.8; hitStop = 0; pendingReset = false; finished = false; ok = false; done = false; endWait = 0;
    snagFx = null; halfShown = false; celebrate = 0;
  }

  // 1ステップの牽引(PLAYING とデモで共用)
  function stepHaul(dt, tx, ty, pulling) {
    if (pulling) {
      var dx = tx - girl.x, dy = ty - girl.y, d = Math.hypot(dx, dy);
      var step = Math.min(d, WALK_SPEED * dt);
      if (d > 2) {
        girl.x += dx / d * step; girl.y += dy / d * step;
        girl.face = dx < 0; walkT += dt;
      }
    }
    girl.x = Math.max(40, Math.min(W - 40, girl.x));
    girl.y = Math.max(H * 0.16, Math.min(H * 0.9, girl.y));
    var sx = girl.x - sled.x, sy = girl.y - sled.y, sd = Math.hypot(sx, sy);
    if (sd > TETHER) { sled.x = girl.x - sx / sd * TETHER; sled.y = girl.y - sy / sd * TETHER; }
    var pr = project(sled.x, sled.y);
    if (pr.len > progress && pr.len < progress + 220) progress = pr.len;
    return pr;
  }

  function stepDrops(dt, live) {
    if (dropIdx < DROP_AT.length && progress > DROP_AT[dropIdx] * TOTAL) {
      var p = pointAt(Math.min(TOTAL - 90, progress + TETHER + 300));
      drops.push({ x: p.x, y: p.y, warn: 0.8, pile: 0 });
      dropIdx++;
      if (live) game.audio.tone('A5', 0.12, { wave: 'square', volume: 0.05, slide: -200 });
    }
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      if (d.warn > 0) {
        d.warn -= dt;
        if (d.warn <= 0) {
          d.pile = 1.3;
          if (live) { game.fx.burst(d.x, d.y, { color: C.field2, count: 14, speed: 260 }); game.audio.tone('C3', 0.15, { wave: 'noise', volume: 0.08 }); }
        }
      } else {
        d.pile -= dt;
        if (d.pile <= 0) drops.splice(i, 1);
      }
    }
  }

  function snag(x, y) {
    lives--;
    hitStop = 0.45; pendingReset = true; offT = 0;
    snagFx = { x: x, y: y, t: 0.45 };
    game.fx.flash('#ffffff', 0.12);
    game.feedback.bad(x, y, { text: 'MISS', shake: 12 });
    if (lives <= 0) { finished = true; ok = false; finish(); }
  }

  function finish() {
    if (done) return;
    done = true;
    endWait = 1.3;
    game.audio.stopBgm();
    result.pct = ok ? 100 : Math.min(99, Math.floor(progress / TOTAL * 100));
    result.time = Math.max(0, timeLeft);
    result.misses = MAX_LIVES - lives;
    result.score = ok ? 100 + lives * 50 + Math.round(timeLeft * 10) : 0;
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); startMusic(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    game.audio.play('se_tap', 0.25);
    game.fx.burst(x, y, { color: C.dew, count: 5, speed: 120 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    game.audio.tone('E5', 0.05, { wave: 'triangle', volume: 0.04 });
    game.fx.burst(girl.x, girl.y - 20, { color: C.trailEdge, count: 3, speed: 60 });
  });

  // ── 描画 ──
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.13, C.field1], [0.6, C.field2], [1, C.field3]]);
    // 遠くの丘の稜線
    game.draw.rect(0, H * 0.13, W, 22, '#5f9a48');
    game.draw.rect(0, H * 0.13 + 22, W, 6, C.shadow, 0.4);
    // 茶の木の畝(横ストリップ、ゆっくり明滅)
    for (var i = 0; i < 16; i++) {
      var yy = H * 0.16 + i * 104;
      game.draw.rect(0, yy, W, 30, '#2f6a30', 0.22 + 0.05 * Math.sin(t * 1.2 + i));
      game.draw.rect(0, yy, W, 5, '#c8f0a0', 0.18);
    }
    // 遠景:茶摘み籠(揺れ)と剪定くずの小山
    var bob = Math.sin(t * 1.6) * 8;
    game.draw.circle(W * 0.9, H * 0.84 + 36, 40, C.shadow, 0.2);
    game.draw.sprite(BASKET, BASKET_PAL, W * 0.9 + Math.cos(t * 1.1) * 6, H * 0.8 + bob, 14, { anchor: 'center' });
    game.draw.sprite(PILE, PILE_PAL, W * 0.1, H * 0.93, 16, { anchor: 'center' });
    // 奥のライバル隊(半透明・小さいスケールで奥行き)
    for (var r = 0; r < 2; r++) {
      var ph = (t * 0.22 + r * 0.5) % 1;
      var rx = r === 0 ? W * 0.06 : W * 0.94;
      var ry = H * 0.9 - ph * H * 0.7;
      game.draw.sprite(Math.floor(t * 6 + r) % 2 ? GIRL_A : GIRL_B, GIRL_PAL, rx + Math.sin(t * 3 + r) * 6, ry, 4, { anchor: 'center', alpha: 0.35 });
      game.draw.sprite(SLED, SLED_PAL, rx, ry + 50, 3, { anchor: 'center', alpha: 0.3 });
    }
    // ambient pulse
    game.draw.rect(0, 0, W, H, '#fff0a0', 0.04 + 0.03 * Math.sin(t * 1.4));
  }

  function drawTrail() {
    for (var i = 1; i < PTS.length; i++) {
      game.draw.line(PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y, C.trailEdge, HALF * 2 + 10);
    }
    for (var j = 0; j < PTS.length; j++) game.draw.circle(PTS[j].x, PTS[j].y, HALF + 5, C.trailEdge);
    for (var k = 1; k < PTS.length; k++) {
      game.draw.line(PTS[k - 1].x, PTS[k - 1].y, PTS[k].x, PTS[k].y, C.trail, HALF * 2 - 6);
    }
    for (var m = 0; m < PTS.length; m++) game.draw.circle(PTS[m].x, PTS[m].y, HALF - 3, C.trail);
    // 道しるべの点(運んだ所は色が付く)
    var t = game.time.elapsed;
    for (var L = 30; L < TOTAL; L += 60) {
      var p = pointAt(L);
      var passed = L <= progress;
      game.draw.circle(p.x, p.y, passed ? 9 : 6 + Math.sin(t * 4 + L) * 1.5, passed ? C.leaf : C.trailEdge, passed ? 0.9 : 0.5);
    }
    // 製茶小屋
    var nb = Math.sin(t * 2.2) * 4;
    var n = PTS[PTS.length - 1];
    game.draw.circle(n.x, n.y + 40, 70, C.shadow, 0.25);
    game.draw.sprite(HUT, HUT_PAL, n.x, n.y + nb, 14, { anchor: 'center' });
  }

  function drawDrops() {
    var t = game.time.elapsed;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.warn > 0) {
        var k = 1 - d.warn / 0.8;
        var blink = Math.floor(t * 14) % 2 === 0;
        game.draw.circle(d.x, d.y, 30 + 45 * k, C.shadow, blink ? 0.45 : 0.25);
        // 落ちてくる剪定くずの束(上空で大きい → 地面で小さい)
        game.draw.sprite(PILE, PILE_PAL, d.x, d.y - 260 * (1 - k), 10 + 8 * (1 - k), { anchor: 'center' });
      } else {
        game.draw.circle(d.x, d.y + 20, 72, C.shadow, 0.3);
        game.draw.sprite(PILE, PILE_PAL, d.x, d.y, 18, { anchor: 'center', alpha: Math.min(1, d.pile * 2) });
      }
    }
  }

  function drawHaul(offWarn) {
    // 縄
    game.draw.line(girl.x, girl.y + 10, sled.x, sled.y, '#b08a4a', 6);
    // 接地影
    game.draw.circle(sled.x, sled.y + 34, 44, C.shadow, 0.25);
    game.draw.circle(girl.x, girl.y + 44, 32, C.shadow, 0.25);
    var hot = offWarn && Math.floor(game.time.elapsed * 16) % 2 === 0;
    if (hot) game.draw.circle(sled.x, sled.y, 70, C.bad, 0.35);
    game.draw.sprite(SLED, SLED_PAL, sled.x, sled.y, 9, { anchor: 'center' });
    var f = Math.floor(walkT * 10) % 2 === 0 ? GIRL_A : GIRL_B;
    game.draw.sprite(f, GIRL_PAL, girl.x, girl.y + Math.sin(game.time.elapsed * 5) * 3, 8, { anchor: 'center', flipX: girl.face });
  }

  function drawHud() {
    var pct = Math.min(100, Math.floor(progress / TOTAL * 100));
    txt(pct + '%', W * 0.5, 70, 56, C.ink);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 140, bw, 18, '#ffffff', 0.6);
    game.draw.rect(80, 140, bw * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.bad : C.good);
    for (var i = 0; i < MAX_LIVES; i++) {
      game.draw.sprite(SLED, SLED_PAL, 110 + i * 90, 205, 5, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    }
    txt(lives + ' / ' + MAX_LIVES, W - 120, 205, 30, C.ink);
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック stepHaul を使う) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, fail: false };
  // 角の外へ回り込む先導点: そりが居るべき点から、道の向きへ縄の長さ+αだけ先
  function leadPoint(s) {
    var a = pointAt(s), b = pointAt(s + 4);
    var tx = b.x - a.x, ty = b.y - a.y, n = Math.hypot(tx, ty) || 1;
    return { x: a.x + tx / n * (TETHER + 42), y: a.y + ty / n * (TETHER + 42) };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.6;
    if (cyc < dt || demo.t <= dt) {
      progress = 0; placeAt(0); drops = []; dropIdx = 0; offT = 0;
      demo.fail = Math.floor(demo.t / 6.6) % 2 === 1;
    }
    if (cyc > 0.3 && progress < TOTAL - 40) {
      // 成功回: 角の外側へ回り込む / 失敗回: 道の真ん中を急いで角でそりが内側へ外れる
      var g = demo.fail ? pointAt(progress + TETHER + 110) : leadPoint(progress + 20);
      demo.gx = g.x; demo.gy = g.y; demo.press = true;
      var pr = stepHaul(dt, g.x, g.y, true);
      offT = pr.dist > HALF ? offT + dt : 0;
      if (offT > OFF_GRACE) {
        game.fx.burst(sled.x, sled.y, { color: C.bad, count: 12, speed: 220 });
        game.fx.flash('#ffffff', 0.08);
        placeAt(progress); offT = 0; demo.fail = false;
      }
    } else {
      demo.press = false;
    }
  }

  // ── メインループ(1回だけ登録) ──
  game.onUpdate(function(dt) {
    if (progress === undefined) initGame();

    if (state === S.ATTRACT) {
      drawBg();
      stepDemo(dt);
      drawTrail();
      drawDrops();
      drawHaul(offT > 0.05);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 70, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 34, C.bamboo);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 44, C.bad);
      else txt('INSERT COIN', W / 2, H * 0.955, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawBg();
      drawTrail();
      drawHaul(false);
      game.draw.rect(0, H * 0.3, W, H * 0.3, '#fff6e4', 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, ok ? '#e0a100' : C.bad);
      txt(result.pct + '%', W / 2, H * 0.43, 60, C.ink);
      if (ok) txt('SCORE ' + result.score, W / 2, H * 0.49, 48, C.ink);
      else txt('あと' + (100 - result.pct) + '%!', W / 2, H * 0.49, 48, C.bad);
      txt('MISS ' + result.misses + '   ' + result.time.toFixed(1) + '秒', W / 2, H * 0.54, 34, C.bamboo);
      var isNew = ok && result.score >= game.best && result.score > 0;
      txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.58, 36, isNew ? '#e0a100' : C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 38, C.ink);
      return;
    }

    // PLAYING
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { percent: result.pct, misses: result.misses, timeLeft: Math.round(result.time * 10) / 10 };
        if (ok) game.end.success(result.score, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && pendingReset && !finished) {
        pendingReset = false; placeAt(progress);
        for (var q = drops.length - 1; q >= 0; q--) if (drops[q].warn <= 0) drops.splice(q, 1);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      var pr = stepHaul(dt, game.input.x, game.input.y, game.input.pressing);
      stepDrops(dt, true);
      if (pr.dist > HALF) {
        offT += dt;
        if (Math.random() < 0.15) game.audio.tone('G2', 0.05, { wave: 'square', volume: 0.04 });
      } else offT = Math.max(0, offT - dt * 2);
      var buried = false;
      for (var i = 0; i < drops.length; i++) {
        if (drops[i].warn <= 0 && game.hit.circle(sled.x, sled.y, 26, drops[i].x, drops[i].y, 64)) buried = true;
      }
      if (buried || offT > OFF_GRACE) {
        snag(sled.x, sled.y);
      } else {
        if (!halfShown && progress > TOTAL * 0.5) {
          halfShown = true;
          game.fx.popup('50%', sled.x, sled.y - 90, { color: C.good, size: 56 });
          game.audio.play('se_milestone', 0.5);
          game.feedback.good(sled.x, sled.y, { text: 'NICE', color: C.good });
        }
        if (progress >= TOTAL - 40) {
          finished = true; ok = true; celebrate = 0.5;
          var n = PTS[PTS.length - 1];
          game.fx.burst(n.x, n.y, { color: C.leaf, count: 26, speed: 420 });
          game.feedback.good(n.x, n.y, { text: 'CLEAR', color: C.good, size: 64 });
          game.audio.play('se_success', 0.6);
          finish();
        } else if (timeLeft <= 0) {
          timeLeft = 0; finished = true; ok = false; hitStop = 0.45;
          snagFx = { x: sled.x, y: sled.y, t: 0.45 };
          game.feedback.bad(sled.x, sled.y, { text: 'TIME UP', shake: 10 });
          game.audio.play('se_failure', 0.5);
          finish();
        }
      }
    }

    drawBg();
    drawTrail();
    drawDrops();
    drawHaul(offT > 0.05 && !finished);
    // 指の目印
    if (game.input.pressing && !finished) game.draw.circle(game.input.x, game.input.y, 26, C.dew, 0.45);
    // hit-stop:当たったそりを白く拡大
    if (snagFx && snagFx.t > 0) {
      snagFx.t -= dt;
      var k = 1 + (0.45 - snagFx.t) * 1.6;
      game.draw.circle(snagFx.x, snagFx.y, 60 * k, '#ffffff', 0.55);
      game.draw.sprite(SLED, { t: '#ffffff', p: '#ffffff', y: '#ffffff', b: '#ffffff' }, snagFx.x, snagFx.y, 9 * k, { anchor: 'center' });
    }
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, C.ink);
  });

  function startMusic() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 1]
    ], { tempo: 150, wave: 'triangle', volume: 0.07, loop: true, bass: [['G2', 2], ['C3', 2], ['A2', 2], ['D3', 2]] });
  }

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    game.audio.bgm('bgm_cute');
  });
})(game);

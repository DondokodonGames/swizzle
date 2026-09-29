// J-3DSDSDSTOP10-0034-haycart-pile-over.js
// 干し草山の積み越し — 滑車から揺れて下りる干し草・カボチャ・木箱を荷車の上へ積み上げ、隣の畑のかかしを山で埋める
// 操作: 画面のどこでもタップで滑車の荷を放す。真下の山の上に乗れば積める。はみ出しすぎると落ち、ずれを重ねると山が傾く(社内メモ。画面には出さない)
// 終わり: 8個積んでかかしの帽子の高さを越えればCLEAR。3個落とす/山が崩れる/時間切れでGAME OVER
// @mechanic: stack
// @theme: harvest_haycart_pile
// 世界観: 収穫祭の昼下がり、農家の子が納屋の滑車で吊った干し草やカボチャを荷車に積み上げ、垣根の向こうで得意げに立つ隣の畑のかかしを、あふれる収穫の山で頭まで埋めてしまう
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ段数・ぴったり数・落とした数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケールで、位置は接地影で見せる。多色+影
  var STYLE = { bg: ['#8fd3ff', '#cdeaff', '#7cc05a'], main: ['#e8c55a', '#e07a2a', '#9a6a3a'], accent: ['#ffffff', '#d8343a'] };
  var C = {
    sky1: '#6cc0f5', sky2: '#d6f0ff', hill: '#7cc05a', hillD: '#4f9a3a', soil: '#8a5a32', soilD: '#5c3a1e',
    hay: '#e8c55a', hayD: '#b8923a', pump: '#e07a2a', pumpD: '#a8501a', crate: '#b07a44', crateD: '#6e4622',
    rope: '#5c3a1e', shadow: '#1e2a14', gold: '#fff08a', bad: '#d8343a', ink: '#22160c', white: '#ffffff', cart: '#7a4a28'
  };

  var GAME_TITLE = 'HAY PILE OVER';
  var TIME_LIMIT = 22;
  var NEEDED = 8;
  var LIVES = 3;
  var BASE_X = W / 2, BASE_W = 380, BASE_TOP = H * 0.78;
  var PULLEY_Y = H * 0.25;
  var KINDS = [
    { k: 'hay', w: 250, h: 110 },
    { k: 'pump', w: 170, h: 120 },
    { k: 'crate', w: 190, h: 140 }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, pile, stackH, carry, falling, lives, perfects, camY, swingT, hitStop, outro, ok, halfShown, focus, wind, windWarn, windT, lean, spawnWait;

  // ── sprites ───────────────────────────────────────────────────────
  var HAY = ['.hhhhhhhhhh.', 'hHhhHhhHhhHh', 'hhhrhhhhrhhh', 'hHhrhHhHrhHh', 'hhhrhhhhrhhh', '.hhhhhhhhhh.'];
  var PUMP = ['....ss....', '..oopooo..', '.oOoopoOo.', 'oOoOopoOoo', 'oOoOopoOoo', '.oOoopoOo.', '..oooooo..'];
  var CRATE = ['ccccccccc', 'cDcccccDc', 'cc.D.D.cc', 'cc..D..cc', 'cc.D.D.cc', 'cDcccccDc', 'ccccccccc'];
  var SCARE = [
    ['..kkkk..', '.kkkkkk.', 'kkkkkkkk', '..ffff..', '..fkfk..', '..ffff..', 'rrrrrrrr', '...rr...', '...pp...', '...pp...', '...pp...'],
    ['..kkkk..', '.kkkkkk.', 'kkkkkkkk', '..ffff..', '..fkfk..', '..ffff..', '.rrrrrr.', 'r..rr..r', '...pp...', '...pp...', '...pp...']
  ];
  var KID = [
    ['..hhh..', '.hhhhh.', '..fff..', '..fkf..', '.bbbbb.', 'b.bbb.b', '..b.b..', '.k...k.'],
    ['..hhh..', '.hhhhh.', '..fff..', '..fkf..', 'bbbbbbb', '..bbb..', '..b.b..', '..k.k..']
  ];

  function sprFor(k) {
    if (k === 'hay') return { a: HAY, p: { h: C.hay, H: C.hayD, r: C.pumpD } };
    if (k === 'pump') return { a: PUMP, p: { o: C.pump, O: C.pumpD, p: C.pumpD, s: C.hillD } };
    return { a: CRATE, p: { c: C.crate, D: C.crateD } };
  }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function nextCarry() {
    var kd = KINDS[Math.floor(game.random(0, KINDS.length)) % KINDS.length];
    carry = { k: kd.k, w: kd.w, h: kd.h, x: BASE_X };
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; pile = []; stackH = 0; falling = null; lives = LIVES;
    perfects = 0; camY = 0; swingT = 0; hitStop = 0; outro = 0; ok = false; halfShown = false; focus = null;
    wind = 0; windWarn = 0; windT = 5; lean = 0; spawnWait = 0;
    nextCarry();
  }

  function topPiece() { return pile.length ? pile[pile.length - 1] : { x: BASE_X, w: BASE_W }; }

  // 滑車の揺れ(実プレイ・デモ共用)
  function stepSwing(dt) {
    swingT += dt * (1.5 + pile.length * 0.12);
    if (carry) carry.x = BASE_X + Math.sin(swingT) * 300;
  }

  function release(isDemo) {
    if (!carry || falling) return false;
    falling = { k: carry.k, w: carry.w, h: carry.h, x: carry.x, wy: PULLEY_Y + 90 - camY, vy: 0, vx: 0, off: false };
    carry = null; spawnWait = 0.35;
    if (!isDemo) game.audio.play('se_tap', 0.35);
    return true;
  }

  // 落下と着地(実プレイ・デモ共用)
  function stepFall(dt, isDemo) {
    if (!falling) {
      if (!carry) { spawnWait -= dt; if (spawnWait <= 0) nextCarry(); }
      return;
    }
    var f = falling;
    f.vy += 2600 * dt;
    f.wy += f.vy * dt;
    f.x += (f.vx + wind * 260) * dt;
    if (f.off) {
      f.vx *= 1 - 0.5 * dt;
      if (f.wy + camY > H + 200) { falling = null; }
      return;
    }
    var topY = BASE_TOP - stackH;
    if (f.wy + f.h / 2 >= topY) {
      var tp = topPiece();
      var dx = f.x - tp.x;
      var reach = (tp.w + f.w) / 2;
      if (Math.abs(dx) > reach * 0.62) {
        f.off = true; f.vx = dx > 0 ? 420 : -420; f.vy = -300;
        onDrop(f, isDemo);
        return;
      }
      var perfect = Math.abs(dx) < 16;
      if (perfect) f.x = tp.x;
      f.wy = topY - f.h / 2;
      pile.push({ k: f.k, w: f.w, h: f.h, x: f.x, wy: f.wy, squash: 0.25 });
      stackH += f.h;
      falling = null;
      lean = comOffset();
      onLand(pile[pile.length - 1], perfect, isDemo);
    }
  }

  function comOffset() {
    var sw = 0, sx = 0;
    for (var i = 0; i < pile.length; i++) { sw += pile[i].w; sx += (pile[i].x - BASE_X) * pile[i].w; }
    return sw ? sx / sw : 0;
  }

  function onLand(p, perfect, isDemo) {
    if (isDemo) { game.fx.burst(p.x, p.wy + camY, { color: perfect ? C.gold : C.hay, count: 8, speed: 200 }); return; }
    if (perfect) perfects++;
    game.feedback.good(p.x, p.wy + camY - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.white, count: perfect ? 14 : 8 });
    if (Math.abs(lean) > BASE_W * 0.5) { focus = p; finish(false); return; }
    if (!halfShown && pile.length >= NEEDED / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(pile.length + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 64 });
    }
    if (pile.length >= NEEDED) { focus = p; finish(true); }
  }

  function onDrop(f, isDemo) {
    if (isDemo) { game.fx.burst(f.x, f.wy + camY, { color: C.bad, count: 6, speed: 180 }); return; }
    lives--;
    focus = f;
    if (lives <= 0) { finish(false); return; }
    hitStop = 0.35;
    game.feedback.bad(f.x, f.wy + camY - 100, { text: 'MISS', color: C.bad });
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6);
      game.fx.burst(W * 0.84, H * 0.5, { color: C.hay, count: 30, speed: 420 });
    } else {
      var fx = focus ? focus.x : W / 2;
      game.feedback.bad(fx, H * 0.45, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    if (!release(false)) game.audio.tone('D4', 0.04, { wave: 'triangle', volume: 0.04 });
  });

  // ── demo(真上に来た瞬間に放す。3回目は大きく外して落とす)───────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.88, press: false, n: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt || pile.length >= 5) { pile = []; stackH = 0; falling = null; demo.n = 0; camY = 0; lean = 0; nextCarry(); }
    stepSwing(dt);
    stepFall(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.3;
    if (demo.cool <= 0 && carry && !falling) {
      var tp = topPiece();
      var miss = demo.n % 3 === 2;
      var d = carry.x - tp.x;
      if ((!miss && Math.abs(d) < 12) || (miss && Math.abs(d) > 250)) {
        release(true); demo.n++; demo.cool = 0.6;
        demo.gx = W * 0.62; demo.gy = H * 0.88;
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.5, C.sky2], [0.55, C.hill], [1, C.hillD]]);
    // 遠くの丘と納屋(小さく=遠い)
    for (var x = 0; x < W; x += 20) {
      var hh = 70 + Math.sin(x * 0.008 + 1) * 40;
      game.draw.rect(x, H * 0.55 + camY * 0.2 - hh, 20, hh, C.hill);
    }
    for (var c = 0; c < 4; c++) game.draw.circle(((c * 330 + t * 16) % (W + 300)) - 150, H * 0.12 + c * 40, 60, C.white, 0.6);
    // 奥行きの垣根(奥ほど小さい杭)
    for (var p = 0; p < 7; p++) {
      var sc = 0.5 + p * 0.1;
      var px = W * 0.6 + p * 60, py = H * 0.62 + p * 18 + camY;
      game.draw.rect(px, py - 90 * sc, 14 * sc, 90 * sc, C.crateD);
    }
    game.draw.rect(0, 0, W, H, C.gold, 0.02 + 0.02 * Math.sin(t * 1.4));
  }

  function drawRival() {
    var t = game.time.elapsed;
    // 目標の高さ(かかしの帽子)
    var goalY = BASE_TOP - NEEDED * 123 + camY;
    var sx = W * 0.86, sy = goalY + 230;
    // 隣の畑の物見やぐら(かかしを高く立てる柱)
    var gy = BASE_TOP + camY + 70;
    game.draw.rect(sx - 70, gy - 10, 140, 24, C.shadow, 0.3);
    game.draw.rect(sx - 12, sy + 100, 24, gy - sy - 100, C.crateD);
    for (var r = sy + 180; r < gy - 20; r += 120) game.draw.line(sx - 50, r, sx + 50, r + 80, C.crate, 8);
    var buried = ok && phase !== 'play' && phase !== 'ready';
    game.draw.sprite(SCARE[Math.floor(t * 1.5) % 2], { k: '#3a2a6a', f: '#f2e0b0', r: '#4a8adf', p: C.crateD }, sx + Math.sin(t * 1.3) * 4, sy, 20, { anchor: 'center', alpha: buried ? 0.35 : 1 });
    for (var i = 0; i < 16; i++) game.draw.rect(i * 70, goalY, 40, 6, C.bad, 0.55);
  }

  function drawPiece(k, x, y, w, alpha, squash) {
    var s = sprFor(k);
    var px = w / s.a[0].length;
    game.draw.sprite(s.a, s.p, x, y + (squash || 0) * 20, px, { anchor: 'center', alpha: alpha === undefined ? 1 : alpha });
  }

  function drawPile(dt) {
    var t = game.time.elapsed;
    var sway = Math.sin(t * 3) * Math.min(1, Math.abs(lean) / (BASE_W * 0.5)) * 14;
    // 荷車
    var cy = BASE_TOP + camY;
    game.draw.rect(BASE_X - BASE_W / 2 - 20, cy + 70, BASE_W + 40, 22, C.shadow, 0.3);
    game.draw.rect(BASE_X - BASE_W / 2, cy, BASE_W, 40, C.cart);
    game.draw.rect(BASE_X - BASE_W / 2, cy, BASE_W, 8, C.crate);
    game.draw.circle(BASE_X - BASE_W / 2 + 60, cy + 60, 36, C.crateD);
    game.draw.circle(BASE_X + BASE_W / 2 - 60, cy + 60, 36, C.crateD);
    for (var i = 0; i < pile.length; i++) {
      var p = pile[i];
      if (p.squash > 0) p.squash -= dt;
      var lv = (i + 1) / Math.max(1, pile.length);
      var isF = focus === p && phase === 'stop';
      if (isF && Math.floor(t * 14) % 2 === 0) game.draw.circle(p.x + sway * lv, p.wy + camY, p.w * 0.7, C.white, 0.5);
      drawPiece(p.k, p.x + sway * lv, p.wy + camY, p.w, 1, Math.max(0, p.squash));
    }
  }

  function drawCarry() {
    var t = game.time.elapsed;
    game.draw.rect(0, PULLEY_Y - 30, W, 16, C.crateD);
    var cx = carry ? carry.x : BASE_X + Math.sin(swingT) * 300;
    game.draw.circle(cx, PULLEY_Y - 22, 26, C.rope);
    if (carry) {
      game.draw.line(cx, PULLEY_Y - 22, cx, PULLEY_Y + 40, C.rope, 5);
      drawPiece(carry.k, cx, PULLEY_Y + 90, carry.w, 1, 0);
      // 真下への影(接地位置の目印)
      var ty = BASE_TOP - stackH + camY;
      game.draw.rect(cx - carry.w / 2, ty - 8, carry.w, 10, C.shadow, 0.25);
    }
    if (falling) {
      var f = falling;
      if (focus === f && Math.floor(t * 14) % 2 === 0) game.draw.circle(f.x, f.wy + camY, f.w * 0.7, C.white, 0.5);
      drawPiece(f.k, f.x, f.wy + camY, f.w, f.off ? 0.8 : 1, 0);
    }
    // 風の予告
    if (windWarn > 0 || Math.abs(wind) > 0.05) {
      var dir = windWarn > 0 ? windDirNext : (wind > 0 ? 1 : -1);
      for (var k = 0; k < 5; k++) {
        var lx = ((t * 600 * dir + k * 230) % (W + 200) + W + 200) % (W + 200) - 100;
        game.draw.rect(lx, H * 0.33 + k * 60, 120, 6, C.white, windWarn > 0 ? (Math.floor(t * 12) % 2 ? 0.8 : 0.2) : 0.6);
      }
    }
  }

  var windDirNext = 1;
  function stepWind(dt) {
    if (pile.length < 3) return;
    if (windWarn > 0) {
      windWarn -= dt;
      if (windWarn <= 0) { wind = windDirNext * 0.9; windT = 1.2; }
      return;
    }
    if (Math.abs(wind) > 0) {
      windT -= dt;
      if (windT <= 0) { wind = 0; windT = game.random(2.5, 4); }
      return;
    }
    windT -= dt;
    if (windT <= 0) {
      windDirNext = Math.random() < 0.5 ? -1 : 1;
      windWarn = 0.7;
      game.audio.tone('G3', 0.3, { wave: 'sawtooth', volume: 0.03, slide: 200 });
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.9, W, H * 0.1, C.soilD);
    for (var i = 0; i < LIVES; i++) drawPiece('pump', W * 0.72 + i * 90, H * 0.95 + Math.sin(t * 2 + i) * 3, 70, i < lives ? 1 : 0.25, 0);
    game.draw.sprite(KID[Math.floor(t * 2) % 2], { h: '#6a3a1a', f: '#f2d0a0', k: C.ink, b: '#3a7adf' }, W * 0.12, H * 0.93 + Math.sin(t * 2.4) * 5, 13, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.55);
    txt(pile.length + ' / ' + NEEDED, W / 2, 90, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.ink);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 5 ? C.bad : C.gold);
  }

  function stepCam(dt) {
    var topY = BASE_TOP - stackH;
    var want = Math.max(0, H * 0.58 - topY);
    camY += (want - camY) * Math.min(1, dt * 4);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt); stepCam(dt);
      drawScene(); drawRival(); drawPile(dt); drawCarry(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.55);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 72, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(); drawRival(); drawPile(dt); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.14, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepSwing(dt); stepWind(dt); stepFall(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = pile.length * 100 + perfects * 60 + lives * 40;
        var stats = { stacked: pile.length, perfect: perfects, dropped: LIVES - lives };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }
    stepCam(dt);

    drawScene(); drawRival(); drawPile(dt); drawCarry(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.gold);
    if (phase === 'outro') {
      var sc = pile.length * 100 + perfects * 60 + lives * 40;
      game.draw.rect(0, H * 0.3, W, H * 0.16, C.ink, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.39, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.43, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - pile.length) + '個!', W / 2, H * 0.43, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.43, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['G4', 1]
    ], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1], ['G2', 1], ['E3', 1], ['D3', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

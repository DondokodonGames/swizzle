// J-Switch-0015-cliff-auger-amber.js
// 崖のオーガー掘り — 崖の断面に透けて見える琥珀やアンモナイトの層まで、手回し錐を回した分だけ掘り下げ、ちょうどその層で手を止めて掘り当てる
// 操作: 下の円いハンドルのまわりを指でぐるぐる回すと、回した分だけ錐が下がる。宝の層で回すのをやめる(約0.5秒)と掘り当てる。宝の下の赤い線を越えると宝が割れる。ガラクタの層や何もない土で止めてもハズレ。硬い灰色の岩層は回しても進みが遅い(社内メモ。画面には出さない)
// 終わり: 宝の点数を8点集めればCLEAR。3回しくじる/時間切れでGAME OVER
// @mechanic: rotate_gesture
// @theme: cliff_auger_fossil_dig
// 世界観: 嵐で崩れた海辺の段丘崖で、化石掘りの見習いの少女が、断面に透けて見える琥珀とアンモナイトの層まで手回しの錐を回した分だけ掘り下げ、空き缶や古靴の層は素通りして、潮が満ちる前に宝だけを割らずに掘り当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた点数・PERFECT数・しくじり数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/正面/側面の3明度で積む。空は明るい昼の海
  var STYLE = { bg: ['#86cff7', '#e2f5ff'], main: ['#a0663a', '#d9b36c', '#6f7580'], accent: ['#ffa21f', '#ff4d5e'] };
  var INK = '#2b1a10';

  var TITLE = 'AMBER AUGER';
  var TIME_LIMIT = 14;
  var GOAL = 8;
  var MAX_MISS = 3;
  var SURF = H * 0.27;
  var FLOOR = H * 0.735;
  var CELL = 60;
  var COL_X = W / 2;
  var CR = { x: W / 2, y: H * 0.86, r: 165 };
  var BASKET = { x: W * 0.74, y: H * 0.27 - 46 };
  var PX_PER_RAD = 34;
  var BAND = 36, PERFECT_BAND = 12;
  var STILL_T = 0.45, IDLE_T = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var LAYERS = [
    { to: 60, c: ['#95e06a', '#62b545', '#3d7f2b'] },
    { to: 240, c: ['#cf9660', '#a0663a', '#6b4224'] },
    { to: 420, c: ['#f4d897', '#d9b36c', '#a38148'] },
    { to: 620, c: ['#e29a70', '#b8704a', '#7d472d'] },
    { to: 99999, c: ['#a57459', '#7a4a33', '#4c2c1e'] }
  ];
  var ROCK = ['#b4bac4', '#7c838f', '#4f545d'];

  var GIRL = [
    ['..hhh...', '.hhhhh..', '.hfefh..', '..fff...', '.rrrrr..', 'f.rrr.f.', '..bbb...', '..b.b...'],
    ['..hhh...', '.hhhhh..', '.hfefh..', 'f.fff.f.', '.rrrrr..', '..rrr...', '..bbb...', '.b...b..']
  ];
  var GIRL_PAL = { h: '#5a2f1b', f: '#ffd2a8', e: '#2b1a10', r: '#e2483a', b: '#3f5fb8' };
  var AMBER = ['..oooo..', '.oyyyyo.', 'oyykkyyo', 'oykyykyo', 'oyykkyyo', '.oyyyyo.', '..oooo..'];
  var AMBER_PAL = { o: '#b95300', y: '#ffb238', k: '#5a2d0c' };
  var AMMO = ['..ssss..', '.sccccs.', 'scsssccs', 'scscscs.', 'scscccs.', 'scsssss.', '.scccccs', '..sssss.'];
  var AMMO_PAL = { s: '#8a7a62', c: '#f3ead6' };
  var CAN = ['.gggg.', 'gwwwwg', 'gddddg', 'grddrg', 'gddddg', 'gddrdg', '.gggg.'];
  var CAN_PAL = { g: '#59606b', w: '#c9d0d9', d: '#8d96a3', r: '#b0582c' };
  var BOOT = ['..kkk..', '..kkk..', '..kkk..', '..kkkk.', '.kkkkkk', 'kkkkkkk', 'lllllll'];
  var BOOT_PAL = { k: '#4b3a2a', l: '#211710' };
  var BIT = [
    ['mw..', '.mw.', '..mw', 'mw..', '.mw.', '..mw', '.mm.', '..m.'],
    ['.mw.', '..mw', 'mw..', '.mw.', '..mw', 'mw..', '.mm.', '..m.'],
    ['..mw', 'mw..', '.mw.', '..mw', 'mw..', '.mw.', '.mm.', '..m.']
  ];
  var BIT_PAL = { m: '#6c7480', w: '#e6ebf2' };
  var GULL = [['w...w', '.w.w.', '..w..'], ['.....', 'wwsww', '..w..']];
  var GULL_PAL = { w: '#ffffff', s: '#c9d3dd' };
  var CRACKED = ['o.oo..o.', '.oy.yo..', 'oy.k.yo.', '..yy..yo', 'oy.kk..o', '.o.yy.o.', '..o..o..'];

  var siteNo, site, value, perfects, misses, timeLeft, ready, hitStop, pendingBad;
  var finished, done, endWait, ok, timeUp, crankAng, prevAng, dragging, grip, flyers, flash, milestoneShown, tickAcc;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function layerFor(d) {
    for (var i = 0; i < LAYERS.length; i++) if (d < LAYERS[i].to) return LAYERS[i].c;
    return LAYERS[LAYERS.length - 1].c;
  }

  function inHard(d) {
    if (!site || !site.hard) return false;
    return d >= site.hard[0] * CELL && d < (site.hard[1] + 1) * CELL;
  }

  function newSite(fixed) {
    siteNo++;
    var deep = Math.min(1, siteNo / 6);
    var trD, jkD, tries = 0;
    if (fixed) { trD = fixed.tr; jkD = fixed.jk; }
    else {
      do {
        trD = 180 + Math.random() * (360 + 220 * deep);
        jkD = 110 + Math.random() * 640;
        tries++;
      } while (Math.abs(trD - jkD) < 150 && tries < 40);
    }
    var hard = null;
    if (fixed) hard = fixed.hard;
    else if (trD > 300 && Math.random() < 0.45 + 0.35 * deep) {
      var r0 = 2 + Math.floor(Math.random() * Math.max(1, Math.floor(trD / CELL) - 3));
      hard = [r0, r0 + (deep > 0.5 ? 1 : 0)];
    }
    var amber = fixed ? true : Math.random() < 0.5;
    site = {
      tr: { kind: amber ? 'amber' : 'ammo', val: amber ? 3 : 2, d: trD, got: false, cracked: false },
      jk: { kind: Math.random() < 0.5 ? 'can' : 'boot', d: jkD, broken: false },
      hard: hard, depth: 0, still: 0, idle: 0, phase: 'drill', showT: 0, appear: 0
    };
  }

  function initGame() {
    siteNo = 0; value = 0; perfects = 0; misses = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; pendingBad = null;
    finished = false; done = false; endWait = 0; ok = false; timeUp = false;
    crankAng = -Math.PI / 2; prevAng = null; dragging = false; grip = 0;
    flyers = []; flash = null; milestoneShown = false; tickAcc = 0;
    newSite(null);
  }

  function finishRound(win) {
    if (finished) return;
    finished = true; done = true; ok = win; endWait = 1.5;
    game.audio.stopBgm();
    if (state === S.PLAYING) game.audio.play(win ? 'se_success' : 'se_failure', 0.5);
  }

  function miss(kind) {
    if (!site || site.phase !== 'drill') return;
    misses++;
    site.phase = 'show'; site.showT = 0.8;
    var y = SURF + Math.max(site.depth, 30);
    if (kind === 'crack') { site.tr.cracked = true; y = SURF + site.tr.d; }
    if (kind === 'junk') y = SURF + site.jk.d;
    flash = { x: COL_X, y: y, t: 0.45, max: 0.45, bad: true };
    hitStop = 0.4;
    pendingBad = { x: COL_X, y: y };
    game.audio.tone(kind === 'crack' ? 'C3' : 'F3', 0.14, { wave: 'square', volume: 0.12 });
    if (state === S.PLAYING && misses >= MAX_MISS) finishRound(false);
  }

  function collect(perfect) {
    var y = SURF + site.tr.d;
    value += site.tr.val + (perfect ? 1 : 0);
    if (perfect) perfects++;
    site.tr.got = true; site.phase = 'show'; site.showT = 0.6;
    flyers.push({ x: COL_X, y: y, t: 0, kind: site.tr.kind });
    flash = { x: COL_X, y: y, t: 0.3, max: 0.3, bad: false };
    hitStop = 0.18;
    game.feedback.good(COL_X, y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? '#ffe14a' : '#7dff9a', size: perfect ? 62 : 50 });
    game.audio.play('se_coin', 0.4);
    if (state !== S.PLAYING) return;
    if (!milestoneShown && value >= GOAL / 2) {
      milestoneShown = true;
      game.fx.popup(value + ' / ' + GOAL, W / 2, H * 0.2, { color: STYLE.accent[0], size: 50 });
      game.audio.play('se_milestone', 0.4);
    }
    if (value >= GOAL) finishRound(true);
  }

  function judgeStop() {
    var d = site.depth;
    var dt = Math.abs(d - site.tr.d);
    if (dt <= BAND) { collect(dt <= PERFECT_BAND); return; }
    if (!site.jk.broken && Math.abs(d - site.jk.d) <= BAND) { miss('junk'); return; }
    miss('empty');
  }

  function turn(dA) {
    if (!site || site.phase !== 'drill') return;
    var a = Math.abs(dA);
    crankAng += dA;
    var rate = inHard(site.depth) ? 0.4 : 1;
    site.depth = Math.min(FLOOR - SURF - 10, site.depth + a * PX_PER_RAD * rate);
    site.still = 0; site.idle = 0;
    tickAcc += a;
    if (tickAcc > 1.5) {
      tickAcc = 0;
      game.audio.tone(inHard(site.depth) ? 'A2' : 'E4', 0.04, { wave: 'square', volume: 0.05 });
      if (inHard(site.depth)) game.fx.burst(COL_X, SURF + site.depth, { color: ROCK[0], count: 4, speed: 160 });
    }
    if (!site.jk.broken && site.depth > site.jk.d + BAND) {
      site.jk.broken = true;
      game.audio.play('se_break', 0.25);
      game.fx.burst(COL_X, SURF + site.jk.d, { color: '#9aa3ad', count: 10, speed: 240 });
    }
    if (site.depth > site.tr.d + BAND) miss('crack');
  }

  function stepSite(dt) {
    if (!site) return;
    site.appear = Math.min(1, site.appear + dt * 4);
    if (site.phase === 'drill') {
      if (site.depth > 18) {
        site.still += dt;
        if (site.still >= STILL_T) judgeStop();
      } else {
        site.idle += dt;
        if (site.idle >= IDLE_T) miss('idle');
      }
    } else {
      site.showT -= dt;
      site.depth = Math.max(0, site.depth - dt * 1500);
      if (site.showT <= 0 && state === S.PLAYING && !finished) newSite(null);
    }
  }

  function stepCore(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && pendingBad) {
        game.feedback.bad(pendingBad.x, pendingBad.y, { text: 'MISS', shake: 10 });
        pendingBad = null;
      }
      return false;
    }
    stepSite(dt);
    return true;
  }

  function stepCosmetic(dt) {
    if (grip > 0) grip -= dt;
    if (flash) { flash.t -= dt; if (flash.t <= 0) flash = null; }
    for (var i = flyers.length - 1; i >= 0; i--) {
      flyers[i].t += dt * 1.8;
      if (flyers[i].t >= 1) flyers.splice(i, 1);
    }
  }

  // ---------- 描画 ----------
  function cube(x, y, s, c) {
    game.draw.rect(x, y, s, s, c[1]);
    game.draw.rect(x, y, s, s * 0.2, c[0]);
    game.draw.rect(x + s * 0.8, y + s * 0.2, s * 0.2, s * 0.8, c[2]);
  }

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, SURF, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.rect(0, SURF - 110, W, 110, '#3b8fcf');
    for (var i = 0; i < 6; i++) {
      var wx = ((i * 210 + t * 40) % (W + 200)) - 100;
      game.draw.rect(wx, SURF - 90 + (i % 3) * 26, 70, 6, '#bfe6ff', 0.7);
    }
    game.draw.circle(W * 0.13, H * 0.15 + Math.sin(t * 0.7) * 6, 56, '#fff3b0');
    game.draw.sprite(GULL[Math.floor(t * 3) % 2], GULL_PAL, W * 0.3 + Math.sin(t * 0.8) * 120, H * 0.14 + Math.cos(t * 1.3) * 18, 9, { anchor: 'center' });
    game.draw.sprite(GULL[Math.floor(t * 3 + 1) % 2], GULL_PAL, W * 0.82 + Math.cos(t * 0.6) * 90, H * 0.18 + Math.sin(t * 1.1) * 14, 7, { anchor: 'center' });
  }

  function drawCliff() {
    var rows = Math.ceil((FLOOR - SURF) / CELL);
    for (var r = 0; r < rows; r++) {
      var d = r * CELL + CELL / 2;
      var rock = site && site.hard && r >= site.hard[0] && r <= site.hard[1];
      for (var c = 0; c < 18; c++) {
        var col = rock ? ROCK : layerFor(d);
        cube(c * CELL, SURF + r * CELL, CELL, col);
        if (!rock && (r * 7 + c * 13) % 11 === 0) game.draw.rect(c * CELL + 18, SURF + r * CELL + 26, 10, 8, col[2]);
      }
    }
  }

  function itemSprite(kind) {
    if (kind === 'amber') return [AMBER, AMBER_PAL];
    if (kind === 'ammo') return [AMMO, AMMO_PAL];
    if (kind === 'can') return [CAN, CAN_PAL];
    return [BOOT, BOOT_PAL];
  }

  function drawSite() {
    if (!site) return;
    var t = game.time.elapsed;
    var tipY = SURF + site.depth;
    // 掘った穴
    game.draw.rect(COL_X - 24, SURF, 48, site.depth, '#1d120b', 0.85);
    // ガラクタ
    if (!site.jk.broken) {
      var js = itemSprite(site.jk.kind);
      game.draw.sprite(js[0], js[1], COL_X, SURF + site.jk.d, 8, { anchor: 'center', alpha: 0.9 });
    }
    // 宝と、その下の割れ線(近づくほど速く点滅 = 予告)
    var ty = SURF + site.tr.d;
    if (!site.tr.got) {
      var glow = 0.25 + 0.15 * Math.sin(t * 6);
      game.draw.circle(COL_X, ty, 50, '#fff3b0', site.tr.cracked ? 0.1 : glow * site.appear);
      if (site.tr.cracked) game.draw.sprite(CRACKED, AMBER_PAL, COL_X, ty, 9, { anchor: 'center' });
      else {
        var ts = itemSprite(site.tr.kind);
        game.draw.sprite(ts[0], ts[1], COL_X, ty, 9, { anchor: 'center' });
      }
      game.draw.rect(COL_X - 90, ty - BAND, 180, 3, '#fff3b0', 0.55);
      var near = Math.max(0, 1 - Math.abs((site.tr.d + BAND) - site.depth) / 120);
      var blink = Math.sin(t * (6 + near * 26)) > 0 ? 1 : 0.35;
      game.draw.rect(COL_X - 110, ty + BAND, 220, 6, STYLE.accent[1], (0.45 + near * 0.55) * blink);
    }
    // 錐
    var rigTop = SURF - 120;
    game.draw.line(COL_X - 80, SURF, COL_X, rigTop, '#6b4a2e', 12);
    game.draw.line(COL_X + 80, SURF, COL_X, rigTop, '#6b4a2e', 12);
    game.draw.rect(COL_X - 12, rigTop - 12, 24, 24, '#3a2716');
    game.draw.line(COL_X, rigTop, COL_X, tipY - 30, '#9aa3ad', 12);
    var bf = Math.floor(Math.abs(crankAng) * 1.5) % 3;
    game.draw.sprite(BIT[bf], BIT_PAL, COL_X, tipY - 30, 9, { anchor: 'center' });
    // 硬い層を削っている火花
    if (site.phase === 'drill' && inHard(site.depth) && site.still < 0.1) game.draw.circle(COL_X, tipY, 14 + Math.sin(t * 40) * 5, '#ffe9a8', 0.8);
  }

  function drawPeople() {
    var t = game.time.elapsed;
    var bob = Math.sin(t * 3.2) * 6;
    var f = (site && site.phase === 'drill' && site.still < 0.12 && site.depth > 0) ? Math.floor(t * 8) % 2 : Math.floor(t * 1.5) % 2;
    game.draw.sprite(GIRL[f], GIRL_PAL, W * 0.25 + Math.sin(t * 1.1) * 8, SURF - 44 + bob, 10, { anchor: 'center' });
    // 籠
    game.draw.rect(BASKET.x - 60, BASKET.y - 10, 120, 56, '#b07a3a');
    game.draw.rect(BASKET.x - 60, BASKET.y - 10, 120, 10, '#d59c55');
    game.draw.rect(BASKET.x + 48, BASKET.y, 12, 46, '#7a5022');
    var shown = Math.min(6, Math.floor((value || 0) / 2));
    for (var i = 0; i < shown; i++) game.draw.circle(BASKET.x - 40 + i * 16, BASKET.y - 14 + Math.sin(t * 3 + i) * 2, 10, i % 2 ? '#ffb238' : '#f3ead6');
  }

  function drawFlyers() {
    for (var i = 0; i < flyers.length; i++) {
      var f = flyers[i], k = f.t;
      var x = f.x + (BASKET.x - f.x) * k;
      var y = f.y + (BASKET.y - f.y) * k - Math.sin(k * Math.PI) * 180;
      var sp = itemSprite(f.kind);
      game.draw.sprite(sp[0], sp[1], x, y, 9 - k * 3, { anchor: 'center' });
    }
  }

  function drawFlash() {
    if (!flash) return;
    var k = flash.t / flash.max;
    game.draw.circle(flash.x, flash.y, 60 + (1 - k) * 70, '#ffffff', 0.55 * k);
    game.draw.circle(flash.x, flash.y, 40 + (1 - k) * 30, flash.bad ? STYLE.accent[1] : '#fff3b0', 0.35 * k);
  }

  function drawCrank(active) {
    var t = game.time.elapsed;
    game.draw.gradient(FLOOR, H, [[0, '#5a3a22'], [1, '#2d1c10']]);
    for (var i = 0; i < 18; i++) game.draw.rect(i * CELL, FLOOR, CELL - 4, 10, '#7a5334');
    var pulse = 0.18 + 0.1 * Math.sin(t * 3);
    game.draw.circle(CR.x, CR.y, CR.r + 34, '#1c110a', 0.9);
    game.draw.circle(CR.x, CR.y, CR.r + 18, active ? '#ffd27a' : '#c89a5a', pulse + (grip > 0 ? 0.35 : 0));
    game.draw.circle(CR.x, CR.y, CR.r - 18, '#3a2716');
    for (var k = 0; k < 8; k++) {
      var a = crankAng + k * Math.PI / 4;
      game.draw.circle(CR.x + Math.cos(a) * CR.r, CR.y + Math.sin(a) * CR.r, 8, '#e8c98f', 0.8);
    }
    game.draw.line(CR.x, CR.y, CR.x + Math.cos(crankAng) * CR.r, CR.y + Math.sin(crankAng) * CR.r, '#9aa3ad', 16);
    game.draw.circle(CR.x, CR.y, 26, '#9aa3ad');
    game.draw.circle(CR.x + Math.cos(crankAng) * CR.r, CR.y + Math.sin(crankAng) * CR.r, 40, grip > 0 ? '#ffe14a' : STYLE.accent[0]);
  }

  function drawScene(active) {
    var pulse = 0.04 + 0.03 * Math.sin(game.time.elapsed * 1.6);
    drawSky();
    drawCliff();
    drawSite();
    drawPeople();
    drawFlyers();
    drawFlash();
    drawCrank(active);
    game.draw.rect(0, 0, W, H, '#fff6d8', pulse);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#1c110a', 0.55);
    game.draw.sprite(AMBER, AMBER_PAL, 90, 90, 9, { anchor: 'center' });
    txt(value + ' / ' + GOAL, 160, 92, 60, '#ffe7a8', 'left');
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 80 - i * 70, 90, 24, i < misses ? STYLE.accent[1] : '#4a3a2e');
    }
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 176, W - 120, 20, '#3a2a1e');
    game.draw.rect(60, 176, (W - 120) * frac, 20, low ? STYLE.accent[1] : '#7fd3ff');
  }

  // ---------- 入力 ----------
  function angleAt(x, y) { return Math.atan2(y - CR.y, x - CR.x); }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    dragging = true; grip = 0.2;
    prevAng = Math.hypot(x - CR.x, y - CR.y) > 30 ? angleAt(x, y) : null;
    game.audio.play('se_tap', 0.12);
    if (ready <= 0 && site && site.phase === 'drill') game.fx.burst(CR.x + Math.cos(crankAng) * CR.r, CR.y + Math.sin(crankAng) * CR.r, { color: '#ffe14a', count: 4, speed: 120 });
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    if (Math.hypot(x - CR.x, y - CR.y) < 30) return;
    var a = angleAt(x, y);
    if (prevAng === null) { prevAng = a; return; }
    var dA = a - prevAng;
    while (dA > Math.PI) dA -= Math.PI * 2;
    while (dA < -Math.PI) dA += Math.PI * 2;
    prevAng = a;
    if (dA > 1) dA = 1;
    if (dA < -1) dA = -1;
    if (ready > 0 || hitStop > 0 || finished) return;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.04);
    turn(dA);
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    dragging = false; prevAng = null;
    game.fx.burst(CR.x, CR.y, { color: '#c89a5a', count: 3, speed: 90 });
  });

  // ---------- ATTRACT 実演(本番と同じ turn/stepCore を使う) ----------
  var demo = { t: 0, gx: CR.x, gy: CR.y - CR.r, press: false, fail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var P = 3.6;
    var cyc = demo.t % P;
    if (cyc < dt || demo.t <= dt) {
      demo.fail = Math.floor(demo.t / P) % 2 === 1;
      value = 0; misses = 0; hitStop = 0; pendingBad = null; flash = null; flyers = [];
      crankAng = -Math.PI / 2;
      newSite({ tr: 440, jk: 230, hard: [5, 5] });
    }
    var turning = false;
    if (cyc > 0.35 && site.phase === 'drill' && hitStop <= 0) {
      var goal = demo.fail ? 9999 : site.tr.d + 3;
      if (site.depth < goal) { turn(7.6 * dt); turning = true; }
    }
    demo.gx = CR.x + Math.cos(crankAng) * CR.r;
    demo.gy = CR.y + Math.sin(crankAng) * CR.r;
    demo.press = turning || (site.phase === 'drill' && site.depth > 0);
    grip = demo.press ? 0.05 : 0;
  }

  game.onUpdate(function(dt) {
    if (site === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepCore(dt);
      stepCosmetic(dt);
      drawScene(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#1c110a', 0.5);
      txt(TITLE, W / 2, 86, 76, '#ffc15a');
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 172, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, '#ffe14a');
      else txt('INSERT COIN', W / 2, H * 0.965, 36, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      stepCosmetic(dt);
      drawScene(false);
      game.draw.rect(0, H * 0.3, W, H * 0.34, '#1c110a', 0.78);
      txt(ok ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, ok ? '#7dff9a' : STYLE.accent[1]);
      game.draw.sprite(AMBER, AMBER_PAL, W / 2 - 150, H * 0.44, 10, { anchor: 'center' });
      txt(value + ' / ' + GOAL, W / 2 + 40, H * 0.44, 66, '#ffe7a8');
      txt('PERFECT ' + perfects + '   MISS ' + misses, W / 2, H * 0.51, 40, '#ffffff');
      var sc = resultScore();
      if (ok && sc >= game.best) txt('NEW RECORD', W / 2, H * 0.565, 48, '#ffe14a');
      else txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.565, 40, '#ffffff');
      if (!ok && value < GOAL) txt('あと' + (GOAL - value) + '点!', W / 2, H * 0.61, 44, '#ffc15a');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, '#ffffff');
      return;
    }

    // PLAYING
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      var running = stepCore(dt);
      if (done) {
        if (hitStop <= 0) {
          endWait -= dt;
          if (endWait <= 0) {
            state = S.RESULT;
            var stats = { value: value, perfect: perfects, miss: misses };
            if (ok) game.end.success(resultScore(), stats);
            else game.end.failure(stats);
          }
        }
      } else if (running) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0; timeUp = true;
          flash = { x: COL_X, y: SURF + (site ? site.depth : 0), t: 0.4, max: 0.4, bad: true };
          game.feedback.bad(COL_X, SURF + 60, { text: 'TIME UP', shake: 8 });
          finishRound(false);
        }
      }
    }
    stepCosmetic(dt);
    drawScene(site && site.phase === 'drill');
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, '#ffe14a');
  });

  function resultScore() { return value * 100 + perfects * 40 + Math.round(timeLeft * 10); }

  game.onStart(function() {
    game.audio.melody([['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 0.5], ['G4', 0.5], ['A4', 1]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

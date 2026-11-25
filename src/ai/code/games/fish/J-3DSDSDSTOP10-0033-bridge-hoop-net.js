// J-3DSDSDSTOP10-0033-bridge-hoop-net.js
// 石橋の輪網おとし — 渓流で弧を描いて跳ねるヤマメの行き先を読み、橋の真下を通る瞬間に輪網を落として空中ですくう
// 操作: 画面のどこでもタップで輪網を真下へ落とす。網が落ち切るまでに一瞬かかるので、魚が真下に来る少し前に落とす(社内メモ。画面には出さない)
// 終わり: 6匹すくえばCLEAR。空振り4回/時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: stone_bridge_hoop_net
// 世界観: 山あいの石橋の上、竹竿に輪網を吊った川番の子が、瀬を跳び越えていくヤマメの弧を目で追い、橋の真下を横切る一瞬に網を落として夕餉の6匹をそろえる
// 残るもの: 正誤(CLEAR/GAME OVER) + すくった数・金ヤマメ数・空振り数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄りの4階調、低コントラスト、画面枠と残像
  var STYLE = { bg: ['#0f380f', '#306230', '#8bac0f'], main: ['#9bbc0f', '#306230', '#0f380f'], accent: ['#c4d86a', '#e0f0a0'] };
  var C = { k: '#0f380f', d: '#306230', m: '#8bac0f', l: '#9bbc0f', hi: '#c4d86a', white: '#e0f0a0' };

  var GAME_TITLE = 'HOOP NET';
  var TIME_LIMIT = 18;
  var NEEDED = 6;
  var MAX_MISS = 4;
  var NX = W / 2;
  var NET_TOP = H * 0.34, NET_BOTTOM = H * 0.62, DROP_T = 0.34, RISE_T = 0.42;
  var WATER = H * 0.63;
  var CATCH_R = 96;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, caught, golds, misses, fish, spawnT, net, hitStop, outro, ok, halfShown, playT, focus, trail;

  // ── sprites ───────────────────────────────────────────────────────
  var FISH = [
    ['....dd....', '..dmmmmd.d', '.dmlmmmmdd', 'dmkmmmmmmd', '.dmmmmmmdd', '..dddddd.d'],
    ['....dd....', '..dmmmmdd.', '.dmlmmmmmd', 'dmkmmmmmmd', '.dmmmmmmmd', '..ddddddd.']
  ];
  var KID = [
    ['..kkk...', '.kkkkk..', '.kllkk..', '..lll...', '.ddddd..', 'd.ddd.d.', '..d.d...', '.k...k..'],
    ['..kkk...', '.kkkkk..', '.kllkk..', '..lll...', '.ddddd..', '.ddddd..', '..d.d...', '..k.k...']
  ];
  var NET = ['.kkkkkkkk.', 'k.m.m.m.mk', 'km.m.m.m.k', 'k.m.m.m.mk', '.km.m.m.k.', '..kkkkkk..'];
  var BASKET = ['kkkkkkkk', 'kdmdmdmk', 'kmdmdmdk', 'kdmdmdmk', '.kkkkkk.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.k, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; caught = 0; golds = 0; misses = 0;
    fish = []; spawnT = 0.5; net = { s: 'idle', t: 0, y: NET_TOP, got: null };
    hitStop = 0; outro = 0; ok = false; halfShown = false; playT = 0; focus = null; trail = [];
  }

  function spawnFish(isDemo) {
    var fromLeft = Math.random() < 0.5;
    var x0 = fromLeft ? NX - game.random(300, 430) : NX + game.random(300, 430);
    var skew = playT > 6 ? game.random(-180, 180) : 0;
    var x1 = 2 * NX - x0 + skew;
    var gold = playT > 3 && Math.random() < 0.18;
    var T = gold ? game.random(0.75, 0.9) : game.random(0.95, 1.25) - Math.min(0.2, playT * 0.02);
    fish.push({ x0: x0, x1: x1, apex: game.random(H * 0.44, H * 0.52), T: T, u: 0, warn: 0.6, x: x0, y: WATER, gold: gold, st: 'warn', gone: 0 });
    if (!isDemo) game.audio.tone(gold ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.04 });
  }

  // 魚の飛行(実プレイ・デモ共用)
  function stepFish(dt, isDemo) {
    for (var i = fish.length - 1; i >= 0; i--) {
      var f = fish[i];
      if (f.st === 'warn') {
        f.warn -= dt;
        if (f.warn <= 0) { f.st = 'air'; if (!isDemo) game.audio.play('se_jump', 0.25); }
        continue;
      }
      if (f.st === 'air') {
        f.u += dt / f.T;
        f.x = f.x0 + (f.x1 - f.x0) * f.u;
        f.y = WATER - (WATER - f.apex) * 4 * f.u * (1 - f.u);
        if (f.u >= 1) { f.st = 'splash'; f.gone = 0.3; }
        continue;
      }
      if (f.st === 'splash' || f.st === 'net') {
        f.gone -= dt;
        if (f.gone <= 0) fish.splice(i, 1);
      }
    }
  }

  // 網の上下(実プレイ・デモ共用)。落下中に魚と重なればすくう
  function stepNet(dt, isDemo) {
    if (net.s === 'drop') {
      net.t += dt;
      var u = Math.min(1, net.t / DROP_T);
      net.y = NET_TOP + (NET_BOTTOM - NET_TOP) * u * u;
      for (var i = 0; i < fish.length; i++) {
        var f = fish[i];
        if (f.st !== 'air') continue;
        if (Math.hypot(f.x - NX, f.y - (net.y + 20)) < CATCH_R) {
          f.st = 'net'; f.gone = 0.5; net.got = f;
          net.s = 'rise'; net.t = 0;
          onCatch(f, isDemo);
          return;
        }
      }
      if (u >= 1) {
        net.s = 'rise'; net.t = 0;
        onEmpty(isDemo);
      }
    } else if (net.s === 'rise') {
      net.t += dt;
      var v = Math.min(1, net.t / RISE_T);
      net.y = NET_BOTTOM - (NET_BOTTOM - NET_TOP) * v;
      if (v >= 1) { net.s = 'idle'; net.y = NET_TOP; net.got = null; }
    }
  }

  function onCatch(f, isDemo) {
    if (isDemo) { game.fx.burst(NX, net.y, { color: C.hi, count: 10, speed: 240 }); return; }
    caught++;
    if (f.gold) golds++;
    focus = f;
    game.feedback.good(NX, net.y - 60, { text: f.gold ? 'PERFECT' : 'GOOD', color: f.gold ? C.white : C.hi, count: f.gold ? 18 : 10 });
    game.audio.play('se_coin', 0.35);
    if (!halfShown && caught >= NEEDED / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(caught + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.white, size: 64 });
    }
    if (caught >= NEEDED) finish(true);
  }

  function onEmpty(isDemo) {
    game.fx.burst(NX, WATER, { color: C.l, count: 8, speed: 200 });
    if (isDemo) return;
    misses++;
    focus = null;
    if (misses >= MAX_MISS) { finish(false); return; }
    hitStop = 0.3;
    game.feedback.bad(NX, WATER - 120, { text: 'MISS', color: C.white, flashColor: C.k });
  }

  function dropNet(isDemo) {
    if (net.s !== 'idle') return false;
    net.s = 'drop'; net.t = 0;
    if (!isDemo) game.audio.play('se_tap', 0.35);
    return true;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.white, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(NX, WATER - 160, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.white, flashColor: C.k });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    if (!dropNet(false)) game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.03 });
  });

  // ── demo(魚の弧から真下を通る時刻を読んで落とす。3回に1回は早すぎる)───
  var demo = { t: 0, gx: W / 2, gy: H * 0.82, press: false, n: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { fish = []; spawnT = 0.2; demo.n = 0; net = { s: 'idle', t: 0, y: NET_TOP, got: null }; }
    playT = 2;
    spawnT -= dt;
    if (spawnT <= 0 && fish.length === 0) { spawnFish(true); spawnT = 1.1; }
    stepFish(dt, true);
    stepNet(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.3;
    if (demo.cool <= 0 && net.s === 'idle') {
      for (var i = 0; i < fish.length; i++) {
        var f = fish[i];
        if (f.st !== 'air') continue;
        var uc = (NX - f.x0) / (f.x1 - f.x0);
        var toCross = (uc - f.u) * f.T;
        var yc = WATER - (WATER - f.apex) * 4 * uc * (1 - uc);
        var tn = DROP_T * Math.sqrt(Math.max(0, (yc - 20 - NET_TOP) / (NET_BOTTOM - NET_TOP)));
        var lead = demo.n % 3 === 2 ? 0.45 : 0;
        if (toCross > 0 && toCross - tn - lead < 0.03) {
          dropNet(true); demo.n++; demo.cool = 0.5;
          demo.gx = NX + 90; demo.gy = H * 0.82;
          break;
        }
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.l], [0.3, C.m], [0.6, C.d], [1, C.k]]);
    // 遠景の山と杉
    for (var x = 0; x < W; x += 24) {
      var h1 = 120 + Math.abs(Math.sin(x * 0.011)) * 140;
      game.draw.rect(x, H * 0.3 - h1, 24, h1, C.m);
    }
    for (var s = 0; s < 9; s++) {
      var sx = s * 130 + 20, sy = H * 0.3 + Math.sin(t * 1.2 + s) * 3;
      game.draw.rect(sx + 22, sy - 110, 16, 110, C.d);
      game.draw.rect(sx, sy - 150, 60, 60, C.d);
    }
    // 渓流の水面(流れる縞)
    game.draw.rect(0, WATER, W, H * 0.16, C.d);
    for (var r = 0; r < 6; r++) {
      var off = (t * 180 + r * 170) % (W + 200) - 100;
      game.draw.rect(off, WATER + 18 + r * 42, 110, 8, C.m, 0.6);
      game.draw.rect(W - off, WATER + 40 + r * 38, 70, 6, C.l, 0.4);
    }
    // 石橋(上)
    game.draw.rect(0, H * 0.28, W, 36, C.k);
    for (var b = 0; b < W; b += 90) game.draw.rect(b + 4, H * 0.28 + 4, 82, 28, C.d);
    // 川底の石(親指ゾーン)
    game.draw.rect(0, H * 0.79, W, H * 0.21, C.k);
    for (var st = 0; st < 8; st++) game.draw.circle(st * 150 + 60, H * 0.8 + (st % 2) * 26, 58, C.d);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(t * 1.3));
    // 画面枠
    game.draw.rect(0, 0, 18, H, C.k); game.draw.rect(W - 18, 0, 18, H, C.k);
  }

  function drawFish() {
    var t = game.time.elapsed;
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      var ax = f.x0;
      if (f.st === 'warn') {
        var blink = Math.floor(t * 14) % 2 === 0;
        game.draw.circle(ax, WATER + 10, 40 + (0.6 - f.warn) * 90, C.l, blink ? 0.5 : 0.2);
        game.draw.circle(ax, WATER + 10, 20, f.gold ? C.white : C.m, 0.7);
        continue;
      }
      if (f.st === 'splash') { game.draw.circle(f.x1, WATER + 10, 60 * (1 - f.gone * 2), C.l, 0.5); continue; }
      if (f.st === 'net') continue;
      var goingRight = f.x1 > f.x0;
      // 残像
      game.draw.sprite(FISH[0], { d: C.d, m: C.m, l: C.l, k: C.k }, f.x - (goingRight ? 40 : -40), f.y + 10, 9, { anchor: 'center', flipX: !goingRight, alpha: 0.3 });
      var pal = f.gold ? { d: C.k, m: C.white, l: C.hi, k: C.k } : { d: C.k, m: C.l, l: C.white, k: C.k };
      game.draw.sprite(FISH[Math.floor(t * 8) % 2], pal, f.x, f.y, 11, { anchor: 'center', flipX: !goingRight });
    }
  }

  function drawNet() {
    var t = game.time.elapsed;
    var sway = net.s === 'idle' ? Math.sin(t * 2.2) * 6 : 0;
    // 竿と糸
    game.draw.line(NX + 180, H * 0.24, NX + sway, H * 0.235, C.k, 10);
    game.draw.line(NX + sway, H * 0.235, NX + sway, net.y - 40, C.k, 4);
    var hl = net.got && (phase === 'stop' || net.t < 0.2) ? 1 : 0;
    if (hl && Math.floor(t * 14) % 2 === 0) game.draw.circle(NX, net.y + 10, 120, C.white, 0.45);
    game.draw.sprite(NET, { k: C.k, m: C.m }, NX + sway, net.y + 10, 20, { anchor: 'center' });
    if (net.got) {
      var gpal = net.got.gold ? { d: C.k, m: C.white, l: C.hi, k: C.k } : { d: C.k, m: C.l, l: C.white, k: C.k };
      game.draw.sprite(FISH[Math.floor(t * 12) % 2], gpal, NX + Math.sin(t * 30) * 6, net.y + 4, 10, { anchor: 'center' });
    }
    // 真下の目印(水面の影)
    game.draw.rect(NX - 70, WATER + 4, 140, 10, C.k, 0.4);
    game.draw.sprite(KID[Math.floor(t * 2) % 2], { k: C.k, l: C.l, d: C.d }, NX + 250, H * 0.235 + Math.sin(t * 2.6) * 4, 14, { anchor: 'center' });
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.sprite(BASKET, { k: C.k, d: C.d, m: C.m }, W * 0.2, H * 0.88 + Math.sin(t * 2) * 4, 22, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(FISH[0], { d: C.k, m: i < caught ? C.l : C.d, l: C.white, k: C.k }, W * 0.42 + (i % 3) * 170, H * 0.855 + Math.floor(i / 3) * 90, 8, { anchor: 'center' });
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W * 0.42 + m * 60, H * 0.96, 16, m < misses ? C.k : C.l);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.k, 0.8);
    txt(caught + ' / ' + NEEDED, W / 2, 90, 66, C.white);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.l, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.d);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? C.m : C.hi);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawScene(); drawFish(); drawNet(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.k, 0.8);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.white);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.l);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.white);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.l);
      return;
    }

    if (state === S.RESULT) {
      drawScene(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.white : C.k);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt; playT += dt;
        spawnT -= dt;
        var airborne = 0;
        for (var i = 0; i < fish.length; i++) if (fish[i].st === 'air' || fish[i].st === 'warn') airborne++;
        if (spawnT <= 0 && airborne < (playT > 8 ? 2 : 1)) { spawnFish(false); spawnT = Math.max(0.7, 1.2 - playT * 0.03); }
        stepFish(dt, false);
        stepNet(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      stepNet(dt, true);
      if (outro <= 0) {
        state = S.RESULT;
        var score = caught * 100 + golds * 150 + Math.max(0, MAX_MISS - misses) * 30;
        var stats = { caught: caught, gold: golds, misses: misses };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawScene(); drawFish(); drawNet(); drawBottom(); drawHud();
    if (phase === 'play' && hitStop > 0 && Math.floor(t * 14) % 2 === 0) game.draw.circle(NX, WATER, 110, C.white, 0.4);
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.white);
    if (phase === 'outro') {
      var sc = caught * 100 + golds * 150 + Math.max(0, MAX_MISS - misses) * 30;
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.k, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.white : C.l);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.hi);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.white);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - caught) + '匹!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.l);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1],
      ['D5', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 1], ['R', 1]
    ], { tempo: 144, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1], ['E2', 1], ['B2', 1], ['D3', 1], ['A2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

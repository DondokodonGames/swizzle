// J-N6424-0039-harbor-crane-catch.js
// ハーバー・クレーン・キャッチ — 夜明けの岸壁で、クレーンが吊り下ろす荷を「受け取る」か「飛び退く」か一瞬で見分ける
// 操作: 荷がフックに吊られている間〜落ちてくる間に、左(カゴ)をタップで受け取る/右(矢印)をタップで飛び退く
// 終わり: 正しい判断を8回で成功。判断ミス3回、または15秒の時間切れで失敗
// @mechanic: judge
// @theme: harbor_crane_unload
// 世界観: 夜明け前の港で、荷揚げクレーンが次々と吊り下ろす荷を、カワウソの荷受け係が中身を見て受け止めるか(木箱・メロン)飛び退くか(トゲの海栗・サボテン鉢)判断し、朝一番の市場便を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しくさばいた荷の数(受け取り/回避の内訳)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き、表情のあるスプライト
  var STYLE = { bg: ['#1b2a4a', '#43507e', '#f2a36b'], main: ['#8a5a34', '#f3d9a8', '#2e6f8e'], accent: ['#ffd23f', '#e8413c'] };

  var TITLE = 'HARBOR CATCH';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var LIVES = 3;
  var LANE_X = W / 2;
  var GIRDER_Y = H * 0.12;
  var HOOK_Y = H * 0.25;
  var CATCH_Y = H * 0.58;
  var DOCK_Y = H * 0.69;
  var BTN_Y = H * 0.84;
  var BTN_L = W * 0.27, BTN_R = W * 0.73;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var OT_A = ['...bb..bb...', '..bbbbbbbb..', '..bwkbbkwb..', '..bbbnnbbb..', '...bwwwwb...', '..bbwwwwbb..', '.bb.wwww.bb.', '....wwww....', '....bbbb....', '...bb..bb...', '..dd....dd..'];
  var OT_B = ['...bb..bb...', '..bbbbbbbb..', '..bwkbbkwb..', '..bbbnnbbb..', '...bwwwwb...', '..bbwwwwbb..', '.bb.wwww.bb.', '....wwww....', '....bbbb....', '...bb..bb...', '...dd..dd...'];
  var OT_UP = ['.b.bb..bb.b.', '.bbbbbbbbbb.', '.bbwkbbkwbb.', '..bbbnnbbb..', '...bwwwwb...', '...bwwwwb...', '....wwww....', '....wwww....', '....bbbb....', '...bb..bb...', '..dd....dd..'];
  var OT_HOP = ['............', '...bb..bb...', '..bbbbbbbb..', '..bwkbbkwb..', '..bbbnnbbb..', '.bbbwwwwbbb.', '....wwww....', '....wwww....', '...bbbbbb...', '..bb....bb..', '.dd......dd.'];
  var OT_OUCH = ['...bb..bb...', '..bbbbbbbb..', '..bxbbbbxb..', '..bbbnnbbb..', '...bwoowb...', '..bbwwwwbb..', '.bb.wwww.bb.', '....wwww....', '....bbbb....', '..bbb..bbb..', '.dd......dd.'];
  var OT_PAL = { b: '#8a5a34', w: '#f3d9a8', k: '#1a1020', n: '#3a2418', d: '#5a3a20', x: '#e8413c', o: '#7a1a1a' };

  var CRATE = ['wwwwwwww', 'wdwwwwdw', 'wwdwwdww', 'wwwddwww', 'wwwddwww', 'wwdwwdww', 'wdwwwwdw', 'wwwwwwww'];
  var MELON = ['..gggg..', '.gGgGgg.', 'gGgGgGgg', 'gGgGgGgg', 'gGgGgGgg', 'gGgGgGgg', '.gGgGgg.', '..gggg..'];
  var CACTUS = ['r..g..r.', '.rgggr..', 'rgGgGgr.', '.gGgGg.r', 'rgGgGgr.', '.gGgGg..', 'pppppppp', '.pppppp.', '.pppppp.'];
  var URCHIN = ['r..r..r.', '.rkkkkr.', 'rkkRkkkr', '.kRkkkk.', 'rkkkkRkr', '.kkkkkk.', '.rkkkkr.', 'r..r..r.'];
  var KINDS = {
    crate: { art: CRATE, pal: { w: '#c98b4a', d: '#7a4a22' }, bad: false },
    gold: { art: CRATE, pal: { w: '#ffd23f', d: '#b8860b' }, bad: false },
    melon: { art: MELON, pal: { g: '#3f9e4a', G: '#a8e06a' }, bad: false },
    cactus: { art: CACTUS, pal: { g: '#3f9e4a', G: '#a8e06a', r: '#ff3344', p: '#c0603a' }, bad: true },
    urchin: { art: URCHIN, pal: { r: '#ff3344', k: '#5a2a6a', R: '#ff7799' }, bad: true }
  };
  var TROLLEY = ['ssssssssss', 'sYssssssYs', 'ssssssssss', '.o..oo..o.'];
  var BASKET = ['..hhhhhh..', '.h......h.', 'h........h', 'tttttttttt', 'tTtTtTtTtt', '.tTtTtTtt.', '..tttttt..'];
  var ARROW = ['....a...', '....aa..', 'aaaaaaa.', 'aaaaaaaa', 'aaaaaaa.', '....aa..', '....a...'];
  var BUOY = ['.rwwr.', 'r....r', 'w....w', 'w....w', 'r....r', '.rwwr.'];
  var SHIP = ['.....m......', '....mmm.....', 'hhhhhhhhhhhh', '.hhhhhhhhhh.'];

  var run = null;
  var btnGlow = { l: 0, r: 0 };
  var demo = { t: 0, gx: W / 2, gy: BTN_Y, press: false };

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#0d1426', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newRun(isDemo) {
    return {
      demo: isDemo, count: 0, lives: LIVES, caught: 0, dodged: 0, misses: 0, n: 0,
      item: null, gap: 0.35, pose: 'idle', otterX: LANE_X, otterTX: LANE_X,
      timeLeft: TIME_LIMIT, ready: isDemo ? 0 : 0.8, hitStop: 0, hitItem: null,
      over: false, win: false, endWait: -1, milestone: false, smash: 0, smashX: 0
    };
  }

  function spawn(r) {
    var roll = game.random(0, 1);
    var kind;
    if (r.n === 0) kind = 'crate';
    else if (roll < 0.22) kind = 'urchin';
    else if (roll < 0.42) kind = 'cactus';
    else if (roll < 0.52) kind = 'gold';
    else if (roll < 0.76) kind = 'melon';
    else kind = 'crate';
    var k = r.n;
    r.item = {
      kind: kind, bad: KINDS[kind].bad, phase: 'enter', t: 0, x: W + 200, y: HOOK_Y, choice: null,
      showT: Math.max(0.32, 0.52 - k * 0.022), fallT: Math.max(0.42, 0.66 - k * 0.026)
    };
    r.n++;
    r.pose = 'idle'; r.otterTX = LANE_X;
  }

  function choose(r, c) {
    var it = r.item;
    if (!it || it.choice) {
      game.audio.play('se_tap', 0.15);
      return;
    }
    it.choice = c;
    game.audio.play('se_tap', 0.3);
    if (c === 'catch') { r.pose = 'catch'; r.otterTX = LANE_X; }
    else { r.pose = 'hop'; r.otterTX = LANE_X + 250; game.audio.play('se_jump', 0.25); }
  }

  function resolve(r, it) {
    var ok = (it.bad && it.choice === 'dodge') || (!it.bad && it.choice === 'catch');
    if (ok) {
      if (it.bad) {
        r.dodged++; r.count++;
        r.smash = 0.4; r.smashX = LANE_X;
        game.audio.play('se_break', 0.3);
        if (!r.demo) game.feedback.good(LANE_X + 250, CATCH_Y - 120, { text: 'NICE', color: STYLE.accent[0] });
      } else {
        var gain = it.kind === 'gold' ? 2 : 1;
        r.caught++; r.count += gain;
        game.audio.play('se_coin', 0.35);
        if (!r.demo) game.feedback.good(LANE_X, CATCH_Y - 120, { text: gain > 1 ? 'x2' : 'GOOD', color: gain > 1 ? STYLE.accent[0] : '#7cf29a' });
      }
      if (!r.demo && !r.milestone && r.count >= 5) {
        r.milestone = true;
        game.fx.popup(r.count + ' / ' + NEEDED, W / 2, H * 0.36, { color: STYLE.accent[0], size: 64 });
        game.audio.play('se_milestone', 0.4);
      }
      if (!r.demo && r.count >= NEEDED) {
        r.win = true; r.over = true; r.hitStop = 0.45; r.hitItem = it;
        game.fx.burst(LANE_X, CATCH_Y, { color: STYLE.accent[0], count: 30, speed: 520 });
      }
    } else {
      r.misses++;
      if (!it.bad) { r.smash = 0.4; r.smashX = r.otterX < LANE_X + 100 ? LANE_X - 160 : LANE_X; game.audio.play('se_break', 0.3); }
      r.pose = 'ouch';
      r.hitItem = it; r.hitStop = 0.35;
      if (!r.demo) {
        r.lives--;
        game.feedback.bad(LANE_X, CATCH_Y - 60, { text: 'MISS' });
        if (r.lives <= 0) { r.over = true; r.win = false; r.hitStop = 0.55; }
      } else {
        game.audio.play('se_bad', 0.2);
      }
    }
    r.item = null; r.gap = 0.12;
  }

  function step(r, dt) {
    btnGlow.l = Math.max(0, btnGlow.l - dt * 3);
    btnGlow.r = Math.max(0, btnGlow.r - dt * 3);
    r.otterX += (r.otterTX - r.otterX) * Math.min(1, dt * 14);
    if (r.smash > 0) r.smash -= dt;
    if (r.hitStop > 0) {
      r.hitStop -= dt;
      if (r.hitStop <= 0) { r.hitItem = null; if (r.over) r.endWait = 0.7; }
      return;
    }
    if (r.over) return;
    if (!r.item) {
      r.gap -= dt;
      if (r.gap <= 0) spawn(r);
      return;
    }
    var it = r.item;
    it.t += dt;
    if (it.phase === 'enter') {
      var p = Math.min(1, it.t / 0.18);
      it.x = LANE_X + (1 - p) * (1 - p) * 700;
      if (p >= 1) {
        it.phase = 'show'; it.t = 0;
        if (it.bad) game.audio.tone('A2', 0.12, { wave: 'sawtooth', volume: 0.06 });
        else game.audio.tone('E5', 0.06, { wave: 'triangle', volume: 0.05 });
      }
    } else if (it.phase === 'show') {
      it.x = LANE_X + Math.sin(it.t * 16) * 8;
      if (it.t >= it.showT) { it.phase = 'fall'; it.t = 0; game.audio.tone('C3', 0.06, { wave: 'square', volume: 0.05 }); }
    } else if (it.phase === 'fall') {
      var q = Math.min(1, it.t / it.fallT);
      it.x = LANE_X;
      it.y = HOOK_Y + (CATCH_Y - HOOK_Y) * q * q;
      if (q >= 1) resolve(r, it);
    }
    if (r.demo && r.item && !r.item.choice && r.item.phase !== 'enter' && (r.item.phase === 'fall' || r.item.t > 0.2)) {
      var right = r.item.bad ? 'dodge' : 'catch';
      var wrong = right === 'catch' ? 'dodge' : 'catch';
      var pick = r.n % 4 === 3 ? wrong : right;
      demo.gx = pick === 'catch' ? BTN_L : BTN_R; demo.gy = BTN_Y;
      demo.press = true; demo.pressT = 0.25;
      if (pick === 'catch') btnGlow.l = 1; else btnGlow.r = 1;
      choose(r, pick);
    }
  }

  function drawScene(r) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.5, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    game.draw.circle(W * 0.78, H * 0.44, 90 + Math.sin(t * 0.8) * 4, '#ffcf7a', 0.85);
    for (var s = 0; s < 3; s++) {
      var sx = ((t * (14 + s * 9) + s * 380) % (W + 400)) - 200;
      game.draw.sprite(SHIP, { m: '#2a3350', h: '#33406a' }, sx, H * 0.44 + s * 16, 10 - s * 2, { anchor: 'center' });
    }
    game.draw.gradient(H * 0.47, DOCK_Y, [[0, '#2e6f8e'], [1, '#17405a']]);
    for (var w = 0; w < 8; w++) {
      var wy = H * 0.49 + w * 34;
      var wx = (Math.sin(t * 1.4 + w) * 60 + w * 130) % W;
      game.draw.rect(wx, wy, 140, 5, '#9fd8e8', 0.35);
    }
    game.draw.rect(0, DOCK_Y, W, H - DOCK_Y, '#6b4a2e');
    for (var pl = 0; pl < 12; pl++) game.draw.rect(0, DOCK_Y + pl * 48, W, 4, '#4a3020');
    // crane
    game.draw.rect(70, GIRDER_Y, 36, DOCK_Y - GIRDER_Y, '#d8a020');
    game.draw.rect(W - 106, GIRDER_Y, 36, DOCK_Y - GIRDER_Y, '#d8a020');
    game.draw.rect(40, GIRDER_Y - 30, W - 80, 44, '#e8b030');
    for (var g = 0; g < 18; g++) game.draw.line(60 + g * 56, GIRDER_Y - 28, 88 + g * 56, GIRDER_Y + 12, '#9a6a10', 4);
    // shadow telegraph under the item
    var it = r.item;
    if (it && it.phase !== 'enter') {
      var prog = it.phase === 'fall' ? Math.min(1, it.t / it.fallT) : 0.1;
      game.draw.circle(LANE_X, DOCK_Y - 6, 30 + prog * 50, '#000000', 0.25 + prog * 0.25);
      if (it.bad && Math.floor(t * 10) % 2 === 0) game.draw.circle(LANE_X, DOCK_Y - 6, 30 + prog * 50, STYLE.accent[1], 0.25);
    }
    var tx = it ? it.x : LANE_X + Math.sin(t * 0.9) * 40;
    game.draw.sprite(TROLLEY, { s: '#556070', Y: STYLE.accent[0], o: '#222222' }, tx, GIRDER_Y + 40, 12, { anchor: 'center' });
    if (it) {
      var cableEnd = it.phase === 'fall' ? HOOK_Y - 40 : it.y - 50;
      game.draw.line(tx, GIRDER_Y + 60, tx, cableEnd, '#222a33', 5);
      game.draw.rect(tx - 16, cableEnd - 6, 32, 12, '#3a4450');
      var hi = r.hitItem === it;
      drawItem(it, hi);
      if (it.bad && it.phase === 'show' && Math.floor(t * 8) % 2 === 0) {
        game.draw.circle(it.x + 90, it.y - 70, 26, STYLE.accent[1]);
        game.draw.rect(it.x + 86, it.y - 88, 8, 22, '#ffffff');
        game.draw.rect(it.x + 86, it.y - 60, 8, 8, '#ffffff');
      }
    } else if (r.hitItem) {
      drawItem(r.hitItem, true);
    }
    if (r.smash > 0) {
      for (var sp = 0; sp < 6; sp++) {
        var a = sp * 1.05;
        game.draw.rect(r.smashX + Math.cos(a) * (1 - r.smash) * 160, DOCK_Y - 20 - Math.sin(a) * (1 - r.smash) * 90, 18, 12, '#c98b4a', r.smash * 2);
      }
    }
    // otter
    var bob = Math.sin(t * 5) * 6;
    var art = OT_A;
    if (r.pose === 'catch') art = OT_UP;
    else if (r.pose === 'hop') art = OT_HOP;
    else if (r.pose === 'ouch') art = OT_OUCH;
    else if (Math.floor(t * 3) % 2 === 0) art = OT_B;
    game.draw.circle(r.otterX, DOCK_Y + 4, 70, '#000000', 0.25);
    game.draw.sprite(art, OT_PAL, r.otterX + Math.sin(t * 2.2) * 4, DOCK_Y - 90 + bob, 16, { anchor: 'center' });
  }

  function drawItem(it, hi) {
    var k = KINDS[it.kind];
    var px = hi ? 17 : 13;
    if (hi) game.draw.circle(it.x, it.y, 90, '#ffffff', 0.55);
    if (it.kind === 'gold') game.draw.circle(it.x, it.y, 70 + Math.sin(game.time.elapsed * 12) * 8, STYLE.accent[0], 0.3);
    game.draw.sprite(k.art, k.pal, it.x, it.y, px, { anchor: 'center' });
  }

  function drawButtons() {
    var t = game.time.elapsed;
    var pulse = 1 + Math.sin(t * 5) * 0.04;
    game.draw.circle(BTN_L, BTN_Y, 120 * pulse, '#ffffff', 0.25 + btnGlow.l * 0.5);
    game.draw.circle(BTN_L, BTN_Y, 104, '#3f9e4a');
    game.draw.sprite(BASKET, { h: '#f3d9a8', t: '#c98b4a', T: '#7a4a22' }, BTN_L, BTN_Y, 14, { anchor: 'center' });
    game.draw.circle(BTN_R, BTN_Y, 120 * pulse, '#ffffff', 0.25 + btnGlow.r * 0.5);
    game.draw.circle(BTN_R, BTN_Y, 104, '#2e6f8e');
    game.draw.sprite(ARROW, { a: '#ffffff' }, BTN_R, BTN_Y, 16, { anchor: 'center' });
  }

  function drawHud(r) {
    txt(r.count + ' / ' + NEEDED, W / 2, 96, 64, '#ffffff');
    for (var i = 0; i < NEEDED; i++) {
      var filled = i < r.count;
      game.draw.sprite(CRATE, filled ? KINDS.crate.pal : { w: '#3a4462', d: '#26304a' }, 150 + i * 98, 160, 6, { anchor: 'center' });
    }
    for (var l = 0; l < LIVES; l++) {
      game.draw.sprite(BUOY, l < r.lives ? { r: STYLE.accent[1], w: '#ffffff' } : { r: '#444a5a', w: '#666c7a' }, W - 70 - l * 64, 70, 8, { anchor: 'center' });
    }
    var frac = Math.max(0, r.timeLeft / TIME_LIMIT);
    var low = r.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 205, W - 120, 16, '#26304a');
    game.draw.rect(60, 205, (W - 120) * frac, 16, low ? STYLE.accent[1] : STYLE.accent[0]);
  }

  function initGame() {
    run = newRun(false);
  }

  function beginDemo() {
    run = newRun(true);
  }

  function finishRound() {
    state = S.RESULT;
    game.audio.stopBgm();
    var score = run.count * 100 + run.lives * 60 + Math.round(run.timeLeft * 10);
    run.score = score;
    var stats = { handled: run.count, caught: run.caught, dodged: run.dodged, misses: run.misses };
    if (run.win) { game.audio.play('se_success', 0.5); game.end.success(score, stats); }
    else { game.audio.play('se_failure', 0.5); game.end.failure(stats); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 1]], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 2], ['F2', 1], ['G2', 1]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (run.ready > 0 || run.over || run.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    if (x < W / 2) { btnGlow.l = 1; choose(run, 'catch'); }
    else { btnGlow.r = 1; choose(run, 'dodge'); }
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!run || !run.demo) beginDemo();
      demo.t += dt;
      var cyc = demo.t % 6;
      if (cyc < dt || demo.t <= dt) { run = newRun(true); }
      if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = false; }
      step(run, dt);
      drawScene(run);
      drawButtons();
      game.draw.rect(0, 0, W, H, '#ffe0b0', 0.03 + 0.03 * Math.sin(t * 1.7));
      game.draw.hand(demo.gx, demo.gy + 40, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2 + Math.sin(t * 1.5) * 6, H * 0.07, 72, STYLE.accent[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12 + 10, 34, '#ffffff');
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.95, 34, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      step(run, dt);
      drawScene(run);
      game.draw.rect(0, 0, W, H, '#000000', 0.35);
      if (run.win) {
        if (Math.floor(t * 4) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: STYLE.accent[0], count: 4, speed: 300 });
        txt('CLEAR', W / 2, H * 0.3, 110, STYLE.accent[0]);
      } else {
        txt(run.lives <= 0 ? 'GAME OVER' : 'TIME UP', W / 2, H * 0.3, 96, STYLE.accent[1]);
        if (run.count < NEEDED) txt('あと' + (NEEDED - run.count) + '個!', W / 2, H * 0.37, 56, '#ffffff');
      }
      txt(run.count + ' / ' + NEEDED, W / 2, H * 0.44, 64, '#ffffff');
      txt('SCORE ' + (run.score || 0), W / 2, H * 0.49, 44, '#ffffff');
      var best = game.best || 0;
      if (run.win && run.score >= best) txt('NEW RECORD', W / 2, H * 0.54, 48, STYLE.accent[0]);
      else txt('BEST ' + best, W / 2, H * 0.54, 40, '#cfd8ff');
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, '#ffffff');
      return;
    }

    // PLAYING
    if (run.ready > 0) {
      run.ready -= dt;
      if (run.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!run.over) {
      run.timeLeft -= dt;
      if (run.timeLeft <= 0) {
        run.timeLeft = 0; run.over = true; run.win = false; run.hitStop = 0.45;
        run.hitItem = run.item;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
      } else {
        step(run, dt);
      }
    } else {
      step(run, dt);
    }
    if (run.over && run.endWait > 0) {
      run.endWait -= dt;
      if (run.endWait <= 0) { finishRound(); return; }
    }
    drawScene(run);
    drawButtons();
    drawHud(run);
    if (run.ready > 0) {
      txt(run.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, STYLE.accent[0]);
      game.draw.hand(BTN_L, BTN_Y + 40, { press: run.ready < 0.5, scale: 12 });
    }
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.5], ['E4', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 1], ['G4', 1]], { tempo: 110, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    beginDemo();
    demo.t = 0;
  });
})(game);

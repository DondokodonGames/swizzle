// J-Switch-0055-sunken-shop-grebe.js
// 沈んだ村の潜り鳥 — 押している間だけ潜り、頼まれた品の棚で止まるように離す。潜るほど速く、離しても少し沈み続ける
// 操作: 押し続けるとカイツブリが潜る(だんだん速くなる)。離すと惰性で少し沈んでから止まり、そこの棚の品をくわえて浮かぶ(社内メモ。画面には出さない)
// 終わり: 頼まれた品を3つ舟へ届ければCLEAR。取り違え3回/時間切れでGAME OVER
// @mechanic: hold_duration
// @theme: sunken_village_shop_dive
// 世界観: 洪水で沈んだ川辺の村で、潜りの得意な見習いのカイツブリが、水面の小舟で待つ雑貨屋の主人に頼まれた品を、水底に沈んだ店の棚から一つずつ拾って届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 届けた数・取り違え数・止まった位置のぴったり度
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り。半透明円の重ねでブルーム、四隅のビネット
  var STYLE = { bg: ['#2a2c22', '#1a1c16', '#0c0d0a'], main: ['#8c8468', '#5c5a48', '#b8a888'], accent: ['#ffcf6a', '#e0503a'] };
  var C = {
    sky1: '#6a6a58', sky2: '#9a9478', water1: '#3a4436', water2: '#1c2019', deep: '#0b0c09', wall: '#4a4436', wallD: '#2e2a22',
    shelf: '#6a5a40', shelfL: '#9a8460', glow: '#ffcf6a', bad: '#e0503a', good: '#b8e07a', white: '#efe8d8', ink: '#0a0a08', grey: '#8a8674'
  };

  var GAME_TITLE = 'SUNKEN SHOP';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var MAX_MISS = 3;
  var SURF_Y = H * 0.27;
  var LANE_X = W * 0.46;
  var SHELVES = [H * 0.39, H * 0.49, H * 0.59, H * 0.69];
  var FLOOR_Y = H * 0.75;
  var TOL = 46;
  var ACC = 560, V0 = 240, VMAX = 900, DEC = 2600;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, got, miss, dive, stock, want, slide, idleT, hitStop, outro, ok, bestErr, errSum, milestone, focus, rival;

  // ── sprites ───────────────────────────────────────────────────────
  var GREBE = [
    ['..bbb...', '.bbrbb..', 'ybbwwb..', '..bbbbb.', '...bbbbb', '....bbb.'],
    ['..bbb...', '.bbrbb..', 'ybbwwb..', '..bbbbbb', '...bbbb.', '....b.b.']
  ];
  var DIVE = [
    ['...y....', '..bbb...', '.bbrb...', '.bwwb...', '.bbbb...', '..bbb...', '..b.b...'],
    ['...y....', '..bbb...', '.brbb...', '.bwwb...', '.bbbb...', '..bbb...', '.b...b..']
  ];
  var ITEMS = [
    ['.kkk..', 'k...k.', 'kkkkkk', 'kkkkkk', 'kkkkk.', '.kkk..'],   // やかん
    ['..kk..', '.k..k.', '.k..k.', '..kk..', '..k...', '..kk..'],   // 鍵
    ['..k...', '.kkk..', 'kkkkk.', 'kkkkk.', 'kkkkkk', '..k...'],   // 鈴
    ['.kkkk.', 'k.kk.k', 'kkkkkk', '.kkkk.', '.k..k.', '.kkkk.']    // 手提げ灯
  ];
  var ITEM_COL = ['#c89a5a', '#e0c060', '#d8d0b0', '#a0b8a0'];
  var BOAT = ['..........k.', '.........kk.', 'wwwwwwwwwwww', '.wwwwwwwwww.', '..wwwwwwww..'];
  var DUCK = ['.ww.', 'wwwo', '.ww.', 'wwww'];
  var MUD = ['.m.m..', 'mmmmm.', '.mmmmm'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newOrder() {
    // 店の別の通路へ移る(棚の並びが入れ替わる)
    var ids = [0, 1, 2, 3];
    for (var i = 3; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp; }
    stock = ids;
    var prevShelf = want ? want.shelf : -1;
    var shelf;
    do { shelf = Math.floor(game.random(0, 4)); } while (shelf === prevShelf || shelf > 3);
    // 序盤は浅い棚、後半ほど深い棚
    var k = got + miss;
    if (k === 0) shelf = Math.min(shelf, 1);
    want = { shelf: shelf, item: stock[shelf] };
    slide = 0.35; idleT = 0;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; got = 0; miss = 0; want = null;
    dive = { y: SURF_Y, v: 0, mode: 'idle', carry: -1, t: 0 };
    hitStop = 0; outro = 0; ok = false; bestErr = 999; errSum = 0; milestone = false; focus = null; rival = 0;
    newOrder();
  }

  // 潜りの物理(実プレイ・デモ共用)
  function stepDive(dt, holding, isDemo) {
    var d = dive;
    if (slide > 0) slide -= dt;
    if (d.mode === 'idle') {
      idleT += dt;
      if (holding && slide <= 0) { d.mode = 'down'; d.v = V0; if (!isDemo) game.audio.play('se_jump', 0.3); }
      else if (!isDemo && idleT > 3.2) { rivalTakes(); }
    } else if (d.mode === 'down') {
      d.v = Math.min(VMAX, d.v + ACC * dt);
      d.y += d.v * dt;
      if (!holding) d.mode = 'glide';
      if (d.y >= FLOOR_Y) { d.y = FLOOR_Y; grab(isDemo); }
    } else if (d.mode === 'glide') {
      d.v -= DEC * dt;
      if (d.v <= 0) { d.v = 0; grab(isDemo); }
      else { d.y += d.v * dt; if (d.y >= FLOOR_Y) { d.y = FLOOR_Y; grab(isDemo); } }
    } else if (d.mode === 'up') {
      d.y -= 900 * dt;
      if (d.y <= SURF_Y) {
        d.y = SURF_Y; d.mode = 'idle';
        deliver(isDemo);
      }
    }
  }

  function shelfAt(y) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < SHELVES.length; i++) { var e = Math.abs(y - SHELVES[i]); if (e < bd) { bd = e; best = i; } }
    return { i: best, err: bd };
  }

  function grab(isDemo) {
    var d = dive;
    var s = shelfAt(d.y);
    d.mode = 'up'; d.t = 0;
    if (d.y >= FLOOR_Y - 1) { d.carry = -2; }
    else if (s.err <= TOL) { d.carry = stock[s.i]; d.err = s.err; }
    else { d.carry = -1; }
    if (isDemo) { game.fx.burst(LANE_X, d.y, { color: d.carry === want.item ? C.glow : C.grey, count: 8, speed: 160 }); return; }
    game.audio.play('se_tap', 0.3);
    if (d.carry === want.item) {
      game.fx.burst(LANE_X, d.y, { color: C.glow, count: 10, speed: 200 });
    } else {
      focus = { y: d.y, t: 0.5 };
      hitStop = 0.35;
      game.feedback.bad(LANE_X + 120, d.y, { text: 'MISS', color: C.bad });
    }
  }

  function deliver(isDemo) {
    var d = dive;
    var right = d.carry === want.item;
    if (isDemo) { d.carry = -1; newOrder(); return; }
    if (right) {
      got++;
      var perf = d.err <= 14;
      errSum += d.err; bestErr = Math.min(bestErr, d.err);
      game.feedback.good(W * 0.62, SURF_Y - 120, { text: perf ? 'PERFECT' : 'GOOD', color: C.glow, count: perf ? 16 : 10 });
      game.audio.play('se_coin', 0.4);
      if (!milestone && got === NEEDED - 1) {
        milestone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(got + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.glow, size: 64 });
      }
    } else {
      miss++;
      game.audio.play('se_bad', 0.3);
    }
    d.carry = -1;
    if (got >= NEEDED) { finish(true); return; }
    if (miss >= MAX_MISS) { finish(false); return; }
    newOrder();
  }

  function rivalTakes() {
    // 待ちすぎ: 隣の潜り手の影が先に潜って品を持っていく
    rival = 1.0;
    miss++;
    game.feedback.bad(W * 0.8, SURF_Y + 60, { text: 'MISS', color: C.bad });
    if (miss >= MAX_MISS) { finish(false); return; }
    newOrder();
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.glow, 0.25);
      game.fx.burst(W * 0.62, SURF_Y - 60, { color: C.glow, count: 30, speed: 420 });
      game.audio.play('se_success', 0.6);
    } else {
      focus = { y: dive.y, t: 0.6 };
      game.feedback.bad(LANE_X, dive.y - 100, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  var holding = false;
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); holding = false; return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; holding = false; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    holding = true;
    if (phase === 'play' && dive.mode === 'idle' && slide <= 0) game.fx.burst(LANE_X, SURF_Y, { color: C.white, count: 6, speed: 140 });
    else game.audio.tone('E3', 0.04, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    holding = false;
    if (phase === 'play' && dive.mode === 'down') game.audio.tone('A4', 0.06, { wave: 'sine', volume: 0.05 });
    else if (phase === 'play') game.fx.burst(x, y, { color: C.grey, count: 3, speed: 80 });
  });

  // ── demo(少し手前で離してぴったり止める。2本目は押しすぎて通り過ぎる)──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.88, hold: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { got = 0; miss = 0; want = null; dive = { y: SURF_Y, v: 0, mode: 'idle', carry: -1, t: 0 }; newOrder(); demo.n = 0; }
    var d = dive;
    if (d.mode === 'idle' && slide <= 0 && idleT > 0.5) { demo.hold = true; demo.n++; }
    if (d.mode === 'down') {
      var target = SHELVES[want.shelf];
      if (demo.n % 2 === 0) target += 150;
      var stopDist = d.v * d.v / (2 * DEC);
      if (d.y + stopDist >= target) demo.hold = false;
    }
    stepDive(dt, demo.hold, true);
    if (d.mode !== 'down' && d.mode !== 'idle') demo.hold = false;
    demo.gx = W * 0.5 + Math.sin(demo.t * 1.1) * 20;
    demo.gy = H * 0.88;
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.26, C.sky2], [0.27, C.water1], [0.6, C.water2], [1, C.deep]]);
    // 遠景: 水面から突き出た沈んだ家の屋根
    for (var r = 0; r < 4; r++) {
      var rx = 60 + r * 280, ry = SURF_Y - 40 - (r % 2) * 30;
      game.draw.rect(rx, ry, 150, 40 + (r % 2) * 30, C.wallD, 0.8);
      game.draw.rect(rx - 12, ry - 10, 174, 14, C.wall, 0.8);
    }
    // 水面のゆらぎ
    for (var i = 0; i < 12; i++) game.draw.rect(((i * 97 + t * 40) % (W + 200)) - 100, SURF_Y + Math.sin(t * 2 + i) * 4, 120, 4, C.white, 0.25);
    // 沈んだ店の壁と棚
    var off = slide > 0 ? slide / 0.35 * W * 0.6 : 0;
    game.draw.rect(W * 0.2 - off, H * 0.33, W * 0.56, FLOOR_Y - H * 0.33 + 20, C.wallD, 0.9);
    for (var s = 0; s < SHELVES.length; s++) {
      var sy = SHELVES[s];
      game.draw.rect(W * 0.22 - off, sy + 34, W * 0.52, 14, C.shelf);
      game.draw.rect(W * 0.22 - off, sy + 34, W * 0.52, 4, C.shelfL);
      var it = stock[s];
      var isWant = want && it === want.item;
      game.draw.sprite(ITEMS[it], { k: ITEM_COL[it] }, LANE_X + 130 - off, sy + 4, 9, { anchor: 'center', alpha: 0.9 });
      // 通路の他の品(飾り)
      game.draw.sprite(ITEMS[(it + 1) % 4], { k: C.grey }, W * 0.28 - off, sy + 8, 6, { anchor: 'center', alpha: 0.5 });
      game.draw.sprite(ITEMS[(it + 2) % 4], { k: C.grey }, W * 0.68 - off, sy + 8, 6, { anchor: 'center', alpha: 0.5 });
      // 棚の高さの目印(潜る列の左の刻み)
      game.draw.rect(LANE_X - 70 - off, sy - 2, 30, 4, isWant && Math.floor(t * 3) % 2 === 0 ? C.glow : C.grey, 0.7);
    }
    // 水底の泥
    game.draw.rect(0, FLOOR_Y + 30, W, H * 0.06, '#1e1a12');
    for (var m = 0; m < 6; m++) game.draw.sprite(MUD, { m: '#3a3222' }, 90 + m * 180, FLOOR_Y + 40, 10, { anchor: 'center' });
    // 深いほど暗い(ブルームとビネット)
    game.draw.rect(0, H * 0.55, W, H * 0.25, C.ink, 0.25);
    game.draw.circle(LANE_X, dive ? dive.y : SURF_Y, 150, C.glow, 0.08);
    game.draw.circle(LANE_X, dive ? dive.y : SURF_Y, 90, C.glow, 0.08);
    game.draw.rect(0, 0, 50, H, C.ink, 0.35);
    game.draw.rect(W - 50, 0, 50, H, C.ink, 0.35);
    game.draw.rect(0, 0, W, H, C.glow, 0.015 + 0.015 * Math.sin(t * 1.2));
  }

  function drawActors() {
    var t = game.time.elapsed;
    // 舟と雑貨屋の主人(注文の吹き出し)
    var bx = W * 0.66, by = SURF_Y - 20 + Math.sin(t * 1.6) * 6;
    game.draw.sprite(BOAT, { w: '#7a6446', k: '#4a3a2a' }, bx, by, 16, { anchor: 'center' });
    game.draw.sprite(DUCK, { w: C.white, o: '#e0a040' }, bx - 40, by - 70 + Math.sin(t * 2.4) * 4, 14, { anchor: 'center' });
    if (want) {
      var pop = slide > 0 ? 1 - slide / 0.35 : 1;
      game.draw.circle(bx + 100, by - 190, 70 * pop, C.white, 0.9);
      game.draw.circle(bx + 50, by - 120, 14 * pop, C.white, 0.9);
      game.draw.sprite(ITEMS[want.item], { k: ITEM_COL[want.item] }, bx + 100, by - 190, 10 * pop, { anchor: 'center' });
    }
    // 待ちすぎの合図: 隣の潜り手の影
    if (idleT > 2.2 && dive.mode === 'idle' && state === S.PLAYING && Math.floor(t * 8) % 2 === 0) game.draw.circle(W * 0.86, SURF_Y + 20, 40, C.bad, 0.4);
    if (rival > 0) game.draw.sprite(DIVE[0], { b: C.ink, r: C.ink, w: C.ink, y: C.ink }, W * 0.86, SURF_Y + 60 + (1 - rival) * 300, 14, { anchor: 'center', alpha: 0.5 * rival });
    // カイツブリ
    var d = dive;
    var sp = d.mode === 'idle' ? GREBE[Math.floor(t * 2) % 2] : DIVE[Math.floor(t * 8) % 2];
    var gy = d.mode === 'idle' ? SURF_Y - 30 + Math.sin(t * 2.2) * 5 : d.y;
    var hl = focus && focus.t > 0 && Math.floor(t * 14) % 2 === 0;
    if (hl) game.draw.circle(LANE_X, focus.y, 110, C.bad, 0.4);
    game.draw.sprite(sp, { b: '#6a4a30', r: '#e0503a', w: C.white, y: '#e0c060' }, LANE_X + Math.sin(t * 3) * 3, gy, 13, { anchor: 'center', flipY: d.mode === 'down' || d.mode === 'glide' });
    if (d.carry >= 0 && d.mode === 'up') game.draw.sprite(ITEMS[d.carry], { k: ITEM_COL[d.carry] }, LANE_X + 50, gy + 20, 7, { anchor: 'center' });
    if (d.carry === -2 && d.mode === 'up') game.draw.sprite(MUD, { m: '#5a4a32' }, LANE_X + 50, gy + 20, 8, { anchor: 'center' });
    // 泡
    if (d.mode === 'down' || d.mode === 'glide') for (var b = 0; b < 4; b++) game.draw.circle(LANE_X - 20 + b * 12, d.y - 60 - ((t * 300 + b * 40) % 120), 6, C.white, 0.4);
  }

  function drawPad() {
    var t = game.time.elapsed;
    // 親指ゾーン: 押すと潜る大きな貝殻ボタン
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.ink, 0.5);
    var pressed = (state === S.PLAYING && holding) || (state === S.ATTRACT && demo.hold);
    game.draw.circle(W * 0.5, H * 0.89, 150, C.wallD);
    game.draw.circle(W * 0.5, H * 0.89 + (pressed ? 8 : 0), 130, pressed ? C.glow : C.shelf, pressed ? 0.8 : 0.9);
    game.draw.sprite(DIVE[0], { b: C.ink, r: C.ink, w: C.ink, y: C.ink }, W * 0.5, H * 0.89 + (pressed ? 8 : 0) + Math.sin(t * 2) * 4, 12, { anchor: 'center', alpha: 0.7 });
    // 深さの目盛り(右端)
    game.draw.rect(W - 110, SURF_Y, 16, FLOOR_Y - SURF_Y, C.wallD);
    if (dive) game.draw.rect(W - 124, dive.y - 6, 44, 12, dive.mode === 'glide' ? C.glow : C.white);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.7);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 96, 56, C.white, 'left');
    txt(got + ' / ' + NEEDED, W / 2, 96, 66, C.glow);
    for (var i = 0; i < MAX_MISS; i++) game.draw.circle(W - 200 + i * 60, 90, 18, i < miss ? C.bad : C.grey);
    game.draw.rect(60, 170, W - 120, 18, C.wallD);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.bad : C.glow);
  }

  function score() { return got * 300 + Math.max(0, 150 - Math.round(errSum)) + Math.round(Math.max(0, timeLeft) * 20) - miss * 50; }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (rival > 0) rival -= dt;
    if (focus && focus.t > 0) focus.t -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawActors(); drawPad();
      game.draw.hand(demo.gx, demo.gy, { press: demo.hold, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.7);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.3) * 8, 100 + Math.sin(t * 2) * 6, 80, C.glow);
      txt('HI-SCORE ' + game.best, W / 2, 190, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.glow);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawActors();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.glow : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.36, 48, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.grey);
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
        stepDive(dt, holding, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { delivered: got, wrong: miss, bestGap: bestErr < 999 ? Math.round(bestErr) : 0 };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawActors(); drawPad(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.glow);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.glow : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.35, 44, C.white);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.395, 42, C.glow);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - got) + '個!', W / 2, H * 0.395, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.395, 36, C.grey);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 1], ['C4', 0.5], ['E4', 0.5], ['D4', 1], ['C4', 1],
      ['B3', 1], ['D4', 0.5], ['F4', 0.5], ['E4', 2]
    ], { tempo: 84, wave: 'sine', volume: 0.05, loop: true, bass: [['A1', 2], ['F1', 2], ['G1', 2], ['E1', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-DS-0004v2-library-cart-book-stack.js
// 図書室の返却本つみ — 返却カウンターの本を指でつまんで台車へ運び、重さと幅を見て崩れないように積み上げる
// 操作: カウンターで光る本を指で押さえてつまみ、台車の山の上まで運んで離す。運ぶ勢いが残ったまま離すと本が横に滑る。山の重心が下の本からはみ出すと崩れる
// 終わり: 22秒以内に8冊積めばCLEAR。山が崩れる/時間切れでGAME OVER(台車の外で離した本はカウンターに戻るだけ)
// @mechanic: stack
// @theme: school_library_return_cart_stack
// 世界観: 放課後の小学校の図書室で、腕章をつけた図書委員が返却カウンターに戻ってきた辞書・絵本・文庫を一冊ずつつまみ上げ、書架へ運ぶ台車の上に崩さず積み上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ冊数・PERFECT数・スコア
// スタイル: VOXEL BLOCK

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/前面/側面の3明度で描き、等角に積む。影は落とさない
  var STYLE = { bg: ['#dfe8f2', '#b4c6da'], main: ['#e25a4e', '#3f8ad2', '#f2c14e'], accent: ['#4cad78', '#2b2f3a'] };
  var INK = STYLE.accent[1];
  var TONES = [
    { top: '#f28d84', front: STYLE.main[0], side: '#a8382f' },
    { top: '#7fb4e6', front: STYLE.main[1], side: '#285f96' },
    { top: '#f8da8c', front: STYLE.main[2], side: '#b98a26' },
    { top: '#86d3a6', front: STYLE.accent[0], side: '#2f7a51' },
  ];
  var WOOD = { top: '#d9a86a', front: '#b07a3e', side: '#7c5226' };
  var DEPTH = 22;

  var TITLE = 'BOOK CART';
  var TIME_LIMIT = 22;
  var NEEDED = 8;
  var CART_X = W * 0.42, CART_W = 360, CART_Y = H * 0.83;
  var DESK_Y = H * 0.30, DESK_X = W * 0.64;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KID = [
    ['..hhhhhh..', '.hhhhhhhh.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '..wwwwww..', '.wwaawwww.', 'fwwaawwwwf', '.wwwwwwww.', '..nn..nn..', '..kk..kk..'],
    ['..hhhhhh..', '.hhhhhhhh.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '..wwwwww..', 'fwwaawwwwf', '.wwaawwww.', '.wwwwwwww.', '..nn..nn..', '..kk..kk..'],
    ['f.hhhhhh.f', 'fhhhhhhhhf', '.hffffffh.', '.fekffekf.', '.ffmmmmff.', '..ffffff..', '..wwwwww..', '.wwaawwww.', '.wwaawwww.', '.wwwwwwww.', '.nn....nn.', '.kk....kk.'],
    ['..........', '..hhhhhh..', '.hhhhhhhh.', '.hffffffh.', '.fkkffkkf.', '..ffmmff..', '..wwwwww..', 'fwwaawwwwf', '.wwaawwww.', '.wwwwwwww.', '..nn..nn..', '..kk..kk..'],
  ];

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 立方体ブロック(前面 + 上面 + 右側面のストリップ塗り) ──
  function voxel(cx, by, w, h, tone, alpha) {
    var x = cx - w / 2, y = by - h;
    var a = alpha === undefined ? 1 : alpha;
    for (var i = 0; i < DEPTH; i += 2) {
      game.draw.rect(x + i, y - i - 2, w, 2, tone.top, a);
      game.draw.rect(x + w + i, y - i, 2, h, tone.side, a);
    }
    game.draw.rect(x, y, w, h, tone.front, a);
  }

  var KINDS = [
    { k: 'dict', w: 250, h: 70, mass: 3.0 },
    { k: 'pic', w: 300, h: 34, mass: 1.2 },
    { k: 'novel', w: 190, h: 50, mass: 1.5 },
    { k: 'pamph', w: 150, h: 28, mass: 0.6 },
  ];
  function makeBook(i, fixedKind) {
    var pool = i < 2 ? [0, 1, 0] : i < 5 ? [0, 1, 2, 2] : [2, 3, 2, 1, 3];
    var kd = KINDS[fixedKind !== undefined ? fixedKind : pool[Math.floor(game.random(0, pool.length))]];
    return { kind: kd.k, w: kd.w + (fixedKind !== undefined ? 0 : game.random(-14, 14)), h: kd.h, mass: kd.mass, tone: TONES[(i * 3 + 1) % 4], x: 0 };
  }

  function drawBook(b, cx, by, alpha, flash) {
    var sc = 1 + (flash || 0) * 0.25;
    voxel(cx, by, b.w * sc, b.h * sc, flash ? { top: '#ffffff', front: '#ffffff', side: '#dddddd' } : b.tone, alpha);
    // 背の帯と背文字の線
    var bandY = by - b.h * sc * 0.65;
    game.draw.rect(cx - b.w * sc * 0.18, bandY, b.w * sc * 0.36, Math.max(6, b.h * 0.22), '#fdf6e6', alpha === undefined ? 1 : alpha);
    if (b.kind === 'dict') game.draw.rect(cx - b.w * 0.4, by - b.h + 8, 10, b.h - 16, '#fdf6e6', 0.8);
  }

  // 重心チェック: 上に載る本の重心が、支えの本(最下段は台車)の幅に収まっているか
  function unstableLevel(pile) {
    for (var i = 0; i < pile.length; i++) {
      var m = 0, mx = 0;
      for (var j = i; j < pile.length; j++) { m += pile[j].mass; mx += pile[j].mass * pile[j].x; }
      var com = mx / m;
      var l = i === 0 ? CART_X - CART_W / 2 : pile[i - 1].x - pile[i - 1].w / 2;
      var r = i === 0 ? CART_X + CART_W / 2 : pile[i - 1].x + pile[i - 1].w / 2;
      if (com < l || com > r) return { level: i, dir: com < l ? -1 : 1 };
    }
    return null;
  }
  function pileTopY(pile) {
    var y = CART_Y;
    for (var i = 0; i < pile.length; i++) y -= pile[i].h;
    return y;
  }
  function topCenter(pile) { return pile.length ? pile[pile.length - 1].x : CART_X; }
  function topHalf(pile) { return pile.length ? pile[pile.length - 1].w / 2 : CART_W / 2; }

  // ── 背景 ──
  function drawLibrary() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, '#93a8c0']]);
    // 奥の書架(ブロックの棚)
    for (var s = 0; s < 3; s++) {
      var sx = 40 + s * 250;
      voxel(sx + 100, H * 0.66, 200, H * 0.36, WOOD, 0.35);
      for (var r = 0; r < 4; r++) {
        for (var b = 0; b < 6; b++) game.draw.rect(sx + 14 + b * 30, H * 0.33 + r * 150, 22, 120, TONES[(b + r + s) % 4].front, 0.3);
      }
    }
    // 窓の光
    game.draw.rect(W * 0.80, H * 0.36, 160, 360, '#ffffff', 0.35);
    // 床
    game.draw.rect(0, H * 0.86, W, H * 0.14, '#8a9bb2');
    for (var f = 0; f < 8; f++) game.draw.rect(f * 140, H * 0.86, 4, H * 0.14, '#7a8aa0');
    // 返却カウンター
    voxel(DESK_X + 40, DESK_Y + 120, 420, 120, WOOD);
    game.draw.rect(DESK_X - 140, DESK_Y + 30, 90, 40, INK, 0.6);
  }

  function drawCart(lean) {
    voxel(CART_X, CART_Y + 70, CART_W, 70, { top: '#9aa6b8', front: '#6f7c90', side: '#4b5568' });
    game.draw.rect(CART_X + CART_W / 2 + 10, CART_Y - 120, 12, 190, '#4b5568');
    game.draw.circle(CART_X - CART_W / 2 + 40, CART_Y + 90, 22, INK);
    game.draw.circle(CART_X + CART_W / 2 - 40, CART_Y + 90, 22, INK);
    game.draw.circle(CART_X - CART_W / 2 + 40, CART_Y + 90, 8, '#9aa6b8');
    game.draw.circle(CART_X + CART_W / 2 - 40, CART_Y + 90, 8, '#9aa6b8');
  }

  function drawPile(pile, sway, flashLevel, flashK, fall) {
    var y = CART_Y;
    for (var i = 0; i < pile.length; i++) {
      var b = pile[i];
      var off = sway * i * i * 0.9;
      var fx = 0, fy = 0;
      if (fall && i >= fall.level) { var k = fall.t; fx = fall.dir * (k * 420 + (i - fall.level) * k * 160); fy = k * k * 900; }
      drawBook(b, b.x + off + fx, y + fy, 1, flashLevel >= 0 && i >= flashLevel ? flashK : 0);
      y -= b.h;
    }
  }

  function drawKid(pose, x) {
    var fr = pose === 'cheer' ? 2 : pose === 'sad' ? 3 : Math.floor(game.time.elapsed * 2) % 2;
    var bob = Math.sin(game.time.elapsed * 3) * 5 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 28 : 0);
    game.draw.sprite(KID[fr], { h: '#3a2c2a', f: '#ffd8b4', e: INK, k: INK, m: '#e25a4e', w: '#ffffff', a: '#f2c14e', n: '#3f5a8a' }, x, H * 0.80 + bob, 16, { anchor: 'center' });
  }

  // ── 状態 ──
  var pile, queue, held, stacked, perfects, score, timeLeft, ready, halt, fall, over, won, endT, prevBest, milestoneDone, pose, sparkT, warnT, backT;

  function initGame() {
    pile = []; queue = [makeBook(0), makeBook(1), makeBook(2)]; held = null; stacked = 0; perfects = 0; score = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; halt = null; fall = null; over = false; won = false; endT = 0;
    milestoneDone = false; pose = 'idle'; sparkT = 0; warnT = 0; backT = 0;
    prevBest = game.best || 0;
  }

  function nextBookPos() { return { x: DESK_X, y: DESK_Y }; }

  function nearNext(x, y) {
    var b = queue[0], p = nextBookPos();
    return b && x > p.x - b.w / 2 - 70 && x < p.x + b.w / 2 + 70 && y > p.y - b.h - 110 && y < p.y + 90;
  }

  function landingX(h) { return h.x + Math.max(-160, Math.min(160, h.vx * 0.12)); }

  function overPile(h) {
    var lx = landingX(h);
    return Math.abs(lx - topCenter(pile)) < topHalf(pile) + h.book.w / 2 + 30 && h.y > pileTopY(pile) - 520 && h.y < CART_Y + 60;
  }

  function previewUnstable(h) {
    var test = pile.slice();
    var b = { w: h.book.w, h: h.book.h, mass: h.book.mass, x: landingX(h) };
    test.push(b);
    return unstableLevel(test);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8; pose = ok ? 'cheer' : 'sad';
    if (ok) score += Math.round(timeLeft * 30);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function place(h) {
    var b = h.book;
    b.x = landingX(h);
    var off = Math.abs(b.x - topCenter(pile));
    pile.push(b);
    queue.shift();
    queue.push(makeBook(stacked + 3));
    var bad = unstableLevel(pile);
    var top = pileTopY(pile);
    if (bad) {
      halt = { t: 0.5, max: 0.5, level: bad.level, dir: bad.dir };
      game.audio.play('se_break', 0.5);
      return;
    }
    stacked++;
    var perfect = off < 12;
    if (perfect) perfects++;
    score += 100 + (perfect ? 80 : 0) + stacked * 10;
    game.feedback.good(b.x, top - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.main[2] : '#ffffff', count: perfect ? 16 : 10 });
    if (stacked === 4 && !milestoneDone) {
      milestoneDone = true;
      game.fx.popup(stacked + ' / ' + NEEDED, W / 2, H * 0.15, { color: STYLE.main[0], size: 64 });
      game.audio.play('se_milestone', 0.45);
    }
    if (stacked >= NEEDED) finish(true);
  }

  function canPlay() { return state === S.PLAYING && !over && !halt && ready <= 0; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) game.fx.burst(x, y, { color: '#ffffff', count: 3, speed: 60 });
  });

  game.onPress(function (x, y) {
    if (!canPlay() || held) return;
    if (nearNext(x, y)) {
      var p = nextBookPos();
      held = { book: queue[0], ox: x - p.x, oy: y - p.y, tx: p.x, ty: p.y, x: p.x, y: p.y, vx: 0 };
      game.audio.play('se_tap', 0.25);
      game.fx.burst(p.x, p.y - queue[0].h, { color: '#ffffff', count: 6, speed: 120 });
    } else {
      game.audio.play('se_tap', 0.06);
      game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 70 });
    }
  });

  game.onMove(function (x, y) {
    if (held && canPlay()) {
      held.tx = x - held.ox; held.ty = y - held.oy;
      // 勢いよく振ると本がばさっと鳴る(揺れの手応え)
      if (Math.abs(held.vx) > 900 && game.random(0, 1) < 0.12) game.audio.tone(180, 0.04, { wave: 'triangle', volume: 0.05 });
    }
  });

  game.onRelease(function (x, y) {
    if (!held || !canPlay()) { held = null; return; }
    if (overPile(held)) {
      game.audio.play('se_jump', 0.2);
      place(held);
    } else {
      // 台車の外: カウンターへ戻る
      game.feedback.bad(held.x, held.y - 40, { text: 'MISS', shake: 6 });
      backT = 0.3;
    }
    held = null;
  });

  function stepHeld(h, dt) {
    var px = h.x;
    h.x += (h.tx - h.x) * Math.min(1, dt * 11);
    h.y += (h.ty - h.y) * Math.min(1, dt * 11);
    var v = (h.x - px) / Math.max(dt, 0.001);
    h.vx += (v - h.vx) * Math.min(1, dt * 18);
  }

  function drawHeld(h, warnOn) {
    var lx = landingX(h);
    var ty = pileTopY(pile);
    if (overPile(h)) {
      var bad = previewUnstable(h);
      var col = bad ? '#ff3344' : '#ffffff';
      // 着地予告: 落ちる位置のガイド線と枠
      game.draw.line(lx, h.y, lx, ty, col, bad ? 6 : 3);
      game.draw.rect(lx - h.book.w / 2, ty - h.book.h, h.book.w, h.book.h, col, bad ? (warnOn ? 0.45 : 0.15) : 0.25);
    }
    drawBook(h.book, h.x, h.y, 1, 0);
  }

  // ── ATTRACT: 1冊目は止めてから離してPERFECT、2冊目は勢いのまま離して崩す ──
  var DEMO_CYCLE = 5.0;
  var demo = { t: 0, pile: [], book: null, held: null, gx: W / 2, gy: H * 0.5, press: false, step: 0, halt: 0, fall: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      demo.pile = [makeBook(0, 0), makeBook(1, 1)];
      demo.pile[0].x = CART_X; demo.pile[1].x = CART_X + 20;
      demo.book = makeBook(2, 2); demo.held = null; demo.step = 0; demo.halt = 0; demo.fall = null;
    }
    var p = nextBookPos();
    var top = pileTopY(demo.pile);
    var tx = p.x, ty = p.y - 40;
    demo.press = false;
    if (demo.step === 0 && cyc > 0.3) { demo.held = { book: demo.book, ox: 0, oy: 0, tx: p.x, ty: p.y, x: p.x, y: p.y, vx: 0 }; demo.step = 1; game.audio.play('se_tap', 0.15); }
    if (demo.step === 1) {
      demo.press = true;
      var aim = topCenter(demo.pile);
      demo.held.tx = cyc < 1.2 ? p.x + (aim - p.x) * ((cyc - 0.3) / 0.9) : aim;
      demo.held.ty = cyc < 1.2 ? p.y + (top - 140 - p.y) * ((cyc - 0.3) / 0.9) : top - 140;
      if (cyc > 1.75) {
        demo.held.vx = 0; demo.held.x = aim;
        var b = demo.held.book; b.x = aim; demo.pile.push(b); demo.held = null; demo.step = 2;
        game.feedback.good(aim, pileTopY(demo.pile) - 40, { text: 'PERFECT', color: STYLE.main[2], count: 10, volume: 0.3 });
        demo.book = makeBook(3, 3);
      }
    } else if (demo.step === 2 && cyc > 2.2) {
      demo.held = { book: demo.book, ox: 0, oy: 0, tx: p.x, ty: p.y, x: p.x, y: p.y, vx: 0 }; demo.step = 3;
    } else if (demo.step === 3) {
      demo.press = true;
      demo.held.tx = CART_X - 120; demo.held.ty = top - 160;
      if (cyc > 3.0) {
        var b2 = demo.held.book; b2.x = landingX(demo.held); demo.pile.push(b2); demo.held = null; demo.step = 4;
        var bad = unstableLevel(demo.pile);
        if (bad) { demo.halt = 0.45; demo.fall = { level: bad.level, dir: bad.dir, t: 0 }; game.audio.play('se_break', 0.3); }
      }
    } else if (demo.step === 4) {
      if (demo.halt > 0) { demo.halt -= dt; if (demo.halt <= 0) game.feedback.bad(CART_X, H * 0.6, { text: 'MISS', volume: 0.3 }); }
      else if (demo.fall) demo.fall.t = Math.min(1, demo.fall.t + dt * 1.2);
    }
    if (demo.held) { stepHeld(demo.held, dt); tx = demo.held.x; ty = demo.held.y - demo.held.book.h / 2; }
    else if (demo.step >= 4) { tx = CART_X; ty = H * 0.62; }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 12);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 12);
    return cyc;
  }

  function drawQueue(q, liftNext) {
    var p = nextBookPos();
    for (var i = q.length - 1; i >= 1; i--) drawBook(q[i], p.x + 90 + i * 34, p.y - 8 - (i - 1) * 8, 0.85, 0);
    if (q[0] && !liftNext) {
      var bob = Math.sin(game.time.elapsed * 6) * 6;
      drawBook(q[0], p.x, p.y + bob, 1, 0);
      if (Math.floor(game.time.elapsed * 3) % 2 === 0) game.draw.rect(p.x - q[0].w / 2 - 10, p.y - q[0].h - 10 + bob, q[0].w + 10 + DEPTH, 6, '#ffffff', 0.9);
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var on = i < stacked;
      game.draw.rect(40 + i * 78, 50, 64, 30, on ? TONES[i % 4].front : '#ffffff', on ? 1 : 0.45);
      game.draw.rect(40 + i * 78, 44, 64, 6, on ? TONES[i % 4].top : '#ffffff', on ? 1 : 0.3);
    }
    label(stacked + ' / ' + NEEDED, W * 0.24, 132, 44, '#ffffff');
    label(String(score), W * 0.82, 82, 46, STYLE.main[2]);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 176, W - 80, 24, INK, 0.6);
    game.draw.rect(44, 180, (W - 88) * fr, 16, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? '#ff3344' : STYLE.main[1]);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.24, W - 160, H * 0.30, INK, 0.82);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 104, won ? STYLE.main[2] : STYLE.main[0]);
    label(stacked + ' / ' + NEEDED, W / 2, H * 0.36, 60, '#ffffff');
    label('SCORE ' + score, W / 2, H * 0.42, 50, '#ffffff');
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.48, 54, STYLE.main[2]);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 42, '#b4c6da');
    if (!won && stacked < NEEDED) label('あと' + (NEEDED - stacked) + '冊!', W / 2, H * 0.525, 46, STYLE.main[2]);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawLibrary();
      drawCart(0);
      drawPile(demo.pile, 0, demo.halt > 0 && demo.fall ? demo.fall.level : -1, demo.halt > 0 ? 1 - demo.halt / 0.45 : 0, demo.halt <= 0 ? demo.fall : null);
      drawQueue([demo.book, makeQueueGhost(0), makeQueueGhost(1)], !!demo.held);
      if (demo.held) drawHeld(demo.held, true);
      drawKid(demo.step === 2 ? 'cheer' : demo.step === 4 ? 'sad' : 'idle', W * 0.12);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.065, 92, STYLE.main[0]);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 38, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, STYLE.main[2]);
      else label('TAP TO START', W / 2, H * 0.965, 40, '#ffffff');
      return;
    }

    var sway = 0;
    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (fall) fall.t = Math.min(1, fall.t + dt * 1.2);
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(120, W - 120), game.random(H * 0.2, H * 0.5), { color: TONES[Math.floor(game.random(0, 4))].front, count: 16, speed: 360 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          fall = { level: halt.level, dir: halt.dir, t: 0 };
          game.feedback.bad(topCenter(pile), pileTopY(pile) - 40, { text: 'MISS' });
          halt = null;
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.3);
      } else {
        timeLeft -= dt;
        if (held) {
          stepHeld(held, dt);
          if (overPile(held) && previewUnstable(held)) {
            warnT -= dt;
            if (warnT <= 0) { warnT = 0.3; game.audio.tone(880, 0.05, { wave: 'square', volume: 0.05 }); }
          }
        }
        if (backT > 0) backT -= dt;
        if (timeLeft <= 0 && !over) {
          timeLeft = 0; held = null;
          game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
          finish(false);
        }
      }
      // 重心が端に寄るほど山がゆらゆら揺れる(危険の可視化)
      if (pile.length > 1 && !fall) {
        var m = 0, mx = 0;
        for (var i = 1; i < pile.length; i++) { m += pile[i].mass; mx += pile[i].mass * pile[i].x; }
        var edge = Math.abs(mx / m - pile[0].x) / (pile[0].w / 2);
        sway = Math.sin(game.time.elapsed * 5) * Math.max(0, edge - 0.4) * 1.6;
      }
    }

    drawLibrary();
    drawCart(0);
    var hk = halt ? 1 - halt.t / halt.max : 0;
    drawPile(pile, sway, halt ? halt.level : -1, hk, fall);
    drawQueue(queue, !!held);
    if (held) drawHeld(held, Math.floor(game.time.elapsed * 6) % 2 === 0);
    drawKid(pose, W * 0.12);
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, STYLE.main[0]);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, '#ffffff');
      var stats = { books: stacked, perfect: perfects };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  // ATTRACT のカウンター上の待ち本(見た目用に固定の2冊)
  var GHOST_Q = null;
  function makeQueueGhost(i) {
    if (!GHOST_Q) GHOST_Q = [makeBook(5, 2), makeBook(6, 1)];
    return GHOST_Q[i];
  }

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 1], ['C5', 0.5], ['B4', 0.5], ['A4', 1],
      ['B4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 2],
      ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 1],
      ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['G4', 2],
    ], {
      tempo: 112, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1], ['C3', 1], ['G2', 1], ['D3', 1], ['A2', 1],
        ['C3', 1], ['G2', 1], ['E2', 1], ['B2', 1], ['D3', 1], ['A2', 1], ['G2', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);

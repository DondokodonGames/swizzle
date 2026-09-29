// J-Switch-0061-marquetry-box-trail.js
// 寄木箱の足どり — 玉を入れた寄木の小箱が盆の上で入れ替わる。止まったら、その箱が通った道筋を始点から指でなぞって行き先を示す
// 操作: 入れ替えが止まったら、玉が入っていた場所(光る輪)から指を置き、その箱が動いた順に角の箱をなぞって、最後に止まった箱の上で指を離す(社内メモ。画面には出さない)
// 終わり: 3回とも行き先を当てればCLEAR。行き先違い/なぞらずに3秒/時間切れでGAME OVER
// @mechanic: trace
// @theme: marquetry_box_trail
// 世界観: 夜更けの寄木細工工房で、見習い職人が師匠のからくり盆の試しを受ける。師匠が玉を忍ばせた秘密箱を盆の四隅で入れ替えるたび、その箱がどの角を渡って最後にどこへ止まったかを、盆のフェルトに指で道筋を描いて答える
// 残るもの: 正誤(CLEAR/GAME OVER) + 当てた回数・道筋まで完全になぞれたPERFECT数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目の机・緑のフェルト・真鍮の縁。gradient で厚みを出す
  var STYLE = { bg: ['#3a2416', '#6b4128', '#1f130b'], main: ['#2f6b45', '#23543a', '#c9a15a'], accent: ['#ffe08a', '#ff5a4a'] };
  var C = {
    wall1: '#2a1a10', wall2: '#4a2e1c', wood1: '#7a4a2a', wood2: '#5a341c', wood3: '#a86b3c',
    felt1: '#2f6b45', felt2: '#1e4a30', brass: '#c9a15a', brass2: '#8a6a2c',
    gold: '#ffe08a', red: '#ff5a4a', cream: '#f6ead2', ink: '#140c06', good: '#9dffb2', bad: '#ff4a5a', chalk: '#fff6d8'
  };

  var GAME_TITLE = 'MARQUETRY TRAIL';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var MOVES = [3, 4, 5];
  var MOVE_T = [0.34, 0.3, 0.27];
  var SHOW_T = 0.6, REVEAL_T = 0.55, TRACE_WAIT = 3;
  var HIT_R = 120, START_R = 150;
  var BX = W / 2, BY = H * 0.47, HALF = 250;
  var SLOTS = [
    { x: BX - HALF, y: BY - HALF }, { x: BX + HALF, y: BY - HALF },
    { x: BX + HALF, y: BY + HALF }, { x: BX - HALF, y: BY + HALF }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, pt, ready, timeLeft, round, found, perfects, boxes, target, moves, mi, route, startSlot;
  var tracing, path, seq, waitT, hitStop, outro, ok, endFx, openSlot, openGood, verdict, lastAns;

  // ── sprites ─────────────────────────────────────────────────────
  var BOX = ['kkkkkkkkkkkk', 'kabababababk', 'kbcccccccbak', 'kacddddddcbk', 'kbcdeeeedcak', 'kacdeeeedcbk', 'kbcddddddcak', 'kacccccccbbk', 'kbabababaabk', 'kkkkkkkkkkkk'];
  var LID = ['kkkkkkkkkkkk', 'kbabababaabk', 'kkkkkkkkkkkk'];
  var MASTER = [
    ['...wwww...', '..wwwwww..', '..ssssss..', '..skssks..', '..ssssss..', '...gggg...', '.nnnnnnnn.', 'nnnnnnnnnn', 's.nnnnnn.s', '..nnnnnn..'],
    ['...wwww...', '..wwwwww..', '..ssssss..', '..skssks..', '..ssssss..', '...gggg...', '.nnnnnnnn.', 'snnnnnnnns', '..nnnnnn..', '..nnnnnn..']
  ];
  var CHISEL = ['..b..', '..b..', '..b..', '.www.', '.www.', '.www.', '.www.'];
  var PAL_BOX = { k: C.ink, a: C.wood3, b: C.wood2, c: '#d8b27a', d: C.wood1, e: '#e8cfa0' };
  var PAL_M = { w: '#e8e0d0', s: '#e6b48a', k: C.ink, g: '#b0a898', n: '#3b4a6a' };

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function slotAt(x, y, r) {
    for (var i = 0; i < SLOTS.length; i++) if (Math.hypot(x - SLOTS[i].x, y - SLOTS[i].y) <= r) return i;
    return -1;
  }

  // ── 1ラウンドの入れ替え手順(玉の箱が必ず2回以上動く)──────────
  function buildRound(r) {
    boxes = [];
    for (var i = 0; i < 4; i++) boxes.push({ slot: i, x: SLOTS[i].x, y: SLOTS[i].y, fx: 0, fy: 0, tx: 0, ty: 0, side: 0, moving: false });
    startSlot = Math.floor(Math.random() * 4);
    target = boxes[startSlot];
    moves = []; route = [startSlot];
    var cur = startSlot, tMoves = 0, n = MOVES[r];
    for (var m = 0; m < n; m++) {
      var need = 2 - tMoves;
      var involve = (n - m) <= need || Math.random() < 0.55;
      if (involve) {
        var to = (cur + 1 + Math.floor(Math.random() * 3)) % 4;
        moves.push([cur, to]); cur = to; route.push(to); tMoves++;
      } else {
        var others = [0, 1, 2, 3].filter(function(s) { return s !== cur; });
        var a = others.splice(Math.floor(Math.random() * 3), 1)[0];
        var b = others[Math.floor(Math.random() * 2)];
        moves.push([a, b]);
      }
    }
    mi = -1;
  }

  function startRound(r) {
    round = r; buildRound(r);
    phase = 'show'; pt = SHOW_T; tracing = false; path = []; seq = []; waitT = 0;
    openSlot = startSlot; openGood = true; verdict = null;
  }

  function initGame() {
    ready = 0.8; timeLeft = TIME_LIMIT; found = 0; perfects = 0;
    hitStop = 0; outro = 0; ok = false; endFx = false; lastAns = -1;
    startRound(0);
    phase = 'ready';
  }

  function beginMove() {
    mi++;
    if (mi >= moves.length) {
      phase = 'trace'; waitT = 0; openSlot = -1;
      for (var k = 0; k < boxes.length; k++) boxes[k].moving = false;
      return;
    }
    var mv = moves[mi];
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      b.moving = false;
      if (b.slot === mv[0] || b.slot === mv[1]) {
        var to = b.slot === mv[0] ? mv[1] : mv[0];
        b.fx = SLOTS[b.slot].x; b.fy = SLOTS[b.slot].y; b.tx = SLOTS[to].x; b.ty = SLOTS[to].y;
        b.side = b.slot === mv[0] ? 1 : -1; b.slot = to; b.moving = true;
      }
    }
    pt = MOVE_T[round];
  }

  function advance(dt, demo) {
    if (phase === 'show') {
      pt -= dt;
      if (pt <= 0) { openSlot = -1; phase = 'shuffle'; beginMove(); if (!demo) game.audio.tone('G3', 0.06, { wave: 'triangle', volume: 0.05 }); }
    } else if (phase === 'shuffle') {
      pt -= dt;
      var k = 1 - Math.max(0, pt) / MOVE_T[round];
      var e = k * k * (3 - 2 * k);
      for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (!b.moving) continue;
        var dx = b.tx - b.fx, dy = b.ty - b.fy, len = Math.hypot(dx, dy) || 1;
        var off = Math.sin(Math.PI * e) * 70 * b.side;
        b.x = b.fx + dx * e + (-dy / len) * off; b.y = b.fy + dy * e + (dx / len) * off;
      }
      if (pt <= 0) {
        for (var j = 0; j < boxes.length; j++) if (boxes[j].moving) { boxes[j].x = boxes[j].tx; boxes[j].y = boxes[j].ty; }
        if (!demo) game.audio.tone(mi % 2 ? 'E4' : 'C4', 0.04, { wave: 'square', volume: 0.035 });
        beginMove();
      }
    } else if (phase === 'trace') {
      waitT += dt;
      if (waitT > TRACE_WAIT) judge([], demo);
    } else if (phase === 'reveal') {
      pt -= dt;
      if (pt <= 0) {
        if (verdict === 'miss') { if (!demo) endRun(false); else startRound(0); }
        else if (found >= NEEDED) { if (!demo) endRun(true); else { found = 0; startRound(0); } }
        else startRound(round + 1);
      }
    }
  }

  // ── なぞりの判定(実プレイ・デモ共用)──────────────────────────
  function judge(sq, demo) {
    tracing = false;
    var end = target.slot;
    var ans = sq.length ? sq[sq.length - 1] : -1;
    lastAns = ans;
    var same = sq.length === route.length;
    for (var i = 0; same && i < sq.length; i++) if (sq[i] !== route[i]) same = false;
    phase = 'reveal'; pt = REVEAL_T; openSlot = ans >= 0 ? ans : end;
    if (ans === end) {
      found++; openGood = true; verdict = same ? 'perfect' : 'good';
      if (same) perfects++;
      var s = SLOTS[end];
      if (demo) { game.fx.burst(s.x, s.y, { color: C.gold, count: 10, speed: 200 }); return; }
      game.feedback.good(s.x, s.y - 150, { text: same ? 'PERFECT' : 'GOOD', color: same ? C.gold : C.good, count: same ? 16 : 8 });
      game.audio.play('se_coin', 0.5);
      if (found < NEEDED) { game.audio.play('se_milestone', 0.35); game.fx.popup(found + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 56 }); }
    } else {
      openGood = false; verdict = 'miss'; pt = 0.25;
      if (demo) { game.fx.burst(BX, BY, { color: C.bad, count: 8, speed: 160 }); return; }
      game.audio.tone('D3', 0.2, { wave: 'square', volume: 0.05, slide: -40 });
    }
  }

  function endRun(win) {
    if (phase === 'stop') return;
    ok = win; phase = 'stop'; hitStop = 0.55; endFx = false;
    game.audio.stopBgm();
  }

  function score() { return found * 100 + perfects * 50 + (ok ? Math.round(timeLeft * 20) : 0); }

  // ── input ───────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.4); state = S.ATTRACT; initGame(); demo.t = 0; startTheme(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase !== 'trace') { game.audio.tone('C4', 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    if (Math.hypot(x - SLOTS[startSlot].x, y - SLOTS[startSlot].y) > START_R) {
      game.audio.tone('A2', 0.08, { wave: 'square', volume: 0.04 });
      game.fx.burst(x, y, { color: C.bad, count: 4, speed: 90 });
      return;
    }
    tracing = true; path = [{ x: x, y: y }]; seq = [startSlot];
    game.audio.play('se_tap', 0.3);
    game.fx.burst(x, y, { color: C.chalk, count: 5, speed: 100 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !tracing) return;
    path.push({ x: x, y: y });
    var s = slotAt(x, y, HIT_R);
    if (s >= 0 && seq[seq.length - 1] !== s) {
      seq.push(s);
      game.audio.tone(['C5', 'E5', 'G5', 'B5'][s], 0.05, { wave: 'triangle', volume: 0.05 });
      game.fx.burst(SLOTS[s].x, SLOTS[s].y, { color: C.chalk, count: 6, speed: 140 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !tracing || phase !== 'trace') return;
    var s = slotAt(x, y, HIT_R);
    if (s >= 0 && seq[seq.length - 1] !== s) seq.push(s);
    game.audio.play('se_tap', 0.2);
    judge(seq, false);
  });

  // ── demo(師匠の入れ替えを見て、正しい道筋をなぞる)────────────
  var demo = { t: 0, gx: BX, gy: H * 0.8, press: false, k: 0 };
  var DEMO_CYC = 30;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'show'; demo.k = 0; }
    advance(dt, true);
    if (phase === 'trace') {
      demo.k += dt / 1.1;
      var legs = route.length - 1;
      var p = Math.min(1, demo.k) * legs;
      var li = Math.min(legs - 1, Math.floor(p)), f = p - li;
      var a = SLOTS[route[li]], b = SLOTS[route[li + 1]];
      demo.gx = a.x + (b.x - a.x) * f; demo.gy = a.y + (b.y - a.y) * f;
      demo.press = true;
      if (!tracing) { tracing = true; path = []; seq = [route[0]]; }
      path.push({ x: demo.gx, y: demo.gy });
      var s = slotAt(demo.gx, demo.gy, HIT_R);
      if (s >= 0 && seq[seq.length - 1] !== s) seq.push(s);
      if (demo.k >= 1.12) { demo.k = 0; judge(seq, true); }
    } else {
      demo.press = false;
      var home = phase === 'reveal' ? SLOTS[target.slot] : { x: BX + Math.sin(demo.t) * 60, y: H * 0.8 };
      demo.gx += (home.x - demo.gx) * Math.min(1, dt * 5); demo.gy += (home.y - demo.gy) * Math.min(1, dt * 5);
    }
  }

  // ── drawing ─────────────────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall1], [0.3, C.wall2], [1, C.wall1]]);
    // 壁の道具掛け
    game.draw.rect(60, 250, W - 120, 20, C.brass2);
    for (var i = 0; i < 9; i++) game.draw.sprite(CHISEL, { b: C.brass, w: C.wood3 }, 110 + i * 108, 300 + Math.sin(t * 1.3 + i) * 3, 8, { anchor: 'center' });
    // ランプの灯り(周囲の明滅)
    game.draw.circle(W * 0.85, 380, 90 + 10 * Math.sin(t * 2.1), C.gold, 0.08);
    game.draw.circle(W * 0.85, 380, 26, C.gold, 0.7 + 0.2 * Math.sin(t * 7));
    // 机(木目)
    game.draw.gradient(H * 0.22, H * 0.78, [[0, C.wood3], [0.5, C.wood1], [1, C.wood2]]);
    for (var g = 0; g < 16; g++) {
      var gy = H * 0.23 + g * 62 + Math.sin(g * 1.7) * 10;
      game.draw.rect(0, gy, W, 4, C.wood2, 0.5);
    }
    // フェルトの盆 + 真鍮の縁 + ステッチ
    game.draw.rect(BX - HALF - 170, BY - HALF - 170, (HALF + 170) * 2, (HALF + 170) * 2, C.brass2);
    game.draw.rect(BX - HALF - 160, BY - HALF - 160, (HALF + 160) * 2, (HALF + 160) * 2, C.brass);
    game.draw.gradient(BY - HALF - 140, BY + HALF + 140, [[0, C.felt1], [1, C.felt2]]);
    game.draw.rect(0, BY - HALF - 140, BX - HALF - 140, (HALF + 140) * 2, C.wood1);
    game.draw.rect(BX + HALF + 140, BY - HALF - 140, W - (BX + HALF + 140), (HALF + 140) * 2, C.wood1);
    game.draw.rect(BX - HALF - 170, BY - HALF - 170, 10, (HALF + 170) * 2, C.brass2);
    game.draw.rect(BX + HALF + 160, BY - HALF - 170, 10, (HALF + 170) * 2, C.brass2);
    for (var s = 0; s < 22; s++) {
      var sx = BX - HALF - 120 + s * 22.5;
      game.draw.rect(sx, BY - HALF - 122, 12, 3, C.cream, 0.4);
      game.draw.rect(sx, BY + HALF + 119, 12, 3, C.cream, 0.4);
    }
    // 下の作業台
    game.draw.gradient(H * 0.78, H, [[0, C.wood2], [1, C.wall1]]);
    game.draw.rect(0, H * 0.78, W, 12, C.wood3);
    game.draw.rect(0, 0, W, H, C.gold, 0.015 + 0.015 * Math.sin(t * 1.3));
  }

  function drawBoard() {
    var t = game.time.elapsed;
    // 四隅の座
    for (var i = 0; i < 4; i++) {
      game.draw.circle(SLOTS[i].x, SLOTS[i].y + 10, 95, C.felt2, 0.9);
      game.draw.circle(SLOTS[i].x, SLOTS[i].y, 88, C.felt1);
    }
    // 始点の輪(なぞり待ち)
    if (phase === 'trace') {
      var sp = SLOTS[startSlot];
      game.draw.circle(sp.x, sp.y, 120 + 12 * Math.sin(t * 8), C.gold, 0.25);
      game.draw.circle(sp.x, sp.y, 100, C.gold, 0.15);
    }
    // 失敗時: 本当の道筋を光らせる
    if ((phase === 'stop' && !ok) || (phase === 'reveal' && verdict === 'miss')) {
      for (var r = 0; r + 1 < route.length; r++) {
        var a = SLOTS[route[r]], b = SLOTS[route[r + 1]];
        game.draw.line(a.x, a.y, b.x, b.y, C.gold, 14 + 4 * Math.sin(t * 20));
      }
    }
    // なぞった線(チョーク)
    for (var p = 1; p < path.length; p++) game.draw.line(path[p - 1].x, path[p - 1].y, path[p].x, path[p].y, C.chalk, 12);
    // 箱
    for (var k = 0; k < boxes.length; k++) {
      var bx = boxes[k];
      var bob = bx.moving ? -18 * Math.sin(Math.PI * (1 - Math.max(0, pt) / MOVE_T[round])) : Math.sin(t * 2.5 + k) * 4;
      var open = openSlot >= 0 && !bx.moving && bx.slot === openSlot && phase !== 'shuffle';
      var isT = bx === target;
      var hl = phase === 'stop' && hitStop > 0 && (isT || bx.slot === lastAns);
      if (hl) game.draw.circle(bx.x, bx.y, 140, isT ? C.gold : C.bad, 0.4 + 0.3 * Math.sin(t * 30));
      game.draw.circle(bx.x, bx.y + 58, 70, C.ink, 0.3);
      game.draw.sprite(BOX, PAL_BOX, bx.x, bx.y + bob, 13, { anchor: 'center' });
      var showBead = (open && isT) || (phase === 'stop' && isT);
      if (showBead) {
        game.draw.circle(bx.x, bx.y + bob, 34, C.red);
        game.draw.circle(bx.x - 10, bx.y + bob - 12, 11, C.cream, 0.9);
      }
      var lidUp = open || (phase === 'stop' && (isT || bx.slot === lastAns));
      game.draw.sprite(LID, PAL_BOX, bx.x, bx.y + bob - (lidUp ? 110 : 52), 13, { anchor: 'center' });
    }
  }

  function drawBench() {
    var t = game.time.elapsed;
    var f = phase === 'shuffle' ? Math.floor(t * 8) % 2 : Math.floor(t * 2) % 2;
    game.draw.sprite(MASTER[f], PAL_M, W * 0.16, H * 0.87 + Math.sin(t * 1.8) * 5, 14, { anchor: 'center' });
    // 当てた玉の受け皿
    for (var i = 0; i < NEEDED; i++) {
      var cx = W * 0.5 + i * 150, cy = H * 0.87;
      game.draw.circle(cx, cy, 52, C.brass2);
      game.draw.circle(cx, cy, 44, C.brass);
      if (i < found) {
        game.draw.circle(cx, cy + Math.sin(t * 3 + i) * 3, 28, C.red);
        game.draw.circle(cx - 8, cy - 9, 9, C.cream, 0.9);
      }
    }
  }

  function drawHud() {
    game.draw.gradient(0, 228, [[0, '#1a100a'], [1, '#2e1d12']]);
    game.draw.rect(0, 222, W, 6, C.brass);
    txt(found + ' / ' + NEEDED, W / 2, 90, 68, C.gold);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 90, 52, C.cream, 'left');
    if (perfects > 0) txt('PERFECT ' + perfects, W - 60, 90, 34, C.good, 'right');
    var lowT = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(56, 166, W - 112, 26, C.brass2);
    game.draw.rect(60, 170, W - 120, 18, '#1a100a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? C.bad : C.gold);
    if (phase === 'trace') {
      var wb = Math.max(0, 1 - waitT / TRACE_WAIT);
      game.draw.rect(BX - 200, BY + HALF + 150, 400 * wb, 10, C.gold, 0.7);
    }
  }

  function startTheme() {
    game.audio.melody([['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 1], ['E4', 0.5], ['D4', 0.5], ['C4', 1], ['D4', 1]],
      { tempo: 104, wave: 'triangle', volume: 0.045, loop: true, bass: [['D2', 2], ['A1', 2], ['Bb1', 2], ['A1', 2]] });
  }

  // ── main loop ───────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawRoom(); drawBoard(); drawBench();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.gradient(0, 230, [[0, '#1a100a'], [1, '#2e1d12']]);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 96 + Math.sin(t * 2.2) * 6, 70, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 184, 36, C.cream);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawRoom(); drawBoard(); drawBench();
      game.draw.rect(0, H * 0.13, W, H * 0.1, C.ink, 0.7);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.155, 90, ok ? C.gold : C.bad);
      txt('SCORE ' + score() + '   BEST ' + (game.best || 0), W / 2, H * 0.205, 36, C.cream);
      game.draw.rect(0, 0, W, 228, C.ink, 0.8);
      txt(found + ' / ' + NEEDED, W / 2, 90, 64, C.gold);
      txt('PERFECT ' + perfects, W / 2, 180, 36, C.good);
      if (!ok && found === NEEDED - 1) txt('あと1回!', W / 2, H * 0.8, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 38, C.cream);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'show'; pt = SHOW_T; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'stop') {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0 && !endFx) {
          endFx = true;
          var ts = SLOTS[target.slot];
          if (ok) {
            game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.gold, count: 26 });
            game.audio.play('se_success', 0.6);
          } else {
            game.feedback.bad(ts.x, ts.y - 150, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
            game.audio.play('se_failure', 0.6);
          }
          outro = 1.3;
        }
      } else {
        outro -= dt;
        if (outro <= 0) {
          state = S.RESULT;
          var stats = { found: found, perfects: perfects, rounds: round + 1 };
          if (ok) game.end.success(score(), stats); else game.end.failure(stats);
        }
      }
    } else {
      advance(dt, false);
      if (phase !== 'stop' && phase !== 'reveal') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; lastAns = -1; endRun(false); }
      }
    }

    drawRoom(); drawBoard(); drawBench(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, BY, 96, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startTheme();
  });
})(game);

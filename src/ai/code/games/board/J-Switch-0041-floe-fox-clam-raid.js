// J-Switch-0041-floe-fox-clam-raid.js
// 流氷のホタテ持ち帰り — 1手ずつ流氷を渡ってセイウチの縄張りから貝を1枚くわえ、巣穴まで逃げ帰る。こちらが1歩動くたびにセイウチも1歩進む
// 操作: 行きたい方向の流氷をタップすると1マス進む(自分のマスをタップでその場で待つ)。赤く光るマス=セイウチのいるマスと次に進むマスに入ると捕まる。3秒迷うと手番を飛ばされる(社内メモ。画面には出さない)
// 終わり: 貝を3枚巣穴へ持ち帰ればCLEAR。2回捕まる/28秒でTIME UPならGAME OVER
// @mechanic: turn_attack
// @theme: ice_floe_fox_clam_raid
// 世界観: 春の流氷帯で、ホッキョクギツネの子が、見回りの順路を決して崩さない年寄りセイウチの縄張りから、1歩ごとに相手の次の一歩を読んで貝をくわえ取り、雪だまりの巣穴まで持ち帰って腹をすかせた弟妹に届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 持ち帰った貝・金の貝・手数・捕まった回数のスコア
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体の流氷を上面/前面/側面の3明度で
  var STYLE = { bg: ['#0e2a4a', '#1a4a6e'], main: ['#e8f6ff', '#a8d4ec', '#6a9ec0'], accent: ['#ff5a4a', '#ffd24a'] };
  var C = {
    sea1: '#0a1e38', sea2: '#16446a', top: '#eaf7ff', front: '#9cc8e4', side: '#6a9ec0', den: '#f4f0e8', denD: '#c8bca8',
    danger: '#ff5a4a', gold: '#ffd24a', good: '#6ae08a', white: '#ffffff', ink: '#081428', aur1: '#5affc8', aur2: '#a07aff'
  };

  var GAME_TITLE = 'FLOE RAID';
  var TIME_LIMIT = 28;
  var NEEDED = 3;
  var MAX_MISS = 2;
  var TURN_T = 3.0;
  var COLS = 5, ROWS = 5;
  var CS = 170;
  var GX = Math.round((W - COLS * CS) / 2);
  var GY = Math.round(H * 0.24);
  var DEN = { c: 2, r: 5 };
  var FOX_ANIM = 0.14, WAL_ANIM = 0.18;
  var MID_Y = Math.round(H * 0.5);
  var BOTTOM_Y = Math.round(H * 0.93);

  var ROUTE_A = [[1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 2]];
  var ROUTE_B = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [3, 4], [2, 4], [1, 4]];
  var CLAM_SPOTS = [[0, 0], [2, 0], [4, 0], [0, 2], [4, 2], [2, 2], [0, 3], [4, 3], [1, 0], [3, 0]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var fox, walruses, clams, carrying, banked, golds, misses, moves, turnT, animT, walT, timeLeft, ready, hitStop, caughtBy, finished, ok, endWait, score, bestAtStart, halfShown, flakes;

  var FOX = [
    ['w......w..', 'ww....ww..', 'wwwwwwww..', 'wkwwwwkw..', 'wwwwnwww..', '.wwwwww...', '..wwwwwwwt', '..wwwwwwtt', '..w.w.w.w.'],
    ['w......w..', 'ww....ww..', 'wwwwwwww..', 'wkwwwwkw..', 'wwwwnwww..', '.wwwwww...', '..wwwwwwt.', '..wwwwwwtt', '...w.w.w..']
  ];
  var FOX_PAL = { w: '#ffffff', k: '#081428', n: '#2a2a3a', t: '#dfe8f0' };
  var WALRUS = [
    ['....bbbbbb....', '..bbbbbbbbbb..', '.bbkbbbbbbkbb.', '.bbbbmmmmbbbb.', 'bbbbmmmmmmbbbb', 'bbbbbwbbwbbbbb', 'bbbbbwbbwbbbbb', '.bbbbwbbwbbbb.', '..bbbbbbbbbb..'],
    ['....bbbbbb....', '..bbbbbbbbbb..', '.bbkbbbbbbkbb.', '.bbbbmmmmbbbb.', 'bbbbmmmmmmbbbb', 'bbbbbwbbwbbbbb', '.bbbbwbbwbbbb.', '..bbbwbbwbbb..', '...bbbbbbbb...']
  ];
  var WAL_PAL = { b: '#a0684a', k: '#081428', m: '#d8a888', w: '#fffaf0' };
  var CLAM = ['.cccc.', 'cCcCcc', 'cccccc', '.cccc.'];
  var ZZ = ['zzzz', '..z.', '.z..', 'zzzz'];
  var PUFFIN = [['.kk.', 'kwwk', '.oo.'], ['.kk.', 'kwwk', 'o..o']];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function cellCX(c) { return GX + c * CS + CS / 2; }
  function cellCY(r) { return GY + r * CS + CS / 2; }
  function isDen(c, r) { return c === DEN.c && r === DEN.r; }
  function valid(c, r) { return isDen(c, r) || (c >= 0 && c < COLS && r >= 0 && r < ROWS); }

  function makeWalrus(route, idx, awake) { return { route: route, i: idx, awake: awake, fromC: route[idx][0], fromR: route[idx][1] }; }
  function wCell(w) { return w.route[w.i]; }
  function wNext(w) { return w.route[(w.i + 1) % w.route.length]; }

  function isDanger(c, r) {
    for (var i = 0; i < walruses.length; i++) {
      var w = walruses[i];
      if (!w.awake) continue;
      var a = wCell(w), b = wNext(w);
      if ((a[0] === c && a[1] === r) || (b[0] === c && b[1] === r)) return w;
    }
    return null;
  }

  function clamAt(c, r) {
    for (var i = 0; i < clams.length; i++) if (clams[i].c === c && clams[i].r === r) return clams[i];
    return null;
  }

  function placeClam() {
    for (var tries = 0; tries < 30; tries++) {
      var s = CLAM_SPOTS[Math.floor(game.random(0, CLAM_SPOTS.length - 0.01))];
      if (clamAt(s[0], s[1]) || (carrying && carrying.c === s[0] && carrying.r === s[1])) continue;
      clams.push({ c: s[0], r: s[1], gold: s[0] === 2 && s[1] === 2 });
      return;
    }
  }

  function initGame(fixed) {
    fox = { c: DEN.c, r: DEN.r, fromC: DEN.c, fromR: DEN.r, face: 1 };
    walruses = [makeWalrus(ROUTE_A, 0, true), makeWalrus(ROUTE_B, 0, false)];
    clams = [];
    if (fixed) { clams.push({ c: 0, r: 3, gold: false }); clams.push({ c: 2, r: 2, gold: true }); clams.push({ c: 4, r: 2, gold: false }); }
    else { placeClam(); placeClam(); placeClam(); }
    carrying = null; banked = 0; golds = 0; misses = 0; moves = 0; score = 0;
    turnT = TURN_T; animT = 0; walT = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; caughtBy = null;
    finished = false; ok = false; endWait = 0; halfShown = false;
    bestAtStart = game.best || 0;
    flakes = [];
    for (var i = 0; i < 24; i++) flakes.push({ x: game.random(0, W), y: game.random(0, H), v: game.random(40, 110) });
  }

  // ── 共通ロジック(本番とデモで共用) ─────────────────────
  function canAct() { return !finished && hitStop <= 0 && ready <= 0 && animT <= 0 && walT <= 0; }

  function stepToward(tc, tr) {
    var dc = tc - fox.c, dr = tr - fox.r;
    if (dc === 0 && dr === 0) return [fox.c, fox.r];
    if (Math.abs(dr) >= Math.abs(dc)) return [fox.c, fox.r + (dr > 0 ? 1 : -1)];
    return [fox.c + (dc > 0 ? 1 : -1), fox.r];
  }

  // 戻り値: 'move' | 'wait' | 'caught' | 'blocked'
  function takeTurn(nc, nr) {
    if (!canAct()) return 'blocked';
    if (!valid(nc, nr)) return 'blocked';
    var waiting = nc === fox.c && nr === fox.r;
    moves++;
    if (!waiting) {
      var dw = isDanger(nc, nr);
      fox.fromC = fox.c; fox.fromR = fox.r;
      if (nc !== fox.c) fox.face = nc > fox.c ? 1 : -1;
      fox.c = nc; fox.r = nr; animT = FOX_ANIM;
      if (dw) { caught(dw); return 'caught'; }
      if (!carrying) {
        var cl = clamAt(nc, nr);
        if (cl) {
          clams.splice(clams.indexOf(cl), 1);
          carrying = cl;
          game.audio.play('se_coin', 0.45);
          game.fx.popup(cl.gold ? '+500' : '+200', cellCX(nc), cellCY(nr) - 90, { color: C.gold, size: 40 });
        }
      }
      if (isDen(nc, nr) && carrying) bank();
    } else {
      fox.fromC = fox.c; fox.fromR = fox.r;
    }
    if (finished) return 'move';
    // セイウチが1歩ずつ進む
    walT = WAL_ANIM + (waiting ? 0 : FOX_ANIM);
    for (var i = 0; i < walruses.length; i++) {
      var w = walruses[i];
      if (!w.awake) continue;
      w.fromC = wCell(w)[0]; w.fromR = wCell(w)[1];
      w.i = (w.i + 1) % w.route.length;
    }
    for (var j = 0; j < walruses.length; j++) {
      var ww = walruses[j];
      if (ww.awake && wCell(ww)[0] === fox.c && wCell(ww)[1] === fox.r) { caught(ww); return 'caught'; }
    }
    turnT = TURN_T;
    return waiting ? 'wait' : 'move';
  }

  function bank() {
    banked++;
    if (carrying.gold) golds++;
    score += carrying.gold ? 500 : 200;
    carrying = null;
    game.feedback.good(cellCX(DEN.c), cellCY(DEN.r) - 80, { text: 'GOOD', color: C.good });
    if (banked === 1 && !walruses[1].awake) {
      // 2頭目が目を覚ます(予告: 次のマスが赤く光る)
      walruses[1].awake = true;
      game.audio.tone(110, 0.4, { wave: 'sawtooth', volume: 0.06 });
    }
    if (!halfShown && banked === 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup(banked + ' / ' + NEEDED, W / 2, MID_Y, { color: C.gold, size: 64 });
    }
    placeClam();
    if (banked >= NEEDED) finish(true);
  }

  function caught(w) {
    misses++;
    hitStop = 0.6; caughtBy = w;
    game.feedback.bad(cellCX(fox.c), cellCY(fox.r) - 80, { text: 'MISS', shake: 14 });
  }

  function afterCaught() {
    if (carrying) { clams.push(carrying); carrying = null; }
    caughtBy = null;
    fox.c = DEN.c; fox.r = DEN.r; fox.fromC = DEN.c; fox.fromR = DEN.r;
    turnT = TURN_T;
    if (misses >= MAX_MISS) finish(false);
  }

  function finish(win) {
    if (finished) return;
    finished = true; ok = win; endWait = 1.3;
    if (win) score += Math.round(timeLeft * 50) + (MAX_MISS - misses) * 200;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    if (win) {
      game.audio.play('se_success', 0.6);
      game.fx.flash(C.gold, 0.25);
      game.fx.burst(cellCX(DEN.c), cellCY(DEN.r), { color: C.gold, count: 32, speed: 520 });
    } else game.audio.play('se_failure', 0.6);
  }

  function stepBoard(dt, countTime) {
    for (var i = 0; i < flakes.length; i++) { flakes[i].y += flakes[i].v * dt; if (flakes[i].y > H) { flakes[i].y = -10; flakes[i].x = game.random(0, W); } }
    if (animT > 0) animT -= dt;
    if (walT > 0) walT -= dt;
    if (finished) return;
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) afterCaught();
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
      return;
    }
    if (countTime) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(cellCX(fox.c), cellCY(fox.r) - 80, { text: 'TIME UP' });
        finish(false);
        return;
      }
    }
    if (animT <= 0 && walT <= 0) {
      turnT -= dt;
      if (turnT <= 0) {
        // 迷いすぎ: 手番を飛ばされる(その場で待つ扱い)
        game.audio.tone(200, 0.12, { wave: 'square', volume: 0.05 });
        takeTurn(fox.c, fox.r);
      }
    }
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawCube(x, y, s, top, front, side, h) {
    game.draw.rect(x, y + s - h * 0.2, s, h, front, 1);
    game.draw.rect(x + s - 10, y + 6, 10, s - 6, side, 1);
    game.draw.rect(x, y, s - 10, s - h * 0.2, top, 1);
    game.draw.rect(x, y, s - 10, 5, C.white, 0.7);
  }

  function drawBoard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sea1], [0.35, C.sea2], [1, C.sea1]]);
    // オーロラ(常時ゆらぐ)
    for (var a = 0; a < 18; a++) {
      var ax = a * 62;
      var ah = 90 + 50 * Math.sin(t * 0.9 + a * 0.5);
      game.draw.rect(ax, 40 + Math.sin(t * 1.3 + a * 0.4) * 20, 62, ah, a % 2 ? C.aur1 : C.aur2, 0.12 + 0.06 * Math.sin(t * 2 + a));
    }
    for (var f = 0; f < flakes.length; f++) game.draw.rect(flakes[f].x, flakes[f].y, 6, 6, C.white, 0.6);
    // 波のきらめき
    for (var wv = 0; wv < 10; wv++) game.draw.rect((wv * 137 + t * 30) % W, GY - 40 + (wv * 211) % (ROWS * CS + 200), 50, 4, C.white, 0.15);
    // 遠くの浮氷のツノメドリ(演出)
    var pfY = GY + ROWS * CS + 30;
    drawCube(W - 190, pfY, 110, C.top, C.front, C.side, 30);
    game.draw.sprite(PUFFIN[Math.floor(t * 2) % 2], { k: '#101820', w: '#ffffff', o: '#ff8a3a' }, W - 145 + Math.sin(t) * 6, pfY + 25 + Math.sin(t * 3) * 4, 10, { anchor: 'center' });
    // 巣穴の雪だまりと、待っている弟妹(常時bob)
    var snowY = GY + (DEN.r + 1) * CS;
    game.draw.gradient(snowY, H, ['#f4f0e8', '#c8d8e8']);
    game.draw.rect(0, snowY, W, 8, C.white, 0.8);
    for (var kit = 0; kit < 3; kit++) {
      var kx = W / 2 - 150 + kit * 150, ky = snowY + 120 + Math.abs(Math.sin(t * 3 + kit)) * -14;
      game.draw.sprite(FOX[kit % 2], FOX_PAL, kx, ky, 7, { anchor: 'center', flipX: kit === 2 });
    }
    // 流氷の盤
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GX + c * CS + 8, y = GY + r * CS + 8 + Math.sin(t * 1.4 + c + r * 0.7) * 3;
        drawCube(x, y, CS - 16, C.top, C.front, C.side, 34);
      }
    }
    // 巣穴(雪だまり)
    var dx = GX + DEN.c * CS + 8, dy = GY + DEN.r * CS + 8;
    drawCube(dx, dy, CS - 16, C.den, C.denD, '#a89a84', 34);
    game.draw.circle(dx + (CS - 16) / 2 - 5, dy + 70, 44, '#3a2a20', 1);
    game.draw.circle(dx + (CS - 16) / 2 - 5, dy + 70, 60, C.gold, 0.12 + 0.08 * Math.sin(t * 4));
    // 危険マス(今いるマス+次のマス)
    var blink = Math.floor(t * 6) % 2 === 0;
    for (var i = 0; i < walruses.length; i++) {
      var w = walruses[i];
      if (!w.awake) continue;
      var n = wNext(w);
      var nx = GX + n[0] * CS + 8, ny = GY + n[1] * CS + 8;
      game.draw.rect(nx, ny, CS - 26, CS - 30, C.danger, blink ? 0.45 : 0.3);
      for (var sp = 0; sp < 4; sp++) {
        game.draw.rect(nx + 12 + sp * 36, ny + 10, 14, 8, C.danger, 1);
        game.draw.rect(nx + 16 + sp * 36, ny + 2, 6, 8, C.danger, 1);
      }
      var cu = wCell(w);
      game.draw.rect(GX + cu[0] * CS + 8, GY + cu[1] * CS + 8, CS - 26, CS - 30, C.danger, 0.3);
    }
    // 貝
    for (var k = 0; k < clams.length; k++) {
      var cl = clams[k];
      var cx = cellCX(cl.c), cy = cellCY(cl.r) - 10 + Math.sin(t * 3 + k) * 5;
      game.draw.circle(cx, cy, 50, C.white, 0.15 + 0.12 * Math.sin(t * 6 + k));
      game.draw.sprite(CLAM, { c: cl.gold ? C.gold : '#f0c8b0', C: cl.gold ? '#fff0a0' : '#ffe8d8' }, cx, cy, 13, { anchor: 'center' });
    }
  }

  function lerpPos(fc, fr, c, r, k) {
    return { x: cellCX(fc) + (cellCX(c) - cellCX(fc)) * k, y: cellCY(fr) + (cellCY(r) - cellCY(fr)) * k };
  }

  function drawActors() {
    var t = game.time.elapsed;
    var hl = hitStop > 0;
    for (var i = 0; i < walruses.length; i++) {
      var w = walruses[i];
      var cu = wCell(w);
      var k = w.awake && walT > 0 ? 1 - Math.min(1, walT / WAL_ANIM) : 1;
      var p = lerpPos(w.fromC, w.fromR, cu[0], cu[1], w.awake ? k : 1);
      var face = wNext(w)[0] < cu[0];
      var alpha = w.awake ? 1 : 0.35;
      var bob = Math.sin(t * 2 + i) * 4;
      game.draw.sprite(WALRUS[Math.floor(t * 2 + i) % 2], WAL_PAL, p.x, p.y - 16 + bob, 11, { anchor: 'center', flipX: face, alpha: alpha });
      if (!w.awake) game.draw.sprite(ZZ, { z: C.white }, p.x + 60, p.y - 80 - (t * 20) % 30, 7, { anchor: 'center', alpha: 0.8 });
      if (hl && caughtBy === w) {
        game.draw.circle(p.x, p.y, 100, C.white, 0.45);
        game.draw.sprite(WALRUS[0], { b: C.white, k: C.white, m: C.white, w: C.white }, p.x, p.y - 16, 13, { anchor: 'center', flipX: face, alpha: 0.6 });
      }
    }
    var fk = animT > 0 ? 1 - animT / FOX_ANIM : 1;
    var fp = lerpPos(fox.fromC, fox.fromR, fox.c, fox.r, fk);
    var hop = animT > 0 ? -Math.sin(fk * Math.PI) * 40 : Math.sin(t * 3) * 4;
    var sway = animT > 0 ? 0 : Math.sin(t * 1.6) * 4;
    game.draw.sprite(FOX[Math.floor(t * 3) % 2], FOX_PAL, fp.x + sway, fp.y - 10 + hop, 11, { anchor: 'center', flipX: fox.face < 0, alpha: hl && Math.floor(t * 12) % 2 ? 0.4 : 1 });
    if (carrying) game.draw.sprite(CLAM, { c: carrying.gold ? C.gold : '#f0c8b0', C: '#ffe8d8' }, fp.x + sway, fp.y - 70 + hop, 8, { anchor: 'center' });
    // 手番の残り(狐のまわりの点が減る)
    if (state === S.PLAYING && canAct()) {
      var dots = Math.ceil(12 * Math.max(0, turnT / TURN_T));
      for (var d = 0; d < dots; d++) {
        var ang = d / 12 * Math.PI * 2 - Math.PI / 2;
        game.draw.rect(fp.x + Math.cos(ang) * 78 - 5, fp.y + Math.sin(ang) * 78 - 5, 10, 10, turnT < 1 ? C.danger : C.gold, 1);
      }
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(CLAM, i < banked ? { c: '#f0c8b0', C: '#ffe8d8' } : { c: '#3a5a7a', C: '#4a6a8a' }, 90 + i * 100, 230, 12, { anchor: 'center' });
    txt(banked + ' / ' + NEEDED, 440, 250, 44, C.white);
    for (var m = 0; m < MAX_MISS; m++) game.draw.sprite(FOX[0], m < misses ? { w: '#4a6a8a', k: '#081428', n: '#081428', t: '#4a6a8a' } : FOX_PAL, W - 80 - m * 110, 230, 6, { anchor: 'center' });
    var lowTime = timeLeft < 6 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 300, W - 120, 14, '#000000', 0.4);
    game.draw.rect(60, 300, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.danger : C.aur1, 1);
  }

  // ── ATTRACTデモ(実ロジック): 安全なマスを選んで進み、一度だけ赤いマスに踏み込んで捕まる ──
  var DEMO_CYC = 9;
  var demo = { t: 0, gx: W / 2, gy: MID_Y, press: false, cool: 0, reckless: false, done: false };
  function bfsDist(c0, r0, gc, gr) {
    var seen = {}, q = [[c0, r0, 0]];
    seen[c0 + ',' + r0] = true;
    while (q.length) {
      var cur = q.shift();
      if (cur[0] === gc && cur[1] === gr) return cur[2];
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nc = cur[0] + nb[i][0], nr = cur[1] + nb[i][1], key = nc + ',' + nr;
        if (!seen[key] && valid(nc, nr)) { seen[key] = true; q.push([nc, nr, cur[2] + 1]); }
      }
    }
    return 99;
  }
  function demoGoal() {
    if (carrying || !clams.length) return [DEN.c, DEN.r];
    if (demo.reckless) for (var g = 0; g < clams.length; g++) if (clams[g].gold) return [clams[g].c, clams[g].r];
    var best = clams[0], bd = 1e9;
    for (var i = 0; i < clams.length; i++) {
      var d = bfsDist(fox.c, fox.r, clams[i].c, clams[i].r);
      if (d < bd) { bd = d; best = clams[i]; }
    }
    return [best.c, best.r];
  }
  function demoChoose() {
    var goal = demoGoal();
    var opts = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    var best = null, bestScore = 1e9, greedy = null, greedyScore = 1e9;
    for (var i = 0; i < opts.length; i++) {
      var nc = fox.c + opts[i][0], nr = fox.r + opts[i][1];
      if (!valid(nc, nr)) continue;
      var d = bfsDist(nc, nr, goal[0], goal[1]) + (i === 0 ? 0.5 : 0);
      if (d < greedyScore && i !== 0) { greedyScore = d; greedy = [nc, nr]; }
      var danger = i === 0 ? walruses.some(function(w) { return w.awake && wNext(w)[0] === nc && wNext(w)[1] === nr; }) : !!isDanger(nc, nr);
      if (!danger && d < bestScore) { bestScore = d; best = [nc, nr]; }
    }
    if (demo.reckless && greedy && isDanger(greedy[0], greedy[1])) { demo.reckless = false; return greedy; }
    return best || [fox.c, fox.r];
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initGame(true); ready = 0; misses = 0;
      // 1手目の後にセイウチの「次のマス」が通り道に来る配置(失敗例→その後に成功例)
      walruses[0].i = 3; walruses[0].fromC = ROUTE_A[3][0]; walruses[0].fromR = ROUTE_A[3][1];
      demo.reckless = true; demo.done = false; demo.cool = 0.5;
    }
    demo.cool -= dt;
    demo.press = demo.cool > 0.25;
    if (canAct() && demo.cool <= 0) {
      var ch = demoChoose();
      demo.gx = cellCX(ch[0]); demo.gy = cellCY(ch[1]) + 40;
      takeTurn(ch[0], ch[1]);
      demo.cool = 0.55;
    }
    stepBoard(dt, false);
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame(false);
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    var tc = Math.floor((x - GX) / CS), tr = Math.floor((y - GY) / CS);
    tr = Math.max(0, Math.min(DEN.r, tr));
    tc = Math.max(0, Math.min(COLS - 1, tc));
    var step = stepToward(tc, tr);
    var res = takeTurn(step[0], step[1]);
    if (res === 'move') {
      game.audio.play('se_jump', 0.25);
      game.fx.burst(cellCX(step[0]), cellCY(step[1]) + 40, { color: C.top, count: 5, speed: 140 });
    } else if (res === 'wait') {
      game.audio.play('se_tap', 0.2);
    } else if (res === 'blocked') {
      game.audio.tone(180, 0.05, { wave: 'square', volume: 0.04 });
    }
  });

  // ── メインループ(1本だけ) ─────────────────────────────
  game.onUpdate(function(dt) {
    if (fox === undefined) initGame(true);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBoard(); drawActors();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      var lb = Math.sin(game.time.elapsed * 2) * 6;
      txt(GAME_TITLE, W / 2, H * 0.07 + lb, 80, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.11, 34, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, BOTTOM_Y + 60, 44, C.gold);
      else txt('INSERT COIN', W / 2, BOTTOM_Y + 60, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      stepBoard(dt, false);
      drawBoard(); drawActors();
      var t = game.time.elapsed;
      game.draw.rect(0, MID_Y - 220, W, 440, C.ink, 0.6);
      if (ok) {
        for (var s = 0; s < 6; s++) game.draw.rect(90 + s * 170, 0, 40, H, C.aur1, 0.06 + 0.05 * Math.sin(t * 4 + s));
        txt('CLEAR', W / 2, MID_Y - 100 + Math.sin(t * 5) * 8, 120, C.gold);
      } else {
        txt('GAME OVER', W / 2, MID_Y - 100, 100, C.danger);
        txt('あと' + (NEEDED - banked) + '枚!', W / 2, MID_Y - 10, 56, C.white);
      }
      txt('SCORE ' + score, W / 2, MID_Y + 80, 54, C.white);
      if (ok && score > bestAtStart) txt('NEW RECORD', W / 2, MID_Y + 170, 52, C.gold);
      else txt('BEST ' + bestAtStart, W / 2, MID_Y + 170, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, BOTTOM_Y + 60, 38, C.white);
      return;
    }

    // PLAYING
    if (finished) {
      endWait -= dt;
      stepBoard(dt, false);
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { clams: banked, gold: golds, moves: moves, caught: misses };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else {
      stepBoard(dt, true);
    }
    drawBoard(); drawActors(); drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, MID_Y, 100, C.gold);
    if (finished) txt(ok ? 'FINISH' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, MID_Y, 92, ok ? C.gold : C.danger);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['E5', 1],
      ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['F5', 0.5], ['E5', 1.5], ['R', 0.5]
    ], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['Bb2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

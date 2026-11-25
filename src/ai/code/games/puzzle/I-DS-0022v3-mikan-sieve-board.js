// I-DS-0022v3-mikan-sieve-board.js
// みかん選果板 — ベルトを転がってくる大きさ違いのみかんから、選別板の穴にぴったり通る1個をつまんで穴に落とす
// 操作: ベルト上のみかんを指で押さえて持ち上げ、上の選別板の穴の上まで運んで離す。穴以外で離すとベルトに戻る(ペナルティなし)
// 終わり: 20秒以内に8個を穴に通せばCLEAR。大きすぎて穴に詰まる/小さすぎて素通りするのが3回、または時間切れでGAME OVER
// @mechanic: gap_fit
// @theme: winter_mikan_grading_shed
// 世界観: 冬の山あいの選果小屋で、みかん農家のおじさんがベルトを流れるみかんから選別板の穴にちょうど合う玉を選び、等級ごとの箱へ通していく(2個ごとに板が替わり穴の大きさが変わる)
// 残るもの: 正誤(CLEAR/GAME OVER) + 通した個数・ぴったり数・残り秒のスコア
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、日焼けした液晶の色味、太く単純な形で密度を抑える
  var STYLE = { bg: ['#c9c6a4', '#a9a888'], main: ['#d9893e', '#7f8c58', '#8a6b48'], accent: ['#efe2a8', '#5c4a66'] };
  var V = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], mikan: STYLE.main[0], mikanDk: '#a8642c', leaf: STYLE.main[1], wood: STYLE.main[2], woodDk: '#5e4630',
    pale: STYLE.accent[0], ink: STYLE.accent[1], hole: '#3a2e2a', ng: '#c8503c', ok: '#6f9a4a', belt: '#6e6a5c', beltDk: '#4c4a40',
  };

  var GAME_TITLE = 'MIKAN SIEVE';
  var TIME_LIMIT = 20;
  var NEEDED = 8;
  var MISS_MAX = 3;
  var TOL = 4;
  var GRADES = [60, 48, 72, 54];
  var HX = W * 0.5, HY = Math.round(H * 0.36);
  var BY = Math.round(H * 0.745);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var holeR, grade, belt, held, fits, perfects, misses, combo, maxCombo, score, finalScore;
  var timeLeft, readyT, stopT, stopObj, fin, cleared, postT, spawnT, sinceFit, boardT, nodT, sadT, warnT, crateN, playT;

  // みかん農家のおじさん(毛糸帽+首タオル)
  var FARMER_A = ['..rrrrrr..', '.rrrrrrrr.', '.rpppppr..', '..ffffff..', '..fkffkf..', '..ffmmff..', '..wwwwww..', '.jjjjjjjj.', 'fjjjjjjjjf', '.jjjjjjjj.', '..bb..bb..'];
  var FARMER_B = ['..rrrrrr..', '.rrrrrrrr.', '.rpppppr..', '..ffffff..', '..fkffkf..', '..ffmmff..', '..wwwwww..', '.jjjjjjjj.', '.jjjjjjjj.', 'fjjjjjjjjf', '..bb..bb..'];
  var FARMER_NOD = ['..........', '..rrrrrr..', '.rrrrrrrr.', '.rpppppr..', '..ffffff..', '..fkffkf..', '..fkmmkf..', 'f.wwwwww.f', '.jjjjjjjj.', '.jjjjjjjj.', '..bb..bb..'];
  var FARMER_SAD = ['..rrrrrr..', '.rrrrrrrr.', '.rpppppr..', '..ffffff..', '..fkffkf..', '..fkkkkf..', '..wwwwww..', '.jjjjjjjj.', 'fjjjjjjjjf', '.jjjjjjjj.', '..bb..bb..'];
  var FARMER_PAL = { r: '#b0584a', p: '#d8c890', f: '#e2b890', k: '#3a2e2a', m: '#a0605a', w: '#efe2a8', j: '#5c6a86', b: '#4a3a30' };
  var LEAF = ['..gg', '.gg.', 'g...'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000040', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    grade = 0; holeR = GRADES[0]; belt = []; held = null;
    fits = 0; perfects = 0; misses = 0; combo = 0; maxCombo = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopObj = null; fin = false; cleared = false; postT = 0;
    spawnT = 0; sinceFit = 0; boardT = 0; nodT = 0; sadT = 0; warnT = 0; crateN = 0; playT = 0;
    // 開始時にベルトへ4玉(うち1つは必ず合う)
    var offs = [14, 0, -12, 8];
    for (var i = 0; i < offs.length; i++) belt.push(mk(260 + i * 210, holeR + offs[i]));
  }

  function mk(x, r) { return { x: x, y: BY, r: r, st: 'belt', t: 0, vy: 0, flash: 0, rot: game.random(0, 6) }; }

  function beltSpeed() { return 150 + grade * 35; }

  function spawn() {
    var set = grade < 2 ? [-18, -11, 0, 9, 16] : [-10, -6, 0, 6, 10];
    var off = set[Math.floor(game.random(0, set.length)) % set.length];
    var hasFit = false;
    for (var i = 0; i < belt.length; i++) if (belt[i].st === 'belt' && Math.abs(belt[i].r - holeR) <= TOL) hasFit = true;
    if (sinceFit >= 2 || (!hasFit && sinceFit >= 1)) off = 0;
    sinceFit = off === 0 ? 0 : sinceFit + 1;
    belt.push(mk(W + 90, holeR + off));
  }

  function grab(m) {
    held = m; m.st = 'held';
    game.audio.play('se_tap', 0.3);
    game.fx.burst(m.x, m.y, { color: V.pale, count: 4, speed: 120 });
  }

  // 穴の上で離したときの判定(本番もデモも同じ処理)
  function judge(m) {
    held = null;
    var diff = m.r - holeR;
    if (Math.abs(diff) <= TOL) {
      m.st = 'drop'; m.t = 0; m.x = HX; m.y = HY;
      fits++; crateN++;
      combo = combo + 1; if (combo > maxCombo) maxCombo = combo;
      var perfect = Math.abs(diff) <= 1.5;
      if (perfect) perfects++;
      var pts = (perfect ? 150 : 100) * Math.min(3, combo);
      score += pts;
      nodT = 0.7;
      game.feedback.good(HX, HY - 80, { text: perfect ? 'PERFECT' : 'GOOD', color: V.ok, size: 60 });
      game.audio.play('se_coin', 0.35);
      game.fx.popup('+' + pts, HX + 150, HY - 40, { color: V.mikan, size: 44 });
      if (mode === S.PLAYING && fits === NEEDED / 2) {
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('あと' + (NEEDED - fits) + '個!', W / 2, H * 0.27, { color: V.ink, size: 64 });
      }
      if (mode === S.PLAYING && fits >= NEEDED) { stopT = 0.45; stopObj = { kind: 'win' }; return; }
      if (fits % 2 === 0) { boardT = 0.6; game.audio.play('se_jump', 0.3); }
      return;
    }
    combo = 0; misses++; sadT = 0.9;
    if (diff > 0) { m.st = 'stuck'; m.t = 0; m.x = HX; m.y = HY - 6; }
    else { m.st = 'loose'; m.t = 0; m.x = HX; m.y = HY; }
    m.flash = 0.5;
    if (mode === S.PLAYING && misses >= MISS_MAX) {
      stopT = 0.5; stopObj = { kind: 'miss', m: m };
      game.fx.flash('#ffffff', 0.15);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    game.feedback.bad(HX, HY - 90, { text: 'MISS', color: V.ng, size: 58 });
  }

  function dropBack(m) {
    held = null; m.st = 'back'; m.vy = 0;
    game.audio.tone('E4', 0.05, { wave: 'triangle', volume: 0.07 });
  }

  function overHole(m) { return Math.hypot(m.x - HX, m.y - HY) < holeR + 55; }

  function stepBelt(dt, sp) {
    for (var i = belt.length - 1; i >= 0; i--) {
      var m = belt[i];
      if (m.flash > 0) m.flash -= dt;
      if (m.st === 'belt') { m.x -= sp * dt; m.rot -= sp * dt / m.r; if (m.x < -90) belt.splice(i, 1); }
      else if (m.st === 'back') {
        m.vy += 2600 * dt; m.y += m.vy * dt;
        if (m.y >= BY) { m.y = BY; m.st = 'belt'; m.vy = 0; }
      } else if (m.st === 'drop') { m.t += dt; if (m.t > 0.45) belt.splice(i, 1); }
      else if (m.st === 'stuck') {
        m.t += dt;
        if (m.t > 0.7) { m.st = 'back'; m.vy = -300; m.x = HX + 120; }
      } else if (m.st === 'loose') { m.t += dt; if (m.t > 0.6) belt.splice(i, 1); }
    }
    if (boardT > 0) { boardT -= dt; if (boardT <= 0.3 && holeR !== GRADES[Math.floor(fits / 2) % GRADES.length]) { grade = Math.floor(fits / 2); holeR = GRADES[grade % GRADES.length]; } }
    if (nodT > 0) nodT -= dt;
    if (sadT > 0) sadT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 30 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.48 + (i % 2) * 140, { color: i % 2 ? V.mikan : V.pale, count: 18, speed: 520 });
      game.fx.flash(V.pale, 0.25);
    }
  }

  function resolveStop() {
    var o = stopObj; stopObj = null;
    if (!o) return;
    if (o.kind === 'win') { ending(true); return; }
    game.feedback.bad(HX, HY - 90, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: V.ng, size: 62 });
    ending(false);
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (!canPlay()) return;
    var best = null, bd = 1e9;
    for (var i = 0; i < belt.length; i++) {
      var m = belt[i];
      if (m.st !== 'belt') continue;
      var d = Math.hypot(m.x - x, m.y - y);
      if (d < m.r + 40 && d < bd) { bd = d; best = m; }
    }
    if (best) grab(best);
    else game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onMove(function(x, y) {
    if (!canPlay() || !held) return;
    held.x = x; held.y = y - 40;
    if (overHole(held) && boardT <= 0) game.audio.tone(300 + Math.abs(held.r - holeR) * 12, 0.02, { wave: 'square', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (!held) return;
    if (!canPlay()) { dropBack(held); return; }
    if (overHole(held) && boardT <= 0) judge(held);
    else { game.audio.play('se_tap', 0.1); dropBack(held); }
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function shed(t) {
    game.draw.gradient(0, H, [[0, '#8f9a9c'], [0.22, V.bg], [0.62, V.bg2], [1, '#8c8a70']]);
    // 小屋の窓と雪
    for (var w = 0; w < 3; w++) {
      var wx = 120 + w * 320;
      game.draw.rect(wx, H * 0.13, 200, 150, V.woodDk);
      game.draw.rect(wx + 12, H * 0.13 + 12, 176, 126, '#b8c4c8');
      for (var s = 0; s < 4; s++) game.draw.rect(wx + 20 + ((s * 47 + t * 30) % 160), H * 0.13 + 16 + ((s * 31 + t * 60) % 110), 8, 8, '#f4f4ec');
      game.draw.rect(wx + 96, H * 0.13 + 12, 8, 126, V.woodDk);
    }
    // 奥に積んだ木箱
    for (var c = 0; c < 4; c++) {
      game.draw.rect(60 + c * 260, H * 0.565, 200, 90, V.wood, 0.6);
      for (var q = 0; q < 4; q++) game.draw.circle(95 + c * 260 + q * 44, H * 0.565 + 10, 20, V.mikan, 0.5);
    }
  }

  function drawBoard(t) {
    var off = 0;
    if (boardT > 0) { var u = 1 - boardT / 0.6; off = u < 0.5 ? -u * 2 * 900 : (1 - u) * 2 * 900; }
    var bx = 120 + off;
    // 板の脚と箱
    game.draw.rect(bx + 40, HY + 40, 30, 180, V.woodDk);
    game.draw.rect(bx + 770, HY + 40, 30, 180, V.woodDk);
    game.draw.rect(HX - 150 + off, Math.round(H * 0.43), 300, 140, V.wood);
    game.draw.rect(HX - 150 + off, Math.round(H * 0.43), 300, 20, V.woodDk);
    for (var k = 0; k < Math.min(crateN, 12); k++) game.draw.circle(HX - 110 + off + (k % 6) * 44, Math.round(H * 0.43) + 100 - Math.floor(k / 6) * 34, 22, V.mikan);
    // 選別板
    game.draw.rect(bx, HY - 60, 840, 120, V.woodDk);
    game.draw.rect(bx + 8, HY - 52, 824, 104, V.wood);
    for (var g = 0; g < 4; g++) game.draw.rect(bx + 20, HY - 40 + g * 26, 800, 3, V.woodDk, 0.35);
    // 穴(等級の印=穴の横の丸ポチ)
    var pulse = 0.5 + Math.sin(t * 6) * 0.3;
    game.draw.circle(HX + off, HY, holeR + 10, V.pale, held && overHole(held) ? 0.9 : pulse);
    game.draw.circle(HX + off, HY, holeR, V.hole);
    for (var p = 0; p <= grade % GRADES.length; p++) game.draw.circle(HX + off + holeR + 50 + p * 30, HY - 30, 9, V.ink);
  }

  function drawMikan(m, t) {
    var big = stopObj && stopT > 0 && stopObj.m === m;
    var wf = (m.flash > 0 && Math.floor(m.flash * 20) % 2 === 0) || (big && Math.floor(t * 16) % 2 === 0);
    var r = m.r * (big ? 1.35 : 1), x = m.x, y = m.y;
    if (m.st === 'drop') { var k = Math.max(0, 1 - m.t / 0.45); r = m.r * k; y = HY + (1 - k) * 60; }
    if (m.st === 'loose') { x = HX + Math.sin(m.t * 60) * (holeR - m.r) * 0.7; y = HY + m.t * 220; r = m.r * Math.max(0.2, 1 - m.t * 1.2); }
    if (m.st === 'stuck') { x = HX + Math.sin(m.t * 40) * 6; }
    if (r < 2) return;
    if (m.st === 'belt' || m.st === 'held' || m.st === 'back') game.draw.circle(x + 8, (m.st === 'held' ? y + 70 : BY + m.r * 0.8), r * 0.8, '#000000', 0.15);
    game.draw.circle(x, y, r + 5, V.mikanDk);
    game.draw.circle(x, y, r, wf ? '#ffffff' : V.mikan);
    game.draw.circle(x - r * 0.35, y - r * 0.35, r * 0.25, V.pale, 0.6);
    for (var d = 0; d < 3; d++) { var a = m.rot + d * 2.1; game.draw.circle(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, 3, V.mikanDk, 0.6); }
    game.draw.sprite(LEAF, { g: V.leaf }, x + 6, y - r - 6, Math.max(4, r / 9), { anchor: 'center' });
  }

  function drawBelt(t) {
    game.draw.rect(0, BY + 44, W, 70, V.beltDk);
    game.draw.rect(0, BY + 50, W, 56, V.belt);
    var sh = (t * beltSpeed()) % 60;
    for (var x = -60; x < W + 60; x += 60) game.draw.rect(x - sh + 60, BY + 54, 6, 48, V.beltDk);
    for (var r = 0; r < 9; r++) game.draw.circle(60 + r * 120, BY + 140, 22, V.beltDk);
    // 選び直しのかご(左端)
    game.draw.rect(-20, BY + 120, 150, 120, V.wood);
    game.draw.rect(-20, BY + 120, 150, 16, V.woodDk);
  }

  function drawFarmer(t) {
    var fr;
    if (sadT > 0 || (fin && !cleared)) fr = FARMER_SAD;
    else if (nodT > 0 || (fin && cleared)) fr = FARMER_NOD;
    else fr = Math.floor(t * 2) % 2 ? FARMER_A : FARMER_B;
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 26 : Math.sin(t * 2.4) * 4;
    game.draw.circle(900, H * 0.905, 90, '#000000', 0.12);
    game.draw.sprite(fr, FARMER_PAL, 900, H * 0.85 + hop, 17, { anchor: 'center', flipX: true });
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 36, W - 140, 30, V.beltDk);
    game.draw.rect(76, 42, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? V.ng : V.mikan);
    out(fits + ' / ' + NEEDED, W / 2, 118, 52, V.ink);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 178, 22, m < misses ? V.ng : V.pale);
    out('' + score, 170, 132, 38, V.woodDk);
  }

  function drawScene(t) {
    shed(t);
    drawBoard(t);
    drawBelt(t);
    for (var i = 0; i < belt.length; i++) if (belt[i] !== held) drawMikan(belt[i], t);
    drawFarmer(t);
    if (held) drawMikan(held, t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.05);
  }

  // ---- ATTRACT: 本物の grab()/judge() で ぴったり玉を通す → 大きい玉で詰まる ----
  var demo = { t: 0, x: W * 0.5, y: H * 0.9, press: false, step: 0, m: null, sx: 0, sy: 0 };
  function carry(u) {
    var k = Math.min(1, u); k = k * k * (3 - 2 * k);
    demo.m.x = demo.sx + (HX - demo.sx) * k;
    demo.m.y = demo.sy + (HY - 50 - demo.sy) * k + Math.sin(k * Math.PI) * -60;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      belt = [mk(300, holeR + 15), mk(520, holeR), mk(740, holeR - 13), mk(940, holeR + 8)];
      demo.step = 0; demo.m = null;
    }
    // デモのベルトはゆっくり
    stepBelt(dt, 30);
    var tx = demo.x, ty = demo.y;
    demo.press = false;
    if (cyc < 0.7) { demo.m = belt[1]; tx = demo.m.x; ty = demo.m.y; }
    else if (cyc < 1.5) {
      if (demo.step === 0) { demo.step = 1; grab(demo.m); demo.sx = demo.m.x; demo.sy = demo.m.y; }
      carry((cyc - 0.7) / 0.6);
      tx = demo.m.x; ty = demo.m.y + 40; demo.press = true;
    } else if (cyc < 2.3) {
      if (demo.step === 1) { demo.step = 2; judge(demo.m); demo.m = belt[0]; }
      tx = demo.m.x; ty = demo.m.y;
    } else if (cyc < 3.1) {
      if (demo.step === 2) { demo.step = 3; grab(demo.m); demo.sx = demo.m.x; demo.sy = demo.m.y; }
      carry((cyc - 2.3) / 0.6);
      tx = demo.m.x; ty = demo.m.y + 40; demo.press = true;
    } else {
      if (demo.step === 3) { demo.step = 4; judge(demo.m); }
      tx = W * 0.5; ty = H * 0.88;
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    demo.y += (ty - demo.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 5, 92, V.mikan);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, V.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.965, 48, V.ink);
      else out('TAP TO START', W / 2, H * 0.965, 40, V.woodDk);
      return;
    }

    if (mode === S.RESULT) {
      stepBelt(dt, 0);
      drawScene(t);
      game.draw.rect(90, H * 0.24, W - 180, 520, V.pale, 0.93);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.29, 96, cleared ? V.ok : V.ng);
      out('SCORE ' + finalScore, W / 2, H * 0.35, 60, V.ink);
      out(fits + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.40, 42, V.woodDk);
      if (finalScore > game.best && cleared) out('NEW RECORD', W / 2, H * 0.45, 56, V.mikan);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.45, 42, V.ink);
      if (!cleared) out('あと' + (NEEDED - fits) + '個!', W / 2, H * 0.21, 64, V.ng);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.965, 40, V.woodDk);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepBelt(dt, 0);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { fits: fits, perfect: perfects, misses: misses, maxCombo: maxCombo };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.6, 1.0 - grade * 0.12); }
      stepBelt(dt, beltSpeed());
      if (timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        if (held) dropBack(held);
        stopT = 0.45; stopObj = { kind: 'time' };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopT > 0 && stopObj.kind !== 'miss') game.draw.circle(HX, HY, holeR + 20 + (0.45 - stopT) * 300, '#ffffff', 0.35);
    // 開始直後のお手本: 合う玉に白い輪+手
    if (!fin && readyT <= 0 && fits === 0 && playT < 1.6 && !held) {
      for (var i = 0; i < belt.length; i++) {
        var m = belt[i];
        if (m.st === 'belt' && Math.abs(m.r - holeR) <= TOL) {
          game.draw.circle(m.x, m.y, m.r + 18 + Math.sin(t * 10) * 6, '#ffffff', 0.35);
          game.draw.hand(m.x, m.y + 20, { press: true, scale: 11, alpha: 0.5 });
          break;
        }
      }
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 120, V.ink);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 2],
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 1], ['A4', 0.5], ['A4', 1.5],
    ], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 2], ['F2', 2], ['G2', 2], ['E2', 2], ['A2', 2], ['E2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

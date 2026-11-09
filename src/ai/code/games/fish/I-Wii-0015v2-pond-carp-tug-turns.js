// I-Wii-0015v2-pond-carp-tug-turns.js
// 大鯉の引き合い — 山の釣り堀で大鯉と交互に糸を引き合う。鯉が引く番は手を止めて耐え、鯉が疲れて横を向いた自分の番に押し続けて力いっぱい巻き返す
// 操作: 鯉が横を向いて腹が光ったら自分の番。画面を押し続けている間だけリールを巻いて鯉を寄せる。背びれが立って水しぶきが上がったら次は鯉の番なので指を離す(しぶきが大きいほど強く長く引く)。鯉が引いている最中に押していると糸が鳴って結び目が1つほどける
// 終わり: 鯉を手前の網まで寄せればCLEAR。結び目3つがほどける(糸が切れる)、鯉が奥の葦まで逃げる、22秒の時間切れでGAME OVER
// @mechanic: turn_attack
// @theme: mountain_pond_carp_tug
// 世界観: 山あいの釣り堀で、釣り好きの老人が掛けた大鯉と、鯉が引けば耐え、鯉が疲れれば巻き返す交互の引き合いを続けて網まで寄せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 寄せた距離・巻き返した回数・ぎりぎりで離せた回数(PERFECT)・スコア
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床(水面)に楕円影、背景は横1層
  var STYLE = { bg: ['#9fd8c8', '#2f6f6a'], main: ['#ff9a3c', '#f4e3b5', '#3e8f5a'], accent: ['#e8483c', '#ffffff'] };
  var C = {
    koi: STYLE.main[0], cream: STYLE.main[1], moss: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1],
    water: '#3f8f88', waterDk: '#2b6c69', reed: '#5c7a3a', reedDk: '#3d5427', wood: '#8a5a32', woodDk: '#5e3a1e', ink: '#1a1a1a', gold: '#ffd84a', sky: '#cfeee4',
  };

  var GAME_TITLE = 'KOI TUG';
  var TIME_LIMIT = 22;
  var KNOTS = 3;
  var REEL_RATE = 26;
  var NEAR_Y = H * 0.6, FAR_Y = H * 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var dist, phase, phaseT, turnN, strong, pullDur, win, stamina, knots, holding, reeledTurn, graceT, teleRel;
  var stopKind, reels, perfects, score, finalScore, bestDist, mileDone, timeLeft, readyT, stopT, fin, cleared, postT, joyT, sadT, warnT, endWhy;

  // 老人(麦わら帽)。大きく描く
  var OLD_A = ['....hhhhhh....', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', '...ssssssss...', '...sksssskss..', '...ssssssss...', '...swwwwwws...', '....wwwwww....', '..bbbbbbbbbb..', '.bbbbbbbbbbbb.', 'ss.bbbbbbbb.ss', 's..bbbbbbbb..s', '...nnnnnnnn...', '...nnn..nnn...', '..ddd....ddd..'];
  var OLD_B = ['....hhhhhh....', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', '...ssssssss...', '...sksssskss..', '...ssssssss...', '...swwmmwws...', '....wwwwww....', '..bbbbbbbbbb..', '.bbbbbbbbbbbb.', 'ss.bbbbbbbb.ss', 's..bbbbbbbb..s', '...nnnnnnnn...', '...nnn..nnn...', '..ddd....ddd..'];
  var OLD_PULL = ['.....hhhhhh...', '...hhhhhhhhhh.', '..hhhhhhhhhhhh', '....ssssssss..', '....sk.ssk.s..', '....ssssssss..', '....swmmmmws..', '.....wwwwww...', '...bbbbbbbbbb.', '..bbbbbbbbbbbb', '.ss.bbbbbbbbss', '.s..bbbbbbbb..', '..nnnnnnnn....', '.nnn....nnn...', 'ddd......ddd..'];
  var OLD_SAD = ['..............', '....hhhhhh....', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', '...ssssssss...', '...skssssks...', '...swmmmmws...', '....wwwwww....', '..bbbbbbbbbb..', '.bbbbbbbbbbbb.', '.s.bbbbbbbb.s.', '...nnnnnnnn...', '...nnn..nnn...', '..ddd....ddd..', '..............'];
  var OLD_PAL = { h: '#e8c46a', s: '#f0b98a', k: '#1a1a1a', w: '#f4f4f4', m: '#8a3a2a', b: '#3e6fa8', n: '#5a4632', d: '#2a2a2a' };
  // 大鯉(泳ぐ2フレーム / 横を向いて腹を見せる)
  var KOI_A = ['.....rrrr.......', '...rrooorrr...oo', '.rroooowoooor.oo', 'rkooowwwooooooo.', 'rooooowoooooooo.', '.rroooooooor.oo', '...rrooorrr...oo', '.....rrrr.......'];
  var KOI_B = ['.....rrrr.......', '...rrooorrr.....', '.rroooowooooroo.', 'rkooowwwoooooooo', 'rooooowoooooooo.', '.rroooooooorroo.', '...rrooorrr.....', '.....rrrr.......'];
  var KOI_SIDE = ['......rrrr......', '...rrooooorr....', '.rroooooooooro..', 'rkooooooooooooo.', 'rcccccccccccccc.', '.rcccccccccccr..', '...rrcccccrr....', '......rrrr......'];
  var KOI_PAL = { r: '#c2461e', o: '#ff9a3c', w: '#f4e3b5', k: '#1a1a1a', c: '#fff4dc' };
  var FIN = ['...rr..', '..rrr..', '.rrrrr.', 'rrrrrrr'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }

  function koiY() { return NEAR_Y + (FAR_Y - NEAR_Y) * (dist / 100); }
  function koiX(t) { return W / 2 + Math.sin(t * 0.9) * 120 * (0.5 + dist / 100); }

  function initGame() {
    dist = 55; phase = 'tele'; phaseT = 0; turnN = 0; stamina = 1; knots = KNOTS; holding = false; reeledTurn = 0; graceT = 0; teleRel = -1;
    reels = 0; perfects = 0; score = 0; finalScore = 0; bestDist = 55; mileDone = false;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; warnT = 0; endWhy = '';
    planTurn();
  }

  // 鯉の番の強さと長さ(しぶきの大きさで予告)。自分の番の長さは回を追って短くなる
  function planTurn() {
    var pat = [0, 1, 0, 1, 1, 0, 1, 1, 0, 1];
    strong = pat[turnN % pat.length] === 1;
    pullDur = (strong ? 1.15 : 0.85) + Math.random() * 0.2;
    win = Math.max(0.85, 1.35 - turnN * 0.07);
  }

  function setPhase(p) {
    phase = p; phaseT = 0;
    if (p === 'tele') {
      teleRel = -1;
      game.audio.tone(strong ? 110 : 160, strong ? 0.4 : 0.25, { wave: 'sawtooth', volume: strong ? 0.09 : 0.06, slide: 40 });
    } else if (p === 'pull') {
      game.audio.play('se_jump', 0.25);
    } else if (p === 'me') {
      reeledTurn = 0;
      game.audio.tone('E6', 0.06, { wave: 'square', volume: 0.08 });
      game.audio.tone('B5', 0.06, { wave: 'square', volume: 0.06 });
    }
  }

  // 1フレーム分の引き合い(本番もデモも同じ処理)
  function stepTug(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        game.feedback.bad(koiX(game.time.elapsed), koiY() - 130, { text: 'MISS', color: C.red, size: 64 });
        if (stopKind === 'escape') { endWhy = 'escape'; ending(false); }
        else if (mode === S.PLAYING && knots <= 0) { endWhy = 'snap'; ending(false); }
      }
      return;
    }
    phaseT += dt;
    if (graceT > 0) graceT -= dt;
    if (phase === 'tele') {
      if (phaseT >= 0.55) setPhase('pull');
    } else if (phase === 'pull') {
      dist = Math.min(100, dist + (strong ? 19 : 12) * (0.6 + stamina * 0.4) * dt);
      if (holding && graceT <= 0) {
        // 鯉が引いている最中に巻いた: 糸が鳴る(hit-stop)
        knots--; sadT = 0.8; graceT = 0.7; stopT = 0.42; stopKind = 'strain';
        dist = Math.min(100, dist + 6);
        game.fx.flash(C.white, 0.15);
        game.fx.shake(10, 0.3);
        game.audio.tone('C3', 0.3, { wave: 'square', volume: 0.1, slide: -90 });
        return;
      }
      if (dist >= 100 && mode === S.PLAYING) {
        // 葦まで逃げられた瞬間: 止めて鯉を白く光らせてから終わる
        stopT = 0.45; stopKind = 'escape'; sadT = 1;
        game.fx.flash(C.white, 0.15);
        game.audio.tone('G2', 0.35, { wave: 'square', volume: 0.1, slide: -60 });
        return;
      }
      if (phaseT >= pullDur) setPhase('rest');
    } else if (phase === 'rest') {
      if (phaseT >= 0.2) setPhase('me');
    } else if (phase === 'me') {
      if (holding) {
        var g = REEL_RATE * dt;
        dist = Math.max(0, dist - g); reeledTurn += g;
        stamina = Math.max(0.2, stamina - dt * 0.05);
        if (mode === S.PLAYING) score += Math.round(g * 10);
      }
      if (dist <= 0 && mode === S.PLAYING) { stopT = 0; landed(); return; }
      if (phaseT >= win) {
        turnN++;
        if (reeledTurn > 0) reels++;
        planTurn();
        setPhase('tele');
      }
    }
    if (dist < bestDist) bestDist = dist;
    if (!mileDone && dist < 25 && mode === S.PLAYING) {
      mileDone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 90 });
    }
  }

  function landed() {
    joyT = 2;
    game.feedback.good(W / 2, NEAR_Y - 140, { text: 'PERFECT', color: C.gold, size: 72 });
    ending(true);
  }

  function ending(win2) {
    if (fin) return;
    fin = true; cleared = win2; postT = 1.4;
    finalScore = win2 ? score + knots * 300 + perfects * 100 + Math.round(timeLeft * 40) : 0;
    game.audio.stopBgm();
    game.audio.play(win2 ? 'se_success' : 'se_failure', 0.55);
    if (win2) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, NEAR_Y + (i % 2) * 80, { color: i % 2 ? C.koi : C.cream, count: 18, speed: 480 });
      game.fx.flash(C.white, 0.2);
    } else sadT = 3;
  }

  // 指を離した(本番もデモも同じ判定): 予告の間に離せたら評価
  function letGo() {
    holding = false;
    if (phase === 'tele' && teleRel < 0) {
      teleRel = phaseT;
      var kx = koiX(game.time.elapsed), ky = koiY() - 130;
      if (phaseT < 0.28) { perfects++; if (mode === S.PLAYING) score += 150; game.feedback.good(kx, ky, { text: 'PERFECT', color: C.gold, size: 60 }); }
      else { if (mode === S.PLAYING) score += 60; game.feedback.good(kx, ky, { text: 'GOOD', color: C.cream, size: 56 }); }
    } else game.audio.tone('G4', 0.04, { wave: 'triangle', volume: 0.05 });
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    holding = true;
    if (phase === 'me') { game.audio.play('se_tap', 0.25); game.fx.burst(W / 2, H * 0.87, { color: C.cream, count: 5, speed: 200 }); }
    else if (phase === 'tele') game.audio.tone('D5', 0.05, { wave: 'square', volume: 0.06 });
    else game.audio.tone('A3', 0.06, { wave: 'square', volume: 0.06 });
  });
  game.onRelease(function(x, y) {
    if (mode !== S.PLAYING || fin || !holding) { holding = false; return; }
    game.audio.tone('C5', 0.03, { wave: 'square', volume: 0.04 });
    letGo();
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin) game.audio.play('se_tap', 0.05);
  });

  // ---- 描画 ----
  function drawPond(t) {
    game.draw.gradient(0, H, [[0, C.sky], [0.14, STYLE.bg[0]], [0.16, C.water], [0.68, C.waterDk], [1, STYLE.bg[1]]]);
    // 奥の葦と山影(横1層)
    for (var m = 0; m < 5; m++) game.draw.circle(100 + m * 240, H * 0.15, 150, '#6fae8e');
    for (var r = 0; r < 26; r++) {
      var rx = r * 44 + Math.sin(t * 1.2 + r) * 6, rh = 120 + (r % 4) * 30;
      game.draw.rect(rx, H * 0.19 - rh * 0.4, 12, rh, r % 2 ? C.reed : C.reedDk);
    }
    // 水面の波紋
    for (var w = 0; w < 10; w++) {
      var wy = H * 0.24 + w * 80, off = (t * 40 + w * 70) % 260;
      for (var k = -1; k < 5; k++) game.draw.rect(k * 260 + off, wy, 110, 5, C.white, 0.18);
    }
    // 手前の桟橋と網
    game.draw.rect(0, H * 0.7, W, 40, C.wood);
    game.draw.rect(0, H * 0.7 + 40, W, 14, C.woodDk);
    game.draw.rect(0, H * 0.7 + 54, W, H * 0.3, '#4a3a2a');
    for (var p = 0; p < 8; p++) game.draw.rect(40 + p * 140, H * 0.7 + 54, 18, H * 0.3, C.woodDk);
    game.draw.circle(W * 0.62, H * 0.66, 70, C.cream, 0.25);
    game.draw.line(W * 0.62 + 50, H * 0.66 + 50, W * 0.62 + 160, H * 0.7 + 30, C.woodDk, 12);
  }

  function drawKoi(t) {
    var x = koiX(t), y = koiY(), sc = 10 + (1 - dist / 100) * 9;
    var side = phase === 'me' || phase === 'rest';
    var hit = stopT > 0;
    var fr = side ? KOI_SIDE : (Math.floor(t * (phase === 'pull' ? 10 : 4)) % 2 ? KOI_A : KOI_B);
    // 水面の楕円影
    game.draw.circle(x, y + sc * 5, sc * 7, C.ink, 0.18);
    if (phase === 'tele') {
      // 予告: 背びれ+しぶきの輪(強い引きは大きく2重)
      var u = Math.min(1, phaseT / 0.55), rr = (strong ? 120 : 70) + u * 80;
      game.draw.circle(x, y, rr, C.white, 0.25 * (1 - u * 0.5));
      if (strong) game.draw.circle(x, y, rr * 0.6, C.white, 0.3);
      for (var d = 0; d < (strong ? 8 : 4); d++) game.draw.circle(x + Math.cos(d * 0.8 + t * 6) * rr * 0.8, y - Math.abs(Math.sin(t * 9 + d)) * (strong ? 80 : 40), strong ? 14 : 9, C.white, 0.8);
      game.draw.sprite(FIN, KOI_PAL, x - sc * 2, y - sc * 6 - u * 20, sc * (strong ? 1.3 : 0.9), { anchor: 'center' });
    }
    var big = hit ? 1.25 : 1;
    var pal = hit && Math.floor(t * 16) % 2 === 0 ? { r: '#ffffff', o: '#ffffff', w: '#ffffff', k: '#ffffff', c: '#ffffff' } : KOI_PAL;
    game.draw.sprite(fr, pal, x, y, sc * big, { anchor: 'center' });
    if (side && Math.floor(t * 6) % 2 === 0) game.draw.circle(x + sc * 2, y + sc * 1.5, sc * 2, C.gold, 0.35);
    if (phase === 'me') for (var b = 0; b < 3; b++) game.draw.circle(x - sc * 8 + b * 16, y - ((t * 120 + b * 30) % 90), 8, C.white, 0.6);
  }

  function drawOld(t) {
    var x = W * 0.24, y = H * 0.79, px = 20;
    var fr = (fin && !cleared) || sadT > 0 ? OLD_SAD : holding ? OLD_PULL : (Math.floor(t * 2) % 2 ? OLD_A : OLD_B);
    if (joyT > 0) fr = OLD_PULL;
    game.draw.circle(x, y + 160, 150, C.ink, 0.25);
    // 竿としなり: 引かれていると大きく曲がる、巻いていると手前へ
    var bend = phase === 'pull' ? 140 : holding ? -40 : 30;
    var tipX = x + 320 + (phase === 'pull' ? 60 : 0), tipY = y - 420 + bend;
    game.draw.line(x + 60, y - 10, x + 200, y - 260 + bend * 0.4, C.woodDk, 18);
    game.draw.line(x + 200, y - 260 + bend * 0.4, tipX, tipY, C.wood, 10);
    // 糸: 張っている(鯉の番)は赤く震える
    var kx = koiX(t), ky = koiY();
    var taut = phase === 'pull' || stopT > 0;
    var lcol = stopT > 0 && Math.floor(t * 16) % 2 === 0 ? '#ffffff' : taut ? C.red : C.cream;
    var jit = taut ? Math.sin(t * 60) * 6 : 0;
    game.draw.line(tipX, tipY, (tipX + kx) / 2 + jit, (tipY + ky) / 2 + (taut ? 0 : 40), lcol, stopT > 0 ? 10 : 5);
    game.draw.line((tipX + kx) / 2 + jit, (tipY + ky) / 2 + (taut ? 0 : 40), kx - 60, ky, lcol, stopT > 0 ? 10 : 5);
    game.draw.sprite(fr, OLD_PAL, x, y + Math.sin(t * 2) * 4, px, { anchor: 'center' });
  }

  // 親指ゾーン: リール(押している間回る)と手番の輪
  function drawReel(t) {
    var cx = W * 0.68, cy = H * 0.87;
    var ring = phase === 'me' ? C.moss : phase === 'pull' ? C.red : phase === 'tele' ? (Math.floor(t * 10) % 2 ? C.red : C.gold) : C.cream;
    game.draw.circle(cx, cy, 150, C.ink, 0.6);
    game.draw.circle(cx, cy, 138, ring, phase === 'me' ? 0.9 : 0.6);
    game.draw.circle(cx, cy, 100, '#c9c9c9');
    game.draw.circle(cx, cy, 30, C.ink);
    var a = holding && phase === 'me' ? t * 14 : 0;
    game.draw.line(cx, cy, cx + Math.cos(a) * 90, cy + Math.sin(a) * 90, C.ink, 18);
    game.draw.circle(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90, 22, C.wood);
    if (phase === 'me' && mode !== S.RESULT) {
      var r = Math.max(0, 1 - phaseT / win);
      game.draw.rect(cx - 140, cy + 160, 280 * r, 18, C.moss);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 30, W - 120, 22, C.ink, 0.5);
    game.draw.rect(60, 30, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.red : C.white);
    // 距離ゲージ(網 ← 鯉 → 葦)
    game.draw.rect(160, 110, W - 320, 26, C.ink, 0.5);
    game.draw.rect(160, 110, (W - 320) * dist / 100, 26, dist > 75 ? C.red : C.koi);
    game.draw.circle(160, 123, 26, C.cream);
    game.draw.rect(W - 170, 92, 14, 60, C.reed);
    out(Math.ceil(dist / 10) + 'm', W / 2, 190, 48, C.white);
    for (var k = 0; k < KNOTS; k++) game.draw.circle(80, 100 + k * 40, 14, k < knots ? C.cream : C.ink, k < knots ? 1 : 0.4);
    out('' + score, W - 100, 190, 36, C.gold);
  }

  function drawScene(t) {
    drawPond(t);
    drawKoi(t);
    drawOld(t);
    drawReel(t);
  }

  // ---- ATTRACT: 本物の stepTug()/letGo() で実演。自分の番に押し続けて巻き、しぶきで離す。3回目は離し遅れて糸が鳴る ----
  var demo = { t: 0, x: W * 0.68, y: H * 0.87, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.n = 0; graceT = 0; }
    var prevPhase = phase;
    stepTug(dt);
    if (stopT > 0) return;
    if (phase === 'me' && !holding && phaseT > 0.12) { holding = true; game.audio.play('se_tap', 0.2); }
    var late = demo.n === 2 ? 0.75 : 0.12;
    if (holding && phase === 'tele' && phaseT > late) { letGo(); demo.n++; }
    if (holding && phase === 'pull' && graceT > 0) { holding = false; demo.n++; }
    if (prevPhase !== phase && phase === 'me' && dist < 20) dist = 45;
    demo.y = H * 0.87 + (holding ? 0 : -60);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: holding, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 100, C.koi);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, C.gold);
      else out('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.ink, 0.88);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? C.gold : C.red);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? C.gold : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.white);
      out('x' + reels + '   PERFECT ' + perfects + '   ' + knots + ' / ' + KNOTS, W / 2, H * 0.46, 42, C.white);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.gold);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.gold);
      if (!cleared) out('あと' + Math.max(1, Math.ceil(bestDist / 10)) + 'm!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { reels: reels, perfects: perfects, knotsLeft: knots, closest: Math.round(bestDist) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepTug(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.fx.flash(C.white, 0.15);
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: C.red, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['F4', 1], ['D4', 2],
      ['A4', 1], ['C5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
      ['G4', 0.5], ['F4', 0.5], ['G4', 1], ['D4', 2],
    ], { tempo: 112, wave: 'triangle', volume: 0.07, loop: true, bass: [['D2', 2], ['A2', 2], ['F2', 2], ['D2', 2], ['A2', 2], ['C3', 2], ['G2', 2], ['D2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

// J-Switch-0024-funfair-pie-panel-lob.js
// 的板パイ投げ — 移動遊園地の的当て小屋で、レールを滑る笑い顔の的板へクリームパイを山なりに放る。遠い的ほど滞空が長いので、先回りして落とす
// 操作: パイを落としたい地点をタップ。パイは放物線で飛び、遠くほど着くのが遅い(社内メモ。画面には出さない)
// 終わり: 5枚に命中でCLEAR。パイ8個を使い切る/時間切れでGAME OVER
// @mechanic: trajectory
// @theme: funfair_pie_panel_lob
// 世界観: 夏の夜に巡回してくる移動遊園地の的当て小屋で、パイ焼き屋台の見習いが焼き損じのクリームパイを使い、レールを滑る笑い顔の木の的板へ山なりに投げ当てて、景品の大きな焼き型を狙う
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数・使ったパイ数・遠い的への命中数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い縁取り・飛ぶ数字
  var STYLE = { bg: ['#ff5fa2', '#ffc93c', '#fff4e0'], main: ['#2b59ff', '#ffffff', '#1b1b2f'], accent: ['#00d98b', '#ff3b3b'] };
  var C = {
    top: '#6a3cff', mid: '#ff5fa2', low: '#ffc93c', floor: '#2b2b55', rail: '#1b1b2f', line: '#1b1b2f',
    board: '#ffe14d', boardS: '#ffb000', cream: '#ffffff', crust: '#e2a04a', good: '#00d98b', bad: '#ff3b3b', white: '#ffffff'
  };

  var GAME_TITLE = 'PIE LOB';
  var TIME_LIMIT = 16;
  var NEEDED = 5;
  var PIES = 8;
  var RAILS = [
    { y: H * 0.32, scale: 0.7, fly: 0.95, spd: [190, 330] },
    { y: H * 0.5, scale: 1.0, fly: 0.62, spd: [240, 400] }
  ];
  var START_X = W * 0.5, START_Y = H * 0.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, hits, farHits, left, boards, flying, splats, reload, hitStop, outro, ok, halfShown, lastHit;

  var FACE = [
    '..kkkkkk..',
    '.kyyyyyyk.',
    'kyyyyyyyyk',
    'kyykyykyyk',
    'kyyyyyyyyk',
    'kyrryyrryk',
    'kyykkkkyyk',
    '.kyykkyyk.',
    '..kkkkkk..'
  ];
  var PIE = ['..wwww..', '.wwwwww.', 'kccccccK', '.kkkkkk.'];
  var BAKER = [
    ['..www..', '.wwwww.', '..sss..', '..sks..', '.ppppp.', 'p.ppp.p', '..p.p..', '.k...k.'],
    ['..www..', '.wwwww.', '..sss..', '..sks..', 'ppppppp', '..ppp..', '..p.p..', '..k.k..']
  ];
  var MOLD = ['.kkkkk.', 'kgggggk', 'kgGgGgk', '.kgggk.'];

  function txt(s, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.line, bold: true, align: a });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: a });
  }

  function newBoard(ri) {
    var r = RAILS[ri];
    var dir = game.random(0, 1) < 0.5 ? 1 : -1;
    var sp = game.random(r.spd[0], r.spd[1]) * (1 + hits * 0.08);
    return { rail: ri, x: dir > 0 ? -120 : W + 120, v: dir * sp, flip: 0, splat: 0, gold: game.random(0, 1) < 0.2 };
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; hits = 0; farHits = 0; left = PIES;
    boards = [newBoard(0), newBoard(1)]; flying = []; splats = []; reload = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; lastHit = null;
  }

  function railAt(y) {
    var best = 1, bd = 1e9;
    for (var i = 0; i < RAILS.length; i++) { var d = Math.abs(y - RAILS[i].y); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  // 投げる(実プレイ・デモ共用)
  function lob(tx, isDemo) {
    if (reload > 0 || left <= 0) return false;
    reload = 0.35;
    if (!isDemo) left--;
    return true;
  }
  function launch(tx, ty, isDemo) {
    if (!lob(tx, isDemo)) return false;
    var ri = railAt(ty);
    flying.push({ sx: START_X, sy: START_Y, tx: Math.max(60, Math.min(W - 60, tx)), ty: RAILS[ri].y, rail: ri, t: 0, T: RAILS[ri].fly, demo: isDemo });
    return true;
  }

  function land(p) {
    var hitB = null;
    for (var i = 0; i < boards.length; i++) {
      var b = boards[i];
      if (b.rail === p.rail && b.flip === 0 && Math.abs(b.x - p.tx) < 85 * RAILS[b.rail].scale + 20) hitB = b;
    }
    if (hitB) {
      hitB.flip = 0.01; hitB.splat = 1;
      lastHit = { x: hitB.x, y: RAILS[hitB.rail].y, t: 0.4 };
      if (p.demo) { game.fx.burst(hitB.x, RAILS[hitB.rail].y, { color: C.cream, count: 14, speed: 300 }); return; }
      hits++; if (hitB.rail === 0) farHits++;
      var sc = (hitB.gold ? 300 : 100) * (hitB.rail === 0 ? 2 : 1);
      game.feedback.good(hitB.x, RAILS[hitB.rail].y - 120, { text: hitB.rail === 0 ? 'PERFECT' : 'GOOD', color: C.good, count: 20 });
      game.fx.popup('+' + sc, hitB.x, RAILS[hitB.rail].y - 200, { color: hitB.gold ? C.board : C.white, size: 54 });
      game.audio.play('se_coin', 0.35);
      if (!halfShown && hits >= 3) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.62, { color: C.board, size: 76 });
      }
      if (hits >= NEEDED) finish(true);
      return;
    }
    splats.push({ x: p.tx, y: p.ty + 60, t: 1.2 });
    if (p.demo) return;
    game.feedback.bad(p.tx, p.ty - 80, { text: 'MISS', color: C.bad, shake: 6 });
  }

  function stepWorld(dt) {
    if (reload > 0) reload -= dt;
    for (var i = 0; i < boards.length; i++) {
      var b = boards[i];
      if (b.flip > 0) { b.flip += dt * 2.2; if (b.flip >= 1) boards[i] = newBoard(b.rail); continue; }
      b.x += b.v * dt;
      if ((b.v > 0 && b.x > W + 140) || (b.v < 0 && b.x < -140)) boards[i] = newBoard(b.rail);
    }
    for (var f = flying.length - 1; f >= 0; f--) {
      var p = flying[f];
      p.t += dt;
      if (p.t >= p.T) { flying.splice(f, 1); land(p); }
    }
    for (var s = splats.length - 1; s >= 0; s--) { splats[s].t -= dt; if (splats[s].t <= 0) splats.splice(s, 1); }
    if (lastHit) { lastHit.t -= dt; if (lastHit.t <= 0) lastHit = null; }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.board, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, H * 0.42, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    if (y > H * 0.68 || y < H * 0.2) { game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.white, count: 3, speed: 80 }); return; }
    if (launch(x, y, false)) { game.audio.play('se_jump', 0.35); game.fx.burst(START_X, START_Y - 60, { color: C.cream, count: 5, speed: 120 }); }
    else game.audio.play('se_tap', 0.15);
  });

  // ── demo(進む先へ先回りして2回当て、3回目は的の今の位置に投げて外す)──────
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: 0, n: 0, next: 1.2 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.n = 0; demo.next = 1.2; }
    stepWorld(dt);
    if (demo.press > 0) demo.press -= dt;
    var b = boards[demo.n % 2];
    var r = RAILS[b.rail];
    var lead = demo.n % 3 === 2 ? 0 : b.v * r.fly;
    var aimX = b.x + lead, aimY = r.y;
    var k = Math.min(1, dt * 5);
    demo.gx += (aimX - demo.gx) * k; demo.gy += (aimY + 30 - demo.gy) * k;
    if (cyc > demo.next && b.flip === 0 && aimX > 120 && aimX < W - 120) {
      launch(aimX, aimY, true);
      demo.press = 0.25; demo.n++; demo.next = cyc + 1.6;
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawBooth() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.62, [[0, C.top], [0.55, C.mid], [1, C.low]]);
    // テントの縞と電飾
    for (var s = 0; s < 9; s++) game.draw.rect(s * 130 - 10, 230, 64, 110, s % 2 ? C.white : C.bad, 0.9);
    for (var l = 0; l < 14; l++) game.draw.circle(40 + l * 78, 350, 12, Math.floor(t * 4 + l) % 2 ? C.board : C.white);
    // 景品棚
    game.draw.sprite(MOLD, { k: C.line, g: '#c0c0d0', G: '#ffffff' }, W * 0.88, H * 0.225, 12, { anchor: 'center' });
    // レール
    for (var i = 0; i < RAILS.length; i++) {
      var y = RAILS[i].y + 80 * RAILS[i].scale;
      game.draw.rect(0, y, W, 16 * RAILS[i].scale + 4, C.rail);
      game.draw.rect(0, y - 4, W, 4, C.white, 0.6);
    }
    game.draw.gradient(H * 0.62, H, [[0, C.floor], [1, '#15152e']]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function drawBoards() {
    var t = game.time.elapsed;
    for (var i = 0; i < boards.length; i++) {
      var b = boards[i];
      var r = RAILS[b.rail];
      var sc = r.scale;
      var squash = b.flip > 0 ? Math.max(0.05, 1 - b.flip) : 1;
      var y = r.y + (1 - squash) * 60 * sc;
      game.draw.rect(b.x - 6 * sc, y + 40 * sc, 12 * sc, 50 * sc, C.line);
      if (lastHit && Math.abs(lastHit.x - b.x) < 5) game.draw.circle(b.x, y, 120 * sc, C.white, 0.6);
      var pal = { k: C.line, y: b.gold ? '#ffd700' : C.board, r: '#ff7aa8' };
      var px = 16 * sc;
      game.draw.sprite(FACE, pal, b.x, y + Math.sin(t * 6 + i) * 3, px, { anchor: 'center', alpha: squash });
      if (b.gold) game.draw.circle(b.x + 70 * sc, y - 70 * sc, 10 * sc, C.white, 0.5 + 0.5 * Math.sin(t * 10));
      if (b.splat) for (var c = 0; c < 6; c++) game.draw.circle(b.x - 40 * sc + c * 16 * sc, y - 10 * sc + (c % 2) * 20 * sc, 22 * sc, C.cream, squash);
    }
    for (var s = 0; s < splats.length; s++) {
      var sp = splats[s];
      for (var d = 0; d < 5; d++) game.draw.circle(sp.x - 30 + d * 15, sp.y + (d % 2) * 8, 16, C.cream, Math.min(1, sp.t));
    }
  }

  function drawFlying() {
    for (var i = 0; i < flying.length; i++) {
      var p = flying[i];
      var u = p.t / p.T;
      var x = p.sx + (p.tx - p.sx) * u;
      var y = p.sy + (p.ty - p.sy) * u - Math.sin(u * Math.PI) * (260 + (p.rail === 0 ? 120 : 0));
      var sc = 16 * (1 - u * (1 - RAILS[p.rail].scale * 0.8));
      game.draw.circle(x, p.sy + (p.ty - p.sy) * u + 40, 20 * (1 - u * 0.5), C.line, 0.25);
      game.draw.sprite(PIE, { w: C.cream, c: C.crust, k: C.line, K: C.line }, x, y, sc, { anchor: 'center' });
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.74, W, 12, C.white, 0.2);
    var fr = reload > 0.2 ? 1 : 0;
    game.draw.sprite(BAKER[fr], { w: C.white, s: '#ffd0a8', k: C.line, p: '#2b59ff' }, START_X, H * 0.86 + Math.sin(t * 2.6) * 5, 16, { anchor: 'center' });
    if (reload <= 0 && left > 0) game.draw.sprite(PIE, { w: C.cream, c: C.crust, k: C.line, K: C.line }, START_X + 70, START_Y - 10, 12, { anchor: 'center' });
    for (var i = 0; i < PIES; i++) game.draw.sprite(PIE, { w: i < left ? C.cream : '#55557a', c: i < left ? C.crust : '#44446a', k: C.line, K: C.line }, 70 + i * 70, H * 0.95, 8, { anchor: 'center' });
    for (var h = 0; h < NEEDED; h++) game.draw.circle(W * 0.7 + h * 60, H * 0.95, 20, h < hits ? C.good : '#44446a');
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.line);
    txt(hits + ' / ' + NEEDED, W / 2, 90, 70, C.board);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 22, '#44446a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, timeLeft < 4 ? C.bad : C.good);
  }

  function score() { return hits * 200 + farHits * 150 + left * 60 + Math.round(timeLeft * 10); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawBooth(); drawBoards(); drawFlying(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.line);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 86, C.board);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.7, 42, C.board);
      else txt('INSERT COIN', W / 2, H * 0.7, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBooth(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 96, ok ? C.good : C.bad);
      txt('BEST ' + game.best, W / 2, H * 0.48, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.7, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      stepWorld(dt);
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepWorld(dt);
        if (phase === 'play' && left <= 0 && flying.length === 0 && hits < NEEDED) finish(false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, piesUsed: PIES - left, farHits: farHits };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawBooth(); drawBoards(); drawFlying(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, C.board);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.line, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.board);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + '枚!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5', 2]
    ], { tempo: 160, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

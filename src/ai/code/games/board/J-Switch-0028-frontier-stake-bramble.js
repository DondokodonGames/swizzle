// J-Switch-0028-frontier-stake-bramble.js
// 開拓地の杭打ち — 自分の区画に隣り合う土地へ杭を1本ずつ打って陣地を広げる。杭を打つたびに野茨が2マス伸びてくる。茨の伸び先をふさいで囲い込め
// 操作: 自分の区画のとなりのマスをタップで杭打ち。光って予告されている茨の伸び先を先回りでふさぐと、茨の届かない土地がまとめて自分のものになる(社内メモ。画面には出さない)
// 終わり: 土地が埋まった時(または時間切れ)に15区画以上ならCLEAR、足りなければGAME OVER。3秒迷うと手番を飛ばされる
// @mechanic: turn_attack
// @theme: frontier_stake_bramble_claim
// 世界観: 新しく拓かれた丘の開拓地で、見習いの測量士が1本ずつ杭を打って畑の区画を広げる。手番のたびに北の藪から野茨が伸びてくるので、伸び先を読んで杭の柵で封じ込め、茨の届かない土地をまとめて囲い込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 取った区画数・囲い込み数・打った杭の数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドのクォータービュー。面は横1pxストリップで塗り、影で高さを示す
  var STYLE = { bg: ['#1a2a3a', '#2a4058'], main: ['#7ec850', '#5a9a3a', '#c8a060'], accent: ['#ffd84a', '#c83a5a'] };
  var C = {
    sky1: '#12202e', sky2: '#2f4a64', free: '#7ec850', freeD: '#5a9a3a', mine: '#e8c878', mineD: '#b8964a', side: '#6a4a2a',
    bram: '#7a2a4a', bramD: '#4a1a2e', thorn: '#e05a8a', stake: '#f4ecd8', gold: '#ffd84a', good: '#ffd84a', bad: '#e05a5a', white: '#f4f4f4', ink: '#0e1620'
  };

  var GAME_TITLE = 'STAKE CLAIM';
  var TIME_LIMIT = 30;
  var N = 6;
  var NEEDED = 15;
  var TURN_T = 3.0;
  var GROW = 2;
  var TW = 160, TH = 80;
  var X0 = W / 2, Y0 = H * 0.28;
  var FREE = 0, MINE = 1, BRAM = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, grid, sub, subT, turnT, preview, stakes, encl, skips, hitStop, outro, ok, halfShown, anim, lastEncl;

  var SURVEYOR = [
    ['..hhh...', '.hhhhh..', '..sss...', '..sks...', '.ccccc..', 'c.ccc.cm', '..c.c..m', '.k...k.m'],
    ['..hhh...', '.hhhhh..', '..sss...', '..sks...', 'ccccccm.', '..cccm..', '..c.c...', '..k.k...']
  ];
  var STAKE = ['kk', 'ww', 'ww', 'ww', 'ww', '.w'];
  var THORN = ['.t.t.', 'tbbbt', '.bbb.', 'tbbbt', '.t.t.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function cx(r, c) { return X0 + (c - r) * TW / 2; }
  function cy(r, c) { return Y0 + (c + r) * TH / 2; }
  function inside(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function count(v) { var n = 0; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c] === v) n++; return n; }
  function adjTo(r, c, v) {
    for (var d = 0; d < 4; d++) { var rr = r + DIRS[d][0], cc = c + DIRS[d][1]; if (inside(rr, cc) && grid[rr][cc] === v) return true; }
    return false;
  }

  // 茨の次の伸び先(予告): 茨に隣接する空き地のうち、自分の区画に近い順
  function computePreview() {
    var cand = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (grid[r][c] !== FREE || !adjTo(r, c, BRAM)) continue;
      var best = 99;
      for (var r2 = 0; r2 < N; r2++) for (var c2 = 0; c2 < N; c2++) if (grid[r2][c2] === MINE) best = Math.min(best, Math.abs(r - r2) + Math.abs(c - c2));
      cand.push({ r: r, c: c, d: best + ((r * 7 + c * 3) % 5) * 0.01 });
    }
    cand.sort(function(a, b) { return a.d - b.d; });
    preview = cand.slice(0, GROW);
  }

  // 茨の届かない空き地を囲い込む / 自分が届かない空き地は茨にのまれる
  function resolveEnclosure(isDemo) {
    var reach = [];
    for (var r = 0; r < N; r++) { reach.push([]); for (var c = 0; c < N; c++) reach[r].push(false); }
    var q = [];
    for (var r1 = 0; r1 < N; r1++) for (var c1 = 0; c1 < N; c1++) if (grid[r1][c1] === BRAM) { reach[r1][c1] = true; q.push([r1, c1]); }
    while (q.length) {
      var p = q.shift();
      for (var d = 0; d < 4; d++) {
        var rr = p[0] + DIRS[d][0], cc = p[1] + DIRS[d][1];
        if (inside(rr, cc) && !reach[rr][cc] && grid[rr][cc] === FREE) { reach[rr][cc] = true; q.push([rr, cc]); }
      }
    }
    var gained = 0, gx = 0, gy = 0;
    for (var r3 = 0; r3 < N; r3++) for (var c3 = 0; c3 < N; c3++) {
      if (grid[r3][c3] === FREE && !reach[r3][c3]) { grid[r3][c3] = MINE; gained++; gx += cx(r3, c3); gy += cy(r3, c3); anim.push({ r: r3, c: c3, t: 0.5, v: MINE }); }
    }
    if (gained > 0) {
      encl += gained;
      lastEncl = { x: gx / gained, y: gy / gained, n: gained, t: 0.8 };
      if (!isDemo) {
        game.audio.play('se_powerup', 0.5);
        game.fx.popup('+' + gained, gx / gained, gy / gained - 80, { color: C.gold, size: 64 });
      }
    }
  }

  function boardFull() { return count(FREE) === 0; }
  function playerCanMove() {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c] === FREE && adjTo(r, c, MINE)) return true;
    return false;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; stakes = 0; encl = 0; skips = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; anim = []; lastEncl = null;
    grid = [];
    for (var r = 0; r < N; r++) { grid.push([]); for (var c = 0; c < N; c++) grid[r].push(FREE); }
    grid[0][0] = BRAM; grid[0][1] = BRAM; grid[1][0] = BRAM;
    grid[N - 1][N - 1] = MINE; grid[N - 2][N - 1] = MINE; grid[N - 1][N - 2] = MINE;
    sub = 'you'; subT = 0; turnT = TURN_T;
    computePreview();
  }

  // 杭を打つ(実プレイ・デモ共用)。r<0 は手番切れ
  function drive(r, c, isDemo) {
    if (sub !== 'you') return false;
    if (r >= 0) {
      if (grid[r][c] !== FREE || !adjTo(r, c, MINE)) return false;
      grid[r][c] = MINE; anim.push({ r: r, c: c, t: 0.35, v: MINE, stake: true });
      if (!isDemo) {
        stakes++;
        var blocked = false;
        for (var i = 0; i < preview.length; i++) if (preview[i].r === r && preview[i].c === c) blocked = true;
        game.feedback.good(cx(r, c), cy(r, c) - 110, { text: blocked ? 'NICE' : 'GOOD', color: C.good, count: blocked ? 16 : 8 });
        game.audio.play('se_tap', 0.35);
      }
    } else if (!isDemo) {
      skips++;
      hitStop = 0.4;
      game.feedback.bad(W / 2, H * 0.62, { text: 'MISS', color: C.bad });
    }
    resolveEnclosure(isDemo);
    sub = 'grow'; subT = 0.3;
    return true;
  }

  // 茨は手番の前に予告したマスにだけ伸びる。杭でふさがれた予告マスには伸びられない
  function growBrambles(isDemo) {
    for (var i = 0; i < preview.length; i++) {
      var p = preview[i];
      if (grid[p.r][p.c] === FREE) { grid[p.r][p.c] = BRAM; anim.push({ r: p.r, c: p.c, t: 0.35, v: BRAM }); }
    }
    if (!isDemo && preview.length) game.audio.tone('C3', 0.15, { wave: 'sawtooth', volume: 0.05, slide: -30 });
    resolveEnclosure(isDemo);
    // 自分が届かない空き地は茨にのまれる
    var mineReach = [];
    for (var r = 0; r < N; r++) { mineReach.push([]); for (var c = 0; c < N; c++) mineReach[r].push(false); }
    var q = [];
    for (var r1 = 0; r1 < N; r1++) for (var c1 = 0; c1 < N; c1++) if (grid[r1][c1] === MINE) { mineReach[r1][c1] = true; q.push([r1, c1]); }
    while (q.length) {
      var pp = q.shift();
      for (var d = 0; d < 4; d++) {
        var rr = pp[0] + DIRS[d][0], cc = pp[1] + DIRS[d][1];
        if (inside(rr, cc) && !mineReach[rr][cc] && grid[rr][cc] === FREE) { mineReach[rr][cc] = true; q.push([rr, cc]); }
      }
    }
    for (var r2 = 0; r2 < N; r2++) for (var c2 = 0; c2 < N; c2++) if (grid[r2][c2] === FREE && !mineReach[r2][c2]) grid[r2][c2] = BRAM;
    computePreview();
    sub = 'you'; turnT = TURN_T;
  }

  function stepTurn(dt, isDemo) {
    for (var a = anim.length - 1; a >= 0; a--) { anim[a].t -= dt; if (anim[a].t <= 0) anim.splice(a, 1); }
    if (lastEncl) { lastEncl.t -= dt; if (lastEncl.t <= 0) lastEncl = null; }
    if (sub === 'grow') {
      subT -= dt;
      if (subT <= 0) {
        growBrambles(isDemo);
        if (!isDemo) {
          var mine = count(MINE);
          if (!halfShown && mine >= Math.ceil(NEEDED / 2) + 3) {
            halfShown = true;
            game.audio.play('se_milestone', 0.5);
            game.fx.popup(mine + ' / ' + NEEDED, W / 2, H * 0.2 + 60, { color: C.gold, size: 64 });
          }
          if (boardFull() || !playerCanMove()) { resolveEnd(); return; }
        } else if (boardFull() || !playerCanMove()) { initGame(); sub = 'you'; }
      }
    } else if (sub === 'you') {
      turnT -= dt;
      if (turnT <= 0) drive(-1, -1, isDemo);
    }
  }

  function resolveEnd() {
    // 残りの空き地は届く側で分け合う(自分の手番が尽きた時は茨に)
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c] === FREE) grid[r][c] = BRAM;
    finish(count(MINE) >= NEEDED);
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); game.feedback.good(W / 2, H * 0.2 + 40, { text: 'CLEAR', color: C.gold, count: 24 }); }
    else {
      game.feedback.bad(W / 2, H * 0.45, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  function cellAt(x, y) {
    var u = (x - X0) / (TW / 2), v = (y - Y0) / (TH / 2);
    var c = Math.round((u + v) / 2), r = Math.round((v - u) / 2);
    return inside(r, c) ? { r: r, c: c } : null;
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0 || sub !== 'you') return;
    var cell = cellAt(x, y);
    if (cell && drive(cell.r, cell.c, false)) return;
    game.audio.tone('D3', 0.06, { wave: 'square', volume: 0.04 });
    game.fx.burst(x, y, { color: C.bad, count: 4, speed: 90 });
  });

  // ── demo(予告された茨の伸び先をふさいで柵を作る。3手目は手番を迷って飛ばされる)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: 0, n: 0, next: 1 };
  function demoPick() {
    // 予告マスのうち打てるものを優先、無ければ茨に近い打てるマス
    for (var i = 0; i < preview.length; i++) if (adjTo(preview[i].r, preview[i].c, MINE)) return preview[i];
    var best = null, bd = 99;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (grid[r][c] !== FREE || !adjTo(r, c, MINE)) continue;
      var d = r + c;
      if (d < bd) { bd = d; best = { r: r, c: c }; }
    }
    return best;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 16;
    if (cyc < dt || demo.t <= dt) { initGame(); sub = 'you'; demo.n = 0; demo.next = 1; }
    if (demo.press > 0) demo.press -= dt;
    var aim = sub === 'you' ? demoPick() : null;
    if (aim) {
      var k = Math.min(1, dt * 6);
      demo.gx += (cx(aim.r, aim.c) - demo.gx) * k; demo.gy += (cy(aim.r, aim.c) + 20 - demo.gy) * k;
    }
    var hesitate = demo.n % 4 === 3;
    if (sub === 'you' && !hesitate) turnT = Math.max(turnT, 1);
    if (sub === 'you' && aim && cyc > demo.next && !hesitate) { drive(aim.r, aim.c, true); demo.press = 0.25; demo.n++; demo.next = cyc + 0.9; }
    else if (sub === 'you' && hesitate && turnT <= dt * 2) { demo.n++; demo.next = cyc + 0.9; }
    stepTurn(dt, true);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function diamond(x, y, w, h, top, alpha) {
    var steps = 12;
    for (var i = 0; i < steps; i++) {
      var yy = y - h / 2 + (i + 0.5) * h / steps;
      var ww = w * (1 - Math.abs(yy - y) / (h / 2));
      game.draw.rect(x - ww / 2, yy - h / steps / 2, ww, h / steps + 1, top, alpha);
    }
  }

  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.4, C.sky2], [1, C.sky1]]);
    // 遠くの丘
    for (var m = 0; m < 6; m++) game.draw.circle(m * 220, H * 0.2 + 30, 140, '#243a50');
    // 地面の厚み(影)
    for (var k = 0; k < 5; k++) diamond(X0, Y0 + (N - 1) * TH / 2 + 26 - k * 4, N * TW + 20, N * TH + 20, C.side, 0.25);
    var pulse = 0.5 + 0.5 * Math.sin(t * 7);
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var x = cx(r, c), y = cy(r, c), v = grid[r][c];
      var col = v === MINE ? ((r + c) % 2 ? C.mine : C.mineD) : v === BRAM ? ((r + c) % 2 ? C.bram : C.bramD) : ((r + c) % 2 ? C.free : C.freeD);
      diamond(x, y, TW - 6, TH - 3, col, 1);
      var isPrev = false;
      for (var i = 0; i < preview.length; i++) if (preview[i].r === r && preview[i].c === c) isPrev = true;
      if (isPrev && v === FREE && sub === 'you') diamond(x, y, TW - 20, TH - 10, C.thorn, 0.25 + 0.35 * pulse);
      if (v === BRAM) game.draw.sprite(THORN, { t: C.thorn, b: C.bramD }, x, y - 18 + Math.sin(t * 3 + r + c) * 3, 9, { anchor: 'center' });
      if (v === MINE && sub === 'you' && phase !== 'stop') {
        // 自分の区画の縁に打てるマスの目印
        for (var d = 0; d < 4; d++) {
          var rr = r + DIRS[d][0], cc = c + DIRS[d][1];
          if (inside(rr, cc) && grid[rr][cc] === FREE) game.draw.circle(cx(rr, cc), cy(rr, cc), 6, C.white, 0.35);
        }
      }
    }
    // 杭(奥から手前へ描いて前後を正しく)
    for (var s = 0; s < 2 * N - 1; s++) for (var r2 = 0; r2 < N; r2++) {
      var c2 = s - r2;
      if (!inside(r2, c2) || grid[r2][c2] !== MINE) continue;
      var drop = 0;
      for (var a = 0; a < anim.length; a++) if (anim[a].r === r2 && anim[a].c === c2 && anim[a].stake) drop = anim[a].t / 0.35;
      game.draw.rect(cx(r2, c2) - 4, cy(r2, c2) + 4, 20, 8, C.ink, 0.3);
      game.draw.sprite(STAKE, { k: C.side, w: C.stake }, cx(r2, c2), cy(r2, c2) - 26 - drop * 90, 7, { anchor: 'center' });
    }
    for (var e = 0; e < anim.length; e++) if (!anim[e].stake && anim[e].v === MINE) diamond(cx(anim[e].r, anim[e].c), cy(anim[e].r, anim[e].c), TW, TH, C.gold, anim[e].t);
    if (lastEncl) game.draw.circle(lastEncl.x, lastEncl.y, 120, C.gold, lastEncl.t * 0.4);
    game.draw.rect(0, 0, W, H, C.gold, 0.015 + 0.015 * Math.sin(t * 1.3));
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.ink, 0.5);
    game.draw.sprite(SURVEYOR[Math.floor(t * 2) % 2], { h: '#6a4a2a', s: '#f0c8a0', k: C.ink, c: '#3a6a9a', m: C.stake }, W * 0.15, H * 0.86 + Math.sin(t * 2.4) * 5, 16, { anchor: 'center' });
    // 区画数メーター(目標線つき)
    var mine = count(MINE);
    var bx = W * 0.3, bw = W * 0.62;
    game.draw.rect(bx, H * 0.84, bw, 40, C.ink);
    game.draw.rect(bx, H * 0.84, bw * Math.min(1, mine / (N * N)), 40, mine >= NEEDED ? C.gold : C.mine);
    game.draw.rect(bx + bw * NEEDED / (N * N) - 3, H * 0.83, 6, 60, C.white);
    game.draw.rect(bx + bw * (1 - count(BRAM) / (N * N)), H * 0.84, bw * count(BRAM) / (N * N), 40, C.bram);
    if (sub === 'you' && phase === 'play') {
      var p = Math.max(0, turnT / TURN_T);
      game.draw.rect(bx, H * 0.91, bw, 14, '#243a50');
      game.draw.rect(bx, H * 0.91, bw * p, 14, p < 0.35 && Math.floor(t * 8) % 2 ? C.bad : C.white);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.85);
    txt(count(MINE) + ' / ' + NEEDED, W / 2, 90, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, '#243a50');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 5 ? C.bad : C.free);
  }

  function score() { return count(MINE) * 100 + encl * 40 + Math.round(timeLeft * 10) - skips * 30; }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawField(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawField(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.66, 90, ok ? C.gold : C.bad);
      txt('BEST ' + game.best, W / 2, H * 0.71, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepTurn(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(count(MINE) >= NEEDED); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { plots: count(MINE), enclosed: encl, stakes: stakes };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawField(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 96, C.gold);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.62, W, H * 0.14, C.ink, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.655, 90, ok ? C.gold : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.7, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.74, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - count(MINE)) + '区画!', W / 2, H * 0.74, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.74, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 1], ['B4', 0.5], ['C5', 0.5], ['A4', 1],
      ['F#4', 0.5], ['A4', 0.5], ['G4', 2]
    ], { tempo: 120, wave: 'square', volume: 0.04, loop: true, bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

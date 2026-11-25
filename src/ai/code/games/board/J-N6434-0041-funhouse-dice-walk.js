// J-N6434-0041-funhouse-dice-walk.js
// からくり迷路館のサイコロ歩き — 毎手ふられる3つのサイコロから、回転床を踏まずに済む目を見抜いて選び、薄暗い迷路館の出口まで進む
// 操作: 3つのサイコロのうち1つをタップ。その目の数だけマスを進む。渦巻き模様の回転床に止まる目は選ばない(社内メモ。画面には出さない)
// 終わり: 出口のマスまで進めば成功。回転床に止まると3マス戻される。選ぶ時間切れはその手が無駄に。全体の時間切れで失敗
// @mechanic: gap_fit
// @theme: funhouse_dice_corridor
// 世界観: 閉園後の遊園地のからくり迷路館で、ランタンを提げた見回り係のハリネズミが、ふった目の中から回転床の隙間にぴったり合う数を選び、豆電球の灯る出口まで歩き抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 使った手数・回転床を踏んだ回数・拾った星
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形
  var STYLE = { bg: ['#1e1a2e', '#3a3050', '#5a4a6a'], main: ['#d8c8a0', '#8a7a9a', '#2a2438'], accent: ['#f0c850', '#d85a6a'] };
  var C = { bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], cream: STYLE.main[0], lav: STYLE.main[1], ink: STYLE.main[2], gold: STYLE.accent[0], red: STYLE.accent[1], white: '#f4eee0', tile: '#6a5a7a', tile2: '#76688a', teal: '#6ac0b0' };
  var DIE_COL = ['#d88a8a', '#8ab0d8', '#d8c878'];

  var GAME_TITLE = 'FUNHOUSE DICE';
  var TIME_LIMIT = 20;
  var GOAL = 24;
  var BACK = 3;
  var COLS = 5, CELL = 150, ROWGAP = 172;
  var GX0 = (W - COLS * CELL) / 2;
  var GY_BASE = H * 0.665;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var HOG_A = ['..#.#.#.', '.#######', '########', '#o####l.', '.######l', '..#..#..'];
  var HOG_B = ['.#.#.#..', '.#######', '########', '#o####.l', '.######l', '.#....#.'];
  var HOG_PAL = { '#': '#a08060', 'o': '#1e1a2e', 'l': '#f0c850' };
  var STAR = ['..#..', '.###.', '#####', '.#.#.'];
  var GATE = ['.#####.', '#o.o.o#', '#.....#', '#.....#', '#.....#'];
  var BULB = ['.#.', '###', '.#.'];

  var pos, shown, traps, stars, dice, phase, phaseT, pickT, pickMax, hopLeft, hopDir, turns, trapsHit, starsGot, timeLeft;
  var ready, hitStop, finished, ok, done, endWait, spinT, spinTile, tutorial, chosen, halfShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function tilePos(i) {
    i = Math.max(0, Math.min(GOAL, i));
    var row = Math.floor(i / COLS), col = i % COLS;
    if (row % 2 === 1) col = COLS - 1 - col;
    return { x: GX0 + col * CELL + CELL / 2, y: GY_BASE - row * ROWGAP };
  }

  function initGame() {
    pos = 0; shown = 0; turns = 0; trapsHit = 0; starsGot = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    spinT = 0; spinTile = -1; tutorial = true; chosen = -1; halfShown = false;
    traps = {}; stars = {};
    var run = 0;
    for (var i = 2; i < GOAL; i++) {
      if (run < 2 && game.random(0, 1) < 0.34) { traps[i] = true; run++; } else run = 0;
    }
    var placed = 0, guard = 0;
    while (placed < 3 && guard < 60) {
      var s = Math.floor(game.random(3, GOAL - 1));
      if (!traps[s] && !stars[s]) { stars[s] = true; placed++; }
      guard++;
    }
    pickMax = 2.6;
    dice = [{ v: 1 }, { v: 2 }, { v: 3 }];
    startRoll();
  }

  function isSafe(v) { var l = pos + v; return l >= GOAL || !traps[l]; }

  function startRoll() {
    phase = 'roll'; phaseT = 0.45; chosen = -1;
    var guard = 0;
    do {
      for (var i = 0; i < 3; i++) dice[i].v = 1 + Math.floor(game.random(0, 6)) % 6;
      guard++;
    } while (!(isSafe(dice[0].v) || isSafe(dice[1].v) || isSafe(dice[2].v)) && guard < 30);
    if (state === S.PLAYING) game.audio.tone('G4', 0.05, { wave: 'square', volume: 0.04 });
  }

  function pickDie(k) {
    if (phase !== 'pick' || finished) return false;
    chosen = k; turns++;
    hopLeft = dice[k].v; hopDir = 1;
    phase = 'move'; phaseT = 0;
    tutorial = false;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.2);
    return true;
  }

  function dieRect(k) { return { x: W * (0.2 + k * 0.3) - 95, y: H * 0.8, w: 190, h: 190 }; }

  function simulate(dt) {
    if (spinT > 0) spinT -= dt;
    phaseT -= dt;
    if (phase === 'roll') {
      if (Math.floor(phaseT * 30) % 2 === 0) {
        // 転がっている間の目のちらつき(見た目だけ)
        for (var i = 0; i < 3; i++) dice[i].show = 1 + Math.floor(game.random(0, 6)) % 6;
      }
      if (phaseT <= 0) {
        for (var j = 0; j < 3; j++) dice[j].show = dice[j].v;
        phase = 'pick'; pickT = pickMax;
        if (state === S.PLAYING) game.audio.tone('C5', 0.06, { wave: 'triangle', volume: 0.05 });
      }
    } else if (phase === 'pick') {
      pickT -= dt;
      if (pickT <= 0) {
        // 選ぶ時間切れ: この手は進めない
        game.feedback.bad(W / 2, H * 0.78, { text: 'MISS', shake: 6 });
        turns++;
        startRoll();
      }
    } else if (phase === 'move' || phase === 'back') {
      if (phaseT <= 0) {
        if (hopLeft > 0) {
          pos += hopDir; hopLeft--; phaseT = 0.12;
          if (pos >= GOAL) { pos = GOAL; hopLeft = 0; }
          if (pos < 0) { pos = 0; hopLeft = 0; }
          if (state === S.PLAYING) game.audio.tone(hopDir > 0 ? 'E5' : 'A4', 0.04, { wave: 'square', volume: 0.04 });
        } else {
          landed();
        }
      }
    }
    shown += (pos - shown) * Math.min(1, dt * 16);
  }

  function landed() {
    var p = tilePos(pos);
    if (phase === 'back') { startRoll(); return; }
    if (pos >= GOAL) {
      game.feedback.good(p.x, p.y - 60, { text: 'CLEAR', color: C.gold, size: 60 });
      if (state === S.PLAYING) { finished = true; ok = true; hitStop = 0.5; phase = 'end'; }
      else { phase = 'end'; phaseT = 0.8; }
      return;
    }
    if (traps[pos]) {
      trapsHit++; spinT = 0.6; spinTile = pos;
      game.feedback.bad(p.x, p.y - 50, { text: 'MISS', shake: 10 });
      phase = 'back'; hopLeft = BACK; hopDir = -1; phaseT = 0.45;
      return;
    }
    if (stars[pos]) {
      stars[pos] = false; starsGot++;
      game.audio.play('se_coin', 0.35);
      game.fx.burst(p.x, p.y, { color: C.gold, count: 12, speed: 260 });
    }
    game.feedback.good(p.x, p.y - 60, { text: dice[chosen] && dice[chosen].v >= 5 ? 'NICE' : 'GOOD', color: C.teal, size: 44, volume: 0.25 });
    if (!halfShown && pos >= GOAL / 2 && state === S.PLAYING) {
      halfShown = true;
      game.fx.popup(pos + ' / ' + GOAL, W / 2, H * 0.2, { color: C.gold, size: 56 });
      game.audio.play('se_milestone', 0.4);
    }
    pickMax = Math.max(1.7, pickMax - 0.15); // 選ぶ時間がだんだん短く
    startRoll();
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg3], [0.35, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.025 + 0.025 * Math.sin(t * 1.2));
    // 天井の豆電球の列(遊園地の薄明かり)
    for (var i = 0; i < 12; i++) {
      var bx = 50 + i * 90;
      game.draw.sprite(BULB, { '#': (i + Math.floor(t * 3)) % 3 === 0 ? C.gold : C.lav }, bx, 250 + Math.sin(i) * 8, 8, { anchor: 'center' });
    }
    // 壁の大きな水玉(からくり館の飾り)
    for (var d = 0; d < 6; d++) game.draw.circle((d * 223) % W, 420 + (d * 157) % 700, 60, C.lav, 0.08);
  }

  function drawBoard() {
    var t = game.time.elapsed;
    // 通路のつながり
    for (var i = 1; i <= GOAL; i++) {
      var a = tilePos(i - 1), b = tilePos(i);
      game.draw.line(a.x, a.y, b.x, b.y, C.ink, 24);
    }
    for (var k = 0; k <= GOAL; k++) {
      var p = tilePos(k);
      var col = k % 2 ? C.tile : C.tile2;
      game.draw.rect(p.x - 62, p.y - 62, 124, 124, C.ink);
      game.draw.rect(p.x - 56, p.y - 56, 112, 112, col);
      if (traps[k]) {
        // 回転床(危険物: 赤系の渦。常に見えている=予告)
        var sp = t * (spinTile === k && spinT > 0 ? 18 : 3);
        for (var r = 0; r < 4; r++) {
          var a2 = sp + r * Math.PI / 2;
          game.draw.line(p.x, p.y, p.x + Math.cos(a2) * 46, p.y + Math.sin(a2) * 46, C.red, 10);
          game.draw.circle(p.x + Math.cos(a2) * 46, p.y + Math.sin(a2) * 46, 8, C.red);
        }
        game.draw.circle(p.x, p.y, 14, C.white, 0.6);
        if (spinTile === k && spinT > 0) game.draw.rect(p.x - 62, p.y - 62, 124, 124, C.white, spinT);
      }
      if (stars[k]) game.draw.sprite(STAR, { '#': C.gold }, p.x, p.y + Math.sin(t * 4 + k) * 5, 12, { anchor: 'center' });
    }
    // 出口(ゴール): 光るゲート
    var g = tilePos(GOAL);
    game.draw.circle(g.x, g.y, 90 + Math.sin(t * 4) * 8, C.gold, 0.2);
    game.draw.sprite(GATE, { '#': C.gold, 'o': C.white }, g.x, g.y - 20, 14, { anchor: 'center' });
    // お手本: 最初の1手だけ、各サイコロの着地マスに同じ色の印
    if (tutorial && phase === 'pick') {
      for (var d = 0; d < 3; d++) {
        var lp = tilePos(pos + dice[d].v);
        game.draw.circle(lp.x + (d - 1) * 30, lp.y + 40, 14, DIE_COL[d], 0.6 + 0.4 * Math.sin(t * 8));
      }
    }
  }

  function drawHog() {
    var t = game.time.elapsed;
    var i0 = Math.floor(shown), f = shown - i0;
    var a = tilePos(i0), b = tilePos(i0 + 1);
    var x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    var hop = (phase === 'move' || phase === 'back') ? Math.abs(Math.sin(phaseT / 0.12 * Math.PI)) * 30 : 0;
    game.draw.circle(x, y + 40, 34, '#000000', 0.3);
    game.draw.circle(x + 30, y - 30, 70, C.gold, 0.12 + 0.05 * Math.sin(t * 5)); // ランタンの灯り
    game.draw.sprite(Math.floor(t * 6) % 2 === 0 ? HOG_A : HOG_B, HOG_PAL, x, y - 20 - hop + Math.sin(t * 4) * 3, 13, { anchor: 'center', flipX: hopDir < 0 && phase === 'back' });
    if (finished && hitStop > 0) game.draw.circle(x, y, 110, C.white, hitStop * 0.6);
  }

  function drawDie(k) {
    var t = game.time.elapsed;
    var r = dieRect(k);
    var v = dice[k].show || dice[k].v;
    var rolling = phase === 'roll';
    var jig = rolling ? Math.sin(t * 40 + k) * 10 : Math.sin(t * 3 + k) * 4;
    var picked = chosen === k && phase !== 'pick';
    var x = r.x, y = r.y + jig;
    if (phase === 'pick') game.draw.rect(x - 10, y - 10, r.w + 20, r.h + 20, C.white, 0.25 + 0.2 * Math.sin(t * 10 + k));
    game.draw.rect(x, y, r.w, r.h, C.ink);
    game.draw.rect(x + 8, y + 8, r.w - 16, r.h - 16, picked ? C.gold : DIE_COL[k]);
    var cx = x + r.w / 2, cy = y + r.h / 2, o = 48;
    var P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
    for (var i = 0; i < P.length; i++) game.draw.circle(cx + P[i][0] * o, cy + P[i][1] * o, 17, C.ink);
  }

  function drawTray() {
    // 親指ゾーン: サイコロ台+選ぶ時間のバー
    game.draw.rect(0, H * 0.77, W, H * 0.23, C.bg1);
    game.draw.rect(0, H * 0.77, W, 10, C.lav);
    for (var k = 0; k < 3; k++) drawDie(k);
    if (phase === 'pick') {
      var f = Math.max(0, pickT / pickMax);
      game.draw.rect(100, H * 0.915, W - 200, 18, C.ink);
      game.draw.rect(100, H * 0.915, (W - 200) * f, 18, f < 0.3 ? C.red : C.teal);
    }
  }

  function drawHud() {
    txt(pos + ' / ' + GOAL, W / 2, 64, 50, C.white);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 108, bw, 18, C.ink);
    game.draw.rect(80, 108, bw * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.red : C.gold);
    game.draw.rect(80, 134, bw, 8, C.ink);
    game.draw.rect(80, 134, bw * (pos / GOAL), 8, C.teal);
    txt('x' + starsGot, W - 80, 186, 38, C.gold, 'right');
    game.draw.sprite(STAR, { '#': C.gold }, W - 180, 186, 8, { anchor: 'center' });
  }

  function drawScene() { drawHall(); drawBoard(); drawHog(); drawTray(); }

  // ── ATTRACT ゴースト実演(実ロジック: 回転床を避ける目を選ぶ→2手目はわざと回転床の目を選んで戻される) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, wait: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n = 0; demo.wait = 0; }
    simulate(dt);
    if (phase === 'end' && phaseT <= 0) { initGame(); ready = 0; }
    demo.press = false;
    if (phase === 'pick') {
      var best = 0, bv = -99, worst = -1;
      for (var k = 0; k < 3; k++) {
        var land = pos + dice[k].v;
        var val = isSafe(dice[k].v) ? dice[k].v : -10;
        if (val > bv) { bv = val; best = k; }
        if (!isSafe(dice[k].v)) worst = k;
      }
      var target = demo.n === 1 && worst >= 0 ? worst : best;
      var r = dieRect(target);
      demo.gx += (r.x + r.w / 2 - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (r.y + r.h / 2 - demo.gy) * Math.min(1, dt * 8);
      demo.wait += dt;
      if (demo.wait > 0.55) { demo.press = true; pickDie(target); demo.n++; demo.wait = 0; }
      if (demo.wait > 0.4) demo.press = true;
    }
    if (pickT !== undefined && phase === 'pick' && pickT < 0.3) pickT = 0.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
    for (var k = 0; k < 3; k++) {
      var r = dieRect(k);
      if (x >= r.x - 20 && x <= r.x + r.w + 20 && y >= r.y - 30 && y <= r.y + r.h + 30) {
        if (!pickDie(k)) game.audio.play('se_tap', 0.1);
        return;
      }
    }
    game.audio.play('se_tap', 0.08);
    game.fx.burst(x, y, { color: C.lav, count: 4, speed: 100 });
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pos === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 64, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.09, 34, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = pos * 40 + starsGot * 100 + (ok ? Math.ceil(timeLeft) * 20 + Math.max(0, 10 - turns) * 30 : 0);
        var st = { tiles: pos, turns: turns, traps: trapsHit, stars: starsGot };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) { var g = tilePos(GOAL); game.fx.burst(g.x, g.y, { color: C.gold, count: 44, speed: 600 }); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5;
        var hp = tilePos(pos);
        game.feedback.bad(hp.x, hp.y, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 96, C.gold);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 90, ok ? C.gold : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, C.bg1, 0.6);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, ok ? C.gold : C.red);
    txt(pos + ' / ' + GOAL, W / 2, H * 0.34, 70, C.white);
    txt(turns + '回', W / 2, H * 0.4, 48, C.teal);
    var score = pos * 40 + starsGot * 100 + (ok ? Math.ceil(timeLeft) * 20 + Math.max(0, 10 - turns) * 30 : 0);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.46, 52, C.gold);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.46, 40, C.white);
    if (!ok) txt('あと' + (GOAL - pos) + 'マス!', W / 2, H * 0.52, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['D#4', 0.5], ['E4', 0.5], ['C4', 0.5], ['B3', 1], ['A3', 0.5], ['E4', 0.5], ['A4', 1]], { tempo: 124, wave: 'triangle', volume: 0.045, loop: true, bass: [['A2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

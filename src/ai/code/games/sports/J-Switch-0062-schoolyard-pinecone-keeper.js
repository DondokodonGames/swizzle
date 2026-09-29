// J-Switch-0062-schoolyard-pinecone-keeper.js
// 分校の松ぼっくり番 — 指に付いてくるゴール番を左右に動かし、曲がって飛んでくる松ぼっくり玉をゴール前で止め続ける
// 操作: 画面のどこでも押したまま左右に動かすと、ゴール番がその位置へ付いてくる。蹴り手が構えて光ったら玉の曲がりを読み、ゴールラインに届く位置で待つ(社内メモ。画面には出さない)
// 終わり: 全12本を3点取られる前にしのげばCLEAR。3点取られる/時間切れでGAME OVER
// @mechanic: drag_follow
// @theme: schoolyard_pinecone_keeper
// 世界観: 山の分校の夕暮れの校庭で、ゴール番を任された見習いの子ダヌキが、キツネ組の子どもたちが順番に蹴り込んでくる曲がる松ぼっくり玉を、指先ひとつで左右に走ってゴール前ではじき返し、下校の鐘まで守り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 止めた本数・金の玉を止めた数・取られた点
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色の細かいドット + 夕陽のライティング + 奥行きのパララックス
  var STYLE = { bg: ['#ff9a5a', '#c85a7a', '#3a2a5a'], main: ['#5aa04a', '#3a7a3a', '#f4e6c8'], accent: ['#ffd84a', '#ff4a4a'] };
  var C = {
    sky1: '#3a2a5a', sky2: '#c85a7a', sky3: '#ff9a5a', sun: '#ffe08a', hill1: '#5a4a7a', hill2: '#4a6a5a',
    grass1: '#5aa04a', grass2: '#3a7a3a', line: '#f4f0e0', school: '#c88a5a', roof: '#8a3a3a',
    gold: '#ffd84a', red: '#ff4a4a', white: '#fffaf0', ink: '#1a1024', good: '#9dffb2', bad: '#ff3b5c', cone: '#9a5a2a'
  };

  var GAME_TITLE = 'PINECONE KEEPER';
  var TIME_LIMIT = 22;
  var SHOTS = 12;
  var MAX_GOALS = 3;
  var GOAL_Y = H * 0.72;
  var GOAL_L = W * 0.1, GOAL_R = W * 0.9;
  var KICK_Y = H * 0.33;
  var KEEP_R = 105;
  var KEEP_SPD = 2600;
  var WINDUP = 0.6;
  var KICKERS = [W * 0.24, W * 0.5, W * 0.76];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, keeperX, fingerX, balls, shotIdx, nextShot, saves, golds, goals, hitStop, outro, ok, endFx, focusBall, netShake, streak, kickAnim;

  // ── sprites ─────────────────────────────────────────────────────
  var TANUKI = [
    ['..bb....bb..', '.bbbbbbbbbb.', '.bwwkbbkwwb.', '.bkkbwwbkkb.', '..bbwnnwbb..', 'gg.bbbbbb.gg', 'ggbccccccbgg', 'gg.cccccc.gg', '...cccccc...', '...bb..bb...', '..kkk..kkk..'],
    ['..bb....bb..', '.bbbbbbbbbb.', '.bwwkbbkwwb.', '.bkkbwwbkkb.', '..bbwnnwbb..', '.gg.bbbb.gg.', '.ggccccccgg.', '..cccccccc..', '...cccccc...', '..bb....bb..', '.kkk....kkk.']
  ];
  var FOX = [
    ['o......o', 'oo....oo', 'oooooooo', 'owkoowko', '.oowwoo.', '..oooo..', '.rrrrrr.', '.rrrrrr.', '..w..w..', '..k..k..'],
    ['o......o', 'oo....oo', 'oooooooo', 'owkoowko', '.oowwoo.', '..oooo..', '.rrrrrr.', 'rrrrrrr.', '..w...w.', '..k....k']
  ];
  var CONE = ['..cc..', '.cdcd.', 'cdcdcd', 'dcdcdc', '.cdcd.', '..dd..'];
  var PAL_T = { b: '#8a6a4a', w: '#f0e6d0', k: C.ink, n: '#3a2a1a', g: C.gold, c: '#4a8ad8' };
  var PAL_F = { o: '#e8843a', w: '#fff4e0', k: C.ink, r: '#d84a6a' };

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; keeperX = W / 2; fingerX = null;
    balls = []; shotIdx = 0; nextShot = 0.4; saves = 0; golds = 0; goals = 0;
    hitStop = 0; outro = 0; ok = false; endFx = false; focusBall = null; netShake = 0; streak = 0; kickAnim = [0, 0, 0];
  }

  // 1本ぶんの蹴り(後半ほど速く・大きく曲がる。9本目以降は2本同時もある)
  function queueShot(i) {
    var k = Math.floor(Math.random() * 3);
    var p = i / (SHOTS - 1);
    var gx = GOAL_L + 80 + Math.random() * (GOAL_R - GOAL_L - 160);
    var bend = (Math.random() < 0.5 ? -1 : 1) * (50 + 170 * p) * (Math.random() < 0.25 ? 0 : 1);
    return { k: k, wind: WINDUP, kx: KICKERS[k], gx: gx, bend: bend, T: 1.05 - 0.3 * p, s: 0, x: KICKERS[k], y: KICK_Y, h: 0,
      gold: i === 5 || i === 10, state: 'wind', vx: 0, vy: 0, life: 0 };
  }

  function launch(demo) {
    var b = queueShot(shotIdx);
    balls.push(b);
    shotIdx++;
    if (shotIdx >= 8 && shotIdx < SHOTS && shotIdx % 2 === 0) {
      var b2 = queueShot(shotIdx);
      b2.k = (b.k + 1 + Math.floor(Math.random() * 2)) % 3; b2.kx = KICKERS[b2.k]; b2.x = b2.kx;
      b2.wind = WINDUP + 0.35;
      if (Math.abs(b2.gx - b.gx) < 260) b2.gx = b.gx < W / 2 ? b.gx + 320 : b.gx - 320;
      balls.push(b2); shotIdx++;
    }
    var p = shotIdx / SHOTS;
    nextShot = 1.75 - 0.55 * p;
    if (!demo) game.audio.tone('E5', 0.07, { wave: 'square', volume: 0.04 });
  }

  function ballPos(b) {
    var s = b.s;
    b.x = b.kx + (b.gx - b.kx) * s + b.bend * Math.sin(Math.PI * s);
    b.y = KICK_Y + (GOAL_Y - KICK_Y) * s;
    b.h = Math.sin(Math.PI * s) * 120;
  }

  function step(dt, demo) {
    // ゴール番は指へ向かって速く(上限つきで)付いていく
    if (fingerX !== null) {
      var d = fingerX - keeperX, mv = KEEP_SPD * dt;
      keeperX += Math.abs(d) < mv ? d : (d > 0 ? mv : -mv);
    }
    keeperX = Math.max(GOAL_L + 40, Math.min(GOAL_R - 40, keeperX));
    if (netShake > 0) netShake -= dt;
    for (var q = 0; q < 3; q++) if (kickAnim[q] > 0) kickAnim[q] -= dt;
    if (shotIdx < SHOTS) {
      nextShot -= dt;
      if (nextShot <= 0) launch(demo);
    }
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.state === 'wind') {
        b.wind -= dt;
        if (b.wind <= 0) {
          b.state = 'fly'; kickAnim[b.k] = 0.25;
          if (!demo) game.audio.play('se_jump', 0.3);
        }
      } else if (b.state === 'fly') {
        b.s += dt / b.T;
        if (b.s >= 1) {
          b.s = 1; ballPos(b);
          if (Math.abs(b.x - keeperX) <= KEEP_R + 22) {
            b.state = 'saved'; b.vx = (b.x - keeperX) * 6; b.vy = -900; b.life = 0.7;
            saves++; streak++;
            if (b.gold) golds++;
            if (demo) { game.fx.burst(b.x, GOAL_Y - 40, { color: C.gold, count: 8, speed: 200 }); continue; }
            game.feedback.good(b.x, GOAL_Y - 160, { text: b.gold ? 'PERFECT' : 'NICE', color: b.gold ? C.gold : C.good, count: b.gold ? 18 : 10 });
            if (b.gold) game.audio.play('se_coin', 0.5);
            if (streak > 0 && streak % 4 === 0) { game.audio.play('se_milestone', 0.4); game.fx.popup('x' + streak, W / 2, H * 0.25, { color: C.gold, size: 64 }); }
          } else {
            b.state = 'goal'; b.life = 0.6; goals++; streak = 0; netShake = 0.4;
            if (demo) { game.fx.burst(b.x, GOAL_Y + 20, { color: C.red, count: 8, speed: 160 }); continue; }
            if (goals >= MAX_GOALS) { focusBall = b; endRun(false); return; }
            game.feedback.bad(b.x, GOAL_Y - 140, { text: 'MISS', color: C.bad, shake: 8 });
          }
        } else ballPos(b);
      } else {
        b.life -= dt;
        if (b.state === 'saved') { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 1400 * dt; }
        if (b.life <= 0) balls.splice(i, 1);
      }
    }
    if (!demo && shotIdx >= SHOTS && balls.length === 0 && phase === 'play') endRun(true);
  }

  function endRun(win) {
    if (phase === 'stop') return;
    ok = win; phase = 'stop'; hitStop = win ? 0.35 : 0.55; endFx = false;
    game.audio.stopBgm();
  }

  function score() { return saves * 100 + golds * 100 + (ok ? (MAX_GOALS - goals) * 150 : 0); }

  // ── input ───────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.4); state = S.ATTRACT; initGame(); demo.t = 0; startTheme(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    fingerX = x;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(x, H * 0.86, { color: C.white, count: 4, speed: 90 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    fingerX = x;
    if (Math.random() < 0.03) game.audio.tone('A4', 0.02, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    fingerX = null;
    game.audio.tone('E4', 0.03, { wave: 'triangle', volume: 0.025 });
  });

  // ── demo(玉の落ち先を読んで先回り。3本に1本は読み遅れて取られる)─────
  var demo = { t: 0, n: 0 };
  var DEMO_CYC = 12;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; nextShot = 0.3; demo.n = 0; }
    var tgt = null;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.state === 'fly' && (!tgt || b.s > tgt.s)) tgt = b;
    }
    if (tgt) {
      var late = (shotIdx % 3 === 2) && tgt.s < 0.8;
      fingerX = late ? tgt.kx : tgt.gx;
    } else fingerX = W / 2 + Math.sin(demo.t * 1.3) * 120;
    if (shotIdx >= SHOTS && balls.length === 0) { shotIdx = 0; nextShot = 0.5; }
    step(dt, true);
  }

  // ── drawing ─────────────────────────────────────────────────────
  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, KICK_Y, [[0, C.sky1], [0.55, C.sky2], [1, C.sky3]]);
    game.draw.circle(W * 0.7, KICK_Y - 150, 110, C.sun, 0.25 + 0.05 * Math.sin(t * 1.2));
    game.draw.circle(W * 0.7, KICK_Y - 150, 70, C.sun, 0.9);
    // パララックスの山(遠→近)
    for (var m = 0; m < 12; m++) {
      var mx = ((m * 130 - t * 6) % (W + 260)) - 130;
      game.draw.rect(mx, KICK_Y - 150 + (m % 3) * 20, 140, 160, C.hill1, 0.8);
    }
    for (var n = 0; n < 9; n++) {
      var nx = ((n * 170 - t * 14) % (W + 340)) - 170;
      game.draw.rect(nx, KICK_Y - 90 + (n % 2) * 24, 180, 100, C.hill2, 0.9);
    }
    // 分校の校舎
    game.draw.rect(W * 0.06, KICK_Y - 150, 300, 120, C.school);
    game.draw.rect(W * 0.04, KICK_Y - 175, 340, 30, C.roof);
    for (var w = 0; w < 5; w++) game.draw.rect(W * 0.06 + 20 + w * 56, KICK_Y - 120, 36, 40, C.sun, 0.55 + 0.25 * Math.sin(t * 2 + w));
    game.draw.rect(W * 0.06 + 140, KICK_Y - 210, 24, 40, C.roof);
    game.draw.circle(W * 0.06 + 152, KICK_Y - 222, 16, C.gold, 0.8);
    // 校庭(奥ほど狭い芝の帯)
    game.draw.gradient(KICK_Y - 30, H, [[0, C.grass1], [0.6, C.grass2], [1, '#2a5a2a']]);
    for (var r = 0; r < 12; r++) {
      var ry = KICK_Y - 20 + r * r * 9;
      game.draw.rect(0, ry, W, 4 + r, C.grass2, 0.35);
    }
    game.draw.rect(GOAL_L - 60, GOAL_Y + 6, GOAL_R - GOAL_L + 120, 8, C.line, 0.8);
    // 夕陽のライティング(周囲の明滅)
    game.draw.rect(0, 0, W, H, C.sun, 0.03 + 0.02 * Math.sin(t * 1.1));
  }

  function drawKickers() {
    var t = game.time.elapsed;
    for (var k = 0; k < 3; k++) {
      var winding = false;
      for (var i = 0; i < balls.length; i++) if (balls[i].state === 'wind' && balls[i].k === k) winding = true;
      var x = KICKERS[k] + Math.sin(t * 1.5 + k * 2) * 10;
      var y = KICK_Y - 60 + Math.sin(t * 3 + k) * 4 - (winding ? 10 : 0);
      if (winding && Math.floor(t * 12) % 2 === 0) game.draw.circle(x, y + 10, 80, C.gold, 0.45);
      game.draw.circle(x, KICK_Y + 5, 40, C.ink, 0.25);
      game.draw.sprite(FOX[kickAnim[k] > 0 ? 1 : Math.floor(t * 2 + k) % 2], PAL_F, x, y, 9, { anchor: 'center' });
    }
  }

  function drawBalls() {
    var t = game.time.elapsed;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.state === 'wind') {
        game.draw.sprite(CONE, { c: b.gold ? C.gold : C.cone, d: b.gold ? '#c89a2a' : '#6a3a1a' }, b.kx + 30, KICK_Y + 10, 6, { anchor: 'center' });
        continue;
      }
      var sc = 6 + b.s * 8;
      var hl = focusBall === b && hitStop > 0;
      if (b.state === 'fly') game.draw.circle(b.x, b.y + 10, 16 + b.s * 16, C.ink, 0.3);
      if (hl) game.draw.circle(b.x, b.y - b.h, 90, C.white, 0.5 + 0.3 * Math.sin(t * 30));
      game.draw.sprite(CONE, { c: b.gold ? C.gold : C.cone, d: b.gold ? '#c89a2a' : '#6a3a1a' }, b.x, b.y - b.h, hl ? sc * 1.5 : sc, { anchor: 'center', alpha: b.state === 'goal' ? 0.8 : 1 });
    }
  }

  function drawGoal() {
    var t = game.time.elapsed;
    var sh = netShake > 0 ? Math.sin(t * 60) * 8 * netShake : 0;
    // ネット
    for (var i = 0; i <= 16; i++) {
      var x = GOAL_L + (GOAL_R - GOAL_L) * i / 16;
      game.draw.line(x, GOAL_Y - 170, x + sh, GOAL_Y + 60, C.white, 2);
    }
    for (var j = 0; j <= 5; j++) {
      var y = GOAL_Y - 170 + j * 46;
      game.draw.line(GOAL_L, y + sh, GOAL_R, y - sh, C.white, 2);
    }
    game.draw.rect(GOAL_L - 14, GOAL_Y - 190, 20, 250, C.white);
    game.draw.rect(GOAL_R - 6, GOAL_Y - 190, 20, 250, C.white);
    game.draw.rect(GOAL_L - 14, GOAL_Y - 190, GOAL_R - GOAL_L + 28, 18, C.white);
  }

  function drawKeeper() {
    var t = game.time.elapsed;
    var moving = fingerX !== null && Math.abs(fingerX - keeperX) > 20;
    game.draw.circle(keeperX, GOAL_Y + 30, 70, C.ink, 0.3);
    game.draw.rect(keeperX - KEEP_R, GOAL_Y + 26, KEEP_R * 2, 6, C.gold, 0.35);
    game.draw.sprite(TANUKI[moving ? Math.floor(t * 10) % 2 : Math.floor(t * 2) % 2], PAL_T, keeperX, GOAL_Y - 40 + Math.sin(t * 4) * 3, 14, { anchor: 'center' });
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.ink, 0.35);
    game.draw.rect(GOAL_L, H * 0.86 - 6, GOAL_R - GOAL_L, 12, C.line, 0.4);
    game.draw.circle(keeperX, H * 0.86, 34 + 3 * Math.sin(t * 5), C.gold, 0.85);
    game.draw.circle(keeperX, H * 0.86, 16, C.white);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.7);
    txt(saves + ' / ' + SHOTS, W / 2, 90, 64, C.gold);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 90, 52, C.white, 'left');
    for (var i = 0; i < MAX_GOALS; i++) game.draw.circle(W - 200 + i * 64, 90, 22, i < goals ? C.red : '#5a4a6a');
    var lowT = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 18, '#3a2a4a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? C.bad : C.gold);
  }

  function drawAll() { drawField(); drawKickers(); drawGoal(); drawKeeper(); drawBalls(); drawThumb(); }

  function startTheme() {
    game.audio.melody([['C5', 0.5], ['A4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['C4', 0.5], ['D4', 0.5], ['F4', 1], ['E4', 1]],
      { tempo: 126, wave: 'square', volume: 0.045, loop: true, bass: [['F2', 2], ['C2', 2], ['Bb1', 2], ['C2', 2]] });
  }

  // ── main loop ───────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawAll();
      game.draw.hand(keeperX, H * 0.86 + 20, { press: true, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.7);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 96 + Math.sin(t * 2.2) * 6, 70, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 184, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawField(); drawKickers(); drawGoal(); drawKeeper();
      game.draw.rect(0, H * 0.36, W, H * 0.24, C.ink, 0.65);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.41, 96, ok ? C.gold : C.bad);
      txt(saves + ' / ' + SHOTS, W / 2, H * 0.47, 56, C.white);
      txt('SCORE ' + score(), W / 2, H * 0.52, 44, C.white);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.565, 34, C.line);
      if (!ok && SHOTS - shotIdx <= 2) txt('あと' + Math.max(1, SHOTS - shotIdx) + '本!', W / 2, H * 0.84, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 38, C.white);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      step(dt, false);
      if (phase === 'play') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endRun(false); }
      }
    } else if (phase === 'stop') {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0 && !endFx) {
          endFx = true;
          if (ok) {
            game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.gold, count: 26 });
            game.audio.play('se_success', 0.6);
          } else {
            var fx = focusBall ? focusBall.x : W / 2;
            game.feedback.bad(fx, GOAL_Y - 160, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', color: C.bad });
            game.audio.play('se_failure', 0.6);
          }
          outro = 1.2;
        }
      } else {
        outro -= dt;
        if (outro <= 0) {
          state = S.RESULT;
          var stats = { saves: saves, golds: golds, goals: goals, shots: shotIdx };
          if (ok) game.end.success(score(), stats); else game.end.failure(stats);
        }
      }
    }

    drawAll(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startTheme();
  });
})(game);

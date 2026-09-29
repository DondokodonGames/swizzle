// J-Switch-0038-mudflat-ostrich-lean.js
// でこぼこダチョウ競走 — 岩と轍だらけの赤土コースで、並走するダチョウに体当たりされても鞍から落ちないよう重心を保ち、旗まで駆け込む
// 操作: 画面の左半分タップで左へ、右半分タップで右へ体を傾ける。岩を踏む・横から当てられると反対側へ大きく傾くので、先に逆へ体重を移して真ん中に戻す。真ん中を保つほど速く走る(社内メモ。画面には出さない)
// 終わり: 800m先の旗に着けばCLEAR(タイムでスコア)。3回落鞍/22秒でTIME UPならGAME OVER
// @mechanic: balance
// @theme: red_clay_ostrich_derby
// 世界観: 雨上がりの赤土の牧場で開かれるダチョウ競走に初出場した少年騎手が、岩と轍だらけのでこぼこ道を、左右から体をぶつけてくる他のダチョウに揺さぶられながらも鞍の上で重心を保ち、先頭でゴールの旗へ駆け込む
// 残るもの: 正誤(CLEAR/GAME OVER) + ゴールタイム・落鞍回数・ブースト回数のスコア
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい空、原色+白縁、光の柱と祝祭演出
  var STYLE = { bg: ['#6ad0ff', '#fff4c0'], main: ['#e8563a', '#ffd23a', '#3a7aff'], accent: ['#ffffff', '#ff3a8a'] };
  var C = {
    sky1: '#48b8ff', sky2: '#bfeaff', sun: '#fff4a0', hill: '#6ad06a', hillD: '#3aa04a',
    clay1: '#d8703a', clay2: '#b8542a', clayL: '#f09050', rut: '#8a3a1a', rail: '#ffffff', railR: '#ff3a8a',
    rock: '#9a8a7a', rockD: '#5a4e44', good: '#3ae07a', bad: '#ff3a4a', gold: '#ffd23a', white: '#ffffff', ink: '#1a1030', blue: '#3a7aff'
  };

  var GAME_TITLE = 'OSTRICH DERBY';
  var TIME_LIMIT = 22;
  var GOAL = 800;
  var VMAX = 58;
  var MAX_FALL = 3;
  var K_UNSTABLE = 3.0;
  var TAP_PUSH = 0.95;
  var JOLT = 1.5;
  var BUMP = 2.1;
  var WARN = 0.7;

  var HOR = Math.round(H * 0.3);
  var PLY = Math.round(H * 0.66);
  var PAD_Y = Math.round(H * 0.86);
  var METER_Y = Math.round(H * 0.77);
  var MID_Y = Math.round(H * 0.45);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var dist, theta, omega, speed, obstacles, rivals, nextObs, nextBump, falls, timeLeft, ready, hitStop, remount, finished, ok, endWait;
  var score, steadyT, boostT, boosts, recoverWatch, bestAtStart, halfShown, runAnim, tapFlash, bumpSide;

  // ダチョウ(胴と脚)と騎手(傾き3段)
  var BIRD = [
    ['....hhhh....', '....hebh....', '.....nn.....', '.....nn.....', '....kkkk....', '..kkkkkkkk..', '.kkwkkkkwkk.', 'kkkkkkkkkkkk', '.kkkkkkkkkk.', '..kkkkkkkk..', '...ll..ll...', '...ll...l...', '..ll.....l..', '..l......ll.'],
    ['....hhhh....', '....hbeh....', '.....nn.....', '.....nn.....', '....kkkk....', '..kkkkkkkk..', '.kkwkkkkwkk.', 'kkkkkkkkkkkk', '.kkkkkkkkkk.', '..kkkkkkkk..', '...ll..ll...', '...l...ll...', '..l.....ll..', '.ll......l..']
  ];
  var BIRD_PAL = { h: '#f0b8a0', e: '#1a1030', n: '#f0b8a0', b: '#ffd23a', k: '#2a2230', w: '#ffffff', l: '#f0b8a0' };
  var RIVAL_PAL = { h: '#e8c8b0', e: '#1a1030', n: '#e8c8b0', b: '#ffb040', k: '#6a5a8a', w: '#ffffff', l: '#e8c8b0' };
  var RIDER = [
    ['hhh...', 'fff...', '.rr...', 'rrrr..', '.rr...'],
    ['.hhh..', '.fff..', '..rr..', '.rrrr.', '..rr..'],
    ['...hhh', '...fff', '...rr.', '..rrrr', '...rr.']
  ];
  var RIDER_PAL = { h: '#e8563a', f: '#f8d0a8', r: '#3a7aff' };
  var ROCK = ['..rrrr..', '.rRRrrr.', 'rRRrrrrd', 'rrrrrrdd', '.dddddd.'];
  var ROCK_PAL = { r: C.rock, R: '#d8ccc0', d: C.rockD };
  var FLAG = ['wkwkwk', 'kwkwkw', 'wkwkwk', 'kwkwkw'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    dist = 0; theta = 0; omega = 0; speed = 0;
    obstacles = []; rivals = [
      { side: -1, x: 0, t: 0, phase: 'idle', pull: 0 },
      { side: 1, x: 0, t: 0, phase: 'idle', pull: 0 }
    ];
    nextObs = 1.0; nextBump = 3.0; bumpSide = 1;
    falls = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; remount = 0;
    finished = false; ok = false; endWait = 0; score = 0; steadyT = 0; boostT = 0; boosts = 0;
    recoverWatch = 0; halfShown = false; runAnim = 0; tapFlash = { side: 0, t: 0 };
    bestAtStart = game.best || 0;
  }

  // ── 共通ロジック ────────────────────────────────────────
  function lean(side) {
    if (finished || hitStop > 0 || remount > 0 || ready > 0) return false;
    omega += side * TAP_PUSH;
    tapFlash = { side: side, t: 0.15 };
    return true;
  }

  function progressK() { return Math.min(1, dist / GOAL); }

  function spawn(dt) {
    nextObs -= dt;
    if (nextObs <= 0) {
      // 加速型: 後半ほど間隔が詰まる
      nextObs = game.random(1.0, 1.4) - progressK() * 0.35;
      var side = Math.random() < 0.5 ? -1 : 1;
      obstacles.push({ d: 70, side: side, hit: false });
    }
    nextBump -= dt;
    if (nextBump <= 0) {
      nextBump = game.random(2.6, 3.4) - progressK() * 0.6;
      var r = rivals[bumpSide < 0 ? 0 : 1];
      if (r.phase === 'idle') { r.phase = 'warn'; r.t = WARN; game.audio.tone(880, 0.08, { wave: 'square', volume: 0.05 }); }
      bumpSide = -bumpSide;
    }
  }

  function stepRace(dt, countTime) {
    if (tapFlash.t > 0) tapFlash.t -= dt;
    if (finished) return;
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        remount = 0.6;
        theta = 0; omega = 0;
        if (falls >= MAX_FALL) finish(false);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.35);
      return;
    }
    if (countTime) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, PLY - 300, { text: 'TIME UP' });
        finish(false);
        return;
      }
    }
    if (remount > 0) { remount -= dt; speed = VMAX * 0.3; dist += speed * dt; runAnim += dt * 0.5; return; }

    // 倒立振子: 傾きは放っておくと育つ。減衰は緩め(retain 0.5/秒)
    var terrain = 0.5 * Math.sin(dist * 0.21) * Math.sin(dist * 0.083 + 1.1);
    omega += (K_UNSTABLE * theta + terrain) * dt;
    omega *= Math.pow(0.5, dt);
    theta += omega * dt;

    // 真ん中を保つとブースト(スパイス)
    if (Math.abs(theta) < 0.15) {
      steadyT += dt;
      if (steadyT > 1.8 && boostT <= 0) {
        boostT = 1.6; boosts++; steadyT = 0;
        game.audio.play('se_powerup', 0.35);
        game.fx.popup('+25%', W / 2, PLY - 360, { color: C.gold, size: 52 });
      }
    } else steadyT = 0;
    if (boostT > 0) boostT -= dt;

    speed = VMAX * (1 - 0.5 * Math.min(1, Math.abs(theta))) * (boostT > 0 ? 1.25 : 1);
    dist += speed * dt;
    runAnim += dt * speed / VMAX;

    spawn(dt);
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.d -= speed * dt;
      if (!o.hit && o.d <= 0) {
        o.hit = true;
        omega += -o.side * JOLT;  // 左足で岩を踏むと右へ傾く
        recoverWatch = 0.9;
        game.audio.play('se_break', 0.25);
        game.fx.shake(6, 0.15);
      }
      if (o.d < -12) obstacles.splice(i, 1);
    }
    for (var r = 0; r < rivals.length; r++) {
      var rv = rivals[r];
      if (rv.phase === 'warn') {
        rv.t -= dt; rv.pull = 1 - rv.t / WARN;
        if (rv.t <= 0) {
          rv.phase = 'hit'; rv.t = 0.35;
          omega += -rv.side * BUMP;
          recoverWatch = 1.0;
          game.audio.play('se_break', 0.4);
          game.fx.shake(10, 0.2);
        }
      } else if (rv.phase === 'hit') {
        rv.t -= dt; rv.pull = rv.t / 0.35;
        if (rv.t <= 0) { rv.phase = 'idle'; rv.pull = 0; }
      }
    }
    if (recoverWatch > 0) {
      recoverWatch -= dt;
      if (recoverWatch <= 0 && Math.abs(theta) < 0.3) {
        score += 150;
        game.feedback.good(W / 2, PLY - 300, { text: 'NICE', color: C.good });
      }
    }
    if (!halfShown && dist >= GOAL / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup((GOAL / 2) + 'm', W / 2, MID_Y - 200, { color: C.gold, size: 64 });
    }
    if (Math.abs(theta) >= 1) {
      falls++;
      hitStop = 0.5;
      theta = theta > 0 ? 1 : -1;
      game.feedback.bad(W / 2 + theta * 90, PLY - 240, { text: 'MISS', shake: 14 });
      return;
    }
    if (dist >= GOAL) { dist = GOAL; finish(true); }
  }

  function finish(win) {
    if (finished) return;
    finished = true; ok = win; endWait = 1.3;
    if (win) score += Math.round(timeLeft * 120) + boosts * 100 + (MAX_FALL - falls) * 150;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    if (win) {
      game.audio.play('se_success', 0.6);
      game.fx.flash(C.gold, 0.3);
      game.fx.burst(W / 2, PLY - 300, { color: C.gold, count: 36, speed: 600 });
    } else game.audio.play('se_failure', 0.6);
  }

  // ── 描画 ──────────────────────────────────────────────
  function scaleAt(d) { return 8 / (Math.max(-6, d) + 8); }
  function yAt(d) { return HOR + (PLY - HOR) * scaleAt(d); }

  function drawCourse() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR, [C.sky1, C.sky2]);
    game.draw.circle(W * 0.8, H * 0.12, 80, C.sun, 0.9);
    for (var p = 0; p < 5; p++) game.draw.rect(80 + p * 220 + Math.sin(t + p) * 10, 0, 50, HOR, C.white, 0.08 + 0.05 * Math.sin(t * 2 + p));
    for (var hx = 0; hx < W; hx += 20) {
      var hh = 40 + 30 * Math.sin((hx + dist * 0.6) * 0.01) + 20 * Math.sin(hx * 0.031);
      game.draw.rect(hx, HOR - hh, 20, hh, C.hill, 1);
      game.draw.rect(hx, HOR - hh, 20, 6, C.hillD, 1);
    }
    // 床(横ストリップを奥ほど圧縮)
    for (var y = HOR; y < 1440; y += 6) {
      var sc = (y - HOR) / (PLY - HOR);
      if (sc <= 0.02) sc = 0.02;
      var dd = 8 / sc - 8;
      var band = Math.floor((dd + dist) / 6) % 2 === 0;
      var half = 360 * sc;
      game.draw.rect(0, y, W, 6, band ? C.hill : C.hillD, 1);
      game.draw.rect(W / 2 - half - 30 * sc, y, 30 * sc, 6, band ? C.rail : C.railR, 1);
      game.draw.rect(W / 2 + half, y, 30 * sc, 6, band ? C.rail : C.railR, 1);
      game.draw.rect(W / 2 - half, y, half * 2, 6, band ? C.clay1 : C.clay2, 1);
      game.draw.rect(W / 2 - half * 0.45, y, 10 * sc + 1, 6, C.rut, 0.6);
      game.draw.rect(W / 2 + half * 0.45, y, 10 * sc + 1, 6, C.rut, 0.6);
    }
    // ゴール旗(近づくと大きく)
    var gd = GOAL - dist;
    if (gd < 70) {
      var gy = yAt(gd), gs = scaleAt(gd);
      game.draw.line(W / 2 - 380 * gs, gy, W / 2 - 380 * gs, gy - 300 * gs, C.white, 8 * gs + 1);
      game.draw.line(W / 2 + 380 * gs, gy, W / 2 + 380 * gs, gy - 300 * gs, C.white, 8 * gs + 1);
      game.draw.sprite(FLAG, { w: C.white, k: C.ink }, W / 2, gy - 300 * gs, 40 * gs + 1, { anchor: 'center' });
    }
  }

  function drawObstacles() {
    var t = game.time.elapsed;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.d > 70 || o.d < -6) continue;
      var s = scaleAt(o.d), y = yAt(o.d);
      var x = W / 2 + o.side * 170 * s;
      // telegraph: 当たる0.7秒前から赤く点滅
      var eta = o.d / Math.max(10, speed);
      if (eta < WARN && !o.hit && Math.floor(t * 12) % 2 === 0) game.draw.circle(x, y - 10 * s, 60 * s, C.bad, 0.5);
      game.draw.sprite(ROCK, ROCK_PAL, x, y - 12 * s, 14 * s + 1, { anchor: 'center' });
    }
  }

  function drawRunners(hl) {
    var t = game.time.elapsed;
    var f = Math.floor(runAnim * 10) % 2;
    // 並走するライバル(演出のみ)
    for (var r = 0; r < rivals.length; r++) {
      var rv = rivals[r];
      var bx = W / 2 + rv.side * (400 - 170 * rv.pull) + Math.sin(t * 2 + r) * 14;
      var by = PLY - 90 + Math.sin(t * 9 + r) * 8;
      game.draw.sprite(BIRD[(f + r) % 2], RIVAL_PAL, bx, by, 12, { anchor: 'center' });
      if (rv.phase === 'warn') {
        var blink = Math.floor(t * 12) % 2 === 0;
        game.draw.rect(bx - 8, by - 250, 16, 56, blink ? C.bad : C.white, 1);
        game.draw.rect(bx - 8, by - 184, 16, 16, blink ? C.bad : C.white, 1);
      }
    }
    // 自分
    var bob = Math.sin(runAnim * 20) * 8;
    var lx = W / 2 + theta * 26;
    game.draw.rect(W / 2 - 100, PLY + 26, 200, 18, C.ink, 0.25);
    game.draw.sprite(BIRD[f], BIRD_PAL, lx, PLY - 90 + bob, 17, { anchor: 'center', alpha: remount > 0 && Math.floor(t * 12) % 2 ? 0.4 : 1 });
    var frame = theta < -0.25 ? 0 : theta > 0.25 ? 2 : 1;
    var rx = W / 2 + theta * 90;
    var ry = PLY - 200 + bob + Math.abs(theta) * 40;
    if (hitStop > 0) { rx = W / 2 + theta * 190; ry = PLY - 120; }
    game.draw.sprite(RIDER[frame], RIDER_PAL, rx, ry, 17, { anchor: 'center' });
    if (hl) {
      game.draw.circle(rx, ry, 110, C.white, 0.5);
      game.draw.sprite(RIDER[frame], { h: C.white, f: C.white, r: C.white }, rx, ry, 21, { anchor: 'center' });
    }
    if (boostT > 0) for (var k = 0; k < 4; k++) game.draw.rect(W / 2 - 150 + k * 100, PLY + 30 + ((t * 900 + k * 60) % 140), 12, 50, C.gold, 0.8);
  }

  function drawControls() {
    var t = game.time.elapsed;
    game.draw.gradient(1440, H, ['#ffe8a0', '#ffc860']);
    // 重心メーター(赤いトゲの両端=落鞍)
    var mw = 760, mx = W / 2 - mw / 2;
    game.draw.rect(mx - 6, METER_Y - 26, mw + 12, 52, C.white, 1);
    game.draw.rect(mx, METER_Y - 20, mw, 40, '#2a2240', 1);
    game.draw.rect(W / 2 - mw * 0.075, METER_Y - 20, mw * 0.15, 40, C.good, 0.8);
    for (var sp = 0; sp < 3; sp++) {
      game.draw.rect(mx + sp * 14, METER_Y - 20, 10, 40, C.bad, 1);
      game.draw.rect(mx + mw - 10 - sp * 14, METER_Y - 20, 10, 40, C.bad, 1);
    }
    var mk = W / 2 + Math.max(-1, Math.min(1, theta)) * (mw / 2 - 10);
    game.draw.rect(mk - 10, METER_Y - 34, 20, 68, Math.abs(theta) > 0.7 && Math.floor(t * 10) % 2 === 0 ? C.bad : C.gold, 1);
    // 左右の傾けパッド
    for (var s = -1; s <= 1; s += 2) {
      var cx = W / 2 + s * 250;
      var lit = tapFlash.t > 0 && tapFlash.side === s;
      game.draw.circle(cx, PAD_Y, 150, C.white, 1);
      game.draw.circle(cx, PAD_Y, 138, lit ? C.gold : (s < 0 ? C.blue : C.railR), 1);
      game.draw.circle(cx, PAD_Y, 138, C.white, 0.1 + 0.08 * Math.sin(t * 4 + s));
      for (var a = 0; a < 5; a++) game.draw.rect(cx - s * 40 + s * a * 16 - 8, PAD_Y - 40 + a * 8, 16, 80 - a * 16, C.white, 1);
    }
    game.draw.rect(0, 0, W, H, '#fff8e0', 0.03 + 0.03 * Math.sin(t * 1.6));
  }

  function drawHud() {
    var bw = W - 200;
    game.draw.rect(100, 150, bw, 20, C.white, 1);
    game.draw.rect(104, 154, (bw - 8) * progressK(), 12, C.gold, 1);
    game.draw.sprite(FLAG, { w: C.white, k: C.ink }, 100 + bw + 30, 160, 8, { anchor: 'center' });
    txt(Math.max(0, Math.ceil(GOAL - dist)) + 'm', 100, 100, 46, C.white, 'left');
    txt(timeLeft.toFixed(1), W / 2 + 60, 100, 46, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? C.bad : C.white);
    for (var m = 0; m < MAX_FALL; m++) game.draw.sprite(RIDER[1], m < falls ? { h: '#888888', f: '#888888', r: '#888888' } : RIDER_PAL, W - 90 - m * 70, 90, 8, { anchor: 'center' });
    game.draw.rect(100, 190, bw * Math.max(0, timeLeft / TIME_LIMIT), 8, C.blue, 1);
  }

  // ── ATTRACTデモ ────────────────────────────────────────
  var DEMO_CYC = 8;
  var demo = { t: 0, gx: W / 2, gy: PAD_Y, press: false, cool: 0, lazy: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; nextBump = 1.4; nextObs = 0.6; demo.lazy = false;
    }
    // 2回目の体当たりはわざと見逃して落ちる(失敗例)
    if (cyc > 4.2 && falls === 0) demo.lazy = true;
    if (falls > 0) demo.lazy = false;
    demo.cool -= dt;
    demo.press = demo.cool > 0.08;
    var predict = theta + omega * 0.3;
    if (!demo.lazy && demo.cool <= 0 && Math.abs(predict) > 0.18 && remount <= 0 && hitStop <= 0) {
      var side = predict > 0 ? -1 : 1;
      if (lean(side)) {
        demo.cool = 0.2;
        demo.gx = W / 2 + side * 250; demo.gy = PAD_Y;
        game.audio.play('se_tap', 0.08);
      }
    }
    stepRace(dt, false);
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    var side = x < W / 2 ? -1 : 1;
    if (lean(side)) {
      game.audio.tone(side < 0 ? 520 : 620, 0.05, { wave: 'square', volume: 0.06 });
      game.fx.burst(W / 2 + side * 250, PAD_Y, { color: C.gold, count: 5, speed: 160 });
    } else {
      game.audio.play('se_tap', 0.1);
    }
  });

  // ── メインループ(1本だけ) ─────────────────────────────
  game.onUpdate(function(dt) {
    if (obstacles === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawCourse(); drawObstacles(); drawRunners(hitStop > 0); drawControls();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var lb = Math.sin(game.time.elapsed * 2.2) * 8;
      txt(GAME_TITLE, W / 2, H * 0.07 + lb, 76, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.11, 34, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H - 40, 44, C.bad);
      else txt('TAP TO START', W / 2, H - 40, 38, C.ink);
      return;
    }

    if (state === S.RESULT) {
      runAnim += dt * 0.3;
      drawCourse(); drawRunners(false); drawControls();
      var t = game.time.elapsed;
      if (ok) {
        for (var s = 0; s < 8; s++) game.draw.rect(40 + s * 135, 0, 40, HOR + 200, s % 2 ? C.gold : C.white, 0.15 + 0.1 * Math.sin(t * 5 + s));
        txt('CLEAR', W / 2, MID_Y - 250 + Math.sin(t * 5) * 10, 120, C.gold);
        txt((TIME_LIMIT - timeLeft).toFixed(1) + '秒', W / 2, MID_Y - 130, 56, C.white);
      } else {
        txt('GAME OVER', W / 2, MID_Y - 250, 100, C.bad);
        txt('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, MID_Y - 130, 56, C.white);
      }
      txt('SCORE ' + score, W / 2, MID_Y - 40, 56, C.white);
      if (ok && score > bestAtStart) txt('NEW RECORD', W / 2, MID_Y + 50, 54, C.gold);
      else txt('BEST ' + bestAtStart, W / 2, MID_Y + 50, 42, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H - 40, 38, C.ink);
      return;
    }

    // PLAYING
    if (finished) {
      endWait -= dt;
      runAnim += dt * (ok ? 1 : 0.2);
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { distance: Math.round(dist), falls: falls, boosts: boosts, time: Math.round((TIME_LIMIT - timeLeft) * 10) / 10 };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else {
      stepRace(dt, true);
    }
    drawCourse(); drawObstacles(); drawRunners(hitStop > 0); drawControls(); drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, MID_Y - 200, 110, C.gold);
    if (finished) txt(ok ? 'FINISH' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, MID_Y - 200, 96, ok ? C.gold : C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 1.5], ['R', 0.5]
    ], { tempo: 168, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G3', 1], ['A2', 1], ['E3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

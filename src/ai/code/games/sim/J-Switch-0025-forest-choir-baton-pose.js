// J-Switch-0025-forest-choir-baton-pose.js
// 森の合唱団 指揮のまね — 師匠のミミズクが指揮棒で決めた両腕の構えを、左右の親指で自分の両腕を動かしてそっくり素早く再現する
// 操作: 画面下の左半分で上下になぞると左腕、右半分で右腕が動く。両腕を師匠と同じ角度にそろえて少し保つ(社内メモ。画面には出さない)
// 終わり: 6つの構えを決めればCLEAR。間に合わない(1つ3秒)が2回/全体の時間切れでGAME OVER
// @mechanic: coop_2zone
// @theme: forest_choir_baton_pose
// 世界観: 夜の森の切り株ステージで開かれる合唱団の稽古、見習い指揮者のアライグマが、師匠のミミズクが次々に決める両腕の構えを左右の手で同時にまねて、夜明けの本番の指揮台に立つ許しをもらう
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めた構えの数・平均のずれ(度)・最速の決め秒
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドットの絵 + 横帯のカラーセロハン
  var STYLE = { bg: ['#0c0c0c', '#1a1a1a'], main: ['#f4f4f4', '#bdbdbd'], accent: ['#ffb640', '#46e0c8', '#8cff5a'] };
  var C = { bg1: '#0a0a0a', bg2: '#1c1c1c', w: '#f4f4f4', g: '#9a9a9a', d: '#3a3a3a', amber: '#ffb640', cyan: '#46e0c8', green: '#8cff5a', red: '#ff5a5a' };

  var GAME_TITLE = 'BATON POSE';
  var TIME_LIMIT = 20;
  var NEEDED = 6;
  var MAX_MISS = 2;
  var TOL = 13, HOLD_T = 0.25;
  var ANGLES = [-60, -30, 0, 30, 60];
  var TRACK_TOP = H * 0.64, TRACK_BOT = H * 0.93;
  var TRACK_X = [W * 0.14, W * 0.86];
  var OWL_X = W * 0.5, OWL_Y = H * 0.3, ME_X = W * 0.5, ME_Y = H * 0.54;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var notches = { l: 0, r: 0 };
  var phase, ready, timeLeft, poses, misses, target, shown, feint, arms, holdT, poseT, poseLimit, hitStop, outro, ok, sumErr, fastest, halfShown, flashPose;

  var OWL = [
    ['.w......w.', '.ww.ww.ww.', '.wwwwwwww.', 'ww.ww.ww.w', 'wwwwwwwwww', '.www..www.', '.wwwwwwww.', '..wwwwww..', '..w.ww.w..', '..ww..ww..'],
    ['.w......w.', '.ww.ww.ww.', '.wwwwwwww.', 'wwwwwwwwww', 'wwwwwwwwww', '.www..www.', '.wwwwwwww.', '..wwwwww..', '..w.ww.w..', '..ww..ww..']
  ];
  var RACCOON = [
    ['w..wwww..w', 'ww.wwww.ww', '.wwwwwwww.', 'w..wwww..w', 'w.w.ww.w.w', '.wwwwwwww.', '..wwwwww..', '.wwwwwwww.', '.ww.ww.ww.', '.w......w.'],
    ['w..wwww..w', 'ww.wwww.ww', '.wwwwwwww.', 'w..wwww..w', 'wwwwwwwwww', '.wwwwwwww.', '..wwwwww..', '.wwwwwwww.', '.ww.ww.ww.', '..w....w..']
  ];
  var NOTE = ['..ww', '..w.', '..w.', 'www.', 'ww..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function pickPose() {
    var l, r, tries = 0;
    do {
      l = ANGLES[Math.floor(game.random(0, 5)) % 5]; r = ANGLES[Math.floor(game.random(0, 5)) % 5]; tries++;
    } while (tries < 20 && target && Math.abs(l - target.l) + Math.abs(r - target.r) < 50);
    return { l: l, r: r };
  }

  // 次の構え。4つ目からは一瞬ちがう構えを見せてから決める(フェイント)
  function nextPose() {
    target = pickPose();
    feint = poses >= 3 ? { l: target.l > 0 ? target.l - 60 : target.l + 60, r: target.r, t: 0.35 } : null;
    shown = feint ? { l: feint.l, r: feint.r } : { l: target.l, r: target.r };
    holdT = 0; poseT = 0;
    poseLimit = Math.max(2.4, 3.0 - poses * 0.1);
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; poses = 0; misses = 0;
    hitStop = 0; outro = 0; ok = false; sumErr = 0; fastest = 99; halfShown = false; flashPose = 0;
    arms = { l: -70, r: -70 }; target = null;
    nextPose();
  }

  function yToAngle(y) {
    var u = Math.max(0, Math.min(1, (y - TRACK_TOP) / (TRACK_BOT - TRACK_TOP)));
    return 75 - u * 150;
  }
  function angleToY(a) { return TRACK_TOP + (75 - a) / 150 * (TRACK_BOT - TRACK_TOP); }

  function setArmFrom(x, y) {
    if (y < TRACK_TOP - 120) return false;
    var side = x < W / 2 ? 'l' : 'r';
    arms[side] = yToAngle(y);
    var notch = Math.round((arms[side] + 60) / 30);
    if (notch !== notches[side]) {
      notches[side] = notch;
      if (state === S.PLAYING) game.audio.tone(side === 'l' ? 'C5' : 'G5', 0.03, { wave: 'square', volume: 0.025 });
    }
    return true;
  }

  // 1フレーム分の判定(実プレイ・デモ共用)
  function stepPose(dt, isDemo) {
    poseT += dt;
    if (flashPose > 0) flashPose -= dt;
    if (feint) {
      feint.t -= dt;
      if (feint.t <= 0) { feint = null; shown = { l: target.l, r: target.r }; if (!isDemo) game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.04 }); }
    }
    var match = !feint && Math.abs(arms.l - target.l) <= TOL && Math.abs(arms.r - target.r) <= TOL;
    holdT = match ? holdT + dt : 0;
    if (match && holdT >= HOLD_T) { lockPose(isDemo); return; }
    if (poseT >= poseLimit) missPose(isDemo);
  }

  function lockPose(isDemo) {
    var err = (Math.abs(arms.l - target.l) + Math.abs(arms.r - target.r)) / 2;
    var took = poseT;
    flashPose = 0.45;
    if (isDemo) { game.fx.burst(ME_X, ME_Y - 80, { color: C.w, count: 12, speed: 260 }); poses = (poses + 1) % 4; nextPose(); return; }
    poses++; sumErr += err;
    if (took < fastest) fastest = took;
    game.feedback.good(ME_X, ME_Y - 190, { text: err < 5 ? 'PERFECT' : 'GOOD', color: C.green, count: 16 });
    game.audio.play('se_coin', 0.3);
    if (!halfShown && poses >= NEEDED / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(poses + ' / ' + NEEDED, W / 2, H * 0.42, { color: C.amber, size: 72 });
    }
    if (poses >= NEEDED) { finish(true); return; }
    nextPose();
  }

  function missPose(isDemo) {
    if (isDemo) { game.fx.burst(OWL_X, OWL_Y, { color: C.red, count: 8, speed: 200 }); nextPose(); return; }
    misses++;
    if (misses >= MAX_MISS) { finish(false); return; }
    hitStop = 0.45;
    game.feedback.bad(ME_X, ME_Y - 190, { text: 'MISS', color: C.red });
    nextPose();
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.amber, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, H * 0.42, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.red });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    if (setArmFrom(x, y)) { game.audio.play('se_tap', 0.2); game.fx.burst(x < W / 2 ? TRACK_X[0] : TRACK_X[1], angleToY(x < W / 2 ? arms.l : arms.r), { color: C.cyan, count: 4, speed: 90 }); }
    else game.audio.tone('D3', 0.05, { wave: 'square', volume: 0.03 });
  });

  // ── demo(2本の親指で左右の腕を同時に合わせる。3回に1回は片腕がずれたまま時間切れ)──
  var demo = { t: 0, lx: TRACK_X[0], ly: TRACK_BOT, rx: TRACK_X[1], ry: TRACK_BOT, n: 0, last: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { poses = 0; demo.n = 0; arms = { l: -70, r: -70 }; target = null; nextPose(); demo.last = target; }
    if (demo.last !== target) { demo.last = target; demo.n++; }
    var lazy = demo.n % 3 === 2;
    var goalL = feint ? arms.l : target.l, goalR = feint ? arms.r : (lazy ? target.r + 45 : target.r);
    var k = Math.min(1, dt * 4.5);
    if (poseT > 0.3) { arms.l += (goalL - arms.l) * k; arms.r += (goalR - arms.r) * k; }
    demo.ly = angleToY(arms.l); demo.ry = angleToY(arms.r);
    stepPose(dt, true);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function armLine(x, y, ang, side, len, col, wdt, alpha) {
    var rad = ang * Math.PI / 180;
    var ex = x + side * Math.cos(rad) * len, ey = y - Math.sin(rad) * len;
    if (alpha !== undefined && alpha < 1) {
      for (var i = 0; i <= 6; i++) { var u = i / 6; game.draw.circle(x + (ex - x) * u, y + (ey - y) * u, wdt / 2, col, alpha); }
    } else game.draw.line(x, y, ex, ey, col, wdt);
    return { x: ex, y: ey };
  }

  function drawStage() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg1]]);
    // 星と木々(白ドット)
    for (var s = 0; s < 40; s++) {
      var sx = (s * 263) % W, sy = 240 + (s * 137) % 260;
      game.draw.rect(sx, sy, 5, 5, C.w, 0.3 + 0.3 * Math.sin(t * 2 + s));
    }
    for (var tr = 0; tr < 7; tr++) {
      var tx = 40 + tr * 170, th = 180 + (tr % 3) * 60;
      for (var k = 0; k < th; k += 14) game.draw.rect(tx - (th - k) * 0.25, H * 0.44 - th + k, (th - k) * 0.5, 7, C.d);
    }
    // 切り株ステージ
    game.draw.rect(W * 0.18, H * 0.43, W * 0.64, 24, C.g);
    game.draw.rect(W * 0.22, H * 0.43 + 24, W * 0.56, 60, C.d);
    // 音符が漂う
    for (var n = 0; n < 4; n++) {
      var nx = W * 0.1 + ((n * 280 + t * 60) % (W * 0.8)), ny = H * 0.2 + Math.sin(t * 2 + n) * 40;
      game.draw.sprite(NOTE, { w: C.w }, nx, ny, 9, { anchor: 'center', alpha: 0.5 });
    }
  }

  function drawOwl() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 2) % 2;
    var sh = OWL_Y - 20;
    armLine(OWL_X - 70, sh, shown.l, -1, 170, C.w, 18);
    var eR = armLine(OWL_X + 70, sh, shown.r, 1, 170, C.w, 18);
    game.draw.line(eR.x, eR.y, eR.x + 30, eR.y - 50, C.amber, 6);
    game.draw.sprite(OWL[fr], { w: C.w }, OWL_X, OWL_Y + Math.sin(t * 2.2) * 5, 16, { anchor: 'center' });
    if (feint && Math.floor(t * 20) % 2 === 0) game.draw.circle(OWL_X, OWL_Y, 150, C.w, 0.08);
  }

  function drawMe(ghost) {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 3) % 2;
    var sh = ME_Y - 20;
    if (ghost && !feint) {
      armLine(ME_X - 60, sh, target.l, -1, 150, C.w, 16, 0.18);
      armLine(ME_X + 60, sh, target.r, 1, 150, C.w, 16, 0.18);
    }
    if (flashPose > 0 && Math.floor(t * 14) % 2 === 0) game.draw.circle(ME_X, ME_Y - 30, 190, C.w, 0.25);
    var okL = Math.abs(arms.l - target.l) <= TOL && !feint, okR = Math.abs(arms.r - target.r) <= TOL && !feint;
    armLine(ME_X - 60, sh, arms.l, -1, 150, okL ? C.green : C.w, 16);
    var eR = armLine(ME_X + 60, sh, arms.r, 1, 150, okR ? C.green : C.w, 16);
    game.draw.line(eR.x, eR.y, eR.x + 26, eR.y - 44, C.amber, 5);
    game.draw.sprite(RACCOON[fr], { w: C.w }, ME_X, ME_Y + Math.sin(t * 2.8) * 5, 14, { anchor: 'center' });
    // 決めの保持ゲージ
    if (holdT > 0) game.draw.rect(ME_X - 80, ME_Y + 90, 160 * Math.min(1, holdT / HOLD_T), 12, C.green);
  }

  function drawTracks() {
    var t = game.time.elapsed;
    for (var i = 0; i < 2; i++) {
      var x = TRACK_X[i];
      game.draw.rect(x - 8, TRACK_TOP, 16, TRACK_BOT - TRACK_TOP, C.d);
      for (var a = 0; a < ANGLES.length; a++) game.draw.rect(x - 34, angleToY(ANGLES[a]) - 2, 68, 4, C.g, 0.6);
      var ky = angleToY(i === 0 ? arms.l : arms.r);
      game.draw.circle(x, ky, 40, C.w);
      game.draw.circle(x, ky, 26, C.d);
    }
    // 左右の領域(親指ゾーン)
    game.draw.rect(W / 2 - 2, TRACK_TOP, 4, TRACK_BOT - TRACK_TOP, C.d, 0.5 + 0.2 * Math.sin(t * 2));
    if (phase === 'play' || state === S.ATTRACT) {
      var p = Math.max(0, 1 - poseT / poseLimit);
      game.draw.rect(W * 0.3, H * 0.62, W * 0.4, 12, C.d);
      game.draw.rect(W * 0.3, H * 0.62, W * 0.4 * p, 12, p < 0.3 ? C.red : C.w);
    }
    for (var n = 0; n < NEEDED; n++) game.draw.sprite(NOTE, { w: n < poses ? C.w : C.d }, W * 0.32 + n * 72, H * 0.96, 8, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W * 0.78 + m * 70, H * 0.955, 46, 16, m < misses ? C.red : C.d);
  }

  function drawBands() {
    // カラーセロハンの横帯
    game.draw.rect(0, 0, W, 230, C.amber, 0.18);
    game.draw.rect(0, H * 0.14, W, H * 0.33, C.cyan, 0.08);
    game.draw.rect(0, H * 0.6, W, H * 0.4, C.green, 0.07);
    game.draw.rect(0, 0, W, H, C.w, 0.015 + 0.015 * Math.sin(game.time.elapsed * 1.3));
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, '#000000', 0.7);
    txt(poses + ' / ' + NEEDED, W / 2, 90, 66, C.w);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.w, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.d);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.red : C.w);
  }

  function score() { return poses * 250 + (poses > 0 ? Math.max(0, Math.round((TOL - sumErr / poses) * 20)) : 0) + Math.round(timeLeft * 10); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawStage(); drawOwl(); drawMe(true); drawTracks(); drawBands();
      game.draw.hand(TRACK_X[0], demo.ly, { press: true, scale: 12 });
      game.draw.hand(TRACK_X[1], demo.ry, { press: true, scale: 12 });
      game.draw.rect(0, 0, W, 230, '#000000', 0.7);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.amber);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.w);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.6, 42, C.amber);
      else txt('INSERT COIN', W / 2, H * 0.6, 36, C.w);
      return;
    }

    if (state === S.RESULT) {
      drawStage(); drawBands();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.green : C.red);
      txt('BEST ' + game.best, W / 2, H * 0.46, 40, C.w);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.85, 38, C.w);
      return;
    }

    if (phase === 'play' || phase === 'ready') {
      for (var i = 0; i < game.touches.length; i++) setArmFrom(game.touches[i].x, game.touches[i].y);
    }
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepPose(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { poses: poses, avgErr: poses > 0 ? Math.round(sumErr / poses) : 0, fastest: fastest < 99 ? Math.round(fastest * 10) / 10 : 0 };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawStage(); drawOwl(); drawMe(poses < 2); drawTracks(); drawBands(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 96, C.amber);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.36, W, H * 0.16, '#000000', 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.green : C.red);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.w);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.amber);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - poses) + '回!', W / 2, H * 0.49, 44, C.w);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.w);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 1], ['F#4', 0.5], ['A4', 0.5], ['D5', 1], ['C#5', 0.5], ['B4', 0.5],
      ['A4', 1], ['G4', 0.5], ['F#4', 0.5], ['E4', 2]
    ], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

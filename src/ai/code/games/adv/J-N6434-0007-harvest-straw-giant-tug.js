// J-N6434-0007-harvest-straw-giant-tug.js
// 藁の大人形と綱引き — 押し続けて踏ん張り力を溜め、大人形がよろけた瞬間に離して一気に引く
// 操作: 押している間は足を踏ん張って力が溜まる(引き戻されにくい)。大人形がよろけた間に離すと大きく引ける。平時に離すと逆に引かれる
// 終わり: 大引きを3回決めればCLEAR。大人形の線まで引かれる/時間切れでGAME OVER
// @mechanic: hold_charge
// @theme: harvest_straw_giant_tug
// 世界観: 刈り入れの終わった夕暮れの畑で、祭りの夜に動き出した藁の大人形と村の若い農夫が一本の大綱を引き合い、大人形が藁束の足をもつれさせてよろける一瞬に溜めた力を叩きつけて畦の溝へ引き倒す
// 残るもの: 正誤(CLEAR/GAME OVER) + 決まった大引きの回数と最大チャージ
// スタイル: 90s BIG SPRITE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面を圧する巨大キャラ、床影、間合いで見せる多色パレット
  var COL = {
    sky1: '#f0a860', sky2: '#c85838', cliff: '#6a7a48', cliff2: '#4a5a34', ground: '#c8a060', ground2: '#9a7038',
    stone: '#e8c060', stone2: '#a8782c', moss: '#c83828', eye: '#ff7020', rope: '#e8d0a0',
    skin: '#f0b890', vest: '#2a58a8', hair: '#3a2418', white: '#ffffff', red: '#e83030', gold: '#ffd040', ink: '#20140c'
  };

  var GAME_TITLE = 'STRAW GIANT';
  var TIME_LIMIT = 14;
  var NEEDED = 3;
  var KNOT_MID = H * 0.5;
  var KNOT_SPAN = H * 0.16;
  var CHARGE_TIME = 1.1;
  var OVERHOLD = 3.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var GIANT_STAND = [
    '....SSSS....',
    '...SSSSSS...',
    '...SeSSeS...',
    '...SSDDSS...',
    '.MMSSSSSSMM.',
    'SSSSSSSSSSSS',
    'SS.SSMSSS.SS',
    'SS.SSSSSS.SS',
    'SS.SSSSMS.SS',
    'hh.SSSSSS.hh',
    '...SS..SS...',
    '...SS..SS...',
    '..DSS..SSD..',
    '..DDD..DDD..'
  ];
  var GIANT_REEL = [
    '.......SSSS.',
    '......SSSSSS',
    '......SeSSeS',
    '......SSDDSS',
    '....MMSSSSSM',
    '..SSSSSSSSSS',
    '.SS.SSMSSS.S',
    'SS..SSSSSS.S',
    'SS..SSSSMS.S',
    'hh..SSSSSS.h',
    '....SS..SS..',
    '...SS....SS.',
    '..DSS.....SD',
    '..DDD.......'
  ];
  var BOSS = [
    [
      '..hhhh..',
      '.hssssh.',
      '..ssss..',
      '.vvvvvv.',
      'svvvvvvs',
      's.vvvv.s',
      '..vvvv..',
      '..kk.kk.',
      '.kk...kk',
      'kk.....k'
    ],
    [
      '..hhhh..',
      '.hssssh.',
      '..ssss..',
      'svvvvvvs',
      '.vvvvvv.',
      '..vvvv..',
      '..vvvv..',
      '.kk..kk.',
      'kk....kk',
      'k......k'
    ]
  ];
  var PEBBLE = ['.oo.', 'oooo', '.oo.'];

  var mark, bigPulls, maxCharge, timeLeft, ready, hitStop, endWait, done, ok, why;
  var holding, holdT, charge, powerAnnounced, giant, pullAnim, flashT;

  function initGame() {
    mark = 0; bigPulls = 0; maxCharge = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
    holding = false; holdT = 0; charge = 0; powerAnnounced = false;
    giant = { mode: 'idle', t: 1.6 };
    pullAnim = 0; flashT = 0;
  }

  function giantStep(dt) {
    giant.t -= dt;
    if (giant.t > 0) return;
    if (giant.mode === 'idle') {
      giant.mode = 'warn'; giant.t = 0.6;
      game.audio.tone('C2', 0.4, { wave: 'sawtooth', volume: 0.06, slide: 20 });
    } else if (giant.mode === 'warn') {
      giant.mode = 'reel'; giant.t = 0.75;
      game.audio.tone('G2', 0.2, { wave: 'square', volume: 0.05, slide: -40 });
    } else {
      giant.mode = 'idle'; giant.t = game.random(1.3, 2.1);
    }
  }

  function simStep(dt) {
    giantStep(dt);
    if (pullAnim > 0) pullAnim -= dt;
    if (flashT > 0) flashT -= dt;
    if (holding) {
      holdT += dt;
      charge = Math.min(1, holdT / CHARGE_TIME);
    }
    var drag = giant.mode === 'reel' ? 0 : (holding ? 0.03 : 0.07);
    mark -= drag * dt;
    if (mark >= 1) return 'won';
    if (mark <= -1) return 'lost';
    return null;
  }

  // 手を離した時の判定: 'great' | 'weak' | 'yank'
  function releasePull() {
    var c = charge;
    holding = false; holdT = 0; charge = 0; powerAnnounced = false;
    if (c > maxCharge) maxCharge = c;
    if (giant.mode === 'reel' && c >= 0.6) {
      mark += 0.2 + 0.26 * c; bigPulls++; pullAnim = 0.35;
      giant.mode = 'idle'; giant.t = game.random(1.2, 1.8);
      return 'great';
    }
    if (giant.mode === 'reel') { mark += 0.08; pullAnim = 0.2; return 'weak'; }
    mark -= 0.1;
    return 'yank';
  }

  function knotY() { return KNOT_MID + mark * KNOT_SPAN; }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 5, y + 5, { size: size, color: COL.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color || COL.white, bold: true, align: 'center' });
  }

  function shadow(cx, cy, rw, rh, a) {
    for (var i = -rh; i <= rh; i += 4) {
      var k = Math.sqrt(Math.max(0, 1 - (i * i) / (rh * rh)));
      game.draw.rect(cx - rw * k, cy + i, rw * 2 * k, 4, COL.ink, a);
    }
  }

  function drawStage() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.4, [[0, COL.sky1], [1, COL.sky2]]);
    // 遠景の丘と藁塚(3層)
    for (var x = 0; x < W; x += 60) {
      var h1 = 120 + Math.sin(x * 0.01) * 60;
      game.draw.rect(x, H * 0.26 - h1, 62, h1 + 40, COL.cliff2);
      var h2 = 60 + Math.sin(x * 0.023 + 2) * 30;
      game.draw.rect(x, H * 0.33 - h2, 62, h2 + 20, COL.cliff);
    }
    for (var hs = 0; hs < 4; hs++) {
      var hx = 90 + hs * 300 + (hs % 2) * 60;
      game.draw.circle(hx, H * 0.33, 58, COL.stone2);
      game.draw.circle(hx - 10, H * 0.325, 44, COL.stone);
    }
    game.draw.gradient(H * 0.33, H, [[0, COL.ground], [1, COL.ground2]]);
    for (var r = 0; r < 8; r++) game.draw.rect(0, H * 0.36 + r * r * 16, W, 4, COL.ground2, 0.6);
    // 刈り株の列
    for (var st = 0; st < 24; st++) game.draw.rect((st * 97) % W, H * 0.42 + ((st * 53) % 6) * 110, 6, 22, COL.stone2, 0.7);
    // 畦の溝(境界)と両陣の線
    game.draw.rect(W * 0.1, KNOT_MID - 6, W * 0.8, 12, COL.ink, 0.5);
    game.draw.rect(W * 0.3, KNOT_MID + KNOT_SPAN - 5, W * 0.4, 10, COL.gold);
    game.draw.rect(W * 0.3, KNOT_MID - KNOT_SPAN - 5, W * 0.4, 10, COL.red);
    // 舞う籾殻(常時)
    for (var p = 0; p < 6; p++) {
      var px = (t * (40 + p * 12) + p * 170) % W;
      var py = H * 0.4 + p * 90 + Math.sin(t * 2 + p) * 20;
      game.draw.sprite(PEBBLE, { o: COL.ground2 }, px, py, 5, { anchor: 'center', alpha: 0.6 });
    }
    game.draw.rect(0, 0, W, H, COL.sky1, 0.03 + 0.03 * Math.sin(t * 1.2));
  }

  function drawActors() {
    var t = game.time.elapsed;
    var ky = knotY();
    var reel = giant.mode === 'reel';
    var warn = giant.mode === 'warn';
    // 藁の大人形(M=赤い帯)
    var gy = H * 0.2 + mark * 60 + Math.sin(t * 1.6) * 6;
    var gx = W / 2 + (warn ? Math.sin(t * 40) * 8 : 0);
    shadow(W / 2, H * 0.32 + mark * 60, 220, 26, 0.35);
    var gpal = { S: COL.stone, D: COL.stone2, M: COL.moss, e: warn || reel ? COL.eye : COL.stone2, h: COL.stone2 };
    if (flashT > 0) gpal = { S: COL.white, D: COL.white, M: COL.white, e: COL.white, h: COL.white };
    game.draw.sprite(reel ? GIANT_REEL : GIANT_STAND, gpal, gx, gy, 30, { anchor: 'center' });
    if (warn) {
      for (var d = 0; d < 4; d++) game.draw.circle(W / 2 - 150 + d * 100, H * 0.32 + Math.sin(t * 20 + d) * 6, 22, COL.ground, 0.7);
    }
    // 大綱
    var handY = gy + 80;
    game.draw.line(W / 2, handY, W / 2, H * 0.8, COL.rope, 22);
    for (var s = handY; s < H * 0.8; s += 40) game.draw.line(W / 2 - 11, s, W / 2 + 11, s + 20, COL.ground2, 5);
    // 結び目(赤い布)
    game.draw.rect(W / 2 - 44, ky - 22, 88, 44, COL.red);
    game.draw.rect(W / 2 - 44, ky - 22, 88, 8, COL.white, 0.5);
    // 若い農夫(親指ゾーン)
    var fr = holding ? 1 : 0;
    var by = H * 0.83 + (pullAnim > 0 ? 24 : 0) + Math.sin(t * 2.4) * 4;
    shadow(W / 2, H * 0.89, 120, 16, 0.35);
    game.draw.sprite(BOSS[fr], { h: COL.hair, s: COL.skin, v: COL.vest, k: COL.ink }, W / 2, by, 20, { anchor: 'center' });
  }

  function drawCharge() {
    var cx = W / 2, cy = H * 0.83, R = 170;
    var n = 24;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      var lit = i / n < charge;
      var full = charge >= 1;
      game.draw.circle(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 12, lit ? (full ? COL.gold : COL.eye) : COL.ink, lit ? 1 : 0.3);
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W / 2 + (i - 1) * 90, 90, 30, i < bigPulls ? COL.gold : COL.ink, i < bigPulls ? 1 : 0.4);
    txt(bigPulls + ' / ' + NEEDED, W * 0.85, 90, 44);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 170, W - 160, 20, COL.ink, 0.6);
    game.draw.rect(80, 170, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? COL.red : COL.gold);
  }

  // ── ATTRACT: 溜めて→よろけで離す(大引き成功)、平時に離して引き戻される(失敗)を実ロジックで
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, releasedFail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) {
      mark = 0; giant = { mode: 'idle', t: 1.0 }; holding = false; holdT = 0; charge = 0; demo.releasedFail = false;
    }
    var r = simStep(dt);
    if (r) mark = 0;
    if (cyc < 4.8) {
      if (!holding && giant.mode !== 'reel') { holding = true; holdT = 0; }
      if (holding && giant.mode === 'reel' && giant.t < 0.55) {
        releasePull();
        flashT = 0.2;
        game.fx.popup('PERFECT', W / 2, H * 0.62, { color: COL.gold, size: 52 });
        game.fx.burst(W / 2, knotY(), { color: COL.gold, count: 16 });
      }
    } else if (!demo.releasedFail) {
      if (!holding) { holding = true; holdT = 0; }
      if (cyc > 5.4 && giant.mode !== 'reel') {
        releasePull(); demo.releasedFail = true;
        game.fx.popup('MISS', W / 2, H * 0.62, { color: COL.red, size: 52 });
      }
    }
    demo.gx = W / 2 + 60; demo.gy = H * 0.86;
  }

  function endRound(success, reason) {
    ok = success; why = reason; hitStop = 0.5; flashT = 0.5; holding = false; charge = 0;
    game.fx.flash(COL.white, 0.2);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.fx.burst(x, y, { color: COL.rope, count: 2, speed: 80 });
  });

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || done || hitStop > 0 || ready > 0) return;
    holding = true; holdT = 0; charge = 0; powerAnnounced = false;
    game.audio.play('se_tap', 0.3);
    game.fx.burst(W / 2, H * 0.89, { color: COL.ground, count: 6, speed: 120 });
  });

  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !holding || done || hitStop > 0) return;
    var res = releasePull();
    if (res === 'great') {
      game.audio.play('se_jump', 0.4);
      game.feedback.good(W / 2, knotY(), { text: maxCharge >= 0.95 ? 'PERFECT' : 'GOOD', color: COL.gold, count: 18 });
      game.fx.shake(10, 0.2);
      if (bigPulls === NEEDED - 1) { game.audio.play('se_milestone', 0.4); game.fx.popup('あと1回!', W / 2, H * 0.62, { color: COL.white, size: 50 }); }
    } else if (res === 'weak') {
      game.feedback.good(W / 2, knotY(), { text: 'NICE', color: COL.rope, count: 6 });
    } else {
      game.feedback.bad(W / 2, knotY(), { text: 'MISS' });
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (mark === undefined) initGame();
      stepDemo(dt);
      drawStage(); drawActors(); drawCharge();
      game.draw.hand(demo.gx, demo.gy, { press: holding, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 76, COL.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.1, 34);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, COL.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40);
      return;
    }

    if (state === S.RESULT) {
      drawStage(); drawActors();
      var score = bigPulls * 100 + Math.round(maxCharge * 50) + (ok ? Math.ceil(timeLeft) * 10 : 0);
      game.draw.rect(0, H * 0.54, W, H * 0.26, COL.ink, 0.7);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.59, 100, ok ? COL.gold : COL.red);
      txt(bigPulls + ' / ' + NEEDED, W / 2, H * 0.65, 52);
      txt('SCORE ' + score, W / 2, H * 0.7, 42, COL.rope);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.75, 46, COL.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - bigPulls) + '回!', W / 2, H * 0.75, 46);
      txt('BEST ' + game.best, W / 2, H * 0.785, 30);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { bigPulls: bigPulls, maxCharge: Math.round(maxCharge * 100) };
        if (ok) game.end.success(bigPulls * 100 + Math.round(maxCharge * 50) + Math.ceil(timeLeft) * 10, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (flashT > 0) flashT -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        if (ok) { game.feedback.good(W / 2, H * 0.25, { text: 'CLEAR', color: COL.gold, count: 30 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(W / 2, knotY(), { text: why === 'time' ? 'TIME UP' : 'MISS' }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      timeLeft -= dt;
      var r = simStep(dt);
      if (holding && charge >= 1 && !powerAnnounced) { powerAnnounced = true; game.audio.play('se_powerup', 0.35); }
      if (holding && holdT > OVERHOLD) {
        // 握りすぎ(3秒): 綱が手を焼いて滑る
        holding = false; holdT = 0; charge = 0; mark -= 0.12;
        game.feedback.bad(W / 2, H * 0.8, { text: 'MISS' });
      }
      if (r === 'won' || bigPulls >= NEEDED) { mark = Math.max(mark, 1); endRound(true, 'won'); }
      else if (r === 'lost') endRound(false, 'lost');
      else if (timeLeft <= 0) { timeLeft = 0; endRound(false, 'time'); }
    }

    drawStage(); drawActors(); drawCharge(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.62, 100, COL.gold);
  });

  game.onStart(function () {
    game.audio.melody(
      [['A3', 1], ['C4', 0.5], ['D4', 0.5], ['E4', 1], ['D4', 0.5], ['C4', 0.5], ['A3', 1], ['G3', 1], ['A3', 2]],
      { tempo: 108, wave: 'sawtooth', volume: 0.045, loop: true, bass: [['A1', 2], ['A1', 2], ['F1', 2], ['G1', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

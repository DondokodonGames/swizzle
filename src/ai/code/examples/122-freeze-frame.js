// 122-freeze-frame.js
// フリーズフレーム — 旋回する翼竜が裂け目を横切る、その一瞬だけに網を放つ
// 操作: 標的が照準の裂け目に重なった瞬間にタップ
// 成功: 1回 捉える  失敗: 外す or 10秒
// @mechanic: timing_one_shot
// @theme: dino
// 世界観: 恐竜時代の断崖。巣へ戻る翼竜が岩の裂け目を横切る刹那、投網を放つ一発勝負
// variation: 精度型(待つほど照準の裂け目が狭まっていく)
// spice: 逆転ボーナス(残り3秒は得点2倍。待てば高いが、狙いは細る)
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s BIG SPRITE: 多色。巨大キャラ + 床影で間合いを見せる
  var C = {
    sky1: '#ffb46b', sky2: '#ff7a4a', sky3: '#5a2d5c', rock: '#3a2233', rock2: '#5c3a4e',
    wing: '#e8564b', wing2: '#a72f2c', belly: '#ffd9a0', eye: '#1a0d14',
    gold: '#ffd400', good: '#6bff9a', bad: '#ff3d5e', white: '#ffffff',
  };

  var GAME_TITLE = 'FREEZE FRAME';
  var MAX_TIME = 10;
  var GAP_Y = H * 0.42;      // 裂け目(照準)の高さ

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var ang, spin, gapW, score, totalTime, done, shotAt;
  var ready, hitStop, feedback, feedbackOk, shake, flashT;

  // 翼竜(巨大スプライト / 2フレーム)
  var PTERO_A = [
    '.WW........WW.',
    'WWWW......WWWW',
    '.WWWW....WWWW.',
    '..WWWWBBWWWW..',
    '...WWBBBBWW...',
    '....BBEBBB....',
    '.....BBBB.....',
    '......BB......',
  ];
  var PTERO_B = [
    '..............',
    '.WWW......WWW.',
    'WWWWW....WWWWW',
    '..WWWWBBWWWW..',
    '...WWBBBBWW...',
    '....BBEBBB....',
    '.....BBBB.....',
    '......BB......',
  ];
  var PTERO_COL = { W: C.wing, B: C.belly, E: C.eye };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#1a0d14', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }

  function cliffBg() {
    game.draw.gradient(0, H, [[0, C.sky3], [0.32, C.sky2], [0.55, C.sky1], [1, '#2a1520']]);
    // 陽は照準帯(0.31〜0.53H)の外へ。裂け目の中に置くと的と見分けがつかない
    game.draw.circle(W * 0.5, H * 0.17, 150, '#fff0c0', 0.85);
    // 遠景: 断崖(左右)。間に裂け目が空く
    game.draw.rect(0, 0, W * 0.5 - 130, H, C.rock);
    game.draw.rect(W * 0.5 + 130, 0, W * 0.5 - 130, H, C.rock);
    for (var i = 0; i < 14; i++) {
      game.draw.rect(0, i * 150 + 30, W * 0.5 - 130 - (i % 3) * 40, 16, C.rock2);
      game.draw.rect(W * 0.5 + 130 + (i % 3) * 40, i * 150 + 90, W, 16, C.rock2);
    }
    game.draw.rect(0, H * 0.88, W, H * 0.12, '#241019');
  }

  function initGame() {
    ang = Math.PI; spin = 1.5; gapW = 150; score = 0; totalTime = 0;
    done = false; shotAt = -1; ready = 0.8; hitStop = 0;
    feedback = 0; feedbackOk = false; shake = 0; flashT = 0;
  }

  function birdPos() {
    // 楕円軌道で旋回。裂け目を横切るのは角度が下向きのとき
    return { x: W / 2 + Math.cos(ang) * (W * 0.46), y: GAP_Y + Math.sin(ang) * (H * 0.18) };
  }
  function inGap(p) { return Math.abs(p.x - W / 2) < gapW * 0.5 && Math.abs(p.y - GAP_Y) < 190; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.bad, 0.28);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function shoot() {
    var p = birdPos();
    shotAt = totalTime;
    if (inGap(p)) {
      // 逆転ボーナス: 残り3秒からは2倍。待つほど照準は細るという取引
      var late = (MAX_TIME - totalTime) <= 3;
      var gain = (late ? 2 : 1) * (200 + Math.round((150 - gapW) * 4));
      score += gain;
      feedback = 0.35; feedbackOk = true;
      flashT = 0.3;
      game.feedback.good(p.x, p.y, { text: '+' + gain, color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 16, speed: 420 });
      if (late) game.audio.play('se_milestone', 0.7);
      finish(true);
    } else {
      feedback = 0.4; feedbackOk = false;
      hitStop = 0.35; shake = 0.4;
      game.audio.play('se_failure', 0.7);
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      finish(false);
    }
  }

  function drawGap(lit) {
    // 照準の裂け目。狭まっていくので、幅そのものが telegraph になる
    var half = gapW * 0.5;
    game.draw.rect(W / 2 - half, GAP_Y - 210, 8, 420, lit ? C.gold : C.white, 0.9);
    game.draw.rect(W / 2 + half - 8, GAP_Y - 210, 8, 420, lit ? C.gold : C.white, 0.9);
    if (lit) {
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      game.draw.rect(W / 2 - half, GAP_Y - 210, gapW, 420, C.gold, blink ? 0.22 : 0.10);
    }
  }

  function drawBird(p, scale) {
    // 床影で間合いを示す(90s BIG SPRITE の要)
    game.draw.circle(p.x, H * 0.90, 90 - Math.abs(p.y - GAP_Y) * 0.12, '#000000', 0.32);
    var wob = Math.floor(game.time.elapsed * 7) % 2 === 0;
    game.draw.sprite(wob ? PTERO_A : PTERO_B, PTERO_COL, p.x, p.y, scale, { anchor: 'center' });
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    shoot();
  });

  // ── ATTRACT ゴースト実演: 裂け目に重なった刹那に手が落ちる ──
  var demo = { a: Math.PI, gx: W / 2, gy: H * 0.72, press: false, cool: 0 };
  function stepDemo(dt) {
    demo.a += 1.5 * dt;
    var p = { x: W / 2 + Math.cos(demo.a) * (W * 0.46), y: GAP_Y + Math.sin(demo.a) * (H * 0.18) };
    var hit = Math.abs(p.x - W / 2) < 75 && Math.abs(p.y - GAP_Y) < 190;
    demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 4);
    demo.gy += ((hit ? GAP_Y + 250 : H * 0.72) - demo.gy) * Math.min(1, dt * 5);
    if (demo.cool > 0) demo.cool -= dt;
    demo.press = hit && demo.cool <= 0;
    if (demo.press) {
      demo.cool = 1.2;
      game.feedback.good(p.x, p.y, { text: '+200', color: C.good });
    }
    return p;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ang === undefined) initGame();
      cliffBg();
      var dp = stepDemo(dt);
      drawGap(Math.abs(dp.x - W / 2) < 75);
      drawBird(dp, 22);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 72, C.gold);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.14, 40, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.wing);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 38, C.belly);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      cliffBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      drawGap(resultSuccess);
      drawBird(birdPos(), 22);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.72, 92, resultSuccess ? C.good : C.bad);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.80, 56, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.86, 42, C.gold);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.93, 52, C.gold);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.white);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (totalTime >= MAX_TIME) { finish(false); return; }
        ang += spin * dt;
        spin = 1.5 + totalTime * 0.10;
        // 精度型: 待つほど裂け目が細る
        gapW = Math.max(52, 150 - totalTime * 10);
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
      if (flashT > 0) flashT -= dt;
    }

    // draw
    var p = birdPos();
    var lit = inGap(p);
    cliffBg();
    drawGap(lit);
    drawBird(p, 22);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    var late = (MAX_TIME - totalTime) <= 3;
    game.draw.rect(60, 40, W - 120, 24, C.rock);
    game.draw.rect(60, 40, (W - 120) * frac, 24, late ? C.gold : C.good);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 104, 46, C.white);
    txt((done && resultSuccess ? 1 : 0) + ' / 1', W * 0.14, 162, 46, C.belly);
    txt('x' + (late ? 2 : 1), W * 0.86, 162, 46, late ? C.gold : C.belly);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 92, C.gold);
    if (late && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('あと' + Math.ceil(MAX_TIME - totalTime) + '秒', W / 2, H * 0.78, 50, C.gold);

    scanlines();
  });

  game.onStart(function() {
    // 90s BIG SPRITE: 重い足取りの低音と、旋回を煽る高音
    game.audio.melody(
      [['D4', 0.5], ['F4', 0.5], ['A4', 1], ['G4', 0.5], ['F4', 0.5], ['D4', 1],
       ['C4', 0.5], ['E4', 0.5], ['G4', 1]],
      { tempo: 126, wave: 'square', volume: 0.09, loop: true,
        bass: [['D2', 1], ['D2', 1], ['Bb2', 1], ['C3', 1]], bassWave: 'triangle', bassVolume: 0.09 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

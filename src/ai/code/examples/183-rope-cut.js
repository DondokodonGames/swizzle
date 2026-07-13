// 183-rope-cut.js
// ロープカット — 枝で揺れる木の実から、熟した実だけを見つけて摘み取る
// 操作: 熟した(光る)木の実をタップ
// 成功: 制限時間内に 4 個摘む  失敗: 時間切れ
// @mechanic: spot
// @theme: forest
// 世界観: 森の奥のリスが、揺れる枝から熟して光る木の実だけを見分けて摘み集める
// variation: 物量型(進むほど枝に実が増える)
// spice: フィーバータイム(2個摘むと数秒だけ得点2倍)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit(SNES風の土と葉)
  var C = {
    sky: '#2a1e3c', leaf: '#3fa34d', leafDk: '#1e6b34', bark: '#7a4a24',
    ripe: '#ffcf3f', ripeGlow: '#fff29a', dull: '#8a6a3a', red: '#e0483b',
    cream: '#fff4d6', shadow: '#12101f', pink: '#ff9ecb',
  };

  var GAME_TITLE = 'FOREST PICK';
  var MAX_TIME = 10;
  var NEEDED = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var nuts, score, picks, timeLeft, done, ready, fever, hitStop, feedback, feedbackOk;

  // 木の実スプライト(顔つきどんぐり)
  var NUT = [
    '.BBBB.',
    'BBBBBB',
    'NNNNNN',
    'NEWWEN',
    'NNMMNN',
    '.NNNN.',
  ];
  var NUT_RIPE = { B: '#6b4a22', N: C.ripe, E: '#2a1a08', W: '#fff', M: '#b5651d' };
  var NUT_DULL = { B: '#4a3418', N: C.dull, E: '#2a1a08', W: '#d8c8a8', M: '#5a4020' };
  // カゴ
  var BASKET = [
    'K....K',
    'KWWWWK',
    'KWWWWK',
    'KKKKKK',
  ];
  var BASKET_COL = { K: '#7a4a24', W: '#b98a4a' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.shadow, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.12); }

  function forestBg() {
    game.draw.gradient(0, H, [[0, '#33244a'], [0.5, '#24314a'], [1, '#14251c']]);
    // 樹冠
    for (var i = 0; i < 14; i++) {
      var cx = (i * 151) % W, cy = 60 + (i % 3) * 70;
      game.draw.circle(cx, cy, 90, C.leafDk, 0.5);
      game.draw.circle(cx + 30, cy + 10, 60, C.leaf, 0.4);
    }
    // 枝(実がぶら下がる)
    game.draw.rect(0, 210, W, 20, C.bark);
    // 地面
    game.draw.rect(0, H - 130, W, 130, '#2a1c10');
    game.draw.rect(0, H - 130, W, 10, C.leafDk);
  }

  function drawNut(n) {
    // ツル
    game.draw.line(n.ax, 220, n.x, n.y, C.leafDk, 6);
    var glow = n.ripe && Math.floor(game.time.elapsed * 6) % 2 === 0;
    if (n.ripe) game.draw.circle(n.x, n.y, 70, C.ripeGlow, glow ? 0.35 : 0.18);
    game.draw.sprite(NUT, n.ripe ? NUT_RIPE : NUT_DULL, n.x, n.y, 9, { anchor: 'center' });
  }

  function makeNut(i, n) {
    var ax = W * (i + 1) / (n + 1);
    return {
      ax: ax, x: ax, y: 400, len: 220 + (i % 3) * 60,
      phase: Math.random() * Math.PI * 2, spd: 1.1 + Math.random() * 0.8,
      amp: 0.5 + Math.random() * 0.35, ripe: false, pop: 0,
    };
  }
  function reseed() {
    var n = Math.min(4, 2 + Math.floor(picks / 2)); // 物量型
    nuts = [];
    for (var i = 0; i < n; i++) nuts.push(makeNut(i, n));
    // ちょうど1つを熟させる(spot対象)
    nuts[Math.floor(Math.random() * nuts.length)].ripe = true;
  }
  function initGame() {
    score = 0; picks = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; fever = 0; hitStop = 0; feedback = 0; feedbackOk = false;
    reseed();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function updateNuts(dt, tt) {
    for (var i = 0; i < nuts.length; i++) {
      var n = nuts[i];
      var a = Math.sin(tt * n.spd + n.phase) * n.amp;
      n.x = n.ax + Math.sin(a) * n.len; n.y = 220 + Math.cos(a) * n.len;
      if (n.pop > 0) n.pop -= dt;
    }
  }

  function pick(good, x, y) {
    if (good) {
      picks++;
      var gain = fever > 0 ? 200 : 100;
      score += gain;
      feedback = 0.4; feedbackOk = true;
      game.feedback.good(x, y, { text: '+' + gain, color: C.ripe });
      if (picks === 2) { fever = 3.5; game.audio.play('se_milestone'); }
      if (picks >= NEEDED) { finish(true); return; }
      reseed();
    } else {
      feedback = 0.4; feedbackOk = false; hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    for (var i = 0; i < nuts.length; i++) {
      if (game.hit.circle(x, y, 10, nuts[i].x, nuts[i].y, 70)) { pick(nuts[i].ripe, nuts[i].x, nuts[i].y); return; }
    }
  });

  // ATTRACT ゴースト実演: 手が光る実へ寄って摘む
  var dnuts = null, dt2 = 0, dgx = W / 2, dgy = H * 0.8, dpress = false, dcut = 0;
  function stepDemo(dt) {
    if (!dnuts) { dnuts = [makeNut(0, 3), makeNut(1, 3), makeNut(2, 3)]; dnuts[1].ripe = true; }
    dt2 += dt;
    for (var i = 0; i < dnuts.length; i++) {
      var n = dnuts[i], a = Math.sin(dt2 * n.spd + n.phase) * n.amp;
      n.x = n.ax + Math.sin(a) * n.len; n.y = 220 + Math.cos(a) * n.len;
    }
    var ripe = dnuts[1];
    dgx += (ripe.x - dgx) * Math.min(1, dt * 3);
    dgy += (ripe.y + 30 - dgy) * Math.min(1, dt * 3);
    dpress = Math.hypot(dgx - ripe.x, dgy - ripe.y - 30) < 90;
    if (dpress && dcut <= 0) {
      dcut = 0.6;
      game.feedback.good(ripe.x, ripe.y, { text: '+100', color: C.ripe });
      // 次の熟し実へ
      ripe.ripe = false; dnuts[(1 + Math.floor(dt2)) % dnuts.length].ripe = true;
    }
    if (dcut > 0) dcut -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      forestBg(); stepDemo(dt);
      for (var i = 0; i < dnuts.length; i++) drawNut(dnuts[i]);
      game.draw.sprite(BASKET, BASKET_COL, W / 2, H - 150, 12, { anchor: 'center' });
      game.draw.hand(dgx, dgy, { press: dpress, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.12, 80, C.ripe);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.18, 40, C.leaf);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.pink);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.cream);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      forestBg();
      if (hitStop > 0) hitStop -= dt;
      game.draw.sprite(BASKET, BASKET_COL, W / 2, H * 0.42, 18, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.56, 92, resultSuccess ? C.ripe : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.65, 58, C.cream);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.71, 42, C.leaf);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.78, 54, C.pink);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.82, 46, C.leaf);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt;
        if (fever > 0) fever -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        updateNuts(dt, game.time.elapsed);
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    forestBg();
    game.draw.sprite(BASKET, BASKET_COL, W / 2, H - 150, 12, { anchor: 'center' });
    for (var d = 0; d < nuts.length; d++) drawNut(nuts[d]);

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.pink : C.leaf);
    game.draw.rect(60, 40, W - 120, 26, C.leafDk, 0.5);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 46, C.cream);
    txt(picks + ' / ' + NEEDED, W / 2, 168, 44, C.ripe);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.34, 54, C.pink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 92, C.ripe);
    if (feedback > 0 && !feedbackOk) txt('あと' + (NEEDED - picks) + '個', W / 2, H * 0.7, 48, C.ripe);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['G4', 1],
       ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5', 1], ['G4', 1]],
      { tempo: 128, wave: 'square', volume: 0.09, loop: true,
        bass: [['C3', 1], ['G2', 1], ['A2', 1], ['F2', 1], ['C3', 1], ['G2', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

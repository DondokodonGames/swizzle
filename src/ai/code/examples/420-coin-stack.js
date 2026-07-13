// 420-coin-stack.js
// 硬貨積み上げ — 左右に動くトロフィーを、中心を合わせてタップで落として高く積む
// 操作: 左右に動く皿がタワー中心に重なった瞬間にタップして落とす
// 成功: 制限時間内に 4 段積む  失敗: 時間切れ
// @mechanic: stack
// @theme: sports
// 世界観: スタジアムの表彰係が、優勝トロフィーを崩さぬよう中心を揃えて積み上げる
// variation: 物量型(高く積むほど皿が速く動きブレる)
// spice: フィーバータイム(2段積むと数秒だけ得点2倍)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit(スタジアム)
  var C = {
    turf: '#1e6b34', turfDk: '#12401f', sky: '#2a4a7a', gold: '#ffd23f', goldDk: '#c89a1e',
    cup: '#ffe89a', cream: '#fff6d6', red: '#e0483b', blue: '#4db4ff', purple: '#a86bff', shadow: '#0a1810',
  };

  var GAME_TITLE = 'COIN STACK';
  var MAX_TIME = 18;
  var NEEDED = 4;
  var BASE_Y = H - 220;
  var COIN_H = 60, COIN_W = 220;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var coins, moverX, moverDir, moverSpd, sway, score, stacked, timeLeft, done;
  var ready, fever, hitStop, feedback, feedbackOk, dropping;

  // トロフィー(顔つき)
  var CUP = [
    'GGGGGGGG',
    'GWWWWWWG',
    'GWEWWEWG',
    'GWWWWWWG',
    '.GWMMWG.',
    '..GWWG..',
    '...GG...',
    '..GGGG..',
  ];
  var CUP_COL = { G: C.gold, W: C.cup, E: '#3a2a08', M: C.red };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.shadow, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.12); }

  function stadiumBg() {
    game.draw.gradient(0, H, [[0, '#3a5f9a'], [0.45, '#24407a'], [1, '#0e2340']]);
    // スタンドの観客(ドット)
    for (var y = 120; y < H * 0.4; y += 40) for (var x = 0; x < W; x += 40) {
      game.draw.rect(x + 6, y + 6, 26, 26, ((x + y) / 40) % 2 ? C.blue : C.purple, 0.3);
    }
    // 芝
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.turf);
    for (var s = 0; s < W; s += 120) game.draw.rect(s, H * 0.62, 60, H * 0.38, C.turfDk, 0.4);
  }

  function drawTower(list, swayA, ox) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var dx = swayA * (i + 1) * 8;
      game.draw.rect((ox || 0) + c.x - COIN_W / 2 + dx, BASE_Y - i * COIN_H, COIN_W, COIN_H - 6, i % 2 ? C.goldDk : C.gold);
      game.draw.rect((ox || 0) + c.x - COIN_W / 2 + dx, BASE_Y - i * COIN_H, COIN_W, 8, C.cream);
    }
  }

  function initGame() {
    coins = [{ x: W / 2 }]; sway = 0; score = 0; stacked = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; fever = 0; hitStop = 0; feedback = 0; feedbackOk = false;
    spawnMover();
  }
  function spawnMover() {
    moverX = 200; moverDir = 1; moverSpd = 320 + stacked * 70; dropping = null; // 物量型: 速くなる
  }
  function topCoin() { return coins[coins.length - 1]; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function drop() {
    if (dropping) return;
    dropping = { x: moverX, y: BASE_Y - stacked * COIN_H - 400, targetY: BASE_Y - coins.length * COIN_H };
  }
  function land() {
    var off = dropping.x - topCoin().x;
    coins.push({ x: dropping.x });
    stacked++;
    sway += off * 0.006;
    if (Math.abs(off) < 55) {
      var gain = fever > 0 ? 200 : 100; score += gain;
      feedback = 0.4; feedbackOk = true;
      game.feedback.good(dropping.x, dropping.targetY, { text: '+' + gain, color: C.gold });
      if (stacked === 2) { fever = 3.5; game.audio.play('se_milestone'); }
    } else {
      feedback = 0.4; feedbackOk = false; hitStop = 0.3;
      game.feedback.bad(dropping.x, dropping.targetY, { text: 'WOBBLE' });
    }
    dropping = null;
    if (stacked >= NEEDED) { finish(true); return; }
    if (Math.abs(sway) > 0.9) { finish(false); return; } // 崩れる
    spawnMover();
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    drop();
  });

  // ATTRACT ゴースト実演: 中心で手が落とす
  var d = { list: [{ x: W / 2 }], mx: 200, dir: 1, t: 0, gx: W / 2, gy: 300, press: false, drop: null };
  function stepDemo(dt) {
    d.t += dt;
    if (!d.drop) {
      d.mx += d.dir * 320 * dt; if (d.mx < 180 || d.mx > W - 180) d.dir = -d.dir;
      d.gx = d.mx; d.gy = 320;
      if (Math.abs(d.mx - W / 2) < 40) { d.press = true; d.drop = { x: d.mx, y: 320 }; }
      else d.press = false;
    } else {
      d.drop.y += 1400 * dt;
      if (d.drop.y >= BASE_Y - d.list.length * COIN_H) {
        d.list.push({ x: W / 2 });
        game.feedback.good(W / 2, BASE_Y - d.list.length * COIN_H, { text: '+100', color: C.gold });
        if (d.list.length > 4) d.list = [{ x: W / 2 }];
        d.drop = null; d.press = false;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stadiumBg(); stepDemo(dt);
      drawTower(d.list, 0);
      if (d.drop) game.draw.sprite(CUP, CUP_COL, d.drop.x, d.drop.y, 24, { anchor: 'center' });
      else game.draw.sprite(CUP, CUP_COL, d.mx, 320, 24, { anchor: 'center' });
      game.draw.hand(d.gx, d.gy + 120, { press: d.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.1, 80, C.gold);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.16, 40, C.cream);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.83, 62, C.red);
        txt('TAP TO START', W / 2, H * 0.89, 48, C.cream);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      stadiumBg();
      if (hitStop > 0) hitStop -= dt;
      drawTower(coins, sway);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 84, resultSuccess ? C.gold : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.2, 54, C.cream);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.25, 40, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.32, 46, C.cream);
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
        sway *= 0.985; // 徐々に戻る
        if (!dropping) {
          moverX += moverDir * moverSpd * dt;
          if (moverX < 180) { moverX = 180; moverDir = 1; }
          if (moverX > W - 180) { moverX = W - 180; moverDir = -1; }
        } else {
          dropping.y += 1600 * dt;
          if (dropping.y >= dropping.targetY) { dropping.y = dropping.targetY; land(); if (done) return; }
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    stadiumBg();
    drawTower(coins, sway);
    // 中心ガイド(telegraph)
    game.draw.line(topCoin().x, BASE_Y - coins.length * COIN_H, topCoin().x, BASE_Y, C.cream, 2);
    if (dropping) game.draw.sprite(CUP, CUP_COL, dropping.x, dropping.y, 24, { anchor: 'center' });
    else game.draw.sprite(CUP, CUP_COL, moverX, BASE_Y - stacked * COIN_H - 400, 24, { anchor: 'center' });

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.purple : C.gold);
    game.draw.rect(60, 40, W - 120, 26, C.turfDk, 0.6);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 44, C.cream);
    txt(stacked + ' / ' + NEEDED, W / 2, 168, 44, C.gold);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.3, 52, C.purple);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 92, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 1],
       ['F5', 0.5], ['D5', 0.5], ['B4', 0.5], ['G4', 0.5], ['C5', 1], ['G4', 1]],
      { tempo: 150, wave: 'square', volume: 0.08, loop: true,
        bass: [['C3', 1], ['C3', 1], ['G2', 1], ['A2', 1], ['F2', 1], ['G2', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

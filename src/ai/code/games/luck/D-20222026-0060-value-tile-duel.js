// D-20222026-0060-value-tile-duel.js
// バリュータイルデュエル — 提示された2枚の役値タイルから高い方を瞬時に選び、目標ゲージを満たす
// 操作: 左右に並ぶ役値タイルのうち、数値が高い側を素早くタップして選ぶ
// 終わり: 目標ゲージを規定回数の正解で満たせば成功。低い方を選ぶ/時間切れで失敗
// @mechanic: size_judge
// @theme: value_tile_duel
// 世界観: 静かな作戦卓を囲む読み合いの達人が、並んだ役値タイルから瞬時に高い方を見極め、勝機ゲージを積み上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解できた回数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 極細ライン、単色塗りの幾何、余白多め
  var C = {
    bg: '#f4ecd8', bg2: '#e8dcc0', tileA: '#2a5a8a', tileB: '#8a3a4a',
    good: '#2f8a4f', bad: '#c0304a', gold: '#c98a2a', ink: '#2a2418',
  };

  var GAME_TITLE = 'VALUE DUEL';
  var TIME_LIMIT = 12;
  var NEED = 5;
  var ZONE_A = { x: W * 0.28, y: H * 0.42 };
  var ZONE_B = { x: W * 0.72, y: H * 0.42 };
  var TILE_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STRATEGIST_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#c98a2a', pulse * 0.06);
    game.draw.sprite(STRATEGIST_SPRITE, { '#': C.ink }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  var valA, valB, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newValues() {
    valA = 1 + Math.floor(Math.random() * 9);
    valB = 1 + Math.floor(Math.random() * 9);
    while (valB === valA) valB = 1 + Math.floor(Math.random() * 9);
  }

  function initGame() {
    newValues();
    hits = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawTiles() {
    game.draw.circle(ZONE_A.x, ZONE_A.y, TILE_R, C.tileA);
    game.draw.circle(ZONE_A.x, ZONE_A.y, TILE_R, '#ffffff', 0.15);
    txt(String(valA), ZONE_A.x, ZONE_A.y + 18, 64, '#ffffff');
    game.draw.circle(ZONE_B.x, ZONE_B.y, TILE_R, C.tileB);
    game.draw.circle(ZONE_B.x, ZONE_B.y, TILE_R, '#ffffff', 0.15);
    txt(String(valB), ZONE_B.x, ZONE_B.y + 18, 64, '#ffffff');
  }

  function attempt(pickA) {
    if (finished || ready > 0) return;
    var correct = (pickA && valA > valB) || (!pickA && valB > valA);
    var zx = pickA ? ZONE_A.x : ZONE_B.x;
    var zy = pickA ? ZONE_A.y : ZONE_B.y;
    if (correct) {
      hits++;
      game.feedback.good(zx, zy, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.24, { color: C.gold, size: 32 });
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(W * 0.5, H * 0.42, { color: C.gold, count: 26, speed: 440 });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      newValues();
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(zx, zy, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      if (Math.hypot(x - ZONE_A.x, y - ZONE_A.y) < TILE_R) { game.audio.play('se_tap', 0.1); attempt(true); return; }
      if (Math.hypot(x - ZONE_B.x, y - ZONE_B.y) < TILE_R) { game.audio.play('se_tap', 0.1); attempt(false); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ZONE_A.x, gy: ZONE_A.y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 1.5;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var local = cyc % per;
    var pickA = valA > valB;
    var z = pickA ? ZONE_A : ZONE_B;
    demo.gx = z.x; demo.gy = z.y;
    demo.press = local > per * 0.55 && local < per * 0.55 + dt * 2;
    if (demo.press && hits < NEED) {
      hits++;
      game.feedback.good(z.x, z.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      newValues();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (valA === undefined) initGame();
      stepDemo(dt);
      bg();
      drawTiles();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTiles();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '回!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.42, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTiles();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#d8c8a0', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.4]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

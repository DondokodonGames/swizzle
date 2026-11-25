// K-DS-0050-pogo-bounce-chain.js
// ポゴ・バウンスチェーン — 弾む一輪具に乗り、跳ね上がる頂点の窓でタップして次の跳躍へつなぐ
// 操作: キャラが跳ね上がり頂点に来た瞬間にタップして着地を強く踏み込み、次の跳躍へつなげる
// 終わり: 規定回数(7回)連続でつなげば成功。3回窓を外せば失敗
// @mechanic: timing_window
// @theme: pogo_rooftop_hop
// 世界観: 夕暮れの屋根伝い。弾む一輪の器具に乗った軽業師が、跳躍の頂点を逃さず踏み込んで屋根から屋根へ渡っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + つないだ跳躍数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 擬似アイソメの平行四辺形屋根、夕焼けグラデ、太いアウトライン
  var C = {
    bg: '#ff8a5c', bg2: '#3a1e5c', roof: '#5c3a7a', roofEdge: '#8a5cb0',
    rider: '#ffe14d', riderDark: '#c9a010', pole: '#e0e0e0',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffe600', white: '#ffffff', ink: '#1a0a2a',
  };

  var GAME_TITLE = 'BOUNCE CHAIN';
  var TOTAL = 7;
  var MAX_MISS = 3;
  var CX = W * 0.5;
  var BASE_Y = H * 0.62;
  var PEAK_Y = H * 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIDER_SPRITES = [
    ['.##.', '####', '.##.', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.roofEdge, 0.3);
    for (var i = 0; i < 4; i++) {
      game.draw.rect(W * (0.05 + i * 0.24), H * 0.78, W * 0.18, 30, C.roof);
    }
  }

  var chain, missCount, done, endWait, finished;
  var ready, hitStop, shake;
  var bounceT, bounceDur, windowOpen, y, riderFrame;

  function newBounce(idx) {
    bounceDur = Math.max(0.55, 0.95 - idx * 0.05);
    bounceT = 0; windowOpen = false;
  }

  function initGame() {
    chain = 0; missCount = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    y = BASE_Y; riderFrame = 0;
    newBounce(0);
  }

  function resolveTap() {
    if (ready > 0 || done || finished) return;
    var p = bounceT / bounceDur;
    var nearPeak = p > 0.32 && p < 0.6;
    hitStop = nearPeak ? 0.08 : 0.28;
    if (nearPeak) {
      chain++;
      game.feedback.good(CX, PEAK_Y, { text: 'PERFECT', color: C.good });
      game.fx.burst(CX, y, { color: C.gold, count: 12, speed: 280 });
      game.audio.play('se_jump', 0.4);
      if (chain === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.24, { color: C.gold, size: 40 });
    } else {
      missCount++;
      game.feedback.bad(CX, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    if (chain >= TOTAL) { ok = true; finished = true; finish(); return; }
    newBounce(chain);
  }

  game.onTap(function(x, y2) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawRider(yy) {
    riderFrame = Math.floor(game.time.elapsed * 6) % 2;
    game.draw.line(CX, yy + 40, CX, BASE_Y + 30, C.pole, 10);
    game.draw.sprite(RIDER_SPRITES[riderFrame], { '#': C.riderDark }, CX, yy, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { chain = 0; newBounce(0); y = BASE_Y; }
    bounceT += dt;
    var p = Math.min(1, bounceT / bounceDur);
    y = BASE_Y - Math.sin(p * Math.PI) * (BASE_Y - PEAK_Y);
    demo.gy = y - 60;
    demo.gx = CX;
    if (p > 0.32 && p < 0.6 && !demo.hit) {
      demo.hit = true;
      demo.press = true;
      game.feedback.good(CX, PEAK_Y, { text: 'PERFECT', color: C.good, sound: false });
      game.audio.play('se_jump', 0.22);
    }
    if (p >= 1) { newBounce(1); demo.hit = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawRider(y);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRider(BASE_Y);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(chain + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - chain) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(chain, { chain: chain, misses: missCount });
        else game.end.failure({ chain: chain, misses: missCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      bounceT += dt;
      var p = bounceT / bounceDur;
      y = BASE_Y - Math.sin(Math.min(1, p) * Math.PI) * (BASE_Y - PEAK_Y);
      if (p >= 1) {
        // missed the window entirely
        missCount++;
        hitStop = 0.28;
        game.feedback.bad(CX, y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); }
        else newBounce(chain);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawRider(y); else drawRider(y);

    txt(chain + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (chain / TOTAL), 16, C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 60 - m * 34, 210, 12, m < missCount ? C.bad : '#ffffff40');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F#4', 0.25], ['A4', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

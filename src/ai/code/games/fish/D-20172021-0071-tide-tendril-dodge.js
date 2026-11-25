// D-20172021-0071-tide-tendril-dodge.js
// タイド・テンドリル・ドッジ — 発光体が体を伸ばしながら、漂う岩をホールド移動でかわして生き延びる
// 操作: 画面を押したまま左右にドラッグして本体を動かし、上から漂ってくる岩を避け続ける
// 終わり: 規定時間かわし続ければ成功。岩に触れれば失敗
// @mechanic: dodge
// @theme: deepsea_tendril_dodge
// 世界観: 深海の発光生物が、体を伸ばしながら潮に流されて漂う岩塊をかわし続け、規定時間このまま群れの底で生き延びる
// 残るもの: 正誤(CLEAR/GAME OVER) + 生存タイム
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップで奥ほど圧縮、地平グラデ、速度感はスクロール量
  var STYLE = { bg: ['#031428', '#000810'], main: ['#1a6a8a', '#0a3a5a'], accent: ['#3dffe0', '#ff4d5e'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], body: '#3dffe0', bodyDark: '#1a9a8a',
    rock: '#4a3a2a', rockWarn: '#ff4d5e',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd24d', ink: '#dff8ff', white: '#ffffff',
  };

  var GAME_TITLE = 'TIDE TENDRIL';
  var LANE_Y = H * 0.62;
  var TIME_LIMIT = 18;
  var BODY_R = 34;
  var ROCK_R = 46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HEAD = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var scroll = game.time.elapsed * 60;
    var strips = 24;
    for (var i = 0; i < strips; i++) {
      var y = H * 0.3 + i * ((H - H * 0.3) / strips);
      var comp = 1 - i / strips;
      var off = (scroll * comp) % 80;
      for (var x = -off; x < W; x += 80) {
        game.draw.rect(x, y, 40 * comp + 4, 2, '#0a3a5a', 0.3);
      }
    }
  }

  var bodyX, targetX, vx, segs, rocks, spawnT, timeSurv, done, endWait, finished, ready, hitStop, shake, milestone50;

  function initGame() {
    bodyX = W * 0.5; targetX = W * 0.5; vx = 0;
    segs = [];
    for (var i = 0; i < 10; i++) segs.push({ x: W * 0.5, y: LANE_Y });
    rocks = [];
    spawnT = 0.9; timeSurv = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestone50 = false;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function spawnRock() {
    var x = game.random(120, W - 120);
    rocks.push({ x: x, y: -60, vy: game.random(420, 560), telegraphed: false });
  }

  function updatePlay(dt) {
    timeSurv += dt;
    // retain係数ベースの滑らかな追従(過度な減衰は禁止)
    var dx = targetX - bodyX;
    vx += dx * 6 * dt;
    vx *= Math.pow(0.5, dt);
    bodyX += vx * dt;
    bodyX = Math.max(80, Math.min(W - 80, bodyX));

    segs.unshift({ x: bodyX, y: LANE_Y });
    if (segs.length > 10 + Math.floor(timeSurv)) segs.pop();

    spawnT -= dt;
    if (spawnT <= 0) { spawnRock(); spawnT = Math.max(0.55, 0.95 - timeSurv * 0.02); }

    for (var i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i];
      r.y += r.vy * dt;
      if (!r.telegraphed && r.y > LANE_Y - 260) { r.telegraphed = true; }
      if (game.hit.circle(bodyX, LANE_Y, BODY_R, r.x, r.y, ROCK_R * 0.7)) {
        ok = false; finished = true;
        hitStop = 0.4; shake = 0.3;
        game.feedback.bad(bodyX, LANE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.45);
        finish();
        return;
      }
      if (r.y > H + 80) rocks.splice(i, 1);
    }

    if (!milestone50 && timeSurv >= TIME_LIMIT * 0.5) {
      milestone50 = true;
      game.fx.popup('NICE', bodyX, LANE_Y - 200, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }

    if (timeSurv >= TIME_LIMIT) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(bodyX, LANE_Y, { text: 'CLEAR', color: C.good });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  function drawScene() {
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      var warn = r.telegraphed && r.y < LANE_Y;
      game.draw.circle(r.x, r.y, ROCK_R, warn ? C.rockWarn : C.rock);
      if (warn) game.draw.circle(r.x, r.y, ROCK_R + 10, C.rockWarn, 0.2 + 0.15 * Math.sin(game.time.elapsed * 12));
    }
    for (var s = segs.length - 1; s >= 1; s--) {
      var a = segs[s], sz = BODY_R * (0.35 + 0.5 * (s / segs.length));
      game.draw.circle(a.x, a.y, sz, C.bodyDark, 0.85);
    }
    var jx = hitStop > 0 ? game.random(-6, 6) : 0;
    game.draw.circle(bodyX + jx, LANE_Y, BODY_R, hitStop > 0 && finished && !ok ? '#ffffff' : C.body);
    game.draw.sprite(HEAD, { '#': '#04202a' }, bodyX + jx, LANE_Y, 12, { anchor: 'center' });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) {
      targetX = x;
      game.audio.play('se_tap', 0.08);
      game.fx.burst(x, y, { color: C.body, count: 6, speed: 160 });
    }
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) {
      targetX = x;
      if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
    }
  });

  var demo = { t: 0, gx: W * 0.5, gy: LANE_Y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) initGame();
    targetX = W * 0.5 + Math.sin(demo.t * 1.7) * (W * 0.28);
    demo.gx = targetX; demo.gy = LANE_Y; demo.press = true;
    if (!finished) updatePlay(dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bodyX === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy - 120, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      var scoreT = Math.floor(timeSurv * 10);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(scoreT, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var score = Math.floor(timeSurv * 10);
        if (ok) game.end.success(score, { survived: timeSurv.toFixed(1) });
        else game.end.failure({ survived: timeSurv.toFixed(1) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updatePlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(Math.floor(timeSurv * 10), W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = (TIME_LIMIT - timeSurv) < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#000000', 0.4);
    game.draw.rect(60, 150, tbW * Math.min(1, timeSurv / TIME_LIMIT), 16, lowTime ? C.gold : C.body);
    var notches = 5;
    for (var nI = 0; nI < notches; nI++) {
      var reached = timeSurv / TIME_LIMIT >= (nI + 1) / notches;
      game.draw.circle(80 + nI * 220, 190, 10, reached ? C.gold : '#0a3a5a');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.4], ['G3', 0.4], ['C4', 0.4], ['G3', 0.4]], { tempo: 100, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

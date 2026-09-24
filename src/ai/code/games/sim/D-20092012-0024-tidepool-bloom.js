// D-20092012-0024-tidepool-bloom.js
// タイドプール・ブルーム — 潮だまりの微生物を指で誘導し、自分より小さな粒を飲み込んで育つ
// 操作: 指で押さえた位置に向かって微生物がゆっくり追従する。小さい粒に触れれば吸収、大きい粒に触れれば失敗
// 終わり: 規定数を吸収すれば成功。自分より大きな粒に触れれば失敗
// @mechanic: drag_follow
// @theme: tidepool_microbe
// 世界観: 満潮の岩だまりに浮かぶ小さな微生物が、漂う粒を飲み込みながら少しずつ大きく育っていく短い成長劇
// 残るもの: 正誤(CLEAR/GAME OVER) + 吸収した粒の数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 柔らかいグラデーションと太い輪郭線、丸みのある形
  var C = {
    water1: '#8fe3d8', water2: '#2a8f9e', ripple: '#c8fff2',
    self: '#ffe08a', selfEdge: '#e0a020', prey: '#a0f0c0', preyEdge: '#4fae7a',
    danger: '#ff7a8a', dangerEdge: '#c23a4e', gold: '#ffe066', good: '#4dff8a', bad: '#ff4d5e',
    white: '#f4fffb', ink: '#0c2a28',
  };

  var GAME_TITLE = 'TIDEPOOL BLOOM';
  var TOTAL = 6;
  var ROUND_TIME = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var selfX, selfY, selfR, eaten, timeLeft, done, endWait, finished, ready, hitStop, shake, dots;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BLOB_A = ['.####.', '########', '########', '.####.'];
  var BLOB_B = ['..##..', '.######.', '.######.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.water1], [1, C.water2]]);
    for (var i = 0; i < 5; i++) {
      var ry = (H * 0.1 + i * H * 0.16 + Math.sin(game.time.elapsed * 0.6 + i) * 20);
      game.draw.circle(W * 0.5, ry, W * 0.55, C.ripple, 0.04);
    }
  }

  function spawnDot(preyOnly) {
    var isPrey = preyOnly || Math.random() < 0.65;
    var r = isPrey ? game.random(18, selfR * 0.8) : selfR * game.random(1.25, 1.6);
    var ang = game.random(0, Math.PI * 2);
    var dist = game.random(500, 780);
    return {
      x: selfX + Math.cos(ang) * dist, y: selfY + Math.sin(ang) * dist,
      r: r, prey: isPrey, vx: game.random(-20, 20), vy: game.random(-20, 20),
      warned: false, alive: true,
    };
  }

  function initGame() {
    selfX = W * 0.5; selfY = H * 0.55; selfR = 46;
    eaten = 0; timeLeft = ROUND_TIME; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    dots = [];
    for (var i = 0; i < 4; i++) dots.push(spawnDot(true));
    dots.push(spawnDot(false));
  }

  function hitTest(px, py) {
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (!d.alive) continue;
      if (game.hit.circle(px, py, selfR, d.x, d.y, d.r)) return d;
    }
    return null;
  }

  var holdX = null, holdY = null;

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    holdX = x; holdY = y;
    game.audio.play('se_tap', 0.06);
    game.fx.burst(x, y, { color: C.white, count: 4, speed: 120 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    holdX = x; holdY = y;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y) {
    holdX = null; holdY = null;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.03);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt, tx, ty) {
    if (tx !== null) {
      selfX += (tx - selfX) * Math.min(1, dt * 4);
      selfY += (ty - selfY) * Math.min(1, dt * 4);
    }
    selfX = Math.max(selfR, Math.min(W - selfR, selfX));
    selfY = Math.max(H * 0.18, Math.min(H * 0.86, selfY));

    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (!d.alive) continue;
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < 60 || d.x > W - 60) d.vx *= -1;
      if (d.y < H * 0.16 || d.y > H * 0.88) d.vy *= -1;
      if (!d.prey) {
        var dist = Math.hypot(d.x - selfX, d.y - selfY);
        if (dist < selfR + d.r + 140 && !d.warned) d.warned = true;
      }
    }

    var hit = hitTest(selfX, selfY);
    if (hit) {
      hit.alive = false;
      if (hit.prey) {
        eaten++;
        selfR = Math.min(120, selfR + 6);
        game.feedback.good(hit.x, hit.y, { text: 'GOOD' });
        game.fx.burst(hit.x, hit.y, { color: C.gold, count: 10, speed: 250 });
        game.audio.play('se_good', 0.35);
        if (eaten === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', selfX, selfY - 140, { color: C.gold, size: 38 });
        dots.push(spawnDot(Math.random() < 0.7));
        if (eaten >= TOTAL) { ok = true; finished = true; hitStop = 0.1; finish(); }
      } else {
        hitStop = 0.35;
        game.feedback.bad(hit.x, hit.y, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }

    if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; ok = false; finished = true; finish(); }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  var demoState = null;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) {
      selfX = W * 0.5; selfY = H * 0.55; selfR = 46; eaten = 0;
      dots = [spawnDot(true), spawnDot(true)];
      demoState = { target: dots[0] };
    }
    demo.press = true;
    var tgt = demoState.target;
    if (!tgt || !tgt.alive) {
      var alive = null;
      for (var i = 0; i < dots.length; i++) if (dots[i].alive) { alive = dots[i]; break; }
      if (!alive) { dots.push(spawnDot(true)); alive = dots[dots.length - 1]; }
      demoState.target = alive;
      tgt = alive;
    }
    demo.gx = tgt.x; demo.gy = tgt.y;
    stepGame(dt, tgt.x, tgt.y);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      if (!dots) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(eaten + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - eaten) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(eaten, { eaten: eaten, total: TOTAL });
        else game.end.failure({ eaten: eaten, total: TOTAL });
      }
      bg(); drawScene();
      txt(eaten + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
      return;
    }

    if (hitStop > 0) { hitStop -= dt; }
    else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
    else if (!finished) { stepGame(dt, holdX, holdY); }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(eaten + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (Math.max(0, timeLeft) / ROUND_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  function drawScene() {
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (!d.alive) continue;
      var edge = d.prey ? C.preyEdge : C.dangerEdge;
      var fill = d.prey ? C.prey : C.danger;
      if (!d.prey && d.warned && Math.floor(game.time.elapsed * 8) % 2 === 0) {
        game.draw.circle(d.x, d.y, d.r + 14, C.dangerEdge, 0.4);
      }
      game.draw.circle(d.x, d.y, d.r + 5, edge);
      game.draw.circle(d.x, d.y, d.r, fill);
    }
    var frame = Math.floor(game.time.elapsed * 3) % 2 === 0 ? BLOB_A : BLOB_B;
    var wob = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.circle(selfX, selfY + 4, selfR + 6, C.selfEdge);
    game.draw.sprite(frame, { '#': C.self }, selfX, selfY + wob, selfR / 3.2, { anchor: 'center' });
  }

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);

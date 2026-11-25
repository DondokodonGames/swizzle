// D-20172021-0004-sinkhole-toy-gulp.js
// シンクホールトイガルプ — 玩具の街に開いた黒い穴を指で誘導し、小さな玩具だけを飲み込んで広げる
// 操作: 指でドラッグして穴を誘導する。穴は指の位置に少し遅れて付いてくる
// 終わり: 規定数(6個)の小さな玩具を飲み込めば成功。飲み込めない大きな玩具に触れれば失敗
// @mechanic: drag_follow
// @theme: toy_city_sinkhole
// 世界観: 玩具の街のジオラマに突然開いた小さな黒い穴。指で優しく誘導しながら小物だけを飲み込み、まだ飲み込めない大きな玩具は避けて少しずつ広がっていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 飲み込んだ玩具の数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 明るいブロック調、太い輪郭、面は横ストライプで塗る
  var STYLE = { bg: ['#bcd6ea', '#7fb0d0'], main: ['#ffb35c', '#d98a30'], accent: ['#5ac8ff', '#ff5a5a'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], floor: '#e8d8b0', floorLine: '#c9b788',
    hole: '#1a1420', holeEdge: '#3a2c48', small: STYLE.main[0], smallDark: STYLE.main[1],
    big: '#8a5ac0', bigDark: '#5a3480', gold: '#ffe066', good: STYLE.accent[0], bad: STYLE.accent[1],
    white: '#ffffff', ink: '#141018',
  };

  var GAME_TITLE = 'SINKHOLE GULP';
  var TARGET = 6;
  var TIME_LIMIT = 20;
  var FIELD = { x0: W * 0.1, y0: H * 0.2, x1: W * 0.9, y1: H * 0.78 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR_SPRITE = ['.##.', '####'];
  var TRUCK_SPRITE = ['######', '##..##', '######'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.floor);
    for (var gx = 0; gx < 8; gx++) game.draw.line(W * (gx / 7), H * 0.78, W * (gx / 7), H, C.floorLine, 3);
  }

  function rndPos() {
    return { x: FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0), y: FIELD.y0 + Math.random() * (FIELD.y1 - FIELD.y0) };
  }

  var smalls, bigs, holeX, holeY, targetX, targetY, holeR, absorbed, done, endWait, finished, elapsedT;
  var ready, hitStop, shake, warnT;

  function makeSmalls(n) {
    var arr = [];
    for (var i = 0; i < n; i++) { var p = rndPos(); arr.push({ x: p.x, y: p.y, alive: true }); }
    return arr;
  }
  function makeBigs(n) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      var p = rndPos();
      arr.push({ x: p.x, y: p.y, vx: (Math.random() < 0.5 ? -1 : 1) * 60, vy: (Math.random() < 0.5 ? -1 : 1) * 40 });
    }
    return arr;
  }

  function initGame() {
    holeX = W * 0.5; holeY = H * 0.5; targetX = holeX; targetY = holeY; holeR = 42;
    absorbed = 0; done = false; endWait = 0; finished = false; elapsedT = 0;
    ready = 0.8; hitStop = 0; shake = 0; warnT = 0;
    smalls = makeSmalls(TARGET + 2);
    bigs = makeBigs(2);
  }

  function setTarget(x, y) {
    targetX = Math.max(FIELD.x0, Math.min(FIELD.x1, x));
    targetY = Math.max(FIELD.y0, Math.min(FIELD.y1, y));
  }

  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) { setTarget(x, y); game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) setTarget(x, y); });

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

  function stepWorld(dt, resolveHits) {
    holeX += (targetX - holeX) * Math.min(1, dt * 5);
    holeY += (targetY - holeY) * Math.min(1, dt * 5);
    for (var i = 0; i < bigs.length; i++) {
      var b = bigs[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < FIELD.x0 || b.x > FIELD.x1) b.vx *= -1;
      if (b.y < FIELD.y0 || b.y > FIELD.y1) b.vy *= -1;
      var d = Math.hypot(b.x - holeX, b.y - holeY);
      if (d < holeR + 60 && warnT <= 0) warnT = 0.01;
      if (resolveHits && d < holeR + 34) {
        hitStop = 0.35;
        game.feedback.bad(holeX, holeY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
        return;
      }
    }
    for (var j = 0; j < smalls.length; j++) {
      var s = smalls[j];
      if (!s.alive) continue;
      var ds = Math.hypot(s.x - holeX, s.y - holeY);
      if (ds < holeR) {
        s.alive = false;
        absorbed++;
        holeR = Math.min(70, holeR + 2.5);
        game.feedback.good(s.x, s.y, { text: 'GULP', color: C.good });
        game.fx.burst(s.x, s.y, { color: C.gold, count: 12, speed: 300 });
        game.audio.play('se_coin', 0.4);
        if (absorbed === Math.ceil(TARGET / 2)) game.fx.popup('HALFWAY!', holeX, holeY - 200, { color: C.gold, size: 40 });
        if (resolveHits && absorbed >= TARGET) {
          ok = true; finished = true; hitStop = 0.1;
          game.audio.play('se_milestone', 0.4);
          finish();
        }
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var a = cyc * 0.9;
    setTarget(W * 0.5 + Math.cos(a) * 250, H * 0.48 + Math.sin(a * 1.3) * 180);
    demo.gx = targetX; demo.gy = targetY; demo.press = true;
    stepWorld(dt, false);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(absorbed + ' / ' + TARGET, W / 2, H * 0.13, 30, C.ink);
      if (!ok) txt('あと' + (TARGET - absorbed) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(absorbed, { absorbed: absorbed, total: TARGET });
        else game.end.failure({ absorbed: absorbed, total: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepWorld(dt, true);
      if (!finished) {
        elapsedT += dt;
        if (elapsedT >= TIME_LIMIT) {
          finished = true; ok = false; hitStop = 0.15;
          game.feedback.bad(holeX, holeY, { text: 'TIME UP' });
          shake = 0.25;
          game.audio.play('se_failure', 0.4);
          finish();
        }
      }
    }
    if (warnT > 0) warnT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(absorbed + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (TIME_LIMIT - elapsedT) / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  function drawScene() {
    for (var i = 0; i < bigs.length; i++) {
      var b = bigs[i];
      var d = Math.hypot(b.x - holeX, b.y - holeY);
      if (d < holeR + 90) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(b.x, b.y, 74, C.bad, 0.22);
      }
      game.draw.sprite(TRUCK_SPRITE, { '#': C.big }, b.x, b.y, 16, { anchor: 'center' });
    }
    for (var j = 0; j < smalls.length; j++) {
      var s = smalls[j];
      if (!s.alive) continue;
      game.draw.sprite(CAR_SPRITE, { '#': C.small }, s.x, s.y, 12, { anchor: 'center' });
    }
    game.draw.circle(holeX, holeY, holeR + 14, C.holeEdge, 0.6);
    game.draw.circle(holeX, holeY, holeR, C.hole);
  }

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

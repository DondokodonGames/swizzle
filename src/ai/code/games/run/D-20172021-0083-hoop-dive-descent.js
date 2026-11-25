// D-20172021-0083-hoop-dive-descent.js
// フープダイブ・ディセント — 落下し続ける飛び込み芸人を指でドラッグし、左右に揺れるフープの輪をくぐらせる
// 操作: 迫るフープの隙間の位置を見て、指で左右にドラッグして飛び込み芸人を隙間へ合わせ続ける
// 終わり: 規定回数(4基)のフープを隙間に通せば成功。輪にぶつかるか時間切れで失敗
// @mechanic: drag_follow
// @theme: hoop_dive_descent
// 世界観: 曲芸ショーの飛び込み芸人が、左右へ揺れながら迫るフープの隙間に合わせて指でドラッグされ、下段のプールを目指して潜り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 通り抜けたフープ数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけ
  var C = {
    bg: '#1e2a44', bg2: '#101830', ring: '#ffe14d', ringDark: '#c99a1a',
    hoop: '#4ac9ff', hoopEdge: '#1a6a9a',
    diver: '#ffdca0', diverDark: '#c99a1a',
    good: '#5cff9e', bad: '#ff5a4a', gold: '#ffe14d', white: '#f4f6ff', ink: '#0a0e1c',
  };

  var GAME_TITLE = 'HOOP DIVE';
  var TOTAL = 4;
  var GAP_W = 190;
  var HOOP_H = 40;
  var DIVER_R = 30;
  var DIVER_Y = H * 0.62;
  var SPAWN_Y = H * 0.02;
  var TIME_LIMIT = 15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_SPR = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var amb = 0.1 + 0.1 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, C.hoop, amb);
    for (var i = 0; i < 6; i++) {
      var yy = H * 0.05 + i * H * 0.05;
      game.draw.line(0, yy, W, yy, C.ring, 2, 0.05);
    }
  }

  var passed, hoops, diverX, targetX, speed, halfShown, failFlash;
  var timeLeft, done, endWait, finished, ready, hitStop, shake;

  function spawnHoop(prevCx) {
    var cx;
    do { cx = GAP_W * 0.7 + game.random(0, 1) * (W - GAP_W * 1.4); } while (prevCx !== undefined && Math.abs(cx - prevCx) < GAP_W * 0.6);
    return { y: SPAWN_Y, cx: cx, swayPhase: game.random(0, 6.28), passed: false };
  }

  function initGame() {
    passed = 0; halfShown = false; failFlash = 0;
    diverX = W * 0.5; targetX = W * 0.5;
    speed = H * 0.34;
    hoops = [spawnHoop()];
    timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function hoopCx(h) {
    return h.cx + Math.sin(game.time.elapsed * 1.6 + h.swayPhase) * 70;
  }

  function drawHoop(h) {
    var cx = hoopCx(h);
    var gapL = cx - GAP_W / 2, gapR = cx + GAP_W / 2;
    game.draw.rect(0, h.y - HOOP_H / 2, Math.max(0, gapL), HOOP_H, C.hoopEdge);
    game.draw.rect(0, h.y - HOOP_H / 2, Math.max(0, gapL), HOOP_H, C.hoop, 0.7);
    game.draw.rect(gapR, h.y - HOOP_H / 2, Math.max(0, W - gapR), HOOP_H, C.hoopEdge);
    game.draw.rect(gapR, h.y - HOOP_H / 2, Math.max(0, W - gapR), HOOP_H, C.hoop, 0.7);
  }

  function drawDiver() {
    var bob = Math.sin(game.time.elapsed * 7) * 3;
    game.draw.circle(diverX, DIVER_Y + bob, DIVER_R + 4, C.diverDark, 0.5);
    game.draw.sprite(DIVER_SPR, { '#': C.diver }, diverX, DIVER_Y + bob - 4, 14, { anchor: 'center' });
  }

  function checkPass(h) {
    if (h.passed) return;
    if (h.y >= DIVER_Y - HOOP_H / 2 && h.y <= DIVER_Y + HOOP_H / 2) {
      h.passed = true;
      var cx = hoopCx(h);
      var gapL = cx - GAP_W / 2 + DIVER_R * 0.5, gapR = cx + GAP_W / 2 - DIVER_R * 0.5;
      if (diverX >= gapL && diverX <= gapR) {
        passed++;
        hitStop = 0.08;
        game.feedback.good(diverX, h.y, { text: 'GOOD', color: C.good });
        game.fx.burst(diverX, h.y, { color: C.gold, count: 14, speed: 280 });
        game.audio.play('se_good', 0.3);
        if (!halfShown && passed >= Math.ceil(TOTAL / 2)) { halfShown = true; game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.4); }
        if (passed >= TOTAL) { ok = true; finished = true; hitStop = 0.2; finish(); return; }
        speed += 12;
        hoops.push(spawnHoop(cx));
      } else {
        failFlash = 0.4; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(diverX, h.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function onDrag(x) { targetX = Math.max(DIVER_R, Math.min(W - DIVER_R, x)); }

  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) onDrag(x); });
  game.onMove(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) onDrag(x); });

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

  var demo = { t: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    for (var i = 0; i < hoops.length; i++) {
      hoops[i].y += speed * dt;
      targetX = hoopCx(hoops[i]);
      checkPass(hoops[i]);
    }
    diverX += (targetX - diverX) * Math.min(1, dt * 6);
    hoops = hoops.filter(function(h) { return h.y < H + 60; });
    if (hoops.length === 0) hoops.push(spawnHoop());
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hoops === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i0 = 0; i0 < hoops.length; i0++) drawHoop(hoops[i0]);
      drawDiver();
      game.draw.hand(diverX, DIVER_Y, { press: true, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 34, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var i1 = 0; i1 < hoops.length; i1++) drawHoop(hoops[i1]);
      drawDiver();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 40, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.10, 26, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '基!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { hoops: passed, total: TOTAL });
        else game.end.failure({ hoops: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      for (var i2 = 0; i2 < hoops.length; i2++) {
        hoops[i2].y += speed * dt;
        checkPass(hoops[i2]);
      }
      hoops = hoops.filter(function(h) { return h.y < H + 60; });
      diverX += (targetX - diverX) * Math.min(1, dt * 10);
      if (timeLeft <= 0) {
        timeLeft = 0; failFlash = 0.4; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(diverX, DIVER_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (failFlash > 0) failFlash -= dt;

    bg();
    for (var i3 = 0; i3 < hoops.length; i3++) drawHoop(hoops[i3]);
    drawDiver();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 26, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.90, W - 120, 16, C.ringDark, 0.5);
    game.draw.rect(60, H * 0.90, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.80, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.18], ['B4', 0.18], ['D5', 0.18], ['G5', 0.36]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

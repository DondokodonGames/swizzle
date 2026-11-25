// I-Wii-0023-fan-flick-goldfish-boat.js
// ファン・フリック・ボート — 夜店の紙舟に扇であおぎ、狙った輪の中まで滑らせて止める
// 操作: 紙舟を指で引き寄せてから、狙う方向へ大きく振って弾き飛ばす(引いて放すフリック)
// 終わり: 舟が的の輪の中で止まれば成功。輪を外れる・岸を越えれば失敗(一発勝負)
// @mechanic: flick_launch
// @theme: festival_pond_paper_boat
// 世界観: 夜店の紙舟すくい屋台で、店主が紙舟に団扇の風を大きく送り、池に浮かぶ的の輪へ滑らせ届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 的の輪までの到達度%
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 高彩度・厚みのあるハイライト、ポップな配色
  var C = {
    bg: '#0f8fd6', bg2: '#0a5fa0', pond: '#1fb0e8', ring: '#ffcc00', ringDark: '#c99400',
    boat: '#ffffff', boatEdge: '#ff5a3c', good: '#3bffa0', bad: '#ff4d5e', gold: '#ffe600', white: '#ffffff', ink: '#052038',
  };

  var GAME_TITLE = 'FAN FLICK';
  var STALL = { x: W * 0.5, y: H * 0.86 };
  var POND_TOP = H * 0.18, POND_BOTTOM = H * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STALLKEEPER = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, POND_TOP, W, POND_BOTTOM - POND_TOP, C.pond, 0.9);
    game.draw.sprite(STALLKEEPER, { '#': C.white }, STALL.x, STALL.y, 10, { anchor: 'center' });
  }

  var boatX, boatY, vx, vy, ringX, ringY, dragging, pullX, pullY, launched, resolved, done, endWait, finished;
  var ready, hitStop, shake, trail;

  function newRing() {
    ringX = W * (0.3 + game.random(0, 0.4));
    ringY = POND_TOP + (POND_BOTTOM - POND_TOP) * (0.15 + game.random(0, 0.35));
  }

  function initGame() {
    boatX = STALL.x; boatY = STALL.y - 40; vx = 0; vy = 0;
    dragging = false; pullX = boatX; pullY = boatY;
    launched = false; resolved = false; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; trail = [];
    newRing();
  }

  function beginPull(x, y) {
    if (state !== S.PLAYING || ready > 0 || launched || finished) return;
    dragging = true; pullX = x; pullY = y;
    game.audio.play('se_tap', 0.12);
  }
  function movePull(x, y) {
    if (!dragging || launched) return;
    pullX = x; pullY = y;
    if (Math.random() < 0.1) game.audio.play('se_tap', 0.02);
  }
  function release(x, y) {
    if (!dragging || launched) { dragging = false; return; }
    dragging = false;
    var dx = boatX - pullX, dy = boatY - pullY;
    var dist = Math.hypot(dx, dy);
    if (dist < 20) { game.audio.tone(200, 0.05, { wave: 'sine', volume: 0.05 }); return; }
    var power = Math.min(1, dist / 260);
    vx = (dx / dist) * power * 1500;
    vy = (dy / dist) * power * 1500;
    launched = true;
    game.audio.play('se_jump', 0.4);
    game.fx.burst(boatX, boatY, { color: C.boatEdge, count: 10, speed: 220 });
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.12);
    beginPull(x, y);
  });
  game.onMove(function(x, y) { if (dragging && Math.random() < 0.08) game.audio.play('se_tap', 0.02); movePull(x, y); });
  game.onRelease(function(x, y) { if (dragging) game.audio.tone(240, 0.05, { wave: 'sine', volume: 0.05 }); release(x, y); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    game.draw.circle(ringX, ringY, 60, C.ringDark, 0.9);
    game.draw.circle(ringX, ringY, 46, C.ring, 0.9);
    game.draw.circle(ringX, ringY, 30, C.pond, 0.9);
    for (var i = 0; i < trail.length; i++) {
      game.draw.circle(trail[i].x, trail[i].y, 8 * (i / trail.length), C.boat, 0.3);
    }
    game.draw.circle(boatX, boatY, 26, C.boatEdge);
    game.draw.circle(boatX, boatY, 18, C.boat);
    if (dragging) {
      game.draw.line(boatX, boatY, pullX, pullY, C.boatEdge, 6);
      game.draw.circle(pullX, pullY, 14, C.gold, 0.8);
    }
  }

  var demo = { t: 0, gx: STALL.x, gy: STALL.y - 40, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      boatX = STALL.x; boatY = STALL.y - 40; vx = 0; vy = 0; launched = false;
      ringX = W * 0.55; ringY = POND_TOP + (POND_BOTTOM - POND_TOP) * 0.3;
      demo.phase = 'pull';
    }
    if (cyc < 1.4) {
      var p = cyc / 1.4;
      var pdx = boatX - ringX, pdy = boatY - ringY;
      var pdist = Math.hypot(pdx, pdy) || 1;
      var pullMag = Math.min(130, pdist * 0.3);
      demo.gx = boatX + (pdx / pdist) * pullMag * p;
      demo.gy = boatY + (pdy / pdist) * pullMag * p;
      demo.press = true;
    } else if (!launched) {
      var dx = ringX - boatX, dy = ringY - boatY;
      var dist = Math.hypot(dx, dy);
      vx = (dx / dist) * 1400; vy = (dy / dist) * 1400;
      launched = true;
      demo.press = false;
      game.audio.play('se_jump', 0.15);
    } else {
      var decay = Math.pow(0.3, dt);
      boatX += vx * dt; boatY += vy * dt;
      vx *= decay; vy *= decay;
      trail.push({ x: boatX, y: boatY }); if (trail.length > 8) trail.shift();
      demo.gx = boatX; demo.gy = boatY;
      if (Math.hypot(boatX - ringX, boatY - ringY) < 30 && Math.hypot(vx, vy) < 80) {
        game.feedback.good(ringX, ringY, { text: 'GOOD', color: C.good, sound: false });
        game.audio.play('se_good', 0.15);
        launched = 'settled';
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      var d = Math.round(Math.hypot(boatX - ringX, boatY - ringY));
      if (!ok) txt(d < 90 ? 'あと少し!' : 'MISS', W / 2, H * 0.13, 28, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.max(0, 100 - Math.round(Math.hypot(boatX - ringX, boatY - ringY) / 6));
        if (ok) game.end.success(pct); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && launched) {
      var pDecay = Math.pow(0.3, dt);
      boatX += vx * dt; boatY += vy * dt;
      vx *= pDecay; vy *= pDecay;
      trail.push({ x: boatX, y: boatY }); if (trail.length > 8) trail.shift();
      var speed = Math.hypot(vx, vy);
      var nearWall = boatX < 40 || boatX > W - 40 || boatY < POND_TOP + 10 || boatY > POND_BOTTOM - 10;
      if (nearWall) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(boatX, boatY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (speed < 60) {
        var d = Math.hypot(boatX - ringX, boatY - ringY);
        if (d < 55) {
          ok = true; finished = true; hitStop = 0.2;
          game.feedback.good(ringX, ringY, { text: 'CLEAR', color: C.good });
          game.fx.burst(ringX, ringY, { color: C.gold, count: 20, speed: 360 });
          game.audio.play('se_milestone', 0.4);
          finish();
        } else {
          ok = false; finished = true; hitStop = 0.25;
          game.feedback.bad(boatX, boatY, { text: 'MISS' });
          shake = 0.2;
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    var pct2 = Math.max(0, 100 - Math.round(Math.hypot(boatX - ringX, boatY - ringY) / 6));
    txt(pct2 + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (pct2 / 100), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.4], ['B4', 0.4], ['D5', 0.4], ['G5', 0.8]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

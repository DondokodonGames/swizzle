// I-DS-0026-poi-scoop-lift.js
// 紙すくい上げ — 指をなぞらせて池の生き物を紙のすくいで持ち上げる
// 操作: 指で水面をなぞって生き物にすくいを重ね、そのまま指で上のかごまで運ぶ
// 終わり: 規定数(3匹)をかごに運べれば成功。制限時間切れなら失敗
// @mechanic: drag_follow
// @theme: night_festival_pond
// 世界観: 夜店の縁日の水盆。すくいの紙を持った子どもが、泳ぐ生き物を破らないよう静かにかごへ運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + すくえた数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル、丸み、柔らかい輪郭線
  var C = {
    bg: '#dff2ef', bg2: '#bfe4e0', water: '#8fd4d6', waterDeep: '#6bb9c0',
    poi: '#ffe1b0', poiRim: '#e8a15a', creature: '#ff9ecb', creatureAlt: '#9ec8ff',
    basket: '#c98a4a', basketDark: '#8a5a2c',
    good: '#5cd47a', bad: '#ff6b6b', gold: '#ffcf4a', white: '#3a2c22', ink: '#ffffff',
  };

  var GAME_TITLE = 'POI SCOOP';
  var TOTAL = 3;
  var TIME_LIMIT = 19;
  var PONDX0 = W * 0.14, PONDX1 = W * 0.86, PONDY0 = H * 0.30, PONDY1 = H * 0.70;
  var BASKETX = W * 0.5, BASKETY = H * 0.19, BASKETR = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;
  var poiX, poiY, held, fish, snag, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISH_SPRITE = ['.##..', '#####', '.##.#'];
  var POI_SPRITE = ['.###.', '#####', '.###.', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(BASKETX, BASKETY, BASKETR + 20, C.basketDark, 0.6);
    game.draw.circle(BASKETX, BASKETY, BASKETR, C.basket, 1);
    for (var i = -2; i <= 2; i++) game.draw.line(BASKETX + i * 24, BASKETY - BASKETR + 10, BASKETX + i * 24, BASKETY + BASKETR - 10, C.basketDark, 4);
    game.draw.rect(PONDX0, PONDY0, PONDX1 - PONDX0, PONDY1 - PONDY0, C.waterDeep, 1);
    game.draw.rect(PONDX0, PONDY0, PONDX1 - PONDX0, PONDY1 - PONDY0, C.water, 0.55);
    for (var j = 0; j < 4; j++) {
      var ry = PONDY0 + 30 + j * ((PONDY1 - PONDY0 - 60) / 3);
      game.draw.line(PONDX0 + 20, ry, PONDX1 - 20, ry, C.bg, 0.15);
    }
  }

  function newFish() {
    return {
      x: game.random(PONDX0 + 60, PONDX1 - 60),
      y: game.random(PONDY0 + 60, PONDY1 - 60),
      vx: game.random(-70, 70), vy: game.random(-50, 50),
      alt: Math.random() < 0.5,
    };
  }
  function newSnag() {
    return { x: game.random(PONDX0 + 80, PONDX1 - 80), y: game.random(PONDY0 + 80, PONDY1 - 80), t: 0, tel: 0.6, active: false };
  }

  function initGame() {
    caught = 0; timeLeft = TIME_LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    poiX = W * 0.5; poiY = H * 0.5; held = false;
    fish = newFish(); snag = newSnag(); milestoneShown = false;
  }

  function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }

  function updateFish(dt) {
    if (!fish) return;
    fish.x += fish.vx * dt; fish.y += fish.vy * dt;
    if (fish.x < PONDX0 + 40 || fish.x > PONDX1 - 40) fish.vx *= -1;
    if (fish.y < PONDY0 + 40 || fish.y > PONDY1 - 40) fish.vy *= -1;
    fish.x = Math.max(PONDX0 + 40, Math.min(PONDX1 - 40, fish.x));
    fish.y = Math.max(PONDY0 + 40, Math.min(PONDY1 - 40, fish.y));
  }

  function updateSnag(dt) {
    if (!snag) return;
    snag.t += dt;
    if (snag.t > snag.tel && !snag.active) snag.active = true;
    if (snag.active && held && dist(poiX, poiY, snag.x, snag.y) < 70) {
      // すくいが破れて生き物を逃す
      held = false; fish = newFish();
      hitStop = 0.3;
      game.feedback.bad(poiX, poiY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      snag = newSnag();
    }
    if (snag.t > snag.tel + 1.4) snag = newSnag();
  }

  function moveTo(x, y) {
    poiX = x; poiY = y;
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (!held && fish && dist(x, y, fish.x, fish.y) < 64) {
      held = true;
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.creature, count: 8, speed: 160 });
    }
    if (held) {
      fish.x = poiX; fish.y = poiY;
      if (dist(x, y, BASKETX, BASKETY) < BASKETR) {
        held = false; caught++;
        game.feedback.good(BASKETX, BASKETY, { text: 'GET!', color: C.good });
        game.fx.burst(BASKETX, BASKETY, { color: C.gold, count: 16, speed: 320 });
        game.audio.play('se_coin', 0.4);
        if (!milestoneShown && caught >= Math.ceil(TOTAL / 2)) {
          milestoneShown = true;
          game.fx.popup('HALFWAY!', BASKETX, BASKETY - 120, { color: C.gold, size: 38 });
          game.audio.play('se_milestone', 0.4);
        }
        if (caught >= TOTAL) {
          finished = true; ok = true; hitStop = 0.12;
          game.audio.play('se_success', 0.5);
          finish();
        } else {
          fish = newFish();
        }
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); moveTo(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) moveTo(x, y); });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (held) {
      held = false;
      game.feedback.bad(x, y, { text: '' });
      fish = newFish();
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      caught = 0; held = false; fish = { x: PONDX0 + 120, y: PONDY0 + 100, vx: 0, vy: 0, alt: false }; snag = null;
    }
    if (cyc < 1.6) {
      var p1 = cyc / 1.6;
      demo.gx = fish.x; demo.gy = fish.y;
      demo.press = p1 > 0.1;
      held = p1 > 0.15;
      poiX = demo.gx; poiY = demo.gy;
    } else {
      var p2 = Math.min(1, (cyc - 1.6) / 1.4);
      demo.gx = fish.x + (BASKETX - fish.x) * p2;
      demo.gy = fish.y + (BASKETY - fish.y) * p2;
      poiX = demo.gx; poiY = demo.gy;
      fish.x = demo.gx; fish.y = demo.gy;
      demo.press = true;
      if (p2 >= 1 && caught === 0) {
        caught = 1;
        game.fx.burst(BASKETX, BASKETY, { color: C.gold, count: 14, speed: 300 });
        game.audio.play('se_coin', 0.25);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (caught === undefined) initGame();
      bg();
      stepDemo(dt);
      if (fish) game.draw.sprite(FISH_SPRITE, { '#': C.creature }, fish.x, fish.y, 14, { anchor: 'center' });
      game.draw.sprite(POI_SPRITE, { '#': C.poi }, poiX, poiY, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.basketDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.basketDark);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      if (fish) game.draw.sprite(FISH_SPRITE, { '#': C.creature }, fish.x, fish.y, 14, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.basketDark);
      if (!ok) txt('あと' + (TOTAL - caught) + '匹!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      updateFish(dt);
      updateSnag(dt);
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(BASKETX, BASKETY, { text: 'TIME UP' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (snag && snag.active) {
      var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
      if (blink) game.draw.circle(snag.x, snag.y, 60, C.bad, 0.35);
    } else if (snag) {
      game.draw.circle(snag.x, snag.y, 40, C.bad, 0.15);
    }
    if (fish) game.draw.sprite(FISH_SPRITE, { '#': fish.alt ? C.creatureAlt : C.creature }, fish.x, fish.y, 14, { anchor: 'center' });
    if (!finished) game.draw.sprite(POI_SPRITE, { '#': held ? C.poiRim : C.poi }, poiX, poiY, 16, { anchor: 'center' });

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.basketDark, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

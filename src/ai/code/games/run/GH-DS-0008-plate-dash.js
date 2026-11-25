// GH-DS-0008-plate-dash.js
// プレートダッシュ — 皿が落ちる前に跳び越える。届いた距離が残る
// 操作: タップでジャンプ。押す長さで跳ぶ高さが変わる(長押し可)
// 終わり: 皿に当たるか30秒走り切ると終了。届いた距離(m)が残る
// @mechanic: camera_run
// @theme: kitchen_counter
// 世界観: 深夜の台所の調理台。積まれた皿がひとりでに落ちてくる。棚の上を走り、落ちる皿を跳び越える
// 残るもの: 距離(m)。当たって終わった皿の高さも残る(何が原因で終わったか)
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HOME: 家庭用機の粗いドット。明るい配色
  var C = {
    sky1: '#bfe8ff', sky2: '#e8f7ff', counter: '#d8b078', counter2: '#a67a44',
    tile: '#f0e8d8', tile2: '#d8cbb0', plate: '#ffffff', plate2: '#c8c8d8',
    hero: '#ff5a3c', hero2: '#8b2f1c', gold: '#ffd400', good: '#4dff7a', bad: '#ff3d5e', white: '#ffffff', ink: '#141018',
  };

  var GAME_TITLE = 'PLATE DASH';
  var MAX_TIME = 20;
  var GROUND_Y = H * 0.72;
  var SPEED0 = 340;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var dist, speed, heroY, heroVY, jumping, holdT, plates, spawnTimer, totalTime, done, hitHeight, endWait;
  var ready, hitStop, shake, scrollX;

  var HERO_A = ['.RR.', 'RRRR', '.WW.', '.WW.', 'B..B'];
  var HERO_B = ['.RR.', 'RRRR', '.WW.', '.WW.', '.BB.'];
  var HERO_COL = { R: C.hero, W: C.hero2, B: '#3a2418' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 6) game.draw.rect(0, sy, W, 2, '#000000', 0.08); }

  function kitchenBg() {
    game.draw.gradient(0, GROUND_Y, [[0, C.sky1], [1, C.sky2]]);
    // タイル壁(流れる)
    for (var i = -1; i < 12; i++) {
      var x = ((i * 100 - scrollX * 0.4) % (W + 100) + (W + 100)) % (W + 100) - 100;
      game.draw.rect(x, H * 0.30, 90, 90, (i % 2 === 0) ? C.tile : C.tile2, 0.6);
    }
    // 吊り鍋(中景の帯。空きすぎる中段を埋める装飾)
    for (var k = -1; k < 8; k++) {
      var kx = ((k * 220 - scrollX * 0.7) % (W + 220) + (W + 220)) % (W + 220) - 220;
      game.draw.rect(kx - 3, H * 0.36, 6, H * 0.14, C.counter2, 0.5);
      game.draw.circle(kx, H * 0.53, 46, C.counter2, 0.55);
      game.draw.circle(kx, H * 0.53, 34, C.tile, 0.55);
    }
    // 調理台(足場)
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.counter);
    game.draw.rect(0, GROUND_Y, W, 14, C.counter2);
    for (var j = -1; j < 14; j++) {
      var xx = ((j * 90 - scrollX) % (W + 90) + (W + 90)) % (W + 90) - 90;
      game.draw.rect(xx, GROUND_Y + 20, 4, H - GROUND_Y - 20, C.counter2, 0.5);
    }
  }

  function initGame() {
    dist = 0; speed = SPEED0; heroY = GROUND_Y; heroVY = 0; jumping = false; holdT = 0;
    plates = []; spawnTimer = 1.0; totalTime = 0; done = false; hitHeight = 0; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0; scrollX = 0;
  }

  function spawnPlate() {
    // 皿は棚から落ちてくる。落下点のシャドウが telegraph
    plates.push({ x: W + 100, dropAt: 0.5 + Math.random() * 0.6, y: -80, landed: false });
  }

  function jumpHeight() { return Math.min(1, holdT * 2.4); }

  function finish() {
    if (done) return;
    done = true; finalScore = Math.round(dist);
    game.audio.stopBgm();
    game.audio.play(hitHeight === 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  function startJump() {
    if (jumping || done) return;
    jumping = true; holdT = 0; heroVY = -10;
  }
  function releaseJump() {
    if (!jumping) return;
    var h = 900 + jumpHeight() * 700;
    heroVY = -Math.sqrt(h);
  }

  game.onPress(function() {
    if (state !== S.PLAYING || done || ready > 0) return;
    startJump();
    game.audio.play('se_jump', 0.5);
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || done || ready > 0) return;
    game.audio.tone(360 + jumpHeight() * 420, 0.06, { wave: 'triangle', volume: 0.14 });
    releaseJump();
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
  });

  function drawHero(y, wob) {
    var groundShadow = GROUND_Y - Math.min(30, (GROUND_Y - y) * 0.15);
    game.draw.circle(W * 0.30, GROUND_Y + 8, 34 - Math.min(20, (GROUND_Y - y) * 0.06), '#000000', 0.3);
    game.draw.sprite(wob ? HERO_A : HERO_B, HERO_COL, W * 0.30, y - 40, 18, { anchor: 'center' });
  }

  function drawPlate(p) {
    var wob = Math.floor(game.time.elapsed * 10) % 2 === 0;
    // 着地前: 落下シャドウ(telegraph)
    if (!p.landed) game.draw.circle(p.x, GROUND_Y + 6, 40, '#000000', 0.25);
    game.draw.circle(p.x, p.y, 44, C.plate);
    game.draw.circle(p.x, p.y, 30, C.plate2);
    game.draw.circle(p.x, p.y, 44, C.ink, 0);
  }

  // ── ATTRACT ゴースト実演: 皿が落ちる直前に長押しで跳んで越える ──
  var demo = { t: 0, gx: W * 0.30, gy: H * 0.90, press: false };
  var demoPlate = { x: W * 0.30, y: GROUND_Y - 40, landed: true, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    demo.press = cyc > 0.3 && cyc < 1.0;
    demo.gy += ((demo.press ? H * 0.72 : H * 0.90) - demo.gy) * Math.min(1, dt * 5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      kitchenBg();
      stepDemo(dt);
      drawPlate(demoPlate);
      var wob0 = Math.floor(game.time.elapsed * 8) % 2 === 0;
      var demoY = demo.press ? GROUND_Y - 180 * Math.min(1, (demo.t % 2.6 - 0.3) * 1.6) : GROUND_Y;
      drawHero(Math.max(GROUND_Y - 200, demoY), wob0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.hero);
      txt('BEST ' + String(game.best).padStart(5, '0') + 'm', W / 2, H * 0.15, 38, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.hero);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 40, C.ink);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      kitchenBg();
      drawPlate({ x: W * 0.30, y: GROUND_Y - hitHeight, landed: true });
      drawHero(GROUND_Y, true);
      txt(hitHeight === 0 ? 'FINISH' : 'GAME OVER', W / 2, H * 0.20, 80, hitHeight === 0 ? C.gold : C.bad);
      txt(String(finalScore) + 'm', W / 2, H * 0.32, 96, C.ink);
      if (hitHeight > 0) txt('高さ ' + Math.round(hitHeight) + 'cm の皿', W / 2, H * 0.40, 34, C.bad);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best) + 'm', W / 2, H * 0.48, 44, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.55, 46, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 40, C.ink);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { hitHeight: hitHeight }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { finish(); return; }
      speed = SPEED0 + totalTime * 6;
      dist += speed * dt / 40;
      scrollX += speed * dt;

      if (jumping) holdT += dt;
      heroVY += 2200 * dt;
      heroY += heroVY * dt;
      if (heroY >= GROUND_Y) { heroY = GROUND_Y; heroVY = 0; jumping = false; }

      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnPlate(); spawnTimer = Math.max(0.7, 1.6 - totalTime * 0.02); }

      for (var i = plates.length - 1; i >= 0; i--) {
        var p = plates[i];
        p.x -= speed * dt;
        if (!p.landed) { p.y += 900 * dt; if (p.y >= GROUND_Y - 30) { p.y = GROUND_Y - 30; p.landed = true; } }
        if (p.x < -100) { plates.splice(i, 1); continue; }
        // 当たり判定: 皿が着地していて、自機のx範囲に重なり、跳んでいる高さが足りない
        if (p.landed && !p.passed && p.x < W * 0.30 - 70) {
          p.passed = true;
          game.feedback.good(p.x, p.y, { text: null, count: 4, sound: 'se_tap' });
        }
        if (p.landed && Math.abs(p.x - W * 0.30) < 60) {
          var heroTop = heroY - 40;
          if (heroTop > p.y - 44) {
            hitHeight = GROUND_Y - p.y;
            hitStop = 0.4; shake = 0.5;
            game.fx.flash(C.bad, 0.3);
            game.feedback.bad(p.x, p.y, { text: 'MISS' });
            game.audio.play('se_failure', 0.6);
            finish();
            break;
          }
        }
      }
      if (Math.floor(dist / 50) > Math.floor((dist - speed * dt / 40) / 50)) {
        game.fx.popup(Math.floor(dist) + 'm', W / 2, H * 0.20, { color: C.gold, size: 54 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    if (shake > 0) shake -= dt;

    kitchenBg();
    for (var k = 0; k < plates.length; k++) drawPlate(plates[k]);
    var wob1 = Math.floor(game.time.elapsed * 10) % 2 === 0;
    drawHero(heroY, wob1);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.bad : C.good);
    txt(Math.floor(dist) + 'm', W / 2, 106, 48, C.ink);
    txt(Math.floor(totalTime) + ' / ' + MAX_TIME, W * 0.86, 106, 32, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 96, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['C5', 0.2], ['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['E5', 0.2], ['C5', 0.2]],
      { tempo: 150, wave: 'square', volume: 0.07, loop: true,
        bass: [['C3', 0.4], ['G2', 0.4]], bassWave: 'triangle', bassVolume: 0.07 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

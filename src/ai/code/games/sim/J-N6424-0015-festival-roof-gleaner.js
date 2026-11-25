// J-N6424-0015-festival-roof-gleaner.js
// フェスティバル・ルーフ・グリーナー — 夜祭りの火の粉を避けながら、屋根の上を流れる提灯果実を規定数集める
// 操作: 屋根の上の集荷師を指でドラッグして横移動させ、落ちてくる火の粉を避けつつ提灯果実だけ受け取る
// 終わり: 火の粉に当たらず規定個数の提灯果実を集めれば成功。火の粉に1回でも当たると失格
// @mechanic: dodge
// @theme: festival_ember_gleaning
// 世界観: 夜祭りの屋根裏を渡る集荷師が、打ち上がる火の粉の雨をかわしながら、風に流れる提灯果実だけを拾い集めて軒先の籠を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた個数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var C = {
    bg: '#ffe3ef', bg2: '#e3d8ff', roof: '#f6c9dd', roofDark: '#e2a9c6',
    hero: '#7a5cff', heroDark: '#4a34b0', ember: '#ff7a52', emberWarn: '#ffb347',
    lantern: '#ffd15c', lanternGlow: '#fff0c0',
    good: '#5ed48a', bad: '#ff5d78', gold: '#ffd15c', ink: '#3a2a4a', white: '#ffffff',
  };

  var GAME_TITLE = 'ROOF GLEANER';
  var NEEDED = 8;
  var MAX_TIME = 20;
  var CATCH_Y = H * 0.78;
  var SPAWN_Y = H * 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#2a1c38', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO = ['.####.', '######', '#.##.#', '######'];
  var LANTERN = ['.##.', '####', '####', '.##.'];
  var EMBER = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.025 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    for (var i = 0; i < 5; i++) {
      game.draw.rect(i * W / 5, H * 0.84, W / 5 - 10, 90, i % 2 === 0 ? C.roof : C.roofDark, 0.7);
    }
  }

  var heroX, items, collected, spawnGap, done, endWait, finished, ready, hitStop, shake, milestoneAt;

  function initGame() {
    heroX = W * 0.5; items = []; collected = 0; spawnGap = 0.55;
    milestoneAt = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function moveHero(x) {
    heroX = Math.max(90, Math.min(W - 90, x));
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.08);
    moveHero(x);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
    moveHero(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function getBurned() {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(heroX, CATCH_Y, { text: 'MISS' });
    game.fx.flash(C.bad, 0.2);
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function spawnItem() {
    var isEmber = game.random(0, 1) < 0.55;
    items.push({
      x: 100 + game.random(0, 1) * (W - 200), y: SPAWN_Y,
      vy: (isEmber ? 620 : 430) + game.random(0, 90),
      kind: isEmber ? 'ember' : 'lantern', warn: false,
    });
  }

  function stepField(dt) {
    spawnGap -= dt;
    if (spawnGap <= 0) { spawnItem(); spawnGap = Math.max(0.32, 0.56 - game.time.elapsed * 0.01); }
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.y += it.vy * dt;
      if (!it.warn && it.y > CATCH_Y - 220) it.warn = true;
      if (it.y >= CATCH_Y - 40 && it.y <= CATCH_Y + 40 && Math.abs(it.x - heroX) < 78) {
        if (it.kind === 'ember') { getBurned(); return; }
        collected++;
        game.feedback.good(it.x, it.y, { text: '', color: C.gold, size: 10 });
        game.audio.play('se_coin', 0.3);
        items.splice(i, 1);
        var m = Math.floor(collected / (NEEDED / 3));
        if (m > milestoneAt && m < 3) {
          milestoneAt = m;
          game.fx.popup('NICE', heroX, CATCH_Y - 90, { color: C.gold, size: 30 });
          game.audio.play('se_milestone', 0.25);
        }
        if (collected >= NEEDED) {
          ok = true; finished = true; hitStop = 0.2;
          game.feedback.good(heroX, CATCH_Y, { text: 'CLEAR', color: C.good });
          game.fx.burst(heroX, CATCH_Y, { color: C.gold, count: 22, speed: 400 });
          game.audio.play('se_success', 0.5);
          finish();
        }
        continue;
      }
      if (it.y > H * 0.95) items.splice(i, 1);
    }
    if (!finished && game.time.elapsed >= MAX_TIME) {
      ok = false; finished = true; hitStop = 0.2; shake = 0.15;
      game.feedback.bad(heroX, CATCH_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      finish();
    }
  }

  function drawField() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind === 'ember') {
        if (it.warn) game.draw.circle(it.x, it.y - 10, 40, C.emberWarn, 0.3);
        game.draw.sprite(EMBER, { '#': C.ember }, it.x, it.y, 12, { anchor: 'center' });
      } else {
        game.draw.circle(it.x, it.y, 34, C.lanternGlow, 0.4);
        game.draw.sprite(LANTERN, { '#': C.lantern }, it.x, it.y, 11, { anchor: 'center' });
      }
    }
    var bob = Math.sin(game.time.elapsed * 8) * 4;
    game.draw.circle(heroX, CATCH_Y + 40, 26, C.heroDark, 0.3);
    game.draw.sprite(HERO, { '#': C.hero }, heroX, CATCH_Y + bob, 13, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: CATCH_Y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.6;
    if (cyc < dt || demo.t <= dt) initGame();
    stepField(dt);
    var nearest = null, nd = 1e9;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.y < CATCH_Y && (CATCH_Y - it.y) < nd) { nd = CATCH_Y - it.y; nearest = it; }
    }
    if (nearest) {
      var tx = nearest.kind === 'lantern' ? nearest.x : (nearest.x > W * 0.5 ? W * 0.18 : W * 0.82);
      moveHero(heroX + (tx - heroX) * Math.min(1, dt * 5));
    }
    demo.gx = heroX; demo.gy = CATCH_Y - 90; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame();
      bg();
      stepDemo(dt);
      drawField();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.ink);
      else txt('INSERT COIN', W / 2, H * 0.96, 24, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawField();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(collected + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.ink);
      if (!ok) txt('あと' + Math.max(1, NEEDED - collected) + '個!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 22, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(collected, { collected: collected, needed: NEEDED });
        else game.end.failure({ collected: collected, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepField(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawField();
    txt(collected + ' / ' + NEEDED, W / 2, H * 0.06, 26, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.roofDark, 1);
    game.draw.rect(60, 150, barW * Math.min(1, collected / NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 54, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['E5', 0.2], ['A5', 0.35]], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-GBA-0020-chameleon-tongue-reach.js
// カメレオンタングリーチ — 枝の上から蛍めがけ、押し続けて舌をまっすぐ伸ばす
// 操作: 画面を長押しして舌を伸ばし続け、蛍に届く手前で離して届かせる
// 終わり: 蛍に舌が届けば成功。離すのが早すぎて届かない/伸ばしすぎて枝が折れれば失敗
// @mechanic: hold_charge
// @theme: chameleon_firefly_branch
// 世界観: 夜の枝先にとまったカメレオンが、舌を伸ばし続けて遠くの蛍を捕まえようとする一瞬の狩り
// 残るもの: 正誤(CLEAR/GAME OVER) + 伸ばした距離%
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁+ベタ塗り2〜3段階の陰影、彩度高め
  var C = {
    bg: '#2a5d3a', bg2: '#1a3f26', branch: '#5a3a1e', branchDark: '#3a2410',
    tongue: '#ff5a7a', tongueDark: '#c22a4a', firefly: '#eaff5a', fireflyGlow: '#8a9a2a',
    good: '#5aff8a', bad: '#ff4a4a', gold: '#ffe14d', white: '#ffffff', ink: '#0a1408',
  };

  var GAME_TITLE = 'TONGUE REACH';
  var MX = W * 0.28, MY = H * 0.42;
  var SNAP_RANGE = 40;
  var BREAK_LEN = 560;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var holding, len, fireflyX, fireflyY, dist01, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHAM = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, MY - 10, W, 34, C.branchDark);
    game.draw.rect(0, MY - 4, W * 0.5, 22, C.branch);
  }

  function initGame() {
    holding = false; len = 0; dist01 = 0; done = false; endWait = 0; finished = false;
    fireflyX = W * 0.78; fireflyY = MY + Math.sin(game.time.elapsed) * 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function targetDist() { return fireflyX - MX; }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    holding = true;
    game.audio.play('se_tap', 0.15);
  });
  game.onRelease(function() {
    if (!holding) return;
    holding = false;
    resolve();
  });

  function resolve() {
    if (finished) return;
    var td = targetDist();
    dist01 = Math.max(0, Math.min(1, len / td));
    var diff = Math.abs(len - td);
    if (diff < SNAP_RANGE) {
      ok = true; hitStop = 0.12;
      game.feedback.good(fireflyX, fireflyY, { text: 'CATCH', color: C.good });
      game.fx.burst(fireflyX, fireflyY, { color: C.gold, count: 18, speed: 340 });
      game.audio.play('se_good', 0.4);
    } else {
      ok = false; hitStop = 0.3;
      game.feedback.bad(MX + len, MY, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
    }
    finished = true;
    finish();
  }

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

  function drawScene(l, holdingNow) {
    game.draw.sprite(CHAM, { '#': C.gold }, MX, MY - 30, 22, { anchor: 'center' });
    if (l > 0) {
      game.draw.line(MX, MY - 20, MX + l, MY - 20, C.tongueDark, 20);
      game.draw.line(MX, MY - 20, MX + l, MY - 20, C.tongue, 12);
      game.draw.circle(MX + l, MY - 20, 14, C.tongue);
    }
    var telegraph = len > BREAK_LEN * 0.7;
    if (telegraph) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(MX, MY - 20, 40, C.bad, 0.3);
    }
    game.draw.circle(fireflyX, fireflyY, 26, C.fireflyGlow, 0.6);
    game.draw.circle(fireflyX, fireflyY, 13, C.firefly);
  }

  var demo = { t: 0, gx: MX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { len = 0; fireflyX = W * 0.78; }
    var target = targetDist();
    if (cyc < 1.5) {
      len = Math.min(target, (cyc / 1.5) * target);
      demo.press = true; demo.gx = MX; demo.gy = H * 0.86;
      if (!milestoneShown && len > target * 0.7) { milestoneShown = true; }
    } else if (cyc < 1.65) {
      demo.press = false;
      if (!demo._done) {
        demo._done = true;
        game.feedback.good(fireflyX, fireflyY, { text: 'CATCH', color: C.good });
        game.audio.play('se_good', 0.25);
      }
    } else {
      demo._done = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(len, demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(Math.min(len, BREAK_LEN), false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(dist01 * 100) + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(dist01 * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (holding) {
        len += dt * 620;
        if (!milestoneShown && len > targetDist() * 0.6) {
          milestoneShown = true;
          game.fx.popup('NICE', MX + len, MY - 90, { color: C.gold, size: 32 });
          game.audio.play('se_milestone', 0.35);
        }
        if (len >= BREAK_LEN) {
          holding = false;
          ok = false; hitStop = 0.35;
          game.feedback.bad(MX + len, MY, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(Math.min(len, BREAK_LEN), holding);

    txt(Math.round(Math.min(1, len / targetDist()) * 100) + '%', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, len / targetDist()), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.4], ['B3', 0.4], ['D4', 0.4], ['G4', 0.8]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

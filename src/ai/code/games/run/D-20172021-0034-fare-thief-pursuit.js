// D-20172021-0034-fare-thief-pursuit.js
// フェアシーフ・パースート — 連打で距離を詰めて運賃箱荒らしを追い詰めつつ、障害物が実体化する瞬間だけ足を止める
// 操作: 連続タップで距離を詰める。障害物の警告が実体化した瞬間だけタップを止めて足を止める
// 終わり: 制限時間内に距離をゼロにすれば成功。実体化中にタップすればつまずいて失敗
// @mechanic: chase
// @theme: night_bus_fare_thief_pursuit
// 世界観: 夜行バスの車掌が、運賃箱から小銭袋を奪って逃げた泥棒を連続タップで追い詰め、通路の障害物が実体化する瞬間だけ足を止めて詰め寄る
// 残るもの: 正誤(CLEAR/GAME OVER) + 詰めた距離
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: くすんだ4色パレット、粗いドット、低コントラスト背景
  var C = {
    bg: '#3a3a2c', bg2: '#242418', aisle: '#4a4a38', aisleEdge: '#5c5c44',
    thief: '#d4a83c', thiefDark: '#8a6a1c', hero: '#4ca6c8', heroDark: '#1c5a72',
    hazard: '#c85030', hazardWarn: '#e0c840',
    good: '#4cc86a', bad: '#e04c4c', gold: '#e0c840', white: '#f0ead8', ink: '#141410',
  };

  var GAME_TITLE = 'FARE PURSUIT';
  var TIME_LIMIT = 17;
  var GAP_PER_TAP = 5;
  var TRACK_X0 = W * 0.14, TRACK_X1 = W * 0.86;
  var TRACK_Y = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var gapPct, done, endWait, finished;
  var ready, hitStop, shake;
  var playT, hazards, halfCalled;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var THIEF_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var HERO_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#e0c840', pulse * 0.3);
    game.draw.rect(TRACK_X0 - 20, TRACK_Y - 90, TRACK_X1 - TRACK_X0 + 40, 180, C.aisle, 0.7);
    game.draw.rect(TRACK_X0 - 20, TRACK_Y - 90, TRACK_X1 - TRACK_X0 + 40, 8, C.aisleEdge);
  }

  function buildHazards() {
    var list = [];
    var t = 3 + game.random(0, 1.5);
    while (t < TIME_LIMIT - 1.5) {
      list.push({ t: t, resolved: false });
      t += 4.2 + game.random(0, 1.6);
    }
    return list;
  }

  function initGame() {
    gapPct = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    playT = 0; hazards = buildHazards(); halfCalled = false;
  }

  function hazardState() {
    for (var i = 0; i < hazards.length; i++) {
      var hz = hazards[i];
      if (playT >= hz.t - 0.7 && playT < hz.t) return { active: false, warn: true, hz: hz };
      if (playT >= hz.t && playT < hz.t + 0.5) return { active: true, warn: true, hz: hz };
    }
    return { active: false, warn: false, hz: null };
  }

  function drawScene() {
    var heroX = TRACK_X0 + (TRACK_X1 - TRACK_X0) * Math.min(1, gapPct / 100) * 0.7;
    var thiefX = TRACK_X0 + (TRACK_X1 - TRACK_X0) * (0.75 + Math.min(1, gapPct / 100) * 0.2);
    var hs = hazardState();
    if (hs.warn) {
      var hazX = TRACK_X0 + (TRACK_X1 - TRACK_X0) * 0.5;
      game.draw.circle(hazX, TRACK_Y, 50, hs.active ? C.hazard : C.hazardWarn, hs.active && Math.floor(game.time.elapsed * 12) % 2 === 0 ? 1 : 0.7);
    }
    var bob = Math.sin(game.time.elapsed * 8) * 6;
    game.draw.sprite(THIEF_SPRITE, { '#': C.thiefDark }, thiefX, TRACK_Y + bob, 16, { anchor: 'center' });
    game.draw.sprite(HERO_SPRITE, { '#': C.hero }, heroX, TRACK_Y + bob, 16, { anchor: 'center' });
  }

  function trip(x, y) {
    ok = false; finished = true;
    hitStop = 0.32; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function pushTap(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var hs = hazardState();
    if (hs.active) { trip(x, y); return; }
    gapPct = Math.min(100, gapPct + GAP_PER_TAP);
    game.fx.burst(x, y, { color: C.good, count: 5, speed: 180 });
    game.audio.play('se_tap', 0.2);
    if (gapPct >= 40 && gapPct - GAP_PER_TAP < 40) game.fx.popup('あと少し!', W * 0.5, H * 0.32, { color: C.gold, size: 32 });
    if (gapPct >= 100) {
      ok = true; finished = true;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_coin', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    pushTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: TRACK_Y + 260, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.5;
    if (cyc < dt || demo.t <= dt) { gapPct = 0; playT = 0; hazards = buildHazards(); }
    playT = cyc;
    var hs = hazardState();
    demo.press = !hs.active && Math.floor(cyc * 3) % 2 === 0;
    if (demo.press && gapPct < 100) { gapPct = Math.min(100, gapPct + GAP_PER_TAP * 0.6); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gapPct === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.floor(gapPct) + ' / ' + 100, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, 100 - Math.floor(gapPct)) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(gapPct), { gap: Math.floor(gapPct) });
        else game.end.failure({ gap: Math.floor(gapPct) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playT += dt;
      if (!halfCalled && playT >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.fx.popup('残り半分!', W * 0.5, H * 0.3, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (playT >= TIME_LIMIT) {
        ok = false; finished = true;
        hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W * 0.5, TRACK_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(Math.floor(gapPct) + ' / ' + 100, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (gapPct / 100), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.15], ['A3', 0.15], ['C4', 0.15], ['D4', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

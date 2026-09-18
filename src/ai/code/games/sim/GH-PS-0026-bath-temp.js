// GH-PS-0026-bath-temp.js
// バスタイム — 銭湯の湯温を保つ。熱すぎても冷たすぎても客が出ていく
// 操作: 押している間だけお湯を足して温度を上げる。離すと自然に冷める
// 終わり: 適温を保ち続ければ成功。外れている時間が積もると失敗
// @mechanic: hold_duration
// @theme: bathhouse
// 世界観: 湯船の温度計。適温の帯からはみ出すと客が離れていく。長押しでお湯を足し、離すと冷めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 適温を外れていた時間
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HANDHELD: 4階調(黄緑寄り)。残像・低コントラスト・画面枠
  var C = {
    bg1: '#1a2a1a', bg2: '#0e1a0e', panel: '#2a3a2a', good: '#8ac878', bad: '#e85858', gold: '#c8d848', white: '#e8f0e0', ink: '#0a120a',
  };

  var GAME_TITLE = 'BATH TEMP';
  var TOTAL_TIME = 13, OUT_BUDGET = 3.2, ZONE_MIN = 42, ZONE_MAX = 62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, outTime = 0, elapsedRound = 0;

  var temp, pressing, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function frameBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * (H / 8) + (H / 8) - 2, W, 4, '#000000', 0.06);
    game.draw.rect(20, 20, W - 40, H - 40, C.panel, 0.0);
    game.draw.rect(0, 0, W, 12, C.ink); game.draw.rect(0, H - 12, W, 12, C.ink);
    game.draw.rect(0, 0, 12, H, C.ink); game.draw.rect(W - 12, 0, 12, H, C.ink);
  }

  var GX = W * 0.30, GY0 = H * 0.24, GY1 = H * 0.76, GW = 140;
  var TUB_SPRITE = ['#####', '#...#', '#####'];

  function drawGauge() {
    game.draw.rect(GX - GW / 2, GY0, GW, GY1 - GY0, C.panel);
    var zoneY0 = GY0 + (GY1 - GY0) * (1 - ZONE_MAX / 100), zoneY1 = GY0 + (GY1 - GY0) * (1 - ZONE_MIN / 100);
    game.draw.rect(GX - GW / 2, zoneY0, GW, zoneY1 - zoneY0, C.good, 0.4);
    var ty = GY0 + (GY1 - GY0) * (1 - temp / 100);
    var inZone = temp >= ZONE_MIN && temp <= ZONE_MAX;
    game.draw.rect(GX - GW / 2, ty, GW, GY1 - ty, inZone ? C.good : C.bad, 0.7);
    game.draw.circle(GX, ty, 16, C.gold);

    // 湯船(モチーフ)
    game.draw.sprite(TUB_SPRITE, { '#': inZone ? C.good : C.bad }, W * 0.68, H * 0.50, 26, { anchor: 'center' });
    for (var b = 0; b < 3; b++) game.draw.circle(W * 0.68 + (b - 1) * 40, H * 0.40 - (game.time.elapsed * 40 + b * 30) % 120, 8, '#ffffff', 0.3);
  }

  function initGame() {
    temp = 50; pressing = false; outTime = 0; elapsedRound = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onPress(function() {
    if (state === S.PLAYING && !done) { pressing = true; game.audio.play('se_tap', 0.1); }
  });
  game.onRelease(function() {
    if (state === S.PLAYING) { pressing = false; game.audio.play('se_tap', 0.06); }
  });

  // ── ATTRACT ゴースト実演: 帯からはみ出したら押して戻す ──
  var demo = { t: 0, gx: GX, gy: GY0 + 40, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt) temp = 50;
    var lowPhase = cyc > 1.0 && cyc < 3.0;
    demo.press = lowPhase;
    if (demo.press) temp += 34 * dt; else temp -= 10 * dt;
    temp = Math.max(0, Math.min(100, temp));
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (temp === undefined) initGame();
      frameBg();
      stepDemo(dt);
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 52, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      frameBg();
      drawGauge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, ok ? C.good : C.bad);
      txt(outTime.toFixed(1) + 's外', W / 2, H * 0.13, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ outTime: outTime.toFixed(1) });
        else game.end.failure({ outTime: outTime.toFixed(1) });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
      if (pressing) temp += 30 * dt; else temp -= 9 * dt;
      temp += Math.sin(game.time.elapsed * 1.7) * 4 * dt;
      temp = Math.max(0, Math.min(100, temp));
      var inZone = temp >= ZONE_MIN && temp <= ZONE_MAX;
      if (!inZone) {
        outTime += dt;
        if (Math.floor(outTime * 4) > Math.floor((outTime - dt) * 4)) game.feedback.bad(GX, H * 0.5, { text: null });
        if (outTime >= OUT_BUDGET) { ok = false; finished = true; shake = 0.2; game.audio.play('se_bad', 0.4); finish(); }
      }
      if (!finished && elapsedRound >= TOTAL_TIME) { ok = true; finished = true; game.feedback.good(GX, H * 0.5, { text: 'CLEAR', color: C.good }); game.fx.burst(GX, H * 0.5, { color: C.good, count: 16, speed: 340 }); finish(); }
      if (!finished && Math.floor(elapsedRound) > Math.floor(elapsedRound - dt) && Math.floor(elapsedRound) % 4 === 0) game.fx.popup(Math.floor(elapsedRound) + 's', W / 2, H * 0.16, { color: C.gold, size: 42 });
    }
    if (shake > 0) shake -= dt;

    frameBg();
    drawGauge();

    txt(Math.max(0, Math.round(TOTAL_TIME - elapsedRound)) + ' / ' + TOTAL_TIME + 's', W / 2, H * 0.16, 32, C.white);
    game.draw.rect(60, 40, W - 120, 18, C.ink);
    game.draw.rect(60, 40, (W - 120) * Math.max(0, 1 - outTime / OUT_BUDGET), 18, C.good);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.88, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

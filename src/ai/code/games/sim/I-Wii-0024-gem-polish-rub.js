// I-Wii-0024-gem-polish-rub.js
// ジェムポリッシュ・ラブ — 原石を手首だけの小刻みな往復でこすり、熱で割る前に磨き上げる
// 操作: 原石の上で指を小刻みに左右往復させてこする。往復が速すぎると熱で割れる
// 終わり: 磨き度が満タンになれば成功。割れる、または時間切れなら失敗
// @mechanic: rub
// @theme: gem_cutter_workshop
// 世界観: 宝石研磨師の工房で、職人が手首だけの小さな往復で原石をこすり、割らずに磨き上げて輝かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 磨き上げ度%
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット、繊細なグラデーションとハイライト
  var C = {
    bg: '#1c1420', bg2: '#0e0a12', bench: '#3a2c28', benchDark: '#241a18',
    gem: '#3ec8ff', gemShine: '#c8f4ff', heat: '#ff5a3c', good: '#5eff9a', bad: '#ff4d5e',
    gold: '#ffd23f', white: '#f4eef8', ink: '#0a060c',
  };

  var GAME_TITLE = 'GEM POLISH';
  var CX = W * 0.5, CY = H * 0.44;
  var TIME_LIMIT = 10;
  var SHINE_NEEDED = 100;
  var HEAT_MAX = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CUTTER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.68, W, H * 0.3, C.bench);
    game.draw.rect(0, H * 0.68, W, 8, C.benchDark);
    game.draw.sprite(CUTTER, { '#': C.gold }, W * 0.5, H * 0.86, 10, { anchor: 'center' });
  }

  var shine, heat, lastX, pressing, reversals, timeLeft, milestoneShown, done, endWait, finished;
  var ready, hitStop, shake;

  function initGame() {
    shine = 0; heat = 0; lastX = CX; pressing = false; reversals = 0;
    timeLeft = TIME_LIMIT; milestoneShown = false; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; lastDx = 0;
  }
  var lastDx = 0;

  function crack(x, y) {
    ok = false; finished = true; hitStop = 0.4;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.35;
    game.audio.play('se_break', 0.5);
    finish();
  }

  function beginRub(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || hitStop > 0) return;
    pressing = true; lastX = x;
    game.audio.play('se_tap', 0.1);
  }
  function moveRub(x, y) {
    if (!pressing || finished) return;
    var dx = x - lastX;
    if (Math.abs(dx) > 4) {
      if ((dx > 0 && lastDx < 0) || (dx < 0 && lastDx > 0)) {
        reversals++;
        shine = Math.min(SHINE_NEEDED, shine + 6);
        heat = Math.min(HEAT_MAX, heat + 9);
        game.feedback.good(x, y, { text: '', color: C.gemShine, count: 4 });
        game.audio.play('se_tap', 0.06);
        if (!milestoneShown && shine >= SHINE_NEEDED * 0.5) {
          milestoneShown = true;
          game.fx.popup('あと半分!', CX, CY - 160, { color: C.gold, size: 34 });
          game.audio.play('se_milestone', 0.4);
        }
        if (shine >= SHINE_NEEDED) {
          ok = true; finished = true; hitStop = 0.2;
          game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
          game.fx.burst(CX, CY, { color: C.gemShine, count: 20, speed: 340 });
          finish();
        }
      }
      lastDx = dx; lastX = x;
    } else {
      heat = Math.max(0, heat - 4 * game.time.delta);
    }
  }
  function endRub() { pressing = false; }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    beginRub(x, y);
  });
  game.onMove(function(x, y) { if (pressing && Math.random() < 0.15) game.audio.play('se_tap', 0.02); moveRub(x, y); });
  game.onRelease(function(x, y) { if (pressing) game.audio.tone(300, 0.04, { wave: 'sine', volume: 0.04 }); endRub(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.35);
    endWait = 1.3;
  }

  function drawScene() {
    var heatBlink = heat > HEAT_MAX * 0.72 && Math.floor(game.time.elapsed * 9) % 2 === 0;
    game.draw.circle(CX, CY, 130, C.benchDark);
    game.draw.circle(CX, CY, 100, heatBlink ? C.heat : C.gem, 0.9);
    game.draw.circle(CX - 30, CY - 30, 26, C.gemShine, Math.min(0.9, shine / SHINE_NEEDED + 0.15));
    game.draw.circle(CX + 26, CY + 18, 16, C.gemShine, Math.min(0.7, shine / SHINE_NEEDED));
    // heat meter (thumb zone)
    game.draw.rect(W * 0.5 - 200, H * 0.78, 400, 26, C.benchDark);
    game.draw.rect(W * 0.5 - 200, H * 0.78, 400 * (heat / HEAT_MAX), 26, heat > HEAT_MAX * 0.72 ? C.heat : C.gold);
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { shine = 0; heat = 0; }
    var wob = Math.sin(cyc * 14) * 60;
    demo.gx = CX + wob; demo.gy = CY;
    demo.press = true;
    shine = Math.min(SHINE_NEEDED, (cyc / 2.6) * SHINE_NEEDED);
    heat = Math.max(0, 40 + Math.sin(cyc * 14) * 20);
    if (Math.floor(cyc * 14) % 2 === 0 && Math.random() < 0.3) game.audio.play('se_tap', 0.04);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
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
      var pct = Math.round((shine / SHINE_NEEDED) * 100);
      txt(pct + ' / ' + 100, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt(pct >= 80 ? 'あと少し!' : 'MISS', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round((shine / SHINE_NEEDED) * 100);
        if (ok) game.end.success(pct2, { reversals: reversals }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!pressing) heat = Math.max(0, heat - 8 * dt);
      if (heat >= HEAT_MAX) { crack(CX, CY); }
      else if (timeLeft <= 0) { ok = false; finished = true; hitStop = 0.2; game.feedback.bad(CX, CY, { text: 'TIME UP' }); game.audio.play('se_bad', 0.4); finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    var pct3 = Math.round((shine / SHINE_NEEDED) * 100);
    txt(pct3 + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (shine / SHINE_NEEDED), 16, C.gemShine);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

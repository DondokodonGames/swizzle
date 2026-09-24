// D-20092012-0027-tidepool-fluff-scrub.js
// タイドプール・フラフ磨き — 波打ち際の小さな毛玉生き物の背の汚れを、指で素早く往復こすって落とす
// 操作: 生き物の背中の汚れ部分を指で素早く左右に往復させてこすり続ける
// 終わり: 制限時間内に磨きゲージを満タンにすれば成功。時間切れで未達なら失敗
// @mechanic: rub
// @theme: tidepool_fluff_creature
// 世界観: 干潮の岩だまりに住む小さな毛玉生き物。背中についた砂汚れを指でこすり落として機嫌を直してやる
// 残るもの: 正誤(CLEAR/GAME OVER) + 磨けた割合%
// スタイル: 2000s HANDHELD PASTEL
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル基調、白縁の丸い形、上下2分割レイアウト
  var C = {
    bg1: '#bfe8ff', bg2: '#e8fff2', shell: '#ffd8ea', shellEdge: '#ffffff',
    fluff: '#ffb7d1', fluffDark: '#e888ab', dirt: '#a8895a',
    good: '#57e39a', bad: '#ff7d8a', gold: '#ffcf4a', white: '#ffffff', ink: '#3a2a30',
  };

  var GAME_TITLE = 'FLUFF SCRUB';
  var CX = W * 0.5, CY = H * 0.46;
  var TIME_LIMIT = 10.5;
  var TARGET = 100;
  var DECAY = 6; // per second when idle

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var meter, timeLeft, lastX, lastDir, milestoneShown, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREATURE_HAPPY = ['.####.', '######', '#.##.#', '######', '.#..#.'];
  var CREATURE_MEH = ['.####.', '######', '#.##.#', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.55, C.bg2], [1, C.bg1]]);
    for (var i = 0; i < 4; i++) {
      game.draw.circle(120 + i * 280, H * 0.85, 60, C.shellEdge, 0.35);
    }
  }

  function initGame() {
    meter = 0; timeLeft = TIME_LIMIT; lastX = null; lastDir = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawCreature(happy) {
    var wob = Math.sin(game.time.elapsed * 5) * 6;
    game.draw.circle(CX, CY + 190, 150, C.shellEdge, 0.6);
    game.draw.sprite(happy ? CREATURE_HAPPY : CREATURE_MEH, { '#': C.fluff }, CX + wob * 0.2, CY, 34, { anchor: 'center' });
    // dirt patch shrinks as meter increases
    var dirtAlpha = Math.max(0, 1 - meter / TARGET);
    if (dirtAlpha > 0.02) {
      game.draw.circle(CX + 60, CY - 30, 70 * dirtAlpha, C.dirt, 0.65);
    }
  }

  function onRub(x, y) {
    if (ready > 0 || finished || done) return;
    var dx = Math.abs(CX + 60 - x), dy = Math.abs(CY - 30 - y);
    var inZone = dx < 140 && dy < 140;
    if (lastX !== null) {
      var d = x - lastX;
      var dir = d > 6 ? 1 : (d < -6 ? -1 : 0);
      if (dir !== 0 && dir !== lastDir && inZone) {
        meter = Math.min(TARGET + 20, meter + 9);
        game.audio.play('se_tap', 0.08);
        if (Math.random() < 0.4) game.fx.burst(x, y, { color: C.white, count: 3, speed: 80 });
        lastDir = dir;
      } else if (dir !== 0) {
        lastDir = dir;
      }
    }
    lastX = x;
    if (!milestoneShown && meter >= TARGET * 0.5) {
      milestoneShown = true;
      game.fx.popup('NICE', CX, CY - 220, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.4);
    }
    if (meter >= TARGET) {
      ok = true; finished = true;
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good, size: 30 });
      game.fx.burst(CX, CY, { color: C.gold, count: 20, speed: 340 });
      game.audio.play('se_success', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { lastX = x; lastDir = 0; game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.01); onRub(x, y); } });
  game.onRelease(function() { lastX = null; game.audio.play('se_tap', 0.03); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.2;
  }

  var demo = { t: 0, gx: CX - 60, gy: CY - 30, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { meter = 0; milestoneShown = false; }
    demo.press = cyc < 2.4;
    if (demo.press) {
      var wob2 = Math.sin(demo.t * 16) * 90;
      demo.gx = CX + 60 + wob2;
      meter = Math.min(TARGET, (cyc / 2.4) * TARGET);
      if (Math.floor(demo.t * 8) % 2 === 0) game.audio.play('se_tap', 0.03);
    } else {
      demo.gx = CX + 60;
    }
    demo.gy = CY - 30;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (meter === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCreature(meter > TARGET * 0.6);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCreature(ok);
      var pct = Math.round(Math.min(100, meter));
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round(Math.min(100, meter));
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      meter = Math.max(0, meter - DECAY * dt);
      timeLeft -= dt;
      if (timeLeft <= 2 && Math.floor(game.time.elapsed * 8) % 2 === 0) shake = 0.02;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCreature(meter > TARGET * 0.6);

    txt(Math.round(Math.min(100, meter)) + '%', W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 20, C.white, 0.6);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, meter / TARGET), 20, C.good);
    game.draw.rect(60, 190, W - 120, 10, C.white, 0.5);
    game.draw.rect(60, 190, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 10, timeLeft < 2.5 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.3], ['E5', 0.3], ['C5', 0.3], ['G4', 0.3]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

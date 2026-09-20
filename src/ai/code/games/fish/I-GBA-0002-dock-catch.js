// I-GBA-0002-dock-catch.js
// ドックキャッチ — 桟橋の魚屋が、放られてくる魚を地面に落とす前に受け止める
// 操作: 落下してくる魚が受け皿の高さに来た瞬間にタップしてつかむ
// 終わり: 規定数(4尾)を全てキャッチできれば成功。1尾でも地面に落とせば失敗
// @mechanic: timing_one_shot
// @theme: dockside_fish_catch
// 世界観: 早朝の魚市場の桟橋。威勢のいい魚屋が、船から放り投げられる魚を受け皿で連続キャッチする実演
// 残るもの: 正誤(CLEAR/GAME OVER) + キャッチした尾数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 4階調の黄緑寄りモノクロ、残像感、画面枠
  var C = {
    bg: '#0f380f', bg2: '#1a4d1a', mid: '#4a7a2a', light: '#8bac0f', lightest: '#c9ecc9',
    good: '#c9ecc9', bad: '#4a7a2a', gold: '#8bac0f', white: '#c9ecc9', ink: '#0f380f',
  };

  var GAME_TITLE = 'DOCK CATCH';
  var TOTAL = 4;
  var CX = W * 0.5;
  var CATCH_Y = H * 0.68;
  var GROUND_Y = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, dropped, done, endWait, finished;
  var ready, hitStop, shake, round, fish, bounce;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MONGER = ['.####.', '######', '.####.', '##..##'];
  var MONGER2 = ['.####.', '######', '.####.', '#.##.#'];
  var FISH = ['>#>'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 3, '#00000022');
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.mid, 0.5);
    for (var p = 0; p < 5; p++) game.draw.line(p * W / 4, GROUND_Y, p * W / 4, H, C.bg, 4);
    // 画面枠(携帯モノクロ)
    game.draw.rect(0, 0, W, 14, C.ink);
    game.draw.rect(0, H - 14, W, 14, C.ink);
  }

  function newFish(spd) {
    return { x: CX + game.random(-160, 160), y: H * 0.14, spd: spd, telegraphed: false, resolved: false };
  }

  function initGame() {
    caught = 0; dropped = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; bounce = 0;
    fish = newFish(560);
  }

  function drawScene(pinch) {
    game.draw.circle(CX, CATCH_Y + 26, 70, C.light, 0.35);
    game.draw.sprite(pinch ? MONGER2 : MONGER, { '#': C.lightest }, CX, GROUND_Y - 40, 20, { anchor: 'center' });
  }

  function drawFish(f) {
    if (!f) return;
    var falling = f.y < CATCH_Y;
    if (falling && CATCH_Y - f.y < 220) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(f.x, CATCH_Y, 64, C.gold, 0.18);
    }
    game.draw.sprite(FISH, { '#': C.lightest, '>': C.lightest }, f.x, f.y, 18, { anchor: 'center' });
  }

  function resolveCatch(x, y) {
    if (!fish || fish.resolved || ready > 0 || done || finished) return;
    var dist = Math.abs(fish.y - CATCH_Y) + Math.abs(fish.x - CX) * 0.3;
    var success = dist < 90;
    fish.resolved = true;
    hitStop = success ? 0.1 : 0.3;
    bounce = 0.15;
    if (success) {
      caught++;
      game.feedback.good(fish.x, CATCH_Y, { text: 'CATCH', color: C.good });
      game.fx.burst(fish.x, CATCH_Y, { color: C.gold, count: 12, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) game.fx.popup('あと' + (TOTAL - caught) + '!', CX, H * 0.3, { color: C.gold, size: 36 });
    } else {
      dropped++;
      game.feedback.bad(fish.x, CATCH_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    round++;
    if (!success) { ok = false; finished = true; finish(); return; }
    if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
    fish = newFish(560 + round * 60);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); resolveCatch(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CATCH_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { fish = newFish(600); }
    if (fish) {
      fish.y += 600 * dt;
      demo.gx = fish.x; demo.gy = Math.min(fish.y, CATCH_Y + 60);
      if (fish.y >= CATCH_Y - 6 && fish.y <= CATCH_Y + 40 && !fish.telegraphed) {
        fish.telegraphed = true;
        demo.press = true;
        game.feedback.good(fish.x, CATCH_Y, { text: 'CATCH', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      if (fish.y > GROUND_Y) { fish = null; demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(demo.press);
      drawFish(fish);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '尾!', W / 2, H * 0.18, 26, C.white);
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
      fish.y += fish.spd * dt;
      if (fish.y > GROUND_Y && !fish.resolved) {
        fish.resolved = true;
        hitStop = 0.3;
        game.feedback.bad(fish.x, GROUND_Y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        dropped++; ok = false; finished = true; finish();
      }
    }
    if (bounce > 0) bounce -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawScene(bounce > 0);
    if (!finished) drawFish(fish);

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['E4', 0.4], ['G4', 0.4], ['C5', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// K-DS-0029-honey-drizzle-timing.js
// ハニーグレイズ台 — レールを流れる焼き菓子に、目の前を通り過ぎる一瞬だけ蜜をかける
// 操作: 焼き菓子がノズルの真下(光る帯)に来た瞬間にタップして蜜をかける
// 終わり: 規定個数(6個)全てに正しく蜜をかければ成功。1個でも外せば失敗
// @mechanic: timing_window
// @theme: honey_glaze_stand
// 世界観: 小さな菓子工房のグレイズ台。レールで流れてくる焼き菓子に、ノズル直下を通る一瞬だけ蜜をかける係の仕事
// 残るもの: 正誤(CLEAR/GAME OVER) + 蜜がけに成功した個数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目テーブル + 艶のある焼き菓子、honey amber のツヤ
  var C = {
    bg: '#3a2414', bg2: '#241408', wood: '#5a3a20', woodLine: '#6e4a2a',
    bun: '#e8b878', bunEdge: '#c8944a', bunShine: '#fff2d0',
    honey: '#ffb020', honeyDark: '#c47800', zone: '#ffd77a',
    good: '#7dff8a', bad: '#ff4d5e', gold: '#ffe066', white: '#fff8ec', ink: '#1a0e06',
  };

  var GAME_TITLE = 'HONEY GLAZE';
  var TOTAL = 6;
  var RAIL_Y = H * 0.5;
  var ZONE_X = W * 0.5;
  var ZONE_HALF = 100;
  var NOZZLE_X = W * 0.5, NOZZLE_Y = H * 0.34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, ready, hitStop, shake;
  var hits, round, item, spurt;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUN_SPRITE = ['.####.', '######', '#.##.#', '######'];
  var NOZZLE_SPRITE = ['.##.', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10) + 40, W, i * (H / 10) + 40, C.woodLine, 3);
    // rail
    game.draw.rect(0, RAIL_Y + 60, W, 18, '#1a0e06', 0.6);
    game.draw.rect(0, RAIL_Y + 60, W, 10, C.woodLine, 0.5);
  }

  function newItem(speedMul) {
    var dir = round % 2 === 0 ? 1 : -1; // 交互に左右から流れてくる(慣れさせない)
    var startX = dir < 0 ? W + 90 : -90;
    return { x: startX, dir: dir, speed: (dir < 0 ? -1 : 1) * (520 * speedMul), glazed: false, resolved: false };
  }

  function initGame() {
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    hits = 0; round = 0; spurt = 0;
    item = newItem(1);
  }

  function inZone(x) { return Math.abs(x - ZONE_X) <= ZONE_HALF; }

  function tryDrizzle() {
    if (!item || item.resolved || ready > 0 || done || finished) return;
    if (inZone(item.x)) {
      item.resolved = true; item.glazed = true;
      hits++;
      spurt = 0.25;
      hitStop = 0.08;
      game.feedback.good(item.x, RAIL_Y, { text: 'GOOD', color: C.gold });
      game.fx.burst(item.x, RAIL_Y, { color: C.honey, count: 14, speed: 260 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 38 });
      round++;
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      item = newItem(1 + round * 0.06);
    } else {
      item.resolved = true;
      hitStop = 0.3;
      game.feedback.bad(item.x, RAIL_Y, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); tryDrizzle(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepItem(it, dt) {
    if (!it) return;
    it.x += it.speed * dt;
    if (!it.resolved && ((it.dir < 0 && it.x < ZONE_X - ZONE_HALF - 40) || (it.dir > 0 && it.x > ZONE_X + ZONE_HALF + 40))) {
      // ゾーンを過ぎても素通り(未タップ) -> 失敗
      it.resolved = true;
      hitStop = 0.3;
      game.feedback.bad(it.x, RAIL_Y, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawItem(it) {
    if (!it) return;
    var glow = inZone(it.x) && !it.resolved;
    if (glow) game.draw.circle(it.x, RAIL_Y, 92, C.zone, 0.28);
    game.draw.sprite(BUN_SPRITE, { '#': it.glazed ? C.honeyDark : C.bun }, it.x, RAIL_Y, 20, { anchor: 'center' });
    game.draw.circle(it.x - 14, RAIL_Y - 20, 6, C.bunShine, 0.7);
    if (it.glazed) game.draw.line(it.x - 34, RAIL_Y - 10, it.x + 34, RAIL_Y + 6, C.honey, 6);
  }

  function drawNozzle() {
    game.draw.sprite(NOZZLE_SPRITE, { '#': C.honeyDark }, NOZZLE_X, NOZZLE_Y, 14, { anchor: 'center' });
    if (spurt > 0) game.draw.line(NOZZLE_X, NOZZLE_Y + 30, NOZZLE_X, RAIL_Y - 30, C.honey, 8);
    // 常時: ゾーンの帯を薄く表示
    game.draw.rect(ZONE_X - ZONE_HALF, RAIL_Y - 100, ZONE_HALF * 2, 200, C.zone, 0.10);
  }

  var demo = { t: 0, gx: ZONE_X, gy: H * 0.78, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      round = 0; hits = 0;
      item = newItem(1);
      item.x = item.dir < 0 ? W + 90 : -90;
    }
    if (item) {
      item.x += item.speed * dt * 0.62;
      if (!item.resolved && inZone(item.x)) {
        item.resolved = true; item.glazed = true; hits++;
        spurt = 0.25;
        demo.gx = item.x; demo.gy = RAIL_Y - 110; demo.press = true;
        game.feedback.good(item.x, RAIL_Y, { text: 'GOOD', color: C.gold });
        game.audio.play('se_good', 0.22);
      }
      if (!item.resolved && ((item.dir < 0 && item.x < -100) || (item.dir > 0 && item.x > W + 100))) {
        item.resolved = true;
      }
      if (item.resolved && ((item.dir < 0 && item.x < -100) || (item.dir > 0 && item.x > W + 100))) {
        round++;
        item = newItem(1);
        demo.press = false;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (spurt > 0) spurt -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawNozzle();
      drawItem(item);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.10, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawNozzle();
      drawItem(item);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.15, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '個!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepItem(item, dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawNozzle();
    if (!finished) drawItem(item);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

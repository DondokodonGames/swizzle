// K-DS-0045-batter-line-timing.js
// バッターラインタイミング — 流れてくる具材が衣ゾーンを通る間にタップして衣をつける
// 操作: ベルトで流れる具材が中央の衣ゾーンに重なっている間にタップする
// 終わり: 規定個数(8個)のうち規定数以上に衣をつければ成功。3個逃せば失敗
// @mechanic: timing_window
// @theme: kitchen_coating_line
// 世界観: 厨房の下ごしらえライン。ベルトを流れる具材に、衣ゾーンを通過する一瞬だけ衣をまとわせる係
// 残るもの: 正誤(CLEAR/GAME OVER) + 衣をつけた個数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目/フェルト質感、上明下暗グラデのボタン、白ハイライトで厚みを出す
  var C = {
    bg1: '#5a3a24', bg2: '#3a2414', belt: '#2a1c10', beltLine: '#7a5636',
    zoneOn: '#ffe082', zoneOff: '#c8a468', zoneEdge: '#8a6a3a',
    food: '#e8a25a', foodDone: '#c8863a', crumb: '#fff3d0',
    good: '#5ad16a', bad: '#ff5a5a', gold: '#ffcc33', white: '#fff8ec', ink: '#2a1a0a',
  };

  var GAME_TITLE = 'BATTER LINE';
  var TOTAL = 8;
  var NEEDED = 5;
  var MISS_LIMIT = 3;
  var BELT_Y = H * 0.5;
  var ZONE_X = W * 0.5, ZONE_HALF = 110;
  var SPAWN_X = W + 90, END_X = -90;
  var SPEED0 = 640; // px/s

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FOOD_S = ['.####.', '######', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10) + 4, W, 3, '#00000015');
    game.draw.rect(0, BELT_Y - 90, W, 180, C.belt);
    game.draw.rect(0, BELT_Y - 90, W, 8, C.beltLine, 0.6);
    game.draw.rect(0, BELT_Y + 82, W, 8, C.beltLine, 0.6);
  }

  var items, spawned, coated, missed, done, endWait, finished;
  var ready, hitStop, shake, spawnT, spawnGap, judgeFlash, judgeFlashT;

  function speedFor(n) { return SPEED0 + n * 26; }
  function gapFor(n) { return Math.max(0.78, 1.15 - n * 0.045); }

  function initGame() {
    items = []; spawned = 0; coated = 0; missed = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; spawnT = 0.4; spawnGap = gapFor(0);
    judgeFlash = ''; judgeFlashT = 0;
  }

  function inZone(item) { return Math.abs(item.x - ZONE_X) <= ZONE_HALF; }

  function flashJudge(str, color) { judgeFlash = str; judgeFlashT = 0.5; }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var hitI = -1, bestDist = 1e9;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.coated) continue;
      var d = Math.abs(it.x - ZONE_X);
      if (d <= ZONE_HALF && d < bestDist) { bestDist = d; hitI = i; }
    }
    if (hitI >= 0) {
      var it2 = items[hitI];
      it2.coated = true; coated++;
      hitStop = 0.08;
      game.feedback.good(it2.x, BELT_Y, { text: bestDist < ZONE_HALF * 0.45 ? 'PERFECT' : 'GOOD', color: C.gold });
      game.fx.burst(it2.x, BELT_Y, { color: C.crumb, count: 14, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (coated === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', ZONE_X, BELT_Y - 220, { color: C.gold, size: 40 });
      if (coated >= NEEDED && spawned >= TOTAL && itemsResolved()) { ok = true; finished = true; finish(); }
    } else {
      game.audio.play('se_tap', 0.15);
    }
  });

  function itemsResolved() {
    for (var i = 0; i < items.length; i++) if (!items[i].coated && !items[i].gone) return false;
    return true;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawZone(nowGlow) {
    game.draw.rect(ZONE_X - ZONE_HALF, BELT_Y - 130, ZONE_HALF * 2, 260, nowGlow ? C.zoneOn : C.zoneOff, nowGlow ? 0.55 : 0.3);
    game.draw.rect(ZONE_X - ZONE_HALF, BELT_Y - 130, 6, 260, C.zoneEdge);
    game.draw.rect(ZONE_X + ZONE_HALF - 6, BELT_Y - 130, 6, 260, C.zoneEdge);
  }

  function drawItems(list) {
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.gone) continue;
      var col = it.coated ? C.foodDone : C.food;
      game.draw.circle(it.x, BELT_Y + 60, 26, '#00000030');
      game.draw.sprite(FOOD_S, { '#': col }, it.x, BELT_Y, 15, { anchor: 'center' });
      if (it.coated) game.draw.circle(it.x, BELT_Y, 34, C.crumb, 0.35);
    }
  }

  var demo = { t: 0, gx: ZONE_X, gy: BELT_Y + 470, press: false, items: [], spawnT: 0.4 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { demo.items = []; demo.spawnT = 0.5; }
    demo.spawnT -= dt;
    if (demo.spawnT <= 0 && demo.items.length < 3) {
      demo.items.push({ x: SPAWN_X, coated: false, gone: false });
      demo.spawnT = 1.0;
    }
    demo.press = false;
    for (var i = 0; i < demo.items.length; i++) {
      var it = demo.items[i];
      it.x -= 560 * dt;
      if (!it.coated && Math.abs(it.x - ZONE_X) < 14) {
        it.coated = true;
        demo.press = true;
        demo.gx = it.x;
        game.feedback.good(it.x, BELT_Y, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.25 });
        game.fx.burst(it.x, BELT_Y, { color: C.crumb, count: 10, speed: 220 });
      }
      if (it.x < END_X) it.gone = true;
    }
    items = demo.items;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      bg();
      drawZone(true);
      stepDemo(dt);
      drawItems(items);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      drawZone(false);
      drawItems(items || []);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(coated + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - coated) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(coated, { coated: coated, total: TOTAL, missed: missed });
        else game.end.failure({ coated: coated, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnT -= dt;
      if (spawnT <= 0 && spawned < TOTAL) {
        items.push({ x: SPAWN_X, coated: false, gone: false, id: spawned });
        spawned++;
        spawnT = gapFor(spawned);
      }
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.gone) continue;
        it.x -= speedFor(spawned) * dt;
        if (it.x < END_X) {
          it.gone = true;
          if (!it.coated) {
            missed++;
            hitStop = 0.28;
            game.feedback.bad(END_X + 90, BELT_Y, { text: 'MISS' });
            shake = 0.2;
            game.audio.play('se_bad', 0.4);
            if (missed >= MISS_LIMIT) { ok = false; finished = true; finish(); }
          }
        }
      }
      if (!finished && spawned >= TOTAL && itemsResolved()) {
        ok = coated >= NEEDED;
        finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZone(!finished);
    if (!finished) drawItems(items);

    txt(coated + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (coated / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 90 - m * 44, 120, 14, m < missed ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.38, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.5], ['C4', 0.5], ['E4', 0.5], ['G4', 1]], { tempo: 122, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

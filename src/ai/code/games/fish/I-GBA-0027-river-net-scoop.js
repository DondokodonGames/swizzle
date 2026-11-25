// I-GBA-0027-river-net-scoop.js
// リバーネットスクープ — 指に付いてくる手網で、流れてくる魚を器からこぼさずすくい取る
// 操作: 指を動かすと手網が付いてくる。流れてくる魚の下に網を差し入れてすくう
// 終わり: 規定数(7匹)すくえれば成功。魚を3匹取りこぼせば失敗
// @mechanic: drag_follow
// @theme: river_net_fisherman
// 世界観: 浅瀬に立つ川漁師が、指に付いてくる手網を流れに差し入れ、次々流れてくる魚を一匹もこぼさずすくい続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + すくえた匹数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステルブルー・グリーン、丸みのあるUI
  var C = {
    bg: '#bfe8e0', bg2: '#9fd4c8', river: '#7fcbe0', riverDark: '#5aa8c2',
    net: '#e8c88a', netDark: '#b89a5a', fish: '#ff9a7a', fishDark: '#e0684a',
    good: '#4fcf7a', bad: '#ff5a5a', gold: '#ffcf4d', white: '#ffffff', ink: '#0e2a24',
  };

  var GAME_TITLE = 'NET SCOOP';
  var GOAL = 7, MISS_LIMIT = 3;
  var RIVER_Y0 = H * 0.18, RIVER_Y1 = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var netX, netY, fishes, caught, missed, spawnT, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISHER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, RIVER_Y0, W, RIVER_Y1 - RIVER_Y0, C.river);
    game.draw.rect(0, RIVER_Y0, W, 8, C.riverDark);
    game.draw.rect(0, RIVER_Y1, W, 8, C.riverDark);
  }

  function newFish() {
    var dir = Math.random() < 0.5 ? -1 : 1;
    return {
      x: dir < 0 ? -60 : W + 60, y: game.random(RIVER_Y0 + 60, RIVER_Y1 - 60),
      vx: dir * game.random(240, 340), resolved: false,
    };
  }

  function initGame() {
    netX = W * 0.5; netY = RIVER_Y0 + 100; fishes = []; caught = 0; missed = 0; spawnT = 0.5;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    netX = x; netY = Math.max(RIVER_Y0 + 30, Math.min(RIVER_Y1 - 30, y));
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    netX = x; netY = Math.max(RIVER_Y0 + 30, Math.min(RIVER_Y1 - 30, y));
    game.audio.play('se_tap', 0.08);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFishes() {
    for (var i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      game.draw.circle(f.x, f.y, 22, C.fishDark);
      game.draw.circle(f.x + (f.vx > 0 ? -8 : 8), f.y, 14, C.fish);
    }
  }

  function drawNet(x, y) {
    game.draw.circle(x, y, 40, C.netDark);
    game.draw.circle(x, y, 30, C.net, 0.8);
    game.draw.line(x, y, x, y + 90, C.netDark, 10);
  }

  var demo = { t: 0, gx: W * 0.5, gy: RIVER_Y0 + 100, press: false, fishes: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) {
      demo.fishes = [
        { x: -60, y: RIVER_Y0 + 100, vx: 280, spawn: 0.3 },
        { x: W + 60, y: RIVER_Y0 + 220, vx: -260, spawn: 1.5 },
        { x: -60, y: RIVER_Y0 + 160, vx: 300, spawn: 2.8 },
      ];
    }
    fishes = [];
    for (var i = 0; i < demo.fishes.length; i++) {
      var d = demo.fishes[i];
      var age = cyc - d.spawn;
      if (age < 0) continue;
      var x = d.x + d.vx * age;
      if (Math.abs(x - (d.vx > 0 ? W * 0.5 : W * 0.5)) > 0 && !d._got) {
        fishes.push({ x: x, y: d.y, vx: d.vx });
      }
      var reach = d.vx > 0 ? x > W * 0.5 - 20 : x < W * 0.5 + 20;
      if (!d._got && Math.abs(x - W * 0.5) < 50) {
        d._got = true;
        netX = x; netY = d.y; demo.gx = x; demo.gy = d.y; demo.press = true;
        game.feedback.good(x, d.y, { text: 'NICE', color: C.good, size: 24 });
        game.audio.play('se_coin', 0.3);
      }
      if (d._got) { fishes.pop(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFishes();
      drawNet(netX, netY);
      game.draw.sprite(FISHER, { '#': C.gold }, W * 0.5, RIVER_Y1 + 80, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy - 40, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.riverDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(FISHER, { '#': ok ? C.gold : C.bad }, W * 0.5, RIVER_Y1 + 80, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + GOAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, GOAL - caught) + '匹!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, missed: missed });
        else game.end.failure({ caught: caught, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnT -= dt;
      if (spawnT <= 0) { fishes.push(newFish()); spawnT = Math.max(0.45, 0.95 - caught * 0.03); }
      for (var i = fishes.length - 1; i >= 0; i--) {
        var f = fishes[i];
        f.x += f.vx * dt;
        if (!f.resolved && Math.hypot(f.x - netX, f.y - netY) < 46) {
          f.resolved = true;
          caught++;
          hitStop = 0.06;
          game.feedback.good(netX, netY, { text: 'NICE', color: C.good, size: 26 });
          game.audio.play('se_coin', 0.4);
          fishes.splice(i, 1);
          if (!milestoneShown && caught === Math.ceil(GOAL / 2)) {
            milestoneShown = true;
            game.fx.popup('HALFWAY!', W / 2, H * 0.25, { color: C.gold, size: 38 });
            game.audio.play('se_milestone', 0.4);
          }
          if (caught >= GOAL) { ok = true; finished = true; finish(); }
          continue;
        }
        if (!f.resolved && (f.x < -100 || f.x > W + 100)) {
          f.resolved = true;
          missed++;
          game.feedback.bad(f.x < 0 ? 40 : W - 40, f.y, {});
          game.audio.play('se_bad', 0.3);
          fishes.splice(i, 1);
          if (missed >= MISS_LIMIT) {
            ok = false; finished = true;
            hitStop = 0.3; shake = 0.25;
            game.feedback.bad(W / 2, H * 0.4, { text: 'MISS' });
            game.audio.play('se_bad', 0.4);
            finish();
          }
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFishes();
    drawNet(netX, netY);
    game.draw.sprite(FISHER, { '#': C.gold }, W * 0.5, RIVER_Y1 + 80, 22, { anchor: 'center' });

    txt(caught + ' / ' + GOAL, W / 2, H * 0.06, 30, C.ink);
    txt('MISS ' + missed + '/' + MISS_LIMIT, W / 2, H * 0.10, 22, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.6]], { tempo: 126, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

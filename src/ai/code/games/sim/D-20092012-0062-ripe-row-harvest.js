// D-20092012-0062-ripe-row-harvest.js
// ライプロウ・ハーヴェスト — 畝に並ぶ作物の中から今まさに熟れた1つを瞬時に見つけて摘み取る
// 操作: 畝に並ぶ作物のうち、光って熟れた1つだけをタップ。他の未熟な作物を押すと減点
// 終わり: 規定数(6個)を摘めば成功。3回間違えるか熟れた実を見逃せば失敗
// @mechanic: spot
// @theme: rival_garden_row
// 世界観: 隣の畑と競う小さな菜園の主。畝に並ぶ作物は一瞬だけ熟れて輝く。その刹那を見つけて摘まないと、隣人にひょいと持っていかれる
// 残るもの: 正誤(CLEAR/GAME OVER) + 収穫数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、太く単純な形、日焼けした液晶の色味
  var C = {
    bg: '#9cae7a', bg2: '#7c9460', soil: '#8a7050', soilDark: '#6a563c',
    crop: '#c8a840', cropRipe: '#e6c840', cropGlow: '#fff0a0',
    good: '#6a9a4a', bad: '#b0503c', gold: '#e6c840', white: '#f0ecd8', ink: '#2a2418',
  };

  var GAME_TITLE = 'RIPE ROW';
  var TOTAL = 6;
  var COLS = 3, ROWS = 2;
  var GX0 = W * 0.18, GY0 = H * 0.36, CW = (W * 0.64) / COLS, CH = H * 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var slots, harvested, misses, roundT, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CROP = ['.##.', '####', '.##.'];
  var FARMER = ['.##.', '####', '.##.', '.##.'];

  function slotPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GX0 + CW * (c + 0.5), y: GY0 + CH * (r + 0.5) * 2.2 };
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var r = 0; r < ROWS; r++) {
      game.draw.rect(GX0 - 40, GY0 + r * CH * 2.2 - 30, W * 0.64 + 80, 60, C.soilDark);
    }
    game.draw.sprite(FARMER, { '#': C.ink }, W * 0.82, H * 0.62 + Math.sin(game.time.elapsed * 1.5) * 6, 18, { anchor: 'center' });
  }

  function drawSlots(list) {
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var p = slotPos(i);
      if (s.picked) continue;
      var pulse = s.ripe ? (0.7 + 0.3 * Math.sin(game.time.elapsed * 10)) : 1;
      var col = s.ripe ? C.cropRipe : C.crop;
      if (s.ripe) game.draw.circle(p.x, p.y, 46 * pulse, C.cropGlow, 0.35);
      game.draw.sprite(CROP, { '#': col }, p.x, p.y, 16, { anchor: 'center' });
    }
  }

  function newSlots() {
    var list = [];
    for (var i = 0; i < COLS * ROWS; i++) list.push({ ripe: false, t: game.random(0.4, 1.6), picked: false });
    return list;
  }

  function initGame() {
    slots = newSlots(); harvested = 0; misses = 0; roundT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function tapSlot(x, y) {
    if (ready > 0 || finished) return;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i]; if (s.picked) continue;
      var p = slotPos(i);
      if (Math.abs(x - p.x) < CW * 0.42 && Math.abs(y - p.y) < CH * 0.9) {
        if (s.ripe) {
          s.picked = true; harvested++;
          game.feedback.good(p.x, p.y, { text: 'NICE', color: C.good });
          game.fx.burst(p.x, p.y, { color: C.gold, count: 12, speed: 300 });
          game.audio.play('se_coin', 0.4);
          if (!milestoneShown && harvested >= Math.ceil(TOTAL / 2)) {
            milestoneShown = true;
            game.fx.popup('HALFWAY!', W * 0.5, H * 0.22, { color: C.gold, size: 36 });
            game.audio.play('se_milestone', 0.4);
          }
          if (harvested >= TOTAL) { ok = true; finished = true; hitStop = 0.2; finish(); }
          else { s.ripe = false; s.t = game.random(0.7, 1.7); s.picked = false; slots[i] = { ripe: false, t: game.random(0.7, 1.7), picked: false }; }
        } else {
          misses++;
          game.feedback.bad(p.x, p.y, { text: 'MISS' });
          shake = 0.15;
          game.audio.play('se_bad', 0.35);
          if (misses >= 3) { ok = false; finished = true; hitStop = 0.3; finish(); }
        }
        return;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tapSlot(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickSlots(dt) {
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i]; if (s.picked) continue;
      s.t -= dt;
      if (s.t <= 0) {
        if (s.ripe) {
          // 見逃し = 隣人に持っていかれる
          s.picked = true;
          ok = false; finished = true; hitStop = 0.3;
          var p = slotPos(i);
          game.feedback.bad(p.x, p.y, { text: 'MISS' });
          shake = 0.25;
          game.audio.play('se_bad', 0.4);
          finish();
          return;
        } else {
          s.ripe = true; s.t = 0.85;
        }
      }
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      slots = newSlots();
      demo.idx = 1;
      slots[demo.idx].ripe = false; slots[demo.idx].t = 0.6;
      var p = slotPos(demo.idx);
      demo.gx = p.x; demo.gy = p.y; demo.press = false;
    }
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (i === demo.idx) {
        s.t -= dt;
        if (s.t <= 0 && !s.ripe) { s.ripe = true; s.t = 0.85; }
      }
    }
    if (slots[demo.idx].ripe && !demo.press && cyc > 0.6) {
      demo.press = true;
      var p2 = slotPos(demo.idx);
      slots[demo.idx].picked = true;
      game.feedback.good(p2.x, p2.y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (slots === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSlots(slots);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.145, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSlots(slots);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      txt(harvested + ' / ' + TOTAL, W / 2, H * 0.145, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - harvested) + '個!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(harvested, { harvested: harvested, misses: misses });
        else game.end.failure({ harvested: harvested, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickSlots(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawSlots(slots);

    txt(harvested + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 170, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 170, (W - 120) * (harvested / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.6]], { tempo: 124, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20132016-0038-timber-side-chop.js
// サイドチョップ木こり — 幹の枝を避け、左右交互にタップして切り倒す
// 操作: 枝が出ていない側の画面下部(左/右)をタップして斧を振る
// 終わり: 規定回数(8回)切れば成功。枝のある側を切れば失敗
// @mechanic: alternate_tap
// @theme: lumber_camp_trunk
// 世界観: 山奥の伐採小屋。木こりが一本の丸太を根元から交互に斧で刻み、枝に当てずに切り倒す競技
// 残るもの: 正誤(CLEAR/GAME OVER) + 切った段数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 限定パレット、太いピクセルブロック、市松の地面
  var C = {
    bg: '#2a4a3a', bg2: '#1a3226', trunk: '#8a5a34', trunkDark: '#5c3a20',
    branch: '#3a6a2a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400',
    white: '#f4f0e0', ink: '#0a0806', skin: '#e8b888', shirt: '#c04030',
  };

  var GAME_TITLE = 'SIDE CHOP';
  var TOTAL = 8;
  var TRUNK_CX = W * 0.5;
  var TRUNK_HALF = 130;
  var LEVEL_H = 150;
  var BASE_Y = H * 0.66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var chops, done, endWait, finished;
  var ready, hitStop, shake;
  var levels, scrollOff, chopSide, chopFlash, fallSide;
  var seedN = 1;
  function prng() { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return (seedN % 1000) / 1000; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LUMBER_L = ['.####.', '##%%##', '.####.', '..##..', '.####.'];
  var LUMBER_R = ['.####.', '##%%##', '.####.', '..##..', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.rect(0, H * 0.15 + i * (H * 0.7 / 6), W, 3, '#ffffff08');
    }
    game.draw.rect(0, BASE_Y + 40, W, H - (BASE_Y + 40), '#14261c');
    for (var g = 0; g < 10; g++) {
      var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3 + g);
      game.draw.rect(g * (W / 10), BASE_Y + 40, W / 10, 6, '#ffffff', 0.04 + pulse * 0.3);
    }
  }

  function newLevel(idx) {
    var side = idx === 0 ? 'none' : (prng() < 0.5 ? 'L' : 'R');
    if (idx > 0 && prng() < 0.12) side = 'none';
    return { side: side, y: BASE_Y - idx * LEVEL_H };
  }

  function initGame() {
    chops = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    scrollOff = 0; chopSide = 0; chopFlash = 0; fallSide = 0;
    levels = [];
    for (var i = 0; i < 6; i++) levels.push(newLevel(i));
  }

  function drawTrunkLevel(lv, sway) {
    var y = lv.y + scrollOff;
    if (y < -LEVEL_H || y > H + LEVEL_H) return;
    var sx = TRUNK_CX + sway;
    game.draw.rect(sx - TRUNK_HALF, y - LEVEL_H / 2, TRUNK_HALF * 2, LEVEL_H, C.trunkDark);
    game.draw.rect(sx - TRUNK_HALF + 10, y - LEVEL_H / 2, TRUNK_HALF * 2 - 20, LEVEL_H, C.trunk);
    for (var r = 0; r < 3; r++) {
      game.draw.line(sx - TRUNK_HALF + 14, y - LEVEL_H / 2 + 18 + r * 40, sx + TRUNK_HALF - 14, y - LEVEL_H / 2 + 18 + r * 40, '#00000022', 3);
    }
    if (lv.side === 'L') {
      game.draw.rect(sx - TRUNK_HALF - 90, y - 20, 90, 40, C.branch);
      game.draw.circle(sx - TRUNK_HALF - 90, y, 28, C.branch);
    } else if (lv.side === 'R') {
      game.draw.rect(sx + TRUNK_HALF, y - 20, 90, 40, C.branch);
      game.draw.circle(sx + TRUNK_HALF + 90, y, 28, C.branch);
    }
  }

  function drawLumberjack(side, chopping) {
    var px = side === 'R' ? TRUNK_CX + TRUNK_HALF + 130 : TRUNK_CX - TRUNK_HALF - 130;
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    game.draw.sprite(side === 'R' ? LUMBER_R : LUMBER_L, { '#': C.shirt, '%': C.skin }, px, BASE_Y - 60 + bob + (chopping ? -14 : 0), 20, { anchor: 'center', flipX: side === 'R' });
    game.draw.line(px + (side === 'R' ? -40 : 40), BASE_Y - 60 + (chopping ? -60 : -20), px + (side === 'R' ? -90 : 90), BASE_Y - 60 + (chopping ? 10 : -40), C.ink, 10);
  }

  function resolveChop(side) {
    if (ready > 0 || done || finished) return;
    var cur = levels[0];
    game.audio.play('se_tap', 0.15);
    chopSide = side === 'L' ? -1 : 1;
    chopFlash = 0.12;
    if (cur.side !== 'none' && cur.side === side) {
      finished = true; ok = false; fallSide = side;
      hitStop = 0.35;
      game.feedback.bad(TRUNK_CX, cur.y + scrollOff, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    chops++;
    game.feedback.good(TRUNK_CX, cur.y + scrollOff, { text: 'CHOP', color: C.good, count: 8 });
    game.audio.play('se_good', 0.35);
    if (chops === Math.floor(TOTAL / 2)) game.fx.popup('HALFWAY!', TRUNK_CX, H * 0.3, { color: C.gold, size: 40 });
    levels.shift();
    levels.push(newLevel(chops + 5));
    if (chops >= TOTAL) { ok = true; finished = true; finish(); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveChop(x < W * 0.5 ? 'L' : 'R');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.28, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.5;
    if (cyc < dt || demo.t <= dt) {
      chops = 0; levels = [];
      for (var i = 0; i < 6; i++) levels.push(newLevel(i));
    }
    var phase = cyc / 1.5;
    var cur = levels[0];
    var safeSide = cur.side === 'L' ? 'R' : (cur.side === 'R' ? 'L' : (chops % 2 === 0 ? 'L' : 'R'));
    demo.gx = safeSide === 'L' ? W * 0.28 : W * 0.72;
    demo.gy = H * 0.85;
    if (phase > 0.5 && phase < 0.62) {
      demo.press = true;
      if (chopFlash <= 0 && cyc > 0) {
        chopSide = safeSide === 'L' ? -1 : 1;
        chopFlash = 0.12;
        levels.shift();
        levels.push(newLevel(chops + 5));
        chops = (chops + 1) % TOTAL;
      }
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (chopFlash > 0) chopFlash -= dt;

    if (state === S.ATTRACT) {
      if (levels === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = levels.length - 1; i >= 0; i--) drawTrunkLevel(levels[i], 0);
      drawLumberjack(demo.gx < TRUNK_CX ? 'L' : 'R', chopFlash > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j = levels.length - 1; j >= 0; j--) drawTrunkLevel(levels[j], 0);
      drawLumberjack(fallSide === 'L' ? 'L' : 'R', false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(chops + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - chops) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(chops, { chops: chops, total: TOTAL });
        else game.end.failure({ chops: chops, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var k = levels.length - 1; k >= 0; k--) drawTrunkLevel(levels[k], 0);
    if (!finished) drawLumberjack(chopSide <= 0 ? 'L' : 'R', chopFlash > 0);

    txt(chops + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (chops / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['C4', 0.3], ['E4', 0.3], ['G4', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

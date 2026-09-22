// K-DS-0041-pond-stone-hopper.js
// 跳ね石渡り — 大魚の尾びれが跳ね上げる飛び石を、頂点の瞬間に踏み込んで渡る
// 操作: 石が水面から跳ね上がり頂点に達した瞬間にタップして踏み込む。早すぎ/遅すぎは水没
// 終わり: 規定数(6個)を渡り切れば成功。1回でも踏み外せば失敗
// @mechanic: timing_one_shot
// @theme: pond_stone_hopper
// 世界観: 旅の軽業師が池を渡る。水面下の大魚が尾びれで石を次々跳ね上げ、石が頂点で静止する一瞬だけ踏み込んで対岸を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った石の数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁、平坦な2〜3階調の陰影、彩度高めの本体色
  var C = {
    sky: '#8fd9ff', sky2: '#c8f0ff', water: '#2a7fb0', waterDeep: '#175a80',
    stone: '#9a9488', stoneShade: '#6a6458', fish: '#3a6fa8', fishBelly: '#cfe8ff',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#0a1418',
  };

  var GAME_TITLE = 'STONE HOP';
  var TOTAL = 6;
  var CX = W * 0.5;
  var WATER_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var crossed, done, endWait, finished;
  var ready, hitStop, shake;
  var round, stone, performerX, performerY, ripples;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];
  var FISH = ['..####..', '.######.', '########', '.######.', '..####..'];

  function bg() {
    game.draw.gradient(0, WATER_Y, [[0, C.sky], [1, C.sky2]]);
    game.draw.gradient(WATER_Y, H - WATER_Y, [[0, C.water], [1, C.waterDeep]]);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, WATER_Y + 30 + i * 40, W, WATER_Y + 30 + i * 40, '#ffffff10', 3);
    }
  }

  function newStone(idx) {
    var x = W * (0.22 + idx * 0.56 / Math.max(1, TOTAL - 1));
    return { x: x, idx: idx, t: 0, dur: Math.max(0.7, 1.15 - idx * 0.04), resolved: false, peaked: false };
  }

  function stoneY(s) {
    var p = Math.min(1, s.t / s.dur);
    var arc = 1 - Math.pow((p - 0.5) * 2, 2);
    return WATER_Y - arc * 260;
  }

  function initGame() {
    crossed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; stone = newStone(0);
    performerX = W * 0.08; performerY = WATER_Y - 30;
    ripples = [];
  }

  function stepIn() {
    if (!stone || stone.resolved || ready > 0 || done || finished) return;
    var p = stone.t / stone.dur;
    var atPeak = p > 0.38 && p < 0.62;
    stone.resolved = true;
    var sy = stoneY(stone);
    if (atPeak) {
      hitStop = 0.1;
      crossed++;
      performerX = stone.x; performerY = sy - 30;
      ripples.push({ x: stone.x, y: WATER_Y, t: 0 });
      game.feedback.good(stone.x, sy, { text: 'HOP', color: C.good });
      game.fx.burst(stone.x, sy, { color: C.white, count: 12, speed: 260 });
      game.audio.play('se_jump', 0.4);
      if (crossed === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.32, { color: C.gold, size: 40 });
      if (crossed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      stone = newStone(round);
    } else {
      hitStop = 0.35;
      performerX = stone.x; performerY = WATER_Y + 20;
      game.feedback.bad(stone.x, WATER_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) stepIn();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawStone(s) {
    if (!s) return;
    var sy = stoneY(s);
    var p = s.t / s.dur;
    var atPeak = p > 0.38 && p < 0.62;
    if (atPeak) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.circle(s.x, WATER_Y, 60, blink ? C.gold : '#ffd40055', 0.5);
    }
    game.draw.circle(s.x, WATER_Y + 6, 44, '#00000022');
    game.draw.circle(s.x, sy, 46, C.stoneShade);
    game.draw.circle(s.x, sy - 6, 40, C.stone);
  }

  function drawFish() {
    var bob = Math.sin(game.time.elapsed * 3) * 10;
    game.draw.sprite(FISH, { '#': C.fish }, W * 0.5, WATER_Y + 140 + bob, 14, { anchor: 'center' });
  }

  function drawRipples(dt) {
    for (var i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt;
      if (ripples[i].t > 0.6) { ripples.splice(i, 1); continue; }
      var rr = ripples[i].t * 140;
      game.draw.circle(ripples[i].x, ripples[i].y, rr, '#ffffff', 0.3 * (1 - ripples[i].t / 0.6));
    }
  }

  var demo = { t: 0, gx: W * 0.08, gy: WATER_Y - 30, press: false, s: null, r: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) {
      demo.s = newStone(demo.r % TOTAL);
      demo.s.dur = 1.1;
      demo.hit = false;
    }
    demo.s.t += dt;
    stone = demo.s;
    var p = demo.s.t / demo.s.dur;
    if (p > 0.38 && p < 0.62 && !demo.hit) {
      demo.hit = true;
      var sy = stoneY(demo.s);
      demo.gx = demo.s.x; demo.gy = sy - 30; demo.press = true;
      performerX = demo.s.x; performerY = sy - 30;
      ripples.push({ x: demo.s.x, y: WATER_Y, t: 0 });
      game.audio.play('se_jump', 0.2);
      demo.r++;
    }
    if (p >= 1) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      drawFish();
      stepDemo(dt);
      drawRipples(dt);
      drawStone(stone);
      game.draw.sprite(PERFORMER, { '#': C.gold }, performerX, performerY, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy - 90, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFish();
      drawRipples(0);
      game.draw.sprite(PERFORMER, { '#': C.gold }, performerX, performerY, 20, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(crossed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - crossed) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(crossed, { crossed: crossed, total: TOTAL });
        else game.end.failure({ crossed: crossed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stone.t += dt;
      if (stone.t / stone.dur >= 1 && !stone.resolved) {
        stone.resolved = true;
        hitStop = 0.35;
        performerX = stone.x; performerY = WATER_Y + 20;
        game.feedback.bad(stone.x, WATER_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFish();
    drawRipples(dt);
    if (!finished) drawStone(stone);
    game.draw.sprite(PERFORMER, { '#': C.gold }, performerX, performerY, 20, { anchor: 'center' });

    txt(crossed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (crossed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

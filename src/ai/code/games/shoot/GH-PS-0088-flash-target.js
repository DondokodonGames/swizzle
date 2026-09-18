// GH-PS-0088-flash-target.js
// フラッシュターゲット — 的が一瞬しか出ない。出た瞬間に撃つ
// 操作: 巨大な的が浮かび上がった瞬間だけタップ
// 終わり: 5回のうち何回当たったかが残る
// @mechanic: timing_one_shot
// @theme: shooting_gallery
// 世界観: 射的場。3つの台のどれかに、巨大な的が一瞬だけせり上がる。出た瞬間だけ撃てる。すぐ引っ込む
// 残るもの: 命中数(SCORE) + 試行回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s BIG SPRITE: 多色。巨大キャラ、床影、間合いで見せる
  var C = {
    bg1: '#3a2a4a', bg2: '#241832', booth: '#5a4468', target: '#e8c840', target2: '#c8983a', shadow: '#000000',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#100a18',
  };

  var GAME_TITLE = 'FLASH TARGET';
  var ROUNDS = 5;
  var POS = [W * 0.22, W * 0.5, W * 0.78];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, hits = 0;

  var roundIdx, phase, phaseT, slot, resolved, done, endWait;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOOTH_Y = H * 0.58;
  var TARGET_SPRITE = ['..###..', '.#####.', '#######', '.#####.', '..###..', '..#.#..'];

  var PRIZE_SPRITE = ['.##.', '####', '.##.'];
  var BULB = (function() {
    var arr = [];
    for (var i = 0; i < 9; i++) arr.push({ x: W * (0.08 + i * 0.11), y: H * (0.16 + Math.sin(i * 1.3) * 0.02) });
    return arr;
  })();

  function galleryBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // 賞品棚(上部の空きを埋める)
    game.draw.rect(0, H * 0.24, W, H * 0.10, C.booth, 0.4);
    for (var p = 0; p < POS.length; p++) game.draw.sprite(PRIZE_SPRITE, { '#': C.target }, POS[p], H * 0.29, 16, { anchor: 'center' });
    // 電飾(点滅)
    for (var b = 0; b < BULB.length; b++) {
      var o = BULB[b];
      var on = Math.floor(game.time.elapsed * 3 + b) % 2 === 0;
      game.draw.circle(o.x, o.y, 12, on ? C.gold : C.target2, on ? 0.9 : 0.3);
    }
    for (var i = 0; i < POS.length; i++) {
      game.draw.circle(POS[i], BOOTH_Y + 60, 120, C.shadow, 0.3);
      game.draw.rect(POS[i] - 100, BOOTH_Y + 20, 200, H * 0.20, C.booth);
    }
  }

  function drawTarget(i, pop) {
    if (!pop) return;
    var x = POS[i];
    game.draw.sprite(TARGET_SPRITE, { '#': C.target }, x, BOOTH_Y - 40, 22, { anchor: 'center' });
    game.draw.circle(x, BOOTH_Y - 40, 130, C.target2, 0.15);
  }

  function newRound() {
    slot = Math.floor(Math.random() * 3);
    phase = 'wait'; phaseT = 0.5 + Math.random() * 0.6; resolved = false;
  }

  function initGame() {
    roundIdx = 0; hits = 0; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function tapNow() {
    if (done || ready > 0 || hitStop > 0 || resolved) return;
    hitStop = 0.06;
    if (phase === 'pop') {
      hits++; resolved = true;
      game.feedback.good(POS[slot], BOOTH_Y - 40, { text: 'HIT', color: C.good });
      game.fx.burst(POS[slot], BOOTH_Y - 40, { color: C.gold, count: 16, speed: 380 });
      game.audio.play('se_success', 0.4);
    } else {
      game.feedback.bad(W / 2, BOOTH_Y, { text: 'MISS' });
      shake = 0.1;
      game.audio.play('se_bad', 0.3);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = hits * 100;
    game.audio.stopBgm();
    game.audio.play(hits > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 出た瞬間だけタップ ──
  var demo = { t: 0, gx: POS[1], gy: BOOTH_Y + 120, press: false, slot: 1, phase: 'wait', phaseT: 0.6 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    if (demo.phase === 'wait' && demo.phaseT <= 0) { demo.slot = Math.floor(Math.random() * 3); demo.phase = 'pop'; demo.phaseT = 0.4; demo.gx = POS[demo.slot]; }
    else if (demo.phase === 'pop') {
      if (demo.phaseT > 0.24 && demo.phaseT < 0.30) { demo.press = true; game.feedback.good(POS[demo.slot], BOOTH_Y - 40, { text: 'HIT', color: C.good }); game.fx.burst(POS[demo.slot], BOOTH_Y - 40, { color: C.gold, count: 10, speed: 300 }); }
      else demo.press = false;
      if (demo.phaseT <= 0) { demo.phase = 'wait'; demo.phaseT = 0.7; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundIdx === undefined) initGame();
      galleryBg();
      stepDemo(dt);
      drawTarget(demo.slot, demo.phase === 'pop');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 54, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.15, 30, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      galleryBg();
      txt(hits >= 3 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 56, hits >= 3 ? C.white : C.bad);
      txt('HIT ' + hits + ' / ' + ROUNDS, W / 2, H * 0.20, 44, C.gold);
      txt('SCORE ' + finalScore, W / 2, H * 0.26, 38, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.32, 32, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.38, 36, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 34, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: hits + '/' + ROUNDS }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      phaseT -= dt;
      if (phase === 'wait' && phaseT <= 0) { phase = 'pop'; phaseT = 0.36; game.audio.play('se_tap', 0.15); }
      else if (phase === 'pop' && phaseT <= 0) {
        if (!resolved) { game.feedback.bad(W / 2, BOOTH_Y, { text: 'MISS' }); shake = 0.08; }
        roundIdx++;
        if (roundIdx >= ROUNDS) finish();
        else { newRound(); game.fx.popup(roundIdx + ' / ' + ROUNDS, W / 2, H * 0.20, { color: C.gold, size: 44 }); }
      }
    }
    if (shake > 0) shake -= dt;

    galleryBg();
    drawTarget(slot, phase === 'pop');

    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * (roundIdx / ROUNDS), 24, C.gold);
    txt(roundIdx + ' / ' + ROUNDS, W / 2, 106, 44, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 74, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20172021-0066-shaft-vein-tap-quota.js
// シャフト・ヴェイン・タップクォータ — 露出した鉱脈をピッケルで連打して砕き、規定量を掘り出す
// 操作: 中央の鉱脈を連打する。叩くたびに少しずつ砕けて崩れていく
// 終わり: 規定量を掘りきれば成功。笛が鳴る(時間切れ)までに届かなければ失敗
// @mechanic: mash
// @theme: shaft_vein_mash
// 世界観: 坑道の採掘工見習いが、交代の笛が鳴るまでに目の前の露出鉱脈をピッケルで連打して砕き、規定量の鉱石を運び出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 掘り出した量
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、粗いドット、輪郭線なし、タイル反復の背景
  var STYLE = { bg: ['#241014', '#100a0c'], main: ['#8a5a3a', '#c98a4b'], accent: ['#ffd24d', '#3dd6c8'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], rock: '#6a4a30', rockCrack: '#3a2418', rockCore: '#c98a4b',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd24d', ink: '#f0e0d0', white: '#ffffff',
  };

  var GAME_TITLE = 'SHAFT QUOTA';
  var CX = W * 0.5, CY = H * 0.42;
  var TARGET = 20;
  var TIME_LIMIT = 10;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MINER = ['.##.', '####', '.##.', '#..#'];
  var ROCK_FRAMES = [
    ['..####..', '.######.', '########', '.######.', '..####..'],
    ['.#.##.#.', '#.####.#', '##.##.##', '#.####.#', '.#.##.#.'],
    ['#.#..#.#', '.#.##.#.', '#.####.#', '.#.##.#.', '#.#..#.#'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) {
      var ty = (i * 320) % H;
      game.draw.rect(0, ty, W, 4, '#000000', 0.2);
    }
    game.draw.sprite(MINER, { '#': C.gold }, W * 0.16, H * 0.88, 10, { anchor: 'center' });
  }

  var progress, timeLeft, done, endWait, finished, ready, hitStop, shake, hitFlash, tapBurstT;

  function initGame() {
    progress = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; hitFlash = 0; tapBurstT = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawRock(prog) {
    var frameIdx = Math.min(ROCK_FRAMES.length - 1, Math.floor((prog / TARGET) * ROCK_FRAMES.length));
    var scale = 34 - Math.floor((prog / TARGET) * 10);
    var jx = hitFlash > 0 ? game.random(-6, 6) : 0;
    var jy = hitFlash > 0 ? game.random(-6, 6) : 0;
    game.draw.circle(CX, CY + 90, 120, C.rockCrack, 0.4);
    game.draw.sprite(ROCK_FRAMES[frameIdx], { '#': hitFlash > 0 ? '#ffffff' : C.rock }, CX + jx, CY + jy, scale, { anchor: 'center' });
  }

  function tapHit(x, y) {
    progress = Math.min(TARGET, progress + 1);
    hitFlash = 0.08;
    game.feedback.good(x, y, { text: '', color: C.gold, count: 6, sound: 'se_tap' });
    game.audio.play('se_tap', 0.2);
    game.fx.shake(6, 0.06);
    if (progress === Math.floor(TARGET * 0.5)) game.fx.popup('NICE', CX, CY - 180, { color: C.gold, size: 34 });
    if (progress === Math.floor(TARGET * 0.8)) game.fx.popup('あと1個!', CX, CY - 180, { color: C.gold, size: 30 });
    if (progress >= TARGET) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good, count: 20 });
      game.audio.play('se_break', 0.5);
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tapHit(x, y);
  });

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) initGame();
    demo.gx = CX + Math.sin(demo.t * 6) * 30;
    demo.gy = CY + Math.cos(demo.t * 5) * 20;
    if (cyc < 2.6) {
      var phase = cyc % 0.28;
      demo.press = phase < 0.12;
      if (phase < dt + 0.001 && progress < TARGET) tapHit(demo.gx, demo.gy);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (hitFlash > 0) hitFlash -= dt;

    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      stepDemo(dt);
      bg();
      drawRock(progress);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRock(progress);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(progress + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET - progress) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(progress, { mined: progress, target: TARGET });
        else game.end.failure({ mined: progress, target: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRock(progress);

    txt(progress + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.rockCrack, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    game.draw.rect(60, 1500, tbW, 24, C.rockCrack, 1);
    game.draw.rect(60, 1500, tbW * (progress / TARGET), 24, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['E3', 0.2], ['G3', 0.2], ['B3', 0.4]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

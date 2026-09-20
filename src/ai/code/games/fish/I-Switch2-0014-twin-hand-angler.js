// I-Switch2-0014-twin-hand-angler.js
// ツインハンドアングラー — 見習い漁師が左手で竿を巻き上げ、右手で跳ねる魚を同時に網ですくう
// 操作: 左ゾーンは連続タップで巻き上げ、右ゾーンは跳ねた魚が来た瞬間にタップして網ですくう。両方を並行して行う
// 終わり: 巻き上げゲージが満タンになり、かつ規定数の魚をすくえれば成功。魚を見逃す・ゲージが尽きれば失敗
// @mechanic: coop_2zone
// @theme: twin_task_angler_dock
// 世界観: 朝の船着き場。二人分の仕事を任された見習い漁師が、左手で竿を巻き上げながら右手で跳ねる魚を網ですくう掛け持ち仕事
// 残るもの: 正誤(CLEAR/GAME OVER) + 巻き上げ量%とすくった魚数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 限定パレット、粗いドット感、コントラストの高い縁取り
  var C = {
    bg: '#2a4a5a', bg2: '#1a3444', dock: '#8a6a3e', dockEdge: '#4a3620',
    reel: '#c8a24a', reelEdge: '#6a4e20', fish: '#4ae8ff', fishEdge: '#1a4a5a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#eefcff', ink: '#0a0a0a',
  };

  var GAME_TITLE = 'TWIN ANGLER';
  var REEL_NEEDED = 12;
  var FISH_NEEDED = 4;
  var LZONE = { x: W * 0.27, y: H * 0.72, r: 150 };
  var RZONE = { x: W * 0.73, y: H * 0.72, r: 150 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var reelCount, fishCount, done, endWait, finished;
  var ready, hitStop, shake;
  var fish; // {t, dur, resolved}
  var failReason;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ANGLER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.66, W, H * 0.06, C.dockEdge);
    game.draw.rect(0, H * 0.72 - 6, W, H * 0.5, C.dock, 0.25);
    game.draw.sprite(ANGLER, { '#': C.white }, W * 0.5, H * 0.38, 22, { anchor: 'center' });
  }

  function newFish(round) {
    return { t: 0, dur: Math.max(0.75, 1.15 - round * 0.06), resolved: false };
  }

  function initGame() {
    reelCount = 0; fishCount = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    fish = newFish(0);
    failReason = '';
  }

  function tapLeft(x, y) {
    if (ready > 0 || done || finished) return;
    game.audio.play('se_tap', 0.05);
    reelCount++;
    game.feedback.good(LZONE.x, LZONE.y, { text: reelCount >= REEL_NEEDED ? 'GOOD' : '', color: C.good, count: 4 });
    game.audio.tone('D4', 0.05, { wave: 'square', volume: 0.06 });
    if (reelCount === Math.ceil(REEL_NEEDED / 2)) game.fx.popup('HALFWAY!', LZONE.x, LZONE.y - 200, { color: C.gold, size: 34 });
    checkClear();
  }

  function tapRight(x, y) {
    if (!fish || fish.resolved || ready > 0 || done || finished) return;
    var p = fish.t / fish.dur;
    var correct = p > 0.55 && p < 1.0;
    fish.resolved = true;
    hitStop = correct ? 0.08 : 0.28;
    if (correct) {
      fishCount++;
      game.feedback.good(RZONE.x, RZONE.y, { text: 'CATCH', color: C.good });
      game.fx.burst(RZONE.x, RZONE.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      checkClear();
      if (!finished) fish = newFish(fishCount);
    } else {
      game.feedback.bad(RZONE.x, RZONE.y, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
      failReason = 'fish';
      ok = false; finished = true; finish();
    }
  }

  function checkClear() {
    if (finished) return;
    if (reelCount >= REEL_NEEDED && fishCount >= FISH_NEEDED) {
      ok = true; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.04);
    var dL = Math.hypot(x - LZONE.x, y - LZONE.y);
    var dR = Math.hypot(x - RZONE.x, y - RZONE.y);
    if (dL < LZONE.r) tapLeft(x, y);
    else if (dR < RZONE.r) tapRight(x, y);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawZones(fishState) {
    game.draw.circle(LZONE.x, LZONE.y, LZONE.r, C.reelEdge, 0.5);
    game.draw.circle(LZONE.x, LZONE.y, LZONE.r * (0.4 + 0.6 * Math.min(1, reelCount / REEL_NEEDED)), C.reel, 0.7);
    txt(Math.round(100 * Math.min(1, reelCount / REEL_NEEDED)) + '%', LZONE.x, LZONE.y + 12, 30, C.ink);

    game.draw.circle(RZONE.x, RZONE.y, RZONE.r, C.fishEdge, 0.5);
    if (fishState) {
      var p = fishState.t / fishState.dur;
      var jump = Math.sin(Math.min(1, p) * Math.PI) * 90;
      // telegraph: p>0.35からリング点滅で跳ねる合図
      if (p > 0.35) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(RZONE.x, RZONE.y - jump, 60, C.gold, 0.3);
      }
      game.draw.circle(RZONE.x, RZONE.y - jump, 34, C.fish);
    }
    txt(fishCount + '/' + FISH_NEEDED, RZONE.x, RZONE.y + 12, 30, C.white);
  }

  var demo = { t: 0, gx: LZONE.x, gy: LZONE.y, press: false, phaseL: 0, f: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (reelCount === undefined) reelCount = 0;
    demo.phaseL += dt;
    if (demo.phaseL > 0.22) {
      demo.phaseL = 0;
      reelCount = Math.min(REEL_NEEDED, (reelCount || 0) + 1);
      demo.gx = LZONE.x; demo.gy = LZONE.y; demo.press = true;
      game.audio.tone('D4', 0.05, { wave: 'square', volume: 0.03 });
    } else if (demo.phaseL > 0.1) {
      demo.press = false;
    }
    if (!demo.f) demo.f = newFish(0);
    demo.f.t += dt;
    fish = demo.f;
    var p = demo.f.t / demo.f.dur;
    if (p > 0.65 && !demo.fpressed) {
      demo.fpressed = true;
      demo.gx = RZONE.x; demo.gy = RZONE.y; demo.press = true;
      fishCount = Math.min(FISH_NEEDED, (fishCount || 0) + 1);
      game.feedback.good(RZONE.x, RZONE.y, { text: 'CATCH', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (p >= 1) { demo.f = null; demo.fpressed = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawZones(fish);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.round(100 * Math.min(1, reelCount / REEL_NEEDED)) + '% / ' + fishCount + 'びき', W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { reelPct: Math.round(100 * Math.min(1, reelCount / REEL_NEEDED)), fish: fishCount };
        if (ok) game.end.success(fishCount, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      fish.t += dt;
      if (fish.t / fish.dur >= 1 && !fish.resolved) {
        fish.resolved = true;
        hitStop = 0.28;
        game.feedback.bad(RZONE.x, RZONE.y, { text: 'MISS' });
        shake = 0.2;
        game.audio.play('se_bad', 0.4);
        failReason = 'fish';
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawZones(fish);

    txt(Math.round(100 * Math.min(1, reelCount / REEL_NEEDED)) + '% / ' + fishCount + '/' + FISH_NEEDED, W / 2, H * 0.06, 28, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.4], ['B3', 0.4], ['D4', 0.8]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

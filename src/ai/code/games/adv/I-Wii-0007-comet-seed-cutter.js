// I-Wii-0007-comet-seed-cutter.js
// コメットシード・カッター — 落ちてくる彗星の種鞘を、光る帯の中でスパッと下方向に切る
// 操作: 種鞘が中央の光る帯にかかった瞬間だけ、画面を下方向にスワイプして切る
// 終わり: 規定個数(5個)を全て切れれば成功。帯を外して切る/切らずに落とせば失敗
// @mechanic: slice
// @theme: rooftop_comet_garden
// 世界観: 屋上温室のロボット庭師。降ってくる彗星の種鞘を、割れる前に光る帯の高さでスパッと切って発芽させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 切れた個数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調、低コントラスト、画面枠
  var C = {
    bg: '#0f1a0a', bg2: '#16240f', frame: '#0a120a',
    lcd0: '#0d1a08', lcd1: '#2c4a1a', lcd2: '#6a9a3a', lcd3: '#c8e88a',
    band: '#c8e88a', bandGlow: '#6a9a3a', bad: '#c8e88a', gold: '#c8e88a',
    ink: '#060a04',
  };

  var GAME_TITLE = 'SEED CUTTER';
  var TOTAL = 5;
  var CX = W * 0.5;
  var BAND_Y = H * 0.55;
  var BAND_HALF_P = 0.09; // 帯の許容窓(進行率)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cut, done, endWait, finished;
  var ready, hitStop, shake, streak, bestStreak;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GARDENER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];
  var POD_FRAMES = [
    ['.##.', '####', '####', '.##.'],
    ['.##.', '####', '####', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, 14, C.frame);
    game.draw.rect(0, H - 14, W, 14, C.frame);
    for (var i = 0; i < 6; i++) game.draw.circle(60 + i * 190, H * 0.18, 3, C.lcd2, 0.6);
    game.draw.rect(0, H * 0.86, W, H * 0.02, C.lcd1, 0.5);
  }

  function drawGardener() {
    game.draw.sprite(GARDENER, { '#': C.lcd3 }, CX, H * 0.86, 22, { anchor: 'center' });
  }

  function drawBand(telegraph) {
    var a = telegraph ? (Math.floor(game.time.elapsed * 10) % 2 === 0 ? 0.9 : 0.35) : 0.5;
    game.draw.rect(60, BAND_Y - 10, W - 120, 20, C.bandGlow, a);
    game.draw.line(60, BAND_Y, W - 60, BAND_Y, C.band, 4);
  }

  // 一つの種鞘のライフサイクル。t/dur = 0→1 で上から帯の下まで落下
  function newSeed() {
    return { t: 0, dur: Math.max(0.85, 1.35 - round * 0.08), resolved: false, telegraphed: false };
  }

  var round, seed;

  function initGame() {
    cut = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; streak = 0; bestStreak = 0;
    round = 0; seed = newSeed();
  }

  function podY(s) { return -80 + (BAND_Y + 260 + 80) * Math.min(1, s.t / s.dur); }

  function resolveCut() {
    if (!seed || seed.resolved || ready > 0 || done || finished) return;
    var p = seed.t / seed.dur;
    var bandP = (BAND_Y + 80) / (BAND_Y + 260 + 80);
    var inBand = Math.abs(p - bandP) <= BAND_HALF_P;
    seed.resolved = true;
    var y = podY(seed);
    hitStop = inBand ? 0.12 : 0.32;
    if (inBand) {
      cut++; streak++; if (streak > bestStreak) bestStreak = streak;
      game.feedback.good(CX, y, { text: 'CLEAR', color: C.lcd3 });
      game.fx.burst(CX, y, { color: C.lcd3, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (cut === Math.ceil(TOTAL / 2)) {
        game.fx.popup('HALFWAY!', CX, H * 0.3, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      streak = 0;
      game.feedback.bad(CX, y, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
    }
    if (!inBand) { ok = false; finished = true; finish(); return; }
    if (cut >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    seed = newSeed();
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (dir === 'down') { game.audio.play('se_tap', 0.06); resolveCut(); }
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

  function drawSeed(s) {
    if (!s) return;
    var y = podY(s);
    var p = s.t / s.dur;
    var bandP = (BAND_Y + 80) / (BAND_Y + 260 + 80);
    if (p > bandP - BAND_HALF_P - 0.18 && p < bandP - BAND_HALF_P) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(CX, y, 46, C.lcd2, 0.35);
    }
    var frame = POD_FRAMES[Math.floor(game.time.elapsed * 6) % POD_FRAMES.length];
    game.draw.sprite(frame, { '#': C.lcd3 }, CX, y, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.4, press: false, s: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.s) { demo.s = newSeed(); demo.s.dur = 1.2; round = 0; }
    demo.s.t += dt;
    seed = demo.s;
    var p = demo.s.t / demo.s.dur;
    var bandP = (BAND_Y + 80) / (BAND_Y + 260 + 80);
    demo.gy = podY(demo.s);
    demo.gx = CX;
    if (p > bandP - 0.04 && p < bandP + 0.04 && !demo.s.telegraphed) {
      demo.s.telegraphed = true;
      demo.press = true;
      game.feedback.good(CX, demo.gy, { text: 'CLEAR', color: C.lcd3 });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.s = null; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBand(false);
      drawSeed(seed);
      drawGardener();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.lcd3);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.lcd2);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.lcd3);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.lcd2);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBand(false);
      drawGardener();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.lcd3);
      txt(cut + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.lcd2);
      if (!ok) txt('あと' + (TOTAL - cut) + '個!', W / 2, H * 0.18, 26, C.lcd2);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.lcd2);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cut, { cut: cut, total: TOTAL, bestStreak: bestStreak });
        else game.end.failure({ cut: cut, total: TOTAL, bestStreak: bestStreak });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      seed.t += dt;
      if (seed.t / seed.dur >= 1 && !seed.resolved) {
        seed.resolved = true;
        hitStop = 0.32;
        streak = 0;
        game.feedback.bad(CX, podY(seed), { text: 'MISS' });
        shake = 0.28;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBand(true);
    if (!finished) drawSeed(seed);
    drawGardener();

    txt(cut + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.lcd3);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cut / TOTAL), 16, C.lcd3);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.lcd3);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['D4', 0.4], ['F4', 0.4], ['G4', 0.8]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

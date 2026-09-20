// I-GBA-0012-storm-shutter-parry.js
// ストームシャッター — 岬の灯台守、迫る高波を鎧戸を閉めて防ぐ
// 操作: 波しぶきが窓に届く直前、光る当たり判定窓の間にタップして鎧戸を閉める
// 終わり: 規定回数防ぎきれば成功。鎧戸が壊れる(3回被弾)と失敗
// @mechanic: timing_window
// @theme: lighthouse_storm_shutter
// 世界観: 嵐の夜、岬の灯台守が窓に迫る高波を鎧戸で防ぐ。波が窓に届く寸前の短い間だけ鎧戸が閉められる
// 残るもの: 正誤(CLEAR/GAME OVER) + 防いだ波の数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 1BIT INK: 白黒2値、中間はディザ、線の太さで力を語る
  var C = {
    bg: '#0a0a0c', ink: '#f0f0ec', dim: '#f0f0ec', wave: '#e8e8e4',
    good: '#f0f0ec', bad: '#f0f0ec', gold: '#f0f0ec', white: '#ffffff', black: '#000000',
  };

  var GAME_TITLE = 'STORM SHUTTER';
  var NEED = 5;      // 防ぐべき波の数
  var MAX_MISS = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CX = W * 0.5, WIN_Y = H * 0.42;

  var waveT, waveDur, phase, closed, closedT, saved, missed, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // 市松ディザで中間濃度を作る
  function dither(x, y, w, h, density) {
    var step = 8;
    for (var yy = 0; yy < h; yy += step) {
      for (var xx = 0; xx < w; xx += step) {
        if (((xx / step + yy / step) % 2 === 0) === (density > 0.5)) {
          game.draw.rect(x + xx, y + yy, step - 2, step - 2, C.ink, 0.5);
        }
      }
    }
  }

  var KEEPER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function scene() {
    game.draw.gradient(0, H, [[0, '#050506'], [0.3, C.bg], [1, '#050506']]);
    // 遠景の海の帯(ディザで波濃淡)
    for (var i = 0; i < 5; i++) {
      dither(0, H * 0.30 + i * 26, W, 20, 0.3 + i * 0.1);
    }
    game.draw.line(0, H * 0.30, W, H * 0.30, C.ink, 3);
    // 窓枠
    game.draw.rect(CX - 210, WIN_Y - 210, 420, 420, C.ink, 0.9);
    game.draw.rect(CX - 190, WIN_Y - 190, 380, 380, C.bg);
    // 灯台守(親指ゾーン寄り手前)
    game.draw.sprite(KEEPER_SPRITE, { '#': C.ink }, CX, H * 0.80, 26, { anchor: 'center' });
  }

  function drawShutter(closeAmt) {
    // closeAmt 0=開, 1=全閉
    var h = 380 * closeAmt;
    game.draw.rect(CX - 190, WIN_Y - 190, 380, h, C.ink, 0.95);
    game.draw.rect(CX - 190, WIN_Y + 190 - h, 380, h, C.ink, 0.95);
    for (var i = 1; i < 5; i++) {
      game.draw.line(CX - 190, WIN_Y - 190 + h * i / 5 * (closeAmt > 0 ? 1 : 0), CX + 190, WIN_Y - 190 + h * i / 5 * (closeAmt > 0 ? 1 : 0), C.bg, 2);
    }
  }

  function drawWave(t, dur) {
    // t: 0..1 接近度
    var r = 60 + t * 260;
    game.draw.circle(CX, WIN_Y, r, C.bg);
    dither(CX - r, WIN_Y - r, r * 2, r * 2, 0.6);
    game.draw.circle(CX, WIN_Y, r, C.ink, 0.15);
    if (t > 0.72) {
      // telegraph: 予告の点滅リング
      if (Math.floor(t * 40) % 2 === 0) game.draw.circle(CX, WIN_Y, 200, C.white, 0.5);
    }
  }

  function newWave() {
    waveT = 0; waveDur = 1.55 - Math.min(0.5, saved * 0.04); phase = 'approach'; closed = false; closedT = 0;
  }

  function initGame() {
    saved = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newWave();
  }

  function attemptClose(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'approach') return;
    game.audio.play('se_tap', 0.15);
    var winStart = 0.68, winEnd = 0.92; // 当たり判定窓(接近度0-1)
    var progress = waveT / waveDur;
    if (progress >= winStart && progress <= winEnd) {
      closed = true; phase = 'result'; hitStop = 0.12;
      saved++;
      game.feedback.good(CX, WIN_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, WIN_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (saved === 3 && !milestoneShown) { milestoneShown = true; game.fx.popup('3 / ' + NEED, CX, WIN_Y - 240, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
      if (saved >= NEED) { ok = true; finished = true; finish(); }
    } else {
      // 早すぎ: まだ間に合う可能性を残す(閉め損ないは接近を待つ)
      game.audio.play('se_tap', 0.08);
    }
  }

  function waveHit() {
    // 窓を閉め損ねて波が直撃
    phase = 'result'; hitStop = 0.35;
    missed++;
    shake = 0.3;
    game.feedback.bad(CX, WIN_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    if (missed >= MAX_MISS) { ok = false; finished = true; finish(); }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    attemptClose(x, y);
  });

  // ── ATTRACT ゴースト実演: 実ロジックを流用して波を1回防ぐ ──
  var demo = { t: 0, gx: CX, gy: H * 0.80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { newWave(); }
    waveT += dt;
    var progress = waveT / waveDur;
    if (phase === 'approach' && progress >= 0.80 && progress < 0.86) {
      demo.press = true;
      if (!closed) { closed = true; phase = 'result'; }
    } else if (progress < 0.80) {
      demo.press = false;
    }
    if (progress >= 1 && phase === 'approach') { phase = 'result'; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (waveT === undefined) newWave();
      scene();
      stepDemo(dt);
      if (phase === 'approach') drawWave(Math.min(1, waveT / waveDur), waveDur);
      drawShutter(closed ? 1 : 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.15, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      scene();
      drawShutter(1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 50, C.white);
      txt(saved + ' / ' + NEED, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEED - saved) + '!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { saved: saved, missed: missed };
        if (ok) game.end.success(saved, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && phase === 'result') { if (closed) newWave(); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'approach') {
        waveT += dt;
        if (waveT >= waveDur) { waveHit(); }
      } else if (phase === 'result' && hitStop <= 0) {
        newWave();
      }
    }
    if (shake > 0) shake -= dt;

    scene();
    if (phase === 'approach') drawWave(Math.min(1, waveT / waveDur), waveDur);
    drawShutter(closed ? 1 : 0);

    txt(saved + ' / ' + NEED, W / 2, H * 0.06, 34, C.white);
    game.draw.rect(60, 110, W - 120, 14, C.ink, 0.25);
    game.draw.rect(60, 110, (W - 120) * (saved / NEED), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['E3', 0.5], ['G3', 0.5], ['C4', 1]], { tempo: 90, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

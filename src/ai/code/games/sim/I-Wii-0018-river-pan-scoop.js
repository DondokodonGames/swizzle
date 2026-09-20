// I-Wii-0018-river-pan-scoop.js
// リバーパンスクープ — 川底に沈む砂金皿を、下から上へすくい上げるように振って引き上げる
// 操作: 沈んだ皿が画面下から浮かんできた瞬間、下から上へ指をスワイプしてすくい上げる
// 終わり: 6回の砂金皿のうち規定数を正しいタイミングですくえれば成功。すくい損ねが規定数を超えると失敗
// @mechanic: swipe_direction
// @theme: river_gold_panning
// 世界観: 山あいの川原にしゃがむ砂金採り。流れてくる皿を見逃さず、浮き上がる瞬間に合わせてすくい上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + すくえた皿数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズ(薄い矩形散らし)、擬似奥行き、金属ハイライト
  var C = {
    bg: '#1a2418', bg2: '#0c140a', river: '#2e4a3a', riverDark: '#182c20',
    pan: '#6a6458', panDark: '#3a3630', gold: '#e8c243', good: '#3dd67a', bad: '#ff5040',
    white: '#e6e0d0', ink: '#0a0e08',
  };

  var GAME_TITLE = 'RIVER PAN';
  var CX = W * 0.5, SURFACE_Y = H * 0.5;
  var TOTAL = 6;
  var NEED_HITS = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, hits, panY, rising, resolved, done, endWait, finished, ready, hitStop, shake, flash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PANNER = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, SURFACE_Y, [[0, C.bg], [1, C.bg2]]);
    game.draw.gradient(SURFACE_Y, H, [[0, C.riverDark], [1, C.river]]);
    for (var i = 0; i < 30; i++) {
      game.draw.rect((i * 137) % W, SURFACE_Y + ((i * 53) % (H - SURFACE_Y)), 3, 3, '#ffffff08');
    }
    game.draw.sprite(PANNER, { '#': C.ink }, W * 0.24, H * 0.42, 16, { anchor: 'center', alpha: 0.4 });
  }

  var RISE_SPEED = 240;

  function initRound() {
    panY = H * 0.94; rising = true; resolved = false; flash = 0;
  }

  function initGame() {
    round = 0; hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    initRound();
  }

  function drawPan(color) {
    game.draw.circle(CX, panY, 60, C.panDark);
    game.draw.circle(CX, panY, 48, color);
    if (panY < SURFACE_Y + 40) game.draw.circle(CX, panY, 16, C.gold);
  }

  function scoop() {
    if (resolved || done || ready > 0 || finished) return;
    resolved = true;
    var diff = Math.abs(panY - (SURFACE_Y + 10));
    if (diff <= 110 && panY < H * 0.85) {
      hits++;
      flash = 0.15;
      game.feedback.good(CX, panY, { text: 'GOT IT', color: C.good });
      game.fx.burst(CX, panY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_coin', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, panY - 220, { color: C.gold, size: 34 });
      hitStop = 0.1;
      nextRoundOrEnd();
    } else {
      game.feedback.bad(CX, panY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.25;
      round++;
      if (TOTAL - round < NEED_HITS - hits) { ok = false; finished = true; finish(); return; }
      if (round >= TOTAL) { ok = hits >= NEED_HITS; finished = true; finish(); return; }
      initRound();
    }
  }

  function nextRoundOrEnd() {
    round++;
    if (round >= TOTAL) {
      ok = hits >= NEED_HITS; finished = true; finish(); return;
    }
    initRound();
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || dir !== 'up') return;
    scoop();
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

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { panY = H * 0.94; }
    if (cyc < 1.3) {
      panY = H * 0.94 - (H * 0.94 - (SURFACE_Y + 10)) * (cyc / 1.3);
      demo.press = false;
      demo.gy = H * 0.86;
    } else if (cyc < 1.5) {
      demo.press = true;
      demo.gy = H * 0.5;
    } else {
      demo.press = false;
      demo.gy = H * 0.86;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPan(C.pan);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPan(ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_HITS - hits) + '皿!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (rising) {
        panY -= RISE_SPEED * dt;
        if (panY <= SURFACE_Y - 90) {
          if (!resolved) {
            resolved = true;
            game.feedback.bad(CX, panY, { text: 'MISS' });
            shake = 0.3; game.audio.play('se_bad', 0.4); hitStop = 0.25;
            round++;
            if (TOTAL - round < NEED_HITS - hits) { ok = false; finished = true; finish(); }
            else if (round >= TOTAL) { ok = hits >= NEED_HITS; finished = true; finish(); }
            else initRound();
          }
        }
      }
    }
    if (flash > 0) flash -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawPan(flash > 0 ? C.white : C.pan);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000030', 1);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.4], ['G3', 0.4], ['B3', 0.4], ['E4', 0.6]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

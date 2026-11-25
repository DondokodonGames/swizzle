// I-DS-0018-vault-stillness-watch.js
// ヴォールト・スティルネス — 夜の宝物庫で、光る宝珠がどれだけ誘っても画面に触れず見張り続ける
// 操作: 何も操作しない。宝珠がどれだけ光って誘っても画面には一切触れないこと
// 終わり: 規定時間、一度も画面に触れずに見張りきれば成功。一度でも触れれば即失敗
// @mechanic: freeze
// @theme: night_vault_stillness
// 世界観: 夜の宝物庫を守るロボット衛兵。浮遊する宝珠が光と羽虫で気を引くが、微動だにせず見張り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 見張り抜けた秒数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調
  var C = {
    bg: '#050505', ink: '#f0f0f0', dim: '#3a3a3a', gem: '#f0f0f0',
    good: '#f0f0f0', bad: '#f0f0f0', gold: '#f0f0f0', white: '#f0f0f0', black: '#050505',
  };

  var GAME_TITLE = 'STILLNESS';
  var MAX_TIME = 9;
  var GEM_X = W * 0.5, GEM_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var survived, done, endWait, finished, pulseT, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARD_A = ['.####.', '######', '#.##.#', '######', '#.##.#'];
  var GUARD_B = ['.####.', '######', '#....#', '######', '#.##.#'];

  function ditherRect(x, y, w, hgt, alpha) {
    var step = 4;
    for (var yy = 0; yy < hgt; yy += step) {
      for (var xx = 0; xx < w; xx += step) {
        if (((xx + yy) / step) % 2 === 0) game.draw.rect(x + xx, y + yy, 2, 2, C.ink, alpha);
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, '#0a0a0a'], [1, C.bg]]);
    ditherRect(0, H * 0.68, W, H * 0.14, 0.25);
  }

  function drawScene(intensity, warn) {
    // 誘惑パルス(宝珠の光/羽虫)
    var r = 70 + intensity * 40;
    game.draw.circle(GEM_X, GEM_Y, r + 30, C.ink, 0.06 + intensity * 0.1);
    game.draw.circle(GEM_X, GEM_Y, r, C.gem, 0.35 + intensity * 0.4);
    game.draw.circle(GEM_X, GEM_Y, 26, C.ink);
    if (warn) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) {
        for (var i = 0; i < 3; i++) {
          var ang = game.time.elapsed * 3 + i * 2.1;
          game.draw.circle(GEM_X + Math.cos(ang) * 120, GEM_Y + Math.sin(ang) * 120, 6, C.ink, 0.8);
        }
      }
    }
    game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? GUARD_A : GUARD_B, { '#': C.ink, '.': null }, W * 0.5, H * 0.78, 14, { anchor: 'center' });
  }

  function initGame() {
    survived = 0; done = false; endWait = 0; finished = false; pulseT = 0; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || done || finished) return;
    // 見張り中の入力は即座に失敗(触れてしまった)
    finished = true; ok = false; hitStop = 0.35;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    game.audio.play('se_failure', 0.4);
    finish();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.2;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.94, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { pulseT = 0; }
    pulseT += dt;
    // 誘惑にわずかに近づくが触れずに耐える
    var wobble = Math.sin(cyc * 3) * 40;
    demo.gx = W * 0.5 + wobble;
    demo.gy = H * 0.90 - Math.max(0, (cyc - 2.6)) * 30;
    demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (survived === undefined) initGame();
      bg();
      stepDemo(dt);
      var pT = (demo.t % 4.0) / 4.0;
      drawScene(0.4 + 0.5 * Math.sin(pT * Math.PI * 4), pT > 0.5 && pT < 0.7);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best * 10) / 10 + 's' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(0.4, false);
      var s = Math.round(survived * 10) / 10;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, C.white);
      txt(s + ' / ' + MAX_TIME, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (Math.round((MAX_TIME - s) * 10) / 10) + '秒!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stat = { survived: Math.round(survived * 10) / 10 };
        if (ok) game.end.success(stat.survived, stat); else game.end.failure(stat);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      survived += dt;
      pulseT += dt;
      if (!milestoneShown && survived >= MAX_TIME / 2) {
        milestoneShown = true;
        game.fx.popup('50%', W / 2, H * 0.16, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (survived >= MAX_TIME) {
        finished = true; ok = true; hitStop = 0.2;
        game.feedback.good(GEM_X, GEM_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(GEM_X, GEM_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var cyc2 = pulseT % 3.2;
    var pT2 = cyc2 / 3.2;
    if (!finished) drawScene(0.4 + 0.5 * Math.sin(pT2 * Math.PI * 4), pT2 > 0.55 && pT2 < 0.75);
    else drawScene(0.9, false);

    var barPct = Math.min(1, survived / MAX_TIME);
    txt(Math.round(barPct * 100) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.2);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 1], ['D3', 1], ['Ds3', 1], ['D3', 1]], { tempo: 70, wave: 'sine', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

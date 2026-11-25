// I-3DS-0009-forge-spark-strike.js
// スパークストライク — 鍛冶場の見習いが火花が散った瞬間だけ金づちを打ち込み刀身を鍛える
// 操作: 刃が白熱して火花が散った瞬間に画面を叩く。早すぎても遅すぎても失敗
// 終わり: 規定回数(4回)正しく打てば成功。早打ち・見逃しが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: forge_ember_strike
// 世界観: 山あいの鍛冶場、見習い職人が炉から出した刃が白熱し火花が散った一瞬だけを狙い金づちを打ち込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち込めた回数
// スタイル: 2000s ARCADE POP
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めの原色+太いアウトライン+光沢ハイライト
  var C = {
    bg: '#241016', bg2: '#3a1a20', anvil: '#4a4148', anvilTop: '#6a5f66',
    blade: '#8a97a0', bladeHot: '#ff5a1f', spark: '#ffe000', warn: '#ff2d55',
    good: '#3bffb0', bad: '#ff2d55', gold: '#ffcf33', white: '#fff6e8', ink: '#1a0a0c',
  };

  var GAME_TITLE = 'SPARK STRIKE';
  var TOTAL = 4;
  var CX = W * 0.5, CY = H * 0.44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var struck, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH = ['.##..', '####.', '.##..', '####.', '#.#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(CX, H * 0.30, 260, '#ff5a1f', 0.08);
    game.draw.rect(W * 0.30, H * 0.56, W * 0.40, 46, C.anvilTop);
    game.draw.rect(W * 0.34, H * 0.60, W * 0.32, 60, C.anvil);
  }

  function drawSmith(swing) {
    game.draw.sprite(SMITH, { '#': C.gold }, CX + (swing ? 30 : 0), H * 0.30, 24, { anchor: 'center' });
  }

  // round: {t, dur, flareAt, flareDur, resolved}
  function newRound(idx) {
    var wait = 0.7 + game.random(0, 0.7) - idx * 0.03;
    var flareDur = Math.max(0.30, 0.46 - idx * 0.03);
    return { t: 0, wait: Math.max(0.4, wait), flareDur: flareDur, warned: false, flaring: false, resolved: false, flareT: 0 };
  }

  var round, roundIdx;

  function initGame() {
    struck = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    roundIdx = 0; round = newRound(0);
  }

  function strike(x, y) {
    if (!round || round.resolved || ready > 0 || done || finished) return;
    round.resolved = true;
    if (round.flaring) {
      struck++;
      hitStop = 0.12;
      game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
      game.fx.burst(CX, CY, { color: C.spark, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (struck === Math.ceil(TOTAL / 2)) {
        game.fx.popup('HALFWAY!', CX, CY - 180, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
      if (struck >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); return; }
      roundIdx++; round = newRound(roundIdx);
    } else {
      // 早すぎ・遅すぎの空振り
      hitStop = 0.35;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) strike(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBlade() {
    var hot = round && round.flaring;
    game.draw.rect(CX - 130, CY - 14, 260, 28, hot ? C.bladeHot : C.blade);
    game.draw.rect(CX - 130, CY - 14, 260, 6, '#ffffff30');
    if (round && !round.resolved) {
      var p = round.t / round.wait;
      // telegraph: 予告(点滅+警告色)は本焼き0.5〜0.8秒前から
      if (p > 0.45 && p < 1 && !round.flaring) {
        var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
        if (blink) game.draw.circle(CX, CY, 90, C.warn, 0.35);
      }
      if (round.flaring) {
        game.draw.circle(CX, CY, 100, C.spark, 0.5);
        for (var i = 0; i < 6; i++) {
          var a = i / 6 * Math.PI * 2 + game.time.elapsed * 6;
          game.draw.circle(CX + Math.cos(a) * 70, CY + Math.sin(a) * 70, 8, C.spark);
        }
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.78, press: false, r: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.r) { demo.r = newRound(0); demo.r.wait = 0.9; demo.r.flareDur = 0.4; }
    demo.r.t += dt;
    round = demo.r;
    if (!round.flaring && round.t >= round.wait) {
      round.flaring = true; round.flareT = 0;
      game.audio.tone(880, 0.08, { wave: 'square', volume: 0.05 });
    }
    if (round.flaring) {
      round.flareT += dt;
      if (round.flareT > round.flareDur * 0.4 && !round.resolved) {
        round.resolved = true;
        demo.gx = CX; demo.press = true;
        game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
        game.audio.play('se_good', 0.25);
      }
      if (round.flareT > round.flareDur) { demo.r = null; demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBlade();
      drawSmith(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBlade();
      drawSmith(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(struck + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - struck) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(struck, { struck: struck, total: TOTAL });
        else game.end.failure({ struck: struck, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      round.t += dt;
      if (!round.flaring && round.t >= round.wait) {
        round.flaring = true;
        game.audio.tone(880, 0.08, { wave: 'square', volume: 0.08 });
      }
      if (round.flaring && (round.t - round.wait) > round.flareDur && !round.resolved) {
        // 見逃し
        round.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBlade();
    drawSmith(false);

    txt(struck + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

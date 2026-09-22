// K-X-0003-drum-density-rush.js
// ドラムデンシティラッシュ — 中央と縁を高速で交互に指定する音符を、切らさず打ち抜き続ける
// 操作: 太鼓の中央/縁を交互に指定する音符が高速で流れる。指定面を素早く連続で叩き続ける
// 終わり: 規定回数(12回)を最後まで交互に叩き切れば成功。1回でもリズムが途切れれば失敗
// @mechanic: alternate_tap
// @theme: overdrive_drum_core
// 世界観: 過熱する機関室の太鼓コア。中央と縁を高速で指定する音符が途切れず流れ込み、叩き手はリズムを絶やさず打ち抜き続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 途切れず打ち抜いた回数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#180a10', bg2: '#0c0508', spark: '#ff5a1a',
    drumBody: '#3a2028', drumRim: '#5a3038', drumCenter: '#1a1012',
    note: '#ff3d6a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f0e8f4', ink: '#0a080c',
  };

  var GAME_TITLE = 'DENSITY RUSH';
  var DX = W * 0.5, DY = H * 0.5;
  var R_IN = 110, R_OUT = 190;
  var TOTAL = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SPARK_SPRITE = ['..#..', '.###.', '#####', '.###.', '..#..'];

  function bg(intensity) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) {
      game.draw.rect(0, H * 0.08 + i * 30, W, 2, '#ff5a1a' + (intensity > 0.5 ? '18' : '08'));
    }
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 2.3);
    game.draw.rect(0, 0, W, H, C.spark, 0.02 + 0.04 * pulse);
  }

  function drawDrum(flashZone) {
    game.draw.circle(DX, DY + 12, R_OUT + 10, '#00000050');
    game.draw.circle(DX, DY, R_OUT, flashZone === 'rim' ? C.white : C.drumRim);
    game.draw.circle(DX, DY, R_IN + 6, C.drumBody);
    game.draw.circle(DX, DY, R_IN, flashZone === 'center' ? C.white : C.drumCenter);
    game.draw.sprite(SPARK_SPRITE, { '#': C.spark }, DX, DY - R_OUT - 60, 10, { anchor: 'center' });
  }

  var expected, streak, done, endWait, finished, beatT, interval;
  var ready, hitStop, shake, milestoneShown, hitFlash, flashT;

  function initGame() {
    expected = 'center'; streak = 0; done = false; endWait = 0; finished = false;
    beatT = 0; interval = 0.62;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; hitFlash = null; flashT = 0;
  }

  function tryHit(x, y) {
    if (ready > 0 || done || finished || hitStop > 0) return;
    var d = Math.hypot(x - DX, y - DY);
    var zone = d <= R_IN ? 'center' : (d <= R_OUT ? 'rim' : null);
    if (!zone) { game.audio.play('se_tap', 0.06); return; }
    var p = beatT / interval;
    var win = p >= 0.4 && p <= 1.15;
    hitFlash = zone; flashT = 0.12;
    if (win && zone === expected) {
      streak++;
      hitStop = 0.05;
      game.feedback.good(DX, DY, { text: streak % 4 === 0 ? 'PERFECT' : 'GOOD', color: streak % 4 === 0 ? C.gold : C.good });
      game.audio.play(streak % 4 === 0 ? 'se_milestone' : 'se_good', 0.3);
      interval = Math.max(0.4, interval - 0.008);
      if (!milestoneShown && streak >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup(streak + ' / ' + TOTAL, DX, H * 0.18, { color: C.gold, size: 36 });
      }
      if (streak >= TOTAL) { ok = true; finished = true; finish(); return; }
      expected = expected === 'center' ? 'rim' : 'center';
      beatT = 0;
    } else {
      hitStop = 0.26;
      game.feedback.bad(DX, DY, { text: 'MISS' });
      shake = 0.22;
      game.audio.play('se_bad', 0.35);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) tryHit(x, y); });

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

  var demo = { t: 0, gx: DX, gy: DY, press: false, lit: 'center', bt: 0, iv: 0.62, streak: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { demo.lit = 'center'; demo.bt = 0; demo.iv = 0.62; demo.streak = 0; }
    demo.bt += dt;
    var p = demo.bt / demo.iv;
    demo.press = p >= 0.35 && p <= 0.55;
    if (p >= 0.55 && !demo.did) {
      demo.did = true;
      game.feedback.good(DX, DY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.18);
    }
    if (p >= 1) {
      demo.bt = 0; demo.lit = demo.lit === 'center' ? 'rim' : 'center'; demo.streak++; demo.did = false;
    }
    demo.gy = demo.lit === 'center' ? DY : DY - 150;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      bg(1);
      drawDrum(demo.press ? demo.lit : null);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
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
      bg(0);
      drawDrum(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(streak + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - streak) + '打!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(streak, { streak: streak, total: TOTAL });
        else game.end.failure({ streak: streak, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      if (beatT / interval >= 1.3) {
        hitStop = 0.26;
        shake = 0.22;
        game.feedback.bad(DX, DY, { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        ok = false; finished = true; finish();
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg(streak / TOTAL);
    drawDrum(flashT > 0 ? hitFlash : null);

    txt(streak + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (streak / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.12], ['E4', 0.12], ['B3', 0.12], ['E4', 0.24]], { tempo: 168, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

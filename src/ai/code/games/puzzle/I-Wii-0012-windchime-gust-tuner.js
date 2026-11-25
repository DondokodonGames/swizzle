// I-Wii-0012-windchime-gust-tuner.js
// ウィンドチャイム・ガストチューナー — 葉が揺れた側から風が来た瞬間、その方向へ払って鳴らす
// 操作: 揺れる葉で予告された側(左/右)へ、風が吹いた瞬間に画面をその方向へスワイプする
// 終わり: 規定回数(5回)全て正しい方向・タイミングで鳴らせれば成功。逆方向/タイミングを外せば失敗
// @mechanic: swipe_direction
// @theme: rooftop_windchime_tuning
// 世界観: 屋根の上の風鈴調律士キャラクター。葉の揺れで予告された側から風が来た瞬間、その方向へ払って澄んだ音を鳴らす
// 残るもの: 正誤(CLEAR/GAME OVER) + 鳴らせた回数、連続成功の最高コンボ
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#101820', bg2: '#182430', roof: '#2a3a48', chime: '#8ac8ff', chimeGlow: '#c8e8ff',
    leaf: '#4dd68a', accent: '#ff9d3d', bad: '#ff4d5e', good: '#4dff8a',
    gold: '#ffd400', white: '#f0f4f8', ink: '#080c10',
  };

  var GAME_TITLE = 'GUST TUNER';
  var TOTAL = 5;
  var CX = W * 0.5, CHIME_Y = H * 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var rung, done, endWait, finished, combo, bestCombo;
  var ready, hitStop, shake, chimeSwing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TUNER_SPRITE = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.roof);
    game.draw.line(0, H * 0.7, W, H * 0.68, C.roof, 10);
  }

  // gust: dir=-1(左から)/1(右から)。t/dur=0→1、telegraph=葉の揺れ(0.5〜0.8秒前)
  function newGust() {
    var dir = Math.random() < 0.5 ? -1 : 1;
    return { dir: dir, t: 0, dur: Math.max(0.6, 1.0 - round * 0.06), telegraphed: false, resolved: false };
  }

  var round, gust;

  function initGame() {
    rung = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; combo = 0; bestCombo = 0; chimeSwing = 0;
    round = 0; gust = newGust();
  }

  function resolveGust(swipeDir) {
    if (!gust || gust.resolved || ready > 0 || done || finished) return;
    gust.resolved = true;
    var correct = (swipeDir === gust.dir);
    hitStop = correct ? 0.12 : 0.32;
    chimeSwing = gust.dir * 26;
    if (correct) {
      rung++; combo++; if (combo > bestCombo) bestCombo = combo;
      game.feedback.good(CX, CHIME_Y, { text: 'RING', color: C.good });
      game.fx.burst(CX, CHIME_Y, { color: C.chimeGlow, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (combo === 3) {
        game.fx.popup('FEVER!', CX, CHIME_Y - 160, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
      if (rung === Math.ceil(TOTAL / 2) && combo !== 3) {
        game.fx.popup('HALFWAY!', CX, CHIME_Y - 160, { color: C.gold, size: 36 });
      }
    } else {
      combo = 0;
      game.feedback.bad(CX, CHIME_Y, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (rung >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    gust = newGust();
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (dir === 'left') resolveGust(-1);
    else if (dir === 'right') resolveGust(1);
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

  function drawLeaves(g) {
    if (!g) return;
    var p = g.t / g.dur;
    if (p > 0.3 && p < 0.85) {
      var lx = g.dir < 0 ? W * 0.15 : W * 0.85;
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      var wob = Math.sin(game.time.elapsed * 14) * 14;
      if (blink) game.draw.circle(lx + wob, H * 0.55, 26, C.leaf, 0.7);
    }
  }

  function drawChime(swing) {
    game.draw.line(CX, H * 0.28, CX + swing * 0.3, H * 0.5, C.chime, 6);
    game.draw.circle(CX + swing, CHIME_Y + 30, 26, C.chimeGlow);
    game.draw.sprite(TUNER_SPRITE, { '#': C.accent }, CX, H * 0.84, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.6, press: false, g: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.g) { demo.g = newGust(); demo.g.dur = 0.9; round = 0; }
    demo.g.t += dt;
    gust = demo.g;
    var p = demo.g.t / demo.g.dur;
    if (p > 0.55 && p < 0.68 && !demo.g.telegraphed) {
      demo.g.telegraphed = true;
      demo.gx = CX + demo.g.dir * 220;
      demo.press = true;
      chimeSwing = demo.g.dir * 26;
      game.feedback.good(CX, CHIME_Y, { text: 'RING', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.g = null; demo.press = false; demo.gx = CX; chimeSwing = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLeaves(gust);
      drawChime(chimeSwing);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawChime(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(rung + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - rung) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(rung, { rung: rung, total: TOTAL, bestCombo: bestCombo });
        else game.end.failure({ rung: rung, total: TOTAL, bestCombo: bestCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      gust.t += dt;
      if (gust.t / gust.dur >= 1 && !gust.resolved) {
        gust.resolved = true;
        hitStop = 0.32;
        combo = 0;
        game.feedback.bad(CX, CHIME_Y, { text: 'MISS' });
        shake = 0.28;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (chimeSwing !== 0) chimeSwing *= 0.88;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawLeaves(gust);
    drawChime(chimeSwing);

    txt(rung + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (rung / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.3], ['A5', 0.6]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

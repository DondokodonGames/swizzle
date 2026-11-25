// K-GBA-0016-waltz-wand-cast.js
// ワルツ詠唱 — 三拍子の一拍目(強拍)に合わせて杖を振り下ろし、魔法陣を輝かせる
// 操作: 三拍子のリズムを聞き、一拍目(強拍)のタイミングだけタップして杖を振る
// 終わり: 規定回数(6回)強拍を正しく捉えれば成功。強拍を2回外せば失敗
// @mechanic: rhythm
// @theme: apprentice_waltz_spellcast
// 世界観: 見習い魔術師の塔の一室。三拍子の魔力の鼓動に合わせて杖を振り、一拍目だけで魔法陣を輝かせる詠唱術
// 残るもの: 正誤(CLEAR/GAME OVER) + 捉えた強拍の回数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画のみ。塗りを使わず輪郭で見せる
  var C = {
    bg: '#050506', line: '#39d6ff', lineDim: '#123844', accent: '#ff3df0',
    good: '#3dffb0', bad: '#ff3d5c', gold: '#ffe23d', white: '#eafcff', ink: '#020204',
  };

  var GAME_TITLE = 'WALTZ CAST';
  var NEEDED = 6;
  var ROUNDS = 7;
  var MISS_LIMIT = 2;
  var CX = W * 0.5, WY = H * 0.42;
  var BEAT = 0.6;
  var MEASURE = BEAT * 3;
  var WIN = 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var MAGE = ['.##.', '####', '.##.', '#.#.', '#.#.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function ring(x, y, r, color, alpha) {
    game.draw.circle(x, y, r, color, alpha === undefined ? 1 : alpha);
    game.draw.circle(x, y, r - 6, C.bg, 1);
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#0a0a10']]);
    ring(CX, WY, 340, C.lineDim, 0.5);
    ring(CX, WY, 250, C.lineDim, 0.4);
  }

  var round, roundT, resolved, hits, misses, beatFlash, wandSwing;
  var done, endWait, finished;
  var ready, hitStop, shake, flashState;

  function newRound() { roundT = 0; resolved = false; }

  function initGame() {
    round = 0; hits = 0; misses = 0; beatFlash = 0; wandSwing = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0;
    newRound();
  }

  function resolveTap() {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || resolved) return;
    game.audio.play('se_tap', 0.1);
    resolved = true;
    wandSwing = 1;
    if (roundT <= WIN) {
      hits++; hitStop = 0.08; flashState = 1;
      game.feedback.good(CX, WY, { text: 'PERFECT', color: C.good });
      game.fx.burst(CX, WY, { color: C.accent, count: 16, speed: 300 });
      game.audio.tone('C5', 0.2, { wave: 'sine', volume: 0.15 });
      if (hits === 3) game.fx.popup(hits + ' / ' + NEEDED, CX, WY - 220, { color: C.gold, size: 40 });
      if (hits >= NEEDED) { ok = true; finished = true; finish(); return; }
    } else {
      misses++; hitStop = 0.2; flashState = -1;
      game.feedback.bad(CX, WY, { text: 'MISS' });
      shake = 0.15;
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (wandSwing > 0) wandSwing -= dt * 3;
    if (finished) return;
    roundT += dt;
    if (roundT >= BEAT && roundT < BEAT + dt) { beatFlash = 1; game.audio.tone('E4', 0.1, { wave: 'triangle', volume: 0.06 }); }
    if (roundT >= BEAT * 2 && roundT < BEAT * 2 + dt) { beatFlash = 1; game.audio.tone('G4', 0.1, { wave: 'triangle', volume: 0.06 }); }
    if (!resolved && roundT > WIN) {
      resolved = true; misses++; flashState = -1;
      game.feedback.bad(CX, WY, { text: 'MISS' });
      shake = 0.12;
      game.audio.play('se_bad', 0.25);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
    if (roundT >= MEASURE) {
      round++;
      if (round >= ROUNDS) {
        // 規定測を使い切った(理論上は最終強拍で既にhits>=NEEDEDのはず)
        ok = hits >= NEEDED; finished = true; finish(); return;
      }
      newRound();
      game.audio.tone('C4', 0.14, { wave: 'square', volume: 0.1 }); beatFlash = 1;
    }
  }

  function drawScene() {
    var pulse = roundT < 0.15 ? (1 - roundT / 0.15) : 0;
    ring(CX, WY, 170 + pulse * 40, flashState > 0 ? C.good : (flashState < 0 ? C.bad : C.line), 0.7);
    if (flashState !== 0) game.draw.circle(CX, WY, 200, flashState > 0 ? C.good : C.bad, 0.2);
    game.draw.sprite(MAGE, { '#': C.white }, CX, H * 0.66, 26, { anchor: 'center' });
    var tipX = CX + Math.sin(wandSwing * 3) * 60;
    var tipY = WY + 90 - wandSwing * 60;
    game.draw.line(CX, H * 0.66 - 10, tipX, tipY, C.line, 6);
    game.draw.circle(tipX, tipY, 10, C.accent);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, dRoundT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % MEASURE;
    if (cyc < dt || demo.t <= dt) { demo.dRoundT = 0; wandSwing = 0; flashState = 0; }
    demo.dRoundT += dt;
    roundT = demo.dRoundT;
    beatFlash = 0;
    if (roundT < 0.06) { demo.gx = CX; demo.gy = WY; demo.press = true; wandSwing = 1; flashState = 1; }
    else if (roundT < 0.3) { demo.press = false; }
    else { demo.gx = CX; demo.gy = H * 0.86; }
    if (roundT >= BEAT && roundT < BEAT + dt) game.audio.tone('E4', 0.1, { wave: 'triangle', volume: 0.05 });
    if (roundT >= BEAT * 2 && roundT < BEAT * 2 + dt) game.audio.tone('G4', 0.1, { wave: 'triangle', volume: 0.05 });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + NEEDED : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + '拍!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses, needed: NEEDED });
        else game.end.failure({ hits: hits, misses: misses, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (flashState !== 0) flashState *= 0.85;

    bg();
    drawScene();

    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / NEEDED), 14, C.gold);
    for (var i = 0; i < MISS_LIMIT; i++) {
      game.draw.circle(W - 60 - i * 40, 180, 12, i < misses ? C.bad : C.lineDim);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 1], ['E4', 0.5], ['G4', 0.5], ['C5', 1]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

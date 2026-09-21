// K-DS-0006-flock-signal-hold.js
// フロックシグナル — 渡り鳥の羽ばたき周期を見極め、合図を送って隊列を保たせる
// 操作: 合図灯がフルチャージになった瞬間だけタップして群れに合図を送る。早押しは連打禁止
// 終わり: 規定回数(8回)正しく合図を送れば成功。3回早押し/送り損ねれば隊列が乱れて失敗
// @mechanic: cooldown_tap
// @theme: migratory_flock_guide
// 世界観: 渡り鳥の群れを先導する誘導灯係。羽ばたきの周期に合わせて合図灯を送り、隊列の乱れを防ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく送れた合図の回数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの空、輪郭のあるスプライト
  var C = {
    sky1: '#7ec8ff', sky2: '#c8ecff', cloud: '#ffffff',
    bird: '#3a3a48', birdWing: '#5a5a70', lead: '#ffb020',
    signal: '#ffe066', signalDim: '#8a6a1a',
    good: '#3ddc6a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#151515',
  };

  var GAME_TITLE = 'FLOCK SIGNAL';
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var LATE_WINDOW = 0.55;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BIRD = ['#...#', '##.##', '.###.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    for (var i = 0; i < 4; i++) {
      var cx = W * (0.15 + i * 0.28), cy = H * (0.15 + (i % 2) * 0.06);
      game.draw.circle(cx, cy, 44, C.cloud, 0.55);
      game.draw.circle(cx + 40, cy + 6, 34, C.cloud, 0.5);
    }
  }

  var round, misses, cdT, cooldown, ready, resolved, tight, flapPhase, done, endWait, finished, readyIn, hitStop, shake, flashOk, flashT;

  function newCooldown() { return 0.75 + Math.random() * 0.4; }

  function initGame() {
    round = 0; misses = 0; cdT = newCooldown(); cooldown = cdT; ready = false; resolved = false;
    tight = 1; flapPhase = 0;
    done = false; endWait = 0; finished = false;
    readyIn = 0.8; hitStop = 0; shake = 0; flashOk = true; flashT = 0;
  }

  function scatter(amount) { tight = Math.max(0.15, tight - amount); }
  function converge(amount) { tight = Math.min(1, tight + amount); }

  function signal() {
    if (readyIn > 0 || done || finished || hitStop > 0) return;
    if (ready && !resolved) {
      resolved = true; round++;
      hitStop = 0.08;
      flashOk = true; flashT = 0.15;
      converge(0.35);
      game.feedback.good(CX, CY - 200, { text: 'GOOD' });
      game.audio.play('se_tap', 0.2);
      if (round === Math.floor(TOTAL / 2)) { game.fx.popup(round + ' / ' + TOTAL, CX, CY - 260, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
      cdT = newCooldown(); cooldown = cdT; ready = false; resolved = false;
    } else if (!ready) {
      misses++;
      hitStop = 0.22; shake = 0.15;
      flashOk = false; flashT = 0.2;
      scatter(0.45);
      game.feedback.bad(CX, CY - 200, { text: 'EARLY' });
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      cdT = newCooldown(); cooldown = cdT; ready = false; resolved = false;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) signal();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function stepRound(dt) {
    flapPhase += dt * 3;
    if (!ready) {
      cdT -= dt;
      if (cdT <= 0) { ready = true; resolved = false; cdT = 0; game.audio.play('se_powerup', 0.15); }
    } else {
      cdT += dt;
      if (cdT >= LATE_WINDOW && !resolved) {
        resolved = true; misses++;
        hitStop = 0.22; shake = 0.15;
        flashOk = false; flashT = 0.2;
        scatter(0.4);
        game.feedback.bad(CX, CY - 200, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
        cdT = newCooldown(); cooldown = cdT; ready = false; resolved = false;
      }
    }
    converge(dt * 0.05);
  }

  var demo = { t: 0, gx: CX, gy: CY - 200, press: false, cdT: 0.9, ready: false, resolved: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.cdT = 0.9; demo.ready = false; demo.resolved = false; }
    flapPhase += dt * 3;
    demo.press = false;
    if (!demo.ready) {
      demo.cdT -= dt;
      if (demo.cdT <= 0) { demo.ready = true; demo.resolved = false; }
    } else if (!demo.resolved) {
      demo.resolved = true; demo.press = true;
      game.feedback.good(CX, CY - 200, { text: 'GOOD' });
      game.audio.play('se_tap', 0.1);
    }
    ready = demo.ready; cdT = demo.cdT;
  }

  function drawFlock() {
    var spread = 70 * (0.4 + tight * 0.9);
    for (var i = -2; i <= 2; i++) {
      var bx = CX + i * spread * (1 + Math.abs(i) * 0.15);
      var by = CY + Math.abs(i) * spread * 0.55 + Math.sin(flapPhase + i) * 8;
      game.draw.sprite(BIRD, { '#': i === 0 ? C.lead : C.bird }, bx, by, i === 0 ? 20 : 15, { anchor: 'center' });
    }
    var glow = ready ? (0.5 + 0.4 * Math.sin(game.time.elapsed * 14)) : 0.3;
    game.draw.circle(CX, CY - 200, 44, ready ? C.signal : C.signalDim, glow);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFlock();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFlock();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.ink);
      if (!ok && TOTAL - round <= 3) txt('あと' + (TOTAL - round) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { signals: round, total: TOTAL, misses: misses });
        else game.end.failure({ signals: round, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (readyIn > 0) {
      readyIn -= dt;
      if (readyIn <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawFlock();
    if (flashT > 0) game.draw.circle(CX, CY - 200, 60, flashOk ? C.good : C.bad, 0.3);

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.35);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#00000030');
    }
    if (readyIn > 0) txt(readyIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.4]], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

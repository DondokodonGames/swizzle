// I-Wii-0013-rune-lever-flip.js
// ルーンレバー・フリップ — 金庫の回転レバーを、冷え切った合図が出た瞬間だけひねって刻印を裏返す
// 操作: レバーの光る環が一周して合図が出た瞬間だけタップしてひねる。早すぎるとレバーが空回りして詰まる
// 終わり: 制限時間内に規定回数(7回)ひねれれば成功。詰まりが3回重なるか時間切れで失敗
// @mechanic: cooldown_tap
// @theme: vault_rune_lever
// 世界観: 地下金庫の番人モグラ。回転レバーの環が満ちた合図の瞬間だけひねって壁の刻印を裏返し、宝物庫を解錠する
// 残るもの: 正誤(CLEAR/GAME OVER) + ひねれた回数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ、高解像度・低色数、細線とテキスト枠のUI
  var C = {
    bg: '#0a0a14', bg2: '#12122a', panel: '#1c1c3a', line: '#3a3a6a',
    mole: '#8a6a4a', moleDark: '#5a4230', lever: '#ffcc33', rune: '#33ccff',
    bad: '#ff3355', good: '#33ff88', gold: '#ffcc33', white: '#e8e8ff', ink: '#04040a',
  };

  var GAME_TITLE = 'RUNE LEVER';
  var DURATION = 12;
  var NEEDED = 7;
  var COOLDOWN = 0.85;
  var JAM_LIMIT = 3;
  var CX = W * 0.5, LEVER_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var timeLeft, flips, jamCount, cooldownT, done, endWait, finished;
  var ready, hitStop, shake, halfShown, leverSpin;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MOLE_SPRITE = ['.####.', '######', '.#..#.', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(W * 0.5 - 260, H * 0.2, 520, 380, C.panel, 0.6);
    for (var i = 0; i < 5; i++) game.draw.line(W * 0.5 - 260, H * 0.2 + i * 76, W * 0.5 + 260, H * 0.2 + i * 76, C.line, 2);
  }

  function initGame() {
    timeLeft = DURATION; flips = 0; jamCount = 0; cooldownT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false; leverSpin = 0;
  }

  function resolveTap() {
    if (ready > 0 || done || finished) return;
    game.audio.play('se_tap', 0.15);
    if (cooldownT <= 0) {
      flips++;
      cooldownT = COOLDOWN;
      leverSpin = 1;
      game.feedback.good(CX, LEVER_Y, { text: '', size: 18 });
      game.fx.burst(CX, LEVER_Y, { color: C.rune, count: 12, speed: 280 });
      game.audio.play('se_powerup', 0.35);
      if (!halfShown && flips >= Math.ceil(NEEDED / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, H * 0.18, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
      if (flips >= NEEDED) {
        finished = true; ok = true; hitStop = 0.15;
        game.feedback.good(CX, LEVER_Y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_good', 0.4);
        finish();
      }
    } else {
      jamCount++;
      cooldownT += 0.35;
      shake = 0.2;
      game.feedback.bad(CX, LEVER_Y, { text: '' });
      game.audio.play('se_bad', 0.3);
      if (jamCount >= JAM_LIMIT) {
        finished = true; ok = false;
        hitStop = 0.4; shake = 0.35;
        game.feedback.bad(CX, LEVER_Y, { text: 'MISS' });
        game.audio.play('se_break', 0.4);
        finish();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLever(spin) {
    var ringP = 1 - Math.max(0, cooldownT / COOLDOWN);
    var warn = cooldownT > 0 && cooldownT < 0.22;
    game.draw.circle(CX, LEVER_Y, 110, C.line, 0.5);
    game.draw.circle(CX, LEVER_Y, 100, warn ? (Math.floor(game.time.elapsed * 14) % 2 === 0 ? C.rune : C.panel) : C.panel, 0.8);
    game.draw.circle(CX, LEVER_Y, 92 * Math.max(0.15, ringP), cooldownT <= 0 ? C.rune : C.line, 0.7);
    var ang = spin * 40;
    game.draw.line(CX, LEVER_Y, CX + ang * 1.6, LEVER_Y - 70, C.lever, 12);
    game.draw.circle(CX, LEVER_Y, 18, C.lever);
  }

  function drawJams() {
    for (var i = 0; i < JAM_LIMIT; i++) {
      game.draw.circle(W * 0.5 - 40 + i * 40, H * 0.68, 10, i < jamCount ? C.bad : C.line, i < jamCount ? 1 : 0.5);
    }
  }

  function drawMole() {
    game.draw.sprite(MOLE_SPRITE, { '#': C.mole }, CX, H * 0.86, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.42, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { cooldownT = 0; flips = 0; jamCount = 0; }
    if (cooldownT > 0) cooldownT -= dt;
    if (cooldownT <= 0 && !demo.acted) {
      demo.acted = true;
      demo.press = true;
      leverSpin = 1;
      cooldownT = COOLDOWN;
      flips++;
      game.feedback.good(CX, LEVER_Y, { text: '', size: 18 });
      game.audio.play('se_powerup', 0.2);
    }
    if (cooldownT > COOLDOWN * 0.5) { demo.acted = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (leverSpin !== 0) { leverSpin *= 0.86; if (Math.abs(leverSpin) < 0.02) leverSpin = 0; }
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLever(leverSpin);
      drawMole();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawMole();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(flips + ' / ' + NEEDED, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - flips) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(flips, { flips: flips, jams: jamCount });
        else game.end.failure({ flips: flips, jams: jamCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (cooldownT > 0) cooldownT -= dt;
      timeLeft -= dt;
      if (timeLeft <= 0) {
        finished = true; ok = false;
        hitStop = 0.35; shake = 0.3;
        game.feedback.bad(CX, LEVER_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLever(leverSpin);
    drawJams();
    drawMole();

    txt(flips + ' / ' + NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DURATION), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

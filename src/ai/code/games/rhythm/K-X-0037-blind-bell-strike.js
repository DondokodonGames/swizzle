// K-X-0037-blind-bell-strike.js
// ブラインドベルストライク — 目隠しの鐘つき番。響く一打の合図の瞬間だけを頼りにタップする
// 操作: 画面はほぼ暗転。合図の鐘音が鳴った、その瞬間にタップする(視覚はほぼ使わない)
// 終わり: 規定5打を音のタイミングだけで正確に打てれば成功。早押し/見送りが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: blind_bell_ringer
// 世界観: 真っ暗な鐘楼に目隠しで立つ鐘つき番。合図の残響だけを頼りに、鳴った瞬間を逃さず撞木を打ち込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 正確に打てた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: ほぼ漆黒。白の輪郭線のみで最小限に描く(目隠しの暗闇を体現)
  var C = {
    bg: '#000000', bg2: '#030303', ink: '#000000', line: '#ffffff',
    good: '#39ff6a', bad: '#ff4455', gold: '#ffe066', white: '#ffffff', dim: '#1a1a1a',
  };

  var GAME_TITLE = 'BLIND BELL';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.46;
  var WAIT_MIN = 0.6, WAIT_MAX = 1.6;
  var WINDOW_SEC = 0.32;
  var TIMEOUT_SEC = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var solved, done, endWait, finished, cue, round;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RINGER = ['.####.', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var bob = Math.sin(game.time.elapsed * 2.0) * 12;
    game.draw.sprite(RINGER, { '#': C.dim }, CX, CY + 200 + bob, 16, { anchor: 'center' });
    game.draw.circle(CX, CY, 260, C.line, 0.04);
  }

  function newCue() {
    return { wait: game.random(WAIT_MIN, WAIT_MAX), t: 0, rung: false, resolved: false, ringT: -1 };
  }

  function initGame() {
    solved = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0;
    cue = newCue();
  }

  function ringBell() {
    cue.rung = true; cue.ringT = 0;
    game.audio.tone(660, 0.25, { wave: 'sine', volume: 0.35 });
    game.fx.flash('#ffffff', 0.08);
  }

  function resolveTap() {
    if (!cue || cue.resolved || ready > 0 || done || finished) return;
    cue.resolved = true;
    if (cue.rung && cue.ringT >= 0 && cue.ringT <= WINDOW_SEC) {
      solved++; hitStop = 0.08;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (solved === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
      if (solved >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      cue = newCue();
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
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

  var demo = { t: 0, gx: CX, gy: CY, press: false, c: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.c) { demo.c = newCue(); demo.c.wait = 0.8; }
    demo.c.t += dt;
    cue = demo.c;
    if (demo.c.t >= demo.c.wait && !demo.c.rung) {
      demo.c.rung = true; demo.c.ringT = 0;
      game.audio.tone(660, 0.25, { wave: 'sine', volume: 0.2 });
    }
    if (demo.c.rung) {
      demo.c.ringT += dt;
      if (demo.c.ringT > 0.12 && !demo.c.telegraphed) {
        demo.c.telegraphed = true;
        demo.press = true;
        game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      if (demo.c.ringT > 0.5) { demo.c = null; demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(solved + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - solved) + '打!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(solved * 20, { solved: solved, total: TOTAL });
        else game.end.failure({ solved: solved, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cue.t += dt;
      if (!cue.rung && cue.t >= cue.wait) ringBell();
      if (cue.rung) {
        cue.ringT += dt;
        if (cue.ringT > WINDOW_SEC && !cue.resolved) {
          // 聞き逃した(タップせず窓を通過)
          cue.resolved = true;
          hitStop = 0.35; shake = 0.3;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      } else if (cue.t > TIMEOUT_SEC) {
        // 安全装置: 合図が異常に長引いた場合のタイムアウト
        cue.resolved = true;
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    txt(solved + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (solved / TOTAL), 16, C.gold);
    if (!finished && cue && cue.rung) {
      var pulse = Math.max(0, 1 - cue.ringT / WINDOW_SEC);
      game.draw.circle(CX, CY, 60 + (1 - pulse) * 160, C.line, 0.15 * pulse + 0.03);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.85, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.035);
    state = S.ATTRACT;
    initGame();
  });
})(game);

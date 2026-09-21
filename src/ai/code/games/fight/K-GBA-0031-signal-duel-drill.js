// K-GBA-0031-signal-duel-drill.js
// 合図連続稽古 — 師範の手の合図が次々切り替わる中、出た方向へその都度素早く正確にスワイプする
// 操作: 光る矢印の合図が出た瞬間、同じ向きへスワイプする。合図の向きは毎回ランダムに切り替わる
// 終わり: 規定数(9回)正しく反応すれば成功。3回間違えるか反応が遅れれば失敗
// @mechanic: swipe_direction
// @theme: signal_duel_drill
// 世界観: 稽古場で師範と向き合う弟子。矢継ぎ早に切り替わる手の合図それぞれに、正しい向きへ瞬時にスワイプして応じる反射稽古
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく応じた回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・革・金属を模した質感、太い縁取りと内側の光沢帯
  var C = {
    bg1: '#4a3020', bg2: '#2c1a10', wood: '#5a3a24', woodDark: '#3a2414',
    master: '#c8a068', arrow: '#e8c860', arrowGlow: '#3a2410',
    good: '#5ac98a', bad: '#e85a48', gold: '#e8c860', white: '#f4ead8', ink: '#1c1008',
  };

  var GAME_TITLE = 'SIGNAL DRILL';
  var TOTAL = 9;
  var MAX_MISS = 3;
  var CX = W * 0.5, CY = H * 0.42;
  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, missed, done, endWait, finished, ready, hitStop, shake;
  var round, cue, cueT, cueDur, resolved;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MASTER_SPRITE = ['..##..', '.####.', '..##..', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10) + 6, C.woodDark, 3);
    game.draw.rect(40, 40, W - 80, H - 80, C.wood, 0.06);
  }

  function newCue(prev) {
    var d;
    do { d = DIRS[Math.floor(game.random(0, 4))]; } while (d === prev);
    return d;
  }

  function initGame() {
    cleared = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; cue = newCue(null); cueT = 0; cueDur = 1.05; resolved = false;
  }

  function resolveSwipe(dir) {
    if (ready > 0 || done || finished || resolved) return;
    resolved = true;
    var correct = (dir === cue);
    hitStop = correct ? 0.1 : 0.32;
    if (correct) {
      cleared++;
      game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 40 });
    } else {
      missed++;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct && missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    cue = newCue(cue); cueT = 0; cueDur = Math.max(0.62, 1.05 - round * 0.035); resolved = false;
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    resolveSwipe(dir);
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

  function drawCue(d, t, dur) {
    if (!d) return;
    var v = DIR_VEC[d];
    var p = Math.min(1, t / dur);
    if (p > 0.3) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      var glowR = 90 + (1 - p) * 60;
      if (blink) game.draw.circle(CX + v.x * 200, CY + v.y * 200, glowR, C.arrowGlow, 0.4);
    }
    var ax = CX + v.x * 200, ay = CY + v.y * 200;
    game.draw.line(CX + v.x * 60, CY + v.y * 60, ax, ay, C.arrow, 14);
    game.draw.circle(ax, ay, 26, C.arrow);
  }

  function drawMaster() {
    game.draw.sprite(MASTER_SPRITE, { '#': C.master }, CX, H * 0.66, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.6, press: false, k: null, prevDir: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.k) { demo.k = newCue(demo.prevDir); demo.prevDir = demo.k; cue = demo.k; cueDur = 0.95; cueT = 0; round = 0; }
    cueT += dt; cue = demo.k;
    var p = cueT / cueDur;
    if (p > 0.55 && p < 0.7 && !demo.telegraphed) {
      demo.telegraphed = true;
      var v = DIR_VEC[demo.k];
      demo.gx = CX + v.x * 220; demo.gy = H * 0.6 + v.y * 220; demo.press = true;
      game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.k = null; demo.press = false; demo.gx = CX; demo.gy = H * 0.6; demo.telegraphed = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawMaster();
      drawCue(cue, cueT, cueDur);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawMaster();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, missed: missed }); else game.end.failure({ cleared: cleared, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cueT += dt;
      if (cueT / cueDur >= 1 && !resolved) {
        resolved = true;
        missed++;
        hitStop = 0.32;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.28;
        game.audio.play('se_bad', 0.4);
        if (missed >= MAX_MISS) { ok = false; finished = true; finish(); }
        else { round++; cue = newCue(cue); cueT = 0; cueDur = Math.max(0.62, 1.05 - round * 0.035); resolved = false; }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMaster();
    if (!finished) drawCue(cue, cueT, cueDur);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < missed ? C.bad : C.ink, i < missed ? 1 : 0.4);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.82, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.3], ['A3', 0.3], ['C4', 0.3], ['F4', 0.6]], { tempo: 142, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

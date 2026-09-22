// K-DS-0049-mirror-gesture-duel.js
// ミラージェスチャー・デュエル — 影武者が出す合図の方向を見て、寸分違わず同じ方向へ手を払い返す
// 操作: 相手の影武者が腕を振った方向を見て、同じ向きへスワイプして動作を返す
// 終わり: 規定回数(6回)を正しく合わせれば成功。3回外せば失敗
// @mechanic: swipe_direction
// @theme: mirror_dojo_duel
// 世界観: 鏡張りの道場。向き合う影武者が出す合図の腕振りに、寸分違わず同じ方向で応じる鏡合わせの稽古
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁+フラットな2段階陰影、彩度中庸
  var C = {
    bg: '#dfe8f0', bg2: '#b9ccdc', floor: '#8fa6ba', mirror: '#eef6fb',
    rival: '#4a5a72', rivalDark: '#2c3648', player: '#e6883d', playerDark: '#a85a1e',
    good: '#3fbf5c', bad: '#e0435a', gold: '#f0b400', white: '#ffffff', ink: '#1a2230',
  };

  var GAME_TITLE = 'MIRROR DUEL';
  var TOTAL = 6;
  var MAX_MISS = 3;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIVAL_SPRITE = ['.##.', '####', '.##.', '.##.'];
  var DIR_VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  var DIR_LIST = ['up', 'down', 'left', 'right'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.62, W, H * 0.2, C.floor, 0.5);
    game.draw.rect(W * 0.1, H * 0.14, W * 0.8, H * 0.4, C.mirror, 0.35);
    game.draw.line(W * 0.1, H * 0.14, W * 0.9, H * 0.14, C.rivalDark, 4);
    game.draw.line(W * 0.1, H * 0.54, W * 0.9, H * 0.54, C.rivalDark, 4);
  }

  var rounds, hits, missCount, done, endWait, finished;
  var ready, hitStop, shake;
  var cue, cueT, cuePhase; // cuePhase: 'show'|'wait'|'resolved'
  var armSwing;

  function newCue() {
    return DIR_LIST[Math.floor(game.random(0, 4))];
  }

  function initGame() {
    rounds = 0; hits = 0; missCount = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    cue = newCue(); cueT = 0; cuePhase = 'show'; armSwing = 0;
  }

  function resolveInput(dir) {
    if (cuePhase !== 'wait' || ready > 0 || done || finished) return;
    cuePhase = 'resolved';
    lastDir = dir; lastAmt = 1;
    var correct = (dir === cue);
    hitStop = correct ? 0.1 : 0.32;
    if (correct) {
      hits++;
      game.feedback.good(CX, CY, { text: 'MATCH', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
    } else {
      missCount++;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    rounds++;
    if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    cue = newCue(); cueT = 0; cuePhase = 'show';
  }

  game.onSwipe(function(dir) { if (state === S.PLAYING) resolveInput(dir); });

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

  function drawRival(dir, swing) {
    game.draw.sprite(RIVAL_SPRITE, { '#': C.rivalDark }, CX, CY, 30, { anchor: 'center' });
    if (dir && swing > 0.05) {
      var v = DIR_VEC[dir];
      game.draw.line(CX, CY, CX + v.x * 130 * swing, CY + v.y * 130 * swing, C.rival, 16);
      if (swing > 0.4) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.line(CX + v.x * 150, CY + v.y * 150, CX + v.x * 210, CY + v.y * 210, C.bad, 8);
      }
    }
  }

  function drawPlayerArm(dir, amt) {
    var py = H * 0.86;
    game.draw.sprite(['.##.', '####', '.##.'], { '#': C.playerDark }, CX, py, 26, { anchor: 'center' });
    if (dir && amt > 0.05) {
      var v = DIR_VEC[dir];
      game.draw.line(CX, py, CX + v.x * 100 * amt, py + v.y * 100 * amt, C.player, 14);
    }
  }

  var lastDir = null, lastAmt = 0;

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, phase: 'wait', dir: 'up' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      demo.dir = DIR_LIST[Math.floor(game.random(0, 4))];
      demo.press = false; armSwing = 0; lastAmt = 0;
    }
    var showEnd = 1.3, actEnd = 1.7;
    if (cyc < showEnd) {
      armSwing = Math.min(1, cyc / showEnd);
    } else if (cyc < actEnd) {
      var p = (cyc - showEnd) / (actEnd - showEnd);
      var v = DIR_VEC[demo.dir];
      demo.gx = CX + v.x * 220 * p;
      demo.gy = H * 0.86 + v.y * 220 * p;
      demo.press = true;
      lastDir = demo.dir; lastAmt = p;
      if (p > 0.85 && !demo.hit) {
        demo.hit = true;
        game.feedback.good(CX, CY, { text: 'MATCH', color: C.good, sound: false });
        game.audio.play('se_good', 0.22);
      }
    } else {
      armSwing *= 0.9; lastAmt *= 0.9; demo.press = false; demo.hit = false;
      demo.gx += (CX - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (H * 0.86 - demo.gy) * Math.min(1, dt * 6);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawRival(demo.dir, armSwing);
      drawPlayerArm(lastDir, lastAmt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.rivalDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRival(null, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: missCount });
        else game.end.failure({ hits: hits, misses: missCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cueT += dt;
      var showEnd = Math.max(0.5, 0.95 - rounds * 0.05);
      if (cuePhase === 'show') {
        armSwing = Math.min(1, cueT / showEnd);
        if (cueT >= showEnd) { cuePhase = 'wait'; }
      } else if (cuePhase === 'wait') {
        if (cueT - showEnd > 0.7) {
          // timeout without input counts as miss
          resolveInputTimeout();
        }
      }
    }
    if (lastAmt > 0) lastAmt *= 0.88; else lastAmt = 0;
    if (shake > 0) shake -= dt;

    bg();
    drawRival(cue, cuePhase === 'resolved' ? 0 : armSwing);
    drawPlayerArm(lastDir, lastAmt);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 60 - m * 34, 210, 12, m < missCount ? C.bad : '#00000030');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function resolveInputTimeout() {
    if (cuePhase !== 'wait') return;
    cuePhase = 'resolved';
    missCount++;
    hitStop = 0.32;
    game.feedback.bad(CX, CY, { text: 'MISS' });
    shake = 0.25;
    game.audio.play('se_bad', 0.4);
    rounds++;
    if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    cue = newCue(); cueT = 0; cuePhase = 'show';
  }

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 128, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

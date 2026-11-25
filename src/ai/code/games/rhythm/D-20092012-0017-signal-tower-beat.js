// D-20092012-0017-signal-tower-beat.js
// シグナルタワー・ビート — 光の信号塔から降ってくるノーツを、拍に合わせてタップして打ち鳴らす
// 操作: 判定ラインに重なった瞬間にノーツをタップする
// 終わり: 規定数(8個)のノーツを叩き切れば成功。3回外すと塔の灯が消えて失敗
// @mechanic: rhythm
// @theme: signal_tower_beat
// 世界観: 夜の岬に立つ信号塔。降り注ぐ光の粒を拍に合わせて叩き、塔いっぱいに音楽の灯をともす
// 残るもの: 正誤(CLEAR/GAME OVER) + 叩けたノーツ数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒グラデ + シアン/マゼンタ/イエロー/白、外周に薄い同色を重ねた疑似グロー
  var C = {
    bg1: '#0a0020', bg2: '#1a0038', tower: '#3a1a5a', towerGlow: '#8a4aff',
    note: '#00e5ff', noteGlow: '#0a3a44', line: '#ff2e88',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050014',
  };

  var GAME_TITLE = 'SIGNAL BEAT';
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var CX = W * 0.5;
  var LINE_Y = H * 0.68;
  var SPAWN_Y = H * 0.16;
  var FALL_TIME = 1.1;
  var TEMPO_GAP = 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var BEACON = ['.##.', '####', '.##.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(CX - 60, H * 0.1, 120, H * 0.75, C.tower, 0.5);
    var glow = 0.15 + 0.08 * Math.sin(game.time.elapsed * 3);
    game.draw.circle(CX, H * 0.15, 140, C.towerGlow, glow);
  }

  var notes, spawnTimer, hit, missed, done, endWait, finished, spawned;
  var ready, hitStop, shake, milestoneDone;

  function initGame() {
    notes = []; spawnTimer = 0; hit = 0; missed = 0; spawned = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false;
  }

  function spawnNote() {
    if (spawned >= TOTAL) return;
    spawned++;
    notes.push({ t: 0, resolved: false });
  }

  function resolveTap(x, y) {
    var best = null, bestDist = 1e9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved) continue;
      var ny = SPAWN_Y + (LINE_Y - SPAWN_Y) * Math.min(1, n.t / FALL_TIME);
      var dist = Math.abs(ny - LINE_Y);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    if (!best) { game.audio.play('se_tap', 0.08); return; }
    if (bestDist < 130) {
      best.resolved = true;
      hit++;
      hitStop = 0.05;
      game.feedback.good(CX, LINE_Y, { text: bestDist < 55 ? 'PERFECT' : 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (hit === Math.ceil(TOTAL / 2) && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup('HALFWAY!', CX, H * 0.32, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.35);
      }
      if (hit >= TOTAL) { ok = true; finished = true; hitStop = 0.15; finish(); }
    } else {
      game.audio.play('se_tap', 0.08);
    }
  }

  function missNote(n) {
    n.resolved = true;
    missed++;
    hitStop = 0.2; shake = 0.15;
    game.feedback.bad(CX, LINE_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    if (missed >= MISS_LIMIT) { ok = false; finished = true; finish(); }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.1); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) resolveTap(x, y);
  });

  function updateGame(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && spawned < TOTAL) { spawnNote(); spawnTimer = TEMPO_GAP; }
    for (var i = notes.length - 1; i >= 0; i--) {
      var n = notes[i];
      if (n.resolved) { notes.splice(i, 1); continue; }
      n.t += dt;
      if (n.t >= FALL_TIME + 0.22 && !n.resolved) missNote(n);
    }
  }

  var demo = { t: 0, gx: CX, gy: LINE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    if (!finished) updateGame(dt);
    var target = null, bd = 1e9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var ny = SPAWN_Y + (LINE_Y - SPAWN_Y) * Math.min(1, n.t / FALL_TIME);
      var d = Math.abs(ny - LINE_Y);
      if (d < bd) { bd = d; target = n; }
    }
    demo.press = false;
    if (target && bd < 40) {
      resolveTap(CX, LINE_Y);
      demo.press = true;
    }
    demo.gx = CX + Math.cos(game.time.elapsed * 2) * 12;
    demo.gy = LINE_Y + Math.sin(game.time.elapsed * 2.6) * 12;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hit === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLine();
      drawNotes();
      drawBeacon();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawLine(); drawNotes(); drawBeacon();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hit + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hit) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hit, { hit: hit, total: TOTAL, missed: missed });
        else game.end.failure({ hit: hit, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateGame(dt);
    }
    if (shake > 0) shake -= dt;

    bg(); drawLine(); drawNotes(); drawBeacon();

    txt(hit + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W * 0.5 - 40 + m * 40, H * 0.12, 10, m < missed ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function drawLine() {
    var pulse = 0.6 + 0.3 * Math.sin(game.time.elapsed * 8);
    game.draw.line(CX - 220, LINE_Y, CX + 220, LINE_Y, C.line, 8);
    game.draw.circle(CX, LINE_Y, 100, C.line, pulse * 0.2);
  }

  function drawNotes() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var ny = SPAWN_Y + (LINE_Y - SPAWN_Y) * Math.min(1, n.t / FALL_TIME);
      game.draw.circle(CX, ny, 26, C.noteGlow, 0.6);
      game.draw.circle(CX, ny, 18, C.note);
    }
  }

  function drawBeacon() {
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.sprite(BEACON, { '#': C.gold }, CX, H * 0.15 + bob, 14, { anchor: 'center' });
  }

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.3], ['G4', 0.3], ['E4', 0.3]], { tempo: 96, wave: 'square', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

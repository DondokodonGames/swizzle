// D-20172021-0006-gearwork-marble-drop.js
// ギアワークマーブルドロップ — 歯車仕掛けの塔を落ちる真鍮の球。回転する歯車輪の隙間をブースト噴射で通し、迫り上がる蒸気を振り切る
// 操作: 歯車輪の隙間が開く予告が出た瞬間にタップしてブースト噴射し、隙間を通り抜ける
// 終わり: 規定数(4基)の歯車輪を全て通り抜ければ成功。1基でも通り損ねるか蒸気に追いつかれれば失敗
// @mechanic: drop_timing
// @theme: clockwork_tower_marble_drop
// 世界観: 巨大な歯車仕掛けの塔の内部を落ちてゆく一粒の真鍮球。回転する歯車輪の隙間をブースト噴射でくぐり抜けながら、足元から迫り上がる蒸気を振り切って塔底を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 通り抜けた歯車輪の数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: くすんだ金属色、平面的な陰影ブロック
  var STYLE = { bg: ['#3a2c22', '#1c140e'], main: ['#c8a25c', '#8a6a34'], accent: ['#ff8a3d', '#5cd0ff'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], wall: '#4a3a2c', wallEdge: '#2a2018',
    ring: STYLE.main[0], ringDark: STYLE.main[1], marble: '#e8d8a0', marbleDark: '#b89850',
    steam: '#8a9aac', gold: STYLE.accent[0], good: '#5dffb0', bad: '#ff4d4d', white: '#f2ece0', ink: '#141008',
  };

  var GAME_TITLE = 'GEAR DROP';
  var TOTAL = 4;
  var CX = W * 0.5;
  var TY = H * 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MARBLE_SPRITE = ['.#.', '###', '.#.'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    game.draw.rect(0, 0, W * 0.12, H, C.wall);
    game.draw.rect(W * 0.88, 0, W * 0.12, H, C.wall);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 3, '#ffffff05');
  }

  function newRing() {
    var gapSide = Math.random() < 0.5 ? -1 : 1;
    return { t: 0, dur: Math.max(1.1, 1.8 - round * 0.15), gapSide: gapSide, telegraphed: false, resolved: false, passed: false };
  }

  var round, ring, cleared, steamY, marbleY, boostFlash, done, endWait, finished, elapsedT;
  var ready, hitStop, shake;

  function initGame() {
    round = 0; cleared = 0; ok = false;
    done = false; endWait = 0; finished = false; elapsedT = 0;
    ready = 0.8; hitStop = 0; shake = 0; boostFlash = 0;
    steamY = H * 0.98; marbleY = H * 0.14;
    ring = newRing();
  }

  function ringY(r) {
    var p = Math.min(1, r.t / r.dur);
    return H * 0.14 + (TY - H * 0.14) * p;
  }

  function resolveTap() {
    if (!ring || ring.resolved || ready > 0 || done || finished) return;
    ring.resolved = true;
    var correct = ring.telegraphed;
    hitStop = correct ? 0.1 : 0.35;
    if (correct) {
      cleared++;
      boostFlash = 0.25;
      game.feedback.good(CX, ringY(ring), { text: 'PASS', color: C.good });
      game.fx.burst(CX, ringY(ring), { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_jump', 0.45);
      if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, ringY(ring) - 120, { color: C.gold, size: 38 });
    } else {
      game.feedback.bad(CX, ringY(ring), { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    ring = newRing();
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

  function drawRing(r) {
    if (!r) return;
    var y = ringY(r);
    var p = Math.min(1, r.t / r.dur);
    if (p > 0.5) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.rect(W * 0.14, y - 46, W * 0.72, 92, C.bad, 0.18);
    }
    game.draw.rect(W * 0.14, y - 24, W * 0.72, 48, C.ringDark);
    var gapW = W * 0.24;
    var gapX = r.gapSide < 0 ? W * 0.2 : W * 0.56;
    game.draw.rect(gapX, y - 24, gapW, 48, C.bg);
    game.draw.rect(W * 0.14, y - 24, W * 0.72, 8, C.ring);
  }

  var demo = { t: 0, gx: CX, gy: TY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!ring) { ring = newRing(); ring.dur = 1.5; round = 0; }
    ring.t += dt;
    var p = ring.t / ring.dur;
    if (p > 0.5 && p < 0.62 && !ring.telegraphed) {
      ring.telegraphed = true;
      demo.gx = CX; demo.gy = ringY(ring); demo.press = true;
      boostFlash = 0.25;
      game.feedback.good(CX, ringY(ring), { text: 'PASS', color: C.good });
      game.audio.play('se_jump', 0.25);
      ring.passed = true;
    }
    if (p > 0.68) demo.press = false;
    if (p >= 1) { ring = null; }
    marbleY = ring ? Math.min(TY, ringY(ring)) : TY;
  }

  game.onUpdate(function(dt) {
    if (boostFlash > 0) boostFlash -= dt;
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      game.draw.circle(CX, H * 0.9, W * 0.5, C.steam, 0.12);
      drawRing(ring);
      game.draw.circle(CX, TY, 26 + (boostFlash > 0 ? 10 : 0), C.marbleDark, 0.5);
      game.draw.sprite(MARBLE_SPRITE, { '#': C.marble }, CX, TY, 14, { anchor: 'center' });
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
      bg();
      game.draw.circle(CX, TY, 26, C.marbleDark, 0.5);
      game.draw.sprite(MARBLE_SPRITE, { '#': ok ? C.good : C.bad }, CX, TY, 14, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '基!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL });
        else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ring.t += dt;
      if (ring.t / ring.dur >= 1 && !ring.resolved) resolveTap();
      elapsedT += dt;
      steamY = H * 0.98 - Math.min(H * 0.7, elapsedT * (H * 0.7 / 16));
      if (steamY <= TY + 20) {
        finished = true; ok = false; hitStop = 0.15;
        game.feedback.bad(CX, TY, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    game.draw.rect(0, steamY, W, H - steamY, C.steam, 0.35);
    if (!finished) drawRing(ring);
    game.draw.circle(CX, TY, 26 + (boostFlash > 0 ? 10 : 0), C.marbleDark, 0.5);
    if (!finished) game.draw.sprite(MARBLE_SPRITE, { '#': C.marble }, CX, TY, 14, { anchor: 'center' });

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['D4', 0.2], ['E4', 0.2], ['G4', 0.4]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

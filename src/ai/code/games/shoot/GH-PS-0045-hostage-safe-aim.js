// GH-PS-0045-hostage-safe-aim.js
// セーフエイム — せり出す的だけを狙って撃つ。手を挙げた人質を撃てば一発で終わる
// 操作: タップで狙撃。赤いマスクの的だけを撃つ。青い私服の人質には触れない
// 終わり: 弾切れか制限時間で成功。人質を1体でも撃てば即座に失敗
// @mechanic: aim_shoot
// @theme: rooftop_standoff
// 世界観: 夜のビル屋上の対峙。手すりの陰から的と人質が交互にせり出す。人質は両手を挙げて見分けがつくが、迷いなく引き金を引けば巻き添えにする
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数のスコア
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HANDHELD: 4階調(黄緑寄り)、残像・低コントラスト、画面枠
  var C = {
    bg0: '#0f1a10', bg1: '#233522', bg2: '#3a5236', bg3: '#5c7a52',
    frameCol: '#0a120a', bad: '#1a2a18', good: '#5c7a52', gold: '#3a5236', white: '#8fae7a', ink: '#0a120a',
  };

  var GAME_TITLE = 'SAFE AIM';
  var MAX_TIME = 16;
  var BULLETS = 10;
  var RAIL_Y = H * 0.66;
  var SLOT_X = [W * 0.24, W * 0.5, W * 0.76];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, endBy = '';

  var bullets, kills, misses, figs, totalTime, done, endWait, finished, ok, spawnTimer;
  var ready, hitStop, shake, flashT;

  var TARGET_A = ['.MM.', 'MMMM', '.CC.', '.CC.', '#..#'];
  var TARGET_B = ['.MM.', 'MMMM', '.CC.', '.CC.', '.##.'];
  var HOST_A = ['.SS.', 'SSSS', 'H.CH', '.CC.', '.##.'];
  var HOST_B = ['.SS.', 'SSSS', 'H.CH', '.CC.', '#..#'];
  var TARGET_COL = { M: C.frameCol, C: '#8a2a2a', '#': C.frameCol };
  var HOST_COL = { S: '#d8c890', H: '#d8c890', C: '#3a5fae', '#': '#d8c890' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function screenFrame() {
    game.draw.rect(0, 0, W, 24, C.frameCol);
    game.draw.rect(0, H - 24, W, 24, C.frameCol);
    game.draw.rect(0, 0, 24, H, C.frameCol);
    game.draw.rect(W - 24, 0, 24, H, C.frameCol);
    for (var sy = 0; sy < H; sy += 6) game.draw.rect(0, sy, W, 1, C.frameCol, 0.10);
  }

  function bgScene() {
    game.draw.gradient(0, H, [[0, C.bg0], [0.5, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(80 + i * 160, H * 0.14, 60, H * 0.30, C.bg1, 0.6);
    game.draw.rect(0, RAIL_Y, W, 30, C.bg3);
    for (var p = 0; p < 8; p++) game.draw.rect(40 + p * 132, RAIL_Y - 70, 20, 90, C.bg2);
  }

  function initGame() {
    bullets = BULLETS; kills = 0; misses = 0; figs = []; totalTime = 0; done = false; endWait = 0;
    finished = false; ok = false; spawnTimer = 0.5; ready = 0.8; hitStop = 0; shake = 0; flashT = 0; endBy = '';
  }

  function spawnFig() {
    var freeSlots = SLOT_X.map(function(_, i) { return i; }).filter(function(i) { return !figs.some(function(f) { return f.slot === i; }); });
    if (freeSlots.length === 0) return;
    var slot = freeSlots[Math.floor(Math.random() * freeSlots.length)];
    var isHostage = Math.random() < 0.32;
    figs.push({ slot: slot, x: SLOT_X[slot], isHostage: isHostage, t: 0, up: true, stay: 1.1 + Math.random() * 0.5, wob: 0 });
  }

  function figTopY(f) {
    var rise = Math.min(1, f.t / 0.28);
    return RAIL_Y - rise * 240;
  }

  function shoot(x, y) {
    if (bullets <= 0 || done || ready > 0 || finished) return;
    bullets--;
    flashT = 0.08;
    game.audio.play('se_break', 0.4);
    for (var i = 0; i < figs.length; i++) {
      var f = figs[i];
      var top = figTopY(f);
      if (top >= RAIL_Y - 10) continue;
      if (Math.abs(x - f.x) < 70 && y > top - 20 && y < top + 220) {
        figs.splice(i, 1);
        if (f.isHostage) {
          hitStop = 0.5; shake = 0.5;
          game.fx.flash(C.bad, 0.3);
          game.feedback.bad(f.x, top, { text: 'MISS' });
          game.audio.play('se_failure', 0.5);
          ok = false; finished = true; endBy = 'hostage'; finish();
        } else {
          kills++;
          hitStop = 0.08;
          game.feedback.good(f.x, top, { text: kills % 4 === 0 ? 'PERFECT' : 'NICE', color: C.good });
          game.fx.burst(f.x, top + 40, { color: C.gold, count: 12, speed: 340 });
          if (kills === 5) { game.fx.popup(kills + ' / ' + BULLETS, W / 2, H * 0.24, { color: C.gold, size: 44 }); game.audio.play('se_milestone', 0.5); }
        }
        if (bullets === 0 && !finished) { ok = true; finished = true; endBy = 'empty'; finish(); }
        return;
      }
    }
    misses++;
    game.feedback.bad(x, y, { text: 'MISS' });
    if (bullets === 0 && !finished) { ok = true; finished = true; endBy = 'empty'; finish(); }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = kills * 100 + bullets * 20;
    game.audio.stopBgm();
    if (endBy !== 'hostage') game.audio.play('se_success', 0.4);
    endWait = 1.4;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    shoot(x, y);
  });

  function drawFig(f) {
    var top = figTopY(f);
    var frameA = f.wob > 0 ? true : Math.floor(game.time.elapsed * 6) % 2 === 0;
    if (f.isHostage) {
      game.draw.sprite(frameA ? HOST_A : HOST_B, HOST_COL, f.x, top, 18, { anchor: 'top' });
    } else {
      game.draw.sprite(frameA ? TARGET_A : TARGET_B, TARGET_COL, f.x, top, 18, { anchor: 'top' });
    }
  }

  // ── ATTRACT ゴースト実演: 実際の shoot() を使い、的を正しく撃つ成功例+人質を誤って撃つ失敗例 ──
  var demo = { t: 0, gx: SLOT_X[0], gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { figs = [{ slot: 0, x: SLOT_X[0], isHostage: false, t: 0.28, stay: 9, wob: 0 }]; bullets = BULLETS; kills = 0; finished = false; }
    if (Math.abs(cyc - 1.6) < dt) { figs.push({ slot: 2, x: SLOT_X[2], isHostage: true, t: 0.28, stay: 9, wob: 0 }); }
    demo.press = false;
    if (Math.abs(cyc - 0.5) < dt) { var top0 = figTopY(figs[0]); demo.gx = figs[0].x; demo.gy = top0 + 60; shoot(figs[0].x, top0 + 60); demo.press = true; }
    if (Math.abs(cyc - 2.1) < dt) { var h = figs.filter(function(f) { return f.isHostage; })[0]; if (h) { var top1 = figTopY(h); demo.gx = h.x; demo.gy = top1 + 60; shoot(h.x, top1 + 60); demo.press = true; } }
    if (cyc > 2.3 && finished) { /* 失敗ポーズを見せてからループ */ }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (figs === undefined) initGame();
      bgScene();
      stepDemo(dt);
      for (var i = 0; i < figs.length; i++) drawFig(figs[i]);
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 12, demo.gy + Math.cos(game.time.elapsed * 1.7) * 12, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 60, C.white);
      txt('BEST ' + String(game.best).padStart(5, '0'), W / 2, H * 0.15, 28, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      screenFrame();
      return;
    }

    if (state === S.RESULT) {
      bgScene();
      txt(endBy === 'hostage' ? 'GAME OVER' : 'FINISH', W / 2, H * 0.20, 68, endBy === 'hostage' ? C.bad : C.gold);
      txt('SCORE ' + String(finalScore).padStart(5, '0'), W / 2, H * 0.30, 44, C.white);
      txt(kills + ' / ' + BULLETS + ' KILLS', W / 2, H * 0.36, 30, C.white);
      if (endBy !== 'hostage' && bullets === 0 && kills < BULLETS - 1) txt('あと少し!', W / 2, H * 0.42, 26, C.gold);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(5, '0'), W / 2, H * 0.48, 32, C.gold);
      if (finalScore >= game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.54, 32, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 28, C.white);
      screenFrame();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { kills: kills, misses: misses }); else game.end.failure({ score: finalScore, kills: kills, endBy: endBy });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { ok = true; finished = true; endBy = 'time'; finish(); }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnFig(); spawnTimer = Math.max(0.7, 1.5 - totalTime * 0.04); }
      for (var i = figs.length - 1; i >= 0; i--) {
        var f = figs[i];
        f.t += dt;
        if (f.t > 0.28 + f.stay) { figs.splice(i, 1); }
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bgScene();
    for (var j = 0; j < figs.length; j++) drawFig(figs[j]);
    if (flashT > 0) game.draw.rect(0, 0, W, H, '#eafbe0', 0.14);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 60, W - 120, 22, C.frameCol, 0.5);
    game.draw.rect(60, 60, (W - 120) * frac, 22, frac < 0.25 ? C.bad : C.good);
    txt('SCORE ' + String(kills * 100).padStart(5, '0'), W / 2, 122, 38, C.white);
    for (var b = 0; b < BULLETS; b++) game.draw.rect(70 + b * 34, H * 0.92, 20, 30, b < bullets ? C.good : C.frameCol, b < bullets ? 1 : 0.4);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 78, C.gold);
    screenFrame();
  });

  game.onStart(function() {
    game.audio.melody(
      [['E4', 0.3], ['E4', 0.3], ['G4', 0.3], ['E4', 0.3], ['D4', 0.3], ['E4', 0.3]],
      { tempo: 108, wave: 'square', volume: 0.05, loop: true, bass: [['E2', 0.6], ['B1', 0.6]], bassWave: 'triangle', bassVolume: 0.05 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

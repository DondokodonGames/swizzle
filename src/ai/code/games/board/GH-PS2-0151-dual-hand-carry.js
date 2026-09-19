// GH-PS2-0151-dual-hand-carry.js
// デュアルキャリー — 左手でレーンを選び、右手で穴を飛び越えさせて、光る部品を搬入口まで運ぶ
// 操作: 画面左半分に触れてレーンを移動(左手=操舵)。画面右半分をタップして落とし穴を飛び越える(右手=跳躍)。両手を同時に使う
// 終わり: 搬入口(進行度100%)まで運べば成功。グリップ(耐久3)が尽きれば失敗
// @mechanic: coop_2zone
// @theme: factory_conveyor
// 世界観: 稼働中の工場ベルトコンベア。左右2本のロボアームが1つの発光部品を挟んで運搬する。左のアームがレーンを選び、右のアームが落とし穴を飛び越えさせる。息を合わせないと部品を落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 運搬距離のスコア
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // PIXEL HD: 多色 + 光。パララックス2層、光源のにじみ、細かいアニメ
  var C = {
    bg1: '#0a0e1a', bg2: '#131b30', bg3: '#1c2a4a',
    belt: '#232f4c', beltLine: '#2f3d63', pipe: '#2a3350', pipeGlow: '#4a6fe0',
    armDark: '#2f3550', armLight: '#4d5a86', armJoint: '#8892c0',
    orb: '#7de8ff', orbCore: '#ffffff',
    wall: '#ff4d5e', wallDark: '#8a1c2a', gap: '#ff9a3d', gold: '#ffd400',
    good: '#5dffb0', bad: '#ff4d5e', white: '#ffffff', ink: '#05060c',
  };

  var GAME_TITLE = 'DUAL CARRY';
  var LANES = [W * 0.28, W * 0.50, W * 0.72];
  var CONTACT_Y = H * 0.60;
  var SPAWN_Y = H * 0.20;
  var GRIP_MAX = 3;
  var MAX_TIME = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var orbX, orbTargetX, hazards, grip, score, totalTime, done, endWait, finished, ok;
  var ready, hitStop, shake, spawnTimer, scrollX, gripFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ARM_L_A = ['..##', '.##.', '##..'];
  var ARM_L_B = ['.##.', '.##.', '##..'];
  var ARM_R_A = ['##..', '.##.', '..##'];
  var ARM_R_B = ['.##.', '.##.', '..##'];

  function nearestLane(x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < LANES.length; i++) { var d = Math.abs(LANES[i] - x); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function bgFactory() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg3]]);
    // 遠景パイプ(パララックス、ゆっくり流れる)
    for (var i = -1; i < 8; i++) {
      var px = ((i * 220 - scrollX * 0.3) % (W + 220) + (W + 220)) % (W + 220) - 220;
      game.draw.rect(px, H * 0.06, 26, H * 0.30, C.pipe);
      game.draw.circle(px + 13, H * 0.06, 16, C.pipeGlow, 0.35 + 0.15 * Math.sin(game.time.elapsed * 2 + i));
    }
    // ベルトコンベア本体(縦に流れる帯)
    game.draw.rect(0, H * 0.42, W, H * 0.30, C.belt);
    for (var j = -1; j < 14; j++) {
      var ly = H * 0.42 + ((j * 46 + scrollX * 0.9) % (H * 0.30 + 46));
      game.draw.rect(0, ly, W, 6, C.beltLine, 0.5);
    }
    // レーン仕切り(光る線)
    for (var l = 0; l < LANES.length; l++) {
      game.draw.line(LANES[l], H * 0.42, LANES[l], H * 0.72, C.pipeGlow, 3);
    }
  }

  function drawHazard(h) {
    var y = SPAWN_Y + (CONTACT_Y - SPAWN_Y) * Math.min(1, h.t);
    var scale = 0.5 + 0.5 * Math.min(1, h.t);
    var warn = h.t > 0.55 && h.t < 1 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (h.type === 'wall') {
      var x = LANES[h.lane];
      game.draw.rect(x - 60 * scale, y - 50 * scale, 120 * scale, 100 * scale, warn ? C.white : C.wall, warn ? 0.9 : 1);
      game.draw.rect(x - 60 * scale, y - 50 * scale, 120 * scale, 18 * scale, C.wallDark);
    } else if (h.type === 'gold') {
      var gx = LANES[h.lane];
      game.draw.circle(gx, y, 30 * scale, C.gold, warn ? 1 : 0.9);
      game.draw.circle(gx, y, 14 * scale, '#fff2a0', 0.8);
    } else if (h.type === 'gap') {
      game.draw.rect(0, y - 14 * scale, W, 28 * scale, warn ? C.white : C.gap, warn ? 0.9 : 0.85);
      game.draw.rect(0, y - 14 * scale, W, 6, C.ink, 0.4);
    }
  }

  function drawOrb(x, leftPressing, hopFlash) {
    var bob = Math.sin(game.time.elapsed * 8) * 4;
    game.draw.circle(x, CONTACT_Y + bob, 44, C.orb, 0.35);
    game.draw.circle(x, CONTACT_Y + bob, 30, C.orb);
    game.draw.circle(x, CONTACT_Y + bob, 14, C.orbCore, 0.9);
    var armFrame = Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.sprite(armFrame ? ARM_L_A : ARM_L_B, { '#': leftPressing ? C.armLight : C.armDark }, x - 70, CONTACT_Y + bob - 10, 16, { anchor: 'right' });
    game.draw.sprite(armFrame ? ARM_R_A : ARM_R_B, { '#': hopFlash > 0 ? C.armLight : C.armDark }, x + 70, CONTACT_Y + bob - 10, 16, { anchor: 'left' });
    game.draw.circle(x - 70, CONTACT_Y + bob, 8, C.armJoint);
    game.draw.circle(x + 70, CONTACT_Y + bob, 8, C.armJoint);
  }

  function drawGripPips() {
    for (var i = 0; i < GRIP_MAX; i++) {
      var on = i < grip;
      game.draw.circle(W * 0.5 - 60 + i * 60, H * 0.80, 16, on ? C.good : C.armDark, on ? 1 : 0.5);
    }
  }

  function initGame() {
    orbX = LANES[1]; orbTargetX = LANES[1];
    hazards = []; grip = GRIP_MAX; score = 0; totalTime = 0; done = false; endWait = 0;
    finished = false; ok = false; ready = 0.8; hitStop = 0; shake = 0; spawnTimer = 1.0;
    scrollX = 0; gripFlash = 0;
  }

  function travelFor() { return Math.max(0.72, 1.15 - totalTime * 0.018); }

  function spawnHazard() {
    var r = Math.random();
    var lane = Math.floor(Math.random() * 3);
    if (r < 0.45) hazards.push({ type: 'wall', lane: lane, t: 0, resolved: false, travel: travelFor() });
    else if (r < 0.75) hazards.push({ type: 'gap', lane: -1, t: 0, resolved: false, hopUsed: false, travel: travelFor() });
    else hazards.push({ type: 'gold', lane: lane, t: 0, resolved: false, travel: travelFor() });
  }

  function resolveHazard(h) {
    var lane = nearestLane(orbX);
    if (h.type === 'wall') {
      if (h.lane === lane) {
        grip--; gripFlash = 0.3; hitStop = 0.3; shake = 0.28;
        game.feedback.bad(LANES[h.lane], CONTACT_Y, { text: 'HIT' });
        game.fx.flash(C.bad, 0.22);
        game.audio.play('se_bad', 0.5);
        if (grip <= 0) { ok = false; finished = true; finish(); }
      } else {
        game.audio.play('se_tap', 0.05);
      }
    } else if (h.type === 'gold') {
      if (h.lane === lane) {
        score += 50;
        game.feedback.good(LANES[h.lane], CONTACT_Y, { text: '+50', color: C.gold });
        game.fx.burst(LANES[h.lane], CONTACT_Y, { color: C.gold, count: 12, speed: 320 });
        game.audio.play('se_coin', 0.5);
      }
    } else if (h.type === 'gap') {
      if (!h.hopUsed) {
        grip--; gripFlash = 0.3; hitStop = 0.3; shake = 0.28;
        game.feedback.bad(orbX, CONTACT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.5);
        if (grip <= 0) { ok = false; finished = true; finish(); }
      }
    }
  }

  function updateHazards(dt) {
    for (var i = 0; i < hazards.length; i++) {
      var h = hazards[i];
      if (h.resolved) { h.t += dt / h.travel; continue; }
      h.t += dt / h.travel;
      if (h.t >= 1) { resolveHazard(h); h.resolved = true; if (!finished) score += 5; }
    }
    for (var j = hazards.length - 1; j >= 0; j--) if (hazards[j].t > 1.25) hazards.splice(j, 1);
  }

  var hopFlashT = 0;
  function attemptHop() {
    var target = null;
    for (var i = 0; i < hazards.length; i++) {
      var h = hazards[i];
      if (h.type === 'gap' && !h.resolved && !h.hopUsed && h.t > 0.42 && h.t < 1.05) {
        if (!target || h.t > target.t) target = h;
      }
    }
    if (target) {
      target.hopUsed = true;
      hopFlashT = 0.2;
      game.feedback.good(orbX, CONTACT_Y - 30, { text: null, count: 3, sound: 'se_jump' });
      game.fx.burst(orbX, CONTACT_Y, { color: C.gold, count: 8, speed: 260 });
    } else {
      hopFlashT = 0.1;
      game.audio.play('se_tap', 0.15);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = score + Math.round(totalTime * 8);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (x < W / 2) { game.audio.play('se_tap', 0.05); }
    else { attemptHop(); }
  });

  // ── ATTRACT ゴースト実演: 実際の resolveHazard/attemptHop を流用し、左手回避+右手ホップ+1回の失敗例 ──
  var demo = { t: 0, lgx: LANES[1], lgy: H * 0.90, lpress: false, rgx: W * 0.75, rgy: H * 0.90, rpress: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt) { hazards = []; orbX = LANES[1]; orbTargetX = LANES[1]; grip = GRIP_MAX; }
    if (Math.abs(cyc - 0.3) < dt / 2) hazards.push({ type: 'wall', lane: 2, t: 0, resolved: false, travel: 1.1 });
    if (Math.abs(cyc - 1.7) < dt / 2) hazards.push({ type: 'gap', lane: -1, t: 0, resolved: false, hopUsed: false, travel: 1.0 });
    if (Math.abs(cyc - 3.0) < dt / 2) hazards.push({ type: 'wall', lane: 1, t: 0, resolved: false, travel: 1.0 });

    // 左手: 最初の危険(壁@lane2)を避けてlane0へ、2回目の壁(lane1)はあえて避けず失敗例を見せる
    var avoiding = cyc > 0.3 && cyc < 1.35;
    var targetLane = avoiding ? 0 : 1;
    orbTargetX = LANES[targetLane];
    demo.lpress = cyc < 1.4 || (cyc > 2.5 && cyc < 3.0);
    orbX += (orbTargetX - orbX) * Math.min(1, dt * 4);
    demo.lgx = orbX; demo.lgy = H * 0.90;

    // 右手: 穴が跳躍窓に入った瞬間にタップ
    demo.rpress = false;
    for (var i = 0; i < hazards.length; i++) {
      var h = hazards[i];
      if (h.type === 'gap' && !h.hopUsed && Math.abs(h.t - 0.7) < dt * 3) { attemptHop(); demo.rpress = true; }
    }
    updateHazards(dt);
    if (hopFlashT > 0) hopFlashT -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (orbX === undefined) initGame();
      scrollX += 60 * dt;
      bgFactory();
      stepDemo(dt);
      for (var i = 0; i < hazards.length; i++) drawHazard(hazards[i]);
      drawOrb(orbX, demo.lpress, hopFlashT);
      drawGripPips();
      game.draw.hand(demo.lgx, demo.lgy, { press: demo.lpress, scale: 14 });
      game.draw.hand(demo.rgx, demo.rgy, { press: demo.rpress, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.10, 56, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.145, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 44, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bgFactory();
      for (var k = 0; k < hazards.length; k++) drawHazard(hazards[k]);
      drawOrb(orbX, false, 0);
      drawGripPips();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 52, ok ? C.good : C.bad);
      txt('SCORE ' + String(finalScore).padStart(5, '0'), W / 2, H * 0.15, 34, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(5, '0'), W / 2, H * 0.20, 26, C.gold);
      if (!ok && grip === 0 && score < 30) txt('あと少し!', W / 2, H * 0.25, 30, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.30, 30, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { grip: grip }); else game.end.failure({ score: finalScore, grip: grip });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      scrollX += (140 + totalTime * 4) * dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnHazard(); spawnTimer = Math.max(0.55, 1.15 - totalTime * 0.02); }
      // 左手: どちらかの touch が左半分にあればレーン操舵
      var touches = game.touches || [];
      var foundLeft = false;
      for (var t = 0; t < touches.length; t++) {
        if (touches[t].x < W / 2) {
          orbTargetX = LANES[0] + (touches[t].x / (W * 0.5)) * (LANES[2] - LANES[0]);
          orbTargetX = Math.max(LANES[0], Math.min(LANES[2], orbTargetX));
          foundLeft = true;
        }
      }
      orbX += (orbTargetX - orbX) * Math.min(1, dt * 6);
      updateHazards(dt);
      if (totalTime >= MAX_TIME) { ok = true; finished = true; finish(); }
      if (Math.floor(totalTime / 8) > Math.floor((totalTime - dt) / 8) && totalTime > 1) {
        game.fx.popup(Math.round((totalTime / MAX_TIME) * 100) + '%', W / 2, H * 0.24, { color: C.gold, size: 44 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    if (shake > 0) shake -= dt;
    if (gripFlash > 0) gripFlash -= dt;
    if (hopFlashT > 0) hopFlashT -= dt;

    bgFactory();
    for (var h2 = 0; h2 < hazards.length; h2++) drawHazard(hazards[h2]);
    if (!finished) drawOrb(orbX, false, hopFlashT);
    drawGripPips();

    var frac = Math.min(1, totalTime / MAX_TIME);
    game.draw.rect(60, 50, W - 120, 22, C.ink, 0.6);
    game.draw.rect(60, 50, (W - 120) * frac, 22, C.good);
    txt('SCORE ' + String(score).padStart(4, '0'), W / 2, 114, 36, C.white);
    txt(Math.round(frac * 100) + ' / ' + 100, W * 0.86, 114, 26, C.gold);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 80, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['C4', 0.18], ['E4', 0.18], ['G4', 0.18], ['C5', 0.18], ['G4', 0.18], ['E4', 0.18]],
      { tempo: 132, wave: 'square', volume: 0.06, loop: true, bass: [['C3', 0.36], ['G2', 0.36]], bassWave: 'triangle', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

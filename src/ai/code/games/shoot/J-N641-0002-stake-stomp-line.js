// J-N641-0002-stake-stomp-line.js
// 地面の杭打ち踏みつけ — 地面から突き出る杭を正しいタイミングと位置で踏みつける
// 操作: 予告の亀裂が入った直後、地面から突き出た杭の位置を狙ってタップして踏みつける
// 終わり: 制限時間内に規定本数の杭を正しく踏めれば成功。時間切れなら失敗
// @mechanic: aim_shoot
// @theme: ground_stake_stomp_line
// 世界観: 整地作業員が、地面のあちこちから次々と突き出す杭を狙い澄まして踏み鎮め、危険な棘杭は避けてノルマを達成する
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく踏めた杭数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で
  var C = {
    bg: '#2a2438', bg2: '#181428', ground: '#5a4a3a', groundTop: '#7a6850',
    stakeTop: '#d8c08a', stakeL: '#a88858', stakeR: '#8a6a40',
    badTop: '#ff8a5a', badL: '#c85a2a', badR: '#a03e18',
    good: '#39e07a', badc: '#ff4d5e', gold: '#ffd400', ink: '#f0e8ff', warn: '#ffd400',
  };

  var GAME_TITLE = 'STAKE STOMP';
  var TIME_LIMIT = 14;
  var GOAL = 8;
  var SLOT_N = 5;
  var SLOT_X = [];
  for (var s = 0; s < SLOT_N; s++) SLOT_X.push(W * (0.18 + s * 0.16));
  var SLOT_Y = H * 0.58;
  var UP_TIME = 0.62, WARN_TIME = 0.32, DOWN_TIME = 0.18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0e0a18', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.48, W, H * 0.28, C.groundTop, 1);
    game.draw.rect(0, H * 0.48, W, 10, C.ground, 0.8);
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.3);
    game.draw.rect(0, 0, W, H, C.warn, pulse * 0.2);
  }

  var FOREMAN_SPR = ['.##.', '####', '.#.#', '.#.#'];
  function drawForeman(t, mood) {
    var bob = Math.sin(t * 2.4) * 6;
    var pal = { '#': mood === 'bad' ? C.badTop : (mood === 'good' ? C.good : C.ink) };
    game.draw.sprite(FOREMAN_SPR, pal, W * 0.5, H * 0.86 + bob, 22, { anchor: 'center' });
  }

  function drawSlots(slots) {
    for (var i = 0; i < SLOT_N; i++) {
      var sl = slots[i];
      var x = SLOT_X[i];
      game.draw.circle(x, SLOT_Y + 20, 44, C.ground, 0.6);
      if (sl.state === 'warn') {
        var flick = Math.floor(game.time.elapsed * 14) % 2 === 0;
        if (flick) game.draw.rect(x - 26, SLOT_Y + 8, 52, 8, C.warn, 0.8);
      } else if (sl.state === 'up' || sl.state === 'down') {
        var h = sl.state === 'up' ? 70 : 70 * (sl.t / DOWN_TIME);
        var topC = sl.bad ? C.badTop : C.stakeTop;
        var lC = sl.bad ? C.badL : C.stakeL;
        var rC = sl.bad ? C.badR : C.stakeR;
        game.draw.rect(x - 24, SLOT_Y - h, 20, h, lC);
        game.draw.rect(x + 4, SLOT_Y - h, 20, h, rC);
        game.draw.rect(x - 24, SLOT_Y - h, 48, 14, topC);
      }
    }
  }

  var slots, hitGood, timeLeft, milestoneCalled, spawnClock, mood, moodT;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    slots = [];
    for (var i = 0; i < SLOT_N; i++) slots.push({ state: 'idle', t: 0, bad: false });
    hitGood = 0; timeLeft = TIME_LIMIT; milestoneCalled = false; spawnClock = 0.5;
    mood = 'idle'; moodT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnStake() {
    var idle = [];
    for (var i = 0; i < SLOT_N; i++) if (slots[i].state === 'idle') idle.push(i);
    if (!idle.length) return;
    var pick = idle[Math.floor(Math.random() * idle.length)];
    slots[pick].state = 'warn'; slots[pick].t = 0; slots[pick].bad = Math.random() < 0.28;
  }

  function tickSlots(dt) {
    for (var i = 0; i < SLOT_N; i++) {
      var sl = slots[i];
      if (sl.state === 'idle') continue;
      sl.t += dt;
      if (sl.state === 'warn' && sl.t >= WARN_TIME) { sl.state = 'up'; sl.t = 0; }
      else if (sl.state === 'up' && sl.t >= UP_TIME) { sl.state = 'down'; sl.t = 0; }
      else if (sl.state === 'down' && sl.t >= DOWN_TIME) { sl.state = 'idle'; sl.t = 0; }
    }
  }

  function attemptStomp(x, y) {
    if (finished || ready > 0) return;
    var best = -1, bd = 1e9;
    for (var i = 0; i < SLOT_N; i++) {
      var d = Math.hypot(SLOT_X[i] - x, SLOT_Y - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (bd > 90 || slots[best].state !== 'up') {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
      return;
    }
    var sl = slots[best];
    if (sl.bad) {
      sl.state = 'down'; sl.t = 0;
      shake = 0.2; hitStop = 0.15;
      mood = 'bad'; moodT = 0.4;
      game.feedback.bad(SLOT_X[best], SLOT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    } else {
      sl.state = 'idle'; sl.t = 0;
      mood = 'good'; moodT = 0.4;
      hitGood++;
      game.feedback.good(SLOT_X[best], SLOT_Y, { text: hitGood >= GOAL ? 'CLEAR' : 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.35);
      if (!milestoneCalled && hitGood >= Math.ceil(GOAL / 2)) {
        milestoneCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.35, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (hitGood >= GOAL) winRun();
    }
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.15;
    game.fx.burst(W * 0.5, SLOT_Y, { color: C.gold, count: 22, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function loseRun() {
    if (finished) return;
    finished = true; ok = false; shake = 0.25; hitStop = 0.3;
    game.feedback.bad(W * 0.5, SLOT_Y, { text: 'MISS' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptStomp(x, y);
  });

  var demo = { t: 0, gx: SLOT_X[0], gy: SLOT_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    spawnClock -= dt;
    if (spawnClock <= 0) { spawnStake(); spawnClock = 0.55 + Math.random() * 0.2; }
    tickSlots(dt);
    var target = -1;
    for (var i = 0; i < SLOT_N; i++) if (slots[i].state === 'up' && !slots[i].bad) { target = i; break; }
    if (target >= 0) {
      demo.gx += (SLOT_X[target] - demo.gx) * Math.min(1, dt * 6);
      demo.gy = SLOT_Y;
      demo.press = true;
      attemptStomp(demo.gx, demo.gy);
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (slots === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      drawSlots(slots);
      drawForeman(game.time.elapsed, mood);
      game.draw.hand(demo.gx, demo.gy - 50, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      drawSlots(slots);
      drawForeman(game.time.elapsed, ok ? 'good' : 'bad');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.badc);
      txt(hitGood + ' / ' + GOAL, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL - hitGood) + '本!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hitGood, { hit: hitGood, goal: GOAL });
        else game.end.failure({ hit: hitGood, goal: GOAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      spawnClock -= dt;
      if (spawnClock <= 0) { spawnStake(); spawnClock = 0.5 + Math.random() * 0.35; }
      tickSlots(dt);
      if (timeLeft <= 0) { timeLeft = 0; loseRun(); }
    }
    if (shake > 0) shake -= dt;
    if (moodT > 0) { moodT -= dt; if (moodT <= 0) mood = 'idle'; }

    bg(game.time.elapsed);
    drawSlots(slots);
    drawForeman(game.time.elapsed, mood);

    txt(hitGood + ' / ' + GOAL, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#3a3050', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.badc : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.15], ['D4', 0.15], ['E4', 0.15], ['G4', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

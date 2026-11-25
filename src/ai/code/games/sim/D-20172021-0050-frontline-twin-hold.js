// D-20172021-0050-frontline-twin-hold.js
// フロントラインツインホールド — 前線基地を攻める分隊が、左手で僚機の援護を、右手で自分の駒を同時に進めて拠点コアを制圧する
// 操作: 左半分は僚機ゾーン、右半分は自分ゾーン。両方に現れる敵を左右の指で同時に叩いて拠点コアを制圧する
// 終わり: 制圧ゲージが満ちれば成功。どちらかの防衛ラインが規定回数破られれば失敗
// @mechanic: coop_2zone
// @theme: frontline_twin_hold
// 世界観: 前線基地の攻略にあたる分隊が、僚機と自分の駒を左右同時に操り、押し寄せる敵を捌きながら経験値を稼ぎ拠点コアを制圧する
// 残るもの: 正誤(CLEAR/GAME OVER) + 制圧ゲージ
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg1: '#141a10', bg2: '#0a0e08', divider: '#2a3a20',
    allyZone: '#1a2a18', playerZone: '#241a10',
    ally: '#4ad06a', allyDark: '#2a8040', player: '#ff9a3a', playerDark: '#b0601a',
    enemy: '#e04a5a', enemyDark: '#902a34',
    good: '#4ad06a', bad: '#ff4d5e', gold: '#ffe04a', ink: '#eaffe0', white: '#ffffff',
  };

  var GAME_TITLE = 'TWIN HOLD';
  var ROUND_TIME = 12;
  var CAPTURE_NEEDED = 7;
  var MAX_BREACH = 4;
  var APPROACH = 1.6;
  var SPAWN_Y = H * 0.24;
  var CORE_L = { x: W * 0.25, y: H * 0.84 };
  var CORE_R = { x: W * 0.75, y: H * 0.84 };
  var NEEDED = CAPTURE_NEEDED;
  var TIME_LIMIT = ROUND_TIME;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ALLY_SPR = ['.#.', '###', '#.#'];
  var PLAYER_SPR = ['###', '.#.', '#.#'];
  var ENEMY_SPR = ['#.#', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.16, W * 0.5, H * 0.72, C.allyZone, 1);
    game.draw.rect(W * 0.5, H * 0.16, W * 0.5, H * 0.72, C.playerZone, 1);
    game.draw.rect(W * 0.5 - 4, H * 0.16, 8, H * 0.72, C.divider, 1);
    game.draw.sprite(ALLY_SPR, { '#': C.ally }, CORE_L.x, CORE_L.y, 26, { anchor: 'center' });
    game.draw.sprite(PLAYER_SPR, { '#': C.player }, CORE_R.x, CORE_R.y, 26, { anchor: 'center' });
  }

  var leftE, rightE, spawnL, spawnR, captureMeter, breachCount, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    leftE = []; rightE = []; spawnL = 0.4; spawnR = 0.9;
    captureMeter = 0; breachCount = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnIn(list, core) {
    list.push({ t: 0, x: core.x + (Math.random() * 140 - 70), y: SPAWN_Y, resolved: false, core: core });
  }

  function resolveHit(e, list) {
    e.resolved = true;
    captureMeter++;
    game.feedback.good(e.x, e.y, { text: 'GOOD', color: C.good });
    game.fx.burst(e.x, e.y, { color: C.gold, count: 14, speed: 300 });
    game.audio.play('se_good', 0.3);
    if (!halfCalled && captureMeter >= Math.ceil(CAPTURE_NEEDED / 2)) {
      halfCalled = true;
      game.fx.popup('NICE', W * 0.5, H * 0.28, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (captureMeter >= CAPTURE_NEEDED && !finished) { ok = true; finished = true; hitStop = 0.25; finish(); }
  }

  function resolveBreach(e) {
    e.resolved = true;
    breachCount++;
    game.feedback.bad(e.core.x, e.core.y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    shake = 0.18;
    if (breachCount >= MAX_BREACH && !finished) { ok = false; finished = true; hitStop = 0.3; finish(); }
  }

  function tapZone(x, y) {
    var list = x < W * 0.5 ? leftE : rightE;
    var best = null, bestD = 999;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.resolved) continue;
      var d = Math.hypot(x - e.x, y - e.y);
      if (d < 130 && d < bestD) { best = e; bestD = d; }
    }
    if (best) { resolveHit(best, list); }
    else { game.fx.burst(x, y, { color: C.ink, count: 4, speed: 120 }); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.06);
    tapZone(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function updateZone(list, spawnTimer, spawnBase, core, dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnIn(list, core); spawnTimer = spawnBase + Math.random() * 0.4; }
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.resolved) continue;
      e.t += dt;
      e.y = SPAWN_Y + (core.y - SPAWN_Y) * Math.min(1, e.t / APPROACH);
      if (e.t >= APPROACH) resolveBreach(e);
    }
    while (list.length > 8) list.shift();
    return spawnTimer;
  }

  function drawZoneEnemies(list) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.resolved) continue;
      var blink = Math.floor(game.time.elapsed * 8 + i) % 2 === 0;
      if (blink && e.t < 0.3) game.draw.circle(e.x, SPAWN_Y - 20, 16, C.gold, 0.7);
      game.draw.sprite(ENEMY_SPR, { '#': C.enemy }, e.x, e.y, 22, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gxL: CORE_L.x, gyL: CORE_L.y, gxR: CORE_R.x, gyR: CORE_R.y };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    spawnL = updateZone(leftE, spawnL, 1.1, CORE_L, dt);
    spawnR = updateZone(rightE, spawnR, 1.1, CORE_R, dt);
    for (var i = 0; i < leftE.length; i++) { var e = leftE[i]; if (!e.resolved && e.t > APPROACH * 0.6 && e.t < APPROACH * 0.75) { tapZone(e.x, e.y); demo.gxL = e.x; demo.gyL = e.y; } }
    for (var j = 0; j < rightE.length; j++) { var e2 = rightE[j]; if (!e2.resolved && e2.t > APPROACH * 0.6 && e2.t < APPROACH * 0.75) { tapZone(e2.x, e2.y); demo.gxR = e2.x; demo.gyR = e2.y; } }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (captureMeter === undefined) initGame();
      stepDemo(dt);
      bg();
      drawZoneEnemies(leftE);
      drawZoneEnemies(rightE);
      game.draw.hand(demo.gxL, demo.gyL, { press: true, scale: 13 });
      game.draw.hand(demo.gxR, demo.gyR, { press: true, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZoneEnemies(leftE);
      drawZoneEnemies(rightE);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(captureMeter + ' / ' + CAPTURE_NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, CAPTURE_NEEDED - captureMeter) + '!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    var shakeX = 0;
    if (shake > 0) { shake -= dt; shakeX = (Math.random() - 0.5) * 16 * shake; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(captureMeter, { captureMeter: captureMeter, breach: breachCount });
        else game.end.failure({ captureMeter: captureMeter, breach: breachCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      spawnL = updateZone(leftE, spawnL, 1.1, CORE_L, dt);
      spawnR = updateZone(rightE, spawnR, 1.1, CORE_R, dt);
      if (roundClock >= ROUND_TIME && !finished) {
        ok = captureMeter >= CAPTURE_NEEDED;
        finished = true;
        if (!ok) game.audio.play('se_failure', 0.3);
        finish();
      }
    }

    bg();
    drawZoneEnemies(leftE);
    drawZoneEnemies(rightE);
    txt(captureMeter + ' / ' + CAPTURE_NEEDED, W * 0.5, H * 0.065, 30, C.white);
    var barW = W - 140;
    var pct = Math.min(1, captureMeter / CAPTURE_NEEDED);
    game.draw.rect(70, 150, barW, 16, '#1a1a10', 1);
    game.draw.rect(70, 150, barW * pct, 16, C.gold);
    for (var b = 0; b < MAX_BREACH; b++) {
      game.draw.circle(W * 0.5 - (MAX_BREACH - 1) * 24 + b * 48, H * 0.115, 14, b < breachCount ? C.bad : '#3a3a2a');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense');
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20132016-0006-abyssal-ward-duel.js
// 深海結界デュエル — 門番が放つ属性の玉に、相性で勝る玉を選んでぶつけ結界を割る
// 操作: 門番の玉の色を見て、それに勝つ色のゾーンを親指ゾーンでタップして撃ち返す
// 終わり: 先に3回相性勝ちすれば成功。3回相性負けすれば失敗
// @mechanic: judge
// @theme: abyssal_ward_duel
// 世界観: 深海の宝物庫を守る門番との一騎打ち。門番が放つ炎・氷・雷いずれかの玉に、それを打ち消す色で撃ち返し結界を砕く潜水士
// 残るもの: 勝敗(CLEAR/GAME OVER) + スコア(勝ち星)
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度の高いグラデ、太い白縁、弾む演出
  var C = {
    bg1: '#0a2a4a', bg2: '#031428', ward: '#123a5e',
    fire: '#ff5a3a', ice: '#3ad8ff', spark: '#f6e93a',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#031018',
  };
  var TYPES = ['fire', 'ice', 'spark'];
  var TCOL = { fire: C.fire, ice: C.ice, spark: C.spark };
  var BEATS = { fire: 'spark', ice: 'fire', spark: 'ice' }; // key は key に勝つ

  var GAME_TITLE = 'ABYSS WARD';
  var WIN_SCORE = 3;
  var CX = W * 0.5, ENEMY_Y = H * 0.3, PLAYER_Y = H * 0.6;
  var TELE_DUR = 0.6, ACTIVE_DUR = 1.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, myScore = 0, oppScore = 0;

  var enemyType, phase, phaseT, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER = ['.##.', '####', '.##.', '#.#.'];
  var WARDEN = ['####', '.##.', '####', '#..#'];

  function bg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.circle(120 + i * 220, H * 0.2 + Math.sin(el * 0.6 + i) * 30, 8, '#ffffff', 0.15);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(el * 1.3));
    game.draw.circle(CX, H * 0.44, 300, C.ward, 0.2);
  }

  function newRound() {
    enemyType = TYPES[Math.floor(Math.random() * 3)];
    phase = 'telegraph'; phaseT = TELE_DUR;
  }

  function initGame() {
    myScore = 0; oppScore = 0; done = false; endWait = 0; finished = false; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function zoneX(i) { return W * (0.22 + i * 0.28); }

  function pickZone(picked) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'active') return;
    var correct = BEATS[picked] === enemyType;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      myScore++;
      game.feedback.good(CX, PLAYER_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, ENEMY_Y, { color: TCOL[picked], count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && myScore === Math.ceil(WIN_SCORE / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, H * 0.16, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
    } else {
      oppScore++;
      game.feedback.bad(CX, PLAYER_Y, { text: 'MISS' });
      shake = 0.24;
      game.audio.play('se_bad', 0.35);
    }
    if (myScore >= WIN_SCORE) { ok = true; finished = true; finish(); }
    else if (oppScore >= WIN_SCORE) { ok = false; finished = true; finish(); }
    else newRound();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (y < H * 0.72) return;
    for (var i = 0; i < 3; i++) {
      if (Math.abs(x - zoneX(i)) < W * 0.13) { pickZone(TYPES[i]); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawOrb(x, y, type, r) {
    game.draw.circle(x, y, r + 6, C.ink, 0.5);
    game.draw.circle(x, y, r, TCOL[type]);
  }

  function drawZones(curPhase, highlightType) {
    for (var i = 0; i < 3; i++) {
      var t = TYPES[i];
      var glow = curPhase === 'active' ? 0.9 : 0.55;
      drawOrb(zoneX(i), H * 0.86, t, 66);
      if (highlightType === t) game.draw.circle(zoneX(i), H * 0.86, 78, C.gold, 0.35 + 0.25 * Math.sin(game.time.elapsed * 8));
    }
  }

  function drawScene(curEnemy, curPhase, bobT) {
    game.draw.sprite(WARDEN, { '#': C.white }, CX, H * 0.2 + Math.sin(bobT * 2.1) * 4, 24, { anchor: 'center' });
    var warn = curPhase === 'telegraph' && Math.floor(bobT * 10) % 2 === 0;
    if (curEnemy) drawOrb(CX, ENEMY_Y, curEnemy, warn ? 58 : 50);
    game.draw.sprite(DIVER, { '#': C.gold }, CX + Math.cos(bobT * 1.7) * 3, PLAYER_Y + 60, 22, { anchor: 'center' });
    drawZones(curPhase, null);
  }

  var demo = { t: 0, gx: zoneX(0), gy: H * 0.86, press: false };
  var DEMO_CYC = 3.4;
  var demoEnemy = TYPES[0], demoPhase = 'telegraph';
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoEnemy = TYPES[Math.floor(Math.random() * 3)]; }
    if (cyc < 0.8) { demoPhase = 'telegraph'; demo.press = false; }
    else if (cyc < 2.0) {
      demoPhase = 'active';
      var counterKey = Object.keys(BEATS).filter(function(k) { return BEATS[k] === demoEnemy; })[0];
      var idx = TYPES.indexOf(counterKey);
      var tx = zoneX(idx);
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.press = cyc > 1.5 && cyc < 1.8;
    } else { demoPhase = 'telegraph'; demo.press = false; demo.gx = zoneX(0); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(demoEnemy, demoPhase, game.time.elapsed);
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
      drawScene(enemyType, 'telegraph', game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(myScore + ' - ' + oppScore, W / 2, H * 0.13, 34, C.gold);
      if (!ok) txt('あと1歩!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(myScore, { my: myScore, opp: oppScore });
        else game.end.failure({ my: myScore, opp: oppScore });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT -= dt;
      if (phase === 'telegraph' && phaseT <= 0) { phase = 'active'; phaseT = ACTIVE_DUR; }
      else if (phase === 'active' && phaseT <= 0) {
        // タイムアウト: 選ばなければ相性負け扱い
        oppScore++;
        hitStop = 0.25;
        game.feedback.bad(CX, PLAYER_Y, { text: 'MISS' });
        shake = 0.2;
        game.audio.play('se_bad', 0.3);
        if (oppScore >= WIN_SCORE) { ok = false; finished = true; finish(); }
        else newRound();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(enemyType, phase, game.time.elapsed);

    txt(myScore + ' - ' + oppScore, W / 2, H * 0.06, 36, C.white);
    txt(myScore + ' / ' + WIN_SCORE, W / 2, H * 0.115, 22, C.gold);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (myScore / WIN_SCORE), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

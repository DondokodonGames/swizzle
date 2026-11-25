// K-GBA-0023-cliff-ascent-climb.js
// 崖登りリズム — 一定のリズムで足場を蹴り上がりながら、落ちてくる岩を避けて頂上を目指す
// 操作: 一定間隔でタップして上昇(拍から外れると失速)。左右に岩が来たら逆側へスワイプしてよける
// 終わり: 頂上(高度100%)まで登れば成功。岩に3回当たるか落下しきれば失敗
// @mechanic: camera_climb
// @theme: cliff_ascent_climb
// 世界観: 夜明け前の断崖を一人で登る登攀者。一定リズムで足場を蹴り、落石を避けながら頂上灯りを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達高度%
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 限定パレット、粗いドット、はっきりした縞
  var C = {
    bg: '#0a1428', bg2: '#152850', cliff: '#3a3040', cliffEdge: '#584a5a',
    climber: '#e8c840', rock: '#8a5a3a', rockEdge: '#5a3620',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f4f4', ink: '#080810',
  };

  var GAME_TITLE = 'CLIFF ASCENT';
  var MAX_MISS = 3;
  var CLIMB_PER_TAP = 0.062;
  var LANE_X = [W * 0.35, W * 0.65];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var height, lane, hit, done, endWait, finished;
  var ready, hitStop, shake, beatT, rocks, spawnT, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLIMBER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10) + (height || 0) * 40 % (H / 10), W, 2, '#ffffff06');
    game.draw.rect(0, 0, W, H, C.cliffEdge, 0.06);
  }

  function initGame() {
    height = 0; lane = 0; hit = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    beatT = 0; rocks = []; spawnT = 1.1; milestoneShown = false;
  }

  function pulse() {
    if (ready > 0 || finished || done) return;
    height = Math.min(1, height + CLIMB_PER_TAP);
    game.feedback.good(LANE_X[lane], H * 0.6, { text: '', sound: 'se_tap', count: 6, color: C.gold });
    game.audio.play('se_tap', 0.18);
    if (height >= 0.5 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('HALFWAY!', W * 0.5, H * 0.4, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
    if (height >= 1) { ok = true; finished = true; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) pulse();
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished || done) return;
    if (dir === 'left' && lane === 0) { lane = 1; game.audio.play('se_tap', 0.15); }
    else if (dir === 'right' && lane === 1) { lane = 0; game.audio.play('se_tap', 0.15); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function newRock() {
    var rl = Math.random() < 0.5 ? 0 : 1;
    return { lane: rl, y: -60, tele: 0.6, resolved: false };
  }

  function updateRocks(dt, isDemo) {
    spawnT -= dt;
    if (spawnT <= 0) {
      rocks.push(newRock());
      spawnT = Math.max(0.85, 1.6 - height * 0.7);
    }
    for (var i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i];
      r.y += dt * (520 + height * 260);
      if (!r.resolved && r.y > H * 0.52 && r.y < H * 0.68 && r.lane === lane) {
        r.resolved = true;
        if (isDemo) { rocks.splice(i, 1); continue; }
        hit++;
        hitStop = 0.3;
        game.feedback.bad(LANE_X[lane], H * 0.6, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        if (hit >= MAX_MISS) { ok = false; finished = true; finish(); }
      }
      if (r.y > H + 80) rocks.splice(i, 1);
    }
  }

  function drawScene() {
    game.draw.sprite(CLIMBER, { '#': C.climber }, LANE_X[lane], H * 0.6, 22, { anchor: 'center' });
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      if (r.y < H * 0.4) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(LANE_X[r.lane], H * 0.6, 60, C.bad, 0.18);
      }
      game.draw.circle(LANE_X[r.lane], r.y, 34, C.rockEdge);
      game.draw.circle(LANE_X[r.lane], r.y, 26, C.rock);
    }
  }

  var demo = { t: 0, gx: LANE_X[0], gy: H * 0.6, press: false, tapT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { height = 0; lane = 0; rocks = []; spawnT = 1.0; milestoneShown = false; }
    demo.tapT -= dt;
    if (demo.tapT <= 0) {
      demo.tapT = 0.42;
      height = Math.min(1, height + CLIMB_PER_TAP);
      demo.press = true;
      game.audio.play('se_tap', 0.08);
    } else if (demo.tapT < 0.3) demo.press = false;
    updateRocks(dt, true);
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      if (r.y > H * 0.4 && r.y < H * 0.52 && r.lane === lane) { lane = 1 - lane; demo.gx = LANE_X[lane]; }
    }
    demo.gx = LANE_X[lane]; demo.gy = H * 0.6;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy - 40, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      var pct = Math.round(height * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(height * 100);
        if (ok) game.end.success(pct, { pct: pct, hit: hit }); else game.end.failure({ pct: pct, hit: hit });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateRocks(dt, false);
      height = Math.max(0, height - dt * 0.01);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished || ok) drawScene();

    txt(Math.round(height * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * height, 16, C.gold);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < hit ? C.bad : C.ink, i < hit ? 1 : 0.4);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

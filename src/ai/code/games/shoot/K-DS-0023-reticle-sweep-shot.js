// K-DS-0023-reticle-sweep-shot.js
// レティクルスイープ — 左右に揺れる照準が標的に重なった瞬間に撃つ
// 操作: 自動で左右に往復する照準の輪が、通過する標的に重なった瞬間にタップして撃つ
// 終わり: 規定数(6体)を全て撃破すれば成功。1体でも外せば失敗
// @mechanic: aim_shoot
// @theme: reticle_sweep_range
// 世界観: 独自デザインの砲台オペレーターが守る前哨基地。左右に往復する照準に、通過する標的を重ねて迎撃する
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 限定4色パレット、粗いドット、緑がかったLCD風トーン
  var C = {
    bg: '#0f2818', bg2: '#183a22', grid: '#1f4a2a', reticle: '#e8ffea',
    target: '#ff5a3a', targetDim: '#5a1a10', good: '#8aff5a', bad: '#ff4444',
    gold: '#ffe23a', white: '#e8ffe8', ink: '#02100a',
  };

  var GAME_TITLE = 'RETICLE SWEEP';
  var TOTAL = 6;
  var TY = H * 0.44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var kills, thrown, done, endWait, finished;
  var ready, hitStop, shake, round, retX, retDir, retSpeed, target;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TURRET = ['..#..', '.###.', '#####'];
  var BLIP = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, C.grid, 0.5);
  }

  function newTarget() {
    var n = Math.min(round, TOTAL - 1);
    var x = W * (0.18 + Math.random() * 0.64);
    return { x: x, life: Math.max(1.1, 1.9 - n * 0.12), t: 0, resolved: false };
  }

  function initGame() {
    kills = 0; thrown = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0;
    retX = W * 0.5; retDir = 1; retSpeed = W * 0.55;
    target = newTarget();
  }

  function fire() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var d = Math.abs(retX - target.x);
    if (d < 60) {
      target.resolved = true;
      kills++; thrown++;
      hitStop = 0.08;
      game.feedback.good(target.x, TY, { text: 'HIT', color: C.good });
      game.fx.burst(target.x, TY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (kills === Math.ceil(TOTAL / 2)) game.fx.popup('LOCK ON!', W / 2, TY - 200, { color: C.gold, size: 38 });
      if (kills >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      target = newTarget();
    } else {
      game.feedback.bad(retX, TY, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  function failTarget() {
    target.resolved = true;
    thrown++;
    hitStop = 0.3;
    game.feedback.bad(target.x, TY, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) fire();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    game.draw.sprite(TURRET, { '#': C.reticle }, W * 0.5, H * 0.86, 30, { anchor: 'center' });
    if (target && !target.resolved) {
      var p = target.t / target.life;
      if (p > 0.55) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(target.x, TY, 58, C.target, 0.3);
      }
      game.draw.sprite(BLIP, { '#': C.target }, target.x, TY, 22, { anchor: 'center' });
    }
    // 照準
    game.draw.circle(retX, TY, 46, C.reticle, 0.15);
    game.draw.line(retX - 60, TY, retX + 60, TY, C.reticle, 4);
    game.draw.line(retX, TY - 60, retX, TY + 60, C.reticle, 4);
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, x: W * 0.5, dir: 1, tg: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.tg = newTarget(); demo.tg.life = 1.6; demo.x = W * 0.2; demo.dir = 1; }
    demo.x += demo.dir * (W * 0.55) * dt;
    if (demo.x > demo.tg.x) demo.x = demo.tg.x;
    demo.tg.t += dt;
    retX = demo.x; target = demo.tg;
    demo.gx = demo.x; demo.gy = H * 0.86;
    var d = Math.abs(demo.x - demo.tg.x);
    if (d < 60 && !demo.tg.resolved) {
      demo.tg.resolved = true;
      demo.press = true;
      game.feedback.good(demo.tg.x, TY, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.tg.t >= demo.tg.life) { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
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
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(kills + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - kills) + '体!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(kills, { kills: kills, total: TOTAL });
        else game.end.failure({ kills: kills, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      retX += retDir * retSpeed * dt;
      if (retX > W * 0.85) { retX = W * 0.85; retDir = -1; }
      if (retX < W * 0.15) { retX = W * 0.15; retDir = 1; }
      target.t += dt;
      if (target.t >= target.life && !target.resolved) failTarget();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(kills + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (kills / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

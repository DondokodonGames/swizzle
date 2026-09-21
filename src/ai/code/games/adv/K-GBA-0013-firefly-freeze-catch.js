// K-GBA-0013-firefly-freeze-catch.js
// ホタル待ち伏せ — 枝先で休むホタルを、翅が震えて飛び立つ直前の一瞬だけタップして捕まえる
// 操作: ホタルが休んでいる間は待ち、翅が震え始めたその一瞬でタップする(早すぎ/遅すぎは失敗)
// 終わり: 規定数(5匹)を全て正しく捕まえれば成功。1回でも早押し/逃せば失敗
// @mechanic: cooldown_tap
// @theme: night_marsh_firefly
// 世界観: 夜の湿地の一本の枝。休むホタルを驚かせず、飛び立つ直前の翅の震えだけを狙って網を振る採集者
// 残るもの: 正誤(CLEAR/GAME OVER) + 捕まえた匹数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き
  var C = {
    sky1: '#0a1230', sky2: '#141c3c', hill: '#0d1a1a', hill2: '#122622',
    branch: '#3a2418', leaf: '#1e4020', firefly: '#3a4a2a', fireflyLit: '#c8ff5a',
    accent: '#7affd6', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffe86a',
    white: '#f0fff0', ink: '#04100a',
  };

  var GAME_TITLE = 'FIREFLY WAIT';
  var TOTAL = 5;
  var PX = W * 0.5, PY = H * 0.42;
  var REST_T = [0.95, 0.85, 0.75, 0.65, 0.6];
  var TWITCH_T = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var FIREFLY_SPRITE = ['.##.', '####', '.##.'];
  var NET_SPRITE = ['#....#', '.#..#.', '..##..', '..##..', '.#..#.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.6, C.sky2], [1, C.hill]]);
    for (var i = 0; i < 5; i++) {
      var hx = (i / 5) * W;
      game.draw.circle(hx, H * 0.7, 60, C.hill2, 0.5);
    }
    game.draw.rect(0, H * 0.75, W, H * 0.25, C.hill);
    game.draw.line(PX - 260, PY + 40, PX + 260, PY + 40, C.branch, 22);
    game.draw.sprite(NET_SPRITE, { '#': C.leaf }, PX, H * 0.86, 10, { anchor: 'center' });
  }

  var caught, round, phase, phaseT, netX, netY, twitch;
  var done, endWait, finished;
  var ready, hitStop, shake, flashBad;

  function newFirefly() {
    phase = 'rest'; phaseT = 0; twitch = 0;
  }

  function initGame() {
    caught = 0; round = 0; flashBad = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newFirefly();
  }

  function resolveTap(early) {
    if (finished || done || ready > 0 || hitStop > 0) return;
    if (phase === 'twitch') {
      caught++; hitStop = 0.12;
      game.feedback.good(PX, PY, { text: 'GOT IT', color: C.good });
      game.fx.burst(PX, PY, { color: C.fireflyLit, count: 16, speed: 280 });
      game.audio.play('se_good', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) game.fx.popup(caught + ' / ' + TOTAL, PX, PY - 180, { color: C.gold, size: 40 });
      if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newFirefly();
    } else {
      flashBad = true; hitStop = 0.35;
      game.feedback.bad(PX, PY, { text: early ? '早い!' : 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    resolveTap(true);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (finished) return;
    var rest = REST_T[Math.min(round, REST_T.length - 1)];
    phaseT += dt;
    if (phase === 'rest') {
      if (phaseT >= rest) { phase = 'twitch'; phaseT = 0; game.audio.play('se_tap', 0.1); }
    } else if (phase === 'twitch') {
      twitch = Math.sin(phaseT * 40) * 6;
      if (phaseT >= TWITCH_T) {
        // 逃げられた
        flashBad = true; hitStop = 0.3;
        game.feedback.bad(PX, PY, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawFirefly() {
    var lit = phase === 'twitch';
    var fx = PX + (lit ? twitch : 0);
    var fy = PY - 30 + (lit ? 0 : Math.sin(game.time.elapsed * 2) * 4);
    if (lit) game.draw.circle(fx, fy, 46, C.fireflyLit, 0.35);
    if (flashBad) game.draw.circle(fx, fy, 60, C.bad, 0.3);
    game.draw.sprite(FIREFLY_SPRITE, { '#': lit ? C.fireflyLit : C.firefly }, fx, fy, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: PX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.3;
    if (cyc < dt || demo.t <= dt) { phase = 'rest'; phaseT = 0; round = 0; flashBad = false; }
    phaseT += dt;
    var restD = 1.1;
    if (phase === 'rest') {
      demo.gx = PX; demo.gy = H * 0.86; demo.press = false;
      if (phaseT >= restD) { phase = 'twitch'; phaseT = 0; }
    } else if (phase === 'twitch') {
      twitch = Math.sin(phaseT * 40) * 6;
      if (phaseT < dt) { demo.gx = PX; demo.gy = PY - 30; }
      demo.press = phaseT < 0.22;
      if (phaseT >= TWITCH_T) { phase = 'done'; }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFirefly();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 24 });
      txt(GAME_TITLE, W / 2, H * 0.1, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFirefly();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '匹!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFirefly();

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

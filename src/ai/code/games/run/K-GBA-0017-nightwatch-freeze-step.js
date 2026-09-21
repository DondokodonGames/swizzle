// K-GBA-0017-nightwatch-freeze-step.js
// 夜警フリーズステップ — 一定の歩調で見回る足を、物音の合図が鳴った瞬間だけ止める
// 操作: 歩き続ける足音の中、物音の合図(点滅)が出たらその直後にタップして足を止める
// 終わり: 規定回数(5回)全て合図の直後に止められれば成功。合図を聞き逃せば見つかって失敗
// @mechanic: freeze
// @theme: nightwatch_patrol
// 世界観: 明けの見回りをする夜警。等間隔の足音の中、物音の合図が鳴った直後だけ足を止めてやり過ごす巡回
// 残るもの: 正誤(CLEAR/GAME OVER) + 止められた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、線の太さとディザ的な縞で階調を作る
  var C = {
    bg: '#f2efe6', ink: '#14120f', dim: '#c9c4b4', accent: '#14120f',
    good: '#14120f', bad: '#14120f', gold: '#14120f', white: '#f2efe6',
  };

  var GAME_TITLE = 'NIGHTWATCH';
  var TOTAL = 5;
  var CX = W * 0.5, GY = H * 0.62;
  var WAIT_MIN = 0.55, WAIT_MAX = 1.0;
  var CUE_WIN = 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var WALK_A = ['.##.', '####', '.##.', '##..', '.#..'];
  var WALK_B = ['.##.', '####', '.##.', '..##', '..#.'];
  var STILL = ['.##.', '####', '.##.', '.##.', '.##.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function stripe(x, y, w, h, color, alpha) {
    for (var i = 0; i < w; i += 6) game.draw.rect(x + i, y, 2, h, color, alpha);
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#e6e1d2']]);
    stripe(0, H * 0.68, W, H * 0.14, C.dim, 0.5);
    for (var i = 0; i < 5; i++) game.draw.rect(80 + i * 220, H * 0.3, 90, H * 0.4, C.ink, 0.08);
    game.draw.rect(0, H * 0.8, W, 6, C.ink);
  }

  var round, roundT, cueTime, cueOn, tappedAfterCue, resolved, walkFrame, walkAnim;
  var caught, done, endWait, finished;
  var ready, hitStop, shake, flashState;

  function newRound() {
    roundT = 0; cueTime = game.random(WAIT_MIN, WAIT_MAX); cueOn = false;
    tappedAfterCue = false; resolved = false;
  }

  function initGame() {
    round = 0; caught = 0; walkFrame = 0; walkAnim = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0;
    newRound();
  }

  function onTapPlay() {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || resolved) return;
    game.audio.play('se_tap', 0.1);
    if (roundT >= cueTime) tappedAfterCue = true;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    onTapPlay();
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
    roundT += dt;
    walkAnim += dt;
    if (walkAnim > 0.28 && !tappedAfterCue) { walkAnim = 0; walkFrame = 1 - walkFrame; }
    if (!cueOn && roundT >= cueTime) { cueOn = true; game.audio.play('se_milestone', 0.35); }
    if (!resolved && roundT >= cueTime + CUE_WIN) {
      resolved = true;
      if (tappedAfterCue) {
        caught++; hitStop = 0.1; flashState = 1;
        game.feedback.good(CX, GY, { text: 'STOP', color: C.good });
        game.fx.burst(CX, GY, { color: C.ink, count: 10, speed: 220 });
        game.audio.play('se_good', 0.35);
        if (caught === Math.ceil(TOTAL / 2)) game.fx.popup(caught + ' / ' + TOTAL, CX, GY - 200, { color: C.gold, size: 40 });
        if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
        round++; newRound();
      } else {
        flashState = -1; hitStop = 0.4;
        game.feedback.bad(CX, GY, { text: '見つかった!' });
        shake = 0.35;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawScene() {
    var frozen = tappedAfterCue && cueOn;
    if (flashState !== 0) game.draw.rect(0, 0, W, H, flashState > 0 ? C.ink : C.bad, 0.06);
    if (cueOn && !resolved && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.circle(CX, GY - 220, 50, C.ink, 0.5);
    }
    var spr = frozen ? STILL : (walkFrame === 0 ? WALK_A : WALK_B);
    game.draw.sprite(spr, { '#': C.ink }, CX, GY, 30, { anchor: 'center' });
    game.draw.rect(CX - 4, GY - 150, 8, 60, C.ink, 0.7);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, drt: 0, dCue: 0.8, dTap: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    if (cyc < dt || demo.t <= dt) { demo.drt = 0; demo.dTap = false; }
    demo.drt += dt;
    roundT = demo.drt; cueTime = demo.dCue; cueOn = demo.drt >= demo.dCue;
    walkAnim += dt;
    if (walkAnim > 0.28 && !demo.dTap) { walkAnim = 0; walkFrame = 1 - walkFrame; }
    if (cueOn && !demo.dTap && demo.drt < demo.dCue + 0.25) {
      demo.dTap = true; demo.gx = CX; demo.gy = GY; demo.press = true;
    } else if (demo.drt >= demo.dCue + 0.25) {
      demo.press = false; demo.gx = CX; demo.gy = H * 0.86;
    }
    tappedAfterCue = demo.dTap;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, C.ink);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.ink);
      if (!ok) txt('あと' + (TOTAL - caught) + '回!', W / 2, H * 0.21, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
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
    if (flashState !== 0) flashState *= 0.85;

    bg();
    drawScene();

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 14, C.dim);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 14, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.ink);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);

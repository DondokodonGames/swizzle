// K-DS-0024-opening-strike-read.js
// オープニングストライク — 相手の構えが崩れる隙の窓に合わせて拳を打ち込む
// 操作: 相手の構えが光って崩れた(隙ができた)瞬間だけタップして打つ。早すぎ・遅すぎは失敗
// 終わり: 5回連続で隙を正確に打てれば成功。タイミングを外せば即失敗
// @mechanic: timing_window
// @theme: dojo_sparring_opening
// 世界観: 古びた道場の朝稽古。師範格の相手と向き合い、構えが崩れる一瞬の隙だけを狙って拳を放つ修行
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めた隙の数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: くすんだ4色パレット、粗いドット、緑がかったLCD調の陰
  var C = {
    bg: '#1c2418', bg2: '#0f140c', floor: '#283420', mat: '#3a4a2c',
    guard: '#8ca86a', guardGlow: '#d8e8a0', open: '#e0503c', openGlow: '#ffb060',
    good: '#c8e860', bad: '#ff4d3a', gold: '#ffd400', white: '#eef6da', ink: '#0a0c06',
  };

  var GAME_TITLE = 'OPENING STRIKE';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARD_UP = ['.###.', '#####', '.###.', '.###.', '##.##', '##.##'];
  var GUARD_OPEN = ['.###.', '.###.', '#####', '.###.', '##.##', '##.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [0.6, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.62, W, H * 0.4, C.floor);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.62 + i * 30, W, H * 0.62 + i * 30, '#00000022', 2);
    game.draw.rect(W * 0.12, H * 0.6, W * 0.76, 10, C.mat);
  }

  var hits, round, roundT, teleDur, openDur, phase, finished, done, endWait;
  var ready, hitStop, shake;

  function newRound() {
    teleDur = 0.42;
    openDur = Math.max(0.22, 0.4 - round * 0.03);
    roundT = 0;
  }

  function initGame() {
    hits = 0; round = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function resolveTap() {
    if (finished || ready > 0 || done) return;
    if (roundT < teleDur) {
      // 早すぎ: まだ構えている
      ok = false; finished = true; hitStop = 0.35;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    // 隙の窓の中
    hits++;
    hitStop = 0.12;
    game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
    game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 340 });
    game.audio.play('se_good', 0.4);
    if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    newRound();
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

  function drawScene(open, flashOpen) {
    game.draw.sprite(open ? GUARD_OPEN : GUARD_UP, { '#': flashOpen ? C.openGlow : C.guard }, CX, CY, 30, { anchor: 'center' });
    if (open) game.draw.circle(CX, CY, 90, C.open, 0.15);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { round = 0; }
    var tele = 0.42, op = 0.36;
    var inTele = cyc < tele;
    var inOpen = cyc >= tele && cyc < tele + op;
    if (inOpen && !demo._hit) {
      demo._hit = true;
      demo.press = true;
      game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (cyc < dt) demo._hit = false;
    if (!inOpen) demo.press = false;
    phase = inOpen ? 'open' : 'closed';
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var cyc = demo.t % 2.4;
      var inTele = cyc >= 0.15 && cyc < 0.42;
      var inOpen = cyc >= 0.42 && cyc < 0.78;
      drawScene(inOpen, inTele);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(false, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= teleDur + openDur) {
        // 隙を逃した
        ok = false; finished = true; hitStop = 0.35;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var inTele = !finished && roundT >= teleDur * 0.3 && roundT < teleDur;
    var inOpen = !finished && roundT >= teleDur;
    drawScene(inOpen, inTele);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.3], ['C3', 0.3], ['E3', 0.6]], { tempo: 110, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

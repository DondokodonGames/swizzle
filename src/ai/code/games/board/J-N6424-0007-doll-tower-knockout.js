// J-N6424-0007-doll-tower-knockout.js
// 人形タワー・ノックアウト — 積み重なった張り子人形を一段ずつ叩いて弾き出し、一番上の人形をできるだけ長く落とさず保つ
// 操作: 塔の最下段をタップして横に叩き出す。連打しすぎず、揺れが収まってから次を狙う
// 終わり: 規定段数、上を落とさず弾き出せば成功。揺れが限界を超えて倒れれば失敗
// @mechanic: push_out
// @theme: doll_tower_knockout
// 世界観: 縁日の的当て屋台に並ぶ腕自慢が、積み重なった張り子人形を一段ずつ叩いて弾き出し、一番上の人形を落とさず保ち続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き出せた段数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#2a1a3a', bg2: '#160c20', doll1: '#e04858', doll2: '#f0a030', doll3: '#40c0a0', doll4: '#5088e0',
    dollDark: '#1a0e28', good: '#3ad06a', bad: '#ff4d5e', gold: '#ffe040', ink: '#f0e8ff', white: '#ffffff',
  };

  var GAME_TITLE = 'DOLL KNOCKOUT';
  var N_DOLLS = 5;
  var TARGET_KNOCK = 4;
  var WOBBLE_MAX = 100;
  var TIME_LIMIT = 16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0a0414', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DOLL_SPR = ['.##.', '####', '.##.', '#..#'];
  var COLS = [C.doll1, C.doll2, C.doll3, C.doll4];

  var TOWER_X = W * 0.5, BASE_Y = H * 0.78, DOLL_H = 110;

  var knocked, wobble, dollOffsetX, roundClock, halfCalled, punchAnim, lastPunch;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
  }

  function drawTower() {
    for (var i = 0; i < N_DOLLS; i++) {
      if (i < knocked) continue;
      var y = BASE_Y - i * DOLL_H;
      var off = i === knocked ? dollOffsetX : (i === N_DOLLS - 1 ? wobble * 0.4 : 0);
      var punchOff = (i === knocked && punchAnim > 0) ? punchAnim * 60 : 0;
      game.draw.sprite(DOLL_SPR, { '#': COLS[i % COLS.length] }, TOWER_X + off + punchOff, y, 22, { anchor: 'center' });
    }
  }

  function initGame() {
    knocked = 0; wobble = 0; dollOffsetX = 0; roundClock = 0; halfCalled = false; punchAnim = 0; lastPunch = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function punch(x, y) {
    if (finished || ready > 0) return;
    var targetY = BASE_Y - knocked * DOLL_H;
    var dist = Math.hypot(x - TOWER_X, y - targetY);
    if (dist > 140) {
      game.audio.play('se_tap', 0.08);
      return;
    }
    punchAnim = 0.25;
    var precision = 1 - Math.min(1, dist / 140);
    var addWobble = 34 - precision * 22;
    wobble += addWobble;
    knocked++;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.audio.play('se_break', 0.35);
    game.fx.burst(x, y, { color: C.gold, count: 12, speed: 280 });
    if (knocked === Math.ceil(TARGET_KNOCK / 2)) {
      game.fx.popup('NICE', TOWER_X, BASE_Y - N_DOLLS * DOLL_H, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (wobble >= WOBBLE_MAX) {
      ok = false; finished = true; hitStop = 0.35; shake = 0.35;
      game.feedback.bad(TOWER_X, BASE_Y - N_DOLLS * DOLL_H, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (knocked >= TARGET_KNOCK) {
      ok = true; finished = true; hitStop = 0.25;
      game.feedback.good(TOWER_X, BASE_Y - N_DOLLS * DOLL_H, { text: 'CLEAR', color: C.good });
      game.fx.burst(TOWER_X, BASE_Y - N_DOLLS * DOLL_H, { color: C.gold, count: 22, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) punch(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: TOWER_X, gy: BASE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var seg = cyc % 0.85;
    var targetY = BASE_Y - knocked * DOLL_H;
    demo.gx = TOWER_X; demo.gy = targetY;
    if (seg < dt && knocked < TARGET_KNOCK) {
      punchAnim = 0.25;
      wobble += 18;
      knocked++;
      demo.press = true;
      game.feedback.good(TOWER_X, targetY, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.2);
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (wobble === undefined) initGame();
      stepDemo(dt);
      if (punchAnim > 0) punchAnim -= dt;
      if (wobble > 0) wobble -= dt * 20;
      bg();
      drawTower();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTower();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.bad);
      txt(knocked + ' / ' + TARGET_KNOCK, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_KNOCK - knocked) + '段!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(knocked, { knocked: knocked, target: TARGET_KNOCK });
        else game.end.failure({ knocked: knocked, target: TARGET_KNOCK });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (wobble > 0) wobble = Math.max(0, wobble - dt * 20);
      if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', TOWER_X, BASE_Y - N_DOLLS * DOLL_H, { color: C.gold, size: 28 });
      }
      if (roundClock >= TIME_LIMIT) {
        ok = knocked >= Math.ceil(TARGET_KNOCK * 0.5);
        finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(TOWER_X, BASE_Y - N_DOLLS * DOLL_H, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (punchAnim > 0) punchAnim -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawTower();

    txt(knocked + ' / ' + TARGET_KNOCK, W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var wobblePct = Math.min(1, wobble / WOBBLE_MAX);
    game.draw.rect(60, 150, barW, 16, '#2a1a3a', 1);
    game.draw.rect(60, 150, barW * (1 - wobblePct), 16, wobblePct > 0.65 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 134, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

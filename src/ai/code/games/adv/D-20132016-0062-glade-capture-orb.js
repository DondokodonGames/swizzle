// D-20132016-0062-glade-capture-orb.js
// グレードキャプチャーオーブ — 小さな観測フィールドに一瞬だけ現れる生き物を、逃げる前にタップで捕獲する
// 操作: フィールドの中にふっと現れた生き物を、消える前にタップして捕獲オーブを当てる
// 終わり: 規定数(5体)をすべて捕獲できれば成功。1体でも逃せば失敗
// @mechanic: aim_shoot
// @theme: field_capture_creature
// 世界観: 小さな観測フィールドの研究員見習いが、携帯捕獲オーブを手に、草陰にふっと現れる小さな光る生き物を逃げられる前に捕まえる
// 残るもの: 正誤(CLEAR/GAME OVER) + 捕獲数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 光沢のあるベゼル、内側ハイライト帯、質感のある枠
  var C = {
    bg: '#3a2f1f', bg2: '#4a3a24', bezel: '#5c4a2c', bezelHi: '#7a6440',
    field: '#274a2a', fieldEdge: '#173318', creature: '#8fffb0', creatureCore: '#ffffff',
    good: '#3ddc84', bad: '#ff4d5e', gold: '#ffd400', white: '#fff6e0', ink: '#20150a',
  };

  var GAME_TITLE = 'CAPTURE ORB';
  var TOTAL = 5;
  var FIELD_X = W * 0.5, FIELD_Y = H * 0.44, FIELD_W = W * 0.72, FIELD_H = H * 0.34;
  var SPOTS = [
    { x: -0.24, y: -0.22 }, { x: 0.22, y: -0.18 }, { x: 0, y: 0.02 },
    { x: -0.18, y: 0.24 }, { x: 0.2, y: 0.2 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, idx, creature, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREATURE_S = ['.#.', '###', '.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(FIELD_X - FIELD_W / 2 - 22, FIELD_Y - FIELD_H / 2 - 22, FIELD_W + 44, FIELD_H + 44, C.bezel);
    game.draw.rect(FIELD_X - FIELD_W / 2 - 22, FIELD_Y - FIELD_H / 2 - 22, FIELD_W + 44, 14, C.bezelHi, 0.7);
    game.draw.rect(FIELD_X - FIELD_W / 2, FIELD_Y - FIELD_H / 2, FIELD_W, FIELD_H, C.fieldEdge);
    game.draw.rect(FIELD_X - FIELD_W / 2 + 6, FIELD_Y - FIELD_H / 2 + 6, FIELD_W - 12, FIELD_H - 12, C.field);
  }

  function spotPos(i) {
    var s = SPOTS[i % SPOTS.length];
    return { x: FIELD_X + s.x * FIELD_W, y: FIELD_Y + s.y * FIELD_H };
  }

  function newCreature(i) {
    var telegraphDur = 0.35;
    var activeDur = Math.max(0.95, 1.55 - i * 0.1);
    var p = spotPos(i);
    return { x: p.x, y: p.y, t: 0, telegraphDur: telegraphDur, activeDur: activeDur, caughtNow: false };
  }

  function initGame() {
    caught = 0; idx = 0; creature = newCreature(0);
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function fleeFail(cr) {
    ok = false; finished = true; hitStop = 0.3; shake = 0.25;
    game.feedback.bad(cr.x, cr.y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function tryCapture(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !creature) return;
    if (creature.t < creature.telegraphDur) { game.feedback.bad(x, y, { text: '' }); return; }
    var d = Math.hypot(x - creature.x, y - creature.y);
    if (d < 90) {
      creature.caughtNow = true;
      caught++;
      hitStop = 0.1;
      game.feedback.good(creature.x, creature.y, { text: 'GOOD', color: C.good });
      game.fx.burst(creature.x, creature.y, { color: C.good, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', FIELD_X, FIELD_Y - FIELD_H / 2 - 60, { color: C.gold, size: 36 });
      if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
      idx++; creature = newCreature(idx);
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryCapture(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawCreature(cr, bob) {
    if (!cr || cr.caughtNow) return;
    var tele = cr.t < cr.telegraphDur;
    if (tele) {
      var a = 0.25 + 0.25 * Math.sin(game.time.elapsed * 14);
      game.draw.circle(cr.x, cr.y, 60, C.creature, a);
      return;
    }
    var p = (cr.t - cr.telegraphDur) / cr.activeDur;
    var warn = p > 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.circle(cr.x, cr.y, 70, warn ? C.bad : C.creature, 0.22);
    game.draw.sprite(CREATURE_S, { '#': C.creature }, cr.x, cr.y + bob, 20, { anchor: 'center' });
    game.draw.circle(cr.x - 8, cr.y - 10 + bob, 6, C.creatureCore, 0.9);
  }

  var demo = { t: 0, gx: FIELD_X, gy: FIELD_Y, press: false };
  var demoCreature = null, demoIdx = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demoIdx = 0; demoCreature = newCreature(0); demoCreature.activeDur = 1.3; }
    if (demoCreature) {
      demoCreature.t += dt;
      var totalDur = demoCreature.telegraphDur + demoCreature.activeDur;
      var p = demoCreature.t / totalDur;
      if (demoCreature.t >= demoCreature.telegraphDur && demoCreature.t < demoCreature.telegraphDur + 0.08 && !demoCreature.caughtNow) {
        // ready to grab (no-op marker)
      }
      if (p > 0.45 && p < 0.6 && !demoCreature.caughtNow) {
        demoCreature.caughtNow = true;
        demo.gx = demoCreature.x; demo.gy = demoCreature.y; demo.press = true;
        game.feedback.good(demoCreature.x, demoCreature.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      if (p >= 1) { demoCreature = null; demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 3) * 6;

    if (state === S.ATTRACT) {
      if (caught === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCreature(demoCreature, bob);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '体!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
    } else if (!finished && creature) {
      creature.t += dt;
      var totalDur = creature.telegraphDur + creature.activeDur;
      if (creature.t >= totalDur && !creature.caughtNow) fleeFail(creature);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawCreature(creature, bob);

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

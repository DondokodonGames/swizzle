// K-DS-0017-trapdoor-pop-burst.js
// トラップドア飛び出し — 仕掛け床の下でバネを溜め、合図灯が変わった瞬間に飛び出す
// 操作: 指を押し続けてバネを溜め、合図灯が緑に変わった瞬間に指を離して飛び出す
// 終わり: 規定回数(5回)を良いタイミングで飛び出せば成功。3回失敗すれば失敗
// @mechanic: hold_charge
// @theme: stage_trapdoor_launch
// 世界観: 見世物小屋の仕掛け舞台。演者が床下のバネ台に潜み、合図灯が変わる刹那を狙ってトラップドアから飛び出す出し物
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めた飛び出し回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 明るい原色+太い輪郭線、はっきりした陰影ブロック
  var C = {
    bg: '#2a1030', bg2: '#160820', stage: '#3a1a44', stageEdge: '#160820',
    door: '#e8563d', doorDark: '#a5321f', lampRed: '#ff3b3b', lampGreen: '#3bff7a',
    good: '#3bff7a', bad: '#ff4d5e', gold: '#ffe14a', white: '#fff6ea', ink: '#100616',
  };

  var GAME_TITLE = 'POP BURST';
  var TOTAL = 5;
  var MISS_LIMIT = 3;
  var CX = W * 0.5, DOOR_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['..##..', '.####.', '#####.', '.#.#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.line(W * (0.1 + i * 0.2), H * 0.08, CX, H * 0.7, C.stageEdge, 8);
    game.draw.rect(0, DOOR_Y + 120, W, H, C.stage);
  }

  var round, charge, holding, lampState, cueTimer, cueTarget, pop, popT, misses, cleared;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    round = 0; charge = 0; holding = false; lampState = 'red'; cueTimer = 0; cueTarget = 0;
    pop = false; popT = 0; misses = 0; cleared = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newRound();
  }

  function newRound() {
    lampState = 'red'; cueTimer = 0; cueTarget = 0.9 + Math.random() * 0.9; charge = 0; holding = false; pop = false;
  }

  function press() {
    if (ready > 0 || done || finished || hitStop > 0 || pop) return;
    holding = true;
    game.audio.play('se_tap', 0.06);
  }

  function release(x, y) {
    if (ready > 0 || done || finished || hitStop > 0 || pop || !holding) return;
    holding = false;
    pop = true; popT = 0.4;
    var good = lampState === 'green' && charge > 0.3;
    hitStop = good ? 0.12 : 0.3;
    if (good) {
      cleared++;
      game.feedback.good(CX, DOOR_Y, { text: 'NICE', color: C.good });
      game.fx.burst(CX, DOOR_Y, { color: C.gold, count: 18, speed: 340 });
      game.audio.play('se_powerup', 0.4);
      if (cleared >= Math.ceil(TOTAL / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup(cleared + ' / ' + TOTAL, CX, DOOR_Y - 300, { color: C.gold, size: 38 });
      }
      if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
    } else {
      misses++;
      game.feedback.bad(CX, DOOR_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
    round++;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) press(); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) release(x, y); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(chargeLocal, lampLocal, popLocal, popTLocal) {
    bg();
    var sink = popLocal ? Math.max(0, 1 - popTLocal / 0.4) : 0;
    var lift = popLocal ? sink * 420 : 0;
    game.draw.circle(CX - 90, DOOR_Y + 70, 30, lampLocal === 'green' ? C.lampGreen : C.lampRed);
    game.draw.circle(CX + 90, DOOR_Y + 70, 30, lampLocal === 'green' ? C.lampGreen : C.lampRed);
    game.draw.rect(CX - 130, DOOR_Y, 260, 30, C.doorDark);
    game.draw.rect(CX - 130 + 4, DOOR_Y - chargeLocal * 12, (260 - 8) * chargeLocal, 10, C.gold);
    game.draw.sprite(PERFORMER, { '#': C.white }, CX, DOOR_Y - 40 - lift, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: DOOR_Y + 220, press: false, charge: 0, lamp: 'red', cueT: 0, cueTarget: 1.1, pop: false, popT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.charge = 0; demo.lamp = 'red'; demo.cueT = 0; demo.pop = false; demo.press = false; }
    if (!demo.pop) {
      demo.cueT += dt;
      if (demo.cueT > demo.cueTarget && demo.lamp === 'red') demo.lamp = 'green';
      if (!demo.press && demo.cueT > 0.3) { demo.press = true; }
      if (demo.press) demo.charge = Math.min(1, demo.charge + dt * 1.6);
      if (demo.lamp === 'green' && demo.charge > 0.5 && demo.press) {
        demo.pop = true; demo.popT = 0; demo.press = false;
      }
    } else {
      demo.popT += dt;
    }
    charge = demo.charge; lampState = demo.lamp; pop = demo.pop; popT = demo.popT;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.charge, demo.lamp, demo.pop, demo.popT);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(0, 'red', false, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - cleared <= 2) txt('あと' + (TOTAL - cleared) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, misses: misses });
        else game.end.failure({ cleared: cleared, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (pop) {
        popT -= dt;
        if (popT <= 0) newRound();
      } else {
        cueTimer += dt;
        if (lampState === 'red' && cueTimer > cueTarget) {
          lampState = 'green';
          game.audio.play('se_milestone', 0.3);
        }
        if (holding) charge = Math.min(1, charge + dt * 1.4);
        if (cueTimer > cueTarget + 1.1 && lampState === 'green') {
          // 長く待ちすぎて機会を逃した
          holding = false;
          misses++;
          hitStop = 0.28;
          shake = 0.25;
          game.feedback.bad(CX, DOOR_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.35);
          if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
          else newRound();
        }
      }
    }
    if (shake > 0) shake -= dt;

    drawScene(charge, lampState, pop, popT);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['D4', 0.25], ['E4', 0.25], ['G4', 0.5]], { tempo: 130, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

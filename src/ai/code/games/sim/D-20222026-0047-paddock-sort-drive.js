// D-20222026-0047-paddock-sort-drive.js
// パドックソートドライブ — 放牧場に混ざった生き物を、種類ごとの柵へドラッグで送り込む
// 操作: 中央に集まった生き物を、同じ柄の柵までドラッグして離す
// 終わり: 規定数を正しい柵へ入れれば成功。違う柵へ入れる/時間切れで失敗
// @mechanic: drag_sort
// @theme: paddock_sort_drive
// 世界観: 朝の放牧場を任された若い牧童が、混ざってしまった生き物たちを柄ごとの柵へドラッグで送り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 送り込んだ数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い彩度、丸みのある枠、柔らかい影
  var C = {
    bg: '#fef3e6', bg2: '#fce0c6', pen: '#ffffff', penEdge: '#e8c9a0',
    good: '#5fd18a', bad: '#ff7d8a', gold: '#ffb94d', ink: '#5a3d2b',
    kinds: ['#f2a65a', '#7fc2e8', '#c98fd6'],
  };

  var GAME_TITLE = 'PADDOCK SORT';
  var TIME_LIMIT = 20;
  var NEED = 6;

  var PENS = [
    { x: W * 0.22, y: H * 0.24, kind: 0 },
    { x: W * 0.78, y: H * 0.24, kind: 1 },
    { x: W * 0.5, y: H * 0.24, kind: 2 },
  ];
  var PEN_R = 110;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREATURE_SPRITE = ['#.#.#', '#####', '.###.'];
  var HERDER_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#f2a65a', pulse * 0.2);
    game.draw.sprite(HERDER_SPRITE, { '#': C.ink }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  var creatures, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;
  var dragIdx, dragX, dragY;

  function spawnCreature() {
    var kind = Math.floor(Math.random() * PENS.length);
    var a = game.random(0, Math.PI * 2);
    var r = game.random(120, 300);
    return { kind: kind, x: W * 0.5 + Math.cos(a) * r, y: H * 0.62 + Math.sin(a) * r * 0.6, alive: true };
  }

  function initGame() {
    creatures = [];
    for (var i = 0; i < 5; i++) creatures.push(spawnCreature());
    hits = 0; timeLeft = TIME_LIMIT;
    dragIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawPens() {
    for (var i = 0; i < PENS.length; i++) {
      var p = PENS[i];
      game.draw.circle(p.x, p.y, PEN_R, C.pen);
      game.draw.circle(p.x, p.y, PEN_R, C.penEdge, 0.7);
      game.draw.circle(p.x, p.y, PEN_R * 0.5, C.kinds[p.kind], 0.7);
    }
  }
  function drawCreatures() {
    for (var i = 0; i < creatures.length; i++) {
      var c = creatures[i];
      if (!c.alive) continue;
      var bob = Math.sin(game.time.elapsed * 2.6 + i) * 4;
      var x = (i === dragIdx) ? dragX : c.x;
      var y = (i === dragIdx) ? dragY : c.y + bob;
      game.draw.circle(x, y, 58, C.kinds[c.kind]);
      game.draw.sprite(CREATURE_SPRITE, { '#': '#4a2f1c' }, x, y, 16, { anchor: 'center' });
    }
  }

  function tryDrop(i, x, y) {
    var c = creatures[i];
    for (var p = 0; p < PENS.length; p++) {
      if (Math.hypot(x - PENS[p].x, y - PENS[p].y) < PEN_R) {
        if (PENS[p].kind === c.kind) {
          c.alive = false;
          hits++;
          game.feedback.good(x, y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.4);
          if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', x, y - 90, { color: C.gold, size: 32 });
          var remain = 0;
          for (var k = 0; k < creatures.length; k++) if (creatures[k].alive) remain++;
          if (remain < 3 && hits < NEED) creatures.push(spawnCreature());
          if (hits >= NEED) {
            finished = true; ok = true; hitStop = 0.3;
            game.fx.burst(x, y, { color: C.gold, count: 24, speed: 420 });
            game.audio.play('se_success', 0.5);
            finish();
          }
        } else {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(x, y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
        return;
      }
    }
    // dropped nowhere: snap back, small tap sound only
    game.audio.play('se_tap', 0.1);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    for (var i = 0; i < creatures.length; i++) {
      if (creatures[i].alive && Math.hypot(x - creatures[i].x, y - creatures[i].y) < 60) {
        dragIdx = i; dragX = x; dragY = y;
        game.audio.play('se_tap', 0.15);
        return;
      }
    }
  });
  game.onMove(function(x, y) { if (dragIdx >= 0) { dragX = x; dragY = y; } });
  game.onRelease(function(x, y) {
    if (dragIdx >= 0) {
      var i = dragIdx; dragIdx = -1;
      tryDrop(i, x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.62, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 2.0;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(NEED - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    var target = -1;
    for (var i = 0; i < creatures.length; i++) if (creatures[i].alive) { target = i; break; }
    if (target < 0) { creatures.push(spawnCreature()); return; }
    var c = creatures[target];
    var pen = PENS[c.kind];
    if (local < per * 0.65) {
      var t2 = local / (per * 0.65);
      demo.gx = c.x + (pen.x - c.x) * t2;
      demo.gy = c.y + (pen.y - c.y) * t2;
      demo.press = true;
      dragIdx = target; dragX = demo.gx; dragY = demo.gy;
    } else {
      demo.press = false;
      if (dragIdx === target) {
        dragIdx = -1;
        c.alive = false; hits = Math.min(NEED, hits + 1);
        game.feedback.good(pen.x, pen.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (creatures === undefined) initGame();
      stepDemo(dt);
      bg();
      drawPens();
      drawCreatures();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.40, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.44, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPens();
      drawCreatures();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.40, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.45, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '匹!', W / 2, H * 0.49, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.6, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPens();
    drawCreatures();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#e8c9a0', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.5]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

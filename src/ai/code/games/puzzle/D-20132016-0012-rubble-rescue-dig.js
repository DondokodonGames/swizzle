// D-20132016-0012-rubble-rescue-dig.js
// ラブルレスキュー — 崩れた坑道の瓦礫を正しい形の道具で崩し、閉じ込められた仲間を掘り出す
// 操作: 一番上の瓦礫の隙間に光る形と同じ道具を下の3択からタップして崩す
// 終わり: 制限時間内に全層を崩せば成功。時間切れなら失敗
// @mechanic: gap_fit
// @theme: collapsed_mine_rescue
// 世界観: 落盤事故のあった坑道。積み重なった瓦礫の下に仲間が埋まっており、隙間の形に合う道具を選んで一層ずつ崩し救出する
// 残るもの: 正誤(CLEAR/GAME OVER) + 崩せた層数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層背景で奥行き
  var C = {
    sky1: '#2b1c14', sky2: '#140b08', rock: '#4a3628', rockDark: '#2c1e15',
    gap: '#ffd166', lamp: '#ffe9a8', good: '#5ce87a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f4ead8', ink: '#0d0805', skin: '#e0a878',
  };

  var GAME_TITLE = 'RUBBLE RESCUE';
  var LAYERS = 6;
  var MAX_TIME = 20;
  var NEEDED = 6;
  var SHAPES = ['circle', 'square', 'tri', 'diamond'];

  var SPR = {
    circle: ['.###.', '#...#', '#...#', '#...#', '.###.'],
    square: ['#####', '#...#', '#...#', '#...#', '#####'],
    tri: ['..#..', '.###.', '##.##', '#####', '.....'],
    diamond: ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'],
  };
  var FRIEND_A = ['.##..', '#####', '.##..', '#.##.', '#...#'];
  var FRIEND_B = ['.##..', '#####', '.##..', '#.##.', '.#.#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var li, cleared, timeLeft, opts, done, endWait, finished;
  var ready, hitStop, shake, pop;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function rowY(i) { return H * 0.30 + i * (H * 0.30 / LAYERS); }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.1 + i * H * 0.08, W, 3, '#00000030');
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.sprite(['.#.', '###', '.#.', '.#.'], { '#': C.lamp }, W * 0.12, H * 0.10, 10, { anchor: 'center' });
    game.draw.sprite(['.#.', '###', '.#.', '.#.'], { '#': C.lamp }, W * 0.88, H * 0.10, 10, { anchor: 'center' });
  }

  function drawFriend() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    var frame = Math.floor(game.time.elapsed * 1.5) % 2 === 0 ? FRIEND_A : FRIEND_B;
    var glow = cleared / LAYERS;
    game.draw.circle(W * 0.5, H * 0.66 + bob, 60 + glow * 20, C.lamp, 0.08 + glow * 0.25);
    game.draw.sprite(frame, { '#': C.skin }, W * 0.5, H * 0.66 + bob, 14, { anchor: 'center' });
  }

  function drawStack() {
    for (var i = 0; i < LAYERS; i++) {
      var y = rowY(i);
      if (i < cleared) continue; // 崩し済み
      var isTop = i === cleared;
      var sway = isTop ? Math.sin(game.time.elapsed * 3) * 3 : 0;
      game.draw.rect(W * 0.22 + sway, y, W * 0.56, H * 0.30 / LAYERS - 6, isTop ? C.rock : C.rockDark, isTop ? 1 : 0.85);
      if (isTop) {
        var pulseA = 0.6 + 0.4 * Math.sin(game.time.elapsed * 5);
        game.draw.sprite(SPR[targetShape], { '#': C.gap }, W * 0.5 + sway, y + (H * 0.30 / LAYERS - 6) / 2, 8, { anchor: 'center', alpha: pulseA });
      }
    }
  }

  var targetShape;

  function newLayer() {
    targetShape = SHAPES[Math.floor(game.random(0, SHAPES.length))];
    var decoys = SHAPES.filter(function(s) { return s !== targetShape; });
    var d1 = decoys[Math.floor(game.random(0, decoys.length))];
    var rest = decoys.filter(function(s) { return s !== d1; });
    var d2 = rest[Math.floor(game.random(0, rest.length))];
    var arr = [targetShape, d1, d2];
    // shuffle
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    opts = arr;
  }

  function initGame() {
    li = 0; cleared = 0; timeLeft = MAX_TIME; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pop = 0;
    newLayer();
  }

  function optX(idx) { return W * (0.24 + idx * 0.26); }
  var OPT_Y = H * 0.84;
  var OPT_R = 90;

  function resolvePick(idx, px, py) {
    if (done || finished || ready > 0) return;
    if (opts[idx] === targetShape) {
      cleared++;
      hitStop = 0.12;
      game.feedback.good(px, py, { text: 'GOOD', color: C.good });
      game.fx.burst(px, py, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_break', 0.5);
      if (cleared === Math.ceil(LAYERS / 2)) { game.fx.popup(cleared + ' / ' + LAYERS, W * 0.5, H * 0.5, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (cleared >= LAYERS) {
        ok = true; finished = true;
        game.audio.play('se_powerup', 0.5);
        finish();
        return;
      }
      newLayer();
    } else {
      timeLeft = Math.max(0, timeLeft - 1.5);
      shake = 0.2;
      game.feedback.bad(px, py, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    for (var i = 0; i < 3; i++) {
      if (game.hit.circle(x, y, 1, optX(i), OPT_Y, OPT_R)) { game.audio.play('se_tap', 0.15); resolvePick(i, x, y); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: optX(0), gy: OPT_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var phase = cyc % 0.9;
    var pickIdx = opts.indexOf(targetShape);
    demo.gx = optX(pickIdx); demo.gy = OPT_Y;
    demo.press = phase > 0.55;
    if (phase > 0.6 && phase < 0.6 + dt * 1.5 && !done && !finished) {
      resolvePick(pickIdx, demo.gx, demo.gy);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      stepDemo(dt);
      drawStack();
      drawFriend();
      for (var i = 0; i < 3; i++) game.draw.sprite(SPR[opts[i]], { '#': C.white }, optX(i), OPT_Y, 8, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawStack(); drawFriend();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + LAYERS, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (LAYERS - cleared) + '層!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, layers: LAYERS });
        else game.end.failure({ cleared: cleared, layers: LAYERS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.35;
        game.feedback.bad(W * 0.5, rowY(cleared), { text: 'MISS' });
        shake = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (pop > 0) pop -= dt;

    bg();
    drawStack();
    drawFriend();
    for (var j = 0; j < 3; j++) {
      var glowW = (timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0) ? C.bad : C.white;
      game.draw.circle(optX(j), OPT_Y, OPT_R, '#00000040');
      game.draw.sprite(SPR[opts[j]], { '#': glowW }, optX(j), OPT_Y, 8, { anchor: 'center' });
    }
    txt(cleared + ' / ' + LAYERS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / MAX_TIME), 16, timeLeft < 3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['Eb3', 0.5], ['G3', 0.5], ['C4', 1]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

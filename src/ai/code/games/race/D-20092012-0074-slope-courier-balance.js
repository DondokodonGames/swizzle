// D-20092012-0074-slope-courier-balance.js
// スロープクーリエ・バランス — 山道を自転車で下る配達人。でこぼこに揺さぶられても重心を保って完走する
// 操作: 道の左右どちらかに体が揺れたら、逆側の親指ゾーンをタップして重心を戻す
// 終わり: ゴールの距離まで転倒せず走り切れば成功。重心が限界まで傾けば失敗
// @mechanic: balance
// @theme: mountain_courier_descent
// 世界観: 山間の集落へ荷物を届ける自転車配達人。石だらけの急な下り坂を、体重移動だけで転ばずに駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した坂の距離%
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似3D道路。横1pxストリップの走査線で遠近を表現
  var STYLE = { bg: ['#6fb8e0', '#cfe8c8'], main: ['#4a4238', '#847a68'], accent: ['#ff9a2e', '#2ecc71'] };
  var C = {
    sky1: '#7fc4e8', sky2: '#dff0d8', mtn: '#5a92a8', mtnFar: '#8fb8c8',
    road: '#5e564a', roadEdge: '#3c362c', line: '#f0e6c8',
    rider: '#2f2a24', jersey: '#ff9a2e', bad: '#ff4d5e', good: '#2ecc71',
    gold: '#ffd400', white: '#fff8ec', ink: '#1a1410',
  };

  var GAME_TITLE = 'SLOPE COURIER';
  var RUN_TIME = 19;
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIDER_A = ['..##..', '.####.', '..##..', '#####.', '.#.#..'];
  var RIDER_B = ['..##..', '.####.', '..##..', '.#####', '..#.#.'];

  var runT, balance, bumps, nextBumpIdx, done, endWait, finished, wobble, milestoneShown;
  var ready, hitStop, shake, scrollOfs;

  function scheduleBumps() {
    // 走行中に発生するでこぼこイベント。後半ほど間隔が詰まる=難易度上昇
    var arr = [];
    var t = 2.0;
    var idx = 0;
    while (t < RUN_TIME - 1.2) {
      var side = Math.random() < 0.5 ? -1 : 1;
      var power = 0.34 + Math.min(0.28, idx * 0.035);
      arr.push({ t: t, side: side, power: power, telegraphed: false, hit: false });
      t += Math.max(1.5, 2.6 - idx * 0.18);
      idx++;
    }
    return arr;
  }

  function initGame() {
    runT = 0; balance = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; scrollOfs = 0; wobble = 0; milestoneShown = false;
    bumps = scheduleBumps();
  }

  function lean(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    balance += dir * 0.30;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(dir < 0 ? W * 0.18 : W * 0.82, H * 0.85, { color: C.gold, count: 6, speed: 160 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { lean(x < W * 0.5 ? -1 : 1); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H * 0.42, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(elapsed * 1.2));
    // 遠景の山並み
    for (var i = 0; i < 4; i++) {
      var mx = ((i * 340 - (elapsed * 12) % 340) + W) % (W + 300) - 150;
      game.draw.circle(mx, H * 0.4, 160, C.mtnFar, 0.6);
    }
    for (var j = 0; j < 3; j++) {
      var mx2 = ((j * 420 - (elapsed * 22) % 420) + W) % (W + 400) - 200;
      game.draw.circle(mx2, H * 0.42, 120, C.mtn, 0.7);
    }
  }

  function drawRoad(bal, dt) {
    var topY = H * 0.34, botY = H * 1.0;
    var rows = 46;
    scrollOfs += dt * (3 + (finished ? 0 : 2));
    for (var i = 0; i < rows; i++) {
      var t = i / (rows - 1);
      var y = topY + (botY - topY) * t;
      var rowH = ((botY - topY) / rows) + 1;
      var wRoad = 40 + Math.pow(t, 1.7) * (W * 0.9);
      var curve = bal * t * t * 90;
      var cx = CX + curve;
      var dash = Math.floor(t * 24 + scrollOfs) % 2 === 0;
      game.draw.rect(cx - wRoad / 2 - 10, y, wRoad + 20, rowH + 1, C.roadEdge);
      game.draw.rect(cx - wRoad / 2, y, wRoad, rowH + 1, C.road);
      if (dash) game.draw.rect(cx - Math.max(2, wRoad * 0.01), y, Math.max(4, wRoad * 0.02), rowH + 1, C.line);
    }
  }

  function drawBump(b, dt) {
    if (b.hit || b.t < runT + 0.0) return;
    var untilImpact = b.t - runT;
    if (untilImpact < 0.7 && untilImpact > -0.05) {
      var t = 1 - Math.max(0, untilImpact) / 0.7;
      var y = H * 0.5 + t * (H * 0.42);
      var wRoad = 40 + Math.pow(0.5 + t * 0.5, 1.7) * (W * 0.9);
      var cx = CX + b.side * wRoad * 0.28;
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) game.draw.circle(cx, y, 18 + t * 10, C.bad, 0.85);
    }
  }

  var demo = { t: 0, gx: CX * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    runT = Math.min(RUN_TIME, cyc);
    for (var i = 0; i < bumps.length; i++) {
      var b = bumps[i];
      var until = b.t - runT;
      if (until < 0.6 && until > 0 && !b.telegraphed) { b.telegraphed = true; }
      if (until <= 0 && !b.hit) {
        b.hit = true;
        var counter = -b.side;
        demo.gx = counter < 0 ? W * 0.18 : W * 0.82;
        demo.press = true;
        balance = b.side * 0.3 + counter * 0.28;
      }
    }
    balance *= 0.9;
    if (runT >= RUN_TIME - 0.05) { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      drawRoad(balance, dt);
      for (var i = 0; i < bumps.length; i++) drawBump(bumps[i], dt);
      game.draw.sprite(Math.floor(elapsed * 6) % 2 === 0 ? RIDER_A : RIDER_B, { '#': C.jersey }, CX + balance * 60, H * 0.86 + Math.sin(elapsed * 2.4) * 6, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawRoad(balance, 0);
      var pct = Math.round(Math.min(100, (runT / RUN_TIME) * 100));
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctF = Math.round(Math.min(100, (runT / RUN_TIME) * 100));
        if (ok) game.end.success(pctF, { pct: pctF }); else game.end.failure({ pct: pctF });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      runT += dt;
      balance *= 0.985;
      for (var k = 0; k < bumps.length; k++) {
        var b = bumps[k];
        if (!b.hit && runT >= b.t) {
          b.hit = true;
          balance += b.side * b.power;
        }
      }
      if (Math.abs(balance) >= 1.0) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(CX + balance * 200, H * 0.86, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (runT >= RUN_TIME) {
        ok = true; finished = true; hitStop = 0.1;
        game.feedback.good(CX, H * 0.86, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, H * 0.86, { color: C.gold, count: 18, speed: 340 });
        finish();
      } else if (!milestoneShown && runT >= RUN_TIME * 0.5) {
        milestoneShown = true;
        game.fx.popup('50%', CX, H * 0.6, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    drawRoad(balance, dt);
    if (!finished) for (var m = 0; m < bumps.length; m++) drawBump(bumps[m], dt);
    game.draw.sprite(Math.floor(elapsed * 6) % 2 === 0 ? RIDER_A : RIDER_B, { '#': C.jersey }, CX + balance * 60, H * 0.86, 18, { anchor: 'center' });

    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, runT / RUN_TIME), 16, C.gold);
    txt(Math.round(Math.min(100, (runT / RUN_TIME) * 100)) + ' / 100', W / 2, H * 0.06, 32, C.white);
    // 重心ゲージ(親指ゾーン上部)
    game.draw.rect(W * 0.5 - 220, H * 0.78, 440, 20, C.ink, 0.5);
    game.draw.rect(W * 0.5 - 8, H * 0.78, 16, 20, C.white);
    game.draw.circle(W * 0.5 + balance * 200, H * 0.78 + 10, 14, Math.abs(balance) > 0.7 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.5], ['B3', 0.5], ['D4', 0.5], ['G4', 1]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20172021-0053-back-alley-bloom-errand.js
// 裏路地ブルーム・エラン — 指先を辿らせて路地を回り、萎れた鉢植えに触れて花を咲かせながら用事を終える
// 操作: 画面を指で押さえたまま路地の中をなぞるように動かし、萎れた鉢植えの上を通って花を咲かせる
// 終わり: 規定数(6鉢)全て咲かせれば成功。時間切れで失敗
// @mechanic: drag_follow
// @theme: back_alley_bloom_errand
// 世界観: 住宅街を回る便利屋見習いが、指先を頼りに路地を歩き回り、萎れた鉢植えを見つけては小さな灯り虫の仲間を引き連れて次々と花を咲かせ、日暮れ前に用事を終わらせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 咲かせた鉢の数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 彩度高めの夕景、太い輪郭、ネオンに寄せすぎないレトロポップ配色
  var C = {
    bg: '#2b1f45', bg2: '#48305a', road: '#3a2a55', roadLine: '#6a4a80',
    pot: '#8a5a3a', potDark: '#5a3820', wilt: '#7a6a3a', bloom: '#ff7ab8',
    courier: '#ffd24a', courierDark: '#c99a1a', firefly: '#7dffd4',
    good: '#4fe0a0', bad: '#ff5d6c', gold: '#ffd24a', ink: '#1c1230', white: '#fff3ff',
  };

  var GAME_TITLE = 'ALLEY BLOOM';
  var NEEDED = 4;
  var TIME_LIMIT = 11;
  var TOUCH_R = 66;
  var TRAIL_LEN = 18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COURIER_SPR = ['.##.', '####', '.##.', '#.##'];
  var FIREFLY_SPR = ['.#.', '###', '.#.'];
  var POT_SPR = ['#####', '.###.'];

  var SPOTS = [
    { x: W * 0.2, y: H * 0.24 }, { x: W * 0.75, y: H * 0.2 },
    { x: W * 0.5, y: H * 0.32 }, { x: W * 0.16, y: H * 0.46 },
    { x: W * 0.82, y: H * 0.42 }, { x: W * 0.42, y: H * 0.56 },
  ];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 4; i++) {
      var ly = H * 0.16 + i * H * 0.12;
      game.draw.line(W * 0.08, ly, W * 0.92, ly, C.roadLine, 2, 0.12);
    }
  }

  function drawSpots() {
    for (var i = 0; i < SPOTS.length; i++) {
      var s = SPOTS[i];
      var b = bloomed[i];
      var bob = Math.sin(game.time.elapsed * 2 + i) * 4;
      game.draw.circle(s.x, s.y + bob, 44, b ? C.bloom : C.wilt, 0.35);
      game.draw.sprite(POT_SPR, { '#': b ? C.bloom : C.potDark }, s.x, s.y + bob, 16, { anchor: 'center' });
      if (!b) game.draw.circle(s.x, s.y + bob - 30, 6, C.wilt, 0.7 + 0.2 * Math.sin(game.time.elapsed * 3 + i));
    }
  }

  function drawCourier(cx, cy, trail) {
    for (var f = 0; f < firefliesN; f++) {
      var idx = Math.min(trail.length - 1, 4 + f * 5);
      var p = trail[idx] || { x: cx, y: cy };
      var bob = Math.sin(game.time.elapsed * 5 + f * 2) * 6;
      game.draw.circle(p.x, p.y + bob, 16, C.firefly, 0.35);
      game.draw.sprite(FIREFLY_SPR, { '#': C.firefly }, p.x, p.y + bob, 10, { anchor: 'center' });
    }
    game.draw.circle(cx, cy, 40, C.courierDark, 0.4);
    game.draw.sprite(COURIER_SPR, { '#': C.courier }, cx, cy, 16, { anchor: 'center' });
  }

  var courierX, courierY, trail, bloomed, bloomCount, firefliesN, timeLeft, halfCalled, moving;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    courierX = W * 0.5; courierY = H * 0.7;
    trail = []; bloomed = SPOTS.map(function() { return false; });
    bloomCount = 0; firefliesN = 0; timeLeft = TIME_LIMIT; halfCalled = false; moving = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tryBloom() {
    for (var i = 0; i < SPOTS.length; i++) {
      if (bloomed[i]) continue;
      if (game.hit.circle(courierX, courierY, 1, SPOTS[i].x, SPOTS[i].y, TOUCH_R)) {
        bloomed[i] = true; bloomCount++;
        hitStop = 0.05;
        game.feedback.good(SPOTS[i].x, SPOTS[i].y, { text: '+1', color: C.good });
        game.fx.burst(SPOTS[i].x, SPOTS[i].y, { color: C.bloom, count: 18, speed: 340 });
        game.audio.play('se_coin', 0.3);
        if (bloomCount % 2 === 0 && firefliesN < 3) firefliesN++;
        if (bloomCount === Math.ceil(NEEDED / 2)) game.fx.popup(bloomCount + ' / ' + NEEDED, courierX, courierY - 140, { color: C.gold, size: 34 });
        if (bloomCount >= NEEDED) { ok = true; finished = true; finish(); }
      }
    }
  }

  function moveTo(x, y) {
    if (ready > 0 || finished || done) return;
    moving = true;
    courierX += (x - courierX) * 0.55;
    courierY += (y - courierY) * 0.55;
    trail.unshift({ x: courierX, y: courierY });
    if (trail.length > TRAIL_LEN) trail.pop();
    tryBloom();
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.1); moveTo(x, y); }
  });
  game.onMove(function(x, y) { if (state === S.PLAYING) moveTo(x, y); });
  game.onRelease(function() { moving = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.7, press: true, targetIdx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.targetIdx = 0; }
    var t = SPOTS[demo.targetIdx];
    demo.gx += (t.x - demo.gx) * Math.min(1, dt * 3);
    demo.gy += (t.y - demo.gy) * Math.min(1, dt * 3);
    demo.press = true;
    moveTo(demo.gx, demo.gy);
    if (bloomed[demo.targetIdx]) demo.targetIdx = Math.min(SPOTS.length - 1, demo.targetIdx + 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bloomed === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSpots();
      drawCourier(courierX, courierY, trail);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSpots();
      drawCourier(courierX, courierY, trail);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(bloomCount + ' / ' + NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok && bloomCount >= NEEDED - 1) txt('あと1鉢!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(bloomCount * 25, { bloomed: bloomCount, total: NEEDED });
        else game.end.failure({ bloomed: bloomCount, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!halfCalled && timeLeft <= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('あと' + (NEEDED - bloomCount) + '鉢!', courierX, courierY - 140, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.2; shake = 0.2;
        game.feedback.bad(courierX, courierY, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSpots();
    drawCourier(courierX, courierY, trail);

    txt(bloomCount + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    var barW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, barW, 16, '#4a3a68', 1);
    game.draw.rect(60, 150, barW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

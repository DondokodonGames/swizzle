// I-Switch2-0007-belltower-relay-strike.js
// ベルタワーリレー — 塔の左右に立つ鐘突き番が交互に撞木を引いて大鐘を鳴らし続ける
// 操作: 光る側(左/右)の撞木エリアを交互にタップして鐘を打ち続ける
// 終わり: ゲージを満タン(10打)にすれば成功。同じ側を連続で押す・光っていない側を押すと失敗
// @mechanic: alternate_tap
// @theme: tower_bell_relay
// 世界観: 山寺の古い鐘楼。左右に構える二人の鐘突き番が、綱を交互に引いて大鐘を絶やさず鳴らし続ける奉納行
// 残るもの: 正誤(CLEAR/GAME OVER) + 鳴らせた打数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 質感のある素材表現。木目・金属の陰影を帯とグラデーションで模す
  var C = {
    bg: '#3a2c1e', bg2: '#4c3a26', wood: '#6b4a2c', woodDark: '#3a2814',
    bell: '#c8a24a', bellDark: '#7a5e24', bellShine: '#f0dca0',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff6e6', ink: '#160c04',
  };

  var GAME_TITLE = 'BELL RELAY';
  var NEEDED = 10;
  var CX = W * 0.5, CY = H * 0.42;
  var LZONE = { x: W * 0.24, y: H * 0.72 }, RZONE = { x: W * 0.76, y: H * 0.72 };
  var ZONE_R = 140;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, done, endWait, finished;
  var ready, hitStop, shake;
  var nextSide; // 'L' | 'R'
  var swingAng;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RINGER_L = ['.##.', '####', '.##.', '#..#'];
  var RINGER_R = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.rect(0, i * (H / 6), W, 3, '#00000010');
    }
    game.draw.rect(W * 0.2 - 20, H * 0.2, 40, H * 0.6, C.woodDark);
    game.draw.rect(W * 0.8 - 20, H * 0.2, 40, H * 0.6, C.woodDark);
  }

  function drawBell() {
    game.draw.circle(CX, CY, 170, C.bellDark);
    game.draw.circle(CX, CY, 150, C.bell);
    game.draw.circle(CX - 40, CY - 40, 40, C.bellShine, 0.5);
    var swing = Math.sin(swingAng) * 26;
    game.draw.line(CX + swing, CY + 150, CX + swing * 0.4, CY + 220, C.woodDark, 10);
  }

  function drawZones(activeSide) {
    var lOn = activeSide === 'L';
    var rOn = activeSide === 'R';
    game.draw.circle(LZONE.x, LZONE.y, ZONE_R, C.woodDark, lOn ? 0.9 : 0.35);
    game.draw.circle(RZONE.x, RZONE.y, ZONE_R, C.woodDark, rOn ? 0.9 : 0.35);
    if (lOn) game.draw.circle(LZONE.x, LZONE.y, ZONE_R + 14, C.gold, 0.5);
    if (rOn) game.draw.circle(RZONE.x, RZONE.y, ZONE_R + 14, C.gold, 0.5);
    game.draw.sprite(RINGER_L, { '#': C.white }, LZONE.x, LZONE.y, 20, { anchor: 'center' });
    game.draw.sprite(RINGER_R, { '#': C.white }, RZONE.x, RZONE.y, 20, { anchor: 'center', flipX: true });
  }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    nextSide = 'L'; swingAng = 0;
  }

  function tryZone(side) {
    if (ready > 0 || done || finished) return;
    var correct = side === nextSide;
    hitStop = correct ? 0.08 : 0.28;
    var pt = side === 'L' ? LZONE : RZONE;
    if (correct) {
      hits++;
      swingAng += side === 'L' ? -1 : 1;
      game.feedback.good(pt.x, pt.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      game.audio.tone('G4', 0.12, { wave: 'triangle', volume: 0.12 });
      if (hits === Math.ceil(NEEDED / 2)) game.fx.popup('HALFWAY!', CX, CY - 240, { color: C.gold, size: 40 });
      nextSide = side === 'L' ? 'R' : 'L';
      if (hits >= NEEDED) { ok = true; finished = true; finish(); return; }
    } else {
      game.feedback.bad(pt.x, pt.y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0) return;
    game.audio.play('se_tap', 0.05);
    var dL = Math.hypot(x - LZONE.x, y - LZONE.y);
    var dR = Math.hypot(x - RZONE.x, y - RZONE.y);
    if (dL < ZONE_R) tryZone('L');
    else if (dR < ZONE_R) tryZone('R');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LZONE.x, gy: LZONE.y, press: false, side: 'L', phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 0.9;
    if (cyc < dt || demo.t <= dt) {
      demo.side = demo.side === 'L' ? 'R' : 'L';
      var pt = demo.side === 'L' ? LZONE : RZONE;
      demo.gx = pt.x; demo.gy = pt.y; demo.press = true;
      swingAng += demo.side === 'L' ? -1 : 1;
      game.feedback.good(pt.x, pt.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    nextSide = demo.side;
    if (cyc > 0.3) demo.press = false;
  }

  game.onUpdate(function(dt) {
    swingAng += dt * 0.5;
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBell();
      drawZones(nextSide);
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
      drawBell();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (NEEDED - hits) + '打!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBell();
    if (!finished) drawZones(nextSide);

    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.52, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.6], ['G3', 0.6]], { tempo: 90, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

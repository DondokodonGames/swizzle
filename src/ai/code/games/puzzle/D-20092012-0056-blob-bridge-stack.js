// D-20092012-0056-blob-bridge-stack.js
// ブロブブリッジスタック — くっつく玉を積み上げて、旗の高さまで届く塔を一発勝負で築く
// 操作: 落とす玉を左右にドラッグして狙いを定め、指を離して積む。中心からずれるほど塔は傾く
// 終わり: 規定数(6個)積んで旗の高さに届けば成功。傾きが限界を超えて崩れれば失敗
// @mechanic: stack
// @theme: jelly_tower_workshop
// 世界観: くっつく玉を扱う小さな工房。玉を積み上げて旗の高さまで届く塔を一発で築く職人の腕試し
// 残るもの: 正誤(CLEAR/GAME OVER) + 崩れずに積めた個数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭線、平面的な陰影、明るい原色+白ハイライト
  var C = {
    bg: '#ffd9a0', bg2: '#ffb870', ground: '#c98a4a', groundEdge: '#7a4a1e',
    blob: '#ff6fa0', blobEdge: '#a83a66', blobHi: '#ffffff', flag: '#4fd4ff',
    good: '#5fd47a', bad: '#e0524f', gold: '#ffd23f', white: '#ffffff', ink: '#3a2010',
  };

  var GAME_TITLE = 'BLOB TOWER';
  var TOTAL = 6;
  var STEP = 92;
  var BASE_Y = H * 0.66;
  var AIM_Y = H * 0.22;
  var LANE_MIN = W * 0.18, LANE_MAX = W * 0.82;
  var LEAN_MAX = 210;
  var DROP_TIME = 3.2;
  var BLOB_R = 46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BLOB_SPR = ['.####.', '######', '#.##.#', '######', '.####.'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.86, W, H * 0.14, C.ground);
    game.draw.rect(0, H * 0.86, W, 6, C.groundEdge);
    ambient(t);
  }

  var blobs, center, lean, aimX, aiming, dropping, dropT, dropped, dropStartY, dropTargetY, dropAnimT;
  var done, endWait, finished, ready, hitStop, shake, collapsed;

  function initGame() {
    blobs = []; center = W / 2; lean = 0; aimX = W / 2; aiming = false;
    dropping = false; dropped = 0; dropT = DROP_TIME; dropAnimT = 0;
    done = false; endWait = 0; finished = false; collapsed = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function targetY() { return BASE_Y - TOTAL * STEP; }

  function releaseDrop() {
    if (dropping || finished || done || ready > 0) return;
    dropping = true; dropAnimT = 0;
    dropStartY = AIM_Y; dropTargetY = BASE_Y - dropped * STEP;
    game.audio.play('se_tap', 0.15);
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || dropping || finished || done || ready > 0) return;
    if (y < H * 0.4) { aiming = true; aimX = Math.max(LANE_MIN, Math.min(LANE_MAX, x)); }
  });
  game.onMove(function(x, y) { if (aiming) aimX = Math.max(LANE_MIN, Math.min(LANE_MAX, x)); });
  game.onRelease(function() { if (aiming) { aiming = false; releaseDrop(); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function landBlob() {
    var offset = aimX - center;
    lean += offset;
    center += offset * 0.5;
    blobs.push({ x: aimX, y: dropTargetY });
    dropped++;
    dropping = false;
    if (Math.abs(lean) > LEAN_MAX) {
      collapsed = true; ok = false; finished = true; hitStop = 0.35; shake = 0.4;
      game.feedback.bad(aimX, dropTargetY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    hitStop = 0.1;
    game.feedback.good(aimX, dropTargetY, { text: 'GOOD', color: C.good });
    game.fx.burst(aimX, dropTargetY, { color: C.gold, count: 12, speed: 260 });
    game.audio.play('se_good', 0.35);
    if (dropped === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.34, { color: C.gold, size: 38 });
    if (dropped >= TOTAL) { ok = true; finished = true; finish(); return; }
    aimX = center; dropT = DROP_TIME;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFlag(t) {
    var x = center + Math.sin(t * 1.4) * 6;
    game.draw.line(x, targetY() - 10, x, targetY() - 130, C.groundEdge, 8);
    game.draw.rect(x, targetY() - 130, 62, 42, C.flag);
  }

  function drawStack(t, shakeAmt) {
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var jx = b.x + (shakeAmt ? Math.sin(t * 40 + i) * shakeAmt : 0) + Math.sin(t * 1.6 + i) * 2;
      game.draw.circle(jx, b.y, BLOB_R + 6, C.blobEdge);
      game.draw.circle(jx, b.y, BLOB_R, C.blob);
      game.draw.circle(jx - 14, b.y - 14, 12, C.blobHi, 0.6);
    }
  }

  function drawAim(t) {
    if (dropping) {
      var p = Math.min(1, dropAnimT / 0.32);
      var y = dropStartY + (dropTargetY - dropStartY) * p;
      game.draw.circle(aimX, y, BLOB_R + 6, C.blobEdge);
      game.draw.circle(aimX, y, BLOB_R, C.blob);
    } else if (!finished) {
      var bob = AIM_Y + Math.sin(t * 3) * 8;
      game.draw.circle(aimX, bob, BLOB_R + 6, C.blobEdge);
      game.draw.sprite(BLOB_SPR, { '#': C.blob }, aimX, bob, 12, { anchor: 'center' });
      game.draw.line(aimX, bob + BLOB_R, aimX, BASE_Y - dropped * STEP - BLOB_R, C.white, 3);
    }
  }

  var demo = { t: 0, gx: W / 2, gy: AIM_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { blobs = []; center = W / 2; lean = 0; dropped = 0; dropping = false; }
    var seg = cyc % 0.7;
    var idx = Math.floor(cyc / 0.7);
    if (idx < 6 && !dropping && dropped === idx) {
      aimX = center + Math.sin(idx * 1.7) * 40;
      if (seg > 0.45) {
        demo.gx = aimX; demo.gy = AIM_Y; demo.press = true;
        if (seg > 0.6) { dropTargetY = BASE_Y - dropped * STEP; dropStartY = AIM_Y; dropping = true; dropAnimT = 0; }
      } else { demo.gx = aimX; demo.gy = AIM_Y; demo.press = false; }
    }
    if (dropping) {
      dropAnimT += dt;
      if (dropAnimT >= 0.32) {
        var offset = aimX - center;
        lean += offset; center += offset * 0.5;
        blobs.push({ x: aimX, y: dropTargetY }); dropped++;
        dropping = false;
        game.feedback.good(aimX, dropTargetY, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
    demo.press = dropping ? false : demo.press;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      stepDemo(dt);
      drawFlag(t);
      drawStack(t, 0);
      drawAim(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawFlag(t);
      drawStack(t, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(dropped + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - dropped) + '個!', W / 2, H * 0.16, 26, C.ink);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dropped, { dropped: dropped, total: TOTAL });
        else game.end.failure({ dropped: dropped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (dropping) {
        dropAnimT += dt;
        if (dropAnimT >= 0.32) landBlob();
      } else {
        dropT -= dt;
        if (dropT <= 0) releaseDrop();
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawFlag(t);
    drawStack(t, hitStop > 0 && collapsed ? 8 : 0);
    if (!finished || dropping) drawAim(t);

    txt(dropped + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    if (!dropping && !finished) {
      game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
      game.draw.rect(60, 150, (W - 120) * (dropT / DROP_TIME), 16, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.2]], { tempo: 130, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

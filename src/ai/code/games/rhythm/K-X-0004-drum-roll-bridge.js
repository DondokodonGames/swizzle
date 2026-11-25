// K-X-0004-drum-roll-bridge.js
// ドラムロールブリッジ — 連続する音符の間、太鼓を連打して吊り橋を張り続ける
// 操作: ロール区間が表示されている間、太鼓を連打してゲージを保つ。ゲージが落ち切る前に区間を抜ける
// 終わり: 3つのロール区間すべてをゲージ維持で渡り切れば成功。ゲージが空になれば失敗
// @mechanic: mash
// @theme: rope_bridge_drum_span
// 世界観: 谷にかかる吊り橋の太鼓仕掛け。連打が途切れると橋板が沈み、打ち手は連続する音符の間、絶え間なく太鼓を叩いて橋を張り渡す
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡り切った区間数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁。明るい背景、光の柱と祝祭演出
  var C = {
    bg1: '#2a6a8a', bg2: '#123a52', canyon: '#0a2438',
    plank: '#c88a3c', plankDark: '#8a5c22', rope: '#e8d0a0',
    drumBody: '#a85830', drumRim: '#e0a850', drumCenter: '#402014',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd44d', white: '#ffffff', ink: '#0a1a28',
  };

  var GAME_TITLE = 'ROLL BRIDGE';
  var DX = W * 0.5, DY = H * 0.58;
  var R = 170;
  var SEGMENTS = 3;
  var SEG_DUR = [1.6, 1.9, 2.2];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER_A = ['.##.', '####', '.##.', '#..#'];
  var WORKER_B = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.66, W, H * 0.1, C.canyon, 1);
    for (var i = 0; i < SEGMENTS; i++) {
      var x = W * (0.2 + i * 0.3);
      game.draw.line(x, H * 0.5, x, H * 0.7, C.rope, 6);
    }
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, C.rope, 0.015 + 0.03 * pulse);
  }

  function drawBridge(planks) {
    var segW = (W - 160) / SEGMENTS;
    for (var i = 0; i < SEGMENTS; i++) {
      var x = 80 + i * segW;
      var sag = i < planks ? 0 : (i === planks ? (1 - gauge) * 30 : 40);
      game.draw.rect(x, H * 0.66 + sag, segW - 10, 18, i <= planks ? C.plank : C.plankDark, 1);
    }
  }

  function drawDrum(flash) {
    game.draw.circle(DX, DY + 10, R + 16, '#00000030');
    game.draw.circle(DX, DY, R, flash ? C.white : C.drumRim);
    game.draw.circle(DX, DY, R - 40, flash ? C.white : C.drumBody);
    game.draw.circle(DX, DY, R - 70, C.drumCenter);
  }

  var seg, gauge, taps, done, endWait, finished, active, activeT, flashT;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    seg = 0; gauge = 1; taps = 0; done = false; endWait = 0; finished = false;
    active = true; activeT = SEG_DUR[0]; flashT = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function onHit(x, y) {
    if (done || ready > 0 || finished || !active) { game.audio.play('se_tap', 0.05); return; }
    taps++;
    gauge = Math.min(1, gauge + 0.09);
    flashT = 0.08;
    game.feedback.good(DX, DY, { text: null, color: C.good, count: 2 });
    game.audio.play('se_tap', 0.15);
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) onHit(x, y); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: DX, gy: DY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { gauge = 1; }
    gauge = Math.max(0, gauge - 0.35 * dt);
    demo.press = Math.floor(demo.t * 7) % 2 === 0;
    if (demo.press && !demo.did) { demo.did = true; gauge = Math.min(1, gauge + 0.1); game.audio.play('se_tap', 0.06); }
    if (!demo.press) demo.did = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gauge === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBridge(1);
      drawDrum(demo.press);
      game.draw.sprite(demo.t % 0.3 < 0.15 ? WORKER_A : WORKER_B, { '#': C.white }, W * 0.5, H * 0.24, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBridge(seg);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(seg + ' / ' + SEGMENTS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(seg, { seg: seg, total: SEGMENTS, taps: taps });
        else game.end.failure({ seg: seg, total: SEGMENTS, taps: taps });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      gauge = Math.max(0, gauge - 0.42 * dt);
      activeT -= dt;
      if (gauge <= 0) {
        hitStop = 0.32; shake = 0.28;
        game.feedback.bad(DX, DY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      } else if (activeT <= 0) {
        seg++;
        game.fx.popup((seg) + ' / ' + SEGMENTS, DX, H * 0.16, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
        if (seg >= SEGMENTS) { ok = true; finished = true; finish(); }
        else { activeT = SEG_DUR[seg]; gauge = 1; }
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawBridge(seg);
    if (!finished) drawDrum(flashT > 0);

    txt(seg + ' / ' + SEGMENTS, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 20, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * gauge, 20, gauge > 0.3 ? C.good : C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.15], ['B4', 0.15], ['D5', 0.15], ['G5', 0.3]], { tempo: 146, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

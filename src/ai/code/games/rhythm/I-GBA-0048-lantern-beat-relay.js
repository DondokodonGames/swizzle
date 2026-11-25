// I-GBA-0048-lantern-beat-relay.js
// ランタンビートリレー — 流れてくる灯りが輪に重なる拍にあわせてタップし続ける
// 操作: 蛍の灯りが中央の輪にちょうど重なった瞬間にタップする
// 終わり: 規定拍数(8拍)をリズムよく叩き切れば成功。タイミングを外せば失敗
// @mechanic: rhythm
// @theme: firefly_bridge_relay
// 世界観: 夜霧の吊り橋。橋番の蛙が太鼓の拍に合わせ、渡ってくる蛍の灯りを輪の中で受け取って橋を照らす
// 残るもの: 正誤(CLEAR/GAME OVER) + 叩けた拍数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、光の柱と祝祭演出
  var C = {
    bg: '#241a4a', bg2: '#120d2e', bridge: '#8a6a3a', bridgeEdge: '#5a4222',
    ring: '#ffffff', lantern: '#ffcf3f', good: '#4dffb0', bad: '#ff4d7a',
    accent: '#4dd0ff', gold: '#ffe066', white: '#ffffff', ink: '#140a2c',
  };

  var GAME_TITLE = 'BEAT RELAY';
  var N = 8;
  var BPM = 100;
  var BEAT = 60 / BPM; // 0.6s
  var MAX_TIME = N * BEAT + 2; // rhythm = A族 8-15s
  var NEEDED = N;
  var CX = W * 0.5, CY = H * 0.44, RING_R = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FROG = ['.#...#.', '#######', '#.###.#', '.#####.', '..###..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.circle((i * 180 + 60) % W, H * 0.18 + (i % 2) * 30, 4, C.lantern, 0.4);
    game.draw.rect(0, H * 0.60, W, 26, C.bridgeEdge);
    game.draw.rect(0, H * 0.60, W, 14, C.bridge);
    game.draw.sprite(FROG, { '#': C.accent }, W * 0.5, H * 0.12, 9, { anchor: 'center' });
  }

  var beatIdx, beatT, hits, hitThisBeat, timeLeft, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake, flashRing, missFlag;

  function initGame() {
    beatIdx = 0; beatT = 0; hits = 0; hitThisBeat = false; timeLeft = MAX_TIME; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashRing = 0; missFlag = false;
  }

  function lanternX(phase) { return CX - (1 - phase) * (W * 0.5); } // phase 0..1: 端→輪

  function doTap(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.15);
    var phase = (beatT % BEAT) / BEAT;
    var dist = Math.abs(0.5 - phase); // 0.5=拍のちょうど中間=輪に重なる瞬間と定義
    if (hitThisBeat) return;
    if (dist < 0.22) {
      hitThisBeat = true; hits++;
      flashRing = 0.15;
      game.feedback.good(CX, CY, { text: hits >= N ? 'CLEAR' : 'NICE', color: C.good });
      if (!milestoneShown && hits >= Math.ceil(N / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.28, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (hits >= N) { ok = true; finished = true; hitStop = 0.2; finish(); }
    } else {
      missFlag = true;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      ok = false; finished = true; hitStop = 0.35;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) doTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    var phase = (beatT % BEAT) / BEAT;
    var lx = CX - Math.cos(phase * Math.PI) * (W * 0.32);
    var ringCol = flashRing > 0 ? C.gold : C.ring;
    game.draw.circle(CX, CY, RING_R, ringCol, flashRing > 0 ? 0.9 : 0.5);
    game.draw.circle(CX, CY, RING_R - 16, C.ink, 0.2);
    game.draw.circle(lx, CY, 20, C.lantern);
    game.draw.circle(lx, CY, 30, C.lantern, 0.25);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BEAT * 3);
    if (cyc < dt || demo.t <= dt) { beatT = 0; hitThisBeat = false; flashRing = 0; }
    beatT = cyc;
    var phase = (beatT % BEAT) / BEAT;
    if (phase > 0.42 && phase < 0.58 && !hitThisBeat) {
      hitThisBeat = true;
      demo.gx = CX; demo.gy = CY; demo.press = true;
      flashRing = 0.15;
      game.feedback.good(CX, CY, { text: 'NICE', color: C.good });
      game.audio.play('se_tap', 0.15);
    } else if (phase < 0.3) {
      hitThisBeat = false; demo.press = false; demo.gx = W * 0.5; demo.gy = H * 0.9;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (beatT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      if (flashRing > 0) flashRing -= dt;
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + N, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (N - hits) + '拍!', W / 2, H * 0.155, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: N });
        else game.end.failure({ hits: hits, total: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt; timeLeft -= dt;
      var newIdx = Math.floor(beatT / BEAT);
      if (newIdx !== beatIdx) {
        if (!hitThisBeat && beatIdx >= 0) {
          // 直前の拍を叩けずに通り過ぎた
          missFlag = true;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          shake = 0.3; ok = false; finished = true; hitStop = 0.35; finish();
        }
        beatIdx = newIdx; hitThisBeat = false;
        if (!finished) game.audio.play('se_tap', 0.06);
      }
      if (flashRing > 0) flashRing -= dt;
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + N, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, hits / N), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['C4', 0.5], ['G3', 0.5], ['C4', 0.5]], { tempo: BPM, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

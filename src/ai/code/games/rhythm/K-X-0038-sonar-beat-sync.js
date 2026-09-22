// K-X-0038-sonar-beat-sync.js
// ソナービートシンク — 暗闇の中、一定間隔で鳴るソナー音の拍だけに合わせて連続でタップし続ける
// 操作: 画面はほぼ暗転。一定テンポで鳴るソナー音を聞き、その拍の瞬間ごとにタップし続ける
// 終わり: 規定8拍を音だけでズレずに合わせられれば成功。1拍でもズレれば失敗
// @mechanic: rhythm
// @theme: sonar_drum_diver
// 世界観: 光の届かない深海を行く潜水士。ガイドが打つソナーの拍だけを頼りに、姿は見えぬまま歩調を合わせて進む
// 残るもの: 正誤(CLEAR/GAME OVER) + ズレずに合わせられた拍数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 実物質感(金属パネル・計器盤)を面のグラデーションと縁取りで表現
  var C = {
    bg: '#08131a', bg2: '#0e1f28', panel: '#16303c', panelEdge: '#0a1a20',
    needle: '#ffcf4d', dial: '#0c2430', glow: '#3ad6ff',
    good: '#39ff6a', bad: '#ff4455', gold: '#ffe066', white: '#ffffff', ink: '#020608',
  };

  var GAME_TITLE = 'SONAR SYNC';
  var TOTAL = 8;
  var CX = W * 0.5, CY = H * 0.46;
  var BEAT_INTERVAL = 1.05;
  var WINDOW_SEC = 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var solved, done, endWait, finished, beatT, beatIdx, waitingTap, resolvedThisBeat;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER = ['.####.', '######', '.####.', '..##..', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(CX, CY, 300, C.panel, 0.5);
    game.draw.circle(CX, CY, 300, C.panelEdge, 0.9);
    game.draw.circle(CX, CY, 260, C.dial, 0.9);
    var bob = Math.sin(game.time.elapsed * 2.4) * 10;
    game.draw.sprite(DIVER, { '#': C.glow }, CX, CY + 420 + bob, 16, { anchor: 'center' });
  }

  function pulseBeat() {
    game.audio.tone(520, 0.15, { wave: 'sine', volume: 0.3 });
    game.fx.flash('#0a2030', 0.06);
  }

  function initGame() {
    solved = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; beatT = 0; beatIdx = 0; waitingTap = false; resolvedThisBeat = false;
  }

  function resolveTap() {
    if (ready > 0 || done || finished || !waitingTap || resolvedThisBeat) return;
    resolvedThisBeat = true;
    var dist = Math.abs(beatT);
    if (dist <= WINDOW_SEC) {
      solved++; hitStop = 0.06;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.3);
      if (solved === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 340, { color: C.gold, size: 40 });
      if (solved >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, nt: 0, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.nt -= dt;
    if (demo.nt <= 0) {
      demo.nt = BEAT_INTERVAL;
      pulseBeat();
      demo.press = true;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.18);
    } else if (demo.nt < BEAT_INTERVAL - 0.15) {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var needleAng = -Math.PI / 2 + (1 - Math.min(1, demo.nt / BEAT_INTERVAL)) * Math.PI * 1.6 - Math.PI * 0.8;
      game.draw.line(CX, CY, CX + Math.cos(needleAng) * 180, CY + Math.sin(needleAng) * 180, C.needle, 8);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(solved + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - solved) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(solved * 15, { solved: solved, total: TOTAL });
        else game.end.failure({ solved: solved, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { beatT = -BEAT_INTERVAL / 2; }
    } else if (!finished) {
      beatT += dt;
      if (!waitingTap && beatT >= -WINDOW_SEC) { waitingTap = true; resolvedThisBeat = false; }
      if (beatT >= 0 && beatT - dt < 0) pulseBeat();
      if (waitingTap && beatT > WINDOW_SEC && !resolvedThisBeat) {
        // このビートに一度もタップしなかった(見送り)
        resolvedThisBeat = true;
        hitStop = 0.35; shake = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
      if (beatT > WINDOW_SEC + 0.05) {
        beatT = -(BEAT_INTERVAL - WINDOW_SEC - 0.05);
        waitingTap = false;
        beatIdx++;
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var pulse = waitingTap ? Math.max(0, 1 - Math.abs(beatT) / WINDOW_SEC) : 0;
    game.draw.circle(CX, CY, 60 + pulse * 140, C.glow, 0.12 + pulse * 0.2);
    txt(solved + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (solved / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.85, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);

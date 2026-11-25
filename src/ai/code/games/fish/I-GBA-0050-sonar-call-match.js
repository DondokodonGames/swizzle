// I-GBA-0050-sonar-call-match.js
// ソナーコールマッチ — 似た魚群の鳴き声の中から、指定された音高の一匹だけを聞き分ける
// 操作: 最初に流れる基準音を覚え、同じ高さで鳴く魚をタップする
// 終わり: 規定数(4匹)を正しく聞き分ければ成功。誤ってタップするか時間切れで失敗
// @mechanic: spot
// @theme: deep_sea_sonar_operator
// 世界観: 深海調査船のソナー室。見た目が同じ魚群の中で、基準の鳴き声とぴったり同じ音高の一匹だけを操作員が耳で探し当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 聞き分けられた匹数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズ、擬似奥行き
  var C = {
    bg: '#0c1418', bg2: '#050a0d', panel: '#1c2a30', panelEdge: '#33474f',
    fish: '#3a5a62', fishEdge: '#5a828c', ring: '#2fd6c0',
    accent: '#2fd6c0', good: '#4dffb0', bad: '#ff5a5a', gold: '#ffd23f', white: '#eaf6f6', ink: '#050a0d',
  };

  var GAME_TITLE = 'SONAR MATCH';
  var TOTAL = 4;
  var ROUND_T = 3.4;
  var MAX_TIME = TOTAL * ROUND_T; // spot = F族 8-15s
  var NEEDED = TOTAL;
  var NOTES = ['C4', 'E4', 'G4', 'B4'];
  var N_FISH = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function fishPos(i) {
    var xs = [W * 0.28, W * 0.72, W * 0.28, W * 0.72];
    var ys = [H * 0.36, H * 0.36, H * 0.56, H * 0.56];
    return { x: xs[i], y: ys[i] };
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISH = ['..##....', '.######.', '#######.', '.######.', '..##....'];
  var OPERATOR = ['.###.', '#####', '.#.#.', '##.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 40; i++) {
      var nx = (i * 173) % W, ny = (i * 91) % H;
      game.draw.rect(nx, ny, 2, 2, '#ffffff08');
    }
    for (var r = 1; r <= 3; r++) game.draw.circle(W * 0.5, H * 0.46, r * 120, C.panelEdge, 0.12);
    game.draw.sprite(OPERATOR, { '#': C.accent }, W * 0.5, H * 0.12, 9, { anchor: 'center' });
  }

  var round, targetIdx, targetNote, pingT, pings, answered, roundT, placed, milestoneShown, wrongIdx;
  var done, endWait, finished;
  var ready, hitStop, shake, celebrate, refPlaying;

  function newRound(demoMode) {
    targetIdx = demoMode ? 2 : Math.floor(game.random(0, N_FISH));
    var pool = [0, 1, 2, 3];
    if (!demoMode) {
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(game.random(0, i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
    }
    pings = [0, 0, 0, 0];
    for (var k = 0; k < N_FISH; k++) pings[k] = 0.4 + k * 0.55;
    targetNote = NOTES[targetIdx];
    answered = false; roundT = 0; wrongIdx = -1; refPlaying = true;
  }

  function initGame() {
    round = 0; placed = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; celebrate = false;
    newRound(false);
  }

  function nextRound() {
    round++;
    if (round >= TOTAL) { ok = true; finished = true; hitStop = 0.2; celebrate = true; finish(); return; }
    newRound(false);
  }

  function tryPick(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished || answered) return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < N_FISH; i++) {
      var p = fishPos(i);
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < 90 && d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return;
    answered = true;
    game.audio.play('se_tap', 0.2);
    var p = fishPos(best);
    if (best === targetIdx) {
      placed++;
      game.feedback.good(p.x, p.y, { text: placed >= TOTAL ? 'CLEAR' : 'NICE', color: C.good });
      if (!milestoneShown && placed >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.22, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (placed >= TOTAL) { ok = true; finished = true; hitStop = 0.2; celebrate = true; finish(); }
      else hitStop = 0.12;
    } else {
      wrongIdx = best;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      shake = 0.3;
      ok = false; finished = true; hitStop = 0.35;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryPick(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFish(i, pulse) {
    var p = fishPos(i);
    var wrong = wrongIdx === i && hitStop > 0;
    var target = celebrate && i === targetIdx;
    var col = wrong ? C.bad : (target ? C.gold : C.fish);
    if (pulse > 0) game.draw.circle(p.x, p.y, 55 + pulse * 30, C.ring, 0.25 * (1 - pulse));
    game.draw.circle(p.x, p.y, 58, C.panelEdge, 0.5);
    game.draw.sprite(FISH, { '#': col }, p.x, p.y, 10, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { newRound(true); demo.gx = W * 0.5; demo.gy = H * 0.9; demo.press = false; }
    roundT = cyc;
    if (cyc > 2.3 && cyc < 2.9 && !answered) {
      var t = Math.min(1, (cyc - 2.3) / 0.5);
      var p = fishPos(targetIdx);
      demo.gx = W * 0.5 + (p.x - W * 0.5) * t;
      demo.gy = H * 0.9 + (p.y - H * 0.9) * t;
      demo.press = t >= 1;
      if (t >= 1) {
        answered = true;
        game.feedback.good(p.x, p.y, { text: 'NICE', color: C.good });
        game.audio.play('se_tap', 0.15);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = 0; i < N_FISH; i++) {
        var pulse = 0;
        if (roundT < 0.5) pulse = 1 - roundT / 0.5; else if (Math.abs((roundT % pings[i]) ) < 0.15) pulse = 0.6;
        drawFish(i, i === targetIdx ? Math.max(0, 1 - (roundT % 0.9) / 0.9) : 0);
      }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 34, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j = 0; j < N_FISH; j++) drawFish(j, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(placed + ' / ' + TOTAL, W / 2, H * 0.105, 26, C.gold);
      if (!ok) txt('あと' + (TOTAL - placed) + '匹!', W / 2, H * 0.145, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placed, { placed: placed, total: TOTAL });
        else game.end.failure({ placed: placed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && answered && !finished) nextRound();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (refPlaying && roundT > 0.05) {
        refPlaying = false;
        game.audio.tone(targetNote, 0.4, { wave: 'sine', volume: 0.3 });
      }
      for (var k = 0; k < N_FISH; k++) {
        var prevCyc = Math.floor((roundT - dt) / pings[k]);
        var curCyc = Math.floor(roundT / pings[k]);
        if (curCyc !== prevCyc && roundT > 0.9) {
          game.audio.tone(NOTES[k], 0.22, { wave: 'sine', volume: k === targetIdx ? 0.22 : 0.16 });
        }
      }
      if (roundT >= ROUND_T && !answered) {
        answered = true;
        game.feedback.bad(fishPos(targetIdx).x, fishPos(targetIdx).y, { text: 'MISS' });
        shake = 0.3; ok = false; finished = true; hitStop = 0.35; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var m = 0; m < N_FISH; m++) {
      var pl = (roundT < 0.9) ? Math.max(0, 1 - roundT / 0.9) : Math.max(0, 1 - (roundT % pings[m]) / 0.3);
      drawFish(m, pl > 0.7 ? pl - 0.7 : 0);
    }

    txt(placed + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - roundT / ROUND_T), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.70, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);

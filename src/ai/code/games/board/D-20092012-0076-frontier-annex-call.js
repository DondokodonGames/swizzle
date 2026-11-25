// D-20092012-0076-frontier-annex-call.js
// フロンティア・アネックスコール — 拠点の周りに現れる無防備な土地を、ライバルより先に見抜いて併合する
// 操作: 3つの候補地のうち守備の印(点)が一番少ない土地を、ライバルの矢印が着く前にタップ
// 終わり: 規定数の土地を併合できれば成功。誤タップ/ライバルに先を越されれば失敗
// @mechanic: judge
// @theme: border_annexation_council
// 世界観: 小さな評議会拠点を治める領主。地図の縁に現れる無防備な土地を、隣の勢力より早く見抜いて自領に組み込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 併合数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白紙に黒インク、差し色は最小限の1色のみ
  var STYLE = { bg: ['#f4f0e6', '#e8e2d2'], main: ['#2a241a', '#4a4232'], accent: ['#c1392b'] };
  var C = {
    paper1: '#f4f0e6', paper2: '#e8e2d2', ink: '#2a241a', own: '#2a241a', ownFill: '#3a3324',
    cand: '#f4f0e6', candLine: '#4a4232', rival: '#c1392b', good: '#4a7a3a', bad: '#c1392b',
    gold: '#c8942f', white: '#fffdf6',
  };

  var GAME_TITLE = 'FRONTIER ANNEX';
  var TOTAL = 4;
  var CX = W * 0.5, CY = H * 0.5;
  var RADIUS = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FLAG = ['.#.', '###', '.#.', '.#.'];

  var captured, cands, weakIdx, rivalP, rivalX, rivalY, roundT, roundLimit, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function makeCandidates() {
    var n = 3;
    var arr = [];
    var baseAngle = Math.random() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var ang = baseAngle + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      var r = RADIUS + Math.random() * 40 - 20;
      arr.push({
        x: CX + Math.cos(ang) * r, y: CY + Math.sin(ang) * r * 0.72,
        edgeX: CX + Math.cos(ang) * (r + 260), edgeY: CY + Math.sin(ang) * (r + 260) * 0.72,
        def: 1 + Math.floor(Math.random() * 3),
      });
    }
    var minDef = 99, wi = 0;
    for (var j = 0; j < arr.length; j++) if (arr[j].def < minDef) { minDef = arr[j].def; wi = j; }
    return { arr: arr, weak: wi };
  }

  function newRound() {
    var m = makeCandidates();
    cands = m.arr; weakIdx = m.weak;
    rivalP = 0; roundT = 0; roundLimit = Math.max(1.1, 1.9 - captured * 0.08);
    var t = cands[weakIdx];
    rivalX = t.edgeX; rivalY = t.edgeY;
  }

  function initGame() {
    captured = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newRound();
  }

  function pickTile(idx) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var t = cands[idx];
    game.audio.play('se_tap', 0.2);
    if (idx === weakIdx) {
      captured++;
      hitStop = 0.12;
      game.feedback.good(t.x, t.y, { text: 'GOOD' });
      game.fx.burst(t.x, t.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_coin', 0.4);
      if (!milestoneShown && captured === Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup(captured + ' / ' + TOTAL, CX, CY - 340, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (captured >= TOTAL) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      hitStop = 0.35; shake = 0.28;
      game.feedback.bad(t.x, t.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    for (var i = 0; i < cands.length; i++) {
      if (Math.hypot(x - cands[i].x, y - cands[i].y) < 90) { pickTile(i); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.paper1], [1, C.paper2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
    for (var i = 0; i < 12; i++) game.draw.line(0, i * (H / 12), W, i * (H / 12), '#00000006', 2);
  }

  function drawMap(bob) {
    var ownR = 90 + captured * 16;
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      game.draw.line(CX, CY, c.x, c.y, C.candLine, 3);
    }
    game.draw.circle(CX, CY + Math.sin(bob * 1.6) * 4, ownR, C.ownFill);
    game.draw.circle(CX, CY, ownR, C.own, 0);
    game.draw.sprite(FLAG, { '#': C.gold }, CX, CY - ownR - 30, 12, { anchor: 'center' });
    for (var j = 0; j < cands.length; j++) {
      var t = cands[j];
      var by = t.y + Math.sin(bob * 2 + j) * 5;
      game.draw.circle(t.x, by, 62, C.cand);
      game.draw.circle(t.x, by, 62, C.candLine, 0.5);
      for (var d = 0; d < t.def; d++) {
        game.draw.circle(t.x - 20 + d * 20, by, 7, C.ink);
      }
    }
  }

  function drawRival(p) {
    var t = cands[weakIdx];
    var x = rivalX + (t.x - rivalX) * p;
    var y = rivalY + (t.y - rivalY) * p;
    var danger = p > 0.55;
    if (danger) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) game.draw.circle(t.x, t.y, 78, C.rival, 0.45);
    }
    game.draw.circle(x, y, 16, C.rival);
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    roundT = Math.min(roundLimit, cyc);
    var target = cands[weakIdx];
    var arriveAt = roundLimit * 0.82;
    if (cyc < arriveAt) {
      demo.gx += (target.x - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (target.y - demo.gy) * Math.min(1, dt * 5);
      demo.press = cyc > arriveAt - 0.3;
    } else if (!demo._done) {
      demo._done = true;
      captured++;
    }
    if (cyc < dt) demo._done = false;
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      drawMap(elapsed);
      drawRival(Math.min(1, roundT / roundLimit) * 0.6);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawMap(elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(captured + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - captured) + '!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(captured, { captured: captured, total: TOTAL }); else game.end.failure({ captured: captured, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= roundLimit) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        var t = cands[weakIdx];
        game.feedback.bad(t.x, t.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    drawMap(elapsed);
    if (!finished) drawRival(Math.min(1, roundT / roundLimit));

    txt(captured + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.12);
    game.draw.rect(60, 150, (W - 120) * (captured / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

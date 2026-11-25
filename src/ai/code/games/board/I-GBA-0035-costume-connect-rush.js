// I-GBA-0035-costume-connect-rush.js
// コスチューム・コネクト — 早着替えステージ裏で、衣装パーツを指でドラッグしてマネキンの正しい位置に結ぶ
// 操作: 浮かんでいる衣装パーツを指でつまみ、マネキンの対応する場所までドラッグして結ぶ
// 終わり: 4か所すべて正しくつなげば成功。違う場所につなぐ/時間切れで失敗
// @mechanic: connect
// @theme: backstage_costume_change
// 世界観: 早着替えショーの舞台裏。進行マスコットが、幕が上がる前に衣装パーツをマネキンの正しい位置へ結び付ける
// 残るもの: 正誤(CLEAR/GAME OVER) + つなげたパーツ数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 質感テクスチャ、木目・フェルト・光沢ボタン、gradientで厚みを出す
  var C = {
    bg: '#4a2f1c', bg2: '#2c1a10', panel: '#6b4326', panelEdge: '#3a2414',
    felt: '#7a2020', mannequin: '#e8d9c0', mannequinEdge: '#c9b18a',
    piece: '#d1913a', pieceEdge: '#8a5a1e', lineOk: '#4fd67a', lineDrag: '#ffd25a',
    good: '#4fd67a', bad: '#ff4d4d', gold: '#ffd25a', white: '#fff3dd', ink: '#22140a',
  };

  var GAME_TITLE = 'COSTUME LINK';
  var TIME_LIMIT = 18;
  var CX = W * 0.5, CY = H * 0.44;
  var PICK_R = 76;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var TARGETS = [
    { id: 'collar', x: CX, y: CY - 150 },
    { id: 'sleeveL', x: CX - 120, y: CY - 30 },
    { id: 'sleeveR', x: CX + 120, y: CY - 30 },
    { id: 'hem', x: CX, y: CY + 190 },
  ];
  var SOURCES = [
    { id: 'collar', x: CX, y: CY - 320 },
    { id: 'sleeveL', x: CX - 300, y: CY + 10 },
    { id: 'sleeveR', x: CX + 300, y: CY + 10 },
    { id: 'hem', x: CX, y: CY + 420 },
  ];
  var NEEDED = TARGETS.length;

  var connected, dragging, dragSrc, dragX, dragY;
  var done, endWait, finished, wrongX, wrongY;
  var ready, hitStop, shake, timeLeft, telegraphWarned;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HOST_A = ['.##.', '####', '.##.', '#..#'];
  var HOST_B = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 3, C.panelEdge, 0.5);
    game.draw.rect(W * 0.1, H * 0.16, W * 0.8, H * 0.6, C.panel, 0.5);
  }

  function initGame() {
    connected = {}; dragging = false; dragSrc = null; dragX = 0; dragY = 0;
    done = false; endWait = 0; finished = false; wrongX = -200; wrongY = -200;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; telegraphWarned = false;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function countConnected() {
    var n = 0;
    for (var k in connected) if (connected[k]) n++;
    return n;
  }

  function fail(x, y) {
    hitStop = 0.32; wrongX = x; wrongY = y;
    ok = false; finished = true;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.28;
    finish();
  }

  function tryConnect(x, y) {
    for (var i = 0; i < TARGETS.length; i++) {
      var t = TARGETS[i];
      if (game.hit.circle(x, y, 40, t.x, t.y, PICK_R)) {
        if (t.id === dragSrc.id && !connected[t.id]) {
          connected[t.id] = true;
          game.feedback.good(t.x, t.y, { text: 'GOOD', color: C.good });
          game.fx.burst(t.x, t.y, { color: C.gold, count: 14, speed: 280 });
          game.audio.play('se_coin', 0.4);
          var n = countConnected();
          if (n === Math.ceil(NEEDED / 2)) {
            game.fx.popup('HALFWAY!', W / 2, H * 0.15, { color: C.gold, size: 36 });
            game.audio.play('se_milestone', 0.5);
          }
          if (n >= NEEDED) { ok = true; finished = true; finish(); }
        } else {
          fail(x, y);
        }
        return;
      }
    }
    fail(x, y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    for (var i = 0; i < SOURCES.length; i++) {
      var s = SOURCES[i];
      if (!connected[s.id] && game.hit.circle(x, y, 40, s.x, s.y, PICK_R)) {
        dragging = true; dragSrc = s; dragX = x; dragY = y;
        game.audio.play('se_tap', 0.08);
        return;
      }
    }
  });
  game.onMove(function(x, y) {
    if (!dragging || state !== S.PLAYING) return;
    dragX = x; dragY = y;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y) {
    if (!dragging || state !== S.PLAYING) return;
    dragging = false;
    game.audio.play('se_tap', 0.06);
    tryConnect(x, y);
    dragSrc = null;
  });

  function drawMannequin() {
    game.draw.circle(CX, CY - 180, 40, C.mannequinEdge);
    game.draw.rect(CX - 70, CY - 150, 140, 340, C.mannequin, 0.9);
    game.draw.rect(CX - 70, CY - 150, 140, 340, C.mannequinEdge, 0.25);
    for (var i = 0; i < TARGETS.length; i++) {
      var t = TARGETS[i];
      var on = !!connected[t.id];
      game.draw.circle(t.x, t.y, 26, on ? C.lineOk : C.felt, on ? 1 : 0.8);
      game.draw.circle(t.x, t.y, 26, C.pieceEdge, 0.5);
    }
  }

  function drawSources() {
    for (var i = 0; i < SOURCES.length; i++) {
      var s = SOURCES[i];
      if (connected[s.id]) continue;
      game.draw.circle(s.x, s.y, 34, C.pieceEdge);
      game.draw.circle(s.x, s.y, 26, C.piece);
    }
  }

  var demo = { t: 0, gx: SOURCES[0].x, gy: SOURCES[0].y, press: false, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { connected = {}; demo.idx = 0; }
    var per = 5.6 / SOURCES.length;
    var seg = Math.min(SOURCES.length - 1, Math.floor(cyc / per));
    var p = (cyc - seg * per) / per;
    var s = SOURCES[seg], t = TARGETS[seg];
    if (p < 0.6) { demo.gx = s.x + (t.x - s.x) * (p / 0.6); demo.gy = s.y + (t.y - s.y) * (p / 0.6); demo.press = p > 0.08; }
    else { demo.gx = t.x; demo.gy = t.y; demo.press = false; if (!connected[t.id]) { connected[t.id] = true; game.feedback.good(t.x, t.y, { text: 'GOOD', color: C.good }); game.audio.play('se_coin', 0.3); } }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawMannequin();
      drawSources();
      game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? HOST_A : HOST_B, { '#': C.gold }, W * 0.5, H * 0.88, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-') + ' / ' + NEEDED, W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawMannequin();
      drawSources();
      var n2 = countConnected();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(n2 + ' / ' + NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (NEEDED - n2) + '個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var n3 = countConnected();
        if (ok) game.end.success(n3, { connected: n3, needed: NEEDED });
        else game.end.failure({ connected: n3, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!telegraphWarned && timeLeft <= 3) {
        telegraphWarned = true;
        game.audio.tone(760, 0.12, { wave: 'square', volume: 0.15 });
      }
      if (timeLeft <= 0) fail(CX, CY);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMannequin();
    drawSources();
    if (dragging && dragSrc) {
      game.draw.line(dragSrc.x, dragSrc.y, dragX, dragY, C.lineDrag, 8);
      game.draw.circle(dragX, dragY, 22, C.lineDrag);
    }
    game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? HOST_A : HOST_B, { '#': hitStop > 0 ? C.bad : C.gold }, W * 0.5, H * 0.88, 18, { anchor: 'center' });

    txt(countConnected() + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 14, '#00000030', 1);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, telegraphWarned ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.25], ['A4', 0.25], ['C5', 0.25], ['F5', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

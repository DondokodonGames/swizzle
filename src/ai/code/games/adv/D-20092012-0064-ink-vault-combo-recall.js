// D-20092012-0064-ink-vault-combo-recall.js
// インクヴォルト・コンボリコール — 墨で描かれた地下納骨堂で、光った紋様札の順番を覚えて叩き返す
// 操作: 4枚の紋様札が順に光るのを見て、同じ順でタップして再現する
// 終わり: 提示された順番を最後まで正しく再現すれば成功。1回でも順番を間違えれば失敗
// @mechanic: memory_sequence
// @theme: ink_vault_delve
// 世界観: 白黒の墨絵で描かれた地下納骨堂を進む探索者。奥の扉は紋様札が示す順番でしか開かない。光る順を覚え、同じ順に叩いて封を解く
// 残るもの: 正誤(CLEAR/GAME OVER) + 再現できた手数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調、線の太さで語る
  var C = {
    bg: '#f2efe6', bg2: '#e6e0d0', ink: '#1a1a1a', inkSoft: '#3a3a3a',
    lit: '#1a1a1a', unlit: '#d8d2c0', good: '#2a2a2a', bad: '#1a1a1a',
    gold: '#1a1a1a', white: '#f2efe6',
  };

  var GAME_TITLE = 'VAULT RECALL';
  var CX = W * 0.5;
  var CARD_SYM = [
    ['.##.', '#..#', '#..#', '.##.'],
    ['#..#', '####', '#..#', '#..#'],
    ['.##.', '.##.', '.##.', '####'],
    ['#...', '###.', '#...', '####'],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var seq, showIdx, showT, inputIdx, phase, litCard, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000022', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var EXPLORER = ['.##.', '####', '.##.', '.##.'];

  // ディザ市松で薄墨の帯を作る(1BIT INK の中間色表現)
  function ditherBand(y, h, alpha) {
    for (var yy = 0; yy < h; yy += 4) {
      for (var xx = 0; xx < W; xx += 8) {
        if ((xx / 8 + yy / 4) % 2 === 0) game.draw.rect(xx, y + yy, 4, 2, C.ink, alpha);
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, C.ink, pulse);
    ditherBand(H * 0.18, 40, 0.4);
    game.draw.sprite(EXPLORER, { '#': C.ink }, W * 0.5, H * 0.20 + Math.sin(game.time.elapsed * 1.5) * 6, 18, { anchor: 'center' });
  }

  function cardPos(i) {
    return { x: W * (0.2 + (i % 2) * 0.6), y: H * (0.44 + Math.floor(i / 2) * 0.18) };
  }

  function drawCards(activeIdx) {
    for (var i = 0; i < 4; i++) {
      var p = cardPos(i);
      var isLit = i === activeIdx;
      game.draw.rect(p.x - 100, p.y - 100, 200, 200, C.ink, 0.15);
      game.draw.rect(p.x - 88, p.y - 88, 176, 176, isLit ? C.lit : C.unlit);
      game.draw.sprite(CARD_SYM[i], { '#': isLit ? C.white : C.ink }, p.x, p.y, 20, { anchor: 'center' });
    }
  }

  function newSeq(len) {
    var arr = [];
    for (var i = 0; i < len; i++) arr.push(Math.floor(game.random(0, 4)));
    return arr;
  }

  function initGame() {
    seq = newSeq(4); showIdx = 0; showT = 0.6; inputIdx = 0; phase = 'show'; litCard = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function tapCard(x, y) {
    if (ready > 0 || finished || phase !== 'input') return;
    for (var i = 0; i < 4; i++) {
      var p = cardPos(i);
      if (Math.abs(x - p.x) < 100 && Math.abs(y - p.y) < 100) {
        litCard = i;
        if (i === seq[inputIdx]) {
          game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.35);
          inputIdx++;
          if (!milestoneShown && inputIdx >= Math.ceil(seq.length / 2)) {
            milestoneShown = true;
            game.fx.popup('HALFWAY!', CX, H * 0.30, { color: C.gold, size: 36 });
            game.audio.play('se_milestone', 0.4);
          }
          if (inputIdx >= seq.length) { ok = true; finished = true; hitStop = 0.2; finish(); }
        } else {
          game.feedback.bad(p.x, p.y, { text: 'MISS' });
          shake = 0.3; hitStop = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
        return;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tapCard(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickShow(dt) {
    showT -= dt;
    if (showT <= 0) {
      if (litCard < 0 || showT <= -0.35) {
        litCard = -1;
        showIdx++;
        if (showIdx >= seq.length) { phase = 'input'; litCard = -1; return; }
        showT = 0.5;
      }
    }
    if (litCard < 0 && showIdx < seq.length && showT > 0.15) {
      litCard = seq[showIdx];
      game.audio.play('se_tap', 0.15);
    }
    if (showT <= 0.15 && litCard >= 0) litCard = -1;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 'show', idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) {
      seq = newSeq(3); showIdx = 0; showT = 0.5; litCard = -1; phase = 'show'; demo.idx = 0; demo.phase = 'show';
    }
    if (demo.phase === 'show') {
      tickShow(dt);
      if (phase === 'input') demo.phase = 'input';
    } else if (demo.phase === 'input') {
      var target = seq[demo.idx];
      var p = cardPos(target);
      demo.gx = p.x; demo.gy = p.y; demo.press = true;
      if (Math.floor(cyc * 2) % 2 === 0 && demo.idx < seq.length) {
        litCard = target;
        game.audio.play('se_good', 0.15);
        demo.idx++;
        if (demo.idx >= seq.length) demo.phase = 'done';
      }
    } else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCards(litCard);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.145, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.ink);
      } else {
        txt('TAP TO START', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCards(-1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 48, C.ink);
      txt(inputIdx + ' / ' + seq.length, W / 2, H * 0.145, 28, C.ink);
      if (!ok) txt('あと' + (seq.length - inputIdx) + '手!', W / 2, H * 0.19, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(inputIdx, { steps: seq.length });
        else game.end.failure({ correct: inputIdx, steps: seq.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && phase === 'show') {
      tickShow(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawCards(litCard);

    txt(inputIdx + ' / ' + seq.length, W / 2, H * 0.06, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 54, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

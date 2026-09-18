// GH-DS-0044-flash-order.js
// フラッシュオーダー — 一瞬光った場所を順に押す。目の速さだけで勝負
// 操作: 4つのランプが光った順番を覚えて、同じ順にタップ
// 終わり: 正しい順で全部押せれば成功。1回でも順が違えば失敗
// @mechanic: memory_sequence
// @theme: lamp_panel
// 世界観: 木目のパネルに4つの光沢ボタン。光った順を覚えて、同じ順に押し返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 何個目で外したか
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // SKEUOMORPH: 質感テクスチャ。木目・フェルト・光沢ボタン
  var C = {
    wood1: '#8a5a3a', wood2: '#6a4228', felt: '#2a4a3a', btnOff: '#c8b090', btnOn: '#ffe060',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#fff8ec', ink: '#241a10',
  };
  var BTN_COL = ['#ff5a6a', '#4dcf8a', '#4d9aff', '#ffd400'];

  var GAME_TITLE = 'FLASH ORDER';
  var SEQ_LEN = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, correctN = 0;

  var seq, showIdx, showT, inputIdx, phase, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BTN_POS = [{ x: W * 0.30, y: H * 0.40 }, { x: W * 0.70, y: H * 0.40 }, { x: W * 0.30, y: H * 0.56 }, { x: W * 0.70, y: H * 0.56 }];

  var SCREW = ['.#.', '###', '.#.'];

  function panelBg() {
    game.draw.gradient(0, H, [[0, C.wood1], [1, C.wood2]]);
    for (var i = 0; i < 14; i++) game.draw.rect(0, i * (H / 14), W, 3, '#000000', 0.06);
    game.draw.circle(W * 0.5, H * 0.48, 340, C.felt, 0.5);
    game.draw.sprite(SCREW, { '#': '#3a2a1a' }, W * 0.10, H * 0.10, 8, { anchor: 'center' });
    game.draw.sprite(SCREW, { '#': '#3a2a1a' }, W * 0.90, H * 0.10, 8, { anchor: 'center' });
  }

  function drawButtons(lit) {
    for (var i = 0; i < 4; i++) {
      var p = BTN_POS[i];
      var on = lit === i;
      game.draw.circle(p.x, p.y + 10, 78, '#000000', 0.3);
      game.draw.circle(p.x, p.y, 78, C.ink, 0.6);
      game.draw.circle(p.x, p.y, 68, on ? BTN_COL[i] : C.btnOff);
      game.draw.circle(p.x, p.y - 20, 30, '#ffffff', on ? 0.4 : 0.15);
    }
  }

  function initGame() {
    seq = [];
    for (var i = 0; i < SEQ_LEN; i++) seq.push(Math.floor(Math.random() * 4));
    showIdx = 0; showT = 0.6; inputIdx = 0; phase = 'show'; correctN = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function pressBtn(i) {
    if (done || ready > 0 || finished || phase !== 'input') return;
    hitStop = 0.06;
    game.audio.play('se_tap', 0.2);
    if (i === seq[inputIdx]) {
      correctN++; inputIdx++;
      game.feedback.good(BTN_POS[i].x, BTN_POS[i].y, { text: null, color: C.good });
      game.audio.play('se_good', 0.25);
      if (inputIdx >= seq.length) { ok = true; finished = true; game.fx.burst(W / 2, H * 0.48, { color: C.gold, count: 18, speed: 380 }); game.audio.play('se_success', 0.5); finish(); }
      else game.fx.popup(inputIdx + ' / ' + SEQ_LEN, W / 2, H * 0.24, { color: C.gold, size: 40 });
    } else {
      ok = false; finished = true;
      game.feedback.bad(BTN_POS[i].x, BTN_POS[i].y, { text: 'MISS' });
      shake = 0.15;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.3);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    var idx = -1, best = 999;
    for (var i = 0; i < 4; i++) { var d = Math.hypot(x - BTN_POS[i].x, y - BTN_POS[i].y); if (d < best) { best = d; idx = i; } }
    if (best < 90) pressBtn(idx);
  });

  // ── ATTRACT ゴースト実演: 光った順を覚えて押す ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.80, press: false, seq: [0, 2, 1, 3], phase: 'show', idx: 0, t2: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.t2 += dt;
    if (demo.phase === 'show') {
      if (demo.t2 > 0.5) { demo.t2 = 0; demo.idx++; if (demo.idx >= demo.seq.length) { demo.phase = 'input'; demo.idx = 0; } }
    } else {
      if (demo.t2 > 0.6) {
        demo.t2 = 0;
        var p = BTN_POS[demo.seq[demo.idx]];
        game.feedback.good(p.x, p.y, { text: null, color: C.good });
        demo.idx++;
        if (demo.idx >= demo.seq.length) { demo.phase = 'show'; demo.idx = 0; }
      }
    }
    var target = demo.phase === 'input' ? BTN_POS[demo.seq[demo.idx] || 0] : { x: W / 2, y: H * 0.80 };
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 5);
    demo.press = demo.phase === 'input' && demo.t2 < 0.15;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      panelBg();
      stepDemo(dt);
      drawButtons(demo.phase === 'show' ? demo.seq[demo.idx] : -1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 50, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.14, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.93, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      panelBg();
      drawButtons(-1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 54, ok ? C.good : C.bad);
      txt(correctN + ' / ' + SEQ_LEN, W / 2, H * 0.16, 34, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ correct: correctN });
        else game.end.failure({ correct: correctN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (phase === 'show') {
      showT -= dt;
      if (showT <= 0) { showIdx++; showT = 0.55; game.audio.tone(440 + seq[Math.min(showIdx, seq.length - 1)] * 60, 0.1, { wave: 'triangle', volume: 0.12 }); if (showIdx >= seq.length) phase = 'input'; }
    }
    if (shake > 0) shake -= dt;

    panelBg();
    drawButtons(phase === 'show' && showIdx < seq.length ? seq[showIdx] : -1);

    txt(phase === 'show' ? '見て覚える' : (inputIdx + ' / ' + SEQ_LEN), W / 2, H * 0.10, 34, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

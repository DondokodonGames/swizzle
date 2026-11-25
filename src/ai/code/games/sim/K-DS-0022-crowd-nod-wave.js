// K-DS-0022-crowd-nod-wave.js
// クラウドノッドウェーブ — 周囲の群衆が波状に頷く中、自分の番の窓に合わせて頷く
// 操作: 左右に並ぶ群衆が順番に頷いていく波が自分の位置に来て、頭上の窓が開いた瞬間にタップして頷く
// 終わり: 規定回数(6回)波が回ってきて全て正しく頷ければ成功。1回でも外せば失敗
// @mechanic: timing_window
// @theme: crowd_nod_wave
// 世界観: 独自デザインの聴衆が並ぶ講堂。頷きの波が横一列を順に伝っていき、自分の番に開く窓のタイミングで頷き続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 波に乗れた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: くっきりした輪郭、フラットな2〜3階調の陰影
  var C = {
    bg: '#3a4a6a', bg2: '#26324a', row: '#4a5a7e', rowDark: '#2e3a56',
    win: '#ffd400', winDim: '#5a4400', good: '#39ff8a', bad: '#ff3355',
    gold: '#ffe600', white: '#ffffff', ink: '#0a0e18', skin: '#ffcf9a',
  };

  var GAME_TITLE = 'NOD WAVE';
  var TOTAL = 6;
  var SEATS = 5; // 自分含め横5人
  var CY = H * 0.5;
  var SEAT_GAP = W / (SEATS + 1);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, wave, waveT, waveDur, done, endWait, finished;
  var ready, hitStop, shake, myIdx;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HEAD_STILL = ['.##.', '####'];
  var HEAD_NOD = ['####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, CY - 220, W, 440, C.rowDark, 0.5);
  }

  function seatX(i) { return SEAT_GAP * (i + 1); }

  function newWaveDur() {
    var n = Math.min(wave, TOTAL - 1);
    return Math.max(1.1, 1.9 - n * 0.11);
  }

  function initGame() {
    hits = 0; wave = 0; waveT = 0; waveDur = 1.9;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    myIdx = 2; // 中央が自分
  }

  // 波の進行位置(0..SEATS-1、実数)
  function waveHead() { return (waveT / waveDur) * (SEATS - 1); }

  function myWindow() {
    var head = waveHead();
    return Math.abs(head - myIdx);
  }

  function resolveNod() {
    if (finished || ready > 0 || done) return;
    var d = myWindow();
    game.audio.play('se_tap', 0.05);
    if (d < 0.55) {
      hits++; hitStop = 0.08;
      game.feedback.good(seatX(myIdx), CY, { text: 'NICE', color: C.good });
      game.fx.burst(seatX(myIdx), CY, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('IN SYNC!', W / 2, CY - 260, { color: C.gold, size: 38 });
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      wave++; waveT = 0; waveDur = newWaveDur();
    } else {
      failWave();
    }
  }

  function failWave() {
    hitStop = 0.3;
    game.feedback.bad(seatX(myIdx), CY, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveNod();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawCrowd() {
    var head = waveHead();
    for (var i = 0; i < SEATS; i++) {
      var d = Math.abs(head - i);
      var nod = d < 0.5;
      var x = seatX(i);
      if (i === myIdx) {
        var openW = Math.abs(0.55 - Math.min(0.55, d));
        var glow = d < 0.75;
        if (glow) game.draw.circle(x, CY - 130, 46, C.win, 0.35);
      }
      game.draw.sprite(nod ? HEAD_NOD : HEAD_STILL, { '#': i === myIdx ? C.gold : C.skin }, x, CY, i === myIdx ? 26 : 22, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, w: 0, wt: 0, wd: 1.7 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { wave = 0; demo.wt = 0; demo.wd = 1.7; }
    demo.wt += dt;
    waveT = demo.wt; waveDur = demo.wd;
    var d = myWindow();
    demo.gx = seatX(myIdx); demo.gy = CY + 200;
    if (d < 0.55 && !demo.hit) {
      demo.hit = true;
      demo.press = true;
      game.feedback.good(seatX(myIdx), CY, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.wt >= demo.wd) { demo.wt = 0; demo.press = false; demo.hit = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawCrowd();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
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
      drawCrowd();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '波!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      waveT += dt;
      if (waveT >= waveDur) failWave();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCrowd();

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.75, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 1]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// GH-DS-0039-verdict-call.js
// ヴァーディクトコール — 証拠を1つずつ見て、有罪か無罪かを最後に一度だけ決める
// 操作: 証拠が出るたびに、天秤がどちらに傾くか見る。全部出たら GUILTY / NOT GUILTY のどちらかをタップ
// 終わり: 天秤の傾きと合っていれば成功。外せば失敗
// @mechanic: judge
// @theme: courtroom_file
// 世界観: 端末に表示される証拠ファイル。1つずつ出るたびに天秤が傾く。最後に自分の目で見た傾きどおりに決める
// 残るもの: 正誤(CLEAR/GAME OVER)
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit PC MONITOR: 高解像度・低色数。細線とテキスト枠のUI
  var C = {
    bg: '#0a1a12', frame: '#3adf7a', text: '#3adf7a', guilty: '#ff4d5e', innocent: '#4d9aff', gold: '#ffd400', white: '#e8fff0', ink: '#04120a',
    good: '#3adf7a', bad: '#ff4d5e',
  };

  var GAME_TITLE = 'VERDICT CALL';
  var EVIDENCE = [
    { icon: ['..#', '.##', '###'], w: 1 },    // 凶器(有罪寄り)
    { icon: ['###', '#.#', '###'], w: -1 },   // アリバイ時計(無罪寄り)
    { icon: ['.#.', '###', '.#.'], w: 1 },    // 指紋(有罪寄り)
    { icon: ['#.#', '.#.', '#.#'], w: -1 },   // 目撃証言(無罪寄り)
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, guiltScore = 0, decided = false, choice = '';

  var order, shown, showT, decideWindow, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function boxFrame(x, y, w, h) {
    game.draw.rect(x, y, w, h, C.bg);
    game.draw.line(x, y, x + w, y, C.frame, 2);
    game.draw.line(x, y, x, y + h, C.frame, 2);
    game.draw.line(x + w, y, x + w, y + h, C.frame, 2);
    game.draw.line(x, y + h, x + w, y + h, C.frame, 2);
  }

  var CX = W / 2;
  var METER_Y0 = H * 0.32, METER_Y1 = H * 0.62, METER_X = CX;

  function screenBg() {
    game.draw.gradient(0, H, [[0, '#0e2418'], [1, C.bg]]);
    for (var i = 0; i < 30; i++) { var gx = (i * 137 + 19) % W, gy = (i * 271 + 53) % H; game.draw.rect(gx, gy, 2, 2, '#ffffff', 0.02); }
  }

  function drawMeter() {
    boxFrame(METER_X - 90, METER_Y0, 180, METER_Y1 - METER_Y0);
    var frac = Math.max(-1, Math.min(1, guiltScore / EVIDENCE.length));
    var midY = (METER_Y0 + METER_Y1) / 2;
    if (frac > 0) game.draw.rect(METER_X - 84, midY - (METER_Y1 - METER_Y0) / 2 * frac, 168, (METER_Y1 - METER_Y0) / 2 * frac, C.guilty, 0.7);
    else game.draw.rect(METER_X - 84, midY, 168, (METER_Y1 - METER_Y0) / 2 * (-frac), C.innocent, 0.7);
    game.draw.line(METER_X - 90, midY, METER_X + 90, midY, C.frame, 2);
    txt('GUILTY', METER_X, METER_Y0 - 20, 26, C.guilty);
    txt('NOT GUILTY', METER_X, METER_Y1 + 40, 26, C.innocent);
  }

  function drawEvidenceSlots() {
    for (var i = 0; i < EVIDENCE.length; i++) {
      var x = W * (0.16 + i * 0.23), y = H * 0.20;
      boxFrame(x - 50, y - 50, 100, 100);
      if (i < shown) {
        var e = EVIDENCE[order[i]];
        game.draw.sprite(e.icon, { '#': e.w > 0 ? C.guilty : C.innocent }, x, y, 14, { anchor: 'center' });
      }
    }
  }

  function initGame() {
    order = [0, 1, 2, 3];
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    shown = 0; showT = 0.6; guiltScore = 0; decided = false; decideWindow = 4.0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function reveal() {
    if (shown >= EVIDENCE.length) return;
    var e = EVIDENCE[order[shown]];
    guiltScore += e.w;
    shown++;
    game.audio.tone(e.w > 0 ? 300 : 520, 0.1, { wave: 'triangle', volume: 0.15 });
    game.fx.popup(shown + ' / ' + EVIDENCE.length, W / 2, H * 0.10, { color: C.gold, size: 40 });
  }

  function decide(g) {
    if (done || ready > 0 || finished || shown < EVIDENCE.length) return;
    decided = true; finished = true;
    choice = g ? 'GUILTY' : 'NOT GUILTY';
    var trueGuilty = guiltScore > 0;
    ok = (g === trueGuilty);
    hitStop = 0.1;
    if (ok) { game.feedback.good(CX, H * 0.5, { text: 'HIT', color: C.good }); game.fx.burst(CX, H * 0.5, { color: C.gold, count: 16, speed: 360 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(CX, H * 0.5, { text: 'MISS' }); shake = 0.2; game.audio.play('se_failure', 0.4); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (shown < EVIDENCE.length || done) return;
    if (y > H * 0.78) { decide(x < W / 2); }
  });

  // ── ATTRACT ゴースト実演: 証拠が出そろってから傾きどおりに押す ──
  var demo = { t: 0, gx: CX, gy: H * 0.88, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt) { shown = 0; guiltScore = 0; }
    var revAt = [0.6, 1.4, 2.2, 3.0];
    for (var i = 0; i < revAt.length; i++) if (cyc > revAt[i] && shown === i) reveal();
    if (cyc > 3.6) {
      var g = guiltScore > 0;
      var tx = g ? W * 0.28 : W * 0.72;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.press = cyc > 4.0 && cyc < 4.2;
      if (cyc > 4.0 && cyc < 4.03) { game.feedback.good(CX, H * 0.5, { text: 'HIT', color: C.good }); game.fx.burst(CX, H * 0.5, { color: C.gold, count: 10, speed: 300 }); }
    } else {
      demo.gx += (CX - demo.gx) * Math.min(1, dt * 4);
    }
  }

  function drawButtons() {
    boxFrame(W * 0.08, H * 0.80, W * 0.36, H * 0.12);
    boxFrame(W * 0.56, H * 0.80, W * 0.36, H * 0.12);
    txt('GUILTY', W * 0.26, H * 0.875, 40, shown >= EVIDENCE.length ? C.guilty : '#2a4a3a');
    txt('NOT GUILTY', W * 0.74, H * 0.875, 34, shown >= EVIDENCE.length ? C.innocent : '#2a4a3a');
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      screenBg();
      stepDemo(dt);
      drawEvidenceSlots();
      drawMeter();
      drawButtons();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.07, 48, C.text);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.11, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.text);
      }
      return;
    }

    if (state === S.RESULT) {
      screenBg();
      drawEvidenceSlots();
      drawMeter();
      drawButtons();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 50, ok ? C.text : C.guilty);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ choice: choice });
        else game.end.failure({ choice: choice });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (shown < EVIDENCE.length) {
        showT -= dt;
        if (showT <= 0) { reveal(); showT = 0.7; }
      }
    }
    if (shake > 0) shake -= dt;

    screenBg();
    drawEvidenceSlots();
    drawMeter();
    drawButtons();

    txt(shown + ' / ' + EVIDENCE.length, W / 2, H * 0.30, 30, C.text);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 64, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

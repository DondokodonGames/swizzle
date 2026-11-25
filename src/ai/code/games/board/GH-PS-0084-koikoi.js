// GH-PS-0084-koikoi.js
// こいこい — 役ができた。続けて倍にするか、ここで取るか
// 操作: 上半分をタップで札をめくる(続ける)。下半分をタップでその時点の点を取る(止める)
// 終わり: 25秒。取った点が残る。「続けて増やした回数」と「欲張って失った回数」も残る
// @mechanic: jackpot_combo
// @theme: paper_table
// 世界観: 白黒の畳の上。めくるたびに点は増え、相手の手も進む。相手が先に揃えたら、その回の点は全部消える
// 残るもの: 取った点(SCORE)。引き際の正誤 = 止めて取れた回数 / 続けて失った回数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s MONO: 白ドット + カラーセロハンの帯(1色だけ)
  var C = { bg: '#0b0b0b', dot: '#e8e8e8', dim: '#6a6a6a', band: '#ff9a3c', ink: '#000000' };

  var GAME_TITLE = 'KOI KOI';
  var MAX_TIME = 25;
  var SPLIT_Y = H * 0.56;      // 上=続ける、下=止める

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var banked, pot, mult, risk, flips, banks, busts, totalTime, done, endWait;
  var ready, hitStop, shake, flipAnim, lastCard;

  // 札(白ドットの絵柄)。光(20点)・短冊(5点)・カス(1点)
  var CARD_HIKARI = ['.###.', '#####', '#####', '#####', '.###.'];
  var CARD_TAN = ['..#..', '..#..', '..#..', '..#..', '..#..'];
  var CARD_KASU = ['#...#', '.....', '..#..', '.....', '#...#'];
  var PAL = { '#': C.dot };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color || C.dot, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 6) game.draw.rect(0, sy, W, 2, '#000000', 0.22); }

  function tableBg() {
    game.draw.rect(0, 0, W, H, C.bg);
    // 畳の目(白ドットの横線)
    for (var y = 0; y < H; y += 48) game.draw.rect(0, y, W, 2, C.dim, 0.35);
    // セロハンの帯: 上(続ける)は色なし、下(止める)に1色の帯 → 「取る側」が一目で分かる
    game.draw.rect(0, SPLIT_Y, W, H - SPLIT_Y, C.band, 0.28);
    game.draw.rect(0, SPLIT_Y - 3, W, 6, C.dot, 0.6);
  }

  function initGame() {
    banked = 0; pot = 0; mult = 1; risk = 0; flips = 0; banks = 0; busts = 0;
    totalTime = 0; done = false; endWait = 0; ready = 0.8; hitStop = 0; shake = 0; flipAnim = 0; lastCard = null;
  }

  function flip() {
    var r = Math.random();
    var card = r < 0.12 ? { name: 'hikari', pts: 20, art: CARD_HIKARI } : r < 0.45 ? { name: 'tan', pts: 5, art: CARD_TAN } : { name: 'kasu', pts: 1, art: CARD_KASU };
    lastCard = card; flipAnim = 0.25; flips++;
    pot += card.pts * mult;
    game.audio.play('se_tap', 0.5);
    if (card.name === 'hikari') { game.fx.burst(W / 2, H * 0.30, { color: C.dot, count: 12, speed: 340 }); game.audio.play('se_good', 0.5); }
    // 相手の手が進む。めくるほど、倍率が高いほど危ない
    risk += 0.10 + mult * 0.03 + totalTime * 0.002;
    if (Math.random() < risk) bust();
    else if (pot > 0 && flips % 3 === 0) { mult++; game.fx.popup('x' + mult, W / 2, H * 0.22, { color: C.band, size: 72 }); game.audio.play('se_milestone', 0.5); }
  }

  function bust() {
    // 相手が先に揃えた。場の点は全部消える(取った点は残る)
    busts++;
    hitStop = 0.35; shake = 0.45;
    game.fx.flash(C.band, 0.3);
    game.feedback.bad(W / 2, H * 0.30, { text: 'MISS' });
    game.audio.play('se_failure', 0.6);
    pot = 0; mult = 1; risk = 0;
  }

  function bank() {
    if (pot <= 0) { game.audio.play('se_bad', 0.4); return; }
    banked += pot; banks++;
    game.feedback.good(W / 2, H * 0.72, { text: 'NICE', color: C.dot });
    game.audio.play('se_coin', 0.6);
    pot = 0; mult = 1; risk = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = banked;   // 取った点だけ。場に残した点は消える
    game.audio.stopBgm();
    game.audio.play(banked > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  function drawCard(card, x, y, px, alpha) {
    game.draw.rect(x - 3 * px, y - 3 * px, 6 * px, 8 * px, C.dot, alpha === undefined ? 1 : alpha);
    game.draw.rect(x - 2.6 * px, y - 2.6 * px, 5.2 * px, 7.2 * px, C.bg, 1);
    game.draw.sprite(card.art, PAL, x, y + 0.8 * px, px * 0.9, { anchor: 'center' });
  }

  function drawTable() {
    // 上: 山札と、めくった札。下: 取った点
    // 山札は3枚重ねの輪郭で厚みを見せる
    for (var d = 2; d >= 0; d--) {
      game.draw.rect(W / 2 - 92 - d * 10, H * 0.18 + d * 8, 184, 240, C.dot, 0.9);
      game.draw.rect(W / 2 - 82 - d * 10, H * 0.18 + 10 + d * 8, 164, 220, C.bg);
    }
    game.draw.sprite(CARD_KASU, PAL, W / 2, H * 0.18 + 120, 20, { anchor: 'center' });
    // めくった札の置き場(空なら枠だけ)
    if (lastCard) drawCard(lastCard, W / 2, H * 0.42, flipAnim > 0 ? 24 + flipAnim * 40 : 24);
    else { game.draw.rect(W / 2 - 72, H * 0.42 - 72, 144, 192, C.dim, 0.6); game.draw.rect(W / 2 - 64, H * 0.42 - 64, 128, 176, C.bg); }
    // 場の点と倍率
    txt(String(pot), W / 2, H * 0.52, 72, C.dot);
    if (mult > 1) txt('x' + mult, W * 0.80, H * 0.52, 56, C.band);
    // 相手の手(危険度): 白ドットの列が伸びる。満ちる前に取る
    for (var i = 0; i < 10; i++) game.draw.rect(90 + i * 92, H * 0.12, 70, 22, i < Math.round(risk * 10) ? C.band : C.dot, i < Math.round(risk * 10) ? 1 : 0.35);
    // 下: 取った点
    txt(String(banked), W / 2, H * 0.75, 96, C.dot);
    // 上下の役割を絵で: 上は札、下は袋
    game.draw.rect(W * 0.12 - 30, H * 0.42 - 40, 60, 80, C.dot, 0.9);
    game.draw.rect(W * 0.12 - 24, H * 0.42 - 34, 48, 68, C.bg);
    game.draw.circle(W * 0.12, H * 0.78, 44, C.dot);
    game.draw.rect(W * 0.12 - 12, H * 0.78 - 76, 24, 36, C.dot);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    if (done || ready > 0 || hitStop > 0) return;
    if (y < SPLIT_Y) flip(); else bank();
  });

  // ── ATTRACT ゴースト実演: 上をめくって点が増え、下で取る。欲張ると消える ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.40, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    var step = Math.floor(cyc / 0.5);
    if (step < 4) { demo.gy += (H * 0.42 - demo.gy) * Math.min(1, dt * 6); }
    else if (step < 6) { demo.gy += (H * 0.75 - demo.gy) * Math.min(1, dt * 6); }
    else { demo.gy += (H * 0.42 - demo.gy) * Math.min(1, dt * 6); }
    var inPress = (cyc % 0.5) < 0.12;
    demo.press = inPress;
    if (inPress && !demo.did) {
      demo.did = true;
      if (step < 4) { pot += 5; lastCard = { name: 'tan', pts: 5, art: CARD_TAN }; flipAnim = 0.25; risk = Math.min(0.9, risk + 0.15); }
      else if (step === 4) { banked += pot; pot = 0; risk = 0; game.feedback.good(W / 2, H * 0.72, { text: 'NICE', color: C.dot }); }
      else if (step === 6) { pot = 20; lastCard = { name: 'hikari', pts: 20, art: CARD_HIKARI }; flipAnim = 0.25; risk = 0.6; }
      else if (step === 7) { pot = 0; risk = 0; game.feedback.bad(W / 2, H * 0.30, { text: 'MISS' }); }
    }
    if (!inPress) demo.did = false;
    if (cyc < 0.05 && !demo.reset) { demo.reset = true; banked = 0; pot = 0; risk = 0; lastCard = null; }
    if (cyc > 0.1) demo.reset = false;
    if (flipAnim > 0) flipAnim -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (banked === undefined) initGame();
      tableBg();
      stepDemo(dt);
      drawTable();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.06, 72, C.dot);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.095, 34, C.dim);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.band);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.dot);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 40, C.dim);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      tableBg();
      txt('FINISH', W / 2, H * 0.22, 92, C.dot);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.32, 54, C.dot);
      // 残るもの: 止めて取れた回数(白) / 欲張って失った回数(帯色)
      for (var a = 0; a < banks; a++) game.draw.circle(120 + a * 70, H * 0.44, 22, C.dot);
      txt(String(banks), W - 110, H * 0.44 + 18, 56, C.dot, 'right');
      for (var b = 0; b < busts; b++) game.draw.rect(100 + b * 70, H * 0.50, 44, 44, C.band);
      txt(String(busts), W - 110, H * 0.50 + 40, 56, C.band, 'right');
      if (pot > 0) txt(String(pot), W / 2, H * 0.62, 60, C.dim);   // 場に残して消えた点
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.70, 42, C.dim);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.80, 54, C.band);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.80, 44, C.dot);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { banks: banks, busts: busts, flips: flips, lost: pot }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { finish(); }
    }
    if (flipAnim > 0) flipAnim -= dt;
    if (shake > 0) shake -= dt;

    tableBg();
    drawTable();
    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.dim, 0.5);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.band : C.dot);
    txt('SCORE ' + String(banked).padStart(6, '0'), W / 2, 102, 44, C.dot);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 96, C.dot);
    if (!done && totalTime > MAX_TIME - 4 && pot > 0 && Math.floor(game.time.elapsed * 4) % 2 === 0) txt('あと' + Math.ceil(MAX_TIME - totalTime) + '秒', W / 2, H * 0.64, 50, C.band);
    scanlines();
  });

  game.onStart(function() {
    // 70s MONO: 単音の短いループ
    game.audio.melody(
      [['A4', 0.5], ['R', 0.5], ['E4', 0.5], ['R', 0.5], ['A4', 0.25], ['B4', 0.25], ['C5', 0.5], ['R', 0.5]],
      { tempo: 96, wave: 'square', volume: 0.07, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20132016-0023-throne-decree-swipe.js
// スローンディクリー — 玉座に届く陳情書を、示された法に沿って左右にスワイプして裁いていく
// 操作: 上に出た法の印を見て、カードの内容が沿っていれば右へ、反していれば左へスワイプする
// 終わり: 規定枚数すべて正しく裁ければ成功。1枚でも誤裁定/時間切れがあれば失敗
// @mechanic: swipe_direction
// @theme: throne_room_decree
// 世界観: 小さな玉座の間。次々届く陳情カードを、掲げられた法の印に沿うか否かで即座に左右へ裁き、国を治め続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 裁いた枚数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なし・丸角・余白、アイコン的な形
  var C = {
    bg1: '#f4ece0', bg2: '#e8dcc8', card: '#ffffff', cardEdge: '#d8cdb8',
    lawGood: '#3aa876', lawBad: '#d84f4f', gold: '#d8a13a',
    good: '#3aa876', bad: '#d84f4f', white: '#3a2f22', ink: '#00000000',
  };

  var GAME_TITLE = 'THRONE DECREE';
  var ROUNDS = 5;
  var ROUND_TIME = 2.4;

  // 法の印(icon)。カード側の印がlawと一致→合致(右)/不一致→違反(左)
  var LAWS = ['coin', 'shield', 'wheat'];
  var ICONS = {
    coin: ['.###.', '#.#.#', '#.#.#', '#.#.#', '.###.'],
    shield: ['.###.', '#####', '#####', '.###.', '..#..'],
    wheat: ['..#..', '.###.', '..#..', '.###.', '..#..'],
  };

  var CX = W * 0.5, CARD_Y = H * 0.44, CARD_W = 420, CARD_H = 520;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var law, ri, correctCount, roundTimer, done, endWait, finished, card;
  var ready, hitStop, shake, cardOffset;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#000000', pulse);
  }

  function newCard() {
    var icon = LAWS[Math.floor(game.random(0, LAWS.length))];
    return { icon: icon, match: icon === law };
  }

  function initGame() {
    law = LAWS[Math.floor(game.random(0, LAWS.length))];
    ri = 0; correctCount = 0; roundTimer = ROUND_TIME; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; cardOffset = 0;
    card = newCard();
  }

  function drawLawBanner() {
    var bob = Math.sin(game.time.elapsed * 2) * 4;
    game.draw.rect(W * 0.5 - 100, H * 0.14 + bob, 200, 90, '#3a2f22');
    game.draw.sprite(ICONS[law], { '#': C.gold }, W * 0.5, H * 0.14 + 45 + bob, 12, { anchor: 'center' });
  }

  function drawCard() {
    var sway = Math.sin(game.time.elapsed * 1.8) * 7;
    var bobY = Math.cos(game.time.elapsed * 2.3) * 6;
    var x = CX + cardOffset + sway;
    var y = CARD_Y + bobY;
    var rot = cardOffset * 0.04;
    game.draw.rect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, C.cardEdge);
    game.draw.rect(x - CARD_W / 2 + 6, y - CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, C.card);
    game.draw.sprite(ICONS[card.icon], { '#': '#3a2f22' }, x, y, 20, { anchor: 'center' });
    if (Math.abs(cardOffset) > 40) {
      var lbl = cardOffset > 0 ? 'GOOD' : 'MISS';
      var col = cardOffset > 0 ? C.lawGood : C.lawBad;
      txt(lbl, x, CARD_Y + CARD_H / 2 - 40, 30, col);
    }
  }

  function resolve(dir, px, py) {
    if (done || finished || ready > 0) return;
    // dir: 1=right(合致), -1=left(違反)
    var wantRight = card.match;
    var correct = (dir > 0) === wantRight;
    hitStop = correct ? 0.1 : 0.3;
    cardOffset = dir * 500;
    if (correct) {
      correctCount++;
      game.feedback.good(px, py, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (correctCount === Math.ceil(ROUNDS / 2)) { game.fx.popup(correctCount + ' / ' + ROUNDS, CX, H * 0.28, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
      if (ri + 1 >= ROUNDS) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); return; }
      ri++; card = newCard(); roundTimer = ROUND_TIME; cardOffset = 0;
    } else {
      game.feedback.bad(px, py, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    game.audio.play('se_tap', 0.08);
    if (dir === 'right') resolve(1, CX, CARD_Y);
    else if (dir === 'left') resolve(-1, CX, CARD_Y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CARD_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    if (cardOffset !== 0) cardOffset *= 0.8;
    if (Math.abs(cardOffset) < 1) cardOffset = 0;
    var phase = cyc % 1.7;
    var dir = card.match ? 1 : -1;
    if (phase < 0.5) { demo.gx = CX; demo.gy = CARD_Y; demo.press = false; }
    else if (phase < 1.0) { var t = (phase - 0.5) / 0.5; demo.gx = CX + dir * 220 * t; demo.gy = CARD_Y; demo.press = true; }
    else if (phase < 1.05 && !done && !finished) { resolve(dir, demo.gx, demo.gy); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (card === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLawBanner();
      drawCard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, '#3a2f22');
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 34, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 22, '#3a2f22');
      return;
    }

    if (state === S.RESULT) {
      bg(); drawLawBanner(); drawCard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 42, ok ? C.good : C.bad);
      txt(correctCount + ' / ' + ROUNDS, W / 2, H * 0.10, 26, C.gold);
      if (!ok) txt('あと1枚!', W / 2, H * 0.855, 20, '#3a2f22');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 22, '#3a2f22');
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correctCount, { correct: correctCount, rounds: ROUNDS });
        else game.end.failure({ correct: correctCount, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundTimer -= dt;
      if (roundTimer <= 0) {
        roundTimer = 0; ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(CX, CARD_Y, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (cardOffset !== 0 && hitStop <= 0) { cardOffset *= 0.85; if (Math.abs(cardOffset) < 1) cardOffset = 0; }
    if (shake > 0) shake -= dt;

    bg();
    drawLawBanner();
    if (!finished || cardOffset !== 0) drawCard();

    txt(correctCount + ' / ' + ROUNDS, W / 2, H * 0.06, 26, '#3a2f22');
    var warn = roundTimer < 0.8 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(60, H * 0.86, W - 120, 16, '#00000020');
    game.draw.rect(60, H * 0.86, (W - 120) * (roundTimer / ROUND_TIME), 16, warn ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['E4', 0.4], ['G4', 0.4], ['C5', 0.8]], { tempo: 110, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

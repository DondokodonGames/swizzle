// GH-PS2-0017-bomb-toss.js
// ボムトス — 導火線が短い爆弾を、消える前に相手側へ投げ返す(2人)
// 操作: 自分側(左/右)が光ったら、消える前に自分側をタップ
// 終わり: 勝敗(どちらが失敗したか) + 続いたラリー数
// @mechanic: duel_2p
// @theme: bomb_yard
// 世界観: 中央の壁を挟んだ2人。導火線付きの爆弾を投げ合う。自分側で消えたら負け。ラリーごとに導火線は短くなる
// 残るもの: P1/P2 どちらが勝ったか(ラベル) + 続いたラリー数(SCORE)
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s HANDHELD COLOR: 低彩度・少色。小画面前提の太い形、密度を抑える
  var C = {
    p1: '#3a5a8a', p2: '#8a3a4a', bg1: '#e8e0c8', bg2: '#d8ccac', wall: '#4a4238',
    bomb: '#2a2a2a', fuse: '#ff9a3a', good: '#4dcc7a', bad: '#e84d5a', gold: '#f0c030', white: '#faf6ea', ink: '#242018',
  };

  var GAME_TITLE = 'BOMB TOSS';
  var FUSE_START = 1.9, FUSE_MIN = 0.65, FUSE_STEP = 0.11;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var winner = '', rally = 0;

  var side, fuse, fuseMax, bombX, done, endWait, exploded;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOMB_SPRITE = ['..#..', '.###.', '#####', '#####', '.###.'];
  var BOMB_PAL = { '#': C.bomb };
  var CRATE = ['#####', '#...#', '#.#.#', '#...#', '#####'];
  var CRATE_PAL = { '#': C.wall };

  function courtBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // 各陣の色帯(常時、暗転を防ぐ)
    game.draw.rect(0, 0, W / 2 - 10, H, C.p1, 0.06);
    game.draw.rect(W / 2 + 10, 0, W / 2 - 10, H, C.p2, 0.06);
    game.draw.rect(W / 2 - 10, H * 0.22, 20, H * 0.56, C.wall);
    game.draw.rect(0, 0, W, H * 0.16, side === 'P1' ? C.p1 : C.p2, 0.18);
    game.draw.rect(0, H * 0.84, W, H * 0.16, side === 'P2' ? C.p2 : C.p1, 0.18);
    // 土嚢(空きを埋める、各陣に2個ずつ)
    game.draw.sprite(CRATE, CRATE_PAL, W * 0.20, H * 0.24, 12, { anchor: 'center' });
    game.draw.sprite(CRATE, CRATE_PAL, W * 0.80, H * 0.24, 12, { anchor: 'center' });
    game.draw.sprite(CRATE, CRATE_PAL, W * 0.20, H * 0.76, 12, { anchor: 'center' });
    game.draw.sprite(CRATE, CRATE_PAL, W * 0.80, H * 0.76, 12, { anchor: 'center' });
  }

  function newRound() {
    side = Math.random() < 0.5 ? 'P1' : 'P2';
    fuseMax = FUSE_START; fuse = fuseMax;
    bombX = W / 2;
  }

  function initGame() {
    rally = 0; done = false; endWait = 0; exploded = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function zoneOf(x) { return x < W / 2 ? 'P1' : 'P2'; }

  function toss(px) {
    if (done || ready > 0 || hitStop > 0 || exploded) return;
    if (zoneOf(px) !== side) return;
    rally++;
    hitStop = 0.08;
    game.feedback.good(px, side === 'P1' ? H * 0.30 : H * 0.70, { text: rally, color: C.good });
    game.fx.burst(px, side === 'P1' ? H * 0.30 : H * 0.70, { color: C.gold, count: 10, speed: 300 });
    game.audio.play('se_good', 0.35);
    side = side === 'P1' ? 'P2' : 'P1';
    fuseMax = Math.max(FUSE_MIN, FUSE_START - rally * FUSE_STEP);
    fuse = fuseMax;
    if (rally > 0 && rally % 5 === 0) game.fx.popup('RALLY ' + rally, W / 2, H * 0.5, { color: C.gold, size: 50 });
  }

  function explode() {
    if (exploded) return;
    exploded = true;
    winner = side === 'P1' ? 'P2' : 'P1';
    game.feedback.bad(W / 2, side === 'P1' ? H * 0.30 : H * 0.70, { text: 'BOOM' });
    game.fx.burst(W / 2, side === 'P1' ? H * 0.30 : H * 0.70, { color: C.bad, count: 20, speed: 420 });
    shake = 0.35;
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.12);
    toss(x);
  });

  // ── ATTRACT ゴースト実演: 両側の手が交互に自分側をタップ ──
  var demoL = { x: W * 0.25, y: H * 0.30, press: false };
  var demoR = { x: W * 0.75, y: H * 0.70, press: false };
  function stepDemo(dt) {
    var cyc = game.time.elapsed % 2.6;
    var toP2 = cyc > 1.3;
    demoL.press = !toP2 && cyc > 1.0 && cyc < 1.2;
    demoR.press = toP2 && cyc > 2.3 && cyc < 2.5;
    courtBg2(!toP2 ? 'P1' : 'P2', Math.max(0, (toP2 ? 1.3 - (cyc - 1.3) : 2.6 - cyc) % 1.3));
  }
  function courtBg2(activeSide, fuseFrac) {
    side = activeSide;
    courtBg();
    game.draw.sprite(BOMB_SPRITE, BOMB_PAL, W / 2, activeSide === 'P1' ? H * 0.30 : H * 0.70, 14, { anchor: 'center' });
    game.draw.circle(W / 2, activeSide === 'P1' ? H * 0.30 : H * 0.70, 60 * Math.max(0.15, fuseFrac), C.fuse, 0.6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (side === undefined) newRound();
      stepDemo(dt);
      game.draw.hand(demoL.x, demoL.y, { press: demoL.press, scale: 15 });
      game.draw.hand(demoR.x, demoR.y, { press: demoR.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.075, 58, C.ink);
      txt('P1', W * 0.5, H * 0.135, 32, C.p1);
      txt('P2', W * 0.5, H * 0.865, 32, C.p2);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      courtBg();
      game.draw.sprite(BOMB_SPRITE, BOMB_PAL, W / 2, H * 0.5, 18, { anchor: 'center' });
      var loser = winner === 'P1' ? 'P2' : 'P1';
      txt(winner + ' WIN', W / 2, H * 0.40, 74, winner === 'P1' ? C.p1 : C.p2);
      txt(loser + ' LOSE', W / 2, H * 0.445, 30, C.bad);
      txt('RALLY ' + rally, W / 2, H * 0.48, 44, C.ink);
      var best = Math.max(game.best, rally);
      txt('BEST RALLY ' + best, W / 2, H * 0.56, 34, C.gold);
      if (rally > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.62, 36, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 34, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(rally, { label: winner + ' WIN' }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!exploded) {
      fuse -= dt;
      if (fuse <= 0) explode();
      else if (fuse < fuseMax * 0.3 && Math.floor(fuse * 8) % 2 === 0) game.audio.tone(880, 0.03, { wave: 'square', volume: 0.06 });
    }
    if (shake > 0) shake -= dt;

    courtBg();
    if (!exploded) {
      var fy = side === 'P1' ? H * 0.30 : H * 0.70;
      game.draw.sprite(BOMB_SPRITE, BOMB_PAL, W / 2, fy, 16, { anchor: 'center' });
      var frac = Math.max(0, fuse / fuseMax);
      game.draw.circle(W / 2, fy, 64, C.ink, 0.15);
      game.draw.circle(W / 2, fy, 64 * frac, frac < 0.3 ? C.bad : C.fuse, 0.7);
    }
    // 両手の位置(multi-touch 可視化)
    var touches = game.touches;
    for (var t = 0; t < touches.length; t++) game.draw.circle(touches[t].x, touches[t].y, 46, C.gold, 0.25);

    game.draw.rect(W / 2 - 110, H * 0.5 - 30, 220, 60, C.white, 0.85);
    txt('RALLY ' + rally + ' / ' + '∞', W / 2, H * 0.5, 32, C.ink);
    txt('P1', W * 0.5, H * 0.075, 40, side === 'P1' ? C.p1 : C.ink, 'center');
    txt('P2', W * 0.5, H * 0.925, 40, side === 'P2' ? C.p2 : C.ink, 'center');

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 84, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);

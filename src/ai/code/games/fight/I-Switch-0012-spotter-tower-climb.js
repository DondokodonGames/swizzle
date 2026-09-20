// I-Switch-0012-spotter-tower-climb.js
// スポッター・タワー・クライム — 道場の稽古櫓を、相棒の肩を踏み台にして左右交互に蹴り上がって登る
// 操作: 崩れかけの足場が点滅したら、その足場がある側(画面左/右)をタップして蹴り上がる。カメラは登るごとに上へ追従する
// 終わり: 規定回数(6回)蹴り上がれば頂上に到達して成功。タイミングを外して足場を外せば失敗
// @mechanic: camera_climb
// @theme: dojo_training_tower
// 世界観: 山中の道場に建つ稽古櫓。相棒が下で肩を貸し、弟子は崩れかけの足場を交互に蹴って頂上の鐘まで駆け上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数
// スタイル: VOXEL BLOCK
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: ブロック状の面、濃淡2段の陰影、輪郭は太め
  var C = {
    bg: '#233044', bg2: '#141c2a', tower: '#3a4a5c', towerEdge: '#54687c',
    ledge: '#7a5a3a', ledgeCrumble: '#ff5c5c', climber: '#ffd24d', climberDark: '#b8892a',
    spotter: '#8ac6ff', good: '#5cffb0', bad: '#ff5c6e', gold: '#ffd24d', white: '#ffffff', ink: '#080c14',
  };

  var GAME_TITLE = 'SPOTTER CLIMB';
  var TOTAL = 6;
  var CY = H * 0.56;
  var LEFT_X = W * 0.28, RIGHT_X = W * 0.72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLIMBER = ['.##.', '####', '.##.', '#..#'];
  var SPOTTER = ['####', '#..#'];

  function bg(camY) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(LEFT_X - 90, 0, 40, H, C.towerEdge);
    game.draw.rect(RIGHT_X + 50, 0, 40, H, C.towerEdge);
    for (var i = 0; i < 12; i++) {
      var yy = ((i * 160 - camY * 40) % (H + 160) + H + 160) % (H + 160) - 80;
      game.draw.rect(LEFT_X - 70, yy, 20, 8, '#ffffff08');
      game.draw.rect(RIGHT_X + 50, yy, 20, 8, '#ffffff08');
    }
  }

  function newHop(rnd, dir) {
    return { dir: dir, t: 0, dur: Math.max(0.75, 1.25 - rnd * 0.07), hazard: rnd > 0, telegraphed: false, resolved: false };
  }

  var round, hop, climbX, climbY, squash, climbed;
  var done, endWait, finished, hitStop, shake, ready;

  function initGame() {
    climbed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; climbX = LEFT_X; climbY = CY; squash = 0;
    hop = newHop(0, 1);
  }

  function windowOpen(h) {
    var p = h.t / h.dur;
    return h.hazard && p > 0.5 && p < 0.9;
  }
  function targetX(h) { return h.dir === 1 ? RIGHT_X : LEFT_X; }

  function doTap(side) {
    if (!hop || ready > 0 || done || finished) return;
    var wantSide = targetX(hop) === RIGHT_X ? 'right' : 'left';
    if (hop.hazard && !hop.resolved && windowOpen(hop) && side === wantSide) {
      hop.resolved = true;
      climbed++;
      squash = 10;
      game.feedback.good(climbX, climbY, { text: 'UP!', color: C.good });
      game.fx.burst(climbX, climbY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_jump', 0.4);
      if (climbed === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', climbX, climbY - 180, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.5); }
      if (climbed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      hop = newHop(round, -hop.dir);
      return;
    }
    if (side === wantSide) {
      game.audio.play('se_tap', 0.15);
    } else {
      game.audio.play('se_tap', 0.08);
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    doTap(x < W * 0.5 ? 'left' : 'right');
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function advance(h) {
    var p = h.t / h.dur;
    var fromX = h.dir === 1 ? LEFT_X : RIGHT_X;
    var toX = h.dir === 1 ? RIGHT_X : LEFT_X;
    climbX = fromX + (toX - fromX) * Math.min(1, p);
    climbY = CY - Math.sin(Math.min(1, p) * Math.PI) * 70;
  }

  function drawLedges() {
    var targ = targetX(hop);
    var side = targ === RIGHT_X ? 'right' : 'left';
    var x = side === 'left' ? LEFT_X : RIGHT_X;
    var isHazard = hop.hazard && !hop.resolved;
    var blink = isHazard && hop.t / hop.dur > 0.3 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.rect(x - 70, CY + 30, 140, 26, blink ? C.ledgeCrumble : C.ledge);
    var other = side === 'left' ? RIGHT_X : LEFT_X;
    game.draw.rect(other - 70, CY + 30, 140, 26, C.ledge, 0.5);
    game.draw.sprite(SPOTTER, { '#': C.spotter }, W * 0.5, H * 0.92, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) initGame();
    hop.t += dt;
    advance(hop);
    squash *= 0.85;
    if (hop.hazard && windowOpen(hop) && !hop.resolved && hop.t / hop.dur > 0.62 && hop.t / hop.dur < 0.78) {
      hop.resolved = true; squash = 10; demo.press = true;
      game.feedback.good(climbX, climbY, { text: 'UP!', color: C.good });
      game.audio.play('se_jump', 0.2);
      climbed = Math.min(TOTAL, climbed + 1);
      round++;
      hop = newHop(round % 3, -hop.dir);
    } else if (hop.t / hop.dur >= 1) {
      round++;
      hop = newHop(round % 3, -hop.dir);
      demo.press = false;
    } else demo.press = false;
    demo.gx = targetX(hop) === RIGHT_X ? RIGHT_X : LEFT_X; demo.gy = CY + 160;
  }

  game.onUpdate(function(dt) {
    var camY = (climbed || 0);
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg(camY);
      stepDemo(dt);
      drawLedges();
      game.draw.sprite(CLIMBER, { '#': C.climber }, climbX, climbY - squash, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(camY);
      drawLedges();
      game.draw.sprite(CLIMBER, { '#': ok ? C.climber : C.bad }, climbX, climbY, 20, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(climbed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - climbed) + '段!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(climbed, { climbed: climbed, total: TOTAL }); else game.end.failure({ climbed: climbed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      hop.t += dt;
      advance(hop);
      squash *= 0.85;
      if (hop.t / hop.dur >= 1 && !hop.resolved) {
        if (hop.hazard) {
          hop.resolved = true;
          hitStop = 0.35;
          game.feedback.bad(climbX, climbY, { text: 'FALL' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        } else {
          round++;
          hop = newHop(round, -hop.dir);
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg(camY);
    if (!finished) drawLedges();
    game.draw.sprite(CLIMBER, { '#': finished && !ok ? C.bad : C.climber }, climbX, climbY - squash, 20, { anchor: 'center' });

    txt(climbed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (climbed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

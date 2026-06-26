// 333-sushi-roll.js
// 寿司ロール — 流れてくる寿司を正しいタイミングでキャッチ
// 操作: タップでレーンを切り替えて寿司をゲット
// 成功: 20貫キャッチ  失敗: 10貫逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0500',
    belt:   '#1c1008',
    beltHi: '#2d1a0e',
    sushiR: '#ef4444',
    sushiY: '#f59e0b',
    sushiG: '#22c55e',
    sushiP: '#a78bfa',
    rice:   '#f1f5f9',
    riceHi: '#fff',
    plate:  '#3b82f6',
    plateHi:'#93c5fd',
    correct:'#22c55e',
    correctHi:'#86efac',
    miss:   '#ef4444',
    missHi: '#fca5a5',
    ui:     '#78716c',
    text:   '#fef3c7'
  };

  var NUM_LANES = 3;
  var LANE_Y = [H * 0.38, H * 0.55, H * 0.72];
  var PLAYER_X = W * 0.82;
  var playerLane = 1;

  var sushiColors = [C.sushiR, C.sushiY, C.sushiG, C.sushiP];
  var sushiNames = ['まぐろ', 'えび', 'いくら', 'たこ'];

  var sushi = [];
  var spawnTimer = 0;
  var caught = 0;
  var NEEDED = 20;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var catchAnim = 0;
  var switchAnim = 0;
  var beltOffset = 0;

  function spawnSushi() {
    var lane = Math.floor(Math.random() * NUM_LANES);
    var type = Math.floor(Math.random() * 4);
    sushi.push({ x: -60, y: LANE_Y[lane], lane: lane, type: type, r: 36, speed: 220 + caught * 3 });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up' && playerLane > 0) { playerLane--; switchAnim = 0.2; game.audio.play('se_tap', 0.2); }
    if (dir === 'down' && playerLane < NUM_LANES - 1) { playerLane++; switchAnim = 0.2; game.audio.play('se_tap', 0.2); }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Also allow tap on lane area to switch
    for (var l = 0; l < NUM_LANES; l++) {
      if (Math.abs(ty - LANE_Y[l]) < 80 && l !== playerLane) {
        playerLane = l;
        switchAnim = 0.2;
        game.audio.play('se_tap', 0.2);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (catchAnim > 0) catchAnim -= dt * 3;
    if (switchAnim > 0) switchAnim -= dt * 4;
    beltOffset = (beltOffset + dt * 120) % 80;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnSushi();
      spawnTimer = 0.55 - Math.min(0.3, caught * 0.01);
    }

    for (var si = sushi.length - 1; si >= 0; si--) {
      var s = sushi[si];
      s.x += s.speed * dt;

      // Catch check
      if (Math.abs(s.x - PLAYER_X) < 60 && s.lane === playerLane) {
        caught++;
        catchAnim = 0.5;
        game.audio.play('se_success', 0.4);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: s.x, y: s.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: sushiColors[s.type] });
        }
        sushi.splice(si, 1);
        if (caught >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(caught * 100 + Math.ceil(timeLeft) * 80); }, 400);
        }
        continue;
      }

      // Miss
      if (s.x > W + 80) {
        missed++;
        game.audio.play('se_failure', 0.2);
        sushi.splice(si, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Conveyor belts
    for (var l = 0; l < NUM_LANES; l++) {
      var ly = LANE_Y[l];
      var isActive = l === playerLane;
      game.draw.rect(0, ly - 44, W, 88, C.belt, isActive ? 0.9 : 0.6);
      // Belt stripes
      for (var bx = -beltOffset; bx < W; bx += 80) {
        game.draw.rect(bx, ly - 44, 40, 88, C.beltHi, 0.4);
      }
      game.draw.rect(0, ly - 44, W, 6, C.beltHi, isActive ? 0.8 : 0.4);
      game.draw.rect(0, ly + 38, W, 6, C.beltHi, isActive ? 0.8 : 0.4);
    }

    // Sushi items
    for (var si2 = 0; si2 < sushi.length; si2++) {
      var s2 = sushi[si2];
      var col = sushiColors[s2.type];
      // Plate
      game.draw.circle(s2.x, s2.y, s2.r + 8, C.plate, 0.6);
      game.draw.circle(s2.x, s2.y, s2.r + 4, C.plateHi, 0.3);
      // Rice
      game.draw.circle(s2.x, s2.y, s2.r, C.rice, 0.9);
      // Topping
      game.draw.rect(s2.x - s2.r * 0.8, s2.y - s2.r * 0.5, s2.r * 1.6, s2.r * 0.9, col, 0.9);
      game.draw.rect(s2.x - s2.r * 0.6, s2.y - s2.r * 0.5, s2.r * 1.2, 8, '#000', 0.3); // nori band
    }

    // Player plate (catch zone)
    var py = LANE_Y[playerLane];
    var plateScale = 1 + (switchAnim > 0 ? switchAnim * 0.3 : 0) + (catchAnim > 0 ? catchAnim * 0.2 : 0);
    game.draw.circle(PLAYER_X, py, 60 * plateScale, C.plate, 0.4);
    game.draw.circle(PLAYER_X, py, 50 * plateScale, C.plateHi, 0.6);
    game.draw.text('皿', PLAYER_X, py + 14, { size: 36, color: '#fff', bold: true });

    // Lane arrows
    for (var la = 0; la < NUM_LANES; la++) {
      if (la !== playerLane) {
        game.draw.text('◆', W * 0.88, LANE_Y[la], { size: 28, color: C.ui });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 18 + mi * 36, H * 0.89, 12, mi < missed ? C.miss : '#0a0500');
    }

    game.draw.text('スワイプでレーン変更', W / 2, H * 0.84, { size: 34, color: C.ui });

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sushiY : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.4;
  });
})(game);

// 588-void-collector.js
// ヴォイドコレクター — 画面を侵食する虚無の穴から光の欠片を救い出す
// 操作: タップで欠片を吸収、穴に触れる前に回収する
// 成功: 30個回収  失敗: 穴に5個飲み込まれる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000005',
    void:    '#110022',
    voidEdge:'#330055',
    shard:   '#88ffcc',
    shardHi: '#ffffff',
    player:  '#ffaa22',
    playerHi:'#ffdd88',
    danger:  '#ff2244',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#1a1a2e'
  };

  var PLAY_X = 80;
  var PLAY_Y = 200;
  var PLAY_W = W - 160;
  var PLAY_H = H - 320;

  var shards = [];
  var voids = [];
  var collected = 0;
  var NEEDED = 30;
  var lost = 0;
  var MAX_LOST = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.safe;
  var nextShard = 0;
  var nextVoid = 3;
  var difficulty = 1;

  function spawnShard() {
    shards.push({
      x: PLAY_X + Math.random() * PLAY_W,
      y: PLAY_Y + Math.random() * PLAY_H,
      r: 20 + Math.random() * 16,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      life: 5 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      consumed: false
    });
  }

  function spawnVoid() {
    voids.push({
      x: PLAY_X + Math.random() * PLAY_W,
      y: PLAY_Y + Math.random() * PLAY_H,
      r: 30,
      growRate: 8 + difficulty * 4,
      maxR: 120 + difficulty * 20,
      phase: Math.random() * Math.PI * 2
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Collect nearby shards
    var hit = false;
    for (var si = shards.length - 1; si >= 0; si--) {
      var s = shards[si];
      if (s.consumed) continue;
      var dx = tx - s.x, dy = ty - s.y;
      if (dx * dx + dy * dy < (s.r + 80) * (s.r + 80)) {
        s.consumed = true;
        collected++;
        flashCol = C.safe;
        flashAnim = 0.2;
        game.audio.play('se_tap', 0.3);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: s.x, y: s.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.shardHi });
        }
        if (collected >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(collected * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
        hit = true;
        break;
      }
    }
    if (!hit) game.audio.play('se_tap', 0.08);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      difficulty = 1 + elapsed / 15;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Spawn shards
    nextShard -= dt;
    if (nextShard <= 0) {
      if (shards.filter(function(s) { return !s.consumed; }).length < 6) spawnShard();
      nextShard = 0.8 + Math.random() * 0.6;
    }

    // Spawn voids
    nextVoid -= dt;
    if (nextVoid <= 0 && !done) {
      if (voids.length < 4 + Math.floor(difficulty)) spawnVoid();
      nextVoid = 4 + Math.random() * 3 - difficulty * 0.3;
    }

    // Update shards
    for (var si = shards.length - 1; si >= 0; si--) {
      var s = shards[si];
      if (s.consumed) {
        shards.splice(si, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // Bounce off play area
      if (s.x < PLAY_X + s.r) { s.x = PLAY_X + s.r; s.vx = Math.abs(s.vx); }
      if (s.x > PLAY_X + PLAY_W - s.r) { s.x = PLAY_X + PLAY_W - s.r; s.vx = -Math.abs(s.vx); }
      if (s.y < PLAY_Y + s.r) { s.y = PLAY_Y + s.r; s.vy = Math.abs(s.vy); }
      if (s.y > PLAY_Y + PLAY_H - s.r) { s.y = PLAY_Y + PLAY_H - s.r; s.vy = -Math.abs(s.vy); }
      s.life -= dt;
      s.phase += dt * 3;
      if (s.life <= 0) {
        shards.splice(si, 1);
        continue;
      }
      // Check void collision
      var inVoid = false;
      for (var vi = 0; vi < voids.length; vi++) {
        var v = voids[vi];
        var dx2 = s.x - v.x, dy2 = s.y - v.y;
        if (dx2 * dx2 + dy2 * dy2 < v.r * v.r) {
          inVoid = true;
          break;
        }
      }
      if (inVoid) {
        shards.splice(si, 1);
        lost++;
        flashCol = C.danger;
        flashAnim = 0.35;
        game.audio.play('se_failure', 0.35);
        if (lost >= MAX_LOST && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Update voids
    for (var vi2 = 0; vi2 < voids.length; vi2++) {
      var v2 = voids[vi2];
      if (v2.r < v2.maxR) v2.r += v2.growRate * dt;
      v2.phase += dt * 1.5;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Play field
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H, C.ui, 0.2);

    // Voids
    for (var vi3 = 0; vi3 < voids.length; vi3++) {
      var v3 = voids[vi3];
      game.draw.circle(v3.x, v3.y, v3.r + 20 + Math.sin(v3.phase) * 8, C.voidEdge, 0.25);
      game.draw.circle(v3.x, v3.y, v3.r, C.void, 0.95);
      game.draw.circle(v3.x, v3.y, v3.r * 0.5, C.bg, 0.7);
    }

    // Shards
    for (var si2 = 0; si2 < shards.length; si2++) {
      var s2 = shards[si2];
      var lifeRatio = Math.min(1, s2.life / 2);
      var pulse = 1 + Math.sin(s2.phase) * 0.15;
      game.draw.circle(s2.x, s2.y, s2.r * pulse * 1.5, C.shard, lifeRatio * 0.15);
      game.draw.circle(s2.x, s2.y, s2.r * pulse, C.shard, lifeRatio * 0.8);
      game.draw.circle(s2.x - s2.r * 0.3, s2.y - s2.r * 0.3, s2.r * 0.3, C.shardHi, 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Lost dots
    for (var li = 0; li < MAX_LOST; li++) {
      game.draw.circle(W / 2 - (MAX_LOST - 1) * 60 + li * 120, H * 0.955, 22, li < lost ? C.danger : C.ui, 0.9);
    }

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.shard : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnShard();
    spawnShard();
    spawnShard();
  });
})(game);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = innerWidth;
let H = innerHeight;

function resize() {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
}

addEventListener("resize", resize);
resize();

/* =========================
   WORLD
========================= */

const WORLD = {
  width: 3600,
  height: 2600
};

const player = {
  x: 1800,
  y: 1300,
  radius: 16,
  speed: 3.2,
  hp: 100,
  maxHp: 100,
  damageCooldown: 0
};

const keys = {};

let mouse = {
  x: W / 2,
  y: H / 2,
  down: false
};

addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === "1") {
    weapon = 0;
  }

  if (e.key === "2") {
    weapon = 1;
  }

  if (e.key === "Enter") {
    enterHouse();
  }

  if (e.key.toLowerCase() === "r" && (gameOver || victory)) {
    location.reload();
  }
});

addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  const crosshair = document.getElementById("crosshair");
  crosshair.style.left = e.clientX + "px";
  crosshair.style.top = e.clientY + "px";
});

addEventListener("mousedown", () => {
  mouse.down = true;
});

addEventListener("mouseup", () => {
  mouse.down = false;
});

/* =========================
   WEAPONS
========================= */

const weapons = [
  {
    name: "PISTOL",
    damage: 35,
    cooldown: 230,
    bullets: 1,
    spread: 0.025,
    speed: 17
  },

  {
    name: "SHOTGUN",
    damage: 18,
    cooldown: 700,
    bullets: 8,
    spread: 0.32,
    speed: 14
  }
];

let weapon = 0;
let lastShot = 0;

/* =========================
   MAP
========================= */

const lakes = [
  {
    x: 160,
    y: 180,
    w: 700,
    h: 470
  },

  {
    x: 2380,
    y: 150,
    w: 850,
    h: 530
  },

  {
    x: 180,
    y: 1730,
    w: 720,
    h: 590
  },

  {
    x: 2200,
    y: 1700,
    w: 1050,
    h: 600
  }
];

const houses = [
  {
    x: 1050,
    y: 300,
    w: 300,
    h: 220,
    doorX: 1200,
    doorY: 520,
    open: false
  },

  {
    x: 1500,
    y: 250,
    w: 330,
    h: 230,
    doorX: 1660,
    doorY: 480,
    open: false
  },

  {
    x: 940,
    y: 1780,
    w: 350,
    h: 240,
    doorX: 1110,
    doorY: 2020,
    open: false
  },

  {
    x: 1450,
    y: 1800,
    w: 340,
    h: 230,
    doorX: 1620,
    doorY: 2030,
    open: false
  },

  {
    x: 1450,
    y: 900,
    w: 330,
    h: 220,
    doorX: 1610,
    doorY: 1120,
    open: false
  }
];

const trees = [];
const rocks = [];
const fences = [];

function random(a, b) {
  return a + Math.random() * (b - a);
}

function distance(a, b, c, d) {
  return Math.hypot(a - c, b - d);
}

function circleRectCollision(cx, cy, radius, rect) {
  const closestX = Math.max(
    rect.x,
    Math.min(cx, rect.x + rect.w)
  );

  const closestY = Math.max(
    rect.y,
    Math.min(cy, rect.y + rect.h)
  );

  return distance(cx, cy, closestX, closestY) < radius;
}

function blocked(x, y, radius = 15) {

  if (
    x < radius ||
    y < radius ||
    x > WORLD.width - radius ||
    y > WORLD.height - radius
  ) {
    return true;
  }

  for (const lake of lakes) {
    if (circleRectCollision(x, y, radius, lake)) {
      return true;
    }
  }

  for (const house of houses) {
    if (
      !house.open &&
      circleRectCollision(x, y, radius, house)
    ) {
      return true;
    }
  }

  return false;
}

function createMap() {

  for (let i = 0; i < 260; i++) {

    const x = random(30, WORLD.width - 30);
    const y = random(30, WORLD.height - 30);

    if (!blocked(x, y, 12)) {
      trees.push({
        x,
        y,
        size: random(.7, 1.5)
      });
    }
  }

  for (let i = 0; i < 90; i++) {

    const x = random(30, WORLD.width - 30);
    const y = random(30, WORLD.height - 30);

    if (!blocked(x, y, 10)) {
      rocks.push({
        x,
        y,
        size: random(.6, 1.3)
      });
    }
  }

  for (let i = 0; i < 30; i++) {

    fences.push({
      x: random(50, WORLD.width - 200),
      y: random(50, WORLD.height - 50),
      horizontal: Math.random() > .5
    });
  }
}

createMap();

/* =========================
   ZOMBIES
========================= */

const zombies = [];
const bullets = [];
const particles = [];

let wave = 1;
let spawnLeft = 0;
let spawnTimer = 0;
let waveCooldown = 0;

let boss = null;

const zombieTypes = {

  weakSlow: {
    hp: 45,
    speed: 1.0,
    radius: 15,
    damage: 8,
    color: "#668f45"
  },

  tankSlow: {
    hp: 170,
    speed: .58,
    radius: 23,
    damage: 16,
    color: "#80613f"
  },

  fastWeak: {
    hp: 32,
    speed: 1.9,
    radius: 14,
    damage: 7,
    color: "#b8a83e"
  },

  tankFast: {
    hp: 115,
    speed: 1.25,
    radius: 21,
    damage: 14,
    color: "#477d61"
  }
};

function spawnZombie() {

  let x;
  let y;
  let tries = 0;

  do {

    x = random(30, WORLD.width - 30);
    y = random(30, WORLD.height - 30);

    tries++;

  } while (
    (
      distance(x, y, player.x, player.y) < 600 ||
      blocked(x, y, 25)
    ) &&
    tries < 100
  );

  const roll = Math.random();

  let type;

  if (roll < .45) {
    type = "weakSlow";
  } else if (roll < .68) {
    type = "tankSlow";
  } else if (roll < .88) {
    type = "fastWeak";
  } else {
    type = "tankFast";
  }

  const data = zombieTypes[type];

  zombies.push({
    x,
    y,
    type,
    hp: data.hp + wave * .8,
    maxHp: data.hp + wave * .8,
    speed: data.speed,
    radius: data.radius,
    damage: data.damage,
    color: data.color,
    hit: 0
  });
}

/* =========================
   WAVES
========================= */

function startWave(number) {

  wave = number;

  if (wave < 100) {

    spawnLeft = Math.min(
      10 + wave * 2,
      190
    );

    spawnTimer = 0;

  } else {

    spawnLeft = 0;

    boss = {
      x: 1800,
      y: 300,
      radius: 55,
      hp: 2500,
      maxHp: 2500,
      speed: .7,
      damage: 25,
      hit: 0
    };

    showMessage(
      "WAVE 100\nTHE BOSS HAS ARRIVED"
    );
  }
}

function nextWave() {

  if (wave >= 100) return;

  waveCooldown = 180;
}

startWave(1);

/* =========================
   SHOOTING
========================= */

function shoot() {

  const now = performance.now();
  const gun = weapons[weapon];

  if (now - lastShot < gun.cooldown) {
    return;
  }

  lastShot = now;

  const cam = getCamera();

  const targetX = mouse.x + cam.x;
  const targetY = mouse.y + cam.y;

  const baseAngle = Math.atan2(
    targetY - player.y,
    targetX - player.x
  );

  for (let i = 0; i < gun.bullets; i++) {

    const angle =
      baseAngle +
      random(-gun.spread, gun.spread);

    bullets.push({
      x: player.x + Math.cos(angle) * 23,
      y: player.y + Math.sin(angle) * 23,
      vx: Math.cos(angle) * gun.speed,
      vy: Math.sin(angle) * gun.speed,
      damage: gun.damage,
      life: 60
    });
  }

  muzzleFlash();
}

function muzzleFlash() {

  for (let i = 0; i < 5; i++) {

    particles.push({
      x: player.x,
      y: player.y,
      vx: random(-2, 2),
      vy: random(-2, 2),
      life: 12,
      size: random(2, 5)
    });
  }
}

/* =========================
   HOUSE
========================= */

function enterHouse() {

  for (const house of houses) {

    if (
      distance(
        player.x,
        player.y,
        house.doorX,
        house.doorY
      ) < 70
    ) {

      house.open = !house.open;

      showMessage(
        house.open
          ? "HOUSE ENTERED"
          : "HOUSE EXITED"
      );

      return;
    }
  }
}

/* =========================
   DAMAGE
========================= */

function damageZombie(zombie, amount) {

  zombie.hp -= amount;
  zombie.hit = 5;

  for (let i = 0; i < 3; i++) {

    particles.push({
      x: zombie.x,
      y: zombie.y,
      vx: random(-2, 2),
      vy: random(-2, 2),
      life: 20,
      size: random(2, 4)
    });
  }
}

/* =========================
   UPDATE
========================= */

function update() {

  if (gameOver || victory) return;

  if (waveCooldown > 0) {

    waveCooldown--;

    if (waveCooldown === 0) {
      startWave(wave + 1);
    }

    return;
  }

  /* PLAYER */

  let dx = 0;
  let dy = 0;

  if (keys.w || keys.arrowup) dy--;
  if (keys.s || keys.arrowdown) dy++;
  if (keys.a || keys.arrowleft) dx--;
  if (keys.d || keys.arrowright) dx++;

  if (dx || dy) {

    const length = Math.hypot(dx, dy);

    dx /= length;
    dy /= length;

    const newX =
      player.x +
      dx * player.speed;

    const newY =
      player.y +
      dy * player.speed;

    if (!blocked(newX, player.y, player.radius)) {
      player.x = newX;
    }

    if (!blocked(player.x, newY, player.radius)) {
      player.y = newY;
    }
  }

  if (mouse.down) {
    shoot();
  }

  /* SPAWNING */

  if (wave < 100 && spawnLeft > 0) {

    spawnTimer--;

    if (spawnTimer <= 0) {

      spawnZombie();

      spawnLeft--;

      spawnTimer =
        Math.max(
          7,
          27 - wave * .18
        );
    }
  }

  if (
    wave < 100 &&
    spawnLeft === 0 &&
    zombies.length === 0
  ) {

    nextWave();
  }

  /* BULLETS */

  for (const bullet of bullets) {

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.life--;

    if (
      bullet.life <= 0 ||
      blocked(bullet.x, bullet.y, 3)
    ) {
      continue;
    }

    for (const zombie of zombies) {

      if (
        zombie.hp > 0 &&
        distance(
          bullet.x,
          bullet.y,
          zombie.x,
          zombie.y
        ) <
        zombie.radius + 5
      ) {

        damageZombie(
          zombie,
          bullet.damage
        );

        bullet.life = 0;

        break;
      }
    }

    if (
      boss &&
      boss.hp > 0 &&
      distance(
        bullet.x,
        bullet.y,
        boss.x,
        boss.y
      ) <
      boss.radius + 5
    ) {

      boss.hp -= bullet.damage;
      boss.hit = 5;

      bullet.life = 0;
    }
  }

  /* REMOVE BULLETS */

  for (let i = bullets.length - 1; i >= 0; i--) {

    if (bullets[i].life <= 0) {
      bullets.splice(i, 1);
    }
  }

  /* ZOMBIES */

  for (const zombie of zombies) {

    zombie.hit = Math.max(
      0,
      zombie.hit - 1
    );

    const angle = Math.atan2(
      player.y - zombie.y,
      player.x - zombie.x
    );

    const nx =
      zombie.x +
      Math.cos(angle) *
      zombie.speed;

    const ny =
      zombie.y +
      Math.sin(angle) *
      zombie.speed;

    if (!blocked(nx, zombie.y, zombie.radius)) {
      zombie.x = nx;
    }

    if (!blocked(zombie.x, ny, zombie.radius)) {
      zombie.y = ny;
    }

    if (
      distance(
        zombie.x,
        zombie.y,
        player.x,
        player.y
      ) <
      zombie.radius +
      player.radius
    ) {

      player.hp -= zombie.damage * .018;

      if (player.hp <= 0) {
        gameOver = true;
        showMessage(
          "YOU DIED\nPRESS R TO RESTART"
        );
      }
    }
  }

  /* REMOVE DEAD ZOMBIES */

  for (let i = zombies.length - 1; i >= 0; i--) {

    if (zombies[i].hp <= 0) {

      const z = zombies[i];

      for (let p = 0; p < 8; p++) {

        particles.push({
          x: z.x,
          y: z.y,
          vx: random(-3, 3),
          vy: random(-3, 3),
          life: 30,
          size: random(2, 5)
        });
      }

      zombies.splice(i, 1);
    }
  }

  /* BOSS */

  if (boss && boss.hp > 0) {

    const angle = Math.atan2(
      player.y - boss.y,
      player.x - boss.x
    );

    const nx =
      boss.x +
      Math.cos(angle) *
      boss.speed;

    const ny =
      boss.y +
      Math.sin(angle) *
      boss.speed;

    if (!blocked(nx, boss.y, boss.radius)) {
      boss.x = nx;
    }

    if (!blocked(boss.x, ny, boss.radius)) {
      boss.y = ny;
    }

    if (
      distance(
        boss.x,
        boss.y,
        player.x,
        player.y
      ) <
      boss.radius +
      player.radius
    ) {

      player.hp -= boss.damage * .018;

      if (player.hp <= 0) {

        gameOver = true;

        showMessage(
          "YOU DIED\nPRESS R TO RESTART"
        );
      }
    }
  }

  if (
    wave === 100 &&
    boss &&
    boss.hp <= 0
  ) {

    victory = true;

    showMessage(
      "100 WAVES SURVIVED!\nBOSS DEFEATED\nPRESS R TO PLAY AGAIN"
    );
  }

  /* PARTICLES */

  for (const p of particles) {

    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }

  for (let i = particles.length - 1; i >= 0; i--) {

    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  updateHUD();
}

/* =========================
   DRAW
========================= */

function getCamera() {

  return {
    x: Math.max(
      0,
      Math.min(
        WORLD.width - W,
        player.x - W / 2
      )
    ),

    y: Math.max(
      0,
      Math.min(
        WORLD.height - H,
        player.y - H / 2
      )
    )
  };
}

function drawGround() {

  ctx.fillStyle = "#344332";
  ctx.fillRect(
    0,
    0,
    WORLD.width,
    WORLD.height
  );

  /* grass texture */

  ctx.strokeStyle = "rgba(255,255,255,.025)";
  ctx.lineWidth = 1;

  for (
    let x = 0;
    x < WORLD.width;
    x += 70
  ) {

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }

  for (
    let y = 0;
    y < WORLD.height;
    y += 70
  ) {

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }

  /* roads */

  ctx.fillStyle = "#514b3d";

  ctx.fillRect(
    0,
    1190,
    WORLD.width,
    100
  );

  ctx.fillRect(
    1750,
    0,
    100,
    WORLD.height
  );

  ctx.strokeStyle = "#756d57";
  ctx.lineWidth = 3;

  ctx.setLineDash([25, 25]);

  ctx.beginPath();
  ctx.moveTo(0, 1240);
  ctx.lineTo(WORLD.width, 1240);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(1800, 0);
  ctx.lineTo(1800, WORLD.height);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawLakes() {

  for (const lake of lakes) {

    ctx.fillStyle = "#1e4c5b";

    ctx.fillRect(
      lake.x,
      lake.y,
      lake.w,
      lake.h
    );

    ctx.strokeStyle = "#6aa4a7";
    ctx.lineWidth = 6;

    ctx.strokeRect(
      lake.x,
      lake.y,
      lake.w,
      lake.h
    );

    /* water lines */

    ctx.strokeStyle =
      "rgba(180,220,220,.22)";

    ctx.lineWidth = 2;

    for (
      let y = lake.y + 30;
      y < lake.y + lake.h;
      y += 45
    ) {

      ctx.beginPath();

      ctx.moveTo(
        lake.x + 20,
        y
      );

      ctx.lineTo(
        lake.x + lake.w - 20,
        y
      );

      ctx.stroke();
    }
  }
}

function drawTrees() {

  for (const tree of trees) {

    ctx.fillStyle = "#26351f";

    ctx.beginPath();

    ctx.arc(
      tree.x,
      tree.y,
      18 * tree.size,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#496b3c";

    ctx.beginPath();

    ctx.arc(
      tree.x - 5,
      tree.y - 8,
      15 * tree.size,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#604c32";

    ctx.fillRect(
      tree.x - 4,
      tree.y + 5,
      8,
      18 * tree.size
    );
  }

  for (const rock of rocks) {

    ctx.fillStyle = "#77766e";

    ctx.beginPath();

    ctx.ellipse(
      rock.x,
      rock.y,
      12 * rock.size,
      8 * rock.size,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}

function drawFences() {

  ctx.strokeStyle = "#725a3c";
  ctx.lineWidth = 5;

  for (const fence of fences) {

    ctx.beginPath();

    if (fence.horizontal) {

      ctx.moveTo(
        fence.x,
        fence.y
      );

      ctx.lineTo(
        fence.x + 130,
        fence.y
      );

    } else {

      ctx.moveTo(
        fence.x,
        fence.y
      );

      ctx.lineTo(
        fence.x,
        fence.y + 130
      );
    }

    ctx.stroke();
  }
}

function drawHouses() {

  for (const house of houses) {

    /* shadow */

    ctx.fillStyle =
      "rgba(0,0,0,.25)";

    ctx.fillRect(
      house.x + 12,
      house.y + 14,
      house.w,
      house.h
    );

    /* wall */

    ctx.fillStyle = "#a99776";

    ctx.fillRect(
      house.x,
      house.y,
      house.w,
      house.h
    );

    /* roof */

    ctx.fillStyle = "#5c3933";

    ctx.beginPath();

    ctx.moveTo(
      house.x - 15,
      house.y
    );

    ctx.lineTo(
      house.x + house.w / 2,
      house.y - 70
    );

    ctx.lineTo(
      house.x + house.w + 15,
      house.y
    );

    ctx.closePath();

    ctx.fill();

    /* windows */

    ctx.fillStyle = "#46636a";

    ctx.fillRect(
      house.x + 35,
      house.y + 55,
      55,
      45
    );

    ctx.fillRect(
      house.x + house.w - 90,
      house.y + 55,
      55,
      45
    );

    /* door */

    ctx.fillStyle =
      house.open
        ? "#7fc88a"
        : "#4b3327";

    ctx.fillRect(
      house.doorX - 22,
      house.doorY - 45,
      44,
      45
    );
  }
}

function drawPlayer() {

  const cam = getCamera();

  const angle = Math.atan2(
    mouse.y + cam.y - player.y,
    mouse.x + cam.x - player.x
  );

  /* shadow */

  ctx.fillStyle =
    "rgba(0,0,0,.35)";

  ctx.beginPath();

  ctx.ellipse(
    player.x,
    player.y + 7,
    18,
    9,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* body */

  ctx.fillStyle = "#386e91";

  ctx.beginPath();

  ctx.arc(
    player.x,
    player.y,
    player.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* gun */

  ctx.strokeStyle = "#171717";

  ctx.lineWidth =
    weapon === 0
      ? 6
      : 9;

  ctx.beginPath();

  ctx.moveTo(
    player.x,
    player.y
  );

  ctx.lineTo(
    player.x +
      Math.cos(angle) * 32,
    player.y +
      Math.sin(angle) * 32
  );

  ctx.stroke();

  /* head */

  ctx.fillStyle = "#d3b991";

  ctx.beginPath();

  ctx.arc(
    player.x +
      Math.cos(angle) * 6,
    player.y +
      Math.sin(angle) * 6,
    7,
    0,
    Math.PI * 2
  );

  ctx.fill();
}

function drawZombie(z) {

  /* shadow */

  ctx.fillStyle =
    "rgba(0,0,0,.35)";

  ctx.beginPath();

  ctx.ellipse(
    z.x,
    z.y + 7,
    z.radius,
    z.radius * .45,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* body */

  ctx.fillStyle =
    z.hit > 0
      ? "#ddd"
      : z.color;

  ctx.beginPath();

  ctx.arc(
    z.x,
    z.y,
    z.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* zombie face */

  ctx.fillStyle = "#171717";

  ctx.beginPath();

  ctx.arc(
    z.x - 5,
    z.y - 4,
    3,
    0,
    Math.PI * 2
  );

  ctx.arc(
    z.x + 5,
    z.y - 4,
    3,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* bucket */

  if (
    z.type === "tankSlow" ||
    z.type === "tankFast"
  ) {

    ctx.fillStyle = "#777";

    ctx.beginPath();

    ctx.arc(
      z.x,
      z.y - 8,
      z.radius * .72,
      Math.PI,
      Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 3;

    ctx.stroke();
  }

  /* health bar */

  const width = z.radius * 2;

  ctx.fillStyle = "#271919";

  ctx.fillRect(
    z.x - width / 2,
    z.y - z.radius - 10,
    width,
    4
  );

  ctx.fillStyle = "#c65a4c";

  ctx.fillRect(
    z.x - width / 2,
    z.y - z.radius - 10,
    width * Math.max(
      0,
      z.hp / z.maxHp
    ),
    4
  );
}

function drawBoss() {

  if (!boss || boss.hp <= 0) return;

  ctx.fillStyle =
    "rgba(0,0,0,.4)";

  ctx.beginPath();

  ctx.ellipse(
    boss.x,
    boss.y + 15,
    60,
    25,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle =
    boss.hit > 0
      ? "#ddd"
      : "#5b2424";

  ctx.beginPath();

  ctx.arc(
    boss.x,
    boss.y,
    boss.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* boss eyes */

  ctx.fillStyle = "#e4c85a";

  ctx.beginPath();

  ctx.arc(
    boss.x - 18,
    boss.y - 10,
    7,
    0,
    Math.PI * 2
  );

  ctx.arc(
    boss.x + 18,
    boss.y - 10,
    7,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* boss health */

  const barWidth = 180;

  ctx.fillStyle = "#211";

  ctx.fillRect(
    boss.x - barWidth / 2,
    boss.y - 80,
    barWidth,
    12
  );

  ctx.fillStyle = "#d34b43";

  ctx.fillRect(
    boss.x - barWidth / 2,
    boss.y - 80,
    barWidth *
      Math.max(
        0,
        boss.hp / boss.maxHp
      ),
    12
  );
}

function drawBullets() {

  ctx.fillStyle = "#f1d278";

  for (const bullet of bullets) {

    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}

function drawParticles() {

  for (const p of particles) {

    ctx.globalAlpha =
      Math.max(0, p.life / 30);

    ctx.fillStyle = "#d5bd78";

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawMinimap() {

  const width = 160;
  const height = 115;

  const x = W - width - 12;
  const y = 12;

  ctx.fillStyle =
    "rgba(0,0,0,.75)";

  ctx.fillRect(
    x,
    y,
    width,
    height
  );

  const sx =
    width / WORLD.width;

  const sy =
    height / WORLD.height;

  ctx.fillStyle = "#27566a";

  for (const lake of lakes) {

    ctx.fillRect(
      x + lake.x * sx,
      y + lake.y * sy,
      lake.w * sx,
      lake.h * sy
    );
  }

  ctx.fillStyle = "#9d8968";

  for (const house of houses) {

    ctx.fillRect(
      x + house.x * sx,
      y + house.y * sy,
      house.w * sx,
      house.h * sy
    );
  }

  ctx.fillStyle = "#54a3d2";

  ctx.beginPath();

  ctx.arc(
    x + player.x * sx,
    y + player.y * sy,
    3,
    0,
    Math.PI * 2
  );

  ctx.fill();
}

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );

  const cam = getCamera();

  ctx.save();

  ctx.translate(
    -cam.x,
    -cam.y
  );

  drawGround();
  drawLakes();
  drawFences();
  drawTrees();
  drawHouses();
  drawBullets();

  for (const zombie of zombies) {
    drawZombie(zombie);
  }

  drawBoss();
  drawPlayer();
  drawParticles();

  ctx.restore();

  drawMinimap();

  /* damage vignette */

  if (player.hp < 35) {

    ctx.fillStyle =
      "rgba(150,0,0,.12)";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }
}

/* =========================
   UI
========================= */

function updateHUD() {

  document.getElementById("wave")
    .textContent = wave;

  document.getElementById("hp")
    .textContent =
    Math.max(
      0,
      Math.ceil(player.hp)
    );

  document.getElementById("weapon")
    .textContent =
    weapons[weapon].name;

  document.getElementById("count")
    .textContent =
    zombies.length +
    (boss && boss.hp > 0 ? 1 : 0);
}

let messageTimer = null;

function showMessage(text) {

  const element =
    document.getElementById("message");

  element.textContent = text;

  clearTimeout(messageTimer);

  messageTimer =
    setTimeout(() => {

      if (!gameOver && !victory) {
        element.textContent = "";
      }

    }, 2500);
}

let gameOver = false;
let victory = false;

/* =========================
   GAME LOOP
========================= */

function gameLoop() {

  update();
  draw();

  requestAnimationFrame(gameLoop);
}

updateHUD();
gameLoop();

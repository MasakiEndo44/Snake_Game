document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');
    const p1StartBtn = document.getElementById('p1-start-btn');
    const p2StartBtn = document.getElementById('p2-start-btn');
    const rematchBtn = document.getElementById('rematch-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const p1ScoreDisplay = document.getElementById('player1-score');
    const p2ScoreDisplay = document.getElementById('player2-score');
    const winnerMessage = document.getElementById('winner-message');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Game State
    let p1Ready = false;
    let p2Ready = false;
    let gameLoopId;
    let player1, player2, food;
    let particles = [];
    let gameOver = false;
    const keysPressed = {};

    // Game Constants
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const WALL_THICKNESS = 10;
    const SNAKE_RADIUS = 7;
    const SNAKE_SPEED = 2.0;
    const SNAKE_TURN_RATE = 0.06;
    const FOOD_RADIUS = 5;
    const GROWTH_FACTOR = 5;
    const PARTICLE_COUNT = 40;
    const PARTICLE_SPEED = 3;
    const PARTICLE_LIFESPAN = 60; // frames

    // --- Utility & Classes ---
    const getDistance = (o1, o2) => Math.hypot(o1.x - o2.x, o1.y - o2.y);

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.lifespan = PARTICLE_LIFESPAN;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * PARTICLE_SPEED + 1;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.lifespan--;
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.lifespan / PARTICLE_LIFESPAN;
            ctx.fillRect(this.x, this.y, 4, 4); // Pixel-like particles
            ctx.globalAlpha = 1.0;
        }
    }

    class Food {
        constructor() {
            this.radius = FOOD_RADIUS;
            this.color = '#ff0';
            this.spawn();
        }
        spawn() {
            this.x = Math.random() * (CANVAS_WIDTH - WALL_THICKNESS * 4) + WALL_THICKNESS * 2;
            this.y = Math.random() * (CANVAS_HEIGHT - WALL_THICKNESS * 4) + WALL_THICKNESS * 2;
        }
        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class Snake {
        constructor(x, y, angle, color, name) {
            this.name = name;
            this.body = [];
            this.angle = angle;
            this.color = color;
            this.turnDirection = 0;
            this.growthCounter = 0;
            this.score = 0;
            for (let i = 0; i < 15; i++) {
                this.body.push({ x: x - i * SNAKE_SPEED, y: y });
            }
        }

        update() {
            this.angle += this.turnDirection * SNAKE_TURN_RATE;
            const head = this.body[0];
            const newHead = { x: head.x + Math.cos(this.angle) * SNAKE_SPEED, y: head.y + Math.sin(this.angle) * SNAKE_SPEED };
            this.body.unshift(newHead);
            if (this.growthCounter > 0) this.growthCounter--;
            else this.body.pop();
        }

        grow() {
            this.growthCounter += GROWTH_FACTOR;
            this.score++;
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            this.body.forEach(segment => {
                ctx.beginPath();
                ctx.arc(segment.x, segment.y, SNAKE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    // --- Input Handling ---
    const handleKeyDown = e => { keysPressed[e.key.toLowerCase()] = true; };
    const handleKeyUp = e => { keysPressed[e.key.toLowerCase()] = false; };

    function handlePlayerInput() {
        if (gameOver) return;
        player1.turnDirection = keysPressed['arrowleft'] ? -1 : (keysPressed['arrowright'] ? 1 : 0);
        player2.turnDirection = keysPressed['a'] ? -1 : (keysPressed['d'] ? 1 : 0);
    }

    // --- Collision & Game Over ---
    function createExplosion(x, y, color) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function checkCollisions() {
        if (gameOver) return;
        const check = (snake, otherSnake) => {
            const head = snake.body[0];
            if (head.x < WALL_THICKNESS || head.x > CANVAS_WIDTH - WALL_THICKNESS || head.y < WALL_THICKNESS || head.y > CANVAS_HEIGHT - WALL_THICKNESS) return { loser: snake, winner: otherSnake };
            for (let i = 4; i < snake.body.length; i++) if (getDistance(head, snake.body[i]) < SNAKE_RADIUS) return { loser: snake, winner: otherSnake };
            for (let i = 0; i < otherSnake.body.length; i++) if (getDistance(head, otherSnake.body[i]) < SNAKE_RADIUS) return { loser: snake, winner: otherSnake };
            return null;
        };

        const result = check(player1, player2) || check(player2, player1);
        if (result) {
            triggerGameOver(result.winner, result.loser);
        }

        // Food Collision
        if (getDistance(player1.body[0], food) < SNAKE_RADIUS + FOOD_RADIUS) {
            player1.grow();
            p1ScoreDisplay.textContent = `P1: ${player1.score}`;
            food.spawn();
        }
        if (getDistance(player2.body[0], food) < SNAKE_RADIUS + FOOD_RADIUS) {
            player2.grow();
            p2ScoreDisplay.textContent = `P2: ${player2.score}`;
            food.spawn();
        }
    }

    // --- Screen & Game Flow ---
    const showScreen = id => document.querySelectorAll('.screen').forEach(s => s.id === id ? s.classList.add('active') : s.classList.remove('active'));

    function initGame() {
        gameOver = false;
        particles = [];
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        p1ScoreDisplay.textContent = 'P1: 0';
        p2ScoreDisplay.textContent = 'P2: 0';
        player1 = new Snake(150, CANVAS_HEIGHT / 2, 0, '#0f0', 'PLAYER 1');
        player2 = new Snake(CANVAS_WIDTH - 150, CANVAS_HEIGHT / 2, Math.PI, '#f0f', 'PLAYER 2');
        food = new Food();
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        showScreen('game-screen');
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoop();
    }

    function gameLoop() {
        update();
        draw();
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function update() {
        handlePlayerInput();
        if (!gameOver) {
            player1.update();
            player2.update();
            checkCollisions();
        }
        particles.forEach((p, i) => {
            p.update();
            if (p.lifespan <= 0) particles.splice(i, 1);
        });
    }

    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, WALL_THICKNESS);
        ctx.fillRect(0, CANVAS_HEIGHT - WALL_THICKNESS, CANVAS_WIDTH, WALL_THICKNESS);
        ctx.fillRect(0, 0, WALL_THICKNESS, CANVAS_HEIGHT);
        ctx.fillRect(CANVAS_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, CANVAS_HEIGHT);
        if (!gameOver) {
            player1.draw(ctx);
            player2.draw(ctx);
        }
        food.draw(ctx);
        particles.forEach(p => p.draw(ctx));
    }

    function triggerGameOver(winner, loser) {
        gameOver = true;
        createExplosion(loser.body[0].x, loser.body[0].y, loser.color);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        setTimeout(() => {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
            winnerMessage.textContent = `${winner.name} WINS!`;
            showScreen('result-screen');
            rematchBtn.disabled = true;
            backToMenuBtn.disabled = true;
            setTimeout(() => {
                rematchBtn.disabled = false;
                backToMenuBtn.disabled = false;
            }, 30000);
        }, 2000); // Wait for particle animation to play out
    }

    // --- Menu Logic ---
    const setupMenuButton = (btn, playerReady) => {
        btn.addEventListener('click', () => {
            playerReady = !playerReady;
            btn.classList.toggle('ready', playerReady);
            btn.textContent = playerReady ? 'READY!' : 'READY';
            if (p1Ready && p2Ready) setTimeout(initGame, 1000);
        });
        return playerReady;
    };
    p1Ready = setupMenuButton(p1StartBtn, p1Ready);
    p2Ready = setupMenuButton(p2StartBtn, p2Ready);

    function resetToMainMenu() {
        p1Ready = false;
        p2Ready = false;
        p1StartBtn.classList.remove('ready');
        p1StartBtn.textContent = 'READY';
        p2StartBtn.classList.remove('ready');
        p2StartBtn.textContent = 'READY';
        showScreen('main-menu');
    }

    rematchBtn.addEventListener('click', () => {
        resetToMainMenu();
        setTimeout(() => { // Give a moment before auto-readjusting
            p1StartBtn.click();
            p2StartBtn.click();
        }, 100);
    });
    backToMenuBtn.addEventListener('click', resetToMainMenu);

    showScreen('main-menu');
});

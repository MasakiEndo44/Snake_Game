document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');

    // Buttons
    const p1StartBtn = document.getElementById('p1-start-btn');
    const p2StartBtn = document.getElementById('p2-start-btn');
    const rematchBtn = document.getElementById('rematch-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    // Displays
    const p1ScoreDisplay = document.getElementById('player1-score');
    const p2ScoreDisplay = document.getElementById('player2-score');
    const winnerMessage = document.getElementById('winner-message');

    // Canvas & Context
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Game State
    let p1Ready = false;
    let p2Ready = false;
    let gameLoopId;
    let player1, player2, food;
    const keysPressed = {};

    // Game Constants
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const WALL_THICKNESS = 10;
    const SNAKE_RADIUS = 7;
    const SNAKE_SPEED = 2.0;
    const SNAKE_TURN_RATE = 0.06;
    const FOOD_RADIUS = 5;
    const GROWTH_FACTOR = 5; // Segments to add per food item

    // --- Utility Functions ---
    function getDistance(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // --- Food Class ---
    class Food {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = FOOD_RADIUS;
            this.color = '#ff0'; // Yellow
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function createFood() {
        const x = Math.random() * (CANVAS_WIDTH - WALL_THICKNESS * 4) + WALL_THICKNESS * 2;
        const y = Math.random() * (CANVAS_HEIGHT - WALL_THICKNESS * 4) + WALL_THICKNESS * 2;
        food = new Food(x, y);
    }

    // --- Snake Class ---
    class Snake {
        constructor(x, y, angle, color, name) {
            this.name = name;
            this.body = [];
            this.angle = angle;
            this.color = color;
            this.turnDirection = 0; // -1 for left, 1 for right, 0 for straight
            this.growthCounter = 0;
            this.score = 0;

            // Create initial body
            for (let i = 0; i < 15; i++) {
                this.body.push({ 
                    x: x - i * SNAKE_SPEED, 
                    y: y 
                });
            }
        }

        update() {
            this.angle += this.turnDirection * SNAKE_TURN_RATE;

            const head = this.body[0];
            const newHead = {
                x: head.x + Math.cos(this.angle) * SNAKE_SPEED,
                y: head.y + Math.sin(this.angle) * SNAKE_SPEED
            };

            this.body.unshift(newHead);

            if (this.growthCounter > 0) {
                this.growthCounter--;
            } else {
                this.body.pop();
            }
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
    function handleKeyDown(e) { keysPressed[e.key.toLowerCase()] = true; }
    function handleKeyUp(e) { keysPressed[e.key.toLowerCase()] = false; }

    function handlePlayerInput() {
        player1.turnDirection = keysPressed['arrowleft'] ? -1 : (keysPressed['arrowright'] ? 1 : 0);
        player2.turnDirection = keysPressed['a'] ? -1 : (keysPressed['d'] ? 1 : 0);
    }

    // --- Collision Detection ---
    function checkCollisions() {
        const p1Head = player1.body[0];
        const p2Head = player2.body[0];

        // Wall Collisions
        if (p1Head.x < WALL_THICKNESS || p1Head.x > CANVAS_WIDTH - WALL_THICKNESS || p1Head.y < WALL_THICKNESS || p1Head.y > CANVAS_HEIGHT - WALL_THICKNESS) {
            return showResult('PLAYER 2');
        }
        if (p2Head.x < WALL_THICKNESS || p2Head.x > CANVAS_WIDTH - WALL_THICKNESS || p2Head.y < WALL_THICKNESS || p2Head.y > CANVAS_HEIGHT - WALL_THICKNESS) {
            return showResult('PLAYER 1');
        }

        // Self Collisions (check from neck onwards)
        for (let i = 4; i < player1.body.length; i++) {
            if (getDistance(p1Head, player1.body[i]) < SNAKE_RADIUS) return showResult('PLAYER 2');
        }
        for (let i = 4; i < player2.body.length; i++) {
            if (getDistance(p2Head, player2.body[i]) < SNAKE_RADIUS) return showResult('PLAYER 1');
        }

        // Player-on-Player Collisions
        for (let i = 0; i < player2.body.length; i++) {
            if (getDistance(p1Head, player2.body[i]) < SNAKE_RADIUS) return showResult('PLAYER 2');
        }
        for (let i = 0; i < player1.body.length; i++) {
            if (getDistance(p2Head, player1.body[i]) < SNAKE_RADIUS) return showResult('PLAYER 1');
        }

        // Food Collision
        if (getDistance(p1Head, food) < SNAKE_RADIUS + FOOD_RADIUS) {
            player1.grow();
            p1ScoreDisplay.textContent = `P1: ${player1.score}`;
            createFood();
        }
        if (getDistance(p2Head, food) < SNAKE_RADIUS + FOOD_RADIUS) {
            player2.grow();
            p2ScoreDisplay.textContent = `P2: ${player2.score}`;
            createFood();
        }
    }

    // --- Screen Management ---
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    // --- Game Flow ---
    function initGame() {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        p1ScoreDisplay.textContent = 'P1: 0';
        p2ScoreDisplay.textContent = 'P2: 0';

        player1 = new Snake(150, CANVAS_HEIGHT / 2, 0, '#0f0', 'PLAYER 1');
        player2 = new Snake(CANVAS_WIDTH - 150, CANVAS_HEIGHT / 2, Math.PI, '#f0f', 'PLAYER 2');
        createFood();

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
        player1.update();
        player2.update();
        checkCollisions();
    }

    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, WALL_THICKNESS);
        ctx.fillRect(0, CANVAS_HEIGHT - WALL_THICKNESS, CANVAS_WIDTH, WALL_THICKNESS);
        ctx.fillRect(0, 0, WALL_THICKNESS, CANVAS_HEIGHT);
        ctx.fillRect(CANVAS_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, CANVAS_HEIGHT);

        player1.draw(ctx);
        player2.draw(ctx);
        food.draw(ctx);
    }

    // --- Main Menu & Result Logic ---
    p1StartBtn.addEventListener('click', () => {
        p1Ready = !p1Ready;
        p1StartBtn.classList.toggle('ready');
        p1StartBtn.textContent = p1Ready ? 'READY!' : 'READY';
        checkBothReady();
    });

    p2StartBtn.addEventListener('click', () => {
        p2Ready = !p2Ready;
        p2StartBtn.classList.toggle('ready');
        p2StartBtn.textContent = p2Ready ? 'READY!' : 'READY';
        checkBothReady();
    });

    function checkBothReady() {
        if (p1Ready && p2Ready) setTimeout(initGame, 1000);
    }

    function showResult(winner) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);

        winnerMessage.textContent = `${winner} WINS!`;
        showScreen('result-screen');

        rematchBtn.disabled = true;
        backToMenuBtn.disabled = true;
        setTimeout(() => {
            rematchBtn.disabled = false;
            backToMenuBtn.disabled = false;
        }, 3000); // 3 seconds for testing, will be 30
    }

    rematchBtn.addEventListener('click', () => {
        resetToMainMenu();
        p1StartBtn.click();
        p2StartBtn.click();
    });

    backToMenuBtn.addEventListener('click', resetToMainMenu);
    
    function resetToMainMenu() {
        p1Ready = false;
        p2Ready = false;
        p1StartBtn.classList.remove('ready');
        p1StartBtn.textContent = 'READY';
        p2StartBtn.classList.remove('ready');
        p2StartBtn.textContent = 'READY';
        showScreen('main-menu');
    }

    showScreen('main-menu');
});

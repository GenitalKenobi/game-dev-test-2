const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('startMenu');
const settingsMenu = document.getElementById('settingsMenu');
const startButton = document.getElementById('startButton');
const settingsButton = document.getElementById('settingsButton');
const backButton = document.getElementById('backButton');
const speedRange = document.getElementById('speedRange');

let movementSpeed = 3;

speedRange.addEventListener('input', (e) => {
    movementSpeed = parseInt(e.target.value);
});

startButton.addEventListener('click', () => {
    startMenu.style.display = 'none';
    canvas.style.display = 'block';
    startGame();
});

settingsButton.addEventListener('click', () => {
    startMenu.style.display = 'none';
    settingsMenu.style.display = 'block';
});

backButton.addEventListener('click', () => {
    settingsMenu.style.display = 'none';
    startMenu.style.display = 'block';
});


const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

class Character {
    constructor(x, y, width, height, color, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.originalColor = color;
        this.color = color;
        this.health = 100;
        this.stamina = 100;
        this.dx = 0;
        this.dy = 0;
        this.isJumping = false;
        this.gravity = 0.5;
        this.jumpStrength = -12;
        this.speed = movementSpeed;
        this.isAttacking = false;
        this.attackBox = { x: 0, y: 0, width: 0, height: 0 };
        this.attackCooldown = 500; // milliseconds
        this.lastAttack = 0;
        this.isBlocking = false;
        this.isPlayer = isPlayer;
    }

    draw() {
        // head
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 6, this.width / 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // body
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height / 3);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height * 0.7);
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.closePath();

        // arms
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.stroke();
        ctx.closePath();

        // legs
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height * 0.7);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height * 0.7);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.stroke();
        ctx.closePath();


        // Draw attack box for debugging
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.fillRect(this.attackBox.x, this.attackBox.y, this.attackBox.width, this.attackBox.height);
        }
    }

    update() {
        // Handle blocking
        if (this.isPlayer && keys['ArrowDown'] && this.stamina > 0) {
            this.isBlocking = true;
            this.stamina -= 0.5;
            if (this.stamina < 0) this.stamina = 0;
            this.color = 'grey';
        } else if (!this.isPlayer && this.isBlocking) {
            this.stamina -= 0.5;
            if (this.stamina < 0) this.stamina = 0;
            this.color = 'grey';
        }
        else {
            this.isBlocking = false;
            this.color = this.originalColor;
        }

        // Horizontal movement
        if (this.isPlayer) {
            if (keys['ArrowLeft'] && !this.isBlocking) {
                this.dx = -this.speed;
            } else if (keys['ArrowRight'] && !this.isBlocking) {
                this.dx = this.speed;
            } else {
                this.dx = 0;
            }
        }


        // Jumping
        if (this.isPlayer && keys['ArrowUp'] && !this.isJumping && this.stamina >= 10 && !this.isBlocking) {
            this.dy = this.jumpStrength;
            this.isJumping = true;
            this.stamina -= 10; // Stamina cost for jumping
        }

        // Stamina regeneration
        if (!this.isBlocking && !this.isJumping) {
            this.stamina += 0.2;
            if (this.stamina > 100) this.stamina = 100;
        }


        // Apply gravity
        this.dy += this.gravity;

        // Update position
        this.x += this.dx;
        this.y += this.dy;

        // Ground collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.dy = 0;
            this.isJumping = false;
        }

        // Attacks
        if (this.isPlayer && (keys['KeyZ'] || keys['KeyX']) && !this.isBlocking) {
            const now = Date.now();
            if (now - this.lastAttack > this.attackCooldown) {
                this.lastAttack = now;
                const attackType = keys['KeyZ'] ? 'punch' : 'kick';
                this.attack(attackType);
            }
        }
    }

    attack(type) {
        this.isAttacking = true;
        const attackWidth = type === 'punch' ? 50 : 70;
        const attackHeight = type === 'punch' ? 20 : 30;
        const attackY = type === 'punch' ? this.y : this.y + this.height / 2;
        
        if(this.isPlayer){
            this.attackBox = {
                x: this.x + this.width,
                y: attackY,
                width: attackWidth,
                height: attackHeight
            };
        } else {
            this.attackBox = {
                x: this.x - attackWidth,
                y: attackY,
                width: attackWidth,
                height: attackHeight
            };
        }


        setTimeout(() => {
            this.isAttacking = false;
        }, 200);
    }
}

// Game variables
let player;
let computer;
let gameOver;

function computerAI() {
    if(gameOver) return;
    const distance = player.x - computer.x;

    // Movement
    if (distance > 150) {
        computer.dx = computer.speed;
    } else if (distance < 100) {
        computer.dx = -computer.speed;
    } else {
        computer.dx = 0;
    }

    // Attacking
    const now = Date.now();
    if (Math.abs(distance) < 120 && now - computer.lastAttack > computer.attackCooldown) {
        computer.lastAttack = now;
        const attackType = Math.random() < 0.5 ? 'punch' : 'kick';
        computer.attack(attackType);
    }

    // Blocking
    if (player.isAttacking && Math.abs(distance) < 150) {
        if(Math.random() < 0.5){
            computer.isBlocking = true;
        }
    } else {
        computer.isBlocking = false;
    }
}


function checkCollision(attacker, defender) {
    if (
        attacker.isAttacking &&
        attacker.attackBox.x < defender.x + defender.width &&
        attacker.attackBox.x + attacker.attackBox.width > defender.x &&
        attacker.attackBox.y < defender.y + defender.height &&
        attacker.attackBox.y + attacker.attackBox.height > defender.y
    ) {
        if (defender.isBlocking && defender.stamina > 0) {
            const damageReduction = defender.stamina / 100;
            const damage = 10 * (1 - damageReduction);
            defender.health -= damage;
        } else {
            defender.health -= 10;
        }
        attacker.isAttacking = false; // Prevent multiple hits per attack
    }
}

function drawUI() {
    // Player UI
    ctx.fillStyle = 'red';
    ctx.fillRect(20, 20, 300, 20);
    ctx.fillStyle = 'green';
    ctx.fillRect(20, 20, (player.health / 100) * 300, 20);

    ctx.fillStyle = 'grey';
    ctx.fillRect(20, 50, 200, 15);
    ctx.fillStyle = 'blue';
    ctx.fillRect(20, 50, (player.stamina / 100) * 200, 15);

    // Computer UI
    ctx.fillStyle = 'red';
    ctx.fillRect(480, 20, 300, 20);
    ctx.fillStyle = 'green';
    ctx.fillRect(480 + (300 - (computer.health / 100) * 300), 20, (computer.health / 100) * 300, 20);


    ctx.fillStyle = 'grey';
    ctx.fillRect(580, 50, 200, 15);
    ctx.fillStyle = 'blue';
    ctx.fillRect(580 + (200 - (computer.stamina / 100) * 200), 50, (computer.stamina / 100) * 200, 15);
}

function checkGameOver() {
    if (player.health <= 0) {
        player.health = 0;
        gameOver = true;
        ctx.fillStyle = 'black';
        ctx.font = '48px serif';
        ctx.fillText('Computer Wins!', canvas.width / 2 - 150, canvas.height / 2);
    } else if (computer.health <= 0) {
        computer.health = 0;
        gameOver = true;
        ctx.fillStyle = 'black';
        ctx.font = '48px serif';
        ctx.fillText('Player Wins!', canvas.width / 2 - 150, canvas.height / 2);
    }
}

function startGame() {
    player = new Character(100, 200, 50, 100, 'blue', true);
    computer = new Character(650, 200, 50, 100, 'red', false);
    gameOver = false;
    gameLoop();
}

// Game loop
function gameLoop() {
    if (gameOver) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw game objects
    player.update();
    computerAI();
    computer.update();
    player.draw();
    computer.draw();
    drawUI();

    // Check for attack collision
    checkCollision(player, computer);
    checkCollision(computer, player);

    // Check for game over
    checkGameOver();


    // Request the next frame
    requestAnimationFrame(gameLoop);
}

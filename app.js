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
        this.direction = isPlayer ? 'right' : 'left';
        this.isWalking = false;
        this.walkFrame = 0;
        this.attackFrame = 0;
        this.attackType = null;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.direction === 'left') {
            ctx.scale(-1, 1);
        }
        
        // draw the character centered at (0,0)
        // head
        ctx.beginPath();
        ctx.arc(0, -this.height/3, this.width / 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // body
        ctx.beginPath();
        ctx.moveTo(0, -this.height/6);
        ctx.lineTo(0, this.height * 0.2);
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.closePath();

        // arms
        let arm1X = -this.width/2;
        let arm2X = this.width/2;
        if(this.isAttacking && this.attackType === 'punch'){
            arm1X = this.width / 2;
            arm2X = this.width;
        }
        ctx.beginPath();
        ctx.moveTo(arm1X, 0);
        ctx.lineTo(arm2X, 0);
        ctx.stroke();
        ctx.closePath();

        // legs
        let leg1X = -this.width/4;
        let leg2X = this.width/4;
        if (this.isWalking && !this.isJumping) {
            leg1X = Math.sin(this.walkFrame * 0.5) * this.width/4;
            leg2X = Math.sin(this.walkFrame * 0.5 + Math.PI) * this.width/4;
        }
        if(this.isAttacking && this.attackType === 'kick'){
            leg1X = this.width/2;
            leg2X = this.width/4;
        }
        ctx.beginPath();
        ctx.moveTo(0, this.height * 0.2);
        ctx.lineTo(leg1X, this.height/2);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(0, this.height * 0.2);
        ctx.lineTo(leg2X, this.height/2);
        ctx.stroke();
        ctx.closePath();
        
        ctx.restore();
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
                this.direction = 'left';
                this.isWalking = true;
            } else if (keys['ArrowRight'] && !this.isBlocking) {
                this.dx = this.speed;
                this.direction = 'right';
                this.isWalking = true;
            } else {
                this.dx = 0;
                this.isWalking = false;
            }
        }

        if(this.isWalking){
            this.walkFrame++;
        } else {
            this.walkFrame = 0;
        }

        if (this.isAttacking) {
            this.attackFrame++;
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

        // Boundary checks
        if (this.x < 0) {
            this.x = 0;
        }
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
        }

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
        this.attackType = type;
        this.attackFrame = 0;
        const attackWidth = type === 'punch' ? 50 : 70;
        const attackHeight = type === 'punch' ? 20 : 30;
        const attackY = type === 'punch' ? this.y : this.y + this.height / 2;
        
        if(this.direction === 'right'){
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
            this.attackType = null;
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
        computer.direction = 'right';
        computer.isWalking = true;
    } else if (distance < -150) {
        computer.dx = -computer.speed;
        computer.direction = 'left';
        computer.isWalking = true;
    } else {
        computer.dx = 0;
        computer.isWalking = false;
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
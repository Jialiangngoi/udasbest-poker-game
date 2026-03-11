export interface Point {
    x: number;
    y: number;
}

export interface Snake {
    id: string;
    name: string;
    color: string;
    segments: Point[];
    direction: Point;
    nextDirection: Point;
    score: number;
    isDead: boolean;
}

export interface Food {
    position: Point;
    value: number;
    color: string;
}

const GRID_SIZE = 30; // 30x30 grid
const INITIAL_SNAKE_LENGTH = 4;

export class SnakeEngine {
    public snakes: Snake[] = [];
    public food: Food[] = [];
    public gridSize = GRID_SIZE;
    public isGameOver = false;

    private availableColors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f'];

    constructor() {
        this.reset();
    }

    reset() {
        this.snakes = [];
        this.food = [];
        this.isGameOver = false;
    }

    addPlayer(id: string, name: string) {
        if (this.snakes.some(s => s.id === id)) return;

        const color = this.availableColors[this.snakes.length % this.availableColors.length];

        // Spawn at random safe location
        let startX = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
        let startY = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;

        const segments = [];
        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            segments.push({ x: startX, y: startY + i });
        }

        this.snakes.push({
            id,
            name,
            color,
            segments,
            direction: { x: 0, y: -1 }, // moving up initially
            nextDirection: { x: 0, y: -1 },
            score: 0,
            isDead: false,
        });
    }

    respawnPlayer(id: string) {
        const snake = this.snakes.find(s => s.id === id);
        if (!snake || !snake.isDead) return;

        let startX = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
        let startY = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;

        const segments = [];
        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            segments.push({ x: startX, y: startY + i });
        }

        snake.segments = segments;
        snake.direction = { x: 0, y: -1 };
        snake.nextDirection = { x: 0, y: -1 };
        snake.score = 0;
        snake.isDead = false;

        if (this.isGameOver) this.isGameOver = false;
    }

    spawnFood() {
        // Basic logic: Try to find empty spot
        for (let attempts = 0; attempts < 50; attempts++) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);

            let isOccupied = false;
            for (const snake of this.snakes) {
                if (snake.segments.some(seg => seg.x === x && seg.y === y)) {
                    isOccupied = true;
                    break;
                }
            }

            if (!isOccupied) {
                this.food.push({
                    position: { x, y },
                    value: 10,
                    color: '#f39c12'
                });
                return;
            }
        }
    }

    changeDirection(id: string, newDir: Point) {
        const snake = this.snakes.find(s => s.id === id);
        if (!snake) return;

        if (snake.isDead) {
            this.respawnPlayer(id);
            snake.nextDirection = newDir;
            return;
        }

        // Prevent reversing directly
        if (snake.direction.x !== 0 && newDir.x === -snake.direction.x) return;
        if (snake.direction.y !== 0 && newDir.y === -snake.direction.y) return;

        snake.nextDirection = newDir;
    }

    update() {
        if (this.isGameOver) return;
        let anyAlive = false;

        // Move all snakes
        for (const snake of this.snakes) {
            if (snake.isDead) continue;
            anyAlive = true;

            snake.direction = snake.nextDirection;
            const head = snake.segments[0];
            const newHead = {
                x: head.x + snake.direction.x,
                y: head.y + snake.direction.y
            };

            // Wrap around grid (instead of dying on walls for more chaotic fun)
            if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
            if (newHead.x >= GRID_SIZE) newHead.x = 0;
            if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
            if (newHead.y >= GRID_SIZE) newHead.y = 0;

            snake.segments.unshift(newHead);

            // Check food collision
            const foodIndex = this.food.findIndex(f => f.position.x === newHead.x && f.position.y === newHead.y);
            if (foodIndex !== -1) {
                snake.score += this.food[foodIndex].value;
                this.food.splice(foodIndex, 1);
                this.spawnFood(); // keep growing
            } else {
                // didn't eat, remove tail
                snake.segments.pop();
            }
        }

        if (!anyAlive && this.snakes.length > 0) {
            this.isGameOver = true;
            return;
        }

        // Check snake-to-snake collisions (after everyone has moved)
        for (let i = 0; i < this.snakes.length; i++) {
            const snakeA = this.snakes[i];
            if (snakeA.isDead) continue;
            const head = snakeA.segments[0];

            for (let j = 0; j < this.snakes.length; j++) {
                const snakeB = this.snakes[j];
                if (snakeB.isDead) continue;

                // Check if A's head hit B's body (or its own body if j === i, skipping the head)
                const startIndex = (i === j) ? 1 : 0;
                for (let k = startIndex; k < snakeB.segments.length; k++) {
                    if (head.x === snakeB.segments[k].x && head.y === snakeB.segments[k].y) {
                        snakeA.isDead = true;
                        this.turnSnakeToFood(snakeA);
                        break;
                    }
                }
                if (snakeA.isDead) break;
            }
        }

        // Maintain food count
        while (this.food.length < Math.max(2, this.snakes.length)) {
            this.spawnFood();
        }
    }

    private turnSnakeToFood(snake: Snake) {
        // Every 3rd segment turns to food
        for (let i = 0; i < snake.segments.length; i += 3) {
            this.food.push({
                position: { x: snake.segments[i].x, y: snake.segments[i].y },
                value: 20,
                color: snake.color
            });
        }
    }
}

// BrowserCraft - Minecraft Clone
// Main Game Engine

class BlockTypes {
    static GRASS = 'grass';
    static DIRT = 'dirt';
    static STONE = 'stone';
    static WOOD = 'wood';
    static LEAVES = 'leaves';
    static COBBLESTONE = 'cobblestone';
    static BEDROCK = 'bedrock';
    static WATER = 'water';
    static SAND = 'sand';
    static OAK_LOG = 'oak_log';
}

class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    equals(v) {
        return this.x === v.x && this.y === v.y && this.z === v.z;
    }
}

// Perlin Noise implementation for terrain generation
class PerlinNoise {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.gradients = {};
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        // Convert low 4 bits of hash code into 12 gradient directions
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y, z) {
        // Find unit grid cell containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        // Get relative xyz coordinates of point within that cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        // Compute fade curves for x, y, z
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        // Hash coordinates of the 8 cube corners
        const A = this.permutation[X] + Y;
        const AA = this.permutation[A] + Z;
        const AB = this.permutation[A + 1] + Z;
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B] + Z;
        const BB = this.permutation[B + 1] + Z;

        // Add a seeded random component to gradients
        this.seedGradients();

        // Combine results
        const res = this.lerp(
            this.lerp(
                this.lerp(this.grad(this.permutation[AA], x, y, z), this.grad(this.permutation[BA], x - 1, y, z), u),
                this.lerp(this.grad(this.permutation[AB], x, y - 1, z), this.grad(this.permutation[BB], x - 1, y - 1, z), u),
                v
            ),
            this.lerp(
                this.lerp(this.grad(this.permutation[AA + 1], x, y, z - 1), this.grad(this.permutation[BA + 1], x - 1, y, z - 1), u),
                this.lerp(this.grad(this.permutation[AB + 1], x, y - 1, z - 1), this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1), u),
                v
            ),
            w
        );
        return (res + 1) / 2; // Normalize to 0-1
    }

    seedGradients() {
        if (!this.permutation) {
            // Create permutation table based on seed
            const p = [];
            for (let i = 0; i < 256; i++) {
                p[i] = Math.floor(Math.random() * 256);
            }
            
            // Double the permutation table to avoid overflow
            this.permutation = new Array(512);
            for (let i = 0; i < 512; i++) {
                this.permutation[i] = p[i % 256];
            }
        }
    }
}

// World Chunk System
class Chunk {
    constructor(world, x, z) {
        this.world = world;
        this.position = new Vector3(x, 0, z); // Only x,z for chunk position
        this.blocks = {}; // Dictionary of block positions to block types
        this.mesh = null; // Three.js mesh object
        this.isGenerated = false;
        this.size = 16; // 16x16 blocks per chunk
        this.height = 256; // Height of the world
    }

    getBlockKey(x, y, z) {
        return `${x},${y},${z}`;
    }

    getBlock(x, y, z) {
        const key = this.getBlockKey(x, y, z);
        return this.blocks[key] || null;
    }

    setBlock(x, y, z, type) {
        const key = this.getBlockKey(x, y, z);
        this.blocks[key] = type;
    }

    generateTerrain() {
        const perlin = new PerlinNoise();
        
        for (let x = 0; x < this.size; x++) {
            for (let z = 0; z < this.size; z++) {
                // Calculate world position
                const worldX = this.position.x * this.size + x;
                const worldZ = this.position.z * this.size + z;
                
                // Generate height using Perlin noise
                const height = Math.floor(60 + perlin.noise(worldX * 0.01, 0, worldZ * 0.01) * 20);
                
                // Set blocks based on height
                for (let y = 0; y < this.height; y++) {
                    if (y === 0) {
                        this.setBlock(x, y, z, BlockTypes.BEDROCK);
                    } else if (y <= height - 4) {
                        this.setBlock(x, y, z, BlockTypes.STONE);
                    } else if (y <= height - 1) {
                        this.setBlock(x, y, z, BlockTypes.DIRT);
                    } else if (y === height) {
                        this.setBlock(x, y, z, BlockTypes.GRASS);
                    }
                }
            }
        }
        
        this.isGenerated = true;
    }

    updateMesh() {
        if (!this.isGenerated) return;
        
        // Remove old mesh if it exists
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
        }

        // Create new geometry
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        // Define block colors
        const blockColors = {
            [BlockTypes.GRASS]: new THREE.Color(0.4, 0.8, 0.4),
            [BlockTypes.DIRT]: new THREE.Color(0.6, 0.4, 0.2),
            [BlockTypes.STONE]: new THREE.Color(0.5, 0.5, 0.5),
            [BlockTypes.WOOD]: new THREE.Color(0.6, 0.4, 0.2),
            [BlockTypes.LEAVES]: new THREE.Color(0.2, 0.6, 0.2),
            [BlockTypes.COBBLESTONE]: new THREE.Color(0.4, 0.4, 0.4),
            [BlockTypes.BEDROCK]: new THREE.Color(0.1, 0.1, 0.1),
            [BlockTypes.SAND]: new THREE.Color(0.9, 0.8, 0.5),
            [BlockTypes.OAK_LOG]: new THREE.Color(0.5, 0.3, 0.1)
        };

        // Generate vertices for visible blocks
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    const blockType = this.getBlock(x, y, z);
                    if (blockType) {
                        // Check if block is visible (not surrounded by other blocks)
                        if (this.isVisible(x, y, z)) {
                            this.addBlockGeometry(positions, colors, x, y, z, blockColors[blockType]);
                        }
                    }
                }
            }
        }

        if (positions.length > 0) {
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.computeVertexNormals();

            // Create material with vertex colors
            const material = new THREE.MeshLambertMaterial({ vertexColors: true });
            this.mesh = new THREE.Mesh(geometry, material);

            // Position the chunk in the world
            this.mesh.position.set(this.position.x * this.size, 0, this.position.z * this.size);
            this.world.scene.add(this.mesh);
        }
    }

    isVisible(x, y, z) {
        // Check if block has at least one exposed face
        const currentBlock = this.getBlock(x, y, z);
        if (!currentBlock) return false;

        // Check adjacent blocks
        const neighbors = [
            this.getBlock(x + 1, y, z),
            this.getBlock(x - 1, y, z),
            this.getBlock(x, y + 1, z),
            this.getBlock(x, y - 1, z),
            this.getBlock(x, y, z + 1),
            this.getBlock(x, y, z - 1)
        ];

        // If any neighbor is null (air), then this block is visible
        return neighbors.some(block => !block);
    }

    addBlockGeometry(positions, colors, x, y, z, color) {
        // Create a cube centered at (x, y, z)
        const size = 0.5; // half size of cube
        
        // Define vertices for a cube
        const vertices = [
            // Front face
            [x - size, y - size, z + size],
            [x + size, y - size, z + size],
            [x + size, y + size, z + size],
            [x - size, y + size, z + size],
            
            // Back face
            [x - size, y - size, z - size],
            [x + size, y - size, z - size],
            [x + size, y + size, z - size],
            [x - size, y + size, z - size]
        ];
        
        // Define indices for two triangles per face
        const faces = [
            // Front
            [0, 1, 2, 0, 2, 3],
            // Back
            [5, 4, 7, 7, 4, 6],
            // Top
            [3, 2, 6, 6, 2, 7],
            // Bottom
            [4, 0, 1, 4, 1, 5],
            // Right
            [1, 5, 6, 1, 6, 2],
            // Left
            [4, 3, 0, 4, 7, 3]
        ];
        
        // Add vertices and colors
        for (const face of faces) {
            for (const idx of face) {
                const vertex = vertices[idx];
                positions.push(...vertex);
                colors.push(color.r, color.g, color.b);
            }
        }
    }
}

// World Management
class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map(); // Key: "x,z" -> Chunk
        this.chunkSize = 16;
        this.renderDistance = 5; // Chunks to render around player
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    getChunk(x, z) {
        const key = this.getChunkKey(x, z);
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(this, x, z);
            this.chunks.set(key, chunk);
        }
        return this.chunks.get(key);
    }

    generateChunk(x, z) {
        const chunk = this.getChunk(x, z);
        if (!chunk.isGenerated) {
            chunk.generateTerrain();
            chunk.updateMesh();
        }
    }

    loadChunksAround(playerPosition) {
        const chunkX = Math.floor(playerPosition.x / this.chunkSize);
        const chunkZ = Math.floor(playerPosition.z / this.chunkSize);

        // Load chunks in a square around the player
        for (let x = chunkX - this.renderDistance; x <= chunkX + this.renderDistance; x++) {
            for (let z = chunkZ - this.renderDistance; z <= chunkZ + this.renderDistance; z++) {
                this.generateChunk(x, z);
            }
        }
    }

    getBlockAt(worldX, worldY, worldZ) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkZ = Math.floor(worldZ / this.chunkSize);
        const localX = Math.floor((worldX % this.chunkSize + this.chunkSize) % this.chunkSize);
        const localZ = Math.floor((worldZ % this.chunkSize + this.chunkSize) % this.chunkSize);

        const chunk = this.getChunk(chunkX, chunkZ);
        return chunk.getBlock(localX, worldY, localZ);
    }

    setBlockAt(worldX, worldY, worldZ, type) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkZ = Math.floor(worldZ / this.chunkSize);
        const localX = Math.floor((worldX % this.chunkSize + this.chunkSize) % this.chunkSize);
        const localZ = Math.floor((worldZ % this.chunkSize + this.chunkSize) % this.chunkSize);

        const chunk = this.getChunk(chunkX, chunkZ);
        chunk.setBlock(localX, worldY, localZ, type);
        chunk.updateMesh(); // Update the visual representation
    }
}

// Player Class
class Player {
    constructor(camera) {
        this.camera = camera;
        this.position = new Vector3(0, 80, 0); // Start above ground
        this.velocity = new Vector3();
        this.rotation = new Vector3(); // Pitch, Yaw, Roll
        this.onGround = false;
        this.speed = 0.2;
        this.jumpStrength = 0.3;
        this.gravity = 0.03;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.sprinting = false;
        this.canJump = true;
    }

    update(world, deltaTime) {
        // Apply gravity
        this.velocity.y -= this.gravity;

        // Handle movement inputs
        let moveX = 0;
        let moveZ = 0;

        if (this.moveForward) moveZ -= 1;
        if (this.moveBackward) moveZ += 1;
        if (this.moveLeft) moveX -= 1;
        if (this.moveRight) moveX += 1;

        // Normalize diagonal movement
        if (moveX !== 0 && moveZ !== 0) {
            moveX *= 0.7071; // 1/sqrt(2)
            moveZ *= 0.7071;
        }

        // Apply movement direction based on camera rotation
        const angle = this.rotation.y;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const actualMoveX = moveX * cos - moveZ * sin;
        const actualMoveZ = moveX * sin + moveZ * cos;

        // Apply speed modifier for sprinting
        const speed = this.sprinting ? this.speed * 1.5 : this.speed;

        this.velocity.x = actualMoveX * speed;
        this.velocity.z = actualMoveZ * speed;

        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.position.z += this.velocity.z;

        // Simple collision detection with ground
        const blockBelow = world.getBlockAt(
            Math.floor(this.position.x),
            Math.floor(this.position.y - 1.8), // Player height
            Math.floor(this.position.z)
        );

        if (blockBelow) {
            // Player is on ground
            this.position.y = Math.floor(this.position.y - 1.8) + 1.8;
            this.velocity.y = 0;
            this.onGround = true;
            this.canJump = true;
        } else {
            this.onGround = false;
        }

        // Prevent falling through the world
        if (this.position.y < 1) {
            this.position.y = 1;
            this.velocity.y = 0;
            this.onGround = true;
            this.canJump = true;
        }

        // Update camera position
        this.camera.position.set(this.position.x, this.position.y, this.position.z);
    }

    jump() {
        if (this.onGround && this.canJump) {
            this.velocity.y = this.jumpStrength;
            this.onGround = false;
            this.canJump = false;
        }
    }
}

// Block Texture Generator
class TextureGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 256;
        this.canvas.height = 256;
        this.ctx = this.canvas.getContext('2d');
    }

    generateTexture(description) {
        // Clear canvas
        this.ctx.clearRect(0, 0, 256, 256);
        
        switch(description.toLowerCase()) {
            case 'grass':
                this.generateGrassTexture();
                break;
            case 'dirt':
                this.generateDirtTexture();
                break;
            case 'stone':
                this.generateStoneTexture();
                break;
            case 'wood':
                this.generateWoodTexture();
                break;
            case 'leaves':
                this.generateLeavesTexture();
                break;
            case 'water':
                this.generateWaterTexture();
                break;
            case 'sand':
                this.generateSandTexture();
                break;
            case 'oak_log':
                this.generateOakLogTexture();
                break;
            default:
                this.generateDefaultTexture();
                break;
        }
        
        return this.canvas.toDataURL();
    }

    generateGrassTexture() {
        // Base green color
        this.ctx.fillStyle = '#7CB342';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Add some variation
        for (let i = 0; i < 200; i++) {
            const x = Math.floor(Math.random() * 256);
            const y = Math.floor(Math.random() * 256);
            const size = Math.random() * 3 + 1;
            
            const r = 100 + Math.floor(Math.random() * 30);
            const g = 150 + Math.floor(Math.random() * 50);
            const b = 50 + Math.floor(Math.random() * 30);
            
            this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Add dirt-like bottom
        this.ctx.fillStyle = '#8D6E63';
        this.ctx.fillRect(0, 200, 256, 56);
    }

    generateDirtTexture() {
        // Base dirt color
        this.ctx.fillStyle = '#795548';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Add some variation
        for (let i = 0; i < 300; i++) {
            const x = Math.floor(Math.random() * 256);
            const y = Math.floor(Math.random() * 256);
            const size = Math.random() * 2 + 1;
            
            const r = 100 + Math.floor(Math.random() * 40);
            const g = 70 + Math.floor(Math.random() * 30);
            const b = 40 + Math.floor(Math.random() * 20);
            
            this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    generateStoneTexture() {
        // Base stone color
        this.ctx.fillStyle = '#757575';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Add some variation and speckles
        for (let i = 0; i < 500; i++) {
            const x = Math.floor(Math.random() * 256);
            const y = Math.floor(Math.random() * 256);
            const size = Math.random() * 2 + 0.5;
            
            const variation = Math.floor(Math.random() * 40) - 20;
            const baseColor = 100 + variation;
            
            this.ctx.fillStyle = `rgb(${baseColor}, ${baseColor}, ${baseColor})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    generateWoodTexture() {
        // Base wood color
        this.ctx.fillStyle = '#8D6E63';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Draw wood grain lines
        this.ctx.strokeStyle = '#5D4037';
        this.ctx.lineWidth = 2;
        
        for (let y = 0; y < 256; y += 8) {
            // Randomly vary the line position for natural look
            const offset = Math.floor(Math.random() * 4) - 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y + offset);
            this.ctx.lineTo(256, y + offset + Math.floor(Math.random() * 4) - 2);
            this.ctx.stroke();
        }
    }

    generateLeavesTexture() {
        // Base green color
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Add transparency effect
        this.ctx.globalAlpha = 0.8;
        
        // Add some darker spots
        for (let i = 0; i < 100; i++) {
            const x = Math.floor(Math.random() * 256);
            const y = Math.floor(Math.random() * 256);
            const size = Math.random() * 10 + 5;
            
            const r = 50 + Math.floor(Math.random() * 30);
            const g = 100 + Math.floor(Math.random() * 50);
            const b = 40 + Math.floor(Math.random() * 20);
            
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    generateWaterTexture() {
        // Base blue color
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Add wave effects
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#0D47A1';
        
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * 256);
            const y = Math.floor(Math.random() * 256);
            const size = Math.random() * 20 + 10;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    generateSandTexture() {
        // Base sand color
        this.ctx.fillStyle = '#FFECB3';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Add some variation
        for (let i = 0; i < 500; i++) {
            const x = Math.floor(Math.random() * 256);
            const y = Math.floor(Math.random() * 256);
            const size = Math.random() * 2 + 0.5;
            
            const r = 240 + Math.floor(Math.random() * 15);
            const g = 220 + Math.floor(Math.random() * 20);
            const b = 150 + Math.floor(Math.random() * 30);
            
            this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    generateOakLogTexture() {
        // Base log color
        this.ctx.fillStyle = '#5D4037';
        this.ctx.fillRect(0, 0, 256, 256);
        
        // Draw horizontal rings
        this.ctx.strokeStyle = '#4E342E';
        this.ctx.lineWidth = 3;
        
        for (let y = 0; y < 256; y += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(256, y);
            this.ctx.stroke();
        }
        
        // Add some knots
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * 256);
            const y = Math.floor(Math.random() * 256);
            const size = Math.random() * 15 + 5;
            
            this.ctx.fillStyle = '#3E2723';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    generateDefaultTexture() {
        // Solid color texture
        this.ctx.fillStyle = '#FF00FF'; // Magenta as default
        this.ctx.fillRect(0, 0, 256, 256);
    }
}

// Main Game Class
class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.player = null;
        this.clock = new THREE.Clock();
        this.keys = {};
        
        // UI elements
        this.fpsCounter = document.getElementById('fpsCounter');
        this.positionDisplay = document.getElementById('positionDisplay');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.progressFill = document.getElementById('progressFill');
        
        // Initialize the game
        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x606060, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0.5).normalize();
        this.scene.add(directionalLight);
        
        // Create world
        this.world = new World(this.scene);
        
        // Create player
        this.player = new Player(this.camera);
        this.camera.position.set(this.player.position.x, this.player.position.y, this.player.position.z);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Show loading screen initially
        setTimeout(() => {
            this.hideLoadingScreen();
        }, 1000);
        
        // Start game loop
        this.animate();
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            switch(event.code) {
                case 'KeyW':
                    this.player.moveForward = true;
                    break;
                case 'KeyS':
                    this.player.moveBackward = true;
                    break;
                case 'KeyA':
                    this.player.moveLeft = true;
                    break;
                case 'KeyD':
                    this.player.moveRight = true;
                    break;
                case 'ShiftLeft':
                    this.player.sprinting = true;
                    break;
                case 'Space':
                    event.preventDefault(); // Prevent page scrolling
                    this.player.jump();
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            
            switch(event.code) {
                case 'KeyW':
                    this.player.moveForward = false;
                    break;
                case 'KeyS':
                    this.player.moveBackward = false;
                    break;
                case 'KeyA':
                    this.player.moveLeft = false;
                    break;
                case 'KeyD':
                    this.player.moveRight = false;
                    break;
                case 'ShiftLeft':
                    this.player.sprinting = false;
                    break;
            }
        });

        // Mouse movement for looking around
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                this.player.rotation.y -= event.movementX * 0.002;
                this.player.rotation.x -= event.movementY * 0.002;
                
                // Limit vertical rotation
                this.player.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.player.rotation.x));
                
                // Update camera orientation
                this.camera.rotation.set(this.player.rotation.x, this.player.rotation.y, 0);
            }
        });

        // Click to lock pointer (for mouse look)
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        // Window resize handling
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    hideLoadingScreen() {
        this.loadingScreen.style.display = 'none';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // Update FPS counter
        if (this.fpsCounter) {
            this.fpsCounter.textContent = Math.round(1 / deltaTime).toString();
        }
        
        // Update player position
        this.player.update(this.world, deltaTime);
        
        // Update position display
        if (this.positionDisplay) {
            this.positionDisplay.textContent = 
                `${Math.floor(this.player.position.x)}, ${Math.floor(this.player.position.y)}, ${Math.floor(this.player.position.z)}`;
        }
        
        // Load chunks around player
        this.world.loadChunksAround(this.player.position);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    const game = new Game();
    
    // Expose game to global scope for debugging
    window.game = game;
});
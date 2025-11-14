document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURAÇÃO BÁSICA DO MATTER.JS ---
    const { Engine, Render, World, Bodies, Composite, Events, Mouse, MouseConstraint } = Matter;

    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const BALL_RADIUS = 5;
    const PEG_RADIUS = 3;
    const DEFAULT_BALL_COLOR = '#ffffff';
    
    const COLOR_PALETTE = ['#f06292', '#4fc3f7', '#aed581', '#ffd54f', DEFAULT_BALL_COLOR];

    // Referências aos elementos do HTML
    const container = document.getElementById('canvas-container');
    const levelsSlider = document.getElementById('levels');
    const ballsSlider = document.getElementById('balls');
    const startButton = document.getElementById('start-button');
    const levelsValue = document.getElementById('levels-value');
    const ballsValue = document.getElementById('balls-value');

    levelsSlider.oninput = () => { levelsValue.textContent = levelsSlider.value; };
    ballsSlider.oninput = () => { ballsValue.textContent = ballsSlider.value; };

    // --- 2. INICIALIZAÇÃO DO MUNDO E RENDERIZAÇÃO ---
    const engine = Engine.create();
    const world = engine.world;

    const render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            wireframes: false, 
            background: '#2c3e50'
        }
    });

    Engine.run(engine);
    Render.run(render);

    // --- 3. IMPLEMENTAÇÃO DO RECURSO DE CLIQUE (MUDAR COR) ---
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: {
                visible: false 
            }
        }
    });
    World.add(world, mouseConstraint);

    Events.on(mouseConstraint, 'mousedown', (event) => {
        const mousePosition = event.mouse.position;
        const bodies = Composite.allBodies(world);
        const clickedBody = bodies.find(body => 
            body.label === 'ball' && 
            Matter.Bounds.contains(body.bounds, mousePosition) &&
            Matter.Vector.magnitude(Matter.Vector.sub(body.position, mousePosition)) < body.circleRadius
        );

        if (clickedBody) {
            const currentIndex = parseInt(clickedBody.colorIndex, 10);
            const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
            const nextColor = COLOR_PALETTE[nextIndex];
            
            clickedBody.render.fillStyle = nextColor;
            clickedBody.colorIndex = nextIndex;
        }
    });


    // --- 4. FUNÇÃO PRINCIPAL DA SIMULAÇÃO ---
    startButton.onclick = () => {
        World.clear(world);

        const numLevels = parseInt(levelsSlider.value);
        const numBalls = parseInt(ballsSlider.value);
        const numBins = numLevels + 1;

        // --- CORREÇÃO BUG 2 e 3: CÁLCULO DE ESPAÇAMENTO HÍBRIDO ---
        const totalHorizontalSpace = CANVAS_WIDTH * 0.9; // 90% da largura
        const totalVerticalSpace = CANVAS_HEIGHT * 0.6; // 60% da altura
        
        // Calcula o espaçamento ideal
        let pegHorizontalSpacing = totalHorizontalSpace / numBins;
        
        // Define um espaçamento MÁXIMO para garantir a aleatoriedade (física)
        const maxPegSpacing = BALL_RADIUS * 8; // 5px * 8 = 40px
        
        if (pegHorizontalSpacing > maxPegSpacing) {
            pegHorizontalSpacing = maxPegSpacing;
        }
        
        // A largura da canaleta será a mesma do espaçamento dos pinos
        const binWidth = pegHorizontalSpacing;
        
        // O espaçamento vertical pode ser sempre dinâmico
        const pegVerticalSpacing = totalVerticalSpace / numLevels;

        // Passa os valores calculados para as funções de criação
        createBoundaries(); // O funil agora é fixo
        createPegs(numLevels, pegHorizontalSpacing, pegVerticalSpacing);
        createBins(numLevels, binWidth, pegVerticalSpacing);
        addBalls(numBalls);
    };

    // --- 5. FUNÇÕES DE CRIAÇÃO DE OBJETOS ---

    function createBoundaries() {
        
        // --- CORREÇÃO BUG 1: FUNIL COM VÃO FIXO ---
        const funnelGap = 30; // Vão fixo de 30px
        const funnelWallLength = 250;
        const funnelY = 80;
        const funnelAngle = 0.2; // 0.2 radianos

        // Calcula a posição do centro da rampa esquerda
        const leftWallX = (CANVAS_WIDTH / 2) - (funnelGap / 2) - (funnelWallLength / 2 * Math.cos(funnelAngle));
        const leftWallY = funnelY + (funnelWallLength / 2 * Math.sin(funnelAngle));

        const funnelLeft = Bodies.rectangle(leftWallX, leftWallY, funnelWallLength, 10, { 
            isStatic: true, 
            angle: funnelAngle, 
            render: { fillStyle: '#95a5a6' } 
        });

        // Calcula a posição do centro da rampa direita
        const rightWallX = (CANVAS_WIDTH / 2) + (funnelGap / 2) + (funnelWallLength / 2 * Math.cos(funnelAngle));
        const rightWallY = funnelY + (funnelWallLength / 2 * Math.sin(funnelAngle));

        const funnelRight = Bodies.rectangle(rightWallX, rightWallY, funnelWallLength, 10, { 
            isStatic: true, 
            angle: -funnelAngle, 
            render: { fillStyle: '#95a5a6' } 
        });

        // Paredes laterais e chão (sem alteração)
        const wallLeft = Bodies.rectangle(0, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        const wallRight = Bodies.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        const ground = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 5, CANVAS_WIDTH, 10, { isStatic: true, render: { visible: false } }); // Um pouco mais para baixo

        World.add(world, [funnelLeft, funnelRight, wallLeft, wallRight, ground]);
    }

    // A função agora recebe os espaçamentos calculados
    function createPegs(levels, horizontalSpacing, verticalSpacing) {
        const pegs = [];
        const startY = 130; 

        for (let row = 0; row < levels; row++) {
            const numPegsInRow = row + 1;
            // A largura total da *linha* de pinos
            const rowWidth = (numPegsInRow - 1) * horizontalSpacing;
            // Centraliza a linha
            const startX = (CANVAS_WIDTH - rowWidth) / 2;

            for (let i = 0; i < numPegsInRow; i++) {
                const x = startX + i * horizontalSpacing;
                const y = startY + row * verticalSpacing;
                
                const peg = Bodies.circle(x, y, PEG_RADIUS, {
                    isStatic: true, 
                    restitution: 0.5, 
                    friction: 0.1,
                    render: { fillStyle: '#95a5a6' }
                });
                pegs.push(peg);
            }
        }
        World.add(world, pegs);
    }

    // A função agora recebe a largura da canaleta e o espaçamento vertical
    function createBins(levels, binWidth, pegVerticalSpacing) {
        const bins = [];
        const numBins = levels + 1;
        const binHeight = CANVAS_HEIGHT * 0.2; // 20% da altura
        
        // Posição Y inicial das canaletas
        const startY = 130 + (levels * pegVerticalSpacing) + (binHeight / 2);
        
        // --- CORREÇÃO BUG 3: Centraliza o *bloco* de canaletas ---
        const totalBinsWidth = numBins * binWidth;
        const startX = (CANVAS_WIDTH - totalBinsWidth) / 2;

        // Cria as (numBins + 1) paredes verticais
        for (let i = 0; i < numBins + 1; i++) {
            const x = startX + i * binWidth;
            const binWall = Bodies.rectangle(x, startY, 4, binHeight, {
                isStatic: true,
                render: { fillStyle: '#ecf0f1' }
            });
            bins.push(binWall);
        }
        
        // Chão das canaletas
        const floorWidth = totalBinsWidth;
        const floorX = startX + (floorWidth / 2); // Centro do bloco
        const floorY = startY + (binHeight / 2) - 2; 
        
        const binFloor = Bodies.rectangle(floorX, floorY, floorWidth, 4, {
            isStatic: true,
            render: { fillStyle: '#ecf0f1' }
        });
        bins.push(binFloor);

        World.add(world, bins);
    }

    function addBalls(count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                // Cai de um ponto um pouco mais alto, dentro do vão
                const x = CANVAS_WIDTH / 2 + Math.random() * 10 - 5;
                const y = 40; // Posição Y inicial mais alta
                
                const initialColorIndex = 4; // Branco

                const ball = Bodies.circle(x, y, BALL_RADIUS, {
                    label: 'ball',
                    colorIndex: initialColorIndex,
                    restitution: 0.6,
                    friction: 0.1,
                    frictionStatic: 0.1, 
                    frictionAir: 0.01,
                    density: 0.005,
                    render: {
                        fillStyle: COLOR_PALETTE[initialColorIndex],
                        strokeStyle: '#000000', // Contorno preto
                        lineWidth: 1
                    }
                });
                World.add(world, ball);
            }, i * 50); 
        }
    }

    // Inicia a simulação pela primeira vez
    startButton.click();
});

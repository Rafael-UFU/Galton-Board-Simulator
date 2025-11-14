// Aguarda o carregamento do DOM antes de executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURAÇÃO BÁSICA DO MATTER.JS ---

    // Atalhos para os módulos do Matter.js
    const { Engine, Render, World, Bodies, Composite, Events, Mouse, MouseConstraint } = Matter;

    // Constantes de configuração
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const BALL_RADIUS = 5;
    const PEG_RADIUS = 4;
    const DEFAULT_BALL_COLOR = '#ffffff';
    
    // Paleta de cores para rastreamento
    const COLOR_PALETTE = ['#f06292', '#4fc3f7', '#aed581', '#ffd54f', DEFAULT_BALL_COLOR];

    // Referências aos elementos do HTML
    const container = document.getElementById('canvas-container');
    const levelsSlider = document.getElementById('levels');
    const ballsSlider = document.getElementById('balls');
    const startButton = document.getElementById('start-button');
    const levelsValue = document.getElementById('levels-value');
    const ballsValue = document.getElementById('balls-value');

    // Atualiza os mostradores dos sliders
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

    // --- CORREÇÃO BUG 2: LÓGICA DE MUDANÇA DE COR ---
    Events.on(mouseConstraint, 'mousedown', (event) => {
        const mousePosition = event.mouse.position;
        const bodies = Composite.allBodies(world);
        const clickedBody = bodies.find(body => 
            body.label === 'ball' && 
            Matter.Bounds.contains(body.bounds, mousePosition) &&
            Matter.Vector.magnitude(Matter.Vector.sub(body.position, mousePosition)) < body.circleRadius
        );

        if (clickedBody) {
            // Em vez de ler a cor, lemos o índice que armazenamos
            const currentIndex = clickedBody.colorIndex;
            
            // A lógica de ciclo agora funciona
            const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
            const nextColor = COLOR_PALETTE[nextIndex];
            
            // Aplica a nova cor
            clickedBody.render.fillStyle = nextColor;
            clickedBody.render.strokeStyle = nextColor;
            
            // Armazena o *novo* índice de volta no objeto
            clickedBody.colorIndex = nextIndex;
        }
    });


    // --- 4. FUNÇÃO PRINCIPAL DA SIMULAÇÃO ---

    startButton.onclick = () => {
        World.clear(world);

        const numLevels = parseInt(levelsSlider.value);
        const numBalls = parseInt(ballsSlider.value);

        createPegs(numLevels);
        createBoundaries();
        createBins(numLevels);
        addBalls(numBalls);
    };

    // --- 5. FUNÇÕES DE CRIAÇÃO DE OBJETOS ---

    function createBoundaries() {
        // --- CORREÇÃO BUG 3: AJUSTE DO FUNIL ---
        // Posição Y mais alta (80), barras mais curtas (250), e centros mais afastados (130)
        // Ângulo menor (0.2 rad) para ser mais suave
        const funnelLeft = Bodies.rectangle(CANVAS_WIDTH / 2 - 130, 80, 250, 10, { 
            isStatic: true, 
            angle: 0.2, // Ângulo mais suave
            render: { fillStyle: '#95a5a6' } 
        });
        const funnelRight = Bodies.rectangle(CANVAS_WIDTH / 2 + 130, 80, 250, 10, { 
            isStatic: true, 
            angle: -0.2, // Ângulo oposto
            render: { fillStyle: '#95a5a6' } 
        });

        const wallLeft = Bodies.rectangle(0, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        const wallRight = Bodies.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        const ground = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT, CANVAS_WIDTH, 10, { isStatic: true, render: { visible: false } });

        World.add(world, [funnelLeft, funnelRight, wallLeft, wallRight, ground]);
    }

    function createPegs(levels) {
        const pegs = [];
        const horizontalSpacing = 40;
        const verticalSpacing = 30;
        const startY = 150;
        
        for (let row = 0; row < levels; row++) {
            const numPegsInRow = row + 1;
            const rowWidth = numPegsInRow * horizontalSpacing;
            const startX = (CANVAS_WIDTH - rowWidth) / 2 + (horizontalSpacing/2); 

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

    function createBins(levels) {
        const bins = [];
        const numBins = levels + 1;
        const binWidth = 35; 
        const binHeight = 100;
        const startY = 150 + levels * 30 + (binHeight / 2) - 10;
        const startX = (CANVAS_WIDTH - (numBins * binWidth)) / 2 + (binWidth / 2);

        for (let i = 0; i < numBins + 1; i++) {
            const x = (startX - (binWidth/2)) + i * binWidth;
            const binWall = Bodies.rectangle(x, startY, 4, binHeight, {
                isStatic: true,
                render: { fillStyle: '#ecf0f1' }
            });
            bins.push(binWall);
        }
        World.add(world, bins);
    }

    function addBalls(count) {
        const balls = [];
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const x = CANVAS_WIDTH / 2 + Math.random() * 20 - 10;
                
                // --- CORREÇÃO BUG 2 (Continuação): Definir o índice de cor inicial ---
                // O índice 4 corresponde a DEFAULT_BALL_COLOR na nossa paleta
                const initialColorIndex = 4;

                const ball = Bodies.circle(x, 20, BALL_RADIUS, {
                    label: 'ball',
                    colorIndex: initialColorIndex, // Armazena o índice aqui
                    
                    // --- CORREÇÃO BUG 1: Ajuste de física das bolinhas ---
                    restitution: 0.6,    // Um pouco menos saltitante
                    friction: 0.1,       // Mais atrito
                    frictionStatic: 0.5, // Atrito para parar de deslizar
                    frictionAir: 0.01,   // Resistência do ar leve
                    density: 0.005,      // Mais denso/pesado
                    
                    render: {
                        fillStyle: COLOR_PALETTE[initialColorIndex],
                        strokeStyle: COLOR_PALETTE[initialColorIndex],
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

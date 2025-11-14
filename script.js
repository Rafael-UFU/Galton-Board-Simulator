document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURAÇÃO BÁSICA DO MATTER.JS ---
    const { Engine, Render, World, Bodies, Composite, Events, Mouse, MouseConstraint } = Matter;

    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const BALL_RADIUS = 5;
    
    // Deixando o raio do pino um pouco menor
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

    // --- CORREÇÃO BUG 2: LÓGICA DE MUDANÇA DE COR ---
    // O problema era que a cor não estava sendo lida como um número.
    // Usar parseInt() força o índice a ser um número, corrigindo o ciclo.
    Events.on(mouseConstraint, 'mousedown', (event) => {
        const mousePosition = event.mouse.position;
        const bodies = Composite.allBodies(world);
        const clickedBody = bodies.find(body => 
            body.label === 'ball' && 
            Matter.Bounds.contains(body.bounds, mousePosition) &&
            Matter.Vector.magnitude(Matter.Vector.sub(body.position, mousePosition)) < body.circleRadius
        );

        if (clickedBody) {
            // FORÇA a leitura do índice como um número inteiro.
            const currentIndex = parseInt(clickedBody.colorIndex, 10);
            
            const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
            const nextColor = COLOR_PALETTE[nextIndex];
            
            // --- CORREÇÃO BUG 5 (PARTE 1): Mudar apenas o preenchimento ---
            // O 'strokeStyle' (contorno) permanecerá preto.
            clickedBody.render.fillStyle = nextColor;
            
            clickedBody.colorIndex = nextIndex;
        }
    });


    // --- 4. FUNÇÃO PRINCIPAL DA SIMULAÇÃO ---
    startButton.onclick = () => {
        World.clear(world);

        const numLevels = parseInt(levelsSlider.value);
        const numBalls = parseInt(ballsSlider.value);

        // Passa o número de níveis para as funções de criação
        createBoundaries(numLevels);
        createPegs(numLevels);
        createBins(numLevels);
        addBalls(numBalls);
    };

    // --- 5. FUNÇÕES DE CRIAÇÃO DE OBJETOS ---

    function createBoundaries(levels) {
        
        // --- CORREÇÃO BUG 3 e 4 (PARTE 1): Layout Dinâmico ---
        // O espaçamento horizontal total agora é baseado no número de níveis.
        // Isso garante que os pinos e canaletas sempre usem o espaço disponível.
        const numBins = levels + 1;
        const totalHorizontalSpace = CANVAS_WIDTH * 0.9; // Usa 90% da largura
        const horizontalSpacing = totalHorizontalSpace / numBins;

        // --- CORREÇÃO BUG 1: EVITAR ENTUPIMENTO ---
        // Alarga o funil e diminui o atrito estático (veja addBalls)
        // O vão do funil agora é 3x o espaçamento horizontal, garantindo a passagem
        const funnelGap = horizontalSpacing * 3;
        const funnelWallLength = CANVAS_WIDTH * 0.3; // Comprimento da parede
        const funnelY = 80;
        
        const funnelLeft = Bodies.rectangle(
            (CANVAS_WIDTH / 2) - (funnelGap / 2) - (funnelWallLength / 2 * 0.866), // Posição X
            funnelY, // Posição Y
            funnelWallLength, // Largura (comprimento)
            10, // Altura (espessura)
            { 
                isStatic: true, 
                angle: 0.2, // Ângulo de 0.2 rad
                render: { fillStyle: '#95a5a6' } 
            }
        );
        const funnelRight = Bodies.rectangle(
            (CANVAS_WIDTH / 2) + (funnelGap / 2) + (funnelWallLength / 2 * 0.866),
            funnelY, 
            funnelWallLength, 
            10, 
            { 
                isStatic: true, 
                angle: -0.2, 
                render: { fillStyle: '#95a5a6' } 
            }
        );

        // Paredes laterais e chão
        const wallLeft = Bodies.rectangle(0, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        const wallRight = Bodies.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        const ground = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT, CANVAS_WIDTH, 10, { isStatic: true, render: { visible: false } });

        World.add(world, [funnelLeft, funnelRight, wallLeft, wallRight, ground]);
    }

    function createPegs(levels) {
        const pegs = [];
        
        // --- CORREÇÃO BUG 3 (PARTE 2): Layout Dinâmico ---
        // O espaçamento vertical e horizontal é calculado para caber na tela.
        const numBins = levels + 1;
        const totalHorizontalSpace = CANVAS_WIDTH * 0.9; // 90% da largura
        const horizontalSpacing = totalHorizontalSpace / numBins;

        const totalVerticalSpace = CANVAS_HEIGHT * 0.6; // 60% da altura
        const verticalSpacing = totalVerticalSpace / levels;
        
        const startY = 130; // Começa um pouco mais para cima

        for (let row = 0; row < levels; row++) {
            const numPegsInRow = row + 1;
            const rowWidth = numPegsInRow * horizontalSpacing;
            // Centraliza a fileira de pinos
            const startX = (CANVAS_WIDTH - rowWidth) / 2 + (horizontalSpacing / 2);

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
        
        // --- CORREÇÃO BUG 3 e 4 (PARTE 2): Layout Dinâmico ---
        const numBins = levels + 1;
        const totalHorizontalSpace = CANVAS_WIDTH * 0.9;
        const binWidth = totalHorizontalSpace / numBins;
        
        // O espaçamento vertical dos pinos
        const totalVerticalSpace = CANVAS_HEIGHT * 0.6;
        const verticalSpacing = totalVerticalSpace / levels;
        
        // Altura da canaleta
        const binHeight = CANVAS_HEIGHT * 0.2; // 20% da altura
        
        // Posição Y inicial das canaletas
        const startY = 130 + (levels * verticalSpacing) + (binHeight / 2);
        // Posição X inicial das canaletas
        const startX = (CANVAS_WIDTH - totalHorizontalSpace) / 2;

        // Cria as (numBins + 1) paredes verticais
        for (let i = 0; i < numBins + 1; i++) {
            const x = startX + i * binWidth;
            const binWall = Bodies.rectangle(x, startY, 4, binHeight, {
                isStatic: true,
                render: { fillStyle: '#ecf0f1' }
            });
            bins.push(binWall);
        }
        
        // --- CORREÇÃO BUG 4: ADICIONA O CHÃO DAS CANALETAS ---
        const floorWidth = totalHorizontalSpace;
        const floorX = startX + (floorWidth / 2); // Centro do bloco de canaletas
        const floorY = startY + (binHeight / 2) - 2; // Posição no fundo (com 4px de espessura)
        
        const binFloor = Bodies.rectangle(floorX, floorY, floorWidth, 4, {
            isStatic: true,
            render: { fillStyle: '#ecf0f1' }
        });
        bins.push(binFloor); // Adiciona o chão

        World.add(world, bins);
    }

    function addBalls(count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const x = CANVAS_WIDTH / 2 + Math.random() * 20 - 10;
                
                const initialColorIndex = 4; // Índice do DEFAULT_BALL_COLOR (branco)

                const ball = Bodies.circle(x, 20, BALL_RADIUS, {
                    label: 'ball',
                    colorIndex: initialColorIndex,
                    
                    restitution: 0.6,
                    friction: 0.1,
                    
                    // --- CORREÇÃO BUG 1: Reduz atrito estático para evitar entupimento ---
                    frictionStatic: 0.1, // Era 0.5, agora é 0.1 (menos "pegajoso")
                    
                    frictionAir: 0.01,
                    density: 0.005,
                    
                    // --- CORREÇÃO BUG 5 (PARTE 2): Adiciona contorno preto ---
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

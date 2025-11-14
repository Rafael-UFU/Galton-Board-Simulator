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
    
    // Paleta de cores para rastreamento (implementando seu pedido)
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

    // Cria o motor de física
    const engine = Engine.create();
    const world = engine.world;

    // Cria o renderizador (o canvas)
    const render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            wireframes: false, // Queremos bolinhas coloridas, não aramadas
            background: '#2c3e50'
        }
    });

    // Roda o motor e o renderizador
    Engine.run(engine);
    Render.run(render);

    // --- 3. IMPLEMENTAÇÃO DO RECURSO DE CLIQUE (MUDAR COR) ---

    // Adiciona controle do mouse
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: {
                visible: false // Não queremos ver a "linha" que o mouse "puxa"
            }
        }
    });
    World.add(world, mouseConstraint);

    // Adiciona o listener de clique!
    Events.on(mouseConstraint, 'mousedown', (event) => {
        const mousePosition = event.mouse.position;
        // Encontra todos os corpos (bolinhas) na posição do clique
        const bodies = Composite.allBodies(world);
        const clickedBody = bodies.find(body => 
            body.label === 'ball' && // Verifica se é uma bolinha
            Matter.Bounds.contains(body.bounds, mousePosition) && // Verifica se o clique está dentro dos limites da bolinha
            Matter.Vector.magnitude(Matter.Vector.sub(body.position, mousePosition)) < body.circleRadius // Checagem mais precisa de raio
        );

        if (clickedBody) {
            // Pega a cor atual da bolinha
            const currentColor = clickedBody.render.fillStyle;
            const currentIndex = COLOR_PALETTE.indexOf(currentColor);
            
            // Calcula a próxima cor na paleta (dando a volta)
            const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
            const nextColor = COLOR_PALETTE[nextIndex];
            
            // Aplica a nova cor
            clickedBody.render.fillStyle = nextColor;
            clickedBody.render.strokeStyle = nextColor; // Cor da borda
        }
    });


    // --- 4. FUNÇÃO PRINCIPAL DA SIMULAÇÃO ---

    // Define a função que roda quando o botão "Iniciar" é clicado
    startButton.onclick = () => {
        // Limpa todos os corpos do mundo (bolinhas, pinos, etc.)
        World.clear(world);

        const numLevels = parseInt(levelsSlider.value);
        const numBalls = parseInt(ballsSlider.value);

        // Recriar os elementos do mundo
        createPegs(numLevels);
        createBoundaries();
        createBins(numLevels);
        addBalls(numBalls);
    };

    // --- 5. FUNÇÕES DE CRIAÇÃO DE OBJETOS ---

    function createBoundaries() {
        // Cria o "funil" inicial
        const funnelLeft = Bodies.rectangle(CANVAS_WIDTH / 2 - 150, 100, 400, 10, { 
            isStatic: true, 
            angle: Math.PI * 0.15, // Inclinação
            render: { fillStyle: '#95a5a6' } 
        });
        const funnelRight = Bodies.rectangle(CANVAS_WIDTH / 2 + 150, 100, 400, 10, { 
            isStatic: true, 
            angle: -Math.PI * 0.15, // Inclinação oposta
            render: { fillStyle: '#95a5a6' } 
        });

        // Paredes laterais
        const wallLeft = Bodies.rectangle(0, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        const wallRight = Bodies.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT / 2, 10, CANVAS_HEIGHT, { isStatic: true, render: { visible: false } });
        // Chão
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
            const startX = (CANVAS_WIDTH - rowWidth) / 2 + (horizontalSpacing/2); // Centraliza a linha

            for (let i = 0; i < numPegsInRow; i++) {
                const x = startX + i * horizontalSpacing;
                const y = startY + row * verticalSpacing;
                
                const peg = Bodies.circle(x, y, PEG_RADIUS, {
                    isStatic: true, // Pinos são estáticos
                    restitution: 0.5, // Quão "saltitante" é o pino
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
        const binWidth = 35; // Um pouco menor que o espaçamento dos pinos
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
            // Adiciona um pequeno atraso para não caírem todas juntas
            setTimeout(() => {
                // Posição inicial levemente aleatória no topo do funil
                const x = CANVAS_WIDTH / 2 + Math.random() * 20 - 10;
                const ball = Bodies.circle(x, 20, BALL_RADIUS, {
                    label: 'ball', // Rótulo para identificação no clique
                    restitution: 0.7, // Mais saltitante que os pinos
                    friction: 0.01,
                    density: 0.001,
                    render: {
                        fillStyle: DEFAULT_BALL_COLOR,
                        strokeStyle: DEFAULT_BALL_COLOR,
                        lineWidth: 1
                    }
                });
                World.add(world, ball);
            }, i * 50); // Atraso de 50ms entre cada bolinha
        }
    }

    // Inicia a simulação pela primeira vez com valores padrão
    startButton.click();
});

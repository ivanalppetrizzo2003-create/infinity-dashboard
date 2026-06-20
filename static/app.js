let currentGem = '';
let audioCtx = null;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

// 全局鼠标跟踪
window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });

// ===== 0. Web Audio API 音效引擎 =====
const AudioEngine = {
    init() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); },
    playBoot() {
        if (!audioCtx) return;
        // 钢琴和弦琶音 (C4, E4, G4, B4, C5)
        const freqs = [261.63, 329.63, 392.00, 493.88, 523.25];
        freqs.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine'; // 柔和的正弦波模拟清脆和弦
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.12);
            
            gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + i * 0.12 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 2.0);
            
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.12);
            osc.stop(audioCtx.currentTime + i * 0.12 + 2.0);
        });
    },
    playHover() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; // 柔和的低音 pop
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.05);
    },
    playClick() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle'; // 悦耳的清脆三角波
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
};

// 系统启动入口
function startSystem() {
    AudioEngine.init();
    AudioEngine.playBoot();
    document.getElementById('init-overlay').classList.add('hidden');
    document.getElementById('boot-screen').classList.remove('hidden');
    bootSequence();
    injectHexStreams();
    startDataStream();
    
    // 绑定音效
    document.querySelectorAll('.orbit-card, .army-hero .card-inner').forEach(card => {
        card.addEventListener('mouseenter', () => AudioEngine.playHover());
    });
}
// ===== 1. 粒子星空系统 =====
class ParticleField {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.meteors = []; 
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 生成200+真实感星星：大小不一、颜色微调、极慢漂移
        for (let i = 0; i < 250; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() > 0.85 ? Math.random() * 1.5 + 0.8 : Math.random() * 0.8 + 0.1, // 区分大小星
                speedX: (Math.random() - 0.5) * 0.04 - 0.02, // 极其缓慢的整体左移
                speedY: (Math.random() - 0.5) * 0.03,
                opacity: Math.random() * 0.6 + 0.2,
                flickerSpeed: Math.random() * 2 + 0.5, // 闪烁频率
                flickerOffset: Math.random() * Math.PI * 2,
                color: Math.random() > 0.7 ? 'rgba(180, 210, 255,' : 'rgba(255, 255, 255,' // 偶尔偏蓝
            });
        }
        this.animate();
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const time = Date.now() * 0.001;
        
        const parallaxX = (mouseX - this.canvas.width/2) * 0.03;
        const parallaxY = (mouseY - this.canvas.height/2) * 0.03;

        // --- 1. 真实星空：分层、闪烁、微小位移、引力排斥 ---
        for (const s of this.stars) {
            // 引力场排斥
            const dx = s.x - mouseX;
            const dy = s.y - mouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 150) {
                const force = (150 - dist) / 150;
                s.x += (dx / dist) * force * 2;
                s.y += (dy / dist) * force * 2;
            }

            const flicker = Math.sin(time * s.flickerSpeed + s.flickerOffset) * 0.4 + 0.6;
            this.ctx.beginPath();
            this.ctx.arc(s.x + parallaxX, s.y + parallaxY, s.size, 0, Math.PI * 2);
            this.ctx.fillStyle = s.color + `${s.opacity * flicker})`;
            this.ctx.fill();
            
            s.x += s.speedX;
            s.y += s.speedY;
            
            // 无缝循环
            if (s.x < 0) s.x = this.canvas.width;
            if (s.x > this.canvas.width) s.x = 0;
            if (s.y < 0) s.y = this.canvas.height;
            if (s.y > this.canvas.height) s.y = 0;
        }

        // --- 2. 更显著的流星特效 ---
        if (Math.random() < 0.015 && this.meteors.length < 2) {
            this.meteors.push({
                x: Math.random() * this.canvas.width * 1.2 - this.canvas.width * 0.1, 
                y: Math.random() * this.canvas.height * 0.3 - 50, 
                length: Math.random() * 150 + 100, // 更长的尾巴
                speed: Math.random() * 4 + 2, // 保持慢速
                angle: Math.PI / 4 + (Math.random() * 0.6 - 0.3), 
                opacity: 1, // 高亮起点
                fadeRate: Math.random() * 0.003 + 0.001 
            });
        }

        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            const tailX = m.x - m.length * Math.cos(m.angle);
            const tailY = m.y - m.length * Math.sin(m.angle);
            
            // 流星拖尾：长渐变
            const grad = this.ctx.createLinearGradient(m.x + parallaxX, m.y + parallaxY, tailX + parallaxX, tailY + parallaxY);
            grad.addColorStop(0, `rgba(255, 255, 255, ${m.opacity})`);
            grad.addColorStop(0.1, `rgba(200, 230, 255, ${m.opacity * 0.8})`);
            grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
            
            this.ctx.beginPath();
            this.ctx.moveTo(m.x + parallaxX, m.y + parallaxY);
            this.ctx.lineTo(tailX + parallaxX, tailY + parallaxY);
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 2.5; // 更粗
            this.ctx.lineCap = "round";
            this.ctx.stroke();
            
            // 流星头部光晕
            this.ctx.beginPath();
            this.ctx.arc(m.x + parallaxX, m.y + parallaxY, 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${m.opacity})`;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = "rgba(255, 255, 255, 1)";
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // 重置阴影
            
            m.x += m.speed * Math.cos(m.angle);
            m.y += m.speed * Math.sin(m.angle);
            m.opacity -= m.fadeRate;
            
            if (m.opacity <= 0 || m.x > this.canvas.width || m.y > this.canvas.height) {
                this.meteors.splice(i, 1);
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}

// ===== 2. 开屏启动动画 =====
function bootSequence() {
    // 匹配复杂的开场动画时间 (约 2.4 秒)
    setTimeout(() => {
        // 隐藏开机屏
        document.getElementById('boot-screen').classList.add('hidden');
        
        // 依次移除 boot-hidden 触发 CSS 的飞出动画
        setTimeout(() => {
            const bootElements = document.querySelectorAll('.boot-hidden');
            bootElements.forEach((el, i) => {
                setTimeout(() => {
                    el.classList.remove('boot-hidden');
                }, i * 70); // 交错动画时间
            });
        }, 300);
    }, 2400); 
}

// ===== 3. 3D 鼠标倾斜 =====
function initTiltEffect() {
    document.querySelectorAll('.orbit-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            // 如果卡片是被选中展开的状态，不做倾斜
            const slot = card.closest('.orbit-slot');
            if (slot && slot.classList.contains('selected')) return;

            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `translate(-50%, -50%) perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.08)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// ===== 4. 键盘快捷键 =====
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // 不在输入框中触发
    switch (e.key) {
        case '1': switchView('view-gems'); break;
        case '2': switchView('view-skills'); break;
        case '3': switchView('view-army'); break;
        case '4': switchView('view-status'); break;
        case 'Escape':
            closeModal();
            document.querySelectorAll('.orbit-slot.selected').forEach(el => el.classList.remove('selected'));
            break;
    }
});

// ===== 5. 数字跳动计数器 =====
function animateCounters() {
    document.querySelectorAll('.stat-number').forEach(el => {
        const target = parseInt(el.dataset.target);
        let current = 0;
        const step = Math.max(1, Math.floor(target / 30));
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = current;
        }, 40);
    });
}

// ===== 数据流注入 =====
function injectHexStreams() {
    document.querySelectorAll('.orbit-card').forEach(card => {
        const stream = document.createElement('div');
        stream.className = 'hex-stream';
        stream.innerText = '0x' + Math.floor(Math.random()*65535).toString(16).padStart(4, '0').toUpperCase();
        card.appendChild(stream);
    });
}
function startDataStream() {
    setInterval(() => {
        const cards = document.querySelectorAll('.orbit-card');
        if(!cards.length) return;
        const card = cards[Math.floor(Math.random() * cards.length)];
        const stream = card.querySelector('.hex-stream');
        if (stream) stream.innerText = '0x' + Math.floor(Math.random()*65535).toString(16).padStart(4, '0').toUpperCase();
        
        // 赛博故障随机触发
        if (Math.random() < 0.15) {
            card.classList.add('glitch-effect');
            setTimeout(() => card.classList.remove('glitch-effect'), 300);
        }
    }, 150);
}

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    // 启动粒子系统
    new ParticleField(document.getElementById('particles'));
    // bootSequence 将在用户点击 [INITIATE MATRIX] 后执行
    
    // 启动 3D 倾斜
    setTimeout(() => initTiltEffect(), 2000);
    // 心跳
    setInterval(() => { fetch('/heartbeat', { method: 'POST' }).catch(() => {}); }, 30000);
});

// ===== 侧边栏视图切换 =====
function switchView(viewId) {
    document.querySelectorAll('.orbit-slot.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navMap = { 'view-gems': 'nav-gems', 'view-skills': 'nav-skills', 'view-army': 'nav-army', 'view-status': 'nav-status' };
    const navEl = document.getElementById(navMap[viewId]);
    if (navEl) navEl.classList.add('active');

    // 切换到状态页时启动计数器
    if (viewId === 'view-status') {
        animateCounters();
    }
}

// ===== 技能卡片飞到中心 (专供不需要终端面板的技能) =====
function selectCard(slot) {
    if (AudioEngine.playClick) AudioEngine.playClick();
    const wasSelected = slot.classList.contains('selected');
    
    // 清除所有的选中状态
    document.querySelectorAll('.orbit-slot.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 如果之前未选中，则选中
    if (!wasSelected) {
        slot.classList.add('selected');
    }
}


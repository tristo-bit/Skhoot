// ===== Simulated Agent Demo =====
const demoChat = document.getElementById('demo-chat');

const demoScenario = [
    { 
        type: 'user', 
        content: 'I need to prepare a summary of our Rust backend architecture. Can you find the main project files and check if the tests are passing?' 
    },
    {
        type: 'agent-status',
        content: 'Searching codebase...'
    },
    {
        type: 'tool',
        name: 'list_directory',
        icon: '📂',
        color: 'blue',
        args: 'path: "backend/src"',
        output: 'Found: main.rs, lib.rs, search_engine/, cli_agent/, api/'
    },
    {
        type: 'agent-status',
        content: 'Locating ARCHITECTURE.md...'
    },
    {
        type: 'tool',
        name: 'search_files',
        icon: '🔍',
        color: 'purple',
        args: 'pattern: "ARCHITECTURE.md"',
        output: 'Result: Found 1 match at ./ARCHITECTURE.md'
    },
    {
        type: 'agent-status',
        content: 'Running cargo test...'
    },
    {
        type: 'tool',
        name: 'shell',
        icon: '⌨️',
        color: 'green',
        args: 'command: "cargo test"',
        output: 'Finished: 42 passed, 0 failed, 0 ignored'
    },
    {
        type: 'assistant',
        content: 'I\'ve analyzed your backend. The core logic resides in `backend/src`, and I found a detailed `ARCHITECTURE.md`. Good news: all 42 tests are passing successfully! Would you like me to extract the key components from the docs for your summary?'
    }
];

let scenarioIndex = 0;
let isAnimating = false;

function addMessage(type, data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message message-${type === 'agent-status' ? 'assistant' : type}`;
    
    if (type === 'tool') {
        messageDiv.innerHTML = `
            <div class="tool-call">
                <div class="tool-header">
                    <span class="tool-icon ${data.color}">${data.icon}</span>
                    <span class="tool-name">${data.name}</span>
                    <span class="tool-status">SUCCESS</span>
                </div>
                <div class="tool-content">
                    <code>${data.args}</code>
                    <div class="tool-output">${data.output}</div>
                </div>
            </div>
        `;
    } else if (type === 'agent-status') {
        messageDiv.innerHTML = `
            <div class="agent-status-msg">
                <span class="agent-dot"></span>
                <span class="agent-status-text">${data.content}</span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-bubble">${data.content}</div>
        `;
    }
    
    demoChat.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    demoChat.scrollTo({
        top: demoChat.scrollHeight,
        behavior: 'smooth'
    });
}

async function runScenario() {
    if (isAnimating) return;
    isAnimating = true;
    
    demoChat.innerHTML = '';
    scenarioIndex = 0;
    
    while (scenarioIndex < demoScenario.length) {
        const item = demoScenario[scenarioIndex];
        
        // Dynamic delays for realism
        let delay = 1200;
        if (item.type === 'user') delay = 500;
        if (item.type === 'tool') delay = 1800;
        if (item.type === 'agent-status') delay = 800;
        
        await new Promise(r => setTimeout(r, delay));
        addMessage(item.type, item);
        
        scenarioIndex++;
    }
    
    // Pause before restarting
    await new Promise(r => setTimeout(r, 8000));
    isAnimating = false;
    runScenario();
}

// Start demo when in view
const demoObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        runScenario();
        demoObserver.disconnect();
    }
}, { threshold: 0.2 });

if (demoChat) {
    demoObserver.observe(demoChat);
}

// ===== Header Scroll Effect =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}, { passive: true });

// ===== Mobile Menu Toggle =====
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const menuBars = document.querySelectorAll('.menu-bar');

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
        const isActive = mobileMenu.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', isActive);
        if (isActive) {
            menuBars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            menuBars[1].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            menuBars[0].style.transform = '';
            menuBars[1].style.transform = '';
        }
    });
}

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
    });
});

// ===== Detect OS for Download Highlight =====
function detectOS() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    if (userAgent.includes('win') || platform.includes('win')) return 'windows';
    if (userAgent.includes('mac') || platform.includes('mac')) return 'macos';
    if (userAgent.includes('linux') || platform.includes('linux')) return 'linux';
    return null;
}

const os = detectOS();
if (os) {
    const downloadCards = document.querySelectorAll('.download-card');
    downloadCards.forEach(card => {
        const platform = card.querySelector('.download-platform').textContent.toLowerCase();
        if (platform === os || (platform === 'macos' && os === 'macos')) {
            card.classList.add('featured');
            const badge = document.createElement('div');
            badge.className = 'download-badge';
            badge.textContent = 'Recommended';
            card.insertBefore(badge, card.firstChild);
        }
    });
}

// ===== Console Easter Egg =====
console.log('%c🚀 Skhoot', 'font-size: 24px; font-weight: bold; color: #c0b7c9;');
console.log('%cYour intelligent desktop AI assistant', 'font-size: 14px; color: #636E72;');
console.log('%cCheck out the source: https://github.com/tristo-bit/skhoot', 'font-size: 12px; color: #a0a0a0;');

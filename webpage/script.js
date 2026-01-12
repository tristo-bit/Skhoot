// ===== Header Scroll Effect =====
const header = document.getElementById('header');
let lastScroll = 0;

function handleScroll() {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
}

window.addEventListener('scroll', handleScroll, { passive: true });

// ===== Mobile Menu Toggle =====
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const menuBars = document.querySelectorAll('.menu-bar');

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
        const isActive = mobileMenu.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', isActive);
        
        // Animate menu bars
        if (isActive) {
            menuBars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            menuBars[1].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            menuBars[0].style.transform = '';
            menuBars[1].style.transform = '';
        }
    });
    
    // Close menu when clicking a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuBars[0].style.transform = '';
            menuBars[1].style.transform = '';
        });
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
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card, .tech-item, .download-card').forEach(el => {
    animateOnScroll.observe(el);
});

// ===== Typing Animation for Chat Demo =====
function typeWriter(element, text, speed = 30) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize chat demo animation when visible
const chatDemo = document.querySelector('.chat-demo');
if (chatDemo) {
    const chatObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Messages are already animated via CSS
                chatObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    chatObserver.observe(chatDemo);
}

// ===== Detect OS for Download Highlight =====
function detectOS() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('linux')) return 'linux';
    
    return null;
}

// Highlight the appropriate download card
const os = detectOS();
if (os) {
    const downloadCards = document.querySelectorAll('.download-card');
    downloadCards.forEach(card => {
        const platform = card.querySelector('.download-platform').textContent.toLowerCase();
        if (platform === os || (platform === 'macos' && os === 'macos')) {
            card.style.borderColor = 'var(--color-primary)';
            card.style.boxShadow = '0 10px 40px rgba(192, 183, 201, 0.2)';
        }
    });
}

// ===== Console Easter Egg =====
console.log('%c🚀 Skhoot', 'font-size: 24px; font-weight: bold; color: #c0b7c9;');
console.log('%cYour intelligent desktop AI assistant', 'font-size: 14px; color: #636E72;');
console.log('%cCheck out the source: https://github.com/USER/skhoot', 'font-size: 12px; color: #a0a0a0;');

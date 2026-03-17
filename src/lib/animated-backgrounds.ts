/**
 * Animated Background Styles for Rewards
 * CSS keyframes and classes for animated profile backgrounds
 */

export const ANIMATED_BACKGROUNDS = {
  gradient_wave: {
    name: 'Gradient Wave',
    description: 'Płynna fala gradientów',
    css: `
      @keyframes gradient-wave {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .bg-gradient-wave {
        background: linear-gradient(270deg, #ff6ec4, #7873f5, #4facfe);
        background-size: 600% 600%;
        animation: gradient-wave 8s ease infinite;
      }
    `
  },

  particles: {
    name: 'Particles',
    description: 'Unoszące się cząsteczki',
    css: `
      @keyframes float-particles {
        0% { transform: translateY(0) translateX(0); opacity: 1; }
        50% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
        100% { transform: translateY(0) translateX(0); opacity: 1; }
      }
      .bg-particles {
        position: relative;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .bg-particles::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background-image: 
          radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px),
          radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px);
        background-size: 50px 50px, 80px 80px;
        background-position: 0 0, 40px 60px;
        animation: float-particles 10s linear infinite;
      }
    `
  },

  aurora: {
    name: 'Aurora',
    description: 'Zorza polarna',
    css: `
      @keyframes aurora {
        0% { transform: rotate(0deg) scale(1); opacity: 0.8; }
        33% { transform: rotate(120deg) scale(1.1); opacity: 0.6; }
        66% { transform: rotate(240deg) scale(0.9); opacity: 0.8; }
        100% { transform: rotate(360deg) scale(1); opacity: 0.8; }
      }
      .bg-aurora {
        position: relative;
        background: #0a0e27;
        overflow: hidden;
      }
      .bg-aurora::before,
      .bg-aurora::after {
        content: '';
        position: absolute;
        width: 200%;
        height: 200%;
        top: -50%;
        left: -50%;
        background: radial-gradient(ellipse at center, 
          rgba(147, 51, 234, 0.4) 0%, 
          rgba(59, 130, 246, 0.3) 25%, 
          transparent 50%);
        animation: aurora 20s linear infinite;
      }
      .bg-aurora::after {
        animation-delay: -10s;
        animation-duration: 25s;
      }
    `
  },

  pulse: {
    name: 'Pulse',
    description: 'Pulsujące światło',
    css: `
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.05); }
      }
      .bg-pulse {
        background: radial-gradient(ellipse at center, #fa709a 0%, #fee140 100%);
        animation: pulse-glow 3s ease-in-out infinite;
      }
    `
  },

  stars: {
    name: 'Stars',
    description: 'Gwiaździste niebo',
    css: `
      @keyframes twinkle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .bg-stars {
        position: relative;
        background: #000428;
        background: linear-gradient(to bottom, #000428 0%, #004e92 100%);
      }
      .bg-stars::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background-image: 
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent),
          radial-gradient(1px 1px at 50% 50%, white, transparent),
          radial-gradient(1px 1px at 80% 10%, white, transparent),
          radial-gradient(2px 2px at 90% 60%, white, transparent),
          radial-gradient(1px 1px at 33% 80%, white, transparent);
        background-size: 200% 200%;
        animation: twinkle 5s ease-in-out infinite;
      }
    `
  }
};

/**
 * Apply animated background to element
 */
export function applyAnimatedBackground(element: HTMLElement | null, backgroundId: string) {
  if (!element) return;

  const background = ANIMATED_BACKGROUNDS[backgroundId as keyof typeof ANIMATED_BACKGROUNDS];
  if (!background) return;

  // Remove all existing background classes
  Object.keys(ANIMATED_BACKGROUNDS).forEach(key => {
    element.classList.remove(`bg-${key.replace('_', '-')}`);
  });

  // Add new background class
  const className = `bg-${backgroundId.replace('_', '-')}`;
  element.classList.add(className);

  // Inject CSS if not already present
  if (!document.getElementById(`animated-bg-${backgroundId}`)) {
    const style = document.createElement('style');
    style.id = `animated-bg-${backgroundId}`;
    style.textContent = background.css;
    document.head.appendChild(style);
  }
}

/**
 * Get list of available animated backgrounds
 */
export function getAvailableBackgrounds() {
  return Object.entries(ANIMATED_BACKGROUNDS).map(([id, bg]) => ({
    id,
    name: bg.name,
    description: bg.description,
  }));
}


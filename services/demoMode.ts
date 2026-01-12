// Demo Mode Service - Auto-playing showcase for deployment
// No backend required - uses hardcoded data

interface DemoStep {
  type: string;
  data?: any;
  delay: number; // ms before this step
}

const DEMO_SEQUENCE: DemoStep[] = [
  // Welcome messages from AI
  {
    type: 'ai-message',
    data: { content: "Hey there! 👋 Thanks for checking out Skhoot." },
    delay: 1500
  },
  {
    type: 'ai-message',
    data: { content: "I'm your intelligent desktop assistant. Let me show you what I can do!" },
    delay: 2500
  },
  {
    type: 'ai-message',
    data: { content: "Try typing in the input below, or watch this quick demo..." },
    delay: 2500
  },
  
  // Demo: File search
  {
    type: 'demo-typing',
    data: { text: 'Find my invoice files' },
    delay: 2000
  },
  {
    type: 'click-send',
    delay: 800
  },
  {
    type: 'search-files',
    data: {
      query: 'invoice',
      results: [
        { id: '1', name: 'invoice_2024_jan.pdf', path: '/Documents/Work/Invoices', size: '1.2 MB', category: 'Work' },
        { id: '2', name: 'invoice_2024_feb.pdf', path: '/Documents/Work/Invoices', size: '980 KB', category: 'Work' },
        { id: '3', name: 'invoice_template.docx', path: '/Documents/Templates', size: '45 KB', category: 'Work' },
      ]
    },
    delay: 2000
  },
  
  // Demo: Disk analysis
  {
    type: 'demo-typing',
    data: { text: 'Analyze my disk space' },
    delay: 3500
  },
  {
    type: 'click-send',
    delay: 800
  },
  {
    type: 'analyze-disk',
    data: {
      results: [
        { id: 'd1', name: 'Macintosh HD', totalSpace: 500, usedSpace: 320, availableSpace: 180, usagePercentage: 64, type: 'internal' },
        { id: 'd2', name: 'External SSD', totalSpace: 1000, usedSpace: 450, availableSpace: 550, usagePercentage: 45, type: 'external' },
      ]
    },
    delay: 2000
  },
  
  // Demo: Cleanup
  {
    type: 'demo-typing',
    data: { text: 'Help me free up some space' },
    delay: 4000
  },
  {
    type: 'click-send',
    delay: 800
  },
  {
    type: 'cleanup',
    data: {
      results: [
        { id: 'c1', name: 'node_modules', path: '/Dev/old-project', size: '1.2 GB', type: 'folder', canRemove: true, description: 'NPM dependencies for an old project.', consequence: 'Safe to remove.', lastAccessed: '6 months ago' },
        { id: 'c2', name: 'Library/Caches', path: '~/Library/Caches', size: '4.8 GB', type: 'folder', canRemove: true, description: 'Application cache files.', consequence: 'Safe to remove.', lastAccessed: '1 day ago' },
        { id: 'c3', name: '.Trash', path: '~/.Trash', size: '2.1 GB', type: 'folder', canRemove: true, description: 'Files in your trash bin.', consequence: 'Permanent deletion.', lastAccessed: '3 days ago' },
      ]
    },
    delay: 3500
  },
  
  // Final message and open sidebar
  {
    type: 'ai-message',
    data: { content: "That's just a taste! Download Skhoot to explore voice commands, AI chat, and more. Let me show you the conversation history..." },
    delay: 3000
  },
  {
    type: 'open-sidebar',
    delay: 2000
  },
  {
    type: 'click-new-chat',
    delay: 2500
  },
];

class DemoModeService {
  private isRunning = false;
  private currentStep = 0;
  private timeoutId: number | null = null;
  private loopEnabled = true;

  isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true' || 
           urlParams.get('mode') === 'demo' ||
           import.meta.env.VITE_DEMO_MODE === 'true';
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStep = 0;
    console.log('🎬 Demo mode started');
    this.runNextStep();
  }

  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    console.log('🎬 Demo mode stopped');
  }

  private runNextStep() {
    if (!this.isRunning) return;

    if (this.currentStep >= DEMO_SEQUENCE.length) {
      if (this.loopEnabled) {
        this.timeoutId = window.setTimeout(() => {
          this.currentStep = 0;
          window.dispatchEvent(new CustomEvent('skhoot-demo-reset'));
          this.timeoutId = window.setTimeout(() => this.runNextStep(), 2000);
        }, 6000);
      }
      return;
    }

    const step = DEMO_SEQUENCE[this.currentStep];
    
    this.timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('skhoot-demo', {
        detail: { type: step.type, data: step.data }
      }));
      
      this.currentStep++;
      this.runNextStep();
    }, step.delay);
  }

  setLoop(enabled: boolean) {
    this.loopEnabled = enabled;
  }
}

export const demoModeService = new DemoModeService();

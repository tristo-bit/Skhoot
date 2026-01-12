// Demo Mode Service - Auto-playing showcase for deployment
// No backend required - uses hardcoded data

interface DemoStep {
  type: string;
  data: any;
  delay: number; // ms before this step
  typingText?: string; // Text to "type" in input
}

const DEMO_SEQUENCE: DemoStep[] = [
  // Step 1: File search
  {
    type: 'typing',
    data: { text: 'Find my invoice files' },
    delay: 2000,
    typingText: 'Find my invoice files'
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
    delay: 1500
  },
  
  // Step 2: Disk analysis
  {
    type: 'typing',
    data: { text: 'Analyze my disk space' },
    delay: 4000,
    typingText: 'Analyze my disk space'
  },
  {
    type: 'analyze-disk',
    data: {
      results: [
        { id: 'd1', name: 'Macintosh HD', totalSpace: 500, usedSpace: 320, availableSpace: 180, usagePercentage: 64, type: 'internal' },
        { id: 'd2', name: 'External SSD', totalSpace: 1000, usedSpace: 450, availableSpace: 550, usagePercentage: 45, type: 'external' },
      ]
    },
    delay: 1500
  },
  
  // Step 3: Cleanup suggestions
  {
    type: 'typing',
    data: { text: 'Help me free up some space' },
    delay: 4500,
    typingText: 'Help me free up some space'
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
    delay: 1500
  },
  
  // Step 4: Markdown/AI response
  {
    type: 'typing',
    data: { text: 'What can you help me with?' },
    delay: 5000,
    typingText: 'What can you help me with?'
  },
  {
    type: 'show-markdown',
    data: {
      content: `## I can help you with:

### 🔍 **File Search**
Find any file on your system instantly with AI-powered search.

### 💾 **Disk Analysis**  
Visualize storage usage and identify space hogs.

### 🧹 **Smart Cleanup**
Get safe recommendations for freeing up disk space.

### 🎤 **Voice Commands**
Just speak naturally - I understand context!

### 💬 **Conversational AI**
Ask me anything and I'll help you navigate your digital workspace.`
    },
    delay: 1500
  },
];

class DemoModeService {
  private isRunning = false;
  private currentStep = 0;
  private timeoutId: number | null = null;
  private loopEnabled = true;

  isDemoMode(): boolean {
    // Check URL params or environment
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
        // Reset and loop after a pause
        this.timeoutId = window.setTimeout(() => {
          this.currentStep = 0;
          // Clear messages before restarting
          window.dispatchEvent(new CustomEvent('skhoot-demo-reset'));
          this.timeoutId = window.setTimeout(() => this.runNextStep(), 2000);
        }, 5000);
      }
      return;
    }

    const step = DEMO_SEQUENCE[this.currentStep];
    
    this.timeoutId = window.setTimeout(() => {
      if (step.type === 'typing' && step.typingText) {
        // Dispatch typing animation event
        window.dispatchEvent(new CustomEvent('skhoot-demo-typing', {
          detail: { text: step.typingText }
        }));
      } else {
        // Dispatch the actual demo event
        window.dispatchEvent(new CustomEvent('skhoot-demo', {
          detail: { type: step.type, data: step.data }
        }));
      }
      
      this.currentStep++;
      this.runNextStep();
    }, step.delay);
  }

  setLoop(enabled: boolean) {
    this.loopEnabled = enabled;
  }
}

export const demoModeService = new DemoModeService();

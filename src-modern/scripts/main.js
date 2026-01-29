// ==========================================================================
// Bootstrap Admin Template - Modern JavaScript Entry Point
// ES6+ Modules with Bootstrap 5
// ==========================================================================

// Import Bootstrap 5 JavaScript components (only those actively used)
import {
  Collapse,
  Dropdown,
  Modal,
  Offcanvas,
  Popover,
  Tab,
  Toast,
  Tooltip,
} from 'bootstrap';

// Import our custom modules
import { ThemeManager } from './utils/theme-manager.js';
import { DashboardManager } from './components/dashboard.js';
import { NotificationManager } from './utils/notifications.js';
import { SidebarManager } from './components/sidebar.js';
import { iconManager } from './utils/icon-manager.js';

// Import Alpine.js for reactive components
import Alpine from 'alpinejs';

// Import styles (Bootstrap Icons are included in SCSS)
import '../styles/scss/main.scss';

// Import feature components (currently unused)
// import { AccountComponent } from './components/account.js';
// import { AnalyticsComponent } from './components/analytics.js';
// import { FormsComponent } from './components/forms.js';

// Application Class
class AdminApp {
  constructor() {
    this.components = new Map();
    this.isInitialized = false;
  }

  // Initialize the application
  async init() {
    if (this.isInitialized) return;

    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize core managers
      this.themeManager = new ThemeManager();
      this.notificationManager = new NotificationManager();
      this.sidebarManager = new SidebarManager();
      this.iconManager = iconManager;

      // Preload common icons for better performance
      this.iconManager.preloadIcons([
        'dashboard', 'purchases', 'analytics', 'settings', 'notifications',
        'search', 'menu', 'check', 'warning', 'info', 'success', 'error'
      ]);

      // Initialize Bootstrap components
      this.initBootstrapComponents();

      // Initialize page-specific components and wait for them to complete
      await this.initPageComponents();

      // Setup global event listeners
      this.setupEventListeners();
      
      // Initialize navigation
      this.initNavigation();

      // Initialize tooltips and popovers globally
      this.initTooltipsAndPopovers();

      // Initialize Alpine.js
      this.initAlpine();

      this.isInitialized = true;

      // Scroll to top after initialization (browser refresh should show top of page)
      window.scrollTo(0, 0);

      console.log('🚀 Admin App initialized successfully');

      // Hide loading screen with fade out animation
      this.hideLoadingScreen();

      // Show initialization complete notification
      this.notificationManager.show('Application loaded successfully!', 'success');

    } catch (error) {
      console.error('❌ Failed to initialize Admin App:', error);
    }
  }

  // Initialize Bootstrap components
  initBootstrapComponents() {
    // Initialize dropdowns
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(element => {
      new Dropdown(element);
    });

    // Initialize modals
    document.querySelectorAll('.modal').forEach(element => {
      new Modal(element);
    });

    // Initialize offcanvas
    document.querySelectorAll('.offcanvas').forEach(element => {
      new Offcanvas(element);
    });

    // Initialize collapse elements
    document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(element => {
      new Collapse(element);
    });

    // Initialize tabs
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(element => {
      new Tab(element);
    });

    // Initialize toasts
    document.querySelectorAll('.toast').forEach(element => {
      new Toast(element);
    });
  }

  // Initialize tooltips and popovers
  initTooltipsAndPopovers() {
    // Initialize tooltips
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(element => {
      new Tooltip(element);
    });

    // Initialize popovers
    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(element => {
      new Popover(element);
    });
  }

  // Initialize page-specific components
  async initPageComponents() {
    const currentPage = document.body.dataset.page;

    switch (currentPage) {
      case 'dashboard':
        this.components.set('dashboard', new DashboardManager());
        break;
      case 'settings':
        await this.initSettingsPage();
        break;
      default:
        console.log('Page-specific components loading complete');
    }
  }

  async initSettingsPage() {
    try {
      await import('./components/settings.js');
      console.log('⚙️ Settings page script loaded successfully');
    } catch (error) {
      console.error('Failed to load settings page script:', error);
    }
  }

  // Setup global event listeners
  setupEventListeners() {
    // Theme toggle
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-theme-toggle]')) {
        this.themeManager.toggleTheme();
      }
    });

    // Full screen toggle
    document.addEventListener('click', (e) => {
      const fullscreenButton = e.target.closest('[data-fullscreen-toggle]');
      if (fullscreenButton) {
        e.preventDefault();
        this.toggleFullscreen();
      }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  // Handle keyboard shortcuts
  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + K for search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      // Open search modal or focus search input
      const searchInput = document.querySelector('[data-search-input]');
      if (searchInput) {
        searchInput.focus();
      }
    }
  }

  // Hide loading screen with fade out animation
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      // Add fade-out animation
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.5s ease-out';

      // Remove from DOM after animation completes
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }

  // Toggle fullscreen
  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }

  // Get component instance
  getComponent(name) {
    return this.components.get(name);
  }

  // Initialize navigation functionality
  initNavigation() {
    // Handle submenu toggle persistence
    document.addEventListener('click', (e) => {
      const toggleButton = e.target.closest('[data-bs-toggle="collapse"]');
      if (toggleButton) {
        const targetId = toggleButton.getAttribute('data-bs-target');
        const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';

        // Store submenu state
        localStorage.setItem(`submenu-${targetId}`, (!isExpanded).toString());
      }
    });

    // Restore submenu states from localStorage
    const submenuToggles = document.querySelectorAll('[data-bs-toggle="collapse"]');
    submenuToggles.forEach(toggle => {
      const targetId = toggle.getAttribute('data-bs-target');
      const savedState = localStorage.getItem(`submenu-${targetId}`);

      if (savedState === 'true') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.classList.add('show');
          toggle.setAttribute('aria-expanded', 'true');
        }
      }
    });
  }

  // Initialize Alpine.js
  initAlpine() {
    // Register Alpine data components
    Alpine.data('searchComponent', () => ({
      query: '',
      results: [],
      isLoading: false,

      async search() {
        if (this.query.length < 2) {
          this.results = [];
          return;
        }

        this.isLoading = true;
        // Simulate API search
        await new Promise(resolve => setTimeout(resolve, 300));

        this.results = [
          { title: 'Dashboard', url: 'index.html', type: 'page' },
          { title: 'Inventory', url: 'inventory.html', type: 'page' },
          { title: 'Settings', url: 'settings.html', type: 'page' }
        ].filter(item =>
          item.title.toLowerCase().includes(this.query.toLowerCase())
        );

        this.isLoading = false;
      }
    }));

    Alpine.data('statsCounter', (initialValue = 0, increment = 1) => ({
      value: initialValue,
      
      init() {
        // Auto-increment every 5 seconds
        setInterval(() => {
          this.value += Math.floor(Math.random() * increment) + 1;
        }, 5000);
      }
    }));

    Alpine.data('themeSwitch', () => ({
      currentTheme: 'light',
      
      init() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
      },
      
      toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
      }
    }));

    Alpine.data('iconDemo', () => ({
      currentProvider: 'bootstrap',

      switchProvider(provider) {
        this.currentProvider = provider;
        iconManager.switchProvider(provider);
        console.log(`🎨 Switched to ${provider} icons`);
      },

      getIcon(iconName) {
        return iconManager.get(iconName);
      }
    }));

    // Quick Add Form for Dashboard
    Alpine.data('quickAddForm', () => ({
      itemType: 'task',
      title: '',
      description: '',
      priority: 'medium',
      dateTime: '',
      assignee: '',

      init() {
        // Set default date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        this.dateTime = now.toISOString().slice(0, 16);
      },

      resetForm() {
        this.itemType = 'task';
        this.title = '';
        this.description = '';
        this.priority = 'medium';
        this.assignee = '';
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        this.dateTime = now.toISOString().slice(0, 16);
      },

      saveItem() {
        if (!this.title.trim()) {
          window.AdminApp.notificationManager.warning('Please enter a title');
          return;
        }

        const item = {
          type: this.itemType,
          title: this.title,
          description: this.description,
          priority: this.itemType === 'task' ? this.priority : null,
          dateTime: ['event', 'reminder'].includes(this.itemType) ? this.dateTime : null,
          assignee: this.itemType === 'task' ? this.assignee : null,
          createdAt: new Date().toISOString()
        };

        // In a real app, this would send to an API
        console.log('New item created:', item);

        // Show success notification with item type
        const typeLabels = {
          task: 'Task',
          note: 'Note',
          event: 'Event',
          reminder: 'Reminder'
        };

        window.AdminApp.notificationManager.success(
          `${typeLabels[this.itemType]} "${this.title}" created successfully!`
        );

        // Reset form for next use
        this.resetForm();
      }
    }));

    // Start Alpine.js
    Alpine.start();
    window.Alpine = Alpine;
  }

  // Show demo notifications
  showDemoNotifications() {
    setTimeout(() => {
      this.notificationManager.info('New purchase added', {
        action: {
          text: 'View',
          handler: 'window.location.href="/purchases"'
        }
      });
    }, 3000);

    setTimeout(() => {
      this.notificationManager.warning('Server maintenance in 10 minutes');
    }, 6000);

    setTimeout(() => {
      this.notificationManager.success('Backup completed successfully');
    }, 9000);
  }

  // Cleanup method
  destroy() {
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.components.clear();
    this.isInitialized = false;
  }
}

// Create global app instance
const app = new AdminApp();

// Initialize app when module loads
app.init();

// Export for global access
window.AdminApp = app;
window.IconManager = iconManager;

// Export the app instance for module imports
export default app; 
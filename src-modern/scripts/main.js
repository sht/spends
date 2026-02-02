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

// Import page-specific Alpine components
import { registerSettingsComponent } from './components/settings.js';
import { registerInventoryComponent } from './components/inventory.js';

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
        const dashboardManager = new DashboardManager();
        this.components.set('dashboard', dashboardManager);
        window.dashboardManager = dashboardManager;
        break;
      case 'settings':
        console.log('⚙️ Settings page components registered');
        break;
      case 'inventory':
        console.log('📦 Inventory page components registered');
        break;
      default:
        console.log('Page-specific components loading complete');
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

    // Command palette trigger (search bar click)
    document.addEventListener('click', (e) => {
      const commandPaletteTrigger = e.target.closest('#command-palette-trigger');
      if (commandPaletteTrigger) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-command-palette'));
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
    // Ctrl/Cmd + K for command palette
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      // Dispatch custom event to open command palette
      window.dispatchEvent(new CustomEvent('open-command-palette'));
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
    Alpine.data('commandPalette', () => ({
      isOpen: false,
      query: '',
      selectedIndex: 0,

      commands: [
        { name: 'Add New Purchase', icon: 'bi-plus-circle', action: 'addPurchase', category: 'Purchase' },
        { name: 'Go to Dashboard', icon: 'bi-house', action: 'goDashboard', category: 'Navigation' },
        { name: 'Go to Inventory', icon: 'bi-box', action: 'goInventory', category: 'Navigation' },
        { name: 'Go to Settings', icon: 'bi-gear', action: 'goSettings', category: 'Navigation' },
        { name: 'Export Data', icon: 'bi-download', action: 'exportData', category: 'Data' },
        { name: 'Toggle Theme', icon: 'bi-moon', action: 'toggleTheme', category: 'Settings' },
      ],

      get filteredCommands() {
        if (!this.query) return this.commands;
        return this.commands.filter(cmd =>
          cmd.name.toLowerCase().includes(this.query.toLowerCase()) ||
          cmd.category.toLowerCase().includes(this.query.toLowerCase())
        );
      },

      init() {
        window.addEventListener('open-command-palette', () => {
          this.open();
        });
      },

      open() {
        this.isOpen = true;
        this.query = '';
        this.selectedIndex = 0;
        this.$nextTick(() => {
          const input = document.querySelector('[data-command-input]');
          if (input) input.focus();
        });
      },

      close() {
        this.isOpen = false;
        this.query = '';
        this.selectedIndex = 0;
      },

      executeCommand(command) {
        switch (command.action) {
          case 'addPurchase':
            // Check if we're on inventory page (modal exists)
            const inventoryModal = document.getElementById('inventoryModal');
            if (inventoryModal) {
              // We're on inventory page, open modal directly
              const modal = new window.bootstrap.Modal(inventoryModal);
              modal.show();
            } else {
              // Navigate to inventory page with hash to open modal
              window.location.href = 'inventory.html#addPurchase';
            }
            break;
          case 'goDashboard':
            window.location.href = 'index.html';
            break;
          case 'goInventory':
            window.location.href = 'inventory.html';
            break;
          case 'goSettings':
            window.location.href = 'settings.html';
            break;
          case 'exportData':
            window.AdminApp.notificationManager.info('Export feature coming soon');
            break;
          case 'toggleTheme':
            window.AdminApp.themeManager.toggle();
            break;
        }
        this.close();
      },

      handleKeydown(e) {
        if (!this.isOpen) return;

        if (e.key === 'Escape') {
          this.close();
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (this.filteredCommands[this.selectedIndex]) {
            this.executeCommand(this.filteredCommands[this.selectedIndex]);
          }
          e.preventDefault();
        }
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

    // Quick Add Form for Dashboard (kept for backward compatibility)
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

    // Add Purchase Form for Dashboard
    Alpine.data('addPurchaseForm', () => ({
      form: {
        productName: '',
        retailer: '',
        brand: '',
        modelNumber: '',
        serialNumber: '',
        purchaseDate: '',
        price: '',
        quantity: 1,
        link: '',
        warrantyExpiry: '',
        returnDeadline: '',
        returnPolicy: '',
        taxDeductible: false,
        tags: '',
        notes: ''
      },
      isEditMode: false,
      isViewMode: false,  // Added missing property
      editingItemId: null,
      retailers: [],
      brands: [],

      init() {
        this.resetForm();

        // Load data without awaiting - this keeps init() synchronous
        // so Alpine.js can properly initialize the component and attach event listeners
        this.loadRetailers();
        this.loadBrands();

        // Listen for edit-purchase event from inventory table
        window.addEventListener('edit-purchase', (e) => {
          console.log('Received edit-purchase event:', e.detail);
          if (e.detail && e.detail.item) {
            this.enterEditMode(e.detail.item);
          }
        });

        // Watch for changes to purchase date to validate warranty/return dates
        this.$watch('form.purchaseDate', (newDate) => {
          if (newDate) {
            this.validateDatesAfterPurchaseDateChange();
          }
        });
      },
      
      enterEditMode(item) {
        this.isEditMode = true;
        this.editingItemId = item.id;
        // Set each form field individually to ensure reactivity
        this.form.productName = item.productName || '';
        this.form.retailer = item.retailer || '';
        this.form.brand = item.brand || '';
        this.form.modelNumber = item.modelNumber || '';
        this.form.serialNumber = item.serialNumber || '';
        this.form.purchaseDate = item.purchaseDate || '';
        this.form.price = item.price || '';
        this.form.quantity = item.quantity || 1;
        this.form.link = item.link || '';
        this.form.warrantyExpiry = item.warrantyExpiry || '';
        this.form.returnDeadline = item.returnDeadline || '';
        this.form.returnPolicy = item.returnPolicy || '';
        this.form.taxDeductible = this.ensureBoolean(item.taxDeductible);
        this.form.tags = item.tags || '';
        this.form.notes = item.notes || '';
        console.log('Entered edit mode with item:', item);
        console.log('Form retailer set to:', this.form.retailer);
        console.log('Form brand set to:', this.form.brand);
      },

      // Check if selected retailer is also a brand (using is_brand flag from API)
      get isBrandRetailer() {
        if (!this.form.retailer) return false;
        const retailer = this.retailers.find(r => r.name === this.form.retailer);
        console.log('Checking isBrandRetailer:', this.form.retailer, 'found:', retailer, 'is_brand:', retailer?.is_brand);
        return retailer && retailer.is_brand;
      },

      // Handle retailer selection change
      onRetailerChange() {
        if (this.isBrandRetailer) {
          // Auto-fill brand with retailer name and keep it disabled
          this.form.brand = this.form.retailer;
        } else {
          // Clear brand if retailer is not a brand (unless in edit mode)
          if (!this.isEditMode) {
            this.form.brand = '';
          }
        }
      },

      validateDatesAfterPurchaseDateChange() {
        // Check if warranty expiry date is before the new purchase date
        if (this.form.warrantyExpiry && this.form.warrantyExpiry < this.form.purchaseDate) {
          // Clear the warranty expiry date since it's invalid
          this.form.warrantyExpiry = '';
          window.AdminApp.notificationManager.warning('Warranty expiry date was cleared because it was before the new purchase date');
        }

        // Check if return deadline is before the new purchase date
        if (this.form.returnDeadline && this.form.returnDeadline < this.form.purchaseDate) {
          // Clear the return deadline since it's invalid
          this.form.returnDeadline = '';
          window.AdminApp.notificationManager.warning('Return deadline was cleared because it was before the new purchase date');
        }
      },

      // Helper method to ensure boolean values are properly handled
      ensureBoolean(value) {
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'number') {
          return value !== 0;
        }
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      },

      async loadRetailers() {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const response = await fetch(`${apiUrl}/retailers/`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          this.retailers = data.items || [];
        } catch (error) {
          console.error('Error loading retailers:', error);
          this.retailers = [];
        }
      },

      async loadBrands() {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const response = await fetch(`${apiUrl}/brands/`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          this.brands = data.items || [];
        } catch (error) {
          console.error('Error loading brands:', error);
          this.brands = [];
        }
      },

      resetForm() {
        this.form = {
          productName: '',
          retailer: '',
          brand: '',
          modelNumber: '',
          serialNumber: '',
          purchaseDate: '',
          price: '',
          quantity: 1,
          link: '',
          warrantyExpiry: '',
          returnDeadline: '',
          returnPolicy: '',
          taxDeductible: false,
          tags: '',
          notes: ''
        };
        this.isEditMode = false;
        this.editingItemId = null;
      },

      savePurchase() {
        if (!this.form.productName.trim()) {
          window.AdminApp.notificationManager.warning('Please enter a product name');
          return;
        }

        if (!this.form.retailer.trim()) {
          window.AdminApp.notificationManager.warning('Please select a retailer');
          return;
        }

        if (!this.form.brand.trim()) {
          window.AdminApp.notificationManager.warning('Please enter a brand');
          return;
        }

        if (!this.form.purchaseDate) {
          window.AdminApp.notificationManager.warning('Please enter a purchase date');
          return;
        }

        if (!this.form.price) {
          window.AdminApp.notificationManager.warning('Please enter a price');
          return;
        }

        // Validate warranty date is not before purchase date
        if (this.form.warrantyExpiry && this.form.warrantyExpiry < this.form.purchaseDate) {
          window.AdminApp.notificationManager.warning('Warranty expiry date cannot be before purchase date');
          return;
        }

        // Validate return deadline is not before purchase date
        if (this.form.returnDeadline && this.form.returnDeadline < this.form.purchaseDate) {
          window.AdminApp.notificationManager.warning('Return deadline cannot be before purchase date');
          return;
        }

        const purchase = {
          productName: this.form.productName,
          retailer: this.form.retailer,
          brand: this.form.brand,
          modelNumber: this.form.modelNumber,
          serialNumber: this.form.serialNumber,
          purchaseDate: this.form.purchaseDate,
          price: parseFloat(this.form.price),
          quantity: parseInt(this.form.quantity) || 1,
          link: this.form.link,
          warrantyExpiry: this.form.warrantyExpiry || null,
          returnDeadline: this.form.returnDeadline || null,
          returnPolicy: this.form.returnPolicy,
          taxDeductible: this.form.taxDeductible,
          tags: this.form.tags,
          notes: this.form.notes,
          createdAt: new Date().toISOString()
        };

        console.log('New purchase created:', purchase);

        // Send data to backend API
        this.submitPurchaseToAPI(purchase);
      },

      async getOrCreateRetailer(apiUrl, retailerName) {
        // Check if retailer exists
        let retailer = this.retailers.find(r => r.name.toLowerCase() === retailerName.toLowerCase());
        if (retailer) return retailer.id;
        
        // Create new retailer
        const response = await fetch(`${apiUrl}/retailers/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: retailerName, url: '' })
        });
        if (!response.ok) throw new Error('Failed to create retailer');
        const newRetailer = await response.json();
        this.retailers.push(newRetailer);
        return newRetailer.id;
      },

      async getOrCreateBrand(apiUrl, brandName) {
        // Check if brand exists
        let brand = this.brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (brand) return brand.id;
        
        // Create new brand
        const response = await fetch(`${apiUrl}/brands/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: brandName, url: '' })
        });
        if (!response.ok) throw new Error('Failed to create brand');
        const newBrand = await response.json();
        this.brands.push(newBrand);
        return newBrand.id;
      },

      async submitPurchaseToAPI(purchase) {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          
          // Get or create retailer and brand IDs
          const retailerId = await this.getOrCreateRetailer(apiUrl, purchase.retailer);
          const brandId = await this.getOrCreateBrand(apiUrl, purchase.brand);
          
          // Prepare the payload according to backend schema
          // Dates are sent as YYYY-MM-DD strings without time component
          const payload = {
            product_name: purchase.productName,
            price: purchase.price,
            purchase_date: purchase.purchaseDate,
            retailer_id: retailerId,
            brand_id: brandId,
            status: 'RECEIVED',
            notes: purchase.notes,
            tax_deductible: this.ensureBoolean(purchase.taxDeductible) ? 1 : 0,
            warranty_expiry: purchase.warrantyExpiry || null,
            model_number: purchase.modelNumber || null,
            serial_number: purchase.serialNumber || null,
            quantity: parseInt(purchase.quantity) || 1,
            link: purchase.link || null,
            return_deadline: purchase.returnDeadline || null,
            return_policy: purchase.returnPolicy || null,
            tags: purchase.tags || null
          };

          const isUpdate = this.isEditMode && this.editingItemId;
          const url = isUpdate
            ? `${apiUrl}/purchases/${this.editingItemId}/`
            : `${apiUrl}/purchases/`;
          const method = isUpdate ? 'PUT' : 'POST';

          const response = await fetch(url, {
            method: method,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
          }

          const savedPurchase = await response.json();
          console.log('Purchase saved to API:', savedPurchase);

          const message = isUpdate
            ? `Purchase "${this.form.productName}" updated successfully!`
            : `Purchase "${this.form.productName}" created successfully!`;

          // Close the modal programmatically
          const modalEl = document.getElementById('newItemModal');
          if (modalEl) {
            const modal = Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }
          
          this.resetForm();

          // Show success notification
          window.AdminApp.notificationManager.success(message);

          // Refresh the data without page reload
          setTimeout(async () => {
            console.log('Refreshing data after purchase...');
            
            // Refresh dashboard data if on dashboard page
            const isDashboard = document.querySelector('[data-page="dashboard"]');
            console.log('Is dashboard:', !!isDashboard, 'dashboardManager:', !!window.dashboardManager);
            
            if (window.dashboardManager && isDashboard) {
              console.log('Refreshing dashboard data...');
              await window.dashboardManager.loadDashboardData();
              console.log('Dashboard data refreshed');
            }
            
            // Refresh inventory data if on inventory page
            if (window.location.pathname.includes('inventory')) {
              console.log('Refreshing inventory data...');
              // Dispatch event to trigger inventory refresh
              window.dispatchEvent(new CustomEvent('refresh-inventory'));
            }
          }, 1000);
        } catch (error) {
          console.error('Error saving purchase:', error);
          window.AdminApp.notificationManager.error(`Failed to save purchase: ${error.message}`);
        }
      }
    }));

    // View Purchase Details
    Alpine.data('viewPurchaseDetails', () => ({
      item: {
        productName: '',
        retailer: '',
        brand: '',
        modelNumber: '',
        serialNumber: '',
        purchaseDate: '',
        price: '',
        quantity: 1,
        link: '',
        warrantyExpiry: '',
        returnDeadline: '',
        returnPolicy: '',
        taxDeductible: false,
        tags: '',
        notes: ''
      },

      init() {
        // Listen for the custom event to set item data
        window.addEventListener('show-view-details', (e) => {
          if (e.detail && e.detail.item) {
            this.setItem(e.detail.item);
          }
        });
      },

      setItem(itemData) {
        this.item = { ...itemData };
      },

      editPurchaseItem() {
        // Trigger edit from view modal
        // First dispatch event to notify inventory table to enter edit mode
        window.dispatchEvent(new CustomEvent('edit-purchase', {
          detail: { item: this.item }
        }));

        // Then close the view modal and open the edit modal
        setTimeout(() => {
          const viewModalEl = document.getElementById('viewDetailsModal');
          if (viewModalEl) {
            // Use the imported Modal class instead of global bootstrap
            const modal = Modal.getInstance(viewModalEl);
            if (modal) {
              modal.hide();
            } else {
              // Fallback: manually hide the modal
              const bsModal = new Modal(viewModalEl);
              bsModal.hide();
            }

            // Show the inventory modal for editing after a short delay
            setTimeout(() => {
              const inventoryModalEl = document.getElementById('inventoryModal');
              if (inventoryModalEl) {
                const inventoryModal = Modal.getInstance(inventoryModalEl) || new Modal(inventoryModalEl);
                inventoryModal.show();
              }
            }, 300);
          }
        }, 150);
      }
    }));

    // Register page-specific Alpine components
    registerSettingsComponent();
    registerInventoryComponent();

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
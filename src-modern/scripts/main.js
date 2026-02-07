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
      // Tag input functionality
      tagsArray: [],
      currentTagInput: '',
      isEditMode: false,
      isViewMode: false,  // Added missing property
      editingItemId: null,
      retailers: [],
      brands: [],
      
      // Initialize files arrays with defaults to prevent undefined errors
      uploadedFiles: [],
      tempFiles: [],
      pendingFiles: [],
      filesToDelete: [],

      init() {
        this.resetForm();

        // Ensure files arrays are initialized
        this.uploadedFiles = this.uploadedFiles || [];
        this.tempFiles = this.tempFiles || [];
        this.pendingFiles = this.pendingFiles || [];
        this.filesToDelete = this.filesToDelete || [];

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
      
      async enterEditMode(item) {
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

        // Initialize tags array from form data
        this.initTagsFromForm();

        // Load existing files for this purchase
        await this.loadFilesForPurchase(item.id);

        // Clear any staged deletions and temporary files from previous sessions
        this.filesToDelete = [];
        this.tempFiles = [];
        this.pendingFiles = [];
      },

      // Load files for a specific purchase
      async loadFilesForPurchase(purchaseId) {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const response = await fetch(`${apiUrl}/files/${purchaseId}/`);

          if (!response.ok) {
            if (response.status === 404) {
              // If no files exist for this purchase, return empty array
              this.uploadedFiles = [];
              return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          this.uploadedFiles = data;
        } catch (error) {
          console.error('Error loading files for purchase:', error);
          this.uploadedFiles = [];
        }
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
        this.uploadedFiles = [];
        this.tempFiles = []; // Clear temp files (new files not yet saved)
        this.pendingFiles = [];
        this.filesToDelete = []; // Clear staged deletions
        // Reset tag input
        this.tagsArray = [];
        this.currentTagInput = '';
      },

      // Tag input methods
      addTagFromInput() {
        if (this.currentTagInput.trim()) {
          const newTag = this.currentTagInput.trim();
          // Prevent duplicate tags
          if (!this.tagsArray.includes(newTag)) {
            this.tagsArray.push(newTag);
          }
          this.currentTagInput = '';
          
          // Update the form tags field to be a comma-separated string
          this.updateTagsField();
        }
      },

      removeTag(tagToRemove) {
        this.tagsArray = this.tagsArray.filter(tag => tag !== tagToRemove);
        this.updateTagsField();
      },

      updateTagsField() {
        // Join tags with commas for form submission
        this.form.tags = this.tagsArray.join(',');
      },

      // Initialize tags from form data (when editing)
      initTagsFromForm() {
        if (this.form.tags) {
          // Split the tags string by commas and trim whitespace
          this.tagsArray = this.form.tags.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '');
        } else {
          this.tagsArray = [];
        }
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
          
          // Validate purchase date is not in the future
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          // Ensure purchaseDate is in the correct format (YYYY-MM-DD)
          let purchaseDateInput = purchase.purchaseDate;
          if (purchaseDateInput && typeof purchaseDateInput === 'string' && purchaseDateInput.includes('/')) {
            // Convert MM/DD/YYYY to YYYY-MM-DD format if needed
            const dateParts = purchaseDateInput.split('/');
            if (dateParts.length === 3) {
              purchaseDateInput = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            }
          }
          const purchaseDate = new Date(purchaseDateInput);
          if (purchaseDate > today) {
            window.AdminApp.notificationManager.error('Purchase date cannot be in the future');
            return;
          }

          // Get or create retailer and brand IDs
          const retailerId = await this.getOrCreateRetailer(apiUrl, purchase.retailer);
          const brandId = await this.getOrCreateBrand(apiUrl, purchase.brand);
          
          // Prepare the payload according to backend schema
          // Dates are sent as YYYY-MM-DD strings without time component
          const payload = {
            product_name: purchase.productName,
            price: Math.abs(parseFloat(purchase.price)) || 1,
            purchase_date: purchaseDateInput, // Use the properly formatted date
            retailer_id: retailerId,
            brand_id: brandId,
            notes: (purchase.notes && purchase.notes !== 'N/A' && purchase.notes.trim() !== '') ? purchase.notes : null,
            tax_deductible: this.ensureBoolean(purchase.taxDeductible) ? 1 : 0,
            warranty_expiry: (purchase.warrantyExpiry && purchase.warrantyExpiry !== 'N/A' && purchase.warrantyExpiry.trim() !== '') ? purchase.warrantyExpiry : null,
            model_number: (purchase.modelNumber && purchase.modelNumber !== 'N/A' && purchase.modelNumber.trim() !== '') ? purchase.modelNumber : null,
            serial_number: (purchase.serialNumber && purchase.serialNumber !== 'N/A' && purchase.serialNumber.trim() !== '') ? purchase.serialNumber : null,
            quantity: parseInt(purchase.quantity) || 1,
            link: (purchase.link && purchase.link !== 'N/A' && purchase.link.trim() !== '') ? purchase.link : null,
            return_deadline: (purchase.returnDeadline && purchase.returnDeadline !== 'N/A' && purchase.returnDeadline.trim() !== '') ? purchase.returnDeadline : null,
            return_policy: (purchase.returnPolicy && purchase.returnPolicy !== 'N/A' && purchase.returnPolicy.trim() !== '') ? purchase.returnPolicy : null,
            tags: (purchase.tags && purchase.tags !== 'N/A' && purchase.tags.trim() !== '') ? purchase.tags : null
          };
          
          console.log('Submitting purchase payload:', payload);

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
            let errorData = {};
            try {
              errorData = await response.json();
            } catch (e) {
              // If response is not JSON, try to get text
              try {
                const errorText = await response.text();
                console.error('Error response text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
              } catch (textError) {
                // If we can't parse response at all, just use status
                throw new Error(`HTTP error! status: ${response.status}`);
              }
            }

            // Safely handle the error data to avoid [object Object] errors
            try {
              // Handle the case where errorData is an array of validation errors
              if (Array.isArray(errorData)) {
                const validationErrors = errorData.map(err => {
                  // Handle different possible structures of validation errors
                  if (typeof err === 'string') return err;
                  if (err.msg) return err.msg;
                  if (err.detail) return err.detail;
                  if (err.input) return err.input;
                  if (err.loc && err.type) return `${err.loc.join('.')}: ${err.type}`;
                  if (typeof err === 'object') {
                    // Try to extract meaningful information from the error object
                    const keys = Object.keys(err);
                    if (keys.length > 0) {
                      return keys.map(key => `${key}: ${JSON.stringify(err[key])}`).join(', ');
                    }
                    return JSON.stringify(err);
                  }
                  return String(err);
                }).join('; ');
                throw new Error(`Validation error: ${validationErrors}`);
              }

              // Handle errorData if it's an object with different possible properties
              if (typeof errorData === 'object' && errorData !== null) {
                // Check if errorData has a detail property that might be an array
                if (errorData.detail && Array.isArray(errorData.detail)) {
                  const detailErrors = errorData.detail.map(detailErr => {
                    if (typeof detailErr === 'string') return detailErr;
                    if (detailErr.msg) return detailErr.msg;
                    if (detailErr.loc && detailErr.type) return `${detailErr.loc.join('.')}: ${detailErr.type}`;
                    return JSON.stringify(detailErr);
                  }).join('; ');
                  throw new Error(`Validation error: ${detailErrors}`);
                }
                
                throw new Error(errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData) || `HTTP error! status: ${response.status}`);
              }
              
              // If errorData is a string or other primitive
              throw new Error(errorData || `HTTP error! status: ${response.status}`);
            } catch (errorProcessingError) {
              // If there's an error processing the error data, fall back to basic error
              console.error('Error processing error response:', errorProcessingError);
              throw new Error(`Error processing response: ${JSON.stringify(errorData)} | Status: ${response.status}`);
            }
          }

          const savedPurchase = await response.json();
          console.log('Purchase saved to API:', savedPurchase);

          // Update the editingItemId to the saved purchase ID if it's a new purchase
          if (!isUpdate) {
            this.editingItemId = savedPurchase.id;
            this.isEditMode = true; // Now we're in edit mode since the purchase exists
          }

          const message = isUpdate
            ? `Purchase "${this.form.productName}" updated successfully!`
            : `Purchase "${this.form.productName}" created successfully!`;

          // Upload any pending files BEFORE closing modal (modal close destroys Alpine component)
          console.log('Uploading pending files:', this.pendingFiles?.length || 0);
          if (this.pendingFiles && this.pendingFiles.length > 0) {
            for (const pendingFile of this.pendingFiles) {
              console.log('Uploading pending file:', pendingFile.fileName);
              await this.uploadFile(pendingFile.file, pendingFile.fileType);
            }
            this.pendingFiles = []; // Clear pending files
          }

          // Upload any temporary files that were added before the purchase was saved
          console.log('Uploading temp files:', this.tempFiles?.length || 0, 'for purchase:', this.editingItemId);
          console.log('Temp files details:', this.tempFiles?.map(f => ({name: f.fileName, size: f.fileSize, hasFileObj: !!f.file})));
          if (this.tempFiles && this.tempFiles.length > 0) {
            for (const tempFile of this.tempFiles) {
              console.log('Uploading temp file:', tempFile.fileName, 'type:', tempFile.fileType, 'fileObj:', tempFile.file?.name, tempFile.file?.size);
              if (!tempFile.file) {
                console.error('No file object found for:', tempFile.fileName);
                continue;
              }
              await this.uploadFile(tempFile.file, tempFile.fileType);
            }
            this.tempFiles = []; // Clear temporary files
          }

          // Close the modal programmatically
          // Try inventoryModal first (inventory page), then newItemModal (dashboard)
          const inventoryModalEl = document.getElementById('inventoryModal');
          const newItemModalEl = document.getElementById('newItemModal');
          
          if (inventoryModalEl) {
            const modal = Modal.getInstance(inventoryModalEl);
            if (modal) modal.hide();
          } else if (newItemModalEl) {
            const modal = Modal.getInstance(newItemModalEl);
            if (modal) modal.hide();
          }

          // Show success notification
          window.AdminApp.notificationManager.success(message);

          // Delete files marked for deletion (staged deletions)
          if (this.filesToDelete && this.filesToDelete.length > 0) {
            console.log('Deleting staged files:', this.filesToDelete);
            for (const fileToDelete of this.filesToDelete) {
              try {
                await this.removeFile(fileToDelete.id);
              } catch (error) {
                console.error(`Failed to delete file ${fileToDelete.id}:`, error);
              }
            }
            this.filesToDelete = []; // Clear staged deletions
          }

          // Refresh the data without page reload (immediate)
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

          // If we're in edit mode and have files to upload, upload them now
          if (isUpdate && this.uploadedFiles.length > 0) {
            console.log('Updating files for purchase...');
            // Note: File uploads after purchase update would require a different approach
            // since the files are already associated with the purchase during upload
          }
        } catch (error) {
          console.error('Error saving purchase:', error);
          window.AdminApp.notificationManager.error(`Failed to save purchase: ${error.message}`);
        }
      },

      // Handle file upload
      handleFileUpload(event, fileType) {
        const files = Array.from(event.target.files);
        console.log('Files selected:', files.length, 'type:', fileType);
        if (files.length === 0) return;

        for (const file of files) {
          // Add file to temporary storage with preview
          const filePreview = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file: file,
            fileName: file.name,
            fileType: fileType,
            fileSize: file.size,
            mimeType: file.type,
            previewUrl: null, // Will be set below
            uploadStatus: 'pending' // 'pending', 'uploading', 'uploaded', 'error'
          };

          // Generate preview based on file type
          if (file.type.startsWith('image/')) {
            // For images, use object URL directly
            filePreview.previewUrl = URL.createObjectURL(file);
          }
          // Note: PDF thumbnails not supported - shows icon instead

          // Add to temporary files array
          if (!this.tempFiles) {
            this.tempFiles = [];
          }
          this.tempFiles.push(filePreview);
          console.log('Added to tempFiles:', file.name, 'tempFiles count:', this.tempFiles.length);
        }

        // Clear the input to allow re-uploading the same file
        event.target.value = '';
      },

      // Sanitize filename for upload
      sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9.-]/g, '_');
      },

      // Upload a single file
      async uploadFile(file, fileType) {
        try {
          console.log('uploadFile called:', file?.name, 'type:', fileType, 'size:', file?.size);
          
          // Create a new File object with sanitized name (like DumbSpends does)
          const sanitizedName = this.sanitizeFileName(file.name);
          const fileToUpload = new File([file], sanitizedName, { type: file.type });
          console.log('Created sanitized file:', fileToUpload.name, 'size:', fileToUpload.size);
          
          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('file_type', fileType);

          const apiUrl = window.APP_CONFIG?.API_URL || '/api';

          // Use the current editingItemId, which should be set after purchase is saved
          const purchaseId = this.editingItemId;
          console.log('Uploading to purchase:', purchaseId);

          if (!purchaseId) {
            console.error('No purchaseId available for file upload');
            window.AdminApp.notificationManager.warning('Purchase not saved yet. File will be uploaded after saving purchase.');
            return;
          }

          const response = await fetch(`${apiUrl}/files/${purchaseId}/`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            if (response.status === 404) {
              // If purchase doesn't exist, show a specific error
              throw new Error(`Purchase not found. Please save the purchase first before uploading files.`);
            }
            let errorData = {};
            try {
              errorData = await response.json();
            } catch (e) {
              // If response is not JSON, try to get text
              try {
                const errorText = await response.text();
                console.error('Error response text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
              } catch (textError) {
                // If we can't parse response at all, just use status
                throw new Error(`HTTP error! status: ${response.status}`);
              }
            }

            // Handle the case where errorData is an array of validation errors
            if (Array.isArray(errorData)) {
              const validationErrors = errorData.map(err => {
                // Handle different possible structures of validation errors
                if (typeof err === 'string') return err;
                if (err.msg) return err.msg;
                if (err.detail) return err.detail;
                if (err.input) return err.input;
                if (err.loc && err.type) return `${err.loc.join('.')}: ${err.type}`;
                if (typeof err === 'object') return JSON.stringify(err);
                return String(err);
              }).join('; ');
              throw new Error(`Validation error: ${validationErrors}`);
            }

            // Handle errorData if it's an object with different possible properties
            if (typeof errorData === 'object' && errorData !== null) {
              throw new Error(errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData) || `HTTP error! status: ${response.status}`);
            }
            
            // If errorData is a string or other primitive
            throw new Error(errorData || `HTTP error! status: ${response.status}`);
          }

          const uploadedFile = await response.json();
          console.log('File uploaded successfully:', uploadedFile);
          // Add to uploaded files if array exists
          if (!this.uploadedFiles) {
            this.uploadedFiles = [];
          }
          this.uploadedFiles.push(uploadedFile);
          return uploadedFile;
        } catch (error) {
          console.error('Error uploading file:', error);
          window.AdminApp.notificationManager.error(`Failed to upload file: ${error.message}`);
          throw error;
        }
      },

      // Remove a file
      async removeFile(fileId) {
        try {
          const fileToRemove = this.uploadedFiles.find(f => f.id === fileId);
          if (!fileToRemove) return;

          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const purchaseId = this.editingItemId;

          if (!purchaseId) {
            window.AdminApp.notificationManager.warning('Purchase ID not available');
            return;
          }

          const response = await fetch(`${apiUrl}/files/${purchaseId}/${fileId}/`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            let errorData = {};
            try {
              errorData = await response.json();
            } catch (e) {
              // If response is not JSON, try to get text
              try {
                const errorText = await response.text();
                console.error('Error response text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
              } catch (textError) {
                // If we can't parse response at all, just use status
                throw new Error(`HTTP error! status: ${response.status}`);
              }
            }

            // Safely handle the error data to avoid [object Object] errors
            try {
              // Handle the case where errorData is an array of validation errors
              if (Array.isArray(errorData)) {
                const validationErrors = errorData.map(err => {
                  // Handle different possible structures of validation errors
                  if (typeof err === 'string') return err;
                  if (err.msg) return err.msg;
                  if (err.detail) return err.detail;
                  if (err.input) return err.input;
                  if (err.loc && err.type) return `${err.loc.join('.')}: ${err.type}`;
                  if (typeof err === 'object') {
                    // Try to extract meaningful information from the error object
                    const keys = Object.keys(err);
                    if (keys.length > 0) {
                      return keys.map(key => `${key}: ${JSON.stringify(err[key])}`).join(', ');
                    }
                    return JSON.stringify(err);
                  }
                  return String(err);
                }).join('; ');
                throw new Error(`Validation error: ${validationErrors}`);
              }

              // Handle errorData if it's an object with different possible properties
              if (typeof errorData === 'object' && errorData !== null) {
                // Check if errorData has a detail property that might be an array
                if (errorData.detail && Array.isArray(errorData.detail)) {
                  const detailErrors = errorData.detail.map(detailErr => {
                    if (typeof detailErr === 'string') return detailErr;
                    if (detailErr.msg) return detailErr.msg;
                    if (detailErr.loc && detailErr.type) return `${detailErr.loc.join('.')}: ${detailErr.type}`;
                    return JSON.stringify(detailErr);
                  }).join('; ');
                  throw new Error(`Validation error: ${detailErrors}`);
                }
                
                throw new Error(errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData) || `HTTP error! status: ${response.status}`);
              }
              
              // If errorData is a string or other primitive
              throw new Error(errorData || `HTTP error! status: ${response.status}`);
            } catch (errorProcessingError) {
              // If there's an error processing the error data, fall back to basic error
              console.error('Error processing error response:', errorProcessingError);
              throw new Error(`Error processing response: ${JSON.stringify(errorData)} | Status: ${response.status}`);
            }
          }

          // Remove from local array
          this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
        } catch (error) {
          console.error('Error removing file:', error);
          window.AdminApp.notificationManager.error(`Failed to remove file: ${error.message}`);
        }
      },

      // Remove a temporary file from preview
      removeTempFile(fileId) {
        if (this.tempFiles) {
          // Revoke the preview URL to free memory
          const fileToRemove = this.tempFiles.find(f => f.id === fileId);
          if (fileToRemove && fileToRemove.previewUrl) {
            URL.revokeObjectURL(fileToRemove.previewUrl);
          }

          // Remove from temp files array
          this.tempFiles = this.tempFiles.filter(f => f.id !== fileId);
        }
      },

      // Format file size for display
      formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      },

      // Get all files (both temp and uploaded) filtered by type
      // Excludes files marked for deletion
      getFilesByType(fileType) {
        if (!fileType) return [];
        const type = fileType.toLowerCase();
        // Ensure arrays exist and filter safely
        const tempFiles = Array.isArray(this.tempFiles) ? this.tempFiles : [];
        const uploadedFiles = Array.isArray(this.uploadedFiles) ? this.uploadedFiles : [];
        const filesToDelete = Array.isArray(this.filesToDelete) ? this.filesToDelete : [];
        
        const temp = tempFiles.filter(f => f && f.fileType === type);
        // Exclude uploaded files that are marked for deletion
        const filesToDeleteIds = filesToDelete.map(f => f && f.id).filter(Boolean);
        const uploaded = uploadedFiles.filter(f => f && f.file_type === type && !filesToDeleteIds.includes(f.id));
        return [...temp, ...uploaded];
      },

      // Check if any files exist for a specific type
      hasFilesOfType(fileType) {
        return this.getFilesByType(fileType).length > 0;
      },

      // Check if file is an image
      isImageFile(file) {
        const mimeType = file.mimeType || file.mime_type || '';
        return mimeType.startsWith('image/');
      },

      // Check if file is a PDF
      isPdfFile(file) {
        const mimeType = file.mimeType || file.mime_type || '';
        const filename = file.filename || file.fileName || '';
        return mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
      },

      // Get file icon class based on file type
      getFileIcon(file) {
        const mimeType = file.mimeType || file.mime_type || '';
        const filename = file.filename || file.fileName || '';
        
        if (mimeType.startsWith('image/') || filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return 'bi bi-file-earmark-image text-success';
        }
        if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
          return 'bi bi-file-earmark-pdf text-danger';
        }
        if (filename.match(/\.(doc|docx)$/i)) {
          return 'bi bi-file-earmark-word text-primary';
        }
        if (filename.match(/\.(xls|xlsx)$/i)) {
          return 'bi bi-file-earmark-excel text-success';
        }
        return 'bi bi-file-earmark text-secondary';
      },

      // Get background color for file icon
      getFileColor(file) {
        const mimeType = file.mimeType || file.mime_type || '';
        const filename = file.filename || file.fileName || '';
        
        if (mimeType.startsWith('image/') || filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return '#d1e7dd'; // Light green for images
        }
        if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
          return '#f8d7da'; // Light red for PDFs
        }
        if (filename.match(/\.(doc|docx)$/i)) {
          return '#cfe2ff'; // Light blue for Word
        }
        return '#e2e3e5'; // Gray for others
      },

      // Get preview URL for a file
      getFilePreviewUrl(file) {
        // For temp files, use the previewUrl (object URL)
        if (file.previewUrl) {
          return file.previewUrl;
        }
        // For uploaded files, construct the download URL
        if (file.id) {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          return `${apiUrl}/files/file/${file.id}/download/`;
        }
        return '';
      },

      // Open file in browser's native viewer (new tab)
      openFileViewer(file) {
        const fileUrl = this.getFilePreviewUrl(file);
        if (fileUrl) {
          window.open(fileUrl, '_blank');
        }
      },

      // Remove any file (temp or uploaded)
      // For uploaded files: mark for deletion (staged, will delete on save)
      // For temp files: remove immediately (not saved yet)
      removeAnyFile(file) {
        if (file.id && !file.id.startsWith('temp_')) {
          // This is an uploaded file - mark for deletion (staged)
          if (!this.filesToDelete) {
            this.filesToDelete = [];
          }
          this.filesToDelete.push(file);
        } else {
          // This is a temp file - remove immediately
          this.removeTempFile(file.id);
        }
      },
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
        taxDeductible: undefined,
        tags: '',
        notes: '',
        files: [],
        receipts: [],
        manuals: [],
        warranties: [],
        photos: []
      },

      init() {
        // Listen for the custom event to set item data
        window.addEventListener('show-view-details', (e) => {
          if (e.detail && e.detail.item) {
            this.setItem(e.detail.item);
            // Load files for this purchase
            if (e.detail.item.id) {
              this.loadFiles(e.detail.item.id);
            }
          }
        });
      },

      setItem(itemData) {
        this.item = { ...itemData };
      },

      async loadFiles(purchaseId) {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const response = await fetch(`${apiUrl}/files/${purchaseId}/`);

          if (!response.ok) {
            console.warn(`Files API returned status: ${response.status}`);
            this.item.files = []; // Set to empty array if no files found
            this.item.receipts = [];
            this.item.manuals = [];
            this.item.warranties = [];
            return;
          }

          const data = await response.json();
          // Ensure data has the expected structure
          const allFiles = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
          
          // Store all files without filtering images
          this.item.files = allFiles;

          // Create categorized file groups based on file_type only
          this.item.receipts = this.item.files.filter(file =>
            (file.file_type && file.file_type.toLowerCase() === 'receipt')
          );

          this.item.manuals = this.item.files.filter(file =>
            (file.file_type && file.file_type.toLowerCase() === 'manual')
          );

          this.item.warranties = this.item.files.filter(file =>
            (file.file_type && file.file_type.toLowerCase() === 'warranty')
          );

          this.item.photos = this.item.files.filter(file =>
            (file.file_type && file.file_type.toLowerCase() === 'photo')
          );

          console.log('Loaded files for purchase:', this.item.files);
          console.log('Categorized files - Receipts:', this.item.receipts, 'Manuals:', this.item.manuals, 'Warranties:', this.item.warranties, 'Photos:', this.item.photos);
        } catch (error) {
          console.error('Error loading files:', error);
          this.item.files = []; // Ensure files array is empty if there's an error
          this.item.receipts = [];
          this.item.manuals = [];
          this.item.warranties = [];
        }
      },

      // Format file name to show first 8 chars + .. + extension
      getShortenedFileName(filename) {
        if (!filename) return '';
        
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex === -1) {
          // No extension, just truncate to 8 chars and add ..
          return filename.length > 8 ? filename.substring(0, 8) + '..' : filename;
        }
        
        const namePart = filename.substring(0, lastDotIndex);
        const extension = filename.substring(lastDotIndex);
        
        if (namePart.length > 8) {
          return namePart.substring(0, 8) + '..' + extension;
        }
        
        return filename;
      },

      // Open image preview in a modal
      openImagePreview(file) {
        // Create a modal to show the full-size image
        const modalHtml = `
          <div class="modal fade" id="imagePreviewModal" tabindex="-1" style="display: none;" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-xl modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">${file.filename}</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                  <img src="/api/files/${file.id}/preview/" 
                       alt="${file.filename}"
                       class="img-fluid"
                       style="max-height: 80vh; object-fit: contain;">
                </div>
                <div class="modal-footer">
                  <a href="/api/files/${file.id}/download/" class="btn btn-primary">
                    <i class="bi bi-download me-2"></i>Download
                  </a>
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Remove any existing preview modal
        const existingModal = document.getElementById('imagePreviewModal');
        if (existingModal) {
          existingModal.remove();
        }
        
        // Add the new modal to the body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show the modal
        const imagePreviewModal = new Modal(document.getElementById('imagePreviewModal'));
        imagePreviewModal.show();
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
      },

      // Format file size for display
      formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
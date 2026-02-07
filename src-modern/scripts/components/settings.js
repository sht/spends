import Alpine from 'alpinejs';

export function registerSettingsComponent() {
  Alpine.data('settingsComponent', () => ({
    // UI State
    sidebarVisible: false,
    activeSection: 'general',
    confirmReset: false,

    // Settings Data (maintains original structure for backward compatibility)
    settings: {
      // General Settings (DB-persisted: currencyCode, dateFormat)
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      currencyCode: 'USD',

      // Dashboard Card Visibility (localStorage only)
      cardVisibility: {
        totalAssetsValue: true,
        itemsCount: true,
        avgPrice: true,
        pendingWarranties: true,
        taxDeductible: true,
        expiredWarranties: true
      },

      // Notifications Settings (localStorage only)
      notifications: {
        desktop: true,
        email: true,
        sound: false,
        marketing: false
      },

      // Retailer Settings (localStorage only)
      retailers: []
    },

    // Navigation Sections
    sections: [
      {
        id: 'general',
        name: 'General',
        icon: 'bi-gear'
      },
      {
        id: 'dashboard',
        name: 'Dashboard',
        icon: 'bi-speedometer2'
      },
      {
        id: 'notifications',
        name: 'Notifications',
        icon: 'bi-bell'
      },
      {
        id: 'retailer',
        name: 'Retailer',
        icon: 'bi-shop'
      },
      {
        id: 'data-management',
        name: 'Data Management',
        icon: 'bi-database'
      }
    ],

    // Retailer Management
    newRetailerName: '',
    retailerList: [],

    // Data Management
    importFile: null,
    exportFormats: ['JSON', 'CSV'],

    async init() {
      // Get current theme from document or localStorage
      const currentTheme = document.documentElement.getAttribute('data-bs-theme') ||
                          localStorage.getItem('theme') || 'light';

      // Load settings: DB settings from API (primary), UI settings from localStorage
      await this.loadSettings();
      await this.loadRetailers();

      // Restore active section from URL hash AFTER loading, with nextTick to ensure Alpine reactivity
      this.$nextTick(() => {
        this.restoreActiveSection();
      });

      // Hide loading screen when settings page is ready
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 300);
    },

    restoreActiveSection() {
      // Check URL hash for section (e.g., #retailer)
      const hash = window.location.hash.replace('#', '');
      const validSections = ['general', 'dashboard', 'notifications', 'retailer', 'data-management'];

      if (hash && validSections.includes(hash)) {
        console.log('Setting activeSection to:', hash);
        this.activeSection = hash;
      }

      // Listen for hash changes (browser back/forward buttons)
      window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.replace('#', '');
        if (newHash && validSections.includes(newHash)) {
          console.log('Hash changed, setting activeSection to:', newHash);
          this.activeSection = newHash;
        }
      });
    },

    hideLoadingScreen() {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }
    },

    // Settings Management
    async loadSettings() {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';

      // 1. First load from localStorage as base
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          this.settings = { ...this.settings, ...parsed };
        } catch (error) {
          console.warn('Failed to load saved settings:', error);
        }
      }

      // 2. Override DB-persisted settings from API (API is the source of truth)
      try {
        const response = await fetch(`${apiUrl}/settings/`);
        if (response.ok) {
          const apiSettings = await response.json();
          // API returns snake_case, convert to camelCase
          this.settings.currencyCode = apiSettings.currency_code || this.settings.currencyCode;
          this.settings.dateFormat = apiSettings.date_format || this.settings.dateFormat;

          console.log('Loaded DB settings from API:', apiSettings);
        }
      } catch (error) {
        console.warn('Failed to load settings from API:', error);
      }
    },

    async saveSettings() {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';

      // 1. Save DB-persisted settings to API
      try {
        const response = await fetch(`${apiUrl}/settings/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency_code: this.settings.currencyCode,
            date_format: this.settings.dateFormat,

          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Saved DB settings to API');
      } catch (error) {
        console.error('Failed to save DB settings to API:', error);
        this.showNotification('Failed to save settings to server', 'error');
        return;
      }

      // 2. Save all settings to localStorage (for other components to access)
      try {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        console.log('Saved settings to localStorage');
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }

      this.showNotification('Settings saved successfully!', 'success');
    },

    setActiveSection(sectionId) {
      this.activeSection = sectionId;
      this.sidebarVisible = false;
      
      // Update URL hash without triggering page reload
      window.history.replaceState(null, null, `#${sectionId}`);
    },

    async loadRetailers() {
      try {
        // Get API URL from global variable or fallback to default
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';

        // Fetch both retailers and brands from the backend API
        const [retailersResponse, brandsResponse] = await Promise.all([
          fetch(`${apiUrl}/retailers/`),
          fetch(`${apiUrl}/brands/?limit=100`)
        ]);
        
        if (!retailersResponse.ok) throw new Error(`HTTP error! status: ${retailersResponse.status}`);
        
        const retailersData = await retailersResponse.json();
        const brandsData = brandsResponse.ok ? await brandsResponse.json() : { items: [] };
        
        // Create a set of brand names for quick lookup
        const brandNames = new Set(brandsData.items.map(b => b.name));
        const brandMap = new Map(brandsData.items.map(b => [b.name, b.id]));

        // Transform API response to match expected format
        this.retailerList = retailersData.items.map(retailer => ({
          id: retailer.id,
          name: retailer.name,
          is_brand: brandNames.has(retailer.name),
          brandId: brandMap.get(retailer.name) || null
        }));

        this.settings.retailers = this.retailerList;
      } catch (error) {
        console.error('Error loading retailers:', error);
        // Fallback to empty array if API fails
        this.retailerList = [];
        this.settings.retailers = [];
      }
    },

    // Retailer Management
    async addRetailer() {
      if (this.newRetailerName.trim()) {
        try {
          // Get API URL from global variable or fallback to default
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';

          // Add retailer to the backend API
          const response = await fetch(`${apiUrl}/retailers/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: this.newRetailerName,
              url: ''  // Could be enhanced to accept URL input
            })
          });

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const newRetailer = await response.json();

          // Add to local list
          this.retailerList.push({
            id: newRetailer.id,
            name: newRetailer.name,
            is_brand: false
          });

          this.settings.retailers = this.retailerList;
          this.newRetailerName = '';
          this.showNotification('Retailer added successfully!', 'success');
        } catch (error) {
          console.error('Error adding retailer:', error);
          this.showNotification('Failed to add retailer', 'error');
        }
      }
    },

    async removeRetailer(id) {
      try {
        // Get API URL from global variable or fallback to default
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        
        // Find the retailer to check if it's also a brand
        const retailer = this.retailerList.find(r => r.id === id);

        // Remove retailer from the backend API
        const response = await fetch(`${apiUrl}/retailers/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // If retailer was also a brand, delete the brand too
        if (retailer && retailer.is_brand && retailer.brandId) {
          try {
            await fetch(`${apiUrl}/brands/${retailer.brandId}`, {
              method: 'DELETE'
            });
          } catch (brandError) {
            console.warn('Failed to delete associated brand:', brandError);
          }
        }

        // Remove from local list
        this.retailerList = this.retailerList.filter(r => r.id !== id);
        this.settings.retailers = this.retailerList;
        this.showNotification('Retailer removed successfully!', 'success');
      } catch (error) {
        console.error('Error removing retailer:', error);
        this.showNotification('Failed to remove retailer', 'error');
      }
    },

    // Alias for removeRetailer to match HTML template
    deleteRetailer(id) {
      return this.removeRetailer(id);
    },

    async toggleRetailerBrand(retailer) {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      const newIsBrand = !retailer.is_brand;

      try {
        if (newIsBrand) {
          // Toggle turned ON - add to brands table
          const response = await fetch(`${apiUrl}/brands/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: retailer.name,
              url: ''
            })
          });

          if (response.ok) {
            const brandData = await response.json();
            retailer.is_brand = true;
            retailer.brandId = brandData.id; // Store brand ID for later deletion
            this.settings.retailers = this.retailerList;
            this.showNotification(`"${retailer.name}" added to Brands`, 'success');
          } else if (response.status === 409) {
            // Brand already exists (conflict)
            retailer.is_brand = true;
            this.settings.retailers = this.retailerList;
            this.showNotification(`"${retailer.name}" is already in Brands`, 'info');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
          // Toggle turned OFF - remove from brands table
          // First, we need to find the brand ID by name
          const brandsResponse = await fetch(`${apiUrl}/brands/?limit=100`);
          if (brandsResponse.ok) {
            const brandsData = await brandsResponse.json();
            const brand = brandsData.items.find(b => b.name === retailer.name);

            if (brand) {
              const deleteResponse = await fetch(`${apiUrl}/brands/${brand.id}`, {
                method: 'DELETE'
              });

              if (deleteResponse.ok) {
                retailer.is_brand = false;
                delete retailer.brandId;
                this.settings.retailers = this.retailerList;
                this.showNotification(`"${retailer.name}" removed from Brands`, 'success');
              } else {
                throw new Error(`Failed to delete brand: ${deleteResponse.status}`);
              }
            } else {
              // Brand not found, just update local state
              retailer.is_brand = false;
              delete retailer.brandId;
              this.settings.retailers = this.retailerList;
            }
          }
        }
      } catch (error) {
        console.error('Error toggling brand status:', error);
        this.showNotification('Failed to update brand status', 'error');
        // Revert the checkbox state on error
        retailer.is_brand = !newIsBrand;
        this.settings.retailers = this.retailerList;
      }
    },

    // Data Management
    exportData(format) {
      const data = {
        settings: this.settings,
        exportDate: new Date().toISOString(),
        format: format
      };

      let content, filename, mimeType;

      if (format === 'JSON') {
        content = JSON.stringify(data, null, 2);
        filename = `data_export_${new Date().getTime()}.json`;
        mimeType = 'application/json';
      } else if (format === 'CSV') {
        // Convert to CSV format
        content = this.convertToCSV(data);
        filename = `data_export_${new Date().getTime()}.csv`;
        mimeType = 'text/csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showNotification(`Data exported as ${format}!`, 'success');
    },

    convertToCSV(data) {
      let csv = 'Key,Value\n';
      const settings = data.settings;

      // Flatten the settings object
      const flattenObject = (obj, prefix = '') => {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              flattenObject(value, fullKey);
            } else {
              const val = Array.isArray(value) ? JSON.stringify(value) : value;
              csv += `"${fullKey}","${val}"\n`;
            }
          }
        }
      };

      flattenObject(settings);
      return csv;
    },

    handleFileImport(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          let importedData;

          if (file.name.endsWith('.json')) {
            importedData = JSON.parse(content);
            if (importedData.settings) {
              this.settings = { ...this.settings, ...importedData.settings };
              await this.saveSettings();
              this.showNotification('Data imported successfully from JSON!', 'success');
            }
          } else if (file.name.endsWith('.csv')) {
            this.showNotification('CSV import received. Manual parsing required.', 'info');
          }
        } catch (error) {
          this.showNotification('Failed to import file', 'error');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    },

    resetAllData() {
      this.confirmReset = true;
    },

    async confirmResetData() {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';

      // Reset DB settings via API
      try {
        await fetch(`${apiUrl}/settings/reset`, { method: 'POST' });
      } catch (error) {
        console.warn('Failed to reset DB settings:', error);
      }

      // Reset all settings to defaults
      localStorage.removeItem('appSettings');
      this.settings = {
        language: 'en',

        dateFormat: 'MM/DD/YYYY',
        currencyCode: 'USD',
        cardVisibility: {
          totalAssetsValue: true,
          itemsCount: true,
          avgPrice: true,
          pendingWarranties: true,
          taxDeductible: true,
          expiredWarranties: true
        },
        notifications: {
          desktop: true,
          email: true,
          sound: false,
          marketing: false
        },
        retailers: []
      };
      this.retailerList = [];
      this.confirmReset = false;
      this.showNotification('All data has been reset to defaults', 'success');
    },

    // Notification Helper
    showNotification(message, type) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      
      // Show actual toast notification if available
      if (window.AdminApp && window.AdminApp.notificationManager) {
        switch (type) {
          case 'success':
            window.AdminApp.notificationManager.success(message);
            break;
          case 'error':
            window.AdminApp.notificationManager.error(message);
            break;
          case 'warning':
            window.AdminApp.notificationManager.warning(message);
            break;
          case 'info':
            window.AdminApp.notificationManager.info(message);
            break;
          default:
            window.AdminApp.notificationManager.info(message);
        }
      }
    }
  }));
}

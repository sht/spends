import Alpine from 'alpinejs';

document.addEventListener('alpine:init', () => {
  Alpine.data('settingsComponent', () => ({
    // UI State
    sidebarVisible: false,
    activeSection: 'general',

    // Settings Data
    settings: {
      // General Settings
      language: 'en',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      currencyCode: 'USD',

      // Dashboard Card Visibility
      cardVisibility: {
        totalAssetsValue: true,
        itemsCount: true,
        avgPrice: true,
        pendingWarranties: true,
        taxDeductible: true,
        expiredWarranties: true
      },

      // Notifications Settings
      notifications: {
        desktop: true,
        email: true,
        sound: false,
        marketing: false
      },

      // Retailer Settings
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
    retailerList: [
      { id: 1, name: 'Amazon', isBrand: true },
      { id: 2, name: 'eBay', isBrand: true },
      { id: 3, name: 'Apple Store', isBrand: false },
      { id: 4, name: 'Walmart', isBrand: false }
    ],

    // Data Management
    importFile: null,
    exportFormats: ['JSON', 'CSV'],

    init() {
      // Get current theme from document or localStorage
      const currentTheme = document.documentElement.getAttribute('data-bs-theme') ||
                          localStorage.getItem('theme') || 'light';

      this.loadSettings();

      // Hide loading screen when settings page is ready
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 300);
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
    loadSettings() {
      // Load settings from localStorage if available
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          this.settings = { ...this.settings, ...parsed };
        } catch (error) {
          console.warn('Failed to load saved settings:', error);
        }
      }
    },

    saveSettings() {
      try {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        this.showNotification('Settings saved successfully!', 'success');
      } catch (error) {
        this.showNotification('Failed to save settings', 'error');
        console.error('Failed to save settings:', error);
      }
    },

    setActiveSection(sectionId) {
      this.activeSection = sectionId;
      this.sidebarVisible = false;
    },

    // Retailer Management
    addRetailer() {
      if (this.newRetailerName.trim()) {
        this.retailerList.push({
          id: Date.now(),
          name: this.newRetailerName,
          isBrand: false
        });
        this.settings.retailers = this.retailerList;
        this.newRetailerName = '';
        this.showNotification('Retailer added successfully!', 'success');
      }
    },

    removeRetailer(id) {
      this.retailerList = this.retailerList.filter(r => r.id !== id);
      this.settings.retailers = this.retailerList;
      this.showNotification('Retailer removed successfully!', 'success');
    },

    toggleRetailerBrand(id) {
      const retailer = this.retailerList.find(r => r.id === id);
      if (retailer) {
        retailer.isBrand = !retailer.isBrand;
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
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let importedData;

          if (file.name.endsWith('.json')) {
            importedData = JSON.parse(content);
            if (importedData.settings) {
              this.settings = { ...this.settings, ...importedData.settings };
              this.saveSettings();
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
      if (confirm('⚠️ This will delete ALL your data. This action cannot be undone. Are you sure?')) {
        localStorage.removeItem('appSettings');
        this.settings = {
          language: 'en',
          timezone: 'America/New_York',
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
        this.showNotification('All data has been reset to defaults', 'success');
      }
    },

    // Notification Helper
    showNotification(message, type) {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }));
});

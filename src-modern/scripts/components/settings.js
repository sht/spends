import Alpine from 'alpinejs';

export function registerSettingsComponent() {
  Alpine.data('settingsComponent', () => ({
    // UI State
    sidebarVisible: false,
    activeSection: 'general',
    confirmReset: '',  // Stores the confirmation text ('DELETE')
    showResetModal: false,

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
        name: 'Card Visibility',
        icon: 'bi-speedometer2'
      }
    ],

    // Data Management
    importFile: null,
    selectedImportFile: null,
    exportFormats: ['JSON', 'CSV'],

    // Handle file selection (stores file for later import)
    onFileSelected(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedImportFile = file;
        console.log('Selected file:', file.name);
      }
    },

    // Import data from selected file
    async importData() {
      if (!this.selectedImportFile) {
        this.showNotification('Please select a file first', 'error');
        return;
      }
      
      // Create a fake event object to reuse handleFileImport
      const fakeEvent = { target: { files: [this.selectedImportFile], value: '' } };
      await this.handleFileImport(fakeEvent);
      
      // Clear selected file after import
      this.selectedImportFile = null;
      document.getElementById('importFile').value = '';
    },

    async init() {
      // Get current theme from document or localStorage
      const currentTheme = document.documentElement.getAttribute('data-bs-theme') ||
                          localStorage.getItem('theme') || 'light';

      // Load settings: DB settings from API (primary), UI settings from localStorage
      await this.loadSettings();

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
      // Check URL hash for section (e.g., #dashboard)
      const hash = window.location.hash.replace('#', '');
      const validSections = ['general', 'dashboard'];

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
        
        // Dispatch comprehensive settings changed event for immediate refresh
        window.dispatchEvent(new CustomEvent('settingsChanged', { 
          detail: { 
            settings: this.settings,
            cardVisibility: this.settings.cardVisibility,
            dateFormat: this.settings.dateFormat,
            currencyCode: this.settings.currencyCode
          } 
        }));
        
        // Also dispatch specific event for date format changes
        window.dispatchEvent(new CustomEvent('dateFormatChanged', { 
          detail: { dateFormat: this.settings.dateFormat } 
        }));
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

    // Data Management
    async exportData(format) {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      
      // Normalize format to uppercase for comparison
      const formatUpper = format.toUpperCase();
      
      try {
        if (formatUpper === 'JSON') {
          // Fetch all data from backend
          const response = await fetch(`${apiUrl}/export/json`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          // Get the JSON data
          const data = await response.json();
          
          // Create and download file
          const content = JSON.stringify(data, null, 2);
          const filename = `spends_export_${new Date().toISOString().split('T')[0]}.json`;
          this.downloadFile(content, filename, 'application/json');
          
        } else if (formatUpper === 'CSV') {
          // Fetch purchases as CSV from backend
          const response = await fetch(`${apiUrl}/export/csv`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          // Get the CSV content
          const csvContent = await response.text();
          
          // Create and download file
          const filename = `spends_purchases_${new Date().toISOString().split('T')[0]}.csv`;
          this.downloadFile(csvContent, filename, 'text/csv');
          
        } else if (formatUpper === 'ZIP') {
          // Fetch full backup ZIP from backend
          this.showNotification('Creating full backup... This may take a moment.', 'info');
          
          const response = await fetch(`${apiUrl}/export/zip`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          // Get the ZIP blob
          const zipBlob = await response.blob();
          
          // Create and download file
          const filename = `spends_backup_${new Date().toISOString().split('T')[0]}.zip`;
          this.downloadBlob(zipBlob, filename);
        }
        
        this.showNotification(`Data exported as ${formatUpper} successfully!`, 'success');
      } catch (error) {
        console.error('Export error:', error);
        this.showNotification(`Failed to export data: ${error.message}`, 'error');
      }
    },

    // Helper function to download file
    downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      this.downloadBlob(blob, filename);
    },

    // Helper function to download blob
    downloadBlob(blob, filename) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup after a short delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
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

    async handleFileImport(event) {
      const file = event.target.files[0];
      if (!file) return;

      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      
      // Detect file type by extension
      const isJson = file.name.toLowerCase().endsWith('.json');
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const isZip = file.name.toLowerCase().endsWith('.zip');
      
      if (!isJson && !isCsv && !isZip) {
        this.showNotification('Invalid file type. Please upload a JSON, CSV, or ZIP file.', 'error');
        return;
      }

      this.showNotification(`Importing ${isJson ? 'JSON' : isCsv ? 'CSV' : 'ZIP'} file...`, 'info');

      try {
        // Create FormData to send file
        const formData = new FormData();
        formData.append('file', file);

        // Determine endpoint based on file type
        let endpoint;
        if (isJson) endpoint = `${apiUrl}/import/json`;
        else if (isCsv) endpoint = `${apiUrl}/import/csv`;
        else endpoint = `${apiUrl}/import/zip`;
        
        // Send file to backend
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Build success message
        let message = '';
        if (isJson) {
          const parts = [];
          if (result.purchases_added) parts.push(`${result.purchases_added} purchases`);
          if (result.warranties_added) parts.push(`${result.warranties_added} warranties`);
          if (result.retailers_added) parts.push(`${result.retailers_added} retailers`);
          if (result.brands_added) parts.push(`${result.brands_added} brands`);
          
          // Add skipped info if any
          const skippedParts = [];
          if (result.purchases_skipped_future_date) skippedParts.push(`${result.purchases_skipped_future_date} with future date`);
          
          message = parts.length > 0 
            ? `Imported: ${parts.join(', ')}` 
            : 'No new data imported';
          if (skippedParts.length > 0) {
            message += ` (${skippedParts.join(', ')} skipped)`;
          }
        } else if (isZip) {
          const parts = [];
          if (result.purchases_added) parts.push(`${result.purchases_added} purchases`);
          if (result.warranties_added) parts.push(`${result.warranties_added} warranties`);
          if (result.retailers_added) parts.push(`${result.retailers_added} retailers`);
          if (result.brands_added) parts.push(`${result.brands_added} brands`);
          if (result.files_added) parts.push(`${result.files_added} file records`);
          if (result.files_extracted) parts.push(`${result.files_extracted} files`);
          
          // Add skipped info if any
          const skippedParts = [];
          if (result.purchases_skipped_future_date) skippedParts.push(`${result.purchases_skipped_future_date} purchases with future date`);
          
          message = parts.length > 0 
            ? `Restored: ${parts.join(', ')}` 
            : 'No new data restored';
          if (skippedParts.length > 0) {
            message += ` (${skippedParts.join(', ')} skipped)`;
          }
        } else {
          message = result.purchases_added 
            ? `Imported ${result.purchases_added} purchases` 
            : 'No new purchases imported';
        }

        this.showNotification(message, 'success');
        
        // Clear file input
        event.target.value = '';
        
      } catch (error) {
        console.error('Import error:', error);
        this.showNotification(`Import failed: ${error.message}`, 'error');
        event.target.value = '';
      }
    },

    resetAllData() {
      this.showResetModal = true;
    },

    closeResetModal() {
      this.showResetModal = false;
      this.confirmReset = '';
    },

    async confirmResetData() {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';

      this.showNotification('Erasing all data...', 'info');

      try {
        // Call the reset-all API endpoint
        const response = await fetch(`${apiUrl}/data/reset-all`, { 
          method: 'POST' 
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Reset local settings to defaults
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
          retailers: []
        };
        this.retailerList = [];
        
        // Close modal and show success
        this.showResetModal = false;
        this.confirmReset = '';
        this.showNotification('All data has been erased successfully', 'success');
        
      } catch (error) {
        console.error('Reset error:', error);
        this.showNotification(`Failed to erase data: ${error.message}`, 'error');
        this.showResetModal = false;
        this.confirmReset = '';
      }
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

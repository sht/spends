import Alpine from 'alpinejs';

export function registerDataManagementComponent() {
  Alpine.data('dataManagementComponent', () => ({
    // UI State
    confirmReset: '',  // Stores the confirmation text ('DELETE')
    showResetModal: false,

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
      // Hide loading screen when data management page is ready
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
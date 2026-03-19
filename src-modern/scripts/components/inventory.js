import Alpine from 'alpinejs';
import { Modal } from 'bootstrap';

export function registerInventoryComponent() {
  Alpine.data('inventoryTable', () => ({
    items: [],
    filteredItems: [],
    selectedItems: [],
    paginatedItems: [],
    currentPage: 1,
    itemsPerPage: 20,
    totalPages: 1,
    searchQuery: '',
    dateFilter: '',
    startDate: '',
    endDate: '',
    sortField: 'id',
    sortDirection: 'asc',
    searchDebounceTimer: null,
    serverTotal: 0,
    serverTotalSpending: 0,
    visibleColumns: {
      product: true,
      retailer: true,
      modelNumber: true,
      price: true,
      purchaseDate: true,
      quantity: false,
      warrantyExpiry: false,
      serialNumber: false,
      retailerOrderNumber: false,
      link: false,
      taxDeductible: false,
      tags: false,
      notes: false,
    },
    showColumnSelector: false,

    // Statistics
    stats: {
      total: 0,
      totalSpending: 0,
    },

    async init() {
      // Initialize showColumnSelector to false
      this.showColumnSelector = false;

      // Make shareItem available globally for use from view modal
      window.shareItemFromInventory = (item) => this.shareItem(item);

      await this.loadInventoryData();

      // Check if there's a view parameter in the URL (for shareable links)
      const urlParams = new URLSearchParams(window.location.search);
      const viewId = urlParams.get('view');
      if (viewId) {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const response = await fetch(`${apiUrl}/purchases/${viewId}/`);
          if (response.ok) {
            const apiItem = await response.json();
            const transformed = this._transformItem(apiItem);
            this.viewItem(transformed);
          }
        } catch (e) {
          /* ignore */
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Initialize column selector functionality
      this.initColumnSelector();

      // Setup modal event listener for the shared purchase modal
      const purchaseModal = document.getElementById('purchaseModal');
      if (purchaseModal) {
        purchaseModal.addEventListener('show.bs.modal', (e) => {
          setTimeout(() => {
            const modalContent = purchaseModal.querySelector('.modal-content');
            if (modalContent && modalContent.__x) {
              const alpineData = modalContent.__x.$data;
              if (
                e.relatedTarget &&
                e.relatedTarget.classList.contains('btn-primary') &&
                e.relatedTarget.textContent.includes('New Purchase')
              ) {
                alpineData.resetForm();
              }
            }
          }, 10);
        });
      }

      // Listen for refresh-inventory event from addPurchaseForm
      window.addEventListener('refresh-inventory', async () => {
        await this.loadInventoryData();
      });

      // Listen for settings changes to refresh date/currency displays
      window.addEventListener('settingsChanged', async () => {
        await this.loadInventoryData();
      });

      setTimeout(() => {
        this.hideLoadingScreen();
      }, 500);
    },

    updateColumnVisibility() {
      // This method is called when column visibility changes
      // The table will automatically update due to reactivity
      console.log('Column visibility updated:', this.visibleColumns);
    },

    // Method to toggle the column selector
    toggleColumnSelector() {
      this.showColumnSelector = !this.showColumnSelector;
      console.log('Column selector toggled:', this.showColumnSelector);
    },

    // Method to handle clicks outside the column selector
    initColumnSelector() {
      // Close the column selector when clicking outside
      document.addEventListener('click', (event) => {
        const columnSelectorButton = document.getElementById('columnSelectorDropdown');
        const columnSelectorMenu = document.querySelector(
          '[aria-labelledby="columnSelectorDropdown"]'
        );

        if (
          this.showColumnSelector &&
          columnSelectorButton &&
          columnSelectorMenu &&
          !columnSelectorButton.contains(event.target) &&
          !columnSelectorMenu.contains(event.target)
        ) {
          this.showColumnSelector = false;
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

    _transformItem(item) {
      const purchaseDateStr = item.purchase_date;
      const warrantyExpiryStr = item.warranty?.warranty_end || item.warranty_expiry;
      const returnDeadlineStr = item.return_deadline;

      return {
        id: item.id,
        name: item.product_name,
        brand: item.brand?.name || '',
        retailer: item.retailer?.name || '',
        price: parseFloat(item.price),
        rawPurchaseDate: purchaseDateStr,
        purchaseDate: window.formatDate(purchaseDateStr),
        purchaseDateISO: purchaseDateStr,
        warrantyExpiry: warrantyExpiryStr || '',
        notes: item.notes || '',
        taxDeductible: item.tax_deductible === 1 || item.tax_deductible === true,
        modelNumber: item.model_number || '',
        serialNumber: item.serial_number || '',
        retailerOrderNumber: item.retailer_order_number || '',
        quantity: item.quantity || 1,
        link: item.link || '',
        returnDeadline: returnDeadlineStr || '',
        returnPolicy: item.return_policy || '',
        tags: item.tags || '',
        updatedAt: item.updated_at || '',
      };
    },

    getDateRangeParams() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const toISO = (d) => d.toISOString().split('T')[0];

      switch (this.dateFilter) {
        case 'week': {
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(today);
          startOfWeek.setDate(diff);
          return { date_from: toISO(startOfWeek), date_to: toISO(today) };
        }
        case 'month': {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return { date_from: toISO(startOfMonth), date_to: toISO(today) };
        }
        case 'year': {
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          return { date_from: toISO(startOfYear), date_to: toISO(today) };
        }
        case 'custom':
          return {
            date_from: this.startDate || null,
            date_to: this.endDate || null,
          };
        default:
          return {};
      }
    },

    async loadInventoryData() {
      try {
        this.showLoadingState();

        const apiUrl = window.APP_CONFIG?.API_URL || '/api';

        // Build query parameters for server-side pagination
        const params = new URLSearchParams();
        params.set('skip', String((this.currentPage - 1) * this.itemsPerPage));
        params.set('limit', String(this.itemsPerPage));

        if (this.searchQuery) {
          params.set('search', this.searchQuery);
        }

        if (this.sortField && this.sortField !== 'id') {
          params.set('sort_by', this.sortField);
          params.set('sort_direction', this.sortDirection);
        }

        const dateRange = this.getDateRangeParams();
        if (dateRange.date_from) params.set('date_from', dateRange.date_from);
        if (dateRange.date_to) params.set('date_to', dateRange.date_to);

        const response = await fetch(`${apiUrl}/purchases/?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Transform items (this is already one page of results)
        this.items = (data.items || []).map((item) => this._transformItem(item));

        // Server-side pagination state
        this.serverTotal = data.total || 0;
        this.serverTotalSpending = data.total_spending || 0;
        this.totalPages = data.pages || 1;

        // For server-side pagination, paginatedItems IS items (already one page)
        this.paginatedItems = this.items;
        // Keep filteredItems compatible with template's filteredItems.length
        this.filteredItems = { length: this.serverTotal };

        this.calculateStats();
        this.hideLoadingState();
      } catch (error) {
        console.error('Error loading inventory data:', error);
        this.hideLoadingState();
        this.showErrorState();
        this.loadMockInventoryData();
      }
    },

    loadMockInventoryData() {
      // Product list for random selection
      const products = [
        { name: 'Apple iPhone 15 Pro', brand: 'Apple', price: 999 },
        { name: 'Samsung Galaxy S24', brand: 'Samsung', price: 899 },
        { name: 'MacBook Pro 16"', brand: 'Apple', price: 2499 },
        { name: 'Sony WH-1000XM5 Headphones', brand: 'Sony', price: 399 },
        { name: 'iPad Air', brand: 'Apple', price: 599 },
        { name: 'Dell XPS 13', brand: 'Dell', price: 1299 },
        { name: 'LG 27" Gaming Monitor', brand: 'LG', price: 499 },
        { name: 'Apple Watch Series 9', brand: 'Apple', price: 399 },
        { name: 'Sony PlayStation 5', brand: 'Sony', price: 499 },
        { name: 'IKEA Billy Bookshelf', brand: 'IKEA', price: 79.99 },
        { name: 'Bose Smart Speaker', brand: 'Bose', price: 199 },
        { name: 'Samsung 55" QLED TV', brand: 'Samsung', price: 1299 },
        { name: 'AirPods Pro Max', brand: 'Apple', price: 549 },
        { name: 'Mechanical Keyboard', brand: 'Corsair', price: 149 },
        { name: 'Wireless Mouse', brand: 'Logitech', price: 59.99 },
        { name: 'LG OLED TV 65"', brand: 'LG', price: 1999 },
        { name: 'Google Pixel 8 Pro', brand: 'Google', price: 999 },
        { name: 'Nintendo Switch OLED', brand: 'Nintendo', price: 349 },
        { name: 'Canon EOS R5', brand: 'Canon', price: 3899 },
        { name: 'DJI Mini 3 Pro', brand: 'DJI', price: 369 },
      ];

      // Generate random dates between Jul 2024 and Jan 2025
      const getRandomDate = () => {
        const start = new Date(2024, 6, 1).getTime();
        const end = new Date(2025, 0, 31).getTime();
        const randomTime = start + Math.random() * (end - start);
        return window.formatDate(new Date(randomTime));
      };

      // Generate 20 sample items
      this.items = Array.from({ length: 20 }, (_, index) => {
        const product = products[index % products.length];
        const price = product.price + (Math.random() * 200 - 100);
        return {
          id: index + 1,
          name: product.name,
          brand: product.brand,
          retailer: ['Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco', 'Newegg'][index % 6],
          modelNumber: `MODEL-${String(index + 1001).padStart(4, '0')}`,
          price: parseFloat(price.toFixed(2)),
          purchaseDate: getRandomDate(),
          warrantyExpiry: '',
          notes: '',
          taxDeductible: false,
          serialNumber: '',
          quantity: 1,
          link: '',
          returnDeadline: '',
          returnPolicy: '',
          tags: '',
        };
      });
    },

    showLoadingState() {
      const tableContainer = document.querySelector('.table-responsive');
      if (tableContainer) {
        // Remove any existing loader first
        this.hideLoadingState();

        const loader = document.createElement('div');
        loader.className = 'position-absolute top-50 start-50 translate-middle inventory-loader';
        loader.innerHTML =
          '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
        loader.style.zIndex = '10';
        loader.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        loader.style.padding = '20px';
        loader.style.borderRadius = '5px';
        tableContainer.style.position = 'relative';
        tableContainer.appendChild(loader);
      }
    },

    hideLoadingState() {
      const tableContainer = document.querySelector('.table-responsive');
      if (tableContainer) {
        const loader = tableContainer.querySelector('.inventory-loader');
        if (loader) {
          loader.remove();
        }
      }
    },

    showErrorState() {
      const tableContainer = document.querySelector('.table-responsive');
      if (tableContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML =
          '<strong>Error:</strong> Failed to load inventory data. Please check your connection and try again.';
        tableContainer.parentNode.insertBefore(errorDiv, tableContainer);
      }
    },

    calculateStats() {
      this.stats.total = this.serverTotal;
      this.stats.totalSpending = this.serverTotalSpending;
    },

    filterInventory() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.currentPage = 1;
        this.loadInventoryData();
      }, 300);
    },

    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
      this.currentPage = 1;
      this.loadInventoryData();
    },

    get visiblePages() {
      const pages = [];
      const maxVisible = 5;
      const halfVisible = Math.floor(maxVisible / 2);

      let startPage = Math.max(1, this.currentPage - halfVisible);
      let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

      if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) pages.push('...');
        pages.push(this.totalPages);
      }

      return pages;
    },

    goToPage(page) {
      if (page > 0 && page <= this.totalPages && page !== this.currentPage) {
        this.currentPage = page;
        this.loadInventoryData();
      }
    },

    toggleAll(checked) {
      if (checked) {
        this.selectedItems = this.paginatedItems.map((item) => item.id);
      } else {
        this.selectedItems = [];
      }
    },

    shareItem(item) {
      const baseUrl = window.location.origin + window.location.pathname;
      const shareLink = `${baseUrl}?view=${item.id}`;

      const tryCopy = () => {
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, shareLink.length);

        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(shareLink)
          .then(() => {
            // Verify it actually got copied by reading back
            navigator.clipboard
              .readText()
              .then((copiedText) => {
                if (copiedText === shareLink) {
                  this.showShareSuccess();
                } else {
                  // Clipboard API didn't work, try fallback
                  if (tryCopy()) {
                    this.showShareSuccess();
                  } else {
                    this.showCopyError(shareLink);
                  }
                }
              })
              .catch(() => {
                // readText failed, try fallback
                if (tryCopy()) {
                  this.showShareSuccess();
                } else {
                  this.showCopyError(shareLink);
                }
              });
          })
          .catch((err) => {
            console.error('Failed to copy link:', err);
            if (tryCopy()) {
              this.showShareSuccess();
            } else {
              this.showCopyError(shareLink);
            }
          });
      } else {
        if (tryCopy()) {
          this.showShareSuccess();
        } else {
          this.showCopyError(shareLink);
        }
      }
    },

    showShareSuccess() {
      if (window.AdminApp && window.AdminApp.notificationManager) {
        window.AdminApp.notificationManager.success('Share link copied to clipboard!');
      } else {
        alert('Share link copied to clipboard!');
      }
    },

    showCopyError(link) {
      if (window.AdminApp && window.AdminApp.notificationManager) {
        window.AdminApp.notificationManager.error('Could not copy. Please copy manually: ' + link);
      } else {
        alert('Could not copy. Link: ' + link);
      }
    },

    viewItem(item) {
      // Get the freshest item data
      const freshItem = this.items.find((i) => i.id === item.id) || item;

      // Prepare the detailed item object with all fields
      // Only set defaults for undefined/null values, preserve actual values like 'N/A'
      const detailedItem = {
        productName: freshItem.name,
        retailer:
          typeof freshItem.retailer === 'object'
            ? freshItem.retailer.name
            : freshItem.retailer !== undefined
              ? freshItem.retailer
              : undefined,
        brand:
          typeof freshItem.brand === 'object'
            ? freshItem.brand.name
            : freshItem.brand !== undefined
              ? freshItem.brand
              : undefined,
        modelNumber: freshItem.modelNumber !== undefined ? freshItem.modelNumber : undefined,
        serialNumber: freshItem.serialNumber !== undefined ? freshItem.serialNumber : undefined,
        retailerOrderNumber:
          freshItem.retailerOrderNumber !== undefined ? freshItem.retailerOrderNumber : undefined,
        purchaseDate: freshItem.purchaseDateISO || freshItem.purchaseDate,
        price: freshItem.price,
        quantity: freshItem.quantity || 1,
        link: freshItem.link !== undefined ? freshItem.link : undefined,
        warrantyExpiry:
          freshItem.warrantyExpiry !== undefined ? freshItem.warrantyExpiry : undefined,
        returnDeadline:
          freshItem.returnDeadline !== undefined ? freshItem.returnDeadline : undefined,
        returnPolicy: freshItem.returnPolicy !== undefined ? freshItem.returnPolicy : undefined,
        taxDeductible: freshItem.taxDeductible !== undefined ? freshItem.taxDeductible : undefined,
        tags: freshItem.tags !== undefined ? freshItem.tags : undefined,
        notes: freshItem.notes !== undefined ? freshItem.notes : undefined,
        updatedAt: freshItem.updatedAt !== undefined ? freshItem.updatedAt : undefined,
        id: freshItem.id,
      };

      // Dispatch custom event to notify viewPurchaseDetails component to show modal with data
      window.dispatchEvent(
        new CustomEvent('show-view-details', {
          detail: { item: detailedItem },
        })
      );

      // Show the view modal
      const viewDetailsModal = new Modal(document.getElementById('viewDetailsModal'));
      viewDetailsModal.show();
    },

    editItem(item) {
      // Get fresh data from this.items to ensure we have the latest values
      const freshItem = this.items.find((i) => i.id === item.id) || item;
      console.log('Edit item - fresh item:', freshItem);
      console.log('Edit item - modelNumber:', freshItem.modelNumber);
      console.log('Edit item - serialNumber:', freshItem.serialNumber);

      // Create detailed item object with all fields
      // Use purchaseDateISO for the date input (YYYY-MM-DD format)
      const detailedItem = {
        productName: freshItem.name,
        retailer:
          typeof freshItem.retailer === 'object'
            ? freshItem.retailer.name
            : freshItem.retailer !== undefined
              ? freshItem.retailer
              : undefined,
        brand:
          typeof freshItem.brand === 'object'
            ? freshItem.brand.name
            : freshItem.brand !== undefined
              ? freshItem.brand
              : undefined,
        modelNumber: freshItem.modelNumber !== undefined ? freshItem.modelNumber : undefined,
        serialNumber: freshItem.serialNumber !== undefined ? freshItem.serialNumber : undefined,
        retailerOrderNumber:
          freshItem.retailerOrderNumber !== undefined ? freshItem.retailerOrderNumber : undefined,
        purchaseDate: freshItem.purchaseDateISO || freshItem.purchaseDate,
        price: freshItem.price,
        quantity: freshItem.quantity || 1,
        link: freshItem.link !== undefined ? freshItem.link : undefined,
        warrantyExpiry:
          freshItem.warrantyExpiry !== undefined ? freshItem.warrantyExpiry : undefined,
        returnDeadline:
          freshItem.returnDeadline !== undefined ? freshItem.returnDeadline : undefined,
        returnPolicy: freshItem.returnPolicy !== undefined ? freshItem.returnPolicy : undefined,
        taxDeductible: freshItem.taxDeductible !== undefined ? freshItem.taxDeductible : undefined,
        tags: freshItem.tags !== undefined ? freshItem.tags : undefined,
        notes: freshItem.notes !== undefined ? freshItem.notes : undefined,
        id: freshItem.id,
      };

      // Dispatch custom event to notify addPurchaseForm to enter edit mode
      window.dispatchEvent(
        new CustomEvent('edit-purchase', {
          detail: { item: detailedItem },
        })
      );

      // Show the shared purchase modal
      const purchaseModalElement = document.getElementById('purchaseModal');
      if (purchaseModalElement) {
        const purchaseModal = new Modal(purchaseModalElement);
        purchaseModal.show();
      }
    },

    async deleteItem(item) {
      if (confirm(`Delete "${item.product_name || item.name}"?`)) {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const response = await fetch(`${apiUrl}/purchases/${item.id}/`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          this.selectedItems = this.selectedItems.filter((id) => id !== item.id);

          // Show success notification
          if (window.AdminApp && window.AdminApp.notificationManager) {
            window.AdminApp.notificationManager.success(
              `"${item.product_name || item.name}" deleted successfully!`
            );
          }

          // Reload current page from server
          await this.loadInventoryData();

          // Refresh dashboard data if available
          if (window.dashboardManager) {
            await window.dashboardManager.loadDashboardData();
          }
        } catch (error) {
          console.error('Error deleting item:', error);
          if (window.AdminApp && window.AdminApp.notificationManager) {
            window.AdminApp.notificationManager.error(`Failed to delete item: ${error.message}`);
          }
        }
      }
    },
  }));
}

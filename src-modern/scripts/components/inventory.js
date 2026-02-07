import Alpine from 'alpinejs';
import { Modal } from 'bootstrap';

export function registerInventoryComponent() {
  Alpine.data('inventoryTable', () => ({
    items: [],
    filteredItems: [],
    selectedItems: [],
    paginatedItems: [],
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    searchQuery: '',
    dateFilter: '',
    startDate: '',
    endDate: '',
    sortField: 'id',
    sortDirection: 'asc',
    visibleColumns: {
      product: true,
      retailer: true,
      modelNumber: true,
      price: true,
      purchaseDate: true,
      quantity: false,
      warrantyExpiry: false,
      serialNumber: false,
      link: false,
      taxDeductible: false,
      tags: false,
      notes: false
    },
    showColumnSelector: false,

    // Statistics
    stats: {
      total: 0,
      totalSpending: 0
    },

    async init() {
      // Initialize showColumnSelector to false
      this.showColumnSelector = false;
      
      await this.loadInventoryData();
      this.filterInventory();
      this.calculateStats();
      this.updatePagination();

      // Initialize column selector functionality
      this.initColumnSelector();

      // Setup modal event listener
      const inventoryModal = document.getElementById('inventoryModal');
      if (inventoryModal) {
        inventoryModal.addEventListener('show.bs.modal', (e) => {
          setTimeout(() => {
            const modalContent = inventoryModal.querySelector('.modal-content');
            if (modalContent && modalContent.__x) {
              const alpineData = modalContent.__x.$data;
              // Check if it's being opened from the "New Purchase" button
              if (e.relatedTarget && e.relatedTarget.classList.contains('btn-primary') && e.relatedTarget.textContent.includes('New Purchase')) {
                alpineData.resetForm();
              }
              // If edit mode is set, keep it; otherwise reset to add mode
              console.log('Modal opened - isEditMode:', alpineData.isEditMode);
            }
          }, 10);
        });
      }

      // Listen for refresh-inventory event from addPurchaseForm
      window.addEventListener('refresh-inventory', async () => {
        console.log('Received refresh-inventory event');
        await this.loadInventoryData();
        this.filterInventory();
        this.calculateStats();
        this.updatePagination();
        console.log('Inventory data refreshed after purchase update');
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
        const columnSelectorMenu = document.querySelector('[aria-labelledby="columnSelectorDropdown"]');
        
        if (this.showColumnSelector && 
            columnSelectorButton && 
            columnSelectorMenu &&
            !columnSelectorButton.contains(event.target) && 
            !columnSelectorMenu.contains(event.target)) {
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

    async loadInventoryData() {
      try {
        // Show loading state
        this.showLoadingState();

        // Get API URL from global variable or fallback to default
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';

        // Fetch inventory data from the backend API
        const response = await fetch(`${apiUrl}/purchases/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Transform API response to match expected format
        // Dates come as YYYY-MM-DD strings, parse them without timezone conversion
        this.items = data.items.map(item => {
          // Parse date strings directly without creating Date objects to avoid timezone issues
          const purchaseDateStr = item.purchase_date;
          const warrantyExpiryStr = item.warranty?.warranty_end || item.warranty_expiry;
          const returnDeadlineStr = item.return_deadline;
          
          return {
            id: item.id,
            name: item.product_name,
            brand: item.brand?.name || '',
            retailer: item.retailer?.name || '',
            price: parseFloat(item.price),
            // Formatted date for display (per user preference)
            purchaseDate: window.formatDate(purchaseDateStr),
            // ISO date for edit form (YYYY-MM-DD) - use the string directly
            purchaseDateISO: purchaseDateStr,
            warrantyExpiry: warrantyExpiryStr || '',
            notes: item.notes || '',
            taxDeductible: item.tax_deductible === 1 || item.tax_deductible === true,
            modelNumber: item.model_number || '',
            serialNumber: item.serial_number || '',
            quantity: item.quantity || 1,
            link: item.link || '',
            returnDeadline: returnDeadlineStr || '',
            returnPolicy: item.return_policy || '',
            tags: item.tags || ''
          };
        });

        // Hide loading state
        this.hideLoadingState();
      } catch (error) {
        console.error('Error loading inventory data:', error);
        this.hideLoadingState();
        this.showErrorState();
        // Fallback to mock data if API fails
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
        { name: 'DJI Mini 3 Pro', brand: 'DJI', price: 369 }
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
          tags: ''
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
        loader.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
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
        errorDiv.innerHTML = '<strong>Error:</strong> Failed to load inventory data. Please check your connection and try again.';
        tableContainer.parentNode.insertBefore(errorDiv, tableContainer);
      }
    },

    calculateStats() {
      this.stats.total = this.items.length;
      this.stats.totalSpending = this.items.reduce((sum, i) => sum + i.price, 0);
    },

    filterInventory() {
      this.filteredItems = this.items.filter(item => {
        const matchesSearch = !this.searchQuery ||
          item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          item.brand.toLowerCase().includes(this.searchQuery.toLowerCase());

        const matchesDate = this.checkDateFilter(item);

        return matchesSearch && matchesDate;
      });

      this.sortItems();
      this.currentPage = 1;
      this.updatePagination();
    },

    checkDateFilter(item) {
      if (!this.dateFilter) return true; // No date filter applied

      // Convert the purchaseDate back to a Date object for comparison
      // The purchaseDate is in format like "Jan 30, 2026", so we need to parse it
      // But we have purchaseDateISO which is in YYYY-MM-DD format, which is easier to work with
      const purchaseDateStr = item.purchaseDateISO || item.purchaseDate;
      
      if (!purchaseDateStr) return true; // If no date, include the item

      // Try to parse the date - it might be in different formats
      let purchaseDate;
      if (item.purchaseDateISO) {
        // If we have the ISO format (YYYY-MM-DD), parse it directly
        const [year, month, day] = item.purchaseDateISO.split('-').map(Number);
        purchaseDate = new Date(year, month - 1, day);
      } else {
        // If we only have the formatted date string, try to parse it
        purchaseDate = new Date(purchaseDateStr);
      }

      // If parsing failed, include the item
      if (isNaN(purchaseDate.getTime())) return true;

      // Get today's date for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part for accurate comparison

      const itemDate = new Date(purchaseDate);
      itemDate.setHours(0, 0, 0, 0);

      switch (this.dateFilter) {
        case 'week':
          // Calculate the start of the week (Monday)
          const startOfWeek = new Date(today);
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);
          
          return itemDate >= startOfWeek && itemDate <= today;
        case 'month':
          return itemDate.getMonth() === today.getMonth() && 
                 itemDate.getFullYear() === today.getFullYear();
        case 'year':
          return itemDate.getFullYear() === today.getFullYear();
        case 'custom':
          // For custom date range, check if startDate and endDate are set
          if (!this.startDate || !this.endDate) return true; // If dates not set, show all
          
          // Parse the custom date range
          const startRange = new Date(this.startDate);
          const endRange = new Date(this.endDate);
          startRange.setHours(0, 0, 0, 0);
          endRange.setHours(23, 59, 59, 999); // End of the day
          
          return itemDate >= startRange && itemDate <= endRange;
        default:
          return true; // No filter applied
      }
    },

    sortItems() {
      this.filteredItems.sort((a, b) => {
        let aValue = a[this.sortField];
        let bValue = b[this.sortField];

        // Handle boolean sorting for taxDeductible
        if (this.sortField === 'taxDeductible') {
          const aVal = aValue ? 1 : 0;
          const bVal = bValue ? 1 : 0;
          return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Handle numeric sorting
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Handle string sorting
        const comparison = String(aValue).localeCompare(String(bValue));
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    },

    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
      this.filterInventory();
    },

    updatePagination() {
      this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      this.paginatedItems = this.filteredItems.slice(start, end);
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
      if (page > 0 && page <= this.totalPages) {
        this.currentPage = page;
        this.updatePagination();
      }
    },

    toggleAll(checked) {
      if (checked) {
        this.selectedItems = this.paginatedItems.map(item => item.id);
      } else {
        this.selectedItems = [];
      }
    },

    viewItem(item) {
      // Get the freshest item data
      const freshItem = this.items.find(i => i.id === item.id) || item;

      // Prepare the detailed item object with all fields
      // Only set defaults for undefined/null values, preserve actual values like 'N/A'
      const detailedItem = {
        productName: freshItem.name,
        retailer: typeof freshItem.retailer === 'object' ? freshItem.retailer.name : (freshItem.retailer !== undefined ? freshItem.retailer : undefined),
        brand: typeof freshItem.brand === 'object' ? freshItem.brand.name : (freshItem.brand !== undefined ? freshItem.brand : undefined),
        modelNumber: freshItem.modelNumber !== undefined ? freshItem.modelNumber : undefined,
        serialNumber: freshItem.serialNumber !== undefined ? freshItem.serialNumber : undefined,
        purchaseDate: freshItem.purchaseDateISO || freshItem.purchaseDate,
        price: freshItem.price,
        quantity: freshItem.quantity || 1,
        link: freshItem.link !== undefined ? freshItem.link : undefined,
        warrantyExpiry: freshItem.warrantyExpiry !== undefined ? freshItem.warrantyExpiry : undefined,
        returnDeadline: freshItem.returnDeadline !== undefined ? freshItem.returnDeadline : undefined,
        returnPolicy: freshItem.returnPolicy !== undefined ? freshItem.returnPolicy : undefined,
        taxDeductible: freshItem.taxDeductible !== undefined ? freshItem.taxDeductible : undefined,
        tags: freshItem.tags !== undefined ? freshItem.tags : undefined,
        notes: freshItem.notes !== undefined ? freshItem.notes : undefined,
        id: freshItem.id
      };

      // Dispatch custom event to notify viewPurchaseDetails component to show modal with data
      window.dispatchEvent(new CustomEvent('show-view-details', {
        detail: { item: detailedItem }
      }));

      // Show the view modal
      const viewDetailsModal = new Modal(document.getElementById('viewDetailsModal'));
      viewDetailsModal.show();
    },

    editItem(item) {
      // Get fresh data from this.items to ensure we have the latest values
      const freshItem = this.items.find(i => i.id === item.id) || item;
      console.log('Edit item - fresh item:', freshItem);
      console.log('Edit item - modelNumber:', freshItem.modelNumber);
      console.log('Edit item - serialNumber:', freshItem.serialNumber);

      // Create detailed item object with all fields
      // Use purchaseDateISO for the date input (YYYY-MM-DD format)
      const detailedItem = {
        productName: freshItem.name,
        retailer: typeof freshItem.retailer === 'object' ? freshItem.retailer.name : (freshItem.retailer !== undefined ? freshItem.retailer : undefined),
        brand: typeof freshItem.brand === 'object' ? freshItem.brand.name : (freshItem.brand !== undefined ? freshItem.brand : undefined),
        modelNumber: freshItem.modelNumber !== undefined ? freshItem.modelNumber : undefined,
        serialNumber: freshItem.serialNumber !== undefined ? freshItem.serialNumber : undefined,
        purchaseDate: freshItem.purchaseDateISO || freshItem.purchaseDate,
        price: freshItem.price,
        quantity: freshItem.quantity || 1,
        link: freshItem.link !== undefined ? freshItem.link : undefined,
        warrantyExpiry: freshItem.warrantyExpiry !== undefined ? freshItem.warrantyExpiry : undefined,
        returnDeadline: freshItem.returnDeadline !== undefined ? freshItem.returnDeadline : undefined,
        returnPolicy: freshItem.returnPolicy !== undefined ? freshItem.returnPolicy : undefined,
        taxDeductible: freshItem.taxDeductible !== undefined ? freshItem.taxDeductible : undefined,
        tags: freshItem.tags !== undefined ? freshItem.tags : undefined,
        notes: freshItem.notes !== undefined ? freshItem.notes : undefined,
        id: freshItem.id
      };

      // Dispatch custom event to notify addPurchaseForm to enter edit mode
      window.dispatchEvent(new CustomEvent('edit-purchase', { 
        detail: { item: detailedItem }
      }));

      // Show the modal
      const inventoryModalElement = document.getElementById('inventoryModal');
      const inventoryModal = new Modal(inventoryModalElement);
      inventoryModal.show();
    },

    async deleteItem(item) {
      if (confirm(`Delete "${item.product_name || item.name}"?`)) {
        try {
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';
          const response = await fetch(`${apiUrl}/purchases/${item.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Only remove from UI after successful deletion
          this.items = this.items.filter(i => i.id !== item.id);
          this.selectedItems = this.selectedItems.filter(id => id !== item.id);
          this.filterInventory();
          this.calculateStats();

          // Show success notification
          if (window.AdminApp && window.AdminApp.notificationManager) {
            window.AdminApp.notificationManager.success(`"${item.product_name || item.name}" deleted successfully!`);
          }

          console.log('Item deleted from database:', item);

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
    }
  }));
}

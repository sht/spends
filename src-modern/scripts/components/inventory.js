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
    statusFilter: '',
    dateFilter: '',
    sortField: 'id',
    sortDirection: 'asc',

    // Statistics
    stats: {
      total: 0,
      ordered: 0,
      received: 0,
      totalSpending: 0
    },

    async init() {
      await this.loadInventoryData();
      this.filterInventory();
      this.calculateStats();
      this.updatePagination();

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

      setTimeout(() => {
        this.hideLoadingScreen();
      }, 500);
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
        const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';

        // Fetch inventory data from the backend API
        const response = await fetch(`${apiUrl}/purchases/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Transform API response to match expected format
        this.items = data.items.map(item => ({
          id: item.id,
          name: item.product_name,
          brand: item.brand?.name || 'Unknown',
          price: parseFloat(item.price),
          status: item.status?.toLowerCase() || 'ordered',
          purchaseDate: new Date(item.purchase_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        }));

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
        return new Date(randomTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };

      // Generate 20 sample items
      this.items = Array.from({ length: 20 }, (_, index) => {
        const product = products[index % products.length];
        const price = product.price + (Math.random() * 200 - 100);
        return {
          id: index + 1,
          name: product.name,
          brand: product.brand,
          price: parseFloat(price.toFixed(2)),
          status: Math.random() > 0.35 ? 'received' : 'ordered',
          purchaseDate: getRandomDate()
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
      this.stats.ordered = this.items.filter(i => i.status === 'ordered').length;
      this.stats.received = this.items.filter(i => i.status === 'received').length;
      this.stats.totalSpending = this.items.reduce((sum, i) => sum + i.price, 0);
    },

    filterInventory() {
      this.filteredItems = this.items.filter(item => {
        const matchesSearch = !this.searchQuery ||
          item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          item.brand.toLowerCase().includes(this.searchQuery.toLowerCase());

        const matchesStatus = !this.statusFilter || item.status === this.statusFilter;

        return matchesSearch && matchesStatus;
      });

      this.sortItems();
      this.currentPage = 1;
      this.updatePagination();
    },

    sortItems() {
      this.filteredItems.sort((a, b) => {
        let aValue = a[this.sortField];
        let bValue = b[this.sortField];

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
      console.log('View item:', item);
      // Create detailed item object with all fields
      const detailedItem = {
        productName: item.name,
        retailer: item.retailer || 'Amazon',
        brand: item.brand,
        modelNumber: item.modelNumber || '',
        serialNumber: item.serialNumber || '',
        purchaseDate: item.purchaseDate,
        price: item.price,
        quantity: item.quantity || 1,
        link: item.link || '',
        warrantyExpiry: item.warrantyExpiry || '',
        returnDeadline: item.returnDeadline || '',
        returnPolicy: item.returnPolicy || '',
        taxDeductible: item.taxDeductible || false,
        tags: item.tags || '',
        notes: item.notes || ''
      };

      // Get the Alpine component and set the item data
      const viewDetailsElement = document.querySelector('[x-data="viewPurchaseDetails()"]');
      if (viewDetailsElement && viewDetailsElement.__x) {
        viewDetailsElement.__x.$data.setItem(detailedItem);
      }

      // Show the modal
      const viewDetailsModal = new Modal(document.getElementById('viewDetailsModal'));
      viewDetailsModal.show();
    },

    editItem(item) {
      console.log('Edit item:', item);

      // Create detailed item object with all fields
      const detailedItem = {
        productName: item.name,
        retailer: item.retailer || 'Amazon',
        brand: item.brand,
        modelNumber: item.modelNumber || '',
        serialNumber: item.serialNumber || '',
        purchaseDate: item.purchaseDate,
        price: item.price,
        quantity: item.quantity || 1,
        link: item.link || '',
        warrantyExpiry: item.warrantyExpiry || '',
        returnDeadline: item.returnDeadline || '',
        returnPolicy: item.returnPolicy || '',
        taxDeductible: item.taxDeductible || false,
        tags: item.tags || '',
        notes: item.notes || '',
        id: item.id
      };

      // Get the modal element
      const inventoryModalElement = document.getElementById('inventoryModal');

      // Update modal title and icon directly
      const modalTitle = inventoryModalElement.querySelector('.modal-title');
      const titleIcon = modalTitle.querySelector('i');
      const titleText = modalTitle.querySelector('span');

      titleIcon.className = 'bi bi-pencil-circle text-primary me-2';
      titleText.textContent = 'Edit Purchase';

      // Get the Alpine component and set edit mode BEFORE showing
      const modalContent = inventoryModalElement.querySelector('.modal-content');
      if (modalContent && modalContent.__x) {
        const alpineData = modalContent.__x.$data;
        alpineData.isEditMode = true;
        alpineData.editingItemId = item.id;
        alpineData.form = { ...detailedItem };
      }

      // Show the modal
      const inventoryModal = new Modal(inventoryModalElement);
      inventoryModal.show();
    },

    deleteItem(item) {
      if (confirm(`Delete "${item.name}"?`)) {
        this.items = this.items.filter(i => i.id !== item.id);
        this.selectedItems = this.selectedItems.filter(id => id !== item.id);
        this.filterInventory();
        this.calculateStats();
        console.log('Item deleted:', item);
      }
    }
  }));
}

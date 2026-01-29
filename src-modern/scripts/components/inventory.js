import Alpine from 'alpinejs';

document.addEventListener('alpine:init', () => {
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

    init() {
      this.loadInventoryData();
      this.filterInventory();
      this.calculateStats();
      this.updatePagination();

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

    loadInventoryData() {
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
      alert(`Viewing: ${item.name}\nPrice: $${item.price.toFixed(2)}\nStatus: ${item.status}\nDate: ${item.purchaseDate}`);
    },

    editItem(item) {
      console.log('Edit item:', item);
      alert(`Edit mode for: ${item.name}`);
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
});

// ==========================================================================
// Dashboard Manager - Optimized for performance
// Only initializes charts that are actually displayed on the dashboard
// ==========================================================================

import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';

// Register only Chart.js components needed for actual charts
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export class DashboardManager {
  constructor() {
    this.charts = new Map();
    this.data = {
      warranty: [],
      spending: [],
      retailers: [],
      brands: [],
      topProducts: [],
      orders: [],
      recentOrders: []
    };
    this.init();
  }

  async init() {
    console.log('📊 Dashboard initialized');

    // Load only necessary data from API
    await this.loadDashboardData();

    // Initialize all chart instances (handle duplicate IDs in HTML)
    this.initWarrantyCharts();
    this.initSpendingCharts();
    this.initOrderStatusCharts();
    this.populateTopProducts();
    this.populateRecentOrders();
  }

  async loadDashboardData() {
    try {
      // Show loading state on refresh button
      const refreshBtn = document.querySelector('button[title="Refresh data"] i');
      if (refreshBtn) refreshBtn.classList.add('icon-spin');
      
      // Show loading state
      this.showLoadingState();

      // Fetch all required data from the backend API
      const [warrantyData, spendingData, retailersData, brandsData, topProductsData, recentOrdersData, summaryData] = await Promise.all([
        this.fetchWarrantyData(),
        this.fetchSpendingData(),
        this.fetchRetailersData(),
        this.fetchBrandsData(),
        this.fetchTopProductsData(),
        this.fetchRecentOrdersData(),
        this.fetchSummaryData()
      ]);
      
      // Update KPI cards with summary data
      this.updateKPICards(summaryData);

      // Update internal data
      this.data.warranty = warrantyData;
      this.data.spending = spendingData;
      this.data.retailers = retailersData;
      this.data.brands = brandsData;
      this.data.topProducts = topProductsData;
      this.data.recentOrders = recentOrdersData;

      // Calculate order data based on fetched data
      this.data.orders = this.calculateOrderData(recentOrdersData);

      // Update charts with new data
      this.updateCharts();
      
      // Update tables
      this.populateTopProducts();
      this.populateRecentOrders();

      // Hide loading state
      this.hideLoadingState();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showErrorState();
    } finally {
      // Remove spinning from refresh button (always run)
      const refreshBtn = document.querySelector('button[title="Refresh data"] i');
      if (refreshBtn) refreshBtn.classList.remove('icon-spin');
    }
  }

  updateCharts() {
    // Update warranty charts
    this.charts.forEach((chart, key) => {
      if (key.startsWith('warranty-')) {
        chart.data.labels = this.data.warranty.map(item => item.month);
        chart.data.datasets[0].data = this.data.warranty.map(item => item.active);
        chart.data.datasets[1].data = this.data.warranty.map(item => item.expired);
        if (chart.data.datasets[2]) {
          chart.data.datasets[2].data = this.data.warranty.map(item => item.expiring_soon);
        }
        chart.update('none'); // Update without animation
      } else if (key === 'spending') {
        chart.data.labels = this.data.spending.map(item => item.month);
        chart.data.datasets[0].data = this.data.spending.map(item => item.amount);
        chart.update('none');
      } else if (key === 'retailers') {
        chart.data.labels = this.data.retailers.map(item => item.name);
        chart.data.datasets[0].data = this.data.retailers.map(item => item.count);
        chart.update('none');
      } else if (key === 'brands') {
        chart.data.labels = this.data.brands.map(item => item.name);
        chart.data.datasets[0].data = this.data.brands.map(item => item.count);
        chart.update('none');
      }
    });
  }

  async fetchWarrantyData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';
      const response = await fetch(`${apiUrl}/analytics/warranties/timeline`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.timeline || [];
    } catch (error) {
      console.error('Error fetching warranty data:', error);
      return this.generateWarrantyData(); // fallback to mock data
    }
  }

  async fetchSpendingData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';
      const response = await fetch(`${apiUrl}/analytics/spending`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.spending_over_time || [];
    } catch (error) {
      console.error('Error fetching spending data:', error);
      return this.generateSpendingData(); // fallback to mock data
    }
  }

  async fetchRetailersData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';
      const response = await fetch(`${apiUrl}/analytics/retailers`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.retailers || [];
    } catch (error) {
      console.error('Error fetching retailers data:', error);
      return this.generateRetailerData(); // fallback to mock data
    }
  }

  async fetchBrandsData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';
      const response = await fetch(`${apiUrl}/analytics/brands`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.brands || [];
    } catch (error) {
      console.error('Error fetching brands data:', error);
      return this.generateBrandData(); // fallback to mock data
    }
  }

  async fetchTopProductsData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';
      const response = await fetch(`${apiUrl}/analytics/top-products`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.top_products || [];
    } catch (error) {
      console.error('Error fetching top products data:', error);
      return this.generateTopProducts(); // fallback to mock data
    }
  }

  async fetchRecentOrdersData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';
      const response = await fetch(`${apiUrl}/analytics/recent-purchases?limit=10`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching recent orders data:', error);
      return this.generateRecentOrders(); // fallback to mock data
    }
  }

  async fetchSummaryData() {
    try {
      const apiUrl = window.APP_CONFIG?.API_URL || 'http://192.168.68.55:8000/api';
      const response = await fetch(`${apiUrl}/analytics/summary`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching summary data:', error);
      return null;
    }
  }

  updateKPICards(summaryData) {
    if (!summaryData) return;
    
    // Update Total Asset Value
    const totalValueEl = document.querySelector('[data-kpi="total-value"] .kpi-value');
    if (totalValueEl && summaryData.total_spent !== undefined) {
      totalValueEl.textContent = '$' + parseFloat(summaryData.total_spent).toLocaleString();
    }
    
    // Update Items Count
    const itemsCountEl = document.querySelector('[data-kpi="items-count"] .kpi-value');
    if (itemsCountEl && summaryData.total_items !== undefined) {
      itemsCountEl.textContent = summaryData.total_items.toLocaleString();
    }
    
    // Update Average Price
    const avgPriceEl = document.querySelector('[data-kpi="avg-price"] .kpi-value');
    if (avgPriceEl && summaryData.avg_price !== undefined) {
      avgPriceEl.textContent = '$' + Math.round(parseFloat(summaryData.avg_price)).toLocaleString();
    }
    
    // Update Active Warranties
    const activeWarrantyEl = document.querySelector('[data-kpi="active-warranties"] .kpi-value');
    if (activeWarrantyEl && summaryData.active_warranties !== undefined) {
      activeWarrantyEl.textContent = summaryData.active_warranties.toLocaleString();
    }
    
    // Update Tax Deductible
    const taxDeductibleEl = document.querySelector('[data-kpi="tax-deductible"] .kpi-value');
    if (taxDeductibleEl && summaryData.tax_deductible_count !== undefined) {
      taxDeductibleEl.textContent = summaryData.tax_deductible_count.toLocaleString();
    }
    
    // Update Expired Warranties
    const expiredWarrantyEl = document.querySelector('[data-kpi="expired-warranties"] .kpi-value');
    if (expiredWarrantyEl && summaryData.expired_warranties !== undefined) {
      expiredWarrantyEl.textContent = summaryData.expired_warranties.toLocaleString();
    }
  }

  calculateOrderData(recentOrdersData) {
    // Calculate order statistics based on recent orders
    const completed = recentOrdersData.filter(order => order.status === 'RECEIVED').length;
    const processing = recentOrdersData.filter(order => order.status === 'ORDERED').length;
    const pending = recentOrdersData.filter(order => order.status === 'PENDING').length;
    const cancelled = recentOrdersData.length - (completed + processing + pending);

    return {
      completed,
      processing,
      pending,
      cancelled
    };
  }

  showLoadingState() {
    // Show loading indicators on dashboard cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      const loadingSpinner = document.createElement('div');
      loadingSpinner.className = 'position-absolute top-50 start-50 translate-middle';
      loadingSpinner.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
      loadingSpinner.style.zIndex = '10';
      card.style.position = 'relative';
      card.appendChild(loadingSpinner);
    });
  }

  hideLoadingState() {
    // Remove loading indicators
    const spinners = document.querySelectorAll('.spinner-border');
    spinners.forEach(spinner => spinner.remove());
  }

  showErrorState() {
    // Show error message on dashboard
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.innerHTML = '<strong>Error:</strong> Failed to load dashboard data. Please check your connection and try again.';
    const container = document.querySelector('.container-fluid') || document.body;
    container.insertBefore(errorDiv, container.firstChild);

    // Also fall back to mock data
    this.data.warranty = this.generateWarrantyData();
    this.data.spending = this.generateSpendingData();
    this.data.retailers = this.generateRetailerData();
    this.data.brands = this.generateBrandData();
    this.data.topProducts = this.generateTopProducts();
    this.data.orders = this.generateOrderData();
    this.data.recentOrders = this.generateRecentOrders();
  }

  generateWarrantyData() {
    // Generate months from April 2025 to April 2026
    const startDate = new Date(2025, 3, 1); // April 2025
    const monthLabels = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthLabels.push(monthYear);
    }

    return monthLabels.map(month => ({
      month,
      // Active warranties - warranties that are still valid
      active: Math.floor(Math.random() * 30) + 20,
      // Expired warranties - warranties that have ended
      expired: Math.floor(Math.random() * 15) + 5,
      // Expiring soon - warranties ending within 30 days
      expiring_soon: Math.floor(Math.random() * 10) + 2
    }));
  }

  generateSpendingData() {
    // Generate months from April 2025 to April 2026
    const startDate = new Date(2025, 3, 1); // April 2025
    const monthLabels = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthLabels.push(monthYear);
    }

    return monthLabels.map(month => ({
      month,
      // Total spending amount in dollars
      totalSpending: Math.floor(Math.random() * 3000) + 1000,
      // Number of items purchased
      itemsCount: Math.floor(Math.random() * 15) + 5
    }));
  }

  generateRetailerData() {
    // Retailer distribution data
    const retailers = ['Amazon', 'eBay', 'Walmart', 'Target', 'Best Buy'];
    return retailers.map(retailer => ({
      retailer,
      percentage: Math.floor(Math.random() * 30) + 10
    }));
  }

  generateBrandData() {
    // Brand distribution data
    const brands = ['Apple', 'Sony', 'Samsung', 'LG', 'Dell'];
    return brands.map(brand => ({
      brand,
      percentage: Math.floor(Math.random() * 25) + 10
    }));
  }

  generateTopProducts() {
    // Generate top 10 unique products
    const productNames = [
      'MacBook Pro 16"',
      'iPhone 15 Pro Max',
      'Sony WH-1000XM5 Headphones',
      'Samsung 55" QLED TV',
      'iPad Air',
      'Dell XPS 13 Laptop',
      'AirPods Pro',
      'LG 27" Gaming Monitor',
      'Apple Watch Series 9',
      'Sony PlayStation 5'
    ];

    // Generate random date between October 2021 and January 2026
    const getRandomDate = () => {
      const startDate = new Date(2021, 9, 1).getTime(); // October 2021
      const endDate = new Date(2026, 0, 31).getTime(); // January 2026
      const randomTime = startDate + Math.random() * (endDate - startDate);
      return new Date(randomTime).toLocaleDateString();
    };

    return productNames.map((name, index) => ({
      rank: index + 1,
      name,
      price: `$${(Math.random() * 2000 + 100).toFixed(2)}`,
      date: getRandomDate()
    }));
  }

  generateOrderData() {
    return {
      completed: 1245,
      processing: 156,
      pending: 87,
      cancelled: 23
    };
  }

  generateRecentOrders() {
    const items = [
      'Bose Speaker',
      'iPhone 15',
      'MacBook Pro 14"',
      'IKEA Bookshelf',
      'Wireless Mouse',
      'USB-C Hub',
      'Monitor Stand',
      'Desk Lamp',
      'Mechanical Keyboard',
      'Webcam 4K'
    ];
    const statuses = [
        { text: 'Ordered', class: 'bg-primary' },
        { text: 'Received', class: 'bg-success' }
    ];

    // Generate random date between October 2021 and January 2026
    const getRandomDate = () => {
      const startDate = new Date(2021, 9, 1).getTime(); // October 2021
      const endDate = new Date(2026, 0, 31).getTime(); // January 2026
      const randomTime = startDate + Math.random() * (endDate - startDate);
      return new Date(randomTime).toLocaleDateString();
    };

    return Array.from({length: 10}, () => ({
        id: `#${Math.floor(Math.random() * 9000) + 1000}`,
        customer: items[Math.floor(Math.random() * items.length)],
        amount: `$${(Math.random() * 500 + 50).toFixed(2)}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        date: getRandomDate()
    }));
  }

  initWarrantyCharts() {
    // Initialize all warranty timeline chart elements (handles duplicate IDs in HTML)
    const warrantyCtxs = document.querySelectorAll('canvas#warrantyChart');

    warrantyCtxs.forEach((ctx, index) => {
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.data.warranty.map(item => item.month),
          datasets: [
            {
              label: 'Active Warranties',
              data: this.data.warranty.map(item => item.active),
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgb(16, 185, 129)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8
            },
            {
              label: 'Expired Warranties',
              data: this.data.warranty.map(item => item.expired),
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgb(239, 68, 68)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8
            },
            {
              label: 'Expiring Soon',
              data: this.data.warranty.map(item => item.expiring_soon),
              borderColor: 'rgb(245, 158, 11)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgb(245, 158, 11)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y} warranties`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              border: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              },
              border: {
                display: false
              },
              ticks: {
                stepSize: 1,
                precision: 0,
                callback: function(value) {
                  return Math.round(value) + ' warranties';
                }
              }
            }
          }
        }
      });

      this.charts.set(`warranty-${index}`, chart);
    });
  }

  initSpendingCharts() {
    // Initialize spending chart - showing total spending and items purchased
    const spendingCtxs = document.querySelectorAll('canvas#spendingChart');

    spendingCtxs.forEach((ctx, index) => {
      const chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: this.data.spending.map(item => item.month),
              datasets: [
                {
                  label: 'Total Spending',
                  data: this.data.spending.map(item => item.totalSpending),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: 'rgb(59, 130, 246)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  yAxisID: 'y'
                },
                {
                  label: 'Items Purchased',
                  data: this.data.spending.map(item => item.itemsCount),
                  borderColor: 'rgb(20, 184, 166)',
                  backgroundColor: 'rgba(20, 184, 166, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: 'rgb(20, 184, 166)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  yAxisID: 'y1'
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                intersect: false,
                mode: 'index'
              },
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    usePointStyle: true,
                    padding: 20
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#fff',
                  bodyColor: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  cornerRadius: 8,
                  displayColors: true,
                  callbacks: {
                    label: function(context) {
                      if (context.datasetIndex === 0) {
                        return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
                      } else {
                        return `${context.dataset.label}: ${context.parsed.y} items`;
                      }
                    }
                  }
                }
              },
              scales: {
                x: {
                  grid: {
                    display: false
                  },
                  border: {
                    display: false
                  }
                },
                y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                  },
                  border: {
                    display: false
                  },
                  ticks: {
                    callback: function(value) {
                      return '$' + value.toLocaleString();
                    }
                  },
                  title: {
                    display: true,
                    text: 'Total Spending ($)',
                    color: 'rgb(59, 130, 246)'
                  }
                },
                y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  beginAtZero: true,
                  grid: {
                    drawOnChartArea: false
                  },
                  border: {
                    display: false
                  },
                  ticks: {
                    callback: function(value) {
                      return value + ' items';
                    }
                  },
                  title: {
                    display: true,
                    text: 'Items Purchased',
                    color: 'rgb(20, 184, 166)'
                  }
                }
              }
            }
          });

      this.charts.set('spending', chart);
    });
  }

  initOrderStatusCharts() {
    // Initialize retailer chart (first doughnut)
    const retailerCtxs = document.querySelectorAll('canvas#orderStatusChart');

    retailerCtxs.forEach((ctx, index) => {
      // Determine if this is retailer or brand chart based on position
      const cardHeader = ctx.closest('.card')?.querySelector('.card-header');
      const isRetailerChart = cardHeader?.textContent.includes('Retailers');

      const data = isRetailerChart ? this.data.retailers : this.data.brands;
      const labels = data.map(item => isRetailerChart ? item.retailer : item.brand);
      const values = data.map(item => item.percentage);

      const colors = [
        'rgba(16, 185, 129, 0.8)',
        'rgba(99, 102, 241, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ];

      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, values.length),
            borderWidth: 0,
            cutout: '60%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            }
          }
        }
      });

      this.charts.set(isRetailerChart ? 'retailers' : 'brands', chart);
    });
  }

  populateTopProducts() {
    // Populate top 10 products table
    const table = document.querySelector('tbody#top-products-table');
    if (!table) return;

    const html = this.data.topProducts.map(product => `
        <tr>
            <td><strong>#${product.rank}</strong></td>
            <td>${product.name}</td>
            <td>${product.price}</td>
            <td>${product.date}</td>
        </tr>
    `).join('');

    table.innerHTML = html;
  }

  populateRecentOrders() {
    // Handle multiple table elements with same ID
    const tables = document.querySelectorAll('tbody#recent-orders-table');
    const html = this.data.recentOrders.map(order => `
        <tr>
            <td><strong>${order.id}</strong></td>
            <td>${order.customer}</td>
            <td>${order.amount}</td>
            <td><span class="badge ${order.status.class}">${order.status.text}</span></td>
            <td>${order.date}</td>
        </tr>
    `).join('');

    tables.forEach(table => {
      table.innerHTML = html;
    });
  }

  destroy() {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }
}

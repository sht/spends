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
    this.spendingMonths = 24;
    this.warrantyMonths = 24;
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

    // Listen for settings changes to refresh date/currency displays
    window.addEventListener('settingsChanged', async (e) => {
      console.log('Settings changed, refreshing dashboard displays...');
      // Re-fetch and re-render data with new format
      await this.refreshDisplayData();
    });
  }

  // Refresh only display data (not charts) when settings change
  async refreshDisplayData() {
    try {
      // Re-fetch top products and recent orders to apply new date/currency format
      const [topProductsData, recentOrdersData] = await Promise.all([
        this.fetchTopProductsData(),
        this.fetchRecentOrdersData()
      ]);
      
      this.data.topProducts = topProductsData;
      this.data.recentOrders = recentOrdersData;
      
      // Re-populate tables
      this.populateTopProducts();
      this.populateRecentOrders();
      
      console.log('Dashboard displays refreshed with new settings');
    } catch (error) {
      console.error('Error refreshing dashboard displays:', error);
    }
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
        this.fetchWarrantyData(this.warrantyMonths),
        this.fetchSpendingData(this.spendingMonths),
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
        chart.update('none'); // Update without animation
      } else if (key === 'spending') {
        chart.data.labels = this.data.spending.map(item => item.month);
        chart.data.datasets[0].data = this.data.spending.map(item => item.totalSpending);
        chart.data.datasets[1].data = this.data.spending.map(item => item.itemsCount);
        chart.update('none');
      } else if (key === 'retailers') {
        const retailerData = this.aggregateTopN(this.data.retailers, 5);
        chart.data.labels = retailerData.labels;
        chart.data.datasets[0].data = retailerData.values;
        chart.data.datasets[0].backgroundColor = this.buildChartColors(retailerData.values.length);
        chart.update('none');
      } else if (key === 'brands') {
        const brandData = this.aggregateTopN(this.data.brands, 5);
        chart.data.labels = brandData.labels;
        chart.data.datasets[0].data = brandData.values;
        chart.data.datasets[0].backgroundColor = this.buildChartColors(brandData.values.length);
        chart.update('none');
      }
    });
  }

  async fetchWarrantyData(months) {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      const params = months !== undefined && months !== '' ? `?months=${months}` : '';
      const response = await fetch(`${apiUrl}/analytics/warranties/timeline${params}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.timeline || [];
    } catch (error) {
      console.error('Error fetching warranty data:', error);
      return []; // Return empty on error
    }
  }

  async changeWarrantyRange(months) {
    this.warrantyMonths = months;
    this.data.warranty = await this.fetchWarrantyData(months);
    this.updateWarrantyCharts();
  }

  updateWarrantyCharts() {
    this.charts.forEach((chart, key) => {
      if (key.startsWith('warranty-')) {
        chart.data.labels = this.data.warranty.map(item => item.month);
        chart.data.datasets[0].data = this.data.warranty.map(item => item.active);
        chart.data.datasets[1].data = this.data.warranty.map(item => item.expired);
        chart.update('none');
      }
    });
  }

  async fetchSpendingData(months) {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      const params = months !== undefined && months !== '' ? `?months=${months}` : '';
      const response = await fetch(`${apiUrl}/analytics/spending${params}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Transform API data to match chart format
      return (data.spending_over_time || []).map(item => ({
        month: item.month,
        totalSpending: parseFloat(item.total_amount),
        itemsCount: item.item_count
      }));
    } catch (error) {
      console.error('Error fetching spending data:', error);
      return []; // Return empty on error
    }
  }

  async changeSpendingRange(months) {
    this.spendingMonths = months;
    this.data.spending = await this.fetchSpendingData(months);
    const chart = this.charts.get('spending');
    if (chart) {
      chart.data.labels = this.data.spending.map(item => item.month);
      chart.data.datasets[0].data = this.data.spending.map(item => item.totalSpending);
      chart.data.datasets[1].data = this.data.spending.map(item => item.itemsCount);
      chart.update('none');
    }
  }

  async fetchRetailersData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      const response = await fetch(`${apiUrl}/analytics/retailers`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.retailers || [];
    } catch (error) {
      console.error('Error fetching retailers data:', error);
      return []; // Return empty on error
    }
  }

  async fetchBrandsData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      const response = await fetch(`${apiUrl}/analytics/brands`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.brands || [];
    } catch (error) {
      console.error('Error fetching brands data:', error);
      return []; // Return empty on error
    }
  }

  async fetchTopProductsData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      // Fetch all purchases and sort by price (same data as inventory)
      const response = await fetch(`${apiUrl}/purchases/?limit=100`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Sort by price descending and take top 10
      const sorted = (data.items || [])
        .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
        .slice(0, 10);
      // Transform to match table format
      return sorted.map((item, index) => ({
        id: item.id,
        rank: index + 1,
        name: item.product_name,
        brand: item.brand?.name || 'N/A',
        price: window.formatPrice(item.price),
        date: window.formatDate(item.purchase_date)
      }));
    } catch (error) {
      console.error('Error fetching top products data:', error);
      return []; // Return empty on error
    }
  }

  async fetchRecentOrdersData() {
    try {
      // Get API URL from global variable or fallback to default
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      // Fetch purchases from existing API (same as inventory and top products)
      const response = await fetch(`${apiUrl}/purchases/?limit=100`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Sort by purchase date descending (latest first)
      const sorted = (data.items || [])
        .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
        .slice(0, 10); // Take only most recent 10
      // Transform to match table format (same as top products)
      return sorted.map((item, index) => ({
        id: item.id,
        rank: index + 1,
        name: item.product_name,
        brand: item.brand?.name || 'N/A',
        price: window.formatPrice(item.price),
        date: window.formatDate(item.purchase_date)
      }));
    } catch (error) {
      console.error('Error fetching recent orders data:', error);
      return []; // Return empty on error
    }
  }

  async fetchSummaryData() {
    try {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
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
      totalValueEl.textContent = window.formatPrice(summaryData.total_spent);
    }
    
    // Update Items Count
    const itemsCountEl = document.querySelector('[data-kpi="items-count"] .kpi-value');
    if (itemsCountEl && summaryData.total_items !== undefined) {
      itemsCountEl.textContent = summaryData.total_items.toLocaleString();
    }
    
    // Update Average Price
    const avgPriceEl = document.querySelector('[data-kpi="avg-price"] .kpi-value');
    if (avgPriceEl && summaryData.avg_price !== undefined) {
      avgPriceEl.textContent = window.formatPrice(summaryData.avg_price);
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
    // Order status tracking removed - return empty stats
    return {
      completed: 0,
      processing: 0,
      pending: 0,
      cancelled: 0
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

    // Set empty data for tables on error
    this.data.topProducts = [];
    this.data.recentOrders = [];
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
                        return `${context.dataset.label}: ${window.formatPrice(context.parsed.y)}`;
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
                      return window.formatPrice(value);
                    }
                  },
                  title: {
                    display: true,
                    text: `Total Spending (${window.getCurrencySymbol()})`,
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
                    stepSize: 1,
                    precision: 0,
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

  aggregateTopN(data, topN) {
    // Aggregate distribution data into top N items plus an "Other" slice
    if (!data || data.length === 0) return { labels: [], values: [] };

    const sorted = [...data].sort((a, b) => b.percentage - a.percentage);
    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);

    const labels = top.map(item => item.name);
    const values = top.map(item => Math.round(item.percentage));

    if (rest.length > 0) {
      const otherPercentage = rest.reduce((sum, item) => sum + (item.percentage || 0), 0);
      labels.push('Other');
      values.push(Math.round(otherPercentage));
    }

    return { labels, values };
  }

  buildChartColors(count) {
    const colors = [
      'rgba(16, 185, 129, 0.8)',
      'rgba(99, 102, 241, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(148, 163, 184, 0.6)'
    ];
    return colors.slice(0, count);
  }

  initOrderStatusCharts() {
    // Initialize retailer chart (first doughnut)
    const retailerCtxs = document.querySelectorAll('canvas#orderStatusChart');

    retailerCtxs.forEach((ctx, index) => {
      // Determine if this is retailer or brand chart based on position
      const cardHeader = ctx.closest('.card')?.querySelector('.card-header');
      const isRetailerChart = cardHeader?.textContent.includes('Retailers');

      const data = isRetailerChart ? this.data.retailers : this.data.brands;
      const { labels, values } = this.aggregateTopN(data, 5);

      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: this.buildChartColors(values.length),
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
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = Math.round(context.parsed);
                  return `${label}: ${value}%`;
                }
              }
            }
          }
        }
      });

      this.charts.set(isRetailerChart ? 'retailers' : 'brands', chart);
    });
  }

  populateTopProducts() {
    // Populate top 10 expensive purchases table
    const table = document.querySelector('tbody#top-products-table');
    if (!table) return;

    const countBadge = document.getElementById('top-products-count');
    if (countBadge) countBadge.textContent = this.data.topProducts.length;

    if (!this.data.topProducts || this.data.topProducts.length === 0) {
      table.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-inbox d-block mb-2 fs-3 opacity-50"></i>No purchases found</td></tr>';
      return;
    }

    const html = this.data.topProducts.map(product => {
      const rankClass = product.rank <= 3 ? `rank-${product.rank}` : 'rank-plain';
      return `
        <tr>
          <td class="text-center"><span class="rank-badge ${rankClass}">${product.rank}</span></td>
          <td>
            <a href="javascript:void(0)" class="text-decoration-none fw-medium text-truncate d-block" style="max-width: 260px" title="View ${product.name}" onclick="window.viewItemById('${product.id}')">${product.name}</a>
            <small class="text-muted">${product.brand}</small>
          </td>
          <td class="text-end fw-semibold price-cell">${product.price}</td>
          <td class="text-end text-muted small text-nowrap">${product.date}</td>
        </tr>`;
    }).join('');

    table.innerHTML = html;
  }

  populateRecentOrders() {
    // Populate recent 10 purchases table (same format as top products)
    const tables = document.querySelectorAll('tbody#recent-orders-table');

    const countBadge = document.getElementById('recent-orders-count');
    if (countBadge) countBadge.textContent = this.data.recentOrders.length;

    if (!this.data.recentOrders || this.data.recentOrders.length === 0) {
      tables.forEach(table => {
        table.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-clock-history d-block mb-2 fs-3 opacity-50"></i>No purchases found</td></tr>';
      });
      return;
    }

    const html = this.data.recentOrders.map(order => {
      const rankClass = order.rank <= 3 ? `rank-${order.rank}` : 'rank-plain';
      return `
        <tr>
          <td class="text-center"><span class="rank-badge ${rankClass}">${order.rank}</span></td>
          <td>
            <a href="javascript:void(0)" class="text-decoration-none fw-medium text-truncate d-block" style="max-width: 260px" title="View ${order.name}" onclick="window.viewItemById('${order.id}')">${order.name}</a>
            <small class="text-muted">${order.brand}</small>
          </td>
          <td class="text-end fw-semibold price-cell">${order.price}</td>
          <td class="text-end text-muted small text-nowrap">${order.date}</td>
        </tr>`;
    }).join('');

    tables.forEach(table => {
      table.innerHTML = html;
    });
  }

  destroy() {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }
}

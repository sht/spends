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

    // Load only necessary data
    this.loadDashboardData();

    // Initialize all chart instances (handle duplicate IDs in HTML)
    this.initWarrantyCharts();
    this.initSpendingCharts();
    this.initOrderStatusCharts();
    this.populateTopProducts();
    this.populateRecentOrders();
  }

  loadDashboardData() {
    // Generate only data needed for displayed charts
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
      // Warranty expiring - showing trend over months
      expiringWarranties: Math.floor(Math.random() * 20) + 5,
      // Already expired warranties
      expiredWarranties: Math.floor(Math.random() * 15) + 2
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
              label: 'Warranties Expiring',
              data: this.data.warranty.map(item => item.expiringWarranties),
              borderColor: 'rgb(245, 158, 11)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgb(245, 158, 11)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8
            },
            {
              label: 'Warranties Expired',
              data: this.data.warranty.map(item => item.expiredWarranties),
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
                callback: function(value) {
                  return value + ' warranties';
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
                  borderColor: 'rgb(99, 102, 241)',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: 'rgb(99, 102, 241)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  yAxisID: 'y'
                },
                {
                  label: 'Items Purchased',
                  data: this.data.spending.map(item => item.itemsCount),
                  borderColor: 'rgb(16, 185, 129)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: 'rgb(16, 185, 129)',
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
                    color: 'rgb(99, 102, 241)'
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
                    color: 'rgb(16, 185, 129)'
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

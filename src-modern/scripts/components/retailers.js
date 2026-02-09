import Alpine from 'alpinejs';

export function registerRetailersComponent() {
  Alpine.data('retailersComponent', () => ({
    // Retailer Management
    newRetailerName: '',
    retailers: [],

    async init() {
      // Load retailers on init
      await this.loadRetailers();

      // Hide loading screen when retailers page is ready
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

    async loadRetailers() {
      try {
        // Get API URL from global variable or fallback to default
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';

        // Fetch both retailers and brands from the backend API
        const [retailersResponse, brandsResponse] = await Promise.all([
          fetch(`${apiUrl}/retailers/`),
          fetch(`${apiUrl}/brands/?limit=100`)
        ]);
        
        if (!retailersResponse.ok) throw new Error(`HTTP error! status: ${retailersResponse.status}`);
        
        const retailersData = await retailersResponse.json();
        const brandsData = brandsResponse.ok ? await brandsResponse.json() : { items: [] };
        
        // Create a set of brand names for quick lookup
        const brandNames = new Set(brandsData.items.map(b => b.name));
        const brandMap = new Map(brandsData.items.map(b => [b.name, b.id]));

        // Transform API response to match expected format
        this.retailers = retailersData.items.map(retailer => ({
          id: retailer.id,
          name: retailer.name,
          is_brand: brandNames.has(retailer.name),
          brandId: brandMap.get(retailer.name) || null
        }));
      } catch (error) {
        console.error('Error loading retailers:', error);
        // Fallback to empty array if API fails
        this.retailers = [];
      }
    },

    async addRetailer() {
      if (this.newRetailerName.trim()) {
        try {
          // Get API URL from global variable or fallback to default
          const apiUrl = window.APP_CONFIG?.API_URL || '/api';

          // Add retailer to the backend API
          const response = await fetch(`${apiUrl}/retailers/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: this.newRetailerName,
              url: ''  // Could be enhanced to accept URL input
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const newRetailer = await response.json();

          // Add to local list
          this.retailers.push({
            id: newRetailer.id,
            name: newRetailer.name,
            is_brand: false
          });

          this.newRetailerName = '';
          this.showNotification('Retailer added successfully!', 'success');
        } catch (error) {
          console.error('Error adding retailer:', error);
          this.showNotification('Failed to add retailer', 'error');
        }
      }
    },

    async removeRetailer(id) {
      try {
        // Get API URL from global variable or fallback to default
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';

        const retailer = this.retailers.find(r => r.id === id);

        // Remove retailer from the backend API
        const response = await fetch(`${apiUrl}/retailers/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Retailer not found, but we can still remove from UI
            console.warn('Retailer not found on server, removing from UI only');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        // If retailer is also a brand, delete the brand too
        if (retailer && retailer.is_brand && retailer.brandId) {
          try {
            const brandResponse = await fetch(`${apiUrl}/brands/${retailer.brandId}/`, {
              method: 'DELETE'
            });
            if (!brandResponse.ok && brandResponse.status !== 404) {
              console.warn('Failed to delete associated brand:', brandResponse.status);
            }
          } catch (brandError) {
            console.warn('Error deleting associated brand:', brandError);
          }
        }

        // Remove from local list
        this.retailers = this.retailers.filter(r => r.id !== id);
        this.showNotification('Retailer removed successfully!', 'success');
      } catch (error) {
        console.error('Error removing retailer:', error);
        this.showNotification('Failed to remove retailer', 'error');
      }
    },

    // Alias for removeRetailer to match HTML template
    deleteRetailer(id) {
      return this.removeRetailer(id);
    },

    async toggleRetailerBrand(retailer) {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      const newIsBrand = !retailer.is_brand;

      try {
        if (newIsBrand) {
          // Add to brands
          const response = await fetch(`${apiUrl}/brands/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: retailer.name,
              url: ''
            })
          });

          if (response.ok) {
            const newBrand = await response.json();
            retailer.is_brand = true;
            retailer.brandId = newBrand.id;
            this.showNotification(`"${retailer.name}" added to Brands`, 'success');
          } else if (response.status === 409) {
            // Brand already exists (conflict)
            retailer.is_brand = true;
            this.showNotification(`"${retailer.name}" is already in Brands`, 'info');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
          // Remove from brands
          if (retailer.brandId) {
            const response = await fetch(`${apiUrl}/brands/${retailer.brandId}/`, {
              method: 'DELETE'
            });

            if (response.ok || response.status === 404) {
              retailer.is_brand = false;
              retailer.brandId = null;
              this.showNotification(`"${retailer.name}" removed from Brands`, 'success');
            } else {
              throw new Error(`Failed to delete brand: ${response.status}`);
            }
          } else {
            // Try to find brand by name and delete it
            const brandsResponse = await fetch(`${apiUrl}/brands/?limit=100`);
            if (brandsResponse.ok) {
              const brandsData = await brandsResponse.json();
              const brand = brandsData.items.find(b => b.name === retailer.name);
              if (brand) {
                const deleteResponse = await fetch(`${apiUrl}/brands/${brand.id}/`, {
                  method: 'DELETE'
                });
                if (deleteResponse.ok || deleteResponse.status === 404) {
                  retailer.is_brand = false;
                  retailer.brandId = null;
                  this.showNotification(`"${retailer.name}" removed from Brands`, 'success');
                } else {
                  throw new Error(`Failed to delete brand: ${deleteResponse.status}`);
                }
              } else {
                retailer.is_brand = false;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error toggling retailer brand status:', error);
        this.showNotification('Failed to update brand status', 'error');
        // Revert the toggle
        retailer.is_brand = !newIsBrand;
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
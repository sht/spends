// ==========================================================================
// Marketplace Manager
// Renders purchases in a marketplace-style grid with server-side pagination
// ==========================================================================

export class MarketplaceManager {
  constructor() {
    this.perPage = 20;
    this.currentPage = 1;
    this.totalPages = 1;
    this.total = 0;
    this.totalSpending = 0;
    this.loading = false;

    this.grid = document.getElementById('marketplace-grid');
    this.paginationEl = document.getElementById('marketplace-pagination');
    this.infoEl = document.getElementById('marketplace-info');
    this.loadingEl = document.getElementById('marketplace-loading');
    this.emptyEl = document.getElementById('marketplace-empty');

    if (!this.grid) {
      console.error('Marketplace: grid container not found');
      return;
    }

    this.bindEvents();
    this.init();
  }

  async init() {
    console.log('🛍️ Marketplace initialized');

    await this.loadPage(1);

    // Re-render when settings change (currency/date format)
    window.addEventListener('settingsChanged', async () => {
      if (this.loadedItems) await this.render(this.loadedItems);
    });
  }

  bindEvents() {
    // Card clicks (event delegation)
    this.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.marketplace-card');
      if (card && card.dataset.id) {
        window.viewItemById(card.dataset.id);
      }
    });

    // Pagination clicks (event delegation)
    this.paginationEl.addEventListener('click', (e) => {
      const link = e.target.closest('[data-page]');
      if (!link) return;
      e.preventDefault();
      const page = parseInt(link.dataset.page, 10);
      if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
        this.loadPage(page);
      }
    });
  }

  async loadPage(page) {
    if (this.loading) return;
    this.loading = true;
    this.currentPage = page;

    this.showLoading();

    try {
      const apiUrl = window.APP_CONFIG?.API_URL || '/api';
      const skip = (page - 1) * this.perPage;
      const response = await fetch(
        `${apiUrl}/purchases/?limit=${this.perPage}&skip=${skip}&sort_by=purchaseDate&sort_direction=desc`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      this.total = data.total || 0;
      this.totalPages = data.pages || 1;
      this.totalSpending = data.total_spending || 0;
      this.loadedItems = data.items || [];

      this.render(this.loadedItems);
      this.renderPagination();
      this.renderInfo();
      this.hideLoading();
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      this.hideLoading();
      this.showError();
    } finally {
      this.loading = false;
    }
  }

  render(items) {
    this.grid.innerHTML = items.map((item) => this.cardHtml(item)).join('');
  }

  cardHtml(item) {
    const name = this.escapeHtml(item.product_name || 'Unnamed product');
    const brand = item.brand?.name || '';
    const retailer = item.retailer?.name || '';
    const price = window.formatPrice(item.price);
    const date = window.formatDate(item.purchase_date);
    const photoUrl = item.photo_id ? `/api/files/file/${item.photo_id}/download/` : '';

    const imageHtml = photoUrl
      ? `<img src="${photoUrl}" alt="${name}" loading="lazy" onerror="this.closest('.marketplace-card-img').classList.add('no-photo'); this.remove();">`
      : '';

    const brandHtml = brand
      ? `<div class="marketplace-card-brand">${this.escapeHtml(brand)}</div>`
      : '';

    const retailerHtml = retailer ? `<span>${this.escapeHtml(retailer)}</span>` : '';
    const metaHtml = [retailerHtml, date ? `<span>${date}</span>` : '']
      .filter(Boolean)
      .join('<span class="marketplace-card-dot">·</span>');

    return `
      <div class="col">
        <div class="card marketplace-card h-100" data-id="${item.id}" role="button" tabindex="0" title="View ${name}">
          <div class="marketplace-card-img${photoUrl ? '' : ' no-photo'}">
            ${imageHtml}
          </div>
          <div class="card-body">
            <h6 class="marketplace-card-title" title="${name}">${name}</h6>
            ${brandHtml}
            <div class="marketplace-card-price">${price}</div>
            <div class="marketplace-card-meta">${metaHtml}</div>
          </div>
        </div>
      </div>`;
  }

  renderPagination() {
    if (!this.paginationEl) return;

    if (this.totalPages <= 1) {
      this.paginationEl.innerHTML = '';
      return;
    }

    const pages = this.visiblePages();

    const items = [
      `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
         <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="Previous">
           <span aria-hidden="true">&laquo;</span>
         </a>
       </li>`,
      ...pages.map((page) =>
        page === '...'
          ? `<li class="page-item disabled"><span class="page-link">…</span></li>`
          : `<li class="page-item ${page === this.currentPage ? 'active' : ''}">
               <a class="page-link" href="#" data-page="${page}">${page}</a>
             </li>`
      ),
      `<li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
         <a class="page-link" href="#" data-page="${this.currentPage + 1}" aria-label="Next">
           <span aria-hidden="true">&raquo;</span>
         </a>
       </li>`,
    ];

    this.paginationEl.innerHTML = `<ul class="pagination justify-content-center mb-0">${items.join('')}</ul>`;
  }

  visiblePages() {
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
  }

  renderInfo() {
    if (!this.infoEl) return;
    const from = (this.currentPage - 1) * this.perPage + 1;
    const to = Math.min(this.currentPage * this.perPage, this.total);

    this.infoEl.innerHTML = `
      <div class="text-muted">
        Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${this.total}</strong> purchases
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge text-bg-primary">${this.total} items</span>
        <span class="badge text-bg-secondary">Total: ${window.formatPrice(this.totalSpending)}</span>
      </div>`;
  }

  showLoading() {
    if (this.loadingEl) this.loadingEl.classList.remove('d-none');
    if (this.grid) this.grid.classList.add('d-none');
    if (this.emptyEl) this.emptyEl.classList.add('d-none');
    if (this.paginationEl) this.paginationEl.classList.add('d-none');
    if (this.infoEl) this.infoEl.classList.add('d-none');
  }

  hideLoading() {
    if (this.loadingEl) this.loadingEl.classList.add('d-none');
    if (this.grid) this.grid.classList.remove('d-none');
    if (this.paginationEl) this.paginationEl.classList.remove('d-none');
    if (this.infoEl) this.infoEl.classList.remove('d-none');

    if (this.total === 0 && this.emptyEl) {
      this.emptyEl.classList.remove('d-none');
    }
  }

  showError() {
    if (this.grid) this.grid.innerHTML = '';
    if (this.infoEl) this.infoEl.innerHTML = '';
    this.hideLoading();
    if (this.emptyEl) {
      this.emptyEl.classList.remove('d-none');
      this.emptyEl.innerHTML =
        '<i class="bi bi-exclamation-triangle d-block mb-2 fs-1 opacity-50 text-danger"></i><p class="text-muted mb-0">Failed to load marketplace. Please try again.</p>';
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

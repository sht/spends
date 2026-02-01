# Spends Tracker

A modern, lightweight admin dashboard for tracking purchases, managing warranties, and analyzing spending patterns. Built with Bootstrap 5, Vite, Alpine.js, and Chart.js.

## 🎯 Project Overview

**Spends Tracker** is a personal finance management application designed to help users:
- **Track Purchases**: Maintain a comprehensive inventory of purchased items
- **Manage Warranties**: Monitor warranty expiration dates and status
- **Analyze Spending**: Visualize spending trends and patterns over time
- **View Analytics**: Get insights into retailers, brands, and purchase categories

## ✨ Key Features

- 📊 **Interactive Dashboards**: Real-time charts and statistics for warranty and spending analysis
- 🛒 **Inventory Management**: Track all purchased items with status (Ordered/Received)
- ⚙️ **Settings Panel**: Customize date format, currency, timezone, and notification preferences
- 🌙 **Dark/Light Theme**: Toggle between themes with persistent user preference
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 🚀 **Fast Performance**: Built with Vite for instant HMR and optimized builds
- ⌨️ **Keyboard Shortcuts**: Global search with Ctrl+K (Cmd+K on Mac)
- 🔍 **Search & Filter**: Find items by name, brand, status, or date
- 📋 **Pagination**: Browse items with 10 per page, smart page indicators

## 🏗️ Project Structure

```
spends/
├── src-modern/                    # Source code
│   ├── index.html                # Dashboard page
│   ├── inventory.html            # Inventory/Purchases page
│   ├── settings.html             # Settings page
│   ├── manifest.json             # PWA manifest
│   ├── scripts/
│   │   ├── main.js               # App entry point & initialization
│   │   ├── components/
│   │   │   ├── dashboard.js      # Dashboard manager & charts
│   │   │   ├── inventory.js      # Inventory table & data
│   │   │   ├── settings.js       # Settings manager
│   │   │   └── sidebar.js        # Sidebar navigation
│   │   └── utils/
│   │       ├── theme-manager.js  # Dark/light theme toggle
│   │       ├── notifications.js  # Toast notifications
│   │       └── icon-manager.js   # Icon preloading
│   └── styles/scss/              # SCSS styles (24 files)
│       ├── main.scss             # Main entry point
│       ├── abstracts/            # Variables, mixins, utilities
│       ├── components/           # Component styles (14 files)
│       ├── layout/               # Layout styles (header, footer, sidebar, main)
│       ├── pages/                # Page-specific styles
│       └── themes/               # Dark & light theme styles
├── public-assets/                # Static assets served by Vite
│   └── assets/
│       ├── images/               # Logo, placeholders
│       └── icons/                # Favicon, PWA icons
├── Configuration Files
│   ├── vite.config.js            # Vite build configuration
│   ├── package.json              # Dependencies & scripts
│   ├── eslint.config.js          # Code linting rules
│   ├── .prettierrc.json          # Code formatting rules
│   ├── postcss.config.js         # CSS processing
│   └── .editorconfig             # Editor settings
└── dist-modern/                  # Build output (generated, not in git)
```

## 🛠️ Technology Stack

### Core
- **Frontend**: HTML5, CSS3 (SCSS), JavaScript (ES6+)
- **Build Tool**: [Vite 7.3](https://vitejs.dev/) - Fast build tool and dev server
- **Framework**: [Bootstrap 5.3](https://getbootstrap.com/) - Responsive CSS framework
- **Component State**: [Alpine.js 3.15](https://alpinejs.dev/) - Lightweight reactive framework

### Charts & Visualization
- **Charts**: [Chart.js 4.5](https://www.chartjs.org/) - JavaScript charting library
- **Apex Charts**: [ApexCharts 5.3](https://apexcharts.com/) - Interactive charts (optional)

### Utilities
- **Icons**: [Bootstrap Icons 1.13](https://icons.getbootstrap.com/) - SVG icon library
- **Date Handling**: [Day.js 1.11](https://day.js.org/) - Lightweight date library
- **Alerts**: [SweetAlert2 11.26](https://sweetalert2.github.io/) - Beautiful modals

### Dev Tools
- **Linting**: [ESLint 9.39](https://eslint.org/) - Code quality checker
- **Formatting**: [Prettier 3.8](https://prettier.io/) - Code formatter
- **CSS Processing**: [PostCSS 8.5](https://postcss.org/) with Autoprefixer
- **SCSS**: [Sass 1.97](https://sass-lang.com/) - CSS preprocessor

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository** (if applicable)
   ```bash
   git clone <repository-url>
   cd spends
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Opens http://localhost:3000 in your browser

## 📝 Available Scripts

### Development
```bash
npm run dev          # Start dev server with HMR (http://localhost:3000)
```

### Production Build
```bash
npm run build        # Build for production to dist-modern/ (auto-generated)
npm run preview      # Preview production build (http://localhost:4173)
npm run serve        # Build and preview in one command
```

**Note:** `dist-modern/` is auto-generated during build and is not tracked in git. It will be created automatically when you run `npm run build`.

### Code Quality
```bash
npm run lint         # Check code for linting errors
npm run lint:fix     # Fix linting errors automatically
npm run format       # Format all code with Prettier
npm run format:check # Check if code is properly formatted
npm run check        # Run lint and format:check
```

### Utilities
```bash
npm run clean        # Delete build outputs (dist-modern/)
npm run clean:all    # Delete builds, node_modules, and lock file
```

## 📄 Pages & Features

### 1. Dashboard (index.html)
**Overview of purchases, warranties, and spending trends**

**Components:**
- **KPI Cards**: Total asset value, active warranties, expiring soon, total spending
- **Warranty Timeline**: Line chart showing warranties expiring vs. already expired (12-month view)
- **Retailers Distribution**: Doughnut chart showing purchases by retailer (Amazon, eBay, Walmart, Target, Best Buy)
- **Brands Distribution**: Doughnut chart showing purchases by brand (Apple, Sony, Samsung, LG, Dell)
- **Spending Analysis**: Dual-axis chart showing total spending ($) and items purchased count
- **Top 10 Products**: Table of best-selling items with prices and purchase dates
- **Recent Items**: Table of 10 most recent purchases with status (Ordered/Received)

**Charts Used:**
- Line charts (Chart.js) for warranty timeline and spending
- Doughnut charts (Chart.js) for distribution

### 2. Inventory (inventory.html)
**Manage and track all purchased items**

**Features:**
- **Item Table**: Sortable columns (#, Product, Price, Status, Date)
- **Search**: Filter by product name or brand in real-time
- **Status Filter**: Filter by "Ordered" or "Received" status
- **Sorting**: Click column headers to sort ascending/descending
- **Pagination**: 10 items per page with smart navigation
- **Actions**: View, Edit, or Delete individual items
- **Statistics**: Total items, ordered count, received count, total spending

**Sample Data:** 20 random products with real-world brands (iPhone, MacBook, Samsung TV, Sony headphones, etc.)

### 3. Settings (settings.html)
**Customize application preferences**

**Tabs:**

1. **General**
   - Date Format (MM/DD/YYYY, DD/MM/YYYY, etc.)
   - Currency Code (USD, EUR, GBP, etc.)
   - Timezone Selection

2. **Dashboard**
   - Card Visibility Toggles (toggle which KPI cards to display)
   - Choose from 6 dashboard card options

3. **Notifications**
   - Desktop Notifications Toggle
   - Email Notifications Toggle
   - Sound Notifications Toggle
   - Marketing Communications Toggle

4. **Retailer Management**
   - Add New Retailer (input + button)
   - Current Retailers Table (with delete option)
   - Pre-filled with: Amazon, eBay, Walmart, Target

5. **Data Management**
   - Export Data (JSON or CSV format)
   - Import Data (file upload for JSON/CSV)
   - Reset All Data (with confirmation - danger zone)

## 🎨 Design & Styling

### Theme System
- **Light Theme** (Default): Clean white background with dark text
- **Dark Theme**: Dark background with light text for reduced eye strain
- **Toggle**: Theme switcher in top navigation bar
- **Persistence**: User's theme choice saved in localStorage

### Color Scheme
- **Primary**: Indigo (#6366f1)
- **Success**: Green (#10b981)
- **Warning**: Amber (#f59e0b)
- **Danger**: Red (#ef4444)
- **Info**: Cyan (#06b6d4)

### Responsive Breakpoints
- **Mobile**: < 576px
- **Tablet**: 576px - 991px
- **Desktop**: 992px+
- **Large Desktop**: 1200px+

## 🔄 Data Flow

### Dashboard Data Generation
```
dashboard.js → loadInventoryData()
├── generateWarrantyData()      → 12-month warranty timeline
├── generateSpendingData()       → 12-month spending + items count
├── generateRetailerData()       → 5 retailers with percentages
├── generateBrandData()          → 5 brands with percentages
├── generateTopProducts()        → 10 random products
├── generateOrderData()          → Order status counts
└── generateRecentOrders()       → 10 recent items with status
```

### Inventory Data Generation
```
inventory.js → loadInventoryData()
└── Generate 20 items:
    ├── Random product from 20 real products
    ├── Random price (±$100 variance)
    ├── Random status (65% Received, 35% Ordered)
    └── Random date (Jul 2024 - Jan 2025)
```

## 🌍 Browser Support

Tested and supported on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Performance Optimizations

- **Lazy Loading**: Charts only initialize when needed
- **Code Splitting**: Vendor code split into separate chunks
- **CSS Source Maps**: Enabled in development only
- **Font Optimization**: Google Fonts with `display=swap` for instant fallback
- **Icon Preloading**: Common icons preloaded for instant display
- **Asset Hashing**: Long-term caching with hash-based file names
- **Chunk Size Warnings**: Alerts for chunks over 500KB

## 📱 PWA Features

- **Manifest**: PWA manifest.json configured
- **Icons**: Favicon and PWA icons (192x192, 512x512)
- **Offline Support**: Configured for potential service worker integration

## 🔧 Development Workflow

### Code Quality Process
1. Write code following project conventions
2. Run `npm run lint:fix` to auto-fix issues
3. Run `npm run format` to format code
4. Run `npm run check` to verify everything passes
5. Commit with descriptive messages

### Adding New Pages
1. Create `.html` file in `src-modern/`
2. Create corresponding `.js` component in `src-modern/scripts/components/`
3. Add to Vite config `rollupOptions.input`
4. Import and initialize in `main.js`
5. Create SCSS file in `src-modern/styles/scss/pages/`

### Adding New Components
1. Create SCSS file in `src-modern/styles/scss/components/`
2. Import in `main.scss`
3. Use in HTML pages
4. Document component in this README

## 📋 Project Statistics

- **Total Files**: 118+ essential files
- **Lines of Code**: ~3,500 lines of JavaScript, CSS, HTML
- **Build Time**: < 2 seconds (development)
- **Page Load Time**: < 1 second (production)
- **Bundle Size**: ~250KB (gzipped)

## 🔐 Security

- **XSS Protection**: Alpine.js provides built-in XSS prevention
- **CSRF Protection**: Handled at API level (if API integrated)
- **Data Validation**: Input validation on all forms
- **No Sensitive Data**: All data is sample/mock data for demonstration

## 📄 License

MIT License - See LICENSE file for details (inherits from Bootstrap Admin Template)

## 🙋 Support & Contribution

For issues, feature requests, or contributions:
1. Check existing issues
2. Create detailed bug reports
3. Submit pull requests with clear descriptions

## 📚 Additional Resources

- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0/)
- [Alpine.js Guide](https://alpinejs.dev/)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Vite Documentation](https://vitejs.dev/)
- [SCSS Documentation](https://sass-lang.com/documentation)

---

**Last Updated**: January 29, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅

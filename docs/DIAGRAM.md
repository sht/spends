# Spends Tracker — Architecture Diagram

```mermaid
flowchart TD
    Browser[Browser] -->|:3030| Vite[Vite Dev Server]
    Vite -->|Proxy /api/*| FastAPI[FastAPI :3031]

    subgraph Frontend["Frontend — src-modern/"]
        Vite --> HTML[HTML Pages<br/>index, inventory, retailers,<br/>settings, data-management]
        HTML --> MainJS[main.js]
        MainJS --> Alpine[Alpine.js Components]
        MainJS --> Bootstrap[Bootstrap 5 + SCSS]
        Alpine --> FComponents[dashboard.js, inventory.js,<br/>settings.js, retailers.js,<br/>data-management.js, sidebar.js]
        MainJS --> Utils[theme-manager, notifications,<br/>icon-manager]
    end

    subgraph Backend["Backend — backend/app/"]
        FastAPI --> Routes[API Routes]
        Routes --> R1["/api/purchases"]
        Routes --> R2["/api/warranties"]
        Routes --> R3["/api/retailers + brands"]
        Routes --> R4["/api/analytics"]
        Routes --> R5["/api/files"]
        Routes --> R6["/api/export + import"]
        Routes --> R7["/api/data"]
        Routes --> R8["/api/settings"]
        R1 --> Services["Service Layer"]
        R2 --> Services
        R3 --> Services
        R4 --> Services
        R5 --> Services
        R6 --> Services
        R7 --> Services
        R8 --> Services
    end

    subgraph Data["Data Layer"]
        Services --> ORM["SQLAlchemy Models<br/>Purchase, Warranty, Retailer,<br/>Brand, File, Setting"]
        ORM --> DB["(SQLite / PostgreSQL)"]
        Alembic["Alembic Migrations"] --> DB
    end

    subgraph Deploy["Build and Deploy"]
        Build["npm run build"] --> Dist["dist-modern/"]
        Dist --> FastAPI
        Docker["Docker"] --> FastAPI
    end
```

## Summary

- **Frontend**: Multi-page app with Alpine.js + Bootstrap 5, built by Vite. Pages for dashboard, inventory, retailers, settings, and data management.
- **Backend**: FastAPI with a clean Routes → Services → Models layered architecture. 8 API route groups.
- **Data**: SQLAlchemy ORM with 6 models (Purchase, Warranty, Retailer, Brand, File, Setting). SQLite in dev, PostgreSQL in prod. Migrations via Alembic.
- **Dev flow**: Vite (`:3030`) proxies `/api/*` to FastAPI (`:3031`). In production, FastAPI serves the built `dist-modern/` static files directly.

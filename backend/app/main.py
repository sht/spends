from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.config import settings
from app.routes import purchases, warranties, retailers, brands, analytics, exports, imports

app = FastAPI(title="Spends Tracker API", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine the base directory (backend folder)
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent

# Check if dist-modern exists (production build)
dist_dir = PROJECT_ROOT / "dist-modern"

if dist_dir.exists():
    # Production mode: serve built files
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")
else:
    # Development mode: serve from src-modern
    src_dir = PROJECT_ROOT / "src-modern"
    if src_dir.exists():
        scripts_dir = src_dir / "scripts"
        if scripts_dir.exists():
            app.mount("/scripts", StaticFiles(directory=str(scripts_dir)), name="scripts")
        
        styles_dir = src_dir / "styles"
        if styles_dir.exists():
            app.mount("/styles", StaticFiles(directory=str(styles_dir)), name="styles")
        
        assets_dir = src_dir / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

# Mount public-assets if it exists
public_assets_dir = PROJECT_ROOT / "public-assets"
if public_assets_dir.exists():
    app.mount("/public-assets", StaticFiles(directory=str(public_assets_dir)), name="public-assets")

# Setup Jinja2 templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Include API routers
app.include_router(purchases.router)
app.include_router(warranties.router)
app.include_router(retailers.router)
app.include_router(brands.router)
app.include_router(analytics.router)
app.include_router(exports.router)
app.include_router(imports.router)


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Serve the dashboard page."""
    return templates.TemplateResponse("dashboard.html", {"request": request, "active_page": "dashboard"})


@app.get("/inventory", response_class=HTMLResponse)
async def inventory(request: Request):
    """Serve the inventory page."""
    return templates.TemplateResponse("inventory.html", {"request": request, "active_page": "inventory"})


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    """Serve the settings page."""
    return templates.TemplateResponse("settings.html", {"request": request, "active_page": "settings"})


@app.get("/manifest.json")
async def manifest():
    """Serve the PWA manifest file."""
    manifest_path = PROJECT_ROOT / "src-modern" / "manifest.json"
    if manifest_path.exists():
        return FileResponse(str(manifest_path))
    return {"error": "Manifest not found"}


@app.get("/api")
async def root():
    return {"message": "Welcome to the Spends Tracker API"}

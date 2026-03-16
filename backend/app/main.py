from pathlib import Path
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from app.config import settings
from app.routes import (
    purchases,
    warranties,
    retailers,
    brands,
    analytics,
    exports,
    imports,
    files,
    data,
    settings,
    public,
)
from app.database import get_db
from app.services.purchase_service import get_purchase
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI(title="Spends Tracker API", version="0.1.0")

# CORS middleware - Allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine the base directory (backend folder)
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent

# In Docker container, everything is in /app/, so adjust PROJECT_ROOT
if (PROJECT_ROOT / "dist-modern").exists():
    dist_dir = PROJECT_ROOT / "dist-modern"
elif (Path("/app/dist-modern")).exists():
    dist_dir = Path("/app/dist-modern")
else:
    dist_dir = None

# Path to asset viewer HTML
ASSET_HTML = dist_dir / "asset.html" if dist_dir else None


@app.get("/api")
async def root():
    """API root endpoint."""
    return {"message": "Welcome to the Spends Tracker API", "version": "0.1.0"}


@app.get("/asset/{purchase_id}", response_class=HTMLResponse)
async def serve_asset_viewer(request: Request, purchase_id: str, db: AsyncSession = Depends(get_db)):
    """
    Serve the asset viewer page at /asset/{id} URL.
    This allows shareable links like /asset/{uuid} to work directly.
    """
    # Verify asset exists first
    purchase = await get_purchase(db, purchase_id)
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Asset not found or has been deleted")
    
    # Serve the asset.html file
    if ASSET_HTML and ASSET_HTML.exists():
        return FileResponse(str(ASSET_HTML))
    else:
        raise HTTPException(status_code=404, detail="Asset viewer not available")

# Include API routers (all under /api prefix)
app.include_router(purchases)
app.include_router(warranties)
app.include_router(retailers)
app.include_router(brands)
app.include_router(analytics)
app.include_router(exports)
app.include_router(imports)
app.include_router(files)
app.include_router(data)
app.include_router(settings.router)
app.include_router(public.router)


# Mount public-assets for static resources (images, icons, etc.)
public_assets_dir = PROJECT_ROOT / "public-assets"
if public_assets_dir.exists():
    app.mount(
        "/public-assets",
        StaticFiles(directory=str(public_assets_dir)),
        name="public-assets",
    )

# Check if dist-modern exists (production build)

if dist_dir.exists():
    # Production mode: serve static built frontend files
    # This must be last to avoid conflicting with API routes
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
else:
    # Development mode: Vite dev server should be running separately on port 3000
    # Backend API runs on port 8000
    # Frontend proxies API requests from 3000 -> 8000
    print("⚠️  dist-modern/ not found. Run 'npm run build' to build the frontend.")
    print("💡 In development, run 'npm run dev' separately for the frontend.")

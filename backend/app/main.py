from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.routes import purchases, warranties, retailers, brands, analytics, exports, imports, files

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

# Include API routers (all under /api prefix)
app.include_router(purchases)
app.include_router(warranties)
app.include_router(retailers)
app.include_router(brands)
app.include_router(analytics)
app.include_router(exports)
app.include_router(imports)
app.include_router(files)


@app.get("/api")
async def root():
    """API root endpoint."""
    return {"message": "Welcome to the Spends Tracker API", "version": "0.1.0"}


# Mount public-assets for static resources (images, icons, etc.)
public_assets_dir = PROJECT_ROOT / "public-assets"
if public_assets_dir.exists():
    app.mount("/public-assets", StaticFiles(directory=str(public_assets_dir)), name="public-assets")

# Check if dist-modern exists (production build)
dist_dir = PROJECT_ROOT / "dist-modern"

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

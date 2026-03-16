from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from app.database import get_db
from app.models.purchase import Purchase
from app.schemas.purchase import PurchaseResponse
from app.services.purchase_service import get_purchase

router = APIRouter(prefix="/api/public", tags=["public"])

# Get the path to the built frontend assets
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DIST_DIR = BASE_DIR / "dist-modern"
ASSET_HTML = DIST_DIR / "asset.html"


@router.get("/asset/{purchase_id}", response_model=PurchaseResponse)
async def get_public_asset(purchase_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a single purchase by ID for public sharing.
    Returns 404 if the purchase doesn't exist or has been deleted.
    """
    purchase = await get_purchase(db, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Asset not found or has been deleted")
    return purchase


@router.get("/asset-page/{purchase_id}", response_class=HTMLResponse)
async def get_asset_viewer_page(request: Request, purchase_id: str, db: AsyncSession = Depends(get_db)):
    """
    Serve the asset viewer HTML page for a specific purchase.
    This endpoint verifies the asset exists before serving the page.
    """
    # Verify asset exists
    purchase = await get_purchase(db, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Asset not found or has been deleted")
    
    # Serve the asset.html file
    if ASSET_HTML.exists():
        return FileResponse(str(ASSET_HTML))
    else:
        # Fallback: return a simple HTML page
        return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asset Viewer - Spends Tracker</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container py-5">
        <div class="text-center">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Asset viewer loading...</p>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.4/dist/cdn.min.js" defer></script>
    <script>
        // Redirect to the main asset.html with the ID in the URL
        window.location.href = '/asset.html?id=' + encodeURIComponent(window.location.pathname.split('/').pop());
    </script>
</body>
</html>
        """)


@router.get("/asset/{purchase_id}", response_class=HTMLResponse)
async def serve_asset_viewer(request: Request, purchase_id: str, db: AsyncSession = Depends(get_db)):
    """
    Serve the asset viewer page at /asset/{id} URL.
    This allows shareable links like /asset/{uuid} to work directly.
    """
    # Verify asset exists (return 404 if not found)
    purchase = await get_purchase(db, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Asset not found or has been deleted")
    
    # Serve the asset.html file - the JS will read the ID from the URL path
    if ASSET_HTML.exists():
        return FileResponse(str(ASSET_HTML))
    else:
        raise HTTPException(status_code=404, detail="Asset viewer not available")

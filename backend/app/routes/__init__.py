from .purchases import router as purchases_router
from .warranties import router as warranties_router
from .retailers import router as retailers_router
from .brands import router as brands_router

__all__ = ["purchases_router", "warranties_router", "retailers_router", "brands_router"]
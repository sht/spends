from .purchases import router as purchases
from .warranties import router as warranties
from .retailers import router as retailers
from .brands import router as brands
from .analytics import router as analytics
from .exports import router as exports
from .imports import router as imports
from .files import router as files
from .data import router as data

__all__ = ["purchases", "warranties", "retailers", "brands", "analytics", "exports", "imports", "files", "data"]
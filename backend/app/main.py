from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import purchases, warranties, retailers, brands, analytics

app = FastAPI(title="Spends Tracker API", version="0.1.0")


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(purchases.router)
app.include_router(warranties.router)
app.include_router(retailers.router)
app.include_router(brands.router)
app.include_router(analytics.router)


@app.get("/")
async def root():
    return {"message": "Welcome to the Spends Tracker API"}
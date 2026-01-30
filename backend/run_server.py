import uvicorn
from app.config import settings


def run_dev_server():
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )


if __name__ == "__main__":
    run_dev_server()
import asyncio
from alembic.config import Config
from alembic import command
from app.config import settings


def create_initial_migration():
    # Create Alembic configuration
    alembic_cfg = Config("alembic.ini")
    
    # Set the database URL from settings
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
    
    # Generate the initial migration
    command.revision(alembic_cfg, autogenerate=True, message="Initial migration")


if __name__ == "__main__":
    create_initial_migration()
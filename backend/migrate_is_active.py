from database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
cols = [col['name'] for col in inspector.get_columns('job_offers')]
print("job_offers columns:", cols)

if 'is_active' not in cols:
    print("-> Column 'is_active' MISSING. Running migration...")
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE job_offers ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.commit()
    print("-> Migration complete! Column 'is_active' added.")
else:
    print("-> Column 'is_active' already exists. No migration needed.")

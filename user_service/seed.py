from database import engine, SessionLocal
from sqlalchemy import text
import models

with engine.connect() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS user_service"))
    conn.commit()

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    existing = db.query(models.Role).first()
    if existing:
        print("Data already seeded, skipping.")
    else:
        roles = [
            models.Role(name="admin", description="Full access administrator"),
            models.Role(name="manager", description="Can manage orders and users"),
            models.Role(name="customer", description="Regular customer"),
        ]
        db.add_all(roles)
        db.flush()

        users = [
            models.User(username="alice_admin", email="alice@example.com", full_name="Alice Smith", role_id=roles[0].id),
            models.User(username="bob_manager", email="bob@example.com", full_name="Bob Johnson", role_id=roles[1].id),
            models.User(username="carol_user", email="carol@example.com", full_name="Carol White", role_id=roles[2].id),
            models.User(username="dave_user", email="dave@example.com", full_name="Dave Brown", role_id=roles[2].id),
            models.User(username="eve_user", email="eve@example.com", full_name="Eve Davis", role_id=roles[2].id),
        ]
        db.add_all(users)
        db.commit()
        print("UserService data seeded successfully!")

finally:
    db.close()

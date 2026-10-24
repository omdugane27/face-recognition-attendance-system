import os
from sqlalchemy import select
from app.core import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User, Role

def main():
    email = os.getenv("SEED_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("SEED_ADMIN_PASSWORD", "")
    if not email or len(password) < 14:
        raise SystemExit("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (minimum 14 characters) in .env.")
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            print(f"Seed admin already exists: {email}"); return
        db.add(User(email=email, full_name="Demo Administrator", password_hash=hash_password(password), role=Role.admin))
        db.commit(); print(f"Created local demo admin: {email}")
if __name__ == "__main__": main()

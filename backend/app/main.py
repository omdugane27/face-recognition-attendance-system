import os
from datetime import datetime, timedelta, timezone
from typing import Generator

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from pwdlib import PasswordHash
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "development-only-change-this-secret-before-deploying")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="teacher")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_name: Mapped[str] = mapped_column(String(120))
    subject: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id"), index=True)
    student_identifier: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(20), default="present")
    method: Mapped[str] = mapped_column(String(20), default="manual")
    marked_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Student Attendance API", version="0.1.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET","POST","PUT","PATCH","DELETE"], allow_headers=["Authorization","Content-Type"])

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate":"Bearer"})
    user = db.get(User, user_id)
    if not user or not user.is_active: raise HTTPException(status_code=401, detail="User is inactive or missing")
    return user

class SessionCreate(BaseModel):
    class_name: str
    subject: str

class ManualAttendance(BaseModel):
    student_identifier: str
    status: str = "present"

@app.get("/health")
def health(): return {"status":"ok", "service":"attendance-api"}

@app.post("/api/v1/auth/token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not password_hash.verify(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active: raise HTTPException(status_code=403, detail="Account disabled")
    token = jwt.encode({"sub":str(user.id), "exp":datetime.now(timezone.utc)+timedelta(minutes=JWT_EXPIRE_MINUTES)}, JWT_SECRET_KEY, algorithm="HS256")
    return {"access_token":token, "token_type":"bearer"}

@app.get("/api/v1/auth/me")
def me(user: User = Depends(get_current_user)):
    return {"id":user.id, "email":user.email, "full_name":user.full_name, "role":user.role}

@app.get("/api/v1/attendance/sessions")
def list_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(AttendanceSession).order_by(AttendanceSession.created_at.desc()).limit(100)).all()
    return [{"id":r.id,"class_name":r.class_name,"subject":r.subject,"status":r.status,"created_at":r.created_at} for r in rows]

@app.post("/api/v1/attendance/sessions")
def create_session(body: SessionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "teacher"): raise HTTPException(status_code=403, detail="Only admins and teachers can create sessions")
    row = AttendanceSession(class_name=body.class_name.strip(), subject=body.subject.strip(), created_by=user.id)
    db.add(row); db.commit(); db.refresh(row)
    return {"id":row.id,"class_name":row.class_name,"subject":row.subject,"status":row.status}

@app.post("/api/v1/attendance/sessions/{session_id}/records")
def mark_manual(session_id: int, body: ManualAttendance, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "teacher"): raise HTTPException(status_code=403, detail="Only admins and teachers can mark attendance")
    if body.status not in ("present", "late", "excused", "absent"): raise HTTPException(status_code=422, detail="Unsupported status")
    session = db.get(AttendanceSession, session_id)
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    record = AttendanceRecord(session_id=session_id, student_identifier=body.student_identifier.strip(), status=body.status, method="manual", marked_by=user.id)
    db.add(record); db.commit(); db.refresh(record)
    return {"id":record.id,"session_id":session_id,"student_identifier":record.student_identifier,"status":record.status,"method":"manual"}

@app.post("/api/v1/admin/create-user")
def create_user(email: str, full_name: str, password: str, role: str = "teacher", db: Session = Depends(get_db)):
    if os.getenv("ALLOW_INSECURE_BOOTSTRAP", "false").lower() != "true": raise HTTPException(status_code=404, detail="Not found")
    if role not in ("admin","teacher","student","parent"): raise HTTPException(status_code=422, detail="Invalid role")
    if len(password) < 14: raise HTTPException(status_code=422, detail="Password must be at least 14 characters")
    email = email.lower().strip()
    if db.scalar(select(User).where(User.email == email)): raise HTTPException(status_code=409, detail="Email already exists")
    user = User(email=email, full_name=full_name.strip(), password_hash=password_hash.hash(password), role=role)
    db.add(user); db.commit(); db.refresh(user)
    return {"id":user.id,"email":user.email,"role":user.role}

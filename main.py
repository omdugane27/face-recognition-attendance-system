from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core import settings, verify_password, create_access_token, get_current_claims, require_roles
from app.database import Base, engine, get_db
from app.models import User, Role, AttendanceSession, AttendanceRecord, SessionStatus
from app.schemas import LoginRequest, TokenResponse, SessionCreate, SessionOut, ManualAttendanceRequest, UserOut

app = FastAPI(title="Face Attendance System API", version="0.1.0", description="Consent-based student attendance platform foundation.")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",") if x.strip()], allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])

@app.on_event("startup")
def startup():
    # Local scaffold convenience. Use versioned Alembic migrations before production.
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"status": "ok", "service": "attendance-api"}

@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(body.email).lower()))
    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_access_token(user.id, user.role.value), "user": user}

@app.get("/api/v1/auth/me", response_model=UserOut)
def me(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    user = db.get(User, claims["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User is not active")
    return user

@app.post("/api/v1/attendance-sessions", response_model=SessionOut, status_code=201)
def create_session(body: SessionCreate, claims: dict = Depends(require_roles("admin", "teacher")), db: Session = Depends(get_db)):
    session = AttendanceSession(class_id=body.class_id, subject_id=body.subject_id, teacher_id=claims["sub"], method=body.method, status=SessionStatus.draft)
    db.add(session)
    try:
        db.commit(); db.refresh(session)
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=422, detail="Invalid class or subject")
    return session

@app.post("/api/v1/attendance-sessions/{session_id}/start", response_model=SessionOut)
def start_session(session_id: str, claims: dict = Depends(require_roles("admin", "teacher")), db: Session = Depends(get_db)):
    session = db.get(AttendanceSession, session_id)
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    if claims["role"] != "admin" and session.teacher_id != claims["sub"]: raise HTTPException(status_code=403, detail="This session belongs to another teacher")
    if session.status != SessionStatus.draft: raise HTTPException(status_code=409, detail="Only draft sessions can be started")
    session.status = SessionStatus.active; session.started_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(session)
    return session

@app.post("/api/v1/attendance-records/manual", status_code=201)
def manual_attendance(body: ManualAttendanceRequest, claims: dict = Depends(require_roles("admin", "teacher")), db: Session = Depends(get_db)):
    session = db.get(AttendanceSession, body.session_id)
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    if claims["role"] != "admin" and session.teacher_id != claims["sub"]: raise HTTPException(status_code=403, detail="This session belongs to another teacher")
    if session.status != SessionStatus.active: raise HTTPException(status_code=409, detail="Attendance requires an active session")
    student = db.get(User, body.student_id)
    if not student or student.role != Role.student or not student.is_active: raise HTTPException(status_code=404, detail="Active student not found")
    record = AttendanceRecord(session_id=session.id, student_id=student.id, status=body.status, method="manual", recorded_by=claims["sub"], reason=body.reason)
    db.add(record)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=409, detail="Attendance already exists for this student and session")
    return {"id": record.id, "session_id": record.session_id, "student_id": record.student_id, "status": record.status.value}

@app.get("/api/v1/admin/summary")
def admin_summary(claims: dict = Depends(require_roles("admin"))):
    return {"status": "foundation", "message": "Live reporting aggregates are not implemented yet."}

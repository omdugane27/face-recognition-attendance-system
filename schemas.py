from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models import Role, AttendanceStatus, SessionStatus

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: EmailStr
    full_name: str
    role: Role
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class SessionCreate(BaseModel):
    class_id: str
    subject_id: str
    method: str = Field(pattern="^(classroom|individual|manual)$")

class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    class_id: str
    subject_id: str
    teacher_id: str
    status: SessionStatus
    method: str

class ManualAttendanceRequest(BaseModel):
    session_id: str
    student_id: str
    status: AttendanceStatus
    reason: str = Field(min_length=3, max_length=500)

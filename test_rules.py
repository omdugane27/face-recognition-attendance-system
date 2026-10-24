from app.models import AttendanceStatus, SessionStatus

def test_attendance_statuses_are_explicit():
    assert {x.value for x in AttendanceStatus} == {"present", "absent", "late", "excused"}

def test_session_lifecycle_has_explicit_states():
    assert {x.value for x in SessionStatus} == {"draft", "active", "paused", "closed", "finalized"}

from datetime import datetime, timedelta, timezone
from typing import Annotated
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./attendance.db"
    jwt_secret_key: str = "local-only-change-this-secret-before-deploy"
    jwt_access_token_minutes: int = 20
    cors_origins: str = "http://localhost:3000"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)

def create_access_token(subject: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "role": role, "iat": now, "exp": now + timedelta(minutes=settings.jwt_access_token_minutes)}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")

def unauthorized() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required", headers={"WWW-Authenticate": "Bearer"})

def get_current_claims(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
        if not payload.get("sub") or not payload.get("role"):
            raise unauthorized()
        return payload
    except jwt.PyJWTError:
        raise unauthorized()

def require_roles(*roles: str):
    def dependency(claims: Annotated[dict, Depends(get_current_claims)]) -> dict:
        if claims.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return claims
    return dependency

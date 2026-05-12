from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import os

SECRET_KEY      = os.getenv("SECRET_KEY", "change-me-in-production-use-32-chars-min")
ALGORITHM       = "HS256"
ACCESS_EXPIRE   = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
REFRESH_EXPIRE  = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, hash_str: str) -> bool:
    return bcrypt.checkpw(senha.encode("utf-8"), hash_str.encode("utf-8"))


def criar_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE)
    payload["type"] = "access"
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def criar_refresh_token(data: dict) -> tuple[str, datetime]:
    expira = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE)
    payload = data.copy()
    payload["exp"] = expira
    payload["type"] = "refresh"
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), expira


def decodificar_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

"""
Utilitários de criptografia para o Cofre de Senhas.
Usa Fernet (AES-128-CBC + HMAC-SHA256) com chave do ambiente (VAULT_KEY).
"""
import os
import secrets
import string
from cryptography.fernet import Fernet

_KEY = os.getenv("VAULT_KEY", "").encode()
_fernet = Fernet(_KEY) if _KEY else None


def _get_fernet() -> Fernet:
    global _fernet, _KEY
    if _fernet is None:
        _KEY = os.getenv("VAULT_KEY", "").encode()
        if not _KEY:
            raise RuntimeError("VAULT_KEY não configurado no ambiente.")
        _fernet = Fernet(_KEY)
    return _fernet


def criptografar(texto: str) -> str:
    """Criptografa uma string e retorna o token em base64."""
    return _get_fernet().encrypt(texto.encode()).decode()


def descriptografar(token: str) -> str:
    """Descriptografa um token Fernet e retorna o texto original."""
    return _get_fernet().decrypt(token.encode()).decode()


def gerar_senha(tamanho: int = 16) -> str:
    """
    Gera uma senha segura com letras, números e símbolos.
    Garante ao menos 1 maiúscula, 1 minúscula, 1 número e 1 símbolo.
    """
    simbolos = "!@#$%&*"
    alfabeto = string.ascii_letters + string.digits + simbolos
    while True:
        senha = "".join(secrets.choice(alfabeto) for _ in range(tamanho))
        if (any(c.isupper() for c in senha)
                and any(c.islower() for c in senha)
                and any(c.isdigit() for c in senha)
                and any(c in simbolos for c in senha)):
            return senha

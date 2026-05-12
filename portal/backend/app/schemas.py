from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class RoboBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: bool = True

class RoboCreate(RoboBase):
    pass

class RoboOut(RoboBase):
    id: int
    criado_em: datetime
    class Config:
        from_attributes = True


class AgendamentoBase(BaseModel):
    cron_expr: str
    ativo: bool = True

class AgendamentoCreate(AgendamentoBase):
    robo_id: int

class AgendamentoOut(AgendamentoBase):
    id: int
    robo_id: int
    proximo_run: Optional[datetime]
    criado_em: datetime
    class Config:
        from_attributes = True


class ExecucaoCreate(BaseModel):
    robo_id: int
    status: str
    credenciais_com_erro: List[str] = []
    total_erros: int = 0
    mensagem: Optional[str] = None
    finalizado_em: Optional[datetime] = None

class ExecucaoOut(ExecucaoCreate):
    id: int
    iniciado_em: datetime
    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_robos: int
    robos_ativos: int
    total_execucoes: int
    execucoes_com_falha: int
    ultima_execucao: Optional[datetime]
    credenciais_com_erro: List[str]

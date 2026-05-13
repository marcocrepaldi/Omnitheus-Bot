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
    robo_nome: Optional[str] = None
    class Config:
        from_attributes = True


class ExecucaoMini(BaseModel):
    id: int
    robo_nome: Optional[str]
    status: str
    iniciado_em: datetime
    finalizado_em: Optional[datetime]
    total_erros: int
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_robos: int
    robos_ativos: int
    total_execucoes: int
    execucoes_com_falha: int
    ultima_execucao: Optional[datetime]
    ultima_execucao_status: Optional[str]
    ultima_execucao_robo: Optional[str]
    ultima_execucao_duracao: Optional[int]   # segundos
    credenciais_com_erro: List[str]
    ultimas_execucoes: List[ExecucaoMini]

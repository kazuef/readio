from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)

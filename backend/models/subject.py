from pydantic import BaseModel, Field, ConfigDict
import uuid

class Subject(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                              
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    name: str
from pydantic import BaseModel, Field, ConfigDict
import uuid

class SafeSubject(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                              
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    name: str

class Subject(SafeSubject):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
    
    user_id: uuid.UUID
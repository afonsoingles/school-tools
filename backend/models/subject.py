from enum import Enum
import uuid
from pydantic import BaseModel, ConfigDict, Field

class SubjectIcon(str, Enum):
    BOOK_OPEN = "BookOpen"
    BOOK_MARKED = "BookMarked"
    BOOK = "Book"
    LIBRARY = "Library"
    GRADUATION_CAP = "GraduationCap"
    SCHOOL = "School"
    NOTEBOOK_PEN = "NotebookPen"
    NOTEBOOK_TABS = "NotebookTabs"
    SCROLL_TEXT = "ScrollText"
    CLIPBOARD_PENCIL = "ClipboardPencil"
    CLIPBOARD_LIST = "ClipboardList"
    SIGMA = "Sigma"
    SQUARE_FUNCTION = "SquareFunction"
    PI = "Pi"
    CALCULATOR = "Calculator"
    DRAFTING_COMPASS = "DraftingCompass"
    RULER = "Ruler"
    FLASK_CONICAL = "FlaskConical"
    ATOM = "Atom"
    DNA = "Dna"
    MICROSCOPE = "Microscope"
    TEST_TUBE = "TestTube"
    BEAKER = "Beaker"
    GLOBE = "Globe"
    GLOBE_2 = "Globe2"
    MAP = "Map"
    MAP_PINNED = "MapPinned"
    TREE_PINE = "TreePine"
    LANGUAGES = "Languages"
    SCROLL = "Scroll"
    FEATHER = "Feather"
    QUOTE = "Quote"
    HISTORY = "History"
    LANDMARK = "Landmark"
    BUILDING_2 = "Building2"
    BANKNOTE = "Banknote"
    SCALE = "Scale"
    GAVEL = "Gavel"
    CASE_SENSITIVE = "CaseSensitive"
    PALETTE = "Palette"
    BRUSH = "Brush"
    MUSIC = "Music"
    MIC_VOCAL = "MicVocal"
    DUMBBELL = "Dumbbell"
    TROPHY = "Trophy"
    MEDAL = "Medal"
    FOOTPRINTS = "Footprints"
    TIMER = "Timer"
    CODE = "Code"


class SafeSubject(BaseModel):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
                              
    id: uuid.UUID =  Field(default_factory=uuid.uuid4)
    name: str
    icon: SubjectIcon

class Subject(SafeSubject):
    model_config = ConfigDict(extra="ignore", revalidate_instances="always")
    
    user_id: uuid.UUID
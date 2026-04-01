@startuml
!theme spacelab

package "Client Layer (Frontend)" {
    [React / Vite SPA\n(Recruiter Dashboard)] as UI_React
    [PDF.js\n(Client-side CV Parsing)] as UI_PDF
    [State Management\n(Shortlist, Candidates, Offers)] as UI_State
    [Rest API Client (Fetch)\nJSON Integration] as UI_APIClient

    UI_React --> UI_PDF
    UI_React --> UI_State
    UI_State --> UI_APIClient
}

package "Application Layer (Backend)" {
    [FastAPI Core\n(REST Endpoints & Routing)] as BE_FastAPI
    [Pydantic Models\n(Data Validation & Schemas)] as BE_Pydantic
    [Matching Controller\n(agency_api.py + skill_analyzer.py)] as BE_SkillAnalyzer
    [SQLAlchemy ORM\n(Session Management)] as BE_SQLAlchemy

    BE_FastAPI --> BE_Pydantic
    BE_Pydantic --> BE_SkillAnalyzer
    BE_SkillAnalyzer --> BE_SQLAlchemy
}

package "Data & AI Engine Layer" {
    database "Relational Database\n(PostgreSQL / SQLite)" as DB_Main
    artifact "Piedmont Skills Taxonomy\n(Reference Data)" as AI_Taxonomy
    [Semantic Engine\n(multilingual-MiniLM-L12-v2)] as AI_BERT
    [Lexical Engine & Gap Analysis\n(Scikit-Learn TF-IDF)] as AI_TFIDF
}

UI_APIClient --> BE_FastAPI : HTTP REST (JSON)
BE_SQLAlchemy --> DB_Main
BE_SkillAnalyzer --> AI_BERT
BE_SkillAnalyzer --> AI_TFIDF
BE_SkillAnalyzer --> AI_Taxonomy

@enduml

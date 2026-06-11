import csv
import io
import re
from typing import List, Dict, Any, Tuple
from backend.models.job_application import JobApplicationModel

# Fuzzy Duplicate Detection Utilities (port of React frontend functions)

def clean_company_string(name: str) -> List[str]:
    if not name:
        return []
    # Common company suffixes in German and English
    suffixes = (
        r"(?:\b|(?<=[^a-zA-Z]))(gmbh\s*&\s*co\s*\.?\s*kg|gmbh\s*&\s*co\s*kg|gmbh|"
        r"ag\s*&\s*co\s*kgaa|kgaa|ag|co|kg|ltd|inc|group|gruppe|holding|corp|corporation|"
        r"gbr|e\.?v\.?|se|solutions|services|de|deutschland|germany|ab|as|sas|sarl|spa)\b"
    )
    cleaned = name.lower()
    cleaned = re.sub(suffixes, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[.,\/#!$%\^*;:{}=\-_`~()]", " ", cleaned)
    cleaned = cleaned.strip()
    return [word for word in cleaned.split() if len(word) >= 2]

def is_similar_company(name1: str, name2: str) -> bool:
    if not name1 or not name2:
        return False

    def normalize(s: str) -> str:
        suffixes = (
            r"(?:\b|(?<=[^a-zA-Z]))(gmbh\s*&\s*co\s*\.?\s*kg|gmbh\s*&\s*co\s*kg|gmbh|"
            r"ag\s*&\s*co\s*kgaa|kgaa|ag|co|kg|ltd|inc|group|gruppe|holding|corp|corporation|"
            r"gbr|e\.?v\.?|se|solutions|services|de|deutschland|germany|ab|as|sas|sarl|spa)\b"
        )
        s_norm = s.lower()
        s_norm = re.sub(suffixes, "", s_norm, flags=re.IGNORECASE)
        s_norm = re.sub(r"\s+", "", s_norm)
        s_norm = re.sub(r"[.,\/#!$%\^*;:{}=\-_`~()]", "", s_norm)
        return s_norm.strip()

    clean1 = normalize(name1)
    clean2 = normalize(name2)

    if clean1 == clean2:
        return True
    if len(clean1) >= 2 and len(clean2) >= 2 and (clean2 in clean1 or clean1 in clean2):
        return True

    tokens1 = clean_company_string(name1)
    tokens2 = clean_company_string(name2)
    if not tokens1 or not tokens2:
        return False
        
    return any(token in tokens2 for token in tokens1)

def is_similar_text(text1: str, text2: str) -> bool:
    if not text1 or not text2:
        return False

    def clean(t: str) -> str:
        t_clean = t.lower()
        t_clean = re.sub(r"\b(m/w/d|f/m/d|w/m/d|m/f/d|all\s+genders|junior|senior|lead|head\s+of)\b", "", t_clean)
        t_clean = re.sub(r"[()\-.,\/#!$%\^&\*;:{}=\-_`~]", " ", t_clean)
        return t_clean.strip()

    c1 = clean(text1)
    c2 = clean(text2)
    if c1 == c2:
        return True
    if len(c1) > 3 and len(c2) > 3 and (c2 in c1 or c1 in c2):
        return True

    words1 = [w for w in c1.split() if len(w) >= 4]
    words2 = [w for w in c2.split() if len(w) >= 4]
    return any(w in words2 for w in words1)

def is_similar_location(loc1: str, loc2: str) -> bool:
    if not loc1 or not loc2:
        return False

    def clean(l: str) -> str:
        l_clean = l.lower()
        l_clean = re.sub(r"\b(germany|deutschland|hybrid|remote|onsite|home\s*office)\b", "", l_clean)
        l_clean = re.sub(r"[,\-.]", " ", l_clean)
        return l_clean.strip()

    c1 = clean(loc1)
    c2 = clean(loc2)
    if c1 == c2:
        return True
    if len(c1) > 2 and len(c2) > 2 and (c2 in c1 or c1 in c2):
        return True

    words1 = [w for w in c1.split() if len(w) >= 3]
    words2 = [w for w in c2.split() if len(w) >= 3]
    return any(w in words2 for w in words1)

def is_fuzzy_duplicate(existing_app: Dict[str, Any], new_app: Dict[str, Any]) -> bool:
    """
    Checks if a new application is a duplicate of an existing one.
    Condition: Similar company name AND (similar role OR similar location).
    """
    if not is_similar_company(existing_app.get("company", ""), new_app.get("company", "")):
        return False
        
    role_match = is_similar_text(existing_app.get("role", ""), new_app.get("role", ""))
    location_match = is_similar_location(existing_app.get("location", ""), new_app.get("location", ""))
    return role_match or location_match

# Status Normalization

def normalize_status(status_str: str) -> str:
    if not status_str:
        return "Applied"
    
    cleaned = status_str.strip().lower()
    
    if any(k in cleaned for k in ["interview", "gespräch", "gespraech", "eingeladen", "vorstellungsgespräch"]):
        return "Interview"
    if any(k in cleaned for k in ["reject", "absage", "abgelehnt", "nicht berücksichtigt", "archiviert"]):
        return "Rejected"
    if any(k in cleaned for k in ["offer", "angebot", "zusage", "vertrag"]):
        return "Offer"
    if any(k in cleaned for k in ["receive", "eingegangen", "erhalten"]):
        return "Received"
    if any(k in cleaned for k in ["applied", "bewerbung", "beworben", "gesendet", "offen"]):
        return "Applied"
        
    capitalized = status_str.strip().capitalize()
    if capitalized in ["Applied", "Interview", "Rejected", "Offer", "Received", "Unknown"]:
        return capitalized
    return "Unknown"

# CSV Parsing & Generating

def parse_csv_content(csv_text: str) -> List[Dict[str, Any]]:
    """
    Parses CSV text dynamically, identifying and mapping headers.
    Supports comma and semicolon separators.
    """
    if not csv_text:
        return []

    # Detect delimiter
    delimiter = ","
    first_line = csv_text.splitlines()[0] if csv_text else ""
    if ";" in first_line and first_line.count(";") > first_line.count(","):
        delimiter = ";"

    # Read CSV
    f = io.StringIO(csv_text)
    reader = csv.reader(f, delimiter=delimiter)
    
    try:
        headers = next(reader)
    except StopIteration:
        return []

    # Clean headers
    headers = [h.strip().lower() for h in headers]

    # Helper function to find keyword index
    def find_idx(keywords: List[str], default: int = -1) -> int:
        for keyword in keywords:
            for idx, header in enumerate(headers):
                if header == keyword or keyword in header:
                    return idx
        return default

    # Mappings
    company_idx = find_idx(["company", "unternehmen", "firma"], 0)
    role_idx = find_idx(["jobtitle", "job title", "role", "rolle", "stelle", "berufsbezeichnung", "job_title"], 1)
    date_idx = find_idx(["applicationdate", "application date", "date", "datum", "bewerbungsdatum", "application_date"], 2)
    status_idx = find_idx(["status", "status / stage", "hiring status"], 3)
    location_idx = find_idx(["location", "standort", "ort", "stadt"], 4)
    anstellungsart_idx = find_idx(["anstellungsart", "employment type", "job type", "art der anstellung", "employment_type"], 5)
    
    # Optional columns
    subject_idx = find_idx(["subject", "betreff", "email subject"])
    summary_idx = find_idx(["summary", "zusammenfassung", "gemini insight"])
    suggested_action_idx = find_idx(["suggestedaction", "suggested action", "empfohlene aktion", "action"])
    email_id_idx = find_idx(["emailid", "email id", "id"])
    notes_idx = find_idx(["notes", "notizen", "kommentar", "bemerkung"])

    parsed_records = []
    
    for row in reader:
        if not row or all(cell == "" for cell in row):
            continue

        def get_val(idx: int, default: str = "") -> str:
            if idx >= 0 and idx < len(row):
                return row[idx].strip()
            return default

        # Map to dict
        record = {
            "company": get_val(company_idx, "Unknown"),
            "role": get_val(role_idx, "Unknown"),
            "date": get_val(date_idx, ""),
            "status": normalize_status(get_val(status_idx, "Applied")),
            "location": get_val(location_idx, "N/A"),
            "anstellungsart": get_val(anstellungsart_idx, "N/A"),
            "subject": get_val(subject_idx, ""),
            "summary": get_val(summary_idx, ""),
            "suggestedAction": get_val(suggested_action_idx, ""),
            "emailId": get_val(email_id_idx, ""),
            "notes": get_val(notes_idx, "")
        }
        
        parsed_records.append(record)

    return parsed_records

def generate_csv_content(applications: List[JobApplicationModel]) -> str:
    """
    Generates a CSV string representing all applications in the database.
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", lineterminator="\n") # Use semicolon standard in Europe

    headers = [
        "Firma", "Position", "Bewerbungsdatum", "Status", "Standort", 
        "Anstellungsart", "Notizen", "Betreff", "Zusammenfassung", 
        "Empfohlene Aktion", "Email ID"
    ]
    writer.writerow(headers)

    for app in applications:
        writer.writerow([
            app.company or "",
            app.role or "",
            app.date or "",
            app.status or "",
            app.location or "",
            app.anstellungsart or "",
            app.notes or "",
            app.subject or "",
            app.summary or "",
            app.suggestedAction or "",
            app.emailId or ""
        ])

    return output.getvalue()

def test_create_and_read_job_application(client):
    # ==========================================
    # 1. ARRANGE (Vorbereiten)
    # ==========================================
    new_job_payload = {
        "company": "MaxMuster GmbH",
        "role": "Full-Stack Softwareentwickler",
        "location": "Düsseldorf",
        "anstellungsart": "Vollzeit",
        "stage": "Applied",
        "status": "Open",
        "date": "2026-08-10"
    }

    # ==========================================
    # 2. ACT (Ausführen)
    # ==========================================
    # POST-Request schicken (Eintrag erstellen)
    response_post = client.post("/api/applications?table_name=test_jobs", json=new_job_payload)
    
    # ==========================================
    # 3. ASSERT (Prüfen)
    # ==========================================
    assert response_post.status_code == 200 # Oder 201, je nachdem wie dein Router konfiguriert ist
    
    data = response_post.json()
    assert data["company"] == "MaxMuster GmbH"
    assert data["stage"] == "Applied"
    assert data["status"] == "Open"
    assert "id" in data # Prüfen, ob die DB eine ID vergeben hat

    # Zusätzlich prüfen, ob der GET-Request den Job nun findet
    response_get = client.get("/api/applications?table_name=test_jobs")
    assert response_get.status_code == 200
    assert len(response_get.json()) == 1
    assert response_get.json()[0]["role"] == "Full-Stack Softwareentwickler"
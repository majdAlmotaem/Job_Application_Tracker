# CORS Sicherheits- und Kompatibilitäts-Fix

Dieses Dokument beschreibt die Behebung eines kritischen Problems in der CORS (Cross-Origin Resource Sharing) Konfiguration der FastAPI-Anwendung.

## Das Problem

Zuvor war die CORS-Middleware wie folgt konfiguriert:
- `allow_origins=["*"]` (Wildcard)
- `allow_credentials=True`

Diese Kombination ist nicht nur ein Sicherheitsrisiko, sondern **funktioniert in modernen Webbrowsern überhaupt nicht**. 

Wenn die Frontend-Anwendung versucht, eine Anfrage mit Anmeldeinformationen (wie Cookies, Authorization-Headers oder TLS-Client-Zertifikaten) an das Backend zu senden, blockiert der Browser die Antwort sofort und wirft einen CORS-Fehler in der Entwicklerkonsole.

## Warum blockieren Browser das?

Die W3C-Spezifikation für CORS verbietet explizit die Kombination von `Access-Control-Allow-Origin: *` und `Access-Control-Allow-Credentials: true`. 

### 1. Technische Einschränkung (Browser-Spezifikation)
Wenn `credentials` (z. B. `withCredentials = true` in Axios/Fetch) aktiviert ist, verlangt der Browser, dass der Antwort-Header `Access-Control-Allow-Origin` einen **expliziten** Origin-Wert (z. B. `http://localhost:3000`) enthält. Wenn der Server stattdessen den Wildcard-Wert `*` zurückgibt, schlägt die Validierung im Browser fehl und die Antwort wird für JavaScript gesperrt.

### 2. Sicherheitsrisiko (CSRF & Datenabfluss)
Wenn es erlaubt wäre, eine Wildcard `*` zusammen mit Credentials zu nutzen, könnte jede beliebige bösartige Website im Internet (z. B. `evil.com`) im Hintergrund Anfragen an dein Backend senden. Da Credentials erlaubt sind, würde der Browser automatisch die Cookies (Session-IDs) des angemeldeten Benutzers mitsenden. Die bösartige Seite könnte so im Namen des Benutzers Aktionen ausführen oder sensible Daten auslesen. 

Indem der Server gezwungen wird, explizite Origins anzugeben, wird sichergestellt, dass nur vertrauenswürdige Domains (z. B. das eigene Frontend) authentifizierte Anfragen stellen können.

## Die Lösung

Die CORS-Middleware wurde in [backend/main.py](file:///c:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/backend/main.py) angepasst. Die erlaubten Origins werden nun dynamisch über die Umgebungsvariable `ALLOWED_ORIGINS` geladen:

```python
# CORS configuration to support direct front-end calls if proxy is bypassed
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

### Vorteile dieser Lösung:
1. **Kompatibilität:** Da eine explizite Origin-Liste (z. B. `['http://localhost:3000']`) an FastAPI übergeben wird, antwortet der Server mit dem exakten Origin des anfragenden Clients (sofern dieser in der Liste existiert), was den CORS-Spezifikationen der Browser entspricht.
2. **Sicherheit:** Es werden nur noch explizit autorisierte Domains zugelassen.
3. **Flexibilität:** Für die lokale Entwicklung wird standardmäßig `http://localhost:3000` verwendet. In der Produktionsumgebung können weitere Origins einfach kommagetrennt über die Umgebungsvariable `ALLOWED_ORIGINS` hinzugefügt werden (z. B. `ALLOWED_ORIGINS=https://my-app.com,https://admin.my-app.com`).

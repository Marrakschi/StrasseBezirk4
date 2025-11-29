# Straßen-Scanner App Deployment

## 🚨 WICHTIG: Damit die KI funktioniert

Wenn in der App oben rechts ein ROTER PUNK ist oder der Fehler "API Key fehlt" kommt, hast du folgenden Schritt vergessen:

### Bei Vercel Deployment:
1. Gehe zu deinem Projekt auf [Vercel.com](https://vercel.com).
2. Klicke auf den Tab **Settings** -> **Environment Variables**.
3. Füge hinzu:
   - **Key**: `API_KEY`
   - **Value**: Dein Gemini API Schlüssel
4. Speichern.
5. **DAS WICHTIGSTE (REDEPLOY):**
   - Gehe zum Tab **Deployments**.
   - Klicke auf die drei Punkte (...) neben dem obersten Eintrag.
   - Wähle **Redeploy**.
   - Warte, bis der Build fertig ist.
   - Erst JETZT ist der Key in der App verfügbar.

### Hinweise zum Build Log (npm warn deprecated...)
Falls du im Log Warnungen siehst ("npm warn deprecated node-domexception"): **Ignoriere das.** Das ist kein Fehler. Solange am Ende "Build Completed" steht, ist alles gut.

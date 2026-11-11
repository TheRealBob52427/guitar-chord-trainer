# Gitarren-Akkord-Trainer

Progressive Web App für E-Gitarren-Anfänger: zeigt Griffbrett-Diagramme für
**G, Cadd9, Em7 und Dsus4**, bewertet die gespielten Akkorde in Echtzeit über
Mikrofon oder USB-Gitarreninterface (z. B. Rocksmith USB Guitar Adapter) und
enthält ein interaktives Stimmgerät für alle sechs Saiten.

Reines Vanilla-JS – kein Framework, kein Build-Schritt, keine externen Requests.
Das Audio wird ausschließlich lokal im Browser analysiert. Trefferstatistiken
werden lokal gespeichert und lassen sich als CSV exportieren.

## Schnellstart

```bash
docker compose up --build
```

Danach **http://localhost:8080** öffnen und „🎤 Mikrofon aktivieren“ antippen.

Die App ist eine PWA: Nach dem ersten Laden funktioniert sie offline und lässt
sich über das Browsermenü installieren (Chrome/Edge: „App installieren“,
iOS Safari: „Zum Home-Bildschirm“).

## Mikrofon & HTTPS

`getUserMedia` funktioniert nur in einem **secure context**: `localhost` oder
HTTPS. Der Docker-Port 8080 auf dem eigenen Rechner ist mit `localhost`
abgedeckt. Für Zugriff vom Handy im LAN braucht es einen TLS-Reverse-Proxy
(z. B. Caddy, Traefik oder nginx mit Let's-Encrypt-Zertifikat).

Nach dem Start fragt der Browser nach der Mikrofonfreigabe. Bei USB-Interfaces
den Adapter als Eingang wählen – er erscheint im Settings-Sheet automatisch
unter „Audio-Eingang“.

## Funktionen

- **Griffbrett-Diagramme** als SVG: 5 Bünde, 6 Saiten (E–A–D–G–B–E),
  Fingernummern, offene (○) und gedämpfte (×) Saiten, Bundnummern, dünner
  werdende Saiten.
- **Echtzeit-Erkennung** per Web Audio API mit Chromagramm und
  Cosine-Similarity, inklusive Stille-Erkennung, Glättung und Hysterese.
- **Stimm-Modus** für E2, A2, D3, G3, B3 und E4: YIN-Pitch-Erkennung,
  Cent-Zeiger (±50 Cent), In-Tune-Anzeige innerhalb ±5 Cent, Saitenauswahl und
  Referenzton.
- **Statistik** pro Akkord (Treffer/Versuche) in `localStorage`, mit
  Gesamtquote, Reset und **CSV-Export** im Settings-Sheet.
- **Metronom** 40–180 BPM (Standard **50 BPM**), 4/4, Beat-Dots mit Akzent auf
  Beat 1, Lookahead-Scheduling.
- **Gerätewechsel** ohne Neustart: alter Stream wird gestoppt, der
  `AudioContext` bleibt erhalten.
- **PWA**: Manifest, Icons, Service Worker mit App-Shell-Cache.
- **Deutsch**, mobil-first, dunkles Theme, max. 540 px Inhaltsbreite.

## Bedienung

1. „🎤 Mikrofon aktivieren“ antippen und die Browser-Freigabe erteilen.
2. Im Tab **Trainer** einen Akkord wählen und spielen. Die Karte zeigt den
   Zielakkord, die Erkennung zeigt Treffer, Fehlgriffe und die Quote.
3. Im Tab **Stimmen** die gewünschte Saite antippen, die Saite einzeln
   anschlagen und am Wirbel drehen, bis der Zeiger grün in der Mitte steht.
   „Referenzton …“ spielt die Sollfrequenz vor.
4. Im Settings-Sheet (Regler-Symbol) Audio-Eingang wählen, die Statistik
   einsehen, als CSV exportieren oder zurücksetzen.

## Projektstruktur

```
.
├── app/
│   ├── index.html          # UI
│   ├── css/styles.css      # Dark Theme, Cards, Bottom-Sheet, Animationen
│   ├── js/
│   │   ├── chords.js       # Akkorddaten, Pitch-Classes, Templates
│   │   ├── detection.js    # Chromagramm, Cosine-Similarity, Hysterese
│   │   ├── pitch.js        # YIN-Pitch-Erkennung für das Stimmgerät
│   │   ├── tuning.js       # Saitenfrequenzen, Cent-Berechnung, Formatierung
│   │   ├── stats.js        # Statistik-Persistenz, Migration, CSV-Export
│   │   ├── fretboard.js    # SVG-Griffbrett-Renderer
│   │   ├── audio.js        # getUserMedia, AnalyserNode, Analyse-Loop
│   │   ├── metronome.js    # Lookahead-Metronom
│   │   └── app.js          # UI-Zustand, Modi, Events, Geräte
│   ├── icons/              # generierte PNG-Icons + Favicon
│   ├── manifest.json
│   └── sw.js
├── tests/                  # DSP-, Pitch-, Statistik- und Metronom-Tests
├── tools/generate_icons.py # Icon-Generator (Pillow)
├── nginx.conf              # Security-Header, gzip, Caching
├── Dockerfile              # nginx:alpine
└── docker-compose.yml      # Port 8080
```

## Erkennungsalgorithmus

1. **Eingang**: `getUserMedia` mit deaktivierter Echo-Unterdrückung,
   Rauschunterdrückung und Auto-Verstärkung, mono. So bleibt das Gitarrensignal
   unverfälscht.
2. **Analyse**: `AnalyserNode` mit `fftSize = 8192`, `smoothingTimeConstant =
   0.4`. Bei 48 kHz ergibt das ~5,9-Hz-Bins – genug Auflösung für die tiefen
   Gitarrensaiten.
3. **Stille-Erkennung**: RMS aus dem Zeitbereich; unter **−55 dBFS** gilt der
   Frame als still. Stille leert den Glättungspuffer, damit der nächste
   Anschlag nicht mit dem Ausklang vermischt wird.
4. **Chromagramm**: Für alle FFT-Bins von **70–600 Hz** oberhalb von
   **−82 dBFS** wird die lineare Magnitude `10^(dB/20)` berechnet. Über
   `MIDI = 69 + 12·log2(f/440)` landet jeder Bin in einer von 12
   Pitch-Classes; der Vektor wird auf Länge 1 normalisiert. 70 Hz schneidet
   Netzbrummen und Raumpfeifen ab, 600 Hz deckt die Grundtöne und die
   wichtigsten Obertöne der vier Akkorde ab.
5. **Glättung**: Die letzten **8 Chromagramme** werden gemittelt. Bei einem
   Analyse-Tick alle 50 ms entspricht das **~400 ms** – lang genug gegen
   Zittern, kurz genug für direktes Feedback.
6. **Matching**: Für jeden Akkord existiert ein binärer Template-Vektor aus
   seinen Pitch-Classes (`G = [G,B,D]`, `Cadd9 = [C,E,G,D]`,
   `Em7 = [E,G,B,D]`, `Dsus4 = [D,G,A]`). Die **Cosine-Similarity** zwischen
   geglättetem Chroma und Template liegt zwischen 0 und 1.
7. **Entscheidung**: Ein Treffer gilt als sicher, wenn der beste Score
   **> 0.82** liegt. Der beste Treffer wird live angezeigt („Gehört: Em7“,
   wenn er nicht dem Zielakkord entspricht).
8. **Hysterese**: Nach einem gewerteten Anschlag wird nicht erneut gezählt,
   solange der Akkord klingt. Erst wenn die beste Ähnlichkeit wieder
   **< 0.5** fällt – der Spieler also loslässt oder wechselt – ist der
   Detektor für den nächsten Versuch entschärft. Das verhindert
   Mehrfachzählung bei langem Ausklingen.
9. **Statistik**: Jeder gewertete Anschlag zählt als Versuch; ein Treffer nur,
   wenn der beste Akkord dem gewählten Ziel entspricht. Bei Erfolg pulsiert die
   Detection-Card und das Gerät vibriert (sofern unterstützt).

Die Schwellwerte stehen zentral in `app/js/detection.js` (`DEFAULTS`) und
lassen sich dort tunen. Für stabile Ergebnisse: Gitarre stimmen, Steg-Tonabnehmer
oder Mikrofon nah an den Saiten, Verzerrung/Effekte aus, im Raum leise
Umgebung.

## Stimm-Modus (YIN)

Der Stimm-Modus nutzt denselben Mikrofon-Stream, schaltet die Akkord-Erkennung
aber ab und analysiert den Zeitbereich:

1. **Fenster**: die letzten **4096 Samples** (~85 ms bei 48 kHz) aus dem
   `AnalyserNode`. Das reicht für mehrere Perioden der tiefen E-Saite.
2. **Stille-Erkennung**: derselbe RMS-Gate wie im Trainer (−55 dBFS).
3. **YIN**: Für Verzögerungen von **60–500 Hz** wird die Differenzfunktion
   berechnet und kumulativ normiert (CMND). Das erste Minimum unter **0.18**
   ist die Periodendauer; eine parabolische Interpolation um das Minimum
   liefert die Frequenz auf Cent-Genauigkeit. Die Konfidenz ist
   `1 − CMND`; unter 0.6 wird kein Ton angezeigt.
4. **Anzeige**: Die Frequenz wird über
   `MIDI = 69 + 12·log2(f/440)` der nächsten Note zugeordnet. Die Abweichung
   zum gewählten Saitenziel in Cent ist `1200·log2(f/f_target)`; geglättet
   wird mit 65 % altem und 35 % neuem Wert bei 10 Updates/s.
5. **Bewertung**: Ab **±5 Cent** gilt die Saite als gestimmt (grün). Der
   Zeiger deckt **±50 Cent** ab; außerhalb wird er am Rand begrenzt. Liegt die
   erkannte Note mehr als einen Ganzton vom Ziel entfernt, meldet die App
   „Erkannt: … · Ziel …“ statt einer irreführenden Cent-Zahl.
6. **Referenzton**: Ein kurzer Triangle-Oszillator (1,6 s) spielt die
   Sollfrequenz der gewählten Saite über denselben `AudioContext`.

## Statistik & Export

Die Statistik liegt unter `guitarTrainer.stats.v2` in `localStorage`:

```json
{
  "version": 2,
  "correct": 7,
  "total": 12,
  "byChord": {
    "G": { "correct": 3, "total": 5 },
    "Cadd9": { "correct": 2, "total": 4 }
  },
  "updatedAt": "2026-11-11T15:03:30.021Z"
}
```

- Jeder gewertete Anschlag zählt für den **gewählten Zielakkord**; ein Treffer
  nur, wenn der erkannte Akkord dem Ziel entspricht.
- Beim Laden werden alte `guitarTrainer.stats.v1`-Daten
  (`{correct,total}`) automatisch migriert. Deren nicht zuordenbare Summe
  erscheint im Export als Zeile **„Altbestand (v1)“**.
- Der CSV-Export nutzt Semikolon und UTF-8-BOM (deutsches Excel), enthält eine
  Zeile pro Akkord plus **Gesamt** und wird als
  `akkord-statistik-JJJJ-MM-TT.csv` heruntergeladen.
- „Statistik zurücksetzen“ entfernt v1 und v2; ein Neuladen kann alte Daten
  nicht wiederherstellen.

## Tests

Die DSP-Kette, YIN-Erkennung, Statistik und das Metronom sind ohne Browser
testbar. Die Tests synthetisieren Gitarrenakkorde und Saitentöne mit
Obertönen, führen eine echte FFT aus und prüfen unter anderem:

- Erkennung aller vier Akkorde und der sechs offenen Saiten,
- Cent-Genauigkeit, Oktavfehler-Stabilität und Stille,
- Hysterese und Akkorddaten,
- Statistik-Migration, Persistenz, CSV-Inhalt und Reset,
- Metronom-Standard 50 BPM und BPM-Grenzen.

```bash
node --test tests/
```

## Entwicklung ohne Docker

```bash
python3 -m http.server 8080 --directory app
```

`http://localhost:8080` ist ein secure context, daher funktioniert das Mikrofon
auch ohne TLS. Der Service Worker wird ebenfalls auf localhost registriert.

## Betrieb & Wartung

- **Cache aktualisieren**: Nach Änderungen an Dateien in `app/` die
  `CACHE_VERSION` in `app/sw.js` erhöhen **und** die Versions-Query in
  `app/index.html` sowie in der Precache-Liste anpassen (z. B. `?v=1.1.1`).
  So können installierte Clients nicht neues HTML mit altem JavaScript
  mischen.
- **Icons neu generieren**: `python3 tools/generate_icons.py` (benötigt Pillow).
- **Healthcheck**: `GET /healthz` liefert `ok`; der Container hat einen
  Docker-Healthcheck.
- **Sicherheit**: nginx liefert CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` (Mikrofon nur self) und
  `X-Frame-Options`. Der Container läuft mit `no-new-privileges` und dropped
  Capabilities.
- **Datenschutz**: Es gibt keinen Backend-Call. Audio und Statistik bleiben im
  Browser; die Statistik liegt in `localStorage` und lässt sich im
  Settings-Sheet löschen.

## Troubleshooting

- **„Mikrofonzugriff verweigert“**: Freigabe in den Browser-Einstellungen
  erteilen und Seite neu laden.
- **Kein Gerät in der Liste**: Erst Mikrofon aktivieren – vor der Freigabe
  liefern Browser oft leere Gerätenamen. Danach „Geräte neu laden“.
- **Erkennung reagiert nicht**: Eingang prüfen, Gitarren-Lautstärke erhöhen,
  Verzerrung reduzieren; Pegelanzeige sollte deutlich über „still“ liegen.
- **Stimmgerät zeigt „Ton unklar“**: Nur eine Saite anschlagen, Ton sauber und
  ohne Effekte spielen, Mikrofon näher positionieren. Der erlaubte Bereich ist
  60–500 Hz; bei starkem Brummen oder Nebengeräuschen lieber den Referenzton
  nutzen.
- **Stimmgerät zeigt die falsche Note**: Die Zielsaite über die sechs Buttons
  wählen. „Erkannt: A2 · Ziel E2“ bedeutet, dass die A-Saite klingt, aber E2
  als Ziel eingestellt ist.
- **CSV-Export startet nicht**: Browser-Downloads für die Seite erlauben. Die
  Datei wird lokal aus `localStorage` erzeugt; es gibt keinen Server-Upload.
- **USB-Adapter fehlt**: Adapter anschließen, Settings öffnen, „Geräte neu
  laden“. Bei Linux ggf. `arecord -l` prüfen.
- **Tabs reagieren nicht / alte Version**: Im Settings-Sheet muss **Version
  1.1.1** stehen. Nach einem Image-Update `docker compose build --no-cache &&
  docker compose up -d` ausführen, die PWA schließen und neu öffnen. HTML und
  JavaScript sind mit `?v=1.1.1` versioniert, damit kein altes JS aus dem
  Browser- oder Service-Worker-Cache geladen wird.
- **PWA installiert alte Version**: App schließen und neu öffnen; der Service
  Worker lädt im Hintergrund. Bei Entwicklung `CACHE_VERSION`, die
  Versions-Query in `index.html` und die Precache-Liste gemeinsam erhöhen und
  Hard-Reload.

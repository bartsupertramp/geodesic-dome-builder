# 🌐 4V Geodesic & Zome Builder 3D

Zaawansowana aplikacja webowa oraz desktopowa (Windows EXE / Android PWA) służąca do projektowania, wizualizacji 3D i przeliczania listy cięć stolarskich dla **kopuł geodezyjnych (1V, 2V, 3V, 4V)** oraz **kopuł zome (cebulowych / łezkowatych 8-Zome, 10-Zome, 12-Zome)** z systemem łączników z rur PVC/stalowych.

---

## 🌟 Główne Funkcjonalności

1. **Obsługa Wielu Częstotliwości (1V - 4V)**:
   - **1V** (10 belek), **2V** (65 belek, 2 typy), **3V** (120 belek, 3 typy), **4V** (250 belek, 6 typów A-F).
2. **Architektura ZOME (Zomoid / Cebulowa / Łezkowata)**:
   - Generowanie geometrycznych rombowych kopuł Zome z obrazków architektonicznych (8-Zome, 10-Zome, 12-Zome).
3. **Ręczne Wyciąganie Szczytu (Apex Stretch Drag Handle)**:
   - Suwak wyciągnięcia szczytu oraz **złoty uchwyt 3D ⬆️ na szczycie modelu**, który można ciągnąć myszką w górę/dół, zmieniając wysokość kopuły na żywo.
4. **Wielowariantowe Kodowanie Belek (A1, B1, B2, C1, D1, E1-E5, F1)**:
   - Automatyczny podział na pod-warianty kątowe zacięć bocznych (Miter Left & Miter Right) z podświetlaniem w 3D.
5. **Klasyfikator Rodzajów Węzłów (W1 - W7)**:
   - Klasyfikacja i zliczanie łączników rurowych z plakietkami 3D.
6. **Przygotowanie pod Google Play (Android PWA / TWA)**:
   - Gotowy manifest `manifest.json`, `sw.js` (Service Worker offline) i ikony `icon-192.png`, `icon-512.png`.
7. **Samodzielny Plik Wykonywalny Windows (`.exe`)**:
   - Bezpośrednie uruchamianie dwuklikiem bez konsoli.

---

## 🚀 Jak Uruchomić na Komputerze (Windows)

Wystarczy kliknąć dwukrotnie:
- **`4V_Geodesic_Dome_Builder.exe`** (Plik wykonywalny)
- Lub skrót **`Uruchom_Kopułę_4V.bat`**

---

## 📱 Jak Opublikować w Google Play (Android)

Aplikacja jest przygotowana jako **Progressive Web App (PWA)** gotowa do przekształcenia w natywny pakiet Androida (`.apk` / `.aab`) za pomocą **TWA (Trusted Web Activity)** lub **Bubblewrap**:

1. **Hostowanie PWA**:
   - Wgraj pliki do serwera (np. GitHub Pages, Netlify, Vercel lub własnego hostingu z HTTPS).
2. **Kompilacja przez Bubblewrap CLI (Oficjalne narzędzie Google)**:
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest=https://twojadomena.pl/manifest.json
   bubblewrap build
   ```
3. Powstanie plik `app-release-signed.aab`, który wgrywasz bezpośrednio do **Google Play Console**!

---

## 🐙 Jak Wygrać Kod na Swoje Konto GitHub

Aby wysłać projekt na swoje konto GitHub:

1. Stwórz nowe puste repozytorium na stronie [github.com/new](https://github.com/new) o nazwie np. `geodesic-zome-builder`.
2. Otwórz wiersz poleceń w tym katalogu i wpisz:
   ```bash
   git remote add origin https://github.com/TWÓJ_USERNAME/geodesic-zome-builder.git
   git branch -M main
   git push -u origin main
   ```

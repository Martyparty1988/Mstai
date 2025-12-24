
# ☀️ MST - Martyho Solar Tracker

**MST** je progresivní webová aplikace (PWA) navržená pro efektivní správu výstavby solárních parků. Funguje **offline-first**, využívá sílu **generativní AI (Gemini)** pro analýzu dat a automatizaci, a běží kompletně v prohlížeči bez nutnosti backend serveru.

![App Screenshot](https://image.pollinations.ai/prompt/dashboard%20ui%20design%20solar%20panel%20management%20system%20dark%20mode%20neon%20glassmorphism?width=1280&height=720&nologo=true)

---

## 🌟 Klíčové Funkce

### 🏗️ Management Projektů
- **Interaktivní plány**: Nahrávání PDF plánů, vykreslování na Canvas, "Google Maps" styl zoomování.
- **Marker System**: Označování hotových stolů přímo v plánu klepnutím.
- **Evidence stolů**: Detailní statusy (Pending/Completed), typy stolů (Small/Medium/Large).

### 👥 Správa Týmu
- **Profily pracovníků**: Evidence sazeb, přihlašovací údaje.
- **Docházka**: Check-in/Check-out systém, sledování nemocenské/dovolené.
- **Výkon**: Statistiky odpracovaných hodin a instalovaného výkonu.

### 🤖 AI Asistent (Powered by Gemini 2.5/3.0)
- **Multimodální vstup**: Analýza fotografií ze stavby (např. kontrola kvality, OCR štítků).
- **Hlasové příkazy**: "Zapiš 8 hodin Martinovi na Zarasai".
- **Insight Engine**: Dotazování se nad databází v přirozeném jazyce ("Jaké jsou náklady na projekt X?").
- **Generování obrázků**: Vizualizace solárních parků pomocí Imagen 3.

### 💾 Data & Bezpečnost
- **Offline-first**: Veškerá data uložena v `IndexedDB` (via Dexie.js).
- **Zálohování**: Automatické (rolling window) i manuální zálohy.
- **Komprese**: Využití LZ-string pro minimalizaci velikosti záloh.
- **Smart Import**: Import dat z Excel/CSV/JSON s AI mapováním sloupců.

---

## 🛠️ Technický Stack

| Kategorie | Technologie | Účel |
|-----------|-------------|------|
| **Frontend** | React 18, TypeScript | UI logika a komponenty |
| **Build** | Vite (implied via ESM imports) | Rychlý vývoj a bundling |
| **State/Data** | Dexie.js (IndexedDB) | Lokální databáze, offline storage |
| **Styling** | Tailwind CSS | Utility-first CSS, Glassmorphism design |
| **AI** | Google GenAI SDK | Integrace Gemini modelů (Flash/Pro) |
| **Vizualizace** | Recharts | Grafy a statistiky |
| **PDF** | PDF.js | Renderování stavebních plánů |
| **Utils** | LZ-string, XLSX, PapaParse | Komprese, Import/Export |

### 📂 Struktura Projektu

```bash
src/
├── components/       # UI Komponenty
│   ├── icons/        # SVG Ikony
│   ├── features/     # Komplexní funkční bloky (Plan, AICommandBar...)
│   └── ui/           # Základní UI (Modal, Button...)
├── contexts/         # React Context (Auth, Theme, I18n, Backup, Toast)
├── hooks/            # Custom hooks (useDarkMode, useLiveQuery...)
├── i18n/             # Překlady (CS/EN)
├── services/         # Business logika
│   ├── db.ts         # Dexie databázové schéma
│   ├── backupService.ts # Logika zálohování a komprese
│   └── seed.ts       # Vzorová data
├── types/            # TypeScript definice
└── App.tsx           # Hlavní routování a Layout
```

---

## 🚀 Instalace a Spuštění

Tato aplikace je navržena jako **no-build** nebo **ESM-based** pro přímé spuštění v moderních prohlížečích, ale pro lokální vývoj doporučujeme standardní Node.js prostředí.

1.  **Naklonovat repozitář:**
    ```bash
    git clone https://github.com/yourusername/mst-solar-tracker.git
    cd mst-solar-tracker
    ```

2.  **Instalace závislostí:**
    ```bash
    npm install
    ```

3.  **Nastavení prostředí:**
    *   Aplikace vyžaduje API klíč pro Google Gemini.
    *   Klíč se vkládá buď do `.env` (pro build) nebo se nastavuje dynamicky přes UI (Window AI SDK).

4.  **Spuštění:**
    ```bash
    npm run dev
    ```

---

## 💡 Návody k použití

### Jak aktivovat AI funkce?
1.  Jděte do **Nastavení**.
2.  V sekci "AI Konfigurace" klikněte na **Připojit Gemini API**.
3.  Vyberte svůj API klíč z Google AI Studia.
4.  Nyní můžete používat `AICommandBar` (dole) nebo `ImageAnalyzer`.

### Jak funguje zálohování?
*   **Automaticky**: Aplikace tvoří zálohu každých 30 minut (lze změnit) do IndexedDB. Drží posledních 10 verzí.
*   **Manuálně**: V Nastavení -> Správce záloh -> "Vytvořit zálohu". Stažený soubor `.json` obsahuje komprimovaná data celé databáze.

### Práce s plány (PDF)
1.  Vytvořte projekt a nahrajte PDF soubor.
2.  Otevřete detail projektu -> **Plán**.
3.  Pomocí nástrojů (Tužka) můžete kreslit do plánu.
4.  Kliknutím na místo v plánu přidáte "Tečku" (Marker) reprezentující hotový stůl přiřazený vybranému pracovníkovi.

---

## ⚠️ Troubleshooting

**Aplikace se nenačítá (Bílá obrazovka)**
*   Zkuste vymazat cache prohlížeče nebo Application Data (unregister Service Worker).
*   Zkontrolujte konzoli pro chyby importů (ESM moduly).

**AI neodpovídá**
*   Ověřte připojení k internetu.
*   Zkontrolujte platnost API klíče v Nastavení.
*   Ujistěte se, že nepoužíváte VPN, která blokuje Google API.

**Problém s importem Excelu**
*   Ujistěte se, že první řádek obsahuje záhlaví.
*   Data nesmí obsahovat sloučené buňky.

---

## 📜 Licence

Proprietary / MIT (Dle vaší volby).
Created by Martin.

# MST Dashboard

Moderní webová aplikace pro správu stavebních projektů (solární elektrárny) a evidenci týmové docházky. Aplikace je navržena jako "Offline-First" s využitím lokální databáze, což umožňuje práci i bez stabilního připojení k internetu.

## 🚀 Hlavní Funkce

### 🏗️ Správa Projektů
Komplexní nástroj pro plánování a realizaci projektů.
- **Vytváření projektů**: Jednoduchý formulář pro zadání lokace a počtu stolů (Malé, Střední, Velké).
- **Automatický výpočet výkonu**: Aplikace automaticky počítá celkový výkon elektrárny v MW na základě zadaných komponent.
- **Interaktivní Mapa**: Vizualizace rozmístění stolů na stavbě (Canvas mapa).
- **Sledování stavu**: Kliknutím na jednotlivé stoly lze měnit jejich stav:
  - ⚪ **Čeká** (Pending)
  - 🟢 **Hotovo** (Completed)
  - 🔴 **Problém** (Issue)
- **Progress Tracking**: Okamžitý přehled o procentuálním dokončení projektu a počtu problémových míst.

### 👥 Řízení Týmu a Docházka
Systém pro evidenci pracovníků a jejich aktivity.
- **Chytrá Docházka**: Check-in a Check-out systém s možností přidání poznámky (např. "Oběd", "Přesun").
- **Přehled Aktivity**: V reálném čase vidíte, kdo právě pracuje a jak dlouho.
- **Profily Pracovníků**: Seznam členů týmu s jejich rolemi a hodinovými sazbami.
- **Statistiky a Žebříčky**:
  - Grafický přehled výkonu týmu.
  - Leaderboard pracovníků seřazený podle odpracovaných hodin (gamifikace).
- **Simulace Uživatelů**: Možnost přepínat mezi uživateli pro testovací účely.

## 🛠️ Použité Technologie

- **Frontend**: [Next.js 14](https://nextjs.org/) (React Framework)
- **Databáze**: [Dexie.js](https://dexie.org/) (Wrapper pro IndexedDB) - data zůstávají ve vašem prohlížeči.
- **Styling**: Tailwind CSS + Custom CSS (Glassmorphism design).
- **Vizualizace**: Chart.js (grafy), HTML5 Canvas (mapy).
- **Ikony**: Lucide React.

## 📦 Instalace a Spuštění

1. **Nainstalujte závislosti:**
   ```bash
   npm install
   ```

2. **Spusťte vývojový server:**
   ```bash
   npm run dev
   ```

3. **Otevřete aplikaci:**
   Otevřete prohlížeč na adrese [http://localhost:3000](http://localhost:3000).

---
*Poznámka: Aplikace využívá prohlížečovou databázi IndexedDB. Pokud vymažete data prohlížeče, přijdete o uložené projekty a záznamy docházky.*

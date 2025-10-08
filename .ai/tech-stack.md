Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI
- Recharts lub Chart.js dla wizualizacji wykresów

1.4.2 Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Supabase (PostgreSQL + BaaS)
- Supabase Authentication
- Supabase SDK
- Row Level Security (RLS) dla izolacji danych
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze

1.4.3 AI i Scraping
- OpenRouter.ai (dostęp do modeli: GPT-4o-mini, Claude Haiku) Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API
- Cheerio.js dla web scrapingu
- Rotacja User-Agents i opóźnienia 2-5s między requestami

1.4.4 Infrastruktura
- Hosting: VPS
- CI/CD: Github Actions
- Scheduled jobs: pg_cron w Supabase
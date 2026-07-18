import { useEffect, useState } from 'react';
import { BookOpen, Search, Loader2 } from 'lucide-react';
import { useReciteStore, API_URL } from '../store/useReciteStore';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  ayahCount: number;
}

export default function LiveSurahSelector() {
  const { start, connecting, error } = useReciteStore();
  const [surahs, setSurahs] = useState<SurahInfo[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SurahInfo | null>(null);
  const [startAyah, setStartAyah] = useState(1);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/quran/surahs`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSurahs(data);
        else setLoadError(true); // backend running old code or error payload
      })
      .catch(() => setLoadError(true));
  }, []);

  const filtered = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(query.toLowerCase()) ||
      s.name.includes(query) ||
      String(s.number) === query.trim(),
  );

  if (selected) {
    return (
      <Card className="p-6 max-w-lg mx-auto glass animate-fade-in-up">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{selected.englishName}</p>
          <p className="font-quran text-3xl mt-1">{selected.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{selected.ayahCount} ayahs</p>
        </div>
        <label className="block mt-5 text-sm font-medium">
          Start from ayah
          <input
            type="number"
            min={1}
            max={selected.ayahCount}
            value={startAyah}
            onChange={(e) =>
              setStartAyah(Math.min(selected.ayahCount, Math.max(1, Number(e.target.value) || 1)))
            }
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setSelected(null)}
            className="flex-1 rounded-xl border border-input py-2.5 text-sm hover:bg-secondary transition-colors"
          >
            Back
          </button>
          <button
            disabled={connecting}
            onClick={() => void start(selected.number, `${selected.englishName} · ${selected.name}`, startAyah)}
            className={cn(
              'flex-[2] rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium',
              'hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2',
            )}
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {connecting ? 'Connecting…' : 'Start Recitation'}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in-up">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search surah by name or number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-input bg-card/70 backdrop-blur pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
        />
      </div>
      {loadError && (
        <p className="text-sm text-destructive text-center mb-3">
          Cannot load surah list — is the backend running?
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1 pb-2">
        {filtered.map((s) => (
          <Card
            key={s.number}
            onClick={() => { setSelected(s); setStartAyah(1); }}
            className="p-4 cursor-pointer hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{s.number}</span>
              <span className="font-quran text-xl">{s.name}</span>
            </div>
            <p className="text-sm font-medium mt-1">{s.englishName}</p>
            <p className="text-[11px] text-muted-foreground">{s.ayahCount} ayahs</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Plus, Trash2, Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { currencyApi, CurrencyItem, ExchangeRateItem } from "@/lib/api/currency";

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = React.useState<CurrencyItem[]>([]);
  const [rates, setRates] = React.useState<ExchangeRateItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [newCode, setNewCode] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newSymbol, setNewSymbol] = React.useState("");

  const [rateCurrency, setRateCurrency] = React.useState("");
  const [rateValue, setRateValue] = React.useState(0);
  const [rateDate, setRateDate] = React.useState(() => new Date().toISOString().slice(0, 10));

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([currencyApi.list(), currencyApi.listRates()])
      .then(([curRes, rateRes]) => {
        setCurrencies(curRes.data || []);
        setRates(rateRes.data || []);
        const nonBase = (curRes.data || []).find((c) => !c.isBase);
        if (nonBase && !rateCurrency) setRateCurrency(nonBase.code);
      })
      .catch((err) => {
        console.error("Failed to load currencies", err);
        setLoadError("Gagal memuat data mata uang dari server.");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const baseCurrency = currencies.find((c) => c.isBase);

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    try {
      await currencyApi.create(newCode.trim(), newName.trim(), newSymbol.trim());
      setNewCode("");
      setNewName("");
      setNewSymbol("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambah mata uang.");
    }
  };

  const handleDeleteCurrency = async (c: CurrencyItem) => {
    if (c.isBase) return;
    if (!confirm(`Hapus mata uang ${c.code}?`)) return;
    try {
      await currencyApi.remove(c.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus mata uang.");
    }
  };

  const handleSetRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateCurrency || rateValue <= 0) return;
    try {
      await currencyApi.setRate(rateCurrency, rateValue, rateDate);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan kurs.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mata Uang & Kurs Harian"
        description="Kelola mata uang yang dipakai perusahaan dan kurs harian terhadap mata uang dasar."
      />

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Coins className="h-3.5 w-3.5 text-brand-primary" />
                <span>Mata Uang Aktif</span>
              </div>
              <form onSubmit={handleAddCurrency} className="grid grid-cols-3 gap-2">
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Kode (USD)" className="h-8 text-xs" />
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama" className="h-8 text-xs" />
                <div className="flex items-center gap-1.5">
                  <Input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="$" className="h-8 text-xs" />
                  <Button type="submit" size="sm" variant="gradient" className="h-8 w-8 p-0 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {currencies.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {c.code} <span className="text-muted-foreground font-normal">({c.name})</span>
                      {c.isBase && <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-tint text-brand-primary font-bold">Base</span>}
                    </span>
                    {!c.isBase && (
                      <button onClick={() => handleDeleteCurrency(c)} className="text-muted-foreground hover:text-rose-600 cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-brand-primary" />
                <span>Kurs Harian (ke {baseCurrency?.code || "Base"})</span>
              </div>
              <form onSubmit={handleSetRate} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={rateCurrency}
                    onChange={(e) => setRateCurrency(e.target.value)}
                    className="flex h-8 rounded-md border border-input bg-white px-2 text-xs"
                  >
                    <option value="">Pilih mata uang...</option>
                    {currencies.filter((c) => !c.isBase).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <Input type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.000001"
                    value={rateValue}
                    onChange={(e) => setRateValue(Number(e.target.value))}
                    placeholder={`1 unit = ? ${baseCurrency?.code || ""}`}
                    className="h-8 text-xs"
                  />
                  <Button type="submit" size="sm" variant="gradient" className="h-8 gap-1 text-xs font-bold shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Simpan
                  </Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {rates.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Belum ada kurs tercatat.</p>}
                {rates.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs">
                    <span className="font-semibold text-foreground">{r.currencyCode}</span>
                    <span className="text-muted-foreground">{r.rateDate}</span>
                    <span className="font-bold text-brand-primary">
                      1 = {r.rateToBase.toLocaleString("id-ID")} {baseCurrency?.code}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

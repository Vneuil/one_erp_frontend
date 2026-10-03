"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { productsApi, ProductItem } from "@/lib/api/products";

export function CopyProductsDialog({ onCopied }: { onCopied: (products: ProductItem[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [source, setSource] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const tenants = useQuery({ queryKey: ["product-copy-sources"], queryFn: async () => (await productsApi.copySources()).data, enabled: open });
  const products = useQuery({ queryKey: ["product-copy-source", source], queryFn: async () => (await productsApi.copySourceProducts(source)).data, enabled: open && !!source });
  const visible = (products.data || []).filter(item => `${item.sku} ${item.name}`.toLowerCase().includes(search.toLowerCase()));
  const copy = async () => {
    setSaving(true); setMessage("");
    try {
      const result = (await productsApi.copyProducts(source, selected)).data;
      onCopied(result.products);
      setMessage(`${result.products.length} produk berhasil disalin. ${result.skippedSkus.length} SKU duplikat dilewati.${result.skippedSkus.length ? ` (${result.skippedSkus.join(", ")})` : ""}`);
      setSelected([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyalin produk."); }
    finally { setSaving(false); }
  };
  return <>
    <Button variant="outline" size="sm" onClick={() => { setOpen(true); setMessage(""); }}>Copy dari Tenant Lain</Button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Copy Produk dari Tenant Lain</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Pilih tenant sumber dalam company yang sama. Produk disalin ke tenant aktif dengan stok 0. SKU yang sudah ada dilewati; stok gudang dan riwayat tidak disalin.</p>
        <fieldset disabled={saving} className="space-y-3">
          <label className="text-sm">Tenant sumber
            <select className="w-full h-10 border rounded-lg px-3" value={source} onChange={e => { setSource(e.target.value); setSelected([]); setSearch(""); setMessage(""); }}>
              <option value="">Pilih tenant</option>
              {tenants.data?.map(item => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
            </select>
          </label>
          {tenants.isPending && <p role="status">Memuat tenant...</p>}
          {tenants.isError && <p role="alert">{tenants.error.message} <Button variant="outline" onClick={() => tenants.refetch()}>Retry</Button></p>}
          {tenants.isSuccess && !tenants.data.length && <p>Belum ada tenant lain yang aktif dalam company ini.</p>}
          {source && <>
            <Input aria-label="Cari produk sumber" placeholder="Cari SKU atau nama barang" value={search} onChange={e => setSearch(e.target.value)} />
            {products.isPending && <p role="status">Memuat produk...</p>}
            {products.isError && <p role="alert">{products.error.message} <Button variant="outline" onClick={() => products.refetch()}>Retry</Button></p>}
            {products.isSuccess && <>
              <div className="flex justify-between text-sm"><span>{selected.length} dipilih (maksimum 500)</span><Button variant="ghost" size="sm" onClick={() => setSelected(visible.slice(0, 500).map(item => item.id))}>Pilih hasil pencarian</Button><Button variant="ghost" size="sm" onClick={() => setSelected([])}>Batal pilih</Button></div>
              <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
                {!visible.length && <p className="p-3 text-sm">Tidak ada produk yang cocok.</p>}
                {visible.map(item => <label key={item.id} className="flex gap-3 items-center p-3 text-sm"><input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id) && selected.length >= 500} onChange={e => setSelected(current => e.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} /><span><span className="font-mono">{item.sku}</span> — {item.name}<span className="block text-xs text-muted-foreground">{item.category} · {item.unit}</span></span></label>)}
              </div>
            </>}
          </>}
          <Button variant="gradient" disabled={!selected.length || products.isError || products.isFetching || tenants.isError} onClick={copy}>{saving ? "Menyalin..." : `Copy ${selected.length} Produk`}</Button>
        </fieldset>
        {message && <p role="status" className="text-sm">{message}</p>}
      </DialogContent>
    </Dialog>
  </>;
}

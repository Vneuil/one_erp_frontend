"use client";

import * as React from "react";
import Image from "next/image";
import {
  Store,
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
  Printer,
  CheckCircle2,
  User,
  Clock,
  RotateCcw,
  Sparkles,
  IdCard,
  Gift,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { posApi } from "@/lib/api/pos";
import { loyaltyApi, MemberCard } from "@/lib/api/loyalty";
import { productsApi, ProductItem } from "@/lib/api/products";
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { computeSale, defaultPosSettings, PosSettings } from "@/lib/utils/pos-totals";
import { useAppStore } from "@/stores/app-store";

interface PosProduct {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  category: string;
  price: number;
  stock: number;
  image?: string;
}

interface CartItem extends PosProduct {
  qty: number;
}

const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function PosCashierPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [settings, setSettings] = React.useState<PosSettings>(defaultPosSettings);
  const [lastReceipt, setLastReceipt] = React.useState<{ cashier: string; outlet: string; change: number; tendered: number } | null>(null);
  const [products, setProducts] = React.useState<PosProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);
  const [warehouse, setWarehouse] = React.useState<WarehouseItem | null>(null);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [customerName, setCustomerName] = React.useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [memberCard, setMemberCard] = React.useState<MemberCard | null>(null);
  const [isCheckingMember, setIsCheckingMember] = React.useState(false);
  const [memberCheckError, setMemberCheckError] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "qris" | "card">("cash");
  const [cashGiven, setCashGiven] = React.useState<number>(0);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [lastOrderNo, setLastOrderNo] = React.useState("");
  const [lastLoyalty, setLastLoyalty] = React.useState<{
    memberCode?: string;
    pointsEarned?: number;
    pointsBalance?: number;
  } | null>(null);

  const loadCatalog = React.useCallback(() => {
    setIsLoadingProducts(true);
    Promise.all([productsApi.list({ perPage: 200 }), inventoryApi.listWarehouses({ perPage: 1 })])
      .then(([productsRes, warehousesRes]) => {
        const items = productsRes.data || [];
        setProducts(
          items.map((p: ProductItem) => ({
            id: p.id,
            sku: p.sku,
            name: p.variantLabel ? `${p.name} · ${p.variantLabel}` : p.name,
            barcode: p.barcode || p.sku,
            category: p.category || "Lainnya",
            price: p.sellingPrice,
            stock: p.stock,
          }))
        );
        const wh = (warehousesRes.data || [])[0];
        setWarehouse(wh || null);
      })
      .catch((err) => {
        console.error("Failed to load POS product catalog", err);
        setCatalogError("Gagal memuat katalog produk. Pastikan Master Data Produk & Gudang sudah diisi.");
      })
      .finally(() => setIsLoadingProducts(false));
  }, []);

  React.useEffect(() => {
    loadCatalog();
    posApi
      .getSettings()
      .then((res) => res.data && setSettings({ ...defaultPosSettings, ...res.data }))
      .catch((err) => console.error("Failed to load POS settings", err));
  }, [loadCatalog]);

  const handleCheckMember = async () => {
    if (!customerPhone.trim()) return;
    setIsCheckingMember(true);
    setMemberCheckError(null);
    setMemberCard(null);
    try {
      const res = await loyaltyApi.lookupMember(customerPhone.trim());
      if (res.data) {
        setMemberCard(res.data);
        setCustomerName(res.data.member.name);
      }
    } catch (err) {
      setMemberCheckError(
        err instanceof Error ? err.message : "Kartu member tidak ditemukan untuk nomor ini."
      );
    } finally {
      setIsCheckingMember(false);
    }
  };

  const categories = React.useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products]
  );

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    const matchCat = selectedCategory === "All" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const addToCart = (product: PosProduct) => {
    const existing = cart.find((item) => item.id === product.id);
    const currentQty = existing?.qty || 0;
    if (currentQty + 1 > product.stock) {
      alert(`Stok ${product.name} tidak mencukupi (sisa ${product.stock}).`);
      return;
    }
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const sale = computeSale(cartSubtotal, 0, settings);
  const { subtotal, tax, total } = sale;
  const change = Math.max(0, cashGiven - total);
  const taxLabel = settings.taxPercent > 0 ? `PPN ${settings.taxPercent}%${settings.taxInclusive ? " (termasuk)" : ""}` : "";
  const outletName = settings.defaultOutlet || "Outlet Utama";
  const cashierName = currentUser?.name || currentUser?.email || "-";

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!warehouse) {
      alert("Belum ada gudang aktif. Tambahkan gudang di Master Data > Warehouses terlebih dahulu.");
      return;
    }
    if (paymentMethod === "cash" && cashGiven < total) {
      alert(`Uang diterima (${cashGiven.toLocaleString("id-ID")}) kurang dari total (${total.toLocaleString("id-ID")}).`);
      return;
    }
    try {
      const res = await posApi.checkout({
        outlet: outletName,
        customer: customerName || "Pelanggan Walk-in",
        customerPhone: customerPhone.trim() || undefined,
        totalItems: cart.reduce((sum, item) => sum + item.qty, 0),
        paymentMethod,
        amountTendered: paymentMethod === "cash" ? cashGiven : undefined,
        warehouseId: warehouse.id,
        lines: cart.map((item) => ({ productId: item.id, quantity: item.qty, unitPrice: item.price })),
      });
      setLastOrderNo(res.data?.orderNo ?? "");
      setLastReceipt({ cashier: res.data?.cashier || cashierName, outlet: res.data?.outlet || outletName, change: res.data?.changeAmount ?? 0, tendered: res.data?.amountTendered ?? 0 });
      if (res.data?.loyaltyPointsEarned) {
        setLastLoyalty({
          memberCode: res.data.loyaltyMemberCode,
          pointsEarned: res.data.loyaltyPointsEarned,
          pointsBalance: res.data.loyaltyPointsBalance,
        });
      } else {
        setLastLoyalty(null);
      }
      setIsReceiptOpen(true);
      loadCatalog();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memproses transaksi. Coba lagi.");
    }
  };

  const handleFinishTransaction = () => {
    setIsReceiptOpen(false);
    clearCart();
    setCashGiven(0);
    setCustomerPhone("");
    setCustomerName("Walk-in Customer");
    setMemberCard(null);
    setMemberCheckError(null);
    setLastLoyalty(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:h-[calc(100vh-6rem)]">
      {/* LEFT AREA: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col space-y-4 lg:overflow-hidden">
        {/* Top Cashier Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-brand-tint text-brand-primary flex items-center justify-center font-bold">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground">{outletName}</h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Kasir: {cashierName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Scan barcode / cari nama produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-white text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {catalogError && (
          <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {catalogError}
          </div>
        )}
        {!warehouse && !isLoadingProducts && !catalogError && (
          <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            Belum ada gudang aktif — stok tidak akan berkurang otomatis sampai gudang ditambahkan di Master Data.
          </div>
        )}

        {/* Products Grid */}
        {isLoadingProducts ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Memuat katalog produk...</div>
        ) : (
        <div className="flex-1 lg:overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1">
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
              Belum ada produk. Tambahkan produk di Master Data &gt; Products.
            </div>
          )}
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white rounded-xl border border-border p-3.5 flex flex-col justify-between hover:border-brand-primary/50 hover:shadow-md transition-all cursor-pointer text-left group"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
                    {product.sku}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">
                    Stok {product.stock}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-brand-primary transition-colors">
                  {product.name}
                </h4>
              </div>

              <div className="pt-3 mt-2 border-t border-border/80 flex items-center justify-between">
                <span className="text-xs font-black text-brand-dark">
                  <MoneyDisplay amount={product.price} />
                </span>
                <span className="h-6 w-6 rounded-md bg-brand-tint text-brand-primary flex items-center justify-center font-bold text-xs group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  +
                </span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* RIGHT AREA: Cart & Payment Checkout */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-border flex flex-col justify-between lg:overflow-hidden shadow-sm">
        {/* Cart Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-brand-primary" />
            <h3 className="text-xs font-bold text-foreground">
              Keranjang Transaksi ({cart.reduce((acc, i) => acc + i.qty, 0)} item)
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Customer & Loyalty Member lookup */}
        <div className="px-4 py-2.5 bg-brand-tint/30 border-b border-border space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-xs">
            <User className="h-3.5 w-3.5 text-brand-primary" />
            <span>Pelanggan:</span>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama pelanggan"
              className="h-7 text-xs bg-white flex-1"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <IdCard className="h-3.5 w-3.5 text-brand-primary shrink-0" />
            <Input
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                setMemberCard(null);
                setMemberCheckError(null);
              }}
              placeholder="No. HP member (cek poin loyalty)..."
              className="h-7 text-xs bg-white flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCheckMember}
              disabled={!customerPhone.trim() || isCheckingMember}
              className="h-7 px-2 text-[11px] font-bold shrink-0"
            >
              {isCheckingMember ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Cek Member"
              )}
            </Button>
          </div>

          {memberCard && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-brand-primary/30 text-[11px]">
              <div className="flex items-center gap-1.5 text-brand-dark font-bold">
                <Gift className="h-3.5 w-3.5 text-brand-primary" />
                <span>{memberCard.member.memberCode}</span>
              </div>
              <span className="font-black text-brand-primary">
                {memberCard.member.pointsBalance.toLocaleString("id-ID")} poin
              </span>
            </div>
          )}
          {memberCheckError && (
            <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
              {memberCheckError} Poin akan otomatis membuat member baru saat checkout.
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto max-h-80 lg:max-h-none p-4 space-y-3">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/70 bg-slate-50/40 text-xs"
            >
              <div className="min-w-0 flex-1 text-left">
                <p className="font-bold text-foreground truncate">{item.name}</p>
                <div className="text-[11px] text-muted-foreground">
                  <MoneyDisplay amount={item.price} /> x {item.qty}
                </div>
              </div>

              {/* Qty controller */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, -1)}
                  className="h-6 w-6 rounded border border-border bg-white flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center font-bold text-foreground">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, 1)}
                  className="h-6 w-6 rounded border border-border bg-white flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="h-6 w-6 text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p>Keranjang masih kosong.</p>
              <p className="text-[11px]">Klik produk di sebelah kiri atau scan barcode.</p>
            </div>
          )}
        </div>

        {/* Payment & Summary Footer */}
        <div className="p-4 border-t border-border bg-slate-50 space-y-3">
          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                paymentMethod === "cash"
                  ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                  : "bg-white text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Banknote className="h-4 w-4" />
              <span>Tunai</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("qris")}
              className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                paymentMethod === "qris"
                  ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                  : "bg-white text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <QrCode className="h-4 w-4" />
              <span>QRIS</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                paymentMethod === "card"
                  ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                  : "bg-white text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Kartu / EDC</span>
            </button>
          </div>

          {/* Cash input if cash is selected */}
          {paymentMethod === "cash" && (
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-semibold text-muted-foreground">Uang Tunai Diterima:</label>
              <Input
                type="number"
                value={cashGiven || ""}
                onChange={(e) => setCashGiven(Number(e.target.value))}
                placeholder="Nominal uang tunai (IDR)..."
                className="h-8 text-xs bg-white"
              />
            </div>
          )}

          {/* Calculations */}
          <div className="space-y-1.5 text-xs pt-1 border-t border-border/80">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span><MoneyDisplay amount={subtotal} /></span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{taxLabel || "Pajak:"}</span>
              <span><MoneyDisplay amount={tax} /></span>
            </div>
            <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border">
              <span>Total Tagihan:</span>
              <span className="text-brand-dark"><MoneyDisplay amount={total} /></span>
            </div>
            {paymentMethod === "cash" && cashGiven > 0 && (
              <div className="flex justify-between text-xs font-bold text-emerald-600 pt-0.5">
                <span>Kembalian:</span>
                <span><MoneyDisplay amount={change} /></span>
              </div>
            )}
          </div>

          {/* Charge Button */}
          <Button
            variant="gradient"
            size="lg"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full h-11 text-xs font-bold shadow-md"
          >
            <Receipt className="h-4 w-4 mr-1.5" />
            <span>Bayar & Cetak Struk</span>
          </Button>
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-xs text-center font-mono">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold font-sans flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Transaksi Berhasil</span>
            </DialogTitle>
          </DialogHeader>

          {/* Thermal Receipt Paper Simulation */}
          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-border text-left text-[11px] space-y-2.5">
            <div className="text-center pb-2 border-b border-dashed border-border space-y-0.5">
              <h4 className="font-bold text-xs">{lastReceipt?.outlet ?? outletName}</h4>
              {settings.receiptHeader && <p className="text-[10px] text-muted-foreground whitespace-pre-line">{settings.receiptHeader}</p>}
              <p className="text-[10px] text-muted-foreground">{new Date().toLocaleString("id-ID")}</p>
              <p className="font-bold text-[10px]">No: {lastOrderNo}</p>
            </div>

            <div className="space-y-1.5">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="truncate max-w-[140px]">{item.name} x{item.qty}</span>
                  <span><MoneyDisplay amount={item.price * item.qty} /></span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-dashed border-border space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span><MoneyDisplay amount={subtotal} /></span>
              </div>
              <div className="flex justify-between">
                <span>{taxLabel || "Pajak:"}</span>
                <span><MoneyDisplay amount={tax} /></span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-border">
                <span>TOTAL:</span>
                <span><MoneyDisplay amount={total} /></span>
              </div>
              <div className="flex justify-between">
                <span>Metode:</span>
                <span className="uppercase">{paymentMethod}</span>
              </div>
              {paymentMethod === "cash" && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Kembali:</span>
                  <span><MoneyDisplay amount={change} /></span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 border-t border-dashed border-border text-[9px] text-muted-foreground">
              {settings.receiptFooter || "Terima Kasih Atas Kunjungan Anda!"}
            </div>
          </div>

          {lastLoyalty && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-tint text-brand-dark font-sans">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Gift className="h-4 w-4 text-brand-primary" />
                <span>+{lastLoyalty.pointsEarned} poin loyalty</span>
              </div>
              <span className="text-[11px] font-semibold">
                {lastLoyalty.memberCode} · Saldo {lastLoyalty.pointsBalance?.toLocaleString("id-ID")} poin
              </span>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const receiptHtml = `
                  <html>
                    <head><title>Struk ${lastOrderNo}</title></head>
                    <body style="font-family: monospace; font-size: 12px; width: 260px; margin: 0 auto;">
                      <div style="text-align:center; border-bottom: 1px dashed #999; padding-bottom: 8px;">
                        <strong>${escapeHtml(lastReceipt?.outlet ?? outletName)}</strong><br/>
                        ${escapeHtml(settings.receiptHeader).replace(/\n/g, "<br/>")}<br/>
                        ${new Date().toLocaleString("id-ID")}<br/>
                        No: ${lastOrderNo}
                      </div>
                      ${cart
                        .map(
                          (item) =>
                            `<div style="display:flex; justify-content:space-between;"><span>${escapeHtml(item.name)} x${item.qty}</span><span>Rp ${(item.price * item.qty).toLocaleString("id-ID")}</span></div>`
                        )
                        .join("")}
                      <div style="border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px;">
                        <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><span>Rp ${subtotal.toLocaleString("id-ID")}</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>${taxLabel || "Pajak"}</span><span>Rp ${tax.toLocaleString("id-ID")}</span></div>
                        <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>TOTAL</span><span>Rp ${total.toLocaleString("id-ID")}</span></div>
                      </div>
                      <div style="text-align:center; padding-top:8px;">${escapeHtml(settings.receiptFooter || "Terima Kasih Atas Kunjungan Anda!").replace(/\n/g, "<br/>")}</div>
                    </body>
                  </html>
                `;
                const printWindow = window.open("", "_blank", "width=320,height=600");
                if (printWindow) {
                  printWindow.document.write(receiptHtml);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }
              }}
              className="h-8 text-xs flex-1 gap-1"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Thermal</span>
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={handleFinishTransaction}
              className="h-8 text-xs flex-1 font-bold"
            >
              Selesai (Order Baru)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

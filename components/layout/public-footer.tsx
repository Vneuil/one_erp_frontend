import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function PublicFooter() {
  return (
    <footer className="border-t border-border py-8 bg-white text-xs text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="ONE ERP Logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-contain"
            />
            <span className="font-bold text-foreground text-sm">ONE ERP</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-brand-primary transition-colors font-semibold">
              Harga
            </Link>
            <Link href="/faq" className="hover:text-brand-primary transition-colors font-semibold">
              FAQ
            </Link>
            <LanguageSwitcher variant="pill" />
          </div>
        </div>

        <div className="border-t border-border/70 pt-5 text-center space-y-1.5">
          <p className="font-semibold text-foreground">PT Digital Ventura Integrasi</p>
          <p>Ruko Permata Taman Palem Blok D9 No. 8, Cengkareng, Jakarta Barat, 11830</p>
          <p>
            <a href="tel:+6287777888125" className="hover:text-brand-primary transition-colors">
              +62 877-7788-8125
            </a>
          </p>
          <p>© 2026 PT Digital Ventura Integrasi</p>
        </div>
      </div>
    </footer>
  );
}

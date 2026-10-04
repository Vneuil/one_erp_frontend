"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReportState, useReport } from "@/components/reports/report-ui";
import { hrLettersApi } from "@/lib/api/hrletters";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const idDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : s;
};

/** A4 letter: letterhead, number and subject, body, signature, and the employee's acknowledgement. */
export default function LetterPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { data: l, error, loading } = useReport(`letter|${id}`, () => hrLettersApi.get(id).then((r) => r.data));
  const isMemo = l?.type === "memo";
  const addressee = l ? (l.employeeName ? `${l.employeeName} (NIP ${l.nip})` : l.data.audienceAll ? "Seluruh karyawan" : l.data.audienceDepartment?.trim() ? `Seluruh karyawan departemen ${l.data.audienceDepartment.trim()}` : (l.recipients ?? []).map((r) => r.name).join(", ")) : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href="/hrm/letters" className="text-xs text-brand-primary font-semibold">← Kembali ke Surat & Mutasi</Link>
        <Button size="sm" className="h-9 text-xs font-bold" disabled={!l} onClick={() => window.print()}>Cetak</Button>
        {l?.status === "draft" && <span className="text-xs text-amber-700 font-semibold">Draft: surat belum bernomor dan belum sah.</span>}
        {l?.status === "cancelled" && <span className="text-xs text-rose-700 font-semibold">Surat ini dibatalkan.</span>}
      </div>
      <ReportState loading={loading} error={error} />
      {l && (
        <div className="bg-white mx-auto max-w-[210mm] p-10 print:p-0 print:max-w-none text-[13px] leading-relaxed text-black">
          <div className="text-center border-b-2 border-black pb-3 mb-6">
            <div className="text-lg font-black uppercase tracking-wide">{l.companyName || "Perusahaan"}</div>
          </div>
          {isMemo ? (
            <>
              <div className="text-center font-black tracking-widest mb-4">MEMO INTERNAL</div>
              <table className="mb-4"><tbody>
                <tr><td className="pr-4">Nomor</td><td>: {l.number || "(draft)"}</td></tr>
                <tr><td className="pr-4">Kepada</td><td>: {addressee}</td></tr>
                <tr><td className="pr-4">Dari</td><td>: {l.signerName}{l.signerTitle ? `, ${l.signerTitle}` : ""}</td></tr>
                <tr><td className="pr-4">Tanggal</td><td>: {idDate(l.date)}</td></tr>
                <tr><td className="pr-4">Perihal</td><td>: {l.subject}</td></tr>
              </tbody></table>
              <hr className="border-black mb-4" />
            </>
          ) : (
            <>
              <div className="flex justify-between mb-4">
                <table><tbody>
                  <tr><td className="pr-4">Nomor</td><td>: {l.number || "(draft)"}</td></tr>
                  <tr><td className="pr-4">Perihal</td><td>: <b>{l.subject}</b></td></tr>
                </tbody></table>
                <div>{l.city ? `${l.city}, ` : ""}{idDate(l.date)}</div>
              </div>
              {!["contract", "overtime_order"].includes(l.type) && <div className="mb-4">Kepada Yth.<br /><b>{addressee}</b></div>}
            </>
          )}
          <div className="whitespace-pre-wrap text-justify">{l.body}</div>

          {l.type === "overtime_order" && (
            <table className="w-full border-collapse mt-4 text-xs"><thead><tr className="bg-slate-100"><th className="border border-black px-2 py-1 w-10">No</th><th className="border border-black px-2 py-1 text-left">Nama</th><th className="border border-black px-2 py-1 text-left">NIP</th><th className="border border-black px-2 py-1 text-left">Departemen</th><th className="border border-black px-2 py-1 w-32">Paraf</th></tr></thead>
              <tbody>{(l.recipients ?? []).map((r, i) => <tr key={r.id}><td className="border border-black px-2 py-1 text-center">{i + 1}</td><td className="border border-black px-2 py-1">{r.name}</td><td className="border border-black px-2 py-1">{r.nip}</td><td className="border border-black px-2 py-1">{r.department}</td><td className="border border-black px-2 py-1 h-8" /></tr>)}</tbody></table>
          )}

          <div className="mt-10 grid grid-cols-2 gap-8" style={{ breakInside: "avoid" }}>
            <div>
              {!isMemo && l.type !== "overtime_order" && l.employeeName && (
                <>
                  <div>Diterima oleh,</div>
                  <div className="h-20" />
                  <div className="border-t border-black inline-block min-w-[200px] pt-1">{l.employeeName}</div>
                  <div className="text-xs">Tanggal: {l.acknowledgedAt ? idDate(l.acknowledgedAt.slice(0, 10)) : "____ / ____ / ________"}</div>
                </>
              )}
            </div>
            <div className="text-center">
              <div>{l.companyName}</div>
              <div className="h-20" />
              <div className="font-bold underline">{l.signerName}</div>
              <div>{l.signerTitle}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { LedgerClient } from "@/components/ledger/LedgerClient";

export const metadata = {
  title: "小账本 · WC2026",
};

export default function LedgerPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black text-white">小账本 📒</h1>
        <p className="text-gray-400 mt-1 text-sm">记录每日输赢，世界杯结束看谁是真·股神</p>
      </div>
      <LedgerClient />
    </div>
  );
}

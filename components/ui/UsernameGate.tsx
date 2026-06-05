"use client";

import { useEffect, useState } from "react";
import { getUsername, setUsername } from "@/lib/username";

// 修改这里换邀请码
const INVITE_CODE = "wc2026";

interface Props {
  children: React.ReactNode;
}

export function UsernameGate({ children }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getUsername();
    setName(saved);
    setReady(true);
  }, []);

  function confirm() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (code !== INVITE_CODE) {
      setError("邀请码错误");
      return;
    }
    setUsername(trimmed);
    setName(trimmed);
  }

  if (!ready) return null;

  if (!name) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm space-y-5 text-center">
          <p className="text-4xl">⚽</p>
          <h2 className="text-2xl font-black text-white">2026 世界杯竞猜</h2>
          <p className="text-gray-400 text-sm">内部使用，需要邀请码</p>
          <input
            autoFocus
            placeholder="你的昵称"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg font-bold placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            placeholder="邀请码"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg font-bold placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            disabled={!input.trim() || !code}
            onClick={confirm}
            className="w-full py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-all"
          >
            进入 →
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

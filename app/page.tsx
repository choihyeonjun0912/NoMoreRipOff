"use client";

import { useRef, useState } from "react";
import checklist from "@/data/checklist.json";
import { compressImage, ImageTooLargeError } from "@/lib/compressImage";

type Status = "ok" | "risk" | "unclear";

interface AnalyzeResult {
  id: string;
  status: Status;
  reason: string;
}

type ErrorKind = "network" | "timeout" | "server" | "imageTooLarge" | null;

const TITLE_BY_ID = new Map(checklist.map((item) => [item.id, item.title]));

const STATUS_META: Record<
  Status,
  { icon: string; label: string; badge: string; border: string }
> = {
  risk: {
    icon: "⚠️",
    label: "위법 소지",
    badge: "bg-red-100 text-red-700",
    border: "border-red-200",
  },
  unclear: {
    icon: "❓",
    label: "확인 필요",
    badge: "bg-yellow-100 text-yellow-800",
    border: "border-yellow-200",
  },
  ok: {
    icon: "✅",
    label: "양호",
    badge: "bg-green-100 text-green-700",
    border: "border-green-200",
  },
};

const STATUS_ORDER: Record<Status, number> = { risk: 0, unclear: 1, ok: 2 };

const ERROR_MESSAGES: Record<Exclude<ErrorKind, null>, string> = {
  network: "네트워크 연결에 문제가 있습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
  timeout: "검사 시간이 초과되었습니다. 다시 시도해 주세요.",
  server: "계약서 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  imageTooLarge:
    "사진 용량이 너무 커서 보낼 수 없습니다. 계약서가 화면에 가득 차도록 조금 떨어져서 다시 찍어 주세요.",
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [results, setResults] = useState<AnalyzeResult[] | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setResults(null);
    setErrorKind(null);
    setServerMessage(null);
    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  async function handleAnalyze() {
    if (!file || loading) return;
    setLoading(true);
    setErrorKind(null);
    setServerMessage(null);
    setResults(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const image = await compressImage(file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType: "image/jpeg" }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message: string | null = null;
        try {
          message = ((await res.json()) as { error?: string }).error ?? null;
        } catch {
          // ignore body parse failure
        }
        setErrorKind("server");
        setServerMessage(message);
        return;
      }

      const data = (await res.json()) as { results: AnalyzeResult[] };
      const sorted = [...data.results].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      );
      setResults(sorted);
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        setErrorKind("imageTooLarge");
      } else if (err instanceof Error && err.name === "AbortError") {
        setErrorKind("timeout");
      } else {
        setErrorKind("network");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-36 pt-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">NoMoreRipOff</h1>
        <p className="mt-2 text-sm text-gray-600">
          근로계약서를 사진으로 찍으면, 위법 소지가 있는 조항을 바로
          확인해 드립니다.
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white px-4 py-8 text-center shadow-sm active:bg-gray-100"
      >
        <span className="block text-4xl">📷</span>
        <span className="mt-2 block text-lg font-semibold">
          계약서 사진 찍기 / 올리기
        </span>
        <span className="mt-1 block text-xs text-gray-500">
          카메라로 찍거나 앨범에서 선택하세요
        </span>
      </button>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="선택한 계약서 미리보기"
          className="mt-4 max-h-64 w-full rounded-xl border border-gray-200 object-contain"
        />
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow disabled:bg-gray-300 active:bg-blue-700"
      >
        {loading ? "검사 중..." : "계약서 검사하기"}
      </button>

      {loading && (
        <div className="mt-6 flex flex-col items-center gap-3" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">
            검사 중입니다... 최대 15초 정도 걸릴 수 있어요.
          </p>
        </div>
      )}

      {errorKind && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-700">
            {serverMessage ?? ERROR_MESSAGES[errorKind]}
          </p>
          <button
            type="button"
            onClick={handleAnalyze}
            className="mt-3 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white active:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {results && (
        <section className="mt-6" aria-label="검사 결과">
          <h2 className="mb-3 text-lg font-bold">검사 결과</h2>
          <ul className="space-y-3">
            {results.map((result) => {
              const meta = STATUS_META[result.status];
              return (
                <li
                  key={result.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${meta.border}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {meta.icon} {TITLE_BY_ID.get(result.id) ?? result.id}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {result.reason && (
                    <p className="mt-2 text-sm text-gray-600">{result.reason}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 px-4 py-3 text-center backdrop-blur">
        <p className="text-xs text-gray-600">
          본 결과는 법률 자문이 아닌 참고용 정보입니다.
        </p>
        <p className="mt-1 text-xs font-semibold text-gray-700">
          정확한 상담: 고용노동부 1350 · 대한법률구조공단 132
        </p>
      </footer>
    </div>
  );
}

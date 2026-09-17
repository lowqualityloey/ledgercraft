"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  postImportAction,
  uploadCsvAction,
  type DraftView,
} from "@/actions/imports";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface DraftState extends DraftView {
  offsetAccountId: string;
  include: boolean;
}

const MAX_BYTES = 1_000_000;

export function ImportUploader({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const fallback =
    accounts.find((a) => a.code === "5900")?.id ?? accounts[0]?.id ?? "";
  const [batchId, setBatchId] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [drafts, setDrafts] = useState<DraftState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [posted, setPosted] = useState<number | null>(null);

  async function upload(file: File) {
    setError(null);
    setPosted(null);
    setDrafts([]);
    setBatchId(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large (max 1MB)");
      return;
    }
    setPending(true);
    const text = await file.text();
    const res = await uploadCsvAction({ filename: file.name, content: text });
    setPending(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Upload failed");
      return;
    }
    setBatchId(res.data.batchId);
    setFilename(file.name);
    setContent(text);
    setDrafts(
      res.data.drafts.map((d) => ({
        ...d,
        offsetAccountId: fallback,
        include: true,
      })),
    );
    router.refresh();
  }

  const patch = (index: number, field: "offsetAccountId" | "include", value: string | boolean) =>
    setDrafts((ds) =>
      ds.map((d) => (d.index === index ? { ...d, [field]: value } : d)),
    );

  async function post() {
    if (!batchId) return;
    setError(null);
    setPending(true);
    const res = await postImportAction({
      batchId,
      content,
      selections: drafts.map((d) => ({
        index: d.index,
        offsetAccountId: d.offsetAccountId,
        include: d.include,
      })),
    });
    setPending(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Post failed");
      return;
    }
    setPosted(res.data.postedCount);
    setDrafts([]);
    setBatchId(null);
    router.refresh();
  }

  const selected = drafts.filter((d) => d.include).length;

  return (
    <div className="flex flex-col gap-4">
      <form
        aria-label="Upload bank CSV"
        className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="flex flex-col gap-1 text-sm">
          Bank CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
            className="text-sm"
          />
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          Header <span className="font-mono">date,description,amount</span> or{" "}
          <span className="font-mono">date,description,debit,credit</span>; max 1MB / 500 rows.
          Same file twice is rejected as a duplicate.
        </p>
        {pending && (
          <p aria-live="polite" className="mt-2 text-sm text-zinc-500">
            Working…
          </p>
        )}
      </form>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {posted !== null && (
        <p aria-live="polite" className="rounded bg-green-50 p-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Posted {posted} {posted === 1 ? "entry" : "entries"} — Trial Balance stays balanced. {filename} recorded.
        </p>
      )}

      {drafts.length > 0 && (
        <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Review drafts — {filename}</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="w-8 py-1 pr-2" aria-label="Include" />
                <th className="py-1 pr-2">Date</th>
                <th className="py-1 pr-2">Payee</th>
                <th className="py-1 pr-2 text-right">Amount ($)</th>
                <th className="py-1 pr-2">Offset account</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {drafts.map((d) => (
                <tr key={d.index} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1 pr-2">
                    <input
                      type="checkbox"
                      aria-label={`Include row ${d.index + 1}`}
                      checked={d.include}
                      onChange={(e) => patch(d.index, "include", e.target.checked)}
                    />
                  </td>
                  <td className="py-1 pr-2">{d.dateISO.slice(0, 10)}</td>
                  <td className="py-1 pr-2 font-sans">{d.description}</td>
                  <td className="py-1 pr-2 text-right">{d.totalDisplay}</td>
                  <td className="py-1 pr-2">
                    <select
                      aria-label={`Offset account row ${d.index + 1}`}
                      value={d.offsetAccountId}
                      onChange={(e) => patch(d.index, "offsetAccountId", e.target.value)}
                      className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 font-sans dark:border-zinc-700"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            disabled={selected === 0 || pending}
            onClick={() => void post()}
            className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
          >
            {pending ? "Posting…" : `Post ${selected} selected`}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { post } from "@/lib/api";
import { AmountField, Done, ErrorLine, Money, Sheet } from "./ui";

/** Money in from a customer (or out to a supplier) against what is owed. */
export function PaymentSheet({
  party,
  kind = "customer",
  onClose,
}: {
  party: { id: number; name: string; owed: number } | null;
  kind?: "customer" | "supplier";
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (party) {
      setAmount(Math.max(0, party.owed));
      setDone(false);
      setError(null);
    }
  }, [party]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await post("/payments", { [kind === "customer" ? "customerId" : "supplierId"]: party!.id, amount });
      setDone(true);
      qc.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const left = (party?.owed ?? 0) - amount;
  const quick = party && party.owed > 0 ? [party.owed, Math.round(party.owed / 2 / 1000) * 1000].filter((v, i, a) => v > 0 && a.indexOf(v) === i) : [];

  return (
    <Sheet open={!!party} onClose={onClose} title={kind === "customer" ? "استلام دفعة" : "دفعة للمورد"}>
      {party &&
        (done ? (
          <Done
            title={kind === "customer" ? "استلمنا" : "دفعنا"}
            sub={
              <>
                <Money v={amount} className="font-bold text-teal" /> {kind === "customer" ? "من" : "إلى"} {party.name}
                <p className={`mt-1 font-bold ${left > 0 ? "text-debt" : "text-cash"}`}>
                  {left > 0 ? <>باقي <Money v={left} /></> : "ما بقى شي، الحساب صافي"}
                </p>
              </>
            }
          >
            <button className="btn-teal" onClick={onClose}>تمام</button>
          </Done>
        ) : (
          <div className="grid gap-5">
            <div className="panel p-4">
              <p className="text-xl font-bold text-ink">{party.name}</p>
              <p className="text-debt">
                {kind === "customer" ? "عليه" : "له علينا"} <Money v={party.owed} className="num text-2xl" />
              </p>
            </div>
            <AmountField label={kind === "customer" ? "كم دفع؟" : "كم ندفع؟"} value={amount} onChange={setAmount} quick={quick} />
            {amount > 0 && amount < party.owed && (
              <p className="-mt-3 text-sm font-semibold text-debt">يبقى <Money v={left} /></p>
            )}
            <ErrorLine msg={error} />
            <button className="btn-sun w-full text-xl" disabled={busy || amount <= 0} onClick={save}>
              {busy ? "لحظة..." : <>سجّل <Money v={amount} /></>}
            </button>
          </div>
        ))}
    </Sheet>
  );
}

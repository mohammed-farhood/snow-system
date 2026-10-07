// Quick end-to-end check of the API against a running server: node scripts/smoke.mjs [baseUrl]
const B = (process.argv[2] ?? "http://127.0.0.1:3001") + "/api";
let token = "";
const call = async (method, path, body) => {
  const r = await fetch(B + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!j.success) throw new Error(`${method} ${path} -> ${r.status} ${j.error}`);
  return j.data;
};
const ok = (cond, msg) => {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok -", msg);
};

const { people } = await call("GET", "/auth/people");
ok(people.length > 0, `people list (${people.length})`);
const owner = people.find((p) => p.role === "OWNER");
token = (await call("POST", "/auth/login", { userId: owner.id, pin: process.env.OWNER_PIN ?? "1234" })).token;
ok(token, "owner signs in with PIN");

const before = await call("GET", "/today");
const products = await call("GET", "/products");
const block = products.find((p) => p.kind === "ICE");
const sale = await call("POST", "/sales", {
  items: [{ productId: block.id, quantity: 4 }],
  customerName: "زبون اختبار",
  paid: 0,
});
ok(sale.total === block.price * 4 && sale.paid === 0, "sale on credit uses the server price");
const after = await call("GET", "/today");
ok(after.iceStock === before.iceStock - 4, `ice stock drops by 4 (${before.iceStock} -> ${after.iceStock})`);

const customers = await call("GET", "/customers");
const c = customers.find((x) => x.name === "زبون اختبار");
ok(c.owed === sale.total, "customer owes the sale total");
await call("POST", "/payments", { customerId: c.id, amount: sale.total });
const c2 = await call("GET", `/customers/${c.id}`);
ok(c2.owed === 0, "payment clears the debt");

await call("POST", "/production", { blocks: 10, wasted: 1 });
ok((await call("GET", "/today")).iceStock === after.iceStock + 9, "production adds blocks minus waste");

const act = await call("GET", "/activity");
ok(act.length > 0 && act[0].canUndo, "activity list newest first, undoable");
await call("DELETE", `/activity/sale/${sale.id}`);
ok(!(await call("GET", "/activity")).some((a) => a.type === "sale" && a.id === sale.id), "undo removes the sale");

const rep = await call("GET", "/reports");
ok(typeof rep.profit === "number" && rep.partner, "report with partner share for owner");

let failed = false;
try {
  await call("POST", "/auth/login", { userId: owner.id, pin: "0000" });
} catch {
  failed = true;
}
ok(failed, "wrong PIN refused");
console.log("ALL GOOD");

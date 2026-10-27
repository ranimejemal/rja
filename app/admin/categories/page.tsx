import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/client";
import { saveCategory, toggleCategory } from "../actions";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("product_categories").select("id, slug, name, sort_order, is_active").order("sort_order");
  return (
    <>
      <div className="stack"><span className="tag">(Categories)</span><h1 className="h2">Categories</h1></div>
      <form action={saveCategory} className="card form-grid">
        <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" required maxLength={60} /></div>
        <div className="field"><label htmlFor="slug">Slug</label><input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></div>
        <div className="field"><label htmlFor="sort_order">Order</label><input id="sort_order" name="sort_order" type="number" min={0} defaultValue={100} /></div>
        <div style={{ alignSelf: "end" }}><SubmitButton className="btn small">Add or update</SubmitButton></div>
      </form>
      <div className="table-wrap"><table>
        <thead><tr><th>Order</th><th>Name</th><th>Slug</th><th>Visible</th><th /></tr></thead>
        <tbody>{(data ?? []).map((c) => (
          <tr key={c.id}><td>{c.sort_order}</td><td>{c.name}</td><td className="mono">{c.slug}</td><td>{c.is_active ? "yes" : "hidden"}</td>
            <td><form action={toggleCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={c.is_active ? "0" : "1"} />
              <button className="btn ghost small">{c.is_active ? "Hide" : "Show"}</button></form></td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}

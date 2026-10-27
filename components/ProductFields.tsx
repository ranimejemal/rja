import { CUSTOMIZATION_LABEL, LICENSE_LABEL } from "./ui";

type Values = {
  name?: string; slug?: string; short_description?: string; description?: string; category_id?: string | null;
  price_minor?: number; difficulty?: string; customization_mode?: string; license_types?: string[]; integrations?: string[];
  tags?: string[]; prerequisites?: string; install_instructions?: string; support_policy?: string; demo_video_url?: string | null;
};

/** Listing fields shared by the create and edit forms. */
export function ProductFields({ v = {}, categories, slugLocked = false }: { v?: Values; categories: { id: string; name: string }[]; slugLocked?: boolean }) {
  return (
    <div className="form-grid">
      <div className="field"><label htmlFor="name">Product name</label><input id="name" name="name" required maxLength={120} defaultValue={v.name} /></div>
      <div className="field">
        <label htmlFor="slug">URL slug</label>
        <input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} defaultValue={v.slug} readOnly={slugLocked} />
        <span className="hint">{slugLocked ? "The URL cannot change after creation." : "e.g. ai-lead-router"}</span>
      </div>
      <div className="field full"><label htmlFor="short_description">Short description</label><input id="short_description" name="short_description" required maxLength={280} defaultValue={v.short_description} /></div>
      <div className="field full"><label htmlFor="description">Detailed description</label><textarea id="description" name="description" rows={8} maxLength={10000} defaultValue={v.description} placeholder="What it does, what it does not do, example input and output." /></div>
      <div className="field">
        <label htmlFor="category_id">Category</label>
        <select id="category_id" name="category_id" required defaultValue={v.category_id ?? ""}>
          <option value="" disabled>Choose…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="price">Price (EUR)</label><input id="price" name="price" inputMode="decimal" required defaultValue={v.price_minor !== undefined ? (v.price_minor / 100).toFixed(2) : ""} placeholder="49.00 (0 for free)" /></div>
      <div className="field">
        <label htmlFor="difficulty">Level</label>
        <select id="difficulty" name="difficulty" defaultValue={v.difficulty ?? "beginner"}>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="customization_mode">Customization</label>
        <select id="customization_mode" name="customization_mode" defaultValue={v.customization_mode ?? "ready_to_use"}>
          {Object.entries(CUSTOMIZATION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="hint">Configurable or Guided setup need a configuration form on the version.</span>
      </div>
      <fieldset className="full">
        <legend>Licenses you are authorized to grant</legend>
        <div className="form-grid">
          {Object.entries(LICENSE_LABEL).map(([k, l]) => (
            <label key={k} className="check"><input type="checkbox" name="license_types" value={k} defaultChecked={(v.license_types ?? ["single_business"]).includes(k)} /> {l}</label>
          ))}
        </div>
      </fieldset>
      <div className="field"><label htmlFor="integrations">Required apps (comma-separated)</label><input id="integrations" name="integrations" defaultValue={v.integrations?.join(", ")} placeholder="Gmail, HubSpot, OpenAI" /></div>
      <div className="field"><label htmlFor="tags">Tags (comma-separated)</label><input id="tags" name="tags" defaultValue={v.tags?.join(", ")} /></div>
      <div className="field full"><label htmlFor="prerequisites">Prerequisites</label><textarea id="prerequisites" name="prerequisites" rows={3} maxLength={2000} defaultValue={v.prerequisites} placeholder="Accounts, API keys and n8n version buyers need." /></div>
      <div className="field full"><label htmlFor="install_instructions">Installation instructions</label><textarea id="install_instructions" name="install_instructions" rows={6} maxLength={10000} defaultValue={v.install_instructions} /></div>
      <div className="field"><label htmlFor="support_policy">Support policy</label><input id="support_policy" name="support_policy" maxLength={1000} defaultValue={v.support_policy} placeholder="Email support within 3 business days" /></div>
      <div className="field"><label htmlFor="demo_video_url">Demo video URL (https, optional)</label><input id="demo_video_url" name="demo_video_url" type="url" defaultValue={v.demo_video_url ?? ""} /></div>
    </div>
  );
}

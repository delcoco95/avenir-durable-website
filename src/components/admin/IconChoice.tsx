import { DOMAIN_ICONS, DomainGlyph } from "@/components/site/Rings";

const LABELS: Record<string, string> = { leaf: "Feuille", seed: "Graine", water: "Eau", hands: "Mains", sun: "Soleil", cycle: "Cycle", home: "Maison", spark: "Étincelle" };

export function IconChoice({ name, value }: { name: string; value: string }) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 1rem" }}>
      <legend>Pictogramme</legend>
      <div className="swatch-row">
        {DOMAIN_ICONS.map((icon) => (
          <label className="swatch" key={icon} style={{ color: "var(--brand)" }}>
            <input type="radio" name={name} value={icon} defaultChecked={value === icon} className="visually-hidden" />
            <span style={{ width: 36, height: 36, display: "block" }}>
              <DomainGlyph icon={icon} />
            </span>
            <span style={{ color: "var(--ink)", fontSize: "0.85rem" }}>{LABELS[icon]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

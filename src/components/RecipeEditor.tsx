import { Camera, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { photoFromFile } from '../lib/ocr';
import { describeIngredient, parseAmount } from '../lib/recipeReader';
import { emptyIngredient, recipeFromDraft, type DraftIngredient, type EditorDraft } from '../lib/recipeDraft';
import { AISLE_ORDER, CATEGORY_ORDER, type Aisle, type Recipe } from '../types';
import { catClass } from './Marker';
import { Sheet } from './Sheet';

interface Props {
  draft: EditorDraft;
  /** Shown above the title: "Check the recipe" for imports, "Edit recipe" for edits. */
  heading: string;
  onSave: (recipe: Recipe) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Review an imported recipe, or edit an existing one, before saving it to the household. */
export function RecipeEditor({ draft: initial, heading, onSave, onDelete, onClose }: Props) {
  const [d, setD] = useState<EditorDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<EditorDraft>) => setD((x) => ({ ...x, ...patch }));
  const setIng = (k: string, patch: Partial<DraftIngredient>) =>
    setD((x) => ({ ...x, ingredients: x.ingredients.map((i) => (i.key === k ? { ...i, ...patch } : i)) }));

  // When a name is typed, use the household's name for it and its usual aisle.
  const settleName = (i: DraftIngredient) => {
    if (!i.name.trim()) return;
    const info = describeIngredient(i.name);
    setIng(i.key, { name: info.name, ...(info.known || i.aisle === 'Other' ? { aisle: info.aisle, staple: info.staple } : {}), isNew: !info.known });
  };

  const save = () => {
    if (!d.name.trim()) return setError('Give the recipe a name.');
    onSave(recipeFromDraft(d, parseAmount));
  };

  const newCount = d.ingredients.filter((i) => i.isNew && i.name).length;

  return (
    <Sheet
      open
      onClose={onClose}
      className={`editor ${catClass(d.category)}`}
      kicker={heading}
      title={d.name || 'New recipe'}
      footer={
        <div className="sheet-footer-row">
          {onDelete && (
            <button className="btn btn-quiet danger-text" onClick={onDelete} aria-label="Delete recipe">
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary grow" onClick={save}>
            Save recipe
          </button>
        </div>
      }
    >
      {error && <p className="form-error">{error}</p>}

      <div className="editor-photo">
        {d.image ? (
          <>
            <img src={d.image} alt="" referrerPolicy="no-referrer" />
            <button className="photo-remove" onClick={() => set({ image: undefined })} aria-label="Remove photo">
              <X size={16} />
            </button>
          </>
        ) : (
          <button className="photo-add" onClick={() => photoInput.current?.click()}>
            <Camera size={22} strokeWidth={1.6} />
            <span>Add a photo</span>
            <span className="muted small">A screenshot of the video works</span>
          </button>
        )}
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) set({ image: await photoFromFile(f) });
            e.target.value = '';
          }}
        />
      </div>

      <label className="field">
        <span>Name</span>
        <input className="input input-title" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Nan's beef stew" />
      </label>

      <div className="field">
        <span>Main protein</span>
        <div className="filters wrap">
          {CATEGORY_ORDER.map((c) => (
            <button key={c} className={`filter ${catClass(c)} ${d.category === c ? 'on' : ''}`} onClick={() => set({ category: c })}>
              <i className="marker marker-dot marker-sm" />
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Minutes</span>
          <input className="input" inputMode="numeric" value={d.minutes} onChange={(e) => set({ minutes: e.target.value.replace(/\D/g, '') })} placeholder="30" />
        </label>
        <label className="field">
          <span>Serves</span>
          <input className="input" inputMode="numeric" value={d.serves} onChange={(e) => set({ serves: e.target.value.replace(/\D/g, '') })} placeholder="4" />
        </label>
      </div>

      <div className="field">
        <span>
          Ingredients
          {newCount > 0 && <em className="hint-new"> · {newCount} new to the planner, check the aisle</em>}
        </span>
        <ul className="ing-edit">
          {d.ingredients.map((i) => (
            <li key={i.key} className={i.isNew && i.name ? 'is-new' : ''}>
              <div className="ing-edit-row">
                <input
                  className="input ing-amount"
                  value={i.amount}
                  placeholder="Amount"
                  onChange={(e) => setIng(i.key, { amount: e.target.value })}
                  aria-label="Amount"
                />
                <input
                  className="input ing-name"
                  value={i.name}
                  placeholder="Ingredient"
                  onChange={(e) => setIng(i.key, { name: e.target.value })}
                  onBlur={() => settleName(i)}
                  aria-label="Ingredient"
                />
                <button className="icon-btn ghost" onClick={() => set({ ingredients: d.ingredients.filter((x) => x.key !== i.key) })} aria-label={`Remove ${i.name}`}>
                  <X size={16} />
                </button>
              </div>
              <div className="ing-edit-meta">
                <select value={i.aisle} onChange={(e) => setIng(i.key, { aisle: e.target.value as Aisle })} aria-label="Aisle">
                  {AISLE_ORDER.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <label className="check-inline">
                  <input type="checkbox" checked={i.staple} onChange={(e) => setIng(i.key, { staple: e.target.checked })} />
                  In the cupboard
                </label>
              </div>
              {i.raw && <p className="ing-raw">{i.raw}</p>}
            </li>
          ))}
        </ul>
        <button className="link" onClick={() => set({ ingredients: [...d.ingredients, emptyIngredient()] })}>
          <Plus size={16} /> Add ingredient
        </button>
      </div>

      <label className="field">
        <span>Method · one step per line</span>
        <textarea className="input textarea" rows={8} value={d.method} onChange={(e) => set({ method: e.target.value })} placeholder={'Brown the beef.\nAdd the onion…'} />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea className="input textarea" rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional" />
      </label>

      {d.source?.url && (
        <p className="muted small">
          From {d.source.name}
          {d.author ? ` · ${d.author}` : ''}
        </p>
      )}
    </Sheet>
  );
}

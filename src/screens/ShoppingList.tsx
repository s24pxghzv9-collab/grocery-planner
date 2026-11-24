import { useState } from 'react';
import { addDays, rangeLabel, weekLabel } from '../lib/dates';
import { formatQty, groupByAisle, type ShoppingItem } from '../lib/shopping';
import { newId, weekShopping } from '../lib/store';
import type { Ctx } from '../App';
import type { WeekShopping } from '../types';

export function ShoppingList({ ctx }: { ctx: Ctx }) {
  const { state, update, currentWeek, listWeek, setListWeek, listItems, toast } = ctx;
  const shop = weekShopping(state, listWeek);
  const [newItem, setNewItem] = useState('');

  const main = listItems.filter((i) => !i.staple);
  const staples = listItems.filter((i) => i.staple);
  const remaining = main.filter((i) => !shop.checked[i.key]).length + shop.extras.filter((e) => !e.checked).length;
  const total = main.length + shop.extras.length;

  const setShop = (fn: (w: WeekShopping) => WeekShopping) =>
    update((s) => ({ ...s, shopping: { ...s.shopping, [listWeek]: fn(weekShopping(s, listWeek)) } }));

  const toggle = (key: string) => setShop((w) => ({ ...w, checked: { ...w.checked, [key]: !w.checked[key] } }));

  const addExtra = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setShop((w) => ({ ...w, extras: [...w.extras, { id: newId(), text: t, checked: false }] }));
    update((s) => ({
      ...s,
      extrasHistory: [t, ...s.extrasHistory.filter((h) => h.toLowerCase() !== t.toLowerCase())].slice(0, 30),
    }));
    setNewItem('');
  };

  const toggleExtra = (id: string) =>
    setShop((w) => ({ ...w, extras: w.extras.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e)) }));
  const removeExtra = (id: string) => setShop((w) => ({ ...w, extras: w.extras.filter((e) => e.id !== id) }));

  const resetTicks = () =>
    setShop((w) => ({ checked: {}, extras: w.extras.map((e) => ({ ...e, checked: false })) }));

  const suggestions = state.extrasHistory
    .filter((h) => !shop.extras.some((e) => e.text.toLowerCase() === h.toLowerCase()))
    .slice(0, 10);

  const share = async () => {
    const lines = [`Shopping list (${rangeLabel(listWeek)})`];
    for (const [aisle, items] of groupByAisle(main.filter((i) => !shop.checked[i.key]))) {
      lines.push('', aisle, ...items.map((i) => `- ${[formatQty(i), i.name].filter(Boolean).join(' ')}`));
    }
    const extras = shop.extras.filter((e) => !e.checked);
    if (extras.length) lines.push('', 'Extras', ...extras.map((e) => `- ${e.text}`));
    const text = lines.join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast('List copied, ready to paste');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast("Couldn't share the list");
    }
  };

  const weeks = [currentWeek, addDays(currentWeek, 7)];

  return (
    <main className="screen">
      <header className="page-header row">
        <div>
          <h1>Shopping list</h1>
          <p className="muted">
            {total === 0 ? 'Nothing yet' : remaining === 0 ? 'All done 🎉' : `${remaining} of ${total} to get`}
          </p>
        </div>
        {total > 0 && (
          <button className="btn btn-ghost" onClick={share}>
            Share
          </button>
        )}
      </header>

      <div className="segmented">
        {weeks.map((w) => (
          <button key={w} className={listWeek === w ? 'on' : ''} onClick={() => setListWeek(w)}>
            {weekLabel(w, currentWeek)}
            <span className="small muted">{rangeLabel(w)}</span>
          </button>
        ))}
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          addExtra(newItem);
        }}
      >
        <input
          className="input"
          placeholder="Add something else (e.g. coffee beans)"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!newItem.trim()}>
          Add
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="chip-row scroll-x">
          {suggestions.map((s) => (
            <button key={s} className="chip chip-sm" onClick={() => addExtra(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}

      {shop.extras.length > 0 && (
        <section className="aisle">
          <h3 className="section-title">Extras</h3>
          <ul className="check-list">
            {[...shop.extras]
              .sort((a, b) => Number(a.checked) - Number(b.checked))
              .map((e) => (
                <li key={e.id} className={e.checked ? 'done' : ''}>
                  <button className="check-row" onClick={() => toggleExtra(e.id)}>
                    <span className="checkbox">{e.checked ? '✓' : ''}</span>
                    <span className="check-text">{e.text}</span>
                  </button>
                  <button className="icon-btn subtle" onClick={() => removeExtra(e.id)} aria-label={`Remove ${e.text}`}>
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {groupByAisle(main).map(([aisle, items]) => (
        <section className="aisle" key={aisle}>
          <h3 className="section-title">{aisle}</h3>
          <ItemList items={items} checked={shop.checked} onToggle={toggle} />
        </section>
      ))}

      {staples.length > 0 && (
        <details className="aisle staples">
          <summary className="section-title">Check you have ({staples.length})</summary>
          <ItemList items={staples} checked={shop.checked} onToggle={toggle} />
        </details>
      )}

      {listItems.length === 0 && shop.extras.length === 0 && (
        <div className="empty-state">
          <p className="emoji-lg">🛒</p>
          <p>No dinners planned for {weekLabel(listWeek, currentWeek).toLowerCase()} yet.</p>
          <button className="btn" onClick={() => ctx.goPlan(listWeek)}>
            Plan dinners
          </button>
        </div>
      )}

      {Object.values(shop.checked).some(Boolean) || shop.extras.some((e) => e.checked) ? (
        <div className="btn-row center">
          <button className="btn btn-ghost" onClick={resetTicks}>
            Untick everything
          </button>
        </div>
      ) : null}
    </main>
  );
}

function ItemList({
  items,
  checked,
  onToggle,
}: {
  items: ShoppingItem[];
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const sorted = [...items].sort((a, b) => Number(!!checked[a.key]) - Number(!!checked[b.key]));
  return (
    <ul className="check-list">
      {sorted.map((i) => (
        <li key={i.key} className={checked[i.key] ? 'done' : ''}>
          <button className="check-row" onClick={() => onToggle(i.key)}>
            <span className="checkbox">{checked[i.key] ? '✓' : ''}</span>
            <span className="check-text">
              <span>
                {formatQty(i) && <span className="qty">{formatQty(i)}</span>} {i.name}
              </span>
              <span className="muted small">For {i.forMeals.join(', ')}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

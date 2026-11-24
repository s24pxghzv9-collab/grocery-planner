import { Check, ChevronDown, Plus, Share, X } from 'lucide-react';
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
  const done = main.filter((i) => shop.checked[i.key]).length + shop.extras.filter((e) => e.checked).length;
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

  const resetTicks = () => setShop((w) => ({ checked: {}, extras: w.extras.map((e) => ({ ...e, checked: false })) }));

  const suggestions = state.extrasHistory
    .filter((h) => !shop.extras.some((e) => e.text.toLowerCase() === h.toLowerCase()))
    .slice(0, 10);

  const share = async () => {
    const lines = [`Shopping list, ${rangeLabel(listWeek)}`];
    for (const [aisle, items] of groupByAisle(main.filter((i) => !shop.checked[i.key]))) {
      lines.push('', aisle.toUpperCase(), ...items.map((i) => `• ${i.name}${formatQty(i) ? ` (${formatQty(i)})` : ''}`));
    }
    const extras = shop.extras.filter((e) => !e.checked);
    if (extras.length) lines.push('', 'EXTRAS', ...extras.map((e) => `• ${e.text}`));
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
  const anyTicked = done > 0 || staples.some((i) => shop.checked[i.key]);

  return (
    <main className="screen">
      <header className="page-head">
        <div>
          <h1 className="title-lg">Shopping</h1>
          <p className="muted small">
            {total === 0 ? 'Nothing on the list yet' : done === total ? 'All done' : `${done} of ${total} in the trolley`}
          </p>
        </div>
        {total > 0 && (
          <button className="icon-btn" onClick={share} aria-label="Share list">
            <Share size={20} />
          </button>
        )}
      </header>

      {total > 0 && (
        <div className="bar thin">
          <div style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}

      <div className="segmented">
        {weeks.map((w) => (
          <button key={w} className={listWeek === w ? 'on' : ''} onClick={() => setListWeek(w)}>
            <span>{weekLabel(w, currentWeek)}</span>
            <span className="segmented-sub">{rangeLabel(w)}</span>
          </button>
        ))}
      </div>

      <form
        className="add-item"
        onSubmit={(e) => {
          e.preventDefault();
          addExtra(newItem);
        }}
      >
        <Plus size={20} className="add-item-icon" />
        <input placeholder="Add an item" value={newItem} onChange={(e) => setNewItem(e.target.value)} aria-label="Add an item" />
        {newItem.trim() && (
          <button className="btn btn-primary btn-sm" type="submit">
            Add
          </button>
        )}
      </form>
      {suggestions.length > 0 && (
        <div className="filters">
          {suggestions.map((s) => (
            <button key={s} className="filter" onClick={() => addExtra(s)}>
              <Plus size={14} /> {s}
            </button>
          ))}
        </div>
      )}

      {shop.extras.length > 0 && (
        <section>
          <h3 className="section-label">Extras</h3>
          <ul className="checklist">
            {[...shop.extras]
              .sort((a, b) => Number(a.checked) - Number(b.checked))
              .map((e) => (
                <li key={e.id} className={e.checked ? 'done' : ''}>
                  <button className="check-row" onClick={() => toggleExtra(e.id)}>
                    <CheckCircle on={e.checked} />
                    <span className="check-name">{e.text}</span>
                  </button>
                  <button className="icon-btn ghost" onClick={() => removeExtra(e.id)} aria-label={`Remove ${e.text}`}>
                    <X size={16} />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {groupByAisle(main).map(([aisle, items]) => (
        <section key={aisle}>
          <h3 className="section-label">
            {aisle}
            <span className="count">{items.filter((i) => !shop.checked[i.key]).length || ''}</span>
          </h3>
          <ItemList items={items} checked={shop.checked} onToggle={toggle} />
        </section>
      ))}

      {staples.length > 0 && (
        <details className="staples">
          <summary>
            <span>
              <strong>Check the cupboard</strong>
              <span className="muted small">
                {staples.length} staple{staples.length === 1 ? '' : 's'} like {staples[0].name}
              </span>
            </span>
            <ChevronDown size={18} className="staples-chevron" />
          </summary>
          <ItemList items={staples} checked={shop.checked} onToggle={toggle} />
        </details>
      )}

      {listItems.length === 0 && shop.extras.length === 0 && (
        <div className="empty-state">
          <p className="title">Your list is empty</p>
          <p className="muted">Plan some dinners for {weekLabel(listWeek, currentWeek).toLowerCase()} and the ingredients will appear here.</p>
          <button className="btn btn-primary" onClick={() => ctx.goPlan(listWeek)}>
            Plan dinners
          </button>
        </div>
      )}

      {anyTicked && (
        <div className="quiet-actions">
          <button className="link" onClick={resetTicks}>
            Untick everything
          </button>
        </div>
      )}
    </main>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return <span className={`check-circle ${on ? 'on' : ''}`}>{on && <Check size={14} strokeWidth={3} />}</span>;
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
    <ul className="checklist">
      {sorted.map((i) => (
        <li key={i.key} className={checked[i.key] ? 'done' : ''}>
          <button className="check-row" onClick={() => onToggle(i.key)}>
            <CheckCircle on={!!checked[i.key]} />
            <span className="check-text">
              <span className="check-name">{i.name}</span>
              <span className="check-for">{i.forMeals.join(', ')}</span>
            </span>
            <span className="check-qty">{formatQty(i)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

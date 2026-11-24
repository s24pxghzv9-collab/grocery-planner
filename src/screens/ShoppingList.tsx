import { Check, ChevronDown, Plus, Share, X } from 'lucide-react';
import { useState } from 'react';
import { addDays, rangeLabel, weekLabel } from '../lib/dates';
import { formatQty, groupByAisle, type ShoppingItem } from '../lib/shopping';
import { newId, weekShopping } from '../lib/store';
import type { Ctx } from '../App';
import { SyncBadge } from '../components/SyncBadge';
import type { ExtraItem } from '../types';

export function ShoppingList({ ctx }: { ctx: Ctx }) {
  const { state, dispatch, currentWeek, listWeek, setListWeek, listItems, toast } = ctx;
  const shop = weekShopping(state, listWeek);
  const [newItem, setNewItem] = useState('');

  const main = listItems.filter((i) => !i.staple);
  const staples = listItems.filter((i) => i.staple);
  // Ticked items move out of the aisles into a folded "Completed" section.
  const openMain = main.filter((i) => !shop.checked[i.key]);
  const doneMain = main.filter((i) => shop.checked[i.key]);
  const openExtras = shop.extras.filter((e) => !e.checked);
  const doneExtras = shop.extras.filter((e) => e.checked);
  const done = doneMain.length + doneExtras.length;
  const total = main.length + shop.extras.length;

  const toggle = (key: string) => dispatch({ t: 'check', week: listWeek, key, on: !shop.checked[key] });

  const addExtra = (text: string) => {
    const t = text.trim();
    if (!t) return;
    dispatch([
      { t: 'extra', week: listWeek, item: { id: newId(), text: t, checked: false, at: Date.now() } },
      {
        t: 'history',
        list: [t, ...state.extrasHistory.filter((h) => h.toLowerCase() !== t.toLowerCase())].slice(0, 30),
      },
    ]);
    setNewItem('');
  };

  const toggleExtra = (item: ExtraItem) =>
    dispatch({ t: 'extra', week: listWeek, item: { ...item, checked: !item.checked } });
  const removeExtra = (id: string) => dispatch({ t: 'extraDel', week: listWeek, id });

  const resetTicks = () =>
    dispatch([
      ...Object.keys(shop.checked).map((key) => ({ t: 'check' as const, week: listWeek, key, on: false })),
      ...shop.extras.filter((e) => e.checked).map((e) => ({ t: 'extra' as const, week: listWeek, item: { ...e, checked: false } })),
    ]);

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
          <SyncBadge status={ctx.syncStatus} />
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

      {openExtras.length > 0 && (
        <section>
          <h3 className="section-label">Extras</h3>
          <ul className="checklist">
            {openExtras.map((e) => (
              <ExtraRow key={e.id} item={e} onToggle={toggleExtra} onRemove={removeExtra} />
            ))}
          </ul>
        </section>
      )}

      {groupByAisle(openMain).map(([aisle, items]) => (
        <section key={aisle}>
          <h3 className="section-label">
            {aisle}
            <span className="count">{items.length}</span>
          </h3>
          <ItemList items={items} checked={shop.checked} onToggle={toggle} />
        </section>
      ))}

      {total > 0 && done === total && (
        <div className="all-done">
          <Check size={22} />
          <span>Everything's in the trolley</span>
        </div>
      )}

      {done > 0 && (
        <details className="completed">
          <summary>
            <span>Completed</span>
            <span className="count">{done}</span>
            <ChevronDown size={18} className="completed-chevron" />
          </summary>
          <ul className="checklist">
            {doneExtras.map((e) => (
              <ExtraRow key={e.id} item={e} onToggle={toggleExtra} onRemove={removeExtra} />
            ))}
          </ul>
          <ItemList items={doneMain} checked={shop.checked} onToggle={toggle} />
        </details>
      )}

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

function ExtraRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ExtraItem;
  onToggle: (item: ExtraItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className={item.checked ? 'done' : ''}>
      <button className="check-row" onClick={() => onToggle(item)}>
        <CheckCircle on={item.checked} />
        <span className="check-name">{item.text}</span>
      </button>
      <button className="icon-btn ghost" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.text}`}>
        <X size={16} />
      </button>
    </li>
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

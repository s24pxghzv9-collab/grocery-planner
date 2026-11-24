import { BookOpen, CalendarDays, House, ShoppingBasket, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RecipeDetail } from './components/RecipeDetail';
import { RecipePicker } from './components/RecipePicker';
import { RECIPES_BY_ID } from './data/recipes';
import { addDays, todayISO, weekDays, weekLabel, weekStart } from './lib/dates';
import { buildShoppingList, type ShoppingItem } from './lib/shopping';
import { useAppState, weekShopping, type Update } from './lib/store';
import { Home } from './screens/Home';
import { Plan } from './screens/Plan';
import { Recipes } from './screens/Recipes';
import { ShoppingList } from './screens/ShoppingList';
import type { AppState, DayPlan } from './types';

type Tab = 'home' | 'plan' | 'list' | 'recipes';
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Today', icon: House },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'list', label: 'Shopping', icon: ShoppingBasket },
  { id: 'recipes', label: 'Recipes', icon: BookOpen },
];

/** Shared state and actions passed to each screen. */
export interface Ctx {
  state: AppState;
  update: Update;
  today: string;
  currentWeek: string;
  planWeek: string;
  setPlanWeek: (w: string) => void;
  listWeek: string;
  setListWeek: (w: string) => void;
  listItems: ShoppingItem[];
  listSummary: { label: string; remaining: number };
  openPicker: (day: string) => void;
  openRecipe: (id: string) => void;
  goPlan: (week: string) => void;
  goList: () => void;
  toast: (msg: string) => void;
}

function readTab(): Tab {
  const t = location.hash.replace('#/', '') as Tab;
  return TABS.some((x) => x.id === t) ? t : 'home';
}

/** Re-render when the date changes (e.g. the app is left open overnight). */
function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const check = () => setToday(todayISO());
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export default function App() {
  const [state, update] = useAppState();
  const today = useToday();
  const currentWeek = weekStart(today, state.settings.weekStartsOn);
  const nextWeek = addDays(currentWeek, 7);

  const [tab, setTabState] = useState<Tab>(readTab);
  const [planWeek, setPlanWeek] = useState(currentWeek);
  // Show next week's list by default once anything is planned for it (i.e. Alice has started the next shop).
  const [listWeek, setListWeek] = useState(() =>
    weekDays(nextWeek).some((d) => state.plans[d]) ? nextWeek : currentWeek,
  );
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // If the week start setting changes, snap the selected weeks to the new boundaries.
  useEffect(() => {
    setPlanWeek((w) => weekStart(w, state.settings.weekStartsOn));
    setListWeek((w) => weekStart(w, state.settings.weekStartsOn));
  }, [state.settings.weekStartsOn]);

  useEffect(() => {
    const onHash = () => setTabState(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setTab = useCallback((t: Tab) => {
    location.hash = `/${t}`;
    window.scrollTo(0, 0);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const listItems = useMemo(
    () => buildShoppingList(weekDays(listWeek), state.plans, RECIPES_BY_ID),
    [listWeek, state.plans],
  );
  const listShop = weekShopping(state, listWeek);
  const listSummary = {
    label: weekLabel(listWeek, currentWeek),
    remaining:
      listItems.filter((i) => !i.staple && !listShop.checked[i.key]).length +
      listShop.extras.filter((e) => !e.checked).length,
  };

  // The picker works within the week of the day being edited.
  const pickerWeek = pickerDay ? weekDays(weekStart(pickerDay, state.settings.weekStartsOn)) : [];

  const onPick = (day: string, plan: DayPlan | null) => {
    update((s) => {
      const plans = { ...s.plans };
      if (plan) plans[day] = plan;
      else delete plans[day];
      return { ...s, plans };
    });
    if (!plan) return;
    // Move straight on to the next empty day so a whole week takes about 7 taps.
    const next = pickerWeek.find((d) => d > day && !state.plans[d]);
    setPickerDay(next ?? null);
    if (!next) toast('That’s the week sorted');
  };

  const ctx: Ctx = {
    state,
    update,
    today,
    currentWeek,
    planWeek,
    setPlanWeek,
    listWeek,
    setListWeek,
    listItems,
    listSummary,
    openPicker: setPickerDay,
    openRecipe: setRecipeId,
    goPlan: (w) => {
      setPlanWeek(w);
      setListWeek(w);
      setTab('plan');
    },
    goList: () => setTab('list'),
    toast,
  };

  return (
    <div className="app">
      {tab === 'home' && <Home ctx={ctx} />}
      {tab === 'plan' && <Plan ctx={ctx} />}
      {tab === 'list' && <ShoppingList ctx={ctx} />}
      {tab === 'recipes' && <Recipes ctx={ctx} />}

      <nav className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} aria-current={tab === id}>
            <Icon size={22} strokeWidth={tab === id ? 2.1 : 1.6} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <RecipePicker
        day={pickerDay}
        plans={state.plans}
        weekDays={pickerWeek}
        onPick={onPick}
        onClose={() => setPickerDay(null)}
      />
      <RecipeDetail recipeId={recipeId} onClose={() => setRecipeId(null)} />
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

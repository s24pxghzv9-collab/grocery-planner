import { BookOpen, CalendarDays, House, ShoppingBasket, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddRecipe } from './components/AddRecipe';
import { RecipeDetail } from './components/RecipeDetail';
import { RecipeEditor } from './components/RecipeEditor';
import { draftFromRecipe, draftFromText, recipeFromDraft, type EditorDraft } from './lib/recipeDraft';
import { parseAmount } from './lib/recipeReader';
import { RecipePicker } from './components/RecipePicker';
import { RECIPES_BY_ID, isBuiltIn, setHouseholdRecipes } from './data/recipes';
import { addDays, dayName, todayISO, weekDays, weekLabel, weekStart } from './lib/dates';
import { buildShoppingList, type ShoppingItem } from './lib/shopping';
import { useHouseholdState, weekShopping, type Dispatch, type SyncStatus } from './lib/store';
import { Home } from './screens/Home';
import { Plan } from './screens/Plan';
import { Recipes } from './screens/Recipes';
import { ShoppingList } from './screens/ShoppingList';
import type { AppState, DayPlan, Recipe } from './types';

type Tab = 'home' | 'plan' | 'list' | 'recipes';
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Today', icon: House },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'list', label: 'Shopping', icon: ShoppingBasket },
  { id: 'recipes', label: 'Recipes', icon: BookOpen },
];

export interface ToastAction {
  label: string;
  run: () => void;
}

/** Shared state and actions passed to each screen. */
export interface Ctx {
  state: AppState;
  dispatch: Dispatch;
  syncStatus: SyncStatus;
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
  openAdd: () => void;
  goPlan: (week: string) => void;
  goList: () => void;
  toast: (msg: string, action?: ToastAction) => void;
}

function readTab(): Tab {
  const t = location.hash.replace('#/', '').split('?')[0];
  if (t === 'add') return 'recipes';
  return TABS.some((x) => x.id === t) ? (t as Tab) : 'home';
}

/** "#/add?url=…" (used by the iPhone share shortcut): the link to import, if any. */
function readAddLink(): string | null {
  const m = location.hash.match(/^#\/add(?:\?(.*))?$/);
  if (!m) return null;
  return new URLSearchParams(m[1] ?? '').get('url') ?? '';
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
  const { state, dispatch, status: syncStatus } = useHouseholdState();
  // Merge recipes added or edited on either phone into the recipe bank before anything reads it.
  setHouseholdRecipes(state.recipes);
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
  // Add recipe: null = closed, '' = open with no link, otherwise a link to import.
  const [adding, setAdding] = useState<string | null>(readAddLink);
  // planDay: a new dinner typed in the picker, to put on that day once it's saved.
  const [editor, setEditor] = useState<{ draft: EditorDraft; heading: string; planDay?: string; stay?: boolean } | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; action?: ToastAction } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // If the week start setting changes, snap the selected weeks to the new boundaries.
  useEffect(() => {
    setPlanWeek((w) => weekStart(w, state.settings.weekStartsOn));
    setListWeek((w) => weekStart(w, state.settings.weekStartsOn));
  }, [state.settings.weekStartsOn]);

  useEffect(() => {
    const onHash = () => {
      setTabState(readTab());
      const link = readAddLink();
      if (link !== null) setAdding(link);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setTab = useCallback((t: Tab) => {
    location.hash = `/${t}`;
    window.scrollTo(0, 0);
  }, []);

  const toast = useCallback((text: string, action?: ToastAction) => {
    setToastMsg({ text, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), action ? 4500 : 2500);
  }, []);

  const listItems = useMemo(
    () =>
      buildShoppingList(weekDays(listWeek), state.plans, RECIPES_BY_ID).map((i) =>
        // Things the household always has (garden thyme…) go in "Check the cupboard".
        state.alwaysHave[i.name] ? { ...i, staple: true } : i,
      ),
    [listWeek, state.plans, state.recipes, state.alwaysHave],
  );
  const listShop = weekShopping(state, listWeek);
  const listSummary = {
    label: weekLabel(listWeek, currentWeek),
    remaining:
      listItems.filter((i) => !i.staple && !listShop.checked[i.key] && !listShop.have?.[i.key]).length +
      listShop.extras.filter((e) => !e.checked).length,
  };

  // The picker works within the week of the day being edited.
  const pickerWeek = pickerDay ? weekDays(weekStart(pickerDay, state.settings.weekStartsOn)) : [];

  const onPick = (day: string, plan: DayPlan | null, opts: { stay?: boolean } = {}) => {
    dispatch({ t: 'plan', date: day, plan });
    if (!plan || opts.stay) return;
    // Move straight on to the next empty day so a whole week takes about 7 taps.
    const next = pickerWeek.find((d) => d > day && !state.plans[d]);
    setPickerDay(next ?? null);
    if (!next) toast('That’s the week sorted');
  };

  const closeAdd = () => {
    setAdding(null);
    if (location.hash.startsWith('#/add')) history.replaceState(null, '', '#/recipes');
  };

  const saveRecipe = (recipe: Recipe) => {
    const planDay = editor?.planDay;
    if (planDay) {
      dispatch([
        { t: 'recipe', recipe },
        { t: 'plan', date: planDay, plan: { kind: 'recipe', recipeId: recipe.id } },
      ]);
      setEditor(null);
      toast(`${recipe.name} is on for ${dayName(planDay)}`);
      return;
    }
    dispatch({ t: 'recipe', recipe });
    setEditor(null);
    if (editor?.stay) {
      toast(`${recipe.name} saved`);
      return;
    }
    setTab('recipes');
    setRecipeId(recipe.id);
    toast('Saved to your recipes');
  };

  const deleteRecipe = (id: string) => {
    const r = RECIPES_BY_ID[id];
    if (!confirm(`Delete "${r?.name ?? 'this recipe'}"? Planned dinners using it will show as removed.`)) return;
    dispatch({ t: 'recipe', recipe: { id, deleted: true } as Recipe });
    setEditor(null);
    toast(isBuiltIn(id) ? 'Recipe removed' : 'Recipe deleted');
  };

  const ctx: Ctx = {
    state,
    dispatch,
    syncStatus,
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
    openAdd: () => setAdding(''),
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
        onNewRecipe={(day, name) => {
          // Planned straight away with no ingredients; they can be added later (or never).
          const recipe = recipeFromDraft({ ...draftFromText(name), name, ingredients: [] }, parseAmount);
          dispatch({ t: 'recipe', recipe });
          onPick(day, { kind: 'recipe', recipeId: recipe.id });
          toast(`${recipe.name} added`, {
            label: 'Add ingredients',
            run: () => {
              setPickerDay(null);
              setEditor({ draft: draftFromRecipe(recipe), heading: 'Add ingredients', stay: true });
            },
          });
        }}
        onClose={() => setPickerDay(null)}
      />
      <RecipeDetail
        recipeId={recipeId}
        onClose={() => setRecipeId(null)}
        onEdit={(r) => {
          setRecipeId(null);
          setEditor({ draft: draftFromRecipe(r), heading: 'Edit recipe' });
        }}
      />
      {adding !== null && (
        <AddRecipe
          initialUrl={adding || undefined}
          onClose={closeAdd}
          onDraft={(draft) => {
            closeAdd();
            setEditor({ draft, heading: 'Check the recipe' });
          }}
        />
      )}
      {editor && (
        <RecipeEditor
          key={editor.draft.id ?? 'new'}
          draft={editor.draft}
          heading={editor.heading}
          onClose={() => setEditor(null)}
          onSave={saveRecipe}
          onDelete={editor.draft.id ? () => deleteRecipe(editor.draft.id!) : undefined}
        />
      )}
      {toastMsg && (
        <div className={`toast ${toastMsg.action ? 'has-action' : ''}`} role="status">
          <span>{toastMsg.text}</span>
          {toastMsg.action && (
            <button
              className="toast-action"
              onClick={() => {
                toastMsg.action!.run();
                setToastMsg(null);
              }}
            >
              {toastMsg.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

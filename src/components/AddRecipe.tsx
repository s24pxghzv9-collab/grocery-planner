import { ClipboardPaste, Images, Link2, Loader2, PencilLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { readImages } from '../lib/ocr';
import { draftFromPage, draftFromText, type EditorDraft } from '../lib/recipeDraft';
import { Sheet } from './Sheet';

interface Props {
  /** A link to import straight away (from the iPhone share shortcut). */
  initialUrl?: string;
  onDraft: (draft: EditorDraft) => void;
  onClose: () => void;
}

type Busy = { label: string; progress?: number } | null;

const REASONS: Record<string, string> = {
  blocked: "Instagram didn't share this post. Take screenshots of the caption (and the ingredients if they're in the video) and add those instead.",
  'no-recipe': "Couldn't find a recipe on that page. Try screenshots, or paste the recipe text.",
  'fetch-failed': "Couldn't open that link. Check it, or try screenshots instead.",
  'bad-url': "That doesn't look like a web link.",
};

export function AddRecipe({ initialUrl, onDraft, onClose }: Props) {
  const [mode, setMode] = useState<'choose' | 'link' | 'text'>(initialUrl ? 'link' : 'choose');
  const [url, setUrl] = useState(initialUrl ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const files = useRef<HTMLInputElement>(null);

  const importLink = async (link = url) => {
    setError(null);
    setBusy({ label: 'Reading the recipe…' });
    try {
      const res = await fetch(`/api/import?url=${encodeURIComponent(link.trim())}`);
      const body = (await res.json()) as { ok: boolean; reason?: string; page?: Parameters<typeof draftFromPage>[0] };
      if (!body.ok || !body.page) {
        setError(REASONS[body.reason ?? 'fetch-failed'] ?? REASONS['fetch-failed']);
        return;
      }
      onDraft(draftFromPage(body.page));
    } catch {
      setError("You're offline, or the link couldn't be read. Try again when you have signal.");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (initialUrl) void importLink(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fromScreenshots = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setBusy({ label: 'Reading your screenshots…', progress: 0 });
    try {
      const textRead = await readImages([...list], (p) => setBusy({ label: 'Reading your screenshots…', progress: p }));
      if (!textRead.trim()) {
        setError("Couldn't read any text in those images. Try clearer screenshots of the recipe text.");
        return;
      }
      onDraft(draftFromText(textRead));
    } catch {
      setError("Couldn't read those images. Try again, or paste the recipe text.");
    } finally {
      setBusy(null);
    }
  };

  const pasteFromClipboard = async (into: 'url' | 'text') => {
    try {
      const clip = await navigator.clipboard.readText();
      if (into === 'url') setUrl(clip.trim());
      else setText(clip);
    } catch {
      // Clipboard permission refused: the user can long-press and paste instead.
    }
  };

  return (
    <Sheet open onClose={onClose} kicker="Recipes" title="Add a recipe">
      {busy ? (
        <div className="busy">
          <Loader2 size={28} className="spin" />
          <p>{busy.label}</p>
          {busy.progress !== undefined && (
            <div className="bar">
              <div style={{ width: `${Math.round(busy.progress * 100)}%` }} />
            </div>
          )}
          {busy.progress !== undefined && <p className="muted small">The first time takes a little longer while the text reader loads.</p>}
        </div>
      ) : (
        <>
          {error && <p className="form-error">{error}</p>}

          {mode === 'choose' && (
            <ul className="add-options">
              <li>
                <button className="add-option" onClick={() => setMode('link')}>
                  <Link2 size={22} strokeWidth={1.6} />
                  <span>
                    <strong>Paste a link</strong>
                    <span className="muted small">Recipe websites, Instagram, TikTok</span>
                  </span>
                </button>
              </li>
              <li>
                <button className="add-option" onClick={() => files.current?.click()}>
                  <Images size={22} strokeWidth={1.6} />
                  <span>
                    <strong>From screenshots</strong>
                    <span className="muted small">Instagram captions, cookbook pages, notes</span>
                  </span>
                </button>
              </li>
              <li>
                <button className="add-option" onClick={() => setMode('text')}>
                  <PencilLine size={22} strokeWidth={1.6} />
                  <span>
                    <strong>Type or paste it</strong>
                    <span className="muted small">Family recipes, or text copied from anywhere</span>
                  </span>
                </button>
              </li>
            </ul>
          )}

          {mode === 'link' && (
            <form
              className="add-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) void importLink();
              }}
            >
              <label className="field">
                <span>Link to the recipe</span>
                <div className="inline-form">
                  <input className="input" type="url" inputMode="url" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                  <button type="button" className="btn btn-quiet" onClick={() => pasteFromClipboard('url')} aria-label="Paste">
                    <ClipboardPaste size={18} />
                  </button>
                </div>
              </label>
              <button className="btn btn-primary btn-block" type="submit" disabled={!url.trim()}>
                Import recipe
              </button>
              <button type="button" className="link" onClick={() => setMode('choose')}>
                Other ways to add
              </button>
            </form>
          )}

          {mode === 'text' && (
            <div className="add-form">
              <label className="field">
                <span>Paste the recipe, or leave it blank to type it in</span>
                <textarea
                  className="input textarea"
                  rows={10}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={'Nan\'s beef stew\n\nIngredients\n1kg chuck steak\n2 onions\n…\n\nMethod\nBrown the beef…'}
                />
              </label>
              <div className="sheet-footer-row">
                <button className="btn btn-quiet" onClick={() => pasteFromClipboard('text')}>
                  <ClipboardPaste size={18} /> Paste
                </button>
                <button className="btn btn-primary grow" onClick={() => onDraft(draftFromText(text))}>
                  Next
                </button>
              </div>
            </div>
          )}

          <input ref={files} type="file" accept="image/*" multiple hidden onChange={(e) => fromScreenshots(e.target.files)} />
        </>
      )}
    </Sheet>
  );
}

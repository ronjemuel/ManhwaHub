"use client";
import { useApp } from "@/components/app-context";
import { Field, Toggle } from "@/components/ui";
export function ReaderSettingsForm() {
  const { data, setReader } = useApp();
  const s = data.settings.reader;
  const change = (patch: Parameters<typeof setReader>[0]) =>
    setReader(patch).catch(() => {});
  return (
    <div className="settings-fields">
      <Field label="Reading mode">
        <select
          value={s.mode}
          onChange={(e) => change({ mode: e.target.value as typeof s.mode })}
        >
          <option value="vertical">Webtoon · vertical scroll</option>
          <option value="paged">Paged · left to right</option>
          <option value="rtl">Manga · right to left</option>
        </select>
      </Field>
      <Field label={`Maximum image width · ${s.width}px`}>
        <input
          type="range"
          min="320"
          max="1200"
          step="40"
          value={s.width}
          onChange={(e) => change({ width: Number(e.target.value) })}
        />
      </Field>
      <Field label={`Image spacing · ${s.gap}px`}>
        <input
          type="range"
          min="0"
          max="32"
          step="2"
          value={s.gap}
          onChange={(e) => change({ gap: Number(e.target.value) })}
        />
      </Field>
      <Field label="Reader background">
        <select
          value={s.background}
          onChange={(e) =>
            change({ background: e.target.value as typeof s.background })
          }
        >
          <option value="black">Black</option>
          <option value="dark">Charcoal</option>
          <option value="paper">Paper</option>
        </select>
      </Field>
      <Field label="Preload ahead">
        <select
          value={s.preload}
          onChange={(e) => change({ preload: Number(e.target.value) })}
        >
          {[0, 1, 2, 3].map((n) => (
            <option value={n} key={n}>
              {n === 0 ? "Off" : `${n} page${n > 1 ? "s" : ""}`}
            </option>
          ))}
        </select>
      </Field>
      <Toggle
        label="Automatically open next chapter"
        checked={s.autoNext}
        onChange={(autoNext) => change({ autoNext })}
      />
      <Toggle
        label="Save reading progress"
        description="Save chapter position and reading history on this device."
        checked={s.saveProgress}
        onChange={(saveProgress) => change({ saveProgress })}
      />
    </div>
  );
}

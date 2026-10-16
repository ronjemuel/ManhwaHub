"use client";
import Link from "next/link";
import { useState } from "react";
import { Trash2, Play } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Button, Cover, Empty, Modal } from "@/components/ui";
import { visibleSeries } from "@/types";
import { dateLabel, resumeHref } from "@/utils/links";
export function HistoryPage() {
  const { data, deleteHistory, notify } = useApp();
  const [confirm, setConfirm] = useState(false);
  const rows = data.history
    .filter((p) => visibleSeries(p.series, data.settings))
    .sort((a, b) => b.timestamp - a.timestamp);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EVERY CHAPTER OF YOUR JOURNEY</p>
          <h1>
            Reading history<span className="accent">.</span>
          </h1>
        </div>
        <Button
          disabled={!data.history.length}
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={17} />
          Clear history
        </Button>
      </div>
      {rows.length ? (
        <div className="history-list">
          {rows.map((p) => (
            <article className="history-row" key={p.id}>
              <Cover series={p.series} />
              <div>
                <h3>{p.series.title}</h3>
                <p>
                  Chapter {p.chapterNumber} · {Math.round(p.fraction * 100)}% ·{" "}
                  {p.sourceId}
                </p>
                <small>
                  {dateLabel(p.timestamp)} ·{" "}
                  {p.completed ? "Read" : "In progress"}
                </small>
              </div>
              <Link className="button" href={resumeHref(p)}>
                <Play size={15} />
                <span>Continue</span>
              </Link>
              <button
                className="icon-button"
                aria-label={`Delete history for ${p.series.title} chapter ${p.chapterNumber}`}
                onClick={() => deleteHistory(p.id).catch(() => {})}
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="A fresh page">
          The chapters you read will appear here. Your library and progress are
          kept separately.
        </Empty>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear reading history?"
      >
        <p>Your library and saved reading positions will stay intact.</p>
        <div className="modal-actions">
          <Button onClick={() => setConfirm(false)}>Cancel</Button>
          <Button
            className="danger"
            onClick={async () => {
              await deleteHistory();
              setConfirm(false);
              notify("History cleared.");
            }}
          >
            Clear history
          </Button>
        </div>
      </Modal>
    </>
  );
}

"use client";
import { useState } from "react";
import { Layers, RefreshCw, ExternalLink } from "lucide-react";
import { useApp } from "@/components/app-context";
import { registry } from "@/sources/registry";
import { Button, Toggle } from "@/components/ui";
export function SourcesPage() {
  const { data, setSettings, notify } = useApp();
  const [, redraw] = useState(0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR CONNECTION TO EVERY STORY</p>
          <h1>
            Sources<span className="accent">.</span>
          </h1>
          <p>Choose the catalogs available in your reading space.</p>
        </div>
      </div>
      <div className="source-list">
        {registry.list().map((source) => {
          const enabled = data.settings.enabledSources.includes(source.id),
            health = registry.status(source.id);
          return (
            <article className="source-card" key={source.id}>
              <div
                className={`source-icon ${source.id === "kitsu" ? "kitsu" : ""}`}
              >
                <Layers size={25} />
              </div>
              <div className="source-body">
                <Toggle
                  label={source.name}
                  description={source.description}
                  checked={enabled}
                  onChange={(value) => {
                    void setSettings({
                      ...data.settings,
                      enabledSources: value
                        ? [...data.settings.enabledSources, source.id]
                        : data.settings.enabledSources.filter(
                            (s) => s !== source.id,
                          ),
                    })
                      .then(() =>
                        notify(
                          `${source.name} ${value ? "enabled" : "disabled"}.`,
                        ),
                      )
                      .catch(() => {});
                  }}
                />
                <div className="capabilities">
                  {source.capabilities.map((c) => (
                    <span key={c}>{c.replaceAll("-", " ")}</span>
                  ))}
                </div>
                <div className="source-meta">
                  <span>
                    English {source.id === "kitsu" ? "metadata" : "chapters"}
                  </span>
                  <span className={`health health-${health.state}`}>
                    {health.state === "untested"
                      ? "Not checked this session"
                      : health.state === "checking"
                        ? "Checking…"
                        : health.state === "available"
                          ? "Last request succeeded"
                          : "Last request failed"}
                  </span>
                  {health.checkedAt && (
                    <small>
                      {new Date(health.checkedAt).toLocaleTimeString()}
                    </small>
                  )}
                </div>
                {health.state === "unavailable" && (
                  <p className="error-text">{health.message}</p>
                )}
                <div className="source-actions">
                  <Button
                    disabled={!enabled || health.state === "checking"}
                    onClick={async () => {
                      const pending = registry.check(source.id, data.settings);
                      redraw((n) => n + 1);
                      await pending;
                      redraw((n) => n + 1);
                    }}
                  >
                    <RefreshCw size={16} />
                    Check connection
                  </Button>
                  {source.website && (
                    <a
                      className="text-link"
                      href={source.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source website <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="info-card">
        <h3>More sources, without starting over.</h3>
        <p>
          Each source has its own adapter. V1 includes original demo chapters
          and Kitsu’s public metadata API. Provider availability can change;
          connection checks report actual requests. Kitsu does not provide
          chapter images.
        </p>
      </div>
    </>
  );
}

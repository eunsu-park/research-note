"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20];
const AUTO_SAVE_OPTIONS = [
  { label: "0.5s", value: 500 },
  { label: "1s", value: 1000 },
  { label: "2s", value: 2000 },
  { label: "3s", value: 3000 },
  { label: "5s", value: 5000 },
];
const SIDEBAR_TABS = [
  { label: "Files", value: "files" as const },
  { label: "Tags", value: "tags" as const },
  { label: "Search", value: "search" as const },
];

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8 py-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function OptionGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <Button
          key={String(opt.value)}
          variant={value === opt.value ? "default" : "outline"}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

function DataSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    window.open("/api/bulk", "_blank");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        body: formData,
      });
      const { data, error } = await res.json();

      if (error) {
        toast.error(error);
        return;
      }

      toast.success(
        `Imported ${data.imported} note${data.imported !== 1 ? "s" : ""}${data.skipped ? `, skipped ${data.skipped}` : ""}`
      );
    } catch {
      toast.error("Failed to import notes");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Data
      </h2>
      <div className="rounded-lg border bg-card">
        <div className="px-4">
          <SettingRow
            label="Export Notes"
            description="Download all notes as a ZIP file"
          >
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export ZIP
            </Button>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Import Notes"
            description="Import markdown (.md) files into your notes"
          >
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                multiple
                className="hidden"
                onChange={handleImport}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
            </div>
          </SettingRow>
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const {
    editorFontSize,
    showLineNumbers,
    lineWrapping,
    autoSaveDelay,
    defaultSidebarTab,
    updateSetting,
    resetSettings,
  } = useSettingsStore();

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold">Settings</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetSettings();
                toast.success("Settings reset to defaults");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          </div>

          {/* Editor Section */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Editor
            </h2>
            <div className="rounded-lg border bg-card">
              <div className="px-4">
                <SettingRow
                  label="Font Size"
                  description="Editor text size in pixels"
                >
                  <OptionGroup
                    options={FONT_SIZES.map((s) => ({
                      label: `${s}`,
                      value: s,
                    }))}
                    value={editorFontSize}
                    onChange={(v) => updateSetting("editorFontSize", v)}
                  />
                </SettingRow>

                <Separator />

                <SettingRow
                  label="Line Numbers"
                  description="Show line numbers in the gutter"
                >
                  <Switch
                    checked={showLineNumbers}
                    onCheckedChange={(v) =>
                      updateSetting("showLineNumbers", v)
                    }
                  />
                </SettingRow>

                <Separator />

                <SettingRow
                  label="Word Wrap"
                  description="Wrap long lines to fit the editor width"
                >
                  <Switch
                    checked={lineWrapping}
                    onCheckedChange={(v) =>
                      updateSetting("lineWrapping", v)
                    }
                  />
                </SettingRow>
              </div>
            </div>
          </section>

          {/* Auto-Save Section */}
          <section className="mt-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Auto-Save
            </h2>
            <div className="rounded-lg border bg-card">
              <div className="px-4">
                <SettingRow
                  label="Save Delay"
                  description="Time after last keystroke before auto-saving"
                >
                  <OptionGroup
                    options={AUTO_SAVE_OPTIONS}
                    value={autoSaveDelay}
                    onChange={(v) => updateSetting("autoSaveDelay", v)}
                  />
                </SettingRow>
              </div>
            </div>
          </section>

          {/* UI Section */}
          <section className="mt-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Interface
            </h2>
            <div className="rounded-lg border bg-card">
              <div className="px-4">
                <SettingRow
                  label="Default Sidebar Tab"
                  description="Which tab opens by default in the sidebar"
                >
                  <OptionGroup
                    options={SIDEBAR_TABS}
                    value={defaultSidebarTab}
                    onChange={(v) => updateSetting("defaultSidebarTab", v)}
                  />
                </SettingRow>
              </div>
            </div>
          </section>

          {/* Data Section */}
          <DataSection />

          {/* Preview */}
          <section className="mt-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Preview
            </h2>
            <div className="rounded-lg border bg-card px-4 py-4">
              <div className="font-mono text-muted-foreground" style={{ fontSize: `${editorFontSize}px` }}>
                The quick brown fox jumps over the lazy dog.
                <br />
                <span className="text-primary">## Sample heading</span>
                <br />
                <span className="text-green-500">**bold text**</span>{" "}
                and <span className="text-blue-500">*italic text*</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { useNoteStore } from "@/stores/noteStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileList } from "./FileList";
import { TagList } from "./TagList";
import { SearchPanel } from "./SearchPanel";
import { FolderOpen, Tag, Search } from "lucide-react";

interface SidebarProps {
  currentSlug?: string;
}

export function Sidebar({ currentSlug }: SidebarProps) {
  const { sidebarTab, setSidebarTab } = useNoteStore();

  return (
    <div className="h-full flex flex-col border-r bg-sidebar">
      <Tabs
        value={sidebarTab}
        onValueChange={(v) =>
          setSidebarTab(v as "files" | "tags" | "search")
        }
        className="flex flex-col h-full"
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2 h-10">
          <TabsTrigger value="files" className="gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            Files
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-1.5 text-xs">
            <Tag className="h-3.5 w-3.5" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="flex-1 m-0 overflow-hidden">
          <FileList currentSlug={currentSlug} />
        </TabsContent>

        <TabsContent value="tags" className="flex-1 m-0 overflow-hidden">
          <TagList />
        </TabsContent>

        <TabsContent value="search" className="flex-1 m-0 overflow-hidden">
          <SearchPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

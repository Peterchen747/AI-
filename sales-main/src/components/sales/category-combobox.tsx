"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = { id: number; name: string };

export function CategoryCombobox({
  categories,
  value,
  onSelect,
  onCreate,
  placeholder = "選擇或新增分類",
}: {
  categories: Category[];
  value: number | null;
  onSelect: (cat: Category) => void;
  onCreate: (name: string) => Promise<Category | null>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = categories.find((c) => c.id === value);
  const trimmed = query.trim();
  const exact = categories.find(
    (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  const showCreate = trimmed.length > 0 && !exact;

  async function handleCreate() {
    if (!trimmed || creating) return;
    setCreating(true);
    const created = await onCreate(trimmed);
    setCreating(false);
    if (created) {
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <ChevronsUpDownIcon className="ml-2 size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="搜尋分類或輸入新分類名稱..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>找不到符合的分類</CommandEmpty>
            {categories.length > 0 && (
              <CommandGroup heading="現有分類">
                {categories.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => {
                      onSelect(c);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`__create__${trimmed}`}
                    onSelect={handleCreate}
                  >
                    <PlusIcon className="size-4" />
                    <span>新增分類「{trimmed}」</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

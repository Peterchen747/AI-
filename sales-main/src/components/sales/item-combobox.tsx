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

type Item = {
  id: number;
  categoryId: number;
  name: string;
  typicalCost: number | null;
  typicalPrice: number | null;
};

export function ItemCombobox({
  items,
  value,
  disabled,
  onSelect,
  onCreate,
  placeholder = "選擇或新增商品",
}: {
  items: Item[];
  value: number | null;
  disabled?: boolean;
  onSelect: (item: Item) => void;
  onCreate: (name: string) => Promise<Item | null>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = items.find((i) => i.id === value);
  const trimmed = query.trim();
  const exact = items.find(
    (i) => i.name.trim().toLowerCase() === trimmed.toLowerCase()
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
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <ChevronsUpDownIcon className="ml-2 size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="搜尋商品或輸入新商品名稱..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>找不到符合的商品</CommandEmpty>
            {items.length > 0 && (
              <CommandGroup heading="現有商品">
                {items.map((it) => (
                  <CommandItem
                    key={it.id}
                    value={it.name}
                    onSelect={() => {
                      onSelect(it);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="flex-1">{it.name}</span>
                    {it.typicalPrice != null && (
                      <span className="text-xs text-muted-foreground ml-2">
                        NT$ {it.typicalPrice}
                      </span>
                    )}
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
                    <span>新增商品「{trimmed}」</span>
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

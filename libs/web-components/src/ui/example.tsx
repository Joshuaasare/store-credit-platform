"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from ".";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from ".";
import { Popover, PopoverContent, PopoverTrigger } from ".";
import { ScrollArea } from ".";

interface Post {
  id: number;
  title: string;
}

const PAGE_SIZE = 20;

export function InfiniteScrollComboBox() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [items, setItems] = React.useState<Post[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  const fetchPosts = React.useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/posts?_page=${pageNum}&_limit=${PAGE_SIZE}`,
      );
      const data: Post[] = await res.json();
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setItems((prev) => [...prev, ...data]);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // When popover opens, reset and load first page
  React.useEffect(() => {
    if (open) {
      setItems([]);
      setPage(1);
      setHasMore(true);
    }
  }, [open]);

  // Whenever page changes (and combobox open), fetch data
  React.useEffect(() => {
    if (open && hasMore) {
      fetchPosts(page);
    }
  }, [page, open, hasMore, fetchPosts]);

  // IntersectionObserver to detect scroll to bottom for infinite loading
  // React.useEffect(() => {
  //   if (!loadMoreRef.current || !hasMore) return;
  //   toast("Effect");
  //   const observer = new IntersectionObserver((entries) => {
  //     toast("In View");
  //     if (entries[0].isIntersecting && !isLoading && hasMore) {
  //       setPage((prev) => prev + 1);
  //     }
  //   });
  //   observer.observe(loadMoreRef.current);
  //   return () => {
  //     toast("Disconnecting");
  //     observer.disconnect();
  //   };
  // }, [hasMore, isLoading]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <h1>{String(hasMore)}</h1>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? (items.find((item) => String(item.id) === value)?.title ??
              "Select post...")
            : "Select post..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search post..." className="h-9" />
          <ScrollArea>
            <CommandList data-slot="command-list" className="max-h-[300px]">
              {items.length === 0 && !isLoading && (
                <CommandEmpty>No posts found.</CommandEmpty>
              )}
              <CommandGroup>
                {items.map((post) => (
                  <CommandItem
                    key={post.id}
                    value={String(post.id)}
                    onSelect={(currentValue) => {
                      setValue(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "ml-auto",
                        value === String(post.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {post.title}
                  </CommandItem>
                ))}
                {hasMore && (
                  <div
                    ref={loadMoreRef}
                    className="text-muted-foreground flex justify-center p-2 text-sm"
                  >
                    {isLoading ? "Loading..." : "Scroll to load more"}
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

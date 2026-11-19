"use client";

import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { getRequestsInFlight, subscribeRequestsInFlight } from "@/lib/api";
import { Listbox, type ListboxOption } from "@/components/ui/Listbox";

// The vertical padding and matching negative margin grow the hit area without moving the layout.
const controlClass = "-my-2 min-w-0 bg-transparent py-2 text-xs leading-[1.4] focus:outline-none";

const AutoSearchContext = createContext<{ requestSearch: () => void; showProgress: () => void } | null>(null);

/** Shows the bar's loading line until the list's next request comes back. */
export function useFilterProgress() {
  return useContext(AutoSearchContext)?.showProgress;
}

export function FilterBar({ children, onSearch }: { children: ReactNode; onSearch: () => void }) {
  // Below lg the fields fold away behind a toggle, so the list isn't pushed off the first screen.
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // A dropdown pick searches straight away. It waits a render so onSearch sees the draft that pick just set.
  const [searchRequests, setSearchRequests] = useState(0);
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });
  useEffect(() => {
    if (searchRequests > 0) onSearchRef.current();
  }, [searchRequests]);

  useEffect(() => {
    if (!isSearching) return;
    let sawRequest = getRequestsInFlight() > 0;
    const unsubscribe = subscribeRequestsInFlight(() => {
      if (getRequestsInFlight() > 0) sawRequest = true;
      else if (sawRequest) setIsSearching(false);
    });
    // A cached response never reaches the network, so stop waiting if no request starts.
    const noRequest = setTimeout(() => !sawRequest && setIsSearching(false), 800);
    const giveUp = setTimeout(() => setIsSearching(false), 20_000);
    return () => {
      unsubscribe();
      clearTimeout(noRequest);
      clearTimeout(giveUp);
    };
  }, [isSearching]);

  const context = useMemo(
    () => ({
      requestSearch: () => {
        setIsSearching(true);
        setSearchRequests((n) => n + 1);
      },
      showProgress: () => setIsSearching(true),
    }),
    [],
  );

  return (
    <AutoSearchContext.Provider value={context}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setIsOpen(false);
          setIsSearching(true);
          onSearch();
        }}
        aria-busy={isSearching}
        className="relative flex flex-wrap items-end gap-x-6 gap-y-4 bg-cream px-4 py-4 sm:px-8 lg:py-6"
      >
        {isSearching && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
            <span className="loading-line block h-full w-1/4 bg-primary" />
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="flex h-9 items-center gap-1.5 text-xs leading-[1.4] text-primary lg:hidden"
        >
          <Icon name="search" className="size-4" />
          Filters
          <Icon name="chevron-down" className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`${isOpen ? "flex" : "hidden"} order-last w-full flex-col gap-4 lg:contents`}>{children}</div>
        <button
          type="submit"
          className="ml-auto flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] bg-primary px-4 text-xs leading-[1.4] text-white transition-colors hover:bg-primary/90"
        >
          <Icon name="search" className="size-4" />
          Search
        </button>
      </form>
    </AutoSearchContext.Provider>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-[160px] flex-1 flex-col gap-[13px]">
      <span className="text-[11px] leading-[1.4] text-muted">{label}</span>
      <span className="flex items-center gap-2 text-muted">
        <Icon name="search" className="size-4" />
        {children}
      </span>
    </label>
  );
}

export function FilterInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input type="text" {...props} className={`${controlClass} flex-1 text-ink placeholder:text-placeholder`} />
  );
}

/** A native date picker. Empty, it shows its placeholder instead of the browser's dd/mm/yyyy mask. */
export function FilterDate({
  placeholder,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { placeholder: string }) {
  const [isFocused, setIsFocused] = useState(false);
  const showsDate = isFocused || Boolean(props.value);
  return (
    <input
      {...props}
      type={showsDate ? "date" : "text"}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`${controlClass} flex-1 text-ink placeholder:text-placeholder`}
    />
  );
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(textOf).join("");
  return isValidElement<{ children?: ReactNode }>(node) ? textOf(node.props.children) : String(node);
}

/** Reads the `<option>` children a native select would take. */
function toOptions(children: ReactNode): ListboxOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode }>(child)) return [];
    if (child.type === Fragment) return toOptions(child.props.children);
    const name = textOf(child.props.children);
    return [{ id: String(child.props.value ?? name), name }];
  });
}

/** Takes `<option>` children and an `onChange` like a native select, but opens the app's dropdown panel. */
export function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
  className = "flex-1",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const options = [...(placeholder !== undefined ? [{ id: "", name: placeholder }] : []), ...toOptions(children)];
  const selected = options.find((option) => option.id === value);
  const requestSearch = useContext(AutoSearchContext)?.requestSearch;
  return (
    <Listbox
      value={value}
      onChange={(next) => {
        onChange({ target: { value: next } } as ChangeEvent<HTMLSelectElement>);
        requestSearch?.();
      }}
      options={options}
      label={ariaLabel}
      className={`${controlClass} flex cursor-pointer items-center gap-2 text-left ${className} ${
        value ? "text-ink" : "text-placeholder"
      }`}
    >
      {(isOpen) => (
        <>
          <span className="min-w-0 flex-1 truncate">{selected?.name ?? value}</span>
          <Icon name="chevron-down" className={`size-3.5 text-ink transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </>
      )}
    </Listbox>
  );
}

/** The trailing "More Filters" control: a popover holding the filters that don't fit the bar. */
export function MoreFilters({ activeCount = 0, children }: { activeCount?: number; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex h-9 shrink-0 items-center">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="-my-2 flex items-center gap-1 py-2 text-xs leading-[1.4] text-primary"
      >
        More Filters
        {activeCount > 0 && ` (${activeCount})`}
        <Icon name="chevron-down" className="size-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 flex w-[280px] flex-col gap-5 rounded-[4px] border border-border bg-cream p-4 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

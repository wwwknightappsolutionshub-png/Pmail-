import { MailSearchBar } from "@hostnet-demo/components/demo/MailSearchBar";
import type { MailSearchContactSuggestion, MailSearchScope } from "@hostnet-demo/data/mailSearch";
import type { MailSearchState } from "../constants/mailViews";

type GmailMailSearchProps = {
  value: MailSearchState;
  onChange: (next: MailSearchState) => void;
  onSearch: () => void;
  onClear: () => void;
  contacts?: MailSearchContactSuggestion[];
};

export function GmailMailSearch({ value, onChange, onSearch, onClear, contacts = [] }: GmailMailSearchProps) {
  const scope: MailSearchScope = value.scope ?? "all";

  return (
    <MailSearchBar
      query={value.query}
      active={Boolean(value.query.trim())}
      scope={scope}
      contacts={contacts}
      onQueryChange={(query) => onChange({ ...value, query })}
      onScopeChange={(nextScope) => onChange({ ...value, scope: nextScope })}
      onSearch={(query, nextScope) => {
        onChange({ ...value, query, scope: nextScope });
        onSearch();
      }}
      onClear={() => {
        onClear();
      }}
    />
  );
}

export function isGmailStyleQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  return /(^|\s)(is:|has:|in:|from:|to:|subject:|label:|filename:|before:|after:|cc:|bcc:)/i.test(trimmed);
}

export type ExplorerGroup = {
  id: string;
  title: string;
  description: string;
  items: { id: number; label: string; keywords: string }[];
};

/** Filter the host catalogue without mutating it. A selected group scopes the search. */
export function filterExplorerGroups(groups: ExplorerGroup[], selectedId: string | null, query: string): ExplorerGroup[] {
  const term = query.trim().toLocaleLowerCase();
  const selected = groups.find(group => group.id === selectedId);
  return (selected ? [selected] : groups).map(group => ({
    ...group,
    items: group.items.filter(item => !term || `${group.title} ${group.description} ${item.label} ${item.keywords}`.toLocaleLowerCase().includes(term)),
  }));
}

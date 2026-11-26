export type TreePosition = { id: string; title: string; level: number; sortOrder: number; parentId: string | null };

export type OrgNode<M> = { position: TreePosition; members: M[]; children: OrgNode<M>[]; depth: number };

export function effectiveParents(positions: TreePosition[]) {
  const byId = new Map(positions.map((p) => [p.id, p]));
  const sorted = [...positions].sort((a, b) => a.level - b.level || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  const parentOf = new Map<string, string | null>();
  for (const p of sorted) {
    if (p.parentId && byId.has(p.parentId) && p.parentId !== p.id) {
      parentOf.set(p.id, p.parentId);
      continue;
    }
    const above = sorted.filter((q) => q.level < p.level);
    const nearest = above.length ? Math.max(...above.map((q) => q.level)) : null;
    parentOf.set(p.id, nearest === null ? null : above.find((q) => q.level === nearest)!.id);
  }
  for (const [id] of parentOf) {
    const seen = new Set<string>([id]);
    let cur = parentOf.get(id);
    while (cur) {
      if (seen.has(cur)) {
        parentOf.set(id, null);
        break;
      }
      seen.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
  }
  return parentOf;
}

export function buildOrgTree<M extends { positionId: string }>(positions: TreePosition[], members: M[]): OrgNode<M>[] {
  const parentOf = effectiveParents(positions);
  const order = (a: TreePosition, b: TreePosition) => a.sortOrder - b.sortOrder || a.level - b.level || a.title.localeCompare(b.title);
  const childrenOf = (id: string | null) => positions.filter((p) => (parentOf.get(p.id) ?? null) === id).sort(order);

  const make = (p: TreePosition, depth: number): OrgNode<M> | null => {
    const kids = childrenOf(p.id)
      .map((c) => make(c, depth + 1))
      .filter((n): n is OrgNode<M> => n !== null);
    const mine = members.filter((m) => m.positionId === p.id);
    if (!mine.length && !kids.length) return null;
    return { position: p, members: mine, children: kids, depth };
  };

  return childrenOf(null)
    .map((p) => make(p, 0))
    .filter((n): n is OrgNode<M> => n !== null);
}

export function descendantsOf(positions: TreePosition[], id: string) {
  const parentOf = effectiveParents(positions);
  const out = new Set<string>();
  const walk = (pid: string) => {
    for (const p of positions) if (parentOf.get(p.id) === pid && !out.has(p.id)) {
      out.add(p.id);
      walk(p.id);
    }
  };
  walk(id);
  return out;
}

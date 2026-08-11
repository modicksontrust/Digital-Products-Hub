/**
 * Module-level SPA navigation guard.
 *
 * Components that want to intercept route transitions (e.g. CreateEbook during
 * outline review) register a guard via `setNavigationGuard`. SidebarNav and
 * other navigation surfaces call `checkNavigationGuard()` before navigating,
 * awaiting the async guard and only proceeding if it returns `true`.
 *
 * Only one guard is active at a time. The most recently registered guard wins.
 * Guards must be unregistered (pass `null`) on component unmount.
 */

type GuardFn = () => Promise<boolean>;
let _guard: GuardFn | null = null;

export function setNavigationGuard(fn: GuardFn | null): void {
  _guard = fn;
}

/** Returns true if navigation should proceed, false if it was blocked. */
export async function checkNavigationGuard(): Promise<boolean> {
  if (!_guard) return true;
  return _guard();
}

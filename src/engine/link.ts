// Link assembly: joins the fragments, in their fixed link order, into the URL the finale opens.
export function assembleLink(fragments: readonly string[]): string {
  return `https://${fragments.join('')}`;
}

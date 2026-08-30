/**
 * Stands in for next/link in the single-file build, which has no router.
 * Aliased at bundle time by scripts/build-standalone.mjs.
 */
export default function Link({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) {
  return <a href={href} {...rest}>{children}</a>
}

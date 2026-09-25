import { createElement } from 'react'
import { ecosystemBarProducts } from '@/lib/ecosystem'
import { SHELL_PRODUCT_ID, SHELL_PRODUCT_REPO } from '@/lib/shell'

const repositoryUrl = `https://github.com/${SHELL_PRODUCT_REPO}`

/**
 * Shared AgentsKit footer. The static fallback keeps ecosystem, repository and license links
 * in server HTML (SEO / no-JS); shell v1 replaces it on upgrade.
 */
export function SiteFooter() {
  return createElement(
    'agentskit-footer',
    { current: SHELL_PRODUCT_ID, repo: SHELL_PRODUCT_REPO },
    <footer className="ak-footer-fallback">
      <nav aria-label="AgentsKit ecosystem">
        <ul>
          {ecosystemBarProducts.map(product => (
            <li key={product.id}>
              {product.id === SHELL_PRODUCT_ID
                ? <a href="/" aria-current="page">{product.label}</a>
                : <a href={product.href}>{product.label}</a>}
            </li>
          ))}
        </ul>
      </nav>
      <p>
        <a href={repositoryUrl}>GitHub repository</a>
        {' · '}
        <a href={`${repositoryUrl}/blob/main/LICENSE`}>MIT License</a>
      </p>
    </footer>,
  )
}

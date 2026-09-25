import Script from 'next/script'

/** Impact (TCGPlayer affiliate): verificación de sitio + tracking de impresión/enlaces. */
const IMPACT_UTT_SRC =
  'https://utt.impactcdn.com/P-A7847236-2948-4d70-8c92-0ca24638af951.js'

export default function ImpactAffiliateScript() {
  return (
    <Script
      id="impact-affiliate-utt"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('${IMPACT_UTT_SRC}','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');`
      }}
    />
  )
}

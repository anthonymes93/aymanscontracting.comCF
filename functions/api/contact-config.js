export function onRequestGet({env}){
  return new Response(JSON.stringify({siteKey:env.TURNSTILE_SITE_KEY||null}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}

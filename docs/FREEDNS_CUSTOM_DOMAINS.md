# FreeDNS Custom Domains for Netlify and Vercel

Last verified against provider documentation: **20 August 2026**

This guide explains how to connect a hostname managed through
[FreeDNS / afraid.org](https://freedns.afraid.org/) to a website hosted on Netlify or
Vercel. It covers both domains you own and free/shared FreeDNS subdomains such as
`go-gdg.oc.com.ar`.

Provider dashboards can generate domain-specific DNS targets and ownership challenges. Those
displayed values always override examples in this document.

---

## Contents

1. [Understand the three systems](#1-understand-the-three-systems)
2. [Before changing DNS](#2-before-changing-dns)
3. [How to enter records in FreeDNS](#3-how-to-enter-records-in-freedns)
4. [Connect FreeDNS to Netlify](#4-connect-freedns-to-netlify)
5. [Connect FreeDNS to Vercel](#5-connect-freedns-to-vercel)
6. [Shared FreeDNS domain limitations](#6-shared-freedns-domain-limitations)
7. [Verify DNS and HTTPS](#7-verify-dns-and-https)
8. [Troubleshooting](#8-troubleshooting)
9. [Moving or removing a domain safely](#9-moving-or-removing-a-domain-safely)
10. [Quick checklists](#10-quick-checklists)
11. [Official references](#11-official-references)

---

## 1. Understand the three systems

Three separate systems are involved:

| System | Responsibility |
|---|---|
| FreeDNS | Publishes DNS records for the custom hostname. |
| Netlify or Vercel | Serves the deployed website and associates the hostname with the correct project. |
| Browser/visitor | Resolves the hostname through DNS, negotiates HTTPS, and requests the website. |

Adding a record in FreeDNS does not automatically add the domain to Netlify or Vercel.
Adding the domain to Netlify or Vercel does not automatically edit FreeDNS. Both sides must be
configured.

### DNS mapping is not URL forwarding

FreeDNS offers both DNS records and `URL`/web-forward records. They are not equivalent.

- An **A record** maps a hostname to an IPv4 address.
- A **CNAME record** maps a hostname to another hostname.
- A **TXT record** publishes text, commonly for ownership verification.
- A **URL record** sends an HTTP redirect to another URL.

For a proper custom domain, use A/CNAME/TXT records as requested by the hosting provider. Do
not use a FreeDNS `URL` record. URL forwarding can send visitors to `project.netlify.app` or
`project.vercel.app`, changing the address bar instead of serving the site at the custom
hostname.

### Apex domain versus subdomain

- Apex/root domain: `example.com`
- Subdomain: `www.example.com`, `play.example.com`, or `go-gdg.oc.com.ar`

The record required by a hosting provider depends on which kind is being connected. CNAME is
normally used for subdomains. Apex domains normally use A, ALIAS, ANAME, or flattened-CNAME
records because standard DNS does not permit an ordinary CNAME at the zone apex.

---

## 2. Before changing DNS

Complete these checks first.

### 2.1 Confirm the website is deployed

Open the provider URL before adding a custom domain:

- Netlify example: `https://my-game.netlify.app`
- Vercel example: `https://my-game.vercel.app`

Fix deployment or application errors first. A custom domain cannot repair a failed build.

### 2.2 Decide the exact hostname

Choose one fully qualified domain name, for example:

```text
play.example.com
```

Record these values:

```text
Custom hostname: play.example.com
FreeDNS base domain: example.com
FreeDNS subdomain field: play
Hosting project URL: my-game.netlify.app or my-game.vercel.app
```

For the GDGoC Go deployment, the equivalent values are:

```text
Custom hostname: go-gdg.oc.com.ar
FreeDNS base domain: oc.com.ar
FreeDNS subdomain field: go-gdg
Netlify site: gdgoc-go.netlify.app
```

### 2.3 Check whether the FreeDNS domain is owned or shared

There are two materially different setups:

1. **Your own domain using FreeDNS nameservers** — you control the domain and its DNS zone.
2. **A hostname under someone else's shared FreeDNS domain** — you control only records that
   FreeDNS allows for your assigned hostname or account.

Shared domains can restrict CNAME records, wildcard records, nameserver delegation, ownership
verification records, and search-engine visibility. FreeDNS itself warns that a shared domain
owned by another member may disappear or change. Use a domain you own for a long-lived
production service.

### 2.4 Take a record inventory

In FreeDNS, open **Subdomains** and note every existing record for the intended hostname.

Do not create conflicting records:

- A CNAME cannot coexist with A, AAAA, TXT, or other record data at the same hostname.
- An old `URL` forwarding record should be removed before adding the real DNS mapping.
- Ownership TXT records usually use a different hostname and can coexist safely.
- Do not delete MX/TXT records belonging to email or another service unless the exact record
  is known to be obsolete.

### 2.5 Add the domain to the hosting provider first

Netlify and Vercel may generate a unique CNAME target or TXT ownership challenge. Add the
custom hostname in the hosting dashboard before guessing DNS values.

---

## 3. How to enter records in FreeDNS

1. Sign in at [freedns.afraid.org](https://freedns.afraid.org/).
2. Select **Subdomains** in the left navigation.
3. Select **Add**.
4. Choose the record **Type** requested by Netlify or Vercel.
5. Enter the left-hand hostname portion in **Subdomain**.
6. Select the correct base domain from the **Domain** dropdown.
7. Enter the provider's target or token in **Destination**.
8. Save the record.

### FreeDNS field examples

#### CNAME mapping

To map `play.example.com` to a displayed target such as
`abc123.provider-dns.example`:

| FreeDNS field | Value |
|---|---|
| Type | `CNAME` |
| Subdomain | `play` |
| Domain | `example.com` |
| Destination | `abc123.provider-dns.example` |

Do not put `https://`, a path, query string, or trailing slash in a CNAME destination.

#### A-record mapping

| FreeDNS field | Value |
|---|---|
| Type | `A` |
| Subdomain | `play` |
| Domain | `example.com` |
| Destination | The exact IPv4 address displayed by the provider |

An A record accepts only an IPv4 address. Do not enter a provider hostname or URL.

#### TXT verification

Suppose the provider asks for:

```text
Host: _provider.play.example.com
Value: provider-domain-verify=example-token
```

Enter:

| FreeDNS field | Value |
|---|---|
| Type | `TXT` |
| Subdomain | `_provider.play` |
| Domain | `example.com` |
| Destination | `"provider-domain-verify=example-token"` |

FreeDNS requires the TXT destination to be wrapped in double quotation marks. The quotation
marks delimit the DNS text value; they do not change the verification token.

### Avoid duplicated domain names

If FreeDNS already has a **Domain** dropdown containing `example.com`, normally enter only
`play`, not `play.example.com`, in the **Subdomain** field. Otherwise the resulting record may
become `play.example.com.example.com`.

Always check the complete hostname shown by FreeDNS after saving.

---

## 4. Connect FreeDNS to Netlify

Netlify's current external-DNS instructions prefer CNAME for a subdomain. For an apex domain,
Netlify prefers ALIAS/ANAME/flattened CNAME and documents an A-record fallback. Always open the
site's **Pending DNS verification** details to obtain the current, site-specific instructions.

### 4.1 Add the hostname to the Netlify project

1. Sign in to Netlify.
2. Open the correct project.
3. Open **Domain management**.
4. Under **Production domains**, choose **Add a domain** or **Add domain alias**.
5. Enter the complete custom hostname, such as:

   ```text
   play.example.com
   ```

6. Confirm that the selected project is the intended site.

### 4.2 Complete ownership verification when Netlify asks for TXT

Netlify may say the parent domain is already registered or not owned by the current Netlify
team. The dialog then displays a **Host** and **Value** for a TXT record.

Do not invent `_netlify`, `netlify-challenge`, or `subdomain-owner-verification`. Netlify uses
different challenge labels in different situations. Copy the exact Host and Value shown.

Example only:

```text
Host: subdomain-owner-verification
Value: a-site-specific-random-value
```

If Netlify says the TXT record belongs at the root level of `example.com`, enter this in
FreeDNS:

| FreeDNS field | Value |
|---|---|
| Type | `TXT` |
| Subdomain | `subdomain-owner-verification` |
| Domain | `example.com` |
| Destination | `"a-site-specific-random-value"` |

For a host such as `netlify-challenge.example.com`, the FreeDNS subdomain field is
`netlify-challenge`. For `netlify-challenge.play.example.com`, it is
`netlify-challenge.play`.

Then:

1. Save the TXT record in FreeDNS.
2. Wait for the record to appear publicly.
3. Return to Netlify.
4. Select **Verify record** or continue the **Add domain** flow.
5. Keep the TXT record until Netlify confirms ownership and no longer requires it.

### 4.3 Add the Netlify traffic record

#### Preferred path for a subdomain: CNAME

For `play.example.com`, Netlify normally instructs:

| FreeDNS field | Value |
|---|---|
| Type | `CNAME` |
| Subdomain | `play` |
| Domain | `example.com` |
| Destination | The site's Netlify hostname, such as `my-game.netlify.app` |

Use the Netlify hostname without `https://` and without `/`.

#### Apex domain

If connecting `example.com` itself:

1. Use ALIAS, ANAME, or flattened CNAME to `apex-loadbalancer.netlify.com` if the DNS
   provider supports one of those types.
2. Otherwise use the A-record value displayed in Netlify's verification panel.

Netlify's standard fallback A address is currently `75.2.60.5`, but the Netlify dashboard is
the source of truth, especially for High-Performance Edge sites.

#### If FreeDNS rejects CNAME on a shared/dynamic domain

FreeDNS may show:

```text
CNAME records on dynamic dns domains are currently restricted,
contact an admin for assistance to have it enabled
```

Use this order of preference:

1. Ask the FreeDNS administrator/domain owner to enable the CNAME.
2. Use a domain you own where CNAME is permitted.
3. For Netlify only, if the project's **Pending DNS verification** panel provides or accepts
   a load-balancer A address for this hostname, create an A record using that exact address.

The A-record workaround can function for a FreeDNS subdomain, but CNAME is Netlify's official
subdomain recommendation and is more resilient to infrastructure changes. Do not copy a
historic Netlify IP without checking the current dashboard.

### 4.4 Remove URL forwarding

If FreeDNS currently shows something like:

```text
go-gdg.oc.com.ar  URL  https://gdgoc-go.netlify.app/
```

that is a redirect, not a DNS connection.

1. Delete only the incorrect `URL` record for that hostname.
2. Add the correct CNAME or provider-approved A record.
3. Keep any separate ownership TXT record.

### 4.5 Wait for Netlify DNS and HTTPS status

1. Open **Domain management > Production domains**.
2. Select **Pending DNS verification** to re-check the required records.
3. Wait for Netlify to mark the domain as verified.
4. Wait for Netlify to provision the HTTPS certificate.
5. Open the custom `https://` URL directly.
6. Confirm that the browser keeps the custom hostname in the address bar.

DNS propagation can take several hours and Netlify documents that it may take up to a day.
Do not repeatedly replace correct records during this period.

### 4.6 Set the primary domain

If the project has multiple custom domains:

1. Open the domain's **Options** menu.
2. Choose the desired primary-domain option.
3. Test aliases and `www` behavior.

Netlify automatically adds both apex and `www` in some flows. Both names need valid DNS if
both are attached to the project.

---

## 5. Connect FreeDNS to Vercel

Vercel normally recommends an A record for an apex domain and a project-specific CNAME for a
subdomain. Vercel also supports connecting a hostname with an A record when a CNAME cannot be
used. Values shown under the project's **Settings > Domains** page always override
general-purpose values.

For this repository, configure the Vercel project as follows before adding a domain:

| Vercel setting | Value |
|---|---|
| Root Directory | `web-hosting` |
| Framework Preset | `Vite` |
| Build Command | `npm run build:spa` |
| Output Directory | `dist` |

The repository's `web-hosting/vercel.json` applies the build/output settings and the SPA rewrite
needed for direct routes such as `/controls` and `/leaderboard`. The Vercel dashboard must
still use `web-hosting` as the project Root Directory. Use `npm run build:spa`, not
`npm run build`: the latter tries to copy a Unity build from outside the Vercel project root.

### 5.1 Add the hostname to the Vercel project

1. Sign in to Vercel.
2. Open the intended project.
3. Open **Settings > Domains**.
4. Select **Add Domain**.
5. Enter the complete hostname, such as:

   ```text
   play.example.com
   ```

6. Add it to the project.
7. Read the exact DNS record shown by Vercel.

### 5.2 Configure a subdomain with CNAME

For a subdomain, Vercel normally displays a project-specific target similar to:

```text
d1d4fc829fe7bc7c.vercel-dns-017.com
```

Use the value shown for the actual project:

| FreeDNS field | Value |
|---|---|
| Type | `CNAME` |
| Subdomain | `play` |
| Domain | `example.com` |
| Destination | The project-specific `vercel-dns` hostname shown by Vercel |

Do not point the CNAME at a random deployment URL unless the Vercel dashboard explicitly
instructs that value. Do not include `https://` or `/`.

### 5.3 Configure an apex domain or CNAME-restricted hostname with A

For an apex domain, Vercel normally asks for an A record. An A record may also be used for a
subdomain when the DNS provider does not permit the CNAME Vercel normally recommends.

Use the A-record address in this order:

1. Add the exact hostname to the Vercel project.
2. Open **Settings > Domains** and use the project-specific A-record address if Vercel displays
   one. Vercel selects addresses from an optimized Anycast pool, so this value has priority.
3. If no project-specific A address is displayed and an A record is required because CNAME is
   unavailable, Vercel's documented general-purpose Anycast address is:

   ```text
   76.76.21.21
   ```

Do not use a historic or third-party IP when Vercel displays a different address for the
project.

If `example.com` is your own domain hosted at FreeDNS, the root record may appear with a blank
subdomain field or `@`, depending on the interface. Confirm that the resulting record is
exactly `example.com` before saving.

For the GDGoC Go hostname, where FreeDNS blocks CNAME records on the shared dynamic-DNS domain,
the A-record fallback is:

| FreeDNS field | Value |
|---|---|
| Type | `A` |
| Subdomain | `go-gdg` |
| Domain | `oc.com.ar` |
| Destination | The Vercel project-specific A address, or `76.76.21.21` when Vercel provides no different address |

Add `go-gdg.oc.com.ar` to **Vercel > Project > Settings > Domains** before publishing this
record. If the hostname currently points to Netlify, replace that traffic record; do not leave
both the Netlify and Vercel A addresses on the same hostname. To keep both providers available,
use separate hostnames, such as keeping `go-gdg.oc.com.ar` on Netlify and assigning a different
FreeDNS hostname to Vercel.

### 5.4 Complete Vercel ownership verification

If the hostname is assigned to another Vercel team/account, Vercel may require a TXT record
similar to:

```text
Host: _vercel.play.example.com
Value: vc-domain-verify=play.example.com,<unique-token>
```

Copy the exact values from Vercel. In FreeDNS, that example becomes:

| FreeDNS field | Value |
|---|---|
| Type | `TXT` |
| Subdomain | `_vercel.play` |
| Domain | `example.com` |
| Destination | `"vc-domain-verify=play.example.com,<unique-token>"` |

Then:

1. Save the TXT record.
2. Wait for it to resolve publicly.
3. Return to Vercel.
4. Select **Verify** or **Verify & Claim**.
5. Keep the record until Vercel confirms that removal is safe.

### 5.5 If FreeDNS rejects the Vercel CNAME

Use one of these paths:

1. Prefer the project-specific A address shown under **Vercel > Project > Settings > Domains**.
2. If Vercel provides no different A address, use the general-purpose Anycast address
   `76.76.21.21` and keep the complete hostname assigned to the Vercel project.
3. Ask the FreeDNS administrator/domain owner to enable the project-specific CNAME.
4. Use a FreeDNS domain or a domain you own where CNAME is permitted.
5. Move the hostname to DNS infrastructure where the required record can be created.

After creating the A record, wait for Vercel to report **Valid Configuration**. If Vercel
continues to request a different record, follow the project-specific dashboard instruction;
the shared general-purpose IP is not a substitute for a different address explicitly assigned
to the project.

Changing nameservers to Vercel is generally possible only when you own the base domain.
Users of a shared FreeDNS domain cannot normally change its nameservers. Vercel wildcard
domains require the nameserver method, so they are usually incompatible with shared FreeDNS
hostnames.

### 5.6 Wait for verification and HTTPS

1. Keep **Settings > Domains** open.
2. Wait for the domain status to become valid/configured.
3. Vercel will automatically request the HTTPS certificate after DNS verification.
4. Open the custom `https://` URL.
5. Confirm the custom hostname remains in the address bar.
6. Test both the home page and a direct nested route.

Vercel documents that certificates are normally provisioned within minutes after DNS is
verified, while DNS propagation may take longer.

### 5.7 Optional CLI verification

The Vercel CLI can inspect the provider side:

```bash
vercel domains inspect play.example.com
vercel certs ls
```

When FreeDNS remains the authoritative DNS provider, add records in FreeDNS—not with
`vercel dns add`. That command manages records only when Vercel DNS controls the zone.

---

## 6. Shared FreeDNS domain limitations

Free/shared domains are convenient for demos but have important constraints.

### You do not own the base domain

If using `go-gdg.oc.com.ar`, control over `go-gdg` does not mean ownership of `oc.com.ar`.
The base-domain owner or FreeDNS policy may restrict:

- CNAME records;
- wildcard hostnames;
- nameserver changes/delegation;
- root-level TXT ownership challenges;
- search-engine visibility;
- how long the shared domain remains available.

### Provider ownership checks may fail

Netlify or Vercel may require a TXT record at a level your FreeDNS account cannot modify. If
the exact requested hostname cannot be created, there is no DNS trick that proves ownership.
Contact the FreeDNS administrator/domain owner or use a domain you control.

### Search visibility may be restricted

FreeDNS documents special restrictions for shared-domain subdomains and Google visibility.
For a public project that depends on search indexing, use a domain you own or follow the
current FreeDNS administrator process.

### Long-term recommendation

Use shared FreeDNS hostnames for prototypes, event demos, and temporary deployments. For a
long-lived production site, register a domain and keep control of its registrar, nameservers,
and renewal.

---

## 7. Verify DNS and HTTPS

### macOS/Linux with `dig`

Check CNAME:

```bash
dig CNAME play.example.com +short
```

Check A:

```bash
dig A play.example.com +short
```

Check a TXT challenge:

```bash
dig TXT _provider.play.example.com +short
```

Query FreeDNS directly to bypass a recursive resolver's old cache:

```bash
dig @ns1.afraid.org A play.example.com +short
dig @ns1.afraid.org CNAME play.example.com +short
dig @ns1.afraid.org TXT _provider.play.example.com +short
```

Check HTTPS headers:

```bash
curl -I https://play.example.com
```

### Windows with `nslookup`

```powershell
nslookup -type=A play.example.com
nslookup -type=CNAME play.example.com
nslookup -type=TXT _provider.play.example.com
```

### Expected results

- A CNAME query should return the exact provider hostname.
- An A query should return the configured IP or the resolved IP behind the CNAME.
- A TXT query should return the provider's exact token, commonly displayed inside quotes.
- HTTPS should eventually return the hosted application's response without a certificate
  warning.

FreeDNS normally uses a one-hour TTL, so a resolver that queried the old record may continue
showing it until that cache expires.

---

## 8. Troubleshooting

### The custom hostname redirects to `netlify.app` or `vercel.app`

Cause: a FreeDNS `URL` record is forwarding the browser.

Fix:

1. Remove the `URL` record for the custom hostname.
2. Add the required DNS CNAME/A record.
3. Keep ownership TXT records.
4. Wait for cached redirects and DNS results to expire.

### FreeDNS says TXT records must be wrapped in quotes

Wrap the complete destination in double quotes:

```text
"exact-provider-token"
```

Do not add spaces, smart quotes, or extra punctuation.

### The verification hostname is wrong

Check the complete name FreeDNS created. If the provider asks for:

```text
_vercel.play.example.com
```

and the FreeDNS Domain dropdown is `example.com`, enter `_vercel.play` as the Subdomain—not
the complete hostname.

### Netlify says “Pending DNS verification”

1. Reopen the pending-verification dialog and compare every record exactly.
2. Query the TXT and CNAME/A records publicly.
3. Confirm the TXT is at the level Netlify requested; some challenges belong at the base-domain
   root, not under the custom subdomain.
4. Confirm there is no old URL, A, AAAA, or CNAME conflict.
5. Wait for propagation before changing correct records.

### Vercel says “Invalid Configuration”

1. Open **Settings > Domains** and copy the current project-specific record again.
2. If using CNAME, confirm its destination contains no scheme or path.
3. If FreeDNS blocks CNAME, confirm the A record uses the project-specific Vercel address or
   the documented `76.76.21.21` fallback when no different address is displayed.
4. Remove conflicting A/AAAA/CNAME/URL records at the same hostname.
5. Confirm the complete hostname was added to the same Vercel project that was deployed.
6. Complete any `_vercel` TXT ownership challenge.

### FreeDNS blocks CNAME records

This is a FreeDNS/shared-domain policy restriction, not a Netlify or Vercel build problem.

- Contact the FreeDNS administrator/domain owner.
- Use a domain where CNAME is enabled.
- On Netlify, use the displayed load-balancer A fallback only when the project's instructions
  allow it.
- On Vercel, use the project-specific A record shown in Domain Settings. If no different
  project-specific address is shown, the documented general-purpose fallback is
  `76.76.21.21`.
- Never keep both the Netlify and Vercel A addresses on one hostname as an improvised
  load-balancing setup.

### DNS resolves but HTTPS is not ready

The provider may still be issuing the certificate.

1. Confirm DNS resolves to the provider.
2. Check the domain status in the hosting dashboard.
3. Wait for certificate provisioning.
4. Check for restrictive CAA records if the domain is owned and managed by you.
5. Do not use an unrelated reverse proxy or redirect to hide a certificate error.

Vercel notes that if other CAA records exist, Let's Encrypt must be permitted. Follow the
current provider message before editing CAA records.

### Home page works but direct routes return 404

DNS and HTTPS are already working. This is an application-routing problem.

- Netlify SPAs need a rewrite such as `/* /index.html 200` or the equivalent `netlify.toml`
  redirect.
- Vercel SPAs may need framework/output configuration or a `vercel.json` rewrite.

### The domain works on one network but not another

Different recursive DNS resolvers have different cached answers. Query the authoritative
FreeDNS nameserver directly, then wait for TTL expiry on the affected network.

### Browser still shows an old redirect

Browsers can cache permanent redirects independently of DNS. Test in a private window, inspect
the Network panel, and verify with `curl -I`. Do not assume a cached redirect means the new DNS
record is wrong.

---

## 9. Moving or removing a domain safely

### Move between projects on the same provider

1. Remove or reassign the hostname from the old project through the provider dashboard.
2. Add it to the new project.
3. Complete any new ownership challenge.
4. Update FreeDNS only if the displayed traffic target changes.
5. Verify HTTPS on the new project before deleting old verification records.

### Move from Netlify to Vercel or Vercel to Netlify

1. Deploy and test the new provider URL.
2. Add the custom domain to the new project.
3. Publish its ownership TXT record if requested.
4. Replace only the traffic CNAME/A record in FreeDNS.
5. Wait for the custom hostname to serve the new provider with valid HTTPS.
6. Remove the domain from the old provider after the cutover succeeds.
7. Remove obsolete verification records only after the relevant provider confirms they are no
   longer needed.

### Remove the custom domain

1. Remove it from the hosting project.
2. Remove its A/CNAME/URL record from FreeDNS.
3. Remove provider-specific TXT records that are confirmed obsolete.
4. Leave unrelated email and service records untouched.

---

## 10. Quick checklists

### Netlify + FreeDNS

- [ ] Netlify deployment URL works.
- [ ] Full custom hostname chosen.
- [ ] Custom hostname added under Netlify Production domains.
- [ ] Exact Netlify ownership TXT record added to FreeDNS when requested.
- [ ] TXT Destination wrapped in straight double quotes.
- [ ] Preferred CNAME points to the exact Netlify hostname, or the dashboard-approved A
      fallback is used.
- [ ] No FreeDNS URL-forward record exists for the custom hostname.
- [ ] No conflicting A/AAAA/CNAME records exist.
- [ ] DNS queries return the new records.
- [ ] Netlify reports DNS verified.
- [ ] HTTPS certificate is active.
- [ ] Browser keeps the custom hostname.
- [ ] Home page and direct routes work.

### Vercel + FreeDNS

- [ ] Vercel deployment URL works.
- [ ] Full custom hostname added under Project Settings > Domains.
- [ ] Exact project-specific CNAME or displayed A record copied.
- [ ] If CNAME is blocked and no different project A is displayed, A points to
      `76.76.21.21`.
- [ ] `_vercel` ownership TXT record added when requested.
- [ ] TXT Destination wrapped in straight double quotes.
- [ ] No URL-forward or conflicting traffic record exists.
- [ ] The same hostname does not contain both Netlify and Vercel A records.
- [ ] FreeDNS permits the record type Vercel requires.
- [ ] DNS queries return the new records.
- [ ] Vercel reports Valid Configuration.
- [ ] HTTPS certificate is active.
- [ ] Browser keeps the custom hostname.
- [ ] Home page and direct routes work.

---

## 11. Official references

- [Netlify: Configure external DNS for a custom domain](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)
- [Netlify: Domain management documentation](https://docs.netlify.com/manage/domains/)
- [Vercel: Setting up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel: Adding and configuring a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Vercel: Using a domain with A records](https://vercel.com/kb/guide/a-record-and-caa-with-vercel)
- [Vercel: Claiming domain ownership](https://vercel.com/docs/domains/working-with-domains/claim-domain-ownership)
- [Vercel: Troubleshooting domains](https://vercel.com/docs/domains/troubleshooting)
- [FreeDNS: DNS record type reference](https://freedns.afraid.org/faq/type.php)
- [FreeDNS: General FAQ and shared-domain limitations](https://freedns.afraid.org/faq/)

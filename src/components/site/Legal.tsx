import Link from "next/link";
import type { SiteSettings } from "@/lib/settings-schema";
import { renderMarkdown } from "@/lib/markdown";
import { CookiePreferencesButton } from "./ConsentManager";

/** Valeur ou mention « À compléter » bien visible tant que l'association n'a pas fourni l'information. */
function V({ children }: { children: string }) {
  return children ? <>{children}</> : <span className="to-complete">À compléter</span>;
}

export function LegalContent({ kind, extra, settings }: { kind: "mentions" | "confidentialite" | "cookies"; extra: string; settings: SiteSettings }) {
  const extraHtml = renderMarkdown(extra);
  return (
    <div className="legal">
      {kind === "mentions" && <Mentions s={settings} />}
      {kind === "confidentialite" && <Privacy s={settings} />}
      {kind === "cookies" && <Cookies s={settings} />}
      {extraHtml && <div className="prose" dangerouslySetInnerHTML={{ __html: extraHtml }} />}
    </div>
  );
}

function Mentions({ s }: { s: SiteSettings }) {
  const l = s.legal;
  return (
    <>
      <p>
        Conformément à l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), voici l'identité des différents intervenants
        dans le cadre de la réalisation et du suivi de ce site.
      </p>
      <h2>Éditeur du site</h2>
      <dl>
        <dt>Nom</dt>
        <dd>
          <V>{l.publisherName}</V>
        </dd>
        <dt>Statut juridique</dt>
        <dd>
          <V>{l.publisherStatus}</V>
        </dd>
        <dt>Adresse</dt>
        <dd style={{ whiteSpace: "pre-line" }}>
          <V>{l.publisherAddress}</V>
        </dd>
        <dt>Immatriculation (RNA / SIREN)</dt>
        <dd>
          <V>{l.registration}</V>
        </dd>
        <dt>Contact</dt>
        <dd>{s.contact.email ? <a href={`mailto:${s.contact.email}`}>{s.contact.email}</a> : <V>{""}</V>}</dd>
        <dt>Directeur ou directrice de la publication</dt>
        <dd>
          <V>{l.publicationDirector}</V>
        </dd>
      </dl>
      <h2>Hébergement</h2>
      <dl>
        <dt>Hébergeur</dt>
        <dd>
          <V>{l.hostName}</V>
        </dd>
        <dt>Adresse</dt>
        <dd style={{ whiteSpace: "pre-line" }}>
          <V>{l.hostAddress}</V>
        </dd>
        <dt>Contact</dt>
        <dd>
          <V>{l.hostContact}</V>
        </dd>
      </dl>
      <h2>Propriété intellectuelle</h2>
      <p>
        Les contenus de ce site (textes, logo, photographies, illustrations) sont la propriété de {l.publisherName || "l'éditeur"} ou de leurs auteurs respectifs, sauf mention
        contraire. Toute reproduction sans autorisation préalable est interdite.
      </p>
      <h2>Données personnelles et cookies</h2>
      <p>
        Le traitement de vos données est décrit dans la <Link href="/politique-de-confidentialite">politique de confidentialité</Link> et l'usage des cookies dans la page{" "}
        <Link href="/gestion-des-cookies">gestion des cookies</Link>.
      </p>
      {l.lastUpdated && <p className="field__hint">Dernière mise à jour : {l.lastUpdated}</p>}
    </>
  );
}

function Privacy({ s }: { s: SiteSettings }) {
  const p = s.privacy;
  const optional = s.cookies.services.filter((x) => x.enabled);
  return (
    <>
      <p>
        Cette page explique quelles données personnelles sont collectées sur ce site, pourquoi, combien de temps elles sont conservées et comment exercer vos droits, conformément
        au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.
      </p>
      <h2>Responsable du traitement</h2>
      <dl>
        <dt>Organisme</dt>
        <dd>
          <V>{p.controller}</V>
        </dd>
        <dt>Contact pour vos données</dt>
        <dd>
          <V>{p.dpoContact}</V>
        </dd>
      </dl>

      <h2>Formulaire de contact</h2>
      <div className="table-scroll">
        <table>
          <tbody>
            <tr>
              <th scope="row">Données collectées</th>
              <td>Nom, adresse e-mail, structure (facultatif), objet et contenu du message.</td>
            </tr>
            <tr>
              <th scope="row">Finalité</th>
              <td>Répondre à votre demande et assurer le suivi des échanges.</td>
            </tr>
            <tr>
              <th scope="row">Base légale</th>
              <td>Votre consentement, exprimé en cochant la case prévue avant l'envoi (article 6.1.a du RGPD). Vous pouvez le retirer à tout moment.</td>
            </tr>
            <tr>
              <th scope="row">Destinataires</th>
              <td>Les seules personnes habilitées de l'association, via l'espace d'administration sécurisé. Aucune donnée n'est vendue ni cédée.</td>
            </tr>
            <tr>
              <th scope="row">Durée de conservation</th>
              <td>{p.messageRetentionMonths} mois à compter de la réception, puis suppression.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Votre adresse IP n'est pas enregistrée avec votre message ; une empreinte non réversible est utilisée temporairement (24 h au plus) pour limiter les envois abusifs.</p>

      <h2>Navigation sur le site</h2>
      <p>
        Le site ne dépose aucun cookie publicitaire ni de mesure d'audience par défaut, et ne fait appel à aucun service tiers pour s'afficher (les polices de caractères sont
        hébergées sur notre serveur).{" "}
        {optional.length > 0
          ? `Les services facultatifs suivants ne sont activés qu'avec votre accord : ${optional.map((x) => x.name).join(", ")}.`
          : "Aucun service facultatif n'est actuellement activé."}{" "}
        Le détail figure sur la page <Link href="/gestion-des-cookies">gestion des cookies</Link>.
      </p>
      <p>
        Comme tout serveur web, l'hébergeur peut conserver des journaux techniques (adresse IP, date, page demandée) à des fins de sécurité. Hébergeur :{" "}
        <V>{s.legal.hostName}</V>.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données, ainsi que du droit de retirer votre
        consentement. Pour les exercer, écrivez à <V>{p.dpoContact}</V>. Nous répondons dans un délai d'un mois.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (<a href="https://www.cnil.fr/fr/plaintes">cnil.fr/plaintes</a>).
      </p>
      <h2>Sécurité</h2>
      <p>
        Les échanges avec le site sont chiffrés (HTTPS). L'accès aux demandes reçues est réservé aux comptes nominatifs de l'association, protégés par mot de passe et journalisés.
      </p>
      {p.lastUpdated && <p className="field__hint">Dernière mise à jour : {p.lastUpdated}</p>}
    </>
  );
}

function Cookies({ s }: { s: SiteSettings }) {
  const optional = s.cookies.services.filter((x) => x.enabled);
  return (
    <>
      <p>
        Un cookie est un petit fichier déposé sur votre appareil. La loi distingue les cookies strictement nécessaires au fonctionnement du site, exemptés de consentement, et les
        autres (mesure d'audience, contenus de plateformes tierces…), qui ne peuvent être déposés qu'avec votre accord.
      </p>
      <h2>Cookies strictement nécessaires</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Finalité</th>
              <th scope="col">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>__Host-ad_session</td>
              <td>Maintenir la connexion des membres de l'association à l'espace d'administration. Non déposé pour les visiteurs.</td>
              <td>8 heures maximum</td>
            </tr>
            <tr>
              <td>ad_consent</td>
              <td>Mémoriser vos choix concernant les services facultatifs (uniquement si un tel service est proposé).</td>
              <td>6 mois</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Services facultatifs</h2>
      {optional.length === 0 ? (
        <p>Aucun service facultatif n'est utilisé actuellement : aucun cookie de mesure d'audience, de réseau social ou de publicité n'est déposé.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Finalité</th>
                <th scope="col">Fournisseur</th>
                <th scope="col">Cookies et durée</th>
              </tr>
            </thead>
            <tbody>
              {optional.map((x) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td>{x.purpose}</td>
                  <td>{x.provider}</td>
                  <td>
                    {x.cookies} {x.duration && `(${x.duration})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2>Modifier vos choix</h2>
      <p>Vous pouvez consulter et modifier vos choix à tout moment, aussi facilement que vous les avez donnés.</p>
      <CookiePreferencesButton className="btn btn--ghost" label="Gérer mes préférences" />
    </>
  );
}

import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { getSettings } from "@/lib/settings";
import { pickerMedia } from "@/lib/admin-data";
import { PageHead } from "@/components/admin/PageHead";
import { ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ServicesEditor, ThemePicker } from "@/components/admin/SettingsExtras";
import { saveSettings } from "@/app/admin/actions/settings";

export const metadata = { title: "Paramètres" };

const TABS = [
  ["identity", "Identité"],
  ["theme", "Couleurs"],
  ["contact", "Coordonnées"],
  ["social", "Réseaux sociaux"],
  ["footer", "Pied de page"],
  ["seo", "Référencement"],
  ["contactForm", "Formulaire"],
  ["legal", "Informations légales"],
  ["privacy", "Données personnelles"],
  ["cookies", "Cookies"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([k]) => k === sp.onglet)?.[0] ?? "identity") as Tab;
  const s = await getSettings();
  const media = await pickerMedia();
  const adminOnly = ["legal", "privacy", "cookies"].includes(tab) && user.role !== "admin";

  return (
    <>
      <PageHead title="Paramètres du site" intro="Les modifications s'appliquent immédiatement au site public après enregistrement." />
      <nav className="tabs" aria-label="Sections des paramètres">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/parametres?onglet=${k}`} aria-current={tab === k ? "page" : undefined}>
            {l}
          </Link>
        ))}
      </nav>
      {adminOnly && <p className="notice notice--warn">Ces informations engagent l'association : seuls les administrateurs peuvent les modifier.</p>}
      <ActionForm action={saveSettings} key={tab}>
        <input type="hidden" name="section" value={tab} />
        <div className="panel" style={{ maxWidth: 900 }}>
          {tab === "identity" && (
            <>
              <h2>Identité</h2>
              <Field name="identity.siteName" label="Nom du site" required maxLength={80} defaultValue={s.identity.siteName} />
              <Field name="identity.legalName" label="Nom de l'association ou du projet" maxLength={160} defaultValue={s.identity.legalName} />
              <Field name="identity.tagline" label="Slogan" maxLength={160} defaultValue={s.identity.tagline} />
              <Field name="identity.shortDescription" label="Présentation courte" multiline rows={3} maxLength={400} defaultValue={s.identity.shortDescription} />
              <MediaPicker name="identity.logoId" label="Logo" value={s.identity.logoId} media={media} hint="Idéalement une version horizontale sur fond transparent ou blanc. Sans logo, le nom du site est affiché." />
              <Field name="identity.logoAlt" label="Texte alternatif du logo" maxLength={160} defaultValue={s.identity.logoAlt} />
            </>
          )}
          {tab === "theme" && (
            <>
              <h2>Couleurs</h2>
              <p className="help">Les palettes proposées sont construites à partir du vert du logo et testées pour la lisibilité. Une couleur personnalisée trop claire est refusée.</p>
              <ThemePicker palette={s.theme.palette} primary={s.theme.primary} accent={s.theme.accent} soft={s.theme.soft} />
            </>
          )}
          {tab === "contact" && (
            <>
              <h2>Coordonnées</h2>
              <p className="help">Affichées sur la page Contact et dans le pied de page. Les champs vides ne sont pas affichés.</p>
              <div className="grid-2">
                <Field name="contact.email" label="E-mail public" type="email" maxLength={254} defaultValue={s.contact.email} />
                <Field name="contact.phone" label="Téléphone" maxLength={40} defaultValue={s.contact.phone} />
              </div>
              <Field name="contact.address" label="Adresse postale" multiline rows={3} maxLength={300} defaultValue={s.contact.address} />
              <Field name="contact.hours" label="Disponibilités" maxLength={200} defaultValue={s.contact.hours} placeholder="Ex. : du lundi au vendredi, de 9 h à 17 h" />
              <Field name="contact.notificationEmail" label="E-mail de réception des demandes" type="email" maxLength={254} defaultValue={s.contact.notificationEmail} hint="Adresse qui reçoit une notification à chaque message (si la messagerie est configurée). Non affichée sur le site." />
            </>
          )}
          {tab === "social" && (
            <>
              <h2>Réseaux sociaux</h2>
              <p className="help">Renseignez uniquement les comptes officiels du projet. Adresse complète commençant par https://</p>
              <div className="grid-2">
                {(["facebook", "instagram", "linkedin", "youtube", "x", "mastodon"] as const).map((k) => (
                  <Field key={k} name={`social.${k}`} label={{ facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube", x: "X (Twitter)", mastodon: "Mastodon" }[k]} maxLength={300} defaultValue={s.social[k]} placeholder="https://…" />
                ))}
              </div>
            </>
          )}
          {tab === "footer" && (
            <>
              <h2>Pied de page</h2>
              <Field name="footer.text" label="Texte de présentation" multiline rows={3} maxLength={400} defaultValue={s.footer.text} />
              <Field name="footer.copyright" label="Mention de copyright" maxLength={160} defaultValue={s.footer.copyright} hint="Précédée automatiquement de « © année »." />
              <input type="hidden" name="footer.ctaTitle" value={s.footer.ctaTitle} />
              <input type="hidden" name="footer.ctaText" value={s.footer.ctaText} />
              <p className="help">Les liens du pied de page se règlent dans chaque page (option « Afficher dans le pied de page »).</p>
            </>
          )}
          {tab === "seo" && (
            <>
              <h2>Référencement</h2>
              <Field name="seo.defaultTitle" label="Titre par défaut" required maxLength={70} defaultValue={s.seo.defaultTitle} />
              <Field name="seo.titleTemplate" label="Modèle de titre des pages" maxLength={80} defaultValue={s.seo.titleTemplate} hint="%s est remplacé par le titre de la page." />
              <Field name="seo.defaultDescription" label="Description par défaut" multiline rows={3} maxLength={170} defaultValue={s.seo.defaultDescription} />
              <MediaPicker name="seo.ogImageId" label="Image de partage par défaut" value={s.seo.ogImageId} media={media} hint="Affichée lors du partage d'un lien sur les réseaux sociaux (format paysage conseillé)." />
              <Toggle
                name="seo.preproduction"
                label="Mode présentation (site non indexé)"
                hint="Affiche un bandeau « Version de présentation » et interdit l'indexation. À désactiver lors de la mise en ligne officielle (avec ALLOW_INDEXING=true sur le serveur)."
                defaultChecked={s.seo.preproduction}
              />
            </>
          )}
          {tab === "contactForm" && (
            <>
              <h2>Formulaire de contact</h2>
              <Toggle name="contactForm.enabled" label="Formulaire actif" defaultChecked={s.contactForm.enabled} />
              <Field name="contactForm.topics" label="Objets proposés (un par ligne)" multiline rows={6} defaultValue={s.contactForm.topics.join("\n")} />
              <Field name="contactForm.successMessage" label="Message de confirmation" multiline rows={2} maxLength={300} defaultValue={s.contactForm.successMessage} />
              <Field name="contactForm.consentText" label="Texte de la case de consentement" multiline rows={3} maxLength={400} defaultValue={s.contactForm.consentText} />
            </>
          )}
          {tab === "legal" && (
            <>
              <h2>Informations légales</h2>
              <p className="help">Utilisées pour générer la page Mentions légales. Les champs vides y apparaissent avec la mention « À compléter ». Ne renseignez que des informations vérifiées.</p>
              <div className="grid-2">
                <Field name="legal.publisherName" label="Éditeur du site" maxLength={160} defaultValue={s.legal.publisherName} />
                <Field name="legal.publisherStatus" label="Statut juridique" maxLength={160} defaultValue={s.legal.publisherStatus} placeholder="Ex. : association loi 1901" />
              </div>
              <Field name="legal.publisherAddress" label="Adresse du siège" multiline rows={2} maxLength={300} defaultValue={s.legal.publisherAddress} />
              <div className="grid-2">
                <Field name="legal.registration" label="N° RNA et/ou SIREN" maxLength={160} defaultValue={s.legal.registration} />
                <Field name="legal.publicationDirector" label="Directeur ou directrice de la publication" maxLength={160} defaultValue={s.legal.publicationDirector} />
              </div>
              <h3>Hébergeur</h3>
              <div className="grid-2">
                <Field name="legal.hostName" label="Nom" maxLength={160} defaultValue={s.legal.hostName} />
                <Field name="legal.hostContact" label="Téléphone ou contact" maxLength={160} defaultValue={s.legal.hostContact} />
              </div>
              <Field name="legal.hostAddress" label="Adresse" multiline rows={2} maxLength={300} defaultValue={s.legal.hostAddress} />
              <Field name="legal.lastUpdated" label="Date de dernière mise à jour" maxLength={40} defaultValue={s.legal.lastUpdated} placeholder="Ex. : 1er novembre 2026" />
            </>
          )}
          {tab === "privacy" && (
            <>
              <h2>Données personnelles</h2>
              <Field name="privacy.controller" label="Responsable du traitement" maxLength={200} defaultValue={s.privacy.controller} />
              <Field name="privacy.dpoContact" label="Contact pour exercer ses droits" maxLength={200} defaultValue={s.privacy.dpoContact} hint="Adresse e-mail ou postale." />
              <Field name="privacy.messageRetentionMonths" label="Durée de conservation des demandes de contact (mois)" type="number" defaultValue={s.privacy.messageRetentionMonths} hint="Annoncée dans la politique de confidentialité ; utilisée par la purge des demandes." />
              <Field name="privacy.lastUpdated" label="Date de dernière mise à jour" maxLength={40} defaultValue={s.privacy.lastUpdated} />
            </>
          )}
          {tab === "cookies" && (
            <>
              <h2>Cookies et consentement</h2>
              <Field name="cookies.bannerTitle" label="Titre du bandeau" maxLength={120} defaultValue={s.cookies.bannerTitle} />
              <Field name="cookies.bannerText" label="Texte du bandeau" multiline rows={3} maxLength={500} defaultValue={s.cookies.bannerText} />
              <Field
                name="cookies.policyVersion"
                label="Version de la politique"
                maxLength={20}
                defaultValue={s.cookies.policyVersion}
                hint="Changer ce numéro redemande leur consentement à tous les visiteurs (à faire si vous ajoutez un service)."
              />
              <h3>Services facultatifs</h3>
              <ServicesEditor initial={s.cookies.services} />
            </>
          )}
          <div className="form-actions" style={{ marginTop: "1rem" }}>
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </div>
      </ActionForm>
    </>
  );
}

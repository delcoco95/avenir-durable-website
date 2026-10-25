import { isMailConfigured } from "@/lib/mail";
import { PageHead } from "@/components/admin/PageHead";

export const metadata = { title: "Aide" };

export default function HelpPage() {
  return (
    <>
      <PageHead title="Aide et sauvegardes" intro="Les gestes essentiels pour faire vivre le site." />
      <div className="grid-2">
        <section className="panel">
          <h2>Modifier une page</h2>
          <ol style={{ paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
            <li>Ouvrez <strong>Pages</strong> puis la page souhaitée.</li>
            <li>Cliquez sur une section pour la déplier et modifier ses textes, images et boutons.</li>
            <li>Changez l'ordre avec les flèches ↑ ↓, ajoutez une section en bas de la liste.</li>
            <li>
              <strong>Enregistrer le brouillon</strong> conserve votre travail sans toucher au site ; <strong>Enregistrer et prévisualiser</strong> l'affiche dans un nouvel onglet.
            </li>
            <li>
              <strong>Publier</strong> rend les modifications visibles sur le site.
            </li>
          </ol>
        </section>
        <section className="panel">
          <h2>Bonnes pratiques</h2>
          <ul style={{ paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
            <li>Renseignez toujours le <strong>texte alternatif</strong> des images (accessibilité).</li>
            <li>N'affichez que des <strong>partenariats confirmés</strong>, des chiffres vérifiés et des témoignages autorisés.</li>
            <li>Pour une photo de personnes, assurez-vous d'avoir leur <strong>autorisation</strong> (et celle des parents pour les mineurs).</li>
            <li>Ne partagez jamais votre mot de passe : demandez plutôt la création d'un compte.</li>
          </ul>
        </section>
        <section className="panel">
          <h2>Messagerie</h2>
          <p>
            État : <strong>{isMailConfigured() ? "configurée — une notification est envoyée à chaque demande" : "non configurée — les demandes sont visibles uniquement dans l'administration"}</strong>.
          </p>
          <p className="help" style={{ margin: 0 }}>
            La configuration se fait sur le serveur (variables SMTP_HOST, SMTP_USER… décrites dans docs/DEPLOYMENT.md). L'adresse qui reçoit les notifications se règle dans Paramètres › Coordonnées.
          </p>
        </section>
        <section className="panel">
          <h2>Sauvegardes</h2>
          <p>Deux éléments sont à sauvegarder : la base de données et le dossier des images téléversées.</p>
          <p className="help">Depuis le serveur, dans le dossier du site :</p>
          <pre style={{ background: "#f4f6f2", padding: "0.75rem", borderRadius: 8, overflowX: "auto", fontSize: "0.85rem" }}>
            {`npm run backup        # crée backups/AAAA-MM-JJ_HHMM/
npm run restore -- backups/AAAA-MM-JJ_HHMM`}
          </pre>
          <p className="help" style={{ margin: 0 }}>
            Une sauvegarde quotidienne automatique (tâche planifiée) et une copie hors du serveur sont recommandées. Procédure détaillée : docs/DEPLOYMENT.md.
          </p>
        </section>
      </div>
    </>
  );
}

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Change à chaque réponse pour déclencher l'affichage d'une notification */
  stamp?: number;
  /** Données renvoyées (ex. média nouvellement créé, mot de passe temporaire) */
  data?: Record<string, unknown>;
};

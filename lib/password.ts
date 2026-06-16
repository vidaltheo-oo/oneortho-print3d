// Politique de mot de passe (inscription). Criteres affiches en temps reel et
// verifies avant soumission.

export type PasswordRule = {
  key: string;
  label: string;
  test: (pw: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "len", label: "8 caractères minimum", test: (p) => p.length >= 8 },
  { key: "upper", label: "Une lettre majuscule", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Une lettre minuscule", test: (p) => /[a-z]/.test(p) },
  { key: "digit", label: "Un chiffre", test: (p) => /\d/.test(p) },
  {
    key: "special",
    label: "Un caractère spécial (!@#$%…)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function isPasswordValid(pw: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(pw));
}

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z]).{8,50}$/

export const PASSWORD_HINT =
  "Password must be 8-50 characters and include at least one lowercase and one uppercase letter."

export function isValidName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 50
}
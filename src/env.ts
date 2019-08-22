export const getEnvOrDie = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is missing`)
  }
  return value
}

export const PLATFORMS = {
  reddit: {
    name: 'Reddit',
    color: '#ff4500',
    letter: 'R',
  },
  twitter: {
    name: 'Twitter / X',
    color: '#1d9bf0',
    letter: 'X',
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    letter: 'F',
  },
  instagram: {
    name: 'Instagram',
    color: '#e1306c',
    letter: 'IG',
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0a66c2',
    letter: 'in',
  },
}

// Map the platform strings returned by the server back to a color
export function platformColor(name) {
  const key = name?.toLowerCase()
  const found = Object.values(PLATFORMS).find(
    (p) => p.name.toLowerCase().includes(key) || key?.includes(p.name.split('/')[0].trim().toLowerCase())
  )
  return found?.color ?? '#6366f1'
}

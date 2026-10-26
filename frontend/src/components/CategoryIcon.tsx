import { Bike, Car, House, Package, Shirt, Smartphone, Sofa, type LucideProps } from 'lucide-react'
import type { Category } from '../constants'

// Icônes Lucide (lucide.dev, licence ISC) : une par catégorie.
const ICONS = {
  vehicules: Car,
  immobilier: House,
  multimedia: Smartphone,
  maison: Sofa,
  mode: Shirt,
  loisirs: Bike,
  autre: Package,
} satisfies Record<Category, unknown>

export function CategoryIcon({ category, ...props }: { category: Category } & LucideProps) {
  const Icon = ICONS[category]
  return <Icon aria-hidden {...props} />
}

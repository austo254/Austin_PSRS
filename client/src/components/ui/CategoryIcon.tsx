import { Building2, Bus, CircleHelp, Construction, Droplets, Lightbulb, ShieldCheck, Trash2, TreePine, Waves, Wrench, Zap, type LucideIcon, type LucideProps } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  droplets: Droplets, construction: Construction, lightbulb: Lightbulb, 'trash-2': Trash2, waves: Waves,
  'building-2': Building2, zap: Zap, 'circle-help': CircleHelp, trees: TreePine, wrench: Wrench, bus: Bus, shield: ShieldCheck,
};
export const ICON_KEYS = Object.keys(icons);
export function CategoryIcon({ iconKey, ...props }: { iconKey: string } & LucideProps) {
  const Icon = icons[iconKey] ?? CircleHelp;
  return <Icon aria-hidden {...props} />;
}

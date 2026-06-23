import {
  BookOpen, Bug, Calendar, CheckCircle2, Clock, Cloud, Code, Compass, Cpu,
  Database, FileText, Flame, FlaskConical, Folder, Github, Globe, Monitor,
  Moon, Network, Orbit, Palette, Pin, Play, Rocket, Settings, Shield,
  Smartphone, Sparkles, Terminal, Wrench, XCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  BookOpen, Bug, Calendar, CheckCircle2, Clock, Cloud, Code, Compass, Cpu,
  Database, FileText, Flame, FlaskConical, Folder, Github, Globe, Monitor,
  Moon, Network, Orbit, Palette, Pin, Play, Rocket, Settings, Shield,
  Smartphone, Sparkles, Terminal, Wrench, XCircle
};

export function getIconComponent(name: string | undefined, fallback: LucideIcon = FileText): LucideIcon {
  return (name && ICONS[name]) || fallback;
}
